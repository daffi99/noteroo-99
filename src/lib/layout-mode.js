export const LAYOUT_MODES = {
  AUTO: 'auto',
  DESKTOP: 'desktop',
  IPAD: 'ipad',
  PWA: 'pwa',
}

const STORAGE_KEY = 'noteroo_device_layout'

export function getSavedLayoutMode() {
  if (typeof window === 'undefined') return LAYOUT_MODES.AUTO
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && Object.values(LAYOUT_MODES).includes(saved)) {
      return saved
    }
  } catch (e) {
    console.error('Failed to read layout mode from localStorage', e)
  }
  return LAYOUT_MODES.AUTO
}

export function setSavedLayoutMode(mode) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, mode)
    applyLayoutModeToDom(mode)
    window.dispatchEvent(new CustomEvent('noteroo-layout-change', { detail: mode }))
  } catch (e) {
    console.error('Failed to save layout mode to localStorage', e)
  }
}

export function applyLayoutModeToDom(mode) {
  if (typeof document === 'undefined') return
  const validMode = mode || getSavedLayoutMode()
  document.documentElement.setAttribute('data-device-layout', validMode)
}
