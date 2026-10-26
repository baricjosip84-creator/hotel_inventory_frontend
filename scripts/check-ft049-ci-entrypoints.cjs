// FT049/FT063/FT064: report every missing CI command, Node entrypoint, and
// static local module imported by a CI script BEFORE slow validations run.
// This detects incomplete GitHub uploads even if the FULL release ZIP is sound.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/frontend-validation.yml'), 'utf8');
const packageMeta = require(path.join(root, 'package.json'));
const scripts = packageMeta.scripts;

// FT181: A previously untracked source identity caused GitHub to fail FT177
// and prevented a fresh frontend deployment. Recover this reproducible JSON
// from tracked package.json metadata before the CI checks and Vite build.
// No application or inventory data is read or changed.
const identity = packageMeta.inventorySourceIdentity;
assert.ok(identity && /^FE\d+$/.test(identity.frontend) &&
  /^FT\d+$/.test(identity.audit_round) && /^BE\d+$/.test(identity.backend),
'package.json must declare inventorySourceIdentity for CI and production builds');
const identityPath = path.join(root, 'public', 'deployment-version.json');
// FT194 release integrity: when the public manifest exists, the package's recovery
// identity must describe the same build. Prevent a stale FE287 identity
// from masquerading as the FE288 Supplier Returns correction.
if (fs.existsSync(identityPath)) {
  const releaseIdentity = JSON.parse(fs.readFileSync(identityPath, 'utf8'));
  for (const field of ['frontend', 'backend', 'audit_round']) {
    assert.equal(identity[field], releaseIdentity[field],
      `Stale package inventorySourceIdentity.${field}: ${identity[field]} does not match public manifest ${releaseIdentity[field]}`);
  }
}

if (!fs.existsSync(identityPath)) {
  fs.mkdirSync(path.dirname(identityPath), {recursive: true});
  fs.writeFileSync(identityPath, JSON.stringify({
    ...identity,
    products_cost_controls_fix: 'FT176 and FT177 source corrections',
    purpose: 'Build identity recovered from versioned package.json source metadata',
    live_acceptance: 'PENDING'
  }, null, 2) + '\n', 'utf8');
  console.log(`FT181: restored missing source identity ${identity.frontend}/${identity.audit_round} from package.json`);
}

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
// FT180: Files present in a downloaded ZIP can be absent from the Git index.
// When run inside an actual repository, verify that all CI Node entrypoints
// and their statically discovered local dependencies have been staged/tracked.
// In a source ZIP without .git, keep the original filesystem checks.
const { spawnSync } = require('node:child_process');
function git(args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}
const topLevel = git(['rev-parse', '--show-toplevel']);
if (topLevel.status === 0 && path.resolve(topLevel.stdout.trim()) === root) {
  const index = git(['ls-files', '-z', '--cached']);
  if (index.status !== 0) {
    errors.add(`Cannot inspect staged/committed CI source files: ${index.stderr.trim()}`);
  } else {
    const tracked = new Set(index.stdout.split('\0').filter(Boolean));
    const required = new Set([
      'package.json',
      '.github/workflows/frontend-validation.yml',
      ...paths,
      ...inspected
    ]);
    for (const relative of required) {
      const normalized = relative.replace(/\\/g, '/');
      if (fs.existsSync(path.join(root, relative)) && !tracked.has(normalized)) {
        errors.add(`CI file exists locally but is not staged/tracked by Git: ${normalized} (run git add -- ${normalized})`);
      }
    }
  }
}
assert.ok(refs.length >= 40, 'Expected frontend CI job definitions were not found');
assert.deepEqual([...errors].sort(), [], `Frontend CI source is incomplete:\n${[...errors].sort().join('\n')}`);
console.log(`FT049/FT064 frontend CI closure PASS: ${refs.length} workflow commands, ${visitedCommands.size} direct/indirect npm scripts, ${paths.size} Node entrypoints, ${inspected.size} dependency-checked files`);
