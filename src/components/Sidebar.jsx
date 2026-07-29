import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeView, onNavigate, onNewNote }) => {
  return (
    <aside className="sidebar">
      <div 
        className="sidebar__logo" 
        title="Noteroo" 
        aria-label="Noteroo logo"
        onClick={() => onNavigate('dashboard')}
      >
        <img src="/favicon.png" alt="Noteroo Logo" className="sidebar__logo-img" />
      </div>

      <button
        type="button"
        className="sidebar__add-btn"
        onClick={onNewNote}
        aria-label="Create new note"
        title="Create new note"
      >
        <svg
          className="sidebar__add-icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div className="sidebar__nav">
        <button
          type="button"
          className={`sidebar__nav-item ${activeView === 'dashboard' ? 'sidebar__nav-item--active' : ''}`}
          onClick={() => onNavigate('dashboard')}
          title="All Notes"
          aria-label="All Notes"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </button>

        <button
          type="button"
          className={`sidebar__nav-item ${activeView === 'categories' ? 'sidebar__nav-item--active' : ''}`}
          onClick={() => onNavigate('categories')}
          title="Manage Categories"
          aria-label="Manage Categories"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
