/**
 * Core types for the game engine - framework-agnostic
 */

import type { GameBoard } from '../types/game';

export interface Move {
  row: number;
  col: number;
  playerId: string;
}

export interface ChainSimulationResult {
  stepsCount: number;
  finalBoard: GameBoard;
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
