/**
 * ErrorBoundary.jsx
 * Class-based React error boundary — catches render-time exceptions
 * anywhere in the component tree and renders a readable fallback
 * instead of a blank white screen.
 *
 * Usage: wraps <App> in app.jsx.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Forward to Sentry / console in production; console only in dev
        if (typeof window !== 'undefined' && window.Sentry) {
            window.Sentry.captureException(error, { extra: info });
        } else {
            console.error('[ErrorBoundary]', error, info);
        }
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        const isDev = import.meta.env.DEV;

        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
                background: '#f8fafc',
                padding: '2rem',
            }}>
                <div style={{
                    maxWidth: 520,
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
                    padding: '2.5rem',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
                        Une erreur inattendue s&apos;est produite
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: 24 }}>
                        Veuillez rafraîchir la page ou contacter l&apos;assistance si le problème persiste.
                    </p>
                    {isDev && this.state.error && (
                        <pre style={{
                            textAlign: 'left',
                            background: '#fef2f2',
                            border: '1px solid #fca5a5',
                            borderRadius: 8,
                            padding: '1rem',
                            fontSize: '0.75rem',
                            color: '#991b1b',
                            overflow: 'auto',
                            maxHeight: 200,
                            marginBottom: 24,
                        }}>
                            {this.state.error.stack ?? String(this.state.error)}
                        </pre>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '0.625rem 1.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Rafraîchir la page
                    </button>
                </div>
            </div>
        );
    }
}
