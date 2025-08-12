/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useReducer, useCallback } from 'react';
import type { GameState, GameAction, Player, PlayerId } from '../types';
import type { PlayerConfig } from '../types/player';
import { gameReducer, createInitialGameState } from '../utils/gameReducer';
import { PLAYER_COLORS } from '../utils/constants';
export interface GameContextType {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  currentPlayer: Player | null;
  players: Player[];
  activePlayers: Player[];
  isGameActive: boolean;
  canMakeMove: (row: number, col: number) => boolean;
  // Helper functions
  initializeGame: (playerCount: number, playerConfigs: PlayerConfig[]) => void;
  startGame: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

export const GameContext = createContext<GameContextType | undefined>(
  undefined
);

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, dispatch] = useReducer(
    gameReducer,
    createInitialGameState()
  );

  // Helper function to calculate orb count for a player
  const calculateOrbCount = (playerId: string): number => {
    let orbCount = 0;
    for (let row = 0; row < gameState.board.rows; row++) {
      for (let col = 0; col < gameState.board.cols; col++) {
        const cell = gameState.board.cells[row][col];
        if (cell.playerId === playerId) {
          orbCount += cell.orbCount;
        }
      }
    }

    return orbCount;
  };

  // Create player objects from player IDs
  const players: Player[] = gameState.players.map((playerId, index) => {
    // Use player ID to determine original position, not current array position
    const playerNumber = parseInt(playerId.replace('player', ''));
    const config = gameState.settings.playerConfigs?.[playerNumber - 1];
    const colorIndex = (playerNumber - 1) % PLAYER_COLORS.length;

    const calculatedOrbCount = calculateOrbCount(playerId);
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

  // Get current player
  const currentPlayer = players[gameState.currentPlayerIndex] || null;

  // Get active players (those with orbs on the board)
  const activePlayers = players.filter((player) => {
    // Count orbs for this player on the board
    let orbCount = 0;
    for (let row = 0; row < gameState.board.rows; row++) {
      for (let col = 0; col < gameState.board.cols; col++) {
        const cell = gameState.board.cells[row][col];
        if (cell.playerId === player.id) {
          orbCount += cell.orbCount;
        }
      }
    }
    return orbCount > 0 || gameState.moveCount === 0;
  });

  // Check if game is in a playable state
  const isGameActive =
    gameState.gameStatus === 'playing' && !gameState.isAnimating;

  // Check if a move can be made at the given position
  const canMakeMove = useCallback(
    (row: number, col: number): boolean => {
      if (!isGameActive || !currentPlayer) return false;

      // Check bounds
      if (
        row < 0 ||
        row >= gameState.board.rows ||
        col < 0 ||
        col >= gameState.board.cols
      ) {
        return false;
      }

      const cell = gameState.board.cells[row][col];

      // Cell must be empty or belong to the current player
      return cell.playerId === null || cell.playerId === currentPlayer.id;
    },
    [isGameActive, currentPlayer, gameState.board]
  );

  // Helper function to initialize a new game with multi-player support
  const initializeGame = useCallback(
    (playerCount: number, playerConfigs: PlayerConfig[]) => {
      console.log('🎮 Initializing game with configs:', playerConfigs);

      // Validate player count
      const validPlayerCount = Math.max(2, Math.min(4, playerCount));

      const playerIds: PlayerId[] = [];
      const names: string[] = [];

      // Generate unique player IDs and collect names
      for (let i = 0; i < validPlayerCount; i++) {
        playerIds.push(`player${i + 1}`); // Simplified ID format
        names.push(playerConfigs[i]?.name || `Player ${i + 1}`);
      }

      const settings = {
        ...gameState.settings,
        playerCount: validPlayerCount,
        playerNames: names,
        playerConfigs: playerConfigs.slice(0, validPlayerCount), // Store AI configs
        maxPlayers: 4,
      };

      console.log('📦 Game settings:', settings);

      dispatch({
        type: 'INITIALIZE_GAME',
        payload: {
          settings,
          players: playerIds,
        },
      });
    },
    [gameState.settings]
  );

  // Helper function to start the game
  const startGame = useCallback(() => {
    dispatch({ type: 'START_GAME' });
  }, []);

  // Helper function to reset the game
  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  // Helper function to pause the game
  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE_GAME' });
  }, []);

  // Helper function to resume the game
  const resumeGame = useCallback(() => {
    dispatch({ type: 'RESUME_GAME' });
  }, []);

  const contextValue: GameContextType = {
    gameState,
    dispatch,
    currentPlayer,
    players,
    activePlayers,
    isGameActive,
    canMakeMove,
    initializeGame,
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
  };

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
};
