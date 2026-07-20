import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredFiles = [
  '.env.example', '.gitignore', 'package.json', 'package-lock.json', 'SECURITY.md',
  '.github/workflows/frontend-validation.yml', '.github/dependabot.yml', 'tsconfig.pilot-critical.json'
];
const forbiddenTrackedPatterns = [
  /^\.env$/, /^\.env\.(?!example$|production$|[^/]+\.example$)/,
  /(^|\/)node_modules\//, /(^|\/)coverage\//, /(^|\/)dist\//,
  /(^|\/)test-results\//, /(^|\/)playwright-report\//, /(^|\/)playwright-deployment-report\//,
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
['node_modules/', 'dist/', '.env', '.env.*', 'test-results/', 'playwright-report/', 'playwright-deployment-report/', '*.zip'].forEach((token) => {
  if (!gitignore.includes(token)) errors.push(`.gitignore must include: ${token}`);
});
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const workflowFiles = [
  '.github/workflows/frontend-validation.yml',
  '.github/workflows/staging-e2e.yml',
  '.github/workflows/deployment-readiness.yml'
];
for (const relative of workflowFiles) {
  const content = fs.readFileSync(path.join(root, relative), 'utf8');
  const cleanupIndex = content.indexOf('repo:clean-generated');
  const securityIndex = content.indexOf('security:check');
  if (cleanupIndex < 0) errors.push(`${relative} must run repo:clean-generated`);
  if (securityIndex >= 0 && cleanupIndex > securityIndex) errors.push(`${relative} must clean generated artifacts before security:check`);
}
const frontendWorkflow = fs.readFileSync(path.join(root, '.github/workflows/frontend-validation.yml'), 'utf8');
if (!frontendWorkflow.includes('npm run typecheck:ci')) errors.push('.github/workflows/frontend-validation.yml must run typecheck:ci');
for (const script of ['repo:clean-generated', 'security:scan', 'repo:hygiene', 'security:check', 'typecheck', 'typecheck:ci', 'lint:pilot-critical', 'package:stage']) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json is missing script: ${script}`);
}
if (errors.length) {
  console.error('Frontend repository hygiene check failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log(`Frontend repository hygiene check passed${tracked.length ? ` (${tracked.length} tracked files inspected)` : ''}.`);
