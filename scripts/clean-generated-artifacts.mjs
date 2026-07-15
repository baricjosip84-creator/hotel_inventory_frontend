import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedPaths = ['test-results', 'playwright-report', 'coverage', 'dist'];

function removeTrackedGeneratedPaths() {
  const gitDir = path.join(root, '.git');
  if (!fs.existsSync(gitDir)) return [];

  const tracked = spawnSync('git', ['ls-files', '-z', '--', ...generatedPaths], {
    cwd: root,
    encoding: 'utf8'
  });
  if (tracked.status !== 0 || !tracked.stdout) return [];

  const files = tracked.stdout.split('\0').filter(Boolean);
  if (!files.length) return [];

  const removed = spawnSync('git', ['rm', '-r', '-f', '--ignore-unmatch', '--', ...generatedPaths], {
    cwd: root,
    encoding: 'utf8'
  });
  if (removed.status !== 0) {
    throw new Error((removed.stderr || removed.stdout || 'Unable to remove tracked generated artifacts').trim());
  }
  return files;
}

try {
  const trackedFiles = removeTrackedGeneratedPaths();
  for (const relative of generatedPaths) {
    fs.rmSync(path.join(root, relative), { recursive: true, force: true });
  }
  const suffix = trackedFiles.length
    ? ` and staged ${trackedFiles.length} tracked generated file(s) for deletion`
    : '';
  console.log(`Generated frontend artifacts removed${suffix}.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
