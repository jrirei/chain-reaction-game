/**
 * Registry of available tournament bots
 */

import { AI_STRATEGIES } from '../ai/registry';
import type { TournamentBot } from './types';
import type { AiStrategyName } from '../ai/types';

/**
 * Create a tournament bot from an AI strategy
 */
export function createTournamentBot(
  strategy: AiStrategyName,
  customName?: string
): TournamentBot {
  const strategyInfo = AI_STRATEGIES[strategy];
  if (!strategyInfo) {
    throw new Error(`Unknown AI strategy: ${strategy}`);
  }

  return {
    id: `bot-${strategy}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name:
      customName ||
      strategy.charAt(0).toUpperCase() + strategy.slice(1) + 'Bot',
    strategy,
    description: strategyInfo.description,
    difficulty: strategyInfo.difficulty,
  };
}

/**
 * Get all available tournament bots
 */
export function getAllTournamentBots(): TournamentBot[] {
  const strategies = Object.keys(AI_STRATEGIES) as AiStrategyName[];
  return strategies.map((strategy) => createTournamentBot(strategy));
}

/**
 * Get tournament bots by difficulty
 */
export function getTournamentBotsByDifficulty(
  difficulty: 'easy' | 'medium' | 'hard'
): TournamentBot[] {
  const allBots = getAllTournamentBots();
  return allBots.filter((bot) => bot.difficulty === difficulty);
}

/**
 * Get a specific tournament bot by strategy name
 */
export function getTournamentBot(
  strategy: AiStrategyName,
  customName?: string
): TournamentBot {
  return createTournamentBot(strategy, customName);
}

/**
 * Create a custom tournament with selected bots
 */
export function createCustomTournament(
  strategies: AiStrategyName[],
  customNames?: Record<AiStrategyName, string>
): TournamentBot[] {
  return strategies.map((strategy) =>
    createTournamentBot(strategy, customNames?.[strategy])
  );
}

/**
 * Predefined tournament configurations
 */
export const TOURNAMENT_PRESETS = {
  ALL_BOTS: getAllTournamentBots(),

  EASY_ONLY: getTournamentBotsByDifficulty('easy'),

  HARD_ONLY: getTournamentBotsByDifficulty('hard'),

  MIXED_SAMPLE: [
    createTournamentBot('random', 'Chaos'),
    createTournamentBot('default', 'Balanced'),
    createTournamentBot('trigger', 'Explosive'),
    createTournamentBot('monteCarlo', 'Thinker'),
  ],

  SMART_BOTS: [
    createTournamentBot('default', 'Classic'),
    createTournamentBot('trigger', 'Aggressive'),
    createTournamentBot('monteCarlo', 'Calculator'),
    createTournamentBot('oskar', 'Master'),
  ],
} as const;
