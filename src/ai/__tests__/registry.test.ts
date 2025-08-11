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

  it('should return all available strategies', () => {
    const strategies = getAvailableStrategies();

    expect(strategies).toContain('default');
    expect(strategies).toContain('trigger');
    expect(strategies).toContain('random');
    expect(strategies).toContain('monteCarlo');
  });

  it('should return strategy info', () => {
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
  });

  it('should check strategy availability', () => {
    expect(isStrategyAvailable('default')).toBe(true);
    expect(isStrategyAvailable('trigger')).toBe(true);
    expect(isStrategyAvailable('random')).toBe(true);
    expect(isStrategyAvailable('monteCarlo')).toBe(true);
  });

  it('should throw error for unknown strategy info', () => {
    expect(() => getStrategyInfo('unknown' as never)).toThrow(
      'Unknown AI strategy: unknown'
    );
  });
});
