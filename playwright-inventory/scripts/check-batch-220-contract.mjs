import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.dirname(root);
const read = file => fs.readFileSync(path.join(root,file),'utf8');
const manifest = JSON.parse(read('original-suite-approved.json'));
const b219 = JSON.parse(read('batch-219-baseline.json'));
const b220 = JSON.parse(read('batch-220-baseline.json'));
const group = manifest.approved_groups.BULK_SAFE_06_RECHECK_2;
const run = manifest.batch_219_last_execution;
assert(run && run.selected_original===63 && run.passed_original===46 && run.failed_original===17);
assert.equal(run.github_log,'logs_115165617693.zip');
assert.equal(new Set(run.passed_ids).size,46);
assert.equal(new Set(run.failed_ids).size,17);
assert.deepEqual(new Set([...run.passed_ids,...run.failed_ids]), new Set(b219.selected_ids));
assert.equal(b219.confirmed_green_ids.length,859);
assert.equal(b220.confirmed_green_ids.length,905);
assert.deepEqual(b220.confirmed_green_ids, [...b219.confirmed_green_ids,...run.passed_ids]);
assert.equal(new Set(b220.confirmed_green_ids).size,905);
assert.deepEqual(b220.held_unverified_ids, [...b219.held_unverified_ids,'TINS-024']);
assert.equal(b220.held_unverified_ids.length,22);
assert.equal(new Set(b220.held_unverified_ids).size,22);
assert.equal(b220.selected_ids.length,16);
assert.equal(new Set(b220.selected_ids).size,16);
assert.deepEqual(new Set([...b220.selected_ids,'TINS-024']), new Set(run.failed_ids));
assert.deepEqual(new Set([...b220.confirmed_green_ids,...b220.held_unverified_ids,...b220.selected_ids]).size,943);
assert(group?.secret===true && group.entries?.length===2);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]),[
 ['tenant/insights/insights.spec.ts',15], ['tenant/tenant-settings/tenant-settings.spec.ts',1]
]);
assert.deepEqual(group.entries.flatMap(e=>e.ids), b220.selected_ids);
const sourceRe=/\btest\s*\(\s*['"]([A-Z0-9]+-\d{3})/g;
function bodies(s) { const m=[...s.matchAll(sourceRe)]; return new Map(m.map((match,i)=>[match[1],s.slice(match.index,m[i+1]?.index??s.length)])); }
const sourceOfId = new Map();
for (const entry of group.entries) {
 const src=read('tests/'+entry.file);
 assert.equal(crypto.createHash('sha256').update(src).digest('hex'),entry.sha256,'Batch 220 SHA mismatch '+entry.file);
 for(const baseGroup of ['BULK_SAFE_06','BULK_SAFE_06_RECHECK']){
  const old=manifest.approved_groups[baseGroup].entries.find(e=>e.file===entry.file);
  assert(old && old.sha256===entry.sha256,'Prior reviewed source fingerprint inconsistent '+entry.file);
 }
 const ast=ts.createSourceFile(entry.file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0, 'TypeScript parse error '+entry.file);
 assert(src.includes("from '../../../support/liveOriginalSafeTest'"));
 assert(!src.includes('test.only('));
 const ids=bodies(src);
 for(const id of entry.ids){
  assert(ids.has(id),'Missing exact original declaration: '+id);
  assert(!b220.confirmed_green_ids.includes(id) && !b220.held_unverified_ids.includes(id));
  const body=ids.get(id);
  assert(!/loginAsDisposableRole\s*\(|\.request\.(post|put|patch|delete)\s*\(/.test(body),'Unsafe selected test body '+id);
  sourceOfId.set(id,entry.file);
 }
}
// Verify every one of the 46 newly passing original IDs still has its exact same test body.
let verified46=0;
for(const entry of manifest.approved_groups.BULK_SAFE_06.entries){
 const ids=bodies(read('tests/'+entry.file));
 for(const [id,hash] of Object.entries(b220.confirmed_46_pass_test_body_sha256)){
  if (!ids.has(id))continue;
  assert.equal(crypto.createHash('sha256').update(ids.get(id)).digest('hex'),hash,'Changed newly passed test body: '+id);
  verified46++;
 }
}
assert.equal(verified46,46);
const insights=read('tests/tenant/insights/insights.spec.ts');
const settings=read('tests/tenant/tenant-settings/tenant-settings.spec.ts');
assert(insights.includes('const supplierControl = (page: Page, label: string) => {'));
// Later B221 selector repair keeps the same original test bodies and explicit controls;
// the archived B220 selection is unchanged, but obsolete text selectors must not be required.
for(const label of ['Recent history window','Risk filter','Performance tier','Sort suppliers','Page size','Search suppliers'])assert(insights.includes(`case '${label}': return`));
assert(insights.includes("page.getByRole('heading', { name: 'Supplier performance', exact: true })"));
assert(insights.includes("page.getByRole('heading', { name: 'Insight controls', exact: true })"));
assert(insights.includes("getByText('Health Score', { exact: true })"));
assert(insights.includes("page.locator('section.insights-section').filter({ has: page.getByRole('heading', { name: 'Unusual inventory movement', exact: true }) })"));
assert(settings.includes("getByRole('heading', { name: 'Tenant settings', exact: true, level: 2 })"));
// This is an observed product behavior mismatch: do not rewrite the failed original test to claim success.
assert(bodies(insights).get('TINS-024').includes("await expect(page.getByRole('article', { name: /Supplier performance detail for/ })).toHaveCount(0)"));
assert(!b220.selected_ids.includes('TINS-024'));
const guard = read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'", "property === 'continue'", "property === 'fulfill'", "return route.abort('blockedbyclient')",'unexpectedlyCompletedWrites','approvedLogin(method, route.request().url())'])assert(guard.includes(marker),'Write protection lost: '+marker);
const workflow = fs.readFileSync(path.join(projectRoot,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_06_RECHECK_2'));
assert(workflow.includes('node scripts/check-batch-220-contract.mjs'));
assert(!workflow.includes('continue-on-error: true'));
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_06_RECHECK_2'") && config.includes('.includes(GROUP) ? 1'));
assert.equal(manifest.batch_220_preflight.status,'offline_source_and_static_checks_only_pending_github');
console.log('PASS B220: 63 exact B219 outcomes reconciled (46 pass, 17 failed) from GitHub log.');
console.log('PASS B220: 905 distinct confirmed passes untouched, 22 held (includes real TINS-024 mismatch).');
console.log('PASS B220: 16 failed-only original tests across 2 SHA-pinned files, no passed ID selected.');
console.log('PASS B220: all 46 previous winning test bodies unchanged, TS syntax and safety contract intact.');
console.log('PASS B220: targeted wrapped-label, duplicate heading, and anomaly-section selectors verified statically.');
console.log('PENDING: Browser execution on GitHub. Do not count the 16 as live PASS yet.');
