import { useState } from 'react'

export default function NoteCard({ note, onClick }) {
  const [isHovered, setIsHovered] = useState(false)

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      className={`note-card note-card--${note.color || 'orange'}`}
      onClick={() => onClick(note)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(note)}
    >
      <div className="note-card__content">
        {note.category_name && (
          <span className="note-card__category-badge">
            <span
              className="note-card__category-dot"
              style={{ backgroundColor: note.category_color || '#7c3aed' }}
            />
            {note.category_name}
          </span>
        )}
        <h3 className="note-card__title">{note.title || 'Untitled'}</h3>
      </div>
      <div className="note-card__footer">
        <span className="note-card__date">{formatDate(note.created_at)}</span>
        <button
          className={`note-card__edit-btn ${isHovered ? 'note-card__edit-btn--visible' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onClick(note)
          }}
          aria-label="Edit note"
          title="Edit note"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
