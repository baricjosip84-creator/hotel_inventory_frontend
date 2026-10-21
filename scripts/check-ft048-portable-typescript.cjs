// FT048: CI scripts must use the project-installed TypeScript, never an environment-specific global path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = require(path.join(root, 'package.json'));
assert.ok(manifest.devDependencies.typescript, 'TypeScript must be declared in devDependencies');
let count = 0;
for (const name of fs.readdirSync(path.join(root, 'scripts'))) {
  if (name === path.basename(__filename)) continue;
  if (!/\.(?:mjs|cjs|js)$/.test(name)) continue;
  const src = fs.readFileSync(path.join(root, 'scripts', name), 'utf8');
  assert.ok(!src.includes('/opt/nvm/versions/node/'), `${name}: non-portable TypeScript path`);
  count++;
}
const ts = require('typescript');
assert.equal(typeof ts.transpileModule, 'function', 'Local compiler must be usable by CI');
console.log(`FT048 portable TypeScript CI checks passed (${count} scripts scanned)`);
