import { useState } from 'react'

export default function AuthModal({ isOpen, onAuthSuccess }) {
  const [tab, setTab] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (tab === 'login') {
        await onAuthSuccess('login', { email, password })
      } else {
        if (!name.trim()) {
          setError('Name is required')
          setIsLoading(false)
          return
        }
        await onAuthSuccess('register', { email, password, name })
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" role="dialog" aria-modal="true">
      <div className="auth-modal-card">
        {/* Header Icon & Title */}
        <div className="auth-modal__header">
          <div className="auth-modal__logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="auth-modal__title">Welcome to Noteroo</h2>
          <p className="auth-modal__subtitle">
            {tab === 'login' ? 'Sign in to access your personal notes' : 'Create an account to save your private notes'}
          </p>
        </div>

        {/* 3-Day / 30-Day Session Badge */}
        <div className="auth-modal__session-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Secured 30-day session active</span>
        </div>

        {/* Tabs */}
        <div className="auth-modal__tabs">
          <button
            type="button"
            className={`auth-modal__tab ${tab === 'login' ? 'auth-modal__tab--active' : ''}`}
            onClick={() => {
              setTab('login')
              setError('')
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-modal__tab ${tab === 'register' ? 'auth-modal__tab--active' : ''}`}
            onClick={() => {
              setTab('register')
              setError('')
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-modal__error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-modal__form">
          {tab === 'register' && (
            <div className="auth-modal__field">
              <label className="auth-modal__label" htmlFor="auth-name">Your Name</label>
              <input
                id="auth-name"
                type="text"
                className="auth-modal__input"
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={tab === 'register'}
              />
            </div>
          )}

          <div className="auth-modal__field">
            <label className="auth-modal__label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="auth-modal__input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-modal__field">
            <label className="auth-modal__label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="auth-modal__input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-modal__submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="auth-modal__spinner-wrapper">
                <svg className="auth-modal__spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>Processing...</span>
              </span>
            ) : tab === 'login' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
