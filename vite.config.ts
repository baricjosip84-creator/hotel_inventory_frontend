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
 *
 * Phase 17 Step 577:
 * Adds explicit frontend performance-budget controls so the commercial shell has
 * predictable production bundles before deeper route-level lazy loading work.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 750,
    cssCodeSplit: true,
    reportCompressedSize: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }

          if (id.includes('/react-router') || id.includes('/@remix-run/')) {
            return 'vendor-router';
          }

          if (id.includes('/@tanstack/react-query/')) {
            return 'vendor-query';
          }

          if (id.includes('/html5-qrcode/') || id.includes('/bcrypt/')) {
            return 'vendor-scanner';
          }

          return 'vendor-shared';
        }
      }
    }
  },
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
