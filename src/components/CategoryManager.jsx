import { useState } from 'react'
import ConfirmModal from './ConfirmModal'

const COLOR_PRESETS = [
  '#7c3aed', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Indigo
  '#06b6d4', // Cyan
  '#64748b', // Slate
]

export default function CategoryManager({ categories, onCreateCategory, onUpdateCategory, onDeleteCategory, onBack }) {
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setError('')
    setIsSubmitting(true)
    try {
      await onCreateCategory({ name: newCatName.trim(), color: newCatColor })
      setNewCatName('')
      setNewCatColor(COLOR_PRESETS[0])
    } catch (err) {
      setError(err.message || 'Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = (cat) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditColor(cat.color || COLOR_PRESETS[0])
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
  }

  const handleUpdate = async (id) => {
    if (!editName.trim()) return
    setError('')
    try {
      await onUpdateCategory(id, { name: editName.trim(), color: editColor })
      setEditingId(null)
    } catch (err) {
      setError(err.message || 'Failed to update category')
    }
  }

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeletingCat, setIsDeletingCat] = useState(false)

  const handleConfirmDeleteCat = async () => {
    if (!deleteTarget) return
    setIsDeletingCat(true)
    try {
      await onDeleteCategory(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message || 'Failed to delete category')
    } finally {
      setIsDeletingCat(false)
    }
  }

  return (
    <div className="category-manager">
      <div className="category-manager__header">
        <button className="editor-back-btn" onClick={onBack} title="Back to dashboard">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Notes</span>
        </button>
        <h1 className="category-manager__title">Manage Categories</h1>
      </div>

      {error && <div className="category-manager__error">{error}</div>}

      <div className="category-manager__content">
        {/* Create Form */}
        <form className="category-card category-card--create" onSubmit={handleCreate}>
          <h3>Add New Category</h3>
          <div className="category-form-group">
            <input
              type="text"
              className="category-input"
              placeholder="Category name (e.g. Finance, Projects...)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
          </div>

          <div className="category-form-group">
            <label className="category-label">Color Badge</label>
            <div className="color-presets">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-preset-btn ${newCatColor === color ? 'color-preset-btn--selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCatColor(color)}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="category-submit-btn"
            disabled={isSubmitting || !newCatName.trim()}
          >
            {isSubmitting ? 'Creating...' : '+ Add Category'}
          </button>
        </form>

        {/* Category List */}
        <div className="category-list">
          <h3>Existing Categories ({categories.length})</h3>
          {categories.length === 0 ? (
            <p className="category-empty">No categories created yet.</p>
          ) : (
            <div className="category-grid">
              {categories.map((cat) => (
                <div key={cat.id} className="category-item-card">
                  {editingId === cat.id ? (
                    <div className="category-item-edit">
                      <input
                        type="text"
                        className="category-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                      <div className="color-presets small">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`color-preset-btn ${editColor === color ? 'color-preset-btn--selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => setEditColor(color)}
                          />
                        ))}
                      </div>
                      <div className="category-item-actions">
                        <button className="btn-save" onClick={() => handleUpdate(cat.id)}>Save</button>
                        <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="category-item-view">
                      <div className="category-item-info">
                        <span className="category-badge" style={{ backgroundColor: cat.color || '#7c3aed' }} />
                        <span className="category-name">{cat.name}</span>
                        <span className="category-count">{cat.note_count || 0} notes</span>
                      </div>
                      <div className="category-item-buttons">
                        <button className="btn-icon" onClick={() => startEdit(cat)} title="Edit category">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="btn-icon btn-icon--delete" onClick={() => setDeleteTarget({ id: cat.id, name: cat.name, noteCount: cat.note_count })} title="Delete category">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Category?"
        message={deleteTarget ? `Are you sure you want to delete category "${deleteTarget.name}"? ${deleteTarget.noteCount > 0 ? `(${deleteTarget.noteCount} note(s) will become uncategorized)` : ''}` : ''}
        confirmText="Delete Category"
        cancelText="Cancel"
        danger={true}
        isLoading={isDeletingCat}
        onConfirm={handleConfirmDeleteCat}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
