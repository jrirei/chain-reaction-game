import { CELL_TYPES, CRITICAL_MASS } from './constants';

/**
 * Determines the type of a cell based on its position on the game board.
 *
 * Cell types affect the critical mass (number of orbs needed to explode):
 * - Corner cells: Located at board corners, have 2 adjacent cells
 * - Edge cells: Located on board edges (not corners), have 3 adjacent cells
 * - Interior cells: Located inside the board, have 4 adjacent cells
 *
 * @param row - The row coordinate of the cell (0-indexed)
 * @param col - The column coordinate of the cell (0-indexed)
 * @param rows - Total number of rows on the board
 * @param cols - Total number of columns on the board
 * @returns The cell type as a key from CRITICAL_MASS constant
 *
 * @example
 * ```typescript
 * // On a 6x9 board:
 * console.log(getCellType(0, 0, 6, 9)); // 'corner'
 * console.log(getCellType(0, 4, 6, 9)); // 'edge'
 * console.log(getCellType(2, 3, 6, 9)); // 'interior'
 * ```
 */
export const getCellType = (
  row: number,
  col: number,
  rows: number,
  cols: number
): keyof typeof CRITICAL_MASS => {
  const isCorner =
    (row === 0 && col === 0) ||
    (row === 0 && col === cols - 1) ||
    (row === rows - 1 && col === 0) ||
    (row === rows - 1 && col === cols - 1);

  const isEdge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;

  if (isCorner) return CELL_TYPES.CORNER;
  if (isEdge) return CELL_TYPES.EDGE;
  return CELL_TYPES.INTERIOR;
};

/**
 * Calculates the critical mass for a cell based on its position.
 *
 * Critical mass is the number of orbs needed in a cell before it explodes:
 * - Corner cells: 2 orbs (have 2 adjacent cells)
 * - Edge cells: 3 orbs (have 3 adjacent cells)
 * - Interior cells: 4 orbs (have 4 adjacent cells)
 *
 * When a cell reaches or exceeds its critical mass, it explodes and distributes
 * its orbs to all adjacent cells.
 *
 * @param row - The row coordinate of the cell (0-indexed)
 * @param col - The column coordinate of the cell (0-indexed)
 * @param rows - Total number of rows on the board
 * @param cols - Total number of columns on the board
 * @returns The critical mass value for the cell
 *
 * @example
 * ```typescript
 * // On a 6x9 board:
 * console.log(getCriticalMass(0, 0, 6, 9)); // 2 (corner)
 * console.log(getCriticalMass(0, 4, 6, 9)); // 3 (edge)
 * console.log(getCriticalMass(2, 3, 6, 9)); // 4 (interior)
 * ```
 */
export const getCriticalMass = (
  row: number,
  col: number,
  rows: number,
  cols: number
): number => {
  const cellType = getCellType(row, col, rows, cols);
  return CRITICAL_MASS[cellType];
};

/**
 * Generates a unique identifier string for a cell based on its coordinates.
 *
 * The generated ID follows the format "cell-{row}-{col}" and is used for:
 * - React component keys for efficient rendering
 * - CSS animation targeting
 * - Debugging and logging
 * - Cell lookup operations
 *
 * @param row - The row coordinate of the cell (0-indexed)
 * @param col - The column coordinate of the cell (0-indexed)
 * @returns A unique string identifier for the cell
 *
 * @example
 * ```typescript
 * console.log(generateCellId(0, 0)); // "cell-0-0"
 * console.log(generateCellId(2, 5)); // "cell-2-5"
 * console.log(generateCellId(10, 3)); // "cell-10-3"
 * ```
 */
export const generateCellId = (row: number, col: number): string => {
  return `cell-${row}-${col}`;
};
