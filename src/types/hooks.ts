import type { GameState, GameAction } from './game';
import type { Player, PlayerId } from './player';

// Hook return types
export interface UseGameStateReturn {
  gameState: GameState;
  dispatch: React.Dispatch<GameAction>;
  currentPlayer: Player | null;
  activePlayers: Player[];
  isGameActive: boolean;
  canMakeMove: (row: number, col: number) => boolean;
}

export interface UseGameLogicReturn {
  placeOrb: (row: number, col: number) => Promise<void>;
  resetGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  initializeGame: (
    playerCount: number,
    gridRows: number,
    gridCols: number
  ) => void;
  isValidMove: (row: number, col: number, playerId: PlayerId) => boolean;
}

export interface UseAnimationReturn {
  isAnimating: boolean;
  startAnimation: (
    animationData: import('./ui').OrbAnimationData[]
  ) => Promise<void>;
  startExplosionAnimation: (
    explosionData: import('./ui').ExplosionAnimationData[]
  ) => Promise<void>;
  cancelAnimations: () => void;
}

export interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

export interface UseTimerReturn {
  elapsedTime: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

export interface UseKeyboardReturn {
  pressedKeys: Set<string>;
  isKeyPressed: (key: string) => boolean;
}

export interface UseSoundReturn {
  playSound: (soundType: SoundType) => void;
  setVolume: (volume: number) => void;
  mute: () => void;
  unmute: () => void;
  isMuted: boolean;
}

export const SoundType = {
  PLACE_ORB: 'PLACE_ORB',
  EXPLOSION: 'EXPLOSION',
  CHAIN_REACTION: 'CHAIN_REACTION',
  GAME_OVER: 'GAME_OVER',
  BUTTON_CLICK: 'BUTTON_CLICK',
} as const;

export type SoundType = (typeof SoundType)[keyof typeof SoundType];

// Configuration types for hooks
export interface GameLogicConfig {
  enableChainReactions: boolean;
  animationSpeed: number;
  maxChainDepth: number;
}

export interface HookAnimationConfig {
  orbPlacementDuration: number;
  explosionDuration: number;
  chainReactionDelay: number;
  easing: string;
}

export interface StorageConfig {
  key: string;
  defaultValue: unknown;
  serialize?: (value: unknown) => string;
  deserialize?: (value: string) => unknown;
}
