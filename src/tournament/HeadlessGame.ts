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
  private bots: TournamentBot[];
  private config: TournamentConfig;
  private gameState: GameState;
  private aiStrategies: AiStrategy[];
  private startTime: number;
  private moveLog: string[] = [];
  private eliminationHistory: {
    player: TournamentBot;
    eliminationMove: number;
    remainingPlayers: number;
  }[] = [];

  constructor(players: TournamentBot[], config: TournamentConfig) {
    if (players.length < 2 || players.length > 4) {
      throw new Error('HeadlessGame supports 2-4 players only');
    }

    this.gameId = generateUniqueId();
    this.bots = [...players];
    this.config = config;
    this.startTime = Date.now();

    // Initialize game state for multiple players
    const initialState = createInitialGameState();
    const playerIds = Array.from(
      { length: players.length },
      (_, i) => `player${i + 1}`
    );

    this.gameState = gameReducer(initialState, {
      type: 'INITIALIZE_GAME',
      payload: {
        settings: {
          ...initialState.settings,
          playerCount: players.length,
          playerNames: players.map((bot) => bot.name),
          enableAnimations: false, // Disable for speed
          enableSounds: false,
        },
        players: playerIds,
      },
    });

    this.gameState = gameReducer(this.gameState, { type: 'START_GAME' });

    // Create AI instances for each player
    this.aiStrategies = players.map((bot) =>
      createAiStrategy(bot.strategy, {
        maxThinkingMs: config.maxThinkingTimeMs,
      })
    );
  }

  public async playGame(): Promise<GameResult> {
    let moveCount = 0;
    const maxMoves = 1000; // Safety limit to prevent infinite games
    const activePlayers = new Set(this.gameState.players);

    // Track individual player move counts
    const playerMoveCounts = new Map<string, number>();
    this.gameState.players.forEach((playerId) => {
      playerMoveCounts.set(playerId, 0);
    });

    // Game starting silently

    while (
      this.gameState.gameStatus === 'playing' &&
      moveCount < maxMoves &&
      Date.now() - this.startTime < this.config.gameTimeoutMs &&
      activePlayers.size > 1
    ) {
      const currentPlayerId =
        this.gameState.players[this.gameState.currentPlayerIndex];

      // Skip if current player has been eliminated
      if (!activePlayers.has(currentPlayerId)) {
        // Move to next player
        this.gameState = gameReducer(this.gameState, { type: 'NEXT_TURN' });
        continue;
      }

      const currentPlayerIndex =
        parseInt(currentPlayerId.replace('player', '')) - 1;
      const currentBot = this.bots[currentPlayerIndex];
      const currentAi = this.aiStrategies[currentPlayerIndex];

      try {
        // Get legal moves
        const legalMoves = getLegalMoves(this.gameState);

        if (legalMoves.length === 0) {
          // Player eliminated silently

          // Eliminate current player
          activePlayers.delete(currentPlayerId);
          this.eliminationHistory.push({
            player: currentBot,
            eliminationMove: moveCount,
            remainingPlayers: activePlayers.size,
          });

          // Move to next turn
          this.gameState = gameReducer(this.gameState, { type: 'NEXT_TURN' });
          continue;
        }

        // AI decides move
        const moveStartTime = Date.now();
        const move = await currentAi.decideMove(this.gameState, legalMoves, {
          rng: Math.random,
          maxThinkingMs: this.config.maxThinkingTimeMs,
          deadlineMs: Date.now() + this.config.maxThinkingTimeMs,
        });
        const thinkingTime = Date.now() - moveStartTime;

        // Move executed silently

        this.moveLog.push(
          `Move ${moveCount + 1}: ${currentBot.name} -> (${move.row},${move.col}) [${thinkingTime}ms]`
        );

        // Execute the move
        const result = await executeOrbPlacement(
          this.gameState,
          move.row,
          move.col,
          currentPlayerId,
          { enableAnimations: false } // Disable animations for headless games
        );

        if (!result.success || !result.updatedGameState || !result.actions) {
          // Invalid move handled silently
          // Eliminate player for invalid move
          activePlayers.delete(currentPlayerId);
          this.eliminationHistory.push({
            player: currentBot,
            eliminationMove: moveCount,
            remainingPlayers: activePlayers.size,
          });
          continue;
        }

        // Apply all actions
        let newGameState = result.updatedGameState;
        for (const action of result.actions) {
          newGameState = gameReducer(newGameState, action);
        }

        this.gameState = newGameState;
        moveCount++;

        // Increment individual player's move count
        const currentPlayerMoves = playerMoveCounts.get(currentPlayerId) || 0;
        playerMoveCounts.set(currentPlayerId, currentPlayerMoves + 1);

        // Check for animations and wait for them to complete
        if (this.gameState.isAnimating) {
          // In headless mode, immediately complete animations
          this.gameState = gameReducer(this.gameState, {
            type: 'COMPLETE_EXPLOSIONS',
          });
        }

        // Check if any players were eliminated by the chain reaction
        this.checkForEliminatedPlayers(activePlayers, moveCount);
      } catch {
        // Error handled silently
        // Eliminate player due to error
        activePlayers.delete(currentPlayerId);
        this.eliminationHistory.push({
          player: currentBot,
          eliminationMove: moveCount,
          remainingPlayers: activePlayers.size,
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Determine winner and final ranking
    let winner: TournamentBot | null = null;
    const finalRanking: TournamentBot[] = [];
    let winnerPlayerId: string | null = null;

    if (activePlayers.size === 1) {
      // Single winner - normal game end
      winnerPlayerId = Array.from(activePlayers)[0];
      const winnerIndex = parseInt(winnerPlayerId.replace('player', '')) - 1;
      winner = this.bots[winnerIndex];
      finalRanking.push(winner);
    } else if (activePlayers.size > 1) {
      // Game ended abnormally (timeout, max moves, etc.) - determine winner by orb count
      const playerOrbCounts = new Map<string, number>();

      // Count orbs for each remaining player
      for (const playerId of activePlayers) {
        playerOrbCounts.set(playerId, 0);
      }

      for (let row = 0; row < this.gameState.board.rows; row++) {
        for (let col = 0; col < this.gameState.board.cols; col++) {
          const cell = this.gameState.board.cells[row][col];
          if (cell.playerId && activePlayers.has(cell.playerId)) {
            const currentCount = playerOrbCounts.get(cell.playerId) || 0;
            playerOrbCounts.set(cell.playerId, currentCount + cell.orbCount);
          }
        }
      }

      // Find player with most orbs
      let maxOrbs = -1;

      for (const [playerId, orbCount] of playerOrbCounts.entries()) {
        if (orbCount > maxOrbs) {
          maxOrbs = orbCount;
          winnerPlayerId = playerId;
        }
      }

      if (winnerPlayerId) {
        const winnerIndex = parseInt(winnerPlayerId.replace('player', '')) - 1;
        winner = this.bots[winnerIndex];
        finalRanking.push(winner);

        // Add other active players in order of orb count (descending)
        const sortedActivePlayers = Array.from(activePlayers)
          .filter((pid) => pid !== winnerPlayerId)
          .map((pid) => ({
            playerId: pid,
            bot: this.bots[parseInt(pid.replace('player', '')) - 1],
            orbCount: playerOrbCounts.get(pid) || 0,
          }))
          .sort((a, b) => b.orbCount - a.orbCount);

        for (const player of sortedActivePlayers) {
          finalRanking.push(player.bot);
        }
      }
    }

    // Add eliminated players in reverse order of elimination (last eliminated = 2nd place, etc.)
    for (let i = this.eliminationHistory.length - 1; i >= 0; i--) {
      finalRanking.push(this.eliminationHistory[i].player);
    }

    // Ensure all players are included in final ranking
    // Add any remaining players who weren't explicitly eliminated but didn't win
    for (const bot of this.bots) {
      if (!finalRanking.includes(bot)) {
        finalRanking.push(bot);
      }
    }

    // Calculate total orbs on board at game end
    let totalOrbsOnBoard = 0;
    for (let row = 0; row < this.gameState.board.rows; row++) {
      for (let col = 0; col < this.gameState.board.cols; col++) {
        totalOrbsOnBoard += this.gameState.board.cells[row][col].orbCount;
      }
    }

    // Use winner's individual move count for quick win determination only
    const winnerMoves = winnerPlayerId
      ? playerMoveCounts.get(winnerPlayerId) || 0
      : 0;
    const isQuickWin = winner !== null && winnerMoves <= 10;

    // Game completed silently - only tournament summary will be shown

    const gameResult: GameResult = {
      gameId: this.gameId,
      players: this.bots,
      winner,
      finalRanking,
      totalOrbsAtEnd: totalOrbsOnBoard, // Total orbs on board when game ended
      gameDurationMs: duration,
      isQuickWin,
      eliminationHistory:
        this.eliminationHistory.length > 0
          ? this.eliminationHistory
          : undefined,
    };

    return gameResult;
  }

  private checkForEliminatedPlayers(
    activePlayers: Set<string>,
    moveCount: number
  ): void {
    // FIXED: Only check for eliminations after all players have had at least one turn
    // This prevents eliminating players who simply haven't moved yet
    const minimumMovesBeforeElimination = this.gameState.players.length;

    if (moveCount < minimumMovesBeforeElimination) {
      // Too early to eliminate anyone - not all players have had a turn yet
      return;
    }

    // Check if any players have no orbs left on the board
    const playersWithOrbs = new Set<string>();

    for (let row = 0; row < this.gameState.board.rows; row++) {
      for (let col = 0; col < this.gameState.board.cols; col++) {
        const cell = this.gameState.board.cells[row][col];
        if (cell.playerId && cell.orbCount > 0) {
          playersWithOrbs.add(cell.playerId);
        }
      }
    }

    // Eliminate players who have no orbs left (only after everyone has had a turn)
    for (const playerId of activePlayers) {
      if (!playersWithOrbs.has(playerId)) {
        activePlayers.delete(playerId);
        const playerIndex = parseInt(playerId.replace('player', '')) - 1;
        const eliminatedBot = this.bots[playerIndex];

        this.eliminationHistory.push({
          player: eliminatedBot,
          eliminationMove: moveCount,
          remainingPlayers: activePlayers.size,
        });

        // Player eliminated silently
      }
    }
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public getMoveLog(): string[] {
    return [...this.moveLog];
  }
}
