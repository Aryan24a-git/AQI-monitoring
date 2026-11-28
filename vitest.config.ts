import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
    },
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts', 'src/server/**/*.ts'],
      thresholds: {
        lines: 88,
        functions: 87,
        branches: 73,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
