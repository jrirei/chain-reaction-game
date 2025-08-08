import React from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import styles from './GameErrorBoundary.module.css';

interface GameErrorBoundaryProps {
  children: ReactNode;
  gameId?: string;
  onGameReset?: () => void;
}

/**
 * Specialized error boundary for the game area with game-specific error handling
 */
export const GameErrorBoundary: React.FC<GameErrorBoundaryProps> = ({
  children,
  gameId,
  onGameReset,
}) => {
  const handleGameError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Game Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);

    // Could send error to analytics service here
    // Analytics.track('game_error', { error: error.message, gameId });
  };

  const gameFallback = (
    <div className={styles.gameErrorFallback}>
      <div className={styles.errorContainer}>
        <div className={styles.iconContainer}>
          <span className={styles.errorIcon}>⚠️</span>
        </div>
        <h2 className={styles.title}>Game Error</h2>
        <p className={styles.message}>
          The game board encountered an error and needs to be reset. Your
          progress may be lost, but you can start a new game.
        </p>
        <div className={styles.actions}>
          <button
            className={styles.resetButton}
            onClick={onGameReset}
            type="button"
          >
            Start New Game
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      fallback={gameFallback}
      onError={handleGameError}
      resetKeys={[gameId]}
      resetOnPropsChange={false}
    >
      {children}
    </ErrorBoundary>
  );
};

export default GameErrorBoundary;
