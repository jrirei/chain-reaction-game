/**
 * Core types for the game engine - framework-agnostic
 */

export interface Move {
  row: number;
  col: number;
  playerId: string;
}

export interface ChainSimulationResult {
  stepsCount: number;
  finalBoard: unknown; // Will be GameBoard but avoiding circular imports
  affectedCells: Array<{
    row: number;
    col: number;
    oldOrbCount: number;
    newOrbCount: number;
    oldPlayerId: string | null;
    newPlayerId: string | null;
  }>;
  totalExplosions: number;
}

export interface LegalMovesOptions {
  excludeAnimating?: boolean;
  includeWarnings?: boolean;
}
