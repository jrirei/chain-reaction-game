import React, { useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { useAudioManager } from '../../hooks/useAudioManager';
import GameSetup from '../GameSetup';
import type { PlayerConfig } from '../../types/player';
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

  const handleStartGame = (
    playerCount: number,
    playerConfigs: PlayerConfig[]
  ) => {
    // Convert PlayerConfig to just names for now - will update initializeGame later
    const playerNames = playerConfigs.map((config) => config.name);
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
      <div
        className={styles.gameControls}
        role="toolbar"
        aria-label="Game controls"
      >
        <div className={styles.controlsSection}>
          <button
            className={`${styles.controlBtn} ${styles.primary}`}
            onClick={handleNewGameClick}
            disabled={gameInfo.isAnimating}
            aria-label="Start a new game"
            aria-describedby={
              gameInfo.isAnimating ? 'animation-status' : undefined
            }
          >
            New Game
          </button>

          <button
            className={`${styles.controlBtn} ${styles.secondary}`}
            onClick={handleReset}
            disabled={!isGameActive || gameInfo.isAnimating}
            aria-label="Reset current game"
            aria-describedby={
              !isGameActive || gameInfo.isAnimating ? 'game-status' : undefined
            }
          >
            Reset
          </button>

          <button
            className={`${styles.controlBtn} ${styles.secondary}`}
            onClick={handlePauseResume}
            disabled={!isGameActive || gameInfo.isAnimating}
            aria-label={canResume ? 'Resume the game' : 'Pause the game'}
            aria-describedby={
              !isGameActive || gameInfo.isAnimating ? 'game-status' : undefined
            }
          >
            {canResume ? 'Resume' : 'Pause'}
          </button>
        </div>

        {gameInfo.isGameFinished && gameInfo.winner && (
          <div
            className={styles.gameOverMessage}
            role="status"
            aria-live="polite"
            aria-label={`Game over. ${gameInfo.winner.name} wins!`}
          >
            🎉 {gameInfo.winner.name} wins! 🎉
          </div>
        )}

        {/* Screen reader status messages */}
        <div className="sr-only">
          <div id="game-status" aria-live="polite">
            {!isGameActive && 'No active game'}
            {gameInfo.isAnimating && 'Animation in progress'}
          </div>
          <div id="animation-status" aria-live="polite">
            {gameInfo.isAnimating && 'Please wait for animation to complete'}
          </div>
        </div>
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
