import { describe, it, expect } from 'vitest';
import {
  createAiStrategy,
  getAvailableStrategies,
  getStrategyInfo,
  isStrategyAvailable,
} from '../registry';
import { DefaultBot } from '../defaultBot';
import { TriggerBot } from '../triggerBot';
import { RandomBot } from '../randomBot';
import { MonteCarloBot } from '../monteCarloBot';
import { OptimizedMonteCarloBot } from '../optimizedMonteCarloBot';
import { OskarBot } from '../oskarBot';
import type { AiConfig } from '../types';

describe('AI Strategy Registry', () => {
  it('should create default bot instance', () => {
    const strategy = createAiStrategy('default');

    expect(strategy).toBeInstanceOf(DefaultBot);
    expect(strategy.name).toBe('default');
  });

  it('should create trigger bot instance', () => {
    const strategy = createAiStrategy('trigger');

    expect(strategy).toBeInstanceOf(TriggerBot);
    expect(strategy.name).toBe('trigger');
  });

  it('should create random bot instance', () => {
    const strategy = createAiStrategy('random');

    expect(strategy).toBeInstanceOf(RandomBot);
    expect(strategy.name).toBe('random');
  });

  it('should create monte carlo bot instance', () => {
    const strategy = createAiStrategy('monteCarlo');

    expect(strategy).toBeInstanceOf(MonteCarloBot);
    expect(strategy.name).toBe('monteCarlo');
  });

  it('should throw error for unknown strategy', () => {
    expect(() => createAiStrategy('unknown' as never)).toThrow(
      'Unknown AI strategy: unknown'
    );
  });

  it('should create optimized monte carlo bot instance', () => {
    const strategy = createAiStrategy('optimizedMonteCarlo');

    expect(strategy).toBeInstanceOf(OptimizedMonteCarloBot);
    expect(strategy.name).toBe('optimizedMonteCarlo');
  });

  it('should create oskar bot instance', () => {
    const strategy = createAiStrategy('oskar');

    expect(strategy).toBeInstanceOf(OskarBot);
    expect(strategy.name).toBe('oskar');
  });

  it('should create bot with custom config', () => {
    const config: AiConfig = {
      strategy: 'default',
      maxThinkingMs: 2000,
      difficulty: 'hard',
    };

    const strategy = createAiStrategy('default', config);
    expect(strategy).toBeInstanceOf(DefaultBot);
    expect(strategy.name).toBe('default');
  });

  it('should return all available strategies', () => {
    const strategies = getAvailableStrategies();

    expect(strategies).toContain('default');
    expect(strategies).toContain('trigger');
    expect(strategies).toContain('random');
    expect(strategies).toContain('monteCarlo');
    expect(strategies).toContain('optimizedMonteCarlo');
    expect(strategies).toContain('oskar');
    expect(strategies.length).toBeGreaterThanOrEqual(6);
  });

  it('should return strategy info for all bots', () => {
    const defaultInfo = getStrategyInfo('default');
    expect(defaultInfo.description).toContain('Balanced strategic play');
    expect(defaultInfo.difficulty).toBe('medium');

    const triggerInfo = getStrategyInfo('trigger');
    expect(triggerInfo.description).toContain('explosive strategy');
    expect(triggerInfo.difficulty).toBe('hard');

    const randomInfo = getStrategyInfo('random');
    expect(randomInfo.description).toContain('random move selection');
    expect(randomInfo.difficulty).toBe('easy');

    const monteCarloInfo = getStrategyInfo('monteCarlo');
    expect(monteCarloInfo.description).toContain('Advanced tree search');
    expect(monteCarloInfo.difficulty).toBe('hard');

    const optimizedMonteCarloInfo = getStrategyInfo('optimizedMonteCarlo');
    expect(optimizedMonteCarloInfo.description).toContain('Enhanced MCTS');
    expect(optimizedMonteCarloInfo.difficulty).toBe('hard');

    const oskarInfo = getStrategyInfo('oskar');
    expect(oskarInfo.description).toContain('Advanced heuristic');
    expect(oskarInfo.difficulty).toBe('hard');
  });

  it('should check strategy availability for all bots', () => {
    expect(isStrategyAvailable('default')).toBe(true);
    expect(isStrategyAvailable('trigger')).toBe(true);
    expect(isStrategyAvailable('random')).toBe(true);
    expect(isStrategyAvailable('monteCarlo')).toBe(true);
    expect(isStrategyAvailable('optimizedMonteCarlo')).toBe(true);
    expect(isStrategyAvailable('oskar')).toBe(true);
    expect(isStrategyAvailable('nonexistent' as never)).toBe(false);
  });

  it('should throw error for unknown strategy info', () => {
    expect(() => getStrategyInfo('unknown' as never)).toThrow(
      'Unknown AI strategy: unknown'
    );
  });

  it('should handle edge cases gracefully', () => {
    // Test with undefined config
    const strategy1 = createAiStrategy('default', undefined);
    expect(strategy1).toBeInstanceOf(DefaultBot);

    // Test with partial config
    const partialConfig: Partial<AiConfig> = { maxThinkingMs: 1000 };
    const strategy2 = createAiStrategy('trigger', partialConfig as AiConfig);
    expect(strategy2).toBeInstanceOf(TriggerBot);
  });

  it('should validate strategy names are strings', () => {
    const strategies = getAvailableStrategies();
    strategies.forEach((strategy) => {
      expect(typeof strategy).toBe('string');
      expect(strategy.length).toBeGreaterThan(0);
    });
  });

  it('should ensure all strategies have valid info', () => {
    const strategies = getAvailableStrategies();
    strategies.forEach((strategyName) => {
      const info = getStrategyInfo(strategyName);
      expect(info).toBeDefined();
      expect(info.description).toBeDefined();
      expect(typeof info.description).toBe('string');
      expect(info.difficulty).toBeDefined();
      expect(['easy', 'medium', 'hard']).toContain(info.difficulty);
    });
  });

  it('should create instances that implement AiStrategy interface', () => {
    const strategies = getAvailableStrategies();
    strategies.forEach((strategyName) => {
      const strategy = createAiStrategy(strategyName);
      expect(strategy.name).toBe(strategyName);
      expect(typeof strategy.decideMove).toBe('function');
    });
  });
});
