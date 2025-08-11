/**
 * Deterministic random number generator for AI testing
 * Uses mulberry32 algorithm for reproducible results
 */

export function createSeededRng(seed: number): () => number {
  let state = seed;

  return function mulberry32() {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create an RNG that always returns the same sequence
 * Useful for completely deterministic tests
 */
export function createFixedRng(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
}

/**
 * Shuffle an array using provided RNG
 */
export function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Pick a random element from array using provided RNG
 */
export function randomChoice<T>(array: T[], rng: () => number): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array');
  }

  const index = Math.floor(rng() * array.length);
  return array[index];
}
