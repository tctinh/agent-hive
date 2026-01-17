import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['hive-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = '@opentui/solid';
  },
});
