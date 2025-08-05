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
  playerCount: number;
  playerNames: string[];
  enableAnimations: boolean;
  enableSounds: boolean;
}
