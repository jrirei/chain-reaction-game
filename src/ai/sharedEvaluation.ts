/**
 * Shared AI Evaluation Logic
 *
 * Consolidates common move evaluation logic used across multiple AI bots
 * to reduce duplication, improve maintainability, and ensure consistency.
 *
 * @fileoverview Centralizes board analysis, position scoring, and chain evaluation
 * functions that were previously duplicated across defaultBot, monteCarloBot,
 * and oskarBot implementations.
 */

import type { GameState, GameBoard } from '../types/game';
import type { PlayerId } from '../types/player';
import type { Move } from '../core/types';
import { GameEngine } from '../core/engineSimple';

/**
 * Configuration for evaluation weights
 */
export interface EvaluationConfig {
  criticalMassWeight: number; // Weight for critical mass progress (0-100)
  explosionBonus: number; // Bonus for immediate explosions (0-50)
  chainReactionWeight: number; // Weight per chain step (0-20)
  positionWeights: {
    // Position value bonuses
    corner: number; // Corner position bonus (0-30)
    edge: number; // Edge position bonus (0-20)
    center: number; // Center position base value (0-10)
  };
  threatWeight: number; // Weight for threatening enemy cells (0-10)
  boardAdvantageWeight: number; // Weight for overall board advantage (0-5)
}

/**
 * Default evaluation configuration - balanced for general play
 */
export const DEFAULT_EVALUATION: EvaluationConfig = {
  criticalMassWeight: 5,
  explosionBonus: 10,
  chainReactionWeight: 3,
  positionWeights: {
    corner: 3,
    edge: 2,
    center: 1,
  },
  threatWeight: 4,
  boardAdvantageWeight: 1,
};

/**
 * Aggressive evaluation configuration - favors chain reactions and explosions
 */
export const AGGRESSIVE_EVALUATION: EvaluationConfig = {
  criticalMassWeight: 8,
  explosionBonus: 15,
  chainReactionWeight: 5,
  positionWeights: {
    corner: 5,
    edge: 3,
    center: 1,
  },
  threatWeight: 6,
  boardAdvantageWeight: 2,
};

/**
 * Conservative evaluation configuration - emphasizes position and safety
 */
export const CONSERVATIVE_EVALUATION: EvaluationConfig = {
  criticalMassWeight: 3,
  explosionBonus: 5,
  chainReactionWeight: 2,
  positionWeights: {
    corner: 8,
    edge: 5,
    center: 2,
  },
  threatWeight: 2,
  boardAdvantageWeight: 1,
};

/**
 * Shared AI evaluation utilities
 */
export class SharedEvaluator {
  private engine = new GameEngine();

  /**
   * Evaluates a move using configurable heuristics
   *
   * @param state - Current game state
   * @param move - Move to evaluate
   * @param config - Evaluation configuration (defaults to balanced)
   * @returns Numerical score for the move (higher = better)
   *
   * @example
   * ```typescript
   * const evaluator = new SharedEvaluator();
   * const score = evaluator.evaluateMove(state, move, AGGRESSIVE_EVALUATION);
   * ```
   */
  evaluateMove(
    state: GameState,
    move: Move,
    config: EvaluationConfig = DEFAULT_EVALUATION
  ): number {
    let score = 1; // Base score
    const targetCell = state.board.cells[move.row][move.col];
    const orbsAfterMove = targetCell.orbCount + 1;

    // 1. Critical mass progress
    const criticalMassProgress = orbsAfterMove / targetCell.criticalMass;
    score += criticalMassProgress * config.criticalMassWeight;

    // 2. Position value
    score += this.calculatePositionValue(
      targetCell.criticalMass,
      config.positionWeights
    );

    // 3. Explosion and chain reaction analysis
    if (orbsAfterMove >= targetCell.criticalMass) {
      score += config.explosionBonus;

      try {
        const simulation = this.engine.simulateChain(state, move);

        // Chain reaction bonus
        score += simulation.stepsCount * config.chainReactionWeight;

        // Board advantage bonus
        const advantageBefore = this.engine.calculateBoardAdvantage(
          state.board,
          move.playerId
        );
        const advantageAfter = this.engine.calculateBoardAdvantage(
          simulation.finalBoard,
          move.playerId
        );
        score +=
          (advantageAfter - advantageBefore) * config.boardAdvantageWeight;
      } catch {
        // Simulation failed - small penalty for unreliable move
        score -= 2;
      }
    }

    // 4. Threat bonus (adjacent enemy cells)
    score += this.calculateThreatBonus(
      state.board,
      move.row,
      move.col,
      move.playerId,
      config.threatWeight
    );

    return score;
  }

  /**
   * Calculates position value based on critical mass (corner/edge/center)
   */
  private calculatePositionValue(
    criticalMass: number,
    weights: EvaluationConfig['positionWeights']
  ): number {
    switch (criticalMass) {
      case 2:
        return weights.corner; // Corner cell
      case 3:
        return weights.edge; // Edge cell
      case 4:
        return weights.center; // Center cell
      default:
        return weights.center; // Fallback
    }
  }

  /**
   * Calculates bonus for threatening adjacent enemy cells
   */
  private calculateThreatBonus(
    board: GameBoard,
    row: number,
    col: number,
    playerId: PlayerId,
    threatWeight: number
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
          bonus += threatWeight;
        }
      }
    }

    return bonus;
  }

  /**
   * Quick position assessment - useful for MCTS rollouts
   *
   * @param board - Game board to evaluate
   * @param playerId - Player to evaluate for
   * @returns Simple advantage score (positive = good, negative = bad)
   */
  quickPositionEvaluation(board: GameBoard, playerId: PlayerId): number {
    return this.engine.calculateBoardAdvantage(board, playerId);
  }

  /**
   * Determines if a move triggers an immediate explosion
   */
  isExplosiveMove(state: GameState, move: Move): boolean {
    const targetCell = state.board.cells[move.row][move.col];
    return targetCell.orbCount + 1 >= targetCell.criticalMass;
  }

  /**
   * Counts potential chain reaction steps for a move
   *
   * @param state - Current game state
   * @param move - Move to analyze
   * @returns Number of chain reaction steps (0 if no explosion)
   */
  countChainSteps(state: GameState, move: Move): number {
    try {
      const simulation = this.engine.simulateChain(state, move);
      return simulation.stepsCount;
    } catch {
      return 0;
    }
  }

  /**
   * Finds moves that lead to immediate wins
   *
   * @param state - Current game state
   * @param legalMoves - Available legal moves
   * @returns Winning moves, or empty array if none found
   */
  findWinningMoves(state: GameState, legalMoves: Move[]): Move[] {
    const winningMoves: Move[] = [];
    const currentPlayer = state.players[state.currentPlayerIndex];

    for (const move of legalMoves) {
      try {
        const simulation = this.engine.simulateChain(state, move);

        // Check if only current player has orbs remaining
        const hasOnlyCurrentPlayer = this.engine.playerHasOrbs(
          simulation.finalBoard,
          currentPlayer
        );
        let otherPlayersHaveOrbs = false;

        for (let i = 0; i < state.players.length; i++) {
          if (i !== state.currentPlayerIndex) {
            if (
              this.engine.playerHasOrbs(simulation.finalBoard, state.players[i])
            ) {
              otherPlayersHaveOrbs = true;
              break;
            }
          }
        }

        if (hasOnlyCurrentPlayer && !otherPlayersHaveOrbs) {
          winningMoves.push(move);
        }
      } catch {
        // Skip moves that cause simulation errors
        continue;
      }
    }

    return winningMoves;
  }
}

/**
 * Singleton evaluator instance for shared use
 */
export const sharedEvaluator = new SharedEvaluator();

/**
 * Convenience functions for common evaluation patterns
 */
export const evaluateMove = (
  state: GameState,
  move: Move,
  config?: EvaluationConfig
) => sharedEvaluator.evaluateMove(state, move, config);

export const findWinningMoves = (state: GameState, legalMoves: Move[]) =>
  sharedEvaluator.findWinningMoves(state, legalMoves);

export const isExplosiveMove = (state: GameState, move: Move) =>
  sharedEvaluator.isExplosiveMove(state, move);
