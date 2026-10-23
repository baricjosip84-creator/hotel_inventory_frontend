// FT049/FT063/FT064: report every missing CI command, Node entrypoint, and
// static local module imported by a CI script BEFORE slow validations run.
// This detects incomplete GitHub uploads even if the FULL release ZIP is sound.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/frontend-validation.yml'), 'utf8');
const scripts = require(path.join(root, 'package.json')).scripts;
const primaryJob = workflow.split('\n  cross-repository-contracts:')[0];
const refs = [...primaryJob.matchAll(/\bnpm run ([a-z0-9:-]+)/g)].map(match => match[1]);
const errors = new Set();
const paths = new Set();
const inspected = new Set();
const visitedCommands = new Set();
const queue = refs.slice();
const extensions = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '/index.js', '/index.ts'];
const existsModule = absolute => extensions.some(suffix => {
  const file = absolute + suffix;
  try { return fs.statSync(file).isFile(); } catch { return false; }
});

function inspectFile(relative) {
  if (inspected.has(relative)) return;
  inspected.add(relative);
  const absolute = path.resolve(root, relative);
  if (!existsModule(absolute)) return;
  const source = fs.readFileSync(absolute, 'utf8');
  // CI checker imports must be committed just like their script entrypoints.
  // Restrict static parsing to import/require statements (not string literals
  // used by source-assertion tests) and only local relative dependencies.
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!/^(?:import\s|export\s|(?:const|let|var)\s)/.test(trimmed)) continue;
    const imports = [
      ...trimmed.matchAll(/\b(?:from\s*|import\s*|require\(\s*)['"](\.{1,2}\/[^'"\n]+)['"]/g),
    ];
    for (const match of imports) {
      const dep = match[1];
      const target = path.resolve(path.dirname(absolute), dep);
      if (!existsModule(target)) {
        errors.add(`Missing CI imported module: ${path.relative(root, target)} (imported by ${relative}); commit this source file to GitHub`);
      } else if (target.startsWith(root + path.sep) && /\.[cm]?js$/.test(target)) {
        inspectFile(path.relative(root, target));
      }
    }
  }
}

while (queue.length) {
  const name = queue.shift();
  if (visitedCommands.has(name)) continue;
  visitedCommands.add(name);
  if (!Object.hasOwn(scripts, name)) {
    errors.add(`Undefined package.json script: ${name}`);
    continue;
  }
  const command = scripts[name];
  for (const match of command.matchAll(/\bnpm run ([a-z0-9:-]+)/g)) queue.push(match[1]);
  for (const match of command.matchAll(/\bnode\s+(?:--[\w-]+(?:=[^ ]+)?\s+)*([\w./-]+\.[cm]?js)\b/g)) {
    const relative = match[1];
    paths.add(relative);
    if (!fs.existsSync(path.join(root, relative))) {
      errors.add(`GitHub CI requires missing file: ${relative} (npm run ${name}); commit this source file to GitHub`);
    } else {
      inspectFile(relative);
    }
  }
}
// FT069: TypeScript 6 treats `module: ts.ModuleKind.None` as a deprecated,
// error-producing compiler option. Check all CI scripts up front instead of
// failing one legacy isolated-transpilation regression at a time.
for (const relative of inspected) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (relative !== 'scripts/check-ft049-ci-entrypoints.cjs' && /ts\.ModuleKind\.None\b/.test(source)) {
    errors.add(`Unsupported TypeScript 6 compiler option in ${relative}: replace ts.ModuleKind.None with ts.ModuleKind.ESNext`);
  }
}
assert.ok(refs.length >= 40, 'Expected frontend CI job definitions were not found');
assert.deepEqual([...errors].sort(), [], `Frontend CI source is incomplete:\n${[...errors].sort().join('\n')}`);
console.log(`FT049/FT064 frontend CI closure PASS: ${refs.length} workflow commands, ${visitedCommands.size} direct/indirect npm scripts, ${paths.size} Node entrypoints, ${inspected.size} dependency-checked files`);
