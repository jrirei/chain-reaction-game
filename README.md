# Chain Reaction Game

A web-based implementation of the classic "Chain Reaction" game built with React and TypeScript.

## Game Rules

Players take turns placing orbs on a grid. When a cell reaches critical mass, it explodes and spreads orbs to adjacent cells, potentially triggering chain reactions. The last player with orbs on the board wins!

- **Grid**: 9x6 grid of cells (adjustable)
- **Players**: 2-8 players (default: 2)
- **Critical Mass**: Corner cells (2), Edge cells (3), Interior cells (4)
- **Victory**: Last player with orbs remaining wins

## Development

### Getting Started

```bash
npm install
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS Modules
- **State Management**: React Context + useReducer
- **Code Quality**: ESLint + Prettier + Husky

## Project Structure

```
src/
├── components/          # React components
├── hooks/              # Custom hooks
├── context/            # React context providers
├── types/              # TypeScript type definitions
├── utils/              # Utility functions and constants
├── styles/             # Global styles and CSS variables
└── __tests__/          # Test files
```
