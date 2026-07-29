import { useState, useEffect, useCallback } from 'react'
import { api } from './lib/api'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NoteGrid from './components/NoteGrid'
import NoteEditor from './components/NoteEditor'
import CategoryManager from './components/CategoryManager'
import TrashView from './components/TrashView'

const NOTE_COLORS = ['orange', 'salmon', 'green', 'blue', 'pink', 'yellow']

function App() {
  const [notes, setNotes] = useState([])
  const [categories, setCategories] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'editor' | 'categories'

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

  const createNote = async () => {
    const randomColor = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]
    try {
      const note = await api.createNote({
        title: 'Untitled',
        content: null,
        color: randomColor,
      })
      setNotes((prev) => [note, ...prev])
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
      })
      setNotes((prev) =>
        prev.map((n) => (n.id === saved.id ? saved : n))
      )
      setActiveNote(saved)
      fetchCategories() // Update note counts
    } catch (err) {
      console.error('Error saving note:', err)
    }
  }, [])

  const deleteNote = async (noteId) => {
    try {
      await api.deleteNote(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      setActiveNote(null)
      setView('dashboard')
      fetchCategories()
    } catch (err) {
      console.error('Error deleting note:', err)
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
            onSave={saveNote}
            onBack={handleBack}
            onDelete={deleteNote}
          />
        )}
      </main>
    </div>
  )
}

export default App
