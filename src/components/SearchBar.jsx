import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

const SearchBar = ({
  searchQuery = '',
  onSearchChange,
  user,
  onOpenProfile,
  onLogout,
  onNavigate,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const rawVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.13.0';
  const versionParts = rawVersion.split('.');
  const displayVersion = `V${versionParts[0]}.${versionParts[1]}`;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleChange = (e) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleClear = () => {
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const handleHardRefresh = async () => {
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
    window.location.reload(true);
  };

  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="search-bar-wrapper">
      <div className="search-bar-container">
        <svg
          className="search-icon"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search notes..."
          value={searchQuery}
          onChange={handleChange}
          aria-label="Search notes"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {user && (
        <div className="profile-options-wrapper" ref={menuRef}>
          <button
            type="button"
            className={`profile-options-btn ${isMenuOpen ? 'profile-options-btn--active' : ''}`}
            onClick={() => setIsMenuOpen((prev) => !prev)}
            title={`${user.name || user.email} • Profile & Settings`}
            aria-label="Profile and Settings"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="profile-options-btn__avatar-img" />
            ) : (
              <span className="profile-options-btn__initial">{userInitial}</span>
            )}
          </button>

          {isMenuOpen && (
            <div className="profile-options-menu">
              <div className="profile-options-menu__user-header">
                <div className="profile-options-menu__avatar">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="profile-options-menu__avatar-img" />
                  ) : (
                    userInitial
                  )}
                </div>
                <div className="profile-options-menu__user-info">
                  <span className="profile-options-menu__user-name">{user.name || 'User'}</span>
                  <span className="profile-options-menu__user-email">{user.email}</span>
                </div>
              </div>

              <div className="profile-options-menu__divider" />

              <button
                type="button"
                className="profile-options-menu__item"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onOpenProfile) onOpenProfile();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>Profile Settings</span>
              </button>

              {onNavigate && (
                <>
                  <button
                    type="button"
                    className="profile-options-menu__item"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate('categories');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Manage Categories</span>
                  </button>

                  <button
                    type="button"
                    className="profile-options-menu__item"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate('trash');
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span>Deleted Page (Trash)</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="profile-options-menu__item profile-options-menu__item--reload"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleHardRefresh();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span>Reload App ({displayVersion})</span>
              </button>

              <div className="profile-options-menu__divider" />

              <button
                type="button"
                className="profile-options-menu__item profile-options-menu__item--logout"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onLogout) onLogout();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
