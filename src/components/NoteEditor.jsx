import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import { TextSelection } from '@tiptap/pm/state'
import { useState, useEffect, useCallback, useRef } from 'react'
import { exportNoteToTxt } from '../utils/export'
import CategoryDropdown from './CategoryDropdown'
import { MathCalculationExtension } from '../lib/tiptap-math-extension'

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Purple', color: '#e9d5ff' },
  { name: 'Orange', color: '#fed7aa' },
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

const CustomHighlight = Highlight.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.toggleHighlight({ color: '#fef08a' }),
      'Mod-Shift-D': () => this.editor.commands.toggleHighlight({ color: '#fef08a' }),
      'Mod-Shift-f': () => this.editor.commands.toggleHighlight({ color: '#fed7aa' }),
      'Mod-Shift-F': () => this.editor.commands.toggleHighlight({ color: '#fed7aa' }),
      'Mod-Shift-e': () => this.editor.commands.toggleHighlight({ color: '#e9d5ff' }),
      'Mod-Shift-E': () => this.editor.commands.toggleHighlight({ color: '#e9d5ff' }),
      'Shift-Home': ({ editor }) => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          sel.modify('extend', 'left', 'lineboundary')
          const { state, dispatch } = editor.view
          const domSel = editor.view.domSelection()
          if (domSel && domSel.focusNode) {
            const head = editor.view.posAtDOM(domSel.focusNode, domSel.focusOffset)
            const anchor = editor.view.posAtDOM(domSel.anchorNode, domSel.anchorOffset)
            if (typeof head === 'number' && typeof anchor === 'number') {
              dispatch(state.tr.setSelection(TextSelection.create(state.doc, anchor, head)))
            }
          }
        }
        return true
      },
      'Home': ({ editor }) => {
        const sel = window.getSelection()
        if (sel) {
          sel.modify('move', 'left', 'lineboundary')
          const { state, dispatch } = editor.view
          const domSel = editor.view.domSelection()
          if (domSel && domSel.focusNode) {
            const head = editor.view.posAtDOM(domSel.focusNode, domSel.focusOffset)
            if (typeof head === 'number') {
              dispatch(state.tr.setSelection(TextSelection.create(state.doc, head)))
            }
          }
        }
        return true
      },
      'Shift-End': ({ editor }) => {
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          sel.modify('extend', 'right', 'lineboundary')
          const { state, dispatch } = editor.view
          const domSel = editor.view.domSelection()
          if (domSel && domSel.focusNode) {
            const head = editor.view.posAtDOM(domSel.focusNode, domSel.focusOffset)
            const anchor = editor.view.posAtDOM(domSel.anchorNode, domSel.anchorOffset)
            if (typeof head === 'number' && typeof anchor === 'number') {
              dispatch(state.tr.setSelection(TextSelection.create(state.doc, anchor, head)))
            }
          }
        }
        return true
      },
      'End': ({ editor }) => {
        const sel = window.getSelection()
        if (sel) {
          sel.modify('move', 'right', 'lineboundary')
          const { state, dispatch } = editor.view
          const domSel = editor.view.domSelection()
          if (domSel && domSel.focusNode) {
            const head = editor.view.posAtDOM(domSel.focusNode, domSel.focusOffset)
            if (typeof head === 'number') {
              dispatch(state.tr.setSelection(TextSelection.create(state.doc, head)))
            }
          }
        }
        return true
      },
    }
  },
})

export default function NoteEditor({ note, categories = [], onSave, onBack, onDelete, onTogglePin, canPinMore = true }) {
  const [title, setTitle] = useState(note?.title || '')
  const color = note?.color || 'orange'
  const [categoryId, setCategoryId] = useState(note?.category_id || '')
  const [isPinned, setIsPinned] = useState(Boolean(note?.is_pinned))
  const [isSaving, setIsSaving] = useState(false)
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)
  const highlightMenuRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const titleTextareaRef = useRef(null)

  const adjustTitleHeight = useCallback(() => {
    const textarea = titleTextareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustTitleHeight()
  }, [title, adjustTitleHeight])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your note...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CustomHighlight.configure({
        multicolor: true,
      }),
      MathCalculationExtension,
    ],
    content: note?.content || '',
    onUpdate: ({ editor }) => {
      debouncedSave(title, editor.getJSON(), color, categoryId, isPinned)
    },
  })

  const debouncedSave = useCallback(
    (titleVal, contentVal, colorVal, categoryIdVal, pinnedVal) => {
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
          is_pinned: Boolean(pinnedVal),
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
      debouncedSave(newTitle, editor.getJSON(), color, categoryId, isPinned)
    }
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Home') {
      const input = e.target
      if (e.shiftKey) {
        e.preventDefault()
        input.setSelectionRange(0, input.selectionEnd)
      } else {
        e.preventDefault()
        input.setSelectionRange(0, 0)
      }
    } else if (e.key === 'End') {
      const input = e.target
      if (e.shiftKey) {
        e.preventDefault()
        input.setSelectionRange(input.selectionStart, input.value.length)
      } else {
        e.preventDefault()
        input.setSelectionRange(input.value.length, input.value.length)
      }
    }
  }

  const handleCategoryChange = (val) => {
    const newCatId = typeof val === 'object' && val !== null && 'target' in val ? val.target.value : val
    setCategoryId(newCatId)
    if (editor) {
      debouncedSave(title, editor.getJSON(), color, newCatId, isPinned)
    }
  }

  const handlePinToggle = async () => {
    const targetPinnedState = !isPinned
    if (onTogglePin) {
      const success = await onTogglePin({ ...note, is_pinned: isPinned })
      if (success) {
        setIsPinned(targetPinnedState)
      }
    } else {
      setIsPinned(targetPinnedState)
      if (editor) {
        debouncedSave(title, editor.getJSON(), color, categoryId, targetPinnedState)
      }
    }
  }

  // Close highlight popover on click outside
  useEffect(() => {
    if (!showHighlightMenu) return
    function handleClickOutside(event) {
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(event.target)) {
        setShowHighlightMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showHighlightMenu])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false)
  const actionsMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setIsActionsMenuOpen(false)
      }
    }
    if (isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isActionsMenuOpen])

  if (!editor) return null

  return (
    <div className={`editor-view editor-view--${color}`}>
      <div className="editor-sticky-header">
        <div className="editor-topbar">
          <button className="editor-back-btn" onClick={onBack} title="Back to notes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back</span>
          </button>

          <div className="editor-topbar__center">
            <CategoryDropdown
              categories={categories}
              value={categoryId}
              onChange={handleCategoryChange}
            />
          </div>

          {/* Desktop inline actions */}
          <div className="editor-topbar__desktop-actions">
            <span className={`save-indicator ${isSaving ? 'save-indicator--saving' : ''}`}>
              {isSaving ? 'Saving...' : 'Saved'}
            </span>

            {(isPinned || canPinMore) && (
              <button
                className={`editor-pin-btn ${isPinned ? 'editor-pin-btn--active' : ''}`}
                onClick={handlePinToggle}
                title={isPinned ? 'Unpin note' : 'Pin note (Max 3)'}
                type="button"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                <span>{isPinned ? 'Pinned' : 'Pin'}</span>
              </button>
            )}

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

            <button className="editor-delete-btn" onClick={() => onDelete && onDelete(note)} title="Delete note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          {/* Mobile 3-dot menu */}
          <div className="editor-topbar__mobile-menu-wrapper" ref={actionsMenuRef}>
            <span className={`save-indicator ${isSaving ? 'save-indicator--saving' : ''}`}>
              {isSaving ? 'Saving...' : 'Saved'}
            </span>

            <button
              type="button"
              className={`editor-menu-btn ${isActionsMenuOpen ? 'editor-menu-btn--active' : ''}`}
              onClick={() => setIsActionsMenuOpen((p) => !p)}
              title="Note Actions"
              aria-label="Note Actions"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>

            {isActionsMenuOpen && (
              <div className="editor-actions-menu">
                {(isPinned || canPinMore) && (
                  <button
                    type="button"
                    className={`editor-actions-menu__item ${isPinned ? 'editor-actions-menu__item--active' : ''}`}
                    onClick={() => {
                      setIsActionsMenuOpen(false)
                      handlePinToggle()
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                    </svg>
                    <span>{isPinned ? 'Unpin Note' : 'Pin Note'}</span>
                  </button>
                )}

                <button
                  type="button"
                  className="editor-actions-menu__item"
                  onClick={() => {
                    setIsActionsMenuOpen(false)
                    exportNoteToTxt({
                      ...note,
                      title,
                      content: editor.getJSON(),
                      color,
                      category_name: categories.find((c) => c.id === categoryId)?.name,
                    })
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Export to TXT</span>
                </button>

                <div className="editor-actions-menu__divider" />

                <button
                  type="button"
                  className="editor-actions-menu__item editor-actions-menu__item--delete"
                  onClick={() => {
                    setIsActionsMenuOpen(false)
                    if (onDelete) onDelete(note)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <span>Delete Note</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="editor-toolbar">
          <div className="editor-toolbar__row editor-toolbar__row--formatting">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
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

          {/* Highlight Tool with Multi-color Dropdown */}
          <div className="toolbar-dropdown-wrapper" ref={highlightMenuRef}>
            <ToolbarButton
              onClick={() => setShowHighlightMenu((prev) => !prev)}
              isActive={editor.isActive('highlight')}
              title="Highlight Text (Cmd+Shift+D)"
            >
              <span className="highlight-icon-mark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 11-6 6v3h3l6-6" />
                  <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
                </svg>
              </span>
            </ToolbarButton>

            {showHighlightMenu && (
              <div className="highlight-color-picker">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="highlight-color-option"
                    style={{ backgroundColor: c.color }}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: c.color }).run()
                      setShowHighlightMenu(false)
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

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
        </div>

        <div className="editor-toolbar__row editor-toolbar__row--blocks">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Checklist / Task List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6" />
              <line x1="10" y1="12" x2="21" y2="12" />
              <line x1="10" y1="18" x2="21" y2="18" />
              <path d="M4 6h1v4" />
              <path d="M4 10h2" />
              <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
            </svg>
          </ToolbarButton>

          <div className="toolbar-divider" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.commands.evaluateCurrentLine()}
            title="Calculate Math / Checklist Sum"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="16" y1="14" x2="16" y2="14.01" />
              <line x1="12" y1="14" x2="12" y2="14.01" />
              <line x1="8" y1="14" x2="8" y2="14.01" />
              <line x1="16" y1="18" x2="16" y2="18.01" />
              <line x1="12" y1="18" x2="12" y2="18.01" />
              <line x1="8" y1="18" x2="8" y2="18.01" />
            </svg>
          </ToolbarButton>
        </div>
      </div>
    </div>

    <textarea
      ref={titleTextareaRef}
      className="editor-title-input"
      value={title}
      onChange={handleTitleChange}
      onKeyDown={handleTitleKeyDown}
      placeholder="Note title..."
      rows={1}
    />

    <div className="editor-content-wrapper">
      <EditorContent editor={editor} className="editor-content" />
    </div>
  </div>
)
}
