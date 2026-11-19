import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        grass: resolve(import.meta.dirname, 'grass.html'),
      },
    },
  },
});
