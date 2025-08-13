/**
 * Headless game runner for AI vs AI matches
 * Runs games without UI for fast simulation
 */

import { createInitialGameState, gameReducer } from '../utils/gameReducer';
import { executeOrbPlacement } from '../utils/orbPlacement';
import { validateMove, type MoveContext } from '../utils/moveValidation';
import { createAiStrategy } from '../ai/registry';
import type { GameState } from '../types/game';
import type { TournamentBot, GameResult, TournamentConfig } from './types';
import type { AiStrategy } from '../ai/types';
import type { Move } from '../core/types';
// Simple unique ID generator for games
function generateUniqueId(): string {
  return `game-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// Get all legal moves for the current player
function getLegalMoves(gameState: GameState): Move[] {
  const currentPlayerId = gameState.players[gameState.currentPlayerIndex];
  const legalMoves: Move[] = [];

  // Check every cell on the board
  for (let row = 0; row < gameState.board.rows; row++) {
    for (let col = 0; col < gameState.board.cols; col++) {
      const cell = gameState.board.cells[row][col];

      // A move is legal if:
      // 1. The cell is empty (no owner), OR
      // 2. The cell is owned by the current player
      if (cell.playerId === null || cell.playerId === currentPlayerId) {
        const moveContext: MoveContext = {
          gameState,
          currentPlayerId,
          targetRow: row,
          targetCol: col,
        };

        const validationResult = validateMove(moveContext);
        if (validationResult.isValid) {
          legalMoves.push({
            row,
            col,
            playerId: currentPlayerId,
          });
        }
      }
    }
  }

  return legalMoves;
}

export class HeadlessGame {
  private gameId: string;
  private bot1: TournamentBot;
  private bot2: TournamentBot;
  private config: TournamentConfig;
  private gameState: GameState;
  private ai1: AiStrategy;
  private ai2: AiStrategy;
  private startTime: number;
  private moveLog: string[] = [];

  constructor(
    bot1: TournamentBot,
    bot2: TournamentBot,
    config: TournamentConfig
  ) {
    this.gameId = generateUniqueId();
    this.bot1 = bot1;
    this.bot2 = bot2;
    this.config = config;
    this.startTime = Date.now();

    // Initialize game state for 2 players
    const initialState = createInitialGameState();
    this.gameState = gameReducer(initialState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: {
          ...initialState.settings,
          playerCount: 2,
          playerNames: [bot1.name, bot2.name],
          enableAnimations: false, // Disable for speed
          enableSounds: false,
        },
        players: ['player1', 'player2'],
      },
    });

    this.gameState = gameReducer(this.gameState, { type: 'START_GAME' });

    // Create AI instances
    this.ai1 = createAiStrategy(bot1.strategy, {
      maxThinkingMs: config.maxThinkingTimeMs,
    });
    this.ai2 = createAiStrategy(bot2.strategy, {
      maxThinkingMs: config.maxThinkingTimeMs,
    });
  }

  public async playGame(): Promise<GameResult> {
    let moveCount = 0;
    const maxMoves = 1000; // Safety limit to prevent infinite games

    if (this.config.enableDetailedLogging) {
      console.log(`🎮 Starting game: ${this.bot1.name} vs ${this.bot2.name}`);
    }

    while (
      this.gameState.gameStatus === 'playing' &&
      moveCount < maxMoves &&
      Date.now() - this.startTime < this.config.gameTimeoutMs
    ) {
      const currentPlayerId =
        this.gameState.players[this.gameState.currentPlayerIndex];
      const currentBot = currentPlayerId === 'player1' ? this.bot1 : this.bot2;
      const currentAi = currentPlayerId === 'player1' ? this.ai1 : this.ai2;

      try {
        // Get legal moves
        const legalMoves = getLegalMoves(this.gameState);

        if (legalMoves.length === 0) {
          if (this.config.enableDetailedLogging) {
            console.log(
              `❌ No legal moves for ${currentBot.name}, ending game`
            );
          }
          break;
        }

        // AI decides move
        const moveStartTime = Date.now();
        const move = await currentAi.decideMove(this.gameState, legalMoves, {
          rng: Math.random,
          maxThinkingMs: this.config.maxThinkingTimeMs,
          deadlineMs: Date.now() + this.config.maxThinkingTimeMs,
        });
        const thinkingTime = Date.now() - moveStartTime;

        if (this.config.enableDetailedLogging) {
          console.log(
            `🤖 ${currentBot.name} plays (${move.row},${move.col}) [${thinkingTime}ms]`
          );
        }

        this.moveLog.push(
          `Move ${moveCount + 1}: ${currentBot.name} -> (${move.row},${move.col}) [${thinkingTime}ms]`
        );

        // Execute the move
        const result = await executeOrbPlacement(
          this.gameState,
          move.row,
          move.col,
          currentPlayerId
        );

        if (!result.success || !result.updatedGameState || !result.actions) {
          if (this.config.enableDetailedLogging) {
            console.log(
              `❌ Invalid move by ${currentBot.name}: ${result.error}`
            );
          }
          // Penalize invalid move by ending game
          break;
        }

        // Apply all actions
        let newGameState = result.updatedGameState;
        for (const action of result.actions) {
          newGameState = gameReducer(newGameState, action);
        }

        this.gameState = newGameState;
        moveCount++;

        // Check for animations and wait for them to complete
        if (this.gameState.isAnimating) {
          // In headless mode, immediately complete animations
          this.gameState = gameReducer(this.gameState, {
            type: 'COMPLETE_EXPLOSIONS',
          });
        }
      } catch (error) {
        if (this.config.enableDetailedLogging) {
          console.log(`❌ Error during ${currentBot.name}'s turn:`, error);
        }
        break;
      }
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Determine winner
    let winner: TournamentBot | null = null;
    if (this.gameState.winner === 'player1') {
      winner = this.bot1;
    } else if (this.gameState.winner === 'player2') {
      winner = this.bot2;
    }

    const isQuickWin = winner !== null && moveCount <= 50;

    if (this.config.enableDetailedLogging) {
      const result = winner ? `Winner: ${winner.name}` : 'Draw/Timeout';
      console.log(
        `🏁 Game ended after ${moveCount} moves (${duration}ms) - ${result}`
      );
      if (isQuickWin) {
        console.log(`⚡ Quick win bonus awarded!`);
      }
    }

    const gameResult: GameResult = {
      gameId: this.gameId,
      player1: this.bot1,
      player2: this.bot2,
      winner,
      totalMoves: moveCount,
      gameDurationMs: duration,
      isQuickWin,
    };

    return gameResult;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getMoveLog(): string[] {
    return [...this.moveLog];
  }
}
