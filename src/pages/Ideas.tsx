import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Lightbulb, Plus, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { timeAgo, getInitials, IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '../lib/helpers'
import type { Idea } from '../types/models'

export default function Ideas() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('business')
  const [filter, setFilter] = useState('all')

  const { data: ideas = [] } = useQuery({
    queryKey: ['ideas', filter],
    queryFn: async () => {
      let q = supabase
        .from('ideas')
        .select('*, profiles:author_id(full_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('category', filter)
      const { data } = await q
      return (data || []) as Idea[]
    }
  })

  const createIdea = useMutation({
    mutationFn: async () => {
      await supabase.from('ideas').insert({
        title, description: description || null, category, author_id: user!.id
      })
      await supabase.from('activities').insert({
        user_id: user!.id, action: 'created_idea',
        entity_type: 'idea', entity_id: crypto.randomUUID(),
        metadata: { title }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] })
      setShowCreate(false)
      setTitle('')
      setDescription('')
    }
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from('ideas').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] })
  })

  const vote = useMutation({
    mutationFn: async ({ ideaId, voteVal }: { ideaId: string; voteVal: number }) => {
      await supabase.from('idea_votes').upsert({
        idea_id: ideaId, user_id: user!.id, vote: voteVal
      }, { onConflict: 'idea_id,user_id' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas'] })
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
          {ideas.map((idea) => (
            <div key={idea.id} className="idea-card">
              <div className="idea-card-category">{IDEA_CATEGORY_LABELS[idea.category]}</div>
              <h3 className="idea-card-title">{idea.title}</h3>
              {idea.description && <p className="idea-card-desc">{idea.description}</p>}
              <div className="flex items-center gap-2 mb-4">
                <div className="avatar avatar-sm">{getInitials(idea.profiles?.full_name || 'X')}</div>
                <span className="text-xs text-secondary">{idea.profiles?.full_name}</span>
                <span className="text-xs text-tertiary" style={{ marginLeft: 'auto' }}>{timeAgo(idea.created_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="idea-votes">
                  <button className="idea-vote-btn" onClick={() => vote.mutate({ ideaId: idea.id, voteVal: 1 })}>
                    <ThumbsUp size={14} /> Pour
                  </button>
                  <button className="idea-vote-btn" onClick={() => vote.mutate({ ideaId: idea.id, voteVal: -1 })}>
                    <ThumbsDown size={14} /> Contre
                  </button>
                </div>
                <select
                  className="input"
                  style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem' }}
                  value={idea.status}
                  onChange={(e) => updateStatus.mutate({ id: idea.id, status: e.target.value })}
                >
                  {Object.entries(IDEA_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
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
                <input className="input" placeholder="Votre idée en une phrase" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Description</label>
                <textarea className="input textarea" placeholder="Détaillez votre idée..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createIdea.mutate()} disabled={!title}>
                <Lightbulb size={14} /> Proposer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
