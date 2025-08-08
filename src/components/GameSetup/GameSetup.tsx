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
    <div
      className={styles.setupOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-title"
      aria-describedby="setup-subtitle"
    >
      <div className={styles.setupModal}>
        <div className={styles.setupHeader}>
          <h2 id="setup-title" className={styles.setupTitle}>
            New Game Setup
          </h2>
          <p id="setup-subtitle" className={styles.setupSubtitle}>
            Select number of players
          </p>
        </div>

        <div className={styles.setupContent}>
          {/* Player Count Selection */}
          <fieldset className={styles.setupSection}>
            <legend className={styles.sectionLabel}>
              Number of Players ({MIN_PLAYERS}-{MAX_PLAYERS})
            </legend>
            <div
              className={styles.playerCountSelector}
              role="group"
              aria-label="Player count options"
            >
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  className={`${styles.countButton} ${
                    playerCount === count ? styles.active : ''
                  }`}
                  onClick={() => handlePlayerCountChange(count)}
                  aria-pressed={playerCount === count}
                  aria-label={`Select ${count} player${count > 1 ? 's' : ''}`}
                >
                  {count} Player{count > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Player Names Configuration */}
          <fieldset className={styles.setupSection}>
            <legend className={styles.sectionLabel}>Player Names</legend>
            <div
              className={`${styles.playerNamesContainer} ${
                playerCount >= 3 ? styles.multiColumn : ''
              }`}
            >
              {playerNames.map((name, index) => (
                <div key={index} className={styles.playerNameRow}>
                  <div
                    className={styles.playerColorPreview}
                    style={{ backgroundColor: PLAYER_COLORS[index] }}
                    aria-label={`Player ${index + 1} color preview`}
                    role="img"
                  />
                  <label htmlFor={`player-name-${index}`} className="sr-only">
                    Player {index + 1} name
                  </label>
                  <input
                    id={`player-name-${index}`}
                    type="text"
                    className={styles.playerNameInput}
                    value={name}
                    onChange={(e) =>
                      handlePlayerNameChange(index, e.target.value)
                    }
                    placeholder={`Player ${index + 1}`}
                    maxLength={20}
                    aria-describedby={`player-color-${index}`}
                  />
                  <span id={`player-color-${index}`} className="sr-only">
                    This player's color will be {PLAYER_COLORS[index]}
                  </span>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Game Preview */}
          <div
            className={styles.setupSection}
            role="region"
            aria-labelledby="preview-label"
          >
            <h3 id="preview-label" className={styles.sectionLabel}>
              Game Preview
            </h3>
            <div className={styles.gamePreview}>
              <div className={styles.previewInfo}>
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

        <div
          className={styles.setupActions}
          role="group"
          aria-label="Game setup actions"
        >
          {onCancel && (
            <button
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={handleCancel}
              aria-label="Cancel game setup"
            >
              Cancel
            </button>
          )}
          <button
            className={`${styles.actionButton} ${styles.startButton}`}
            onClick={handleStartGame}
            aria-label={`Start new game with ${playerCount} players`}
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
