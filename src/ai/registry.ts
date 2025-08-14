/**
 * AI Strategy Registry
 *
 * Central registry for all AI strategy implementations.
 * Provides factory functions to create strategy instances.
 */

import type { AiStrategy, AiStrategyName, AiConfig } from './types';
import { DefaultBot } from './defaultBot';
import { TriggerBot } from './triggerBot';
import { RandomBot } from './randomBot';
import { MonteCarloBot } from './monteCarloBot';
import { FredBot } from './fredBot';
import { OskarBot } from './oskarBot';
import { STRATEGY_DISPLAY } from './constants';

export interface StrategyFactory {
  create: (config?: Partial<AiConfig>) => AiStrategy;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const AI_STRATEGIES: Record<AiStrategyName, StrategyFactory> = {
  default: {
    create: () => new DefaultBot(),
    description:
      'Balanced strategic play with solid fundamentals and moderate risk-taking',
    difficulty: 'medium',
  },

  trigger: {
    create: () => new TriggerBot(),
    description:
      'Aggressive explosive strategy that prioritizes chain reactions and dramatic plays',
    difficulty: 'hard',
  },

  random: {
    create: () => new RandomBot(),
    description:
      'Completely random move selection - unpredictable and fun for casual play',
    difficulty: 'easy',
  },

  monteCarlo: {
    create: () => new MonteCarloBot(),
    description:
      'Advanced tree search AI with configurable thinking time for maximum strategic depth',
    difficulty: 'hard',
  },

  fred: {
    create: () => new FredBot(),
    description:
      'Specialized Monte Carlo AI that assumes opponents use TriggerBot strategy and focuses on explosive cell advantage',
    difficulty: 'hard',
  },

  oskar: {
    create: () => new OskarBot(),
    description:
      'Advanced heuristic AI with minimax search, game phase adaptation, and comprehensive strategic analysis',
    difficulty: 'hard',
  },
};

/**
 * Create an AI strategy instance by name
 */
export function createAiStrategy(
  name: AiStrategyName,
  config?: Partial<AiConfig>
): AiStrategy {
  const factory = AI_STRATEGIES[name];
  if (!factory) {
    throw new Error(`Unknown AI strategy: ${name}`);
  }

  return factory.create(config);
}

/**
 * Get all available strategy names
 */
export function getAvailableStrategies(): AiStrategyName[] {
  return Object.keys(AI_STRATEGIES) as AiStrategyName[];
}

/**
 * Get strategy information without creating an instance
 */
export function getStrategyInfo(name: AiStrategyName): StrategyFactory {
  const info = AI_STRATEGIES[name];
  if (!info) {
    throw new Error(`Unknown AI strategy: ${name}`);
  }
  return info;
}

/**
 * Check if a strategy is implemented and ready to use
 */
export function isStrategyAvailable(name: AiStrategyName): boolean {
  try {
    const factory = AI_STRATEGIES[name];
    // Try to create an instance to see if it's implemented
    factory.create();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get display information for a strategy
 */
export function getStrategyDisplay(name: AiStrategyName) {
  if (!(name in STRATEGY_DISPLAY)) {
    throw new Error(`No display info for strategy: ${name}`);
  }
  return STRATEGY_DISPLAY[name];
}

/**
 * Get all strategies grouped by difficulty level
 */
export function getStrategiesByDifficulty() {
  const byDifficulty: Record<string, AiStrategyName[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  for (const [name, info] of Object.entries(AI_STRATEGIES)) {
    byDifficulty[info.difficulty].push(name as AiStrategyName);
  }

  return byDifficulty;
}

/**
 * Get recommended strategy for a difficulty level
 */
export function getRecommendedStrategy(
  difficulty: 'easy' | 'medium' | 'hard'
): AiStrategyName {
  const strategies = getStrategiesByDifficulty();
  const available = strategies[difficulty];

  if (available.length === 0) {
    throw new Error(`No strategies available for difficulty: ${difficulty}`);
  }

  // Return the first available strategy for that difficulty
  return available[0];
}
