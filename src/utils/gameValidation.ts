import type { GameBoard, GameState, PlayerId } from '../types';

/**
 * Identifies all players who currently have orbs on the board.
 *
 * A player is considered "active" if they own at least one cell with orbs.
 * This is used for game end detection - when only one or zero active players
 * remain, the game ends.
 *
 * @param board - The current game board state to analyze
 * @returns Array of PlayerId strings for players who have orbs on the board
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * let newBoard = placeOrb(board, 0, 0, 'player1');
 * newBoard = placeOrb(newBoard, 1, 1, 'player2');
 * newBoard = placeOrb(newBoard, 2, 2, 'player1');
 *
 * const activePlayers = getActivePlayers(newBoard);
 * console.log(activePlayers.length); // 2
 * console.log(activePlayers.includes('player1')); // true
 * console.log(activePlayers.includes('player2')); // true
 * console.log(activePlayers.includes('player3')); // false
 * ```
 */
export const getActivePlayers = (board: GameBoard): PlayerId[] => {
  const activePlayers = new Set<PlayerId>();

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.playerId && cell.orbCount > 0) {
        activePlayers.add(cell.playerId);
      }
    }
  }

  return Array.from(activePlayers);
};

/**
 * Determines if the game has ended and identifies the winner.
 *
 * Game end conditions:
 * 1. At least one full round must be completed (each player had at least one turn)
 * 2. Only one or zero active players remain on the board
 *
 * The game does not end immediately after the first moves to allow all players
 * a fair opportunity to establish a presence on the board.
 *
 * @param gameState - The current game state to evaluate
 * @returns Object containing isGameOver boolean and winner PlayerId (or null)
 *
 * @example
 * ```typescript
 * // Game just started - no winner yet
 * let state = createInitialGameState();
 * state.players = ['player1', 'player2'];
 * state.moveCount = 1;
 *
 * let result = checkGameOver(state);
 * console.log(result.isGameOver); // false (too few moves)
 *
 * // After some moves, only player1 has orbs
 * state.moveCount = 10;
 * state.board = boardWithOnlyPlayer1Orbs;
 *
 * result = checkGameOver(state);
 * console.log(result.isGameOver); // true
 * console.log(result.winner); // 'player1'
 * ```
 */
export const checkGameOver = (
  gameState: GameState
): {
  isGameOver: boolean;
  winner: PlayerId | null;
} => {
  // Game is not over if still in setup phase or no moves have been made
  if (gameState.moveCount === 0) {
    return { isGameOver: false, winner: null };
  }

  // Ensure all players have had at least one complete round before game can end
  // Each player must have had the opportunity to place at least one orb
  const minMovesRequired = gameState.players.length;
  if (gameState.moveCount <= minMovesRequired) {
    return { isGameOver: false, winner: null };
  }

  const activePlayers = getActivePlayers(gameState.board);

  if (activePlayers.length <= 1) {
    return {
      isGameOver: true,
      winner: activePlayers.length === 1 ? activePlayers[0] : null,
    };
  }

  return { isGameOver: false, winner: null };
};

/**
 * Validates game board dimensions
 */
export const validateBoardDimensions = (
  rows: number,
  cols: number
): { valid: boolean; error?: string } => {
  if (rows < 3 || rows > 20) {
    return { valid: false, error: 'Board rows must be between 3 and 20' };
  }

  if (cols < 3 || cols > 20) {
    return { valid: false, error: 'Board columns must be between 3 and 20' };
  }

  return { valid: true };
};

/**
 * Validates player ID format
 */
export const validatePlayerId = (playerId: PlayerId): boolean => {
  return typeof playerId === 'string' && /^player[1-9]\d*$/.test(playerId);
};

/**
 * Validates cell coordinates
 */
export const validateCellCoordinates = (
  row: number,
  col: number,
  board: GameBoard
): { valid: boolean; error?: string } => {
  if (row < 0 || row >= board.rows) {
    return {
      valid: false,
      error: `Row ${row} is out of bounds (0-${board.rows - 1})`,
    };
  }

  if (col < 0 || col >= board.cols) {
    return {
      valid: false,
      error: `Column ${col} is out of bounds (0-${board.cols - 1})`,
    };
  }

  return { valid: true };
};

/**
 * Validates game state integrity
 */
export const validateGameState = (
  gameState: GameState
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check if game state has required properties
  if (!gameState.board) {
    errors.push('Game state missing board');
  }

  if (!gameState.players || gameState.players.length === 0) {
    errors.push('Game state missing players');
  }

  if (gameState.currentPlayerIndex === undefined) {
    errors.push('Game state missing current player index');
  }

  // Validate board dimensions
  if (gameState.board) {
    const boardValidation = validateBoardDimensions(
      gameState.board.rows,
      gameState.board.cols
    );
    if (!boardValidation.valid && boardValidation.error) {
      errors.push(boardValidation.error);
    }
  }

  // Validate current player index
  if (gameState.players && gameState.currentPlayerIndex !== undefined) {
    if (
      gameState.currentPlayerIndex < 0 ||
      gameState.currentPlayerIndex >= gameState.players.length
    ) {
      errors.push('Current player index is out of bounds');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
