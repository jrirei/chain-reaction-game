/**
 * Default Bot - Ported from utils/aiLogic.ts
 *
 * Strategic heuristics-based AI that evaluates moves based on:
 * - Critical mass progress
 * - Chain reaction potential
 * - Position advantages
 * - Enemy capture opportunities
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import type { AiStrategy } from './types';
import { sharedEvaluator, DEFAULT_EVALUATION } from './sharedEvaluation';

export class DefaultBot implements AiStrategy {
  readonly name = 'default' as const;

  async decideMove(state: GameState, legalMoves: Move[]): Promise<Move> {
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    // Score all moves using shared evaluation logic
    const scoredMoves = legalMoves.map((move) => ({
      move,
      score: sharedEvaluator.evaluateMove(state, move, DEFAULT_EVALUATION),
    }));

    // Sort by score (descending) and return the best move
    scoredMoves.sort((a, b) => b.score - a.score);

    return scoredMoves[0].move;
  }

  /* Evaluation logic moved to shared sharedEvaluation.ts
   * This eliminates ~70 lines of duplicated move evaluation code
   * and consolidates logic used across multiple AI bots.
   */
}
