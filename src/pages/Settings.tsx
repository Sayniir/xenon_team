import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Settings as SettingsIcon, User, LogOut, Zap, Camera } from 'lucide-react'
import { getInitials } from '../lib/helpers'
import { supabase } from '../lib/supabase'
import { useUploadStore } from '../stores/uploadStore'

export default function Settings() {
  const { user, signOut, fetchProfile } = useAuthStore()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { startUpload } = useUploadStore()

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ full_name: fullName, updated_at: new Date().toISOString() }).eq('id', user.id)
    await fetchProfile(user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Math.random()}.${fileExt}`
    
    // Le bouton upload a été cliqué, on démarre en background !
    startUpload(file, 'avatars', filePath, async () => {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)
      await fetchProfile(user.id)
    })
  }

  return (
    <div className="page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <SettingsIcon size={28} style={{ color: 'var(--text-secondary)', verticalAlign: 'middle', marginRight: 8 }} />
            Paramètres
          </h1>
          <p className="page-subtitle">Gérez votre profil et vos préférences</p>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">
          <User size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          Profil
        </h3>

        <div className="card" style={{ maxWidth: 500 }}>
          <div className="flex items-center gap-6 mb-6">
            <div className="avatar avatar-xl" style={{ position: 'relative' }}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                getInitials(user?.full_name || 'X')
              )}
              
              <label 
                style={{ 
                  position: 'absolute', bottom: -5, right: -5, background: 'var(--primary-500)', 
                  color: 'white', padding: 6, borderRadius: '50%', cursor: 'pointer',
                  border: '2px solid var(--bg-surface)', boxShadow: 'var(--shadow-glow-sm)'
                }}
                title="Changer de photo"
              >
                <Camera size={14} />
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={saving} />
              </label>
            </div>
            
            <div>
              <div className="font-bold text-lg">{user?.full_name}</div>
              <div className="text-sm text-secondary">{user?.email}</div>
              <div className="badge mt-2">{user?.role || 'Associé'}</div>
            </div>
          </div>

          <div className="input-wrapper mb-4">
            <label className="input-label">Nom complet</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">
          <Zap size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
          À propos
        </h3>
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="flex items-center gap-3 mb-4">
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary-500), var(--accent-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-sm)'
            }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <div className="font-bold">Xenon Team</div>
              <div className="text-xs text-tertiary">Version 1.0.0</div>
            </div>
          </div>
          <p className="text-sm text-secondary">
            Espace de travail privé pour votre équipe. Centralisez vos tâches, projets, idées et communications.
          </p>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title" style={{ color: 'var(--danger)' }}>Zone Danger</h3>
        <button className="btn btn-danger" onClick={() => signOut()}>
          <LogOut size={16} /> Se déconnecter
        </button>
      </div>
    </div>
  )
}
