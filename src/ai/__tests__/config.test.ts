/**
 * AI Configuration Test Suite
 * 
 * Tests AI configuration constants, interfaces, and utility functions.
 */

import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_AI_CONFIG,
  AI_PLAYER_PROFILES,
  AiConfigManager,
} from '../config';

describe('AI Config Module', () => {
  describe('DEFAULT_AI_CONFIG', () => {
    it('should have valid default configuration', () => {
      expect(DEFAULT_AI_CONFIG).toBeDefined();
      expect(typeof DEFAULT_AI_CONFIG.enableAnimationsDuringAiTurn).toBe('boolean');
      expect(typeof DEFAULT_AI_CONFIG.showAiThinkingIndicator).toBe('boolean');
      expect(typeof DEFAULT_AI_CONFIG.enableAiMovePreview).toBe('boolean');
      expect(typeof DEFAULT_AI_CONFIG.globalMoveTimeoutMs).toBe('number');
      expect(typeof DEFAULT_AI_CONFIG.enableGracefulTimeout).toBe('boolean');
      expect(typeof DEFAULT_AI_CONFIG.enableAiDebugMode).toBe('boolean');
    });

    it('should have reasonable timeout values', () => {
      expect(DEFAULT_AI_CONFIG.globalMoveTimeoutMs).toBeGreaterThan(1000);
      expect(DEFAULT_AI_CONFIG.globalMoveTimeoutMs).toBeLessThanOrEqual(120000);
    });

    it('should have production-safe debug settings', () => {
      // Debug should be disabled by default in production
      expect(DEFAULT_AI_CONFIG.enableAiDebugMode).toBe(false);
      expect(DEFAULT_AI_CONFIG.logAiDecisions).toBe(false);
    });
  });

  describe('AI_PLAYER_PROFILES', () => {
    it('should have predefined profiles', () => {
      expect(AI_PLAYER_PROFILES).toBeDefined();
      expect(Object.keys(AI_PLAYER_PROFILES).length).toBeGreaterThan(0);
    });

    it('should have rookie profile', () => {
      expect(AI_PLAYER_PROFILES.rookie).toBeDefined();
      expect(AI_PLAYER_PROFILES.rookie.strategy).toBe('random');
      expect(AI_PLAYER_PROFILES.rookie.displayName).toBeTruthy();
      expect(AI_PLAYER_PROFILES.rookie.description).toBeTruthy();
    });

    it('should have balanced profile', () => {
      expect(AI_PLAYER_PROFILES.balanced).toBeDefined();
      expect(AI_PLAYER_PROFILES.balanced.strategy).toBe('default');
      expect(AI_PLAYER_PROFILES.balanced.displayName).toBeTruthy();
    });

    it('should have explosive profile', () => {
      expect(AI_PLAYER_PROFILES.explosive).toBeDefined();
      expect(AI_PLAYER_PROFILES.explosive.strategy).toBe('trigger');
      expect(AI_PLAYER_PROFILES.explosive.displayName).toBeTruthy();
    });

    it('should have strategic profile', () => {
      expect(AI_PLAYER_PROFILES.strategic).toBeDefined();
      expect(AI_PLAYER_PROFILES.strategic.strategy).toBe('monteCarlo');
      expect(AI_PLAYER_PROFILES.strategic.displayName).toBeTruthy();
    });

    it('should have valid thinking times', () => {
      Object.values(AI_PLAYER_PROFILES).forEach(profile => {
        expect(profile.thinkingTimeMs).toBeGreaterThan(0);
        expect(profile.thinkingTimeMs).toBeLessThanOrEqual(30000);
      });
    });

    it('should have valid strategy names', () => {
      const validStrategies = ['random', 'default', 'trigger', 'monteCarlo'];
      
      Object.values(AI_PLAYER_PROFILES).forEach(profile => {
        expect(validStrategies).toContain(profile.strategy);
      });
    });

    it('should have unique profile names', () => {
      const names = Object.values(AI_PLAYER_PROFILES).map(p => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have descriptive display names', () => {
      Object.values(AI_PLAYER_PROFILES).forEach(profile => {
        expect(profile.displayName).toBeTruthy();
        expect(profile.displayName.length).toBeGreaterThan(5);
        expect(profile.description).toBeTruthy();
        expect(profile.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Profile Validation', () => {
    it('should have consistent profile structure', () => {
      Object.entries(AI_PLAYER_PROFILES).forEach(([key, profile]) => {
        expect(profile.name).toBe(key);
        expect(profile).toHaveProperty('strategy');
        expect(profile).toHaveProperty('thinkingTimeMs');
        expect(profile).toHaveProperty('displayName');
        expect(profile).toHaveProperty('description');
      });
    });

    it('should have difficulty progression in thinking times', () => {
      const profiles = AI_PLAYER_PROFILES;
      
      // Rookie should be fastest
      expect(profiles.rookie.thinkingTimeMs).toBeLessThanOrEqual(profiles.balanced.thinkingTimeMs);
      
      // Strategic should take longer than balanced
      expect(profiles.strategic.thinkingTimeMs).toBeGreaterThanOrEqual(profiles.balanced.thinkingTimeMs);
    });
  });

  describe('Configuration Types', () => {
    it('should export proper TypeScript interfaces', () => {
      // This is a compile-time check - if the imports work, types are valid
      const config = DEFAULT_AI_CONFIG;
      const profile = AI_PLAYER_PROFILES.rookie;
      
      expect(config).toBeDefined();
      expect(profile).toBeDefined();
    });

    it('should have extensible configuration structure', () => {
      // Verify the config can be extended/modified
      const customConfig = {
        ...DEFAULT_AI_CONFIG,
        enableAiDebugMode: true,
        customSetting: 'test',
      };
      
      expect(customConfig.enableAiDebugMode).toBe(true);
      expect(customConfig.globalMoveTimeoutMs).toBe(DEFAULT_AI_CONFIG.globalMoveTimeoutMs);
    });
  });

  describe('AiConfigManager', () => {
    it('should manage singleton instance', () => {
      const instance1 = AiConfigManager.getInstance();
      const instance2 = AiConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should validate configuration', () => {
      const validConfig = { globalMoveTimeoutMs: 5000 };
      const invalidConfig1 = { globalMoveTimeoutMs: 500 }; // Too low
      const invalidConfig2 = { globalMoveTimeoutMs: 400000 }; // Too high
      
      expect(AiConfigManager.validateConfig(validConfig)).toEqual([]);
      expect(AiConfigManager.validateConfig(invalidConfig1)).toHaveLength(1);
      expect(AiConfigManager.validateConfig(invalidConfig2)).toHaveLength(1);
    });

    it('should update and reset configuration', () => {
      const manager = AiConfigManager.getInstance();
      
      const original = manager.getConfig();
      manager.updateConfig({ enableAiDebugMode: true });
      
      const updated = manager.getConfig();
      expect(updated.enableAiDebugMode).toBe(true);
      
      manager.resetToDefaults();
      const reset = manager.getConfig();
      expect(reset.enableAiDebugMode).toBe(original.enableAiDebugMode);
    });

    it('should get available profiles', () => {
      const profiles = AiConfigManager.getAvailableProfiles();
      
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should get profile with fallback', () => {
      const existingProfile = AiConfigManager.getProfile('rookie');
      const nonExistentProfile = AiConfigManager.getProfile('nonexistent');
      
      expect(existingProfile.name).toBe('rookie');
      expect(nonExistentProfile.name).toBe('balanced'); // fallback
    });
  });
});