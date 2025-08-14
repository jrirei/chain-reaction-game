// New focused context system
export {
  GameProvider,
  useGameState,
  usePlayer,
  useBoard,
} from './GameProvider';

// Legacy exports for backward compatibility
export { useLegacyGameContext as useGameContext } from './GameProvider';
export type { LegacyGameContextType as GameContextType } from './GameProvider';

// Deprecated - use individual context hooks instead
export { GameProvider as LegacyGameProvider, GameContext } from './GameContext';
