import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { FileText, Plus, MessageCircle, X, Send, Edit2, Trash2, Pin, Save } from 'lucide-react'
import { timeAgo, getInitials, POST_TYPE_LABELS } from '../lib/helpers'
import * as postService from '../services/postService'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import type { Post, Comment } from '../types/models'

export default function Posts() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState<string>('update')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [filter, setFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Edit state
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', filter],
    queryFn: () => postService.fetchPosts(filter)
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', expandedPost],
    queryFn: () => postService.fetchPostComments(expandedPost!),
    enabled: !!expandedPost
  })

  const createPost = useMutation({
    mutationFn: () => postService.createPost({ title, content, type: postType, authorId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post publié', `"${title}" a été publié.`)
      setShowCreate(false)
      setTitle('')
      setContent('')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const updatePost = useMutation({
    mutationFn: ({ postId, updates }: { postId: string; updates: Parameters<typeof postService.updatePost>[1] }) =>
      postService.updatePost(postId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post mis à jour')
      setEditingPost(null)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const deletePostMut = useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post supprimé')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const togglePin = useMutation({
    mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) =>
      postService.updatePost(postId, { pinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.info('Post épinglé mis à jour')
    }
  })

  const addComment = useMutation({
    mutationFn: (postId: string) => postService.addPostComment(postId, user!.id, commentText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments'] })
      setCommentText('')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  function startEditing(post: Post) {
    setEditingPost(post.id)
    setEditTitle(post.title)
    setEditContent(post.content)
  }

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
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}><X size={18} /></button>
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
                <label className="input-label">Titre *</label>
                <input className="input" placeholder="Titre du post" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Contenu *</label>
                <textarea className="input textarea" placeholder="Écrivez votre message..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => createPost.mutate()} disabled={!title || !content || createPost.isPending}>
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
          posts.map((post) => {
            const isOwner = post.author_id === user?.id
            const isEditMode = editingPost === post.id

            return (
              <div key={post.id} className={`post-card ${post.pinned ? 'post-pinned' : ''}`}>
                <div className="post-card-header">
                  <div className="avatar">
                    {getInitials(post.profiles?.full_name || 'X')}
                  </div>
                  <div>
                    <div className="post-card-author">{post.profiles?.full_name}</div>
                    <div className="post-card-date">{timeAgo(post.created_at)}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {post.pinned && <Pin size={14} style={{ color: 'var(--warning)' }} />}
                    <span className="badge badge-status-in_progress">{POST_TYPE_LABELS[post.type]}</span>
                    {isOwner && !isEditMode && (
                      <>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => startEditing(post)} title="Modifier">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => togglePin.mutate({ postId: post.id, pinned: !post.pinned })} title={post.pinned ? 'Désépingler' : 'Épingler'}>
                          <Pin size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(post.id)} title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    <textarea className="input textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} />
                    <div className="flex gap-2 justify-end">
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingPost(null)}>Annuler</button>
                      <button className="btn btn-primary btn-sm" onClick={() => updatePost.mutate({ postId: post.id, updates: { title: editTitle, content: editContent } })} disabled={!editTitle || !editContent}>
                        <Save size={14} /> Sauvegarder
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="post-card-title">{post.title}</h3>
                    <div className="post-card-content">{post.content}</div>
                  </>
                )}

                <div className="post-card-footer">
                  <div className="post-card-action" onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}>
                    <MessageCircle size={14} /> Commentaires
                  </div>
                </div>

                {expandedPost === post.id && (
                  <div className="comments-section animate-fade-in">
                    <div className="comment-list">
                      {comments.map((c) => (
                        <div key={c.id} className="comment-item">
                          <div className="avatar avatar-sm">{getInitials(c.profiles?.full_name || 'X')}</div>
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
                        onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) addComment.mutate(post.id) }}
                      />
                      <button className="btn btn-primary btn-icon" onClick={() => commentText.trim() && addComment.mutate(post.id)}>
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Supprimer le post"
          message="Ce post et tous ses commentaires seront supprimés définitivement."
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={() => deletePostMut.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
