import { useCallback } from 'react';
import { useGameState } from './useGameState';
import {
  createPlayers,
  getNextPlayer,
  assignPlayerColors,
  validatePlayerConfig,
  type PlayerConfig,
  type PlayerCreationOptions,
} from '../utils/playerManager';
import { countPlayerOrbs } from '../utils/gameLogic';
import type { PlayerId } from '../types';

export const usePlayerManager = () => {
  const { gameState, players, currentPlayer, boardInfo, initializeGame } =
    useGameState();

  // Create and initialize players
  const setupPlayers = useCallback(
    (options: PlayerCreationOptions) => {
      const newPlayers = createPlayers(options);
      const playersWithColors = assignPlayerColors(newPlayers);

      const playerConfigs = playersWithColors.map((player) => ({
        name: player.name,
        type: player.type,
        aiConfig: player.aiConfig,
      }));

      initializeGame(playersWithColors.length, playerConfigs);

      return playersWithColors;
    },
    [initializeGame]
  );

  // Validate player configuration
  const validatePlayer = useCallback((config: PlayerConfig): string[] => {
    return validatePlayerConfig(config);
  }, []);

  // Get current player statistics
  const getCurrentPlayerStats = useCallback(() => {
    if (!currentPlayer) return null;

    const orbCount = countPlayerOrbs(boardInfo, currentPlayer.id);

    return {
      ...currentPlayer,
      orbCount,
      isLeading: players.every(
        (p) =>
          p.id === currentPlayer.id ||
          countPlayerOrbs(boardInfo, p.id) <= orbCount
      ),
    };
  }, [currentPlayer, boardInfo, players]);

  // Get player rankings
  const getPlayerRankings = useCallback(() => {
    const playersWithOrbs = players.map((player) => ({
      ...player,
      orbCount: countPlayerOrbs(boardInfo, player.id),
    }));

    return playersWithOrbs
      .filter((p) => !p.isEliminated)
      .sort((a, b) => {
        // Sort by orb count (descending)
        if (a.orbCount !== b.orbCount) {
          return b.orbCount - a.orbCount;
        }
        // Then by total moves (ascending - fewer moves is better)
        return a.totalMoves - b.totalMoves;
      });
  }, [players, boardInfo]);

  // Check if a player should be eliminated
  const checkPlayerElimination = useCallback(
    (playerId: PlayerId): boolean => {
      if (gameState.moveCount === 0) return false;

      const orbCount = countPlayerOrbs(boardInfo, playerId);
      return orbCount === 0;
    },
    [boardInfo, gameState.moveCount]
  );

  // Get next player in turn order
  const getNextPlayerInTurn = useCallback(() => {
    return getNextPlayer(players, gameState.currentPlayerIndex, true);
  }, [players, gameState.currentPlayerIndex]);

  // Update player move stats
  const updatePlayerMoveStats = useCallback((playerId: PlayerId) => {
    // This would typically update the player's total moves
    // For now, we'll just log it since we'd need to modify the game state
    console.log(`Player ${playerId} made a move`);
  }, []);

  // Get game winner
  const getGameWinner = useCallback(() => {
    const activePlayers = players.filter((p) => !p.isEliminated);
    if (activePlayers.length === 1) {
      return activePlayers[0];
    }
    return null;
  }, [players]);

  // Get player by ID
  const getPlayerById = useCallback(
    (playerId: PlayerId) => {
      return players.find((p) => p.id === playerId);
    },
    [players]
  );

  // Check if player name is available
  const isPlayerNameAvailable = useCallback(
    (name: string, excludePlayerId?: PlayerId) => {
      return !players.some(
        (p) =>
          p.name.toLowerCase() === name.toLowerCase() &&
          p.id !== excludePlayerId
      );
    },
    [players]
  );

  // Get player turn order
  const getPlayerTurnOrder = useCallback(() => {
    const activePlayers = players.filter((p) => !p.isEliminated);
    const currentIndex = activePlayers.findIndex(
      (p) => p.id === currentPlayer?.id
    );

    if (currentIndex === -1) return activePlayers;

    // Reorder so current player is first
    return [
      ...activePlayers.slice(currentIndex),
      ...activePlayers.slice(0, currentIndex),
    ];
  }, [players, currentPlayer]);

  return {
    // Player setup
    setupPlayers,
    validatePlayer,

    // Player info
    getCurrentPlayerStats,
    getPlayerRankings,
    getPlayerById,
    getGameWinner,

    // Turn management
    getNextPlayerInTurn,
    getPlayerTurnOrder,

    // Game state checks
    checkPlayerElimination,
    isPlayerNameAvailable,

    // Actions
    updatePlayerMoveStats,
  };
};
