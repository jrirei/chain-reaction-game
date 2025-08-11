/**
 * AI Configuration Manager
 *
 * Manages AI configuration settings, profiles, and presets.
 * Provides a centralized way to configure AI behavior across the game.
 */

import type { AiStrategyName } from './types';
import { AI_THINKING_TIMES, DIFFICULTY_LEVELS } from './constants';

// Global AI Configuration Interface
export interface AiGlobalConfig {
  // Performance settings
  enableAnimationsDuringAiTurn: boolean;
  showAiThinkingIndicator: boolean;
  enableAiMovePreview: boolean;

  // Timeout settings
  globalMoveTimeoutMs: number;
  enableGracefulTimeout: boolean;

  // Debug and development
  enableAiDebugMode: boolean;
  logAiDecisions: boolean;
  enablePerformanceMetrics: boolean;
}

// AI Player Profile for different game modes
export interface AiPlayerProfile {
  name: string;
  strategy: AiStrategyName;
  thinkingTimeMs: number;
  displayName: string;
  description: string;
  avatar?: string;
}

// Default global configuration
export const DEFAULT_AI_CONFIG: AiGlobalConfig = {
  // UI and UX settings
  enableAnimationsDuringAiTurn: true, // Keep animations for better UX
  showAiThinkingIndicator: true, // Show "AI is thinking..." indicator
  enableAiMovePreview: false, // Don't preview AI moves (spoilers)

  // Performance and timeout settings
  globalMoveTimeoutMs: 60000, // 1 minute maximum per move
  enableGracefulTimeout: true, // Allow graceful fallback on timeout

  // Debug settings (disabled in production)
  enableAiDebugMode: false, // Enable debug logging
  logAiDecisions: false, // Log AI decision processes
  enablePerformanceMetrics: false, // Track AI performance metrics
};

// Predefined AI player profiles for quick setup
export const AI_PLAYER_PROFILES: Record<string, AiPlayerProfile> = {
  // Beginner-friendly profiles
  rookie: {
    name: 'rookie',
    strategy: 'random',
    thinkingTimeMs: AI_THINKING_TIMES.FAST,
    displayName: 'Rookie Bot',
    description: 'Perfect for beginners - makes random moves quickly',
  },

  // Balanced profiles
  balanced: {
    name: 'balanced',
    strategy: 'default',
    thinkingTimeMs: AI_THINKING_TIMES.NORMAL,
    displayName: 'Balanced Bot',
    description: 'Well-rounded strategic play with moderate thinking time',
  },

  // Aggressive profiles
  explosive: {
    name: 'explosive',
    strategy: 'trigger',
    thinkingTimeMs: AI_THINKING_TIMES.NORMAL,
    displayName: 'Explosive Bot',
    description: 'Aggressive player focused on chain reactions and drama',
  },

  // Advanced profiles
  strategic: {
    name: 'strategic',
    strategy: 'monteCarlo',
    thinkingTimeMs: AI_THINKING_TIMES.MEDIUM,
    displayName: 'Strategic Bot',
    description: 'Advanced AI using tree search for optimal play',
  },

  // Tournament/Expert profiles
  master: {
    name: 'master',
    strategy: 'monteCarlo',
    thinkingTimeMs: AI_THINKING_TIMES.SLOW,
    displayName: 'Master Bot',
    description: 'Maximum strength AI for serious competition',
  },

  // Speed profiles for quick games
  lightning: {
    name: 'lightning',
    strategy: 'trigger',
    thinkingTimeMs: AI_THINKING_TIMES.VERY_FAST,
    displayName: 'Lightning Bot',
    description: 'Fast explosive play for quick games',
  },
};

// Configuration management functions
export class AiConfigManager {
  private static instance: AiConfigManager;
  private config: AiGlobalConfig;

  private constructor() {
    this.config = { ...DEFAULT_AI_CONFIG };
  }

  static getInstance(): AiConfigManager {
    if (!AiConfigManager.instance) {
      AiConfigManager.instance = new AiConfigManager();
    }
    return AiConfigManager.instance;
  }

  /**
   * Get current global AI configuration
   */
  getConfig(): AiGlobalConfig {
    return { ...this.config };
  }

  /**
   * Update global AI configuration
   */
  updateConfig(updates: Partial<AiGlobalConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_AI_CONFIG };
  }

  /**
   * Create AI profile from difficulty level
   */
  static createProfileFromDifficulty(
    difficulty: keyof typeof DIFFICULTY_LEVELS
  ): AiPlayerProfile {
    const difficultyConfig = DIFFICULTY_LEVELS[difficulty];

    return {
      name: difficulty.toLowerCase(),
      strategy: difficultyConfig.strategy,
      thinkingTimeMs: difficultyConfig.thinkingTime,
      displayName: `${difficultyConfig.label} Bot`,
      description: difficultyConfig.description,
    };
  }

  /**
   * Get profile by name with fallback
   */
  static getProfile(name: string): AiPlayerProfile {
    return AI_PLAYER_PROFILES[name] || AI_PLAYER_PROFILES.balanced;
  }

  /**
   * Get all available profile names
   */
  static getAvailableProfiles(): string[] {
    return Object.keys(AI_PLAYER_PROFILES);
  }

  /**
   * Validate AI configuration
   */
  static validateConfig(config: Partial<AiGlobalConfig>): string[] {
    const errors: string[] = [];

    if (config.globalMoveTimeoutMs && config.globalMoveTimeoutMs < 1000) {
      errors.push('Global move timeout must be at least 1000ms');
    }

    if (config.globalMoveTimeoutMs && config.globalMoveTimeoutMs > 300000) {
      errors.push('Global move timeout cannot exceed 5 minutes');
    }

    return errors;
  }
}

// Convenience functions
export const getAiConfig = () => AiConfigManager.getInstance().getConfig();
export const updateAiConfig = (updates: Partial<AiGlobalConfig>) =>
  AiConfigManager.getInstance().updateConfig(updates);

// Export default instance for immediate use
export const aiConfigManager = AiConfigManager.getInstance();
