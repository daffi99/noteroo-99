import React from 'react';
import './Sidebar.css';
import { fastTap } from '../lib/fastTap';

const Sidebar = ({ activeView, onNavigate, onNewNote, user, onOpenProfile, onLogout }) => {
  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  const rawVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.13.0';
  const versionParts = rawVersion.split('.');
  const displayVersion = `V${versionParts[0]}.${versionParts[1]}`;

  const handleVersionClick = async () => {
    // Only act as hard refresh on mobile / touch / PWA
    const isMobile = window.innerWidth <= 768 || window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (!isMobile) return;

    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn('Error clearing cache on hard refresh:', e);
    }
    // Hard reload
    window.location.reload(true);
  };

  return (
    <aside className="sidebar">
      <div 
        className="sidebar__logo" 
        title="Noteroo" 
        aria-label="Noteroo logo"
        {...fastTap(() => onNavigate('dashboard'))}
      >
        <img src="/favicon.png" alt="Noteroo Logo" className="sidebar__logo-img" />
      </div>

      <button
        type="button"
        className="sidebar__add-btn"
        {...fastTap(onNewNote)}
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
          {...fastTap(() => onNavigate('dashboard'))}
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
          {...fastTap(() => onNavigate('categories'))}
          title="Manage Categories"
          aria-label="Manage Categories"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button
          type="button"
          className={`sidebar__nav-item ${activeView === 'trash' ? 'sidebar__nav-item--active' : ''}`}
          {...fastTap(() => onNavigate('trash'))}
          title="Trash"
          aria-label="Trash"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="sidebar__bottom-group">
        {user && (
          <div className="sidebar__footer">
            <button
              type="button"
              className="sidebar__user-btn"
              {...fastTap(onOpenProfile)}
              title={`${user.name || user.email} • Click to Edit Profile`}
              aria-label="Profile Settings"
            >
              <div className="sidebar__user-avatar">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="sidebar__user-avatar-img" />
                ) : (
                  userInitial
                )}
              </div>
            </button>

            <button
              type="button"
              className="sidebar__nav-item sidebar__logout-btn"
              {...fastTap(onLogout)}
              title="Log Out"
              aria-label="Log Out"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        <button
          type="button"
          className="sidebar__version"
          {...fastTap(handleVersionClick)}
          title={`App Version ${rawVersion} (Tap to force reload)`}
          aria-label={`App Version ${rawVersion}`}
        >
          {displayVersion}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
