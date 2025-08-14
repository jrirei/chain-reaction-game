/**
 * Environment Detection and Abstraction Utilities
 *
 * Provides framework-independent ways to detect and work with
 * different runtime environments (browser, Node.js, etc.)
 *
 * @fileoverview Environment-agnostic utilities
 */

/**
 * Environment types
 */
export type Environment = 'browser' | 'node' | 'worker' | 'unknown';

/**
 * Detect current runtime environment
 */
export function detectEnvironment(): Environment {
  // Check for browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'browser';
  }

  // Check for Node.js environment
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    return 'node';
  }

  // Check for Web Worker environment
  if (
    typeof self !== 'undefined' &&
    typeof (self as unknown as { importScripts?: unknown }).importScripts ===
      'function'
  ) {
    return 'worker';
  }

  return 'unknown';
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return detectEnvironment() === 'browser';
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return detectEnvironment() === 'node';
}

/**
 * Check if running in Web Worker environment
 */
export function isWorker(): boolean {
  return detectEnvironment() === 'worker';
}

/**
 * Abstract timing interface
 */
export interface TimingProvider {
  now(): number;
  setTimeout(callback: () => void, delay: number): number | NodeJS.Timeout;
  clearTimeout(id: number | NodeJS.Timeout): void;
}

/**
 * Get appropriate timing provider for current environment
 */
export function getTimingProvider(): TimingProvider {
  const env = detectEnvironment();

  switch (env) {
    case 'browser':
    case 'worker':
      return {
        now: () => performance.now(),
        setTimeout: (callback, delay) => window.setTimeout(callback, delay),
        clearTimeout: (id) => window.clearTimeout(id as number),
      };

    case 'node':
      return {
        now: () => {
          const [seconds, nanoseconds] = process.hrtime();
          return seconds * 1000 + nanoseconds / 1000000;
        },
        setTimeout: (callback, delay) => setTimeout(callback, delay),
        clearTimeout: (id) => clearTimeout(id),
      };

    default:
      // Fallback implementation
      return {
        now: () => Date.now(),
        setTimeout: (callback, delay) => setTimeout(callback, delay),
        clearTimeout: (id) => clearTimeout(id as NodeJS.Timeout),
      };
  }
}

/**
 * Abstract console interface
 */
export interface LogProvider {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

/**
 * Get appropriate logging provider for current environment
 */
export function getLogProvider(): LogProvider {
  // Most environments have console available
  if (typeof console !== 'undefined') {
    return {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };
  }

  // Fallback for environments without console
  return {
    log: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  };
}

/**
 * Abstract random number interface
 */
export interface RandomProvider {
  random(): number;
  randomInt(min: number, max: number): number;
  randomFloat(min: number, max: number): number;
}

/**
 * Get appropriate random number provider
 */
export function getRandomProvider(): RandomProvider {
  return {
    random: () => Math.random(),
    randomInt: (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min,
    randomFloat: (min: number, max: number) =>
      Math.random() * (max - min) + min,
  };
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  hasAudioContext: boolean;
  hasHTMLAudio: boolean;
  hasWebWorkers: boolean;
  hasLocalStorage: boolean;
  hasFileSystem: boolean;
  supportsOffscreenCanvas: boolean;
}

/**
 * Get capabilities for current environment
 */
export function getEnvironmentCapabilities(): EnvironmentConfig {
  const env = detectEnvironment();

  if (env === 'browser') {
    return {
      hasAudioContext: !!(
        typeof window !== 'undefined' &&
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext?: unknown })
            .webkitAudioContext)
      ),
      hasHTMLAudio: typeof Audio !== 'undefined',
      hasWebWorkers: typeof Worker !== 'undefined',
      hasLocalStorage: typeof localStorage !== 'undefined',
      hasFileSystem: false,
      supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    };
  }

  if (env === 'node') {
    return {
      hasAudioContext: false,
      hasHTMLAudio: false,
      hasWebWorkers: false,
      hasLocalStorage: false,
      hasFileSystem: true,
      supportsOffscreenCanvas: false,
    };
  }

  // Default for unknown environments
  return {
    hasAudioContext: false,
    hasHTMLAudio: false,
    hasWebWorkers: false,
    hasLocalStorage: false,
    hasFileSystem: false,
    supportsOffscreenCanvas: false,
  };
}

/**
 * Create environment-safe global getter
 */
export function safeGlobal<T>(path: string, fallback: T): T {
  try {
    const env = detectEnvironment();

    if (env === 'browser' && typeof window !== 'undefined') {
      return (window as Record<string, unknown>)[path] ?? fallback;
    }

    if (env === 'node' && typeof global !== 'undefined') {
      return (global as Record<string, unknown>)[path] ?? fallback;
    }

    if (env === 'worker' && typeof self !== 'undefined') {
      return (self as Record<string, unknown>)[path] ?? fallback;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Environment-safe feature detection
 */
export function hasFeature(feature: string): boolean {
  try {
    const env = detectEnvironment();

    switch (feature) {
      case 'fetch':
        return typeof fetch !== 'undefined';

      case 'localStorage':
        return env === 'browser' && typeof localStorage !== 'undefined';

      case 'sessionStorage':
        return env === 'browser' && typeof sessionStorage !== 'undefined';

      case 'indexedDB':
        return env === 'browser' && typeof indexedDB !== 'undefined';

      case 'webgl':
        if (env !== 'browser') return false;
        try {
          const canvas = document.createElement('canvas');
          return !!(
            canvas.getContext('webgl') ||
            canvas.getContext('experimental-webgl')
          );
        } catch {
          return false;
        }

      case 'webgl2':
        if (env !== 'browser') return false;
        try {
          const canvas = document.createElement('canvas');
          return !!canvas.getContext('webgl2');
        } catch {
          return false;
        }

      default:
        return false;
    }
  } catch {
    return false;
  }
}
