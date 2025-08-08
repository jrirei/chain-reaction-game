import React from 'react';
import { useGameState } from '../../hooks/useGameState';
import styles from './GameInfo.module.css';

const GameInfo: React.FC = () => {
  const { gameInfo, currentPlayer } = useGameState();

  const formatGameTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = (): string => {
    switch (gameInfo.status) {
      case 'setup':
        return 'Ready to start';
      case 'playing':
        return 'In progress';
      case 'paused':
        return 'Paused';
      case 'animating':
        return 'Chain reaction...';
      case 'finished':
        return gameInfo.winner ? `${gameInfo.winner.name} wins!` : 'Game over';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      className={styles.gameInfo}
      role="complementary"
      aria-label="Game information"
    >
      <div className={styles.infoSection}>
        <span className={styles.infoLabel} id="current-player-label">
          Current Player:
        </span>
        <span
          className={styles.currentPlayer}
          style={{ color: currentPlayer?.color || '#4ECDC4' }}
          role="status"
          aria-live="polite"
          aria-labelledby="current-player-label"
        >
          {currentPlayer?.name || 'None'}
        </span>
      </div>
      <div className={styles.infoSection}>
        <span className={styles.infoLabel} id="move-count-label">
          Move:
        </span>
        <span
          className={styles.moveCount}
          role="status"
          aria-live="polite"
          aria-labelledby="move-count-label"
        >
          {gameInfo.moveCount}
        </span>
      </div>
      <div className={styles.infoSection}>
        <span className={styles.infoLabel} id="game-status-label">
          Status:
        </span>
        <span
          className={styles.gameStatus}
          role="status"
          aria-live="polite"
          aria-labelledby="game-status-label"
        >
          {getStatusDisplay()}
        </span>
      </div>
      {gameInfo.gameTime > 0 && (
        <div className={styles.infoSection}>
          <span className={styles.infoLabel} id="game-time-label">
            Time:
          </span>
          <span
            className={styles.gameTime}
            role="timer"
            aria-labelledby="game-time-label"
          >
            {formatGameTime(gameInfo.gameTime)}
          </span>
        </div>
      )}
    </div>
  );
};

export default GameInfo;
