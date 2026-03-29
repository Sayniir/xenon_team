import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  CheckSquare, FileText, FolderKanban, Lightbulb,
  Clock, TrendingUp, Zap, Trophy, Medal, Star
} from 'lucide-react'
import { timeAgo, formatDeadline, getInitials, STATUS_LABELS, PRIORITY_LABELS, ACTION_LABELS } from '../lib/helpers'
import { Link } from 'react-router-dom'
import type { Task, Post, Project, Activity } from '../types/models'

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: myTasks = [] } = useQuery({
    queryKey: ['dashboard-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, profiles:assigned_to(full_name, avatar_url), projects(name)')
        .or(`assigned_to.eq.${user!.id},created_by.eq.${user!.id}`)
        .neq('status', 'done')
        .order('priority', { ascending: false })
        .order('deadline', { ascending: true, nullsFirst: false })
        .limit(5)
      return (data || []) as Task[]
    },
    enabled: !!user
  })

  const { data: recentPosts = [] } = useQuery({
    queryKey: ['dashboard-posts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles:author_id(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(3)
      return (data || []) as Post[]
    }
  })

  const { data: activeProjects = [] } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(4)
      return (data || []) as Project[]
    }
  })

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('activities')
        .select('*, profiles:user_id(full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(8)
      return (data || []) as Activity[]
    }
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [tasksRes, postsRes, projectsRes, ideasRes] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true }).neq('status', 'done'),
        supabase.from('posts').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('ideas').select('id', { count: 'exact', head: true }).eq('status', 'new')
      ])
      return {
        tasks: tasksRes.count || 0,
        posts: postsRes.count || 0,
        projects: projectsRes.count || 0,
        ideas: ideasRes.count || 0
      }
    }
  })

  // Classement — Utilise la RPC function côté serveur
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['dashboard-leaderboard'],
    queryFn: async () => {
      // Try RPC first (after migration 05), fallback to client-side
      const { data: rpcData, error } = await supabase.rpc('get_leaderboard')
      if (!error && rpcData) {
        return rpcData.map((r: { user_id: string; full_name: string; avatar_url: string | null; total_minutes: number }) => ({
          user: { id: r.user_id, full_name: r.full_name, avatar_url: r.avatar_url },
          totalMinutes: Number(r.total_minutes)
        }))
      }
      // Fallback: client-side (pre-migration)
      const { data } = await supabase
        .from('work_sessions')
        .select(`duration_minutes, profiles:user_id(id, full_name, avatar_url)`)
      type UserShape = { id: string; full_name: string; avatar_url: string | null }
      const stats = new Map<string, { user: UserShape, totalMinutes: number }>()
      data?.forEach(session => {
        const u = session.profiles as unknown as UserShape | null
        if (!u) return
        const existing = stats.get(u.id)
        if (existing) {
          existing.totalMinutes += session.duration_minutes
        } else {
          stats.set(u.id, { user: u, totalMinutes: session.duration_minutes })
        }
      })
      return Array.from(stats.values()).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 5)
    }
  })

  const myStats = leaderboard.find((l: { user: { id: string }; totalMinutes: number }) => l.user.id === user?.id)
  const myLevel = myStats ? Math.floor(myStats.totalMinutes / 60 / 10) + 1 : 1 // 1 level every 10 hours
  const myTotalHours = myStats ? (myStats.totalMinutes / 60) : 0
  const expProgress = (myTotalHours % 10) / 10 * 100 // % towards next level

  const [showLevelUp, setShowLevelUp] = useState(false)
  const prevLevelRef = useRef(myLevel)

  useEffect(() => {
    if (myLevel > prevLevelRef.current && prevLevelRef.current > 0) {
      setShowLevelUp(true)
      setTimeout(() => setShowLevelUp(false), 4000)
    }
    prevLevelRef.current = myLevel
  }, [myLevel])

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Zap size={28} style={{ color: 'var(--primary-400)', verticalAlign: 'middle', marginRight: 8 }} />
            Bonjour, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">Voici un aperçu de votre espace de travail</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="dashboard-stats-row">
        <div className="dashboard-stat">
          <div className="dashboard-stat-icon" style={{ background: 'rgba(123, 47, 242, 0.15)' }}>
            <CheckSquare size={22} style={{ color: 'var(--primary-400)' }} />
          </div>
          <div>
            <div className="dashboard-stat-value">{stats?.tasks ?? '—'}</div>
            <div className="dashboard-stat-label">Tâches en cours</div>
          </div>
        </div>
        <div className="dashboard-stat">
          <div className="dashboard-stat-icon" style={{ background: 'rgba(0, 212, 255, 0.15)' }}>
            <FileText size={22} style={{ color: 'var(--accent-500)' }} />
          </div>
          <div>
            <div className="dashboard-stat-value">{stats?.posts ?? '—'}</div>
            <div className="dashboard-stat-label">Publications</div>
          </div>
        </div>
        <div className="dashboard-stat">
          <div className="dashboard-stat-icon" style={{ background: 'var(--success-bg)' }}>
            <FolderKanban size={22} style={{ color: 'var(--success)' }} />
          </div>
          <div>
            <div className="dashboard-stat-value">{stats?.projects ?? '—'}</div>
            <div className="dashboard-stat-label">Projets actifs</div>
          </div>
        </div>
        <div className="dashboard-stat">
          <div className="dashboard-stat-icon" style={{ background: 'var(--warning-bg)' }}>
            <Lightbulb size={22} style={{ color: 'var(--warning)' }} />
          </div>
          <div>
            <div className="dashboard-stat-value">{stats?.ideas ?? '—'}</div>
            <div className="dashboard-stat-label">Nouvelles idées</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* LEADERBOARD (Gamification) */}
        <div className="dashboard-card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(123, 47, 242, 0.05), rgba(0, 212, 255, 0.05))', border: '1px solid rgba(123, 47, 242, 0.2)' }}>
          <div className="dashboard-card-header">
            <div className="dashboard-card-title text-xl font-bold" style={{ color: 'var(--primary-400)' }}>
              <Trophy size={20} />
              Classement "Solo Leveling"
            </div>
            <div className="flex gap-2 items-center" style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: 20 }}>
              <Star size={14} style={{ color: 'var(--warning)' }} />
              <span className="text-sm font-bold">Niveau {myLevel}</span>
            </div>
          </div>

          <div className="flex" style={{ gap: 32, alignItems: 'center' }}>
            {/* Top 3 List */}
            <div style={{ flex: 1 }}>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-secondary">Personne n'a encore enregistré de session.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {leaderboard.slice(0, 3).map((item: { user: { id: string; full_name: string; avatar_url: string | null }; totalMinutes: number }, index: number) => {
                    const hours = Math.floor(item.totalMinutes / 60)
                    const mins = item.totalMinutes % 60
                    const isMe = item.user.id === user?.id
                    return (
                      <div key={item.user.id} className="flex items-center gap-3" style={{ background: isMe ? 'rgba(123, 47, 242, 0.1)' : 'transparent', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ width: 24, fontWeight: 'bold', color: index === 0 ? 'var(--warning)' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--text-tertiary)' }}>
                          #{index + 1}
                        </div>
                        <div className="avatar avatar-sm">{getInitials(item.user.full_name)}</div>
                        <div style={{ flex: 1, fontWeight: isMe ? 700 : 500 }}>{isMe ? 'Vous' : item.user.full_name}</div>
                        <div className="badge" style={{ background: 'rgba(0, 212, 255, 0.1)', color: 'var(--accent-500)' }}>
                          {hours}h {mins > 0 ? `${mins}m` : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* My EXP Bar */}
            <div style={{ flex: 1, background: 'var(--bg-surface)', padding: 20, borderRadius: 'var(--radius-lg)' }}>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <div className="text-xs text-secondary text-uppercase font-bold mb-1">Votre Progression</div>
                  <div className="text-xl font-bold">{myTotalHours.toFixed(1)}h Totales</div>
                </div>
                <div className="text-sm text-tertiary">Prochain Niveau : {(Math.ceil(myTotalHours / 10) * 10) || 10}h</div>
              </div>
              <div className="progress-bar" style={{ height: 12, background: 'rgba(0,0,0,0.5)' }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${expProgress}%`, background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))', boxShadow: 'var(--shadow-glow-sm)' }}
                />
              </div>
              <div className="text-right text-xs mt-2" style={{ color: 'var(--accent-500)', fontWeight: 'bold' }}>
                {expProgress.toFixed(0)}% vers le niv.{myLevel + 1}
              </div>
            </div>
          </div>
        </div>

        {/* My Tasks */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <CheckSquare size={16} style={{ color: 'var(--primary-400)' }} />
              Mes tâches urgentes
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">Voir tout</Link>
          </div>
          {myTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <CheckSquare size={32} />
              <p className="text-sm text-secondary">Aucune tâche en cours</p>
            </div>
          ) : (
            myTasks.map((task) => {
              const deadline = task.deadline ? formatDeadline(task.deadline) : null
              return (
                <div key={task.id} className="task-item">
                  <div className={`badge badge-priority-${task.priority}`} style={{ minWidth: 'auto' }}>
                    {PRIORITY_LABELS[task.priority]}
                  </div>
                  <span className="task-item-title truncate">{task.title}</span>
                  <div className="task-item-meta">
                    {deadline && (
                      <span className="text-xs" style={{ color: deadline.urgent ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                        {deadline.text}
                      </span>
                    )}
                    <span className={`badge badge-status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Recent Posts */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FileText size={16} style={{ color: 'var(--accent-500)' }} />
              Derniers posts
            </div>
            <Link to="/posts" className="btn btn-ghost btn-sm">Voir tout</Link>
          </div>
          {recentPosts.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <FileText size={32} />
              <p className="text-sm text-secondary">Aucun post publié</p>
            </div>
          ) : (
            recentPosts.map((post) => (
              <div key={post.id} className="task-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                <div className="flex items-center gap-2" style={{ width: '100%' }}>
                  <div className="avatar avatar-sm">
                    {getInitials(post.profiles?.full_name || 'X')}
                  </div>
                  <span className="font-semibold text-sm">{post.profiles?.full_name}</span>
                  <span className="text-xs text-tertiary" style={{ marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
                </div>
                <div className="font-semibold text-sm" style={{ paddingLeft: 36 }}>{post.title}</div>
                <div className="text-xs text-secondary truncate" style={{ paddingLeft: 36, maxWidth: '100%' }}>
                  {post.content.substring(0, 100)}...
                </div>
              </div>
            ))
          )}
        </div>

        {/* Active Projects */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <FolderKanban size={16} style={{ color: 'var(--success)' }} />
              Projets actifs
            </div>
            <Link to="/projects" className="btn btn-ghost btn-sm">Voir tout</Link>
          </div>
          {activeProjects.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <FolderKanban size={32} />
              <p className="text-sm text-secondary">Aucun projet actif</p>
            </div>
          ) : (
            activeProjects.map((project) => (
              <div key={project.id} className="task-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <div className="flex items-center gap-2" style={{ width: '100%' }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: project.color || 'var(--primary-500)',
                    boxShadow: `0 0 6px ${project.color || 'var(--primary-500)'}`
                  }} />
                  <span className="font-semibold text-sm">{project.name}</span>
                </div>
                {project.description && (
                  <div className="text-xs text-secondary truncate" style={{ maxWidth: '100%', paddingLeft: 16 }}>
                    {project.description}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <TrendingUp size={16} style={{ color: 'var(--warning)' }} />
              Activité récente
            </div>
            <Link to="/activity" className="btn btn-ghost btn-sm">Voir tout</Link>
          </div>
          {recentActivity.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <TrendingUp size={32} />
              <p className="text-sm text-secondary">Aucune activité récente</p>
            </div>
          ) : (
            recentActivity.map((act) => (
              <div key={act.id} className="task-item" style={{ gap: 8 }}>
                <div className="avatar avatar-sm">
                  {getInitials(act.profiles?.full_name || 'X')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-sm">
                    <strong style={{ color: 'var(--primary-300)' }}>{act.profiles?.full_name}</strong>
                    {' '}{ACTION_LABELS[act.action] || act.action}
                  </div>
                  <div className="text-xs text-tertiary">{timeAgo(act.created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showLevelUp && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          animation: 'fade-in 0.3s ease-out'
        }}>
          <div style={{ textAlign: 'center', transform: 'scale(1)', animation: 'level-up-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <style>{`
              @keyframes level-up-pop {
                0% { transform: scale(0.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
            <Trophy size={100} style={{ color: 'var(--warning)', margin: '0 auto 24px', filter: 'drop-shadow(0 0 30px var(--warning))' }} />
            <h2 style={{ fontSize: '3rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px rgba(255,255,255,0.8)', marginBottom: 16 }}>
              Niveau Supérieur !
            </h2>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-400)', background: 'rgba(123, 47, 242, 0.2)', padding: '12px 24px', borderRadius: 100, display: 'inline-block' }}>
              Vous avez atteint le niveau {myLevel} 🚀
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
