/**
 * Default Bot - Ported from utils/aiLogic.ts
 *
 * Strategic heuristics-based AI that evaluates moves based on:
 * - Critical mass progress
 * - Chain reaction potential
 * - Position advantages
 * - Enemy capture opportunities
 */

import type { GameState, GameBoard } from '../types/game';
import type { PlayerId } from '../types/player';
import type { Move } from '../core/types';
import { GameEngine } from '../core/engineSimple';
import type { AiStrategy } from './types';

export class DefaultBot implements AiStrategy {
  readonly name = 'default' as const;

  private engine = new GameEngine();

  async decideMove(state: GameState, legalMoves: Move[]): Promise<Move> {
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    // Score all moves
    const scoredMoves = legalMoves.map((move) => ({
      move,
      score: this.evaluateMove(state, move),
    }));

    // Sort by score (descending) and return the best move
    scoredMoves.sort((a, b) => b.score - a.score);

    return scoredMoves[0].move;
  }

  /**
   * Evaluate a move using strategic heuristics
   *
   * Scoring factors:
   * 1. Base move value: +1 point
   * 2. Critical mass progress: +5 points per ratio of (orbs/criticalMass)
   * 3. Immediate explosion: +10 points
   * 4. Chain reaction length: +3 points per step in chain
   * 5. Position bonuses: +3 for corners, +2 for edges
   * 6. Enemy cell capture: +4 points per adjacent enemy cell
   * 7. Board advantage gain: +1 per orb advantage gained
   */
  private evaluateMove(state: GameState, move: Move): number {
    let score = 1; // Base score

    const currentCell = state.board.cells[move.row][move.col];
    const orbsAfterMove = currentCell.orbCount + 1;

    // Bonus for building up cells closer to critical mass
    const criticalMassProgress = orbsAfterMove / currentCell.criticalMass;
    score += criticalMassProgress * 5;

    // Check if this move would cause an explosion
    if (orbsAfterMove >= currentCell.criticalMass) {
      score += 10; // Immediate explosion bonus

      // Simulate the chain reaction to get more precise scoring
      try {
        const simulation = this.engine.simulateChain(state, move);

        if (simulation.stepsCount > 0) {
          // Bonus for chain reactions
          score += simulation.stepsCount * 3;

          // Bonus for board advantage gained
          const advantageBefore = this.engine.calculateBoardAdvantage(
            state.board,
            move.playerId
          );
          const advantageAfter = this.engine.calculateBoardAdvantage(
            simulation.finalBoard as GameBoard,
            move.playerId
          );
          score += advantageAfter - advantageBefore;
        } else {
          // Small penalty for exploding without strategic benefit
          score -= 5;
        }
      } catch {
        // If simulation fails, apply small penalty
        score -= 2;
      }
    }

    // Position bonuses (corners and edges have lower critical mass)
    if (currentCell.criticalMass === 2) {
      score += 3; // Corner bonus
    } else if (currentCell.criticalMass === 3) {
      score += 2; // Edge bonus
    }

    // Bonus for threatening adjacent enemy cells
    score += this.calculateThreatBonus(
      state.board,
      move.row,
      move.col,
      move.playerId
    );

    return score;
  }

  /**
   * Calculate bonus points for threatening adjacent enemy positions
   */
  private calculateThreatBonus(
    board: GameBoard,
    row: number,
    col: number,
    playerId: PlayerId
  ): number {
    let bonus = 0;
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of directions) {
      const adjRow = row + dr;
      const adjCol = col + dc;

      if (
        adjRow >= 0 &&
        adjRow < board.rows &&
        adjCol >= 0 &&
        adjCol < board.cols
      ) {
        const adjCell = board.cells[adjRow][adjCol];
        if (adjCell.playerId && adjCell.playerId !== playerId) {
          // Bonus for threatening enemy cells
          bonus += 4;
        }
      }
    }

    return bonus;
  }
}
