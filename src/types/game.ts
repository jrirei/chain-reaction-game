import type { PlayerId, GameSettings } from './player';

export interface Cell {
  id: string;
  row: number;
  col: number;
  orbCount: number;
  playerId: PlayerId | null;
  criticalMass: number;
  isExploding: boolean;
  animationDelay: number;
}

export interface GameBoard {
  cells: Cell[][];
  rows: number;
  cols: number;
}

export interface GameState {
  board: GameBoard;
  players: PlayerId[];
  currentPlayerIndex: number;
  gameStatus: GameStatus;
  winner: PlayerId | null;
  isAnimating: boolean;
  moveCount: number;
  gameStartTime: number | null;
  gameEndTime: number | null;
  settings: GameSettings;
  gameStats?: GameStats;
  chainReactionState?: ChainReactionState;
}

export interface GameStats {
  totalExplosions: number;
  chainReactionsCount: number;
  longestChainReaction: number;
  playerStats: Record<PlayerId, PlayerGameStats>;
}

export interface PlayerGameStats {
  playerId: PlayerId;
  movesPlayed: number;
  chainReactionsTriggered: number;
  explosionsCaused: number;
  longestChainReaction: number;
}

export const GameStatus = {
  SETUP: 'setup',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ANIMATING: 'animating',
  CHAIN_REACTING: 'chain_reacting',
  FINISHED: 'finished',
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

// Action type constants
export const GameActionType = {
  INITIALIZE_GAME: 'INITIALIZE_GAME',
  START_GAME: 'START_GAME',
  PLACE_ORB: 'PLACE_ORB',
  TRIGGER_EXPLOSION: 'TRIGGER_EXPLOSION',
  COMPLETE_EXPLOSIONS: 'COMPLETE_EXPLOSIONS',
  START_CHAIN_SEQUENCE: 'START_CHAIN_SEQUENCE',
  PLAY_EXPLOSION_STEP: 'PLAY_EXPLOSION_STEP',
  COMPLETE_CHAIN_SEQUENCE: 'COMPLETE_CHAIN_SEQUENCE',
  NEXT_TURN: 'NEXT_TURN',
  ELIMINATE_PLAYER: 'ELIMINATE_PLAYER',
  SET_WINNER: 'SET_WINNER',
  PAUSE_GAME: 'PAUSE_GAME',
  RESUME_GAME: 'RESUME_GAME',
  RESET_GAME: 'RESET_GAME',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SET_ANIMATING: 'SET_ANIMATING',
  DEFER_WIN_CHECK: 'DEFER_WIN_CHECK',
  SET_GAME_STATE: 'SET_GAME_STATE',
  RECORD_CHAIN_REACTION: 'RECORD_CHAIN_REACTION',
} as const;

export type GameActionType =
  (typeof GameActionType)[keyof typeof GameActionType];

// Specific action interfaces
export interface InitializeGameAction {
  type: typeof GameActionType.INITIALIZE_GAME;
  payload: {
    settings: GameSettings;
    players: PlayerId[];
  };
}

export interface PlaceOrbAction {
  type: typeof GameActionType.PLACE_ORB;
  payload: {
    row: number;
    col: number;
    playerId: PlayerId;
  };
}

export interface TriggerExplosionAction {
  type: typeof GameActionType.TRIGGER_EXPLOSION;
  payload: {
    explosions: Array<{ row: number; col: number }>;
  };
}

export interface EliminatePlayerAction {
  type: typeof GameActionType.ELIMINATE_PLAYER;
  payload: {
    playerId: PlayerId;
  };
}

export interface SetWinnerAction {
  type: typeof GameActionType.SET_WINNER;
  payload: {
    winner: PlayerId | null;
  };
}

export interface UpdateSettingsAction {
  type: typeof GameActionType.UPDATE_SETTINGS;
  payload: {
    settings: Partial<GameSettings>;
  };
}

export interface SetAnimatingAction {
  type: typeof GameActionType.SET_ANIMATING;
  payload: {
    isAnimating: boolean;
  };
}

export interface SetGameStateAction {
  type: typeof GameActionType.SET_GAME_STATE;
  payload: GameState;
}

export interface RecordChainReactionAction {
  type: typeof GameActionType.RECORD_CHAIN_REACTION;
  payload: {
    playerId: PlayerId;
    chainLength: number;
    explosionsCount: number;
  };
}

// Generic action for simple actions without payload
export interface SimpleGameAction {
  type:
    | typeof GameActionType.START_GAME
    | typeof GameActionType.COMPLETE_EXPLOSIONS
    | typeof GameActionType.NEXT_TURN
    | typeof GameActionType.PAUSE_GAME
    | typeof GameActionType.RESUME_GAME
    | typeof GameActionType.RESET_GAME
    | typeof GameActionType.DEFER_WIN_CHECK;
}

// Union type for all possible actions
export type GameAction =
  | InitializeGameAction
  | PlaceOrbAction
  | TriggerExplosionAction
  | EliminatePlayerAction
  | SetWinnerAction
  | UpdateSettingsAction
  | SetAnimatingAction
  | SetGameStateAction
  | RecordChainReactionAction
  | StartChainSequenceAction
  | PlayExplosionStepAction
  | CompleteChainSequenceAction
  | SimpleGameAction;

// Game history and replay types
export interface GameMove {
  playerId: PlayerId;
  row: number;
  col: number;
  timestamp: number;
  moveNumber: number;
}

export interface GameHistory {
  moves: GameMove[];
  initialState: GameState;
  finalState: GameState | null;
}

// Explosion and animation types
export interface ExplosionData {
  cellId: string;
  row: number;
  col: number;
  playerId: PlayerId;
  orbCount: number;
  timestamp: number;
}

export interface ChainReaction {
  explosions: ExplosionData[];
  affectedCells: string[];
  duration: number;
}

// Step-wise chain reaction types
export interface OrbMovementAnimation {
  fromCell: { row: number; col: number };
  toCell: { row: number; col: number };
  startTime: number;
  duration: number; // 300ms for orb travel
  orbColor: string;
  id: string;
}

export interface ExplosionStep {
  explodingCells: Array<{ row: number; col: number }>;
  resultingBoard: GameBoard;
  stepIndex: number;
  orbMovements: OrbMovementAnimation[];
}

export interface ChainReactionState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  consecutiveExplosions: number;
  explosionSteps: ExplosionStep[];
  finalBoard?: GameBoard;
  safetyLimitReached?: boolean;
  safety: {
    maxSteps: number;
    currentCount: number;
    limitReached: boolean;
  };
}

export interface StartChainSequenceAction {
  type: typeof GameActionType.START_CHAIN_SEQUENCE;
  payload: {
    explosionSteps: ExplosionStep[];
    totalSteps: number;
    finalBoard: GameBoard;
    safetyLimitReached: boolean;
  };
}

export interface PlayExplosionStepAction {
  type: typeof GameActionType.PLAY_EXPLOSION_STEP;
  payload: {
    stepIndex: number;
    intensity: number;
    boardState: GameBoard;
  };
}

export interface CompleteChainSequenceAction {
  type: typeof GameActionType.COMPLETE_CHAIN_SEQUENCE;
  payload: {
    finalBoard: GameBoard;
    totalSteps: number;
    safetyLimitReached: boolean;
  };
}
