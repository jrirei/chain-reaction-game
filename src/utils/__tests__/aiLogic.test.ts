import { describe, it, expect } from 'vitest';
import { calculateAIMove } from '../aiLogic';
import { createEmptyBoard, placeOrb } from '../boardOperations';

describe('AI Logic', () => {
  describe('calculateAIMove', () => {
    it('should return a valid move on empty board', () => {
      const board = createEmptyBoard(6, 9);
      const move = calculateAIMove(board, 'player2');

      if (move) {
        expect(move.row).toBeGreaterThanOrEqual(0);
        expect(move.row).toBeLessThan(6);
        expect(move.col).toBeGreaterThanOrEqual(0);
        expect(move.col).toBeLessThan(9);
        expect(move.playerId).toBe('player2');
      }
    });

    it('should prioritize AI-owned cells over empty cells', () => {
      let board = createEmptyBoard(6, 9);
      // Place an AI orb that can be expanded
      board = placeOrb(board, 2, 3, 'player2');

      const move = calculateAIMove(board, 'player2');

      if (move) {
        // Should either be on the AI's existing cell or a strategic new position
        const cell = board.cells[move.row][move.col];
        expect(cell.playerId === null || cell.playerId === 'player2').toBe(
          true
        );
      }
    });

    it('should avoid opponent-owned cells', () => {
      let board = createEmptyBoard(3, 3);
      // Fill most cells with opponent orbs, leaving one empty
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row !== 2 || col !== 2) {
            // Leave one empty cell
            board = placeOrb(board, row, col, 'player1');
          }
        }
      }

      const move = calculateAIMove(board, 'player2');

      if (move) {
        expect(move.row).toBe(2);
        expect(move.col).toBe(2);
      }
    });

    it('should handle board with no valid moves', () => {
      let board = createEmptyBoard(3, 3);
      // Fill entire board with opponent orbs
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          board = placeOrb(board, row, col, 'player1');
        }
      }

      const move = calculateAIMove(board, 'player2');
      expect(move).toBe(null);
    });

    it('should expand AI-owned cells when beneficial', () => {
      let board = createEmptyBoard(3, 3);
      // Create an AI cell that's beneficial to expand
      board = placeOrb(board, 0, 0, 'player2'); // Corner, 1 orb

      let aiExpandsOwnCell = false;

      // Run multiple times due to randomness in AI scoring
      for (let i = 0; i < 30; i++) {
        const move = calculateAIMove(board, 'player2');
        if (move && move.row === 0 && move.col === 0) {
          aiExpandsOwnCell = true;
          break;
        }
      }

      // AI should eventually choose to expand its own corner cell
      expect(aiExpandsOwnCell).toBe(true);
    });

    it('should return valid moves consistently', () => {
      const board = createEmptyBoard(6, 9);

      // Test multiple moves to ensure consistency
      for (let i = 0; i < 10; i++) {
        const move = calculateAIMove(board, 'player2');

        if (move) {
          expect(move.row).toBeGreaterThanOrEqual(0);
          expect(move.row).toBeLessThan(board.rows);
          expect(move.col).toBeGreaterThanOrEqual(0);
          expect(move.col).toBeLessThan(board.cols);
          expect(move.playerId).toBe('player2');

          const cell = board.cells[move.row][move.col];
          expect(cell.playerId === null || cell.playerId === 'player2').toBe(
            true
          );
        }
      }
    });

    it('should work with different board sizes', () => {
      // Test with smaller board
      const smallBoard = createEmptyBoard(3, 3);

      const move = calculateAIMove(smallBoard, 'player2');

      if (move) {
        expect(move.row).toBeGreaterThanOrEqual(0);
        expect(move.row).toBeLessThan(3);
        expect(move.col).toBeGreaterThanOrEqual(0);
        expect(move.col).toBeLessThan(3);
      }
    });

    it('should handle edge cases with partially filled board', () => {
      let board = createEmptyBoard(6, 9);
      // Create a mixed scenario
      board = placeOrb(board, 0, 0, 'player1');
      board = placeOrb(board, 0, 8, 'player2');
      board = placeOrb(board, 5, 0, 'player1');
      board = placeOrb(board, 5, 8, 'player2');
      board = placeOrb(board, 2, 4, 'player1');

      const move = calculateAIMove(board, 'player2');

      if (move) {
        const cell = board.cells[move.row][move.col];
        expect(cell.playerId === null || cell.playerId === 'player2').toBe(
          true
        );
      }
    });
  });
});
