#!/usr/bin/env node

/**
 * CLI for running AI vs AI tournaments
 * Usage: npm run tournament [options]
 */

import { TournamentRunner } from './TournamentRunner';
import {
  TOURNAMENT_PRESETS,
  createTournamentBot,
  getAllTournamentBots,
} from './botRegistry';
import type { TournamentConfig } from './types';
import type { AiStrategyName } from '../ai/types';

interface CliOptions {
  bots?: string;
  rounds?: number;
  playerCounts?: string;
  thinkingTime?: number;
  timeout?: number;
  verbose?: boolean;
  preset?: string;
  help?: boolean;
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--bots':
      case '-b':
        options.bots = nextArg;
        i++;
        break;
      case '--rounds':
      case '-r':
        options.rounds = parseInt(nextArg, 10);
        i++;
        break;
      case '--player-counts':
      case '-c':
        options.playerCounts = nextArg;
        i++;
        break;
      case '--thinking-time':
      case '-t':
        options.thinkingTime = parseInt(nextArg, 10);
        i++;
        break;
      case '--timeout':
        options.timeout = parseInt(nextArg, 10);
        i++;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--preset':
      case '-p':
        options.preset = nextArg;
        i++;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
🏆 Chain Reaction AI Tournament CLI (Multi-Player Edition)

USAGE:
  npm run tournament [options]

OPTIONS:
  -b, --bots <strategies>     Comma-separated list of AI strategies to include
                              Available: default,trigger,random,monteCarlo,fred
  -r, --rounds <number>       Number of times each combination plays (default: 1)
  -c, --player-counts <list>  Comma-separated player counts (e.g., "2,3,4" for 2v2, 3-way, 4-way games)
                              Available: 2, 3, 4 (default: "2")
  -t, --thinking-time <ms>    Max thinking time per move in milliseconds (default: 1000)
  --timeout <ms>              Max time per game in milliseconds (default: 300000)
  -v, --verbose               Enable detailed logging during games
  -p, --preset <name>         Use predefined bot selection
                              Available: all, easy, hard, mixed, smart
  -h, --help                  Show this help message

EXAMPLES:
  npm run tournament                                    # All bots, 2-player games, 1 round each
  npm run tournament -c "2,3,4" -r 2                  # All combinations, 2v2/3-way/4-way, 2 rounds each
  npm run tournament -p smart -c "3,4" -v             # Smart bots, 3-way and 4-way games, verbose
  npm run tournament -b "default,trigger,random" -c "3" # 3 specific bots, 3-way games only
  npm run tournament -r 3 -t 2000                     # All bots, 2-player games, 3 rounds, 2s thinking

GAME MODES:
  • 2-player: Classic head-to-head battles
  • 3-player: Free-for-all with elimination order tracking
  • 4-player: Maximum chaos with complex elimination dynamics

SCORING:
  • Win: +1 point
  • Quick Win (≤50 total moves): +1 bonus point (total +2)
  • Rankings by: Points → Average Position → Win Rate
  • Average Position: 1.0 = always won, higher = worse performance

AI STRATEGIES:
  • default    - Balanced strategic play (medium difficulty)
  • trigger    - Aggressive explosive strategy (hard difficulty)  
  • random     - Random move selection (easy difficulty)
  • monteCarlo - Tree search AI with configurable time (hard difficulty)
  • fred       - Specialized Monte Carlo AI assuming TriggerBot opponents (hard difficulty)
`);
}

function validateOptions(options: CliOptions): string[] {
  const errors: string[] = [];

  if (
    options.rounds !== undefined &&
    (options.rounds < 1 || options.rounds > 100)
  ) {
    errors.push('Rounds per combination must be between 1 and 100');
  }

  if (options.playerCounts) {
    const counts = options.playerCounts
      .split(',')
      .map((s) => parseInt(s.trim(), 10));
    const invalidCounts = counts.filter((c) => isNaN(c) || c < 2 || c > 4);
    if (invalidCounts.length > 0) {
      errors.push('Player counts must be numbers between 2 and 4');
    }
  }

  if (
    options.thinkingTime !== undefined &&
    (options.thinkingTime < 10 || options.thinkingTime > 60000)
  ) {
    errors.push('Thinking time must be between 10ms and 60000ms');
  }

  if (options.timeout !== undefined && options.timeout < 1000) {
    errors.push('Game timeout must be at least 1000ms');
  }

  if (
    options.preset &&
    !['all', 'easy', 'hard', 'mixed', 'smart'].includes(options.preset)
  ) {
    errors.push('Invalid preset. Available: all, easy, hard, mixed, smart');
  }

  if (options.bots) {
    const strategies = options.bots.split(',').map((s) => s.trim());
    const validStrategies = [
      'default',
      'trigger',
      'random',
      'monteCarlo',
      'fred',
    ];
    const invalidStrategies = strategies.filter(
      (s) => !validStrategies.includes(s)
    );
    if (invalidStrategies.length > 0) {
      errors.push(`Invalid bot strategies: ${invalidStrategies.join(', ')}`);
    }
    if (strategies.length < 2) {
      errors.push('At least 2 bots required for a tournament');
    }
  }

  return errors;
}

async function runTournament(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseCliArgs(args);

  if (options.help) {
    printHelp();
    return;
  }

  // Validate options
  const errors = validateOptions(options);
  if (errors.length > 0) {
    console.error('❌ Error: ' + errors.join(', '));
    console.log('Use --help for usage information');
    process.exit(1);
  }

  // Select bots
  let tournamentBots;

  if (options.preset) {
    switch (options.preset) {
      case 'all':
        tournamentBots = TOURNAMENT_PRESETS.ALL_BOTS;
        break;
      case 'easy':
        tournamentBots = TOURNAMENT_PRESETS.EASY_ONLY;
        break;
      case 'hard':
        tournamentBots = TOURNAMENT_PRESETS.HARD_ONLY;
        break;
      case 'mixed':
        tournamentBots = TOURNAMENT_PRESETS.MIXED_SAMPLE;
        break;
      case 'smart':
        tournamentBots = TOURNAMENT_PRESETS.SMART_BOTS;
        break;
      default:
        tournamentBots = TOURNAMENT_PRESETS.ALL_BOTS;
    }
  } else if (options.bots) {
    const strategies = options.bots
      .split(',')
      .map((s) => s.trim()) as AiStrategyName[];
    tournamentBots = strategies.map((strategy) =>
      createTournamentBot(strategy)
    );
  } else {
    tournamentBots = getAllTournamentBots();
  }

  // Parse player counts
  const playerCounts = options.playerCounts
    ? options.playerCounts.split(',').map((s) => parseInt(s.trim(), 10))
    : [2]; // Default to 2-player games only

  // Create tournament config
  const config: TournamentConfig = {
    gamesPerCombination: options.rounds ?? 1,
    playerCounts,
    maxThinkingTimeMs: options.thinkingTime ?? 1000,
    gameTimeoutMs: options.timeout ?? 300000, // 5 minutes default
    enableDetailedLogging: options.verbose ?? false,
  };

  try {
    const runner = new TournamentRunner();
    await runner.runTournament([...tournamentBots], config);

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('❌ Tournament failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  runTournament().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { runTournament, parseCliArgs, validateOptions };
