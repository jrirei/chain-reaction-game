/**
 * Random Bot - Uniformly random AI strategy
 *
 * This simple AI strategy provides random move selection:
 * - Uniformly selects from all legal moves available
 * - Uses provided RNG for deterministic testing
 * - Ideal for casual play and AI strategy testing
 * - Provides unpredictable gameplay experience
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import type { AiStrategy, AiContext } from './types';

export class RandomBot implements AiStrategy {
  readonly name = 'random' as const;

  async decideMove(
    _state: GameState,
    legalMoves: Move[],
    ctx: AiContext
  ): Promise<Move> {
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    // Use provided RNG for deterministic behavior in tests
    const rng = ctx.rng || Math.random;
    const randomIndex = Math.floor(rng() * legalMoves.length);

    return legalMoves[randomIndex];
  }
}
