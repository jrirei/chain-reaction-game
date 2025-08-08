import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyBoard,
  deepCloneBoard,
  isValidMove,
  placeOrb,
  getAdjacentCells,
} from '../boardOperations';

describe('Board Operations', () => {
  describe('createEmptyBoard', () => {
    it('should create a board with correct dimensions', () => {
      const board = createEmptyBoard(6, 9);

      expect(board.rows).toBe(6);
      expect(board.cols).toBe(9);
      expect(board.cells).toHaveLength(6);
      expect(board.cells[0]).toHaveLength(9);
    });

    it('should initialize all cells correctly', () => {
      const board = createEmptyBoard(3, 3);

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = board.cells[row][col];
          expect(cell.row).toBe(row);
          expect(cell.col).toBe(col);
          expect(cell.orbCount).toBe(0);
          expect(cell.playerId).toBe(null);
          expect(cell.isExploding).toBe(false);
          expect(cell.id).toBe(`cell-${row}-${col}`);
        }
      }
    });

    it('should set correct critical mass for different cell types', () => {
      const board = createEmptyBoard(3, 3);

      // Corner cells (critical mass = 2)
      expect(board.cells[0][0].criticalMass).toBe(2);
      expect(board.cells[0][2].criticalMass).toBe(2);
      expect(board.cells[2][0].criticalMass).toBe(2);
      expect(board.cells[2][2].criticalMass).toBe(2);

      // Edge cells (critical mass = 3)
      expect(board.cells[0][1].criticalMass).toBe(3);
      expect(board.cells[1][0].criticalMass).toBe(3);
      expect(board.cells[1][2].criticalMass).toBe(3);
      expect(board.cells[2][1].criticalMass).toBe(3);

      // Interior cells (critical mass = 4)
      expect(board.cells[1][1].criticalMass).toBe(4);
    });
  });

  describe('deepCloneBoard', () => {
    it('should create a deep copy of the board', () => {
      const originalBoard = createEmptyBoard(3, 3);
      originalBoard.cells[1][1].orbCount = 5;
      originalBoard.cells[1][1].playerId = 'player1';

      const clonedBoard = deepCloneBoard(originalBoard);

      expect(clonedBoard).not.toBe(originalBoard);
      expect(clonedBoard.cells).not.toBe(originalBoard.cells);
      expect(clonedBoard.cells[1][1]).not.toBe(originalBoard.cells[1][1]);

      expect(clonedBoard.rows).toBe(originalBoard.rows);
      expect(clonedBoard.cols).toBe(originalBoard.cols);
      expect(clonedBoard.cells[1][1].orbCount).toBe(5);
      expect(clonedBoard.cells[1][1].playerId).toBe('player1');
    });

    it('should maintain independence after cloning', () => {
      const originalBoard = createEmptyBoard(2, 2);
      const clonedBoard = deepCloneBoard(originalBoard);

      clonedBoard.cells[0][0].orbCount = 3;
      clonedBoard.cells[0][0].playerId = 'player2';

      expect(originalBoard.cells[0][0].orbCount).toBe(0);
      expect(originalBoard.cells[0][0].playerId).toBe(null);
    });
  });

  describe('isValidMove', () => {
    let board: ReturnType<typeof createEmptyBoard>;

    beforeEach(() => {
      board = createEmptyBoard(6, 9);
    });

    it('should allow valid moves on empty cells', () => {
      const result = isValidMove(board, 2, 3, 'player1');
      expect(result).toBe(true);
    });

    it('should allow moves on cells owned by same player', () => {
      board.cells[2][3].playerId = 'player1';
      board.cells[2][3].orbCount = 1;

      const result = isValidMove(board, 2, 3, 'player1');
      expect(result).toBe(true);
    });

    it('should reject moves on cells owned by different player', () => {
      board.cells[2][3].playerId = 'player2';
      board.cells[2][3].orbCount = 1;

      const result = isValidMove(board, 2, 3, 'player1');
      expect(result).toBe(false);
    });

    it('should reject out of bounds moves', () => {
      expect(isValidMove(board, -1, 3, 'player1')).toBe(false);
      expect(isValidMove(board, 6, 3, 'player1')).toBe(false);
      expect(isValidMove(board, 3, -1, 'player1')).toBe(false);
      expect(isValidMove(board, 3, 9, 'player1')).toBe(false);
    });
  });

  describe('placeOrb', () => {
    it('should place orb on empty cell', () => {
      const board = createEmptyBoard(3, 3);
      const newBoard = placeOrb(board, 1, 1, 'player1');

      expect(newBoard.cells[1][1].orbCount).toBe(1);
      expect(newBoard.cells[1][1].playerId).toBe('player1');
      expect(board.cells[1][1].orbCount).toBe(0); // Original unchanged
    });

    it('should increment orb count on existing cell', () => {
      const board = createEmptyBoard(3, 3);
      board.cells[1][1].orbCount = 2;
      board.cells[1][1].playerId = 'player1';

      const newBoard = placeOrb(board, 1, 1, 'player1');

      expect(newBoard.cells[1][1].orbCount).toBe(3);
      expect(newBoard.cells[1][1].playerId).toBe('player1');
    });

    it('should not modify original board', () => {
      const board = createEmptyBoard(3, 3);
      const originalOrbCount = board.cells[1][1].orbCount;

      const newBoard = placeOrb(board, 1, 1, 'player1');

      expect(board.cells[1][1].orbCount).toBe(originalOrbCount);
      expect(newBoard).not.toBe(board);
    });
  });

  describe('getAdjacentCells', () => {
    const board = createEmptyBoard(5, 5);

    it('should return correct adjacent cells for interior cell', () => {
      const adjacent = getAdjacentCells(board, 2, 2);

      expect(adjacent).toHaveLength(4);
      expect(adjacent).toContainEqual({ row: 1, col: 2 }); // up
      expect(adjacent).toContainEqual({ row: 3, col: 2 }); // down
      expect(adjacent).toContainEqual({ row: 2, col: 1 }); // left
      expect(adjacent).toContainEqual({ row: 2, col: 3 }); // right
    });

    it('should return correct adjacent cells for corner cell', () => {
      const adjacent = getAdjacentCells(board, 0, 0);

      expect(adjacent).toHaveLength(2);
      expect(adjacent).toContainEqual({ row: 0, col: 1 }); // right
      expect(adjacent).toContainEqual({ row: 1, col: 0 }); // down
    });

    it('should return correct adjacent cells for edge cell', () => {
      const adjacent = getAdjacentCells(board, 0, 2);

      expect(adjacent).toHaveLength(3);
      expect(adjacent).toContainEqual({ row: 0, col: 1 }); // left
      expect(adjacent).toContainEqual({ row: 0, col: 3 }); // right
      expect(adjacent).toContainEqual({ row: 1, col: 2 }); // down
    });

    it('should not return out of bounds cells', () => {
      const adjacent = getAdjacentCells(board, 4, 4); // bottom-right corner

      expect(adjacent).toHaveLength(2);
      expect(adjacent).toContainEqual({ row: 3, col: 4 }); // up
      expect(adjacent).toContainEqual({ row: 4, col: 3 }); // left
    });
  });
});
