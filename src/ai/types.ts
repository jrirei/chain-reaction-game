/**
 * AI Strategy interfaces and types
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';

export type AiStrategyName = 'default' | 'trigger' | 'random' | 'monteCarlo';

export interface AiContext {
  /** Random number generator (0-1) - for deterministic testing */
  rng: () => number;
  /** Optional deadline in milliseconds since epoch */
  deadlineMs?: number;
  /** Optional maximum thinking time in milliseconds */
  maxThinkingMs?: number;
}

export interface AiStrategy {
  readonly name: AiStrategyName;

  /**
   * Decide on a move given the current game state and legal options
   *
   * @param state Current game state
   * @param legalMoves Array of legal moves to choose from
   * @param ctx Context including RNG and time constraints
   * @returns Promise resolving to the chosen move
   */
  decideMove(
    state: GameState,
    legalMoves: Move[],
    ctx: AiContext
  ): Promise<Move>;
}

export interface AiConfig {
  strategy: AiStrategyName;
  /** Maximum thinking time in milliseconds (for Monte Carlo) */
  maxThinkingMs?: number;
}

export interface BotTurnResult {
  move: Move;
  thinkingMs: number;
  delayAppliedMs: number;
  strategyName: AiStrategyName;
}

export interface ThinkingState {
  isThinking: boolean;
  strategy?: AiStrategyName;
  startTime?: number;
}
