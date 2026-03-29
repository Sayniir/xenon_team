import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, CheckSquare, FolderKanban, FileText, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'

interface GlobalSearchProps {
  onClose: () => void
}

export default function GlobalSearch({ onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null

      const q = `%${debouncedQuery}%`

      const [tasks, projects, posts] = await Promise.all([
        supabase.from('tasks').select('id, title, status').ilike('title', q).limit(5),
        supabase.from('projects').select('id, name, status').ilike('name', q).limit(5),
        supabase.from('posts').select('id, title, type').ilike('title', q).limit(5)
      ])

      return {
        tasks: tasks.data || [],
        projects: projects.data || [],
        posts: posts.data || []
      }
    },
    enabled: debouncedQuery.length >= 2
  })

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleNavigate = (path: string) => {
    navigate(path)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div className="input-wrapper" style={{ width: '100%', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              ref={inputRef}
              className="input"
              style={{ paddingLeft: 44, fontSize: '1.125rem', height: 56 }}
              placeholder="Rechercher des tâches, projets, posts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button 
                className="btn btn-ghost btn-icon" 
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="modal-body" style={{ minHeight: 100, maxHeight: '60vh', overflowY: 'auto', paddingTop: 16 }}>
          {!debouncedQuery || debouncedQuery.length < 2 ? (
            <div className="text-center text-sm text-secondary" style={{ padding: '32px 0' }}>
              Tapez au moins 2 caractères pour rechercher...
            </div>
          ) : isLoading ? (
            <div className="flex justify-center" style={{ padding: '32px 0' }}>
              <Loader2 className="animate-pulse" size={24} style={{ color: 'var(--primary-400)' }} />
            </div>
          ) : results && (results.tasks.length === 0 && results.projects.length === 0 && results.posts.length === 0) ? (
            <div className="text-center text-sm text-secondary" style={{ padding: '32px 0' }}>
              Aucun résultat trouvé pour "{debouncedQuery}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {(results?.tasks?.length || 0) > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Tâches</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {results?.tasks?.map(task => (
                      <div 
                        key={task.id} 
                        className="task-item" 
                        onClick={() => handleNavigate('/tasks')}
                      >
                        <CheckSquare size={16} style={{ color: 'var(--primary-400)' }} />
                        <span className="task-item-title">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(results?.projects?.length || 0) > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Projets</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {results?.projects?.map(project => (
                      <div 
                        key={project.id} 
                        className="task-item"
                        onClick={() => handleNavigate('/projects')}
                      >
                        <FolderKanban size={16} style={{ color: 'var(--success)' }} />
                        <span className="task-item-title">{project.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(results?.posts?.length || 0) > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-tertiary uppercase tracking-wider mb-2">Journal / Posts</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {results?.posts?.map(post => (
                      <div 
                        key={post.id} 
                        className="task-item"
                        onClick={() => handleNavigate('/posts')}
                      >
                        <FileText size={16} style={{ color: 'var(--accent-500)' }} />
                        <span className="task-item-title">{post.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
