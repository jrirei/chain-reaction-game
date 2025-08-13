import { GameProvider } from './context';
import { useGameState } from './hooks/useGameState';
import { useAiTurn } from './hooks/useAiTurn';
import { useTheme } from './hooks/useTheme';
import { ErrorBoundary, GameErrorBoundary } from './components/ErrorBoundary';
import GameHeader from './components/GameHeader/GameHeader';
import GameInfo from './components/GameInfo/GameInfo';
import GameBoard from './components/GameBoard/GameBoard';
import GameControls from './components/GameControls/GameControls';
import PlayerList from './components/PlayerList/PlayerList';
import GameEndModal from './components/GameEndModal';
import DesignShowcase from './components/DesignShowcase';
import './App.css';

function AppContent() {
  const { resetGame, gameState } = useGameState();
  // Initialize AI turn handling
  useAiTurn();
  // Initialize dark theme by default
  useTheme();

  // Check if we should show the design showcase
  const showDesignShowcase =
    new URLSearchParams(window.location.search).get('design') === 'true';

  if (showDesignShowcase) {
    return <DesignShowcase />;
  }

  return (
    <div className="app">
      {/* Skip link for keyboard navigation */}
      <a href="#main-game-area" className="skip-link">
        Skip to main game
      </a>

      <ErrorBoundary>
        <GameHeader />
      </ErrorBoundary>

      <ErrorBoundary>
        <GameInfo />
      </ErrorBoundary>

      <div className="game-content">
        <aside
          className="game-sidebar"
          role="complementary"
          aria-label="Player information"
        >
          <ErrorBoundary>
            <PlayerList showStats={true} compact={false} horizontal={false} />
          </ErrorBoundary>
        </aside>
        <main
          id="main-game-area"
          className="game-area"
          role="main"
          aria-label="Chain Reaction Game Board"
        >
          <GameErrorBoundary
            gameId={`${gameState.gameStartTime}-${gameState.moveCount}`}
            onGameReset={resetGame}
          >
            <GameBoard />
          </GameErrorBoundary>
        </main>
      </div>

      <nav role="navigation" aria-label="Game controls">
        <ErrorBoundary>
          <GameControls />
        </ErrorBoundary>
      </nav>

      <ErrorBoundary>
        <GameEndModal onRestart={resetGame} showStats={true} />
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
      }}
    >
      <GameProvider>
        <AppContent />
      </GameProvider>
    </ErrorBoundary>
  );
}

export default App;
