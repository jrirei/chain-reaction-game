# Test Coverage Configuration

This project uses Vitest for testing with V8 coverage reporting. Different modules have different coverage requirements based on their criticality and complexity.

## Coverage Thresholds

### Global Minimum (30%)
All files must maintain at least 30% coverage across all metrics:
- Statements: 30%
- Branches: 30% 
- Functions: 30%
- Lines: 30%

### Per-Folder Thresholds

#### AI Module (`src/ai/**`) - High Standards (90%+)
The AI system is critical game logic that must be thoroughly tested:
- **Statements**: 90%
- **Lines**: 90%
- **Branches**: 90%
- **Functions**: 85%

**Current Status**: ✅ **93.08%** coverage achieved (exceeds requirements)

#### Core Engine (`src/core/**`) - High Standards (85%+)
The core game engine contains fundamental game logic:
- **Statements**: 85%
- **Lines**: 85%
- **Branches**: 85%
- **Functions**: 80%

**Current Status**: ✅ **92.59%** coverage achieved (exceeds requirements)

## Running Coverage Tests

```bash
# Run all tests with coverage
npm test -- --coverage

# Run coverage for specific modules
npm test -- --coverage src/ai/
npm test -- --coverage src/core/

# Generate HTML coverage reports
npm test -- --coverage --reporter=html
```

## Coverage Reports

Coverage reports are generated in multiple formats:
- **Text**: Console output during test runs
- **LCOV**: For CI/CD integration (`coverage/lcov-report/`)
- **HTML**: Detailed browsable reports (`coverage/index.html`)

## Test Organization

### AI Module Tests
- `src/ai/__tests__/botRunner.test.ts` - AI orchestration (16 tests)
- `src/ai/__tests__/config.test.ts` - AI configuration (21 tests)  
- `src/ai/__tests__/defaultBot.comprehensive.test.ts` - Default strategy (24 tests)
- `src/ai/__tests__/monteCarloBot.test.ts` - MCTS algorithm (10 tests)
- `src/ai/__tests__/randomBot.test.ts` - Random strategy (7 tests)
- `src/ai/__tests__/registry.test.ts` - Strategy factory (9 tests)
- `src/ai/__tests__/rng.test.ts` - Random number generation (10 tests)
- `src/ai/__tests__/triggerBot.test.ts` - Trigger strategy (6 tests)

### Test Helpers
- `src/utils/__tests__/testHelpers.ts` - Shared test utilities for creating game states and mock data

## Quality Gates

Coverage thresholds serve as quality gates:
- ❌ Builds fail if coverage drops below module-specific thresholds
- ✅ High-coverage modules (AI, Core) ensure game stability
- 🔧 Test helpers and utilities support comprehensive testing

This tiered approach ensures critical game logic is thoroughly tested while maintaining reasonable standards for UI components.