import { useState, useRef, useEffect } from 'react'

export default function CategoryDropdown({ categories = [], value, onChange, placeholder = 'No Category' }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const selectedCategory = categories.find((cat) => cat.id === value)

  const handleSelect = (catId) => {
    onChange(catId)
    setIsOpen(false)
  }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className={`custom-dropdown ${isOpen ? 'custom-dropdown--open' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className="custom-dropdown__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title="Select Category"
      >
        <span className="custom-dropdown__icon-wrapper">
          {selectedCategory?.color ? (
            <span
              className="custom-dropdown__color-dot"
              style={{ backgroundColor: selectedCategory.color }}
            />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="custom-dropdown__folder-icon"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </span>

        <span className="custom-dropdown__label">
          {selectedCategory ? selectedCategory.name : placeholder}
        </span>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="custom-dropdown__chevron"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="custom-dropdown__menu" role="listbox">
          <button
            type="button"
            className={`custom-dropdown__item ${!value ? 'custom-dropdown__item--selected' : ''}`}
            onClick={() => handleSelect('')}
            role="option"
            aria-selected={!value}
          >
            <div className="custom-dropdown__item-left">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.5 }}
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>{placeholder}</span>
            </div>
            {!value && (
              <svg className="custom-dropdown__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {categories.length > 0 && <div className="custom-dropdown__divider" />}

          {categories.map((cat) => {
            const isSelected = value === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                className={`custom-dropdown__item ${isSelected ? 'custom-dropdown__item--selected' : ''}`}
                onClick={() => handleSelect(cat.id)}
                role="option"
                aria-selected={isSelected}
              >
                <div className="custom-dropdown__item-left">
                  <span
                    className="custom-dropdown__color-dot"
                    style={{ backgroundColor: cat.color || '#7c3aed' }}
                  />
                  <span className="custom-dropdown__item-name">{cat.name}</span>
                </div>
                {isSelected && (
                  <svg className="custom-dropdown__check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
