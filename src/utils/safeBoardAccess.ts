/**
 * Safe Board Access Utilities
 *
 * Provides bounds-checked access to board cells to prevent
 * array index out of bounds errors.
 *
 * @fileoverview Framework-independent safe board access functions
 */

import type { GameBoard, Cell } from '../types';

/**
 * Safely get a cell from the board with bounds checking
 *
 * @param board - The game board
 * @param row - Row index
 * @param col - Column index
 * @returns Cell if valid coordinates, null otherwise
 */
export function safeGetCell(
  board: GameBoard,
  row: number,
  col: number
): Cell | null {
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return null;
  }
  return board.cells[row][col];
}

/**
 * Check if coordinates are within board bounds
 *
 * @param board - The game board
 * @param row - Row index
 * @param col - Column index
 * @returns True if coordinates are valid
 */
export function isValidCoordinate(
  board: GameBoard,
  row: number,
  col: number
): boolean {
  return row >= 0 && row < board.rows && col >= 0 && col < board.cols;
}

/**
 * Safely set a cell value with bounds checking
 *
 * @param board - The game board (will be mutated)
 * @param row - Row index
 * @param col - Column index
 * @param cell - New cell value
 * @returns True if cell was set, false if coordinates invalid
 */
export function safeSetCell(
  board: GameBoard,
  row: number,
  col: number,
  cell: Cell
): boolean {
  if (!isValidCoordinate(board, row, col)) {
    console.warn(
      `Attempted to set cell at invalid coordinates: (${row}, ${col})`
    );
    return false;
  }
  board.cells[row][col] = cell;
  return true;
}

/**
 * Get all valid adjacent coordinates
 *
 * @param board - The game board
 * @param row - Center row
 * @param col - Center column
 * @returns Array of valid adjacent coordinates
 */
export function getValidAdjacentCoordinates(
  board: GameBoard,
  row: number,
  col: number
): Array<{ row: number; col: number }> {
  const adjacent = [
    { row: row - 1, col },
    { row: row + 1, col },
    { row, col: col - 1 },
    { row, col: col + 1 },
  ];

  return adjacent.filter((coord) =>
    isValidCoordinate(board, coord.row, coord.col)
  );
}

/**
 * Safely get multiple cells by coordinates
 *
 * @param board - The game board
 * @param coordinates - Array of {row, col} coordinates
 * @returns Array of cells (null for invalid coordinates)
 */
export function safeGetCells(
  board: GameBoard,
  coordinates: Array<{ row: number; col: number }>
): Array<Cell | null> {
  return coordinates.map((coord) => safeGetCell(board, coord.row, coord.col));
}

/**
 * Get board cell with default fallback
 *
 * @param board - The game board
 * @param row - Row index
 * @param col - Column index
 * @param defaultCell - Default cell to return if coordinates invalid
 * @returns Cell or default cell
 */
export function getCellWithDefault(
  board: GameBoard,
  row: number,
  col: number,
  defaultCell: Cell
): Cell {
  const cell = safeGetCell(board, row, col);
  return cell !== null ? cell : defaultCell;
}

/**
 * Validate board structure
 *
 * @param board - The game board to validate
 * @returns Validation result with details
 */
export function validateBoardStructure(board: GameBoard): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check board dimensions
  if (board.rows <= 0) {
    errors.push('Board rows must be positive');
  }

  if (board.cols <= 0) {
    errors.push('Board cols must be positive');
  }

  // Check cells array structure
  if (!board.cells || !Array.isArray(board.cells)) {
    errors.push('Board cells must be an array');
  } else {
    // Check row count
    if (board.cells.length !== board.rows) {
      errors.push(
        `Board cells length (${board.cells.length}) does not match rows (${board.rows})`
      );
    }

    // Check each row
    board.cells.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        errors.push(`Row ${rowIndex} is not an array`);
      } else if (row.length !== board.cols) {
        errors.push(
          `Row ${rowIndex} length (${row.length}) does not match cols (${board.cols})`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create empty cell with safe defaults
 *
 * @param row - Row position
 * @param col - Column position
 * @returns Empty cell object
 */
export function createEmptyCell(row: number, col: number): Cell {
  return {
    id: `cell-${row}-${col}`,
    row,
    col,
    orbCount: 0,
    playerId: null,
    criticalMass: 0, // Will be set based on position
    isExploding: false,
    animationDelay: 0,
  };
}
