import { describe, it, expect } from 'vitest';
import {
  createAiStrategy,
  getAvailableStrategies,
  getStrategyInfo,
  isStrategyAvailable,
} from '../registry';
import { DefaultBot } from '../defaultBot';
import { TriggerBot } from '../triggerBot';

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
    expect(triggerInfo.description).toContain('explosion-focused');
    expect(triggerInfo.difficulty).toBe('hard');
  });

  it('should check strategy availability', () => {
    expect(isStrategyAvailable('default')).toBe(true);
    expect(isStrategyAvailable('trigger')).toBe(true);
    expect(isStrategyAvailable('random')).toBe(false);
    expect(isStrategyAvailable('monteCarlo')).toBe(false);
  });

  it('should throw error for unknown strategy info', () => {
    expect(() => getStrategyInfo('unknown' as never)).toThrow(
      'Unknown AI strategy: unknown'
    );
  });
});
