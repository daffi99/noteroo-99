import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyLayoutModeToDom } from './lib/layout-mode.js'

// Initialize device layout mode from localStorage
applyLayoutModeToDom()

// Clean up any stale service workers to ensure 100% reliable direct network loading on iOS Safari/PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
