/**
 * Tournament runner for organizing AI vs AI competitions
 */

import { HeadlessGame } from './HeadlessGame';
import type {
  TournamentBot,
  TournamentConfig,
  TournamentResult,
  MatchupResult,
  GameResult,
  TournamentRanking,
  ITournamentRunner,
} from './types';

export class TournamentRunner implements ITournamentRunner {
  public async runTournament(
    bots: TournamentBot[],
    config: TournamentConfig
  ): Promise<TournamentResult> {
    const startTime = Date.now();

    console.log(`🏆 Starting tournament with ${bots.length} bots`);
    console.log(
      `⚙️ Config: ${config.gamesPerMatchup} games per matchup, ${config.maxThinkingTimeMs}ms thinking time`
    );
    console.log(
      `🤖 Participants: ${bots.map((b) => `${b.name} (${b.strategy})`).join(', ')}`
    );
    console.log();

    // Generate all matchups (each bot plays against every other bot)
    const matchups: MatchupResult[] = [];
    let totalGames = 0;

    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const bot1 = bots[i];
        const bot2 = bots[j];

        console.log(`📊 Running matchup: ${bot1.name} vs ${bot2.name}`);

        const matchupResult = await this.runMatchup(bot1, bot2, config);
        matchups.push(matchupResult);
        totalGames += matchupResult.games.length;

        // Quick summary
        const p1wins = matchupResult.player1Wins;
        const p2wins = matchupResult.player2Wins;
        const draws = matchupResult.draws;
        console.log(
          `   Results: ${bot1.name} ${p1wins}-${p2wins}-${draws} ${bot2.name}`
        );
        console.log();
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate rankings
    const rankings = this.calculateRankings(bots, matchups);

    const result: TournamentResult = {
      config,
      participants: bots,
      matchups,
      rankings,
      totalGames,
      totalDurationMs: totalDuration,
      startTime,
      endTime,
    };

    this.printFinalResults(result);

    return result;
  }

  public async runSingleGame(
    bot1: TournamentBot,
    bot2: TournamentBot,
    config: TournamentConfig
  ): Promise<GameResult> {
    const game = new HeadlessGame(bot1, bot2, config);
    return await game.playGame();
  }

  private async runMatchup(
    bot1: TournamentBot,
    bot2: TournamentBot,
    config: TournamentConfig
  ): Promise<MatchupResult> {
    const games: GameResult[] = [];

    for (let gameNum = 1; gameNum <= config.gamesPerMatchup; gameNum++) {
      // Alternate who goes first to be fair
      const firstBot = gameNum % 2 === 1 ? bot1 : bot2;
      const secondBot = gameNum % 2 === 1 ? bot2 : bot1;

      const gameResult = await this.runSingleGame(firstBot, secondBot, config);
      games.push(gameResult);

      if (config.enableDetailedLogging) {
        const winner = gameResult.winner ? gameResult.winner.name : 'Draw';
        const quickWinStr = gameResult.isQuickWin ? ' (Quick Win!)' : '';
        console.log(
          `   Game ${gameNum}: ${winner} in ${gameResult.totalMoves} moves${quickWinStr}`
        );
      }
    }

    // Calculate matchup statistics
    let player1Wins = 0;
    let player2Wins = 0;
    let draws = 0;
    let player1QuickWins = 0;
    let player2QuickWins = 0;

    for (const game of games) {
      if (game.winner === null) {
        draws++;
      } else if (game.winner.id === bot1.id) {
        player1Wins++;
        if (game.isQuickWin) player1QuickWins++;
      } else if (game.winner.id === bot2.id) {
        player2Wins++;
        if (game.isQuickWin) player2QuickWins++;
      }
    }

    return {
      player1: bot1,
      player2: bot2,
      games,
      player1Wins,
      player2Wins,
      draws,
      player1QuickWins,
      player2QuickWins,
    };
  }

  private calculateRankings(
    bots: TournamentBot[],
    matchups: MatchupResult[]
  ): TournamentRanking[] {
    const stats = new Map<
      string,
      {
        bot: TournamentBot;
        wins: number;
        played: number;
        quickWins: number;
        totalMovesToWin: number;
        matchupResults: {
          vsBot: string;
          wins: number;
          losses: number;
          draws: number;
        }[];
      }
    >();

    // Initialize stats for all bots
    for (const bot of bots) {
      stats.set(bot.id, {
        bot,
        wins: 0,
        played: 0,
        quickWins: 0,
        totalMovesToWin: 0,
        matchupResults: [],
      });
    }

    // Process all matchups
    for (const matchup of matchups) {
      const bot1Stats = stats.get(matchup.player1.id)!;
      const bot2Stats = stats.get(matchup.player2.id)!;

      // Update game counts
      bot1Stats.played += matchup.games.length;
      bot2Stats.played += matchup.games.length;

      // Update wins and quick wins
      bot1Stats.wins += matchup.player1Wins;
      bot2Stats.wins += matchup.player2Wins;
      bot1Stats.quickWins += matchup.player1QuickWins;
      bot2Stats.quickWins += matchup.player2QuickWins;

      // Track moves for wins
      for (const game of matchup.games) {
        if (game.winner?.id === matchup.player1.id) {
          bot1Stats.totalMovesToWin += game.totalMoves;
        } else if (game.winner?.id === matchup.player2.id) {
          bot2Stats.totalMovesToWin += game.totalMoves;
        }
      }

      // Track head-to-head results
      bot1Stats.matchupResults.push({
        vsBot: matchup.player2.name,
        wins: matchup.player1Wins,
        losses: matchup.player2Wins,
        draws: matchup.draws,
      });

      bot2Stats.matchupResults.push({
        vsBot: matchup.player1.name,
        wins: matchup.player2Wins,
        losses: matchup.player1Wins,
        draws: matchup.draws,
      });
    }

    // Convert to rankings with points system
    const rankings: TournamentRanking[] = [];

    for (const [, botStats] of stats) {
      const totalPoints = botStats.wins + botStats.quickWins; // 1 point for win + 1 bonus for quick win
      const winRate = botStats.played > 0 ? botStats.wins / botStats.played : 0;
      const averageMovesToWin =
        botStats.wins > 0
          ? botStats.totalMovesToWin / botStats.wins
          : undefined;

      rankings.push({
        rank: 0, // Will be set after sorting
        bot: botStats.bot,
        totalPoints,
        gamesWon: botStats.wins,
        gamesPlayed: botStats.played,
        quickWins: botStats.quickWins,
        winRate,
        averageMovesToWin,
        matchupResults: botStats.matchupResults,
      });
    }

    // Sort by total points (descending), then by win rate, then by average moves (ascending)
    rankings.sort((a, b) => {
      if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (a.winRate !== b.winRate) {
        return b.winRate - a.winRate;
      }
      if (a.averageMovesToWin && b.averageMovesToWin) {
        return a.averageMovesToWin - b.averageMovesToWin;
      }
      return 0;
    });

    // Assign ranks
    for (let i = 0; i < rankings.length; i++) {
      rankings[i].rank = i + 1;
    }

    return rankings;
  }

  private printFinalResults(result: TournamentResult): void {
    console.log('🏆 TOURNAMENT RESULTS');
    console.log('='.repeat(80));
    console.log();

    // Summary stats
    console.log(
      `📊 Tournament completed in ${(result.totalDurationMs / 1000).toFixed(1)}s`
    );
    console.log(`🎮 Total games played: ${result.totalGames}`);
    console.log(
      `⚡ Average game duration: ${(result.totalDurationMs / result.totalGames / 1000).toFixed(1)}s`
    );
    console.log();

    // Rankings table
    console.log('📋 FINAL RANKINGS');
    console.log('-'.repeat(80));
    console.log(
      'Rank | Bot Name         | Points | Wins | Played | Quick | Win Rate | Avg Moves'
    );
    console.log('-'.repeat(80));

    for (const ranking of result.rankings) {
      const rank = ranking.rank.toString().padStart(4);
      const name = ranking.bot.name.padEnd(16);
      const points = ranking.totalPoints.toString().padStart(6);
      const wins = ranking.gamesWon.toString().padStart(4);
      const played = ranking.gamesPlayed.toString().padStart(6);
      const quick = ranking.quickWins.toString().padStart(5);
      const winRate = `${(ranking.winRate * 100).toFixed(1)}%`.padStart(8);
      const avgMoves = ranking.averageMovesToWin
        ? ranking.averageMovesToWin.toFixed(1).padStart(9)
        : 'N/A'.padStart(9);

      console.log(
        `${rank} | ${name} | ${points} | ${wins} | ${played} | ${quick} | ${winRate} | ${avgMoves}`
      );
    }

    console.log('-'.repeat(80));
    console.log();

    // Scoring explanation
    console.log('📖 SCORING SYSTEM');
    console.log('• Win: +1 point');
    console.log('• Quick Win (≤50 moves): +1 bonus point (total +2)');
    console.log('• Draw/Timeout: 0 points');
    console.log();
  }
}
