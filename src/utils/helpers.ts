import { CELL_TYPES, CRITICAL_MASS } from './constants';

export const getCellType = (
  row: number,
  col: number,
  rows: number,
  cols: number
): keyof typeof CRITICAL_MASS => {
  const isCorner =
    (row === 0 && col === 0) ||
    (row === 0 && col === cols - 1) ||
    (row === rows - 1 && col === 0) ||
    (row === rows - 1 && col === cols - 1);

  const isEdge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;

  if (isCorner) return CELL_TYPES.CORNER;
  if (isEdge) return CELL_TYPES.EDGE;
  return CELL_TYPES.INTERIOR;
};

export const getCriticalMass = (
  row: number,
  col: number,
  rows: number,
  cols: number
): number => {
  const cellType = getCellType(row, col, rows, cols);
  return CRITICAL_MASS[cellType];
};

export const generateCellId = (row: number, col: number): string => {
  return `cell-${row}-${col}`;
};
