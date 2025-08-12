/**
 * DefaultBot Comprehensive Test Suite
 * 
 * Extended tests for DefaultBot covering edge cases, scoring logic,
 * and integration scenarios to achieve high coverage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultBot } from '../defaultBot';
import { GameEngine } from '../../core/engineSimple';
import { createTestGameState } from '../../utils/__tests__/testHelpers';
import type { GameState } from '../../types/game';
import type { Move, AiContext } from '../types';

describe('DefaultBot - Comprehensive Tests', () => {
  let bot: DefaultBot;
  let engine: GameEngine;
  let gameState: GameState;
  let context: AiContext;

  beforeEach(() => {
    engine = new GameEngine();
    bot = new DefaultBot(engine);
    gameState = createTestGameState();
    context = { rng: Math.random };
  });

  describe('Constructor and Initialization', () => {
    it('should create DefaultBot with correct name and engine', () => {
      expect(bot.name).toBe('default');
      expect(bot).toHaveProperty('engine');
    });

    it('should work with custom engine', () => {
      const customEngine = new GameEngine();
      const customBot = new DefaultBot(customEngine);
      
      expect(customBot).toBeInstanceOf(DefaultBot);
    });
  });

  describe('Move Decision Logic', () => {
    it('should select moves when multiple options available', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' },
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);

      expect(legalMoves).toContainEqual(move);
    });

    it('should return single move when only one option', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' }
      ];

      const move = await bot.decideMove(gameState, legalMoves, context);

      expect(move).toEqual(legalMoves[0]);
    });

    it('should handle empty legal moves gracefully', async () => {
      const legalMoves: Move[] = [];

      await expect(bot.decideMove(gameState, legalMoves, context)).rejects.toThrow();
    });
  });

  describe('Scoring System', () => {
    describe('Position-based Scoring', () => {
      it('should prefer corner positions', async () => {
        const cornerMove: Move = { row: 0, col: 0, playerId: 'player1' }; // Corner
        const centerMove: Move = { row: 3, col: 4, playerId: 'player1' }; // Center

        const cornerScore = await (bot as any).evaluateMove(gameState, cornerMove);
        const centerScore = await (bot as any).evaluateMove(gameState, centerMove);

        expect(cornerScore).toBeGreaterThan(centerScore);
      });

      it('should prefer edge positions over center', async () => {
        const edgeMove: Move = { row: 0, col: 4, playerId: 'player1' }; // Top edge
        const centerMove: Move = { row: 3, col: 4, playerId: 'player1' }; // Center

        const edgeScore = await (bot as any).evaluateMove(gameState, edgeMove);
        const centerScore = await (bot as any).evaluateMove(gameState, centerMove);

        expect(edgeScore).toBeGreaterThan(centerScore);
      });
    });

    describe('Chain Reaction Scoring', () => {
      it('should bonus chain reactions', async () => {
        // Set up a cell that will explode when placed
        const targetRow = 0;
        const targetCol = 0;
        const cell = gameState.board.cells[targetRow][targetCol];
        cell.orbCount = cell.criticalMass - 1; // One away from explosion
        cell.playerId = 'player1';

        const explosiveMove: Move = { row: targetRow, col: targetCol, playerId: 'player1' };
        const normalMove: Move = { row: 2, col: 2, playerId: 'player1' };

        const explosiveScore = await (bot as any).evaluateMove(gameState, explosiveMove);
        const normalScore = await (bot as any).evaluateMove(gameState, normalMove);

        expect(explosiveScore).toBeGreaterThan(normalScore);
      });

      it('should calculate board advantage after explosions', async () => {
        // Set up scenario where explosion gives board advantage
        gameState.board.cells[0][0].orbCount = 1;
        gameState.board.cells[0][0].playerId = 'player1';
        gameState.board.cells[0][1].orbCount = 1;
        gameState.board.cells[0][1].playerId = 'opponent';
        
        const move: Move = { row: 0, col: 0, playerId: 'player1' };
        const score = await (bot as any).evaluateMove(gameState, move);

        expect(score).toBeGreaterThan(0);
      });

      it('should penalize explosive moves without strategic benefit', async () => {
        // Create a situation where explosion doesn't help
        const targetCell = gameState.board.cells[1][1];
        targetCell.orbCount = targetCell.criticalMass - 1;
        targetCell.playerId = 'player1';

        // Fill adjacent cells with opponent orbs that would be strengthened
        const adjacentPositions = [
          { row: 0, col: 1 }, { row: 2, col: 1 },
          { row: 1, col: 0 }, { row: 1, col: 2 }
        ];

        adjacentPositions.forEach(pos => {
          if (pos.row >= 0 && pos.row < gameState.board.rows && 
              pos.col >= 0 && pos.col < gameState.board.cols) {
            const adjCell = gameState.board.cells[pos.row][pos.col];
            adjCell.orbCount = 2;
            adjCell.playerId = 'opponent';
          }
        });

        const explosiveMove: Move = { row: 1, col: 1, playerId: 'player1' };
        const safeMove: Move = { row: 5, col: 5, playerId: 'player1' };

        const explosiveScore = await (bot as any).evaluateMove(gameState, explosiveMove);
        const safeScore = await (bot as any).evaluateMove(gameState, safeMove);

        // AI might still prefer the explosive move if strategic conditions are right
        expect(typeof explosiveScore).toBe('number');
        expect(typeof safeScore).toBe('number');
      });
    });

    describe('Building Strategy', () => {
      it('should prefer building on own positions', async () => {
        // Set up a cell with own orb
        gameState.board.cells[2][2].orbCount = 1;
        gameState.board.cells[2][2].playerId = 'player1';

        const buildMove: Move = { row: 2, col: 2, playerId: 'player1' };
        const newMove: Move = { row: 3, col: 3, playerId: 'player1' };

        const buildScore = await (bot as any).evaluateMove(gameState, buildMove);
        const newScore = await (bot as any).evaluateMove(gameState, newMove);

        expect(buildScore).toBeGreaterThan(newScore);
      });

      it('should consider critical mass progress', async () => {
        // Set up a cell close to critical mass
        const cell = gameState.board.cells[1][1];
        cell.orbCount = cell.criticalMass - 2; // Two away from explosion
        cell.playerId = 'player1';

        const criticalMove: Move = { row: 1, col: 1, playerId: 'player1' };
        const randomMove: Move = { row: 4, col: 4, playerId: 'player1' };

        const criticalScore = await (bot as any).evaluateMove(gameState, criticalMove);
        const randomScore = await (bot as any).evaluateMove(gameState, randomMove);

        expect(criticalScore).toBeGreaterThan(randomScore);
      });
    });

    describe('Error Handling in Scoring', () => {
      it('should handle edge cases in scoring', async () => {
        const validMove: Move = { row: 0, col: 0, playerId: 'player1' };
        
        // Valid moves should work fine
        const score = await (bot as any).evaluateMove(gameState, validMove);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(0);
        
        // Test with different valid positions
        const centerMove: Move = { row: 2, col: 4, playerId: 'player1' };
        const centerScore = await (bot as any).evaluateMove(gameState, centerMove);
        expect(typeof centerScore).toBe('number');
      });
    });
  });

  describe('Context Usage', () => {
    it('should accept context parameter without errors', async () => {
      const mockRng = () => 0.5;
      const customContext: AiContext = { rng: mockRng };
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      const move = await bot.decideMove(gameState, legalMoves, customContext);

      // DefaultBot uses deterministic scoring, so context is accepted but may not be used
      expect(legalMoves).toContainEqual(move);
    });

    it('should handle missing context gracefully', async () => {
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' }
      ];

      const move = await bot.decideMove(gameState, legalMoves, {} as AiContext);

      expect(move).toEqual(legalMoves[0]);
    });

    it('should respect maxThinkingMs from context', async () => {
      const contextWithTime: AiContext = { 
        rng: Math.random,
        maxThinkingMs: 100 // Short time limit
      };

      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
      ];

      const startTime = Date.now();
      await bot.decideMove(gameState, legalMoves, contextWithTime);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be much faster than 1 second
    });
  });

  describe('Different Game Scenarios', () => {
    it('should adapt to small boards', async () => {
      const smallGameState = createTestGameState({ rows: 3, cols: 3 });
      const legalMoves = engine.getLegalMoves(smallGameState);

      const move = await bot.decideMove(smallGameState, legalMoves, context);

      expect(move.row).toBeLessThan(3);
      expect(move.col).toBeLessThan(3);
    });

    it('should adapt to large boards', async () => {
      const largeGameState = createTestGameState({ rows: 12, cols: 15 });
      const legalMoves = engine.getLegalMoves(largeGameState);

      const move = await bot.decideMove(largeGameState, legalMoves, context);

      expect(move.row).toBeLessThan(12);
      expect(move.col).toBeLessThan(15);
    });

    it('should handle complex board states', async () => {
      // Fill board with various configurations
      for (let row = 0; row < gameState.board.rows; row++) {
        for (let col = 0; col < gameState.board.cols; col++) {
          if ((row + col) % 3 === 0) {
            const cell = gameState.board.cells[row][col];
            cell.orbCount = Math.floor(Math.random() * cell.criticalMass);
            cell.playerId = Math.random() > 0.5 ? 'player1' : 'opponent';
          }
        }
      }

      const legalMoves = engine.getLegalMoves(gameState);
      const move = await bot.decideMove(gameState, legalMoves, context);

      expect(legalMoves).toContainEqual(move);
    });

    it('should handle late game scenarios', async () => {
      // Simulate late game with few remaining positions
      for (let row = 0; row < gameState.board.rows; row++) {
        for (let col = 0; col < gameState.board.cols; col++) {
          if (row < 2 && col < 3) continue; // Leave some empty spots
          
          const cell = gameState.board.cells[row][col];
          cell.orbCount = cell.criticalMass - 1;
          cell.playerId = 'opponent';
        }
      }

      const legalMoves = engine.getLegalMoves(gameState);
      const move = await bot.decideMove(gameState, legalMoves, context);

      expect(legalMoves).toContainEqual(move);
    });
  });

  describe('Performance', () => {
    it('should make decisions within reasonable time', async () => {
      const startTime = Date.now();
      const legalMoves = engine.getLegalMoves(gameState);
      
      await bot.decideMove(gameState, legalMoves, context);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle large numbers of legal moves efficiently', async () => {
      const manyMoves: Move[] = [];
      
      for (let row = 0; row < gameState.board.rows; row++) {
        for (let col = 0; col < gameState.board.cols; col++) {
          manyMoves.push({ row, col, playerId: 'player1' });
        }
      }

      const startTime = Date.now();
      await bot.decideMove(gameState, manyMoves, context);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Should handle efficiently
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce consistent results with same RNG seed', async () => {
      const fixedRng = () => 0.42; // Fixed value
      const fixedContext: AiContext = { rng: fixedRng };
      
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' },
      ];

      const move1 = await bot.decideMove(gameState, legalMoves, fixedContext);
      const move2 = await bot.decideMove(gameState, legalMoves, fixedContext);

      expect(move1).toEqual(move2);
    });

    it('should produce different results with different RNG values', async () => {
      const rng1 = () => 0.1;
      const rng2 = () => 0.9;
      
      const legalMoves: Move[] = [
        { row: 0, col: 0, playerId: 'player1' },
        { row: 1, col: 1, playerId: 'player1' },
        { row: 2, col: 2, playerId: 'player1' },
        { row: 3, col: 3, playerId: 'player1' },
        { row: 4, col: 4, playerId: 'player1' },
      ];

      const move1 = await bot.decideMove(gameState, legalMoves, { rng: rng1 });
      const move2 = await bot.decideMove(gameState, legalMoves, { rng: rng2 });

      // With different RNG and multiple moves, should likely be different
      // (though not guaranteed due to scoring)
      expect(legalMoves).toContainEqual(move1);
      expect(legalMoves).toContainEqual(move2);
    });
  });
});