import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useState, useEffect, useCallback, useRef } from 'react'
import { exportNoteToTxt } from '../utils/export'

const COLORS = [
  { name: 'orange', label: 'Orange' },
  { name: 'salmon', label: 'Salmon' },
  { name: 'green', label: 'Green' },
  { name: 'blue', label: 'Blue' },
  { name: 'pink', label: 'Pink' },
  { name: 'yellow', label: 'Yellow' },
]

function ToolbarButton({ onClick, isActive, children, title }) {
  return (
    <button
      className={`toolbar-btn ${isActive ? 'toolbar-btn--active' : ''}`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

export default function NoteEditor({ note, categories = [], onSave, onBack, onDelete }) {
  const [title, setTitle] = useState(note?.title || '')
  const [color, setColor] = useState(note?.color || 'orange')
  const [categoryId, setCategoryId] = useState(note?.category_id || '')
  const [isSaving, setIsSaving] = useState(false)
  const saveTimeoutRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      debouncedSave(title, editor.getJSON(), color, categoryId)
    },
  })

  const debouncedSave = useCallback(
    (titleVal, contentVal, colorVal, categoryIdVal) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      saveTimeoutRef.current = setTimeout(() => {
        setIsSaving(true)
        onSave({
          ...note,
          title: titleVal,
          content: contentVal,
          color: colorVal,
          category_id: categoryIdVal || null,
        }).finally(() => {
          setTimeout(() => setIsSaving(false), 500)
        })
      }, 800)
    },
    [note, onSave]
  )

  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    if (editor) {
      debouncedSave(newTitle, editor.getJSON(), color, categoryId)
    }
  }

  const handleColorChange = (newColor) => {
    setColor(newColor)
    if (editor) {
      debouncedSave(title, editor.getJSON(), newColor, categoryId)
    }
  }

  const handleCategoryChange = (e) => {
    const newCatId = e.target.value
    setCategoryId(newCatId)
    if (editor) {
      debouncedSave(title, editor.getJSON(), color, newCatId)
    }
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (!editor) return null

  return (
    <div className={`editor-view editor-view--${color}`}>
      <div className="editor-topbar">
        <button className="editor-back-btn" onClick={onBack} title="Back to notes">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back</span>
        </button>
        <div className="editor-topbar__right">
          <span className={`save-indicator ${isSaving ? 'save-indicator--saving' : ''}`}>
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
          <button
            className="editor-export-btn"
            onClick={() =>
              exportNoteToTxt({
                ...note,
                title,
                content: editor.getJSON(),
                color,
                category_name: categories.find((c) => c.id === categoryId)?.name,
              })
            }
            title="Export note to .txt file"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export TXT</span>
          </button>
          <button className="editor-delete-btn" onClick={() => onDelete(note.id)} title="Delete note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      <div className="editor-meta-bar">
        <div className="color-picker">
          {COLORS.map((c) => (
            <button
              key={c.name}
              className={`color-picker__swatch color-picker__swatch--${c.name} ${color === c.name ? 'color-picker__swatch--active' : ''}`}
              onClick={() => handleColorChange(c.name)}
              title={c.label}
              aria-label={`Set color to ${c.label}`}
            />
          ))}
        </div>

        <div className="editor-category-select-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <select
            className="editor-category-select"
            value={categoryId}
            onChange={handleCategoryChange}
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <input
        className="editor-title-input"
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Note title..."
        autoFocus
      />

      <div className="editor-toolbar">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <s>S</s>
        </ToolbarButton>

        <div className="toolbar-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <div className="toolbar-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="3" cy="6" r="1.5" fill="currentColor" />
            <circle cx="3" cy="12" r="1.5" fill="currentColor" />
            <circle cx="3" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <text x="1" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
            <text x="1" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
            <text x="1" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
          </svg>
        </ToolbarButton>

        <div className="toolbar-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </ToolbarButton>

        <div className="toolbar-divider" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          —
        </ToolbarButton>
      </div>

      <div className="editor-content-wrapper">
        <EditorContent editor={editor} className="editor-content" />
      </div>
    </div>
  )
}
