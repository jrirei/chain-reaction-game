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

  const formatPlayerThinkingTime = (milliseconds: number): string => {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    const seconds = Math.floor(milliseconds / 1000);
    const remainingMs = Math.round(milliseconds % 1000);
    if (seconds < 60) {
      return `${seconds}.${Math.floor(remainingMs / 100)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCurrentPlayerThinkingTime = (): number => {
    if (!currentPlayer || !gameInfo.gameStats?.playerStats) {
      return 0;
    }
    const playerStats = gameInfo.gameStats.playerStats[currentPlayer.id];
    return playerStats?.totalThinkingTimeMs || 0;
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
          style={{ color: currentPlayer?.color || 'var(--accent-color)' }}
          role="status"
          aria-live="polite"
          aria-labelledby="current-player-label"
        >
          {currentPlayer?.name || 'None'}
        </span>
      </div>
      <div className={styles.infoSection}>
        <span className={styles.infoLabel} id="player-time-label">
          {currentPlayer ? `${currentPlayer.name} Time:` : 'Player Time:'}
        </span>
        <span
          className={styles.playerTime}
          role="status"
          aria-live="polite"
          aria-labelledby="player-time-label"
          title={`Total thinking time for ${currentPlayer?.name || 'current player'}`}
        >
          {formatPlayerThinkingTime(getCurrentPlayerThinkingTime())}
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
