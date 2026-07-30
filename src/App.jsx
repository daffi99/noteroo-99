import { useState, useEffect, useCallback } from 'react'
import { api } from './lib/api'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NoteGrid from './components/NoteGrid'
import NoteEditor from './components/NoteEditor'
import CategoryManager from './components/CategoryManager'
import TrashView from './components/TrashView'
import Toast from './components/Toast'
import ConfirmModal from './components/ConfirmModal'

const NOTE_COLORS = ['orange', 'salmon', 'green', 'blue', 'pink', 'yellow']

function App() {
  const [notes, setNotes] = useState([])
  const [categories, setCategories] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'editor' | 'categories' | 'trash'
  const [toast, setToast] = useState({ message: '', type: 'warning' })

  // Fetch notes & categories on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [notesData, categoriesData] = await Promise.all([
        api.getNotes(),
        api.getCategories(),
      ])
      setNotes(notesData)
      setCategories(categoriesData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNotes = async () => {
    try {
      const data = await api.getNotes()
      setNotes(data)
    } catch (err) {
      console.error('Error fetching notes:', err)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const sortNotes = (list) => {
    return [...list].sort((a, b) => {
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
  }

  const createNote = async () => {
    const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
    try {
      const note = await api.createNote({
        title: 'Untitled',
        content: null,
        color: randomColor,
        is_pinned: false,
      })
      setNotes((prev) => sortNotes([note, ...prev]))
      setActiveNote(note)
      setView('editor')
    } catch (err) {
      console.error('Error creating note:', err)
    }
  }

  const saveNote = useCallback(async (updatedNote) => {
    try {
      const id = updatedNote.id
      const saved = await api.updateNote(id, {
        title: updatedNote.title,
        content: updatedNote.content,
        color: updatedNote.color,
        category_id: updatedNote.category_id,
        is_pinned: Boolean(updatedNote.is_pinned),
      })
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === saved.id ? saved : n)))
      )
      setActiveNote(saved)
      fetchCategories() // Update note counts
    } catch (err) {
      console.error('Error saving note:', err)
      if (err.message && err.message.includes('pinned')) {
        setToast({ message: err.message, type: 'warning' })
      }
    }
  }, [])

  const handleTogglePinNote = async (note) => {
    const targetPinnedState = !note.is_pinned
    if (targetPinnedState) {
      const currentPinnedCount = notes.filter((n) => n.is_pinned).length
      if (currentPinnedCount >= 3) {
        setToast({ message: 'Maximum limit of 3 pinned notes reached!', type: 'warning' })
        return false
      }
    }

    try {
      const saved = await api.updateNote(note.id, {
        title: note.title,
        content: note.content,
        color: note.color,
        category_id: note.category_id,
        is_pinned: targetPinnedState,
      })
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === saved.id ? saved : n)))
      )
      if (activeNote && activeNote.id === saved.id) {
        setActiveNote(saved)
      }
      return true
    } catch (err) {
      console.error('Error toggling pin:', err)
    }
  }

  const handleChangeNoteColor = async (note, newColor) => {
    try {
      const saved = await api.updateNote(note.id, {
        title: note.title,
        content: note.content,
        color: newColor,
        category_id: note.category_id,
        is_pinned: note.is_pinned,
      })
      setNotes((prev) =>
        sortNotes(prev.map((n) => (n.id === saved.id ? saved : n)))
      )
      if (activeNote && activeNote.id === saved.id) {
        setActiveNote(saved)
      }
    } catch (err) {
      console.error('Error changing note color:', err)
      setToast({ message: err.message || 'Failed to update color', type: 'warning' })
    }
  }

  const [noteToDelete, setNoteToDelete] = useState(null)
  const [isDeletingNote, setIsDeletingNote] = useState(false)

  const handleRequestDelete = (noteOrId) => {
    if (!noteOrId) return
    if (typeof noteOrId === 'string') {
      const found = notes.find((n) => n.id === noteOrId)
      setNoteToDelete(found || { id: noteOrId })
    } else {
      setNoteToDelete(noteOrId)
    }
  }

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return
    setIsDeletingNote(true)
    try {
      await api.deleteNote(noteToDelete.id)
      setNotes((prev) => prev.filter((n) => n.id !== noteToDelete.id))
      if (activeNote && activeNote.id === noteToDelete.id) {
        setActiveNote(null)
        setView('dashboard')
      }
      fetchCategories()
    } catch (err) {
      console.error('Error deleting note:', err)
      setToast({ message: err.message || 'Failed to delete note', type: 'warning' })
    } finally {
      setIsDeletingNote(false)
      setNoteToDelete(null)
    }
  }

  // Category Actions
  const handleCreateCategory = async (catData) => {
    const newCat = await api.createCategory(catData)
    setCategories((prev) => [...prev, { ...newCat, note_count: 0 }])
  }

  const handleUpdateCategory = async (id, catData) => {
    const updated = await api.updateCategory(id, catData)
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    )
    fetchNotes() // Refresh notes to get updated category names/colors
  }

  const handleDeleteCategory = async (id) => {
    await api.deleteCategory(id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    fetchNotes()
  }

  const handleNoteClick = (note) => {
    setActiveNote(note)
    setView('editor')
  }

  const handleBack = () => {
    setActiveNote(null)
    setView('dashboard')
    fetchNotes()
  }

  return (
    <div className="app">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'warning' })}
      />

      <ConfirmModal
        isOpen={Boolean(noteToDelete)}
        title="Delete Note?"
        message="Are you sure you want to delete this note? It will be moved to trash."
        confirmText="Delete Note"
        cancelText="Cancel"
        danger={true}
        isLoading={isDeletingNote}
        onConfirm={handleConfirmDeleteNote}
        onCancel={() => setNoteToDelete(null)}
      />

      <Sidebar
        activeView={view}
        onNavigate={(targetView) => {
          setActiveNote(null)
          setView(targetView)
        }}
        onNewNote={createNote}
      />
      <main className="main-content">
        {view === 'dashboard' ? (
          <>
            <div className="dashboard-header">
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Loading notes...</p>
              </div>
            ) : (
              <NoteGrid
                notes={notes}
                categories={categories}
                onNoteClick={handleNoteClick}
                onTogglePin={handleTogglePinNote}
                onDeleteNote={handleRequestDelete}
                onChangeColor={handleChangeNoteColor}
                searchQuery={searchQuery}
                onManageCategories={() => setView('categories')}
              />
            )}
          </>
        ) : view === 'categories' ? (
          <CategoryManager
            categories={categories}
            onCreateCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onBack={() => setView('dashboard')}
          />
        ) : view === 'trash' ? (
          <TrashView
            onRestoreNote={() => {
              fetchNotes()
              fetchCategories()
            }}
          />
        ) : (
          <NoteEditor
            key={activeNote?.id}
            note={activeNote}
            categories={categories}
            canPinMore={notes.filter((n) => n.is_pinned).length < 3}
            onSave={saveNote}
            onBack={handleBack}
            onDelete={handleRequestDelete}
            onTogglePin={handleTogglePinNote}
          />
        )}
      </main>
    </div>
  )
}

export default App
