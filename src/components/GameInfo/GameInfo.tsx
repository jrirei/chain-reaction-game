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
    <div className={styles.gameInfo}>
      <div className={styles.infoSection}>
        <span className={styles.infoLabel}>Current Player:</span>
        <span
          className={styles.currentPlayer}
          style={{ color: currentPlayer?.color || '#4ECDC4' }}
        >
          {currentPlayer?.name || 'None'}
        </span>
      </div>
      <div className={styles.infoSection}>
        <span className={styles.infoLabel}>Move:</span>
        <span className={styles.moveCount}>{gameInfo.moveCount}</span>
      </div>
      <div className={styles.infoSection}>
        <span className={styles.infoLabel}>Status:</span>
        <span className={styles.gameStatus}>{getStatusDisplay()}</span>
      </div>
      {gameInfo.gameTime > 0 && (
        <div className={styles.infoSection}>
          <span className={styles.infoLabel}>Time:</span>
          <span className={styles.gameTime}>
            {formatGameTime(gameInfo.gameTime)}
          </span>
        </div>
      )}
    </div>
  );
};

export default GameInfo;
