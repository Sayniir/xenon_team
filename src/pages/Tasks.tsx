import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import {
  CheckSquare, Plus, X, Send, Clock, List, LayoutGrid, MessageCircle,
  Edit2, Trash2, Save
} from 'lucide-react'
import { getInitials, formatDeadline, PRIORITY_LABELS, STATUS_LABELS } from '../lib/helpers'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import * as taskService from '../services/taskService'
import type { Task, Comment, UserProfile } from '../types/models'

const COLUMNS = [
  { key: 'todo', label: 'À faire', color: 'var(--text-secondary)' },
  { key: 'in_progress', label: 'En cours', color: 'var(--primary-400)' },
  { key: 'done', label: 'Terminé', color: 'var(--success)' }
] as const

export default function Tasks() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showCreate, setShowCreate] = useState(false)
  const [showDetail, setShowDetail] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Create form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [projectId, setProjectId] = useState('')
  const [commentText, setCommentText] = useState('')

  // Edit form
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editProject, setEditProject] = useState('')

  // Filter state
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.fetchAllTasks
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: taskService.fetchMembers
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: taskService.fetchActiveProjectsList
  })

  const { data: taskComments = [] } = useQuery({
    queryKey: ['task-comments', showDetail],
    queryFn: () => taskService.fetchTaskComments(showDetail!),
    enabled: !!showDetail
  })

  const createTask = useMutation({
    mutationFn: () =>
      taskService.createTask({
        title,
        description,
        priority,
        assignedTo,
        deadline,
        projectId,
        createdBy: user!.id
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tâche créée', `"${title}" a été ajoutée.`)
      resetForm()
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const updateStatus = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: string; newStatus: Task['status'] }) =>
      taskService.updateTaskStatus(taskId, newStatus, user!.id),
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])
      
      queryClient.setQueryData<Task[]>(['tasks'], (old) => 
        old ? (old.map(t => t.id === taskId ? { ...t, status: newStatus } : t) as Task[]) : []
      )
      
      return { previousTasks }
    },
    onError: (err: Error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      toast.error('Erreur', err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Parameters<typeof taskService.updateTask>[1] }) =>
      taskService.updateTask(taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks'])
      
      queryClient.setQueryData<Task[]>(['tasks'], (old) => 
        old ? (old.map(t => t.id === taskId ? { ...t, ...updates } : t) as Task[]) : []
      )
      
      return { previousTasks }
    },
    onSuccess: () => {
      toast.success('Tâche mise à jour')
      setIsEditing(false)
    },
    onError: (err: Error, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks)
      }
      toast.error('Erreur', err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const addComment = useMutation({
    mutationFn: (taskId: string) => taskService.addTaskComment(taskId, user!.id, commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments'] })
      setCommentText('')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const doDeleteTask = useMutation({
    mutationFn: (taskId: string) => taskService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Tâche supprimée')
      setShowDetail(null)
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
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

  function startEditing(task: Task) {
    setIsEditing(true)
    setEditTitle(task.title)
    setEditDesc(task.description || '')
    setEditPriority(task.priority)
    setEditAssignee(task.assigned_to || '')
    setEditDeadline(task.deadline ? task.deadline.split('T')[0] : '')
    setEditProject(task.project_id || '')
  }

  function saveEdit(taskId: string) {
    updateTaskMutation.mutate({
      taskId,
      updates: {
        title: editTitle,
        description: editDesc || null,
        priority: editPriority,
        assigned_to: editAssignee || null,
        deadline: editDeadline || null,
        project_id: editProject || null
      }
    })
  }

  const selectedTask = tasks.find((t) => t.id === showDetail)

  // Filtering
  let filteredTasks = tasks
  if (filterPriority !== 'all') filteredTasks = filteredTasks.filter((t) => t.priority === filterPriority)
  if (filterAssignee !== 'all') {
    filteredTasks = filterAssignee === 'unassigned'
      ? filteredTasks.filter((t) => !t.assigned_to)
      : filteredTasks.filter((t) => t.assigned_to === filterAssignee)
  }

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

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="all">Toutes les priorités</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <select className="filter-select" value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="all">Tous les membres</option>
          <option value="unassigned">Non assigné</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.full_name}</option>
          ))}
        </select>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.key)
            return (
              <div
                key={col.key}
                className="kanban-column"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over') }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('drag-over')
                  const taskId = e.dataTransfer.getData('taskId')
                  if (taskId) updateStatus.mutate({ taskId, newStatus: col.key })
                }}
              >
                <div className="kanban-column-header">
                  <div className="kanban-column-title" style={{ color: col.color }}>
                    <div className="status-dot" style={{ background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
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
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('taskId', task.id)
                          e.currentTarget.style.opacity = '0.5'
                        }}
                        onDragEnd={(e) => { e.currentTarget.style.opacity = '1' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`badge badge-priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                          {task.projects && (
                            <span className="text-xs text-tertiary">{(task.projects as { name: string }).name}</span>
                          )}
                        </div>
                        <div className="kanban-card-title">{task.title}</div>
                        <div className="kanban-card-meta">
                          {task.assignee && (
                            <div className="avatar avatar-sm">
                              {getInitials((task.assignee as { full_name: string }).full_name)}
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
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr key={task.id} className="table-row" onClick={() => setShowDetail(task.id)}>
                  <td className="table-cell font-semibold">{task.title}</td>
                  <td className="table-cell"><span className={`badge badge-status-${task.status}`}>{STATUS_LABELS[task.status]}</span></td>
                  <td className="table-cell"><span className={`badge badge-priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                  <td className="table-cell">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm">{getInitials((task.assignee as { full_name: string }).full_name)}</div>
                        <span className="text-sm">{(task.assignee as { full_name: string }).full_name}</span>
                      </div>
                    ) : <span className="text-xs text-tertiary">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-secondary">{(task.projects as { name: string } | null)?.name || '—'}</span>
                  </td>
                  <td className="table-cell">
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
                <input className="input" placeholder="Titre de la tâche" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Description</label>
                <textarea className="input textarea" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="form-grid-2">
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
              <div className="form-grid-2">
                <div className="input-wrapper">
                  <label className="input-label">Deadline</label>
                  <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label">Projet</label>
                  <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                    <option value="">Aucun projet</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => resetForm()}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createTask.mutate()} disabled={!title || createTask.isPending}>
                <Plus size={14} /> Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal — with full editing */}
      {showDetail && selectedTask && (
        <div className="modal-overlay" onClick={() => { setShowDetail(null); setIsEditing(false) }}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {isEditing ? (
                <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ fontSize: '1.125rem', fontWeight: 700 }} />
              ) : (
                <h3 className="modal-title">{selectedTask.title}</h3>
              )}
              <div className="flex gap-1">
                {!isEditing && (
                  <button className="btn btn-ghost btn-icon" onClick={() => startEditing(selectedTask)} title="Modifier">
                    <Edit2 size={16} />
                  </button>
                )}
                <button className="btn btn-ghost btn-icon" onClick={() => { setShowDetail(null); setIsEditing(false) }}><X size={18} /></button>
              </div>
            </div>
            <div className="modal-body">
              {isEditing ? (
                <>
                  <div className="input-wrapper">
                    <label className="input-label">Description</label>
                    <textarea className="input textarea" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  </div>
                  <div className="form-grid-2">
                    <div className="input-wrapper">
                      <label className="input-label">Priorité</label>
                      <select className="input" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                      </select>
                    </div>
                    <div className="input-wrapper">
                      <label className="input-label">Assigné à</label>
                      <select className="input" value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)}>
                        <option value="">Non assigné</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="input-wrapper">
                      <label className="input-label">Deadline</label>
                      <input className="input" type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} />
                    </div>
                    <div className="input-wrapper">
                      <label className="input-label">Projet</label>
                      <select className="input" value={editProject} onChange={(e) => setEditProject(e.target.value)}>
                        <option value="">Aucun projet</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {selectedTask.description && (
                    <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>{selectedTask.description}</p>
                  )}
                  <div className="form-grid-2">
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
                  {selectedTask.assignee && (
                    <div>
                      <div className="text-xs text-tertiary mb-2">Assigné à</div>
                      <div className="flex items-center gap-2">
                        <div className="avatar avatar-sm">{getInitials((selectedTask.assignee as { full_name: string }).full_name)}</div>
                        <span className="text-sm">{(selectedTask.assignee as { full_name: string }).full_name}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Comments */}
              {!isEditing && (
                <div>
                  <div className="text-xs text-tertiary mb-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageCircle size={12} /> Commentaires ({taskComments.length})
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
              )}
            </div>
            <div className="modal-footer">
              {isEditing ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Annuler</button>
                  <button className="btn btn-primary" onClick={() => saveEdit(selectedTask.id)} disabled={!editTitle}>
                    <Save size={14} /> Sauvegarder
                  </button>
                </>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(selectedTask.id)}>
                  <Trash2 size={14} /> Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer la tâche"
          message="Cette action est irréversible. Tous les commentaires associés seront également supprimés."
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={() => doDeleteTask.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {filteredTasks.length === 0 && tasks.length === 0 && (
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
