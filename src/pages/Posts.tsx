import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { FileText, Plus, MessageCircle, X, Send } from 'lucide-react'
import { timeAgo, getInitials, POST_TYPE_LABELS } from '../lib/helpers'
import type { Post, Comment } from '../types/models'

export default function Posts() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState<string>('update')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [filter, setFilter] = useState('all')

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', filter],
    queryFn: async () => {
      let q = supabase
        .from('posts')
        .select('*, profiles:author_id(id, full_name, avatar_url)')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      if (filter !== 'all') q = q.eq('type', filter)
      const { data } = await q
      return (data || []) as Post[]
    }
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', expandedPost],
    queryFn: async () => {
      if (!expandedPost) return []
      const { data } = await supabase
        .from('post_comments')
        .select('*, profiles:author_id(id, full_name, avatar_url)')
        .eq('post_id', expandedPost)
        .order('created_at', { ascending: true })
      return (data || []) as Comment[]
    },
    enabled: !!expandedPost
  })

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('posts').insert({
        title, content, type: postType, author_id: user!.id
      })
      if (error) throw error
      // Log activity
      await supabase.from('activities').insert({
        user_id: user!.id, action: 'created_post',
        entity_type: 'post', entity_id: crypto.randomUUID(),
        metadata: { title }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setShowCreate(false)
      setTitle('')
      setContent('')
    }
  })

  const addComment = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from('post_comments').insert({
        post_id: postId, author_id: user!.id, content: commentText
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments'] })
      setCommentText('')
    }
  })

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <FileText size={28} style={{ color: 'var(--accent-500)', verticalAlign: 'middle', marginRight: 8 }} />
            Journal
          </h1>
          <p className="page-subtitle">Partagez vos avancées, idées et updates</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Nouveau post
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tout</button>
        {Object.entries(POST_TYPE_LABELS).map(([key, label]) => (
          <button key={key} className={`filter-chip ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Nouveau post</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-wrapper">
                <label className="input-label">Type</label>
                <select className="input" value={postType} onChange={(e) => setPostType(e.target.value)}>
                  {Object.entries(POST_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="input-wrapper">
                <label className="input-label">Titre</label>
                <input className="input" placeholder="Titre du post" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Contenu</label>
                <textarea className="input textarea" placeholder="Écrivez votre message..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createPost.mutate()} disabled={!title || !content}>
                <Send size={14} /> Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="feed-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>Aucun post pour le moment</h3>
            <p className="text-sm text-secondary">Soyez le premier à publier quelque chose !</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Créer un post
            </button>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-card-header">
                <div className="avatar">
                  {getInitials(post.profiles?.full_name || 'X')}
                </div>
                <div>
                  <div className="post-card-author">{post.profiles?.full_name}</div>
                  <div className="post-card-date">{timeAgo(post.created_at)}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <span className="badge badge-status-in_progress">{POST_TYPE_LABELS[post.type]}</span>
                </div>
              </div>
              <h3 className="post-card-title">{post.title}</h3>
              <div className="post-card-content">{post.content}</div>
              <div className="post-card-footer">
                <div
                  className="post-card-action"
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                >
                  <MessageCircle size={14} />
                  Commentaires
                </div>
              </div>

              {/* Comments */}
              {expandedPost === post.id && (
                <div className="comments-section animate-fade-in">
                  <div className="comment-list">
                    {comments.map((c) => (
                      <div key={c.id} className="comment-item">
                        <div className="avatar avatar-sm">
                          {getInitials(c.profiles?.full_name || 'X')}
                        </div>
                        <div className="comment-body">
                          <div className="comment-author">{c.profiles?.full_name}</div>
                          <div className="comment-text">{c.content}</div>
                          <div className="comment-time">{timeAgo(c.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="comment-input-row">
                    <input
                      className="input"
                      placeholder="Écrire un commentaire..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && commentText.trim()) {
                          addComment.mutate(post.id)
                        }
                      }}
                    />
                    <button className="btn btn-primary btn-icon" onClick={() => commentText.trim() && addComment.mutate(post.id)}>
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
