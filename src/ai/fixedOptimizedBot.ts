/**
 * Fixed Optimized Monte Carlo Bot
 *
 * Tests specific fixes for the performance issues in OptimizedMonteCarloBot
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import type { AiStrategy, AiContext } from './types';
import { AI_PERFORMANCE } from './constants';
import { sharedEvaluator, AGGRESSIVE_EVALUATION } from './sharedEvaluation';
import { getTimingProvider } from '../utils/environmentUtils';

interface FixedMCTSNode {
  move: Move | null;
  parent: FixedMCTSNode | null;
  children: FixedMCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Move[];
  heuristicValue: number;
}

export class FixedOptimizedBot implements AiStrategy {
  readonly name = 'fixedOptimized' as const;

  private defaultMaxThinkingMs = 5000;

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
      return winningMoves[0];
    }

    const bestMove = this.runFixedMCTS(state, legalMoves, maxThinkingMs, rng);
    return bestMove;
  }

  private runFixedMCTS(
    state: GameState,
    legalMoves: Move[],
    maxThinkingMs: number,
    rng: () => number
  ): Move {
    // FIX H7: Use same timing provider as MonteCarloBot
    const timer = getTimingProvider();
    const startTime = timer.now();
    const endTime = startTime + maxThinkingMs;

    // FIX H6: Don't pre-order moves - use random order like MonteCarloBot
    const shuffledMoves = [...legalMoves];
    for (let i = shuffledMoves.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledMoves[i], shuffledMoves[j]] = [
        shuffledMoves[j],
        shuffledMoves[i],
      ];
    }

    const root: FixedMCTSNode = {
      move: null,
      parent: null,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: shuffledMoves,
      heuristicValue: 0,
    };

    let iterations = 0;

    while (
      timer.now() < endTime &&
      iterations < AI_PERFORMANCE.MAX_MCTS_ITERATIONS
    ) {
      const leaf = this.selectNode(root);
      const expandedNode = this.expandNode(leaf, state, rng);
      const result = this.simulateGame(expandedNode, state, rng);
      this.backpropagate(expandedNode, result);
      iterations++;
    }

    return this.selectBestMove(root);
  }

  private selectNode(node: FixedMCTSNode): FixedMCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      // FIX H1: No pruning - consider all children
      node = this.selectBestChild(node.children, Math.sqrt(2));
    }
    return node;
  }

  private selectBestChild(
    children: FixedMCTSNode[],
    explorationConstant: number
  ): FixedMCTSNode {
    let bestChild = children[0];
    let bestValue = -Infinity;

    const parentVisits = children[0].parent?.visits || 1;

    for (const child of children) {
      if (child.visits === 0) {
        return child; // Unvisited nodes have highest priority
      }

      // FIX H4: Pure UCB1 without RAVE complications
      const exploitation = child.wins / child.visits;
      const exploration =
        explorationConstant * Math.sqrt(Math.log(parentVisits) / child.visits);
      const ucb1Value = exploitation + exploration;

      if (ucb1Value > bestValue) {
        bestValue = ucb1Value;
        bestChild = child;
      }
    }

    return bestChild;
  }

  private expandNode(
    node: FixedMCTSNode,
    state: GameState,
    rng: () => number
  ): FixedMCTSNode {
    if (node.untriedMoves.length > 0) {
      // FIX H3: No progressive widening - expand freely like MonteCarloBot
      const moveIndex = Math.floor(rng() * node.untriedMoves.length);
      const move = node.untriedMoves.splice(moveIndex, 1)[0];

      const childNode: FixedMCTSNode = {
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
      };

      node.children.push(childNode);
      return childNode;
    }
    return node;
  }

  private simulateGame(
    node: FixedMCTSNode,
    originalState: GameState,
    rng: () => number
  ): number {
    if (!node.move) {
      return 0.5; // Root node, neutral result
    }

    // FIX H2: No transposition table - direct evaluation like MonteCarloBot
    const boardAdvantage = sharedEvaluator.evaluateMove(
      originalState,
      node.move,
      AGGRESSIVE_EVALUATION
    );

    // Convert advantage to win probability (same as MonteCarloBot)
    const winProbability = Math.max(
      0,
      Math.min(1, (boardAdvantage + 100) / 200)
    );

    // Add some randomness to avoid deterministic behavior (same as MonteCarloBot)
    const randomFactor = (rng() - 0.5) * 0.2; // ±0.1 random adjustment
    return Math.max(0, Math.min(1, winProbability + randomFactor));
  }

  private backpropagate(node: FixedMCTSNode, result: number): void {
    let current: FixedMCTSNode | null = node;
    while (current !== null) {
      current.visits++;
      current.wins += result;
      // FIX H1: No pruning during backpropagation
      // FIX H4: No RAVE updates
      current = current.parent;
    }
  }

  private selectBestMove(root: FixedMCTSNode): Move {
    if (root.children.length === 0) {
      throw new Error('No children to select from');
    }

    // FIX H5: Use simple visit count selection like MonteCarloBot
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
}
