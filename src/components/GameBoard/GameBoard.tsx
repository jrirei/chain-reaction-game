import React from 'react';
import { useGameState } from '../../hooks/useGameState';
// import { useGameLogic } from '../../hooks/useGameLogic';
import { useOrbPlacement } from '../../hooks/useOrbPlacement';
import Cell from '../Cell';
import GameFeedback from '../GameFeedback';
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
  const { gameInfo, boardInfo, currentPlayer, canMakeMove, players } =
    useGameState();

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

    if (gameInfo.isAnimating || isPlacingOrb) {
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
      !isPlacingOrb;

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

      {gameInfo.isAnimating && (
        <div className={styles.animationOverlay}>
          <div className={styles.animationMessage}>
            Processing chain reaction...
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
