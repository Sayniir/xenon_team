import { NavLink, useLocation } from 'react-router-dom'
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
  Clock
} from 'lucide-react'
import { useState, useEffect } from 'react'
import LogWorkModal from '../shared/LogWorkModal'
import { useTimerStore } from '../../stores/timerStore'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { getInitials } from '../../lib/helpers'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
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
  const location = useLocation()
  
  const [showLogModal, setShowLogModal] = useState(false)
  
  // Real-time tick for UI format
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    let int: number
    if (timer.isRunning) {
      int = window.setInterval(() => setTicks(t => t + 1), 1000)
    }
    return () => window.clearInterval(int)
  }, [timer.isRunning])

  const formatSecs = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
      
      <div style={{ padding: '0 16px 16px' }}>
        <button 
          className={`btn ${timer.isRunning ? 'btn-danger' : 'btn-primary'}`}
          style={{ width: '100%', justifyContent: 'center', gap: 8 }}
          onClick={() => setShowLogModal(true)}
        >
          {timer.isRunning ? (
            <><Clock size={16} className="animate-pulse" /> {formatSecs(timer.getComputedSeconds())}</>
          ) : (
            <><Zap size={16} /> Chrono & Heures</>
          )}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
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
          style={{ width: '100%' }}
        >
          <Bell size={18} />
          <span>Notifications</span>
        </button>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span>Paramètres</span>
        </NavLink>

        <div className="sidebar-user" onClick={() => signOut()}>
          <div className="avatar avatar-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              getInitials(user?.full_name || 'X')
            )}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{user?.role || 'Associé'}</div>
          </div>
          <LogOut size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
      </div>

      {showLogModal && <LogWorkModal onClose={() => setShowLogModal(false)} />}
    </aside>
  )
}
