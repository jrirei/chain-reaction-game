import type { GameBoard, PlayerId } from '../types';
import { isValidMove, placeOrb, getAdjacentCells } from './boardOperations';
import { processChainReactions } from './explosionLogic';

/**
 * Calculates the optimal move for an AI player using strategic heuristics.
 *
 * The AI evaluates all legal moves and scores them based on multiple factors:
 * - Building up cells closer to critical mass (higher score)
 * - Triggering immediate explosions (bonus points)
 * - Chain reaction potential (extra bonus for longer chains)
 * - Position advantages (corners and edges have lower critical mass)
 * - Capturing opponent cells through explosions
 *
 * Returns the highest-scoring move, or null if no valid moves exist.
 *
 * @param board - The current game board state to analyze
 * @param playerId - The AI player's ID who is making the move
 * @returns Move object with row, col, and playerId, or null if no valid moves
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(6, 9);
 * let newBoard = placeOrb(board, 0, 0, 'player1'); // Set up some pieces
 *
 * const aiMove = calculateAIMove(newBoard, 'player2');
 * if (aiMove) {
 *   console.log(`AI chooses: (${aiMove.row}, ${aiMove.col})`);
 *   newBoard = placeOrb(newBoard, aiMove.row, aiMove.col, aiMove.playerId);
 * } else {
 *   console.log('No valid moves available');
 * }
 * ```
 */
export const calculateAIMove = (
  board: GameBoard,
  playerId: PlayerId
): { row: number; col: number; playerId: PlayerId } | null => {
  const validMoves: Array<{ row: number; col: number; score: number }> = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (isValidMove(board, row, col, playerId)) {
        const score = evaluateMove(board, row, col, playerId);
        validMoves.push({ row, col, score });
      }
    }
  }

  if (validMoves.length === 0) {
    return null;
  }

  // Sort by score (descending) and return the best move
  validMoves.sort((a, b) => b.score - a.score);
  return { row: validMoves[0].row, col: validMoves[0].col, playerId };
};

/**
 * Evaluates the strategic value of a potential move using multiple heuristics.
 *
 * Scoring factors (in order of priority):
 * 1. Base move value: +1 point
 * 2. Critical mass progress: +5 points per ratio of (orbs/criticalMass)
 * 3. Immediate explosion: +10 points
 * 4. Chain reaction length: +3 points per step in chain
 * 5. Position bonuses: +3 for corners, +2 for edges
 * 6. Enemy cell capture: +4 points per adjacent enemy cell
 * 7. Explosion without benefit: -5 points (penalty)
 *
 * @param board - The current board state
 * @param row - Row coordinate of the potential move
 * @param col - Column coordinate of the potential move
 * @param playerId - The AI player making the move
 * @returns Numeric score representing move quality (higher = better)
 *
 * @internal This function is used internally by calculateAIMove
 */
function evaluateMove(
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): number {
  let score = 0;

  // Simulate the move
  const newBoard = placeOrb(board, row, col, playerId);
  const cell = newBoard.cells[row][col];

  // Base score for the move
  score += 1;

  // Bonus for building up cells closer to critical mass
  const criticalMassProgress = cell.orbCount / cell.criticalMass;
  score += criticalMassProgress * 5;

  // Bonus if this move causes an immediate explosion
  if (cell.orbCount >= cell.criticalMass) {
    score += 10;

    // Check if explosion would benefit the player
    const { explosionSteps } = processChainReactions(newBoard);
    if (explosionSteps.length > 0) {
      // Bonus for chain reactions
      score += explosionSteps.length * 3;
    } else {
      score -= 5; // Small penalty for exploding without strategic benefit
    }
  }

  // Bonus for corner and edge positions (they have lower critical mass)
  if (cell.criticalMass === 2) {
    score += 3; // Corner bonus
  } else if (cell.criticalMass === 3) {
    score += 2; // Edge bonus
  }

  // Bonus for moves that threaten opponent positions
  const adjacentCells = getAdjacentCells(board, row, col);
  for (const { row: adjRow, col: adjCol } of adjacentCells) {
    const adjCell = board.cells[adjRow][adjCol];
    if (adjCell.playerId && adjCell.playerId !== playerId) {
      // Bonus if explosion captures enemy cells
      score += 4;
    }
  }

  return score;
}
