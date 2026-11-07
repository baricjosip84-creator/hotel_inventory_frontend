import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'original-suite-approved.json'), 'utf8'));
const testRoot = path.join(root, 'tests');
function getSpecs(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const f = path.join(dir, e.name);
  return e.isDirectory() ? getSpecs(f) : e.name.endsWith('.spec.ts') ? [f] : [];
}); }
const specs = getSpecs(testRoot);
const found = [];
for (const spec of specs) {
  const s = fs.readFileSync(spec,'utf8');
  for (const m of s.matchAll(/\b(?:test|it)(?:\.skip)?\s*\(\s*['"]([A-Z][A-Z0-9]+-\d{3})\b/g)) found.push(m[1]);
}
if (specs.length !== manifest.expected_spec_files || found.length !== manifest.expected_suite_ids || new Set(found).size !== found.length) {
  throw new Error(`Original suite unexpectedly changed: ${specs.length} specs, ${found.length} declarations, ${new Set(found).size} unique IDs`);
}
for (const [group, entry] of Object.entries(manifest.approved_groups)) {
  const file = path.join(testRoot,entry.file);
  const body = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(body).digest('hex');
  if (sha !== entry.sha256) throw new Error(`Reviewed source changed; re-review required for group: ${group}`);
  for (const id of entry.ids) {
    if (!found.includes(id)) throw new Error(`Approved ID no longer exists: ${group}/${id}`);
  }
}
console.log(`PASS: ${found.length} original scenarios from ${specs.length} spec files; ${Object.values(manifest.approved_groups).reduce((n,g)=>n+g.ids.length,0)} reviewed runtime IDs in ${Object.keys(manifest.approved_groups).length} groups.`);
console.log('No original scenario declarations added or removed. No live credentials read by this check.');
