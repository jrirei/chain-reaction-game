import { useContext } from 'react';
import { GameContext } from './GameContext';
import type { GameContextType } from './GameContext';

export const useGameContext = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};
