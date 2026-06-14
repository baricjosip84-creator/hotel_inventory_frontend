import { spawnSync } from 'node:child_process';
import process from 'node:process';

function fail(message) {
  throw new Error(`Unified AI frontend contract suite failed: ${message}`);
}

function run(scriptName, backendRoot) {
  const result = spawnSync('npm', ['run', scriptName, '--', backendRoot], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, BACKEND_ROOT: backendRoot }
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

const backendRoot = resolveBackendRoot(process.argv);
if (!backendRoot || backendRoot === '--backend-root') {
  fail('backend root argument or BACKEND_ROOT environment variable is required');
}

run('check:unified-ai-panel-anchor-contract', backendRoot);
run('check:unified-ai-response-type-contract', backendRoot);
run('check:unified-ai-route-fetch-contract', backendRoot);
run('check:unified-ai-cross-repo-contract', backendRoot);

console.log('Unified AI frontend contract suite passed with explicit backend root forwarding.');
