import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const executable = join(dirname(fileURLToPath(import.meta.url)), 'check-deployment-api-config.mjs');
const cases = [
  ['local fallback allowed only locally', { VERCEL_ENV: '', VITE_API_BASE_URL: '/api' }, 0],
  ['production missing endpoint blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: '' }, 1],
  ['production fallback blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: '/api' }, 1],
  ['preview fallback blocked', { VERCEL_ENV: 'preview', VITE_API_BASE_URL: '/api' }, 1],
  ['placeholder hostname blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: 'https://<backend-host>/api' }, 1],
  ['HTTP endpoint blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: 'http://example.onrender.com/api' }, 1],
  ['local endpoint blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: 'https://localhost/api' }, 1],
  ['missing /api suffix blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: 'https://example.onrender.com/' }, 1],
  ['query parameter blocked', { VERCEL_ENV: 'production', VITE_API_BASE_URL: 'https://example.onrender.com/api?secret=abc' }, 1],
  ['valid production endpoint accepted', { VERCEL_ENV: 'production', VITE_API_BASE_URL: 'https://example.onrender.com/api' }, 0],
  ['valid preview endpoint accepted', { VERCEL_ENV: 'preview', VITE_API_BASE_URL: 'https://example.onrender.com/api/' }, 0],
  ['explicit hosted validation blocks local mode', { VERCEL_ENV: '', INVENTORY_REQUIRE_EXTERNAL_API_URL: '1', VITE_API_BASE_URL: '/api' }, 1]
];
let count = 0;
for (const [label, envUpdate, exitCode] of cases) {
  const env = { ...process.env, VERCEL_ENV: '', INVENTORY_REQUIRE_EXTERNAL_API_URL: '', VITE_API_BASE_URL: '', ...envUpdate };
  const result = spawnSync(process.execPath, [executable], { env, encoding: 'utf8' });
  assert.equal(result.status, exitCode, `${label}: ${result.stdout}\n${result.stderr}`);
  count++;
}
console.log(`Vercel API deployment configuration: ${count}/${count} tests PASS`);
