/**
 * Parallel tournament runner using Node.js Child Processes
 * Distributes games across multiple child processes for true parallelism
 */

import { cpus } from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type {
  TournamentBot,
  TournamentConfig,
  TournamentResult,
  CombinationResult,
  GameResult,
  TournamentRanking,
  ITournamentRunner,
} from './types';

interface ParallelConfig extends TournamentConfig {
  /** Maximum number of games to run in parallel (default: CPU count) */
  maxParallelGames?: number;
  /** Enable parallel execution (default: true) */
  enableParallel?: boolean;
}

export class ParallelTournamentRunner implements ITournamentRunner {
  private runnerPath: string;

  constructor() {
    // Get the single game runner file path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    this.runnerPath = join(__dirname, 'singleGameRunner.ts');
  }

  public async runTournament(
    bots: TournamentBot[],
    config: ParallelConfig
  ): Promise<TournamentResult> {
    const startTime = Date.now();

    // Check if parallel execution is enabled
    if (config.enableParallel === false) {
      // Fall back to sequential execution
      const { TournamentRunner } = await import('./TournamentRunner');
      const sequentialRunner = new TournamentRunner();
      return sequentialRunner.runTournament(bots, config);
    }

    const maxConcurrentGames = config.maxParallelGames || cpus().length;

    // Randomize bot order for fairness
    const shuffledBots = [...bots];
    for (let i = shuffledBots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledBots[i], shuffledBots[j]] = [shuffledBots[j], shuffledBots[i]];
    }

    console.log(
      `🚀 Starting parallel tournament with ${maxConcurrentGames} concurrent games`
    );

    // Generate all game tasks
    const gameTasks: { players: TournamentBot[]; gameNumber: number }[] = [];
    let globalGameNumber = 1;

    for (const playerCount of config.playerCounts) {
      if (shuffledBots.length < playerCount) {
        continue;
      }

      const combinations = this.generateCombinations(shuffledBots, playerCount);
      for (const combo of combinations) {
        for (
          let gameNum = 1;
          gameNum <= config.gamesPerCombination;
          gameNum++
        ) {
          // Randomize player order for each game
          const shuffledPlayers = [...combo];
          for (let i = shuffledPlayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledPlayers[i], shuffledPlayers[j]] = [
              shuffledPlayers[j],
              shuffledPlayers[i],
            ];
          }

          gameTasks.push({
            players: shuffledPlayers,
            gameNumber: globalGameNumber++,
          });
        }
      }
    }

    console.log(
      `📊 Running ${gameTasks.length} games with ${maxConcurrentGames} concurrent executions`
    );

    // Execute all games with child processes
    const gameResults = await this.executeGamesWithConcurrencyLimit(
      gameTasks,
      config,
      maxConcurrentGames
    );

    return this.finalizeTournamentResults(
      shuffledBots,
      config,
      gameResults,
      startTime,
      bots
    );
  }

  private async finalizeTournamentResults(
    shuffledBots: TournamentBot[],
    config: TournamentConfig,
    gameResults: GameResult[],
    startTime: number,
    bots: TournamentBot[]
  ): Promise<TournamentResult> {
    // Organize results by combination
    const combinations = this.organizeResultsByCombination(
      shuffledBots,
      config,
      gameResults
    );

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Calculate rankings
    const rankings = this.calculateRankings(shuffledBots, combinations);

    const result: TournamentResult = {
      config,
      participants: bots,
      combinations,
      rankings,
      totalGames: gameResults.length,
      totalDurationMs: totalDuration,
      startTime,
      endTime,
    };

    // Get maxConcurrentGames from the config
    const maxConcurrentGames =
      (config as ParallelConfig).maxParallelGames || cpus().length;
    this.printFinalResults(result, maxConcurrentGames);
    return result;
  }

  public async runSingleGame(
    players: TournamentBot[],
    config: TournamentConfig
  ): Promise<GameResult> {
    // For single games, just use sequential execution for simplicity
    const { TournamentRunner } = await import('./TournamentRunner');
    const sequentialRunner = new TournamentRunner();
    return sequentialRunner.runSingleGame(players, config);
  }

  private async runGameInChildProcess(
    players: TournamentBot[],
    config: TournamentConfig,
    gameNumber: number
  ): Promise<GameResult> {
    return new Promise((resolve, reject) => {
      const args = [
        JSON.stringify(players),
        JSON.stringify(config),
        gameNumber.toString(),
      ];

      const child = spawn('tsx', [this.runnerPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          try {
            const response = JSON.parse(stdout.trim());
            if (response.success) {
              resolve(response.result);
            } else {
              reject(
                new Error(response.error || 'Unknown error from child process')
              );
            }
          } catch (error) {
            reject(new Error(`Failed to parse child process output: ${error}`));
          }
        } else {
          reject(
            new Error(`Child process exited with code ${code}: ${stderr}`)
          );
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn child process: ${error.message}`));
      });
    });
  }

  private async executeGamesWithConcurrencyLimit(
    gameTasks: { players: TournamentBot[]; gameNumber: number }[],
    config: TournamentConfig,
    maxConcurrentGames: number
  ): Promise<GameResult[]> {
    const results: GameResult[] = [];
    const taskQueue = [...gameTasks]; // Copy the tasks to process
    let runningProcesses = 0;
    let completedGames = 0;
    const totalGames = gameTasks.length;

    return new Promise((resolve, reject) => {
      const startNextGame = () => {
        // Start new games up to the concurrency limit
        while (runningProcesses < maxConcurrentGames && taskQueue.length > 0) {
          const gameTask = taskQueue.shift()!;
          runningProcesses++;

          this.runGameInChildProcess(
            gameTask.players,
            config,
            gameTask.gameNumber
          )
            .then((result) => {
              // Show progress
              const startingPlayer = gameTask.players[0];
              const quickWinStr = result.isQuickWin ? ' (Quick Win!)' : '';
              const opponents = gameTask.players
                .filter((bot) => bot.id !== result.winner?.id)
                .map((bot) => bot.name)
                .join(', ');

              if (result.winner) {
                console.log(
                  `   Game ${gameTask.gameNumber}: ${result.winner.name} wins against ${opponents} with ${result.totalOrbsAtEnd} orbs on board${quickWinStr} (${startingPlayer.name} started) [Process-${runningProcesses}]`
                );
              }

              results.push(result);
              runningProcesses--;
              completedGames++;

              // Check if we're done
              if (completedGames === totalGames) {
                resolve(results);
              } else {
                // Start the next game immediately
                startNextGame();
              }
            })
            .catch((error) => {
              runningProcesses--;
              reject(error);
            });
        }
      };

      // Start initial batch of games
      startNextGame();
    });
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

  private organizeResultsByCombination(
    _bots: TournamentBot[],
    _config: TournamentConfig,
    gameResults: GameResult[]
  ): CombinationResult[] {
    const combinations: CombinationResult[] = [];
    const combinationMap = new Map<string, GameResult[]>();

    // Group games by player combination
    for (const gameResult of gameResults) {
      const combinationKey = gameResult.players
        .map((p) => p.id)
        .sort()
        .join('-');

      if (!combinationMap.has(combinationKey)) {
        combinationMap.set(combinationKey, []);
      }
      combinationMap.get(combinationKey)!.push(gameResult);
    }

    // Convert to CombinationResult format
    for (const [, games] of combinationMap) {
      if (games.length === 0) continue;

      const players = games[0].players;
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

      combinations.push({
        players,
        playerCount: players.length,
        games,
        playerStats,
      });
    }

    return combinations;
  }

  private calculateRankings(
    bots: TournamentBot[],
    combinations: CombinationResult[]
  ): TournamentRanking[] {
    // This is the same logic as the sequential TournamentRunner
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
            const winnerMoves = game.totalOrbsAtEnd;
            botStats.totalMovesToWin += winnerMoves;
          }
        }
      }
    }

    // Convert to rankings with points system
    const rankings: TournamentRanking[] = [];

    for (const [, botStats] of stats) {
      const totalPoints = botStats.wins + botStats.quickWins;
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
        rank: 0,
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

    // Sort by total points, then by average position, then by win rate
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

  private printFinalResults(
    result: TournamentResult,
    concurrencyLimit: number
  ): void {
    console.log('🏆 PARALLEL TOURNAMENT RESULTS');
    console.log('='.repeat(80));
    console.log();

    // Summary stats
    console.log(
      `📊 Tournament completed in ${(result.totalDurationMs / 1000).toFixed(1)}s using ${concurrencyLimit} concurrent processes`
    );
    console.log(`🎮 Total games played: ${result.totalGames}`);
    console.log(
      `⚡ Average game duration: ${(result.totalDurationMs / result.totalGames / 1000).toFixed(1)}s`
    );
    console.log(
      `🚀 Parallel speedup: ~${Math.min(concurrencyLimit, result.totalGames)}x estimated improvement`
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
      'Rank | Bot Name         | Points | Wins | Played | Quick | Win Rate | Avg Pos | Avg Orbs'
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
    console.log('• Quick Win (≤10 orbs on field): +1 bonus point (total +2)');
    console.log('• Average Position: Lower is better (1.0 = always won)');
    console.log('• Rankings sorted by: Points → Average Position → Win Rate');
    console.log(
      `• Parallel Execution: ${concurrencyLimit} concurrent processes for ${Math.min(concurrencyLimit, result.totalGames)}x performance`
    );
    console.log();
  }
}
