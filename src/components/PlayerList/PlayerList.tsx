import React from 'react';
import { useGameState } from '../../hooks/useGameState';
import PlayerInfo from '../PlayerInfo';
import styles from './PlayerList.module.css';

interface PlayerListProps {
  showStats?: boolean;
  compact?: boolean;
  horizontal?: boolean;
}

const PlayerList: React.FC<PlayerListProps> = ({
  showStats = false,
  compact = false,
  horizontal = true,
}) => {
  const { players, currentPlayer, gameInfo, gameState } = useGameState();

  // Create chain reaction info for the current player
  const getChainReactionInfo = (playerId: string) => {
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return undefined;
    }

    const chainReactionState = gameState.chainReactionState;
    if (!chainReactionState?.isPlaying) {
      return undefined;
    }

    return {
      isActive: true,
      consecutiveExplosions: chainReactionState.consecutiveExplosions,
      currentStep: chainReactionState.currentStep,
      totalSteps: chainReactionState.totalSteps,
    };
  };

  if (players.length === 0) {
    return (
      <div className={styles.playerListContainer}>
        <div className={styles.emptyState}>No players configured</div>
      </div>
    );
  }

  // Keep players in fixed positions (original order) - highlighting shows current player
  const sortedPlayers = [...players];

  const containerClasses = [
    styles.playerListContainer,
    horizontal ? styles.horizontal : styles.vertical,
    compact ? styles.compact : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="region"
      aria-label="Player information"
    >
      <div className={styles.playerListHeader}>
        <h3 className={styles.playerListTitle} id="player-list-title">
          Players ({players.filter((p) => !p.isEliminated).length}/
          {players.length})
        </h3>

        {gameInfo.isGameStarted && (
          <div className={styles.gameProgress} aria-live="polite">
            Move {gameInfo.moveCount}
          </div>
        )}
      </div>

      <div
        className={styles.playerList}
        role="list"
        aria-labelledby="player-list-title"
        aria-describedby="player-list-description"
      >
        <div id="player-list-description" className="sr-only">
          List of players sorted by current player first, then by orb count.
          Current player is highlighted.
        </div>

        {sortedPlayers.map((player) => {
          const isCurrentPlayer = currentPlayer?.id === player.id;
          const rank = gameInfo.isGameStarted
            ? sortedPlayers.filter(
                (p) => !p.isEliminated && p.orbCount > player.orbCount
              ).length + 1
            : undefined;

          return (
            <PlayerInfo
              key={player.id}
              player={player}
              isCurrentPlayer={isCurrentPlayer}
              rank={rank}
              showStats={showStats}
              compact={compact}
              chainReactionInfo={getChainReactionInfo(player.id)}
            />
          );
        })}
      </div>

      {gameInfo.isGameFinished && gameInfo.winner && (
        <div
          className={styles.winnerAnnouncement}
          role="status"
          aria-live="polite"
          aria-label={`Game over. ${gameInfo.winner.name} is the winner!`}
        >
          🏆 {gameInfo.winner.name} is the winner! 🏆
        </div>
      )}
    </div>
  );
};

export default PlayerList;
