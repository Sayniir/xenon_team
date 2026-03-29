import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { FolderKanban, Plus, X, CheckSquare, FileText, Trash2 } from 'lucide-react'
import { getInitials, PROJECT_STATUS_LABELS, STATUS_LABELS } from '../lib/helpers'
import * as projectService from '../services/projectService'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import type { Project } from '../types/models'

const PROJECT_COLORS = [
  '#7B2FF2', '#00D4FF', '#FF3366', '#00E676', '#FFB300',
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
]

export default function Projects() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.fetchAllProjects
  })

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks', selectedProject],
    queryFn: () => projectService.fetchProjectTasks(selectedProject!),
    enabled: !!selectedProject
  })

  const { data: projectPosts = [] } = useQuery({
    queryKey: ['project-posts', selectedProject],
    queryFn: () => projectService.fetchProjectPosts(selectedProject!),
    enabled: !!selectedProject
  })

  const createProject = useMutation({
    mutationFn: () => projectService.createProject({ name, description, color, createdBy: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet créé', `"${name}" a été créé.`)
      setShowCreate(false)
      setName('')
      setDescription('')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => projectService.updateProjectStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Statut mis à jour')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const deleteProjectMut = useMutation({
    mutationFn: (projectId: string) => projectService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet supprimé')
      setSelectedProject(null)
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const selected = projects.find((p) => p.id === selectedProject)
  const doneCount = projectTasks.filter((t) => t.status === 'done').length
  const progress = projectTasks.length > 0 ? Math.round((doneCount / projectTasks.length) * 100) : 0

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FolderKanban size={28} style={{ color: 'var(--success)', verticalAlign: 'middle', marginRight: 8 }} />
            Projets
          </h1>
          <p className="page-subtitle">{projects.filter((p) => p.status === 'active').length} projets actifs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouveau projet
        </button>
      </div>

      {/* Project detail */}
      {selectedProject && selected ? (
        <div className="animate-fade-in">
          <button className="btn btn-ghost mb-4" onClick={() => setSelectedProject(null)}>← Retour aux projets</button>
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="status-dot" style={{ width: 12, height: 12, background: selected.color, boxShadow: `0 0 10px ${selected.color}` }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, flex: 1 }}>{selected.name}</h2>
              <span className={`badge badge-status-${selected.status === 'active' ? 'in_progress' : selected.status === 'completed' ? 'done' : 'todo'}`}>
                {PROJECT_STATUS_LABELS[selected.status]}
              </span>
              <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(selected.id)} title="Supprimer le projet">
                <Trash2 size={14} />
              </button>
            </div>
            {selected.description && <p className="text-sm text-secondary mb-4">{selected.description}</p>}
            <div className="flex items-center gap-4 mb-4">
              <div style={{ flex: 1 }}>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <span className="text-sm font-semibold">{progress}%</span>
            </div>
            <div className="flex gap-2">
              {['active', 'paused', 'completed'].map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${selected.status === s ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => updateStatus.mutate({ id: selected.id, status: s })}
                >
                  {PROJECT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <h3 className="font-bold mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={16} style={{ color: 'var(--primary-400)' }} /> Tâches ({projectTasks.length})
          </h3>
          <div className="card mb-4" style={{ padding: 0 }}>
            {projectTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <p className="text-sm text-secondary">Aucune tâche liée à ce projet</p>
              </div>
            ) : (
              projectTasks.map((task) => (
                <div key={task.id} className="task-item" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className={`badge badge-status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  <span className="task-item-title">{task.title}</span>
                  {task.assignee && (
                    <div className="avatar avatar-sm">{getInitials((task.assignee as { full_name: string }).full_name)}</div>
                  )}
                </div>
              ))
            )}
          </div>

          <h3 className="font-bold mb-4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: 'var(--accent-500)' }} /> Posts liés ({projectPosts.length})
          </h3>
          {projectPosts.length === 0 ? (
            <div className="card"><div className="empty-state" style={{ padding: 32 }}><p className="text-sm text-secondary">Aucun post lié</p></div></div>
          ) : (
            projectPosts.map((post) => (
              <div key={post.id} className="card mb-2">
                <div className="font-semibold text-sm">{post.title}</div>
                <div className="text-xs text-secondary mt-2">{post.content.substring(0, 150)}...</div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {projects.length === 0 ? (
            <div className="empty-state">
              <FolderKanban size={48} />
              <h3>Aucun projet</h3>
              <p className="text-sm text-secondary">Créez votre premier projet</p>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Créer un projet
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="project-card"
                  style={{ '--project-color': project.color } as React.CSSProperties}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge badge-status-${project.status === 'active' ? 'in_progress' : project.status === 'completed' ? 'done' : 'todo'}`}>
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <h3 className="project-card-title">{project.name}</h3>
                  {project.description && <p className="project-card-desc">{project.description}</p>}
                  <div className="project-card-stats">
                    <span className="project-card-stat">Par {(project as Project & { profiles?: { full_name: string } }).profiles?.full_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nouveau projet</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="input-wrapper">
                <label className="input-label">Nom du projet *</label>
                <input className="input" placeholder="Nom du projet" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Description</label>
                <textarea className="input textarea" placeholder="Description du projet..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Couleur</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`color-swatch ${color === c ? 'active' : ''}`}
                      style={{ '--swatch-color': c } as React.CSSProperties}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createProject.mutate()} disabled={!name || createProject.isPending}>
                <Plus size={14} /> Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le projet"
          message="Ce projet sera supprimé. Les tâches et posts liés ne seront pas supprimés mais perdront leur lien avec ce projet."
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={() => deleteProjectMut.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
