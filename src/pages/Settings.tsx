import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Settings as SettingsIcon, Upload, Save, Lock, User, Palette } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { useUploadStore } from '../stores/uploadStore'
import { getInitials } from '../lib/helpers'

export default function Settings() {
  const { user, refreshProfile } = useAuthStore()
  const toast = useToastStore()
  const uploadStore = useUploadStore()
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [role, setRole] = useState(user?.role || 'associé')

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, role, updated_at: new Date().toISOString() })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      refreshProfile()
      toast.success('Profil mis à jour', 'Vos modifications ont été sauvegardées.')
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error('Le mot de passe doit faire au moins 6 caractères.')
      if (newPassword !== confirmPassword) throw new Error('Les mots de passe ne correspondent pas.')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Mot de passe changé', 'Votre mot de passe a été mis à jour avec succès.')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    },
    onError: (err: Error) => toast.error('Erreur', err.message)
  })

  const handleAvatarChange = (file: File) => {
    const path = `${user!.id}/avatar.${file.name.split('.').pop()}`
    uploadStore.startUpload(file, 'avatars', path, async () => {
      const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user!.id)
      refreshProfile()
      toast.success('Photo de profil mise à jour')
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

      {/* Profile Section */}
      <div className="settings-section">
        <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} style={{ color: 'var(--primary-400)' }} /> Profil
        </h3>
        <div className="card">
          <div className="flex items-center gap-6 mb-6">
            <div style={{ position: 'relative' }}>
              <div className="avatar avatar-xl">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  getInitials(user?.full_name || 'X')
                )}
              </div>
              <label
                className="avatar-upload-btn"
                title="Changer la photo de profil"
              >
                <Upload size={14} />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleAvatarChange(f)
                  }}
                />
              </label>
            </div>
            <div>
              <div className="font-bold text-lg">{user?.full_name}</div>
              <div className="text-sm text-secondary">{user?.email}</div>
            </div>
          </div>
          <div className="form-grid-2">
            <div className="input-wrapper">
              <label className="input-label">Nom complet</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="input-wrapper">
              <label className="input-label">Rôle</label>
              <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
              <Save size={14} /> {updateProfile.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="settings-section">
        <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={18} style={{ color: 'var(--warning)' }} /> Sécurité
        </h3>
        <div className="card">
          {showPasswordForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="input-wrapper">
                <label className="input-label">Nouveau mot de passe</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="input-wrapper">
                <label className="input-label">Confirmer le mot de passe</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Retapez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>Le mot de passe doit faire au moins 6 caractères.</p>
              )}
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs" style={{ color: 'var(--danger)' }}>Les mots de passe ne correspondent pas.</p>
              )}
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('') }}>
                  Annuler
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => changePassword.mutate()}
                  disabled={!newPassword || newPassword.length < 6 || newPassword !== confirmPassword || changePassword.isPending}
                >
                  <Lock size={14} /> {changePassword.isPending ? 'Changement...' : 'Changer le mot de passe'}
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-row">
              <div>
                <div className="settings-row-label">Mot de passe</div>
                <div className="settings-row-desc">Changez votre mot de passe de connexion</div>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowPasswordForm(true)}>
                <Lock size={14} /> Changer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* About Section */}
      <div className="settings-section">
        <h3 className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={18} style={{ color: 'var(--accent-500)' }} /> À propos
        </h3>
        <div className="card">
          <div className="settings-row" style={{ borderBottom: 'none' }}>
            <div>
              <div className="settings-row-label">Xenon Team</div>
              <div className="settings-row-desc">Version 1.1.0 — Workspace collaboratif pour équipes ambitieuses</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
