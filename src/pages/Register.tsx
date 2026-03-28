import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Zap, Mail, Lock, User, Loader2 } from 'lucide-react'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    const { error } = await signUp(email, password, fullName)
    if (error) {
      setError(error)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/'), 1500)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-particles">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="login-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={28} color="#fff" />
          </div>
          <h1>Xenon Team</h1>
          <p>Créer votre compte</p>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--success)',
            fontSize: '0.875rem'
          }}>
            Compte créé avec succès ! Redirection...
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <label className="input-label">Nom complet</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                type="text"
                placeholder="Votre nom"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div className="input-wrapper">
            <label className="input-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <div className="input-wrapper">
            <label className="input-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                type="password"
                placeholder="Minimum 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <Loader2 size={18} className="loading-spinner" /> : "Créer mon compte"}
          </button>
        </form>

        <div className="login-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </div>
      </div>
    </div>
  )
}
