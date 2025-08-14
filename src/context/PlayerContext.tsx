/**
 * Player Context
 *
 * Manages player-specific calculations, statistics, and player state.
 * Handles player creation, orb counting, active player detection.
 *
 * @fileoverview Extracted from GameContext.tsx to separate player management
 * from core game state and board operations.
 */

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import type { Player } from '../types';
import { PLAYER_COLORS } from '../utils/constants';
import { countPlayerOrbs } from '../utils/boardAnalysis';
import { useGameState } from './GameStateContext';

export interface PlayerContextType {
  // Player data
  currentPlayer: Player | null;
  players: Player[];
  activePlayers: Player[];

  // Player utilities
  getPlayerOrbCount: (playerId: string) => number;
  getPlayerByIndex: (index: number) => Player | null;
  isPlayerActive: (playerId: string) => boolean;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

interface PlayerProviderProps {
  children: React.ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  const { gameState } = useGameState();

  // Centralized orb counting function
  const getPlayerOrbCount = useCallback(
    (playerId: string): number => {
      return countPlayerOrbs(gameState.board, playerId);
    },
    [gameState.board]
  );

  // Create player objects from player IDs
  const players: Player[] = useMemo(() => {
    return gameState.players.map((playerId, index) => {
      // Use player ID to determine original position, not current array position
      const playerNumber = parseInt(playerId.replace('player', ''));
      const config = gameState.settings.playerConfigs?.[playerNumber - 1];
      const colorIndex = (playerNumber - 1) % PLAYER_COLORS.length;

      const calculatedOrbCount = getPlayerOrbCount(playerId);
      const movesPlayed =
        gameState.gameStats?.playerStats[playerId]?.movesPlayed || 0;

      const player = {
        id: playerId,
        name:
          gameState.settings.playerNames[playerNumber - 1] ||
          `Player ${playerNumber}`,
        color: PLAYER_COLORS[colorIndex],
        isActive: true,
        isEliminated: false,
        orbCount: calculatedOrbCount, // Calculate actual orb count
        totalMoves: movesPlayed,
        type: config?.type || 'human',
        aiConfig: config?.aiConfig,
      };

      // Debug logging for player creation
      if (config) {
        console.log(`👤 Created player ${index + 1}:`, {
          name: player.name,
          type: player.type,
          aiConfig: player.aiConfig,
          config: config,
        });
      }

      return player;
    });
  }, [
    gameState.players,
    gameState.settings,
    gameState.gameStats,
    getPlayerOrbCount,
  ]);

  // Get current player
  const currentPlayer = players[gameState.currentPlayerIndex] || null;

  // Get active players (those with orbs on the board)
  const activePlayers = useMemo(() => {
    return players.filter((player) => {
      // Use centralized orb counting utility
      const orbCount = getPlayerOrbCount(player.id);
      return orbCount > 0 || gameState.moveCount === 0;
    });
  }, [players, gameState.moveCount, getPlayerOrbCount]);

  // Helper to get player by index
  const getPlayerByIndex = (index: number): Player | null => {
    return players[index] || null;
  };

  // Helper to check if player is active
  const isPlayerActive = (playerId: string): boolean => {
    const orbCount = getPlayerOrbCount(playerId);
    return orbCount > 0 || gameState.moveCount === 0;
  };

  const contextValue: PlayerContextType = {
    currentPlayer,
    players,
    activePlayers,
    getPlayerOrbCount,
    getPlayerByIndex,
    isPlayerActive,
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {children}
    </PlayerContext.Provider>
  );
};

/**
 * Hook to use player context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
