import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
              <p className="text-sm text-gray-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-left font-mono break-all">
                {this.state.error?.message ?? 'Unknown error'}
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Reload App
              </button>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
