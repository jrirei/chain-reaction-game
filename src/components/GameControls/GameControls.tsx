import React from 'react';
import { useGameState } from '../../hooks/useGameState';
import styles from './GameControls.module.css';

const GameControls: React.FC = () => {
  const {
    gameInfo,
    initializeGame,
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
  } = useGameState();

  const handleNewGame = () => {
    initializeGame(2, ['Player 1', 'Player 2']);
    startGame();
  };

  const handleReset = () => {
    resetGame();
  };

  const handlePauseResume = () => {
    if (gameInfo.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  };

  const isGameActive = gameInfo.isGameStarted && !gameInfo.isGameFinished;
  const canResume = gameInfo.isPaused;

  return (
    <div className={styles.gameControls}>
      <div className={styles.controlsSection}>
        <button
          className={`${styles.controlBtn} ${styles.primary}`}
          onClick={handleNewGame}
          disabled={gameInfo.isAnimating}
        >
          New Game
        </button>

        <button
          className={`${styles.controlBtn} ${styles.secondary}`}
          onClick={handleReset}
          disabled={!isGameActive || gameInfo.isAnimating}
        >
          Reset
        </button>

        <button
          className={`${styles.controlBtn} ${styles.secondary}`}
          onClick={handlePauseResume}
          disabled={!isGameActive || gameInfo.isAnimating}
        >
          {canResume ? 'Resume' : 'Pause'}
        </button>
      </div>

      {gameInfo.isGameFinished && gameInfo.winner && (
        <div className={styles.gameOverMessage}>
          🎉 {gameInfo.winner.name} wins! 🎉
        </div>
      )}
    </div>
  );
};

export default GameControls;
