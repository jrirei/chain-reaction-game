import type { GameBoard, GameState, PlayerId, GameAction } from '../types';
import { validateMove, type MoveContext } from './moveValidation';
import {
  placeOrb,
  processChainReactions,
  processChainReactionsSequential,
  getExplodingCells,
} from './gameLogic';
import { checkGameEnd } from './winLoseDetection';

export interface OrbPlacementResult {
  success: boolean;
  updatedGameState?: GameState;
  actions?: GameAction[];
  error?: string;
  chainReactionSteps?: GameBoard[];
}

export interface OrbPlacementOptions {
  skipValidation?: boolean;
  enableAnimations?: boolean;
  calculateChainReactions?: boolean;
}

/**
 * Complete orb placement with validation, state updates, and chain reactions
 */
export const executeOrbPlacement = async (
  gameState: GameState,
  row: number,
  col: number,
  playerId: PlayerId,
  options: OrbPlacementOptions = {}
): Promise<OrbPlacementResult> => {
  const {
    skipValidation = false,
    enableAnimations = true,
    calculateChainReactions = true,
  } = options;

  const actions: GameAction[] = [];

  try {
    // Validate the move unless explicitly skipped
    if (!skipValidation) {
      const moveContext: MoveContext = {
        gameState,
        currentPlayerId: playerId,
        targetRow: row,
        targetCol: col,
      };

      const validationResult = validateMove(moveContext);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.error,
        };
      }
    }

    // Place the orb
    const boardAfterPlacement = placeOrb(gameState.board, row, col, playerId);

    // Add the placement action
    actions.push({
      type: 'PLACE_ORB',
      payload: { row, col, playerId },
    });

    let finalBoard = boardAfterPlacement;
    let chainReactionSteps: GameBoard[] = [];

    // Process chain reactions if enabled
    if (calculateChainReactions) {
      // Check if the placed orb immediately causes an explosion
      const placedCell = boardAfterPlacement.cells[row][col];
      if (placedCell.orbCount >= placedCell.criticalMass) {
        // Cell reached critical mass - process chain reactions sequentially
        console.log(
          `🔥 Cell at (${row}, ${col}) reached critical mass, processing sequentially...`
        );
        const sequentialResult = processChainReactionsSequential(
          boardAfterPlacement,
          playerId
        );
        finalBoard = sequentialResult.finalBoard;

        console.log(
          `⚡ Sequential result: ${sequentialResult.explosionSteps.length} explosion steps`,
          {
            stepsCount: sequentialResult.explosionSteps.length,
            safetyReached: sequentialResult.safetyLimitReached,
            gameWonEarly: sequentialResult.gameWonEarly,
            enableAnimations,
          }
        );

        // Add sequential chain reaction actions if there were explosions
        if (sequentialResult.explosionSteps.length > 0) {
          // For backward compatibility, populate chainReactionSteps
          chainReactionSteps = sequentialResult.explosionSteps.map(
            (step) => step.resultingBoard
          );

          if (enableAnimations) {
            console.log(
              '🎬 Animations enabled - dispatching START_CHAIN_SEQUENCE'
            );
            // Start the chain sequence
            actions.push({
              type: 'START_CHAIN_SEQUENCE',
              payload: {
                explosionSteps: sequentialResult.explosionSteps,
                totalSteps: sequentialResult.explosionSteps.length,
                finalBoard: sequentialResult.finalBoard,
                safetyLimitReached: sequentialResult.safetyLimitReached,
                gameWonEarly: sequentialResult.gameWonEarly,
              },
            });

            // Record chain reaction statistics
            actions.push({
              type: 'RECORD_CHAIN_REACTION',
              payload: {
                playerId,
                chainLength: sequentialResult.explosionSteps.length,
                explosionsCount: sequentialResult.explosionSteps.length,
              },
            });

            // Note: COMPLETE_CHAIN_SEQUENCE will be dispatched by ChainReactionManager
            // when all animation steps are finished
          } else {
            // If animations disabled, use old system for now
            const chainResult = processChainReactions(boardAfterPlacement);
            finalBoard = chainResult.finalBoard;
            chainReactionSteps = chainResult.explosionSteps;

            actions.push({
              type: 'RECORD_CHAIN_REACTION',
              payload: {
                playerId,
                chainLength: chainResult.explosionSteps.length,
                explosionsCount: chainResult.explosionSteps.length,
              },
            });
          }
        }
      } else {
        // Check if any other cells are at critical mass (shouldn't happen in normal gameplay)
        const explodingCells = getExplodingCells(boardAfterPlacement);
        if (explodingCells.length > 0) {
          const sequentialResult = processChainReactionsSequential(
            boardAfterPlacement,
            playerId
          );
          finalBoard = sequentialResult.finalBoard;

          if (sequentialResult.explosionSteps.length > 0) {
            // For backward compatibility, populate chainReactionSteps
            chainReactionSteps = sequentialResult.explosionSteps.map(
              (step) => step.resultingBoard
            );

            if (enableAnimations) {
              actions.push({
                type: 'START_CHAIN_SEQUENCE',
                payload: {
                  explosionSteps: sequentialResult.explosionSteps,
                  totalSteps: sequentialResult.explosionSteps.length,
                  finalBoard: sequentialResult.finalBoard,
                  safetyLimitReached: sequentialResult.safetyLimitReached,
                  gameWonEarly: sequentialResult.gameWonEarly,
                },
              });

              // Note: COMPLETE_CHAIN_SEQUENCE will be dispatched by ChainReactionManager
              // when all steps are finished
            } else {
              // Fallback to old system when animations disabled
              const chainResult = processChainReactions(boardAfterPlacement);
              finalBoard = chainResult.finalBoard;
              chainReactionSteps = chainResult.explosionSteps;
            }
          }
        }
      }
    }

    // Create updated game state
    const updatedGameState: GameState = {
      ...gameState,
      board: finalBoard,
      moveCount: gameState.moveCount + 1,
      isAnimating:
        enableAnimations &&
        (chainReactionSteps.length > 0 ||
          actions.some((a) => a.type === 'START_CHAIN_SEQUENCE')),
    };

    // If there are chain reactions, defer win checking until animations complete
    const hasChainReactions =
      chainReactionSteps.length > 0 ||
      actions.some((a) => a.type === 'START_CHAIN_SEQUENCE');

    if (hasChainReactions && enableAnimations) {
      // Don't check for game over yet - let animations complete first
      // Win detection will happen when animations finish
      actions.push({
        type: 'DEFER_WIN_CHECK',
      });
    } else {
      // Check for game over conditions using enhanced detection
      const gameEndResult = checkGameEnd(updatedGameState);
      if (gameEndResult.isGameOver) {
        actions.push({
          type: 'SET_WINNER',
          payload: { winner: gameEndResult.winner || null },
        });

        updatedGameState.gameStatus = 'finished';
        updatedGameState.winner = gameEndResult.winner || null;
        updatedGameState.gameEndTime = Date.now();
      } else {
        // Move to next turn
        actions.push({
          type: 'NEXT_TURN',
        });
      }
    }

    return {
      success: true,
      updatedGameState,
      actions,
      chainReactionSteps:
        chainReactionSteps.length > 0 ? chainReactionSteps : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Batch orb placement for testing or replay scenarios
 */
export const executeBatchOrbPlacement = async (
  initialGameState: GameState,
  moves: Array<{ row: number; col: number; playerId: PlayerId }>
): Promise<{
  success: boolean;
  finalGameState?: GameState;
  allActions?: GameAction[];
  errors?: string[];
}> => {
  let currentGameState = { ...initialGameState };
  const allActions: GameAction[] = [];
  const errors: string[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const result = await executeOrbPlacement(
      currentGameState,
      move.row,
      move.col,
      move.playerId,
      { enableAnimations: false } // Disable animations for batch processing
    );

    if (!result.success) {
      errors.push(`Move ${i + 1}: ${result.error}`);
      continue;
    }

    if (result.updatedGameState) {
      currentGameState = result.updatedGameState;
    }

    if (result.actions) {
      allActions.push(...result.actions);
    }

    // Stop if game is over
    if (currentGameState.gameStatus === 'finished') {
      break;
    }
  }

  return {
    success: errors.length === 0,
    finalGameState: currentGameState,
    allActions,
    errors: errors.length > 0 ? errors : undefined,
  };
};

/**
 * Preview what would happen with a move (without executing it)
 */
export const previewOrbPlacement = (
  gameState: GameState,
  row: number,
  col: number,
  playerId: PlayerId
): {
  isValid: boolean;
  wouldExplode: boolean;
  chainReactionCount: number;
  affectedCells: Array<{ row: number; col: number }>;
  error?: string;
} => {
  // Validate the move
  const moveContext: MoveContext = {
    gameState,
    currentPlayerId: playerId,
    targetRow: row,
    targetCol: col,
  };

  const validationResult = validateMove(moveContext);
  if (!validationResult.isValid) {
    return {
      isValid: false,
      wouldExplode: false,
      chainReactionCount: 0,
      affectedCells: [],
      error: validationResult.error,
    };
  }

  // Simulate the placement
  const boardAfterPlacement = placeOrb(gameState.board, row, col, playerId);
  const targetCell = boardAfterPlacement.cells[row][col];
  const wouldExplode = targetCell.orbCount >= targetCell.criticalMass;

  let chainReactionCount = 0;
  let affectedCells: Array<{ row: number; col: number }> = [];

  if (wouldExplode) {
    const chainResult = processChainReactions(boardAfterPlacement);
    chainReactionCount = chainResult.explosionSteps.length;

    // Collect all affected cells
    const affectedSet = new Set<string>();
    for (const step of chainResult.explosionSteps) {
      for (let r = 0; r < step.rows; r++) {
        for (let c = 0; c < step.cols; c++) {
          if (
            step.cells[r][c].orbCount !==
              gameState.board.cells[r][c].orbCount ||
            step.cells[r][c].playerId !== gameState.board.cells[r][c].playerId
          ) {
            affectedSet.add(`${r},${c}`);
          }
        }
      }
    }

    affectedCells = Array.from(affectedSet).map((coord) => {
      const [r, c] = coord.split(',').map(Number);
      return { row: r, col: c };
    });
  }

  return {
    isValid: true,
    wouldExplode,
    chainReactionCount,
    affectedCells,
  };
};

/**
 * Get move suggestions with detailed analysis
 */
export const getMoveAnalysis = (
  gameState: GameState,
  playerId: PlayerId
): Array<{
  row: number;
  col: number;
  score: number;
  analysis: {
    willExplode: boolean;
    chainReactionCount: number;
    strategicValue: 'low' | 'medium' | 'high';
    description: string;
  };
}> => {
  const validMoves = [];

  for (let row = 0; row < gameState.board.rows; row++) {
    for (let col = 0; col < gameState.board.cols; col++) {
      const cell = gameState.board.cells[row][col];

      if (cell.playerId === null || cell.playerId === playerId) {
        const preview = previewOrbPlacement(gameState, row, col, playerId);

        if (preview.isValid) {
          let score = cell.orbCount * 10;
          let strategicValue: 'low' | 'medium' | 'high' = 'low';
          let description = 'Basic move';

          if (preview.wouldExplode) {
            score += 50;
            strategicValue = 'medium';
            description = 'Will cause explosion';

            if (preview.chainReactionCount > 1) {
              score += 30 * preview.chainReactionCount;
              strategicValue = 'high';
              description = `Will cause ${preview.chainReactionCount} chain reactions`;
            }
          }

          // Bonus for corner/edge cells
          if (cell.criticalMass === 2) score += 20;
          else if (cell.criticalMass === 3) score += 10;

          validMoves.push({
            row,
            col,
            score,
            analysis: {
              willExplode: preview.wouldExplode,
              chainReactionCount: preview.chainReactionCount,
              strategicValue,
              description,
            },
          });
        }
      }
    }
  }

  return validMoves.sort((a, b) => b.score - a.score);
};
