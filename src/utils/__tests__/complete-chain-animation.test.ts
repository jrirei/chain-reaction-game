import { describe, it, expect } from 'vitest';
import { executeOrbPlacement } from '../orbPlacement';
import { createEmptyBoard } from '../gameLogic';
import { GameStatus } from '../../types';

describe('Complete Chain Animation Until Enemy Orbs Consumed', () => {
  it('should continue chain reaction animation until all enemy orbs are consumed even when game is won', async () => {
    console.log('=== TESTING COMPLETE CHAIN ANIMATION ===');

    // Create 3x3 board for easier testing
    const board = createEmptyBoard(3, 3);

    // Set up a scenario where player1 can win but there should be more explosions
    // Player1 owns most cells, player2 has a few that will get consumed
    board.cells[0][0].orbCount = 1; // Player1 corner (critical mass 2)
    board.cells[0][0].playerId = 'player1';

    // Player2 cells that should get consumed in chain reaction
    board.cells[0][1].orbCount = 2; // Player2 edge (critical mass 3)
    board.cells[0][1].playerId = 'player2';

    board.cells[1][0].orbCount = 2; // Player2 edge (critical mass 3)
    board.cells[1][0].playerId = 'player2';

    board.cells[1][1].orbCount = 2; // Player2 center (critical mass 4)
    board.cells[1][1].playerId = 'player2';

    const gameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      winner: null,
      isAnimating: false,
      moveCount: 5,
      gameStartTime: Date.now(),
      gameEndTime: null,
      settings: {
        gridRows: 3,
        gridCols: 3,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
        maxPlayers: 4,
      },
    };

    console.log('Initial board state:');
    console.log('Corner (0,0):', board.cells[0][0]);
    console.log('Edge (0,1):', board.cells[0][1]);
    console.log('Edge (1,0):', board.cells[1][0]);
    console.log('Center (1,1):', board.cells[1][1]);

    // Place one more orb in corner to trigger explosion
    // This should cause a chain reaction that eliminates player2 but continues until all orbs are consumed
    const result = await executeOrbPlacement(gameState, 0, 0, 'player1', {
      enableAnimations: true,
      calculateChainReactions: true,
    });

    console.log('\nChain reaction result:');
    console.log('Success:', result.success);
    console.log('Steps:', result.chainReactions);
    console.log('Game won early:', result.gameWonEarly);
    console.log(
      'Actions:',
      result.actions?.map((a) => a.type)
    );

    // Verify that we got multiple explosion steps even though game was won
    expect(result.success).toBe(true);
    expect(result.chainReactions).toBeGreaterThan(1); // Should have multiple steps
    expect(result.gameWonEarly).toBe(true); // Game was won early
    expect(result.actions).toBeDefined();

    // Should have START_CHAIN_SEQUENCE action with all steps included
    const chainSequenceAction = result.actions?.find(
      (action) => action.type === 'START_CHAIN_SEQUENCE'
    );
    expect(chainSequenceAction).toBeDefined();

    if (chainSequenceAction && 'payload' in chainSequenceAction) {
      const payload = chainSequenceAction.payload as {
        explosionSteps: Array<{
          explodingCells: unknown[];
          orbMovements: unknown[];
          resultingBoard: unknown;
        }>;
        gameWonEarly: boolean;
        finalBoard: {
          rows: number;
          cols: number;
          cells: Array<Array<{ playerId: string | null; orbCount: number }>>;
        };
      };
      console.log('Explosion steps generated:', payload.explosionSteps?.length);
      console.log('Game won early in payload:', payload.gameWonEarly);

      // Should have multiple explosion steps
      expect(payload.explosionSteps?.length).toBeGreaterThan(1);
      expect(payload.gameWonEarly).toBe(true);

      // Verify final board has no player2 orbs
      const finalBoard = payload.finalBoard;
      let player2Orbs = 0;
      for (let row = 0; row < finalBoard.rows; row++) {
        for (let col = 0; col < finalBoard.cols; col++) {
          if (finalBoard.cells[row][col].playerId === 'player2') {
            player2Orbs += finalBoard.cells[row][col].orbCount;
          }
        }
      }

      console.log('Final player2 orbs remaining:', player2Orbs);
      expect(player2Orbs).toBe(0); // All player2 orbs should be consumed
    }

    console.log(
      '✅ Chain reaction continued until all enemy orbs were consumed'
    );
  });

  it('should generate all explosion steps for complex chain reaction even with early win', async () => {
    console.log('\n=== TESTING COMPLEX CHAIN REACTION ===');

    const board = createEmptyBoard(4, 4);

    // Create a complex setup where player1 wins early but chain should continue
    // Set up multiple cells that will chain react
    board.cells[0][0].orbCount = 1; // Player1 trigger
    board.cells[0][0].playerId = 'player1';

    // Create a line of player2 cells that will chain react
    board.cells[0][1].orbCount = 2; // Will reach critical mass
    board.cells[0][1].playerId = 'player2';

    board.cells[0][2].orbCount = 2; // Will reach critical mass
    board.cells[0][2].playerId = 'player2';

    board.cells[1][1].orbCount = 3; // Will reach critical mass
    board.cells[1][1].playerId = 'player2';

    board.cells[1][2].orbCount = 3; // Will reach critical mass
    board.cells[1][2].playerId = 'player2';

    const gameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      winner: null,
      isAnimating: false,
      moveCount: 8,
      gameStartTime: Date.now(),
      gameEndTime: null,
      settings: {
        gridRows: 4,
        gridCols: 4,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
        maxPlayers: 4,
      },
    };

    // Trigger the chain reaction
    const result = await executeOrbPlacement(gameState, 0, 0, 'player1', {
      enableAnimations: true,
      calculateChainReactions: true,
    });

    console.log('Complex chain result:');
    console.log('Chain reaction steps:', result.chainReactions);
    console.log('Game won early:', result.gameWonEarly);

    // Should have generated multiple explosion steps
    expect(result.chainReactions).toBeGreaterThanOrEqual(2);

    const chainSequenceAction = result.actions?.find(
      (action) => action.type === 'START_CHAIN_SEQUENCE'
    );
    if (chainSequenceAction && 'payload' in chainSequenceAction) {
      const payload = chainSequenceAction.payload as {
        explosionSteps: Array<{
          explodingCells: unknown[];
          orbMovements: unknown[];
          resultingBoard: unknown;
        }>;
        gameWonEarly: boolean;
      };
      const explosionSteps = payload.explosionSteps;

      console.log('Generated explosion steps:', explosionSteps?.length);
      expect(explosionSteps?.length).toBeGreaterThanOrEqual(2);

      // Each step should have valid explosion data
      explosionSteps?.forEach((step, index: number) => {
        console.log(`Step ${index + 1}:`, {
          explodingCells: step.explodingCells?.length,
          orbMovements: step.orbMovements?.length,
        });
        expect(step.explodingCells).toBeDefined();
        expect(step.orbMovements).toBeDefined();
        expect(step.resultingBoard).toBeDefined();
      });
    }

    console.log('✅ Complex chain reaction generated all steps correctly');
  });
});
