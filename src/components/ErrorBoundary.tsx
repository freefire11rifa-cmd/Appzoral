import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Appzora ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Appzora encountered an unexpected error while syncing data. Please reload the page to continue.
            </p>
            <p className="mt-3 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#01875F] hover:bg-[#016e4d] text-white text-sm font-medium transition-colors"
            >
              Reload Appzora
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
