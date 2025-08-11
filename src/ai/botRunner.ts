/**
 * BotRunner - Orchestrates AI turn execution with timing controls
 */

import type { GameState } from '../types/game';
import { GameEngine } from '../core/engineSimple';
import type { AiStrategy, AiContext, BotTurnResult } from './types';

export interface BotRunnerConfig {
  /** Minimum delay in milliseconds between AI moves */
  minDelayMs: number;
}

export class BotRunner {
  private engine: GameEngine;
  private config: BotRunnerConfig;

  constructor(engine: GameEngine, config: BotRunnerConfig) {
    this.engine = engine;
    this.config = config;
  }

  /**
   * Execute an AI turn with proper timing controls
   *
   * Measures thinking time and ensures minimum delay is respected
   */
  async playTurn(
    strategy: AiStrategy,
    state: GameState,
    ctx: AiContext = { rng: Math.random }
  ): Promise<BotTurnResult> {
    const startTime = performance.now();

    // Get legal moves
    const legalMoves = this.engine.getLegalMoves(state);

    if (legalMoves.length === 0) {
      throw new Error('No legal moves available for AI');
    }

    // Let the strategy decide
    const move = await strategy.decideMove(state, legalMoves, ctx);

    // Validate the chosen move
    const isValidMove = legalMoves.some(
      (legal) => legal.row === move.row && legal.col === move.col
    );

    if (!isValidMove) {
      throw new Error(
        `AI strategy ${strategy.name} returned invalid move: ${move.row},${move.col}`
      );
    }

    const endTime = performance.now();
    const thinkingMs = endTime - startTime;

    // Calculate required additional delay
    const delayAppliedMs = Math.max(0, this.config.minDelayMs - thinkingMs);

    // Apply the delay if needed
    if (delayAppliedMs > 0) {
      await this.sleep(delayAppliedMs);
    }

    return {
      move,
      thinkingMs,
      delayAppliedMs,
      strategyName: strategy.name,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
