import type {
  Cell,
  GameBoard,
  PlayerId,
  ExplosionStep,
  OrbMovementAnimation,
} from '../types';
import { deepCloneBoard, getAdjacentCells } from './boardOperations';
import { processExplosionImmutable } from './immutableUtils';
import { PLAYER_COLORS, GAME_CONFIG } from './constants';
import { getActivePlayers } from './gameValidation';

/**
 * Identifies all cells on the board that have reached their critical mass and are ready to explode.
 *
 * A cell explodes when its orb count equals or exceeds its critical mass:
 * - Corner cells: critical mass = 2
 * - Edge cells: critical mass = 3
 * - Interior cells: critical mass = 4
 *
 * When cells explode, they distribute their orbs to adjacent cells, potentially
 * causing chain reactions.
 *
 * @param board - The current game board state to analyze
 * @returns Array of Cell objects that are ready to explode
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * let newBoard = placeOrb(board, 0, 0, 'player1');
 * newBoard = placeOrb(newBoard, 0, 0, 'player1'); // Corner cell now has 2 orbs
 *
 * const exploding = getExplodingCells(newBoard);
 * console.log(exploding.length); // 1
 * console.log(exploding[0].row); // 0
 * console.log(exploding[0].col); // 0
 * console.log(exploding[0].orbCount >= exploding[0].criticalMass); // true
 * ```
 */
export const getExplodingCells = (board: GameBoard): Cell[] => {
  const explodingCells: Cell[] = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.orbCount >= cell.criticalMass) {
        explodingCells.push(cell);
      }
    }
  }

  return explodingCells;
};

/**
 * Processes a single cell explosion and returns the updated board state.
 *
 * When a cell explodes:
 * 1. The exploding cell is emptied (orbs = 0, owner = null)
 * 2. Each adjacent cell receives one orb
 * 3. All affected adjacent cells become owned by the exploding player
 * 4. Uses immutable updates for performance and safety
 *
 * If the cell has not reached critical mass, the board is returned unchanged.
 *
 * @param board - The current game board state
 * @param row - Row coordinate of the cell to explode (0-indexed)
 * @param col - Column coordinate of the cell to explode (0-indexed)
 * @returns New GameBoard with explosion processed, or original board if no explosion
 *
 * @example
 * ```typescript
 * const board = createEmptyBoard(3, 3);
 * let newBoard = placeOrb(board, 0, 0, 'player1');
 * newBoard = placeOrb(newBoard, 0, 0, 'player1'); // Corner cell ready to explode
 *
 * const exploded = processExplosion(newBoard, 0, 0);
 *
 * // Original cell is now empty
 * console.log(exploded.cells[0][0].orbCount); // 0
 * console.log(exploded.cells[0][0].playerId); // null
 *
 * // Adjacent cells received orbs
 * console.log(exploded.cells[0][1].orbCount); // 1 (right)
 * console.log(exploded.cells[1][0].orbCount); // 1 (down)
 * console.log(exploded.cells[0][1].playerId); // 'player1' (captured)
 * ```
 */
export const processExplosion = (
  board: GameBoard,
  row: number,
  col: number
): GameBoard => {
  const cell = board.cells[row][col];

  if (cell.orbCount < cell.criticalMass) {
    return board; // No changes needed
  }

  // Get adjacent cells
  const adjacentCells = getAdjacentCells(board, row, col);

  // Process explosion using immutable updates
  return processExplosionImmutable(board, row, col, adjacentCells);
};

/**
 * Processes all chain reactions until no more explosions occur
 */
export const processChainReactions = (
  board: GameBoard
): {
  explosionSteps: GameBoard[];
  finalBoard: GameBoard;
} => {
  const explosionSteps: GameBoard[] = [];
  let currentBoard = deepCloneBoard(board);
  let stepCount = 0;

  while (stepCount < GAME_CONFIG.MAX_CHAIN_REACTION_STEPS) {
    const explodingCells = getExplodingCells(currentBoard);

    if (explodingCells.length === 0) {
      break; // No more explosions
    }

    // Process all explosions simultaneously
    let newBoard = currentBoard;
    for (const cell of explodingCells) {
      newBoard = processExplosion(newBoard, cell.row, cell.col);
    }

    explosionSteps.push(deepCloneBoard(newBoard));
    currentBoard = newBoard;
    stepCount++;
  }

  return {
    explosionSteps,
    finalBoard: currentBoard,
  };
};

/**
 * Processes chain reactions sequentially with animation data
 * Returns step-by-step explosion data with orb movement animations
 */
export const processChainReactionsSequential = (
  board: GameBoard,
  currentPlayerId: string,
  maxSteps: number = GAME_CONFIG.MAX_CHAIN_REACTION_STEPS,
  playerColor?: string // Optional player color override
): {
  explosionSteps: ExplosionStep[];
  finalBoard: GameBoard;
  safetyLimitReached: boolean;
  gameWonEarly?: boolean;
} => {
  const steps: ExplosionStep[] = [];
  let currentBoard = deepCloneBoard(board);
  let stepCount = 0;
  let gameWonEarly = false;

  while (stepCount < maxSteps) {
    const explodingCells = getExplodingCells(currentBoard);

    if (explodingCells.length === 0) {
      break; // No more explosions
    }

    // Calculate orb movements for this step
    const orbMovements = calculateOrbMovements(
      explodingCells,
      currentBoard,
      currentPlayerId,
      playerColor
    );

    // Process the explosion step
    let newBoard = currentBoard;
    for (const cell of explodingCells) {
      newBoard = processExplosion(newBoard, cell.row, cell.col);
    }

    // Create explosion step data
    const explosionStep: ExplosionStep = {
      explodingCells: explodingCells.map((cell) => ({
        row: cell.row,
        col: cell.col,
      })),
      resultingBoard: deepCloneBoard(newBoard),
      stepIndex: stepCount,
      orbMovements,
    };

    steps.push(explosionStep);
    currentBoard = newBoard;
    stepCount++;

    // Check for early victory condition - but continue animations until no more explosions
    const activePlayers = getActivePlayers(currentBoard);
    if (activePlayers.length <= 1 && !gameWonEarly) {
      // Game won early - logging disabled for performance in headless mode
      gameWonEarly = true; // Mark as won early but continue the chain reaction
    }
  }

  return {
    explosionSteps: steps,
    finalBoard: currentBoard,
    safetyLimitReached: stepCount >= maxSteps,
    gameWonEarly,
  };
};

/**
 * Calculates orb movement animations for exploding cells
 */
export const calculateOrbMovements = (
  explodingCells: Cell[],
  board: GameBoard,
  currentPlayerId: string,
  playerColor?: string // Optional player color override
): OrbMovementAnimation[] => {
  const movements: OrbMovementAnimation[] = [];
  const baseStartTime = Date.now();

  explodingCells.forEach((cell) => {
    const { row, col } = cell;
    const startTime = baseStartTime;

    // Get adjacent positions
    const adjacentPositions = [
      { row: row - 1, col }, // up
      { row: row + 1, col }, // down
      { row, col: col - 1 }, // left
      { row, col: col + 1 }, // right
    ].filter(
      (pos) =>
        pos.row >= 0 &&
        pos.row < board.rows &&
        pos.col >= 0 &&
        pos.col < board.cols
    );

    // Create movement animation for each adjacent cell
    adjacentPositions.forEach((pos, index) => {
      movements.push({
        fromCell: { row, col },
        toCell: pos,
        startTime: startTime + index * 10, // Slight stagger for visual effect
        duration: 300, // 300ms of the 400ms step (original speed)
        orbColor: playerColor || getPlayerColor(currentPlayerId),
        id: `${cell.id}-to-${pos.row}-${pos.col}-${startTime}`,
      });
    });
  });

  return movements;
};

/**
 * Gets the color for a player ID
 */
const getPlayerColor = (playerId: PlayerId | null): string => {
  if (!playerId) return '#ffffff';

  const playerIndex = parseInt(playerId.replace('player', '')) - 1;
  return PLAYER_COLORS[playerIndex] || '#ffffff';
};
