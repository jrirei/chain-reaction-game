/**
 * Board Analysis Utilities
 *
 * Provides high-level board analysis functions built on top of board iterators
 * to consolidate player management and game state analysis logic.
 *
 * @fileoverview Consolidates player orb counting, elimination detection,
 * and board state analysis scattered across multiple files.
 */

import type { GameBoard, Cell, PlayerId } from '../types';
import {
  countCells,
  findCells,
  forEachCell,
  countCellsWithPosition,
  getBoardStats,
} from './boardIterators';
import { getCriticalMass } from './helpers';

/**
 * Player statistics on the board
 */
export interface PlayerBoardStats {
  playerId: PlayerId;
  orbCount: number;
  cellCount: number;
  criticalCells: number;
  averageOrbs: number;
}

/**
 * Board state analysis result
 */
export interface BoardAnalysis {
  totalOrbs: number;
  occupiedCells: number;
  playerStats: Map<PlayerId, PlayerBoardStats>;
  activePlayers: PlayerId[];
  criticalCellCount: number;
  boardDensity: number; // percentage of occupied cells
}

/**
 * Counts orbs for a specific player (consolidates existing countPlayerOrbs)
 *
 * @param board - The game board
 * @param playerId - ID of the player to count orbs for
 * @returns Total number of orbs for the player
 *
 * @example
 * ```typescript
 * const playerOrbs = countPlayerOrbs(board, 'player1');
 * ```
 */
export function countPlayerOrbs(board: GameBoard, playerId: PlayerId): number {
  return countCells(board, (cell) => cell.playerId === playerId)
    ? forEachCell(board, (cell) =>
        cell.playerId === playerId ? cell.orbCount : null
      ).reduce((sum, orbs) => sum + orbs, 0)
    : 0;
}

/**
 * Gets comprehensive orb distribution for all players
 *
 * @param board - The game board
 * @returns Map of player IDs to their orb counts
 *
 * @example
 * ```typescript
 * const distribution = getPlayerOrbDistribution(board);
 * const player1Orbs = distribution.get('player1') || 0;
 * ```
 */
export function getPlayerOrbDistribution(
  board: GameBoard
): Map<PlayerId, number> {
  const distribution = new Map<PlayerId, number>();

  forEachCell(board, (cell) => {
    if (cell.playerId && cell.orbCount > 0) {
      distribution.set(
        cell.playerId,
        (distribution.get(cell.playerId) || 0) + cell.orbCount
      );
    }
    return null;
  });

  return distribution;
}

/**
 * Gets the number of cells controlled by each player
 *
 * @param board - The game board
 * @returns Map of player IDs to their cell counts
 */
export function getPlayerCellCounts(board: GameBoard): Map<PlayerId, number> {
  const cellCounts = new Map<PlayerId, number>();

  forEachCell(board, (cell) => {
    if (cell.playerId) {
      cellCounts.set(cell.playerId, (cellCounts.get(cell.playerId) || 0) + 1);
    }
    return null;
  });

  return cellCounts;
}

/**
 * Gets detailed statistics for a specific player
 *
 * @param board - The game board
 * @param playerId - ID of the player to analyze
 * @returns Detailed player statistics or null if player has no presence
 */
export function getPlayerStats(
  board: GameBoard,
  playerId: PlayerId
): PlayerBoardStats | null {
  const playerCells = findCells(board, (cell) => cell.playerId === playerId);

  if (playerCells.length === 0) {
    return null;
  }

  const orbCount = playerCells.reduce((sum, cell) => sum + cell.orbCount, 0);
  const criticalCells = countCellsWithPosition(
    board,
    (cell, row, col) =>
      cell.playerId === playerId &&
      cell.orbCount >= getCriticalMass(row, col, board.rows, board.cols)
  );

  return {
    playerId,
    orbCount,
    cellCount: playerCells.length,
    criticalCells,
    averageOrbs: playerCells.length > 0 ? orbCount / playerCells.length : 0,
  };
}

/**
 * Analyzes the entire board state for all players
 *
 * @param board - The game board to analyze
 * @returns Comprehensive board analysis
 *
 * @example
 * ```typescript
 * const analysis = analyzeBoardState(board);
 * console.log(`Active players: ${analysis.activePlayers.length}`);
 * console.log(`Board density: ${analysis.boardDensity.toFixed(1)}%`);
 * ```
 */
export function analyzeBoardState(board: GameBoard): BoardAnalysis {
  const basicStats = getBoardStats(board);
  const playerStats = new Map<PlayerId, PlayerBoardStats>();

  // Analyze each player with orbs on the board
  for (const playerId of basicStats.playersWithOrbs) {
    const stats = getPlayerStats(board, playerId);
    if (stats) {
      playerStats.set(playerId, stats);
    }
  }

  const criticalCellCount = countCellsWithPosition(
    board,
    (cell, row, col) =>
      cell.orbCount >= getCriticalMass(row, col, board.rows, board.cols)
  );

  return {
    totalOrbs: basicStats.totalOrbs,
    occupiedCells: basicStats.occupiedCells,
    playerStats,
    activePlayers: Array.from(playerStats.keys()),
    criticalCellCount,
    boardDensity: (basicStats.occupiedCells / basicStats.totalCells) * 100,
  };
}

/**
 * Determines which players are eliminated based on board state
 *
 * @param board - The game board
 * @param totalMoveCount - Total moves made in the game
 * @param playerCount - Total number of players in the game
 * @returns Array of eliminated player IDs
 *
 * @example
 * ```typescript
 * const eliminated = getEliminatedPlayers(board, gameState.moveCount, players.length);
 * const stillActive = players.filter(p => !eliminated.includes(p.id));
 * ```
 */
export function getEliminatedPlayers(
  board: GameBoard,
  totalMoveCount: number,
  playerCount: number
): PlayerId[] {
  const minMovesForElimination = playerCount;

  if (totalMoveCount <= minMovesForElimination) {
    return []; // No eliminations possible in first round
  }

  const orbDistribution = getPlayerOrbDistribution(board);
  const eliminated: PlayerId[] = [];

  // Players with zero orbs after the first round are eliminated
  orbDistribution.forEach((orbCount, playerId) => {
    if (orbCount === 0) {
      eliminated.push(playerId);
    }
  });

  return eliminated;
}

/**
 * Finds cells that are at critical mass and ready to explode
 *
 * @param board - The game board
 * @returns Array of cells at critical mass with their positions
 *
 * @example
 * ```typescript
 * const criticalCells = findCriticalCells(board);
 * const hasExplosions = criticalCells.length > 0;
 * ```
 */
export function findCriticalCells(
  board: GameBoard
): Array<{ cell: Cell; row: number; col: number }> {
  const criticalCells: Array<{ cell: Cell; row: number; col: number }> = [];

  forEachCell(board, (cell, row, col) => {
    if (cell.orbCount >= getCriticalMass(row, col, board.rows, board.cols)) {
      criticalCells.push({ cell, row, col });
    }
    return null;
  });

  return criticalCells;
}

/**
 * Checks if the game is in a winning state (only one player has orbs)
 *
 * @param board - The game board
 * @param totalMoveCount - Total moves made in the game
 * @param playerCount - Total number of players
 * @returns The winning player ID if game is won, null otherwise
 *
 * @example
 * ```typescript
 * const winner = checkWinCondition(board, gameState.moveCount, players.length);
 * if (winner) {
 *   console.log(`Player ${winner} wins!`);
 * }
 * ```
 */
export function checkWinCondition(
  board: GameBoard,
  totalMoveCount: number,
  playerCount: number
): PlayerId | null {
  const analysis = analyzeBoardState(board);

  // Need at least one complete round before win detection
  if (totalMoveCount < playerCount) {
    return null;
  }

  // Exactly one player remaining = winner
  if (analysis.activePlayers.length === 1) {
    return analysis.activePlayers[0];
  }

  return null;
}

/**
 * Gets the current game phase based on board density and player count
 *
 * @param board - The game board
 * @returns Game phase identifier
 *
 * @example
 * ```typescript
 * const phase = getGamePhase(board);
 * const aiThinkingTime = phase === 'endgame' ? 10000 : 5000;
 * ```
 */
export function getGamePhase(
  board: GameBoard
): 'opening' | 'midgame' | 'endgame' {
  const analysis = analyzeBoardState(board);

  if (analysis.boardDensity < 20) {
    return 'opening';
  } else if (analysis.boardDensity < 60 || analysis.activePlayers.length > 2) {
    return 'midgame';
  } else {
    return 'endgame';
  }
}

/**
 * Debug helper to print board analysis in a readable format
 *
 * @param board - The game board
 * @param title - Optional title for the analysis output
 *
 * @example
 * ```typescript
 * if (process.env.NODE_ENV === 'development') {
 *   printBoardAnalysis(board, 'After move 15');
 * }
 * ```
 */
export function printBoardAnalysis(board: GameBoard, title?: string): void {
  const analysis = analyzeBoardState(board);

  console.log(title ? `=== ${title} ===` : '=== Board Analysis ===');
  console.log(`Board Density: ${analysis.boardDensity.toFixed(1)}%`);
  console.log(`Total Orbs: ${analysis.totalOrbs}`);
  console.log(`Critical Cells: ${analysis.criticalCellCount}`);
  console.log(`Active Players: ${analysis.activePlayers.length}`);

  analysis.playerStats.forEach((stats, playerId) => {
    console.log(
      `  ${playerId}: ${stats.orbCount} orbs, ${stats.cellCount} cells, ${stats.criticalCells} critical`
    );
  });

  console.log(`Game Phase: ${getGamePhase(board)}`);
}
