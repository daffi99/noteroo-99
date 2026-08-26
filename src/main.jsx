import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Noteroo uncaught error:', error, errorInfo)
  }

  handleReload = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          await reg.unregister()
        }
      }
    } catch (e) {
      console.warn('Error clearing caches:', e)
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
          background: '#f5f5f7',
          color: '#1d1d1f'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#86868b', marginBottom: '1.5rem', maxWidth: '360px', fontSize: '0.95rem' }}>
            A new version of Noteroo was updated. Tap below to reload fresh.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1d1d1f',
              color: '#ffffff',
              border: 'none',
              borderRadius: '999px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Refresh App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update()
      })
      .catch((err) => {
        console.warn('Noteroo PWA ServiceWorker registration failed: ', err)
      })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
