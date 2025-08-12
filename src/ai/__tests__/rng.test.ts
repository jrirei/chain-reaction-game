/**
 * RNG Test Suite
 * 
 * Tests for random number generation utilities and seeding functionality.
 */

import { describe, it, expect } from 'vitest';
import { createSeededRng, createFixedRng, shuffle, randomChoice } from '../rng';

describe('RNG Module', () => {
  describe('createSeededRng', () => {
    it('should create seeded RNG with deterministic output', () => {
      const rng1 = createSeededRng(12345);
      const rng2 = createSeededRng(12345);
      
      // Same seed should produce same sequence
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    it('should produce different sequences for different seeds', () => {
      const rng1 = createSeededRng(1);
      const rng2 = createSeededRng(2);
      
      const values1 = [rng1(), rng1(), rng1()];
      const values2 = [rng2(), rng2(), rng2()];
      
      expect(values1).not.toEqual(values2);
    });
  });

  describe('shuffle', () => {
    it('should shuffle array elements', () => {
      const original = [1, 2, 3, 4, 5];
      const rng = createSeededRng(42);
      
      const shuffled = shuffle([...original], rng);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should handle empty array', () => {
      const rng = createSeededRng(42);
      const result = shuffle([], rng);
      
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const rng = createSeededRng(42);
      const result = shuffle([1], rng);
      
      expect(result).toEqual([1]);
    });
  });

  describe('randomChoice', () => {
    it('should pick random element from array', () => {
      const array = [1, 2, 3, 4, 5];
      const rng = createSeededRng(42);
      
      const choice = randomChoice(array, rng);
      
      expect(array).toContain(choice);
    });

    it('should throw error for empty array', () => {
      const rng = createSeededRng(42);
      
      expect(() => randomChoice([], rng)).toThrow('Cannot pick from empty array');
    });

    it('should return single element for single-element array', () => {
      const rng = createSeededRng(42);
      const result = randomChoice([42], rng);
      
      expect(result).toBe(42);
    });
  });

  describe('createFixedRng', () => {
    it('should cycle through provided values', () => {
      const values = [0.1, 0.5, 0.9];
      const rng = createFixedRng(values);
      
      expect(rng()).toBe(0.1);
      expect(rng()).toBe(0.5);
      expect(rng()).toBe(0.9);
      expect(rng()).toBe(0.1); // Should cycle back
    });

    it('should handle single value', () => {
      const rng = createFixedRng([0.42]);
      
      expect(rng()).toBe(0.42);
      expect(rng()).toBe(0.42);
    });
  });
});