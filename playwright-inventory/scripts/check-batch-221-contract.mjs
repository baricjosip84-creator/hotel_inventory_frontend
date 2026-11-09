import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.dirname(root);
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const manifest = JSON.parse(read('original-suite-approved.json'));
const b220 = JSON.parse(read('batch-220-baseline.json'));
const b221 = JSON.parse(read('batch-221-baseline.json'));
const result = manifest.batch_220_last_execution;
const groupName = 'BULK_SAFE_06_RECHECK_3';
const group = manifest.approved_groups[groupName];
assert.equal(result.github_log, 'logs_115178390345.zip');
assert.equal(result.group, 'BULK_SAFE_06_RECHECK_2');
assert.equal(result.selected_original, 16);
assert.equal(result.passed_original, 3);
assert.equal(result.failed_original, 13);
assert.deepEqual(new Set([...result.passed_ids, ...result.failed_ids]), new Set(b220.selected_ids));
assert.deepEqual(new Set(result.passed_ids), new Set(['TINS-002','TINS-047','TSET-001']));
assert.equal(b220.confirmed_green_ids.length, 905);
assert.equal(b221.confirmed_green_ids.length, 908);
assert.equal(new Set(b221.confirmed_green_ids).size, 908);
assert.deepEqual(b221.confirmed_green_ids, [...b220.confirmed_green_ids,...result.passed_ids]);
assert.deepEqual(b221.held_unverified_ids, b220.held_unverified_ids);
assert.equal(b221.held_unverified_ids.length, 22);
assert.equal(new Set(b221.held_unverified_ids).size, 22);
assert(group?.secret === true && group.entries.length === 1);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]), [['tenant/insights/insights.spec.ts',13]]);
assert.deepEqual(group.entries.flatMap(e=>e.ids), result.failed_ids);
assert.deepEqual(group.entries.flatMap(e=>e.ids), b221.selected_ids);
assert.equal(new Set(b221.selected_ids).size,13);
assert.equal(new Set([...b221.confirmed_green_ids, ...b221.held_unverified_ids, ...b221.selected_ids]).size,943);
assert(!b221.selected_ids.includes('TINS-024'));
assert(b221.selected_ids.every(id=>id.startsWith('TINS-')));
const spec='tests/tenant/insights/insights.spec.ts';
const source=read(spec);
const sha=crypto.createHash('sha256').update(source).digest('hex');
for(const g of ['BULK_SAFE_06','BULK_SAFE_06_RECHECK','BULK_SAFE_06_RECHECK_2',groupName]) {
 const ent=manifest.approved_groups[g].entries.find(e=>e.file==='tenant/insights/insights.spec.ts');
 assert.equal(ent?.sha256, sha, 'Approved source fingerprint mismatch '+g);
}
const ast=ts.createSourceFile(spec, source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
assert.equal(ast.parseDiagnostics.length,0,'Insights TypeScript parse errors');
assert(source.includes("from '../../../support/liveOriginalSafeTest'"));
assert(!source.includes('test.only('));
const sourceRe=/\btest\s*\(\s*['"]([A-Z0-9]+-\d{3})/g;
function bodies(s) { const m=[...s.matchAll(sourceRe)];return new Map(m.map((match,i)=>[match[1],s.slice(match.index,m[i+1]?.index??s.length)])); }
const block=bodies(source);
assert.equal(block.size,50,'Insights original count must remain 50');
for(const id of b221.selected_ids) {
 const body=block.get(id);
 assert(body, 'Missing original declaration '+id);
 assert(!/loginAsDisposableRole\s*\(|\.request\.(post|put|patch|delete)\s*\(/.test(body),'Unsafe recheck '+id);
}
// Preserve all originally successful B219 scenarios and the 3 newly passed B220 bodies.
const previous46=b220.confirmed_46_pass_test_body_sha256;
const otherSources={
 'tenant/insights/insights.spec.ts':block,
 'tenant/digital-twin/digital-twin.spec.ts':bodies(read('tests/tenant/digital-twin/digital-twin.spec.ts')),
 'tenant/tenant-settings/tenant-settings.spec.ts':bodies(read('tests/tenant/tenant-settings/tenant-settings.spec.ts')),
};
const approvedFiles=manifest.approved_groups.BULK_SAFE_06.entries;
for(const [id, expectedHash] of Object.entries(previous46)) {
 const entry=approvedFiles.find(e=>e.ids.includes(id));
 assert(entry, 'Previous winner absent from approved group '+id);
 const body=otherSources[entry.file]?.get(id);
 assert(body);
 assert.equal(crypto.createHash('sha256').update(body).digest('hex'),expectedHash,'B219 passing test body drift '+id);
}
for(const [id, expectedHash] of Object.entries(b221.confirmed_3_pass_test_body_sha256)) {
 const sourceMap = id.startsWith('TSET-') ? otherSources['tenant/tenant-settings/tenant-settings.spec.ts'] : block;
 const body=sourceMap.get(id);
 assert(body);
 assert.equal(crypto.createHash('sha256').update(body).digest('hex'),expectedHash,'B220 passing test body drift '+id);
}
// Source-reviewed JSX structure: `Section title="Insight controls"` contains one
// lookback select; `Section title="Supplier performance"` contains a supplier
// search input followed by Risk, Tier, Sort and Page size selects, in that order.
const expectedControlSelectors = [
 ["Recent history window", "history.locator('select').first()"],
 ["Search suppliers", "suppliers.locator('input').first()"],
 ["Risk filter", "suppliers.locator('select').nth(0)"],
 ["Performance tier", "suppliers.locator('select').nth(1)"],
 ["Sort suppliers", "suppliers.locator('select').nth(2)"],
 ["Page size", "suppliers.locator('select').nth(3)"],
];
for(const [label, selector] of expectedControlSelectors) assert(source.includes(`case '${label}': return ${selector};`),'Missing source-reviewed DOM map '+label);
assert(source.includes("page.locator('section.insights-section')"));
assert(source.includes("page.getByRole('heading', { name: 'Insight controls', exact: true })"));
assert(source.includes("page.getByRole('heading', { name: 'Supplier performance', exact: true })"));
assert(!source.includes("section.insights-section label').filter({ hasText: pattern }"));
const guard=read('support/liveOriginalSafeTest.ts');
for(const token of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')","approvedLogin(method, route.request().url())",'unexpectedlyCompletedWrites']) assert(guard.includes(token),'Missing live write guard: '+token);
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_06_RECHECK_3'));
assert(workflow.includes('node scripts/check-batch-221-contract.mjs'));
assert(workflow.includes('PW_TENANT_EMAIL: ${{ secrets.E2E_EMAIL }}'));
assert(!workflow.includes('continue-on-error: true'));
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_06_RECHECK_3'"));
assert(config.includes(".includes(GROUP) ? 1"));
assert.equal(manifest.batch_221_preflight.selected_count,13);
assert.equal(manifest.batch_221_preflight.prior_confirmed_green,908);
assert.equal(manifest.batch_221_preflight.status,'offline_source_and_static_checks_only_pending_github');
console.log('PASS B221: GitHub B220 results 3/16 PASS + 13/16 FAIL reconciled; 908 GREEN and 22 HELD.');
console.log('PASS B221: only 13 previously failed Insights original IDs; no GREEN or held cases selected.');
console.log('PASS B221: 50/50 original Insights tests unchanged; 46 prior and 3 new winning test bodies unchanged.');
console.log('PASS B221: exact DOM-control map reviewed against frontend source; code syntax parsed.');
console.log('PASS B221: approved SHA256, 1 worker, exact production origin and write guard preserved.');
console.log('PENDING: GitHub browser execution. No new browser pass claimed.');
