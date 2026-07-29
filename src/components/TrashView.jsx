import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import ConfirmModal from './ConfirmModal'

export default function TrashView({ onRestoreNote }) {
  const [trashNotes, setTrashNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: () => {},
  })
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchTrash = async () => {
    setIsLoading(true)
    try {
      const data = await api.getTrashNotes()
      setTrashNotes(data)
    } catch (err) {
      console.error('Error fetching trash:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrash()
  }, [])

  const getDaysRemaining = (deletedAt) => {
    if (!deletedAt) return 30
    const deletedDate = new Date(deletedAt)
    const now = new Date()
    const diffDays = Math.floor((now - deletedDate) / (1000 * 60 * 60 * 24))
    const remaining = 30 - diffDays
    return remaining > 0 ? remaining : 0
  }

  const handleRestore = async (id) => {
    try {
      await api.restoreNote(id)
      setTrashNotes((prev) => prev.filter((n) => n.id !== id))
      if (onRestoreNote) onRestoreNote()
    } catch (err) {
      console.error('Error restoring note:', err)
    }
  }

  const promptPermanentDelete = (note) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete Permanently?',
      message: `Are you sure you want to permanently delete "${note.title || 'Untitled'}"? This action cannot be undone and will not be recoverable.`,
      confirmText: 'Delete Permanently',
      onConfirm: async () => {
        setIsProcessing(true)
        try {
          await api.permanentDeleteNote(note.id)
          setTrashNotes((prev) => prev.filter((n) => n.id !== note.id))
          setModalConfig((prev) => ({ ...prev, isOpen: false }))
        } catch (err) {
          console.error('Error permanently deleting note:', err)
        } finally {
          setIsProcessing(false)
        }
      },
    })
  }

  const promptEmptyTrash = () => {
    setModalConfig({
      isOpen: true,
      title: 'Empty Trash?',
      message: `Are you sure you want to permanently delete all ${trashNotes.length} item(s) in the trash? This action cannot be undone.`,
      confirmText: 'Empty Trash',
      onConfirm: async () => {
        setIsProcessing(true)
        try {
          await api.emptyTrash()
          setTrashNotes([])
          setModalConfig((prev) => ({ ...prev, isOpen: false }))
        } catch (err) {
          console.error('Error emptying trash:', err)
        } finally {
          setIsProcessing(false)
        }
      },
    })
  }

  return (
    <div className="trash-view">
      <div className="trash-header">
        <div className="trash-header__left">
          <div className="trash-header__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <div>
            <h1 className="trash-title">Trash</h1>
            <p className="trash-subtitle">Items in trash are permanently deleted after 30 days.</p>
          </div>
        </div>

        {trashNotes.length > 0 && (
          <button
            type="button"
            className="empty-trash-btn"
            onClick={promptEmptyTrash}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            <span>Empty Trash</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading trash...</p>
        </div>
      ) : trashNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <p className="empty-state__text">Trash is empty</p>
        </div>
      ) : (
        <div className="note-grid">
          {trashNotes.map((note) => {
            const daysLeft = getDaysRemaining(note.deleted_at)
            return (
              <div key={note.id} className={`note-card note-card--${note.color || 'orange'} trash-card`}>
                <div className="note-card__content">
                  <div className="trash-card__badge-row">
                    {note.category_name && (
                      <span className="note-card__category-badge">
                        <span
                          className="note-card__category-dot"
                          style={{ backgroundColor: note.category_color || '#7c3aed' }}
                        />
                        {note.category_name}
                      </span>
                    )}
                    <span className="trash-card__days-tag">
                      {daysLeft} days left
                    </span>
                  </div>
                  <h3 className="note-card__title">{note.title || 'Untitled'}</h3>
                </div>

                <div className="trash-card__actions">
                  <button
                    type="button"
                    className="trash-action-btn trash-action-btn--restore"
                    onClick={() => handleRestore(note.id)}
                    title="Restore Note"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    className="trash-action-btn trash-action-btn--delete"
                    onClick={() => promptPermanentDelete(note)}
                    title="Delete Permanently"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText="Cancel"
        danger={true}
        isLoading={isProcessing}
        onConfirm={modalConfig.onConfirm}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  )
}
