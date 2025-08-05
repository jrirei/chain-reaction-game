import React, { useState } from 'react';
import { useAudioManager } from '../../hooks/useAudioManager';
import { MIN_PLAYERS, MAX_PLAYERS, PLAYER_COLORS } from '../../utils/constants';
import styles from './GameSetup.module.css';

interface GameSetupProps {
  onStartGame: (playerCount: number, playerNames: string[]) => void;
  onCancel?: () => void;
  isVisible: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({
  onStartGame,
  onCancel,
  isVisible,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
  ]);
  const { playUIClick } = useAudioManager();

  // Update player names array when count changes
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newNames = [...playerNames];

    // Add names for new players
    while (newNames.length < count) {
      newNames.push(`Player ${newNames.length + 1}`);
    }

    // Trim excess names
    newNames.length = count;
    setPlayerNames(newNames);
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name || `Player ${index + 1}`;
    setPlayerNames(newNames);
  };

  const handleStartGame = () => {
    playUIClick();
    onStartGame(playerCount, playerNames);
  };

  const handleCancel = () => {
    playUIClick();
    onCancel?.();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.setupOverlay}>
      <div className={styles.setupModal}>
        <div className={styles.setupHeader}>
          <h2 className={styles.setupTitle}>New Game Setup</h2>
          <p className={styles.setupSubtitle}>
            Configure your Chain Reaction game
          </p>
        </div>

        <div className={styles.setupContent}>
          {/* Player Count Selection */}
          <div className={styles.setupSection}>
            <label className={styles.sectionLabel}>
              Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS})
            </label>
            <div className={styles.playerCountSelector}>
              {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => {
                const count = MIN_PLAYERS + i;
                return (
                  <button
                    key={count}
                    className={`${styles.countButton} ${
                      playerCount === count ? styles.active : ''
                    }`}
                    onClick={() => handlePlayerCountChange(count)}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Names Configuration */}
          <div className={styles.setupSection}>
            <label className={styles.sectionLabel}>Player Names</label>
            <div className={styles.playerNamesContainer}>
              {playerNames.map((name, index) => (
                <div key={index} className={styles.playerNameRow}>
                  <div
                    className={styles.playerColorPreview}
                    style={{ backgroundColor: PLAYER_COLORS[index] }}
                    aria-label={`Player ${index + 1} color`}
                  />
                  <input
                    type="text"
                    className={styles.playerNameInput}
                    value={name}
                    onChange={(e) =>
                      handlePlayerNameChange(index, e.target.value)
                    }
                    placeholder={`Player ${index + 1}`}
                    maxLength={20}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Game Preview */}
          <div className={styles.setupSection}>
            <label className={styles.sectionLabel}>Game Preview</label>
            <div className={styles.gamePreview}>
              <div className={styles.previewInfo}>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Players:</span>
                  <span className={styles.previewValue}>{playerCount}</span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Grid:</span>
                  <span className={styles.previewValue}>6×9 cells</span>
                </div>
                <div className={styles.previewItem}>
                  <span className={styles.previewLabel}>Win Condition:</span>
                  <span className={styles.previewValue}>
                    Last player standing
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.setupActions}>
          {onCancel && (
            <button
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.startButton}`}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
