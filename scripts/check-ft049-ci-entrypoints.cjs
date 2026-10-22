// FT049/FT063: fail early with ALL missing CI entrypoints instead of one-by-one failures.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/frontend-validation.yml'), 'utf8');
const scripts = require(path.join(root, 'package.json')).scripts;
const primaryJob = workflow.split('\n  cross-repository-contracts:')[0];
const refs = [...primaryJob.matchAll(/\bnpm run ([a-z0-9:-]+)/g)].map(match => match[1]);
const errors = [];
const paths = new Set();
for (const name of refs) {
  if (!Object.hasOwn(scripts, name)) {
    errors.push(`Undefined package.json script: ${name}`);
    continue;
  }
  for (const match of scripts[name].matchAll(/\bnode\s+(?:--[\w-]+(?:=[^ ]+)?\s+)*([\w./-]+\.[cm]?js)\b/g)) {
    const relative = match[1];
    paths.add(relative);
    if (!fs.existsSync(path.join(root, relative))) {
      errors.push(`GitHub CI requires missing file: ${relative} (npm run ${name}); commit this source file to GitHub`);
    }
  }
}
assert.ok(refs.length >= 40, 'Expected frontend CI job definitions were not found');
assert.deepEqual(errors, [], `Frontend CI source is incomplete:\n${errors.join('\n')}`);
console.log(`FT049/FT063 frontend CI source closure PASS: ${refs.length} commands, ${paths.size} local Node entrypoints`);
