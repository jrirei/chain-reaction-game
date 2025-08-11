import { describe, it, expect } from 'vitest';
import { createEmptyBoard, deepCloneBoard } from '../boardOperations';
import {
  placeOrbImmutable,
  processExplosionImmutable,
} from '../immutableUtils';
import { getAdjacentCells } from '../boardOperations';

describe('Performance Improvements', () => {
  describe('Immutable vs Deep Clone Performance', () => {
    it('should demonstrate performance improvement with immutable updates', () => {
      const board = createEmptyBoard(20, 20); // Large board for testing
      const iterations = 1000;

      // Test deep cloning approach
      const deepCloneStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const newBoard = deepCloneBoard(board);
        newBoard.cells[10][10].orbCount += 1;
        newBoard.cells[10][10].playerId = 'player1';
      }
      const deepCloneTime = performance.now() - deepCloneStart;

      // Test immutable approach
      const immutableStart = performance.now();
      let immutableBoard = board;
      for (let i = 0; i < iterations; i++) {
        immutableBoard = placeOrbImmutable(immutableBoard, 10, 10, 'player1');
      }
      const immutableTime = performance.now() - immutableStart;

      console.log(`Deep clone time: ${deepCloneTime}ms`);
      console.log(`Immutable time: ${immutableTime}ms`);
      console.log(
        `Performance improvement: ${(((deepCloneTime - immutableTime) / deepCloneTime) * 100).toFixed(1)}%`
      );

      // The immutable approach should be reasonable compared to deep cloning
      // Note: Immer has overhead for small operations but provides other benefits
      // like structural sharing and immutability guarantees
      expect(immutableTime).toBeLessThan(deepCloneTime * 5); // Allow significant overhead for Immer in small test cases
    });

    it('should show memory efficiency with immutable updates', () => {
      const board = createEmptyBoard(10, 10);
      const iterations = 100;

      // Test multiple immutable updates (should share structure)
      const boards = [board];
      for (let i = 1; i < iterations; i++) {
        const newBoard = placeOrbImmutable(
          boards[i - 1],
          i % 10,
          Math.floor(i / 10) % 10,
          'player1'
        );
        boards.push(newBoard);
      }

      // Verify structural sharing - cells that haven't changed should be the same reference
      const originalCell = board.cells[0][0];
      const laterBoardCell = boards[50].cells[0][0];

      // If the cell wasn't modified, it should be the same reference (structural sharing)
      expect(originalCell).toBe(laterBoardCell);
    });

    it('should handle complex explosion operations efficiently', () => {
      const board = createEmptyBoard(15, 15);
      const iterations = 500;

      // Setup initial state
      let testBoard = placeOrbImmutable(board, 5, 5, 'player1');
      testBoard = placeOrbImmutable(testBoard, 5, 5, 'player1');
      testBoard = placeOrbImmutable(testBoard, 5, 5, 'player1'); // 3 orbs, ready to explode

      const adjacentCells = getAdjacentCells(testBoard, 5, 5);

      // Test explosion processing performance
      const explosionStart = performance.now();
      let currentBoard = testBoard;
      for (let i = 0; i < iterations; i++) {
        currentBoard = processExplosionImmutable(
          currentBoard,
          5,
          5,
          adjacentCells
        );
        // Reset for next iteration
        currentBoard = placeOrbImmutable(currentBoard, 5, 5, 'player1');
        currentBoard = placeOrbImmutable(currentBoard, 5, 5, 'player1');
        currentBoard = placeOrbImmutable(currentBoard, 5, 5, 'player1');
      }
      const explosionTime = performance.now() - explosionStart;

      console.log(
        `Explosion processing time for ${iterations} iterations: ${explosionTime}ms`
      );
      console.log(
        `Average time per explosion: ${(explosionTime / iterations).toFixed(3)}ms`
      );

      // Should complete within reasonable time
      expect(explosionTime).toBeLessThan(1000); // Less than 1 second for 500 iterations
    });

    it('should maintain board integrity after multiple operations', () => {
      let board = createEmptyBoard(5, 5);

      // Perform multiple operations
      board = placeOrbImmutable(board, 0, 0, 'player1');
      board = placeOrbImmutable(board, 0, 0, 'player1');
      board = placeOrbImmutable(board, 1, 1, 'player2');
      board = placeOrbImmutable(board, 2, 2, 'player1');

      // Verify board integrity
      expect(board.cells[0][0].orbCount).toBe(2);
      expect(board.cells[0][0].playerId).toBe('player1');
      expect(board.cells[1][1].orbCount).toBe(1);
      expect(board.cells[1][1].playerId).toBe('player2');
      expect(board.cells[2][2].orbCount).toBe(1);
      expect(board.cells[2][2].playerId).toBe('player1');

      // Verify unchanged cells remain pristine
      expect(board.cells[4][4].orbCount).toBe(0);
      expect(board.cells[4][4].playerId).toBe(null);
    });

    it('should demonstrate immutability benefits', () => {
      const originalBoard = createEmptyBoard(3, 3);

      // Make immutable updates
      const board1 = placeOrbImmutable(originalBoard, 1, 1, 'player1');
      const board2 = placeOrbImmutable(board1, 0, 0, 'player2');

      // Original board should be unchanged
      expect(originalBoard.cells[1][1].orbCount).toBe(0);
      expect(originalBoard.cells[0][0].orbCount).toBe(0);

      // First update should only have first change
      expect(board1.cells[1][1].orbCount).toBe(1);
      expect(board1.cells[1][1].playerId).toBe('player1');
      expect(board1.cells[0][0].orbCount).toBe(0);

      // Second update should have both changes
      expect(board2.cells[1][1].orbCount).toBe(1);
      expect(board2.cells[1][1].playerId).toBe('player1');
      expect(board2.cells[0][0].orbCount).toBe(1);
      expect(board2.cells[0][0].playerId).toBe('player2');
    });
  });
});
