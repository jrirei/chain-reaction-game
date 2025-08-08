/**
 * @fileoverview Comprehensive error handling and validation utilities.
 *
 * This module provides robust error handling, input validation, and defensive
 * programming utilities to improve code reliability and user experience.
 *
 * Key features:
 * - Custom error types with context
 * - Input validation with detailed error messages
 * - Safe function wrappers with error recovery
 * - Logging and monitoring integration
 * - Type-safe error handling patterns
 */

import type { GameBoard, PlayerId, GameState } from '../types';

/**
 * Base error class for game-specific errors with additional context
 */
export class GameError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();
  }
}

/**
 * Error thrown when board operations fail
 */
export class BoardError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BOARD_ERROR', context);
    this.name = 'BoardError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when game state is invalid
 */
export class GameStateError extends GameError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'GAME_STATE_ERROR', context);
    this.name = 'GameStateError';
  }
}

/**
 * Result type for operations that might fail
 */
export type Result<T, E = Error> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

/**
 * Creates a successful result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Creates a failed result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Safely executes a function and returns a Result
 */
export function safeExecute<T>(
  fn: () => T,
  errorMessage = 'Operation failed'
): Result<T> {
  try {
    const result = fn();
    return ok(result);
  } catch (error) {
    const gameError =
      error instanceof GameError
        ? error
        : new GameError(
            `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
            'EXECUTION_ERROR',
            { originalError: error }
          );
    return err(gameError);
  }
}

/**
 * Safely executes an async function and returns a Result
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  errorMessage = 'Async operation failed'
): Promise<Result<T>> {
  try {
    const result = await fn();
    return ok(result);
  } catch (error) {
    const gameError =
      error instanceof GameError
        ? error
        : new GameError(
            `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
            'ASYNC_EXECUTION_ERROR',
            { originalError: error }
          );
    return err(gameError);
  }
}

/**
 * Validates that a value is not null or undefined
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  message = 'Value cannot be null or undefined'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(message, { value });
  }
}

/**
 * Validates that a number is within a specified range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  name = 'Value'
): void {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new ValidationError(`${name} must be a finite number`, {
      value,
      min,
      max,
    });
  }
  if (value < min || value > max) {
    throw new ValidationError(
      `${name} must be between ${min} and ${max}, got ${value}`,
      { value, min, max }
    );
  }
}

/**
 * Validates board coordinates
 */
export function validateBoardCoordinates(
  row: number,
  col: number,
  board: GameBoard
): Result<void> {
  try {
    assertInRange(row, 0, board.rows - 1, 'Row');
    assertInRange(col, 0, board.cols - 1, 'Column');
    return ok(undefined);
  } catch (error) {
    return err(error as ValidationError);
  }
}

/**
 * Validates player ID format and existence
 */
export function validatePlayerIdStrict(
  playerId: unknown,
  allowedPlayers?: PlayerId[]
): Result<PlayerId> {
  if (typeof playerId !== 'string') {
    return err(new ValidationError('Player ID must be a string', { playerId }));
  }

  if (!/^player[1-9]\d*$/.test(playerId)) {
    return err(
      new ValidationError(
        'Player ID must match format "player{N}" where N is a positive integer',
        { playerId }
      )
    );
  }

  if (allowedPlayers && !allowedPlayers.includes(playerId as PlayerId)) {
    return err(
      new ValidationError(
        `Player ID "${playerId}" is not in the allowed players list`,
        { playerId, allowedPlayers }
      )
    );
  }

  return ok(playerId as PlayerId);
}

/**
 * Validates board dimensions
 */
export function validateBoardDimensionsStrict(
  rows: number,
  cols: number
): Result<void> {
  try {
    assertInRange(rows, 3, 20, 'Rows');
    assertInRange(cols, 3, 20, 'Columns');
    return ok(undefined);
  } catch (error) {
    return err(error as ValidationError);
  }
}

/**
 * Validates game state integrity
 */
export function validateGameStateIntegrity(gameState: GameState): Result<void> {
  try {
    assertNotNull(gameState, 'Game state');
    assertNotNull(gameState.board, 'Game board');
    assertNotNull(gameState.players, 'Players array');

    if (gameState.players.length === 0) {
      throw new ValidationError('Game must have at least one player');
    }

    if (
      gameState.currentPlayerIndex < 0 ||
      gameState.currentPlayerIndex >= gameState.players.length
    ) {
      throw new ValidationError('Current player index is out of bounds', {
        currentPlayerIndex: gameState.currentPlayerIndex,
        playerCount: gameState.players.length,
      });
    }

    // Validate board dimensions
    const boardValidation = validateBoardDimensionsStrict(
      gameState.board.rows,
      gameState.board.cols
    );
    if (!boardValidation.success) {
      throw boardValidation.error;
    }

    // Validate all player IDs
    for (const playerId of gameState.players) {
      const playerValidation = validatePlayerIdStrict(playerId);
      if (!playerValidation.success) {
        throw playerValidation.error;
      }
    }

    return ok(undefined);
  } catch (error) {
    return err(error as ValidationError);
  }
}

/**
 * Logs errors with context for debugging
 */
export function logError(
  error: Error,
  context?: Record<string, unknown>
): void {
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof GameError) {
    errorInfo.context = { ...errorInfo.context, ...error.context };
  }

  // In development, log to console with full details
  if (import.meta.env.DEV) {
    console.error('Game Error:', errorInfo);
  } else {
    // In production, you might want to send to an error tracking service
    console.error(`[${error.name}] ${error.message}`);
  }
}

/**
 * Creates a safe wrapper around a function that handles errors gracefully
 */
export function withErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  fallbackValue: TReturn
) {
  return (...args: TArgs): TReturn => {
    try {
      return fn(...args);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        functionName: fn.name,
        arguments: args,
      });
      return fallbackValue;
    }
  };
}

/**
 * Creates a safe async wrapper around a function that handles errors gracefully
 */
export function withAsyncErrorHandling<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  fallbackValue: TReturn
) {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        functionName: fn.name,
        arguments: args,
      });
      return fallbackValue;
    }
  };
}

/**
 * Validates that an array contains only unique values
 */
export function assertUniqueArray<T>(
  array: T[],
  message = 'Array must contain unique values'
): void {
  const unique = new Set(array);
  if (unique.size !== array.length) {
    throw new ValidationError(message, { array, uniqueCount: unique.size });
  }
}

/**
 * Validates that a value is one of the allowed options
 */
export function assertOneOf<T>(
  value: T,
  allowedValues: T[],
  name = 'Value'
): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${name} must be one of: ${allowedValues.join(', ')}. Got: ${value}`,
      { value, allowedValues }
    );
  }
}

/**
 * Type guard to check if a value is a valid player ID
 */
export function isValidPlayerId(value: unknown): value is PlayerId {
  return typeof value === 'string' && /^player[1-9]\d*$/.test(value);
}

/**
 * Type guard to check if coordinates are valid for a board
 */
export function areValidCoordinates(
  row: number,
  col: number,
  board: GameBoard
): boolean {
  return (
    typeof row === 'number' &&
    typeof col === 'number' &&
    isFinite(row) &&
    isFinite(col) &&
    row >= 0 &&
    row < board.rows &&
    col >= 0 &&
    col < board.cols
  );
}
