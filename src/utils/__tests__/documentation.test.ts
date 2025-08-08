import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  deepCloneBoard,
  isValidMove,
  placeOrb,
  getAdjacentCells,
  countPlayerOrbs,
} from '../boardOperations';
import { getExplodingCells, processExplosion } from '../explosionLogic';
import {
  getActivePlayers,
  checkGameOver,
  validateBoardDimensions,
  validatePlayerId,
  validateCellCoordinates,
} from '../gameValidation';
import { calculateAIMove } from '../aiLogic';
import { getCellType, getCriticalMass, generateCellId } from '../helpers';
import { GameStatus } from '../../types';

describe('Documentation Examples Verification', () => {
  describe('Board Operations Documentation', () => {
    it('should match createEmptyBoard documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(6, 9);
      expect(board.rows).toBe(6);
      expect(board.cols).toBe(9);
      expect(board.cells[0][0].criticalMass).toBe(2); // corner cell
    });

    it('should match deepCloneBoard documentation examples', () => {
      // Example from JSDoc
      const original = createEmptyBoard(3, 3);
      const copy = deepCloneBoard(original);

      copy.cells[0][0].orbCount = 5;
      expect(original.cells[0][0].orbCount).toBe(0); // Still 0
      expect(copy.cells[0][0].orbCount).toBe(5); // 5
    });

    it('should match isValidMove documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(6, 9);

      // Valid moves
      expect(isValidMove(board, 0, 0, 'player1')).toBe(true); // empty cell

      // Invalid moves
      expect(isValidMove(board, -1, 0, 'player1')).toBe(false); // out of bounds
      expect(isValidMove(board, 0, 10, 'player1')).toBe(false); // out of bounds

      // After player1 places an orb
      const newBoard = placeOrb(board, 0, 0, 'player1');
      expect(isValidMove(newBoard, 0, 0, 'player1')).toBe(true); // owns cell
      expect(isValidMove(newBoard, 0, 0, 'player2')).toBe(false); // owned by other player
    });

    it('should match getAdjacentCells documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(5, 5);

      // Corner cell (top-left)
      const cornerAdjacent = getAdjacentCells(board, 0, 0);
      expect(cornerAdjacent.length).toBe(2);
      expect(cornerAdjacent).toContainEqual({ row: 0, col: 1 });
      expect(cornerAdjacent).toContainEqual({ row: 1, col: 0 });

      // Interior cell
      const interiorAdjacent = getAdjacentCells(board, 2, 2);
      expect(interiorAdjacent.length).toBe(4);
    });

    it('should match countPlayerOrbs documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(3, 3);
      let newBoard = placeOrb(board, 0, 0, 'player1');
      newBoard = placeOrb(newBoard, 0, 0, 'player1'); // 2 orbs at (0,0)
      newBoard = placeOrb(newBoard, 1, 1, 'player1'); // 1 orb at (1,1)
      newBoard = placeOrb(newBoard, 2, 2, 'player2'); // 1 orb for player2

      expect(countPlayerOrbs(newBoard, 'player1')).toBe(3);
      expect(countPlayerOrbs(newBoard, 'player2')).toBe(1);
      expect(countPlayerOrbs(newBoard, 'player3')).toBe(0);
    });
  });

  describe('Explosion Logic Documentation', () => {
    it('should match getExplodingCells documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(3, 3);
      let newBoard = placeOrb(board, 0, 0, 'player1');
      newBoard = placeOrb(newBoard, 0, 0, 'player1'); // Corner cell now has 2 orbs

      const exploding = getExplodingCells(newBoard);
      expect(exploding.length).toBe(1);
      expect(exploding[0].row).toBe(0);
      expect(exploding[0].col).toBe(0);
      expect(exploding[0].orbCount >= exploding[0].criticalMass).toBe(true);
    });

    it('should match processExplosion documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(3, 3);
      let newBoard = placeOrb(board, 0, 0, 'player1');
      newBoard = placeOrb(newBoard, 0, 0, 'player1'); // Corner cell ready to explode

      const exploded = processExplosion(newBoard, 0, 0);

      // Original cell is now empty
      expect(exploded.cells[0][0].orbCount).toBe(0);
      expect(exploded.cells[0][0].playerId).toBe(null);

      // Adjacent cells received orbs
      expect(exploded.cells[0][1].orbCount).toBe(1); // right
      expect(exploded.cells[1][0].orbCount).toBe(1); // down
      expect(exploded.cells[0][1].playerId).toBe('player1'); // captured
    });
  });

  describe('Game Validation Documentation', () => {
    it('should match getActivePlayers documentation examples', () => {
      // Example from JSDoc
      const board = createEmptyBoard(3, 3);
      let newBoard = placeOrb(board, 0, 0, 'player1');
      newBoard = placeOrb(newBoard, 1, 1, 'player2');
      newBoard = placeOrb(newBoard, 2, 2, 'player1');

      const activePlayers = getActivePlayers(newBoard);
      expect(activePlayers.length).toBe(2);
      expect(activePlayers.includes('player1')).toBe(true);
      expect(activePlayers.includes('player2')).toBe(true);
      expect(activePlayers.includes('player3')).toBe(false);
    });

    it('should validate board dimensions correctly', () => {
      // Valid dimensions
      let result = validateBoardDimensions(6, 9);
      expect(result.valid).toBe(true);

      // Invalid dimensions
      result = validateBoardDimensions(2, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('rows must be between 3 and 20');
    });

    it('should validate player IDs correctly', () => {
      // Valid player IDs
      expect(validatePlayerId('player1')).toBe(true);
      expect(validatePlayerId('player2')).toBe(true);
      expect(validatePlayerId('player123')).toBe(true);

      // Invalid player IDs
      expect(validatePlayerId('player0')).toBe(false);
      expect(validatePlayerId('user1')).toBe(false);
      expect(validatePlayerId('Player1')).toBe(false);
    });
  });

  describe('AI Logic Documentation', () => {
    it('should return valid AI moves', () => {
      // Example from JSDoc
      const board = createEmptyBoard(6, 9);
      const newBoard = placeOrb(board, 0, 0, 'player1'); // Set up some pieces

      const aiMove = calculateAIMove(newBoard, 'player2');
      if (aiMove) {
        expect(typeof aiMove.row).toBe('number');
        expect(typeof aiMove.col).toBe('number');
        expect(aiMove.playerId).toBe('player2');
        expect(aiMove.row).toBeGreaterThanOrEqual(0);
        expect(aiMove.row).toBeLessThan(6);
        expect(aiMove.col).toBeGreaterThanOrEqual(0);
        expect(aiMove.col).toBeLessThan(9);
      }
    });
  });

  describe('Helpers Documentation', () => {
    it('should match getCellType documentation examples', () => {
      // Example from JSDoc - On a 6x9 board:
      expect(getCellType(0, 0, 6, 9)).toBe('corner');
      expect(getCellType(0, 4, 6, 9)).toBe('edge');
      expect(getCellType(2, 3, 6, 9)).toBe('interior');
    });

    it('should match getCriticalMass documentation examples', () => {
      // Example from JSDoc - On a 6x9 board:
      expect(getCriticalMass(0, 0, 6, 9)).toBe(2); // corner
      expect(getCriticalMass(0, 4, 6, 9)).toBe(3); // edge
      expect(getCriticalMass(2, 3, 6, 9)).toBe(4); // interior
    });

    it('should match generateCellId documentation examples', () => {
      // Example from JSDoc
      expect(generateCellId(0, 0)).toBe('cell-0-0');
      expect(generateCellId(2, 5)).toBe('cell-2-5');
      expect(generateCellId(10, 3)).toBe('cell-10-3');
    });
  });

  describe('Game State Validation', () => {
    it('should validate game over conditions', () => {
      const board = createEmptyBoard(3, 3);
      const gameState = {
        board,
        players: ['player1', 'player2'],
        currentPlayerIndex: 0,
        gameStatus: GameStatus.PLAYING,
        winner: null,
        isAnimating: false,
        moveCount: 1,
        gameStartTime: Date.now(),
        gameEndTime: null,
        settings: {
          gridRows: 3,
          gridCols: 3,
          playerCount: 2,
          playerNames: ['Player 1', 'Player 2'],
          enableAnimations: true,
          enableSounds: false,
        },
      };

      // Game just started - no winner yet
      const result = checkGameOver(gameState);
      expect(result.isGameOver).toBe(false); // too few moves
    });

    it('should validate cell coordinates', () => {
      const board = createEmptyBoard(5, 7);

      // Valid coordinates
      let result = validateCellCoordinates(2, 3, board);
      expect(result.valid).toBe(true);

      // Invalid coordinates
      result = validateCellCoordinates(-1, 3, board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Row -1 is out of bounds');
    });
  });
});
