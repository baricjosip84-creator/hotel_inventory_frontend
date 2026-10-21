// FT049: make frontend GitHub CI fail early and clearly for missing scripts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const workflow = fs.readFileSync(path.join(root,'.github/workflows/frontend-validation.yml'),'utf8');
const scripts = require(path.join(root,'package.json')).scripts;
const primaryJob = workflow.split('\n  cross-repository-contracts:')[0];
const refs = [...primaryJob.matchAll(/\bnpm run ([a-z0-9:-]+)/g)].map(m=>m[1]);
let entrypoints = 0;
for (const name of refs) {
  assert.ok(Object.hasOwn(scripts,name), `GitHub CI references undefined package.json script: ${name}`);
  for (const match of scripts[name].matchAll(/\bnode\s+(?:--[\w-]+(?:=[^ ]+)?\s+)*([\w./-]+\.[cm]?js)\b/g)) {
    const relative = match[1];
    assert.ok(fs.existsSync(path.join(root,relative)),
      `GitHub CI requires missing file: ${relative} (npm run ${name}); commit this source file to GitHub`);
    entrypoints++;
  }
}
assert.ok(refs.length>=40, 'Expected frontend CI job definitions were not found');
console.log(`FT049 frontend CI source closure PASS: ${refs.length} commands, ${entrypoints} local Node entrypoints`);
