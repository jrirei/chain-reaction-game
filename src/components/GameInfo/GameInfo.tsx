import React, { useState, useEffect } from 'react';
import { useGameState } from '../../hooks/useGameState';
import styles from './GameInfo.module.css';

const GameInfo: React.FC = () => {
  const { gameInfo, currentPlayer } = useGameState();
  const [totalPlayTime, setTotalPlayTime] = useState(0);

  // Update total play time every second when game is active
  useEffect(() => {
    if (gameInfo.status !== 'playing' && gameInfo.status !== 'chain_reacting') {
      return;
    }

    const interval = setInterval(() => {
      // Calculate total play time from all players' thinking times plus current active time
      let totalTime = 0;

      if (gameInfo.gameStats?.playerStats) {
        Object.values(gameInfo.gameStats.playerStats).forEach((playerStat) => {
          totalTime += playerStat.totalThinkingTimeMs;

          // Add current active time if this player is currently thinking
          if (
            currentPlayer?.id === playerStat.playerId &&
            playerStat.turnStartTime
          ) {
            totalTime += Date.now() - playerStat.turnStartTime;
          }
        });
      }

      setTotalPlayTime(totalTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameInfo.status, gameInfo.gameStats, currentPlayer?.id]);

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusDisplay = (): string => {
    switch (gameInfo.status) {
      case 'setup':
        return 'Ready to start';
      case 'playing':
        return currentPlayer
          ? `Waiting for ${currentPlayer.name}`
          : 'In progress';
      case 'paused':
        return 'Paused';
      case 'animating':
      case 'chain_reacting':
        return 'Chain reaction in progress...';
      case 'finished':
        return gameInfo.winner
          ? `Finished - ${gameInfo.winner.name} wins!`
          : 'Game over';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div
      className={styles.gamePanel}
      role="complementary"
      aria-label="Game Panel - Current game status and information"
    >
      <div className={styles.gamePanelGrid}>
        {/* Current Player */}
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

        {/* Total Play Time */}
        <div className={styles.infoSection}>
          <span className={styles.infoLabel} id="play-time-label">
            Play Time:
          </span>
          <span
            className={styles.playTime}
            role="timer"
            aria-live="polite"
            aria-labelledby="play-time-label"
            title="Total play time of all players since game start"
          >
            {formatTime(totalPlayTime)}
          </span>
        </div>

        {/* Total Moves */}
        <div className={styles.infoSection}>
          <span className={styles.infoLabel} id="moves-label">
            Moves:
          </span>
          <span
            className={styles.moveCount}
            role="status"
            aria-live="polite"
            aria-labelledby="moves-label"
            title="Total number of orbs placed on the board"
          >
            {gameInfo.moveCount}
          </span>
        </div>

        {/* Game Status */}
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
      </div>
    </div>
  );
};

export default GameInfo;
