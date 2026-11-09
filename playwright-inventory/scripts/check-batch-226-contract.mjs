import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const sha=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=JSON.parse(read('original-suite-approved.json'));
const prev=JSON.parse(read('batch-225-baseline.json'));
const batch=JSON.parse(read('batch-226-baseline.json'));
const run=manifest.batch_225_last_execution;
const group=manifest.approved_groups.BULK_SAFE_08;
assert.equal(run.github_log,'logs_115412216453.zip');
assert.equal(run.group,'BULK_SAFE_07_RECHECK_2');
assert.deepEqual([run.selected_original,run.passed_original,run.failed_original],[4,3,1]);
assert.deepEqual(run.passed_ids,['TAUD-057','TAUD-058','TAUD-059']);
assert.deepEqual(run.failed_ids,['TALERT-008']);
assert.deepEqual(new Set([...run.passed_ids,...run.failed_ids]),new Set(prev.selected_ids));
assert.equal(prev.confirmed_green_ids.length,1077);
assert.equal(prev.held_unverified_ids.length,22);
assert.deepEqual(batch.confirmed_green_ids,[...prev.confirmed_green_ids,...run.passed_ids]);
assert.deepEqual(batch.held_unverified_ids,[...prev.held_unverified_ids,...run.failed_ids]);
assert.equal(new Set(batch.confirmed_green_ids).size,1080);
assert.equal(new Set(batch.held_unverified_ids).size,23);
assert.equal(batch.expected_original_suite_ids,9900);
assert.equal(batch.live_status,'offline_preflight_passed_gitHub_pending');
assert.deepEqual(batch.newly_held,['TALERT-008']);
assert(group.secret===true && group.entries.length===9);
const approvedIds=group.entries.flatMap(e=>e.ids);
assert.equal(approvedIds.length,125);
assert.deepEqual(new Set(approvedIds),new Set(batch.selected_ids));
assert.equal(new Set(approvedIds).size,125);
const blocked=new Set([...batch.confirmed_green_ids,...batch.held_unverified_ids]);
for(const id of approvedIds) assert(!blocked.has(id),`Previously GREEN/held original ID re-selected: ${id}`);
const forbiddenBody=[/test\.skip\s*\(/,/loginAsDisposableRole\s*\(/,/route\.continue\s*\(/,/page\.request\.(?:post|put|patch|delete)\s*\(/];
const idsBySpec=new Map();
for(const entry of group.entries){
 assert(entry.file.startsWith('tenant/') && entry.file.endsWith('.spec.ts'));
 const name='tests/'+entry.file,source=read(name);
 assert.equal(sha(source),entry.sha256,`Original source SHA mismatch ${name}`);
 assert.equal(batch.spec_sha256[entry.file],entry.sha256);
 assert(source.includes("from '../../../support/liveOriginalSafeTest'"),`No live read-only fixture: ${name}`);
 const ast=ts.createSourceFile(name,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,`TypeScript parse error ${name}`);
 const bodies=new Map();
 function visit(n){
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'
    &&ts.isStringLiteral(n.arguments[0])&&ts.isArrowFunction(n.arguments[1])){
   const m=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/);
   if(m){assert(!bodies.has(m[1]),`duplicate source test ID ${m[1]}`);bodies.set(m[1],n.arguments[1].getText(ast));}
  }
  ts.forEachChild(n,visit);
 }visit(ast);
 for(const id of entry.ids){
  const body=bodies.get(id);
  assert(body,`Original test ID missing: ${id} in ${name}`);
  for(const rx of forbiddenBody)assert(!rx.test(body),`Unsafe test body: ${id} ${rx}`);
  assert(!/\btest\.only\s*\(/.test(body));
 }
 idsBySpec.set(entry.file,entry.ids);
}
assert.equal(idsBySpec.size,9);
assert.deepEqual(Object.fromEntries(idsBySpec),batch.selected_by_file);
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_226_SELECTED_125_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,126);
assert.deepEqual(csv.slice(1).map(x=>x.split(',')[0]),batch.selected_ids);
const guard=read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","unexpectedlyCompletedWrites","return route.abort('blockedbyclient')"])
 assert(guard.includes(marker),`Missing production write safety: ${marker}`);
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
const conf=read('playwright.live-original.config.ts');
assert(workflow.includes('          - BULK_SAFE_08'));
assert(workflow.includes('node scripts/check-batch-226-contract.mjs'));
assert(workflow.includes('PW_TENANT_EMAIL: ${{ secrets.E2E_EMAIL }}') && workflow.includes('PW_TENANT_PASSWORD: ${{ secrets.E2E_PASSWORD }}'));
assert(!workflow.includes('continue-on-error: true'));
assert(conf.includes("'BULK_SAFE_08'") && conf.includes('.includes(GROUP) ? 1'));
assert(conf.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const held=read('INVENTORY_PLAYWRIGHT_BATCH_226_HELD_23_IDS.csv').trim().split(/\r?\n/);
assert.equal(held.length,24);
assert.deepEqual(held.slice(1).map(line=>line.split(',')[0]),batch.held_unverified_ids);
// Existing B225 original tests are preserved verbatim; new B226 approval is metadata only.
assert.deepEqual(batch.source_changed_original_test_files,[]);
console.log('PASS B226: B225 live GitHub 3 GREEN / 1 FAIL; new confirmed 1080 and held 23.');
console.log('PASS B226: all 125 selected original IDs are unseen and distinct, across 9 guarded specs.');
console.log('PASS B226: TypeScript AST, original body safety, frozen fingerprints and previous group exclusion.');
console.log('PASS B226: credentials, one-worker GitHub execution and production write boundary retained.');
console.log('PENDING B226: browser tests must be run in GitHub; no offline static check implies live GREEN.');
