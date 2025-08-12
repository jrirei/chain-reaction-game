/**
 * useAiTurn Hook Test Suite
 * 
 * Tests the AI turn management hook including turn triggering,
 * rate limiting, and integration with game state.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAiTurn } from '../useAiTurn';
import { GameProvider } from '../../context/GameContext';
import type { ReactNode } from 'react';
import type { PlayerConfig } from '../../types/player';
import { GameStatus } from '../../types/game';

// Mock the AI modules
vi.mock('../../ai/botRunner', () => ({
  BotRunner: vi.fn().mockImplementation(() => ({
    playTurn: vi.fn().mockResolvedValue({
      move: { row: 0, col: 0, playerId: 'player1' },
      thinkingMs: 100,
      delayAppliedMs: 400,
      strategyName: 'test-strategy',
    }),
  })),
}));

vi.mock('../../core/engineSimple', () => ({
  GameEngine: vi.fn().mockImplementation(() => ({
    getLegalMoves: vi.fn().mockReturnValue([
      { row: 0, col: 0, playerId: 'player1' },
      { row: 1, col: 1, playerId: 'player1' },
    ]),
  })),
}));

vi.mock('../../ai/registry', () => ({
  createAiStrategy: vi.fn().mockReturnValue({
    name: 'mock-strategy',
    decideMove: vi.fn().mockResolvedValue({ row: 0, col: 0, playerId: 'player1' }),
  }),
}));

vi.mock('../../utils/orbPlacement', () => ({
  executeOrbPlacement: vi.fn().mockResolvedValue({
    success: true,
    actions: [
      { type: 'PLACE_ORB', payload: { row: 0, col: 0, playerId: 'player1' } },
      { type: 'NEXT_TURN' },
    ],
  }),
}));

// Mock GameContext
const mockGameContext = {
  gameState: {
    gameStatus: GameStatus.PLAYING,
    isAnimating: false,
    players: ['player1', 'player2'],
    currentPlayerIndex: 0,
    board: {
      rows: 6,
      cols: 9,
      cells: Array(6).fill(null).map((_, row) =>
        Array(9).fill(null).map((_, col) => ({
          id: `cell-${row}-${col}`,
          row,
          col,
          orbCount: 0,
          playerId: null,
          criticalMass: 2,
          isExploding: false,
          animationDelay: 0,
        }))
      ),
    },
    moveCount: 0,
    settings: {
      enableAnimations: true,
      playerConfigs: [
        { name: 'AI Player', type: 'ai' as const, aiConfig: { strategy: 'default' as const } },
        { name: 'Human Player', type: 'human' as const },
      ],
    },
  },
  currentPlayer: {
    id: 'player1',
    name: 'AI Player',
    type: 'ai' as const,
    aiConfig: { strategy: 'default' as const, maxThinkingMs: 3000 },
    color: '#ff0000',
    isActive: true,
    isEliminated: false,
    orbCount: 0,
    totalMoves: 0,
  },
  dispatch: vi.fn(),
};

vi.mock('../../context/useGameContext', () => ({
  useGameContext: () => mockGameContext,
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: ReactNode }) => {
  return <GameProvider>{children}</GameProvider>;
};

describe('useAiTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isAiTurn).toBe(true); // Current player is AI
      expect(result.current.isExecutingAiTurn).toBe(false);
      expect(typeof result.current.executeAiTurn).toBe('function');
    });

    it('should detect human player correctly', () => {
      // Mock human player
      mockGameContext.currentPlayer = {
        ...mockGameContext.currentPlayer,
        type: 'human',
        aiConfig: undefined,
      };

      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isAiTurn).toBe(false);
    });
  });

  describe('AI Turn Execution', () => {
    it('should execute AI turn for AI player', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      // Trigger AI turn execution
      vi.advanceTimersByTime(1000); // Advance past delay

      await waitFor(() => {
        expect(mockGameContext.dispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'PLACE_ORB' })
        );
      });
    });

    it('should not execute for human player', async () => {
      // Mock human player
      mockGameContext.currentPlayer = {
        ...mockGameContext.currentPlayer,
        type: 'human',
        aiConfig: undefined,
      };

      renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockGameContext.dispatch).not.toHaveBeenCalled();
      });
    });

    it('should not execute when game is not playing', async () => {
      mockGameContext.gameState.gameStatus = GameStatus.SETUP;

      renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockGameContext.dispatch).not.toHaveBeenCalled();
      });
    });

    it('should not execute when animating', async () => {
      mockGameContext.gameState.isAnimating = true;

      renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockGameContext.dispatch).not.toHaveBeenCalled();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should prevent simultaneous AI turn execution', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      // Start first AI turn
      const aiPlayer = mockGameContext.currentPlayer;
      const promise1 = result.current.executeAiTurn(aiPlayer);

      // Try to start second AI turn immediately
      const promise2 = result.current.executeAiTurn(aiPlayer);

      await Promise.all([promise1, promise2]);

      // Should only execute once
      expect(mockGameContext.dispatch).toHaveBeenCalledTimes(2); // PLACE_ORB + NEXT_TURN
    });

    it('should clear execution flag after completion', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isExecutingAiTurn).toBe(false);

      // Execute AI turn
      await result.current.executeAiTurn(mockGameContext.currentPlayer);

      // Flag should be cleared after completion
      expect(result.current.isExecutingAiTurn).toBe(false);
    });

    it('should clear execution flag after error', async () => {
      // Mock error in orb placement
      const { executeOrbPlacement } = await import('../../utils/orbPlacement');
      vi.mocked(executeOrbPlacement).mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      await result.current.executeAiTurn(mockGameContext.currentPlayer);

      // Flag should be cleared even after error
      expect(result.current.isExecutingAiTurn).toBe(false);
    });
  });

  describe('Thinking Time and Clamping', () => {
    it('should clamp thinking time to reasonable bounds', async () => {
      const { createAiStrategy } = await import('../../ai/registry');
      const mockStrategy = vi.mocked(createAiStrategy).mockReturnValue({
        name: 'test-strategy',
        decideMove: vi.fn().mockResolvedValue({ row: 0, col: 0, playerId: 'player1' }),
      });

      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      // Player with extreme thinking time
      const extremePlayer = {
        ...mockGameContext.currentPlayer,
        aiConfig: { strategy: 'default' as const, maxThinkingMs: 50000 }, // 50 seconds
      };

      await result.current.executeAiTurn(extremePlayer);

      const { BotRunner } = await import('../../ai/botRunner');
      const mockBotRunner = vi.mocked(BotRunner).mock.results[0].value;
      
      // Should clamp to 30 seconds max
      expect(mockBotRunner.playTurn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ maxThinkingMs: 30000 })
      );
    });

    it('should handle missing maxThinkingMs', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      const playerWithoutThinkingTime = {
        ...mockGameContext.currentPlayer,
        aiConfig: { strategy: 'default' as const }, // No maxThinkingMs
      };

      await result.current.executeAiTurn(playerWithoutThinkingTime);

      const { BotRunner } = await import('../../ai/botRunner');
      const mockBotRunner = vi.mocked(BotRunner).mock.results[0].value;
      
      // Should default to 3000ms
      expect(mockBotRunner.playTurn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ maxThinkingMs: 3000 })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle strategy creation errors', async () => {
      const { createAiStrategy } = await import('../../ai/registry');
      vi.mocked(createAiStrategy).mockImplementationOnce(() => {
        throw new Error('Strategy creation failed');
      });

      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      // Should not throw, but handle gracefully
      await expect(result.current.executeAiTurn(mockGameContext.currentPlayer)).resolves.not.toThrow();
    });

    it('should handle orb placement errors', async () => {
      const { executeOrbPlacement } = await import('../../utils/orbPlacement');
      vi.mocked(executeOrbPlacement).mockResolvedValueOnce({
        success: false,
        error: 'Invalid move',
      });

      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      await result.current.executeAiTurn(mockGameContext.currentPlayer);

      // Should not dispatch actions when placement fails
      expect(mockGameContext.dispatch).not.toHaveBeenCalled();
    });

    it('should handle non-AI player gracefully', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      const humanPlayer = {
        ...mockGameContext.currentPlayer,
        type: 'human' as const,
        aiConfig: undefined,
      };

      await result.current.executeAiTurn(humanPlayer);

      expect(mockGameContext.dispatch).not.toHaveBeenCalled();
    });

    it('should handle no legal moves gracefully', async () => {
      const { GameEngine } = await import('../../core/engineSimple');
      const mockEngine = vi.mocked(GameEngine).mock.results[0].value;
      vi.mocked(mockEngine.getLegalMoves).mockReturnValueOnce([]);

      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      await result.current.executeAiTurn(mockGameContext.currentPlayer);

      expect(mockGameContext.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('Integration with Game State', () => {
    it('should respond to game state changes', async () => {
      const { rerender } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      // Change game state to trigger different behavior
      mockGameContext.gameState.gameStatus = GameStatus.PAUSED;
      rerender();

      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockGameContext.dispatch).not.toHaveBeenCalled();
      });
    });

    it('should adapt to different AI strategies', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      const monteCarloPlayer = {
        ...mockGameContext.currentPlayer,
        aiConfig: { strategy: 'monteCarlo' as const, maxThinkingMs: 5000 },
      };

      await result.current.executeAiTurn(monteCarloPlayer);

      const { createAiStrategy } = await import('../../ai/registry');
      expect(createAiStrategy).toHaveBeenCalledWith('monteCarlo', monteCarloPlayer.aiConfig);
    });
  });

  describe('Turn Timing', () => {
    it('should respect AI turn delay', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      const startTime = Date.now();
      
      // Advance timers but not enough to trigger
      vi.advanceTimersByTime(400);

      expect(mockGameContext.dispatch).not.toHaveBeenCalled();

      // Now advance enough to trigger
      vi.advanceTimersByTime(600);

      await waitFor(() => {
        expect(mockGameContext.dispatch).toHaveBeenCalled();
      });
    });

    it('should cap delay at 2 seconds for UI responsiveness', async () => {
      const { result } = renderHook(() => useAiTurn(), {
        wrapper: TestWrapper,
      });

      const slowPlayer = {
        ...mockGameContext.currentPlayer,
        aiConfig: { strategy: 'default' as const, maxThinkingMs: 10000 }, // 10 seconds
      };

      mockGameContext.currentPlayer = slowPlayer;
      
      // Should not wait 10 seconds, but cap at 2 seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(mockGameContext.dispatch).toHaveBeenCalled();
      });
    });
  });
});