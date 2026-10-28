/* FT199 build hotfix: regression guard for cumulative version compatibility.
 * Protects the original Supplier Returns runtime checks while preventing
 * obsolete FE/FT allowlists from blocking newer packaged releases. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const info = JSON.parse(read('public/deployment-version.json'));
const pkg = JSON.parse(read('package.json'));
assert.equal(info.frontend, pkg.inventorySourceIdentity.frontend);
assert.equal(info.audit_round, pkg.inventorySourceIdentity.audit_round);
assert.match(info.frontend, /^FE\d+$/);
assert.match(info.audit_round, /^FT\d+$/);
for (const [name, minFE, minFT] of [
  ['check-ft195-supplier-returns-deployment.cjs', 289, 195],
  ['check-ft196-supplier-returns-prebuild.cjs', 290, 196],
]) {
  const source = read(`scripts/${name}`);
  assert.ok(source.includes('assert.equal('), `${name} must verify package identity`);
  assert.ok(source.includes(`Number(info.frontend.slice(2)) >= ${minFE}`), `${name} must protect FE minimum`);
  assert.ok(source.includes(`Number(info.audit_round.slice(2)) >= ${minFT}`), `${name} must protect FT minimum`);
  assert.ok(!source.includes('^FE(') && !source.includes('^FT('), `${name} must not lock releases to an obsolete enumerated list`);
  const result = cp.spawnSync(process.execPath, [path.join(root, 'scripts', name)],
    { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${name} failed on ${info.frontend}/${info.audit_round}:\n${result.stdout}\n${result.stderr}`);
}
console.log(`FT199 prebuild forward-identity PASS: ${info.frontend}/${info.audit_round}, FT195 and FT196 legacy guards passed`);
