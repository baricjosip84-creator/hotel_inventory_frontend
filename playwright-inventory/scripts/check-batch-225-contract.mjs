import {assertHistoricalSourceCompatible} from './batch-229-recheck-source-allowlist.mjs';
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
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const m=JSON.parse(read('original-suite-approved.json'));
const b=JSON.parse(read('batch-225-baseline.json'));
const prev=JSON.parse(read('batch-224-baseline.json'));
const run=m.batch_224_last_execution;
const group=m.approved_groups.BULK_SAFE_07_RECHECK_2;
assert.equal(run.github_log,'logs_115399718557.zip');
assert.deepEqual([run.selected_original,run.passed_original,run.failed_original],[26,22,4]);
assert.equal(new Set([...run.passed_ids,...run.failed_ids]).size,26);
assert.deepEqual(new Set([...run.passed_ids,...run.failed_ids]),new Set(prev.selected_ids));
assert.deepEqual(new Set(run.failed_ids),new Set(['TALERT-008','TAUD-057','TAUD-058','TAUD-059']));
assert.equal(run.passed_ids.length,22);
assert.equal(new Set(run.passed_ids).size,22);
assert.equal(prev.confirmed_green_ids.length,1055);
assert.equal(prev.held_unverified_ids.length,22);
assert.deepEqual(b.confirmed_green_ids,[...prev.confirmed_green_ids,...run.passed_ids]);
assert.equal(new Set(b.confirmed_green_ids).size,1077);
assert.deepEqual(b.held_unverified_ids,prev.held_unverified_ids);
assert.deepEqual(b.batch_224_passed_ids,run.passed_ids);
assert.equal(b.live_status,'offline_preflight_passed_gitHub_pending');
assert.deepEqual(group.entries.map(e=>[e.file,e.ids]),[
  ['tenant/tenant-audit/tenant-audit.spec.ts',['TAUD-057','TAUD-058','TAUD-059']],
  ['tenant/alerts/alerts.spec.ts',['TALERT-008']]
]);
assert.deepEqual(group.entries.flatMap(e=>e.ids),b.selected_ids);
assert.equal(new Set([...b.confirmed_green_ids,...b.held_unverified_ids,...b.selected_ids]).size,1103);
assert.equal(group.secret,true);
assert.equal(Object.keys(b.batch_224_green_test_body_sha256).length,22);
const testBodies=new Map();
for(const e of group.entries){
 const full='tests/'+e.file, code=read(full);
 assertHistoricalSourceCompatible(e.file,sha(code),e.sha256,'SHA mismatch for '+full);
 assert.equal(b.spec_sha256[e.file],e.sha256);
 assert(code.includes("from '../../../support/liveOriginalSafeTest'"),'Missing production write guard import');
 const ast=ts.createSourceFile(full,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'TypeScript parse error '+full);
 const tests=new Map();
 function walk(n){
  if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'){
   const name=n.arguments[0],fn=n.arguments[1];
   if(name&&ts.isStringLiteral(name)&&fn&&ts.isArrowFunction(fn)){
    const match=name.text.match(/^([A-Z0-9]+-\d{3})\b/);
    if(match){assert(!tests.has(match[1]),'Duplicate ID '+match[1]);tests.set(match[1],fn.getText(ast));}
   }
  }ts.forEachChild(n,walk)
 }walk(ast);
 for(const [id,text] of tests)testBodies.set(id,text);
 for(const id of e.ids){
  assert(tests.has(id),'Original failed scenario missing '+id);
  const body=tests.get(id);
  assert(!/test\.skip|test\.only|loginAsDisposableRole\s*\(|browser\.newContext\s*\(/.test(body),'Unsafe control/role '+id);
  assert(!/\.request\.(post|put|patch|delete)\s*\(|route\.continue\s*\(/i.test(body),'Live unsafe operation '+id);
 }
 for(const [oldName,oldGroup] of Object.entries(m.approved_groups)){
  for(const other of oldGroup.entries??[oldGroup]){
   if(other.file===e.file) { if(oldName==='BULK_SAFE_11_RECHECK') assertHistoricalSourceCompatible(e.file,other.sha256,e.sha256,'Reviewed B230 subsequent source pin '+e.file); else assert.equal(other.sha256,e.sha256,'Reviewed source SHA not rebased '+oldName+'/'+e.file); }
  }
 }
}
for(const [id,digest] of Object.entries(b.batch_224_green_test_body_sha256)){
 const fileList=['tenant/probabilistic-forecasting/probabilistic-forecasting.spec.ts','tenant/adaptive-policy-engine/adaptive-policy-engine.spec.ts'];
 if(!testBodies.has(id)){
  for(const file of fileList){
   const code=read('tests/'+file);
   const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
   function visit(n){if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text.startsWith(id+' ')&&ts.isArrowFunction(n.arguments[1]))testBodies.set(id,n.arguments[1].getText(ast));ts.forEachChild(n,visit)}visit(ast);
  }
 }
 assert.equal(sha(testBodies.get(id)||''),digest,'Previously passing B224 original test body changed '+id);
}
const alerts=read('tests/tenant/alerts/alerts.spec.ts');
const audit=read('tests/tenant/tenant-audit/tenant-audit.spec.ts');
const alertBody=testBodies.get('TALERT-008');
assert(alertBody.includes("page.on('request'"),'Alert request observer missing');
assert(!alertBody.includes("page.route("),'Alert test still intercepts application navigation');
assert(alertBody.includes("apiLimits.includes('50')")&&alertBody.includes("apiLimits.includes('25')"),'API limit transport not checked');
assert(testBodies.get('TAUD-057').includes("name: 'Reset', exact: true })).toBeDisabled()"),'Audit debounced apply not awaited');
assert(testBodies.get('TAUD-059').includes("name: 'Reset', exact: true })).toBeDisabled()"),'Audit debounced clear not awaited');
assert(testBodies.get('TAUD-058').includes('input[type="date"]'),'Native date fields not located by type');
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_07_RECHECK_2'));
assert(workflow.includes('node scripts/check-batch-225-contract.mjs'));
assert(workflow.includes('secrets.E2E_EMAIL')&&workflow.includes('secrets.E2E_PASSWORD'));
assert(!workflow.includes('continue-on-error: true'));
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_07_RECHECK_2'"));
assert(config.includes('.includes(GROUP) ? 1'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const guard=read('support/liveOriginalSafeTest.ts');
for(const snippet of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'",'unexpectedlyCompletedWrites',"return route.abort('blockedbyclient')"]){
 assert(guard.includes(snippet),'Production write guard regression '+snippet);
}
const pre=m.batch_225_preflight;
assert.deepEqual([pre.prior_confirmed_green,pre.prior_held_unverified,pre.selected_count],[1077,22,4]);
assert.equal(pre.status,'offline_checks_only_pending_github');
const selected=read('INVENTORY_PLAYWRIGHT_BATCH_225_SELECTED_4_IDS.csv').trim().split(/\r?\n/);
assert.equal(selected.length,5);
assert.deepEqual(selected.slice(1).map(s=>s.split(',')[0]),b.selected_ids);
console.log('PASS B225: 26 B224 GitHub originals reconciled, 22 PASS + 4 FAIL.');
console.log('PASS B225: 1077 confirmed GREEN, 22 held; only 4 previous FAIL approved.');
console.log('PASS B225: 22 winning B224 test bodies AST-identical, not re-run.');
console.log('PASS B225: 2 source-fingerprinted specs; guarded request observation, debounce, native date field fixes.');
console.log('PASS B225: protected GitHub origin, credential gate, single-worker and non-write guard maintained.');
console.log('PENDING B225: 4 browser tests require user GitHub run; no offline test is marked GREEN.');
