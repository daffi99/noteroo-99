import { useState } from 'react'
import NoteCard from './NoteCard'
import { fastTap } from '../lib/fastTap'

function extractTextFromContent(content) {
  if (!content) return ''
  try {
    const json = typeof content === 'string' ? JSON.parse(content) : content
    const textPieces = []
    function traverse(node) {
      if (!node) return
      if (node.type === 'text' && typeof node.text === 'string') {
        textPieces.push(node.text)
      }
      if (Array.isArray(node.content)) {
        node.content.forEach(traverse)
      }
    }
    traverse(json)
    return textPieces.join(' ')
  } catch {
    return typeof content === 'string' ? content : ''
  }
}

export default function NoteGrid({
  notes = [],
  categories = [],
  onNoteClick,
  searchQuery = '',
  onTogglePin,
  onDeleteNote,
  onChangeColor,
  onResetCheckmarks,
}) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const safeCategories = Array.isArray(categories) ? categories : []
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredNotes = safeNotes.filter((note) => {
    if (!note) return false
    const q = (searchQuery || '').trim().toLowerCase()
    if (q) {
      const titleMatches = (note.title || '').toLowerCase().includes(q)
      const contentMatches = extractTextFromContent(note.content).toLowerCase().includes(q)
      if (!titleMatches && !contentMatches) return false
    }

    if (selectedCategory === 'all') return true
    if (selectedCategory === 'uncategorized') return !note.category_id
    return note.category_id === selectedCategory
  })

  // Unified list: pinned notes first (top-left), followed by unpinned notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) {
      return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)
    }
    if (a.is_pinned && b.is_pinned) {
      const timeA = a.pinned_at ? new Date(a.pinned_at).getTime() : 0
      const timeB = b.pinned_at ? new Date(b.pinned_at).getTime() : 0
      return timeA - timeB
    }
    const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0
    const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0
    return timeB - timeA
  })

  const totalPinnedInApp = safeNotes.filter((n) => n?.is_pinned).length
  const canPinMore = totalPinnedInApp < 3

  return (
    <div className="note-grid-container">
      {/* Category Bar Row (Filter Tabs) */}
      <div className="category-bar-row">
        <div className="category-tabs">
          <button
            type="button"
            className={`category-tab ${selectedCategory === 'all' ? 'category-tab--active' : ''}`}
            {...fastTap(() => setSelectedCategory('all'))}
          >
            All ({safeNotes.length})
          </button>
          {safeCategories.map((cat) => {
            const count = safeNotes.filter((n) => n?.category_id === cat?.id).length
            return (
              <button
                key={cat.id}
                type="button"
                className={`category-tab ${selectedCategory === cat.id ? 'category-tab--active' : ''}`}
                {...fastTap(() => setSelectedCategory(cat.id))}
              >
                <span className="category-tab__dot" style={{ backgroundColor: cat.color || '#7c3aed' }} />
                {cat.name} ({count})
              </button>
            )
          })}
          {safeNotes.some((n) => !n?.category_id) && (
            <button
              type="button"
              className={`category-tab ${selectedCategory === 'uncategorized' ? 'category-tab--active' : ''}`}
              {...fastTap(() => setSelectedCategory('uncategorized'))}
            >
              Uncategorized ({safeNotes.filter((n) => !n?.category_id).length})
            </button>
          )}
        </div>
      </div>

      {sortedNotes.length === 0 ? (
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
          {sortedNotes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              onClick={onNoteClick}
              onTogglePin={onTogglePin}
              onDeleteNote={onDeleteNote}
              onChangeColor={onChangeColor}
              onResetCheckmarks={onResetCheckmarks}
              canPinMore={canPinMore}
              style={{ animationDelay: `${index * 0.05}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
