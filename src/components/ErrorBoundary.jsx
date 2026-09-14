import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Noteroo UI Error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    } else {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: 'var(--text-main, #1d1d1f)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            fontSize: '1.5rem',
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            Something went wrong loading this note
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #86868b)', margin: '0 0 1.5rem 0', maxWidth: '400px' }}>
            {this.state.error?.message || 'An unexpected error occurred while displaying the content.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '20px',
                border: 'none',
                background: 'var(--accent, #7c3aed)',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
