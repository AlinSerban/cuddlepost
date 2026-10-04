import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional brand-styled wrapper class, e.g. `pg-theme v3`. */
  className?: string
}

interface State {
  error: Error | null
}

/** Catches render/effect crashes so mail in-app browsers don't show a blank screen. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const href = typeof window !== 'undefined' ? window.location.href : ''

    return (
      <div className={this.props.className ?? 'pg-theme'} style={{ minHeight: '100vh' }}>
        <main
          style={{
            maxWidth: 420,
            margin: '0 auto',
            padding: '48px 20px',
            textAlign: 'center',
            display: 'grid',
            gap: 14,
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Couldn’t open this gift here</h1>
          <p style={{ margin: 0, color: 'var(--pg-muted, #777)', lineHeight: 1.55 }}>
            Some mail apps open links in a limited browser. Tap the menu and choose{' '}
            <strong>Open in Safari</strong> or <strong>Open in Chrome</strong>, or copy the link below.
          </p>
          {href && (
            <a
              href={href}
              style={{ wordBreak: 'break-all', color: 'var(--pg-accent, #c8693f)', fontWeight: 600 }}
            >
              {href}
            </a>
          )}
          <button
            type="button"
            className="v3-btn"
            style={{
              justifySelf: 'center',
              marginTop: 8,
              padding: '12px 22px',
              border: 'none',
              borderRadius: 12,
              background: 'var(--pg-accent, #c8693f)',
              color: '#fff',
              fontWeight: 700,
            }}
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
          >
            Try again
          </button>
        </main>
      </div>
    )
  }
}
