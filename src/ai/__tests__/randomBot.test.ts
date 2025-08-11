import { describe, it, expect, beforeEach } from 'vitest';
import { RandomBot } from '../randomBot';
import type { GameState } from '../../types/game';
import { GameStatus } from '../../types/game';
import { createEmptyBoard } from '../../utils/boardOperations';
import { createSeededRng } from '../rng';

describe('Random Bot', () => {
  let bot: RandomBot;
  let gameState: GameState;

  beforeEach(() => {
    bot = new RandomBot();

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
    expect(bot.name).toBe('random');
  });

  it('should select single legal move when only one option', async () => {
    const legalMoves = [{ row: 1, col: 1, playerId: 'player1' }];
    const rng = createSeededRng(12345);

    const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

    expect(chosenMove).toEqual(legalMoves[0]);
  });

  it('should throw error when no legal moves available', async () => {
    const legalMoves: never[] = [];
    const rng = createSeededRng(12345);

    await expect(
      bot.decideMove(gameState, legalMoves, { rng })
    ).rejects.toThrow('No legal moves available');
  });

  it('should select moves with deterministic randomness using seeded RNG', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 0, col: 1, playerId: 'player1' },
      { row: 1, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
    ];

    // Test with fixed seed for deterministic behavior
    const rng1 = createSeededRng(42);
    const move1 = await bot.decideMove(gameState, legalMoves, { rng: rng1 });

    const rng2 = createSeededRng(42);
    const move2 = await bot.decideMove(gameState, legalMoves, { rng: rng2 });

    // Same seed should produce same result
    expect(move1).toEqual(move2);
    expect(legalMoves).toContainEqual(move1);
  });

  it('should distribute selections across all legal moves with different seeds', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 0, col: 1, playerId: 'player1' },
      { row: 1, col: 0, playerId: 'player1' },
    ];

    const selectedMoves = new Set();

    // Try multiple different seeds to see different selections
    for (let seed = 0; seed < 20; seed++) {
      const rng = createSeededRng(seed);
      const move = await bot.decideMove(gameState, legalMoves, { rng });
      selectedMoves.add(`${move.row},${move.col}`);
    }

    // Should have selected different moves with different seeds
    expect(selectedMoves.size).toBeGreaterThan(1);
  });

  it('should work with fallback to Math.random when no RNG provided', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
    ];

    // Test without providing RNG (should use Math.random fallback)
    const chosenMove = await bot.decideMove(gameState, legalMoves, {});

    expect(legalMoves).toContainEqual(chosenMove);
  });

  it('should select different moves with different RNG values', async () => {
    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
      { row: 2, col: 2, playerId: 'player1' },
    ];

    // Create RNG that always returns 0.1 (should select first move)
    const rng1 = () => 0.1;
    const move1 = await bot.decideMove(gameState, legalMoves, { rng: rng1 });

    // Create RNG that always returns 0.9 (should select last move)
    const rng2 = () => 0.9;
    const move2 = await bot.decideMove(gameState, legalMoves, { rng: rng2 });

    expect(move1).toEqual(legalMoves[0]);
    expect(move2).toEqual(legalMoves[2]);
  });
});
