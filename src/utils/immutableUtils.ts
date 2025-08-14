import { produce } from 'immer';
import type { GameBoard, Cell, GameState, PlayerId } from '../types';

/**
 * @fileoverview Immutable utility functions using Immer for safe and efficient state updates.
 *
 * This module provides immutable operations for game board and state management,
 * leveraging Immer's structural sharing for optimal performance. All functions
 * return new instances without mutating the original data.
 *
 * Key benefits:
 * - Structural sharing: unchanged parts are reused between versions
 * - Type safety: mutations look like normal assignments but are immutable
 * - Performance: efficient updates with minimal memory overhead
 * - Debugging: easier to track state changes and implement undo/redo
 *
 * @example
 * ```typescript
 * // Instead of manually cloning and updating:
 * const newBoard = deepCloneBoard(board);
 * newBoard.cells[row][col].orbCount += 1;
 *
 * // Use immutable updates:
 * const newBoard = placeOrbImmutable(board, row, col, playerId);
 * ```
 */

/**
 * Creates a new board with specific cell updates using Immer.
 *
 * This is a low-level utility for applying partial updates to a single cell.
 * For common operations like placing orbs, use higher-level functions instead.
 *
 * @param board - The current game board
 * @param row - Row coordinate of the cell to update (0-indexed)
 * @param col - Column coordinate of the cell to update (0-indexed)
 * @param updates - Partial cell properties to update
 * @returns New GameBoard with the cell updated
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * const newBoard = updateCell(board, 1, 1, {
 *   orbCount: 2,
 *   playerId: 'player1',
 *   isExploding: true
 * });
 * ```
 */
export const updateCell = (
  board: GameBoard,
  row: number,
  col: number,
  updates: Partial<Cell>
): GameBoard => {
  return produce(board, (draft) => {
    Object.assign(draft.cells[row][col], updates);
  });
};

/**
 * Places an orb in a cell using immutable updates.
 *
 * This function atomically:
 * 1. Increments the orb count in the target cell
 * 2. Sets the cell owner to the specified player
 * 3. Returns a new board (original unchanged)
 *
 * Uses Immer's structural sharing for optimal performance.
 *
 * @param board - The current game board
 * @param row - Row coordinate where to place the orb (0-indexed)
 * @param col - Column coordinate where to place the orb (0-indexed)
 * @param playerId - The ID of the player placing the orb
 * @returns New GameBoard with the orb placed
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * const newBoard = placeOrbImmutable(board, 1, 1, 'player1');
 *
 * console.log(board.cells[1][1].orbCount); // 0 (unchanged)
 * console.log(newBoard.cells[1][1].orbCount); // 1 (updated)
 * console.log(newBoard.cells[1][1].playerId); // 'player1'
 * ```
 */
export const placeOrbImmutable = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): GameBoard => {
  return produce(board, (draft) => {
    const cell = draft.cells[row][col];
    cell.orbCount += 1;
    cell.playerId = playerId;
  });
};

/**
 * Processes an explosion immutably
 */
export const processExplosionImmutable = (
  board: GameBoard,
  row: number,
  col: number,
  adjacentPositions: Array<{ row: number; col: number }>
): GameBoard => {
  return produce(board, (draft) => {
    const explodingCell = draft.cells[row][col];
    const playerId = explodingCell.playerId;

    // Remove all orbs from the exploding cell
    explodingCell.orbCount = 0;
    explodingCell.playerId = null;

    // Add orbs to adjacent cells
    adjacentPositions.forEach(({ row: adjRow, col: adjCol }) => {
      const adjacentCell = draft.cells[adjRow][adjCol];
      adjacentCell.orbCount += 1;
      adjacentCell.playerId = playerId;
    });
  });
};

/**
 * Updates multiple cells at once using immutable updates
 */
export const updateMultipleCells = (
  board: GameBoard,
  updates: Array<{
    row: number;
    col: number;
    updates: Partial<Cell>;
  }>
): GameBoard => {
  return produce(board, (draft) => {
    updates.forEach(({ row, col, updates: cellUpdates }) => {
      Object.assign(draft.cells[row][col], cellUpdates);
    });
  });
};

/**
 * Sets explosion state for cells using immutable updates
 */
export const setExplodingCells = (
  board: GameBoard,
  explodingPositions: Array<{ row: number; col: number; delay?: number }>
): GameBoard => {
  return produce(board, (draft) => {
    explodingPositions.forEach(({ row, col, delay = 0 }) => {
      const cell = draft.cells[row][col];
      cell.isExploding = true;
      cell.animationDelay = delay;
    });
  });
};

/**
 * Resets explosion state for all cells using immutable updates
 */
export const resetExplodingState = (board: GameBoard): GameBoard => {
  return produce(board, (draft) => {
    for (let row = 0; row < draft.rows; row++) {
      for (let col = 0; col < draft.cols; col++) {
        const cell = draft.cells[row][col];
        if (cell.isExploding) {
          cell.isExploding = false;
          cell.animationDelay = 0;
        }
      }
    }
  });
};

/**
 * Updates game state immutably
 */
export const updateGameState = <T extends keyof GameState>(
  gameState: GameState,
  updates: Pick<GameState, T>
): GameState => {
  return produce(gameState, (draft) => {
    Object.assign(draft, updates);
  });
};

/**
 * Updates game state with new board immutably
 */
export const updateGameStateWithBoard = (
  gameState: GameState,
  newBoard: GameBoard,
  additionalUpdates?: Partial<GameState>
): GameState => {
  return produce(gameState, (draft) => {
    draft.board = newBoard;
    if (additionalUpdates) {
      Object.assign(draft, additionalUpdates);
    }
  });
};

/**
 * Removes players from game state immutably
 */
export const removePlayers = (
  gameState: GameState,
  playersToRemove: PlayerId[]
): GameState => {
  return produce(gameState, (draft) => {
    draft.players = draft.players.filter(
      (playerId) => !playersToRemove.includes(playerId)
    );
  });
};

/**
 * Updates player statistics immutably
 */
export const updatePlayerStats = (
  gameState: GameState,
  playerId: PlayerId,
  statUpdates: {
    movesPlayed?: number;
    chainReactionsTriggered?: number;
    explosionsCaused?: number;
    longestChainReaction?: number;
  }
): GameState => {
  return produce(gameState, (draft) => {
    if (!draft.gameStats) {
      draft.gameStats = {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      };
    }

    if (!draft.gameStats.playerStats[playerId]) {
      draft.gameStats.playerStats[playerId] = {
        playerId,
        movesPlayed: 0,
        chainReactionsTriggered: 0,
        explosionsCaused: 0,
        longestChainReaction: 0,
        totalThinkingTimeMs: 0,
      };
    }

    const playerStats = draft.gameStats.playerStats[playerId];
    Object.assign(playerStats, statUpdates);
  });
};
