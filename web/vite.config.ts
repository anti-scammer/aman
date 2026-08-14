import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Test configuration lives in vitest.config.ts, which extends this.
export default defineConfig({
  plugins: [react()],
})
