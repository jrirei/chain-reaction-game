import type { GameBoard, GameState, PlayerId, Cell } from '../types';
import { GameStatus } from '../types';

export interface MoveValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface MoveContext {
  gameState: GameState;
  currentPlayerId: PlayerId;
  targetRow: number;
  targetCol: number;
}

/**
 * Comprehensive move validation with detailed error reporting
 */
export const validateMove = (context: MoveContext): MoveValidationResult => {
  const { gameState, currentPlayerId, targetRow, targetCol } = context;
  const { board, gameStatus, isAnimating, players, currentPlayerIndex } =
    gameState;

  // Check if game is in a valid state for moves
  if (gameStatus !== GameStatus.PLAYING) {
    return {
      isValid: false,
      error: `Cannot make moves when game status is: ${gameStatus}`,
    };
  }

  // Check if animations are in progress
  if (isAnimating) {
    return {
      isValid: false,
      error: 'Cannot make moves while animations are in progress',
    };
  }

  // Validate current player
  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer || currentPlayer !== currentPlayerId) {
    return {
      isValid: false,
      error: 'It is not your turn',
    };
  }

  // Check if player is eliminated - only after all players have had at least one complete round
  const minMovesForElimination = gameState.players.length;
  if (gameState.moveCount > minMovesForElimination) {
    const playerHasOrbs = board.cells.some((row) =>
      row.some((cell) => cell.playerId === currentPlayerId && cell.orbCount > 0)
    );

    if (!playerHasOrbs) {
      return {
        isValid: false,
        error: 'Player has been eliminated',
      };
    }
  }

  // Validate cell coordinates
  if (
    targetRow < 0 ||
    targetRow >= board.rows ||
    targetCol < 0 ||
    targetCol >= board.cols
  ) {
    return {
      isValid: false,
      error: 'Target cell is outside the game board',
    };
  }

  const targetCell = board.cells[targetRow][targetCol];

  // Check cell ownership rules
  if (targetCell.playerId !== null && targetCell.playerId !== currentPlayerId) {
    return {
      isValid: false,
      error: "Cannot place orb in opponent's cell",
    };
  }

  // All validations passed
  const warnings: string[] = [];

  // Add warnings for strategic considerations
  if (targetCell.orbCount + 1 >= targetCell.criticalMass) {
    warnings.push('This move will cause an explosion');
  }

  // Check if this is the first move
  if (gameState.moveCount === 0) {
    warnings.push('First move of the game');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Quick validation for UI interactions (lighter weight)
 */
export const isValidMoveQuick = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId,
  gameStatus: string,
  isAnimating: boolean
): boolean => {
  // Basic checks
  if (gameStatus !== GameStatus.PLAYING || isAnimating) {
    return false;
  }

  // Bounds check
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return false;
  }

  const cell = board.cells[row][col];

  // Ownership check
  return cell.playerId === null || cell.playerId === playerId;
};

/**
 * Get all valid moves for a player
 */
export const getValidMoves = (
  board: GameBoard,
  playerId: PlayerId
): Array<{ row: number; col: number; cell: Cell }> => {
  const validMoves: Array<{ row: number; col: number; cell: Cell }> = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];

      if (cell.playerId === null || cell.playerId === playerId) {
        validMoves.push({ row, col, cell });
      }
    }
  }

  return validMoves;
};

/**
 * Calculate move quality score for AI or suggestions
 */
export const calculateMoveScore = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): number => {
  const cell = board.cells[row][col];
  let score = 0;

  // Base score for cell position
  if (cell.criticalMass === 2)
    score += 15; // Corner cells
  else if (cell.criticalMass === 3)
    score += 10; // Edge cells
  else score += 5; // Interior cells

  // Score for existing orbs
  score += cell.orbCount * 8;

  // Bonus for moves that are close to critical mass but won't explode immediately
  const orbsAfterMove = cell.orbCount + 1;
  if (orbsAfterMove === cell.criticalMass - 1) {
    score += 12; // One away from explosion
  }

  // Penalty for immediate explosions (might not always be desirable)
  if (orbsAfterMove >= cell.criticalMass) {
    // Check if explosion would benefit the player
    const adjacentCells = getAdjacentCellsForScore(board, row, col);
    const enemyCells = adjacentCells.filter(
      (adjCell) => adjCell.playerId && adjCell.playerId !== playerId
    ).length;

    if (enemyCells > 0) {
      score += enemyCells * 20; // Big bonus for capturing enemy cells
    } else {
      score -= 5; // Small penalty for exploding without strategic benefit
    }
  }

  return score;
};

/**
 * Helper function to get adjacent cells for scoring
 */
const getAdjacentCellsForScore = (
  board: GameBoard,
  row: number,
  col: number
): Cell[] => {
  const adjacent: Cell[] = [];
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
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
      adjacent.push(board.cells[newRow][newCol]);
    }
  }

  return adjacent;
};

/**
 * Get best move suggestions for a player
 */
export const getBestMoves = (
  board: GameBoard,
  playerId: PlayerId,
  count: number = 3
): Array<{ row: number; col: number; score: number }> => {
  const validMoves = getValidMoves(board, playerId);

  const scoredMoves = validMoves.map(({ row, col }) => ({
    row,
    col,
    score: calculateMoveScore(board, row, col, playerId),
  }));

  return scoredMoves.sort((a, b) => b.score - a.score).slice(0, count);
};

/**
 * Check if a move would create a winning position
 */
export const isWinningMove = (
  gameState: GameState,
  row: number,
  col: number,
  playerId: PlayerId
): boolean => {
  // This is a simplified check - in reality, you'd need to simulate the full move
  // and chain reactions to determine if it results in a win

  const { board, players } = gameState;
  const otherPlayers = players.filter((p) => p !== playerId);

  // Check if other players have very few orbs left
  let totalEnemyOrbs = 0;
  for (const otherId of otherPlayers) {
    for (const row of board.cells) {
      for (const cell of row) {
        if (cell.playerId === otherId) {
          totalEnemyOrbs += cell.orbCount;
        }
      }
    }
  }

  // If enemies have very few orbs and this is an explosive move, it might be winning
  const targetCell = board.cells[row][col];
  const willExplode = targetCell.orbCount + 1 >= targetCell.criticalMass;

  return totalEnemyOrbs <= 3 && willExplode;
};

/**
 * Validate move with detailed feedback for UI
 */
export const validateMoveWithFeedback = (
  context: MoveContext
): {
  canMove: boolean;
  message: string;
  type: 'success' | 'warning' | 'error';
} => {
  const result = validateMove(context);

  if (!result.isValid) {
    return {
      canMove: false,
      message: result.error || 'Invalid move',
      type: 'error',
    };
  }

  if (result.warnings && result.warnings.length > 0) {
    return {
      canMove: true,
      message: result.warnings[0],
      type: 'warning',
    };
  }

  return {
    canMove: true,
    message: 'Valid move',
    type: 'success',
  };
};
