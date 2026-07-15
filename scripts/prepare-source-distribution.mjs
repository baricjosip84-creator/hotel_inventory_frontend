import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excludedNames = new Set(['.git', 'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report', '.cache', 'tmp', 'temp']);
function readOutput(argv) {
  const index = argv.indexOf('--output');
  const value = index >= 0 ? argv[index + 1] : argv[0];
  if (!value || value.startsWith('--')) throw new Error('Usage: npm run package:stage -- --output <directory>');
  return path.resolve(process.cwd(), value);
}
function shouldExclude(name, isDirectory) {
  if (isDirectory && excludedNames.has(name)) return true;
  if (name === '.env' || name === '.env.local') return true;
  if (/^\.env\./.test(name) && name !== '.env.production' && !name.endsWith('.example')) return true;
  if (/\.(?:zip|tgz|gz)$/i.test(name)) return true;
  if (/^(?:npm-debug|yarn-error|pnpm-debug)\.log/i.test(name)) return true;
  return false;
}
function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (shouldExclude(entry.name, entry.isDirectory())) continue;
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, destinationPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, destinationPath);
  }
}
try {
  const output = readOutput(process.argv.slice(2));
  if (output === root || output.startsWith(`${root}${path.sep}`)) throw new Error('Output directory must be outside the repository.');
  fs.rmSync(output, { recursive: true, force: true });
  copyDirectory(root, output);
  console.log(`Clean frontend source staged at ${output}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
