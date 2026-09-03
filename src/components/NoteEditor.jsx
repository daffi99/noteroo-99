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

import { fastTap } from '../lib/fastTap'

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Green', color: '#bbf7d0' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Blue', color: '#bfdbfe' },
  { name: 'Purple', color: '#e9d5ff' },
  { name: 'Orange', color: '#fed7aa' },
]

function transformSelectionCase(editor, mode = 'toggle') {
  if (!editor || !editor.view) return
  const { state, dispatch } = editor.view
  const { selection, doc } = state
  let { from, to } = selection

  // If collapsed cursor (no text selected), expand to current word
  if (from === to) {
    const $pos = selection.$from
    const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, null, '\ufffc')
    const textAfter = $pos.parent.textBetween($pos.parentOffset, $pos.parent.content.size, null, '\ufffc')

    const beforeMatch = textBefore.match(/\w+$/)
    const afterMatch = textAfter.match(/^\w+/)

    if (beforeMatch || afterMatch) {
      const wordStart = $pos.pos - (beforeMatch ? beforeMatch[0].length : 0)
      const wordEnd = $pos.pos + (afterMatch ? afterMatch[0].length : 0)
      from = wordStart
      to = wordEnd
    } else {
      from = $pos.start()
      to = $pos.end()
    }
  }

  if (from >= to) return

  const selectedText = doc.textBetween(from, to)
  if (!selectedText) return

  let newText = selectedText
  if (mode === 'uppercase') {
    newText = selectedText.toUpperCase()
  } else if (mode === 'lowercase') {
    newText = selectedText.toLowerCase()
  } else if (mode === 'capitalize') {
    newText = selectedText.replace(/\b(\w)(\w*)/g, (_, f, r) => f.toUpperCase() + r.toLowerCase())
  } else if (mode === 'sentence') {
    newText = selectedText.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase())
  } else {
    // 'toggle'
    const isAllUpper = selectedText === selectedText.toUpperCase() && selectedText !== selectedText.toLowerCase()
    const isAllLower = selectedText === selectedText.toLowerCase() && selectedText !== selectedText.toUpperCase()
    if (isAllUpper) {
      newText = selectedText.toLowerCase()
    } else if (isAllLower) {
      newText = selectedText.replace(/\b(\w)(\w*)/g, (_, f, r) => f.toUpperCase() + r.toLowerCase())
    } else {
      newText = selectedText.toUpperCase()
    }
  }

  if (newText !== selectedText) {
    const tr = state.tr.insertText(newText, from, to)
    tr.setSelection(TextSelection.create(tr.doc, from, from + newText.length))
    dispatch(tr)
  }
}

function ToolbarButton({ onClick, isActive, children, title, onMouseDown }) {
  return (
    <button
      className={`toolbar-btn ${isActive ? 'toolbar-btn--active' : ''}`}
      onClick={onClick}
      onMouseDown={onMouseDown || ((e) => e.preventDefault())}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

// Custom TaskItem that prevents virtual keyboard from auto-opening on mobile/PWA
const CustomTaskItem = TaskItem.extend({
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li')
      const checkboxWrapper = document.createElement('label')
      const checkboxStyler = document.createElement('span')
      const checkbox = document.createElement('input')
      const content = document.createElement('div')

      checkboxWrapper.contentEditable = 'false'
      checkbox.type = 'checkbox'
      checkbox.tabIndex = -1

      // Stop mousedown/pointerdown/touchstart from focusing the editor or contenteditable
      checkbox.addEventListener('mousedown', (e) => e.preventDefault())
      checkbox.addEventListener('pointerdown', (e) => e.stopPropagation())
      checkboxWrapper.addEventListener('mousedown', (e) => e.preventDefault())
      checkboxWrapper.addEventListener('pointerdown', (e) => e.stopPropagation())
      checkboxWrapper.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true })

      checkbox.addEventListener('change', (event) => {
        if (!editor.isEditable && !this.options.onReadOnlyChecked) {
          checkbox.checked = !checkbox.checked
          return
        }

        const { checked } = event.target

        if (editor.isEditable && typeof getPos === 'function') {
          const position = getPos()
          if (typeof position === 'number') {
            const { state, view } = editor
            const currentNode = state.doc.nodeAt(position)
            if (currentNode) {
              const tr = state.tr.setNodeMarkup(position, undefined, {
                ...currentNode.attrs,
                checked,
              })
              // Dispatch transaction directly without editor.chain().focus()
              // This stops mobile PWA virtual keyboard from popping up on checkbox tap!
              view.dispatch(tr)
            }
          }
        }

        if (!editor.isEditable && this.options.onReadOnlyChecked) {
          if (!this.options.onReadOnlyChecked(node, checked)) {
            checkbox.checked = !checkbox.checked
          }
        }
      })

      Object.entries(this.options.HTMLAttributes || {}).forEach(([key, value]) => {
        listItem.setAttribute(key, value)
      })

      listItem.dataset.checked = node.attrs.checked
      checkbox.checked = Boolean(node.attrs.checked)

      checkboxWrapper.append(checkbox, checkboxStyler)
      listItem.append(checkboxWrapper, content)

      Object.entries(HTMLAttributes || {}).forEach(([key, value]) => {
        listItem.setAttribute(key, value)
      })

      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false
          }
          listItem.dataset.checked = updatedNode.attrs.checked
          checkbox.checked = Boolean(updatedNode.attrs.checked)
          return true
        },
      }
    }
  },
})

const CustomHighlight = Highlight.extend({
  addKeyboardShortcuts() {
    return {
      'Mod-Shift-d': () => this.editor.commands.toggleHighlight({ color: '#fef08a' }),
      'Mod-Shift-D': () => this.editor.commands.toggleHighlight({ color: '#fef08a' }),
      'Mod-Shift-f': () => this.editor.commands.toggleHighlight({ color: '#fed7aa' }),
      'Mod-Shift-F': () => this.editor.commands.toggleHighlight({ color: '#fed7aa' }),
      'Mod-Shift-e': () => this.editor.commands.toggleHighlight({ color: '#e9d5ff' }),
      'Mod-Shift-E': () => this.editor.commands.toggleHighlight({ color: '#e9d5ff' }),
      'Mod-Shift-u': ({ editor }) => {
        transformSelectionCase(editor, 'toggle')
        return true
      },
      'Mod-Shift-U': ({ editor }) => {
        transformSelectionCase(editor, 'toggle')
        return true
      },
      'Mod-Shift-c': ({ editor }) => {
        transformSelectionCase(editor, 'toggle')
        return true
      },
      'Mod-Shift-C': ({ editor }) => {
        transformSelectionCase(editor, 'toggle')
        return true
      },
      'Shift-F3': ({ editor }) => {
        transformSelectionCase(editor, 'toggle')
        return true
      },
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
  const [showCaseMenu, setShowCaseMenu] = useState(false)
  const caseMenuRef = useRef(null)
  const saveTimeoutRef = useRef(null)
  const titleTextareaRef = useRef(null)

  // In-Note Word Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matches, setMatches] = useState([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const searchInputRef = useRef(null)

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
      CustomTaskItem.configure({
        nested: true,
      }),
      CustomHighlight.configure({
        multicolor: true,
      }),
      MathCalculationExtension,
    ],
    content: note?.content || '',
    onUpdate: ({ editor: currentEditor }) => {
      debouncedSave(title, currentEditor.getJSON(), color, categoryId, isPinned)
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

  // Reset all checkmarks from done to not yet (uncheck all items)
  const handleResetAllCheckmarks = useCallback(() => {
    if (!editor || !editor.view) return
    const { state, dispatch } = editor.view
    const tr = state.tr
    let count = 0

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'taskItem' && node.attrs.checked) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          checked: false,
        })
        count++
      }
    })

    if (count > 0) {
      dispatch(tr)
      debouncedSave(title, editor.getJSON(), color, categoryId, isPinned)
    }
  }, [editor, title, color, categoryId, isPinned, debouncedSave])

  // In-Note Search / Word Finder logic
  const highlightMatch = useCallback((match) => {
    if (!editor || !match) return
    const { state, view } = editor
    const tr = state.tr.setSelection(
      TextSelection.create(state.doc, match.from, match.to)
    ).scrollIntoView()
    view.dispatch(tr)
  }, [editor])

  const updateMatches = useCallback((query) => {
    if (!editor || !query || !query.trim()) {
      setMatches([])
      setCurrentMatchIndex(0)
      return
    }
    const q = query.trim().toLowerCase()
    const foundMatches = []
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = node.text
        const textLower = text.toLowerCase()
        let index = 0
        while ((index = textLower.indexOf(q, index)) !== -1) {
          foundMatches.push({
            from: pos + index,
            to: pos + index + q.length,
            text: text.slice(index, index + q.length),
          })
          index += q.length
        }
      }
    })
    setMatches(foundMatches)
    if (foundMatches.length > 0) {
      setCurrentMatchIndex(0)
      highlightMatch(foundMatches[0])
    } else {
      setCurrentMatchIndex(0)
    }
  }, [editor, highlightMatch])

  const handleSearchChange = (e) => {
    const q = e.target.value
    setSearchQuery(q)
    updateMatches(q)
  }

  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return
    const nextIdx = (currentMatchIndex + 1) % matches.length
    setCurrentMatchIndex(nextIdx)
    highlightMatch(matches[nextIdx])
  }, [matches, currentMatchIndex, highlightMatch])

  const goToPrevMatch = useCallback(() => {
    if (matches.length === 0) return
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length
    setCurrentMatchIndex(prevIdx)
    highlightMatch(matches[prevIdx])
  }, [matches, currentMatchIndex, highlightMatch])

  const openSearch = useCallback(() => {
    setIsSearchOpen(true)
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
        searchInputRef.current.select()
      }
    }, 50)
  }, [])

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setMatches([])
    if (editor) {
      editor.commands.focus()
    }
  }, [editor])

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        goToPrevMatch()
      } else {
        goToNextMatch()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeSearch()
    }
  }

  // Intercept Cmd+F / Ctrl+F inside NoteEditor
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F')) {
        if (!e.shiftKey && !e.altKey) {
          e.preventDefault()
          e.stopPropagation()
          openSearch()
        }
      } else if (e.key === 'Escape' && isSearchOpen) {
        e.preventDefault()
        closeSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isSearchOpen, openSearch, closeSearch])

  // Close highlight popover on click outside (support mousedown & touchstart)
  useEffect(() => {
    if (!showHighlightMenu) return
    function handleClickOutside(event) {
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(event.target)) {
        setShowHighlightMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showHighlightMenu])

  // Close case menu popover on click outside
  useEffect(() => {
    if (!showCaseMenu) return
    function handleClickOutside(event) {
      if (caseMenuRef.current && !caseMenuRef.current.contains(event.target)) {
        setShowCaseMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [showCaseMenu])

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
          <button className="editor-back-btn" {...fastTap(onBack)} title="Back to notes">
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

            {/* Find in note shortcut button */}
            <button
              type="button"
              className={`editor-find-toggle-btn ${isSearchOpen ? 'editor-find-toggle-btn--active' : ''}`}
              onClick={openSearch}
              title="Find in note (Cmd+F)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Find</span>
            </button>

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
                <button
                  type="button"
                  className="editor-actions-menu__item"
                  onClick={() => {
                    setIsActionsMenuOpen(false)
                    openSearch()
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Find in Note (Cmd+F)</span>
                </button>

                <button
                  type="button"
                  className="editor-actions-menu__item"
                  onClick={() => {
                    setIsActionsMenuOpen(false)
                    handleResetAllCheckmarks()
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M8 12l2.5 2.5L16 9" opacity="0.4" />
                    <line x1="3" y1="21" x2="21" y2="3" stroke="#ef4444" strokeWidth="2" />
                  </svg>
                  <span>Reset Checkmarks (Done → Not Yet)</span>
                </button>

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

        {/* In-Note Find / Search Bar */}
        {isSearchOpen && (
          <div className="editor-find-bar">
            <div className="editor-find-bar__container">
              <svg className="editor-find-bar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="editor-find-bar__input"
                placeholder="Find in note... (Enter / Shift+Enter)"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
              />
              {searchQuery && (
                <span className="editor-find-bar__count">
                  {matches.length > 0 ? `${currentMatchIndex + 1} of ${matches.length}` : '0 of 0'}
                </span>
              )}
              <div className="editor-find-bar__nav">
                <button
                  type="button"
                  className="editor-find-bar__btn"
                  onClick={goToPrevMatch}
                  disabled={matches.length === 0}
                  title="Previous match (Shift+Enter)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="editor-find-bar__btn"
                  onClick={goToNextMatch}
                  disabled={matches.length === 0}
                  title="Next match (Enter)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="editor-find-bar__btn editor-find-bar__btn--close"
                  onClick={closeSearch}
                  title="Close (Esc)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

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

          {/* Case Transform (Capitalize to normal and vice versa) */}
          <div className="toolbar-dropdown-wrapper" ref={caseMenuRef}>
            <ToolbarButton
              onClick={() => setShowCaseMenu((prev) => !prev)}
              title="Change Case (Capitalize / UPPER / lower) (Cmd+Shift+U)"
            >
              <span className="case-icon-mark">
                <strong>Aa</strong>
              </span>
            </ToolbarButton>

            {showCaseMenu && (
              <div className="case-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="case-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    transformSelectionCase(editor, 'capitalize')
                    setShowCaseMenu(false)
                  }}
                >
                  <strong>Aa</strong>
                  <span>Capitalize Each Word</span>
                </button>
                <button
                  type="button"
                  className="case-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    transformSelectionCase(editor, 'uppercase')
                    setShowCaseMenu(false)
                  }}
                >
                  <strong>AA</strong>
                  <span>UPPERCASE</span>
                </button>
                <button
                  type="button"
                  className="case-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    transformSelectionCase(editor, 'lowercase')
                    setShowCaseMenu(false)
                  }}
                >
                  <strong>aa</strong>
                  <span>lowercase (normal)</span>
                </button>
                <button
                  type="button"
                  className="case-dropdown-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    transformSelectionCase(editor, 'sentence')
                    setShowCaseMenu(false)
                  }}
                >
                  <strong>A...</strong>
                  <span>Sentence case</span>
                </button>
              </div>
            )}
          </div>

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
              <div className="highlight-color-picker" role="menu">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="highlight-color-option"
                    style={{ backgroundColor: c.color }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: c.color }).run()
                      setShowHighlightMenu(false)
                    }}
                    title={`Highlight ${c.name}`}
                  />
                ))}
                <button
                  type="button"
                  className="highlight-color-option highlight-color-option--clear"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run()
                    setShowHighlightMenu(false)
                  }}
                  title="Remove Highlight"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
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

        <div className="toolbar-divider toolbar-divider--desktop-only" />

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

          {/* Button to reset all checkmarks from done to not yet (uncheck all) */}
          <ToolbarButton
            onClick={handleResetAllCheckmarks}
            title="Reset checkmarks (Done → Not Yet)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="M8 12l2.5 2.5L16 9" opacity="0.4" />
              <line x1="3" y1="21" x2="21" y2="3" stroke="#ef4444" strokeWidth="2" />
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
