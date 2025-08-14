/**
 * Fred Bot - Monte Carlo AI that assumes enemy uses TriggerBot strategy
 *
 * This specialized AI is based on MonteCarloBot but with key modifications:
 * - Assumes opponent follows TriggerBot (aggressive explosive) strategy
 * - Uses explosive cell advantage instead of orb count for board evaluation
 * - Focuses on cells ready to explode rather than total territorial control
 * - Named "Fred" for easy identification in tournaments
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
// import { GameEngine } from '../core/engineSimple'; // Unused, commented out
import type { AiStrategy, AiContext } from './types';
import { AI_PERFORMANCE } from './constants';

interface MCTSNode {
  move: Move | null; // null for root node
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Move[];
}

export class FredBot implements AiStrategy {
  readonly name = 'fred' as const;

  // private engine = new GameEngine(); // Currently unused, commented out
  private defaultMaxThinkingMs = 5000; // 5 seconds default

  private lastFredMove: Move | null = null; // Track Fred's last move for enemy modeling

  async decideMove(
    state: GameState,
    legalMoves: Move[],
    ctx: AiContext
  ): Promise<Move> {
    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    if (legalMoves.length === 1) {
      const move = legalMoves[0];
      this.lastFredMove = move; // Track this move
      return move;
    }

    // Count total orbs on board to determine strategy phase
    const totalOrbsOnBoard = this.countTotalOrbsOnBoard(state.board);

    // Phase 1: Use DefaultBot strategy until 20 orbs are placed
    if (totalOrbsOnBoard < 20) {
      const move = this.useDefaultStrategy(state, legalMoves);
      this.lastFredMove = move; // Track this move
      // Using default strategy (early game)
      return move;
    }

    // Phase 2: Use specialized MCTS with enemy modeling
    const maxThinkingMs = ctx.maxThinkingMs || this.defaultMaxThinkingMs;
    const rng = ctx.rng || Math.random;
    const endTime = performance.now() + maxThinkingMs;

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

    // Run MCTS iterations until time limit (shared limit across all MCTS bots)
    while (
      performance.now() < endTime &&
      iterations < AI_PERFORMANCE.MAX_MCTS_ITERATIONS
    ) {
      // Very high safety limit - rely on time limit instead
      const leaf = this.selectNode(root);
      const expandedNode = this.expandNode(leaf, state, rng);
      const result = this.simulateGame(expandedNode, state, rng);
      this.backpropagate(expandedNode, result);
      iterations++;
    }

    const selectedMove = this.selectBestMove(root);
    this.lastFredMove = selectedMove; // Track this move

    // MCTS completed silently

    // Select best move based on visit count
    return selectedMove;
  }

  /**
   * Selection phase: traverse tree using UCB1
   */
  private selectNode(root: MCTSNode): MCTSNode {
    let node = root;
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = this.getBestUCB1Child(node);
    }
    return node;
  }

  /**
   * Calculate UCB1 value for balancing exploration vs exploitation
   */
  private calculateUCB1(node: MCTSNode, parentVisits: number): number {
    if (node.visits === 0) {
      return Infinity; // Unvisited nodes have infinite value
    }

    const exploitation = node.wins / node.visits;
    const exploration = Math.sqrt((2 * Math.log(parentVisits)) / node.visits);
    return exploitation + exploration;
  }

  /**
   * Get child with highest UCB1 value
   */
  private getBestUCB1Child(parent: MCTSNode): MCTSNode {
    return parent.children.reduce((best, child) => {
      const childUCB1 = this.calculateUCB1(child, parent.visits);
      const bestUCB1 = this.calculateUCB1(best, parent.visits);
      return childUCB1 > bestUCB1 ? child : best;
    });
  }

  /**
   * Expansion phase: add new child node
   */
  private expandNode(
    parent: MCTSNode,
    _state: GameState, // Unused parameter, prefixed with underscore
    rng: () => number
  ): MCTSNode {
    if (parent.untriedMoves.length === 0) {
      return parent; // No untried moves, return parent
    }

    // Select random untried move
    const moveIndex = Math.floor(rng() * parent.untriedMoves.length);
    const move = parent.untriedMoves.splice(moveIndex, 1)[0];

    // Create new child node
    const child: MCTSNode = {
      move,
      parent,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: [],
    };

    parent.children.push(child);
    return child;
  }

  /**
   * Simulation phase: random playout assuming enemy uses TriggerBot strategy
   */
  private simulateGame(
    node: MCTSNode,
    originalState: GameState,
    rng: () => number
  ): number {
    let currentState = this.cloneState(originalState);
    const originalPlayer =
      currentState.players[currentState.currentPlayerIndex];

    // Apply the node's move if it exists
    if (node.move) {
      currentState = this.applyMove(currentState, node.move);
      currentState.currentPlayerIndex =
        (currentState.currentPlayerIndex + 1) % currentState.players.length;
    }

    let simulationSteps = 0;
    const maxSimulationSteps = 200; // Prevent infinite loops

    // Simulate game with enemy using TriggerBot strategy
    while (
      !this.isGameOver(currentState) &&
      simulationSteps < maxSimulationSteps
    ) {
      const currentPlayerId =
        currentState.players[currentState.currentPlayerIndex];
      const legalMoves = this.getLegalMoves(currentState);

      if (legalMoves.length === 0) {
        break; // No legal moves, game over
      }

      let selectedMove: Move;

      // If it's the enemy's turn, use specialized enemy modeling
      if (currentPlayerId !== originalPlayer) {
        selectedMove = this.selectEnemyMove(currentState, legalMoves, rng);
      } else {
        // If it's our turn, use random selection for simulation
        selectedMove = legalMoves[Math.floor(rng() * legalMoves.length)];
      }

      currentState = this.applyMove(currentState, selectedMove);
      currentState.currentPlayerIndex =
        (currentState.currentPlayerIndex + 1) % currentState.players.length;
      simulationSteps++;
    }

    // Evaluate final position using explosive cell advantage
    return this.evaluatePosition(currentState, originalPlayer);
  }

  /**
   * Select enemy move with specialized logic:
   * 1. First check moves adjacent to Fred's last move
   * 2. Use random placement for all other options
   */
  private selectEnemyMove(
    state: GameState,
    legalMoves: Move[],
    rng: () => number
  ): Move {
    // If we have Fred's last move, prioritize adjacent moves
    if (this.lastFredMove) {
      const adjacentMoves = this.getAdjacentMoves(
        this.lastFredMove,
        legalMoves,
        state
      );
      if (adjacentMoves.length > 0) {
        return adjacentMoves[Math.floor(rng() * adjacentMoves.length)];
      }
    }

    // Fallback: random move selection
    return legalMoves[Math.floor(rng() * legalMoves.length)];
  }

  /**
   * Get moves adjacent to a reference position
   */
  private getAdjacentMoves(
    referenceMove: Move,
    legalMoves: Move[],
    state: GameState
  ): Move[] {
    const adjacentPositions = [
      { row: referenceMove.row - 1, col: referenceMove.col }, // up
      { row: referenceMove.row + 1, col: referenceMove.col }, // down
      { row: referenceMove.row, col: referenceMove.col - 1 }, // left
      { row: referenceMove.row, col: referenceMove.col + 1 }, // right
    ].filter(
      (pos) =>
        pos.row >= 0 &&
        pos.row < state.board.rows &&
        pos.col >= 0 &&
        pos.col < state.board.cols
    );

    return legalMoves.filter((move) =>
      adjacentPositions.some(
        (pos) => pos.row === move.row && pos.col === move.col
      )
    );
  }

  /**
   * Evaluate position using explosive cell advantage instead of orb count
   * This is the key difference from MonteCarloBot
   */
  private evaluatePosition(state: GameState, targetPlayerId: string): number {
    const explosiveAdvantage = this.calculateExplosiveCellAdvantage(
      state.board,
      targetPlayerId
    );

    // Normalize to 0-1 range for MCTS
    // Positive advantage = good for target player, negative = bad
    const normalizedScore = 0.5 + explosiveAdvantage / 20; // Scale factor of 20

    // Clamp to [0, 1] range
    return Math.max(0.0, Math.min(1.0, normalizedScore));
  }

  /**
   * NEW METHOD: Calculate board advantage based on explosive potential
   * Instead of counting orbs, count cells ready to explode
   */
  private calculateExplosiveCellAdvantage(
    board: {
      rows: number;
      cols: number;
      cells: {
        orbCount: number;
        criticalMass: number;
        playerId: string | null;
      }[][];
    },
    playerId: string
  ): number {
    let ownExplosiveAdvantage = 0;
    let enemyExplosiveAdvantage = 0;

    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const cell = board.cells[row][col];

        if (cell.orbCount === 0) continue; // Skip empty cells

        const explosivePotential = this.calculateExplosivePotential(cell);

        if (cell.playerId === playerId) {
          ownExplosiveAdvantage += explosivePotential;
        } else {
          enemyExplosiveAdvantage += explosivePotential;
        }
      }
    }

    return ownExplosiveAdvantage - enemyExplosiveAdvantage;
  }

  /**
   * Calculate explosive potential of a single cell
   * Higher score for cells closer to exploding
   */
  private calculateExplosivePotential(cell: {
    orbCount: number;
    criticalMass: number;
  }): number {
    const orbsNeeded = cell.criticalMass - cell.orbCount;

    if (orbsNeeded <= 0) {
      return 10; // Already at critical mass - maximum value
    }

    if (orbsNeeded === 1) {
      return 8; // One orb away from explosion - very high value
    }

    if (orbsNeeded === 2) {
      return 5; // Two orbs away - medium-high value
    }

    if (orbsNeeded === 3) {
      return 3; // Three orbs away - medium value
    }

    return 1; // More than 3 orbs needed - low value
  }

  /**
   * Backpropagation phase: update statistics up the tree
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
   * Select best move based on visit count (most robust)
   */
  private selectBestMove(root: MCTSNode): Move {
    if (root.children.length === 0) {
      throw new Error('No moves explored in MCTS');
    }

    const bestChild = root.children.reduce((best, child) => {
      return child.visits > best.visits ? child : best;
    });

    if (!bestChild.move) {
      throw new Error('Best child has no move');
    }

    return bestChild.move;
  }

  /**
   * Check if game is over (simplified)
   */
  private isGameOver(state: GameState): boolean {
    // Count players with orbs on board
    const playersWithOrbs = new Set<string>();

    for (let row = 0; row < state.board.rows; row++) {
      for (let col = 0; col < state.board.cols; col++) {
        const cell = state.board.cells[row][col];
        if (cell.playerId && cell.orbCount > 0) {
          playersWithOrbs.add(cell.playerId);
        }
      }
    }

    return playersWithOrbs.size <= 1;
  }

  /**
   * Get all legal moves for current player
   */
  private getLegalMoves(state: GameState): Move[] {
    const currentPlayerId = state.players[state.currentPlayerIndex];
    const legalMoves: Move[] = [];

    for (let row = 0; row < state.board.rows; row++) {
      for (let col = 0; col < state.board.cols; col++) {
        const cell = state.board.cells[row][col];

        // Legal if empty or owned by current player
        if (cell.playerId === null || cell.playerId === currentPlayerId) {
          legalMoves.push({ row, col, playerId: currentPlayerId });
        }
      }
    }

    return legalMoves;
  }

  /**
   * Apply move to game state (simplified)
   */
  private applyMove(state: GameState, move: Move): GameState {
    const newState = this.cloneState(state);
    const cell = newState.board.cells[move.row][move.col];

    cell.playerId = move.playerId;
    cell.orbCount += 1;

    // Note: This is a simplified move application
    // Real implementation would handle chain reactions

    return newState;
  }

  /**
   * Create deep copy of game state
   */
  private cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Count total orbs on the board
   */
  private countTotalOrbsOnBoard(board: {
    rows: number;
    cols: number;
    cells: { orbCount: number }[][];
  }): number {
    let totalOrbs = 0;
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        totalOrbs += board.cells[row][col].orbCount;
      }
    }
    return totalOrbs;
  }

  /**
   * Use DefaultBot strategy for early game
   */
  private useDefaultStrategy(state: GameState, legalMoves: Move[]): Move {
    const currentPlayerId = state.players[state.currentPlayerIndex];

    // Simple DefaultBot-like heuristic evaluation
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      let score = 0;
      const cell = state.board.cells[move.row][move.col];

      // Critical mass progress
      const currentOrbs = cell.playerId === currentPlayerId ? cell.orbCount : 0;
      const progressRatio = (currentOrbs + 1) / cell.criticalMass;
      score += progressRatio * 10;

      // Position value (corners > edges > center)
      const isCorner =
        (move.row === 0 || move.row === state.board.rows - 1) &&
        (move.col === 0 || move.col === state.board.cols - 1);
      const isEdge =
        move.row === 0 ||
        move.row === state.board.rows - 1 ||
        move.col === 0 ||
        move.col === state.board.cols - 1;

      if (isCorner) score += 15;
      else if (isEdge) score += 10;
      else score += 5;

      // Building on own cells
      if (cell.playerId === currentPlayerId) {
        score += 5;
      }

      // Simple suicide risk avoidance
      const suicideRisk = this.calculateSimpleSuicideRisk(state, move);
      score -= suicideRisk;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Simple suicide risk calculation for default strategy
   */
  private calculateSimpleSuicideRisk(state: GameState, move: Move): number {
    const currentPlayerId = state.players[state.currentPlayerIndex];
    const targetCell = state.board.cells[move.row][move.col];

    // If placing on enemy cell, very bad
    if (targetCell.playerId && targetCell.playerId !== currentPlayerId) {
      return 100;
    }

    const orbsAfterMove =
      (targetCell.playerId === currentPlayerId ? targetCell.orbCount : 0) + 1;

    // If we're exploding, no risk
    if (orbsAfterMove >= targetCell.criticalMass) {
      return 0;
    }

    // Check adjacent enemies that could explode
    let riskPenalty = 0;
    const adjacentPositions = [
      { row: move.row - 1, col: move.col },
      { row: move.row + 1, col: move.col },
      { row: move.row, col: move.col - 1 },
      { row: move.row, col: move.col + 1 },
    ].filter(
      (pos) =>
        pos.row >= 0 &&
        pos.row < state.board.rows &&
        pos.col >= 0 &&
        pos.col < state.board.cols
    );

    for (const adjPos of adjacentPositions) {
      const adjCell = state.board.cells[adjPos.row][adjPos.col];

      if (adjCell.playerId && adjCell.playerId !== currentPlayerId) {
        const enemyOrbsAfterTheirMove = adjCell.orbCount + 1;
        if (enemyOrbsAfterTheirMove >= adjCell.criticalMass) {
          riskPenalty += 30; // Moderate penalty for suicide risk
        }
      }
    }

    return riskPenalty;
  }
}
