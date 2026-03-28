import { useState, useEffect } from 'react'
import { DownloadCloud, ArrowUpCircle } from 'lucide-react'

export default function AutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    // @ts-ignore - Exists via contextBridge
    const updater = window.electronAPI?.updater
    if (!updater) return

    updater.onUpdateAvailable(() => {
      setUpdateAvailable(true)
    })

    updater.onDownloadProgress((pct: number) => {
      setProgress(Math.round(pct))
    })

    updater.onUpdateDownloaded(() => {
      setDownloaded(true)
    })
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="card animate-fade-in" style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 340,
      zIndex: 9999,
      boxShadow: 'var(--shadow-glow-md)',
      border: '1px solid var(--primary-500)',
      background: 'var(--bg-card)'
    }}>
      <div className="flex items-center gap-3 mb-3">
        {downloaded ? (
          <ArrowUpCircle size={24} style={{ color: 'var(--success)' }} />
        ) : (
          <DownloadCloud size={24} className="animate-pulse" style={{ color: 'var(--primary-400)' }} />
        )}
        <div>
          <h4 className="font-bold text-sm">
            {downloaded ? 'Mise à jour prête !' : 'Mise à jour en cours...'}
          </h4>
          <p className="text-xs text-secondary">
            {downloaded 
              ? "L'Échelon Supérieur est prêt à être installé." 
              : "Téléchargement silencieux en arrière-plan."
            }
          </p>
        </div>
      </div>

      {!downloaded && (
        <div style={{ padding: '8px 0' }}>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--primary-200)' }}>Progression</span>
            <span className="font-bold" style={{ color: 'var(--primary-400)' }}>{progress}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--primary-500), var(--accent-500))',
              transition: 'width 0.2s ease-out',
              boxShadow: '0 0 10px var(--primary-500)'
            }} />
          </div>
        </div>
      )}

      {downloaded && (
        <button 
          className="btn btn-primary w-full mt-2"
          onClick={() => {
            // @ts-ignore
            window.electronAPI.updater.quitAndInstall()
          }}
        >
          Redémarrer et Installer 🚀
        </button>
      )}
    </div>
  )
}
