import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { CheckSquare, Plus, X, Send, Clock, List, LayoutGrid, MessageCircle } from 'lucide-react'
import { getInitials, formatDeadline, PRIORITY_LABELS, STATUS_LABELS } from '../lib/helpers'
import type { Task, Comment, UserProfile } from '../types/models'

const COLUMNS = [
  { key: 'todo', label: 'À faire', color: 'var(--text-secondary)' },
  { key: 'in_progress', label: 'En cours', color: 'var(--primary-400)' },
  { key: 'done', label: 'Terminé', color: 'var(--success)' }
] as const

export default function Tasks() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [projectId, setProjectId] = useState('')
  const [commentText, setCommentText] = useState('')

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, assignee:assigned_to(id, full_name, avatar_url), profiles:created_by(full_name), projects(id, name)')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })
      return (data || []) as Task[]
    }
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*')
      return (data || []) as UserProfile[]
    }
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('id, name').eq('status', 'active')
      return data || []
    }
  })

  const { data: taskComments = [] } = useQuery({
    queryKey: ['task-comments', showDetail],
    queryFn: async () => {
      if (!showDetail) return []
      const { data } = await supabase
        .from('task_comments')
        .select('*, profiles:author_id(full_name, avatar_url)')
        .eq('task_id', showDetail)
        .order('created_at', { ascending: true })
      return (data || []) as Comment[]
    },
    enabled: !!showDetail
  })

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').insert({
        title, description: description || null, priority, status: 'todo',
        assigned_to: assignedTo || null, deadline: deadline || null,
        project_id: projectId || null, created_by: user!.id, position: 0
      })
      if (error) throw error
      await supabase.from('activities').insert({
        user_id: user!.id, action: 'created_task',
        entity_type: 'task', entity_id: crypto.randomUUID(),
        metadata: { title }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      resetForm()
    }
  })

  const updateStatus = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId)
      if (newStatus === 'done') {
        await supabase.from('activities').insert({
          user_id: user!.id, action: 'completed_task',
          entity_type: 'task', entity_id: taskId, metadata: {}
        })
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  })

  const addComment = useMutation({
    mutationFn: async (taskId: string) => {
      await supabase.from('task_comments').insert({
        task_id: taskId, author_id: user!.id, content: commentText
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments'] })
      setCommentText('')
    }
  })

  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      await supabase.from('tasks').delete().eq('id', taskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowDetail(null)
    }
  })

  function resetForm() {
    setShowCreate(false)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setAssignedTo('')
    setDeadline('')
    setProjectId('')
  }

  const selectedTask = tasks.find((t) => t.id === showDetail)

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <CheckSquare size={28} style={{ color: 'var(--primary-400)', verticalAlign: 'middle', marginRight: 8 }} />
            Tâches
          </h1>
          <p className="page-subtitle">{tasks.filter((t) => t.status !== 'done').length} tâches en cours</p>
        </div>
        <div className="flex gap-2">
          <button className={`btn ${viewMode === 'kanban' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setViewMode('kanban')}>
            <LayoutGrid size={16} /> Kanban
          </button>
          <button className={`btn ${viewMode === 'list' ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setViewMode('list')}>
            <List size={16} /> Liste
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nouvelle tâche
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key)
            return (
              <div 
                key={col.key} 
                className="kanban-column"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.boxShadow = 'var(--shadow-glow-sm)'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.boxShadow = 'none'
                  const taskId = e.dataTransfer.getData('taskId')
                  if (taskId) updateStatus.mutate({ taskId, newStatus: col.key })
                }}
              >
                <div className="kanban-column-header">
                  <div className="kanban-column-title" style={{ color: col.color }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
                    {col.label}
                    <span className="kanban-count">{colTasks.length}</span>
                  </div>
                </div>
                <div className="kanban-cards">
                  {colTasks.map((task) => {
                    const dl = task.deadline ? formatDeadline(task.deadline) : null
                    return (
                      <div 
                        key={task.id} 
                        className="kanban-card" 
                        onClick={() => setShowDetail(task.id)}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task.id)
                          // Optional: subtle visual feedback during drag
                          e.currentTarget.style.opacity = '0.5'
                        }}
                        onDragEnd={(e) => {
                          e.currentTarget.style.opacity = '1'
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`badge badge-priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                          {task.projects && (
                            <span className="text-xs text-tertiary">{(task.projects as any).name}</span>
                          )}
                        </div>
                        <div className="kanban-card-title">{task.title}</div>
                        <div className="kanban-card-meta">
                          {task.assignee && (
                            <div className="avatar avatar-sm">
                              {getInitials((task.assignee as any).full_name)}
                            </div>
                          )}
                          {dl && (
                            <span className="text-xs" style={{ color: dl.urgent ? 'var(--danger)' : 'var(--text-tertiary)', marginLeft: 'auto' }}>
                              <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />
                              {dl.text}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <button className="kanban-add-btn" onClick={() => setShowCreate(true)}>
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Titre', 'Statut', 'Priorité', 'Assigné', 'Projet', 'Deadline'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => setShowDetail(task.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 500 }}>{task.title}</td>
                  <td style={{ padding: '12px 16px' }}><span className={`badge badge-status-${task.status}`}>{STATUS_LABELS[task.status]}</span></td>
                  <td style={{ padding: '12px 16px' }}><span className={`badge badge-priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm">{getInitials((task.assignee as any).full_name)}</div>
                        <span className="text-sm">{(task.assignee as any).full_name}</span>
                      </div>
                    ) : <span className="text-xs text-tertiary">—</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="text-sm text-secondary">{(task.projects as any)?.name || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {task.deadline ? (() => { const dl = formatDeadline(task.deadline!); return <span className="text-sm" style={{ color: dl.urgent ? 'var(--danger)' : 'var(--text-secondary)' }}>{dl.text}</span> })() : <span className="text-xs text-tertiary">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => resetForm()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nouvelle tâche</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => resetForm()}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="input-wrapper">
                <label className="input-label">Titre *</label>
                <input className="input" placeholder="Titre de la tâche" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Description</label>
                <textarea className="input textarea" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="input-wrapper">
                  <label className="input-label">Priorité</label>
                  <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Assigné à</label>
                  <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                    <option value="">Non assigné</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="input-wrapper">
                  <label className="input-label">Deadline</label>
                  <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Projet</label>
                  <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">Aucun projet</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => resetForm()}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createTask.mutate()} disabled={!title}>
                <Plus size={14} /> Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {showDetail && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedTask.title}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {selectedTask.description && (
                <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>{selectedTask.description}</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div className="text-xs text-tertiary mb-2">Statut</div>
                  <div className="flex gap-2">
                    {COLUMNS.map((col) => (
                      <button
                        key={col.key}
                        className={`btn btn-sm ${selectedTask.status === col.key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => updateStatus.mutate({ taskId: selectedTask.id, newStatus: col.key })}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-tertiary mb-2">Priorité</div>
                  <span className={`badge badge-priority-${selectedTask.priority}`}>{PRIORITY_LABELS[selectedTask.priority]}</span>
                </div>
              </div>
              {/* Comments */}
              <div>
                <div className="text-xs text-tertiary mb-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageCircle size={12} /> Commentaires
                </div>
                <div className="comment-list">
                  {taskComments.map((c) => (
                    <div key={c.id} className="comment-item">
                      <div className="avatar avatar-sm">{getInitials(c.profiles?.full_name || 'X')}</div>
                      <div className="comment-body">
                        <div className="comment-author">{c.profiles?.full_name}</div>
                        <div className="comment-text">{c.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="comment-input-row">
                  <input
                    className="input"
                    placeholder="Ajouter un commentaire..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) addComment.mutate(selectedTask.id) }}
                  />
                  <button className="btn btn-primary btn-icon" onClick={() => commentText.trim() && addComment.mutate(selectedTask.id)}>
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => deleteTask.mutate(selectedTask.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="empty-state">
          <CheckSquare size={48} />
          <h3>Aucune tâche</h3>
          <p className="text-sm text-secondary">Créez votre première tâche pour commencer</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Créer une tâche
          </button>
        </div>
      )}
    </div>
  )
}
