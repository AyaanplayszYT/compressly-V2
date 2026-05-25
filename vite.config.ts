import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // for electron file:/// relative paths
  root: 'renderer',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
