#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const viteConfig = read('vite.config.ts');
const packageJson = JSON.parse(read('package.json'));
const docs = read('docs/PHASE17_STEP577_FRONTEND_PERFORMANCE_BUDGET.md');

const failures = [];

const requiredViteSignals = [
  'chunkSizeWarningLimit',
  'reportCompressedSize: true',
  'sourcemap: false',
  'manualChunks',
  'vendor-react',
  'vendor-router',
  'vendor-query',
  'vendor-scanner',
  'vendor-shared'
];

for (const signal of requiredViteSignals) {
  if (!viteConfig.includes(signal)) {
    failures.push(`vite.config.ts is missing frontend performance budget signal: ${signal}`);
  }
}

if (packageJson.scripts?.['check:frontend-performance-budget'] !== 'node scripts/check-frontend-performance-budget.mjs') {
  failures.push('package.json is missing check:frontend-performance-budget script.');
}

for (const docSignal of ['bundle warning budget', 'manual chunk', 'route-level lazy loading', 'npm run check:frontend-performance-budget']) {
  if (!docs.includes(docSignal)) {
    failures.push(`frontend performance budget doc is missing guidance: ${docSignal}`);
  }
}

if (failures.length > 0) {
  console.error('Frontend performance budget check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Frontend performance budget check passed.');
