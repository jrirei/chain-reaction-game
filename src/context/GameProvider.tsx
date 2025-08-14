/**
 * Combined Game Provider
 *
 * Provides all game-related contexts in the proper hierarchy.
 * Replaces the monolithic GameContext with focused, separated contexts.
 *
 * @fileoverview Root provider that combines GameStateContext, PlayerContext,
 * and BoardContext for better separation of concerns and improved maintainability.
 */

import React from 'react';
import { GameStateProvider, useGameState } from './GameStateContext';
import { PlayerProvider, usePlayer } from './PlayerContext';
import { BoardProvider, useBoard } from './BoardContext';

interface GameProviderProps {
  children: React.ReactNode;
}

/**
 * Root game provider that wraps all game-related contexts
 *
 * Context hierarchy:
 * 1. GameStateContext - Core state and game control
 * 2. PlayerContext - Player management (depends on GameState)
 * 3. BoardContext - Board operations (depends on GameState and Player)
 *
 * @example
 * ```tsx
 * <GameProvider>
 *   <GameSetup />
 *   <GameBoard />
 *   <PlayerList />
 * </GameProvider>
 * ```
 */
export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  return (
    <GameStateProvider>
      <PlayerProvider>
        <BoardProvider>{children}</BoardProvider>
      </PlayerProvider>
    </GameStateProvider>
  );
};

/**
 * Backward compatibility exports
 *
 * Re-export all hooks for easy migration from the old GameContext.
 * Components can import these directly without changing their import statements.
 */
// eslint-disable-next-line react-refresh/only-export-components
export { useGameState } from './GameStateContext';
// eslint-disable-next-line react-refresh/only-export-components
export { usePlayer } from './PlayerContext';
// eslint-disable-next-line react-refresh/only-export-components
export { useBoard } from './BoardContext';

/**
 * Legacy GameContext interface for backward compatibility
 *
 * This interface combines all the focused contexts into a single type
 * matching the original GameContextType. Use the individual hooks instead
 * for better performance and clearer dependencies.
 *
 * @deprecated Use individual context hooks instead
 */
export interface LegacyGameContextType {
  // From GameStateContext
  gameState: ReturnType<typeof useGameState>['gameState'];
  dispatch: ReturnType<typeof useGameState>['dispatch'];
  isGameActive: ReturnType<typeof useGameState>['isGameActive'];
  initializeGame: ReturnType<typeof useGameState>['initializeGame'];
  startGame: ReturnType<typeof useGameState>['startGame'];
  resetGame: ReturnType<typeof useGameState>['resetGame'];
  pauseGame: ReturnType<typeof useGameState>['pauseGame'];
  resumeGame: ReturnType<typeof useGameState>['resumeGame'];

  // From PlayerContext
  currentPlayer: ReturnType<typeof usePlayer>['currentPlayer'];
  players: ReturnType<typeof usePlayer>['players'];
  activePlayers: ReturnType<typeof usePlayer>['activePlayers'];

  // From BoardContext
  canMakeMove: ReturnType<typeof useBoard>['canMakeMove'];
}

/**
 * Legacy hook that combines all contexts
 *
 * @deprecated Use individual context hooks instead for better performance
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useLegacyGameContext = (): LegacyGameContextType => {
  const gameState = useGameState();
  const player = usePlayer();
  const board = useBoard();

  return {
    // GameState
    gameState: gameState.gameState,
    dispatch: gameState.dispatch,
    isGameActive: gameState.isGameActive,
    initializeGame: gameState.initializeGame,
    startGame: gameState.startGame,
    resetGame: gameState.resetGame,
    pauseGame: gameState.pauseGame,
    resumeGame: gameState.resumeGame,

    // Player
    currentPlayer: player.currentPlayer,
    players: player.players,
    activePlayers: player.activePlayers,

    // Board
    canMakeMove: board.canMakeMove,
  };
};
