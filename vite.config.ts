import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const firstNonEmpty = (...values: Array<string | undefined>): string | null => {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return null;
};

function deploymentVersionPlugin(): Plugin {
  return {
    name: 'deployment-version-metadata',
    apply: 'build',
    generateBundle() {
      const payload = {
        service: 'hotel-inventory-frontend',
        git_commit: firstNonEmpty(
          process.env.VERCEL_GIT_COMMIT_SHA,
          process.env.GITHUB_SHA,
          process.env.SOURCE_VERSION
        ),
        git_branch: firstNonEmpty(
          process.env.VERCEL_GIT_COMMIT_REF,
          process.env.GITHUB_REF_NAME
        ),
        built_at: new Date().toISOString()
      };

      this.emitFile({
        type: 'asset',
        fileName: 'deployment-version.json',
        source: `${JSON.stringify(payload, null, 2)}\n`
      });
    }
  };
}

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
  plugins: [react(), deploymentVersionPlugin()],
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
