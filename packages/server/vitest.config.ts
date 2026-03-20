import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    exclude: ['dist/**', 'node_modules/**'],
  },
})
