import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from './lib/api'
import Sidebar from './components/Sidebar'
import SearchBar from './components/SearchBar'
import NoteGrid from './components/NoteGrid'
import NoteEditor from './components/NoteEditor'
import NoteEditorSkeleton from './components/NoteEditorSkeleton'
import CategoryManager from './components/CategoryManager'
import TrashView from './components/TrashView'
import Toast from './components/Toast'
import ConfirmModal from './components/ConfirmModal'
import AuthModal from './components/AuthModal'
import ProfileModal from './components/ProfileModal'

const NOTE_COLORS = ['orange', 'salmon', 'green', 'blue', 'pink', 'yellow']

function App() {
  const [user, setUser] = useState(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [notes, setNotes] = useState([])
  const [categories, setCategories] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState('dashboard') // 'dashboard' | 'editor' | 'categories' | 'trash'
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [toast, setToast] = useState({ message: '', type: 'warning' })
  const [showScrollTop, setShowScrollTop] = useState(false)
  const mainContentRef = useRef(null)

  useEffect(() => {
    const el = mainContentRef.current
    if (!el) return

    const handleScroll = () => {
      setShowScrollTop(el.scrollTop > 150)
    }

    // Reset scroll position and check scroll state when view changes
    el.scrollTop = 0
    setShowScrollTop(false)

    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [view, activeNote?.id])

  const scrollToTop = () => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Check auth session on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setIsCheckingAuth(true)
    try {
      const data = await api.getMe()
      setUser(data.user)
      await loadData()
    } catch {
      setUser(null)
      setIsLoading(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleAuthAction = async (actionType, credentials) => {
    if (actionType === 'login') {
      const res = await api.login(credentials)
      setUser(res.user)
      await loadData()
      return res
    } else {
      const res = await api.register(credentials)
      setUser(res.user)
      await loadData()
      return res
    }
  }

  const handleSaveProfile = async (profileData) => {
    const res = await api.updateProfile(profileData)
    setUser(res.user)
    setToast({ message: 'Profile updated successfully!', type: 'info' })
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
      setNotes([])
      setCategories([])
      setActiveNote(null)
      setView('dashboard')
    }
  }

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
    setIsCreatingNote(true)
    setActiveNote(null)
    setView('editor')
    try {
      const note = await api.createNote({
        title: 'Untitled',
        content: null,
        color: randomColor,
        is_pinned: false,
      })
      setNotes((prev) => sortNotes([note, ...prev]))
      setActiveNote(note)
    } catch (err) {
      console.error('Error creating note:', err)
      setToast({ message: 'Failed to create note. Please try again.', type: 'danger' })
      setView('dashboard')
    } finally {
      setIsCreatingNote(false)
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
      fetchCategories()
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
    fetchNotes()
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

  if (isCheckingAuth) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner" />
        <p>Loading Noteroo...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'warning' })}
      />

      <AuthModal
        isOpen={!user}
        onAuthSuccess={handleAuthAction}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        onSaveProfile={handleSaveProfile}
        onClose={() => setIsProfileOpen(false)}
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
        user={user}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />
      <main className="main-content" ref={mainContentRef}>
        {view === 'dashboard' ? (
          <>
            <div className="dashboard-header">
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                user={user}
                onOpenProfile={() => setIsProfileOpen(true)}
                onLogout={handleLogout}
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
        ) : isCreatingNote || !activeNote ? (
          <NoteEditorSkeleton onBack={handleBack} />
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

      {showScrollTop && (
        <button
          type="button"
          className="scroll-to-top-btn"
          onClick={scrollToTop}
          title="Go to top"
          aria-label="Go to top"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default App
