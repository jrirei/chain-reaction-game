import type { PlayerId } from './player';

// Component props interfaces
export interface CellProps {
  cell: import('./game').Cell;
  onClick: (row: number, col: number) => void;
  isClickable: boolean;
  playerColor: string;
}

export interface GameBoardProps {
  board: import('./game').GameBoard;
  onCellClick: (row: number, col: number) => void;
  currentPlayerId: PlayerId;
  isAnimating: boolean;
}

export interface PlayerInfoProps {
  player: import('./player').Player;
  isCurrentPlayer: boolean;
  totalPlayers: number;
}

export interface GameControlsProps {
  onReset: () => void;
  onPause: () => void;
  onResume: () => void;
  gameStatus: import('./game').GameStatus;
  canReset: boolean;
}

export interface GameHeaderProps {
  currentPlayer: import('./player').Player | null;
  gameStatus: import('./game').GameStatus;
  moveCount: number;
  elapsedTime: number;
}

// UI state and interaction types
export interface TooltipData {
  visible: boolean;
  content: string;
  position: {
    x: number;
    y: number;
  };
}

export interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data?: unknown;
}

export const ModalType = {
  GAME_OVER: 'GAME_OVER',
  SETTINGS: 'SETTINGS',
  HELP: 'HELP',
  CONFIRM_RESET: 'CONFIRM_RESET',
} as const;

export type ModalType = (typeof ModalType)[keyof typeof ModalType];

// Animation and visual effects
export interface AnimationConfig {
  duration: number;
  delay: number;
  easing: string;
}

export interface OrbAnimationData {
  cellId: string;
  startCount: number;
  endCount: number;
  playerId: PlayerId;
  animationConfig: AnimationConfig;
}

export interface ExplosionAnimationData {
  cellId: string;
  intensity: number;
  color: string;
  duration: number;
}

// Theme and styling
export interface Theme {
  name: string;
  colors: {
    background: string;
    surface: string;
    text: string;
    border: string;
    hover: string;
  };
  playerColors: string[];
}

export interface Breakpoint {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

// Error handling
export interface GameError {
  code: string;
  message: string;
  details?: string;
  timestamp: number;
}

export const ErrorCode = {
  INVALID_MOVE: 'INVALID_MOVE',
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  CELL_NOT_FOUND: 'CELL_NOT_FOUND',
  ANIMATION_ERROR: 'ANIMATION_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
