import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const b = JSON.parse(fs.readFileSync(path.join(root,'batch-218-baseline.json'),'utf8'));
const group = manifest.approved_groups.BULK_SAFE_06;
assert(group?.secret===true && group.entries?.length===4);
assert.equal(b.confirmed_green_ids.length,802);
assert.equal(new Set(b.confirmed_green_ids).size,802);
assert.equal(b.held_unverified_ids.length,21);
assert.equal(new Set(b.held_unverified_ids).size,21);
assert.deepEqual(b.confirmed_green_ids, [...JSON.parse(fs.readFileSync(path.join(root,'batch-217-baseline.json'),'utf8')).confirmed_green_ids, ...JSON.parse(fs.readFileSync(path.join(root,'batch-217-baseline.json'),'utf8')).selected_ids]);
assert.deepEqual(manifest.batch_217_last_execution.passed_ids, JSON.parse(fs.readFileSync(path.join(root,'batch-217-baseline.json'),'utf8')).selected_ids);
assert.equal(manifest.batch_217_last_execution.failed_original,0);
assert.equal(manifest.batch_217_last_execution.passed_original,4);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]), [
 ['tenant/insights/insights.spec.ts',49],
 ['tenant/digital-twin/digital-twin.spec.ts',46],
 ['tenant/decision-learning-feedback/decision-learning-feedback.spec.ts',18],
 ['tenant/tenant-settings/tenant-settings.spec.ts',7]
]);
const selected = group.entries.flatMap(e=>e.ids);
assert.deepEqual(selected,b.selected_ids);
assert.equal(selected.length,120);
assert.equal(new Set(selected).size,120);
assert.equal(new Set([...selected,...b.confirmed_green_ids,...b.held_unverified_ids]).size,943);
const previouslyApproved = new Set(Object.entries(manifest.approved_groups).filter(([group])=>group!=='BULK_SAFE_06' && group!=='BULK_SAFE_06_RECHECK' && group!=='BULK_SAFE_06_RECHECK_2' && group!=='BULK_SAFE_06_RECHECK_3').flatMap(([,g])=>(g.entries??[{ids:g.ids}]).flatMap(e=>e.ids)));
assert(selected.every(id=>!previouslyApproved.has(id)), 'Previously approved original scenario repeated');
const expectedPrefix = new Map([['tenant/insights/insights.spec.ts','TINS'],['tenant/digital-twin/digital-twin.spec.ts','TDT'],['tenant/decision-learning-feedback/decision-learning-feedback.spec.ts','TDLF'],['tenant/tenant-settings/tenant-settings.spec.ts','TSET']]);
for(const e of group.entries){
 const f=path.join(root,'tests',e.file);
 const code=fs.readFileSync(f,'utf8');
 assert.equal(crypto.createHash('sha256').update(code).digest('hex'),e.sha256,'Drift in '+e.file);
 const ast=ts.createSourceFile(f,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'TS parse error in '+e.file);
 assert(code.includes("from '../../../support/liveOriginalSafeTest'"), 'No production write guard in '+e.file);
 assert(!code.includes('test.only('));
 const matches=[...code.matchAll(/\btest\(\s*['"]([A-Z0-9]+-\d{3})\b/g)];
 for(const id of e.ids){
  assert(id.startsWith(expectedPrefix.get(e.file)+'-'), 'Unexpected scenario ID prefix');
  const current=matches.findIndex(m=>m[1]===id);
  assert(current>=0 && matches.filter(m=>m[1]===id).length===1, 'Missing/duplicated '+id);
  const block=code.slice(matches[current].index,matches[current+1]?.index??code.length);
  assert(!block.includes('loginAsDisposableRole(') && !block.includes('browser.newContext(') && !block.includes('PW_TEST_ENVIRONMENT'), 'Separate role account required: '+id);
  assert(!block.includes('.request.post(') && !block.includes('.request.put(') && !block.includes('.request.patch(') && !block.includes('.request.delete('), 'Direct production write risk: '+id);
  assert(!block.includes('route.continue({postData:'), 'Possible live write continuation '+id);
 }
}
const w = fs.readFileSync(path.join(root,'../.github/workflows/inventory-original-suite.yml'),'utf8');
assert(w.includes('          - BULK_SAFE_06'));
assert(w.includes('node scripts/check-batch-218-contract.mjs'));
assert(!w.includes('continue-on-error: true'));
const config=fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
assert(config.includes("'BULK_SAFE_06'") && config.includes('.includes(GROUP) ? 1'), 'B218 must run single worker');
const guard=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
for(const token of ["page.context().route('**/*'", "property === 'continue'", 'unexpectedlyCompletedWrites','blockedAtNetworkBoundary','approvedLogin(method, route.request().url())']) assert(guard.includes(token), 'Nonwrite safety boundary weakened');
assert.equal(manifest.batch_218_preflight.status,'offline_source_and_static_checks_only_pending_github');
console.log('PASS B218: 120 new original IDs across four hash-fingerprinted tenant spec files.');
console.log('PASS B218: 802 confirmed GREEN preserved, 21 held excluded, prior 120-test B215 group fully GREEN by user confirmation.');
console.log('PASS B218: TS parsing, role-only tests excluded, API write guard and single-worker origin restricted runner.');
console.log('PENDING: live Playwright on GitHub. No browser PASS claimed for Batch 218.');
