import { useState, useRef, useEffect } from 'react'
import { fastTap } from '../lib/fastTap'
import CategoryIcon from './CategoryIcon'
import { getCategoryColorName } from '../lib/colors'

function hasChecklists(note) {
  if (!note?.content) return false
  try {
    const json = typeof note.content === 'string' ? JSON.parse(note.content) : note.content
    let found = false
    function traverse(node) {
      if (!node || found) return
      if (node.type === 'taskItem' || node.type === 'taskList') {
        found = true
        return
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse)
      }
    }
    traverse(json)
    return found
  } catch {
    return false
  }
}

export default function NoteCard({
  note,
  onClick,
  onTogglePin,
  onDeleteNote,
  onResetCheckmarks,
  canPinMore = true,
  style,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Close 3-dot menu on click outside or escape key
  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const handleMenuToggle = (e) => {
    e.stopPropagation()
    setIsMenuOpen((prev) => !prev)
  }

  const handlePinAction = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    if (onTogglePin) {
      onTogglePin(note)
    }
  }

  const handleEditAction = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    if (onClick) onClick(note)
  }

  const handleDeleteMenuClick = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    if (onDeleteNote) {
      onDeleteNote(note)
    }
  }

  if (!note) return null

  const showPinOption = note.is_pinned || canPinMore

  const cardTapHandlers = fastTap(() => {
    if (onClick) onClick(note)
  })

  // Determine card color strictly from category, or grey if uncategorized
  const cardColor = note.category_id
    ? (getCategoryColorName(note.category_color) || note.color || 'blue')
    : 'grey'

  // Category name or fallback
  const categoryLabel = (note.category_name || 'NO CATEGORY').toUpperCase()

  return (
    <div
      className={`note-card note-card--${cardColor} ${note.is_pinned ? 'note-card--pinned' : ''} ${isMenuOpen ? 'note-card--menu-open' : ''}`}
      {...cardTapHandlers}
      role="button"
      tabIndex={0}
      style={style}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(note)}
    >
      {/* Top Row: Category on Left, Category Icon + 3-Dot Options on Right */}
      <div className="note-card__top">
        <div className="note-card__category">
          {note.is_pinned && (
            <span className="note-card__pinned-star" title="Pinned Note">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
          )}
          <span className="note-card__category-text">{categoryLabel}</span>
        </div>

        <div className="note-card__top-right">
          {/* Category Icon Button - Clicking opens Note Options */}
          <div className="note-card__menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className={`note-card__category-btn ${isMenuOpen ? 'note-card__category-btn--open' : ''}`}
              onClick={handleMenuToggle}
              aria-label="Note options"
              title={note.category_name ? `${note.category_name} (Options)` : 'Note options'}
            >
              <CategoryIcon 
                icon={note.category_icon} 
                fallback={note.category_name} 
                size={18} 
              />
            </button>

            {isMenuOpen && (
              <div className="note-card__dropdown-menu" role="menu">
                {showPinOption && (
                  <button
                    type="button"
                    className="note-card__dropdown-item"
                    onClick={handlePinAction}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    <span>{note.is_pinned ? 'Unpin note' : 'Pin note'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="note-card__dropdown-item"
                  onClick={handleEditAction}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit note</span>
                </button>
                {hasChecklists(note) && onResetCheckmarks && (
                  <button
                    type="button"
                    className="note-card__dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsMenuOpen(false)
                      onResetCheckmarks(note)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <path d="M8 12l2.5 2.5L16 9" opacity="0.4" />
                      <line x1="3" y1="21" x2="21" y2="3" stroke="#ef4444" strokeWidth="2" />
                    </svg>
                    <span>Reset checkmarks</span>
                  </button>
                )}
                {onDeleteNote && (
                  <button
                    type="button"
                    className="note-card__dropdown-item note-card__dropdown-item--danger"
                    onClick={handleDeleteMenuClick}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete note</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body: Title directly on the card */}
      <div className="note-card__content">
        <h3 className="note-card__title">{note.title || 'Untitled'}</h3>
      </div>

      {/* Footer: Date */}
      <div className="note-card__footer">
        <span className="note-card__date">{formatDate(note.created_at)}</span>
      </div>
    </div>
  )
}
