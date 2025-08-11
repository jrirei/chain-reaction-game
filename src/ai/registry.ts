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

export interface StrategyFactory {
  create: (config?: Partial<AiConfig>) => AiStrategy;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const AI_STRATEGIES: Record<AiStrategyName, StrategyFactory> = {
  default: {
    create: () => new DefaultBot(),
    description: 'Balanced strategic play with heuristic evaluation',
    difficulty: 'medium',
  },

  trigger: {
    create: () => new TriggerBot(),
    description: 'Aggressive explosion-focused play, maximizes chain reactions',
    difficulty: 'hard',
  },

  random: {
    create: () => new RandomBot(),
    description: 'Random move selection for testing and casual play',
    difficulty: 'easy',
  },

  monteCarlo: {
    create: () => new MonteCarloBot(),
    description: 'Advanced tree search with time-limited thinking',
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
