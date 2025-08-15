#!/usr/bin/env tsx
/**
 * Single game runner for parallel execution
 * Runs one tournament game and outputs the result as JSON
 */

import { TournamentRunner } from './TournamentRunner';
import type { TournamentBot, TournamentConfig, GameResult } from './types';

async function runSingleGame() {
  try {
    // Get arguments from command line
    const args = process.argv.slice(2);
    if (args.length !== 3) {
      throw new Error(
        'Usage: singleGameRunner.ts <players> <config> <gameNumber>'
      );
    }

    const players: TournamentBot[] = JSON.parse(args[0]);
    const config: TournamentConfig = JSON.parse(args[1]);
    const gameNumber: number = parseInt(args[2]);

    const runner = new TournamentRunner();
    const result: GameResult = await runner.runSingleGame(players, config);

    // Output result as JSON
    console.log(JSON.stringify({ success: true, result, gameNumber }));
  } catch (error) {
    console.log(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        gameNumber: process.argv[4] ? parseInt(process.argv[4]) : 0,
      })
    );
    process.exit(1);
  }
}

runSingleGame();
