import { GameProvider } from './context';
import { useGameState } from './hooks/useGameState';
import GameHeader from './components/GameHeader/GameHeader';
import GameInfo from './components/GameInfo/GameInfo';
import GameBoard from './components/GameBoard/GameBoard';
import GameControls from './components/GameControls/GameControls';
import PlayerList from './components/PlayerList/PlayerList';
import CriticalMassDisplay from './components/CriticalMassDisplay';
import GameEndModal from './components/GameEndModal';
import './App.css';

function AppContent() {
  const { resetGame } = useGameState();
  return (
    <div className="app">
      <GameHeader />
      <GameInfo />
      <div className="game-content">
        <div className="game-sidebar">
          <PlayerList showStats={true} compact={false} horizontal={false} />
        </div>
        <main className="game-area">
          <GameBoard />
        </main>
      </div>
      <GameControls />
      <CriticalMassDisplay
        showAlerts={true}
        showBoardTension={true}
        showRecommendations={true}
        position="top-right"
        compact={false}
      />
      <GameEndModal onRestart={resetGame} showStats={true} />
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
