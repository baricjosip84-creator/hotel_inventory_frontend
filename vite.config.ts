import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config
 *
 * IMPORTANT:
 * - Frontend runs on port 5173
 * - Any request to /api is proxied to the local backend on port 3000
 * - This removes the need to hardcode random LAN IPs in frontend code
 * - It also avoids local CORS headaches during development
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