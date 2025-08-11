# Chain Reaction Game

<div align="center">

![Chain Reaction Game](https://img.shields.io/badge/React-18+-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![CI](https://github.com/jrirei/chain-reaction-game/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/jrirei/chain-reaction-game/branch/main/graph/badge.svg)](https://codecov.io/gh/jrirei/chain-reaction-game)
![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A modern, web-based implementation of the classic "Chain Reaction" game built with React and TypeScript**

[🎮 Play Online](#getting-started) • [📖 Documentation](#game-rules) • [🚀 Features](#features) • [🛠️ Development](#development)

</div>

## ✨ Features

- 🎯 **Complete Game Mechanics** - Full implementation of orb placement, explosions, and chain reactions
- 🎨 **Smooth Animations** - Polished explosion effects with proper timing
- 📊 **Statistics Tracking** - Comprehensive game and player performance metrics
- 🎮 **2-4 Player Support** - Local multiplayer with distinct player colors
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- ⚡ **Fast & Modern** - Built with Vite for lightning-fast development and builds
- 🧪 **Comprehensive Testing** - Full test suite with 205/205 tests passing
- 🔧 **TypeScript** - Full type safety with strict mode enabled
- 🎨 **CSS Modules** - Scoped styling for maintainable component styles

## 🎮 Game Rules

Players take turns placing orbs on a grid. When a cell reaches **critical mass**, it explodes and spreads orbs to adjacent cells, potentially triggering spectacular chain reactions!

### Core Mechanics

- **🎯 Grid**: 6×9 grid of cells (default; configurable)
- **👥 Players**: 2-4 players with unique colors
- **💥 Critical Mass**: 
  - Corner cells: 2 orbs
  - Edge cells: 3 orbs  
  - Interior cells: 4 orbs
- **🏆 Victory**: Last player with orbs on the board wins
- **⚡ Chain Reactions**: Explosions can trigger cascading effects across the board

### How to Play

1. **Place Orbs**: Click on any empty cell or cell you own to place an orb
2. **Trigger Explosions**: When a cell reaches critical mass, it explodes
3. **Chain Reactions**: Explosions spread orbs to adjacent cells, potentially causing more explosions
4. **Eliminate Opponents**: Take over opponent orbs by exploding into their cells
5. **Win the Game**: Be the last player with orbs remaining on the board

## 🚀 Getting Started

### Quick Start

```bash
# Clone the repository
git clone https://github.com/jrirei/chain-reaction-game.git
cd chain-reaction-game

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to play the game!

### Build for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

## 🛠️ Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run test suite with Vitest |
| `npm run test:ui` | Run tests with UI interface |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run ci` | Run complete CI pipeline locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

### Tech Stack

- **⚛️ Frontend**: React 18+ with TypeScript
- **⚡ Build Tool**: Vite 5+ for fast builds and HMR
- **🎨 Styling**: CSS Modules with responsive design
- **🔄 State Management**: React Context + useReducer pattern
- **🧪 Testing**: Vitest with comprehensive coverage
- **🔍 Code Quality**: ESLint + Prettier + Husky pre-commit hooks
- **📦 Package Manager**: npm with lock file for consistent installs

### Project Structure

```
src/
├── components/          # React components
│   ├── GameBoard/      # Main game board component
│   ├── Cell/           # Individual cell component
│   ├── GameStats/      # Statistics display
│   └── ...
├── hooks/              # Custom React hooks
├── context/            # React context providers
├── types/              # TypeScript type definitions
├── utils/              # Game logic and utilities
│   ├── gameLogic.ts    # Core game mechanics
│   ├── gameReducer.ts  # State management
│   └── __tests__/      # Test files
└── styles/             # Global styles and CSS variables
```

## 🧪 Testing

The project includes a comprehensive test suite covering all game mechanics:

```bash
npm run test          # Run all tests
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

**Current Status**: ✅ 205/205 tests passing, 30.95% coverage (30% threshold enforced)

### Test Categories

- **🎯 Core Game Logic** - Orb placement, explosions, chain reactions
- **🔄 State Management** - Game state updates and transitions  
- **🎨 Animation System** - Timing and visual effects
- **🏆 Win/Lose Detection** - Game ending conditions
- **📊 Statistics Tracking** - Performance metrics
- **🐛 Bug Prevention** - Edge cases and regression tests

## 🤝 Contributing

Contributions are welcome! This project follows standard open source practices:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style (ESLint + Prettier configured)
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the classic Chain Reaction game
- Built with modern web technologies
- Developed with assistance from Claude AI

## 📊 Project Status

- ✅ **MVP Complete** - All core features implemented
- ✅ **Production Ready** - Fully tested and optimized
- ✅ **Open Source** - MIT licensed for community use
- 🔄 **Active Development** - Accepting contributions and feature requests

---

<div align="center">

**[⭐ Star this repository](https://github.com/jrirei/chain-reaction-game) if you found it helpful!**

Made with ❤️ and modern web technologies

</div>
