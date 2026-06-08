import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const productionEnvPath = path.join(projectRoot, '.env.production');
const exampleEnvPath = path.join(projectRoot, '.env.example');
const packageJsonPath = path.join(projectRoot, 'package.json');

function fail(message) {
  console.error(`[production-env-governance] ${message}`);
  process.exit(1);
}

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${path.relative(projectRoot, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

const productionEnv = readRequired(productionEnvPath);
const exampleEnv = readRequired(exampleEnvPath);
const packageJson = JSON.parse(readRequired(packageJsonPath));

const committedBackendUrlPattern = /^\s*VITE_API_BASE_URL\s*=\s*https?:\/\//m;
if (committedBackendUrlPattern.test(productionEnv)) {
  fail('.env.production must not commit a concrete http(s) backend URL. Use deployment environment variables instead.');
}

if (!/^\s*VITE_API_BASE_URL\s*=\s*\/api\s*$/m.test(productionEnv)) {
  fail('.env.production must keep only the safe /api fallback for local/static production builds.');
}

if (!/deployment provider environment/i.test(productionEnv)) {
  fail('.env.production must document that real production backend URLs belong in deployment provider environment settings.');
}

if (!/VITE_API_BASE_URL=https:\/\/<backend-host>\/api/.test(exampleEnv)) {
  fail('.env.example must show a placeholder production backend URL, not a real deployment URL.');
}

if (exampleEnv.includes('hotel-inventory-backend.onrender.com')) {
  fail('.env.example must not contain the concrete Render backend URL.');
}

if (packageJson.scripts?.['check:production-env-governance'] !== 'node scripts/check-production-env-governance.mjs') {
  fail('package.json must expose check:production-env-governance.');
}

console.log('[production-env-governance] OK');
