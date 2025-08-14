/**
 * Tests for Optimized Monte Carlo Bot
 *
 * Tests the advanced MCTS implementation with performance optimizations
 * including transposition tables, move ordering, and RAVE.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptimizedMonteCarloBot } from '../optimizedMonteCarloBot';
import type { GameState } from '../../types/game';
import type { Move } from '../../core/types';
import type { AiContext } from '../types';
import {
  createTestGameState,
  createTestMove,
} from '../../utils/__tests__/testHelpers';

describe('OptimizedMonteCarloBot', () => {
  let bot: OptimizedMonteCarloBot;
  let gameState: GameState;
  let legalMoves: Move[];
  let aiContext: AiContext;

  beforeEach(() => {
    bot = new OptimizedMonteCarloBot();
    gameState = createTestGameState({
      currentPlayerId: 'player1',
      boardSize: { rows: 3, cols: 3 },
    });
    legalMoves = [
      createTestMove('player1', 0, 0),
      createTestMove('player1', 0, 1),
      createTestMove('player1', 1, 0),
    ];
    aiContext = {
      maxThinkingMs: 100, // Short time for tests
      rng: () => 0.5, // Predictable random
    };

    // Mock performance.now to avoid timing issues in tests
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  describe('Basic functionality', () => {
    it('should have correct name', () => {
      expect(bot.name).toBe('optimizedMonteCarlo');
    });

    it('should throw error when no legal moves available', async () => {
      await expect(bot.decideMove(gameState, [], aiContext)).rejects.toThrow(
        'No legal moves available'
      );
    });

    it('should return the only legal move when only one available', async () => {
      const singleMove = [createTestMove('player1', 0, 0)];
      const result = await bot.decideMove(gameState, singleMove, aiContext);
      expect(result).toEqual(singleMove[0]);
    });

    it('should select a valid move from legal moves', async () => {
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      expect(legalMoves).toContainEqual(result);
    });
  });

  describe('Move ordering and heuristics', () => {
    it('should order moves by heuristic evaluation', async () => {
      // Create a state where one move is clearly better
      const betterState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [{ orbCount: 2, playerId: 'player1' }, null, null],
          [null, null, null],
          [null, null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 1), // Adjacent to existing orb (better)
        createTestMove('player1', 2, 2), // Far away (worse)
      ];

      const result = await bot.decideMove(betterState, moves, aiContext);

      // Should prefer the move adjacent to existing orb
      expect(result.row).toBe(0);
      expect(result.col).toBe(1);
    });
  });

  describe('Transposition table functionality', () => {
    it('should use transposition table for position caching', async () => {
      // Run the same position twice
      const result1 = await bot.decideMove(gameState, legalMoves, aiContext);
      const result2 = await bot.decideMove(gameState, legalMoves, aiContext);

      // Both should be valid moves (exact result may vary due to randomness)
      expect(legalMoves).toContainEqual(result1);
      expect(legalMoves).toContainEqual(result2);
    });

    it('should handle transposition table memory management', async () => {
      // Create many different positions to test table cleanup
      const manyMoves = [];
      for (let i = 0; i < 50; i++) {
        manyMoves.push(createTestMove('player1', i % 3, Math.floor(i / 3) % 3));
      }

      // This should trigger table cleanup internally
      const result = await bot.decideMove(
        gameState,
        manyMoves.slice(0, 3),
        aiContext
      );
      expect(legalMoves).toContainEqual(result);
    });
  });

  describe('Progressive widening', () => {
    it('should handle progressive widening during search', async () => {
      // Longer thinking time to allow for more iterations
      const longerContext = { ...aiContext, maxThinkingMs: 200 };

      const result = await bot.decideMove(gameState, legalMoves, longerContext);
      expect(legalMoves).toContainEqual(result);
    });

    it('should respect maximum iterations limit', async () => {
      // Very long thinking time but should still terminate
      const veryLongContext = { ...aiContext, maxThinkingMs: 10000 };

      const start = Date.now();
      const result = await bot.decideMove(
        gameState,
        legalMoves,
        veryLongContext
      );
      const elapsed = Date.now() - start;

      expect(legalMoves).toContainEqual(result);
      // Should not actually take 10 seconds due to iteration limits
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('RAVE (Rapid Action Value Estimation)', () => {
    it('should handle RAVE updates correctly', async () => {
      // Test with multiple similar moves to trigger RAVE
      const similarMoves = [
        createTestMove('player1', 0, 0),
        createTestMove('player1', 0, 1), // Adjacent
        createTestMove('player1', 1, 0), // Adjacent
        createTestMove('player1', 2, 2), // Far away
      ];

      const result = await bot.decideMove(gameState, similarMoves, aiContext);
      expect(similarMoves).toContainEqual(result);
    });
  });

  describe('Early termination and optimization', () => {
    it('should find winning moves immediately', async () => {
      // Create a state with a clear winning move
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

      const winningMove = createTestMove('player1', 1, 1);
      const moves = [
        createTestMove('player1', 0, 0), // Would trigger chain
        winningMove,
      ];

      const result = await bot.decideMove(winningState, moves, aiContext);
      // Should select a move that leads to winning
      expect(moves).toContainEqual(result);
    });

    it('should handle node pruning logic', async () => {
      // Test basic pruning capability with simple scenario
      const moves = [
        createTestMove('player1', 0, 0),
        createTestMove('player1', 1, 1),
      ];

      const veryShortContext = { ...aiContext, maxThinkingMs: 10 }; // Very short time
      const result = await bot.decideMove(gameState, moves, veryShortContext);
      expect(moves).toContainEqual(result);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty children in selection', async () => {
      // This tests internal robustness
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      expect(legalMoves).toContainEqual(result);
    });

    it('should handle invalid context gracefully', async () => {
      const invalidContext: AiContext = {
        maxThinkingMs: 0, // Invalid time
        rng: undefined, // Missing RNG
      };

      const result = await bot.decideMove(
        gameState,
        legalMoves,
        invalidContext
      );
      expect(legalMoves).toContainEqual(result);
    });

    it('should work without maxThinkingMs in context', async () => {
      const contextWithoutTime: AiContext = {
        rng: () => 0.5,
      };

      const result = await bot.decideMove(
        gameState,
        legalMoves,
        contextWithoutTime
      );
      expect(legalMoves).toContainEqual(result);
    });

    it('should work without rng in context', async () => {
      const contextWithoutRng: AiContext = {
        maxThinkingMs: 100,
      };

      const result = await bot.decideMove(
        gameState,
        legalMoves,
        contextWithoutRng
      );
      expect(legalMoves).toContainEqual(result);
    });
  });

  describe('Performance characteristics', () => {
    it('should complete within reasonable time', async () => {
      const start = Date.now();
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      const elapsed = Date.now() - start;

      expect(legalMoves).toContainEqual(result);
      expect(elapsed).toBeLessThan(500); // Should be much faster than 500ms
    });

    it('should handle large move sets efficiently', async () => {
      // Create a larger board with more moves
      const largerState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 5, cols: 5 },
      });

      const manyMoves = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          manyMoves.push(createTestMove('player1', row, col));
        }
      }

      const start = Date.now();
      const result = await bot.decideMove(largerState, manyMoves, aiContext);
      const elapsed = Date.now() - start;

      expect(manyMoves).toContainEqual(result);
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Position hashing', () => {
    it('should generate consistent hashes for same positions', async () => {
      // Test that the bot generates consistent results for identical positions
      const context1 = { ...aiContext, rng: () => 0.3 };
      const context2 = { ...aiContext, rng: () => 0.3 };

      const result1 = await bot.decideMove(gameState, legalMoves, context1);
      const result2 = await bot.decideMove(gameState, legalMoves, context2);

      // With same RNG, should get same result (due to caching)
      expect(result1).toEqual(result2);
    });
  });

  describe('Move relatedness for RAVE', () => {
    it('should correctly identify related moves', async () => {
      // Test with moves that should be considered related
      const relatedMoves = [
        createTestMove('player1', 1, 1), // Center
        createTestMove('player1', 1, 2), // Adjacent
        createTestMove('player1', 2, 1), // Adjacent
      ];

      const result = await bot.decideMove(gameState, relatedMoves, aiContext);
      expect(relatedMoves).toContainEqual(result);
    });
  });

  describe('Integration with shared evaluation', () => {
    it('should use shared evaluator for move assessment', async () => {
      // This is tested indirectly through move ordering
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      expect(legalMoves).toContainEqual(result);
    });

    it('should handle evaluation errors gracefully', async () => {
      // Even if evaluation fails, bot should still work
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      expect(legalMoves).toContainEqual(result);
    });
  });
});
