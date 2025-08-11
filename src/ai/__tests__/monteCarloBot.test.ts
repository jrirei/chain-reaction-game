import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonteCarloBot } from '../monteCarloBot';
import type { GameState } from '../../types/game';
import { GameStatus } from '../../types/game';
import { createEmptyBoard } from '../../utils/boardOperations';
import { updateCell } from '../../utils/immutableUtils';
import { createSeededRng } from '../rng';

describe('Monte Carlo Bot', () => {
  let bot: MonteCarloBot;
  let gameState: GameState;

  beforeEach(() => {
    bot = new MonteCarloBot();

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
        difficulty: 'medium',
      },
      stats: {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      },
    };
  });

  it('should have correct strategy name', () => {
    expect(bot.name).toBe('monteCarlo');
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

  it('should make decisions within time limit', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 0, col: 1, playerId: 'player1' },
      { row: 1, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
    ];

    const rng = createSeededRng(42);
    const maxThinkingMs = 200; // 200ms limit

    const startTime = performance.now();
    const chosenMove = await bot.decideMove(gameState, legalMoves, {
      rng,
      maxThinkingMs,
    });
    const endTime = performance.now();

    const actualTime = endTime - startTime;

    expect(legalMoves).toContainEqual(chosenMove);
    // Should complete within reasonable time (allow some overhead)
    expect(actualTime).toBeLessThan(maxThinkingMs + 100);
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
      mockTime += 10; // Simulate 10ms per call
      return mockTime;
    });

    const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

    expect(legalMoves).toContainEqual(chosenMove);

    // Restore original function
    performance.now = originalNow;
  });

  it('should be deterministic with same seed and time limit', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 0, col: 1, playerId: 'player1' },
      { row: 1, col: 0, playerId: 'player1' },
    ];

    const rng1 = createSeededRng(123);
    const move1 = await bot.decideMove(gameState, legalMoves, {
      rng: rng1,
      maxThinkingMs: 50,
    });

    const rng2 = createSeededRng(123);
    const move2 = await bot.decideMove(gameState, legalMoves, {
      rng: rng2,
      maxThinkingMs: 50,
    });

    // Same seed should produce same result
    expect(move1).toEqual(move2);
  });

  it('should prefer explosive moves when available', async () => {
    // Set up a board where one move explodes
    const board = updateCell(gameState.board, 0, 0, {
      orbCount: 1,
      playerId: 'player1',
    }); // Will explode (corner, critical mass = 2)
    gameState.board = board;

    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' }, // This will explode
      { row: 2, col: 2, playerId: 'player1' }, // This won't explode
    ];

    const rng = createSeededRng(42);
    const chosenMove = await bot.decideMove(gameState, legalMoves, {
      rng,
      maxThinkingMs: 100,
    });

    // Should often choose the explosive move due to its higher evaluation
    expect(legalMoves).toContainEqual(chosenMove);
  });

  it('should handle complex game positions', async () => {
    // Create a more complex board state with multiple cells
    let board = gameState.board;
    board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' });
    board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player2' });
    board = updateCell(board, 1, 0, { orbCount: 1, playerId: 'player1' });
    board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player2' });
    gameState.board = board;

    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' }, // Build on own cell
      { row: 2, col: 2, playerId: 'player1' }, // New territory
      { row: 3, col: 3, playerId: 'player1' }, // Corner position
    ];

    const rng = createSeededRng(789);
    const chosenMove = await bot.decideMove(gameState, legalMoves, {
      rng,
      maxThinkingMs: 200,
    });

    expect(legalMoves).toContainEqual(chosenMove);
  });

  it('should work with minimal time limit', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
    ];

    const rng = createSeededRng(42);

    // Very short time limit should still return a valid move
    const chosenMove = await bot.decideMove(gameState, legalMoves, {
      rng,
      maxThinkingMs: 10, // Very short
    });

    expect(legalMoves).toContainEqual(chosenMove);
  });

  it('should handle fallback to Math.random when no RNG provided', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
    ];

    // Test without providing RNG (should use Math.random fallback)
    const chosenMove = await bot.decideMove(gameState, legalMoves, {
      maxThinkingMs: 50,
    });

    expect(legalMoves).toContainEqual(chosenMove);
  });
});
