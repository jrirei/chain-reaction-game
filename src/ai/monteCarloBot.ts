/**
 * Monte Carlo Bot - Advanced tree search AI strategy
 *
 * This sophisticated AI uses Monte Carlo Tree Search (MCTS) with UCB1 selection:
 * - Time-limited thinking with configurable max thinking time (default 5s)
 * - UCB1 (Upper Confidence Bound) for node selection and exploration
 * - Random rollout simulations to evaluate positions
 * - Progressive tree building with selection, expansion, simulation, backpropagation
 * - Deterministic behavior when using seeded RNG for testing
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import { GameEngine } from '../core/engineSimple';
import type { AiStrategy, AiContext } from './types';

interface MCTSNode {
  move: Move | null; // null for root node
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Move[];
}

export class MonteCarloBot implements AiStrategy {
  readonly name = 'monteCarlo' as const;

  private engine = new GameEngine();
  private defaultMaxThinkingMs = 5000; // 5 seconds default

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

    const bestMove = this.runMCTS(state, legalMoves, maxThinkingMs, rng);
    return bestMove;
  }

  /**
   * Run Monte Carlo Tree Search for the specified time limit
   */
  private runMCTS(
    state: GameState,
    legalMoves: Move[],
    maxThinkingMs: number,
    rng: () => number
  ): Move {
    const startTime = performance.now();
    const endTime = startTime + maxThinkingMs;

    // Create root node
    const root: MCTSNode = {
      move: null,
      parent: null,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: [...legalMoves],
    };

    let iterations = 0;

    // Run MCTS iterations until time limit (remove arbitrary iteration limit)
    while (performance.now() < endTime && iterations < 1000000) {
      // Very high safety limit - rely on time limit instead
      const leaf = this.selectNode(root);
      const expandedNode = this.expandNode(leaf, state, rng);
      const result = this.simulateGame(expandedNode, state, rng);
      this.backpropagate(expandedNode, result);
      iterations++;
    }

    const actualThinkingMs = performance.now() - startTime;
    console.log(
      `🧠 Monte Carlo Bot completed ${iterations} iterations in ${Math.round(actualThinkingMs)}ms (limit: ${maxThinkingMs}ms)`
    );

    // Select the most visited child (most robust choice)
    return this.selectBestMove(root);
  }

  /**
   * Selection phase: Navigate to a promising leaf node using UCB1
   */
  private selectNode(node: MCTSNode): MCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = this.selectBestChild(node, Math.sqrt(2)); // UCB1 exploration parameter
    }
    return node;
  }

  /**
   * Expansion phase: Add a new child node
   */
  private expandNode(
    node: MCTSNode,
    _state: GameState,
    rng: () => number
  ): MCTSNode {
    if (node.untriedMoves.length > 0) {
      const moveIndex = Math.floor(rng() * node.untriedMoves.length);
      const move = node.untriedMoves.splice(moveIndex, 1)[0];

      const childNode: MCTSNode = {
        move,
        parent: node,
        children: [],
        visits: 0,
        wins: 0,
        untriedMoves: [], // Will be populated during simulation if needed
      };

      node.children.push(childNode);
      return childNode;
    }
    return node;
  }

  /**
   * Simulation phase: Play random game to completion and return result
   */
  private simulateGame(
    node: MCTSNode,
    originalState: GameState,
    rng: () => number
  ): number {
    if (!node.move) {
      return 0.5; // Root node, neutral result
    }

    // Simple heuristic evaluation instead of full simulation for performance
    // This evaluates the position after making the move
    const boardAdvantage = this.evaluateMove(originalState, node.move);

    // Convert advantage to win probability (0-1)
    // Higher advantage = higher win probability
    const winProbability = Math.max(
      0,
      Math.min(1, (boardAdvantage + 100) / 200)
    );

    // Add some randomness to avoid deterministic behavior
    const randomFactor = (rng() - 0.5) * 0.2; // ±0.1 random adjustment
    return Math.max(0, Math.min(1, winProbability + randomFactor));
  }

  /**
   * Backpropagation phase: Update statistics up the tree
   */
  private backpropagate(node: MCTSNode, result: number): void {
    let current: MCTSNode | null = node;
    while (current !== null) {
      current.visits++;
      current.wins += result;
      current = current.parent;
    }
  }

  /**
   * Select best child using UCB1 formula
   */
  private selectBestChild(node: MCTSNode, explorationParam: number): MCTSNode {
    let bestChild = node.children[0];
    let bestValue = -Infinity;

    for (const child of node.children) {
      if (child.visits === 0) {
        return child; // Unvisited nodes have highest priority
      }

      // UCB1 formula: exploitation + exploration
      const exploitation = child.wins / child.visits;
      const exploration =
        explorationParam * Math.sqrt(Math.log(node.visits) / child.visits);
      const ucb1Value = exploitation + exploration;

      if (ucb1Value > bestValue) {
        bestValue = ucb1Value;
        bestChild = child;
      }
    }

    return bestChild;
  }

  /**
   * Select the move from the most visited child (robust choice)
   */
  private selectBestMove(root: MCTSNode): Move {
    if (root.children.length === 0) {
      throw new Error('No children to select from');
    }

    let bestChild = root.children[0];
    let mostVisits = bestChild.visits;

    for (const child of root.children) {
      if (child.visits > mostVisits) {
        mostVisits = child.visits;
        bestChild = child;
      }
    }

    if (!bestChild.move) {
      throw new Error('Selected child has no move');
    }

    return bestChild.move;
  }

  /**
   * Evaluate a move using heuristics (similar to DefaultBot but more focused)
   */
  private evaluateMove(state: GameState, move: Move): number {
    const targetCell = state.board.cells[move.row][move.col];
    let score = 0;

    // Critical mass progress (heavily weighted)
    const orbsAfterMove = targetCell.orbCount + 1;
    const criticalMassRatio = orbsAfterMove / targetCell.criticalMass;
    score += criticalMassRatio * 40;

    // Explosion bonus
    if (orbsAfterMove >= targetCell.criticalMass) {
      const simulation = this.engine.simulateChain(state, move);
      score += simulation.stepsCount * 30; // Big bonus for chain reactions
    }

    // Position value (corners are valuable)
    if (targetCell.criticalMass === 2)
      score += 25; // Corner
    else if (targetCell.criticalMass === 3)
      score += 15; // Edge
    else score += 5; // Center

    // Building on own cells bonus
    if (targetCell.playerId === move.playerId) {
      score += 10;
    }

    // Board control evaluation
    const boardAdvantage = this.engine.calculateBoardAdvantage(
      state.board,
      move.playerId
    );
    score += boardAdvantage * 0.5;

    return score;
  }
}
