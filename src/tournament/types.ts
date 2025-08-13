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
  /** Number of games each pair of bots plays against each other */
  gamesPerMatchup: number;
  /** Maximum thinking time per move in milliseconds */
  maxThinkingTimeMs: number;
  /** Timeout for entire game in milliseconds */
  gameTimeoutMs: number;
  /** Enable detailed logging during matches */
  enableDetailedLogging: boolean;
}

export interface GameResult {
  gameId: string;
  player1: TournamentBot;
  player2: TournamentBot;
  winner: TournamentBot | null; // null for timeout/draw
  totalMoves: number;
  gameDurationMs: number;
  isQuickWin: boolean; // true if won with <= 50 total moves
  eliminationDetails?: {
    eliminatedPlayer: TournamentBot;
    eliminationMove: number;
  };
}

export interface MatchupResult {
  player1: TournamentBot;
  player2: TournamentBot;
  games: GameResult[];
  player1Wins: number;
  player2Wins: number;
  draws: number;
  player1QuickWins: number;
  player2QuickWins: number;
}

export interface TournamentResult {
  config: TournamentConfig;
  participants: TournamentBot[];
  matchups: MatchupResult[];
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
  averageMovesToWin?: number;
  matchupResults: {
    vsBot: string;
    wins: number;
    losses: number;
    draws: number;
  }[];
}

export interface ITournamentRunner {
  runTournament(
    bots: TournamentBot[],
    config: TournamentConfig
  ): Promise<TournamentResult>;
  runSingleGame(
    bot1: TournamentBot,
    bot2: TournamentBot,
    config: TournamentConfig
  ): Promise<GameResult>;
}
