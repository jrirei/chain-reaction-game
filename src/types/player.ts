export interface Player {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  isEliminated: boolean;
  orbCount: number;
  totalMoves: number;
}

export type PlayerId = string;

export interface PlayerStats {
  playerId: PlayerId;
  gamesWon: number;
  gamesPlayed: number;
  totalMoves: number;
  winRate: number;
  chainReactionsTriggered: number;
  totalExplosionsCaused: number;
  longestChainReaction: number;
}

export interface GameSettings {
  gridRows: number;
  gridCols: number;
  playerCount: number; // 2-4 players supported
  playerNames: string[];
  enableAnimations: boolean;
  enableSounds: boolean;
  // Multi-player specific settings
  maxPlayers?: number; // Future extensibility
  allowSpectators?: boolean; // Future feature
}
