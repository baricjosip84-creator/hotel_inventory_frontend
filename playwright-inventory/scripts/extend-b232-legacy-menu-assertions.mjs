// B232 recheck 2: fail-closed compatibility with historical (B228-B230)
// workflow-menu assertions. B231/B232 use reviewed, temporary CI-only groups.
// No original test bodies, manifest members, authentication logic or guards change.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(root);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'original-suite-approved.json'), 'utf8'));
const historical = Object.keys(manifest.approved_groups);
const runnerGroups = ['BULK_SAFE_12', 'BULK_SAFE_13'];
for (const group of runnerGroups) {
  assert(!Object.hasOwn(manifest.approved_groups, group), `${group} must not mutate the permanent manifest`);
}
const wf = fs.readFileSync(path.join(repo, '.github/workflows/inventory-original-suite.yml'), 'utf8');
const options = wf.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(options, 'Original workflow group menu not found');
const names = [...options[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(m => m[1]);
assert.deepEqual(names, ['DISCOVER_ALL', ...historical, ...runnerGroups], 'Unexpected workflow group or group order');
assert.equal(new Set(names).size, names.length, 'Duplicate workflow group choices');
for (const [batch, group, count] of [[231, 'BULK_SAFE_12', 180], [232, 'BULK_SAFE_13', 240]]) {
  const review = JSON.parse(fs.readFileSync(path.join(root, `batch-${batch}-review.json`), 'utf8'));
  assert.equal(review.group, group, `Review group mismatch: ${group}`);
  assert.equal(review.batch, batch, `Review batch mismatch: ${group}`);
  assert.equal(review.selected.length, count, `Reviewed test count mismatch: ${group}`);
  assert(wf.includes("if: ${{ inputs.group == '" + group + "' }}"), `Missing gated group: ${group}`);
}
// Exactly these 10 older assertions assumed no additional future groups.
// Pin the exact previous expression; abort if it differs, rather than replacing
// arbitrary source code or weakening other checks.
const files = [
  'check-batch-228-recheck-contract.mjs',
  'check-batch-229-contract.mjs',
  'check-batch-229-recheck-contract.mjs',
  'check-batch-229-recheck2-contract.mjs',
  'check-batch-229-recheck3-contract.mjs',
  'check-batch-229-recheck4-contract.mjs',
  'check-batch-229-recheck5-contract.mjs',
  'check-batch-229-recheck6-contract.mjs',
  'check-batch-230-contract.mjs',
  'check-batch-230-recheck-contract.mjs',
];
const matcher = /\['DISCOVER_ALL',\.\.\.Object\.keys\((?:manifest\.approved_groups|approved\.approved_groups|approved)\)\]/g;
let patched = 0;
for (const file of files) {
  const filename = path.join(root, 'scripts', file);
  const original = fs.readFileSync(filename, 'utf8');
  const matches = [...original.matchAll(matcher)];
  assert.equal(matches.length, 1, `${file}: expected exactly one frozen historical menu assertion`);
  const oldExpression = matches[0][0];
  const updated = original.replace(oldExpression, `${oldExpression.slice(0, -1)},'BULK_SAFE_12','BULK_SAFE_13']`);
  assert.equal(updated.replace(`${oldExpression.slice(0, -1)},'BULK_SAFE_12','BULK_SAFE_13']`, oldExpression), original, `${file}: unrelated source was modified`);
  fs.writeFileSync(filename, updated, 'utf8');
  patched++;
}
assert.equal(patched, 10);
console.log('PASS B232 legacy menu compatibility: exactly 10 historical assertions extended by 2 reviewed IDs; fail-closed menu and test-source checks preserved.');
