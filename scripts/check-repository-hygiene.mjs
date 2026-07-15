import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  '.env.example', '.gitignore', 'package.json', 'package-lock.json', 'SECURITY.md',
  '.github/workflows/frontend-validation.yml', '.github/dependabot.yml'
];
const forbiddenTrackedPatterns = [
  /^\.env$/, /^\.env\.(?!example$|production$|[^/]+\.example$)/,
  /(^|\/)node_modules\//, /(^|\/)coverage\//, /(^|\/)dist\//,
  /(^|\/)test-results\//, /(^|\/)playwright-report\//,
  /(^|\/)\.git\/workflows\//, /\.zip$/i, /(^|\/)npm-debug\.log/i
];

const result = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
const tracked = result.status === 0 && result.stdout
  ? result.stdout.split('\0').filter(Boolean).map((file) => file.replace(/\\/g, '/'))
  : [];
const errors = [];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) errors.push(`missing required file: ${relative}`);
}
for (const file of tracked) {
  if (!fs.existsSync(path.join(root, file))) continue;
  if (forbiddenTrackedPatterns.some((pattern) => pattern.test(file))) errors.push(`forbidden tracked artifact: ${file}`);
}
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
['node_modules/', 'dist/', '.env', '.env.*', 'test-results/', 'playwright-report/', '*.zip'].forEach((token) => {
  if (!gitignore.includes(token)) errors.push(`.gitignore must include: ${token}`);
});
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['security:scan', 'repo:hygiene', 'security:check', 'typecheck', 'lint:pilot-critical', 'package:stage']) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json is missing script: ${script}`);
}
if (errors.length) {
  console.error('Frontend repository hygiene check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Frontend repository hygiene check passed${tracked.length ? ` (${tracked.length} tracked files inspected)` : ''}.`);
