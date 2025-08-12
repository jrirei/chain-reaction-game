import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'dist/',
        'coverage/',
        'public/',
        '**/*.d.ts',
      ],
      thresholds: {
        // Global minimum thresholds (30%)
        branches: 30,
        functions: 30,
        lines: 30,
        statements: 30,
        autoUpdate: false,
        
        // Per-folder coverage thresholds
        'src/ai/**': {
          branches: 90,
          functions: 85,
          lines: 90,
          statements: 90,
        },
        'src/core/**': {
          branches: 85,
          functions: 80,
          lines: 85,
          statements: 85,
        },
      },
      reportOnFailure: true,
      all: true,
    },
  },
});
