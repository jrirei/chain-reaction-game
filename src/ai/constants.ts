/**
 * AI Configuration Constants
 *
 * Centralized configuration values for all AI strategies and bot behaviors.
 * These constants control AI timing, difficulty levels, and performance characteristics.
 */

// Default thinking times for AI strategies (milliseconds)
export const AI_THINKING_TIMES = {
  // Fast thinking times for quick gameplay
  INSTANT: 100, // Near-instant for testing
  VERY_FAST: 500, // 0.5 seconds
  FAST: 1000, // 1 second

  // Medium thinking times for balanced gameplay
  NORMAL: 3000, // 3 seconds (default for most bots)
  MEDIUM: 5000, // 5 seconds (default for Monte Carlo)

  // Slow thinking times for maximum AI strength
  SLOW: 10000, // 10 seconds
  VERY_SLOW: 15000, // 15 seconds
  MAXIMUM: 30000, // 30 seconds (tournament mode)
} as const;

// Monte Carlo Tree Search (MCTS) Configuration
export const MCTS_CONFIG = {
  // Default maximum thinking time
  DEFAULT_MAX_THINKING_MS: AI_THINKING_TIMES.MEDIUM,

  // Tree search parameters
  UCB1_EXPLORATION: 1.414, // √2 - standard UCB1 exploration parameter
  MIN_SIMULATIONS: 10, // Minimum simulations before using tree policy
  MAX_TREE_DEPTH: 50, // Maximum tree depth to prevent infinite recursion

  // Performance tuning
  SIMULATIONS_PER_MS: 2, // Target simulations per millisecond
  BATCH_SIZE: 100, // Process simulations in batches
} as const;

// Trigger Bot Configuration (explosion-focused strategy)
export const TRIGGER_BOT_CONFIG = {
  // Scoring weights for move evaluation
  CHAIN_REACTION_WEIGHT: 100, // Heavy weight for chain reactions
  BOARD_ADVANTAGE_WEIGHT: 10, // Weight for board control
  CRITICAL_MASS_BONUS: 100, // Bonus for moves one away from explosion
  CRITICAL_MASS_WEIGHT: 50, // Weight for building toward critical mass

  // Position value bonuses
  CORNER_BONUS: 30, // Corners are easier to explode
  EDGE_BONUS: 20, // Edges are moderately easy
  CENTER_BONUS: 10, // Centers require more orbs

  // Strategy bonuses
  BUILD_ON_OWN_BONUS: 20, // Prefer building on existing positions
  MAX_THREAT_VALUE: 15, // Maximum threat value per adjacent enemy
} as const;

// Default Bot Configuration (balanced strategy)
export const DEFAULT_BOT_CONFIG = {
  // Scoring weights for move evaluation
  CRITICAL_MASS_WEIGHT: 10, // Moderate weight for critical mass progress
  POSITION_WEIGHT: 5, // Light weight for position value
  BOARD_ADVANTAGE_WEIGHT: 3, // Light weight for board control

  // Position value bonuses (more conservative than Trigger Bot)
  CORNER_BONUS: 15, // Moderate corner preference
  EDGE_BONUS: 10, // Moderate edge preference
  CENTER_BONUS: 5, // Light center preference

  // Risk management
  MAX_RISK_THRESHOLD: 0.7, // Maximum acceptable risk level (0.0-1.0)
  SAFETY_MARGIN: 0.2, // Safety margin for risky moves
} as const;

// Random Bot Configuration
export const RANDOM_BOT_CONFIG = {
  // Seeded RNG support for testing
  USE_SEEDED_RNG: false, // Use deterministic RNG for testing
  DEFAULT_SEED: 12345, // Default seed value

  // Performance optimization
  ENABLE_FAST_SELECTION: true, // Use optimized random selection
} as const;

// AI Performance and Limits
export const AI_PERFORMANCE = {
  // Simulation limits to prevent infinite loops
  MAX_SIMULATION_STEPS: 100, // Maximum explosion steps per simulation
  MAX_SIMULATION_TIME_MS: 1000, // Maximum time per simulation

  // Memory limits
  MAX_TREE_NODES: 10000, // Maximum MCTS tree nodes
  MAX_CACHE_SIZE: 1000, // Maximum cached positions

  // Timeout handling
  MOVE_TIMEOUT_MS: 60000, // 1 minute maximum per move
  GRACE_PERIOD_MS: 1000, // Grace period before timeout

  // MCTS Iteration Limits (shared across all MCTS-based bots)
  MAX_MCTS_ITERATIONS: 5000000, // 5M iterations limit for Monte Carlo bots
} as const;

// Difficulty Level Mappings
export const DIFFICULTY_LEVELS = {
  BEGINNER: {
    label: 'Beginner',
    description: 'Easy opponent for learning',
    thinkingTime: AI_THINKING_TIMES.FAST,
    strategy: 'random' as const,
  },
  EASY: {
    label: 'Easy',
    description: 'Balanced play with quick decisions',
    thinkingTime: AI_THINKING_TIMES.NORMAL,
    strategy: 'default' as const,
  },
  MEDIUM: {
    label: 'Medium',
    description: 'Aggressive explosive gameplay',
    thinkingTime: AI_THINKING_TIMES.NORMAL,
    strategy: 'trigger' as const,
  },
  HARD: {
    label: 'Hard',
    description: 'Advanced tree search AI',
    thinkingTime: AI_THINKING_TIMES.MEDIUM,
    strategy: 'monteCarlo' as const,
  },
  MASTER: {
    label: 'Master',
    description: 'Maximum strength Monte Carlo',
    thinkingTime: AI_THINKING_TIMES.VERY_SLOW,
    strategy: 'monteCarlo' as const,
  },
} as const;

// AI Strategy Display Information
export const STRATEGY_DISPLAY = {
  random: {
    name: 'Random Bot',
    shortName: 'Random',
    icon: '🎲',
    color: '#9CA3AF', // Gray
  },
  default: {
    name: 'Default Bot',
    shortName: 'Balanced',
    icon: '⚖️',
    color: '#3B82F6', // Blue
  },
  trigger: {
    name: 'Trigger Bot',
    shortName: 'Explosive',
    icon: '💥',
    color: '#EF4444', // Red
  },
  monteCarlo: {
    name: 'Monte Carlo Bot',
    shortName: 'Strategic',
    icon: '🧠',
    color: '#8B5CF6', // Purple
  },
  fred: {
    name: 'Fred Bot',
    shortName: 'Fred',
    icon: '🎭',
    color: '#10B981', // Emerald
  },
} as const;

// Available thinking time options for UI
export const THINKING_TIME_OPTIONS = [
  {
    value: AI_THINKING_TIMES.INSTANT,
    label: 'Instant',
    description: 'No delay',
  },
  {
    value: AI_THINKING_TIMES.VERY_FAST,
    label: '0.5s',
    description: 'Very fast',
  },
  { value: AI_THINKING_TIMES.FAST, label: '1s', description: 'Fast' },
  { value: AI_THINKING_TIMES.NORMAL, label: '3s', description: 'Normal' },
  {
    value: AI_THINKING_TIMES.MEDIUM,
    label: '5s',
    description: 'Default',
  },
  { value: AI_THINKING_TIMES.SLOW, label: '10s', description: 'Slow' },
  {
    value: AI_THINKING_TIMES.VERY_SLOW,
    label: '15s',
    description: 'Very slow',
  },
  {
    value: AI_THINKING_TIMES.MAXIMUM,
    label: '30s',
    description: 'Maximum',
  },
] as const;

// Type exports for TypeScript
export type AiThinkingTime = keyof typeof AI_THINKING_TIMES;
export type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;
export type StrategyDisplayInfo = typeof STRATEGY_DISPLAY;
