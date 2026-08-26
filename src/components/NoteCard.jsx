import { useState, useRef, useEffect } from 'react'

const CARD_COLORS = [
  { name: 'orange', label: 'Orange', hex: '#FFB74D' },
  { name: 'salmon', label: 'Salmon', hex: '#FF8A80' },
  { name: 'green', label: 'Green', hex: '#81C784' },
  { name: 'blue', label: 'Blue', hex: '#64B5F6' },
  { name: 'pink', label: 'Pink', hex: '#F48FB1' },
  { name: 'yellow', label: 'Yellow', hex: '#FFF176' },
]

export default function NoteCard({
  note,
  onClick,
  onTogglePin,
  onDeleteNote,
  onChangeColor,
  canPinMore = true,
  style,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showColorPalette, setShowColorPalette] = useState(false)
  const menuRef = useRef(null)

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Close 3-dot menu & palette on click outside or escape key
  useEffect(() => {
    if (!isMenuOpen) return
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
        setShowColorPalette(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        setShowColorPalette(false)
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
    setIsMenuOpen((prev) => {
      if (prev) setShowColorPalette(false)
      return !prev
    })
  }

  const handlePinAction = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    setShowColorPalette(false)
    if (onTogglePin) {
      onTogglePin(note)
    }
  }

  const handleEditAction = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    setShowColorPalette(false)
    if (onClick) onClick(note)
  }

  const handleDeleteMenuClick = (e) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    setShowColorPalette(false)
    if (onDeleteNote) {
      onDeleteNote(note)
    }
  }

  const handleColorSelect = (e, colorName) => {
    e.stopPropagation()
    setIsMenuOpen(false)
    setShowColorPalette(false)
    if (onChangeColor) {
      onChangeColor(note, colorName)
    }
  }

  if (!note) return null

  const showPinOption = note.is_pinned || canPinMore

  return (
    <div
      className={`note-card note-card--${note.color || 'orange'} ${note.is_pinned ? 'note-card--pinned' : ''}`}
      onClick={() => onClick && onClick(note)}
      role="button"
      tabIndex={0}
      style={style}
      onKeyDown={(e) => e.key === 'Enter' && onClick && onClick(note)}
    >
      {/* Top Row: Badges (Pinned + Category) on Left, 3-Dot Options Menu on Right */}
      <div className="note-card__header">
        <div className="note-card__badges">
          {note.is_pinned && (
            <span className="note-card__pin-badge" title="Pinned Note">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            </span>
          )}
          {note.category_name && (
            <span className="note-card__category-badge">
              <span
                className="note-card__category-dot"
                style={{ backgroundColor: note.category_color || '#7c3aed' }}
              />
              {note.category_name}
            </span>
          )}
        </div>

        {/* 3-Dot Menu Button & Animated Color Palette Popup */}
        <div className="note-card__menu-wrapper" ref={menuRef}>
          <button
            type="button"
            className={`note-card__menu-btn ${isMenuOpen ? 'note-card__menu-btn--visible' : ''}`}
            onClick={handleMenuToggle}
            aria-label="Note options"
            title="Note options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {isMenuOpen && (
            <>
              {showColorPalette ? (
                <div className="note-card__color-popover-pill" role="menu" onClick={(e) => e.stopPropagation()}>
                  <div className="note-card__color-popover-header">
                    <button
                      type="button"
                      className="note-card__color-popover-back"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowColorPalette(false)
                      }}
                    >
                      ‹ Options
                    </button>
                    <span>Card Color</span>
                  </div>
                  <div className="note-card__color-swatch-row">
                    {CARD_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className={`note-card__color-swatch ${note.color === c.name ? 'note-card__color-swatch--active' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                        onClick={(e) => handleColorSelect(e, c.name)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowColorPalette(true)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.75 1.7-1.67 0-.42-.16-.8-.43-1.09-.27-.28-.44-.68-.44-1.12 0-.92.75-1.67 1.67-1.67H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z" />
                    </svg>
                    <span>Change color</span>
                  </button>
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
            </>
          )}
        </div>
      </div>

      <div className="note-card__content">
        <h3 className="note-card__title">{note.title || 'Untitled'}</h3>
      </div>
      <div className="note-card__footer">
        <span className="note-card__date">{formatDate(note.created_at)}</span>
      </div>
    </div>
  )
}
