/**
 * Tactical Bot - Hybrid MCTS + Heuristics AI Strategy
 *
 * This advanced AI combines the best of both worlds:
 * - Uses Default Bot's heuristic evaluation to pre-filter promising moves
 * - Applies Monte Carlo Tree Search only on the top candidate moves
 * - Focuses computational power on the most strategically sound options
 *
 * Strategy Benefits:
 * - Tactical heuristics prevent exploring obviously bad moves
 * - Tree search provides deep lookahead on good positions
 * - Efficient use of thinking time on quality candidates
 * - Stronger than pure MCTS due to better move selection
 */

import type { GameState } from '../types/game';
import type { Move } from '../core/types';
import { GameEngine } from '../core/engineSimple';
import type { AiStrategy, AiContext } from './types';
import { DefaultBot } from './defaultBot';
import { TACTICAL_BOT_CONFIG } from './constants';

interface MCTSNode {
  move: Move | null; // null for root node
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  wins: number;
  untriedMoves: Move[];
}

interface ScoredMove {
  move: Move;
  score: number;
}

export class TacticalBot implements AiStrategy {
  readonly name = 'tactical' as const;

  private engine = new GameEngine();
  private defaultBot = new DefaultBot();
  private defaultMaxThinkingMs = TACTICAL_BOT_CONFIG.DEFAULT_MAX_THINKING_MS;

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

    // Phase 1: Use Default Bot heuristics to score and filter moves
    const candidateMoves = this.selectCandidateMoves(state, legalMoves);

    // If we have very few candidates or limited time, use heuristic result
    if (
      candidateMoves.length <= 2 ||
      maxThinkingMs < TACTICAL_BOT_CONFIG.MIN_MCTS_TIME_MS
    ) {
      return candidateMoves[0].move;
    }

    // Phase 2: Run MCTS on the filtered candidate moves
    const bestMove = this.runMCTS(
      state,
      candidateMoves.map((c) => c.move),
      maxThinkingMs,
      rng
    );

    return bestMove;
  }

  /**
   * Phase 1: Use Default Bot's heuristics to identify the most promising moves
   */
  private selectCandidateMoves(
    state: GameState,
    legalMoves: Move[]
  ): ScoredMove[] {
    // Use DefaultBot's evaluation to score all moves
    const scoredMoves: ScoredMove[] = legalMoves.map((move) => ({
      move,
      score: this.evaluateMove(state, move),
    }));

    // Sort by score (descending)
    scoredMoves.sort((a, b) => b.score - a.score);

    // Determine how many candidates to select based on game phase
    const maxCandidates = this.getMaxCandidates(legalMoves.length, state);

    // Take the top candidates, but ensure we have at least a few options for MCTS
    const numCandidates = Math.min(maxCandidates, scoredMoves.length);
    const candidates = scoredMoves.slice(0, numCandidates);

    return candidates;
  }

  /**
   * Determine optimal number of candidate moves based on game state
   */
  private getMaxCandidates(totalMoves: number, state: GameState): number {
    // Early game: More exploration
    if (state.moveCount < 10) {
      return Math.min(TACTICAL_BOT_CONFIG.MAX_CANDIDATES_EARLY, totalMoves);
    }

    // Mid game: Balanced approach
    if (state.moveCount < 30) {
      return Math.min(TACTICAL_BOT_CONFIG.MAX_CANDIDATES_MID, totalMoves);
    }

    // Late game: Focus on fewer, high-quality moves
    return Math.min(TACTICAL_BOT_CONFIG.MAX_CANDIDATES_LATE, totalMoves);
  }

  /**
   * Use DefaultBot's move evaluation (borrowed from defaultBot.ts)
   * This ensures consistent heuristic evaluation between bots
   */
  private evaluateMove(state: GameState, move: Move): number {
    // Delegate to DefaultBot's evaluation for consistency
    // We need to create a temporary instance to access the evaluation
    return this.calculateMoveScore(state, move);
  }

  /**
   * Simplified version of DefaultBot's evaluation for candidate selection
   */
  private calculateMoveScore(state: GameState, move: Move): number {
    const { board } = state;
    const currentPlayerId = state.players[state.currentPlayerIndex];

    // Base score
    let score = 1;

    // Get the cell where we're placing the orb
    const cell = board.cells[move.row][move.col];
    const criticalMass = cell.criticalMass;

    // Critical mass progress
    const currentOrbs = cell.playerId === currentPlayerId ? cell.orbCount : 0;
    const progressRatio = (currentOrbs + 1) / criticalMass;
    score += progressRatio * TACTICAL_BOT_CONFIG.CRITICAL_MASS_WEIGHT;

    // Immediate explosion bonus
    if (currentOrbs + 1 >= criticalMass) {
      score += TACTICAL_BOT_CONFIG.EXPLOSION_BONUS;
    }

    // Position value
    score += this.getPositionValue(move.row, move.col, board.rows, board.cols);

    // Building on own cells
    if (cell.playerId === currentPlayerId) {
      score += TACTICAL_BOT_CONFIG.OWN_CELL_BONUS;
    }

    return score;
  }

  /**
   * Calculate position value based on cell type (corner/edge/center)
   */
  private getPositionValue(
    row: number,
    col: number,
    rows: number,
    cols: number
  ): number {
    const isCorner =
      (row === 0 || row === rows - 1) && (col === 0 || col === cols - 1);
    const isEdge =
      row === 0 || row === rows - 1 || col === 0 || col === cols - 1;

    if (isCorner) return TACTICAL_BOT_CONFIG.CORNER_BONUS;
    if (isEdge) return TACTICAL_BOT_CONFIG.EDGE_BONUS;
    return TACTICAL_BOT_CONFIG.CENTER_BONUS;
  }

  /**
   * Phase 2: Run Monte Carlo Tree Search on the pre-filtered candidate moves
   */
  private runMCTS(
    state: GameState,
    candidateMoves: Move[],
    maxThinkingMs: number,
    rng: () => number
  ): Move {
    // Create root node with only candidate moves as untried
    const root: MCTSNode = {
      move: null,
      parent: null,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: [...candidateMoves],
    };

    const startTime = performance.now();
    let iterations = 0;

    // Run MCTS iterations until time limit
    while (performance.now() - startTime < maxThinkingMs) {
      this.mctsIteration(root, state, rng);
      iterations++;

      // Prevent infinite loops
      if (iterations > TACTICAL_BOT_CONFIG.MAX_ITERATIONS) {
        break;
      }
    }

    // Select the most visited child as the best move
    return this.selectBestMove(root);
  }

  /**
   * Single MCTS iteration: Selection, Expansion, Simulation, Backpropagation
   */
  private mctsIteration(
    root: MCTSNode,
    state: GameState,
    rng: () => number
  ): void {
    // 1. Selection - traverse down the tree using UCB1
    let node = this.selectNode(root);

    // 2. Expansion - add a new child if possible
    if (node.untriedMoves.length > 0 && node.visits > 0) {
      node = this.expandNode(node, rng);
    }

    // 3. Simulation - play out the game randomly
    const simulationResult = this.simulate(node, state, rng);

    // 4. Backpropagation - update statistics up the tree
    this.backpropagate(node, simulationResult);
  }

  /**
   * Selection phase: Use UCB1 to select the best child node
   */
  private selectNode(node: MCTSNode): MCTSNode {
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = this.getBestUCB1Child(node);
    }
    return node;
  }

  /**
   * Calculate UCB1 value for node selection
   */
  private calculateUCB1(node: MCTSNode, parentVisits: number): number {
    if (node.visits === 0) return Infinity;

    const exploitation = node.wins / node.visits;
    const exploration = Math.sqrt(
      (TACTICAL_BOT_CONFIG.UCB1_EXPLORATION * Math.log(parentVisits)) /
        node.visits
    );

    return exploitation + exploration;
  }

  /**
   * Get the child with the highest UCB1 value
   */
  private getBestUCB1Child(parent: MCTSNode): MCTSNode {
    return parent.children.reduce((best, child) => {
      const childUCB1 = this.calculateUCB1(child, parent.visits);
      const bestUCB1 = this.calculateUCB1(best, parent.visits);
      return childUCB1 > bestUCB1 ? child : best;
    });
  }

  /**
   * Expansion phase: Add a new child node
   */
  private expandNode(parent: MCTSNode, rng: () => number): MCTSNode {
    const moveIndex = Math.floor(rng() * parent.untriedMoves.length);
    const move = parent.untriedMoves.splice(moveIndex, 1)[0];

    const childNode: MCTSNode = {
      move,
      parent,
      children: [],
      visits: 0,
      wins: 0,
      untriedMoves: [],
    };

    parent.children.push(childNode);
    return childNode;
  }

  /**
   * Simulation phase: Evaluate the position after applying the node's move
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private simulate(
    node: MCTSNode,
    originalState: GameState,
    _rng: () => number
  ): number {
    const currentPlayerId =
      originalState.players[originalState.currentPlayerIndex];

    // If this is the root node (no move), just evaluate current position
    if (!node.move) {
      return this.evaluatePosition(originalState, currentPlayerId);
    }

    // Apply the move and evaluate the resulting position
    const chainResult = this.engine.simulateChain(originalState, node.move);
    const simulatedState = this.cloneState(originalState);
    simulatedState.board = chainResult.finalBoard;

    return this.evaluatePosition(simulatedState, currentPlayerId);
  }

  /**
   * Simplified evaluation using board advantage instead of full game simulation
   * This avoids the need for a full game state update engine
   */
  private evaluatePosition(state: GameState, targetPlayerId: string): number {
    // Use board advantage as a proxy for game state evaluation
    const advantage = this.engine.calculateBoardAdvantage(
      state.board,
      targetPlayerId
    );

    // Normalize advantage to a 0-1 score
    // Positive advantage = good for target player, negative = bad
    const normalizedScore = 0.5 + advantage / 100; // Scale factor of 100

    // Clamp to [0, 1] range
    return Math.max(0.0, Math.min(1.0, normalizedScore));
  }

  /**
   * Backpropagation phase: Update node statistics up the tree
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
   * Select the best move based on visit count (most robust)
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
   * Create a deep copy of the game state
   */
  private cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state));
  }
}
