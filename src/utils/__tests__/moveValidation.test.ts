import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateMove,
  isValidMoveQuick,
  getValidMoves,
  calculateMoveScore,
  getBestMoves,
  isWinningMove,
  validateMoveWithFeedback,
  type MoveContext,
} from '../moveValidation';
import { createEmptyBoard } from '../boardOperations';
import { updateCell } from '../immutableUtils';
import { GameStatus } from '../../types';
import type { GameBoard, GameState } from '../../types';

describe('Move Validation', () => {
  let board: GameBoard;
  let gameState: GameState;
  let moveContext: MoveContext;

  beforeEach(() => {
    board = createEmptyBoard(4, 4);
    gameState = {
      board,
      currentPlayerIndex: 0,
      players: ['player1', 'player2'],
      gameStatus: GameStatus.PLAYING,
      isAnimating: false,
      winner: null,
      moveCount: 0,
      gameStartTime: null,
      gameEndTime: null,
      settings: {
        players: 2,
        boardSize: { rows: 4, cols: 4 },
        difficulty: 'medium',
      },
      stats: {
        totalExplosions: 0,
        chainReactionsCount: 0,
        longestChainReaction: 0,
        playerStats: {},
      },
    };

    moveContext = {
      gameState,
      currentPlayerId: 'player1',
      targetRow: 1,
      targetCol: 1,
    };
  });

  describe('validateMove', () => {
    it('should validate a basic valid move', () => {
      const result = validateMove(moveContext);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject moves when game is not playing', () => {
      gameState.gameStatus = GameStatus.GAME_OVER;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot make moves when game status is');
    });

    it('should reject moves during animations', () => {
      gameState.isAnimating = true;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        'Cannot make moves while animations are in progress'
      );
    });

    it('should reject moves when it is not player turn', () => {
      moveContext.currentPlayerId = 'player2'; // Player 1's turn but trying player 2

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('It is not your turn');
    });

    it('should reject moves to cells outside board bounds', () => {
      moveContext.targetRow = -1;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Target cell is outside the game board');
    });

    it('should reject moves to opponent cells', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player2' });
      gameState.board = board;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Cannot place orb in opponent's cell");
    });

    it('should allow moves to own cells', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' });
      gameState.board = board;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(true);
    });

    it('should allow moves to neutral cells', () => {
      const result = validateMove(moveContext);

      expect(result.isValid).toBe(true);
    });

    it('should warn about explosive moves', () => {
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // Center cell, critical mass = 4
      gameState.board = board;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('This move will cause an explosion');
    });

    it('should warn about first move', () => {
      gameState.moveCount = 0;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('First move of the game');
    });

    it('should reject eliminated players after minimum moves', () => {
      gameState.moveCount = 5; // More than minimum for 2 players
      // Player 1 has no orbs on board (eliminated)

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Player has been eliminated');
    });

    it('should allow moves for players with orbs on board', () => {
      gameState.moveCount = 5;
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' });
      gameState.board = board;

      const result = validateMove(moveContext);

      expect(result.isValid).toBe(true);
    });
  });

  describe('isValidMoveQuick', () => {
    it('should return true for valid moves', () => {
      const result = isValidMoveQuick(
        board,
        1,
        1,
        'player1',
        GameStatus.PLAYING,
        false
      );

      expect(result).toBe(true);
    });

    it('should return false when game is not playing', () => {
      const result = isValidMoveQuick(
        board,
        1,
        1,
        'player1',
        GameStatus.GAME_OVER,
        false
      );

      expect(result).toBe(false);
    });

    it('should return false during animations', () => {
      const result = isValidMoveQuick(
        board,
        1,
        1,
        'player1',
        GameStatus.PLAYING,
        true
      );

      expect(result).toBe(false);
    });

    it('should return false for out-of-bounds coordinates', () => {
      const result = isValidMoveQuick(
        board,
        -1,
        1,
        'player1',
        GameStatus.PLAYING,
        false
      );

      expect(result).toBe(false);
    });

    it('should return false for opponent cells', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player2' });

      const result = isValidMoveQuick(
        board,
        1,
        1,
        'player1',
        GameStatus.PLAYING,
        false
      );

      expect(result).toBe(false);
    });

    it('should return true for own cells', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' });

      const result = isValidMoveQuick(
        board,
        1,
        1,
        'player1',
        GameStatus.PLAYING,
        false
      );

      expect(result).toBe(true);
    });
  });

  describe('getValidMoves', () => {
    it('should return all cells for empty board', () => {
      const validMoves = getValidMoves(board, 'player1');

      expect(validMoves).toHaveLength(16); // 4x4 board
      expect(validMoves[0]).toHaveProperty('row');
      expect(validMoves[0]).toHaveProperty('col');
      expect(validMoves[0]).toHaveProperty('cell');
    });

    it('should exclude opponent cells', () => {
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player2' });
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player2' });

      const validMoves = getValidMoves(board, 'player1');

      expect(validMoves).toHaveLength(14); // 16 - 2 opponent cells
      const hasOpponentCell = validMoves.some(
        (move) =>
          (move.row === 0 && move.col === 0) ||
          (move.row === 0 && move.col === 1)
      );
      expect(hasOpponentCell).toBe(false);
    });

    it('should include own cells', () => {
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' });

      const validMoves = getValidMoves(board, 'player1');

      expect(validMoves).toHaveLength(16);
      const hasOwnCell = validMoves.some(
        (move) => move.row === 1 && move.col === 1
      );
      expect(hasOwnCell).toBe(true);
    });
  });

  describe('calculateMoveScore', () => {
    it('should give higher scores to corner cells', () => {
      const cornerScore = calculateMoveScore(board, 0, 0, 'player1');
      const edgeScore = calculateMoveScore(board, 0, 1, 'player1');
      const centerScore = calculateMoveScore(board, 1, 1, 'player1');

      expect(cornerScore).toBeGreaterThan(edgeScore);
      expect(edgeScore).toBeGreaterThan(centerScore);
    });

    it('should score existing orbs positively', () => {
      board = updateCell(board, 1, 1, { orbCount: 2, playerId: 'player1' });

      const scoreWithOrbs = calculateMoveScore(board, 1, 1, 'player1');
      const scoreEmpty = calculateMoveScore(board, 1, 2, 'player1');

      expect(scoreWithOrbs).toBeGreaterThan(scoreEmpty);
    });

    it('should bonus cells one away from critical mass', () => {
      board = updateCell(board, 1, 1, { orbCount: 2, playerId: 'player1' }); // Center cell, critical mass 4

      const score = calculateMoveScore(board, 1, 1, 'player1');
      const baseScore = calculateMoveScore(board, 1, 2, 'player1');

      expect(score).toBeGreaterThan(baseScore + 12); // Should include the bonus
    });

    it('should bonus explosive moves that capture enemy cells', () => {
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // Will explode
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player2' }); // Enemy adjacent

      const score = calculateMoveScore(board, 1, 1, 'player1');

      expect(score).toBeGreaterThan(40); // Should have bonus for enemy capture
    });

    it('should penalize explosive moves without strategic benefit', () => {
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // Will explode
      // No enemy cells adjacent

      const score = calculateMoveScore(board, 1, 1, 'player1');
      const baseScore = calculateMoveScore(board, 1, 2, 'player1');

      expect(score).toBeLessThan(baseScore + 20); // Should be penalized
    });
  });

  describe('getBestMoves', () => {
    it('should return moves sorted by score', () => {
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' }); // High score corner
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' }); // Lower score center

      const bestMoves = getBestMoves(board, 'player1', 3);

      expect(bestMoves).toHaveLength(3);
      expect(bestMoves[0].score).toBeGreaterThanOrEqual(bestMoves[1].score);
      expect(bestMoves[1].score).toBeGreaterThanOrEqual(bestMoves[2].score);
    });

    it('should limit results to requested count', () => {
      const bestMoves = getBestMoves(board, 'player1', 5);

      expect(bestMoves).toHaveLength(5);
    });

    it('should include score in results', () => {
      const bestMoves = getBestMoves(board, 'player1', 1);

      expect(bestMoves[0]).toHaveProperty('score');
      expect(typeof bestMoves[0].score).toBe('number');
    });
  });

  describe('isWinningMove', () => {
    it('should identify potential winning moves', () => {
      // Set up scenario where enemy has few orbs and move would explode
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player2' }); // Enemy with 1 orb
      board = updateCell(board, 2, 2, { orbCount: 1, playerId: 'player2' }); // Enemy with another orb (total 2)
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // Will explode (4 is critical mass for center)
      gameState.board = board;

      const isWinning = isWinningMove(gameState, 1, 1, 'player1');

      expect(isWinning).toBe(true);
    });

    it('should not identify non-explosive moves as winning', () => {
      board = updateCell(board, 0, 1, { orbCount: 1, playerId: 'player2' });
      board = updateCell(board, 1, 1, { orbCount: 1, playerId: 'player1' }); // Won't explode

      const isWinning = isWinningMove(gameState, 1, 1, 'player1');

      expect(isWinning).toBe(false);
    });

    it('should not identify moves as winning when enemies have many orbs', () => {
      // Enemy has many orbs
      board = updateCell(board, 0, 0, { orbCount: 2, playerId: 'player2' });
      board = updateCell(board, 0, 1, { orbCount: 2, playerId: 'player2' });
      board = updateCell(board, 1, 0, { orbCount: 2, playerId: 'player2' });
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' }); // Will explode

      const isWinning = isWinningMove(gameState, 1, 1, 'player1');

      expect(isWinning).toBe(false);
    });
  });

  describe('validateMoveWithFeedback', () => {
    it('should return success for valid moves', () => {
      gameState.moveCount = 5; // Not first move to avoid warning
      // Add orbs for player so they're not eliminated
      board = updateCell(board, 0, 0, { orbCount: 1, playerId: 'player1' });
      gameState.board = board;

      const feedback = validateMoveWithFeedback(moveContext);

      expect(feedback.canMove).toBe(true);
      expect(feedback.type).toBe('success');
      expect(feedback.message).toBe('Valid move');
    });

    it('should return error for invalid moves', () => {
      gameState.isAnimating = true;

      const feedback = validateMoveWithFeedback(moveContext);

      expect(feedback.canMove).toBe(false);
      expect(feedback.type).toBe('error');
      expect(feedback.message).toContain('animations are in progress');
    });

    it('should return warning for moves with warnings', () => {
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' });
      gameState.board = board;

      const feedback = validateMoveWithFeedback(moveContext);

      expect(feedback.canMove).toBe(true);
      expect(feedback.type).toBe('warning');
      expect(feedback.message).toBe('This move will cause an explosion');
    });

    it('should prioritize first warning when multiple exist', () => {
      board = updateCell(board, 1, 1, { orbCount: 3, playerId: 'player1' });
      gameState.board = board;
      gameState.moveCount = 0; // First move

      const feedback = validateMoveWithFeedback(moveContext);

      expect(feedback.canMove).toBe(true);
      expect(feedback.type).toBe('warning');
      expect(feedback.message).toBe('This move will cause an explosion'); // First warning
    });
  });
});
