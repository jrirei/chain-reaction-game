// Re-export all functions from the modularized files for backwards compatibility
export {
  createEmptyBoard,
  deepCloneBoard,
  isValidMove,
  placeOrb,
  getAdjacentCells,
  countPlayerOrbs,
} from './boardOperations';

export {
  getExplodingCells,
  processExplosion,
  processSimultaneousExplosions,
  processChainReactions,
  processChainReactionsSequential,
  calculateOrbMovements,
} from './explosionLogic';

export { calculateAIMove } from './aiLogic';

export {
  getActivePlayers,
  checkGameOver,
  validateBoardDimensions,
  validatePlayerId,
  validateCellCoordinates,
  validateGameState,
} from './gameValidation';
