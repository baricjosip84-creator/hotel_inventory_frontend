import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'original-suite-approved.json'), 'utf8'));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'batch-215-baseline.json'), 'utf8'));
const group = manifest.approved_groups.BULK_SAFE_05;
assert(group?.secret === true, 'B215 requires an authenticated safe bulk group');
const selected = group.entries.flatMap(entry => entry.ids);
assert.equal(selected.length, 120);
assert.equal(new Set(selected).size, 120);
assert.equal(baseline.confirmed_green_ids.length, 682);
assert.equal(new Set(baseline.confirmed_green_ids).size,682);
assert.equal(baseline.held_unverified_ids.length,21);
assert.deepEqual(selected, baseline.selected_ids);
const excluded = new Set([...baseline.confirmed_green_ids, ...baseline.held_unverified_ids]);
assert.equal(excluded.size,703);
assert(selected.every(id => !excluded.has(id)), 'B215 attempts to repeat previously confirmed or held ID');
assert.deepEqual(group.entries.map(entry => [entry.file, entry.ids.length]), [
 ['tenant/action-center/action-center.spec.ts', 25],
 ['tenant/collaboration/collaboration.spec.ts', 40],
 ['tenant/workflow-composer/workflow-composer.spec.ts', 35],
 ['tenant/tenant-audit/tenant-audit.spec.ts', 20]
]);
for (const entry of group.entries) {
 const file = path.join(root, 'tests', entry.file);
 const code = fs.readFileSync(file, 'utf8');
 assert.equal(crypto.createHash('sha256').update(code).digest('hex'), entry.sha256, `B215 drift in ${entry.file}`);
 assert(code.includes("from '../../../support/liveOriginalSafeTest'"), `B215 missing live write guard: ${entry.file}`);
 const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length, 0, `B215 TypeScript syntax error in ${entry.file}`);
 const found = [...code.matchAll(/\btest\s*\(\s*['"]([A-Z0-9]+-\d{3})\s+/g)].map(match=>match[1]);
 for (const id of entry.ids) assert.equal(found.filter(x=>x===id).length,1,`B215 missing/duplicate ${id}`);
 assert(!/\btest\.only\s*\(/.test(code), 'Exclusive test accidentally committed');
}
const w = fs.readFileSync(path.join(root, '../.github/workflows/inventory-original-suite.yml'), 'utf8');
assert(w.includes('          - BULK_SAFE_05'));
assert(w.includes('node scripts/check-batch-215-contract.mjs'));
assert(!w.includes('continue-on-error: true'), 'No suppression of test failure');
const runner = fs.readFileSync(path.join(root, 'playwright.live-original.config.ts'), 'utf8');
assert(runner.includes("'BULK_SAFE_05'") && runner.includes('.includes(GROUP) ? 1'), 'B215 must use one isolated worker');
const guard = fs.readFileSync(path.join(root, 'support/liveOriginalSafeTest.ts'), 'utf8');
assert(guard.includes("page.context().route('**/*'"));
assert(guard.includes("property === 'continue'"));
assert(guard.includes('unexpectedlyCompletedWrites'));
assert(guard.includes('approvedLogin(method, route.request().url())'));
assert.equal(manifest.batch_215_preflight.execution_status,'not_executed');
console.log('PASS B215: 120 exact unpassed original IDs from four SHA-fingerprinted tenant spec files.');
console.log('PASS: 682 confirmed and 21 held unchanged; safe bulk runner, live non-write guard, strict dispatch and TypeScript parsing.');
console.log('NOT VERIFIED: Browser/production app outcome (requires the selected GitHub Action).');
