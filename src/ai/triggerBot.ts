/**
 * Trigger Bot - Explosion-focused AI strategy
 *
 * This aggressive AI prioritizes explosive moves and chain reactions:
 * - Finds moves that yield explosions and maximizes chain length
 * - Uses explosion simulation to evaluate chain potential
 * - When no explosions available, pushes own cells toward critical mass
 * - Aggressive risk-taking for maximum dramatic effect
 */

import type { GameState, GameBoard } from '../types/game';
import type { Move } from '../core/types';
import { GameEngine } from '../core/engineSimple';
import type { AiStrategy, AiContext } from './types';

export class TriggerBot implements AiStrategy {
  readonly name = 'trigger' as const;

  private engine = new GameEngine();

  async decideMove(
    state: GameState,
    legalMoves: Move[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _ctx: AiContext
  ): Promise<Move> {
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    // Phase 1: Look for explosive moves first
    const explosiveMoves = this.findExplosiveMoves(state, legalMoves);

    if (explosiveMoves.length > 0) {
      // Choose the explosive move with maximum chain potential
      return this.selectBestExplosiveMove(state, explosiveMoves);
    }

    // Phase 2: No explosions available, build toward critical mass
    return this.selectBestBuildupMove(state, legalMoves);
  }

  /**
   * Find all moves that would cause immediate explosions
   */
  private findExplosiveMoves(state: GameState, legalMoves: Move[]): Move[] {
    const explosiveMoves: Move[] = [];

    for (const move of legalMoves) {
      const targetCell = state.board.cells[move.row][move.col];
      const orbsAfterMove = targetCell.orbCount + 1;

      if (orbsAfterMove >= targetCell.criticalMass) {
        explosiveMoves.push(move);
      }
    }

    return explosiveMoves;
  }

  /**
   * Select the explosive move with the highest chain reaction potential
   */
  private selectBestExplosiveMove(
    state: GameState,
    explosiveMoves: Move[]
  ): Move {
    const scoredMoves = explosiveMoves.map((move) => {
      const simulation = this.engine.simulateChain(state, move);
      const boardAdvantage = this.calculatePostExplosionAdvantage(
        state,
        move,
        simulation
      );

      return {
        move,
        chainLength: simulation.stepsCount,
        boardAdvantage,
        // Heavily weight chain reactions and board control
        score:
          simulation.stepsCount * 100 +
          boardAdvantage * 10 +
          this.calculatePositionValue(state.board, move),
      };
    });

    // Sort by score descending and return the best
    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].move;
  }

  /**
   * When no explosions are available, select move that builds toward critical mass
   */
  private selectBestBuildupMove(state: GameState, legalMoves: Move[]): Move {
    const scoredMoves = legalMoves.map((move) => ({
      move,
      score: this.calculateBuildupScore(state, move),
    }));

    // Sort by score descending
    scoredMoves.sort((a, b) => b.score - a.score);
    return scoredMoves[0].move;
  }

  /**
   * Calculate score for buildup moves (when no explosions available)
   */
  private calculateBuildupScore(state: GameState, move: Move): number {
    const targetCell = state.board.cells[move.row][move.col];
    const orbsAfterMove = targetCell.orbCount + 1;

    let score = 0;

    // Heavily favor moves that get us close to critical mass
    const criticalMassRatio = orbsAfterMove / targetCell.criticalMass;
    score += criticalMassRatio * 50; // Much higher than default bot

    // Extra bonus for moves that put us one away from explosion
    if (orbsAfterMove === targetCell.criticalMass - 1) {
      score += 100; // Big bonus for being one away from explosion
    }

    // Position bonuses (corners explode easier)
    score += this.calculatePositionValue(state.board, move);

    // Bonus for building on our own cells vs neutral cells
    if (targetCell.playerId === move.playerId) {
      score += 20; // Prefer building up existing positions
    }

    // Small bonus for threatening enemy positions
    score += this.calculateThreatValue(state.board, move);

    return score;
  }

  /**
   * Calculate position-based value (corners > edges > center for explosion potential)
   */
  private calculatePositionValue(board: GameBoard, move: Move): number {
    const targetCell = board.cells[move.row][move.col];

    // Corners are most valuable for Trigger Bot (easier to explode)
    if (targetCell.criticalMass === 2) return 30; // Corner
    if (targetCell.criticalMass === 3) return 20; // Edge
    return 10; // Center
  }

  /**
   * Calculate how much this move threatens adjacent enemy cells
   */
  private calculateThreatValue(board: GameBoard, move: Move): number {
    let threatValue = 0;
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of directions) {
      const adjRow = move.row + dr;
      const adjCol = move.col + dc;

      if (
        adjRow >= 0 &&
        adjRow < board.rows &&
        adjCol >= 0 &&
        adjCol < board.cols
      ) {
        const adjCell = board.cells[adjRow][adjCol];

        if (adjCell.playerId && adjCell.playerId !== move.playerId) {
          // More threat value for enemy cells close to critical mass
          const enemyProgress = adjCell.orbCount / adjCell.criticalMass;
          threatValue += enemyProgress * 15;
        }
      }
    }

    return threatValue;
  }

  /**
   * Calculate board advantage after an explosion
   */
  private calculatePostExplosionAdvantage(
    state: GameState,
    move: Move,
    simulation: { stepsCount: number; finalBoard?: GameBoard }
  ): number {
    const currentAdvantage = this.engine.calculateBoardAdvantage(
      state.board,
      move.playerId
    );

    // Use simulation result if available, otherwise estimate
    if (simulation.finalBoard) {
      const newAdvantage = this.engine.calculateBoardAdvantage(
        simulation.finalBoard as GameBoard,
        move.playerId
      );
      return newAdvantage - currentAdvantage;
    }

    // Fallback: rough estimate based on chain length
    return simulation.stepsCount * 2; // Assume we gain ~2 orbs per explosion step
  }
}
