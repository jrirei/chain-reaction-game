# Chain Reaction Game - Architecture Documentation

> **For AI Assistants**: This document provides comprehensive architecture overview to minimize context needed for code understanding and modifications.

## 🏗️ Project Overview

Chain Reaction is a strategic board game where players place orbs to trigger chain reactions. The codebase is organized into focused modules with clear separation of concerns.

### Key Design Principles
- **Separation of Concerns**: Focused contexts, utilities, and components
- **Performance**: Optimized AI algorithms and efficient state management  
- **Maintainability**: Consolidated logic, minimal duplication
- **Extensibility**: Plugin-based AI system, configurable components

---

## 📁 Directory Structure

```
src/
├── ai/                     # AI Bot System
│   ├── sharedEvaluation.ts  # 🔥 Centralized move evaluation logic
│   ├── optimizedMonteCarloBot.ts # 🔥 High-performance MCTS with optimizations
│   ├── defaultBot.ts        # Basic strategic AI
│   ├── monteCarloBot.ts     # Standard MCTS implementation
│   ├── oskarBot.ts         # Advanced heuristic AI with minimax
│   ├── triggerBot.ts       # Aggressive explosion-focused AI
│   ├── randomBot.ts        # Random move selection
│   ├── registry.ts         # AI factory and discovery system
│   ├── types.ts           # AI interfaces and type definitions
│   └── constants.ts       # AI configuration and display info
├── context/               # 🔥 React Context System (Refactored)
│   ├── GameProvider.tsx    # 🔥 Root provider combining all contexts
│   ├── GameStateContext.tsx # 🔥 Core state management
│   ├── PlayerContext.tsx   # 🔥 Player calculations and stats
│   ├── BoardContext.tsx    # 🔥 Board operations and validation
│   └── GameContext.tsx     # 🔨 Legacy context (deprecated)
├── utils/                 # Core Utilities
│   ├── boardIterators.ts   # 🔥 Centralized board iteration patterns
│   ├── boardAnalysis.ts    # 🔥 High-level board analysis functions
│   ├── boardOperations.ts  # Basic board manipulation
│   ├── gameReducer.ts     # Game state reducer logic
│   └── constants.ts       # Game constants and configuration
├── components/            # React UI Components
│   ├── GameBoard/         # Main game board component
│   ├── PlayerList/        # Player information display
│   ├── GameControls/      # Game control buttons
│   └── GameSetup/         # Game initialization interface
├── styles/               # 🔥 Styling System (Consolidated)
│   ├── variables.css      # 🔥 Centralized theme variables
│   └── globals.css        # Global styles
├── types/                # TypeScript Definitions
│   ├── game.ts           # Core game types
│   └── player.ts         # Player-related types
└── hooks/                # Custom React Hooks
    ├── useGameState.ts   # Game state management
    ├── useAiTurn.ts      # AI move execution
    └── useTheme.ts       # Theme management

🔥 = Recently refactored/optimized
🔨 = Deprecated/legacy code
```

---

## 🎯 Core Architecture Patterns

### 1. Context-Based State Management

**New Focused System** (Use This):
```typescript
// Root provider combining all contexts
<GameProvider>
  <App />
</GameProvider>

// Individual hooks for specific needs
const { gameState, dispatch } = useGameState();      // State management
const { players, currentPlayer } = usePlayer();      // Player data  
const { canMakeMove } = useBoard();                  // Board operations
```

**Legacy System** (Being Phased Out):
```typescript
// Old monolithic context - avoid for new code
const gameContext = useGameContext(); // Contains everything
```

### 2. AI Strategy System

**Plugin Architecture**:
```typescript
// All AIs implement this interface
interface AiStrategy {
  readonly name: AiStrategyName;
  decideMove(state: GameState, legalMoves: Move[], ctx: AiContext): Promise<Move>;
}

// Centralized evaluation (eliminates duplication)
import { sharedEvaluator, AGGRESSIVE_EVALUATION } from './sharedEvaluation';
const score = sharedEvaluator.evaluateMove(state, move, AGGRESSIVE_EVALUATION);
```

**Available AI Strategies**:
- `optimizedMonteCarlo` - **Recommended**: Advanced MCTS with optimizations
- `monteCarlo` - Standard Monte Carlo Tree Search
- `oskar` - Minimax with heuristic evaluation
- `default` - Balanced strategic play
- `trigger` - Aggressive explosion-focused
- `random` - Random moves

### 3. Board Operations System

**Centralized Iteration** (Use This):
```typescript
import { forEachCell, findCells, countCells } from '../utils/boardIterators';
import { analyzeBoardState, countPlayerOrbs } from '../utils/boardAnalysis';

// Instead of manual loops:
// for (let row = 0; row < board.rows; row++) { ... }

// Use utilities:
const playerOrbs = countPlayerOrbs(board, playerId);
const analysis = analyzeBoardState(board);
const criticalCells = findCells(board, cell => cell.orbCount >= cell.criticalMass);
```

---

## 🔄 Data Flow Architecture

### Game State Flow
```
User Action → Dispatch → GameReducer → State Update → Context → Components
                ↓
            AI Turn Hook → AI Strategy → Move Decision → Dispatch
```

### AI Decision Flow  
```
Game State → Legal Moves → AI Strategy
    ↓
Shared Evaluator → Move Scores → Best Move Selection
    ↓
Optimizations (Transposition Tables, Move Ordering, etc.)
```

### Component Update Flow
```
Context Change → Hook Updates → Component Re-render (Only Affected Components)
```

---

## 🚀 Performance Optimizations

### 1. AI Performance
- **Shared Evaluation Logic**: Eliminates duplicated move evaluation across AIs
- **Transposition Tables**: Caches position evaluations in optimizedMonteCarloBot
- **Move Ordering**: Prioritizes promising moves first
- **Progressive Widening**: Focuses search on most promising branches
- **Early Termination**: Stops evaluation for clear positions

### 2. React Performance  
- **Focused Contexts**: Components subscribe only to needed data
- **Memoized Calculations**: Player stats, board analysis cached appropriately
- **Efficient Re-renders**: Split contexts prevent unnecessary updates

### 3. CSS Performance
- **Consolidated Variables**: Centralized theme system reduces duplication
- **Efficient Selectors**: Streamlined CSS with minimal redundancy

---

## 🎨 Theming System

**Centralized Theme Variables**:
```css
/* src/styles/variables.css - Single source of truth */
:root {
  /* Base colors */
  --accent-color: #646cff;
  --error-color: #ef4444;
  
  /* Theme-specific colors (automatically switch based on system preference) */
  --primary-bg: #1a1a1a;    /* Dark theme default */
  --text-primary: #ffffff;
  
  /* Player panel colors */
  --current-player-bg: rgba(78, 205, 196, 0.1);
  --player-orb-border: rgba(255, 255, 255, 0.4);
}

/* Light theme overrides */
@media (prefers-color-scheme: light) {
  :root:not([data-theme='dark']):not([data-theme='light']) {
    --primary-bg: #ffffff;
    --text-primary: #212529;
    /* ... other overrides */
  }
}
```

---

## 🧪 Testing Strategy

### AI Testing
```typescript
// Use seeded RNG for deterministic tests
const ctx: AiContext = {
  rng: seedRandom(12345),
  maxThinkingMs: 1000
};

const move = await aiStrategy.decideMove(state, legalMoves, ctx);
```

### Component Testing
```typescript
// Test individual contexts in isolation
render(
  <GameStateProvider>
    <TestComponent />
  </GameStateProvider>
);
```

---

## 🔧 Common Development Patterns

### Adding New AI Strategy
1. Create new class implementing `AiStrategy`
2. Add to `AiStrategyName` type in `types.ts`
3. Register in `registry.ts` with factory function
4. Add display info to `constants.ts`
5. Use `sharedEvaluator` for move evaluation

### Adding New Board Analysis
1. Add function to `boardAnalysis.ts` 
2. Use existing `boardIterators.ts` utilities
3. Export for use across codebase
4. Update type definitions if needed

### Modifying Game State
1. Add action to `GameAction` type
2. Handle in `gameReducer.ts`
3. Dispatch from appropriate context
4. Components will auto-update via hooks

---

## 📈 Metrics and Monitoring

### Performance Metrics
- AI thinking times tracked in `BotTurnResult`
- MCTS iterations counted in optimized bots
- Memory usage monitored via transposition table size

### Debug Information
- Console logging for AI decision-making (when debug enabled)
- Game stats tracking (moves, time, player statistics)
- Error boundaries for component crash recovery

---

## 🔮 Future Enhancement Areas

### High Impact
1. **Neural Network AI**: Train models on game positions
2. **Opening Book**: Pre-computed optimal early moves  
3. **Endgame Tables**: Perfect play for simplified positions
4. **Multi-threading**: Parallel AI computation
5. **Advanced UI**: Move hints, analysis tools

### Architecture Improvements
1. **Redux Migration**: For complex state management
2. **WebWorkers**: Offload AI computation
3. **Persistent Storage**: Save game history, preferences
4. **Network Play**: Multiplayer capabilities
5. **Plugin System**: User-contributed AIs

---

## ⚡ Quick Reference for AI Assistants

### Most Important Files to Understand
1. `src/ai/sharedEvaluation.ts` - Centralized AI logic
2. `src/context/GameProvider.tsx` - State management system
3. `src/utils/boardIterators.ts` - Board operation patterns
4. `src/types/game.ts` - Core type definitions
5. `src/ai/registry.ts` - AI system registration

### Common Tasks
- **Add AI**: Implement `AiStrategy`, register in `registry.ts`
- **Modify Game Rules**: Update `gameReducer.ts` and types
- **UI Changes**: Use focused context hooks, avoid legacy `useGameContext`
- **Performance**: Use existing utilities instead of manual loops
- **Styling**: Use centralized CSS variables in `styles/variables.css`

### Code Quality Guidelines  
- Use existing utilities before creating new ones
- Prefer focused contexts over monolithic state
- Follow established patterns for consistency
- Add comprehensive TypeScript types
- Use shared evaluation logic for AI implementations

This architecture provides a solid foundation for extensible, maintainable, and high-performance game development. The refactored system significantly reduces code duplication and improves performance through focused optimizations.