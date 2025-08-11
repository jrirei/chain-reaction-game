import React, { useState } from 'react';
import { useAudioManager } from '../../hooks/useAudioManager';
import { MIN_PLAYERS, MAX_PLAYERS, PLAYER_COLORS } from '../../utils/constants';
import type { PlayerConfig } from '../../types/player';
import type { AiStrategyName } from '../../ai/types';
import { getAvailableStrategies, getStrategyInfo } from '../../ai/registry';
import { THINKING_TIME_OPTIONS } from '../../ai/constants';
import styles from './GameSetup.module.css';

interface GameSetupProps {
  onStartGame: (playerCount: number, playerConfigs: PlayerConfig[]) => void;
  onCancel?: () => void;
  isVisible: boolean;
}

const GameSetup: React.FC<GameSetupProps> = ({
  onStartGame,
  onCancel,
  isVisible,
}) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([
    { name: 'Player 1', type: 'human' },
    { name: 'Player 2', type: 'human' },
  ]);
  const { playUIClick } = useAudioManager();

  const availableStrategies = getAvailableStrategies();

  // Update player configs array when count changes
  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    const newConfigs = [...playerConfigs];

    // Add configs for new players
    while (newConfigs.length < count) {
      newConfigs.push({
        name: `Player ${newConfigs.length + 1}`,
        type: 'human',
      });
    }

    // Trim excess configs
    newConfigs.length = count;
    setPlayerConfigs(newConfigs);
  };

  const handlePlayerConfigChange = (
    index: number,
    updates: Partial<PlayerConfig>
  ) => {
    const newConfigs = [...playerConfigs];
    newConfigs[index] = {
      ...newConfigs[index],
      ...updates,
      name: updates.name || `Player ${index + 1}`,
    };

    // If switching to AI, provide default strategy
    if (updates.type === 'ai' && !newConfigs[index].aiConfig) {
      newConfigs[index].aiConfig = {
        strategy: 'default',
        maxThinkingMs: 5000, // 5 seconds default for Monte Carlo
      };
    }

    // If switching to human, remove AI config
    if (updates.type === 'human') {
      delete newConfigs[index].aiConfig;
    }

    setPlayerConfigs(newConfigs);
  };

  const handleStartGame = () => {
    playUIClick();
    onStartGame(playerCount, playerConfigs);
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

          {/* Player Configuration */}
          <fieldset className={styles.setupSection}>
            <legend className={styles.sectionLabel}>
              Player Configuration
            </legend>
            <div
              className={`${styles.playerConfigContainer} ${
                playerCount >= 3 ? styles.multiColumn : ''
              }`}
            >
              {playerConfigs.map((config, index) => (
                <div key={index} className={styles.playerConfigRow}>
                  <div
                    className={styles.playerColorPreview}
                    style={{ backgroundColor: PLAYER_COLORS[index] }}
                    aria-label={`Player ${index + 1} color preview`}
                    role="img"
                  />

                  {/* Player Name Input */}
                  <div className={styles.playerNameField}>
                    <label htmlFor={`player-name-${index}`} className="sr-only">
                      Player {index + 1} name
                    </label>
                    <input
                      id={`player-name-${index}`}
                      type="text"
                      className={styles.playerNameInput}
                      value={config.name}
                      onChange={(e) =>
                        handlePlayerConfigChange(index, {
                          name: e.target.value,
                        })
                      }
                      placeholder={`Player ${index + 1}`}
                      maxLength={20}
                    />
                  </div>

                  {/* Player Type Selection */}
                  <div className={styles.playerTypeField}>
                    <label
                      htmlFor={`player-type-${index}`}
                      className={styles.fieldLabel}
                    >
                      Type:
                    </label>
                    <select
                      id={`player-type-${index}`}
                      className={styles.playerTypeSelect}
                      value={config.type}
                      onChange={(e) =>
                        handlePlayerConfigChange(index, {
                          type: e.target.value as 'human' | 'ai',
                        })
                      }
                    >
                      <option value="human">Human</option>
                      <option value="ai">AI Bot</option>
                    </select>
                  </div>

                  {/* AI Configuration (shown only for AI players) */}
                  {config.type === 'ai' && (
                    <div className={styles.aiConfigSection}>
                      <div className={styles.aiStrategyField}>
                        <label
                          htmlFor={`ai-strategy-${index}`}
                          className={styles.fieldLabel}
                        >
                          AI Strategy:
                        </label>
                        <select
                          id={`ai-strategy-${index}`}
                          className={styles.aiStrategySelect}
                          value={config.aiConfig?.strategy || 'default'}
                          onChange={(e) =>
                            handlePlayerConfigChange(index, {
                              aiConfig: {
                                ...config.aiConfig,
                                strategy: e.target.value as AiStrategyName,
                              },
                            })
                          }
                        >
                          {availableStrategies.map((strategy) => {
                            const info = getStrategyInfo(strategy);
                            return (
                              <option key={strategy} value={strategy}>
                                {strategy.charAt(0).toUpperCase() +
                                  strategy.slice(1)}{' '}
                                ({info.difficulty})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Show thinking time for Monte Carlo */}
                      {config.aiConfig?.strategy === 'monteCarlo' && (
                        <div className={styles.thinkingTimeField}>
                          <label
                            htmlFor={`thinking-time-${index}`}
                            className={styles.fieldLabel}
                          >
                            Thinking Time:
                          </label>
                          <select
                            id={`thinking-time-${index}`}
                            className={styles.thinkingTimeSelect}
                            value={config.aiConfig?.maxThinkingMs || 5000}
                            onChange={(e) =>
                              handlePlayerConfigChange(index, {
                                aiConfig: {
                                  strategy:
                                    config.aiConfig?.strategy || 'default',
                                  maxThinkingMs: parseInt(e.target.value),
                                },
                              })
                            }
                          >
                            {THINKING_TIME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label} - {option.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className={styles.aiDescription}>
                        {
                          getStrategyInfo(
                            config.aiConfig?.strategy || 'default'
                          ).description
                        }
                      </div>
                    </div>
                  )}
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
