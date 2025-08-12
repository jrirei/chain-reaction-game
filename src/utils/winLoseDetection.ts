import type { GameState, PlayerId, GameBoard } from '../types';
import { getActivePlayers } from './gameValidation';
import { countPlayerOrbs } from './boardOperations';

export interface GameEndResult {
  isGameOver: boolean;
  winner: PlayerId | null;
  reason: 'elimination' | 'timeout' | 'resignation' | null;
  eliminatedPlayers: PlayerId[];
  finalScores: Array<{
    playerId: PlayerId;
    orbCount: number;
    cellsControlled: number;
    isWinner: boolean;
    isEliminated: boolean;
  }>;
  gameStats: {
    totalMoves: number;
    gameDuration: number;
    chainReactionsTriggered: number;
  };
}

export interface WinCondition {
  type: 'lastPlayerStanding' | 'timeout';
  description: string;
  checkCondition: (gameState: GameState) => boolean;
}

/**
 * Comprehensive game end detection with detailed results
 */
export const checkGameEnd = (gameState: GameState): GameEndResult => {
  const activePlayers = getActivePlayers(gameState.board);
  const eliminatedPlayers = gameState.players.filter(
    (p) => !activePlayers.includes(p)
  );

  // Calculate final scores for all players
  const finalScores = gameState.players.map((playerId) => {
    const orbCount = countPlayerOrbs(gameState.board, playerId);
    const cellsControlled = getCellsControlledByPlayer(
      gameState.board,
      playerId
    );
    const isEliminated = eliminatedPlayers.includes(playerId);

    return {
      playerId,
      orbCount,
      cellsControlled,
      isWinner: false, // Will be set below
      isEliminated,
    };
  });

  // Game stats
  const gameStats = {
    totalMoves: gameState.moveCount,
    gameDuration: gameState.gameStartTime
      ? Date.now() - gameState.gameStartTime
      : 0,
    chainReactionsTriggered: 0, // TODO: Track this in game state
  };

  // Check for early game (all players must have at least one turn)
  const minMovesRequired = gameState.players.length;
  if (gameState.moveCount <= minMovesRequired) {
    return {
      isGameOver: false,
      winner: null,
      reason: null,
      eliminatedPlayers,
      finalScores,
      gameStats,
    };
  }

  // Check for last player standing (standard win condition)
  if (activePlayers.length <= 1) {
    const winner = activePlayers.length === 1 ? activePlayers[0] : null;

    // Mark winner in scores
    if (winner) {
      const winnerScore = finalScores.find((s) => s.playerId === winner);
      if (winnerScore) {
        winnerScore.isWinner = true;
      }
    }

    return {
      isGameOver: true,
      winner,
      reason: 'elimination',
      eliminatedPlayers,
      finalScores,
      gameStats,
    };
  }

  // Game continues
  return {
    isGameOver: false,
    winner: null,
    reason: null,
    eliminatedPlayers,
    finalScores,
    gameStats,
  };
};

/**
 * Counts cells controlled by a specific player
 */
export const getCellsControlledByPlayer = (
  board: GameBoard,
  playerId: PlayerId
): number => {
  let count = 0;
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      if (
        board.cells[row][col].playerId === playerId &&
        board.cells[row][col].orbCount > 0
      ) {
        count++;
      }
    }
  }
  return count;
};

/**
 * Predicts likely winner based on current board state
 */
export const predictLikelyWinner = (
  gameState: GameState
): {
  predictedWinner: PlayerId | null;
  confidence: number; // 0-1
  reasons: string[];
} => {
  const activePlayers = getActivePlayers(gameState.board);

  if (activePlayers.length <= 1) {
    return {
      predictedWinner: activePlayers[0] || null,
      confidence: 1.0,
      reasons: ['Only one player remaining'],
    };
  }

  const playerStats = activePlayers.map((playerId) => ({
    playerId,
    orbCount: countPlayerOrbs(gameState.board, playerId),
    cellsControlled: getCellsControlledByPlayer(gameState.board, playerId),
    nearCriticalCells: getNearCriticalCells(gameState.board, playerId),
  }));

  // Sort by combined score
  playerStats.sort((a, b) => {
    const scoreA =
      a.orbCount * 2 + a.cellsControlled + a.nearCriticalCells * 0.5;
    const scoreB =
      b.orbCount * 2 + b.cellsControlled + b.nearCriticalCells * 0.5;
    return scoreB - scoreA;
  });

  const leader = playerStats[0];
  const second = playerStats[1];

  if (!leader || !second) {
    return {
      predictedWinner: null,
      confidence: 0,
      reasons: ['Insufficient data'],
    };
  }

  const leadMargin = leader.orbCount - second.orbCount;
  const totalOrbs = playerStats.reduce((sum, p) => sum + p.orbCount, 0);
  const leadPercentage = totalOrbs > 0 ? leader.orbCount / totalOrbs : 0;

  const reasons: string[] = [];
  let confidence = 0.5;

  if (leadMargin > 5) {
    confidence += 0.2;
    reasons.push(`Leading by ${leadMargin} orbs`);
  }

  if (leadPercentage > 0.6) {
    confidence += 0.2;
    reasons.push(`Controls ${Math.round(leadPercentage * 100)}% of orbs`);
  }

  if (leader.cellsControlled > second.cellsControlled * 1.5) {
    confidence += 0.1;
    reasons.push(
      `Controls ${leader.cellsControlled} cells vs ${second.cellsControlled}`
    );
  }

  return {
    predictedWinner: confidence > 0.7 ? leader.playerId : null,
    confidence: Math.min(confidence, 0.95),
    reasons: reasons.length > 0 ? reasons : ['Close competition'],
  };
};

/**
 * Gets count of cells that are one orb away from critical mass for a player
 */
const getNearCriticalCells = (board: GameBoard, playerId: PlayerId): number => {
  let count = 0;
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (
        cell.playerId === playerId &&
        cell.orbCount === cell.criticalMass - 1
      ) {
        count++;
      }
    }
  }
  return count;
};

/**
 * Checks if a player is in danger of elimination
 */
export const isPlayerInDanger = (
  gameState: GameState,
  playerId: PlayerId
): {
  inDanger: boolean;
  severity: 'low' | 'medium' | 'high';
  reasons: string[];
} => {
  const orbCount = countPlayerOrbs(gameState.board, playerId);
  const cellsControlled = getCellsControlledByPlayer(gameState.board, playerId);
  const activePlayers = getActivePlayers(gameState.board);

  const reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  if (orbCount === 0) {
    return {
      inDanger: true,
      severity: 'high',
      reasons: ['Player has been eliminated'],
    };
  }

  if (orbCount <= 2) {
    severity = 'high';
    reasons.push(`Only ${orbCount} orbs remaining`);
  } else if (orbCount <= 5) {
    severity = 'medium';
    reasons.push(`Low orb count: ${orbCount}`);
  }

  if (cellsControlled <= 1) {
    severity = 'high';
    reasons.push(`Controls only ${cellsControlled} cell(s)`);
  }

  // Check if player has significantly fewer orbs than others
  const otherPlayers = activePlayers.filter((p) => p !== playerId);
  const averageOrbCount =
    otherPlayers.length > 0
      ? otherPlayers.reduce(
          (sum, p) => sum + countPlayerOrbs(gameState.board, p),
          0
        ) / otherPlayers.length
      : 0;

  if (orbCount < averageOrbCount / 3) {
    severity = 'high';
    reasons.push('Significantly behind other players');
  }

  return {
    inDanger: reasons.length > 0,
    severity,
    reasons,
  };
};

/**
 * Advanced win conditions for different game modes
 */
export const WIN_CONDITIONS: WinCondition[] = [
  {
    type: 'lastPlayerStanding',
    description: 'Last player with orbs on the board wins',
    checkCondition: (gameState: GameState) => {
      const activePlayers = getActivePlayers(gameState.board);
      return (
        activePlayers.length <= 1 &&
        gameState.moveCount > gameState.players.length
      );
    },
  },
];

/**
 * Get appropriate celebration message for winner
 */
export const getWinMessage = (result: GameEndResult): string => {
  if (!result.winner) {
    return 'Game Over - No Winner';
  }

  // const winnerScore = result.finalScores.find(s => s.playerId === result.winner);

  switch (result.reason) {
    case 'elimination':
      return `${result.winner} Wins by Elimination!`;
    case 'timeout':
      return `${result.winner} Wins by Time!`;
    default:
      return `${result.winner} Wins!`;
  }
};

/**
 * Get game summary for display
 */
export const getGameSummary = (result: GameEndResult): string => {
  const { gameStats, finalScores } = result;
  const minutes = Math.floor(gameStats.gameDuration / 60000);
  const seconds = Math.floor((gameStats.gameDuration % 60000) / 1000);

  let summary = `Game completed in ${gameStats.totalMoves} moves`;
  if (minutes > 0) {
    summary += ` over ${minutes}m ${seconds}s`;
  } else {
    summary += ` in ${seconds} seconds`;
  }

  const totalOrbs = finalScores.reduce((sum, score) => sum + score.orbCount, 0);
  if (totalOrbs > 0) {
    summary += `\nTotal orbs on board: ${totalOrbs}`;
  }

  return summary;
};
