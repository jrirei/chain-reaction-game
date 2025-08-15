/**
 * Worker thread for parallel game execution
 * Runs individual tournament games in isolation
 */

import { parentPort } from 'worker_threads';
import { TournamentRunner } from './TournamentRunner.js';
import type { TournamentBot, TournamentConfig, GameResult } from './types';

interface WorkerTask {
  taskId: string;
  type: 'runGame';
  players: TournamentBot[];
  config: TournamentConfig;
}

interface WorkerResult {
  taskId: string;
  success: boolean;
  result?: GameResult;
  error?: string;
}

// Worker main execution
async function runWorker() {
  if (!parentPort) {
    throw new Error('Worker must be run in worker thread context');
  }

  const runner = new TournamentRunner();

  parentPort.on('message', async (task: WorkerTask) => {
    try {
      let result: WorkerResult;

      if (task.type === 'runGame') {
        const gameResult = await runner.runSingleGame(
          task.players,
          task.config
        );
        result = {
          taskId: task.taskId,
          success: true,
          result: gameResult,
        };
      } else {
        result = {
          taskId: task.taskId,
          success: false,
          error: `Unknown task type: ${(task as { type: string }).type}`,
        };
      }

      parentPort!.postMessage(result);
    } catch (error) {
      const result: WorkerResult = {
        taskId: task.taskId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      parentPort!.postMessage(result);
    }
  });

  // Signal worker is ready
  parentPort.postMessage({ type: 'ready' });
}

// Start worker
runWorker().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
