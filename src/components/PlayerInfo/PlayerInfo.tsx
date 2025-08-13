import React from 'react';
import type { Player } from '../../types';
import { STRATEGY_DISPLAY } from '../../ai/constants';
import styles from './PlayerInfo.module.css';

interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer: boolean;
  rank?: number;
  showStats?: boolean;
  compact?: boolean;
  chainReactionInfo?: {
    isActive: boolean;
    consecutiveExplosions: number;
    currentStep: number;
    totalSteps: number;
  };
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isCurrentPlayer,
  rank,
  showStats = false,
  compact = false,
  chainReactionInfo,
}) => {
  const playerClasses = [
    styles.playerInfo,
    isCurrentPlayer ? styles.currentPlayer : '',
    player.isEliminated ? styles.eliminated : '',
    compact ? styles.compact : '',
  ]
    .filter(Boolean)
    .join(' ');

  const renderBotIndicator = () => {
    if (player.type !== 'ai' || !player.aiConfig) return null;

    const strategyInfo = STRATEGY_DISPLAY[player.aiConfig.strategy];
    if (!strategyInfo) return null;

    return (
      <span className={styles.botIndicator} title={strategyInfo.name}>
        <span
          className={styles.botIcon}
          aria-label={`AI bot: ${strategyInfo.name}`}
        >
          {strategyInfo.icon}
        </span>
        <span className={styles.botLabel}>{strategyInfo.shortName} Bot</span>
      </span>
    );
  };

  const renderPlayerStatus = () => {
    if (player.isEliminated) {
      return <span className={styles.statusEliminated}>Eliminated</span>;
    }
    if (isCurrentPlayer) {
      return <span className={styles.statusActive}>Current Turn</span>;
    }
    return <span className={styles.statusWaiting}>Waiting</span>;
  };

  const renderPlayerStats = () => {
    if (!showStats) return null;

    return (
      <div className={styles.playerStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Moves:</span>
          <span className={styles.statValue}>{player.totalMoves}</span>
        </div>
      </div>
    );
  };

  const renderChainReaction = () => {
    if (!chainReactionInfo?.isActive || !isCurrentPlayer) return null;

    // Calculate intensity level (1-10 based on consecutive explosions)
    const intensityLevel = Math.min(
      chainReactionInfo.consecutiveExplosions,
      10
    );

    // Create lightning bolts based on intensity
    const lightningBolts = '⚡'.repeat(intensityLevel);

    return (
      <div className={styles.chainReactionInfo}>
        <div className={styles.chainReactionTitle}>Chain Reaction!</div>
        <div className={styles.chainReactionCounter}>
          {chainReactionInfo.consecutiveExplosions}
        </div>
        <div className={styles.chainReactionLightning}>{lightningBolts}</div>
        <div className={styles.chainReactionProgress}>
          Step {chainReactionInfo.currentStep + 1} of{' '}
          {chainReactionInfo.totalSteps}
        </div>
      </div>
    );
  };

  return (
    <div
      className={playerClasses}
      role="listitem"
      aria-labelledby={`player-name-${player.id}`}
      aria-describedby={`player-status-${player.id} player-stats-${player.id}`}
    >
      <div className={styles.playerHeader}>
        <div
          className={styles.playerColorIndicator}
          style={{ backgroundColor: player.color }}
          aria-label={`Player color: ${player.color}`}
          role="img"
        />

        <div className={styles.playerDetails}>
          <div id={`player-name-${player.id}`} className={styles.playerName}>
            {rank && (
              <span className={styles.playerRank} aria-label={`Rank ${rank}`}>
                #{rank}
              </span>
            )}
            <span className={styles.playerNameText}>{player.name}</span>
            {renderBotIndicator()}
          </div>

          {!compact && (
            <div
              id={`player-status-${player.id}`}
              className={styles.playerStatus}
              role="status"
              aria-live={isCurrentPlayer ? 'polite' : 'off'}
            >
              {renderPlayerStatus()}
            </div>
          )}
        </div>

        {!compact && (
          <div
            className={styles.playerOrbCount}
            role="status"
            aria-live={isCurrentPlayer ? 'polite' : 'off'}
            aria-label={`${player.orbCount} orbs`}
          >
            <span className={styles.orbCountNumber}>{player.orbCount}</span>
            <span className={styles.orbCountLabel} aria-hidden="true">
              orbs
            </span>
          </div>
        )}
      </div>

      {chainReactionInfo?.isActive && isCurrentPlayer && (
        <div
          role="status"
          aria-live="assertive"
          aria-label={`Chain reaction in progress: ${chainReactionInfo.consecutiveExplosions} consecutive explosions, step ${chainReactionInfo.currentStep + 1} of ${chainReactionInfo.totalSteps}`}
        >
          {renderChainReaction()}
        </div>
      )}

      <div id={`player-stats-${player.id}`}>{renderPlayerStats()}</div>
    </div>
  );
};

export default PlayerInfo;
