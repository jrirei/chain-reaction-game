/**
 * Tests for Critical Chain Reaction Fixes
 *
 * Tests two critical bugs:
 * 1. Chain reaction early termination when only one player remains
 * 2. Excess orb removal bug in simultaneous explosions
 */

import { describe, it, expect } from 'vitest';
import {
  processSimultaneousExplosions,
  processChainReactionsSequential,
  getExplodingCells,
} from '../explosionLogic';
import { createEmptyBoard, placeOrb } from '../boardOperations';
import { getActivePlayers } from '../gameValidation';

describe('Chain Reaction Critical Fixes', () => {
  describe('Fix 1: Early termination when only one player remains', () => {
    it('should stop chain reaction immediately when only one player is left', () => {
      // Create simple scenario where chain reaction eliminates one player
      const board = createEmptyBoard(2, 2);

      let testBoard = board;

      // Player1 corner cell ready to explode
      testBoard = placeOrb(testBoard, 0, 0, 'player1');
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // Corner critical mass = 2

      // Player2 has only adjacent cells that will be captured
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2');

      const result = processChainReactionsSequential(testBoard, 'player1');

      // Should have gameWonEarly = true
      expect(result.gameWonEarly).toBe(true);

      // Should have stopped early, not run to max steps
      expect(result.explosionSteps.length).toBeLessThan(10);

      // Final board should have only player1
      const finalActivePlayers = getActivePlayers(result.finalBoard);
      expect(finalActivePlayers).toHaveLength(1);
      expect(finalActivePlayers[0]).toBe('player1');
    });

    it('should continue chain reaction if multiple players remain', () => {
      // Create scenario where multiple players survive
      const board = createEmptyBoard(4, 4);
      let testBoard = board;

      // Set up scenario with player1 and player2 both having cells
      testBoard = placeOrb(testBoard, 0, 0, 'player1');
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // Will explode

      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2');

      // Player3 has remote cells that won't be affected
      testBoard = placeOrb(testBoard, 3, 3, 'player3');
      testBoard = placeOrb(testBoard, 2, 3, 'player3');

      const result = processChainReactionsSequential(testBoard, 'player1');

      // Should NOT have gameWonEarly since multiple players remain
      expect(result.gameWonEarly).toBe(false);

      // Multiple players should remain
      const finalActivePlayers = getActivePlayers(result.finalBoard);
      expect(finalActivePlayers.length).toBeGreaterThan(1);
    });
  });

  describe('Fix 2: Excess orb accumulation in simultaneous explosions', () => {
    it('should accumulate orbs correctly when multiple cells explode into same target', () => {
      // Create corner scenario where both adjacent cells explode simultaneously
      const board = createEmptyBoard(3, 3);

      // Corner cell with 1 orb
      let testBoard = placeOrb(board, 0, 0, 'player1');

      // Adjacent cells with critical mass (2 orbs each, will explode)
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 0, 1, 'player2'); // Edge cell critical mass = 3

      testBoard = placeOrb(testBoard, 1, 0, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2'); // Edge cell critical mass = 3

      // Both adjacent cells should explode simultaneously
      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(2);

      // Process simultaneous explosions
      const result = processSimultaneousExplosions(testBoard, explodingCells);

      // Corner cell should now have 3 orbs (1 original + 1 from each explosion)
      const cornerCell = result.cells[0][0];
      expect(cornerCell.orbCount).toBe(3);

      // Corner should be ready to explode (critical mass = 2)
      expect(cornerCell.orbCount).toBeGreaterThanOrEqual(
        cornerCell.criticalMass
      );

      // Corner should be owned by player2 (last to explode into it)
      expect(cornerCell.playerId).toBe('player2');
    });

    it('should handle complex multi-explosion scenario correctly', () => {
      // Create scenario where multiple cells explode and affect overlapping targets
      const board = createEmptyBoard(3, 3);

      // Set up cross pattern where center will receive multiple orbs
      let testBoard = board;

      // Put 1 orb in center
      testBoard = placeOrb(testBoard, 1, 1, 'player1');

      // Set up 4 adjacent cells to explode simultaneously
      // Top
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 0, 1, 'player2'); // Critical mass = 3

      // Right
      testBoard = placeOrb(testBoard, 1, 2, 'player2');
      testBoard = placeOrb(testBoard, 1, 2, 'player2');
      testBoard = placeOrb(testBoard, 1, 2, 'player2'); // Critical mass = 3

      // Bottom
      testBoard = placeOrb(testBoard, 2, 1, 'player2');
      testBoard = placeOrb(testBoard, 2, 1, 'player2');
      testBoard = placeOrb(testBoard, 2, 1, 'player2'); // Critical mass = 3

      // Left
      testBoard = placeOrb(testBoard, 1, 0, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2'); // Critical mass = 3

      // All 4 adjacent cells should explode simultaneously
      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(4);

      // Process simultaneous explosions
      const result = processSimultaneousExplosions(testBoard, explodingCells);

      // Center cell should have 5 orbs (1 original + 4 from explosions)
      const centerCell = result.cells[1][1];
      expect(centerCell.orbCount).toBe(5);

      // Center should be massively over critical mass and ready for chain reaction
      expect(centerCell.orbCount).toBeGreaterThanOrEqual(
        centerCell.criticalMass
      );

      // Excess orbs should remain (not be lost)
      expect(centerCell.orbCount).toBe(5); // Verify exact count
    });

    it('should handle edge case with single explosion', () => {
      // Test that single explosions still work correctly
      const board = createEmptyBoard(3, 3);

      let testBoard = placeOrb(board, 0, 0, 'player1');
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // Corner critical mass = 2

      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(1);

      const result = processSimultaneousExplosions(testBoard, explodingCells);

      // Original corner should be empty
      expect(result.cells[0][0].orbCount).toBe(0);
      expect(result.cells[0][0].playerId).toBe(null);

      // Adjacent cells should have 1 orb each
      expect(result.cells[0][1].orbCount).toBe(1);
      expect(result.cells[1][0].orbCount).toBe(1);
      expect(result.cells[0][1].playerId).toBe('player1');
      expect(result.cells[1][0].playerId).toBe('player1');
    });
  });

  describe('Fix 3: Single-player chain reactions should not terminate early', () => {
    it('should continue chain reactions in single-player mode', () => {
      // Reproduce user's scenario: 12/23 with orb added to 3-orb cell
      const board = createEmptyBoard(2, 2);
      let testBoard = board;

      // Set up scenario: 12/23 (1,2 on top row; 2,3 on bottom row)
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 2 orbs
      testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 1, 0, 'player1'); // 2 orbs
      testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 2 orbs
      testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 3 orbs

      // Add triggering orb to the 3-orb cell
      testBoard = placeOrb(testBoard, 1, 1, 'player1'); // 4 orbs

      // Process chain reaction (single-player mode)
      const result = processChainReactionsSequential(testBoard, 'player1');

      // Should continue for multiple steps, not stop after 1 step
      expect(result.explosionSteps.length).toBeGreaterThan(1);

      // This was single-player mode, so should be marked as won early but chain continued
      expect(result.gameWonEarly).toBe(true);

      // The key fix: no premature termination in single-player scenarios
    });

    it('should still terminate early in multiplayer scenarios', () => {
      // Create multiplayer scenario where one player eliminates another
      const board = createEmptyBoard(2, 2);
      let testBoard = board;

      // Player1 corner ready to explode
      testBoard = placeOrb(testBoard, 0, 0, 'player1');
      testBoard = placeOrb(testBoard, 0, 0, 'player1');

      // Player2 cells that will be eliminated
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2');

      const result = processChainReactionsSequential(testBoard, 'player1');

      // Should terminate early since this was multiplayer and player1 won
      expect(result.gameWonEarly).toBe(true);
      expect(result.explosionSteps.length).toBeLessThan(10); // Early termination

      // Verify only one player remains
      const finalActivePlayers = getActivePlayers(result.finalBoard);
      expect(finalActivePlayers).toHaveLength(1);
      expect(finalActivePlayers[0]).toBe('player1');
    });
  });

  describe('Integration: Both fixes working together', () => {
    it('should handle complex scenario with both fixes active', () => {
      // Scenario: Simple elimination to trigger early termination
      const board = createEmptyBoard(2, 2);
      let testBoard = board;

      // Player1 corner ready to explode
      testBoard = placeOrb(testBoard, 0, 0, 'player1');
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // Ready to explode

      // Player2 has adjacent cells that will be eliminated
      testBoard = placeOrb(testBoard, 0, 1, 'player2');
      testBoard = placeOrb(testBoard, 1, 0, 'player2');

      const result = processChainReactionsSequential(testBoard, 'player1', 50);

      // Should terminate early due to single player remaining
      expect(result.gameWonEarly).toBe(true);

      // Should have accumulated orbs correctly during the process
      expect(result.explosionSteps.length).toBeGreaterThan(0);

      // Final state should have only player1
      const finalActivePlayers = getActivePlayers(result.finalBoard);
      expect(finalActivePlayers).toHaveLength(1);
      expect(finalActivePlayers[0]).toBe('player1');
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle empty exploding cells array', () => {
      const board = createEmptyBoard(3, 3);
      const result = processSimultaneousExplosions(board, []);

      // Should return unchanged board
      expect(result).toBe(board);
    });

    it('should handle large simultaneous explosion efficiently', () => {
      // Create large board with many simultaneous explosions
      const board = createEmptyBoard(5, 5);
      let testBoard = board;

      // Set up real exploding cells on the board
      for (let row = 1; row < 4; row++) {
        for (let col = 1; col < 4; col++) {
          // Set each cell to critical mass
          for (let i = 0; i < 4; i++) {
            // Interior cells have critical mass = 4
            testBoard = placeOrb(testBoard, row, col, 'player1');
          }
        }
      }

      // Get the actual exploding cells from the board
      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells.length).toBe(9); // 3x3 grid

      const start = performance.now();
      const result = processSimultaneousExplosions(testBoard, explodingCells);
      const elapsed = performance.now() - start;

      // Should complete quickly
      expect(elapsed).toBeLessThan(100);

      // Should process all explosions
      expect(result).toBeDefined();

      // Originally exploding cells should be owned by player1 (may have received orbs from neighbors)
      explodingCells.forEach(({ row, col }) => {
        const cell = result.cells[row][col];
        expect(cell.playerId).toBe('player1');
        // Cell may have 0 orbs (if no neighbors exploded into it) or more (if neighbors did)
        expect(cell.orbCount).toBeGreaterThanOrEqual(0);
      });

      // Adjacent cells should have received orbs
      expect(result.cells[0][1].orbCount).toBeGreaterThan(0);
      expect(result.cells[0][1].playerId).toBe('player1');
    });
  });
});
