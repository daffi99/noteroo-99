import React from 'react'
import './NoteEditorSkeleton.css'
import { fastTap } from '../lib/fastTap'

export default function NoteEditorSkeleton({ onBack }) {
  return (
    <div className="editor-view editor-skeleton-view">
      <div className="editor-topbar">
        <button 
          className="editor-back-btn" 
          {...fastTap(onBack)} 
          title="Back to notes"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back</span>
        </button>

        <div className="editor-topbar__right">
          <div className="skeleton-pill skeleton-pill--badge skeleton-shimmer" />
          <div className="skeleton-pill skeleton-pill--button skeleton-shimmer" />
          <div className="skeleton-pill skeleton-pill--button skeleton-shimmer" />
        </div>
      </div>

      <div className="editor-skeleton-body">
        <div className="skeleton-line skeleton-line--title skeleton-shimmer" />

        <div className="editor-skeleton-toolbar">
          <div className="skeleton-pill skeleton-pill--tool skeleton-shimmer" />
          <div className="skeleton-pill skeleton-pill--tool skeleton-shimmer" />
          <div className="skeleton-pill skeleton-pill--tool skeleton-shimmer" />
          <div className="toolbar-divider" />
          <div className="skeleton-pill skeleton-pill--tool skeleton-shimmer" />
          <div className="skeleton-pill skeleton-pill--tool skeleton-shimmer" />
          <div className="toolbar-divider" />
          <div className="skeleton-pill skeleton-pill--tool skeleton-shimmer" />
        </div>

        <div className="editor-skeleton-content">
          <div className="skeleton-line skeleton-line--text w-80 skeleton-shimmer" />
          <div className="skeleton-line skeleton-line--text w-100 skeleton-shimmer" />
          <div className="skeleton-line skeleton-line--text w-60 skeleton-shimmer" />
          <div className="skeleton-line skeleton-line--text w-90 skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}
