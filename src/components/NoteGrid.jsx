import { useState } from 'react'
import NoteCard from './NoteCard'

export default function NoteGrid({ notes, categories = [], onNoteClick, searchQuery, onManageCategories }) {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes((searchQuery || '').toLowerCase())
    if (!matchesSearch) return false

    if (selectedCategory === 'all') return true
    if (selectedCategory === 'uncategorized') return !note.category_id
    return note.category_id === selectedCategory
  })

  return (
    <div className="note-grid-container">
      {/* Category Bar Row (Filter Tabs + Manage Categories Button) */}
      <div className="category-bar-row">
        <div className="category-tabs">
          <button
            className={`category-tab ${selectedCategory === 'all' ? 'category-tab--active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All ({notes.length})
          </button>
          {categories.map((cat) => {
            const count = notes.filter((n) => n.category_id === cat.id).length
            return (
              <button
                key={cat.id}
                className={`category-tab ${selectedCategory === cat.id ? 'category-tab--active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="category-tab__dot" style={{ backgroundColor: cat.color || '#7c3aed' }} />
                {cat.name} ({count})
              </button>
            )
          })}
          {notes.some((n) => !n.category_id) && (
            <button
              className={`category-tab ${selectedCategory === 'uncategorized' ? 'category-tab--active' : ''}`}
              onClick={() => setSelectedCategory('uncategorized')}
            >
              Uncategorized ({notes.filter((n) => !n.category_id).length})
            </button>
          )}
        </div>

        <button
          className="manage-categories-btn"
          onClick={onManageCategories}
          title="Manage Categories"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span>Categories</span>
        </button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <p className="empty-state__text">
            {searchQuery
              ? 'No notes match your search'
              : selectedCategory !== 'all'
              ? 'No notes in this category'
              : 'No notes yet. Create your first note!'}
          </p>
        </div>
      ) : (
        <div className="note-grid">
          {filteredNotes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={onNoteClick}
              style={{ animationDelay: `${index * 0.05}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
