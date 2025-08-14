/**
 * Board Iteration Utilities
 *
 * Provides reusable, optimized functions for iterating over game boards
 * to eliminate code duplication and improve maintainability.
 *
 * @fileoverview Consolidates the 45+ instances of board iteration patterns
 * found throughout the codebase into reusable utilities.
 */

import type { GameBoard, Cell } from '../types';

/**
 * Position type for board coordinates
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * Result type for board iteration operations
 */
export interface CellWithPosition {
  cell: Cell;
  row: number;
  col: number;
}

/**
 * Executes a callback for each cell in the board, collecting results
 *
 * @param board - The game board to iterate over
 * @param callback - Function to execute for each cell
 * @returns Array of callback results (excluding null/undefined)
 *
 * @example
 * ```typescript
 * // Count critical mass cells
 * const criticalCells = forEachCell(board, (cell, row, col) =>
 *   cell.orbCount >= getCriticalMass(row, col, board) ? cell : null
 * );
 * ```
 */
export function forEachCell<T>(
  board: GameBoard,
  callback: (cell: Cell, row: number, col: number) => T | null | undefined
): T[] {
  const results: T[] = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const result = callback(board.cells[row][col], row, col);
      if (result !== null && result !== undefined) {
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Finds all cells matching a given predicate
 *
 * @param board - The game board to search
 * @param predicate - Function to test each cell
 * @returns Array of cells that match the predicate
 *
 * @example
 * ```typescript
 * // Find all cells belonging to a specific player
 * const playerCells = findCells(board, (cell) => cell.playerId === playerId);
 *
 * // Find all critical mass cells
 * const criticalCells = findCellsWithPosition(board, (cell, row, col) =>
 *   cell.orbCount >= getCriticalMass(row, col, board)
 * );
 * ```
 */
export function findCells(
  board: GameBoard,
  predicate: (cell: Cell) => boolean
): Cell[] {
  return forEachCell(board, (cell) => (predicate(cell) ? cell : null));
}

/**
 * Finds all cells with their positions matching a given predicate
 *
 * @param board - The game board to search
 * @param predicate - Function to test each cell with position info
 * @returns Array of cells with positions that match the predicate
 */
export function findCellsWithPosition(
  board: GameBoard,
  predicate: (cell: Cell, row: number, col: number) => boolean
): CellWithPosition[] {
  return forEachCell(board, (cell, row, col) =>
    predicate(cell, row, col) ? { cell, row, col } : null
  );
}

/**
 * Counts cells matching a given condition
 *
 * @param board - The game board to analyze
 * @param condition - Function to test each cell
 * @returns Number of cells matching the condition
 *
 * @example
 * ```typescript
 * // Count occupied cells
 * const occupiedCount = countCells(board, (cell) => cell.orbCount > 0);
 *
 * // Count player cells
 * const playerCellCount = countCells(board, (cell) => cell.playerId === playerId);
 * ```
 */
export function countCells(
  board: GameBoard,
  condition: (cell: Cell) => boolean
): number {
  let count = 0;

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (condition(board.cells[row][col])) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Counts cells with position information matching a given condition
 *
 * @param board - The game board to analyze
 * @param condition - Function to test each cell with position info
 * @returns Number of cells matching the condition
 */
export function countCellsWithPosition(
  board: GameBoard,
  condition: (cell: Cell, row: number, col: number) => boolean
): number {
  let count = 0;

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (condition(board.cells[row][col], row, col)) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Checks if any cell matches a given condition
 *
 * @param board - The game board to test
 * @param condition - Function to test each cell
 * @returns True if any cell matches the condition
 *
 * @example
 * ```typescript
 * // Check if any cell is critical
 * const hasCriticalCells = hasCell(board, (cell, row, col) =>
 *   cell.orbCount >= getCriticalMass(row, col, board)
 * );
 * ```
 */
export function hasCell(
  board: GameBoard,
  condition: (cell: Cell, row: number, col: number) => boolean
): boolean {
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (condition(board.cells[row][col], row, col)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Transforms each cell in the board using a mapper function
 *
 * @param board - The game board to transform
 * @param mapper - Function to transform each cell
 * @returns New board with transformed cells
 *
 * @example
 * ```typescript
 * // Clear all orbs from the board
 * const clearedBoard = mapBoard(board, (cell) => ({
 *   ...cell,
 *   orbCount: 0,
 *   playerId: null
 * }));
 * ```
 */
export function mapBoard(
  board: GameBoard,
  mapper: (cell: Cell, row: number, col: number) => Cell
): GameBoard {
  const newCells = board.cells.map((row, rowIndex) =>
    row.map((cell, colIndex) => mapper(cell, rowIndex, colIndex))
  );

  return {
    ...board,
    cells: newCells,
  };
}

/**
 * Reduces all cells in the board to a single value
 *
 * @param board - The game board to reduce
 * @param reducer - Function to accumulate values
 * @param initialValue - Initial accumulator value
 * @returns Reduced value
 *
 * @example
 * ```typescript
 * // Sum all orbs on the board
 * const totalOrbs = reduceBoard(board, (sum, cell) => sum + cell.orbCount, 0);
 *
 * // Find maximum orb count
 * const maxOrbs = reduceBoard(board, (max, cell) => Math.max(max, cell.orbCount), 0);
 * ```
 */
export function reduceBoard<T>(
  board: GameBoard,
  reducer: (accumulator: T, cell: Cell, row: number, col: number) => T,
  initialValue: T
): T {
  let accumulator = initialValue;

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      accumulator = reducer(accumulator, board.cells[row][col], row, col);
    }
  }

  return accumulator;
}

/**
 * Gets all valid adjacent positions for a given cell
 *
 * @param row - Row coordinate
 * @param col - Column coordinate
 * @param board - The game board for boundary checking
 * @returns Array of valid adjacent positions
 *
 * @example
 * ```typescript
 * // Get neighbors of a cell
 * const neighbors = getAdjacentPositions(2, 3, board);
 *
 * // Get neighbor cells
 * const neighborCells = neighbors.map(({ row, col }) => board.cells[row][col]);
 * ```
 */
export function getAdjacentPositions(
  row: number,
  col: number,
  board: GameBoard
): Position[] {
  const positions: Position[] = [];
  const directions = [
    [-1, 0], // up
    [1, 0], // down
    [0, -1], // left
    [0, 1], // right
  ];

  for (const [dRow, dCol] of directions) {
    const newRow = row + dRow;
    const newCol = col + dCol;

    if (
      newRow >= 0 &&
      newRow < board.rows &&
      newCol >= 0 &&
      newCol < board.cols
    ) {
      positions.push({ row: newRow, col: newCol });
    }
  }

  return positions;
}

/**
 * Gets all adjacent cells for a given position
 *
 * @param row - Row coordinate
 * @param col - Column coordinate
 * @param board - The game board
 * @returns Array of adjacent cells
 */
export function getAdjacentCells(
  row: number,
  col: number,
  board: GameBoard
): Cell[] {
  return getAdjacentPositions(row, col, board).map(
    ({ row: r, col: c }) => board.cells[r][c]
  );
}

/**
 * Creates a summary of board statistics for debugging and analysis
 *
 * @param board - The game board to analyze
 * @returns Object with board statistics
 *
 * @example
 * ```typescript
 * const stats = getBoardStats(board);
 * console.log(`Total orbs: ${stats.totalOrbs}, Players: ${stats.playersWithOrbs}`);
 * ```
 */
export function getBoardStats(board: GameBoard): {
  totalCells: number;
  occupiedCells: number;
  totalOrbs: number;
  playersWithOrbs: string[];
  maxOrbs: number;
  avgOrbs: number;
} {
  const totalCells = board.rows * board.cols;
  let occupiedCells = 0;
  let totalOrbs = 0;
  let maxOrbs = 0;
  const playerOrbCounts = new Map<string, number>();

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.orbCount > 0) {
        occupiedCells++;
        totalOrbs += cell.orbCount;
        maxOrbs = Math.max(maxOrbs, cell.orbCount);

        if (cell.playerId) {
          playerOrbCounts.set(
            cell.playerId,
            (playerOrbCounts.get(cell.playerId) || 0) + cell.orbCount
          );
        }
      }
    }
  }

  return {
    totalCells,
    occupiedCells,
    totalOrbs,
    playersWithOrbs: Array.from(playerOrbCounts.keys()),
    maxOrbs,
    avgOrbs: occupiedCells > 0 ? totalOrbs / occupiedCells : 0,
  };
}
