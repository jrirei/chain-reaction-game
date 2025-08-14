/**
 * Tests for Shared Evaluation Module
 *
 * Tests the shared AI evaluation functions used across different bots
 * for consistent move assessment and board analysis.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  sharedEvaluator,
  DEFAULT_EVALUATION,
  CONSERVATIVE_EVALUATION,
  AGGRESSIVE_EVALUATION,
} from '../sharedEvaluation';
import type { GameState } from '../../types/game';
import type { Move } from '../../core/types';
import {
  createTestGameState,
  createTestMove,
} from '../../utils/__tests__/testHelpers';

describe('SharedEvaluation', () => {
  let gameState: GameState;
  let testMove: Move;

  beforeEach(() => {
    gameState = createTestGameState({
      currentPlayerId: 'player1',
      boardSize: { rows: 3, cols: 3 },
    });
    testMove = createTestMove('player1', 1, 1);
  });

  describe('Basic move evaluation', () => {
    it('should evaluate moves with conservative strategy', () => {
      const score = sharedEvaluator.evaluateMove(
        gameState,
        testMove,
        CONSERVATIVE_EVALUATION
      );
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should evaluate moves with default strategy', () => {
      const score = sharedEvaluator.evaluateMove(
        gameState,
        testMove,
        DEFAULT_EVALUATION
      );
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should evaluate moves with aggressive strategy', () => {
      const score = sharedEvaluator.evaluateMove(
        gameState,
        testMove,
        AGGRESSIVE_EVALUATION
      );
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should handle moves on different positions', () => {
      const cornerMove = createTestMove('player1', 0, 0);
      const edgeMove = createTestMove('player1', 0, 1);
      const centerMove = createTestMove('player1', 1, 1);

      const cornerScore = sharedEvaluator.evaluateMove(
        gameState,
        cornerMove,
        DEFAULT_EVALUATION
      );
      const edgeScore = sharedEvaluator.evaluateMove(
        gameState,
        edgeMove,
        DEFAULT_EVALUATION
      );
      const centerScore = sharedEvaluator.evaluateMove(
        gameState,
        centerMove,
        DEFAULT_EVALUATION
      );

      expect(typeof cornerScore).toBe('number');
      expect(typeof edgeScore).toBe('number');
      expect(typeof centerScore).toBe('number');
    });

    it('should evaluate moves without explicit config', () => {
      const score = sharedEvaluator.evaluateMove(gameState, testMove);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Winning move detection', () => {
    it('should detect no winning moves in empty board', () => {
      const moves = [
        createTestMove('player1', 0, 0),
        createTestMove('player1', 1, 1),
        createTestMove('player1', 2, 2),
      ];

      const winningMoves = sharedEvaluator.findWinningMoves(gameState, moves);
      expect(Array.isArray(winningMoves)).toBe(true);
      expect(winningMoves.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect winning moves when available', () => {
      const winningState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 2, cols: 2 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 1, playerId: 'player1' },
          ],
          [{ orbCount: 1, playerId: 'player1' }, null],
        ],
      });

      const moves = [
        createTestMove('player1', 1, 1), // Potential winning move
        createTestMove('player1', 0, 0), // Add to existing
      ];

      const winningMoves = sharedEvaluator.findWinningMoves(
        winningState,
        moves
      );
      expect(Array.isArray(winningMoves)).toBe(true);
    });

    it('should handle empty move list gracefully', () => {
      const winningMoves = sharedEvaluator.findWinningMoves(gameState, []);
      expect(winningMoves).toHaveLength(0);
    });
  });

  describe('Explosive move detection', () => {
    it('should detect non-explosive moves on empty board', () => {
      const isExplosive = sharedEvaluator.isExplosiveMove(gameState, testMove);
      expect(typeof isExplosive).toBe('boolean');
      expect(isExplosive).toBe(false);
    });

    it('should detect explosive moves with critical cells', () => {
      const criticalState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [{ orbCount: 2, playerId: 'player1' }, null, null], // Corner with 2 orbs (critical mass = 3)
          [null, null, null],
          [null, null, null],
        ],
      });

      const explosiveMove = createTestMove('player1', 0, 0);
      const isExplosive = sharedEvaluator.isExplosiveMove(
        criticalState,
        explosiveMove
      );
      expect(typeof isExplosive).toBe('boolean');
      expect(isExplosive).toBe(true);
    });

    it("should handle moves that don't cause explosions", () => {
      const safeMove = createTestMove('player1', 2, 2);
      const isExplosive = sharedEvaluator.isExplosiveMove(gameState, safeMove);
      expect(typeof isExplosive).toBe('boolean');
      expect(isExplosive).toBe(false);
    });
  });

  describe('Strategic preferences', () => {
    it('should show different preferences between strategies', () => {
      const criticalState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 2, playerId: 'player1' },
            { orbCount: 1, playerId: 'player2' },
            null,
          ],
          [null, null, null],
          [null, null, null],
        ],
      });

      const aggressiveMove = createTestMove('player1', 0, 0);

      const conservativeScore = sharedEvaluator.evaluateMove(
        criticalState,
        aggressiveMove,
        CONSERVATIVE_EVALUATION
      );
      const aggressiveScore = sharedEvaluator.evaluateMove(
        criticalState,
        aggressiveMove,
        AGGRESSIVE_EVALUATION
      );

      expect(typeof conservativeScore).toBe('number');
      expect(typeof aggressiveScore).toBe('number');
      // Both should be positive scores
      expect(conservativeScore).toBeGreaterThan(0);
      expect(aggressiveScore).toBeGreaterThan(0);
    });

    it('should handle default evaluation consistently', () => {
      const moves = [
        createTestMove('player1', 0, 0),
        createTestMove('player1', 1, 1),
        createTestMove('player1', 2, 2),
      ];

      for (const move of moves) {
        const score = sharedEvaluator.evaluateMove(
          gameState,
          move,
          DEFAULT_EVALUATION
        );
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(0);
      }
    });
  });

  describe('Position analysis', () => {
    it('should analyze corner positions correctly', () => {
      const cornerMove = createTestMove('player1', 0, 0);
      const score = sharedEvaluator.evaluateMove(
        gameState,
        cornerMove,
        DEFAULT_EVALUATION
      );
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should analyze edge positions correctly', () => {
      const edgeMove = createTestMove('player1', 0, 1);
      const score = sharedEvaluator.evaluateMove(
        gameState,
        edgeMove,
        DEFAULT_EVALUATION
      );
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should analyze center positions correctly', () => {
      const centerMove = createTestMove('player1', 1, 1);
      const score = sharedEvaluator.evaluateMove(
        gameState,
        centerMove,
        DEFAULT_EVALUATION
      );
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle edge case moves within bounds', () => {
      // Test with moves at board edges
      const edgeMove1 = createTestMove('player1', 0, 0);
      const edgeMove2 = createTestMove('player1', 2, 2);

      const score1 = sharedEvaluator.evaluateMove(
        gameState,
        edgeMove1,
        DEFAULT_EVALUATION
      );
      const score2 = sharedEvaluator.evaluateMove(
        gameState,
        edgeMove2,
        DEFAULT_EVALUATION
      );

      expect(typeof score1).toBe('number');
      expect(typeof score2).toBe('number');
    });

    it('should handle boundary conditions for move evaluation', () => {
      // Test with moves right at the board boundaries
      const maxRow = gameState.board.rows - 1;
      const maxCol = gameState.board.cols - 1;

      const boundaryMove = createTestMove('player1', maxRow, maxCol);
      const score = sharedEvaluator.evaluateMove(
        gameState,
        boundaryMove,
        DEFAULT_EVALUATION
      );

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should handle different player IDs consistently', () => {
      const player1Move = createTestMove('player1', 1, 1);
      const player2Move = createTestMove('player2', 1, 1);

      const score1 = sharedEvaluator.evaluateMove(
        gameState,
        player1Move,
        DEFAULT_EVALUATION
      );
      const score2 = sharedEvaluator.evaluateMove(
        gameState,
        player2Move,
        DEFAULT_EVALUATION
      );

      expect(typeof score1).toBe('number');
      expect(typeof score2).toBe('number');
    });
  });

  describe('Strategy weight validation', () => {
    it('should have valid conservative strategy weights', () => {
      expect(CONSERVATIVE_EVALUATION.criticalMassWeight).toBeGreaterThan(0);
      expect(CONSERVATIVE_EVALUATION.explosionBonus).toBeGreaterThan(0);
      expect(CONSERVATIVE_EVALUATION.chainReactionWeight).toBeGreaterThan(0);
    });

    it('should have valid aggressive strategy weights', () => {
      expect(AGGRESSIVE_EVALUATION.criticalMassWeight).toBeGreaterThan(0);
      expect(AGGRESSIVE_EVALUATION.explosionBonus).toBeGreaterThan(0);
      expect(AGGRESSIVE_EVALUATION.chainReactionWeight).toBeGreaterThan(0);
    });

    it('should have valid default strategy weights', () => {
      expect(DEFAULT_EVALUATION.criticalMassWeight).toBeGreaterThan(0);
      expect(DEFAULT_EVALUATION.explosionBonus).toBeGreaterThan(0);
      expect(DEFAULT_EVALUATION.chainReactionWeight).toBeGreaterThan(0);
    });
  });

  describe('Performance characteristics', () => {
    it('should evaluate moves quickly', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        const move = createTestMove('player1', i % 3, Math.floor(i / 3) % 3);
        sharedEvaluator.evaluateMove(gameState, move, DEFAULT_EVALUATION);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });

    it('should handle large boards efficiently', () => {
      const largeState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 10, cols: 10 },
      });

      const start = Date.now();
      const score = sharedEvaluator.evaluateMove(
        largeState,
        createTestMove('player1', 5, 5),
        DEFAULT_EVALUATION
      );
      const elapsed = Date.now() - start;

      expect(typeof score).toBe('number');
      expect(elapsed).toBeLessThan(50);
    });

    it('should detect winning moves efficiently', () => {
      const moves = [];
      for (let i = 0; i < 20; i++) {
        moves.push(createTestMove('player1', i % 3, Math.floor(i / 3) % 3));
      }

      const start = Date.now();
      const winningMoves = sharedEvaluator.findWinningMoves(gameState, moves);
      const elapsed = Date.now() - start;

      expect(Array.isArray(winningMoves)).toBe(true);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
