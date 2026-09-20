import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        // Overridable so the Worker can be moved off 8787 when that port is taken.
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8787/',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Fixtures live outside the client workspace so server-side tests can
      // share them; see ARCHITECTURE_GUIDE.md.
      '@tests': fileURLToPath(new URL('../tests', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    css: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
