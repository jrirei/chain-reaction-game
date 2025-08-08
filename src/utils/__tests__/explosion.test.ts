import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyBoard, placeOrb } from '../boardOperations';
import {
  getExplodingCells,
  processExplosion,
  processChainReactions,
} from '../explosionLogic';
import { getCriticalMass } from '../helpers';
import { executeOrbPlacement } from '../orbPlacement';
import { GameStatus } from '../../types';
import type { GameState } from '../../types';

describe('Cell Explosion Logic', () => {
  let board: ReturnType<typeof createEmptyBoard>;
  let gameState: GameState;

  beforeEach(() => {
    board = createEmptyBoard(6, 9); // Standard 6x9 board
    gameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      gameStartTime: Date.now(),
      gameEndTime: null,
      moveCount: 0,
      isAnimating: false,
      winner: null,
      settings: {
        gridRows: 6,
        gridCols: 9,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
      },
    };
  });

  describe('Critical Mass Detection', () => {
    it('should correctly identify critical mass for different cell types', () => {
      // Corner cell (0,0) should have critical mass of 2
      expect(getCriticalMass(0, 0, 6, 9)).toBe(2);

      // Edge cell (0,1) should have critical mass of 3
      expect(getCriticalMass(0, 1, 6, 9)).toBe(3);

      // Interior cell (1,1) should have critical mass of 4
      expect(getCriticalMass(1, 1, 6, 9)).toBe(4);
    });

    it('should detect cells that have reached critical mass', () => {
      // Place orbs in a corner cell until critical
      let testBoard = placeOrb(board, 0, 0, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 2 orbs - should be critical

      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(1);
      expect(explodingCells[0].row).toBe(0);
      expect(explodingCells[0].col).toBe(0);
      expect(explodingCells[0].orbCount).toBe(2);
    });

    it('should detect edge cells that reach critical mass', () => {
      // Place orbs in an edge cell until critical
      let testBoard = board;
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 2 orbs
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 3 orbs - should be critical

      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(1);
      expect(explodingCells[0].row).toBe(0);
      expect(explodingCells[0].col).toBe(1);
      expect(explodingCells[0].orbCount).toBe(3);
    });

    it('should NOT allow edge cells to have more than 3 orbs without exploding', () => {
      // This test verifies the bug reported by the user
      let testBoard = board;
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 2 orbs
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 3 orbs

      const cell = testBoard.cells[0][1];
      expect(cell.orbCount).toBe(3);
      expect(cell.criticalMass).toBe(3);
      expect(cell.orbCount >= cell.criticalMass).toBe(true);

      // The cell should be detected as exploding
      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(1);
    });

    it('should NOT allow corner cells to have more than 2 orbs without exploding', () => {
      // CRITICAL BUG TEST: Corner cells must explode at exactly 2 orbs
      let testBoard = board;
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 1 orb
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 2 orbs - MUST explode

      const cell = testBoard.cells[0][0];
      expect(cell.orbCount).toBe(2);
      expect(cell.criticalMass).toBe(2);
      expect(cell.orbCount >= cell.criticalMass).toBe(true);

      // The cell should be detected as exploding
      const explodingCells = getExplodingCells(testBoard);
      expect(explodingCells).toHaveLength(1);
      expect(explodingCells[0].row).toBe(0);
      expect(explodingCells[0].col).toBe(0);
    });
  });

  describe('Explosion Processing', () => {
    it('should process explosion correctly for corner cell', () => {
      // Set up a corner cell with critical mass
      let testBoard = placeOrb(board, 0, 0, 'player1');
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // 2 orbs - critical

      const explodedBoard = processExplosion(testBoard, 0, 0);

      // Original cell should be empty
      expect(explodedBoard.cells[0][0].orbCount).toBe(0);
      expect(explodedBoard.cells[0][0].playerId).toBe(null);

      // Adjacent cells should have gained orbs
      expect(explodedBoard.cells[0][1].orbCount).toBe(1); // right
      expect(explodedBoard.cells[1][0].orbCount).toBe(1); // down
      expect(explodedBoard.cells[0][1].playerId).toBe('player1');
      expect(explodedBoard.cells[1][0].playerId).toBe('player1');
    });

    it('should process explosion correctly for edge cell', () => {
      // Set up an edge cell with critical mass
      let testBoard = placeOrb(board, 0, 1, 'player1');
      testBoard = placeOrb(testBoard, 0, 1, 'player1');
      testBoard = placeOrb(testBoard, 0, 1, 'player1'); // 3 orbs - critical

      const explodedBoard = processExplosion(testBoard, 0, 1);

      // Original cell should be empty
      expect(explodedBoard.cells[0][1].orbCount).toBe(0);
      expect(explodedBoard.cells[0][1].playerId).toBe(null);

      // Adjacent cells should have gained orbs (left, right, down)
      expect(explodedBoard.cells[0][0].orbCount).toBe(1); // left
      expect(explodedBoard.cells[0][2].orbCount).toBe(1); // right
      expect(explodedBoard.cells[1][1].orbCount).toBe(1); // down
    });
  });

  describe('Chain Reactions', () => {
    it('should process chain reactions when explosions trigger more explosions', () => {
      // Set up a scenario where explosion causes chain reaction
      // Place 1 orb in corner (0,0)
      let testBoard = placeOrb(board, 0, 0, 'player1');

      // Place 2 orbs in adjacent edge cell (0,1) - one short of critical
      testBoard = placeOrb(testBoard, 0, 1, 'player1');
      testBoard = placeOrb(testBoard, 0, 1, 'player1');

      // Now place 1 more orb in corner (0,0) to make it explode
      testBoard = placeOrb(testBoard, 0, 0, 'player1'); // This should explode

      const chainResult = processChainReactions(testBoard);

      // Should have explosion steps
      expect(chainResult.explosionSteps.length).toBeGreaterThan(0);

      // Final board should have processed all explosions
      const finalBoard = chainResult.finalBoard;

      // After chain reaction:
      // - Corner (0,0) exploded and became empty, but received 1 orb from edge explosion
      // - Edge (0,1) exploded and became empty
      expect(finalBoard.cells[0][0].orbCount).toBe(1);
      expect(finalBoard.cells[0][1].orbCount).toBe(0);
    });
  });

  describe('Integration Test - Full Orb Placement', () => {
    it('should automatically trigger explosions when placing orbs via executeOrbPlacement', async () => {
      // This is the most important test - it should prevent the bug
      // Place 2 orbs in edge cell first
      let result = await executeOrbPlacement(gameState, 0, 1, 'player1');
      expect(result.success).toBe(true);

      if (result.updatedGameState) {
        gameState = result.updatedGameState;
      }

      result = await executeOrbPlacement(gameState, 0, 1, 'player1');
      expect(result.success).toBe(true);

      if (result.updatedGameState) {
        gameState = result.updatedGameState;
      }

      // Third orb should trigger explosion
      result = await executeOrbPlacement(gameState, 0, 1, 'player1');

      // Debug: log the result to see what's happening
      if (!result.success) {
        console.log('Placement failed:', result.error);
        console.log('Current board state:', gameState.board.cells[0][1]);
      }

      expect(result.success).toBe(true);

      if (result.updatedGameState) {
        const finalBoard = result.updatedGameState.board;

        // The edge cell should be empty after explosion
        expect(finalBoard.cells[0][1].orbCount).toBe(0);

        // Adjacent cells should have orbs
        const adjacentCells = [
          finalBoard.cells[0][0], // left
          finalBoard.cells[0][2], // right
          finalBoard.cells[1][1], // down
        ];

        const totalOrbsInAdjacent = adjacentCells.reduce(
          (sum, cell) => sum + cell.orbCount,
          0
        );
        expect(totalOrbsInAdjacent).toBe(3); // All 3 orbs should have spread
      }

      // Should have chain reaction steps if explosion occurred
      expect(result.chainReactionSteps).toBeDefined();
      expect(result.chainReactionSteps!.length).toBeGreaterThan(0);
    });

    it('should automatically explode corner cells when 2 orbs are placed', async () => {
      // CRITICAL BUG TEST: Corner cells must explode at exactly 2 orbs via game integration
      // Place first orb in corner
      let result = await executeOrbPlacement(gameState, 0, 0, 'player1');
      expect(result.success).toBe(true);

      if (result.updatedGameState) {
        gameState = result.updatedGameState;
      }

      // Verify first orb is placed
      expect(gameState.board.cells[0][0].orbCount).toBe(1);
      expect(gameState.board.cells[0][0].playerId).toBe('player1');

      // Place second orb in same corner - THIS MUST TRIGGER EXPLOSION
      result = await executeOrbPlacement(gameState, 0, 0, 'player1');
      expect(result.success).toBe(true);

      if (result.updatedGameState) {
        const finalBoard = result.updatedGameState.board;

        // The corner cell should be empty after explosion
        expect(finalBoard.cells[0][0].orbCount).toBe(0);
        expect(finalBoard.cells[0][0].playerId).toBe(null);

        // Adjacent cells should have orbs (right and down for corner 0,0)
        expect(finalBoard.cells[0][1].orbCount).toBe(1); // right
        expect(finalBoard.cells[1][0].orbCount).toBe(1); // down
        expect(finalBoard.cells[0][1].playerId).toBe('player1');
        expect(finalBoard.cells[1][0].playerId).toBe('player1');
      }

      // Should have chain reaction steps
      expect(result.chainReactionSteps).toBeDefined();
      expect(result.chainReactionSteps!.length).toBeGreaterThan(0);
    });

    it('should prevent any cell from exceeding its critical mass', async () => {
      // Test all cell types
      const testCases = [
        { row: 0, col: 0, type: 'corner', maxOrbs: 2 }, // corner
        { row: 0, col: 1, type: 'edge', maxOrbs: 3 }, // edge
        { row: 1, col: 1, type: 'interior', maxOrbs: 4 }, // interior
      ];

      for (const testCase of testCases) {
        // Create fresh game state for each test case
        let localGameState = {
          ...gameState,
          board: createEmptyBoard(6, 9), // Fresh board
          moveCount: 20, // Ensure both players have had sufficient turns
        };

        // Ensure both players have orbs to prevent early game termination
        // Place orbs for both players to simulate ongoing game
        localGameState.board.cells[5][8].orbCount = 2;
        localGameState.board.cells[5][8].playerId = 'player2';
        localGameState.board.cells[4][7].orbCount = 1;
        localGameState.board.cells[4][7].playerId = 'player1';

        // Place orbs up to critical mass (disable animations to avoid timing issues in tests)
        for (let i = 0; i < testCase.maxOrbs; i++) {
          const result = await executeOrbPlacement(
            localGameState,
            testCase.row,
            testCase.col,
            'player1',
            { enableAnimations: false }
          );

          if (!result.success) {
            console.log(
              `❌ Failed on ${testCase.type} cell, orb ${i + 1}/${testCase.maxOrbs}`
            );
            console.log('Error:', result.error);
            console.log('Game status:', localGameState.gameStatus);
            console.log('Current player:', localGameState.currentPlayerIndex);
            console.log('Move count:', localGameState.moveCount);
            console.log('Is animating:', localGameState.isAnimating);
          }

          expect(result.success).toBe(true);

          if (result.updatedGameState) {
            localGameState = result.updatedGameState;
          }
        }

        // After reaching critical mass, cell should explode and be empty
        const finalCell =
          localGameState.board.cells[testCase.row][testCase.col];
        expect(finalCell.orbCount).toBe(0); // Should be empty after explosion
      }
    });
  });
});
