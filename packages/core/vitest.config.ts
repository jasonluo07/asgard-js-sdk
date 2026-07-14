import { defineConfig } from 'vitest/config';
import * as path from 'path';

// Unit-test config for @asgard-js/core (framework-agnostic logic → node environment).
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
