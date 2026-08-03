import { useState, useRef } from 'react'

export default function ProfileModal({ isOpen, user, onSaveProfile, onClose }) {
  const [name, setName] = useState(user?.name || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const userInitial = (name || user?.email || 'U').charAt(0).toUpperCase()

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAvatarUrl(compressedDataUrl)
      }
      img.onerror = () => {
        setError('Failed to load image file')
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setAvatarUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await onSaveProfile({ name: name.trim(), avatar_url: avatarUrl || null })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal__header">
          <h2 className="profile-modal__title">Account Profile</h2>
          <button type="button" className="profile-modal__close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="profile-modal__error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-modal__form">
          {/* Avatar Photo Section */}
          <div className="profile-modal__avatar-section">
            <div className="profile-modal__avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile Avatar" className="profile-modal__avatar-img" />
              ) : (
                <div className="profile-modal__avatar-initial">{userInitial}</div>
              )}
            </div>

            <div className="profile-modal__avatar-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="avatar-upload-input"
              />
              <label htmlFor="avatar-upload-input" className="profile-modal__btn profile-modal__btn--upload">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload Photo</span>
              </label>

              {avatarUrl && (
                <button
                  type="button"
                  className="profile-modal__btn profile-modal__btn--remove"
                  onClick={handleRemovePhoto}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="profile-modal__field">
            <label className="profile-modal__label" htmlFor="profile-email">Email Address</label>
            <input
              id="profile-email"
              type="email"
              className="profile-modal__input profile-modal__input--disabled"
              value={user?.email || ''}
              disabled
            />
          </div>

          <div className="profile-modal__field">
            <label className="profile-modal__label" htmlFor="profile-name">Display Name</label>
            <input
              id="profile-name"
              type="text"
              className="profile-modal__input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="profile-modal__actions">
            <button
              type="button"
              className="profile-modal__btn profile-modal__btn--cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-modal__btn profile-modal__btn--save"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
