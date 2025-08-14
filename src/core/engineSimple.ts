/**
 * Simplified GameEngine for AI bots - basic functionality only
 *
 * This version avoids complex dependencies and focuses on the core
 * API needed by AI strategies.
 */

import type { GameState, GameBoard } from '../types/game';
import type { PlayerId } from '../types/player';
import { GameStatus } from '../types/game';
import type { Move, ChainSimulationResult } from './types';
import { findCellsWithPosition } from '../utils/boardIterators';

export class GameEngine {
  /**
   * Get all legal moves for the current player (core-only implementation)
   */
  private getValidPositions(
    board: GameBoard,
    playerId: PlayerId
  ): Array<{ row: number; col: number }> {
    // Use centralized board iteration utility
    const validPositions = findCellsWithPosition(
      board,
      (cell) => cell.playerId === null || cell.playerId === playerId
    );

    return validPositions.map(({ row, col }) => ({ row, col }));
  }

  /**
   * Get all legal moves for the current player
   */
  getLegalMoves(state: GameState): Move[] {
    // Can't move during animations or if game is over
    if (state.isAnimating || state.gameStatus !== GameStatus.PLAYING) {
      return [];
    }

    const currentPlayerId = state.players[state.currentPlayerIndex];
    if (!currentPlayerId) {
      return [];
    }

    const validPositions = this.getValidPositions(state.board, currentPlayerId);

    return validPositions.map(({ row, col }) => ({
      row,
      col,
      playerId: currentPlayerId,
    }));
  }

  /**
   * Get adjacent cell positions for explosion simulation
   */
  private getAdjacentPositions(
    board: GameBoard,
    row: number,
    col: number
  ): Array<{ row: number; col: number }> {
    const adjacent: Array<{ row: number; col: number }> = [];
    const directions = [
      [-1, 0], // up
      [1, 0], // down
      [0, -1], // left
      [0, 1], // right
    ];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      if (
        newRow >= 0 &&
        newRow < board.rows &&
        newCol >= 0 &&
        newCol < board.cols
      ) {
        adjacent.push({ row: newRow, col: newCol });
      }
    }

    return adjacent;
  }

  /**
   * Deep clone a board for simulation
   */
  private cloneBoard(board: GameBoard): GameBoard {
    return {
      rows: board.rows,
      cols: board.cols,
      cells: board.cells.map((row) =>
        row.map((cell) => ({
          id: cell.id,
          row: cell.row,
          col: cell.col,
          orbCount: cell.orbCount,
          playerId: cell.playerId,
          criticalMass: cell.criticalMass,
          isExploding: cell.isExploding,
          animationDelay: cell.animationDelay,
        }))
      ),
    };
  }

  /**
   * Apply a move to a board (returns new board)
   */
  private applyMove(board: GameBoard, move: Move): GameBoard {
    const newBoard = this.cloneBoard(board);
    const targetCell = newBoard.cells[move.row][move.col];

    targetCell.orbCount += 1;
    targetCell.playerId = move.playerId;

    return newBoard;
  }

  /**
   * Find all cells ready to explode
   */
  private getExplodingCells(
    board: GameBoard
  ): Array<{ row: number; col: number; playerId: string }> {
    const exploding: Array<{ row: number; col: number; playerId: string }> = [];

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.orbCount >= cell.criticalMass && cell.playerId) {
          exploding.push({ row, col, playerId: cell.playerId });
        }
      }
    }

    return exploding;
  }

  /**
   * Process one step of explosions
   */
  private processExplosionStep(
    board: GameBoard,
    explodingCells: Array<{ row: number; col: number; playerId: string }>
  ): GameBoard {
    const newBoard = this.cloneBoard(board);

    // First, clear all exploding cells
    for (const { row, col } of explodingCells) {
      const cell = newBoard.cells[row][col];
      cell.orbCount = 0;
      cell.playerId = null;
    }

    // Then, distribute orbs to adjacent cells
    for (const { row, col, playerId } of explodingCells) {
      const adjacent = this.getAdjacentPositions(newBoard, row, col);

      for (const { row: adjRow, col: adjCol } of adjacent) {
        const adjCell = newBoard.cells[adjRow][adjCol];
        adjCell.orbCount += 1;
        adjCell.playerId = playerId;
      }
    }

    return newBoard;
  }

  /**
   * Improved chain simulation - processes actual explosions step by step
   */
  simulateChain(state: GameState, move: Move): ChainSimulationResult {
    let currentBoard = this.applyMove(state.board, move);
    let stepCount = 0;
    let totalExplosions = 0;
    const maxSteps = 20; // Prevent infinite loops
    const affectedCells: Array<{
      row: number;
      col: number;
      oldOrbCount: number;
      newOrbCount: number;
      oldPlayerId: string | null;
      newPlayerId: string | null;
    }> = [];

    // Track the initial move
    const initialCell = state.board.cells[move.row][move.col];
    affectedCells.push({
      row: move.row,
      col: move.col,
      oldOrbCount: initialCell.orbCount,
      newOrbCount: initialCell.orbCount + 1,
      oldPlayerId: initialCell.playerId,
      newPlayerId: move.playerId,
    });

    // Process chain reactions
    while (stepCount < maxSteps) {
      const explodingCells = this.getExplodingCells(currentBoard);

      if (explodingCells.length === 0) {
        break; // No more explosions
      }

      stepCount++;
      totalExplosions += explodingCells.length;

      // Track cells before explosion
      const beforeBoard = currentBoard;
      currentBoard = this.processExplosionStep(currentBoard, explodingCells);

      // Record changes from this explosion step
      for (const { row, col } of explodingCells) {
        const beforeCell = beforeBoard.cells[row][col];
        const afterCell = currentBoard.cells[row][col];

        affectedCells.push({
          row,
          col,
          oldOrbCount: beforeCell.orbCount,
          newOrbCount: afterCell.orbCount,
          oldPlayerId: beforeCell.playerId,
          newPlayerId: afterCell.playerId,
        });
      }
    }

    return {
      stepsCount: stepCount,
      finalBoard: currentBoard,
      affectedCells,
      totalExplosions,
    };
  }

  /**
   * Calculate board advantage for a player
   */
  calculateBoardAdvantage(board: GameBoard, playerId: PlayerId): number {
    let ownOrbs = 0;
    let enemyOrbs = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId) {
          ownOrbs += cell.orbCount;
        } else if (cell.playerId !== null) {
          enemyOrbs += cell.orbCount;
        }
      }
    }

    return ownOrbs - enemyOrbs;
  }

  /**
   * Check if a player has any orbs on the board
   */
  playerHasOrbs(board: GameBoard, playerId: PlayerId): boolean {
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId && cell.orbCount > 0) {
          return true;
        }
      }
    }
    return false;
  }
}
