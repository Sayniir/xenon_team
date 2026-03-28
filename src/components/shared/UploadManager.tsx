import { useUploadStore } from '../../stores/uploadStore'
import { FileUp, CheckCircle2, XCircle, X } from 'lucide-react'

export default function UploadManager() {
  const { tasks, removeTask } = useUploadStore()
  const uploads = Object.values(tasks)

  if (uploads.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      width: 320,
      pointerEvents: 'none' // Click-through the empty space
    }}>
      {uploads.map((task) => (
        <div key={task.id} className="card animate-fade-in" style={{ 
          padding: 16, 
          pointerEvents: 'auto', // Catch clicks on the content 
          boxShadow: 'var(--shadow-glow-md)',
          border: '1px solid rgba(123, 47, 242, 0.4)'
        }}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 truncate" style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              {task.status === 'uploading' && <FileUp size={16} className="animate-pulse" style={{ color: 'var(--primary-400)', flexShrink: 0 }} />}
              {task.status === 'success' && <CheckCircle2 size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />}
              {task.status === 'error' && <XCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />}
              
              <span className="text-sm font-semibold truncate" style={{ flex: 1 }} title={task.fileName}>
                {task.fileName}
              </span>
            </div>
            
            {(task.status === 'success' || task.status === 'error') && (
              <button 
                className="btn btn-ghost btn-icon" 
                style={{ width: 20, height: 20 }} 
                onClick={() => removeTask(task.id)}
              >
                <X size={14} />
              </button>
            )}
            
            {task.status === 'uploading' && (
              <span className="text-xs font-bold" style={{ color: 'var(--accent-500)', flexShrink: 0 }}>
                {task.progress}%
              </span>
            )}
          </div>

          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${task.progress}%`,
              background: task.status === 'error' ? 'var(--danger)' : task.status === 'success' ? 'var(--success)' : 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
              transition: 'width 0.2s ease-out',
              boxShadow: task.status === 'uploading' ? '0 0 10px var(--primary-500)' : 'none'
            }} />
          </div>
          
          {task.status === 'error' && (
            <div className="text-xs mt-2 truncate" style={{ color: 'var(--danger)' }} title={task.error}>
              {task.error}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
