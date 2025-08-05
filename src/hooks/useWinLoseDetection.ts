import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameState } from './useGameState';
import { useAudioManager } from './useAudioManager';
import type { Player } from '../types';
import {
  checkGameEnd,
  predictLikelyWinner,
  isPlayerInDanger,
  getWinMessage,
  getGameSummary,
  type GameEndResult,
} from '../utils/winLoseDetection';

export interface WinLoseAlert {
  id: string;
  type: 'game_over' | 'player_eliminated' | 'danger_warning' | 'prediction';
  title: string;
  message: string;
  playerId?: string;
  duration?: number;
  persistent?: boolean;
  timestamp: number;
}

export const useWinLoseDetection = () => {
  const { gameState, currentPlayer, players } = useGameState();
  const { playGameWin, playGameOver } = useAudioManager();
  const [alerts, setAlerts] = useState<WinLoseAlert[]>([]);
  const [gameEndResult, setGameEndResult] = useState<GameEndResult | null>(
    null
  );
  const [showWinModal, setShowWinModal] = useState(false);
  const [lastCheckMoveCount, setLastCheckMoveCount] = useState(0);

  // Memoized game end detection
  const currentGameEnd = useMemo((): GameEndResult => {
    return checkGameEnd(gameState);
  }, [gameState]);

  // Memoized win prediction
  const winPrediction = useMemo(() => {
    if (currentGameEnd.isGameOver) return null;
    return predictLikelyWinner(gameState);
  }, [gameState, currentGameEnd.isGameOver]);

  // Check for game end and generate alerts
  const checkGameEndConditions = useCallback(() => {
    // Only check on move count changes to avoid excessive checks
    if (gameState.moveCount === lastCheckMoveCount) return;
    setLastCheckMoveCount(gameState.moveCount);

    const result = currentGameEnd;

    // Game over detection
    if (result.isGameOver && !gameEndResult) {
      setGameEndResult(result);
      setShowWinModal(true);

      // Play appropriate sound effect
      if (
        result.winner &&
        currentPlayer &&
        result.winner === currentPlayer.id
      ) {
        playGameWin();
      } else {
        playGameOver();
      }

      // Add game over alert
      const gameOverAlert: WinLoseAlert = {
        id: `game-over-${Date.now()}`,
        type: 'game_over',
        title: getWinMessage(result),
        message: getGameSummary(result),
        persistent: true,
        timestamp: Date.now(),
      };

      setAlerts((prev) => [...prev, gameOverAlert]);
      return;
    }

    // Player elimination detection
    const newlyEliminated = result.eliminatedPlayers.filter((playerId) => {
      // Check if this player was eliminated this turn
      const wasEliminatedBefore =
        gameEndResult?.eliminatedPlayers.includes(playerId);
      return !wasEliminatedBefore;
    });

    newlyEliminated.forEach((playerId) => {
      const eliminationAlert: WinLoseAlert = {
        id: `eliminated-${playerId}-${Date.now()}`,
        type: 'player_eliminated',
        title: 'Player Eliminated!',
        message: `${playerId} has been eliminated from the game`,
        playerId,
        duration: 5000,
        timestamp: Date.now(),
      };

      setAlerts((prev) => [...prev, eliminationAlert]);
    });

    // Danger warnings for players
    if (gameState.moveCount > gameState.players.length * 2) {
      // After initial rounds
      players.forEach((player: Player) => {
        if (!player.isEliminated) {
          const dangerStatus = isPlayerInDanger(gameState, player.id);

          if (dangerStatus.inDanger && dangerStatus.severity === 'high') {
            // Check if we haven't recently warned about this player
            const recentWarning = alerts.find(
              (alert) =>
                alert.type === 'danger_warning' &&
                alert.playerId === player.id &&
                Date.now() - alert.timestamp < 10000 // 10 seconds
            );

            if (!recentWarning) {
              const dangerAlert: WinLoseAlert = {
                id: `danger-${player.id}-${Date.now()}`,
                type: 'danger_warning',
                title: `${player.name} in Danger!`,
                message: dangerStatus.reasons.join(', '),
                playerId: player.id,
                duration: 4000,
                timestamp: Date.now(),
              };

              setAlerts((prev) => [...prev, dangerAlert]);
            }
          }
        }
      });
    }

    // Win prediction alerts (occasionally)
    if (
      winPrediction &&
      winPrediction.confidence > 0.8 &&
      gameState.moveCount % 5 === 0
    ) {
      const predictionAlert: WinLoseAlert = {
        id: `prediction-${Date.now()}`,
        type: 'prediction',
        title: 'Prediction',
        message: `${winPrediction.predictedWinner} likely to win (${Math.round(winPrediction.confidence * 100)}% confidence)`,
        playerId: winPrediction.predictedWinner || undefined,
        duration: 3000,
        timestamp: Date.now(),
      };

      setAlerts((prev) => [...prev, predictionAlert]);
    }
  }, [
    gameState,
    currentGameEnd,
    gameEndResult,
    lastCheckMoveCount,
    players,
    alerts,
    winPrediction,
    currentPlayer,
    playGameWin,
    playGameOver,
  ]);

  // Run checks when game state changes
  useEffect(() => {
    checkGameEndConditions();
  }, [checkGameEndConditions]);

  // Auto-remove expired alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setAlerts((prevAlerts) =>
        prevAlerts.filter((alert) => {
          if (alert.persistent) return true;
          const duration = alert.duration || 3000;
          return now - alert.timestamp < duration;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Dismiss specific alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Close win modal
  const closeWinModal = useCallback(() => {
    setShowWinModal(false);
  }, []);

  // Restart game
  const restartGame = useCallback(() => {
    setGameEndResult(null);
    setShowWinModal(false);
    setAlerts([]);
    setLastCheckMoveCount(0);
    // Note: Actual game restart would be handled by parent component
  }, []);

  // Get current player danger status
  const getCurrentPlayerDanger = useCallback(() => {
    if (!currentPlayer) return null;
    return isPlayerInDanger(gameState, currentPlayer.id);
  }, [gameState, currentPlayer]);

  // Get player statistics for display
  const getPlayerStats = useCallback(() => {
    return currentGameEnd.finalScores.map((score) => ({
      ...score,
      dangerStatus: isPlayerInDanger(gameState, score.playerId),
    }));
  }, [currentGameEnd.finalScores, gameState]);

  return {
    // Game end state
    gameEndResult: currentGameEnd,
    isGameOver: currentGameEnd.isGameOver,
    winner: currentGameEnd.winner,
    showWinModal,

    // Predictions and analysis
    winPrediction,
    getCurrentPlayerDanger,
    getPlayerStats,

    // Alerts
    alerts,
    dismissAlert,
    clearAllAlerts,

    // Actions
    closeWinModal,
    restartGame,

    // Utilities
    getWinMessage: () => getWinMessage(currentGameEnd),
    getGameSummary: () => getGameSummary(currentGameEnd),

    // State flags
    hasWinner: !!currentGameEnd.winner,
    eliminatedCount: currentGameEnd.eliminatedPlayers.length,
    activePlayerCount:
      gameState.players.length - currentGameEnd.eliminatedPlayers.length,
  };
};
