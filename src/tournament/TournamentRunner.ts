/**
 * Tournament runner for organizing AI vs AI competitions
 */

import { HeadlessGame } from './HeadlessGame';
import type {
  TournamentBot,
  TournamentConfig,
  TournamentResult,
  CombinationResult,
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

    // Randomize bot order at tournament startup for fairness
    const shuffledBots = [...bots];
    for (let i = shuffledBots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledBots[i], shuffledBots[j]] = [shuffledBots[j], shuffledBots[i]];
    }

    // Starting tournament silently - only final results will be shown

    // Generate all combinations for different player counts
    const combinations: CombinationResult[] = [];
    let totalGames = 0;
    let globalGameNumber = 1; // Global game counter

    for (const playerCount of config.playerCounts) {
      if (shuffledBots.length < playerCount) {
        continue; // Skip silently
      }

      const combos = this.generateCombinations(shuffledBots, playerCount);

      for (const combo of combos) {
        const combinationResult = await this.runCombination(
          combo,
          config,
          globalGameNumber
        );
        combinations.push(combinationResult);
        totalGames += combinationResult.games.length;
        globalGameNumber += combinationResult.games.length; // Update global counter
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate rankings
    const rankings = this.calculateRankings(shuffledBots, combinations);

    const result: TournamentResult = {
      config,
      participants: bots, // Return original order for tests, while using shuffled order for gameplay
      combinations,
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
    players: TournamentBot[],
    config: TournamentConfig
  ): Promise<GameResult> {
    const game = new HeadlessGame(players, config);
    return await game.playGame();
  }

  private generateCombinations(
    bots: TournamentBot[],
    playerCount: number
  ): TournamentBot[][] {
    if (playerCount < 2 || playerCount > 4) {
      throw new Error('Player count must be between 2 and 4');
    }

    if (bots.length < playerCount) {
      throw new Error(
        `Need at least ${playerCount} bots for ${playerCount}-player games`
      );
    }

    const combinations: TournamentBot[][] = [];

    const generateCombos = (start: number, currentCombo: TournamentBot[]) => {
      if (currentCombo.length === playerCount) {
        combinations.push([...currentCombo]);
        return;
      }

      for (let i = start; i < bots.length; i++) {
        currentCombo.push(bots[i]);
        generateCombos(i + 1, currentCombo);
        currentCombo.pop();
      }
    };

    generateCombos(0, []);
    return combinations;
  }

  private async runCombination(
    players: TournamentBot[],
    config: TournamentConfig,
    startingGameNumber: number = 1
  ): Promise<CombinationResult> {
    const games: GameResult[] = [];

    for (let gameNum = 1; gameNum <= config.gamesPerCombination; gameNum++) {
      const globalGameNum = startingGameNumber + gameNum - 1;

      // Randomize player order for fairness in multi-player games
      const shuffledPlayers = [...players];
      for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [
          shuffledPlayers[j],
          shuffledPlayers[i],
        ];
      }

      const gameResult = await this.runSingleGame(shuffledPlayers, config);
      games.push(gameResult);

      // Always show game winner (minimal logging)
      const quickWinStr = gameResult.isQuickWin ? ' (Quick Win!)' : '';
      const startingPlayer = shuffledPlayers[0]; // First player in shuffled order starts

      if (gameResult.winner) {
        const opponents = players
          .filter((bot) => bot.id !== gameResult.winner!.id)
          .map((bot) => bot.name)
          .join(', ');
        console.log(
          `   Game ${globalGameNum}: ${gameResult.winner.name} wins against ${opponents} after ${gameResult.totalMoves} moves${quickWinStr} (${startingPlayer.name} started)`
        );
      } else {
        // This shouldn't happen in Chain Reaction - investigate why there's no winner
        console.log(
          `   Game ${globalGameNum}: ERROR - No winner found after ${gameResult.totalMoves} moves (this shouldn't happen) (${startingPlayer.name} started)`
        );
        console.log(
          `   Final ranking: ${gameResult.finalRanking.map((bot) => bot.name).join(', ')}`
        );
      }

      // Show detailed positions only if detailed logging is enabled
      if (config.enableDetailedLogging) {
        const positions = gameResult.finalRanking
          .map((bot, idx) => `${idx + 1}.${bot.name}`)
          .join(' ');
        console.log(`   Final positions: ${positions}`);
      }
    }

    // Calculate player statistics
    const playerStats = players.map((player) => {
      let wins = 0;
      let quickWins = 0;
      let totalPosition = 0;
      let totalGames = 0;

      for (const game of games) {
        totalGames++;

        if (game.winner?.id === player.id) {
          wins++;
          if (game.isQuickWin) quickWins++;
        }

        // Calculate position (1 = winner, higher = worse position)
        const position =
          game.finalRanking.findIndex((bot) => bot.id === player.id) + 1;
        totalPosition += position;
      }

      return {
        player,
        wins,
        quickWins,
        averagePosition:
          totalGames > 0 ? totalPosition / totalGames : players.length,
        totalGames,
      };
    });

    return {
      players,
      playerCount: players.length,
      games,
      playerStats,
    };
  }

  private calculateRankings(
    bots: TournamentBot[],
    combinations: CombinationResult[]
  ): TournamentRanking[] {
    const stats = new Map<
      string,
      {
        bot: TournamentBot;
        wins: number;
        played: number;
        quickWins: number;
        totalMovesToWin: number;
        totalPosition: number;
        performanceByPlayerCount: Map<
          number,
          { games: number; wins: number; totalPosition: number }
        >;
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
        totalPosition: 0,
        performanceByPlayerCount: new Map(),
      });
    }

    // Process all combinations
    for (const combination of combinations) {
      for (const playerStat of combination.playerStats) {
        const botStats = stats.get(playerStat.player.id)!;

        botStats.played += playerStat.totalGames;
        botStats.wins += playerStat.wins;
        botStats.quickWins += playerStat.quickWins;
        botStats.totalPosition +=
          playerStat.averagePosition * playerStat.totalGames;

        // Track performance by player count
        const playerCountStats = botStats.performanceByPlayerCount.get(
          combination.playerCount
        ) || { games: 0, wins: 0, totalPosition: 0 };

        playerCountStats.games += playerStat.totalGames;
        playerCountStats.wins += playerStat.wins;
        playerCountStats.totalPosition +=
          playerStat.averagePosition * playerStat.totalGames;

        botStats.performanceByPlayerCount.set(
          combination.playerCount,
          playerCountStats
        );

        // Track moves for wins
        for (const game of combination.games) {
          if (game.winner?.id === playerStat.player.id) {
            botStats.totalMovesToWin += game.totalMoves;
          }
        }
      }
    }

    // Convert to rankings with points system
    const rankings: TournamentRanking[] = [];

    for (const [, botStats] of stats) {
      const totalPoints = botStats.wins + botStats.quickWins; // 1 point for win + 1 bonus for quick win
      const winRate = botStats.played > 0 ? botStats.wins / botStats.played : 0;
      const averagePosition =
        botStats.played > 0 ? botStats.totalPosition / botStats.played : 0;
      const averageMovesToWin =
        botStats.wins > 0
          ? botStats.totalMovesToWin / botStats.wins
          : undefined;

      const performanceByPlayerCount = Array.from(
        botStats.performanceByPlayerCount.entries()
      )
        .map(([playerCount, stats]) => ({
          playerCount,
          gamesPlayed: stats.games,
          wins: stats.wins,
          averagePosition:
            stats.games > 0 ? stats.totalPosition / stats.games : 0,
        }))
        .sort((a, b) => a.playerCount - b.playerCount);

      rankings.push({
        rank: 0, // Will be set after sorting
        bot: botStats.bot,
        totalPoints,
        gamesWon: botStats.wins,
        gamesPlayed: botStats.played,
        quickWins: botStats.quickWins,
        winRate,
        averagePosition,
        averageMovesToWin,
        performanceByPlayerCount,
      });
    }

    // Sort by total points (descending), then by average position (ascending = better), then by win rate
    rankings.sort((a, b) => {
      if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (a.averagePosition !== b.averagePosition) {
        return a.averagePosition - b.averagePosition;
      }
      if (a.winRate !== b.winRate) {
        return b.winRate - a.winRate;
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

    // Combination breakdown
    const combinationsByPlayerCount = new Map<number, number>();
    for (const combination of result.combinations) {
      const count = combinationsByPlayerCount.get(combination.playerCount) || 0;
      combinationsByPlayerCount.set(combination.playerCount, count + 1);
    }

    console.log('🎯 COMBINATIONS PLAYED');
    for (const [playerCount, count] of Array.from(
      combinationsByPlayerCount.entries()
    ).sort()) {
      console.log(`${playerCount}-player games: ${count} combinations`);
    }
    console.log();

    // Rankings table
    console.log('📋 FINAL RANKINGS');
    console.log('-'.repeat(90));
    console.log(
      'Rank | Bot Name         | Points | Wins | Played | Quick | Win Rate | Avg Pos | Avg Moves'
    );
    console.log('-'.repeat(90));

    for (const ranking of result.rankings) {
      const rank = ranking.rank.toString().padStart(4);
      const name = ranking.bot.name.padEnd(16);
      const points = ranking.totalPoints.toString().padStart(6);
      const wins = ranking.gamesWon.toString().padStart(4);
      const played = ranking.gamesPlayed.toString().padStart(6);
      const quick = ranking.quickWins.toString().padStart(5);
      const winRate = `${(ranking.winRate * 100).toFixed(1)}%`.padStart(8);
      const avgPos = ranking.averagePosition.toFixed(2).padStart(7);
      const avgMoves = ranking.averageMovesToWin
        ? ranking.averageMovesToWin.toFixed(1).padStart(9)
        : 'N/A'.padStart(9);

      console.log(
        `${rank} | ${name} | ${points} | ${wins} | ${played} | ${quick} | ${winRate} | ${avgPos} | ${avgMoves}`
      );
    }

    console.log('-'.repeat(90));
    console.log();

    // Performance by player count breakdown
    console.log('📊 PERFORMANCE BY PLAYER COUNT');
    console.log('-'.repeat(60));

    const playerCounts = [
      ...new Set(result.combinations.map((c) => c.playerCount)),
    ].sort();
    for (const playerCount of playerCounts) {
      console.log(`\n${playerCount}-Player Games:`);
      console.log('Bot Name         | Wins | Games | Win Rate | Avg Pos');
      console.log('-'.repeat(50));

      const playersInThisCount = result.rankings
        .filter((r) =>
          r.performanceByPlayerCount.some((p) => p.playerCount === playerCount)
        )
        .map((r) => {
          const perf = r.performanceByPlayerCount.find(
            (p) => p.playerCount === playerCount
          )!;
          return {
            name: r.bot.name,
            wins: perf.wins,
            games: perf.gamesPlayed,
            winRate: perf.gamesPlayed > 0 ? perf.wins / perf.gamesPlayed : 0,
            avgPos: perf.averagePosition,
          };
        })
        .sort((a, b) => b.winRate - a.winRate);

      for (const player of playersInThisCount) {
        const name = player.name.padEnd(16);
        const wins = player.wins.toString().padStart(4);
        const games = player.games.toString().padStart(5);
        const winRate = `${(player.winRate * 100).toFixed(1)}%`.padStart(8);
        const avgPos = player.avgPos.toFixed(2).padStart(7);
        console.log(`${name} | ${wins} | ${games} | ${winRate} | ${avgPos}`);
      }
    }
    console.log();

    // Scoring explanation
    console.log('📖 SCORING SYSTEM');
    console.log('• Win: +1 point');
    console.log('• Quick Win (≤50 moves): +1 bonus point (total +2)');
    console.log('• Average Position: Lower is better (1.0 = always won)');
    console.log('• Rankings sorted by: Points → Average Position → Win Rate');
    console.log();
  }
}
