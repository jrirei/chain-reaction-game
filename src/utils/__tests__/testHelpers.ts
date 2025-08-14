/**
 * Test Helper Utilities
 *
 * Common utilities for creating test game states, mock data, and test scenarios.
 */

import type { GameState, GameBoard } from '../../types/game';
import type { PlayerConfig } from '../../types/player';
import type { Move } from '../../core/types';
import { GameStatus } from '../../types/game';
import { createEmptyBoard } from '../boardOperations';

/**
 * Creates a test move
 */
export function createTestMove(
  playerId: string,
  row: number,
  col: number
): Move {
  return { row, col, playerId };
}

/**
 * Creates a test game state with default or custom board dimensions
 */
export function createTestGameState(options?: {
  currentPlayerId?: string;
  boardSize?: { rows: number; cols: number };
  customBoard?: Array<
    Array<{ orbCount: number; playerId: string | null } | null>
  >;
  rows?: number;
  cols?: number;
  playerConfigs?: PlayerConfig[];
  gameStatus?: GameStatus;
  currentPlayerIndex?: number;
}): GameState {
  const {
    boardSize,
    customBoard,
    rows = boardSize?.rows || 6,
    cols = boardSize?.cols || 9,
    playerConfigs = [
      { name: 'Player 1', type: 'human' },
      { name: 'Player 2', type: 'human' },
    ],
    gameStatus = GameStatus.PLAYING,
    currentPlayerIndex = 0,
  } = options || {};

  const board = createEmptyBoard(rows, cols);

  // Apply custom board if provided
  if (customBoard) {
    for (let row = 0; row < Math.min(customBoard.length, board.rows); row++) {
      for (
        let col = 0;
        col < Math.min(customBoard[row].length, board.cols);
        col++
      ) {
        const customCell = customBoard[row][col];
        if (customCell) {
          const cell = board.cells[row][col];
          cell.orbCount = customCell.orbCount;
          cell.playerId = customCell.playerId;
        }
      }
    }
  }

  const players = playerConfigs.map((config, index) => `player${index + 1}`);

  return {
    gameStatus,
    isAnimating: false,
    players,
    currentPlayerIndex,
    board,
    moveCount: 0,
    settings: {
      enableAnimations: true,
      playerConfigs,
    },
  };
}

/**
 * Creates a test game board with specific configurations
 */
export function createTestBoard(rows: number, cols: number): GameBoard {
  return createEmptyBoard(rows, cols);
}

/**
 * Helper to place orbs on a board for testing
 */
export function placeTestOrb(
  board: GameBoard,
  row: number,
  col: number,
  playerId: string,
  orbCount: number = 1
): GameBoard {
  const newBoard: GameBoard = {
    ...board,
    cells: board.cells.map((cellRow) => cellRow.map((cell) => ({ ...cell }))),
  };

  if (row >= 0 && row < board.rows && col >= 0 && col < board.cols) {
    const cell = newBoard.cells[row][col];
    cell.orbCount = orbCount;
    cell.playerId = playerId;
  }

  return newBoard;
}

/**
 * Creates a board with specific orb configurations for testing
 */
export function createBoardWithOrbs(
  rows: number,
  cols: number,
  orbPlacements: Array<{
    row: number;
    col: number;
    playerId: string;
    orbCount?: number;
  }>
): GameBoard {
  let board = createEmptyBoard(rows, cols);

  for (const placement of orbPlacements) {
    board = placeTestOrb(
      board,
      placement.row,
      placement.col,
      placement.playerId,
      placement.orbCount || 1
    );
  }

  return board;
}

/**
 * Mock RNG function that returns predictable values for testing
 */
export function createMockRng(values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
}

/**
 * Create a fixed RNG that always returns the same value
 */
export function createFixedRng(value: number = 0.5): () => number {
  return () => value;
}

/**
 * Helper to create test player configs
 */
export function createTestPlayerConfigs(count: number): PlayerConfig[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Test Player ${index + 1}`,
    type: 'human' as const,
  }));
}

/**
 * Helper to create AI player configs
 */
export function createTestAiPlayerConfigs(count: number): PlayerConfig[] {
  const strategies = ['default', 'random', 'trigger', 'monteCarlo'] as const;

  return Array.from({ length: count }, (_, index) => ({
    name: `AI Player ${index + 1}`,
    type: 'ai' as const,
    aiConfig: {
      strategy: strategies[index % strategies.length],
      maxThinkingMs: 1000 + index * 500,
    },
  }));
}

/**
 * Creates a game state in late-game scenario with many filled cells
 */
export function createLateGameState(): GameState {
  const gameState = createTestGameState();

  // Fill most of the board with various players
  for (let row = 0; row < gameState.board.rows; row++) {
    for (let col = 0; col < gameState.board.cols; col++) {
      // Leave some empty cells for valid moves
      if ((row + col) % 4 !== 0) {
        const cell = gameState.board.cells[row][col];
        cell.orbCount = Math.floor(Math.random() * (cell.criticalMass - 1)) + 1;
        cell.playerId = Math.random() > 0.5 ? 'player1' : 'player2';
      }
    }
  }

  return gameState;
}

/**
 * Creates a game state with near-critical cells for explosion testing
 */
export function createNearCriticalGameState(): GameState {
  const gameState = createTestGameState();

  // Create cells near critical mass
  const criticalSetups = [
    { row: 0, col: 0, player: 'player1' }, // Corner
    { row: 0, col: 4, player: 'player2' }, // Edge
    { row: 2, col: 3, player: 'player1' }, // Center
  ];

  criticalSetups.forEach((setup) => {
    const cell = gameState.board.cells[setup.row][setup.col];
    cell.orbCount = cell.criticalMass - 1;
    cell.playerId = setup.player;
  });

  return gameState;
}
