import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { Lightbulb, Plus, X, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react'
import { timeAgo, getInitials, IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '../lib/helpers'
import * as ideaService from '../services/ideaService'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import type { Idea } from '../types/models'

export default function Ideas() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('business')
  const [filter, setFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: ideas = [] } = useQuery({
    queryKey: ['ideas', filter],
    queryFn: () => ideaService.fetchIdeas(filter)
  })

  const createIdea = useMutation({
    mutationFn: () => ideaService.createIdea({ title, description, category, authorId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      toast.success('Idée proposée', `"${title}" a été ajoutée.`)
      setShowCreate(false)
      setTitle('')
      setDescription('')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ideaService.updateIdeaStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      toast.info('Statut de l\'idée mis à jour')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const vote = useMutation({
    mutationFn: ({ ideaId, voteVal }: { ideaId: string; voteVal: number }) =>
      ideaService.voteOnIdea(ideaId, user!.id, voteVal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] }),
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const deleteIdeaMut = useMutation({
    mutationFn: (ideaId: string) => ideaService.deleteIdea(ideaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      toast.success('Idée supprimée')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Lightbulb size={28} style={{ color: 'var(--warning)', verticalAlign: 'middle', marginRight: 8 }} />
            Idées
          </h1>
          <p className="page-subtitle">Partagez et votez pour les meilleures idées</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouvelle idée
        </button>
      </div>

      <div className="filters-bar">
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Toutes</button>
        {Object.entries(IDEA_CATEGORY_LABELS).map(([key, label]) => (
          <button key={key} className={`filter-chip ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {ideas.length === 0 ? (
        <div className="empty-state">
          <Lightbulb size={48} />
          <h3>Aucune idée pour le moment</h3>
          <p className="text-sm text-secondary">Partagez votre première idée !</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Proposer une idée
          </button>
        </div>
      ) : (
        <div className="ideas-grid">
          {ideas.map((idea) => {
            const isOwner = idea.author_id === user?.id
            const userVote = idea.idea_votes?.find((v: { user_id: string; vote: number }) => v.user_id === user?.id)
            const totalScore = idea.idea_votes ? idea.idea_votes.reduce((acc: number, v: { vote: number }) => acc + v.vote, 0) : 0

            return (
              <div key={idea.id} className="idea-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="idea-card-category">{IDEA_CATEGORY_LABELS[idea.category]}</div>
                  {isOwner && (
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(idea.id)} title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <h3 className="idea-card-title">{idea.title}</h3>
                {idea.description && <p className="idea-card-desc">{idea.description}</p>}
                <div className="flex items-center gap-2 mb-4">
                  <div className="avatar avatar-sm">{getInitials(idea.profiles?.full_name || 'X')}</div>
                  <span className="text-xs text-secondary">{idea.profiles?.full_name}</span>
                  <span className="text-xs text-tertiary" style={{ marginLeft: 'auto' }}>{timeAgo(idea.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="idea-votes flex items-center gap-2">
                    <button
                      className={`idea-vote-btn ${userVote?.vote === 1 ? 'voted' : ''}`}
                      onClick={() => vote.mutate({ ideaId: idea.id, voteVal: 1 })}
                      style={{ color: userVote?.vote === 1 ? 'var(--success)' : '' }}
                    >
                      <ThumbsUp size={14} />
                    </button>
                    <span className="font-bold text-lg" style={{ minWidth: 24, textAlign: 'center' }}>{totalScore}</span>
                    <button
                      className={`idea-vote-btn ${userVote?.vote === -1 ? 'voted' : ''}`}
                      onClick={() => vote.mutate({ ideaId: idea.id, voteVal: -1 })}
                      style={{ color: userVote?.vote === -1 ? 'var(--danger)' : '' }}
                    >
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                  {/* Only the author can change status */}
                  {isOwner ? (
                    <select
                      className="filter-select"
                      style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem' }}
                      value={idea.status}
                      onChange={(e) => updateStatus.mutate({ id: idea.id, status: e.target.value })}
                    >
                      {Object.entries(IDEA_STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`badge badge-status-${idea.status === 'accepted' ? 'done' : idea.status === 'rejected' ? 'todo' : 'in_progress'}`}>
                      {IDEA_STATUS_LABELS[idea.status]}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nouvelle idée</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="input-wrapper">
                <label className="input-label">Catégorie</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.entries(IDEA_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Titre *</label>
                <input className="input" placeholder="Votre idée en une phrase" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Description</label>
                <textarea className="input textarea" placeholder="Détaillez votre idée..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createIdea.mutate()} disabled={!title || createIdea.isPending}>
                <Lightbulb size={14} /> Proposer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer l'idée"
          message="Cette idée et ses votes seront supprimés définitivement."
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={() => deleteIdeaMut.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
