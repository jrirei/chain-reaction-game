/**
 * Oskar Bot - Advanced Chain Reaction AI with Heuristic Evaluation & Minimax
 *
 * Strategy Overview:
 * - Fast heuristic board evaluation with weighted scoring
 * - Depth-limited minimax with alpha-beta pruning
 * - Game phase adaptation (early/mid/late game)
 * - Critical mass targeting and chain potential analysis
 * - Danger avoidance and killer move detection
 *
 * Implementation based on coach's comprehensive strategy for balanced
 * aggression, defense, and efficiency under time constraints.
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import type { AiStrategy, AiContext } from './types';
import { AI_PERFORMANCE } from './constants';
import { GameEngine } from '../core/engineSimple';

// Game phases based on board fill percentage
type GamePhase = 'early' | 'mid' | 'late';

const GamePhase = {
  EARLY: 'early' as const, // < 30% board filled - focus on corners/edges
  MID: 'mid' as const, // 30-70% filled - balance attack/defense
  LATE: 'late' as const, // > 70% filled - aggressive chains
} as const;

// Evaluation weights that adapt based on game phase
interface EvaluationWeights {
  ownCells: number; // Weight for cells we control
  enemyCells: number; // Weight for enemy cells (negative)
  chainPotential: number; // Weight for chain reaction potential
  edgeBonus: number; // Bonus for edge position control
  cornerBonus: number; // Bonus for corner position control
  criticalMass: number; // Weight for cells near critical mass
  dangerPenalty: number; // Penalty for dangerous positions
}

// Minimax search node for alpha-beta pruning (unused but kept for future enhancements)
// interface SearchNode {
//   board: GameBoard;
//   move: Move | null;
//   depth: number;
//   alpha: number;
//   beta: number;
//   isMaximizing: boolean;
// }

// Copy GameBoard type locally to avoid import issues
interface GameBoard {
  rows: number;
  cols: number;
  cells: {
    orbCount: number;
    criticalMass: number;
    playerId: string | null;
  }[][];
}

export class OskarBot implements AiStrategy {
  readonly name = 'oskar' as const;

  private engine = new GameEngine();
  private defaultMaxThinkingMs = 1000; // 1 second default
  private beamWidth = 8; // Consider top N moves per level

  // Phase-specific evaluation weights
  private readonly phaseWeights: Record<GamePhase, EvaluationWeights> = {
    [GamePhase.EARLY]: {
      ownCells: 1.0,
      enemyCells: -1.0,
      chainPotential: 1.5,
      edgeBonus: 2.0, // Prioritize edges early
      cornerBonus: 3.0, // Prioritize corners early
      criticalMass: 2.0,
      dangerPenalty: -3.0,
    },
    [GamePhase.MID]: {
      ownCells: 1.2,
      enemyCells: -1.2,
      chainPotential: 2.5, // Chain potential becomes more important
      edgeBonus: 1.0,
      cornerBonus: 1.5,
      criticalMass: 3.0, // Critical mass targeting increases
      dangerPenalty: -2.0,
    },
    [GamePhase.LATE]: {
      ownCells: 1.5,
      enemyCells: -1.5,
      chainPotential: 4.0, // Aggressive chain focus
      edgeBonus: 0.5,
      cornerBonus: 0.5,
      criticalMass: 4.0, // Maximum critical mass focus
      dangerPenalty: -1.0, // More risk tolerance
    },
  };

  // Precomputed position values for fast lookup
  private positionValues: Map<string, number> = new Map();

  async decideMove(
    state: GameState,
    legalMoves: Move[],
    ctx: AiContext
  ): Promise<Move> {
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    if (legalMoves.length === 1) {
      return legalMoves[0];
    }

    const maxThinkingMs = ctx.maxThinkingMs || this.defaultMaxThinkingMs;
    const startTime = performance.now();
    const timeLimit = startTime + maxThinkingMs * 0.85; // Reserve 15% safety margin

    // Precompute position values for this board size
    this.precomputePositionValues(state.board);

    // Detect game phase
    const gamePhase = this.detectGamePhase(state.board);
    const weights = this.phaseWeights[gamePhase];

    // Check for immediate wins/losses (killer moves)
    const immediateMove = this.findImmediateMove(state, legalMoves);
    if (immediateMove) {
      return immediateMove;
    }

    // Score all legal moves with heuristic
    const scoredMoves = legalMoves
      .map((move) => ({
        move,
        score: this.quickEvaluateMove(state, move, weights),
      }))
      .sort((a, b) => b.score - a.score);

    // Select top moves for deeper search
    const topMoves = scoredMoves.slice(0, this.beamWidth);

    // Perform minimax search on top moves
    let bestMove = topMoves[0].move;
    let bestValue = -Infinity;

    // Dynamic depth based on available time and move count
    const searchDepth = maxThinkingMs > 1500 ? 3 : 2;

    for (const { move } of topMoves) {
      if (performance.now() >= timeLimit) break;

      let value: number;
      try {
        const simulation = this.engine.simulateChain(state, move);
        value = this.minimax(
          simulation.finalBoard,
          searchDepth - 1,
          -Infinity,
          Infinity,
          false, // Next level is minimizing (opponent)
          state.players[state.currentPlayerIndex],
          timeLimit,
          weights
        );
      } catch {
        // Fallback to simplified simulation if engine fails
        const boardAfterMove = this.simulateMove(state.board, move);
        value = this.minimax(
          boardAfterMove,
          searchDepth - 1,
          -Infinity,
          Infinity,
          false, // Next level is minimizing (opponent)
          state.players[state.currentPlayerIndex],
          timeLimit,
          weights
        );
      }

      if (value > bestValue) {
        bestValue = value;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Detect the current game phase based on board fill percentage
   */
  private detectGamePhase(board: GameBoard): GamePhase {
    let filledCells = 0;
    const totalCells = board.rows * board.cols;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        if (board.cells[row][col].orbCount > 0) {
          filledCells++;
        }
      }
    }

    const fillPercentage = filledCells / totalCells;

    if (fillPercentage < 0.3) return GamePhase.EARLY;
    if (fillPercentage < 0.7) return GamePhase.MID;
    return GamePhase.LATE;
  }

  /**
   * Precompute position values for fast lookup during evaluation
   */
  private precomputePositionValues(board: GameBoard): void {
    this.positionValues.clear();

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const key = `${row},${col}`;
        let value = 0;

        // Corner positions
        if (
          (row === 0 || row === board.rows - 1) &&
          (col === 0 || col === board.cols - 1)
        ) {
          value = 3; // Corner bonus
        }
        // Edge positions
        else if (
          row === 0 ||
          row === board.rows - 1 ||
          col === 0 ||
          col === board.cols - 1
        ) {
          value = 2; // Edge bonus
        }
        // Interior positions
        else {
          value = 1; // Base value
        }

        this.positionValues.set(key, value);
      }
    }
  }

  /**
   * Quick heuristic evaluation of a move without deep search
   */
  private quickEvaluateMove(
    state: GameState,
    move: Move,
    weights: EvaluationWeights
  ): number {
    const currentPlayer = state.players[state.currentPlayerIndex];

    // Use enhanced chain potential for more accurate evaluation
    const chainValue = this.calculateChainPotentialEnhanced(
      state,
      move,
      currentPlayer
    );

    // Also use proper engine simulation for board evaluation
    try {
      const simulation = this.engine.simulateChain(state, move);
      return (
        this.evaluateBoard(simulation.finalBoard, currentPlayer, weights) +
        chainValue * 3
      );
    } catch {
      // Fallback to original method if simulation fails
      const boardAfterMove = this.simulateMove(state.board, move);
      return (
        this.evaluateBoard(boardAfterMove, currentPlayer, weights) + chainValue
      );
    }
  }

  /**
   * Comprehensive board evaluation using weighted heuristics
   */
  private evaluateBoard(
    board: GameBoard,
    playerId: string,
    weights: EvaluationWeights
  ): number {
    let score = 0;

    // Basic cell counting
    const { ownCells, enemyCells } = this.countCells(board, playerId);
    score += weights.ownCells * ownCells;
    score += weights.enemyCells * enemyCells;

    // Position bonuses
    score += weights.edgeBonus * this.calculatePositionalBonus(board, playerId);

    // Critical mass and chain potential
    score +=
      weights.criticalMass * this.calculateCriticalMassValue(board, playerId);
    score +=
      weights.chainPotential * this.calculateChainPotential(board, playerId);

    // Danger penalties
    score += weights.dangerPenalty * this.calculateDangerLevel(board, playerId);

    return score;
  }

  /**
   * Count own and enemy cells
   */
  private countCells(
    board: GameBoard,
    playerId: string
  ): { ownCells: number; enemyCells: number } {
    let ownCells = 0;
    let enemyCells = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId) {
          ownCells++;
        } else if (cell.playerId && cell.playerId !== playerId) {
          enemyCells++;
        }
      }
    }

    return { ownCells, enemyCells };
  }

  /**
   * Calculate positional bonus for corners and edges
   */
  private calculatePositionalBonus(board: GameBoard, playerId: string): number {
    let bonus = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId) {
          const posValue = this.positionValues.get(`${row},${col}`) || 1;
          bonus += posValue;
        }
      }
    }

    return bonus;
  }

  /**
   * Calculate value based on cells near critical mass
   */
  private calculateCriticalMassValue(
    board: GameBoard,
    playerId: string
  ): number {
    let value = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId === playerId) {
          const orbsNeeded = cell.criticalMass - cell.orbCount;
          if (orbsNeeded <= 1) {
            value += 3; // Very close to explosion
          } else if (orbsNeeded <= 2) {
            value += 1; // Moderately close
          }
        }
      }
    }

    return value;
  }

  /**
   * Calculate chain reaction potential
   */
  private calculateChainPotential(board: GameBoard, playerId: string): number {
    let potential = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (
          cell.playerId === playerId &&
          cell.orbCount >= cell.criticalMass - 1
        ) {
          // Count adjacent enemy cells that could be captured
          const adjacentEnemies = this.countAdjacentEnemies(
            board,
            row,
            col,
            playerId
          );
          potential += adjacentEnemies * 2; // Each enemy cell captured is valuable
        }
      }
    }

    return potential;
  }

  /**
   * Calculate danger level from opponent critical cells
   */
  private calculateDangerLevel(board: GameBoard, playerId: string): number {
    let danger = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId && cell.playerId !== playerId) {
          if (cell.orbCount >= cell.criticalMass - 1) {
            // Enemy cell is critical, check if it threatens our cells
            const threatenedCells = this.countAdjacentOwnCells(
              board,
              row,
              col,
              playerId
            );
            danger += threatenedCells;
          }
        }
      }
    }

    return danger;
  }

  /**
   * Count adjacent enemy cells for chain potential calculation
   */
  private countAdjacentEnemies(
    board: GameBoard,
    row: number,
    col: number,
    playerId: string
  ): number {
    let count = 0;
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
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
        const cell = board.cells[newRow][newCol];
        if (cell.playerId && cell.playerId !== playerId) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Count adjacent own cells for danger calculation
   */
  private countAdjacentOwnCells(
    board: GameBoard,
    row: number,
    col: number,
    playerId: string
  ): number {
    let count = 0;
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
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
        const cell = board.cells[newRow][newCol];
        if (cell.playerId === playerId) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Find immediate win/loss moves (killer moves)
   */
  private findImmediateMove(state: GameState, legalMoves: Move[]): Move | null {
    const currentPlayer = state.players[state.currentPlayerIndex];

    // Check for immediate winning moves using proper simulation
    for (const move of legalMoves) {
      try {
        const simulation = this.engine.simulateChain(state, move);
        if (this.isWinningPosition(simulation.finalBoard, currentPlayer)) {
          return move; // Immediate win
        }
      } catch {
        // Skip if simulation fails
        continue;
      }
    }

    // Look for moves with massive chain reactions (likely game-changing)
    let bestChainMove: Move | null = null;
    let bestChainValue = 0;

    for (const move of legalMoves) {
      const chainValue = this.calculateChainPotentialEnhanced(
        state,
        move,
        currentPlayer
      );
      if (chainValue > bestChainValue) {
        bestChainValue = chainValue;
        bestChainMove = move;
      }
    }

    // If we find a move that gains 10+ advantage through chains, prioritize it
    if (bestChainValue >= 10) {
      return bestChainMove;
    }

    return null;
  }

  /**
   * Check if position is winning for player
   */
  private isWinningPosition(board: GameBoard, playerId: string): boolean {
    // Count active players
    const activePlayers = new Set<string>();

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId && cell.orbCount > 0) {
          activePlayers.add(cell.playerId);
        }
      }
    }

    return activePlayers.size === 1 && activePlayers.has(playerId);
  }

  /**
   * Minimax algorithm with alpha-beta pruning
   */
  private minimax(
    board: GameBoard,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    playerId: string,
    timeLimit: number,
    weights: EvaluationWeights
  ): number {
    // Time check
    if (performance.now() >= timeLimit) {
      return this.evaluateBoard(board, playerId, weights);
    }

    // Base case
    if (depth === 0) {
      return this.evaluateBoard(board, playerId, weights);
    }

    // Check for terminal position
    if (this.isTerminalPosition(board)) {
      return this.evaluateBoard(board, playerId, weights);
    }

    const legalMoves = this.getLegalMoves(board, playerId);
    if (legalMoves.length === 0) {
      return this.evaluateBoard(board, playerId, weights);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        const newBoard = this.simulateMove(board, move);
        const eval_ = this.minimax(
          newBoard,
          depth - 1,
          alpha,
          beta,
          false,
          playerId,
          timeLimit,
          weights
        );
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        const newBoard = this.simulateMove(board, move);
        const eval_ = this.minimax(
          newBoard,
          depth - 1,
          alpha,
          beta,
          true,
          playerId,
          timeLimit,
          weights
        );
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
      return minEval;
    }
  }

  /**
   * Check if position is terminal (game over)
   */
  private isTerminalPosition(board: GameBoard): boolean {
    const activePlayers = new Set<string>();

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        if (cell.playerId && cell.orbCount > 0) {
          activePlayers.add(cell.playerId);
        }
      }
    }

    return activePlayers.size <= 1;
  }

  /**
   * Get all legal moves for current player
   */
  private getLegalMoves(board: GameBoard, playerId: string): Move[] {
    const moves: Move[] = [];

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];
        // Can place on empty cells or own cells
        if (cell.playerId === null || cell.playerId === playerId) {
          moves.push({ row, col, playerId });
        }
      }
    }

    return moves;
  }

  /**
   * Simulate a move and return the resulting board state with full chain reactions
   */
  private simulateMove(board: GameBoard, move: Move): GameBoard {
    // Create deep copy of board
    const newBoard: GameBoard = {
      rows: board.rows,
      cols: board.cols,
      cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
    };

    // Apply the move and trigger chain reactions
    this.applyMoveWithChainReaction(newBoard, move);

    return newBoard;
  }

  /**
   * Apply a move and handle all resulting chain reactions
   */
  private applyMoveWithChainReaction(board: GameBoard, move: Move): void {
    // Apply initial move
    const cell = board.cells[move.row][move.col];
    cell.playerId = move.playerId;
    cell.orbCount += 1;

    // Process chain reactions
    let hasExplosions = true;
    let iterationCount = 0;
    const maxIterations = AI_PERFORMANCE.MAX_SIMULATION_STEPS;

    while (hasExplosions && iterationCount < maxIterations) {
      hasExplosions = false;
      iterationCount++;

      // Find all cells ready to explode
      const explosions: Array<{ row: number; col: number; playerId: string }> =
        [];

      for (let row = 0; row < board.rows; row++) {
        for (let col = 0; col < board.cols; col++) {
          const cell = board.cells[row][col];
          if (cell.orbCount >= cell.criticalMass && cell.playerId) {
            explosions.push({ row, col, playerId: cell.playerId });
          }
        }
      }

      // Process all explosions simultaneously
      for (const explosion of explosions) {
        hasExplosions = true;
        this.processExplosion(
          board,
          explosion.row,
          explosion.col,
          explosion.playerId
        );
      }
    }
  }

  /**
   * Process a single cell explosion and distribute orbs to neighbors
   */
  private processExplosion(
    board: GameBoard,
    row: number,
    col: number,
    playerId: string
  ): void {
    const cell = board.cells[row][col];

    // Clear the exploding cell
    cell.orbCount = 0;
    cell.playerId = null;

    // Distribute orbs to adjacent cells
    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];

    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;

      // Check bounds
      if (
        newRow >= 0 &&
        newRow < board.rows &&
        newCol >= 0 &&
        newCol < board.cols
      ) {
        const targetCell = board.cells[newRow][newCol];

        // Add orb and convert cell to current player
        targetCell.orbCount += 1;
        targetCell.playerId = playerId;
      }
    }
  }

  /**
   * Enhanced chain potential calculation using GameEngine chain simulation
   */
  private calculateChainPotentialEnhanced(
    state: GameState,
    move: Move,
    playerId: string
  ): number {
    try {
      // Use the proper GameEngine to simulate chain reactions
      const simulation = this.engine.simulateChain(state, move);

      if (simulation.stepsCount === 0) {
        return 0; // No chain reaction
      }

      // Calculate advantage gained from the chain
      const advantageBefore = this.engine.calculateBoardAdvantage(
        state.board,
        playerId
      );
      const advantageAfter = this.engine.calculateBoardAdvantage(
        simulation.finalBoard,
        playerId
      );

      // Return the net advantage gained, weighted by chain length
      return advantageAfter - advantageBefore + simulation.stepsCount * 2;
    } catch {
      return 0; // Fallback if simulation fails
    }
  }
}
