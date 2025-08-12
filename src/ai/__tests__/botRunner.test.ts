/**
 * BotRunner Test Suite
 * 
 * Tests the AI turn orchestration system including timing controls,
 * strategy execution, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BotRunner } from '../botRunner';
import { GameEngine } from '../../core/engineSimple';
import type { GameState } from '../../types/game';
import type { AiStrategy, AiContext } from '../types';
import { createTestGameState } from '../../utils/__tests__/testHelpers';

// Mock strategy for testing
const createMockStrategy = (moveDelay = 0): AiStrategy => ({
  name: 'test-strategy',
  async decideMove(state, legalMoves, context) {
    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, moveDelay));
    return legalMoves[0]; // Return first legal move
  },
});

// Mock strategy that throws error
const createErrorStrategy = (): AiStrategy => ({
  name: 'error-strategy',
  async decideMove() {
    throw new Error('AI strategy failed');
  },
});

// Mock strategy that returns invalid move
const createInvalidMoveStrategy = (): AiStrategy => ({
  name: 'invalid-strategy',
  async decideMove() {
    return { row: -1, col: -1, playerId: 'invalid' }; // Invalid move
  },
});

describe('BotRunner', () => {
  let engine: GameEngine;
  let botRunner: BotRunner;
  let gameState: GameState;

  beforeEach(() => {
    engine = new GameEngine();
    botRunner = new BotRunner(engine, { minDelayMs: 100 });
    gameState = createTestGameState();
    
    // Mock performance.now for consistent timing tests
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create BotRunner with correct config', () => {
      const config = { minDelayMs: 500 };
      const runner = new BotRunner(engine, config);
      expect(runner).toBeInstanceOf(BotRunner);
    });
  });

  describe('playTurn', () => {
    it('should execute AI turn successfully', async () => {
      const strategy = createMockStrategy(50);
      const context: AiContext = { rng: Math.random };

      const result = await botRunner.playTurn(strategy, gameState, context);

      expect(result).toHaveProperty('move');
      expect(result).toHaveProperty('thinkingMs');
      expect(result).toHaveProperty('delayAppliedMs');
      expect(result).toHaveProperty('strategyName', 'test-strategy');
      expect(result.move).toHaveProperty('row');
      expect(result.move).toHaveProperty('col');
      expect(result.move).toHaveProperty('playerId');
    });

    it('should respect minimum delay', async () => {
      const strategy = createMockStrategy(10); // Fast strategy
      const startTime = Date.now();

      const result = await botRunner.playTurn(strategy, gameState);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeGreaterThanOrEqual(90); // Should be close to 100ms minDelay
      expect(result.delayAppliedMs).toBeGreaterThan(0);
    });

    it('should not add delay if thinking time exceeds minimum', async () => {
      const strategy = createMockStrategy(150); // Slow strategy

      const result = await botRunner.playTurn(strategy, gameState);

      expect(result.thinkingMs).toBeGreaterThanOrEqual(150);
      expect(result.delayAppliedMs).toBe(0);
    });

    it('should pass context to strategy', async () => {
      const mockRng = vi.fn().mockReturnValue(0.5);
      const mockContext: AiContext = { rng: mockRng, maxThinkingMs: 5000 };
      
      const strategy: AiStrategy = {
        name: 'context-test',
        async decideMove(state, legalMoves, context) {
          expect(context).toBe(mockContext);
          expect(context.rng).toBe(mockRng);
          expect(context.maxThinkingMs).toBe(5000);
          // Actually use the RNG to ensure it gets called
          context.rng();
          return legalMoves[0];
        },
      };

      await botRunner.playTurn(strategy, gameState, mockContext);
      expect(mockRng).toHaveBeenCalled();
    });

    it('should handle strategy errors gracefully', async () => {
      const strategy = createErrorStrategy();

      await expect(botRunner.playTurn(strategy, gameState)).rejects.toThrow('AI strategy failed');
    });

    it('should validate move returned by strategy', async () => {
      const strategy = createInvalidMoveStrategy();

      await expect(botRunner.playTurn(strategy, gameState)).rejects.toThrow(
        'AI strategy invalid-strategy returned invalid move'
      );
    });

    it('should handle no legal moves', async () => {
      const strategy = createMockStrategy();
      // Create game state with no legal moves (full board)
      const fullGameState = createTestGameState();
      // Fill all cells to make no moves legal
      for (let row = 0; row < fullGameState.board.rows; row++) {
        for (let col = 0; col < fullGameState.board.cols; col++) {
          const cell = fullGameState.board.cells[row][col];
          cell.orbCount = cell.criticalMass - 1;
          cell.playerId = 'opponent'; // Different player
        }
      }

      await expect(botRunner.playTurn(strategy, fullGameState)).rejects.toThrow(
        'No legal moves available for AI'
      );
    });

    it('should use default context when none provided', async () => {
      const strategy: AiStrategy = {
        name: 'default-context-test',
        async decideMove(state, legalMoves, context) {
          expect(context).toBeDefined();
          expect(context.rng).toBeDefined();
          expect(typeof context.rng).toBe('function');
          return legalMoves[0];
        },
      };

      await botRunner.playTurn(strategy, gameState);
    });

    it('should measure thinking time accurately', async () => {
      const thinkingTime = 200;
      const strategy = createMockStrategy(thinkingTime);

      const result = await botRunner.playTurn(strategy, gameState);

      // Allow for small timing variations
      expect(result.thinkingMs).toBeGreaterThanOrEqual(thinkingTime - 50);
      expect(result.thinkingMs).toBeLessThanOrEqual(thinkingTime + 100);
    });

    it('should handle concurrent executions', async () => {
      const strategy1 = createMockStrategy(100);
      const strategy2 = createMockStrategy(150);

      const [result1, result2] = await Promise.all([
        botRunner.playTurn(strategy1, gameState),
        botRunner.playTurn(strategy2, gameState),
      ]);

      expect(result1.strategyName).toBe('test-strategy');
      expect(result2.strategyName).toBe('test-strategy');
      expect(result1.move).toBeDefined();
      expect(result2.move).toBeDefined();
    });
  });

  describe('sleep method', () => {
    it('should delay execution for specified time', async () => {
      const delayMs = 50;
      const startTime = Date.now();

      // Access private method through type assertion for testing
      await (botRunner as any).sleep(delayMs);

      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(delayMs - 10);
    });
  });

  describe('Integration with GameEngine', () => {
    it('should work with real game engine', async () => {
      const realEngine = new GameEngine();
      const realRunner = new BotRunner(realEngine, { minDelayMs: 10 });
      const strategy = createMockStrategy(5);

      const result = await realRunner.playTurn(strategy, gameState);

      expect(result.move.row).toBeGreaterThanOrEqual(0);
      expect(result.move.col).toBeGreaterThanOrEqual(0);
      expect(result.move.playerId).toBe(gameState.players[gameState.currentPlayerIndex]);
    });

    it('should handle different game states', async () => {
      const strategy = createMockStrategy();
      
      // Test with different board sizes
      const smallGameState = createTestGameState({ rows: 3, cols: 3 });
      const largeGameState = createTestGameState({ rows: 9, cols: 9 });

      const smallResult = await botRunner.playTurn(strategy, smallGameState);
      const largeResult = await botRunner.playTurn(strategy, largeGameState);

      expect(smallResult.move.row).toBeLessThan(3);
      expect(smallResult.move.col).toBeLessThan(3);
      expect(largeResult.move.row).toBeLessThan(9);
      expect(largeResult.move.col).toBeLessThan(9);
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time bounds', async () => {
      const strategy = createMockStrategy(10);
      const startTime = Date.now();

      await botRunner.playTurn(strategy, gameState);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle rapid successive calls', async () => {
      const strategy = createMockStrategy(5);
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(botRunner.playTurn(strategy, gameState));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.move).toBeDefined();
        expect(result.strategyName).toBe('test-strategy');
      });
    });
  });
});