import { defineConfig, mergeConfig } from 'vitest/config'
// Explicit .ts extension: tsconfig.node.json uses nodenext resolution with
// allowImportingTsExtensions.
import viteConfig from './vite.config.ts'

// Kept separate from vite.config.ts so the production build never has to load
// the test toolchain (and so `tsc -b` typechecks each with the right types).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      },
    },
  })
)
