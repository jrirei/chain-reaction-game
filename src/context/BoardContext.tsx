/**
 * Board Context
 *
 * Manages board-related operations, move validation, and board analysis.
 * Handles interaction logic and board state queries.
 *
 * @fileoverview Extracted from GameContext.tsx to separate board operations
 * from game state management and player calculations.
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useGameState } from './GameStateContext';
import { usePlayer } from './PlayerContext';

export interface BoardContextType {
  // Move validation
  canMakeMove: (row: number, col: number) => boolean;

  // Board queries
  isCellEmpty: (row: number, col: number) => boolean;
  getCellOwner: (row: number, col: number) => string | null;
  isCellOwnedByCurrentPlayer: (row: number, col: number) => boolean;

  // Board dimensions
  getBoardDimensions: () => { rows: number; cols: number };
}

const BoardContext = createContext<BoardContextType | undefined>(undefined);

interface BoardProviderProps {
  children: React.ReactNode;
}

export const BoardProvider: React.FC<BoardProviderProps> = ({ children }) => {
  const { gameState, isGameActive } = useGameState();
  const { currentPlayer } = usePlayer();

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

  // Check if a cell is empty
  const isCellEmpty = useCallback(
    (row: number, col: number): boolean => {
      if (
        row < 0 ||
        row >= gameState.board.rows ||
        col < 0 ||
        col >= gameState.board.cols
      ) {
        return false;
      }

      const cell = gameState.board.cells[row][col];
      return cell.playerId === null;
    },
    [gameState.board]
  );

  // Get the owner of a cell
  const getCellOwner = useCallback(
    (row: number, col: number): string | null => {
      if (
        row < 0 ||
        row >= gameState.board.rows ||
        col < 0 ||
        col >= gameState.board.cols
      ) {
        return null;
      }

      const cell = gameState.board.cells[row][col];
      return cell.playerId;
    },
    [gameState.board]
  );

  // Check if a cell is owned by the current player
  const isCellOwnedByCurrentPlayer = useCallback(
    (row: number, col: number): boolean => {
      if (!currentPlayer) return false;

      const owner = getCellOwner(row, col);
      return owner === currentPlayer.id;
    },
    [currentPlayer, getCellOwner]
  );

  // Get board dimensions
  const getBoardDimensions = useCallback(() => {
    return {
      rows: gameState.board.rows,
      cols: gameState.board.cols,
    };
  }, [gameState.board.rows, gameState.board.cols]);

  const contextValue: BoardContextType = {
    canMakeMove,
    isCellEmpty,
    getCellOwner,
    isCellOwnedByCurrentPlayer,
    getBoardDimensions,
  };

  return (
    <BoardContext.Provider value={contextValue}>
      {children}
    </BoardContext.Provider>
  );
};

/**
 * Hook to use board context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};
