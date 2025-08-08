export const DEFAULT_GRID_SIZE = {
  rows: 6,
  cols: 9,
};

export const DEFAULT_PLAYER_COUNT = 2;

// Multi-player support: Colors optimized for visibility and contrast
export const PLAYER_COLORS = [
  '#FF0000', // Red - Player 1
  '#0000FF', // Blue - Player 2
  '#008000', // Green - Player 3
  '#FFA500', // Orange - Player 4
  '#B19CD9', // Light Purple - Player 5 (future)
  '#F7DC6F', // Yellow - Player 6 (future)
  '#85C1E9', // Light Blue - Player 7 (future)
  '#FFB6C1', // Light Pink - Player 8 (future)
];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4; // Currently supporting up to 4 players

export const CELL_TYPES = {
  CORNER: 'corner',
  EDGE: 'edge',
  INTERIOR: 'interior',
} as const;

export const CRITICAL_MASS = {
  [CELL_TYPES.CORNER]: 2,
  [CELL_TYPES.EDGE]: 3,
  [CELL_TYPES.INTERIOR]: 4,
} as const;

// Animation configuration
export const ANIMATION_CONFIG = {
  ORB_MOVEMENT_DURATION: 300, // ms - time for orb to move between cells
  EXPLOSION_STEP_DURATION: 400, // ms - total time per explosion step
  STEP_BUFFER_TIME: 100, // ms - buffer between explosion steps
  ORB_STAGGER_DELAY: 10, // ms - delay between orbs from same exploding cell
  PULSE_ANIMATION_DURATION: 400, // ms - orb pulse animation duration
} as const;

// Game logic constants
export const GAME_CONFIG = {
  MAX_CHAIN_REACTION_STEPS: 10000, // Maximum steps before safety limit
  MINIMUM_MOVES_BEFORE_GAME_END: 2, // Minimum moves before game can end
  AI_MOVE_DELAY: 500, // ms - delay before AI makes a move
} as const;

// Audio configuration
export const AUDIO_CONFIG = {
  CHAIN_REACTION_INTENSITY_LEVELS: 10, // Maximum intensity levels for audio
  VOLUME_MULTIPLIER_MAX: 1.0, // Maximum volume multiplier
  AUDIO_FADE_DURATION: 200, // ms - audio fade duration
} as const;

// UI Constants
export const UI_CONFIG = {
  CELL_SIZE_DEFAULT: 64, // px - default cell size
  CELL_SIZE_MAX: 80, // px - maximum cell size
  SIDEBAR_WIDTH_MIN: 280, // px - minimum sidebar width
  SIDEBAR_WIDTH_MAX: 320, // px - maximum sidebar width
} as const;
