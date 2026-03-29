import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { supabase } from '../lib/supabase'
import { MessageSquare, Send, ChevronUp, Loader2 } from 'lucide-react'
import { getInitials, timeAgo } from '../lib/helpers'
import * as chatService from '../services/chatService'
import type { ChatMessage } from '../types/models'

export default function Chat() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToastStore()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)

  // Initial load
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['chat-initial'],
    queryFn: () => chatService.fetchChatMessages(0),
    enabled: initialLoad
  })

  useEffect(() => {
    if (initialData) {
      setAllMessages(initialData.messages)
      setHasMore(initialData.hasMore)
      setInitialLoad(false)
      // Scroll to bottom on initial load
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100)
    }
  }, [initialData])

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          // Fetch the full message with profile info
          const { data } = await supabase
            .from('chat_messages')
            .select('*, profiles:author_id(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single()
          if (data) {
            setAllMessages((prev) => [...prev, data as ChatMessage])
            // Auto-scroll if already near bottom
            const container = scrollContainerRef.current
            if (container) {
              const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200
              if (isNearBottom) {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
              }
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Load more (older messages)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await chatService.fetchChatMessages(nextPage)
      setAllMessages((prev) => [...result.messages, ...prev])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch (err) {
      toast.error('Erreur de chargement')
    } finally {
      setLoadingMore(false)
    }
  }, [page, hasMore, loadingMore, toast])

  const sendMessage = useMutation({
    mutationFn: () => chatService.sendChatMessage(message, user!.id),
    onSuccess: () => setMessage(''),
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const handleSend = () => {
    if (!message.trim()) return
    sendMessage.mutate()
  }

  const groupMessagesByDate = (msgs: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = []
    let currentDate = ''
    msgs.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      })
      if (date !== currentDate) {
        currentDate = date
        groups.push({ date, messages: [m] })
      } else {
        groups[groups.length - 1].messages.push(m)
      }
    })
    return groups
  }

  const messageGroups = groupMessagesByDate(allMessages)

  return (
    <div
      className="animate-fade-in"
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--titlebar-height))' }}
    >
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <MessageSquare size={22} style={{ color: 'var(--primary-400)' }} />
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Messagerie</h2>
          <span className="text-xs text-secondary">Canal Général • {allMessages.length} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {/* Load More */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <button className="btn btn-secondary btn-sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <Loader2 size={14} className="animate-pulse" /> : <ChevronUp size={14} />}
              {loadingMore ? 'Chargement...' : 'Charger les anciens messages'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="loading-page"><div className="loading-spinner" /></div>
        ) : (
          messageGroups.map((group) => (
            <div key={group.date}>
              <div className="chat-date-divider">
                <span>{group.date}</span>
              </div>
              {group.messages.map((msg) => {
                const isMe = msg.author_id === user?.id
                return (
                  <div key={msg.id} className={`chat-message ${isMe ? 'chat-message-mine' : ''}`}>
                    {!isMe && (
                      <div className="avatar avatar-sm" style={{ alignSelf: 'flex-end' }}>
                        {msg.profiles?.avatar_url ? (
                          <img src={msg.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          getInitials(msg.profiles?.full_name || 'X')
                        )}
                      </div>
                    )}
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}`}>
                      {!isMe && <div className="chat-bubble-author">{msg.profiles?.full_name}</div>}
                      <div className="chat-bubble-content">{msg.content}</div>
                      <div className="chat-bubble-time">{timeAgo(msg.created_at)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <input
          className="input"
          placeholder="Écrire un message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={!message.trim() || sendMessage.isPending}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
