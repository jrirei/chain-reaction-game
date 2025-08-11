/**
 * Simplified GameEngine for AI bots - basic functionality only
 *
 * This version avoids complex dependencies and focuses on the core
 * API needed by AI strategies.
 */

import type { GameState, GameBoard } from '../types/game';
import type { PlayerId } from '../types/player';
import { getValidMoves } from '../utils/moveValidation';
import { GameStatus } from '../types/game';
import type { Move, ChainSimulationResult } from './types';

export class GameEngine {
  /**
   * Get all legal moves for the current player
   */
  getLegalMoves(state: GameState): Move[] {
    // Can't move during animations or if game is over
    if (state.isAnimating || state.gameStatus !== GameStatus.PLAYING) {
      return [];
    }

    const currentPlayerId = state.players[state.currentPlayerIndex];
    if (!currentPlayerId) {
      return [];
    }

    const validMoves = getValidMoves(state.board, currentPlayerId);

    return validMoves.map(({ row, col }) => ({
      row,
      col,
      playerId: currentPlayerId,
    }));
  }

  /**
   * Basic chain simulation - estimates explosion potential
   */
  simulateChain(state: GameState, move: Move): ChainSimulationResult {
    const targetCell = state.board.cells[move.row][move.col];
    const orbsAfterMove = targetCell.orbCount + 1;

    // Simple heuristic: if it would explode, estimate impact
    if (orbsAfterMove >= targetCell.criticalMass) {
      return {
        stepsCount: 1,
        finalBoard: state.board, // Simplified - just return current board
        affectedCells: [
          {
            row: move.row,
            col: move.col,
            oldOrbCount: targetCell.orbCount,
            newOrbCount: 0, // After explosion
            oldPlayerId: targetCell.playerId,
            newPlayerId: null,
          },
        ],
        totalExplosions: 1,
      };
    } else {
      return {
        stepsCount: 0,
        finalBoard: state.board,
        affectedCells: [
          {
            row: move.row,
            col: move.col,
            oldOrbCount: targetCell.orbCount,
            newOrbCount: orbsAfterMove,
            oldPlayerId: targetCell.playerId,
            newPlayerId: move.playerId,
          },
        ],
        totalExplosions: 0,
      };
    }
  }

  /**
   * Calculate board advantage for a player
   */
  calculateBoardAdvantage(board: GameBoard, playerId: PlayerId): number {
    let ownOrbs = 0;
    let enemyOrbs = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId) {
          ownOrbs += cell.orbCount;
        } else if (cell.playerId !== null) {
          enemyOrbs += cell.orbCount;
        }
      }
    }

    return ownOrbs - enemyOrbs;
  }

  /**
   * Check if a player has any orbs on the board
   */
  playerHasOrbs(board: GameBoard, playerId: PlayerId): boolean {
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId && cell.orbCount > 0) {
          return true;
        }
      }
    }
    return false;
  }
}
