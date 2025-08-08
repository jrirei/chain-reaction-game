import { describe, it, expect, vi } from 'vitest';
import {
  GameError,
  BoardError,
  ValidationError,
  ok,
  err,
  safeExecute,
  safeExecuteAsync,
  assertNotNull,
  assertInRange,
  validateBoardCoordinates,
  validatePlayerIdStrict,
  validateBoardDimensionsStrict,
  validateGameStateIntegrity,
  logError,
  withErrorHandling,
  withAsyncErrorHandling,
  assertUniqueArray,
  assertOneOf,
  isValidPlayerId,
  areValidCoordinates,
} from '../errorHandling';
import {
  createEmptyBoard,
  createEmptyBoardSafe,
  placeOrb,
  placeOrbSafe,
} from '../boardOperations';
import { GameStatus } from '../../types';

describe('Error Handling and Validation', () => {
  describe('Custom Error Types', () => {
    it('should create GameError with context', () => {
      const error = new GameError('Test error', 'TEST_CODE', { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ key: 'value' });
      expect(error.timestamp).toBeTypeOf('number');
      expect(error.name).toBe('GameError');
    });

    it('should create BoardError', () => {
      const error = new BoardError('Board operation failed', {
        row: 5,
        col: 3,
      });

      expect(error.name).toBe('BoardError');
      expect(error.code).toBe('BOARD_ERROR');
      expect(error.message).toBe('Board operation failed');
      expect(error.context).toEqual({ row: 5, col: 3 });
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input', { input: 'bad' });

      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.context).toEqual({ input: 'bad' });
    });
  });

  describe('Result Type', () => {
    it('should create successful results', () => {
      const result = ok('success');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    it('should create failed results', () => {
      const error = new Error('Failed');
      const result = err(error);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('Safe Execution', () => {
    it('should return success for valid operations', () => {
      const result = safeExecute(() => 2 + 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(4);
      }
    });

    it('should catch errors and return GameError', () => {
      const result = safeExecute(() => {
        throw new Error('Something went wrong');
      }, 'Math operation failed');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(GameError);
        expect(result.error.message).toContain('Math operation failed');
        expect(result.error.message).toContain('Something went wrong');
      }
    });

    it('should preserve GameError instances', () => {
      const originalError = new ValidationError('Custom validation error');
      const result = safeExecute(() => {
        throw originalError;
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(originalError);
      }
    });

    it('should handle async operations', async () => {
      const result = await safeExecuteAsync(async () => {
        return Promise.resolve('async success');
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('async success');
      }
    });

    it('should catch async errors', async () => {
      const result = await safeExecuteAsync(async () => {
        throw new Error('Async error');
      }, 'Async operation failed');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Async operation failed');
        expect(result.error.message).toContain('Async error');
      }
    });
  });

  describe('Validation Assertions', () => {
    it('should pass assertNotNull for valid values', () => {
      expect(() => assertNotNull('valid')).not.toThrow();
      expect(() => assertNotNull(0)).not.toThrow();
      expect(() => assertNotNull(false)).not.toThrow();
    });

    it('should throw ValidationError for null/undefined', () => {
      expect(() => assertNotNull(null)).toThrow(ValidationError);
      expect(() => assertNotNull(undefined)).toThrow(ValidationError);

      try {
        assertNotNull(null, 'Custom message');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Custom message');
      }
    });

    it('should validate ranges correctly', () => {
      expect(() => assertInRange(5, 0, 10)).not.toThrow();
      expect(() => assertInRange(0, 0, 10)).not.toThrow();
      expect(() => assertInRange(10, 0, 10)).not.toThrow();

      expect(() => assertInRange(-1, 0, 10)).toThrow(ValidationError);
      expect(() => assertInRange(11, 0, 10)).toThrow(ValidationError);
      expect(() => assertInRange(NaN, 0, 10)).toThrow(ValidationError);
      expect(() => assertInRange(Infinity, 0, 10)).toThrow(ValidationError);
    });

    it('should validate unique arrays', () => {
      expect(() => assertUniqueArray([1, 2, 3])).not.toThrow();
      expect(() => assertUniqueArray(['a', 'b', 'c'])).not.toThrow();
      expect(() => assertUniqueArray([])).not.toThrow();

      expect(() => assertUniqueArray([1, 2, 2])).toThrow(ValidationError);
      expect(() => assertUniqueArray(['a', 'b', 'a'])).toThrow(ValidationError);
    });

    it('should validate allowed values', () => {
      expect(() =>
        assertOneOf('apple', ['apple', 'banana', 'orange'])
      ).not.toThrow();

      expect(() => assertOneOf('grape', ['apple', 'banana', 'orange'])).toThrow(
        ValidationError
      );
    });
  });

  describe('Board Validation', () => {
    it('should validate board coordinates', () => {
      const board = createEmptyBoard(5, 5);

      let result = validateBoardCoordinates(2, 3, board);
      expect(result.success).toBe(true);

      result = validateBoardCoordinates(-1, 3, board);
      expect(result.success).toBe(false);

      result = validateBoardCoordinates(5, 3, board);
      expect(result.success).toBe(false);
    });

    it('should validate player IDs strictly', () => {
      let result = validatePlayerIdStrict('player1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('player1');
      }

      result = validatePlayerIdStrict('player0');
      expect(result.success).toBe(false);

      result = validatePlayerIdStrict('invalid');
      expect(result.success).toBe(false);

      result = validatePlayerIdStrict(123);
      expect(result.success).toBe(false);

      // Test with allowed players
      result = validatePlayerIdStrict('player3', ['player1', 'player2']);
      expect(result.success).toBe(false);

      result = validatePlayerIdStrict('player1', ['player1', 'player2']);
      expect(result.success).toBe(true);
    });

    it('should validate board dimensions', () => {
      let result = validateBoardDimensionsStrict(6, 9);
      expect(result.success).toBe(true);

      result = validateBoardDimensionsStrict(2, 5);
      expect(result.success).toBe(false);

      result = validateBoardDimensionsStrict(25, 10);
      expect(result.success).toBe(false);
    });
  });

  describe('Game State Validation', () => {
    it('should validate valid game state', () => {
      const gameState = {
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

      const result = validateGameStateIntegrity(gameState);
      expect(result.success).toBe(true);
    });

    it('should detect invalid game state', () => {
      const invalidState = {
        board: null as unknown as GameBoard,
        players: [],
        currentPlayerIndex: -1,
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

      const result = validateGameStateIntegrity(invalidState);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling Wrappers', () => {
    it('should create safe function wrappers', () => {
      const riskyFunction = (x: number) => {
        if (x < 0) throw new Error('Negative numbers not allowed');
        return x * 2;
      };

      const safeFunction = withErrorHandling(riskyFunction, 0);

      expect(safeFunction(5)).toBe(10);
      expect(safeFunction(-5)).toBe(0); // fallback value
    });

    it('should create safe async function wrappers', async () => {
      const riskyAsyncFunction = async (x: number) => {
        if (x < 0) throw new Error('Negative numbers not allowed');
        return Promise.resolve(x * 2);
      };

      const safeAsyncFunction = withAsyncErrorHandling(riskyAsyncFunction, 0);

      expect(await safeAsyncFunction(5)).toBe(10);
      expect(await safeAsyncFunction(-5)).toBe(0); // fallback value
    });
  });

  describe('Type Guards', () => {
    it('should validate player IDs with type guard', () => {
      expect(isValidPlayerId('player1')).toBe(true);
      expect(isValidPlayerId('player123')).toBe(true);
      expect(isValidPlayerId('player0')).toBe(false);
      expect(isValidPlayerId('invalid')).toBe(false);
      expect(isValidPlayerId(123)).toBe(false);
    });

    it('should validate coordinates with type guard', () => {
      const board = createEmptyBoard(5, 5);

      expect(areValidCoordinates(2, 3, board)).toBe(true);
      expect(areValidCoordinates(0, 0, board)).toBe(true);
      expect(areValidCoordinates(4, 4, board)).toBe(true);

      expect(areValidCoordinates(-1, 3, board)).toBe(false);
      expect(areValidCoordinates(5, 3, board)).toBe(false);
      expect(areValidCoordinates(2.5, 3, board)).toBe(true); // float numbers are valid
      expect(areValidCoordinates(NaN, 3, board)).toBe(false);
      expect(areValidCoordinates(Infinity, 3, board)).toBe(false);
    });
  });

  describe('Safe Board Operations', () => {
    it('should create boards safely', () => {
      let result = createEmptyBoardSafe(6, 9);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rows).toBe(6);
        expect(result.data.cols).toBe(9);
      }

      result = createEmptyBoardSafe(2, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    it('should place orbs safely', () => {
      const board = createEmptyBoard(3, 3);

      // Valid placement
      let result = placeOrbSafe(board, 1, 1, 'player1');
      expect(result.success).toBe(true);

      // Invalid coordinates
      result = placeOrbSafe(board, -1, 1, 'player1');
      expect(result.success).toBe(false);

      // Invalid player ID
      result = placeOrbSafe(board, 1, 1, 'invalid');
      expect(result.success).toBe(false);

      // Cell owned by different player
      const boardWithOrb = placeOrb(board, 1, 1, 'player1');
      result = placeOrbSafe(boardWithOrb, 1, 1, 'player2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('is owned by player1');
      }
    });
  });

  describe('Error Logging', () => {
    it('should log errors with context', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const error = new GameError('Test error', 'TEST', { key: 'value' });
      logError(error, { additional: 'context' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
