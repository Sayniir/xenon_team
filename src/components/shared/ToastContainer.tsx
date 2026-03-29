import { useToastStore } from '../../stores/toastStore'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle
}

const COLORS = {
  success: { border: 'var(--success-border)', icon: 'var(--success)', bg: 'var(--success-bg)' },
  error: { border: 'var(--danger-border)', icon: 'var(--danger)', bg: 'var(--danger-bg)' },
  info: { border: 'var(--info-border)', icon: 'var(--info)', bg: 'var(--info-bg)' },
  warning: { border: 'var(--warning-border)', icon: 'var(--warning)', bg: 'var(--warning-bg)' }
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type]
        const colors = COLORS[toast.type]
        return (
          <div
            key={toast.id}
            className="toast animate-slide-in"
            style={{ borderLeft: `3px solid ${colors.border}` }}
          >
            <Icon size={18} style={{ color: colors.icon, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button
              className="btn btn-ghost btn-icon"
              style={{ width: 24, height: 24, flexShrink: 0 }}
              onClick={() => removeToast(toast.id)}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
