import React from 'react';
import { useWinLoseDetection } from '../../hooks/useWinLoseDetection';
import { useGameState } from '../../hooks/useGameState';
// import { default as GameStatsComponent } from '../GameStats/GameStats';
import type { Player } from '../../types';
import styles from './GameEndModal.module.css';

interface GameEndModalProps {
  onRestart?: () => void;
  onClose?: () => void;
  showStats?: boolean;
}

const GameEndModal: React.FC<GameEndModalProps> = ({
  onRestart,
  onClose,
  showStats = true,
}) => {
  const {
    gameEndResult,
    showWinModal,
    closeWinModal,
    getWinMessage,
    // getGameSummary,
    getPlayerStats,
  } = useWinLoseDetection();

  const { players } = useGameState();

  if (!showWinModal || !gameEndResult.isGameOver) {
    return null;
  }

  const handleClose = () => {
    closeWinModal();
    if (onClose) onClose();
  };

  const handleRestart = () => {
    closeWinModal();
    if (onRestart) onRestart();
  };

  const playerStats = getPlayerStats();
  const winMessage = getWinMessage();

  const getReasonIcon = () => {
    switch (gameEndResult.reason) {
      case 'elimination':
        return '💥';
      case 'domination':
        return '👑';
      case 'timeout':
        return '⏱️';
      default:
        return '🏆';
    }
  };

  const getReasonDescription = () => {
    switch (gameEndResult.reason) {
      case 'elimination':
        return 'All other players have been eliminated';
      case 'domination':
        return 'Achieved overwhelming board control';
      case 'timeout':
        return 'Game ended due to time limit';
      default:
        return 'Game completed';
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.winIcon}>{getReasonIcon()}</div>
          <h2 className={styles.winMessage}>{winMessage}</h2>
          <p className={styles.winReason}>{getReasonDescription()}</p>
        </div>

        <div className={styles.gameStats}>
          <h3>Game Summary</h3>
          <div className={styles.statGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Moves</span>
              <span className={styles.statValue}>
                {gameEndResult.gameStats.totalMoves}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Duration</span>
              <span className={styles.statValue}>
                {Math.floor(gameEndResult.gameStats.gameDuration / 60000)}m{' '}
                {Math.floor(
                  (gameEndResult.gameStats.gameDuration % 60000) / 1000
                )}
                s
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Players Eliminated</span>
              <span className={styles.statValue}>
                {gameEndResult.eliminatedPlayers.length}
              </span>
            </div>
          </div>
        </div>

        {showStats && (
          <div className={styles.playerStats}>
            <h3>Final Standings</h3>
            <div className={styles.playersTable}>
              <div className={styles.tableHeader}>
                <span>Rank</span>
                <span>Player</span>
                <span>Orbs</span>
                <span>Cells</span>
                <span>Status</span>
              </div>
              {playerStats
                .sort((a, b) => {
                  if (a.isWinner && !b.isWinner) return -1;
                  if (!a.isWinner && b.isWinner) return 1;
                  if (a.isEliminated && !b.isEliminated) return 1;
                  if (!a.isEliminated && b.isEliminated) return -1;
                  return b.orbCount - a.orbCount;
                })
                .map((player, index) => {
                  const gamePlayer = players.find(
                    (p: Player) => p.id === player.playerId
                  );
                  const rank = player.isWinner
                    ? 1
                    : player.isEliminated
                      ? '-'
                      : index + 1;

                  return (
                    <div
                      key={player.playerId}
                      className={`${styles.playerRow} ${
                        player.isWinner
                          ? styles.winner
                          : player.isEliminated
                            ? styles.eliminated
                            : ''
                      }`}
                    >
                      <span className={styles.rank}>
                        {player.isWinner ? '🏆' : rank}
                      </span>
                      <span
                        className={styles.playerName}
                        style={{ color: gamePlayer?.color }}
                      >
                        {gamePlayer?.name || player.playerId}
                      </span>
                      <span className={styles.orbCount}>{player.orbCount}</span>
                      <span className={styles.cellCount}>
                        {player.cellsControlled}
                      </span>
                      <span className={styles.status}>
                        {player.isWinner
                          ? 'Winner'
                          : player.isEliminated
                            ? 'Eliminated'
                            : 'Active'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* showStats && <GameStatsComponent showPlayerDetails={true} /> */}

        <div className={styles.actions}>
          <button
            className={styles.restartBtn}
            onClick={handleRestart}
            type="button"
          >
            🎮 Play Again
          </button>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameEndModal;
