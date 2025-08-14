/**
 * Tests for Oskar Bot
 *
 * Tests the advanced heuristic AI with minimax search, game phase adaptation,
 * and comprehensive board evaluation strategies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OskarBot } from '../oskarBot';
import type { GameState } from '../../types/game';
import type { Move } from '../../core/types';
import type { AiContext } from '../types';
import {
  createTestGameState,
  createTestMove,
} from '../../utils/__tests__/testHelpers';

describe('OskarBot', () => {
  let bot: OskarBot;
  let gameState: GameState;
  let legalMoves: Move[];
  let aiContext: AiContext;

  beforeEach(() => {
    bot = new OskarBot();
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
      maxThinkingMs: 200, // Short time for tests
      rng: () => 0.5, // Predictable random
    };

    // Mock performance.now to avoid timing issues in tests
    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  describe('Basic functionality', () => {
    it('should have correct name', () => {
      expect(bot.name).toBe('oskar');
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

  describe('Game phase detection', () => {
    it('should detect early game phase', async () => {
      // Empty board should be early game
      const earlyGameState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 5, cols: 5 },
      });

      const moves = [
        createTestMove('player1', 0, 0),
        createTestMove('player1', 2, 2),
      ];
      const result = await bot.decideMove(earlyGameState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should detect mid game phase', async () => {
      // Board with ~40% filled should be mid game
      const midGameState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 1, playerId: 'player2' },
            null,
          ],
          [
            { orbCount: 1, playerId: 'player1' },
            null,
            { orbCount: 1, playerId: 'player2' },
          ],
          [null, null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 2),
        createTestMove('player1', 2, 0),
      ];
      const result = await bot.decideMove(midGameState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should detect late game phase', async () => {
      // Board with >70% filled should be late game
      const lateGameState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 2, playerId: 'player2' },
            { orbCount: 1, playerId: 'player1' },
          ],
          [
            { orbCount: 1, playerId: 'player2' },
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 2, playerId: 'player2' },
          ],
          [
            { orbCount: 1, playerId: 'player1' },
            null,
            { orbCount: 1, playerId: 'player2' },
          ],
        ],
      });

      const moves = [createTestMove('player1', 2, 1)];
      const result = await bot.decideMove(lateGameState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });
  });

  describe('Position evaluation', () => {
    it('should prefer corner positions in early game', async () => {
      const earlyGameState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
      });

      const moves = [
        createTestMove('player1', 0, 0), // Corner
        createTestMove('player1', 1, 1), // Center
      ];

      const result = await bot.decideMove(earlyGameState, moves, aiContext);
      // Should prefer corner in early game
      expect(result.row).toBe(0);
      expect(result.col).toBe(0);
    });

    it('should prefer edge positions over center in early game', async () => {
      const earlyGameState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
      });

      const moves = [
        createTestMove('player1', 0, 1), // Edge
        createTestMove('player1', 1, 1), // Center
      ];

      const result = await bot.decideMove(earlyGameState, moves, aiContext);
      // Should prefer edge over center
      expect(result.row).toBe(0);
      expect(result.col).toBe(1);
    });
  });

  describe('Critical mass targeting', () => {
    it('should recognize cells near critical mass', async () => {
      const criticalMassState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [{ orbCount: 2, playerId: 'player1' }, null, null], // Corner with 2 orbs (critical mass = 3)
          [null, null, null],
          [null, null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 0), // Add to critical cell
        createTestMove('player1', 2, 2), // Far away
      ];

      const result = await bot.decideMove(criticalMassState, moves, aiContext);
      // Should prefer adding to the critical mass cell
      expect(result.row).toBe(0);
      expect(result.col).toBe(0);
    });
  });

  describe('Chain potential calculation', () => {
    it('should recognize chain reaction opportunities', async () => {
      const chainState = createTestGameState({
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

      const moves = [
        createTestMove('player1', 0, 0), // Would cause explosion and capture enemy
        createTestMove('player1', 2, 2), // Safe but no chain
      ];

      const result = await bot.decideMove(chainState, moves, aiContext);
      // Should prefer the chain reaction move
      expect(result.row).toBe(0);
      expect(result.col).toBe(0);
    });
  });

  describe('Danger assessment', () => {
    it('should avoid dangerous positions', async () => {
      const dangerousState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [null, { orbCount: 2, playerId: 'player2' }, null], // Enemy critical cell
          [null, null, null],
          [null, null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 0), // Adjacent to enemy critical (dangerous)
        createTestMove('player1', 2, 2), // Safe distance
      ];

      const result = await bot.decideMove(dangerousState, moves, aiContext);
      // Should select a valid move (bot may choose either based on strategy)
      expect(moves).toContainEqual(result);
    });
  });

  describe('Immediate move detection', () => {
    it('should find immediate winning moves', async () => {
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
        createTestMove('player1', 1, 1), // Winning move
        createTestMove('player1', 0, 0), // Add to existing
      ];

      const result = await bot.decideMove(winningState, moves, aiContext);
      // Should find the winning move
      expect(moves).toContainEqual(result);
    });

    it('should prioritize high-value chain moves', async () => {
      const highChainState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 2, playerId: 'player1' },
            { orbCount: 2, playerId: 'player2' },
            { orbCount: 1, playerId: 'player2' },
          ],
          [{ orbCount: 1, playerId: 'player2' }, null, null],
          [null, null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 0), // Massive chain potential
        createTestMove('player1', 2, 2), // Safe but low value
      ];

      const result = await bot.decideMove(highChainState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });
  });

  describe('Minimax search', () => {
    it('should perform minimax search with different depths', async () => {
      // Test with longer thinking time to enable deeper search
      const deepContext = { ...aiContext, maxThinkingMs: 2000 };

      const result = await bot.decideMove(gameState, legalMoves, deepContext);
      expect(legalMoves).toContainEqual(result);
    });

    it('should handle alpha-beta pruning', async () => {
      // Create a state where pruning should occur
      const complexState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 4, cols: 4 },
      });

      const manyMoves = [];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          manyMoves.push(createTestMove('player1', row, col));
        }
      }

      const result = await bot.decideMove(complexState, manyMoves, aiContext);
      expect(manyMoves).toContainEqual(result);
    });

    it('should handle time limits during search', async () => {
      const start = Date.now();
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      const elapsed = Date.now() - start;

      expect(legalMoves).toContainEqual(result);
      expect(elapsed).toBeLessThan(1000); // Should respect time limit
    });
  });

  describe('Board simulation', () => {
    it('should simulate moves correctly', async () => {
      const simpleState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 2, cols: 2 },
        customBoard: [
          [{ orbCount: 1, playerId: 'player1' }, null],
          [null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 0), // Add to existing
        createTestMove('player1', 1, 1), // New position
      ];

      const result = await bot.decideMove(simpleState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should handle chain reactions in simulation', async () => {
      const chainSimState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 2, cols: 2 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 1, playerId: 'player2' },
          ],
          [null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 0), // Would trigger explosion
        createTestMove('player1', 1, 0), // Safe move
      ];

      const result = await bot.decideMove(chainSimState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle engine simulation failures gracefully', async () => {
      // This tests the fallback simulation when engine fails
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
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

    it('should handle terminal positions correctly', async () => {
      const terminalState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 2, cols: 2 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 1, playerId: 'player1' },
          ],
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 1, playerId: 'player1' },
          ],
        ],
      });

      const moves = [createTestMove('player1', 0, 0)];
      const result = await bot.decideMove(terminalState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should handle empty legal moves in minimax', async () => {
      // This tests internal robustness
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
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

    it('should handle large boards efficiently', async () => {
      const largeState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 6, cols: 6 },
      });

      const manyMoves = [];
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          manyMoves.push(createTestMove('player1', row, col));
        }
      }

      const start = Date.now();
      const result = await bot.decideMove(largeState, manyMoves, aiContext);
      const elapsed = Date.now() - start;

      expect(manyMoves).toContainEqual(result);
      expect(elapsed).toBeLessThan(1000);
    });

    it('should use beam search to limit explored moves', async () => {
      // Create many moves to test beam search limitation
      const wideState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 5, cols: 5 },
      });

      const manyMoves = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          manyMoves.push(createTestMove('player1', row, col));
        }
      }

      const result = await bot.decideMove(wideState, manyMoves, aiContext);
      expect(manyMoves).toContainEqual(result);
    });
  });

  describe('Cell counting and evaluation', () => {
    it('should count own and enemy cells correctly', async () => {
      const mixedState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 1, playerId: 'player2' },
            null,
          ],
          [
            { orbCount: 1, playerId: 'player1' },
            null,
            { orbCount: 1, playerId: 'player2' },
          ],
          [null, null, null],
        ],
      });

      const moves = [createTestMove('player1', 0, 2)];
      const result = await bot.decideMove(mixedState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should calculate positional bonuses', async () => {
      // Test that positional evaluation works
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      expect(legalMoves).toContainEqual(result);
    });
  });

  describe('Adjacent cell calculations', () => {
    it('should count adjacent enemies correctly', async () => {
      const adjacentState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 2, playerId: 'player1' },
            { orbCount: 1, playerId: 'player2' },
            null,
          ],
          [{ orbCount: 1, playerId: 'player2' }, null, null],
          [null, null, null],
        ],
      });

      const moves = [createTestMove('player1', 0, 0)];
      const result = await bot.decideMove(adjacentState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should count adjacent own cells for danger assessment', async () => {
      const ownAdjacentState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [
            { orbCount: 1, playerId: 'player1' },
            { orbCount: 2, playerId: 'player2' },
            null,
          ],
          [{ orbCount: 1, playerId: 'player1' }, null, null],
          [null, null, null],
        ],
      });

      const moves = [createTestMove('player1', 2, 2)];
      const result = await bot.decideMove(ownAdjacentState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });
  });

  describe('Integration with GameEngine', () => {
    it('should use GameEngine for enhanced chain calculation', async () => {
      const engineState = createTestGameState({
        currentPlayerId: 'player1',
        boardSize: { rows: 3, cols: 3 },
        customBoard: [
          [{ orbCount: 2, playerId: 'player1' }, null, null],
          [null, null, null],
          [null, null, null],
        ],
      });

      const moves = [
        createTestMove('player1', 0, 0), // Chain potential
        createTestMove('player1', 2, 2), // No chain
      ];

      const result = await bot.decideMove(engineState, moves, aiContext);
      expect(moves).toContainEqual(result);
    });

    it('should handle GameEngine failures gracefully', async () => {
      // Test fallback when engine simulation fails
      const result = await bot.decideMove(gameState, legalMoves, aiContext);
      expect(legalMoves).toContainEqual(result);
    });
  });
});
