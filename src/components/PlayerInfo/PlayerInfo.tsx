import React from 'react';
import type { Player } from '../../types';
import styles from './PlayerInfo.module.css';

interface PlayerInfoProps {
  player: Player;
  isCurrentPlayer: boolean;
  rank?: number;
  showStats?: boolean;
  compact?: boolean;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  player,
  isCurrentPlayer,
  rank,
  showStats = false,
  compact = false,
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

      {renderPlayerStats()}
    </div>
  );
};

export default PlayerInfo;
