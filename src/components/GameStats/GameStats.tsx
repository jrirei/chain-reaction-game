import React from 'react';
import { useGameState } from '../../hooks/useGameState';
import type { GameStats } from '../../types';
import styles from './GameStats.module.css';

interface GameStatsProps {
  showPlayerDetails?: boolean;
  compact?: boolean;
}

const GameStats: React.FC<GameStatsProps> = ({
  showPlayerDetails = true,
  compact = false,
}) => {
  const { gameState, players } = useGameState();
  const gameStats = gameState.gameStats || {
    totalExplosions: 0,
    chainReactionsCount: 0,
    longestChainReaction: 0,
    playerStats: {},
  };

  if (compact) {
    return (
      <div className={styles.compactStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Chain Reactions:</span>
          <span className={styles.statValue}>
            {gameStats.chainReactionsCount}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total Explosions:</span>
          <span className={styles.statValue}>{gameStats.totalExplosions}</span>
        </div>
        {gameStats.longestChainReaction > 0 && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Longest Chain:</span>
            <span className={styles.statValue}>
              {gameStats.longestChainReaction}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.gameStats}>
      <h3 className={styles.title}>Game Statistics</h3>

      <div className={styles.gameOverview}>
        <div className={styles.overviewItem}>
          <div className={styles.overviewValue}>
            {gameStats.chainReactionsCount}
          </div>
          <div className={styles.overviewLabel}>Chain Reactions</div>
        </div>
        <div className={styles.overviewItem}>
          <div className={styles.overviewValue}>
            {gameStats.totalExplosions}
          </div>
          <div className={styles.overviewLabel}>Total Explosions</div>
        </div>
        <div className={styles.overviewItem}>
          <div className={styles.overviewValue}>
            {gameStats.longestChainReaction}
          </div>
          <div className={styles.overviewLabel}>Longest Chain</div>
        </div>
      </div>

      {showPlayerDetails && (
        <div className={styles.playerStats}>
          <h4 className={styles.playerStatsTitle}>Player Statistics</h4>
          {players.map((player) => {
            const playerStats = gameStats.playerStats[player.id];
            return (
              <div key={player.id} className={styles.playerRow}>
                <div className={styles.playerInfo}>
                  <div
                    className={styles.playerColor}
                    style={{ backgroundColor: player.color }}
                  />
                  <span className={styles.playerName}>{player.name}</span>
                </div>
                <div className={styles.playerMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>
                      {playerStats?.movesPlayed || 0}
                    </span>
                    <span className={styles.metricLabel}>Moves</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>
                      {playerStats?.chainReactionsTriggered || 0}
                    </span>
                    <span className={styles.metricLabel}>Chain Reactions</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>
                      {playerStats?.explosionsCaused || 0}
                    </span>
                    <span className={styles.metricLabel}>Explosions</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricValue}>
                      {playerStats?.longestChainReaction || 0}
                    </span>
                    <span className={styles.metricLabel}>Longest Chain</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GameStats;
