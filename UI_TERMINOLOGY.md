# UI Layout Terminology Reference

This document defines the standard terminology used throughout the Chain Reaction Game codebase for UI components and layout areas.

## Core UI Areas

### 🎮 Game Panel
- **Location**: Top section of the game interface
- **Description**: The upper panel containing game status information, including the "Current player:" label, game timer, move counter, and current game state indicators
- **Component**: `GameInfo` component
- **CSS Classes**: `.gamePanel`, `.game-info`

### 👥 Players Panel  
- **Location**: Left side of the game interface
- **Description**: The container panel that holds all individual player panels. This is the collective area displaying all players' information in a vertical list or grid layout
- **Component**: `PlayersList` or Players container
- **CSS Classes**: `.playersPanel`, `.players-list`

### 👤 Player Panel
- **Location**: Individual sections within the Players Panel
- **Description**: Each individual player's information box/card displaying player name, color indicator, orb count, move count, status (current/waiting/eliminated), and AI strategy if applicable
- **Component**: `PlayerInfo` component  
- **CSS Classes**: `.playerPanel`, `.player-info`

### 🗺️ Map
- **Location**: Central/right area of the game interface
- **Description**: The interactive game board grid containing all clickable cells where players place orbs. This is the main playing area with the 6×9 grid of cells
- **Components**: `GameBoard` component containing `Cell` components
- **CSS Classes**: `.map`, `.game-board`, `.board-grid`

## Layout Overview

```
┌─────────────────────────────────────────┐
│             Game Panel                  │
│    (Current player, status, etc.)      │
├─────────────────┬───────────────────────┤
│   Players       │                       │
│   Panel         │         Map           │
│                 │   (Game Board Grid)   │
│ ┌─────────────┐ │                       │
│ │Player Panel │ │    ┌─┬─┬─┬─┬─┬─┬─┬─┬─┐│
│ │   (P1)      │ │    │ │ │ │ │ │ │ │ │ ││
│ └─────────────┘ │    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤│
│ ┌─────────────┐ │    │ │ │ │ │ │ │ │ │ ││
│ │Player Panel │ │    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤│
│ │   (P2)      │ │    │ │ │ │ │ │ │ │ │ ││
│ └─────────────┘ │    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤│
│ ┌─────────────┐ │    │ │ │ │ │ │ │ │ │ ││
│ │Player Panel │ │    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤│
│ │   (P3)      │ │    │ │ │ │ │ │ │ │ │ ││
│ └─────────────┘ │    └─┴─┴─┴─┴─┴─┴─┴─┴─┘│
│                 │                       │
└─────────────────┴───────────────────────┘
```

*Note: The exact layout may vary based on screen size and responsive design*

## Usage Guidelines

### Code Standards
- **Comments**: Always use these standard terms in code comments and documentation
- **Component Names**: Component names should reflect their role (e.g., `GameInfo` for Game Panel)
- **CSS Classes**: Use consistent naming patterns:
  - `.gamePanel` / `.game-panel`
  - `.playersPanel` / `.players-panel`  
  - `.playerPanel` / `.player-panel`
  - `.map` / `.game-board`

### Documentation Standards
- **PR Descriptions**: Reference these terms when describing UI changes
- **Test Files**: Use these terms for clarity in test descriptions
- **Bug Reports**: Use consistent terminology when reporting UI issues

### Examples

#### ✅ Good Usage
```typescript
// Update the Game Panel to show winner information
const GamePanel: React.FC = () => {
  // Game Panel logic here
};

// Style the Players Panel container
.playersPanel {
  display: flex;
  flex-direction: column;
}

// Test Player Panel highlighting
test('should highlight current Player Panel', () => {
  // Test logic here
});
```

#### ❌ Avoid These Terms
- "Top bar" → Use **Game Panel**
- "Sidebar" → Use **Players Panel**  
- "Player card/box" → Use **Player Panel**
- "Game board" → Use **Map** (when referring to the grid area specifically)

## File Locations

- **Visual Reference**: `src/components/DesignShowcase/DesignShowcase.tsx`
- **This Document**: `UI_TERMINOLOGY.md` (project root)
- **Component Examples**:
  - Game Panel: `src/components/GameInfo/`
  - Players Panel: `src/components/PlayersList/` 
  - Player Panel: `src/components/PlayerInfo/`
  - Map: `src/components/GameBoard/`

---

**Last Updated**: August 14, 2025  
**Version**: 1.0  
**Purpose**: Standardize UI terminology across the Chain Reaction Game codebase