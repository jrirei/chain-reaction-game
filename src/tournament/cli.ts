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
  games?: number;
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
      case '--games':
      case '-g':
        options.games = parseInt(nextArg, 10);
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
🏆 Chain Reaction AI Tournament CLI

USAGE:
  npm run tournament [options]

OPTIONS:
  -b, --bots <strategies>     Comma-separated list of AI strategies to include
                              Available: default,trigger,random,monteCarlo,tactical
  -g, --games <number>        Number of games each pair plays (default: 1)
  -t, --thinking-time <ms>    Max thinking time per move in milliseconds (default: 1000)
  --timeout <ms>              Max time per game in milliseconds (default: 300000)
  -v, --verbose               Enable detailed logging during games
  -p, --preset <name>         Use predefined bot selection
                              Available: all, easy, hard, mixed, smart
  -h, --help                  Show this help message

EXAMPLES:
  npm run tournament                           # Run all bots, 1 game each
  npm run tournament -p smart -g 3            # Smart bots only, 3 games each
  npm run tournament -b "default,trigger" -v  # Only DefaultBot vs TriggerBot with verbose output
  npm run tournament -g 5 -t 2000            # All bots, 5 games each, 2s thinking time

SCORING:
  • Win: +1 point
  • Quick Win (≤50 total moves): +1 bonus point (total +2)
  • Draw/Timeout: 0 points

AI STRATEGIES:
  • default    - Balanced strategic play (medium difficulty)
  • trigger    - Aggressive explosive strategy (hard difficulty)  
  • random     - Random move selection (easy difficulty)
  • monteCarlo - Tree search AI with configurable time (hard difficulty)
  • tactical   - Elite hybrid AI with heuristic filtering (hard difficulty)
`);
}

function validateOptions(options: CliOptions): string[] {
  const errors: string[] = [];

  if (
    options.games !== undefined &&
    (options.games < 1 || options.games > 100)
  ) {
    errors.push('Games per matchup must be between 1 and 100');
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
      'tactical',
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

  // Create tournament config
  const config: TournamentConfig = {
    gamesPerMatchup: options.games ?? 1,
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
