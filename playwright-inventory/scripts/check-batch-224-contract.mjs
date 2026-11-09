import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const prior=JSON.parse(read('batch-223-baseline.json'));
const b=JSON.parse(read('batch-224-baseline.json'));
const manifest=JSON.parse(read('original-suite-approved.json'));
const group=manifest.approved_groups.BULK_SAFE_07_RECHECK;
const first=manifest.approved_groups.BULK_SAFE_07;
const previous=manifest.batch_223_last_execution;
assert.equal(previous.github_log,'logs_115375400916.zip');
assert.deepEqual([previous.selected_original,previous.passed_original,previous.failed_original],[160,134,26]);
assert.deepEqual(new Set([...previous.passed_ids,...previous.failed_ids]),new Set(prior.selected_ids));
assert.equal(new Set(previous.passed_ids).size,134);
assert.equal(new Set(previous.failed_ids).size,26);
assert.equal(new Set(prior.confirmed_green_ids).size,921);
assert.equal(prior.held_unverified_ids.length,22);
assert.deepEqual(b.confirmed_green_ids,[...prior.confirmed_green_ids,...previous.passed_ids]);
assert.equal(b.confirmed_green_ids.length,1055);
assert.equal(new Set(b.confirmed_green_ids).size,1055);
assert.deepEqual(b.held_unverified_ids,prior.held_unverified_ids);
assert.deepEqual(new Set(b.selected_ids),new Set(previous.failed_ids));
assert.equal(b.selected_ids.length,26);
assert.equal(new Set([...b.confirmed_green_ids,...b.held_unverified_ids,...b.selected_ids]).size,1103);
assert.deepEqual([group?.secret,group?.entries?.length],[true,4]);
assert.deepEqual(group.entries.map(x=>[x.file,x.ids.length]),[
 ['tenant/probabilistic-forecasting/probabilistic-forecasting.spec.ts',9],
 ['tenant/adaptive-policy-engine/adaptive-policy-engine.spec.ts',4],
 ['tenant/tenant-audit/tenant-audit.spec.ts',12],
 ['tenant/alerts/alerts.spec.ts',1]
]);
assert.deepEqual(group.entries.flatMap(e=>e.ids),b.selected_ids);
assert.deepEqual(b.batch_223_passed_ids,previous.passed_ids);
// Exact scenario-level SHA fingerprints: every winning test body from the source
// used by GitHub must be unchanged even where failed bodies changed in a shared spec.
const passingHashes=new Map();
for(const e of group.entries){
 const oldEntry=first.entries.find(x=>x.file===e.file);
 assert(oldEntry,'Cannot recheck unapproved source '+e.file);
 assert(e.ids.every(id=>oldEntry.ids.includes(id)),'Recheck includes non-B223 ID '+e.file);
 assert(e.ids.every(id=>previous.failed_ids.includes(id)),'Previously GREEN reselected '+e.file);
 const code=read('tests/'+e.file);
 assert.equal(sha(code),e.sha256,'SHA mismatch '+e.file);
 assert.equal(b.spec_sha256[e.file],e.sha256);
 assert.equal(oldEntry.sha256,e.sha256,'B223 reviewed SHA was not re-pinned '+e.file);
 assert(code.includes("from '../../../support/liveOriginalSafeTest'"),'Guarded test import lost '+e.file);
 const ast=ts.createSourceFile(e.file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'TS syntax invalid '+e.file);
 const tests=new Map();
 function visit(n){
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'){
   const name=n.arguments[0],cb=n.arguments[1];
   if(name&&ts.isStringLiteral(name)&&cb&&ts.isArrowFunction(cb)){
    const id=name.text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
    if(id){assert(!tests.has(id),'Duplicate original ID '+id);tests.set(id,{text:cb.getText(ast),sha256:sha(cb.getText(ast))});}
   }
  }
  ts.forEachChild(n,visit);
 }visit(ast);
 for(const [id,expected] of Object.entries(b.batch_223_green_test_body_sha256)){
  if(tests.has(id)){
   assert.equal(tests.get(id).sha256,expected,'Successful B223 test body changed '+id);
   passingHashes.set(id,expected);
  }
 }
 for(const id of e.ids){
  const body=tests.get(id)?.text;
  assert(body,'Missing original failed test '+id);
  assert(!/loginAsDisposableRole\s*\(|browser\.newContext\s*\(/.test(body),'Unreviewed account '+id);
  assert(!/\.request\.(?:post|put|patch|delete)\s*\(/i.test(body),'Direct production write '+id);
  assert(!/route\.continue\s*\(\s*\{\s*postData/.test(body),'Continuation write '+id);
  assert(!/test\.skip|test\.only/.test(body),'Disabled or isolated original '+id);
 }
}
assert.equal(passingHashes.size,134,'Winning B223 test bodies were not all source-pinned');
assert.equal(Object.keys(b.batch_223_green_test_body_sha256).length,134);
assert.equal(Object.keys(b.previous_spec_sha256).length,4);
assert(Object.values(b.previous_spec_sha256).every(v=>/^[a-f0-9]{64}$/.test(v)));
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_224_SELECTED_26_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,27);
assert.deepEqual(csv.slice(1).map(x=>x.split(',')[0]),b.selected_ids);
const safety=read('support/liveOriginalSafeTest.ts');
for (const snippet of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'",'unexpectedlyCompletedWrites',"return route.abort('blockedbyclient')",'MAX_SESSION_AGE_MS = 30 * 60 * 1000',"if (tokenExpiresSoon(bulkSession.snapshot)"]) assert(safety.includes(snippet),'Write / auth safety regression '+snippet);
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_07_RECHECK'));
assert(workflow.includes('node scripts/check-batch-224-contract.mjs'));
assert(workflow.includes('node scripts/check-bulk-auth-fixture.mjs'));
assert(!workflow.includes('continue-on-error: true'));
assert(workflow.includes('secrets.E2E_EMAIL') && workflow.includes('secrets.E2E_PASSWORD'));
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_07_RECHECK'"));
assert(config.includes('.includes(GROUP) ? 1'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
assert.deepEqual([manifest.batch_224_preflight.prior_confirmed_green,manifest.batch_224_preflight.prior_held_unverified,manifest.batch_224_preflight.selected_count],[1055,22,26]);
assert.equal(manifest.batch_224_preflight.status,'offline_checks_only_pending_github');
console.log('PASS B224: B223 GitHub log reconciled exactly: 134 unique PASS + 26 FAIL = 160.');
console.log('PASS B224: 1055 confirmed GREEN; 22 HELD; exact 26 failed-only IDs selected.');
console.log('PASS B224: all 134 winning test bodies unchanged; four TS specs source-fingerprinted.');
console.log('PASS B224: protected origin, JWT/session renewal, write guard, and one-worker GitHub dispatch.');
console.log('PENDING B224: 26 selected original tests require browser verification; offline-only checks cannot mark PASS.');
