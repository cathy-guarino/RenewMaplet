import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The Worker route is exercised through Hono's `app.request`, so Node is
    // enough; upstream `fetch` is stubbed per test.
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
