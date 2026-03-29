import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="error-boundary-fallback">
          <AlertCircle size={48} style={{ color: 'var(--danger)', opacity: 0.6 }} />
          <h3>Quelque chose s'est mal passé</h3>
          <p className="text-sm text-secondary">
            {this.state.error?.message || 'Une erreur inattendue est survenue.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleRetry}>
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
