import { describe, it, expect, beforeEach } from 'vitest';
import { TriggerBot } from '../triggerBot';
import type { GameState } from '../../types/game';
import { GameStatus } from '../../types/game';
import { createEmptyBoard } from '../../utils/boardOperations';
import { updateCell } from '../../utils/immutableUtils';
import { createSeededRng } from '../rng';

describe('Trigger Bot', () => {
  let bot: TriggerBot;
  let gameState: GameState;
  const rng = createSeededRng(12345);

  beforeEach(() => {
    bot = new TriggerBot();

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
    expect(bot.name).toBe('trigger');
  });

  it('should choose explosive moves over non-explosive ones', async () => {
    // Set up a board where one move explodes and others don't
    const board = updateCell(gameState.board, 0, 0, {
      orbCount: 1,
      playerId: 'player1',
    }); // Will explode (corner, critical mass = 2)
    gameState.board = board;

    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' }, // This will explode
      { row: 1, col: 1, playerId: 'player1' }, // This won't explode
      { row: 2, col: 2, playerId: 'player1' }, // This won't explode
    ];

    const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

    // Should choose the explosive move
    expect(chosenMove.row).toBe(0);
    expect(chosenMove.col).toBe(0);
  });

  it('should prioritize moves closer to critical mass when no explosions available', async () => {
    // Set up board with cells at different distances from critical mass
    let board = updateCell(gameState.board, 0, 0, {
      orbCount: 1,
      playerId: 'player1',
    }); // Corner: 1 away from explosion
    board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player1' }); // Edge: 2 away from explosion
    board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' }); // Center: 3 away from explosion
    gameState.board = board;

    const legalMoves = [
      { row: 0, col: 0, playerId: 'player1' }, // Corner - closest to explosion
      { row: 0, col: 1, playerId: 'player1' }, // Edge - middle distance
      { row: 1, col: 1, playerId: 'player1' }, // Center - farthest from explosion
    ];

    const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

    // Should prefer the corner (closest to critical mass)
    expect(chosenMove.row).toBe(0);
    expect(chosenMove.col).toBe(0);
  });

  it('should handle single legal move', async () => {
    const legalMoves = [{ row: 1, col: 1, playerId: 'player1' }];

    const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

    expect(chosenMove).toEqual(legalMoves[0]);
  });

  it('should throw error when no legal moves available', async () => {
    const legalMoves: never[] = [];

    await expect(
      bot.decideMove(gameState, legalMoves, { rng })
    ).rejects.toThrow('No legal moves available');
  });

  it('should prefer building on own cells vs neutral cells', async () => {
    // Set up board with own cell vs neutral cell options
    const board = updateCell(gameState.board, 1, 1, {
      orbCount: 1,
      playerId: 'player1',
    }); // Own cell
    gameState.board = board;

    const legalMoves = [
      { row: 1, col: 1, playerId: 'player1' }, // Build on own cell
      { row: 2, col: 2, playerId: 'player1' }, // Neutral cell
    ];

    const chosenMove = await bot.decideMove(gameState, legalMoves, { rng });

    // Should prefer building on existing position
    expect(chosenMove.row).toBe(1);
    expect(chosenMove.col).toBe(1);
  });
});
