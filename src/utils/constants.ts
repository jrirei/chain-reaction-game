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
