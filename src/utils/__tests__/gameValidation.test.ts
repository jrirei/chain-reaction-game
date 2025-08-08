import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActivePlayers,
  checkGameOver,
  validateBoardDimensions,
  validatePlayerId,
  validateCellCoordinates,
  validateGameState,
} from '../gameValidation';
import { createEmptyBoard } from '../boardOperations';
import { GameStatus } from '../../types';
import type { GameState } from '../../types';

describe('Game Validation', () => {
  describe('getActivePlayers', () => {
    it('should return empty array for empty board', () => {
      const board = createEmptyBoard(3, 3);
      const activePlayers = getActivePlayers(board);

      expect(activePlayers).toEqual([]);
    });

    it('should return players with orbs on board', () => {
      const board = createEmptyBoard(3, 3);
      board.cells[0][0].orbCount = 2;
      board.cells[0][0].playerId = 'player1';
      board.cells[1][1].orbCount = 1;
      board.cells[1][1].playerId = 'player2';

      const activePlayers = getActivePlayers(board);

      expect(activePlayers).toContain('player1');
      expect(activePlayers).toContain('player2');
      expect(activePlayers).toHaveLength(2);
    });

    it('should not return duplicate players', () => {
      const board = createEmptyBoard(3, 3);
      board.cells[0][0].orbCount = 1;
      board.cells[0][0].playerId = 'player1';
      board.cells[0][1].orbCount = 2;
      board.cells[0][1].playerId = 'player1';
      board.cells[1][0].orbCount = 1;
      board.cells[1][0].playerId = 'player1';

      const activePlayers = getActivePlayers(board);

      expect(activePlayers).toEqual(['player1']);
      expect(activePlayers).toHaveLength(1);
    });

    it('should ignore cells with zero orbs', () => {
      const board = createEmptyBoard(3, 3);
      board.cells[0][0].orbCount = 0;
      board.cells[0][0].playerId = 'player1';
      board.cells[1][1].orbCount = 3;
      board.cells[1][1].playerId = 'player2';

      const activePlayers = getActivePlayers(board);

      expect(activePlayers).toEqual(['player2']);
    });
  });

  describe('checkGameOver', () => {
    let gameState: GameState;

    beforeEach(() => {
      const board = createEmptyBoard(3, 3);
      gameState = {
        board,
        players: ['player1', 'player2'],
        currentPlayerIndex: 0,
        gameStatus: GameStatus.PLAYING,
        winner: null,
        isAnimating: false,
        moveCount: 0,
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
    });

    it('should not end game with zero moves', () => {
      const result = checkGameOver(gameState);

      expect(result.isGameOver).toBe(false);
      expect(result.winner).toBe(null);
    });

    it('should not end game before all players have had a turn', () => {
      gameState.moveCount = 1; // Less than player count

      const result = checkGameOver(gameState);

      expect(result.isGameOver).toBe(false);
      expect(result.winner).toBe(null);
    });

    it('should not end game with multiple active players', () => {
      gameState.moveCount = 5;
      gameState.board.cells[0][0].orbCount = 1;
      gameState.board.cells[0][0].playerId = 'player1';
      gameState.board.cells[1][1].orbCount = 2;
      gameState.board.cells[1][1].playerId = 'player2';

      const result = checkGameOver(gameState);

      expect(result.isGameOver).toBe(false);
      expect(result.winner).toBe(null);
    });

    it('should end game with single active player', () => {
      gameState.moveCount = 5;
      gameState.board.cells[0][0].orbCount = 1;
      gameState.board.cells[0][0].playerId = 'player1';

      const result = checkGameOver(gameState);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe('player1');
    });

    it('should end game with no active players', () => {
      gameState.moveCount = 5;
      // No orbs on board

      const result = checkGameOver(gameState);

      expect(result.isGameOver).toBe(true);
      expect(result.winner).toBe(null);
    });
  });

  describe('validateBoardDimensions', () => {
    it('should validate correct dimensions', () => {
      const result = validateBoardDimensions(6, 9);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject too small dimensions', () => {
      let result = validateBoardDimensions(2, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('rows must be between 3 and 20');

      result = validateBoardDimensions(5, 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('columns must be between 3 and 20');
    });

    it('should reject too large dimensions', () => {
      let result = validateBoardDimensions(25, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('rows must be between 3 and 20');

      result = validateBoardDimensions(10, 25);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('columns must be between 3 and 20');
    });

    it('should accept boundary values', () => {
      let result = validateBoardDimensions(3, 3);
      expect(result.valid).toBe(true);

      result = validateBoardDimensions(20, 20);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePlayerId', () => {
    it('should validate correct player IDs', () => {
      expect(validatePlayerId('player1')).toBe(true);
      expect(validatePlayerId('player2')).toBe(true);
      expect(validatePlayerId('player10')).toBe(true);
      expect(validatePlayerId('player123')).toBe(true);
    });

    it('should reject invalid player IDs', () => {
      expect(validatePlayerId('player')).toBe(false);
      expect(validatePlayerId('player0')).toBe(false);
      expect(validatePlayerId('user1')).toBe(false);
      expect(validatePlayerId('Player1')).toBe(false);
      expect(validatePlayerId('player-1')).toBe(false);
      expect(validatePlayerId('')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validatePlayerId(123 as unknown as string)).toBe(false);
      expect(validatePlayerId(null as unknown as string)).toBe(false);
      expect(validatePlayerId(undefined as unknown as string)).toBe(false);
    });
  });

  describe('validateCellCoordinates', () => {
    const board = createEmptyBoard(5, 7);

    it('should validate correct coordinates', () => {
      const result = validateCellCoordinates(2, 3, board);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate boundary coordinates', () => {
      let result = validateCellCoordinates(0, 0, board);
      expect(result.valid).toBe(true);

      result = validateCellCoordinates(4, 6, board);
      expect(result.valid).toBe(true);
    });

    it('should reject negative coordinates', () => {
      let result = validateCellCoordinates(-1, 3, board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Row -1 is out of bounds');

      result = validateCellCoordinates(3, -1, board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Column -1 is out of bounds');
    });

    it('should reject coordinates beyond board dimensions', () => {
      let result = validateCellCoordinates(5, 3, board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Row 5 is out of bounds (0-4)');

      result = validateCellCoordinates(3, 7, board);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Column 7 is out of bounds (0-6)');
    });
  });

  describe('validateGameState', () => {
    let validGameState: GameState;

    beforeEach(() => {
      validGameState = {
        board: createEmptyBoard(6, 9),
        players: ['player1', 'player2'],
        currentPlayerIndex: 0,
        gameStatus: GameStatus.PLAYING,
        winner: null,
        isAnimating: false,
        moveCount: 0,
        gameStartTime: Date.now(),
        gameEndTime: null,
        settings: {
          gridRows: 6,
          gridCols: 9,
          playerCount: 2,
          playerNames: ['Player 1', 'Player 2'],
          enableAnimations: true,
          enableSounds: false,
        },
      };
    });

    it('should validate correct game state', () => {
      const result = validateGameState(validGameState);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing board', () => {
      const invalidState = {
        ...validGameState,
        board: undefined as unknown as GameState['board'],
      };
      const result = validateGameState(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game state missing board');
    });

    it('should detect missing players', () => {
      const invalidState = { ...validGameState, players: [] };
      const result = validateGameState(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Game state missing players');
    });

    it('should detect invalid board dimensions', () => {
      const invalidBoard = createEmptyBoard(1, 5); // Too small
      const invalidState = { ...validGameState, board: invalidBoard };
      const result = validateGameState(invalidState);

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('rows must be between 3 and 20'))
      ).toBe(true);
    });

    it('should detect invalid current player index', () => {
      const invalidState = { ...validGameState, currentPlayerIndex: -1 };
      const result = validateGameState(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Current player index is out of bounds');
    });

    it('should detect current player index beyond player count', () => {
      const invalidState = { ...validGameState, currentPlayerIndex: 5 };
      const result = validateGameState(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Current player index is out of bounds');
    });

    it('should collect multiple errors', () => {
      const invalidState = {
        ...validGameState,
        board: undefined as unknown as GameState['board'],
        players: [],
        currentPlayerIndex: -1,
      };
      const result = validateGameState(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('Game state missing board');
      expect(result.errors).toContain('Game state missing players');
      expect(result.errors).toContain('Current player index is out of bounds');
    });
  });
});
