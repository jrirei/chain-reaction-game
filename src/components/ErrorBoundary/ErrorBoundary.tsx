import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number | boolean | null | undefined>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component that catches JavaScript errors in the component tree
 * and displays a fallback UI instead of crashing the entire application.
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // Log the error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when resetKeys change
    if (hasError && resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary when any props change (if enabled)
    if (hasError && resetOnPropsChange && prevProps !== this.props) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRetry = (): void => {
    this.resetErrorBoundary();
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className={styles.errorBoundary}>
          <div className={styles.errorContainer}>
            <h2 className={styles.title}>Oops! Something went wrong</h2>
            <p className={styles.message}>
              The game encountered an unexpected error. This might be a
              temporary issue.
            </p>

            <div className={styles.actions}>
              <button
                className={styles.retryButton}
                onClick={this.handleRetry}
                type="button"
              >
                Try Again
              </button>
              <button
                className={styles.reloadButton}
                onClick={this.handleReload}
                type="button"
              >
                Reload Game
              </button>
            </div>

            {import.meta.env.DEV && error && (
              <details className={styles.errorDetails}>
                <summary className={styles.errorSummary}>
                  Error Details (Development)
                </summary>
                <pre className={styles.errorText}>
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
