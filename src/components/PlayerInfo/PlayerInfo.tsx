import React, { useState, useEffect } from 'react';
import type { Player } from '../../types';
import { STRATEGY_DISPLAY } from '../../ai/constants';
import { useGameState } from '../../hooks/useGameState';
import styles from './PlayerInfo.module.css';

interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer: boolean;
  playerNumber: number;
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
  playerNumber,
  compact = false,
  chainReactionInfo,
}) => {
  const { gameInfo } = useGameState();
  const [playerPlayTime, setPlayerPlayTime] = useState(0);

  // Update player's individual play time every second if they're the current player
  useEffect(() => {
    if (!isCurrentPlayer || gameInfo.status !== 'playing') {
      return;
    }

    const interval = setInterval(() => {
      const playerStats = gameInfo.gameStats?.playerStats[player.id];
      let totalTime = playerStats?.totalThinkingTimeMs || 0;

      // Add current active time if this player is currently thinking
      if (playerStats?.turnStartTime) {
        totalTime += Date.now() - playerStats.turnStartTime;
      }

      setPlayerPlayTime(totalTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCurrentPlayer, gameInfo.status, gameInfo.gameStats, player.id]);

  // Update static play time for non-current players
  useEffect(() => {
    if (!isCurrentPlayer) {
      const playerStats = gameInfo.gameStats?.playerStats[player.id];
      setPlayerPlayTime(playerStats?.totalThinkingTimeMs || 0);
    }
  }, [isCurrentPlayer, gameInfo.gameStats, player.id]);

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

  const getMaxChainReaction = (): number => {
    const playerStats = gameInfo.gameStats?.playerStats[player.id];
    return playerStats?.longestChainReaction || 0;
  };
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
      {/* Player Header with Color Orb and Number */}
      <div className={styles.playerHeader}>
        <div className={styles.playerColorSection}>
          <div
            className={styles.playerColorOrb}
            style={{ backgroundColor: player.color }}
            aria-label={`Player ${playerNumber} color: ${player.color}`}
            role="img"
          />
          <span className={styles.playerNumber}>#{playerNumber}</span>
        </div>

        <div className={styles.playerDetails}>
          <div id={`player-name-${player.id}`} className={styles.playerName}>
            <span className={styles.playerNameText}>
              {player.type === 'human' ? player.name : player.name}
            </span>
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
      </div>

      {/* Player Stats Grid */}
      {!compact && (
        <div className={styles.playerStatsGrid}>
          {/* Orbs Count */}
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Orbs:</span>
            <span className={styles.statValue}>{player.orbCount}</span>
          </div>

          {/* Play Time */}
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Play Time:</span>
            <span
              className={styles.statValue}
              title="Total time this player has been active"
            >
              {formatTime(playerPlayTime)}
            </span>
          </div>

          {/* Max Chain Reaction */}
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Max Chain:</span>
            <span
              className={styles.statValue}
              title="Maximum chain reaction triggered by this player"
            >
              {getMaxChainReaction()}
            </span>
          </div>
        </div>
      )}

      {/* Chain Reaction Status */}
      {chainReactionInfo?.isActive && isCurrentPlayer && (
        <div
          role="status"
          aria-live="assertive"
          aria-label={`Chain reaction in progress: ${chainReactionInfo.consecutiveExplosions} consecutive explosions, step ${chainReactionInfo.currentStep + 1} of ${chainReactionInfo.totalSteps}`}
        >
          {renderChainReaction()}
        </div>
      )}
    </div>
  );
};

export default PlayerInfo;
