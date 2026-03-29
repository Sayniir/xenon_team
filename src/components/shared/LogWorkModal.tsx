import { useState, useEffect } from 'react'
import { Plus, Play, Square, Save, X, Clock, Edit2, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTimerStore } from '../../stores/timerStore'
import type { Project } from '../../types/models'

export default function LogWorkModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const timer = useTimerStore()
  const [mode, setMode] = useState<'timer' | 'manual'>('timer')

  // Real-time tick for UI
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    let int: number
    if (timer.isRunning) {
      int = window.setInterval(() => setTicks(t => t + 1), 1000)
    }
    return () => window.clearInterval(int)
  }, [timer.isRunning])

  const totalSecs = timer.getComputedSeconds()
  const hrs = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60
  const timeString = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

  // Manual Form
  const [manHours, setManHours] = useState('1')
  const [manMins, setManMins] = useState('0')
  const [manDesc, setManDesc] = useState('')
  const [manProject, setManProject] = useState('')

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').eq('status', 'active')
      return (data || []) as Project[]
    }
  })

  // Submit to DB
  const saveSession = useMutation({
    mutationFn: async (payload: { duration_minutes: number; description: string; project_id: string | null }) => {
      const { error } = await supabase.from('work_sessions').insert({
        user_id: user!.id,
        duration_minutes: payload.duration_minutes,
        description: payload.description || null,
        project_id: payload.project_id || null
      })
      if (error) throw error
      // Extra log activity for gamification
      const actRes = await supabase.from('activities').insert({
        user_id: user!.id,
        action: 'logged_work',
        entity_type: 'work_session',
        entity_id: '00000000-0000-0000-0000-000000000000', // avoid crypto random issue if any
        metadata: { duration: payload.duration_minutes, desc: payload.description }
      })
      if (actRes.error) {
        console.error("Activity error", actRes.error)
      }
    },
    onMutate: async (payload) => {
      // Optimistic close
      onClose()

      // Optimistic update for leaderboard so it triggers level up instantly if applicable
      await queryClient.cancelQueries({ queryKey: ['dashboard-leaderboard'] })
      const previousLeaderboard = queryClient.getQueryData(['dashboard-leaderboard'])

      queryClient.setQueryData(['dashboard-leaderboard'], (old: any) => {
        if (!old) return old
        // find me
        const newLeaderboard = old.map((l: any) => {
          if (l.user.id === user?.id) {
            return { ...l, totalMinutes: l.totalMinutes + payload.duration_minutes }
          }
          return l
        })
        // sort again
        return newLeaderboard.sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)
      })

      return { previousLeaderboard }
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousLeaderboard) {
        queryClient.setQueryData(['dashboard-leaderboard'], context.previousLeaderboard)
      }
      alert("Erreur lors de la sauvegarde : " + err.message)
      console.error(err)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-activity'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-leaderboard'] })
    }
  })

  const handleSaveTimer = () => {
    // Calcul de la durée en minutes, mais on laisse 1 min minimum même si c'est qques secondes (pour les tests)
    const totalMinutes = Math.max(1, Math.floor(totalSecs / 60))

    // Sauvegarde des infos avant reset
    const payload = {
      duration_minutes: totalMinutes,
      description: timer.description,
      project_id: timer.projectId
    }

    // Stop and reset the timer immediately since modal unmounts optimistically
    timer.pause()
    timer.reset()

    saveSession.mutate(payload)
  }

  const handleSaveManual = () => {
    const totalMinutes = (parseInt(manHours) || 0) * 60 + (parseInt(manMins) || 0)
    if (totalMinutes === 0) return alert('La durée doit être supérieure à 0.')

    saveSession.mutate({ duration_minutes: totalMinutes, description: manDesc, project_id: manProject || null })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 className="modal-title">Signaler du travail</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2" style={{ marginBottom: 16 }}>
          <button className={`btn flex-1 ${mode === 'timer' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('timer')}>
            <Clock size={16} /> Chronomètre
          </button>
          <button className={`btn flex-1 ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('manual')}>
            <Edit2 size={16} /> Manuel
          </button>
        </div>

        <div className="modal-body">
          {mode === 'timer' ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                fontSize: '3rem', fontWeight: 800, fontFamily: 'monospace', color: timer.isRunning ? 'var(--primary-400)' : 'var(--text-primary)',
                textShadow: timer.isRunning ? '0 0 20px rgba(123, 47, 242, 0.4)' : 'none',
                transition: 'all 0.3s'
              }}>
                {timeString}
              </div>

              <div className="input-wrapper" style={{ textAlign: 'left', marginTop: 16 }}>
                <label className="input-label">Sur quoi travaillez-vous ?</label>
                <input className="input" placeholder="Description de la tâche..." value={timer.description} onChange={(e) => timer.setDescription(e.target.value)} disabled={timer.isRunning} />
              </div>

              <div className="input-wrapper" style={{ textAlign: 'left' }}>
                <label className="input-label">Projet lié</label>
                <select className="input" value={timer.projectId || ''} onChange={(e) => timer.setProject(e.target.value)} disabled={timer.isRunning}>
                  <option value="">Aucun projet</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex justify-center gap-4 mt-6">
                {!timer.isRunning ? (
                  <button className="btn btn-primary" style={{ padding: '12px 24px' }} onClick={() => timer.start()}>
                    <Play size={20} /> Démarrer
                  </button>
                ) : (
                  <button className="btn btn-danger" style={{ padding: '12px 24px' }} onClick={() => timer.pause()}>
                    <Square size={20} /> Pause
                  </button>
                )}

                {timer.isRunning && (
                  <button className="btn btn-success" style={{ padding: '12px 24px' }} onClick={handleSaveTimer} disabled={saveSession.isPending}>
                    <CheckCircle size={20} /> Valider Mnt
                  </button>
                )}

                {totalSecs > 0 && !timer.isRunning && (
                  <button className="btn btn-success" style={{ padding: '12px 24px' }} onClick={handleSaveTimer} disabled={saveSession.isPending}>
                    <Save size={20} /> {saveSession.isPending ? '...' : 'Valider Session'}
                  </button>
                )}

                {totalSecs > 0 && !timer.isRunning && (
                  <button className="btn btn-ghost" onClick={() => timer.reset()}>Réinitialiser</button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex gap-4">
                <div className="input-wrapper flex-1">
                  <label className="input-label">Heures</label>
                  <input type="number" min="0" className="input" value={manHours} onChange={(e) => setManHours(e.target.value)} />
                </div>
                <div className="input-wrapper flex-1">
                  <label className="input-label">Minutes</label>
                  <input type="number" min="0" max="59" className="input" value={manMins} onChange={(e) => setManMins(e.target.value)} />
                </div>
              </div>

              <div className="input-wrapper">
                <label className="input-label">Sur quoi avez-vous travaillé ?</label>
                <input className="input" placeholder="Description courte..." value={manDesc} onChange={(e) => setManDesc(e.target.value)} />
              </div>

              <div className="input-wrapper">
                <label className="input-label">Projet</label>
                <select className="input" value={manProject} onChange={(e) => setManProject(e.target.value)}>
                  <option value="">Aucun projet</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ marginTop: 24 }}>
                <button className="btn btn-primary w-full" onClick={handleSaveManual} disabled={saveSession.isPending || (!manHours && !manMins)}>
                  <Plus size={16} /> Ajouter ({parseInt(manHours || '0')}h {parseInt(manMins || '0')}m)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
