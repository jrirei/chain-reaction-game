import type {
  Cell,
  GameBoard,
  PlayerId,
  ExplosionStep,
  OrbMovementAnimation,
} from '../types';
import { produce } from 'immer';
import { deepCloneBoard, getAdjacentCells } from './boardOperations';
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
 * Processes multiple cell explosions simultaneously with orb conservation physics.
 *
 * NEW PHYSICS MODEL (Orb Conservation):
 * - Each exploding cell sends exactly `criticalMass` orbs to adjacent cells
 * - Remaining orbs (orbCount - criticalMass) stay in the exploding cell
 * - Total orbs in the game remain constant (conservation law)
 * - This ensures excess orbs are never lost during explosions
 *
 * CRITICAL: Exploding cells first send out their critical mass orbs, then receive orbs
 * from other explosions. Excess orbs remain in the exploding cell.
 *
 * @param board - The current game board state
 * @param explodingCells - Array of cells that are exploding simultaneously
 * @returns New GameBoard with all explosions processed simultaneously
 */
export const processSimultaneousExplosions = (
  board: GameBoard,
  explodingCells: Cell[]
): GameBoard => {
  if (explodingCells.length === 0) {
    return board;
  }

  // Track orb additions for each cell to handle simultaneous explosions correctly
  const orbAdditions = new Map<string, { count: number; playerId: string }>();

  // First pass: calculate all orb movements from all exploding cells
  // NEW PHYSICS: Each cell distributes only its critical mass, not all orbs
  explodingCells.forEach((cell) => {
    const { row, col, playerId, criticalMass } = cell;
    const adjacentCells = getAdjacentCells(board, row, col);

    // Calculate orbs per adjacent cell (critical mass divided evenly)
    const orbsPerAdjacentCell = Math.floor(criticalMass / adjacentCells.length);
    const remainderOrbs = criticalMass % adjacentCells.length;

    adjacentCells.forEach(({ row: adjRow, col: adjCol }, index) => {
      const cellKey = `${adjRow}-${adjCol}`;

      // First cells get the remainder orbs if critical mass doesn't divide evenly
      const orbsToSend = orbsPerAdjacentCell + (index < remainderOrbs ? 1 : 0);

      const existing = orbAdditions.get(cellKey);
      if (existing) {
        // Multiple explosions affecting same cell - accumulate orbs
        existing.count += orbsToSend;
        // Last exploding player takes ownership
        existing.playerId = playerId!;
      } else {
        orbAdditions.set(cellKey, { count: orbsToSend, playerId: playerId! });
      }
    });
  });

  // Second pass: apply all changes simultaneously
  return produce(board, (draft) => {
    // First, update exploding cells to keep only excess orbs (NEW PHYSICS)
    explodingCells.forEach(({ row, col, orbCount, criticalMass, playerId }) => {
      const cell = draft.cells[row][col];
      // Keep excess orbs: orbCount - criticalMass (minimum 0)
      cell.orbCount = Math.max(0, orbCount - criticalMass);
      // If no orbs remain, cell becomes neutral
      if (cell.orbCount === 0) {
        cell.playerId = null;
      } else {
        cell.playerId = playerId; // Keep same owner if orbs remain
      }
    });

    // Then, apply orb additions to all target cells (including exploding cells that receive orbs)
    orbAdditions.forEach(({ count, playerId }, cellKey) => {
      const [rowStr, colStr] = cellKey.split('-');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      const targetCell = draft.cells[row][col];

      // Add the received orbs to whatever is already in the cell
      targetCell.orbCount += count;
      targetCell.playerId = playerId;
    });
  });
};

/**
 * Processes a single cell explosion and returns the updated board state.
 *
 * When a cell explodes (NEW PHYSICS - Orb Conservation):
 * 1. The exploding cell distributes its critical mass to adjacent cells
 * 2. Excess orbs (orbCount - criticalMass) remain in the exploding cell
 * 3. Each adjacent cell receives orbs equally distributed from critical mass
 * 4. All affected adjacent cells become owned by the exploding player
 * 5. Uses immutable updates for performance and safety
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

  // Use the simultaneous explosion logic for consistency with new physics
  return processSimultaneousExplosions(board, [cell]);
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

    // Process all explosions simultaneously to handle multiple orbs correctly
    const newBoard = processSimultaneousExplosions(
      currentBoard,
      explodingCells
    );

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
 * Processes chain reactions sequentially with animation data and orb conservation physics
 * Returns step-by-step explosion data with orb movement animations
 *
 * NEW PHYSICS - ORB CONSERVATION:
 * - Each exploding cell distributes only its critical mass to adjacent cells
 * - Excess orbs (orbCount - criticalMass) remain in the exploding cell
 * - Total orbs in the game remain constant throughout all chain reactions
 * - Number of orbs equals number of moves made in the game (invariant)
 *
 * CRITICAL FIXES:
 * 1. Early Termination: Chain reactions stop immediately when only one player remains
 *    in MULTIPLAYER games to prevent endless loops in late-game scenarios
 * 2. Single-Player Mode: Chain reactions continue naturally in single-player scenarios
 *    without premature termination
 * 3. Simultaneous Explosions: Multiple cells exploding at the same time correctly
 *    accumulate orbs in target cells with proper orb conservation
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

    // Process all explosions simultaneously to handle multiple orbs correctly
    const newBoard = processSimultaneousExplosions(
      currentBoard,
      explodingCells
    );

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

    // Check for early victory condition and stop immediately if only one player remains
    // BUT only in multiplayer scenarios - in single player mode, let the chain continue
    const activePlayers = getActivePlayers(currentBoard);
    if (activePlayers.length <= 1 && !gameWonEarly) {
      gameWonEarly = true;

      // Only stop early if this was originally a multiplayer game
      // Check if the initial board had multiple players by looking at the board state
      const initialActivePlayers = getActivePlayers(board);
      if (initialActivePlayers.length > 1) {
        // This was a multiplayer game where one player won - stop immediately
        break; // Stop immediately when only one player remains
      }
      // Otherwise, this is single-player mode - continue the chain reaction
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
