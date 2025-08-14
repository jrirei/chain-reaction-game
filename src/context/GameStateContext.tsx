/**
 * Game State Context
 *
 * Manages core game state, reducer dispatch, and game control actions.
 * Focused on state management without UI concerns or complex calculations.
 *
 * @fileoverview Extracted from GameContext.tsx to separate state management
 * from player calculations and board analysis responsibilities.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from 'react';
import type { GameState, GameAction } from '../types';
import type { PlayerConfig } from '../types/player';
import { gameReducer, createInitialGameState } from '../utils/gameReducer';
import type { PlayerId } from '../types/player';

export interface GameStateContextType {
  // Core state
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;

  // Game status helpers
  isGameActive: boolean;

  // Game control actions
  initializeGame: (playerCount: number, playerConfigs: PlayerConfig[]) => void;
  startGame: () => void;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
}

const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
);

interface GameStateProviderProps {
  children: React.ReactNode;
}

export const GameStateProvider: React.FC<GameStateProviderProps> = ({
  children,
}) => {
  const [gameState, dispatch] = useReducer(
    gameReducer,
    createInitialGameState()
  );

  // Check if game is in a playable state
  const isGameActive =
    gameState.gameStatus === 'playing' && !gameState.isAnimating;

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

  const contextValue: GameStateContextType = {
    gameState,
    dispatch,
    isGameActive,
    initializeGame,
    startGame,
    resetGame,
    pauseGame,
    resumeGame,
  };

  return (
    <GameStateContext.Provider value={contextValue}>
      {children}
    </GameStateContext.Provider>
  );
};

/**
 * Hook to use game state context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useGameState = (): GameStateContextType => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
