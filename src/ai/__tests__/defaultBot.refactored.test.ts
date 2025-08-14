/**
 * DefaultBot Tests - Updated for Refactored Architecture
 *
 * Tests the DefaultBot using the new shared evaluation system.
 * Focuses on public API behavior rather than internal implementation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultBot } from '../defaultBot';
import { createTestGameState } from '../../utils/__tests__/testHelpers';
import type { GameState } from '../../types/game';
import type { Move, AiContext } from '../types';

describe('DefaultBot - Refactored Architecture', () => {
  let bot: DefaultBot;
  let gameState: GameState;
  let context: AiContext;

  beforeEach(() => {
    bot = new DefaultBot();
    gameState = createTestGameState();
    context = { rng: Math.random };
  });

  describe('Constructor and Basic Properties', () => {
    it('should create DefaultBot with correct name', () => {
      expect(bot.name).toBe('default');
      expect(bot).toBeInstanceOf(DefaultBot);
    });
  });

  describe('Move Decision Logic', () => {
    it('should select a move when multiple options available', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' },
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);
      expect(legalMoves).toContain(move);
      expect(move.playerId).toBe('player1');
    });

    it('should return the only move when only one option available', async () => {
      const legalMoves: Move[] = [{ row: 0, col: 0, playerId: 'player1' }];

      const move = await bot.decideMove(gameState, legalMoves, context);
      expect(move).toEqual(legalMoves[0]);
    });

    it('should throw error when no legal moves available', async () => {
      const legalMoves: Move[] = [];

      await expect(
        bot.decideMove(gameState, legalMoves, context)
      ).rejects.toThrow('No legal moves available');
    });
  });

  describe('Integration with Shared Evaluation System', () => {
    it('should make consistent decisions for identical game states', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      // Use seeded RNG for deterministic results
      const deterministicContext: AiContext = {
        rng: () => 0.5, // Fixed value for consistency
      };

      const move1 = await bot.decideMove(
        gameState,
        legalMoves,
        deterministicContext
      );
      const move2 = await bot.decideMove(
        gameState,
        legalMoves,
        deterministicContext
      );

      expect(move1).toEqual(move2);
    });

    it('should handle corner positions', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' }, // Corner
        { row: 3, col: 4, playerId: 'player1' }, // Center
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);
      expect(legalMoves).toContain(move);
    });

    it('should handle critical mass situations', async () => {
      // Set up a cell near critical mass
      gameState.board.cells[1][1].orbCount = 3;
      gameState.board.cells[1][1].playerId = 'player1';
      gameState.board.cells[1][1].criticalMass = 4;

      const legalMoves: Move[] = [
        { row: 1, col: 1, playerId: 'player1' }, // Will cause explosion
        { row: 2, col: 2, playerId: 'player1' }, // Normal move
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);
      expect(legalMoves).toContain(move);
    });
  });

  describe('Performance and Reliability', () => {
    it('should complete move decision within reasonable time', async () => {
      const legalMoves: Move[] = Array.from({ length: 20 }, (_, i) => ({
        row: Math.floor(i / 5),
        col: i % 5,
        playerId: 'player1',
      }));

      const startTime = Date.now();
      const move = await bot.decideMove(gameState, legalMoves, context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
      expect(legalMoves).toContain(move);
    });

    it('should handle different player IDs correctly', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player2' },
        { row: 1, col: 1, playerId: 'player2' },
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);
      expect(move.playerId).toBe('player2');
      expect(legalMoves).toContain(move);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty board correctly', async () => {
      // Create empty board state
      const emptyGameState = createTestGameState();

      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' },
      ];

      const move = await bot.decideMove(emptyGameState, legalMoves, context);
      expect(legalMoves).toContain(move);
    });

    it('should handle board with existing orbs', async () => {
      // Add some orbs to the board
      gameState.board.cells[0][0].orbCount = 2;
      gameState.board.cells[0][0].playerId = 'player2';
      gameState.board.cells[2][2].orbCount = 1;
      gameState.board.cells[2][2].playerId = 'player1';

      const legalMoves: Move[] = [
        { row: 1, col: 1, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' }, // Can build on own cell
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);
      expect(legalMoves).toContain(move);
    });
  });
});
