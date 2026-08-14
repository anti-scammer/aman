import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Each test starts from a clean DOM, empty storage, and no leftover fetch stub.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  // The app reads the saved language on mount; pin it so assertions are
  // deterministic regardless of test order.
  document.documentElement.lang = ''
  document.documentElement.dir = ''
})
