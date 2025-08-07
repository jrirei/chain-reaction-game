import React, { useEffect, useState } from 'react';
import type { OrbMovementAnimation } from '../../types';
import styles from './OrbMovementAnimation.module.css';

interface OrbMovementAnimationProps {
  movement: OrbMovementAnimation;
  gridSize: { rows: number; cols: number };
  cellSize: number; // Size of each cell in pixels
  intensity?: number; // Chain reaction intensity for visual effects
  onComplete?: () => void;
}

const OrbMovementAnimationComponent: React.FC<OrbMovementAnimationProps> = ({
  movement,
  cellSize,
  intensity = 1,
  onComplete,
}) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationStarted, setAnimationStarted] = useState(false);

  // Calculate animation properties based on intensity and movement distance
  const distance = Math.sqrt(
    Math.pow(movement.toCell.col - movement.fromCell.col, 2) +
      Math.pow(movement.toCell.row - movement.fromCell.row, 2)
  );

  // Determine intensity level for CSS classes
  const intensityLevel =
    intensity >= 8 ? 'extreme' : intensity >= 4 ? 'high' : 'normal';

  // Determine if this is a fast-moving orb (long distance or high intensity)
  const isHighSpeed = distance > 2 || intensity >= 6;
  const speedClass = isHighSpeed ? 'fast' : 'normal';

  // Calculate positions
  const fromPosition = {
    x: movement.fromCell.col * cellSize + cellSize / 2,
    y: movement.fromCell.row * cellSize + cellSize / 2,
  };

  const toPosition = {
    x: movement.toCell.col * cellSize + cellSize / 2,
    y: movement.toCell.row * cellSize + cellSize / 2,
  };

  useEffect(() => {
    console.log(
      `🎭 Orb moving from (${movement.fromCell.row}, ${movement.fromCell.col}) to (${movement.toCell.row}, ${movement.toCell.col})`
    );
    console.log(
      `📍 Positions: from(${fromPosition.x}, ${fromPosition.y}) to(${toPosition.x}, ${toPosition.y}), duration: ${movement.duration}ms`
    );

    // Start animation after a tiny delay to ensure DOM is ready
    const startTimer = setTimeout(() => {
      setAnimationStarted(true);
    }, 10);

    // Complete the animation after duration
    const completeTimer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, movement.duration);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(completeTimer);
    };
  }, [
    movement.duration,
    onComplete,
    movement.fromCell,
    movement.toCell,
    fromPosition.x,
    fromPosition.y,
    toPosition.x,
    toPosition.y,
  ]);

  if (!isAnimating) {
    return null;
  }

  // Use direct transform without CSS variables for better compatibility
  const currentTransform = animationStarted
    ? `translate(${toPosition.x}px, ${toPosition.y}px)`
    : `translate(${fromPosition.x}px, ${fromPosition.y}px)`;

  return (
    <div
      className={styles.orbAnimation}
      data-intensity={intensityLevel}
      data-speed={speedClass}
      style={
        {
          transform: currentTransform,
          transition: animationStarted
            ? `transform ${movement.duration - 20}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
            : 'none',
          '--orb-color': movement.orbColor,
        } as React.CSSProperties
      }
    >
      <div
        className={styles.orb}
        style={{
          backgroundColor: movement.orbColor,
        }}
      />
    </div>
  );
};

export default OrbMovementAnimationComponent;
