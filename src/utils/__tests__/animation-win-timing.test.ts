import { describe, it, expect } from 'vitest';
import { executeOrbPlacement } from '../orbPlacement';
import { createEmptyBoard } from '../gameLogic';
import { gameReducer } from '../gameReducer';
import { GameStatus } from '../../types';
import type { GameState } from '../../types';

describe('Animation and Win Detection Timing', () => {
  it('should defer win detection until after animations complete', async () => {
    // Create a scenario where Player 1 is about to win by eliminating Player 2
    const board = createEmptyBoard(3, 3); // Small board for easier testing

    // Set up Player 2 with only 1 orb in a corner that will be eliminated
    board.cells[0][1].orbCount = 1;
    board.cells[0][1].playerId = 'player2';

    // Set up Player 1 with orbs that will trigger the final elimination
    board.cells[0][0].orbCount = 1; // Corner cell with 1 orb (needs 1 more to explode)
    board.cells[0][0].playerId = 'player1';

    const gameState: GameState = {
      board,
      players: ['player1', 'player2'],
      currentPlayerIndex: 0,
      gameStatus: GameStatus.PLAYING,
      gameStartTime: Date.now(),
      gameEndTime: null,
      moveCount: 4, // After initial rounds
      isAnimating: false,
      winner: null,
      settings: {
        gridRows: 3,
        gridCols: 3,
        playerCount: 2,
        playerNames: ['Player 1', 'Player 2'],
        enableAnimations: true,
        enableSounds: false,
      },
    };

    console.log('=== TESTING WIN DETECTION TIMING ===');
    console.log('Initial state:');
    console.log('  Player 1 corner (0,0):', gameState.board.cells[0][0]);
    console.log('  Player 2 edge (0,1):', gameState.board.cells[0][1]);

    // Place the winning orb (should cause explosion and eliminate Player 2)
    const result = await executeOrbPlacement(gameState, 0, 0, 'player1', {
      enableAnimations: true,
    });

    console.log('\nAfter orb placement:');
    console.log('  Success:', result.success);
    console.log(
      '  Actions generated:',
      result.actions?.map((a) => a.type) || []
    );
    console.log('  Chain reactions:', result.chainReactionSteps?.length || 0);

    expect(result.success).toBe(true);
    expect(result.chainReactionSteps).toBeDefined();
    expect(result.chainReactionSteps!.length).toBeGreaterThan(0);

    if (result.updatedGameState) {
      console.log('  Updated game state:');
      console.log('    Status:', result.updatedGameState.gameStatus);
      console.log('    Animating:', result.updatedGameState.isAnimating);
      console.log('    Winner:', result.updatedGameState.winner);

      // The key test: if animations are enabled and chain reactions occurred,
      // the game should NOT be marked as finished yet
      if (result.chainReactionSteps!.length > 0) {
        expect(result.updatedGameState.isAnimating).toBe(true);
        expect(result.updatedGameState.gameStatus).not.toBe('finished');
        expect(result.updatedGameState.winner).toBe(null);

        console.log('✅ Win detection correctly deferred during animations');
      }

      // Now simulate the completion of animations
      console.log('\n=== SIMULATING ANIMATION COMPLETION ===');

      let currentState = result.updatedGameState;

      // Apply all the actions through the reducer to simulate the full flow
      if (result.actions) {
        for (const action of result.actions) {
          console.log(`  Applying action: ${action.type}`);
          currentState = gameReducer(currentState, action);

          console.log(`    After ${action.type}:`);
          console.log(`      Status: ${currentState.gameStatus}`);
          console.log(`      Animating: ${currentState.isAnimating}`);
          console.log(`      Winner: ${currentState.winner}`);

          // When COMPLETE_EXPLOSIONS is processed, win detection should happen
          if (action.type === 'COMPLETE_EXPLOSIONS') {
            expect(currentState.isAnimating).toBe(false);
            // Win should now be detected
            expect(currentState.gameStatus).toBe('finished');
            expect(currentState.winner).toBe('player1');

            console.log(
              '✅ Win detection correctly triggered after animations complete'
            );
          }
        }
      }
    }
  });
});
