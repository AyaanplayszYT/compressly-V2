import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Compressly] Unhandled render error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="crash-screen">
        <div className="crash-inner">
          <div className="crash-icon">💥</div>
          <h1 className="crash-title">Something went wrong</h1>
          <p className="crash-desc">
            An unexpected error occurred in the renderer. Your files are safe.
          </p>
          {this.state.error && (
            <pre className="crash-error">{this.state.error.message}</pre>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              🔄 Reload App
            </button>
            <button
              className="btn"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }
}
