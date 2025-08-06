import React, { useRef, useEffect, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
// import { useGameLogic } from '../../hooks/useGameLogic';
import { useOrbPlacement } from '../../hooks/useOrbPlacement';
import Cell from '../Cell';
import GameFeedback from '../GameFeedback';
import ChainReactionManager from '../ChainReactionManager';
import styles from './GameBoard.module.css';

interface GameBoardProps {
  showCriticalMass?: boolean;
  showDebugInfo?: boolean;
  showFeedback?: boolean;
  showCriticalMassVisualization?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  showCriticalMass = false,
  showDebugInfo = false,
  showFeedback = true,
  showCriticalMassVisualization = true,
}) => {
  const {
    gameInfo,
    boardInfo,
    currentPlayer,
    canMakeMove,
    players,
    gameState,
  } = useGameState();

  const boardRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(64); // Default cell size

  // Calculate cell size based on board dimensions
  useEffect(() => {
    if (boardRef.current && boardInfo.rows > 0 && boardInfo.cols > 0) {
      const boardElement = boardRef.current;
      const boardWidth = boardElement.clientWidth;
      const boardHeight = boardElement.clientHeight;

      // Calculate cell size to fit the board
      const cellWidth = Math.floor(boardWidth / boardInfo.cols);
      const cellHeight = Math.floor(boardHeight / boardInfo.rows);
      const calculatedCellSize = Math.min(cellWidth, cellHeight, 80); // Max 80px

      setCellSize(calculatedCellSize);
    }
  }, [boardInfo.rows, boardInfo.cols]);

  // Handle chain reaction step completion
  const handleChainStepComplete = (stepIndex: number) => {
    // Optional: Add any additional logic when a step completes
    console.log(`Chain reaction step ${stepIndex + 1} completed`);
  };

  // Handle chain reaction sequence completion
  const handleChainSequenceComplete = () => {
    // This will be handled by the game reducer
    console.log('Chain reaction sequence completed');
  };

  // const { makeMove, isValidMoveAt } = useGameLogic();
  const {
    placeOrb,
    isPlacingOrb,
    feedback,
    previewMove,
    clearMovePreview,
    isValidTarget,
  } = useOrbPlacement();

  const handleCellClick = async (row: number, col: number) => {
    if (!gameInfo.isGameStarted) {
      return;
    }

    // Prevent clicks during animations or chain reactions
    if (
      gameInfo.isAnimating ||
      isPlacingOrb ||
      gameState.gameStatus === 'chain_reacting'
    ) {
      return;
    }

    await placeOrb(row, col);
  };

  const handleCellHover = (row: number, col: number) => {
    if (showFeedback && !isPlacingOrb) {
      previewMove(row, col);
    }
  };

  const handleCellLeave = () => {
    if (showFeedback) {
      clearMovePreview();
    }
  };

  const getPlayerColor = (playerId: string | null): string => {
    if (!playerId) return '#4ECDC4';
    const player = players.find((p) => p.id === playerId);
    return player?.color || '#4ECDC4';
  };

  const renderCell = (cell: (typeof boardInfo.cells)[0][0]) => {
    const isClickable =
      canMakeMove(cell.row, cell.col) &&
      isValidTarget(cell.row, cell.col) &&
      !gameInfo.isAnimating &&
      !isPlacingOrb &&
      gameState.gameStatus !== 'chain_reacting';

    const isCurrentPlayerCell =
      currentPlayer && cell.playerId === currentPlayer.id;
    const playerColor = getPlayerColor(cell.playerId);

    return (
      <Cell
        key={cell.id}
        cell={cell}
        onClick={handleCellClick}
        onMouseEnter={() => handleCellHover(cell.row, cell.col)}
        onMouseLeave={handleCellLeave}
        isClickable={isClickable}
        playerColor={playerColor}
        isCurrentPlayerCell={!!isCurrentPlayerCell}
        showCriticalMass={showCriticalMass}
        showCriticalMassVisualization={showCriticalMassVisualization}
      />
    );
  };

  const renderGrid = () => {
    return boardInfo.cells.flat().map((cell) => renderCell(cell));
  };

  if (boardInfo.cells.length === 0) {
    return (
      <div className={styles.gameBoardContainer}>
        <div className={styles.loadingState}>Loading game board...</div>
      </div>
    );
  }

  return (
    <div className={styles.gameBoardContainer}>
      {showDebugInfo && (
        <div className={styles.debugInfo}>
          <p>Status: {gameInfo.status}</p>
          <p>Current Player: {currentPlayer?.name || 'None'}</p>
          <p>Move Count: {gameInfo.moveCount}</p>
          <p>Animating: {gameInfo.isAnimating ? 'Yes' : 'No'}</p>
        </div>
      )}

      <div
        ref={boardRef}
        className={styles.gameBoard}
        style={{
          gridTemplateRows: `repeat(${boardInfo.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${boardInfo.cols}, 1fr)`,
        }}
        role="grid"
        aria-label={`Game board with ${boardInfo.rows} rows and ${boardInfo.cols} columns`}
      >
        {renderGrid()}
      </div>

      {/* Chain Reaction Animation Manager */}
      <ChainReactionManager
        gridSize={{ rows: boardInfo.rows, cols: boardInfo.cols }}
        cellSize={cellSize}
        onStepComplete={handleChainStepComplete}
        onSequenceComplete={handleChainSequenceComplete}
      />

      {(gameInfo.isAnimating || gameState.gameStatus === 'chain_reacting') && (
        <div className={styles.animationOverlay}>
          <div className={styles.animationMessage}>
            {gameState.gameStatus === 'chain_reacting'
              ? 'Chain reaction in progress...'
              : 'Processing chain reaction...'}
          </div>
        </div>
      )}

      {showFeedback && (
        <GameFeedback feedback={feedback} position="top" autoHide={true} />
      )}
    </div>
  );
};

export default GameBoard;
