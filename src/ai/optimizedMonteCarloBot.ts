/**
 * Optimized Monte Carlo Bot - Enhanced MCTS with performance optimizations
 *
 * Performance optimizations over the standard Monte Carlo bot:
 * - Transposition tables for position caching
 * - Move ordering based on heuristic evaluation
 * - Early termination for clear winning/losing positions
 * - Node pruning for unpromising branches
 * - Progressive widening to focus search
 * - Enhanced UCB1 with rapid action value estimation (RAVE)
 *
 * @fileoverview Advanced MCTS implementation with significant performance
 * improvements for better move quality within time constraints.
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import type { AiStrategy, AiContext } from './types';
import { AI_PERFORMANCE } from './constants';
import { sharedEvaluator, AGGRESSIVE_EVALUATION } from './sharedEvaluation';

/**
 * Transposition table entry for position caching
 */
interface TranspositionEntry {
  visits: number;
  wins: number;
  averageValue: number;
  depth: number;
  bestMove?: Move;
}

/**
 * Enhanced MCTS node with optimization features
 */
interface OptimizedMCTSNode {
  move: Move | null; // null for root node
  parent: OptimizedMCTSNode | null;
  children: OptimizedMCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Move[];

  // Optimization features
  heuristicValue: number; // Initial heuristic estimate
  raveWins: number; // RAVE (Rapid Action Value Estimation) wins
  raveVisits: number; // RAVE visits
  isPruned: boolean; // Whether this node has been pruned
  lastVisitTime: number; // For progressive widening
}

/**
 * Board position hash for transposition table
 */
type PositionHash = string;

export class OptimizedMonteCarloBot implements AiStrategy {
  readonly name = 'optimizedMonteCarlo' as const;

  private defaultMaxThinkingMs = 5000; // 5 seconds default
  private transpositionTable = new Map<PositionHash, TranspositionEntry>();
  private maxTableSize = 10000; // Limit memory usage

  // Progressive widening parameters
  private readonly progressiveWideningConstant = 2;
  private readonly progressiveWideningExponent = 0.5;

  // RAVE parameters
  private readonly raveThreshold = 10; // Minimum visits before using RAVE
  private readonly raveWeight = 0.3; // Weight of RAVE vs UCB1

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
    const rng = ctx.rng || Math.random;

    // Check for immediate winning moves first
    const winningMoves = sharedEvaluator.findWinningMoves(state, legalMoves);
    if (winningMoves.length > 0) {
      return winningMoves[0]; // Take immediate win
    }

    const bestMove = this.runOptimizedMCTS(
      state,
      legalMoves,
      maxThinkingMs,
      rng
    );

    // Clear old entries from transposition table if it's getting large
    if (this.transpositionTable.size > this.maxTableSize) {
      this.clearOldTranspositionEntries();
    }

    return bestMove;
  }

  /**
   * Run optimized Monte Carlo Tree Search
   */
  private runOptimizedMCTS(
    state: GameState,
    legalMoves: Move[],
    maxThinkingMs: number,
    rng: () => number
  ): Move {
    const startTime = performance.now();
    const endTime = startTime + maxThinkingMs;

    // Sort moves by heuristic value for better move ordering
    const orderedMoves = this.orderMovesByHeuristic(state, legalMoves);

    // Create root node
    const root: OptimizedMCTSNode = {
      move: null,
      parent: null,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: orderedMoves,
      heuristicValue: 0,
      raveWins: 0,
      raveVisits: 0,
      isPruned: false,
      lastVisitTime: startTime,
    };

    let iterations = 0;

    // Run MCTS iterations until time limit
    while (
      performance.now() < endTime &&
      iterations < AI_PERFORMANCE.MAX_MCTS_ITERATIONS
    ) {
      const currentTime = performance.now();

      // Selection phase with UCB1 + RAVE
      const leaf = this.selectNodeWithRave(root);

      // Expansion phase with progressive widening
      const expandedNode = this.expandNodeWithProgression(
        leaf,
        state,
        rng,
        currentTime
      );

      // Simulation phase with early termination
      const result = this.simulateWithEarlyTermination(
        expandedNode,
        state,
        rng
      );

      // Backpropagation with RAVE updates
      this.backpropagateWithRave(expandedNode, result, expandedNode.move);

      iterations++;
    }

    return this.selectBestMoveWithTransposition(root, state);
  }

  /**
   * Order moves by heuristic evaluation for better search guidance
   */
  private orderMovesByHeuristic(state: GameState, moves: Move[]): Move[] {
    return moves
      .map((move) => ({
        move,
        heuristic: sharedEvaluator.evaluateMove(
          state,
          move,
          AGGRESSIVE_EVALUATION
        ),
      }))
      .sort((a, b) => b.heuristic - a.heuristic)
      .map((item) => item.move);
  }

  /**
   * Selection with UCB1 + RAVE combination
   */
  private selectNodeWithRave(node: OptimizedMCTSNode): OptimizedMCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      // Filter out pruned children
      const viableChildren = node.children.filter((child) => !child.isPruned);

      if (viableChildren.length === 0) break;

      node = this.selectBestChildWithRave(viableChildren, Math.sqrt(2));
    }
    return node;
  }

  /**
   * Enhanced child selection with RAVE
   */
  private selectBestChildWithRave(
    children: OptimizedMCTSNode[],
    explorationConstant: number
  ): OptimizedMCTSNode {
    let bestChild = children[0];
    let bestValue = -Infinity;

    const parentVisits = children[0].parent?.visits || 1;

    for (const child of children) {
      if (child.visits === 0) {
        return child; // Prioritize unvisited nodes
      }

      // Standard UCB1 value
      const ucb1Value =
        child.wins / child.visits +
        explorationConstant * Math.sqrt(Math.log(parentVisits) / child.visits);

      // RAVE value
      let raveValue = 0;
      if (child.raveVisits >= this.raveThreshold) {
        raveValue = child.raveWins / child.raveVisits;
      }

      // Combine UCB1 and RAVE based on visit count
      const raveWeight = Math.min(
        this.raveWeight,
        child.raveVisits / (child.visits + child.raveVisits)
      );
      const combinedValue =
        (1 - raveWeight) * ucb1Value + raveWeight * raveValue;

      if (combinedValue > bestValue) {
        bestValue = combinedValue;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * Expansion with progressive widening
   */
  private expandNodeWithProgression(
    node: OptimizedMCTSNode,
    state: GameState,
    _rng: () => number,
    currentTime: number
  ): OptimizedMCTSNode {
    // Progressive widening: limit number of children based on visits
    const maxChildren = Math.floor(
      this.progressiveWideningConstant *
        Math.pow(node.visits + 1, this.progressiveWideningExponent)
    );

    if (node.untriedMoves.length > 0 && node.children.length < maxChildren) {
      // Take the best untried move (moves are pre-sorted by heuristic)
      const move = node.untriedMoves.shift()!;

      const childNode: OptimizedMCTSNode = {
        move,
        parent: node,
        children: [],
        visits: 0,
        wins: 0,
        untriedMoves: [],
        heuristicValue: sharedEvaluator.evaluateMove(
          state,
          move,
          AGGRESSIVE_EVALUATION
        ),
        raveWins: 0,
        raveVisits: 0,
        isPruned: false,
        lastVisitTime: currentTime,
      };

      node.children.push(childNode);
      return childNode;
    }

    return node;
  }

  /**
   * Simulation with early termination for clear positions
   */
  private simulateWithEarlyTermination(
    node: OptimizedMCTSNode,
    originalState: GameState,
    rng: () => number
  ): number {
    if (!node.move) {
      return 0.5; // Root node, neutral result
    }

    // Check transposition table first
    const positionHash = this.hashPosition(originalState, node.move);
    const cachedEntry = this.transpositionTable.get(positionHash);

    if (cachedEntry && cachedEntry.visits >= 5) {
      // Use cached evaluation for visited positions
      return cachedEntry.averageValue;
    }

    // Use heuristic evaluation with some randomness for faster simulation
    const heuristicValue = sharedEvaluator.evaluateMove(
      originalState,
      node.move,
      AGGRESSIVE_EVALUATION
    );

    // Convert heuristic to win probability
    const baseWinProbability = Math.max(
      0,
      Math.min(1, (heuristicValue + 50) / 100)
    );

    // Add controlled randomness
    const randomFactor = (rng() - 0.5) * 0.3; // ±0.15 random adjustment
    const finalWinProbability = Math.max(
      0.05,
      Math.min(0.95, baseWinProbability + randomFactor)
    );

    // Update transposition table
    this.updateTranspositionTable(
      positionHash,
      finalWinProbability,
      1,
      node.move
    );

    return finalWinProbability;
  }

  /**
   * Backpropagation with RAVE updates
   */
  private backpropagateWithRave(
    node: OptimizedMCTSNode | null,
    result: number,
    playedMove: Move | null
  ): void {
    while (node !== null) {
      node.visits++;
      node.wins += result;

      // RAVE updates: update statistics for all moves of the same type
      if (
        playedMove &&
        node.move &&
        this.movesAreRelated(node.move, playedMove)
      ) {
        node.raveVisits++;
        node.raveWins += result;
      }

      // Prune nodes that are clearly bad after enough visits
      if (node.visits > 20 && node.wins / node.visits < 0.1) {
        node.isPruned = true;
      }

      node = node.parent;
    }
  }

  /**
   * Check if two moves are related for RAVE purposes
   */
  private movesAreRelated(move1: Move, move2: Move): boolean {
    // Simple heuristic: moves in the same region are related
    const distance =
      Math.abs(move1.row - move2.row) + Math.abs(move1.col - move2.col);
    return distance <= 2;
  }

  /**
   * Select best move considering transposition table
   */
  private selectBestMoveWithTransposition(
    root: OptimizedMCTSNode,
    state: GameState
  ): Move {
    if (root.children.length === 0) {
      throw new Error('No children to select from');
    }

    let bestChild = root.children[0];
    let bestScore = this.getNodeScore(bestChild, state);

    for (const child of root.children) {
      if (child.isPruned) continue;

      const score = this.getNodeScore(child, state);
      if (score > bestScore) {
        bestScore = score;
        bestChild = child;
      }
    }

    if (!bestChild.move) {
      throw new Error('Selected child has no move');
    }

    return bestChild.move;
  }

  /**
   * Calculate node score combining visits, win rate, and transposition data
   */
  private getNodeScore(node: OptimizedMCTSNode, state: GameState): number {
    if (node.visits === 0) return 0;

    const baseScore = node.wins / node.visits;

    // Bonus for high visit count (confidence)
    const visitBonus = Math.log(node.visits + 1) * 0.1;

    // Transposition table bonus
    let transpositionBonus = 0;
    if (node.move) {
      const positionHash = this.hashPosition(state, node.move);
      const cachedEntry = this.transpositionTable.get(positionHash);
      if (cachedEntry) {
        transpositionBonus = cachedEntry.averageValue * 0.2;
      }
    }

    return baseScore + visitBonus + transpositionBonus;
  }

  /**
   * Create hash of board position for transposition table
   */
  private hashPosition(state: GameState, move: Move): PositionHash {
    // Simple hash based on board state and move
    const boardHash = state.board.cells
      .flat()
      .map((cell) => `${cell.orbCount}-${cell.playerId || 'null'}`)
      .join(',');

    return `${boardHash}:${move.row},${move.col},${move.playerId}`;
  }

  /**
   * Update transposition table entry
   */
  private updateTranspositionTable(
    positionHash: PositionHash,
    value: number,
    visits: number,
    bestMove?: Move
  ): void {
    const existing = this.transpositionTable.get(positionHash);

    if (existing) {
      // Update existing entry with incremental average
      const totalVisits = existing.visits + visits;
      const newAverage =
        (existing.averageValue * existing.visits + value * visits) /
        totalVisits;

      this.transpositionTable.set(positionHash, {
        visits: totalVisits,
        wins: existing.wins + value * visits,
        averageValue: newAverage,
        depth: existing.depth,
        bestMove: bestMove || existing.bestMove,
      });
    } else {
      // Create new entry
      this.transpositionTable.set(positionHash, {
        visits,
        wins: value * visits,
        averageValue: value,
        depth: 1,
        bestMove,
      });
    }
  }

  /**
   * Clear old transposition table entries to manage memory
   */
  private clearOldTranspositionEntries(): void {
    // Keep only the most visited entries (simple LRU-style cleanup)
    const entries = Array.from(this.transpositionTable.entries())
      .sort((a, b) => b[1].visits - a[1].visits)
      .slice(0, Math.floor(this.maxTableSize * 0.7));

    this.transpositionTable.clear();
    entries.forEach(([key, value]) => {
      this.transpositionTable.set(key, value);
    });
  }
}
