import type {
  Cell,
  GameBoard,
  GameState,
  PlayerId,
  ExplosionStep,
  OrbMovementAnimation,
} from '../types';
import { getCriticalMass, generateCellId } from './helpers';
import { PLAYER_COLORS } from './constants';

/**
 * Creates an empty game board with the specified dimensions
 */
export const createEmptyBoard = (rows: number, cols: number): GameBoard => {
  const cells: Cell[][] = [];

  for (let row = 0; row < rows; row++) {
    cells[row] = [];
    for (let col = 0; col < cols; col++) {
      cells[row][col] = {
        id: generateCellId(row, col),
        row,
        col,
        orbCount: 0,
        playerId: null,
        criticalMass: getCriticalMass(row, col, rows, cols),
        isExploding: false,
        animationDelay: 0,
      };
    }
  }

  return {
    cells,
    rows,
    cols,
  };
};

/**
 * Checks if a move is valid for the given player
 */
export const isValidMove = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): boolean => {
  // Check bounds
  if (row < 0 || row >= board.rows || col < 0 || col >= board.cols) {
    return false;
  }

  const cell = board.cells[row][col];

  // Cell must be empty or belong to the current player
  return cell.playerId === null || cell.playerId === playerId;
};

/**
 * Places an orb in the specified cell
 */
export const placeOrb = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): GameBoard => {
  const newBoard = deepCloneBoard(board);
  const cell = newBoard.cells[row][col];

  cell.orbCount += 1;
  cell.playerId = playerId;

  return newBoard;
};

/**
 * Gets all cells that will explode (have reached critical mass)
 */
export const getExplodingCells = (board: GameBoard): Cell[] => {
  const explodingCells: Cell[] = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.orbCount >= cell.criticalMass && cell.orbCount > 0) {
        explodingCells.push(cell);
      }
    }
  }

  return explodingCells;
};

/**
 * Gets adjacent cells (up, down, left, right) for a given position
 */
export const getAdjacentCells = (
  board: GameBoard,
  row: number,
  col: number
): Array<{ row: number; col: number }> => {
  const adjacent = [];
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
};

/**
 * Processes a single explosion and returns the updated board
 */
export const processExplosion = (
  board: GameBoard,
  row: number,
  col: number
): GameBoard => {
  const newBoard = deepCloneBoard(board);
  const cell = newBoard.cells[row][col];

  if (cell.orbCount < cell.criticalMass) {
    return newBoard;
  }

  const playerId = cell.playerId!;
  const adjacentCells = getAdjacentCells(newBoard, row, col);

  // Remove all orbs from the exploding cell
  cell.orbCount = 0;
  cell.playerId = null;

  // Add one orb to each adjacent cell and change ownership
  for (const { row: adjRow, col: adjCol } of adjacentCells) {
    const adjCell = newBoard.cells[adjRow][adjCol];
    adjCell.orbCount += 1;
    adjCell.playerId = playerId;
  }

  return newBoard;
};

/**
 * Processes all chain reactions until no more explosions occur
 */
export const processChainReactions = (
  board: GameBoard
): {
  finalBoard: GameBoard;
  explosionSteps: GameBoard[];
} => {
  let currentBoard = deepCloneBoard(board);
  const explosionSteps: GameBoard[] = [];

  while (true) {
    const explodingCells = getExplodingCells(currentBoard);

    if (explodingCells.length === 0) {
      break;
    }

    // Process all explosions simultaneously
    let newBoard = deepCloneBoard(currentBoard);

    for (const cell of explodingCells) {
      newBoard = processExplosion(newBoard, cell.row, cell.col);
    }

    explosionSteps.push(deepCloneBoard(newBoard));
    currentBoard = newBoard;
  }

  return {
    finalBoard: currentBoard,
    explosionSteps,
  };
};

/**
 * Processes chain reactions sequentially with animation data
 * Returns step-by-step explosion data with orb movement animations
 */
export const processChainReactionsSequential = (
  board: GameBoard,
  maxSteps: number = 20
): {
  explosionSteps: ExplosionStep[];
  finalBoard: GameBoard;
  safetyLimitReached: boolean;
} => {
  const steps: ExplosionStep[] = [];
  let currentBoard = deepCloneBoard(board);
  let stepCount = 0;

  while (stepCount < maxSteps) {
    const explodingCells = getExplodingCells(currentBoard);

    if (explodingCells.length === 0) {
      break; // No more explosions
    }

    // Calculate orb movements for this step
    const orbMovements = calculateOrbMovements(explodingCells, currentBoard);

    // Process the explosion step
    let newBoard = deepCloneBoard(currentBoard);
    for (const cell of explodingCells) {
      newBoard = processExplosion(newBoard, cell.row, cell.col);
    }

    // Create explosion step data
    steps.push({
      explodingCells: explodingCells.map((cell) => ({
        row: cell.row,
        col: cell.col,
      })),
      resultingBoard: deepCloneBoard(newBoard),
      stepIndex: stepCount,
      orbMovements,
    });

    currentBoard = newBoard;
    stepCount++;
  }

  return {
    explosionSteps: steps,
    finalBoard: currentBoard,
    safetyLimitReached: stepCount >= maxSteps,
  };
};

/**
 * Calculates orb movement animations for exploding cells
 */
const calculateOrbMovements = (
  explodingCells: Cell[],
  board: GameBoard
): OrbMovementAnimation[] => {
  const movements: OrbMovementAnimation[] = [];
  const startTime = Date.now();

  explodingCells.forEach((cell) => {
    const { row, col } = cell;

    // Get adjacent cells (up, down, left, right)
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
        orbColor: getPlayerColor(cell.playerId),
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

/**
 * Counts total orbs for a specific player
 */
export const countPlayerOrbs = (
  board: GameBoard,
  playerId: PlayerId
): number => {
  let count = 0;

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.playerId === playerId) {
        count += cell.orbCount;
      }
    }
  }

  return count;
};

/**
 * Gets all active players (players with orbs on the board)
 */
export const getActivePlayers = (
  board: GameBoard,
  allPlayers: PlayerId[]
): PlayerId[] => {
  const activePlayers = new Set<PlayerId>();

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.playerId && cell.orbCount > 0) {
        activePlayers.add(cell.playerId);
      }
    }
  }

  return allPlayers.filter((playerId) => activePlayers.has(playerId));
};

/**
 * Checks if the game is over (only one player has orbs remaining)
 */
export const checkGameOver = (
  gameState: GameState
): {
  isGameOver: boolean;
  winner: PlayerId | null;
} => {
  // Game is not over if still in setup phase or no moves have been made
  if (gameState.moveCount === 0) {
    return { isGameOver: false, winner: null };
  }

  // Ensure all players have had at least one complete round before game can end
  // Each player must have had the opportunity to place at least one orb
  const minMovesRequired = gameState.players.length;
  if (gameState.moveCount <= minMovesRequired) {
    return { isGameOver: false, winner: null };
  }

  const activePlayers = getActivePlayers(gameState.board, gameState.players);

  if (activePlayers.length <= 1) {
    return {
      isGameOver: true,
      winner: activePlayers.length === 1 ? activePlayers[0] : null,
    };
  }

  return { isGameOver: false, winner: null };
};

/**
 * Deep clones a game board
 */
export const deepCloneBoard = (board: GameBoard): GameBoard => {
  return {
    ...board,
    cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
  };
};

/**
 * Calculates the best possible move for an AI player (basic heuristic)
 */
export const calculateAIMove = (
  board: GameBoard,
  playerId: PlayerId
): { row: number; col: number } | null => {
  const validMoves: Array<{ row: number; col: number; score: number }> = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (isValidMove(board, row, col, playerId)) {
        const score = evaluateMove(board, row, col, playerId);
        validMoves.push({ row, col, score });
      }
    }
  }

  if (validMoves.length === 0) {
    return null;
  }

  // Sort by score (highest first) and return the best move
  validMoves.sort((a, b) => b.score - a.score);
  return { row: validMoves[0].row, col: validMoves[0].col };
};

/**
 * Simple heuristic to evaluate move quality
 */
const evaluateMove = (
  board: GameBoard,
  row: number,
  col: number,
  playerId: PlayerId
): number => {
  let score = 0;
  const cell = board.cells[row][col];

  // Prefer moves that are close to critical mass
  score += cell.orbCount * 10;

  // Prefer corner and edge cells (easier to defend)
  if (cell.criticalMass === 2)
    score += 20; // corner
  else if (cell.criticalMass === 3) score += 10; // edge

  // Prefer moves that don't immediately explode (unless beneficial)
  if (cell.orbCount + 1 >= cell.criticalMass) {
    const adjacent = getAdjacentCells(board, row, col);
    const enemyAdjacent = adjacent.filter(({ row: r, col: c }) => {
      const adjCell = board.cells[r][c];
      return adjCell.playerId && adjCell.playerId !== playerId;
    });

    // Bonus if explosion captures enemy cells
    score += enemyAdjacent.length * 15;
  }

  return score;
};
