import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  FolderKanban,
  Lightbulb,
  Paperclip,
  Activity,
  Settings,
  LogOut,
  Bell,
  Zap,
  Clock,
  MessageSquare,
  Search
} from 'lucide-react'
import { useState, useEffect } from 'react'
import LogWorkModal from '../shared/LogWorkModal'
import { useTimerStore } from '../../stores/timerStore'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getInitials } from '../../lib/helpers'
import ConfirmDialog from '../shared/ConfirmDialog'
import GlobalSearch from '../shared/GlobalSearch'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/chat', icon: MessageSquare, label: 'Messagerie' },
  { to: '/posts', icon: FileText, label: 'Journal' },
  { to: '/tasks', icon: CheckSquare, label: 'Tâches' },
  { to: '/projects', icon: FolderKanban, label: 'Projets' },
  { to: '/ideas', icon: Lightbulb, label: 'Idées' },
  { to: '/files', icon: Paperclip, label: 'Fichiers' },
  { to: '/activity', icon: Activity, label: 'Activité' }
]

export default function Sidebar() {
  const { user, signOut } = useAuthStore()
  const { setNotificationsOpen } = useUIStore()
  const timer = useTimerStore()
  const navigate = useNavigate()

  const [showLogModal, setShowLogModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Global search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Notification badge count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      return count || 0
    },
    enabled: !!user,
    refetchInterval: 30000
  })

  // Real-time tick for UI format
  const [, setTicks] = useState(0)
  useEffect(() => {
    let int: number
    if (timer.isRunning) {
      int = window.setInterval(() => setTicks((t) => t + 1), 1000)
    }
    return () => window.clearInterval(int)
  }, [timer.isRunning])

  const formatSecs = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleLogout = () => {
    setShowLogoutConfirm(false)
    signOut()
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={20} color="#fff" />
          </div>
          <span className="sidebar-logo-text">Xenon Team</span>
        </div>
      </div>

      <div className="sidebar-actions">
        <button 
          className="search-bar-btn" 
          onClick={() => setShowSearch(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-tertiary)' }}>
            <Search size={16} />
            <span>Rechercher...</span>
          </div>
          <kbd className="kb-shortcut">⌘ K</kbd>
        </button>

        <button
          className={`btn ${timer.isRunning ? 'btn-danger glow-pulse' : 'btn-primary'} w-full`}
          style={{ justifyContent: 'center', gap: 8, marginTop: '12px' }}
          onClick={() => setShowLogModal(true)}
        >
          {timer.isRunning ? (
            <>
              <Clock size={16} className="animate-pulse" /> {formatSecs(timer.getComputedSeconds())}
            </>
          ) : (
            <>
              <Zap size={16} /> Chrono & Heures
            </>
          )}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu Principal</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-link"
          onClick={() => setNotificationsOpen(true)}
          style={{ width: '100%', position: 'relative' }}
        >
          <Bell size={18} />
          <span>Notifications</span>
          {unreadCount > 0 && <span className="sidebar-link-badge">{unreadCount}</span>}
        </button>
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Paramètres</span>
        </NavLink>

        {/* User profile — navigates to settings instead of logging out */}
        <div
          className="sidebar-user"
          onClick={() => navigate('/settings')}
          title="Gérer votre profil"
        >
          <div className="avatar avatar-sm">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              getInitials(user?.full_name || 'X')
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{user?.role || 'Associé'}</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={(e) => {
              e.stopPropagation()
              setShowLogoutConfirm(true)
            }}
            title="Se déconnecter"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {showLogModal && <LogWorkModal onClose={() => setShowLogModal(false)} />}

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Se déconnecter"
          message="Êtes-vous sûr de vouloir vous déconnecter ?"
          confirmLabel="Se déconnecter"
          variant="danger"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </aside>
  )
}
