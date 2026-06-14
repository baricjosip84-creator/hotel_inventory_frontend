import { spawnSync } from 'node:child_process';
import process from 'node:process';

function fail(message) {
  throw new Error(`Unified AI frontend contract suite failed: ${message}`);
}

function run(scriptName, backendRoot = null) {
  const args = ['run', scriptName];
  const env = { ...process.env };
  if (backendRoot) {
    args.push('--', backendRoot);
    env.BACKEND_ROOT = backendRoot;
  }

  const result = spawnSync('npm', args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env
  });

  if (result.error) fail(`${scriptName} errored: ${result.error.message}`);
  if (result.status !== 0) fail(`${scriptName} exited with status ${result.status}`);
}

function resolveBackendRoot(argv) {
  if (process.env.BACKEND_ROOT) return process.env.BACKEND_ROOT;
  const flagIndex = argv.indexOf('--backend-root');
  if (flagIndex !== -1) return argv[flagIndex + 1];
  return argv[2];
}

function isManagedFrontendBuildWithoutBackendRoot() {
  return process.env.VERCEL === '1' || process.env.VERCEL === 'true';
}

const backendRoot = resolveBackendRoot(process.argv);
const hasBackendRoot = Boolean(backendRoot && backendRoot !== '--backend-root');

run('check:unified-ai-panel-anchor-contract');
run('check:unified-ai-response-type-contract');
run('check:vercel-api-base-url');

if (!hasBackendRoot) {
  if (!isManagedFrontendBuildWithoutBackendRoot()) {
    fail('backend root argument or BACKEND_ROOT environment variable is required outside managed frontend-only deployment builds');
  }
  console.log('Unified AI frontend contract suite passed in managed frontend-only deployment mode; backend-dependent route and cross-repo checks were skipped because no backend checkout is available.');
  process.exit(0);
}

run('check:unified-ai-route-fetch-contract', backendRoot);
run('check:unified-ai-cross-repo-contract', backendRoot);

console.log('Unified AI frontend contract suite passed with explicit backend root forwarding.');
