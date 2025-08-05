import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useAudioManager } from '../../hooks/useAudioManager';
import GameSetup from '../GameSetup';
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

  const { playUIClick } = useAudioManager();
  const [showSetup, setShowSetup] = useState(false);

  const handleNewGameClick = () => {
    playUIClick();
    setShowSetup(true);
  };

  const handleStartGame = (playerCount: number, playerNames: string[]) => {
    initializeGame(playerCount, playerNames);
    startGame();
    setShowSetup(false);
  };

  const handleCancelSetup = () => {
    setShowSetup(false);
  };

  const handleReset = () => {
    playUIClick();
    resetGame();
  };

  const handlePauseResume = () => {
    playUIClick();
    if (gameInfo.isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  };

  const isGameActive = gameInfo.isGameStarted && !gameInfo.isGameFinished;
  const canResume = gameInfo.isPaused;

  return (
    <>
      <div className={styles.gameControls}>
        <div className={styles.controlsSection}>
          <button
            className={`${styles.controlBtn} ${styles.primary}`}
            onClick={handleNewGameClick}
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

      <GameSetup
        isVisible={showSetup}
        onStartGame={handleStartGame}
        onCancel={handleCancelSetup}
      />
    </>
  );
};

export default GameControls;
