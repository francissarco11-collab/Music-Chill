import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Music chill ErrorBoundary caught:', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090B0E] text-[#F1F5F9] flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-white/[0.1] rounded-xl bg-[#10141C] p-6 space-y-4">
            <h1 className="font-display text-lg font-semibold">Something went wrong</h1>
            <p className="text-sm text-[#94A3B8] break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 rounded-lg bg-[#22C58B] text-[#07130E] text-sm font-semibold hover:bg-[#2AD497] transition-colors"
            >
              Reload view
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
