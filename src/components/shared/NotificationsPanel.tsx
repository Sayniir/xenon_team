import { X, Bell, Check } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timeAgo } from '../../lib/helpers'
import type { Notification } from '../../types/models'

export default function NotificationsPanel() {
  const { notificationsOpen, setNotificationsOpen } = useUIStore()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      return (data || []) as Notification[]
    },
    enabled: !!user
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className={`notifications-panel ${notificationsOpen ? 'open' : ''}`}>
      <div className="notifications-header">
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
          <Bell size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </h3>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => markAllRead.mutate()}>
              <Check size={14} /> Tout lire
            </button>
          )}
          <button className="btn btn-ghost btn-icon" onClick={() => setNotificationsOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 24px' }}>
            <Bell size={40} />
            <h3>Aucune notification</h3>
            <p className="text-sm text-secondary">Vous êtes à jour !</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
              style={{ position: 'relative' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {notif.title}
                </div>
                {notif.message && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {notif.message}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  {timeAgo(notif.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
