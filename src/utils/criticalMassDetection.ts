import type { Cell, GameBoard, PlayerId, GameState } from '../types';
import { getAdjacentCells, deepCloneBoard } from './gameLogic';

export interface CriticalMassInfo {
  cell: Cell;
  willExplode: boolean;
  orbsToExplode: number;
  isAtCapacity: boolean;
  adjacentCells: Array<{ row: number; col: number }>;
  explosionImpact: {
    affectedCells: number;
    chainPotential: number;
    strategicValue: 'low' | 'medium' | 'high';
  };
}

export interface ExplosionPreview {
  originCell: { row: number; col: number };
  affectedCells: Array<{
    row: number;
    col: number;
    currentOrbs: number;
    orbsAfterExplosion: number;
    willBecomeExplosive: boolean;
    ownershipChange: boolean;
    newOwnerId: PlayerId | null;
  }>;
  chainReactionDepth: number;
  totalCellsAffected: number;
}

export interface CriticalMassState {
  criticalCells: Cell[];
  nearCriticalCells: Cell[];
  explosionQueue: Cell[];
  totalExplosiveCells: number;
  boardStability: 'stable' | 'volatile' | 'critical';
}

/**
 * Analyzes critical mass state for a single cell
 */
export const analyzeCellCriticalMass = (
  board: GameBoard,
  row: number,
  col: number
): CriticalMassInfo => {
  const cell = board.cells[row][col];
  const willExplode = cell.orbCount >= cell.criticalMass;
  const orbsToExplode = Math.max(0, cell.criticalMass - cell.orbCount);
  const isAtCapacity = cell.orbCount === cell.criticalMass - 1;
  const adjacentCells = getAdjacentCells(board, row, col);

  // Calculate explosion impact
  let affectedCells = 0;
  let chainPotential = 0;

  if (willExplode) {
    affectedCells = adjacentCells.length;

    // Check if explosion would trigger more explosions
    for (const { row: adjRow, col: adjCol } of adjacentCells) {
      const adjCell = board.cells[adjRow][adjCol];
      if (adjCell.orbCount + 1 >= adjCell.criticalMass) {
        chainPotential++;
      }
    }
  }

  const strategicValue: 'low' | 'medium' | 'high' =
    chainPotential > 2
      ? 'high'
      : chainPotential > 0 || affectedCells > 2
        ? 'medium'
        : 'low';

  return {
    cell,
    willExplode,
    orbsToExplode,
    isAtCapacity,
    adjacentCells,
    explosionImpact: {
      affectedCells,
      chainPotential,
      strategicValue,
    },
  };
};

/**
 * Gets comprehensive critical mass state for the entire board
 */
export const getBoardCriticalMassState = (
  board: GameBoard
): CriticalMassState => {
  const criticalCells: Cell[] = [];
  const nearCriticalCells: Cell[] = [];
  const explosionQueue: Cell[] = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];

      if (cell.orbCount > 0) {
        if (cell.orbCount >= cell.criticalMass) {
          criticalCells.push(cell);
          explosionQueue.push(cell);
        } else if (cell.orbCount === cell.criticalMass - 1) {
          nearCriticalCells.push(cell);
        }
      }
    }
  }

  const totalExplosiveCells = criticalCells.length;
  const boardStability: 'stable' | 'volatile' | 'critical' =
    totalExplosiveCells > 3
      ? 'critical'
      : totalExplosiveCells > 0 || nearCriticalCells.length > 5
        ? 'volatile'
        : 'stable';

  return {
    criticalCells,
    nearCriticalCells,
    explosionQueue,
    totalExplosiveCells,
    boardStability,
  };
};

/**
 * Simulates what would happen if a specific cell exploded
 */
export const previewExplosion = (
  board: GameBoard,
  row: number,
  col: number
): ExplosionPreview => {
  const cell = board.cells[row][col];
  const adjacentCells = getAdjacentCells(board, row, col);
  const affectedCells = [];

  for (const { row: adjRow, col: adjCol } of adjacentCells) {
    const adjCell = board.cells[adjRow][adjCol];
    const orbsAfterExplosion = adjCell.orbCount + 1;
    const willBecomeExplosive = orbsAfterExplosion >= adjCell.criticalMass;
    const ownershipChange = adjCell.playerId !== cell.playerId;

    affectedCells.push({
      row: adjRow,
      col: adjCol,
      currentOrbs: adjCell.orbCount,
      orbsAfterExplosion,
      willBecomeExplosive,
      ownershipChange,
      newOwnerId: cell.playerId,
    });
  }

  // Calculate chain reaction depth by simulating
  const simulatedBoard = deepCloneBoard(board);
  simulatedBoard.cells[row][col].orbCount = cell.criticalMass; // Ensure it explodes

  let chainDepth = 0;
  let totalAffected = 0;
  let currentBoard = simulatedBoard;

  // Simulate the chain reaction
  while (true) {
    const explodingCells = [];

    for (let r = 0; r < currentBoard.rows; r++) {
      for (let c = 0; c < currentBoard.cols; c++) {
        const testCell = currentBoard.cells[r][c];
        if (
          testCell.orbCount >= testCell.criticalMass &&
          testCell.orbCount > 0
        ) {
          explodingCells.push(testCell);
        }
      }
    }

    if (explodingCells.length === 0) break;

    chainDepth++;
    totalAffected += explodingCells.length;

    // Process explosions
    const newBoard = deepCloneBoard(currentBoard);
    for (const explodingCell of explodingCells) {
      const adjacents = getAdjacentCells(
        newBoard,
        explodingCell.row,
        explodingCell.col
      );
      const playerId = explodingCell.playerId!;

      // Clear exploding cell
      newBoard.cells[explodingCell.row][explodingCell.col].orbCount = 0;
      newBoard.cells[explodingCell.row][explodingCell.col].playerId = null;

      // Add orbs to adjacent cells
      for (const { row: adjR, col: adjC } of adjacents) {
        newBoard.cells[adjR][adjC].orbCount += 1;
        newBoard.cells[adjR][adjC].playerId = playerId;
      }
    }

    currentBoard = newBoard;

    // Prevent infinite loops
    if (chainDepth > 20) break;
  }

  return {
    originCell: { row, col },
    affectedCells,
    chainReactionDepth: chainDepth,
    totalCellsAffected: totalAffected,
  };
};

/**
 * Detects cells that are one move away from becoming critical
 */
export const detectNearCriticalCells = (
  board: GameBoard,
  playerId: PlayerId
): Array<{
  row: number;
  col: number;
  orbsNeeded: number;
  threatLevel: 'low' | 'medium' | 'high';
  canPlayerAccess: boolean;
}> => {
  const nearCritical = [];

  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];

      if (cell.orbCount > 0 && cell.orbCount < cell.criticalMass) {
        const orbsNeeded = cell.criticalMass - cell.orbCount;
        const canPlayerAccess =
          cell.playerId === null || cell.playerId === playerId;

        let threatLevel: 'low' | 'medium' | 'high' = 'low';

        if (orbsNeeded === 1) {
          threatLevel = 'high';
        } else if (orbsNeeded === 2) {
          threatLevel = 'medium';
        }

        nearCritical.push({
          row,
          col,
          orbsNeeded,
          threatLevel,
          canPlayerAccess,
        });
      }
    }
  }

  return nearCritical;
};

/**
 * Calculates the overall board tension (how explosive the situation is)
 */
export const calculateBoardTension = (
  board: GameBoard
): {
  tensionLevel: number; // 0-100
  description: string;
  hotspots: Array<{ row: number; col: number; intensity: number }>;
  recommendations: string[];
} => {
  // const criticalState = getBoardCriticalMassState(board);
  const hotspots = [];
  let totalTension = 0;

  // Analyze each cell for tension contribution
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];

      if (cell.orbCount > 0) {
        const fillRatio = cell.orbCount / cell.criticalMass;
        const adjacentCount = getAdjacentCells(board, row, col).length;

        // Higher tension for cells closer to critical mass with more adjacents
        const cellTension = fillRatio * adjacentCount * 10;
        totalTension += cellTension;

        if (cellTension > 15) {
          hotspots.push({
            row,
            col,
            intensity: cellTension,
          });
        }
      }
    }
  }

  const tensionLevel = Math.min(100, totalTension);

  let description = 'Board is stable';
  const recommendations = [];

  if (tensionLevel > 80) {
    description = 'Critical tension - explosions imminent!';
    recommendations.push('Prepare for massive chain reactions');
    recommendations.push('Consider defensive positioning');
  } else if (tensionLevel > 50) {
    description = 'High tension - volatile situation';
    recommendations.push('Be cautious with placements');
    recommendations.push('Look for strategic explosion triggers');
  } else if (tensionLevel > 20) {
    description = 'Moderate tension - some risk present';
    recommendations.push('Monitor critical mass cells');
  } else {
    recommendations.push('Good time for aggressive expansion');
  }

  return {
    tensionLevel,
    description,
    hotspots: hotspots.sort((a, b) => b.intensity - a.intensity),
    recommendations,
  };
};

/**
 * Advanced critical mass detection with game state context
 */
export const detectCriticalMassThreats = (
  gameState: GameState,
  currentPlayerId: PlayerId
): {
  immediateThreats: Cell[];
  playerAdvantages: Cell[];
  neutralThreats: Cell[];
  recommendations: string[];
} => {
  const { board } = gameState;
  const criticalState = getBoardCriticalMassState(board);

  const immediateThreats = [];
  const playerAdvantages = [];
  const neutralThreats = [];
  const recommendations = [];

  for (const cell of criticalState.criticalCells) {
    if (cell.playerId === currentPlayerId) {
      playerAdvantages.push(cell);
    } else if (cell.playerId === null) {
      neutralThreats.push(cell);
    } else {
      immediateThreats.push(cell);
    }
  }

  // Generate recommendations
  if (immediateThreats.length > 0) {
    recommendations.push(
      `${immediateThreats.length} enemy cells ready to explode`
    );
    recommendations.push('Consider defensive positioning');
  }

  if (playerAdvantages.length > 0) {
    recommendations.push(`You have ${playerAdvantages.length} explosive cells`);
    recommendations.push('Look for chain reaction opportunities');
  }

  if (criticalState.boardStability === 'critical') {
    recommendations.push('Board is highly unstable - expect massive changes');
  }

  return {
    immediateThreats,
    playerAdvantages,
    neutralThreats,
    recommendations,
  };
};
