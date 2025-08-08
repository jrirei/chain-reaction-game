import type { Cell, GameBoard, PlayerId } from '../types';
import { getCriticalMass, generateCellId } from './helpers';
import { placeOrbImmutable } from './immutableUtils';
import {
  ValidationError,
  validateBoardDimensionsStrict,
  validateBoardCoordinates,
  validatePlayerIdStrict,
  safeExecute,
  err,
} from './errorHandling';
import type { Result } from './errorHandling';

/**
 * Creates an empty game board with the specified dimensions.
 *
 * Each cell is initialized with:
 * - Zero orbs
 * - No owner (null playerId)
 * - Appropriate critical mass based on position (corner=2, edge=3, interior=4)
 * - No explosion state
 *
 * @param rows - Number of rows for the board (minimum 3, maximum 20)
 * @param cols - Number of columns for the board (minimum 3, maximum 20)
 * @returns A new GameBoard with empty cells
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(6, 9);
 * console.log(board.rows); // 6
 * console.log(board.cols); // 9
 * console.log(board.cells[0][0].criticalMass); // 2 (corner cell)
 * ```
 */
export const createEmptyBoard = (rows: number, cols: number): GameBoard => {
  const cells: Cell[][] = [];

  for (let row = 0; row < rows; row++) {
    cells[row] = [];
    for (let col = 0; col < cols; col++) {
      cells[row][col] = {
        id: generateCellId(row, col),
        row,
        col,
        orbCount: 0,
        playerId: null,
        criticalMass: getCriticalMass(row, col, rows, cols),
        isExploding: false,
        animationDelay: 0,
      };
    }
  }

  return {
    cells,
    rows,
    cols,
  };
};

/**
 * Safe version of createEmptyBoard that validates input and handles errors.
 *
 * @param rows - Number of rows for the board
 * @param cols - Number of columns for the board
 * @returns Result containing the board or validation error
 */
export const createEmptyBoardSafe = (
  rows: number,
  cols: number
): Result<GameBoard> => {
  const validation = validateBoardDimensionsStrict(rows, cols);
  if (!validation.success) {
    return err(validation.error);
  }

  return safeExecute(
    () => createEmptyBoard(rows, cols),
    'Failed to create empty board'
  );
};

/**
 * Creates a deep copy of a game board using shallow cloning with spread operators.
 *
 * This creates a new board instance with new cell arrays, but preserves
 * structural sharing for performance. Each cell is shallow cloned to prevent
 * mutations from affecting the original board.
 *
 * @param board - The game board to clone
 * @returns A new GameBoard that is a deep copy of the input board
 *
 * @example
 * ```typescript
 * const original = createEmptyBoard(3, 3);
 * const copy = deepCloneBoard(original);
 *
 * copy.cells[0][0].orbCount = 5;
 * console.log(original.cells[0][0].orbCount); // Still 0
 * console.log(copy.cells[0][0].orbCount); // 5
 * ```
 */
export const deepCloneBoard = (board: GameBoard): GameBoard => {
  return {
    ...board,
    cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
};

/**
 * Validates whether a move is legal for the specified player.
 *
 * A move is valid if:
 * 1. The coordinates are within board boundaries
 * 2. The target cell is either empty OR already owned by the same player
 *
 * Players can only place orbs in empty cells or cells they already own.
 * They cannot place orbs in cells owned by other players.
 *
 * @param board - The current game board state
 * @param row - The row coordinate (0-indexed)
 * @param col - The column coordinate (0-indexed)
 * @param playerId - The ID of the player attempting the move
 * @returns True if the move is valid, false otherwise
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(6, 9);
 *
 * // Valid moves
 * console.log(isValidMove(board, 0, 0, 'player1')); // true (empty cell)
 *
 * // Invalid moves
 * console.log(isValidMove(board, -1, 0, 'player1')); // false (out of bounds)
 * console.log(isValidMove(board, 0, 10, 'player1')); // false (out of bounds)
 *
 * // After player1 places an orb
 * const newBoard = placeOrb(board, 0, 0, 'player1');
 * console.log(isValidMove(newBoard, 0, 0, 'player1')); // true (owns cell)
 * console.log(isValidMove(newBoard, 0, 0, 'player2')); // false (owned by other player)
 * ```
 */
export const isValidMove = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): boolean => {
  // Check bounds
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return false;
  }

  const cell = board.cells[row][col];

  // Cell must either be empty or belong to the same player
  return cell.orbCount === 0 || cell.playerId === playerId;
};

/**
 * Places an orb in the specified cell using immutable updates.
 *
 * This function:
 * 1. Increments the orb count in the target cell
 * 2. Sets the cell's owner to the specified player
 * 3. Returns a new board instance (original board is unchanged)
 *
 * Uses Immer under the hood for efficient immutable updates with structural sharing.
 *
 * @param board - The current game board state
 * @param row - The row coordinate where to place the orb (0-indexed)
 * @param col - The column coordinate where to place the orb (0-indexed)
 * @param playerId - The ID of the player placing the orb
 * @returns A new GameBoard with the orb placed
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * const newBoard = placeOrb(board, 1, 1, 'player1');
 *
 * // Original board unchanged
 * console.log(board.cells[1][1].orbCount); // 0
 * console.log(board.cells[1][1].playerId); // null
 *
 * // New board has the orb
 * console.log(newBoard.cells[1][1].orbCount); // 1
 * console.log(newBoard.cells[1][1].playerId); // 'player1'
 * ```
 */
export const placeOrb = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): GameBoard => {
  return placeOrbImmutable(board, row, col, playerId);
};

/**
 * Safe version of placeOrb that validates input and handles errors.
 *
 * @param board - The current game board state
 * @param row - Row coordinate where to place the orb
 * @param col - Column coordinate where to place the orb
 * @param playerId - The ID of the player placing the orb
 * @returns Result containing the new board or validation error
 */
export const placeOrbSafe = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): Result<GameBoard> => {
  // Validate coordinates
  const coordValidation = validateBoardCoordinates(row, col, board);
  if (!coordValidation.success) {
    return err(coordValidation.error);
  }

  // Validate player ID
  const playerValidation = validatePlayerIdStrict(playerId);
  if (!playerValidation.success) {
    return err(playerValidation.error);
  }

  // Check if move is valid (cell is empty or owned by same player)
  const cell = board.cells[row][col];
  if (cell.orbCount > 0 && cell.playerId !== playerId) {
    return err(
      new ValidationError(
        `Cell (${row}, ${col}) is owned by ${cell.playerId}, cannot place orb for ${playerId}`,
        { row, col, cellOwner: cell.playerId, playerId }
      )
    );
  }

  return safeExecute(
    () => placeOrbImmutable(board, row, col, playerId),
    'Failed to place orb'
  );
};

/**
 * Gets all adjacent cells for a given position on the board.
 *
 * Returns cells that are directly adjacent (up, down, left, right) to the
 * specified position. Diagonal cells are not considered adjacent.
 * Only includes cells that are within the board boundaries.
 *
 * The maximum number of adjacent cells depends on position:
 * - Corner cells: 2 adjacent cells
 * - Edge cells: 3 adjacent cells
 * - Interior cells: 4 adjacent cells
 *
 * @param board - The game board to check
 * @param row - The row coordinate of the center cell (0-indexed)
 * @param col - The column coordinate of the center cell (0-indexed)
 * @returns Array of adjacent cell coordinates, each with row and col properties
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(5, 5);
 *
 * // Corner cell (top-left)
 * const cornerAdjacent = getAdjacentCells(board, 0, 0);
 * console.log(cornerAdjacent.length); // 2
 * console.log(cornerAdjacent); // [{ row: 0, col: 1 }, { row: 1, col: 0 }]
 *
 * // Interior cell
 * const interiorAdjacent = getAdjacentCells(board, 2, 2);
 * console.log(interiorAdjacent.length); // 4
 * console.log(interiorAdjacent); // [{ row: 1, col: 2 }, { row: 3, col: 2 }, ...]
 * ```
 */
export const getAdjacentCells = (
  board: GameBoard,
  row: number,
  col: number
): Array<{ row: number; col: number }> => {
  const adjacent = [];
  const directions = [
    [-1, 0], // up
    [1, 0], // down
    [0, -1], // left
    [0, 1], // right
  ];

  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    if (
      newRow >= 0 &&
      newRow < board.rows &&
      newCol >= 0 &&
      newCol < board.cols
    ) {
      adjacent.push({ row: newRow, col: newCol });
    }
  }

  return adjacent;
};

/**
 * Counts the total number of orbs owned by a specific player on the board.
 *
 * Iterates through all cells on the board and sums up the orb count
 * for cells that belong to the specified player. Cells owned by other
 * players or empty cells are ignored.
 *
 * @param board - The game board to count orbs on
 * @param playerId - The ID of the player whose orbs to count
 * @returns The total number of orbs owned by the player
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * let newBoard = placeOrb(board, 0, 0, 'player1');
 * newBoard = placeOrb(newBoard, 0, 0, 'player1'); // 2 orbs at (0,0)
 * newBoard = placeOrb(newBoard, 1, 1, 'player1'); // 1 orb at (1,1)
 * newBoard = placeOrb(newBoard, 2, 2, 'player2'); // 1 orb for player2
 *
 * console.log(countPlayerOrbs(newBoard, 'player1')); // 3
 * console.log(countPlayerOrbs(newBoard, 'player2')); // 1
 * console.log(countPlayerOrbs(newBoard, 'player3')); // 0
 * ```
 */
export const countPlayerOrbs = (
  board: GameBoard,
  playerId: PlayerId
): number => {
  let count = 0;
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.playerId === playerId) {
        count += cell.orbCount;
      }
    }
  }
  return count;
};
