import React from 'react';
import type { Player } from '../../types';
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
          <span className={styles.statLabel}>Orbs:</span>
          <span className={styles.statValue}>{player.orbCount}</span>
        </div>
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
    <div className={playerClasses}>
      <div className={styles.playerHeader}>
        <div
          className={styles.playerColorIndicator}
          style={{ backgroundColor: player.color }}
          aria-label={`Player color: ${player.color}`}
        />

        <div className={styles.playerDetails}>
          <div className={styles.playerName}>
            {rank && <span className={styles.playerRank}>#{rank}</span>}
            {player.name}
          </div>

          {!compact && (
            <div className={styles.playerStatus}>{renderPlayerStatus()}</div>
          )}
        </div>

        {!compact && (
          <div className={styles.playerOrbCount}>
            <span className={styles.orbCountNumber}>{player.orbCount}</span>
            <span className={styles.orbCountLabel}>orbs</span>
          </div>
        )}
      </div>

      {renderChainReaction()}
      {renderPlayerStats()}
    </div>
  );
};

export default PlayerInfo;
