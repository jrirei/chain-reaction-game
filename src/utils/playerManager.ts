import type { Player, PlayerId, GameSettings } from '../types';
import { PLAYER_COLORS, MIN_PLAYERS, MAX_PLAYERS } from './constants';

export interface PlayerConfig {
  name: string;
  color?: string;
  isAI?: boolean;
}

export interface PlayerCreationOptions {
  playerConfigs?: PlayerConfig[];
  playerCount?: number;
  defaultNames?: string[];
  customColors?: string[];
}

/**
 * Creates a new player with default or specified configuration
 */
export const createPlayer = (
  id: PlayerId,
  config: PlayerConfig,
  index: number
): Player => {
  return {
    id,
    name: config.name || `Player ${index + 1}`,
    color: config.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
    isActive: true,
    isEliminated: false,
    orbCount: 0,
    totalMoves: 0,
    type: config.isAI ? 'ai' : 'human',
  };
};

/**
 * Creates multiple players based on configuration
 */
export const createPlayers = (options: PlayerCreationOptions): Player[] => {
  const {
    playerConfigs,
    playerCount = 2,
    defaultNames = [],
    customColors = [],
  } = options;

  // Validate player count
  const validatedCount = Math.max(
    MIN_PLAYERS,
    Math.min(MAX_PLAYERS, playerCount)
  );
  const players: Player[] = [];

  for (let i = 0; i < validatedCount; i++) {
    const playerId = `player-${i + 1}`;

    // Use provided config or create default
    const config: PlayerConfig = playerConfigs?.[i] || {
      name: defaultNames[i] || `Player ${i + 1}`,
      color: customColors[i] || PLAYER_COLORS[i % PLAYER_COLORS.length],
      isAI: false,
    };

    players.push(createPlayer(playerId, config, i));
  }

  return players;
};

/**
 * Gets the next player in turn order
 */
export const getNextPlayer = (
  players: Player[],
  currentPlayerIndex: number,
  skipEliminated: boolean = true
): { nextPlayer: Player | null; nextIndex: number } => {
  if (players.length === 0) {
    return { nextPlayer: null, nextIndex: -1 };
  }

  const activePlayers = skipEliminated
    ? players.filter((p) => !p.isEliminated)
    : players;

  if (activePlayers.length === 0) {
    return { nextPlayer: null, nextIndex: -1 };
  }

  // If we're skipping eliminated players, we need to map indices
  if (skipEliminated) {
    const currentActiveIndex = activePlayers.findIndex(
      (p) => p.id === players[currentPlayerIndex]?.id
    );
    const nextActiveIndex = (currentActiveIndex + 1) % activePlayers.length;
    const nextPlayer = activePlayers[nextActiveIndex];
    const nextIndex = players.findIndex((p) => p.id === nextPlayer.id);

    return { nextPlayer, nextIndex };
  }

  // Simple case: just move to next player
  const nextIndex = (currentPlayerIndex + 1) % players.length;
  return { nextPlayer: players[nextIndex], nextIndex };
};

/**
 * Eliminates a player from the game
 */
export const eliminatePlayer = (
  players: Player[],
  playerId: PlayerId
): Player[] => {
  return players.map((player) =>
    player.id === playerId
      ? { ...player, isEliminated: true, isActive: false }
      : player
  );
};

/**
 * Gets all active (non-eliminated) players
 */
export const getActivePlayers = (players: Player[]): Player[] => {
  return players.filter((player) => !player.isEliminated);
};

/**
 * Updates player statistics
 */
export const updatePlayerStats = (
  player: Player,
  updates: Partial<Pick<Player, 'orbCount' | 'totalMoves'>>
): Player => {
  return {
    ...player,
    ...updates,
  };
};

/**
 * Assigns colors to players, ensuring no duplicates
 */
export const assignPlayerColors = (
  players: Player[],
  availableColors: string[] = PLAYER_COLORS
): Player[] => {
  const usedColors = new Set<string>();

  return players.map((player, index) => {
    // If player already has a unique color, keep it
    if (player.color && !usedColors.has(player.color)) {
      usedColors.add(player.color);
      return player;
    }

    // Find next available color
    const availableColor = availableColors.find(
      (color) => !usedColors.has(color)
    );
    const assignedColor =
      availableColor || availableColors[index % availableColors.length];

    usedColors.add(assignedColor);

    return {
      ...player,
      color: assignedColor,
    };
  });
};

/**
 * Validates player configuration
 */
export const validatePlayerConfig = (config: PlayerConfig): string[] => {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Player name cannot be empty');
  }

  if (config.name && config.name.trim().length > 20) {
    errors.push('Player name cannot exceed 20 characters');
  }

  if (config.color && !/^#[0-9A-Fa-f]{6}$/.test(config.color)) {
    errors.push('Player color must be a valid hex color (e.g., #FF0000)');
  }

  return errors;
};

/**
 * Creates default game settings with player configuration
 */
export const createGameSettingsWithPlayers = (
  playerCount: number,
  playerNames?: string[]
): GameSettings => {
  const validatedCount = Math.max(
    MIN_PLAYERS,
    Math.min(MAX_PLAYERS, playerCount)
  );
  const names = playerNames || [];

  // Ensure we have names for all players
  while (names.length < validatedCount) {
    names.push(`Player ${names.length + 1}`);
  }

  return {
    gridRows: 6,
    gridCols: 9,
    playerCount: validatedCount,
    playerNames: names.slice(0, validatedCount),
    enableAnimations: true,
    enableSounds: true,
  };
};

/**
 * Shuffles player order randomly
 */
export const shufflePlayerOrder = (players: Player[]): Player[] => {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Gets player by ID
 */
export const getPlayerById = (
  players: Player[],
  playerId: PlayerId
): Player | undefined => {
  return players.find((player) => player.id === playerId);
};

/**
 * Checks if a player name is already taken
 */
export const isPlayerNameTaken = (
  players: Player[],
  name: string,
  excludeId?: PlayerId
): boolean => {
  return players.some(
    (player) =>
      player.name.toLowerCase() === name.toLowerCase() &&
      player.id !== excludeId
  );
};
