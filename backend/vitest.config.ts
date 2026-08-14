import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests must never depend on a live Ollama instance: force the LLM
    // layer off. LLM tests re-enable it per-test and mock global fetch.
    env: {
      LLM_ENABLED: 'false',
    },
  },
});
