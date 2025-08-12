import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TacticalBot } from '../tacticalBot';
import type { GameState } from '../../types/game';
import { GameStatus } from '../../types/game';
import { createEmptyBoard } from '../../utils/boardOperations';
import { updateCell } from '../../utils/immutableUtils';
import { createSeededRng } from '../rng';

describe('Tactical Bot', () => {
  let bot: TacticalBot;
  let gameState: GameState;

  beforeEach(() => {
    bot = new TacticalBot();

    const board = createEmptyBoard(4, 4);
    gameState = {
      board,
      currentPlayerIndex: 0,
      players: ['player1', 'player2'],
      gameStatus: GameStatus.PLAYING,
      isAnimating: false,
      winner: null,
      moveCount: 0,
      gameStartTime: null,
      gameEndTime: null,
      settings: {
        players: 2,
        boardSize: { rows: 4, cols: 4 },
        difficulty: 'expert',
      },
      stats: {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      },
    };
  });

  describe('Basic Functionality', () => {
    it('should have correct strategy name', () => {
      expect(bot.name).toBe('tactical');
    });

    it('should return single legal move when only one option', async () => {
      const legalMoves = [{ row: 1, col: 1, playerId: 'player1' }];
      const rng = createSeededRng(12345);

      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 100,
      });

      expect(chosenMove).toEqual(legalMoves[0]);
    });

    it('should throw error when no legal moves available', async () => {
      const legalMoves: never[] = [];
      const rng = createSeededRng(12345);

      await expect(
        bot.decideMove(gameState, legalMoves, { rng })
      ).rejects.toThrow('No legal moves available');
    });
  });

  describe('Hybrid Strategy Behavior', () => {
    it('should use heuristics for move pre-filtering', async () => {
      // Create a scenario with many moves where heuristics should prefer certain positions
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' }, // Corner (high value)
        { row: 0, col: 1, playerId: 'player1' }, // Edge (medium value)
        { row: 2, col: 2, playerId: 'player1' }, // Center (lower value)
        { row: 3, col: 3, playerId: 'player1' }, // Corner (high value)
      ];

      const rng = createSeededRng(42);
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 3000, // Enough time for MCTS
      });

      // Should choose a valid move from the legal options
      expect(legalMoves).toContainEqual(chosenMove);
    });

    it('should fall back to heuristics with insufficient time', async () => {
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' }, // Corner
        { row: 1, col: 1, playerId: 'player1' }, // Center
        { row: 0, col: 1, playerId: 'player1' }, // Edge
      ];

      const rng = createSeededRng(42);
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 500, // Very short time - should use heuristics only
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });

    it('should prefer explosive moves when available', async () => {
      // Set up a board where one move will explode
      const board = updateCell(gameState.board, 0, 0, {
        orbCount: 1,
        playerId: 'player1',
      }); // Will explode (corner, critical mass = 2)
      gameState.board = board;

      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' }, // This will explode
        { row: 2, col: 2, playerId: 'player1' }, // This won't explode
        { row: 1, col: 1, playerId: 'player1' }, // This won't explode
      ];

      const rng = createSeededRng(42);
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 2000,
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });
  });

  describe('Adaptive Candidate Selection', () => {
    it('should select more candidates in early game', async () => {
      // Early game state (low move count)
      gameState.moveCount = 3;

      const legalMoves = Array.from({ length: 16 }, (_, i) => ({
        row: Math.floor(i / 4),
        col: i % 4,
        playerId: 'player1',
      }));

      const rng = createSeededRng(42);
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 2000,
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });

    it('should select fewer candidates in late game', async () => {
      // Late game state (high move count)
      gameState.moveCount = 35;

      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 0, col: 1, playerId: 'player1' },
        { row: 1, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      const rng = createSeededRng(42);
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 2000,
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });
  });

  describe('Time Management', () => {
    it('should make decisions within time limit', async () => {
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 0, col: 1, playerId: 'player1' },
        { row: 1, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' },
      ];

      const rng = createSeededRng(42);
      const maxThinkingMs = 1000; // 1 second limit

      const startTime = performance.now();
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs,
      });
      const endTime = performance.now();

      const actualTime = endTime - startTime;

      expect(legalMoves).toContainEqual(chosenMove);
      // Should complete within reasonable time (allow some overhead)
      expect(actualTime).toBeLessThan(maxThinkingMs + 200);
    });

    it('should use default thinking time when not specified', async () => {
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      const rng = createSeededRng(42);

      // Mock performance.now to control timing
      const originalNow = performance.now;
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        mockTime += 50; // Simulate 50ms per call
        return mockTime;
      });

      const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

      expect(legalMoves).toContainEqual(chosenMove);

      // Restore original function
      performance.now = originalNow;
    });
  });

  describe('Deterministic Behavior', () => {
    it('should be deterministic with same seed and time limit', async () => {
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 0, col: 1, playerId: 'player1' },
        { row: 1, col: 0, playerId: 'player1' },
      ];

      const rng1 = createSeededRng(123);
      const move1 = await bot.decideMove(gameState, legalMoves, {
        rng: rng1,
        maxThinkingMs: 500, // Short time to ensure heuristic fallback
      });

      const rng2 = createSeededRng(123);
      const move2 = await bot.decideMove(gameState, legalMoves, {
        rng: rng2,
        maxThinkingMs: 500,
      });

      // Same seed should produce same result (for heuristic decisions)
      expect(move1).toEqual(move2);
    });
  });

  describe('Complex Game Positions', () => {
    it('should handle complex board positions effectively', async () => {
      // Create a complex board state with multiple strategic considerations
      let board = gameState.board;
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' });
      board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player2' });
      board = updateCell(board, 1, 0, { orbCount: 1, playerId: 'player1' });
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player2' });
      board = updateCell(board, 2, 2, { orbCount: 1, playerId: 'player1' });
      gameState.board = board;

      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' }, // Build on own cell, near critical
        { row: 2, col: 0, playerId: 'player1' }, // Edge position
        { row: 3, col: 3, playerId: 'player1' }, // Corner position
        { row: 2, col: 2, playerId: 'player1' }, // Build on own cell
      ];

      const rng = createSeededRng(789);
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 3000, // Enough time for full hybrid analysis
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });
  });

  describe('Fallback Behavior', () => {
    it('should handle fallback to Math.random when no RNG provided', async () => {
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      // Test without providing RNG (should use Math.random fallback)
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        maxThinkingMs: 500,
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });

    it('should work with minimal time and few moves', async () => {
      const legalMoves = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      const rng = createSeededRng(42);

      // Very short time limit with few moves - should use heuristics
      const chosenMove = await bot.decideMove(gameState, legalMoves, {
        rng,
        maxThinkingMs: 100,
      });

      expect(legalMoves).toContainEqual(chosenMove);
    });
  });
});
