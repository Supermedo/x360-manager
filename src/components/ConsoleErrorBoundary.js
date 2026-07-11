import React from 'react';

/** Catches crashes inside console mode so the user gets an exit path instead of a dead screen. */
class ConsoleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[console-mode] crashed:', error, info?.componentStack);
  }

  componentDidUpdate() {
    if (this.state.error) {
      window.electronAPI?.setFullScreen?.(false);
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 30000,
          background: '#0b0f0b',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          padding: '32px',
          textAlign: 'center'
        }}
      >
        <h2 style={{ color: '#7bbf32', fontWeight: 600 }}>Console mode ran into a problem</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 560, fontSize: 14, lineHeight: 1.6 }}>
          {String(this.state.error?.message || this.state.error)}
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => {
            this.setState({ error: null });
            this.props.onExit?.();
          }}
          style={{
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            background: '#107c10',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Return to app
        </button>
      </div>
    );
  }
}

export default ConsoleErrorBoundary;
