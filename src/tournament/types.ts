/**
 * Tournament system types for headless AI vs AI competitions
 */

import type { AiStrategyName } from '../ai/types';

export interface TournamentBot {
  id: string;
  name: string;
  strategy: AiStrategyName;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface TournamentConfig {
  /** Number of times each combination should play */
  gamesPerCombination: number;
  /** Which player counts to include (e.g., [2, 3, 4] for 2v2, 3-way, 4-way games) */
  playerCounts: number[];
  /** Maximum thinking time per move in milliseconds */
  maxThinkingTimeMs: number;
  /** Timeout for entire game in milliseconds */
  gameTimeoutMs: number;
  /** Enable detailed logging during matches */
  enableDetailedLogging: boolean;
  /** Maximum number of games to run in parallel (default: CPU count) */
  maxParallelGames?: number;
  /** Enable parallel execution (default: true) */
  enableParallel?: boolean;
}

export interface GameResult {
  gameId: string;
  players: TournamentBot[];
  winner: TournamentBot | null; // null for timeout/draw
  finalRanking: TournamentBot[]; // Players ordered by elimination (winner first, eliminated last)
  totalOrbsAtEnd: number; // Total number of orbs on board when game ended
  gameDurationMs: number;
  isQuickWin: boolean; // true if won with <= 10 moves by winner
  eliminationHistory?: {
    player: TournamentBot;
    eliminationMove: number;
    remainingPlayers: number;
  }[];
}

export interface CombinationResult {
  players: TournamentBot[];
  playerCount: number;
  games: GameResult[];
  playerStats: {
    player: TournamentBot;
    wins: number;
    quickWins: number;
    averagePosition: number; // Average final position (1 = always won, playerCount = always eliminated first)
    totalGames: number;
  }[];
}

export interface TournamentResult {
  config: TournamentConfig;
  participants: TournamentBot[];
  combinations: CombinationResult[];
  rankings: TournamentRanking[];
  totalGames: number;
  totalDurationMs: number;
  startTime: number;
  endTime: number;
}

export interface TournamentRanking {
  rank: number;
  bot: TournamentBot;
  totalPoints: number;
  gamesWon: number;
  gamesPlayed: number;
  quickWins: number;
  winRate: number;
  averagePosition: number; // Average position across all games (1.0 = always won, higher = worse)
  averageMovesToWin?: number;
  performanceByPlayerCount: {
    playerCount: number;
    gamesPlayed: number;
    wins: number;
    averagePosition: number;
  }[];
}

export interface ITournamentRunner {
  runTournament(
    bots: TournamentBot[],
    config: TournamentConfig
  ): Promise<TournamentResult>;
  runSingleGame(
    players: TournamentBot[],
    config: TournamentConfig
  ): Promise<GameResult>;
}
