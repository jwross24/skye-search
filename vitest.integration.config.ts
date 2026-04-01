import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['**/*.integration.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    globals: true,
    // No happy-dom — integration tests don't render components
    environment: 'node',
    // Longer timeout for real DB operations
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Serial execution — shared DB state (Vitest 4: top-level, no poolOptions)
    pool: 'forks',
    maxWorkers: 1,
    fileParallelism: false,
    // .env.local loaded by test helpers, not by vitest
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
