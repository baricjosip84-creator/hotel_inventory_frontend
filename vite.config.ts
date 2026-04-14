import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Local dev:
 * - frontend runs on 5173
 * - /api is proxied to local backend on 3000
 *
 * Production:
 * - Vercel build uses .env.production
 * - no proxy there, just real backend URL
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  }
});