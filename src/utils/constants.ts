export const DEFAULT_GRID_SIZE = {
  rows: 6,
  cols: 9,
};

export const DEFAULT_PLAYER_COUNT = 2;

export const PLAYER_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#F7DC6F', // Yellow
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
];

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

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
