import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const hash=(t)=>crypto.createHash('sha256').update(t).digest('hex');
const baseline=JSON.parse(read('batch-223-baseline.json'));
const m=JSON.parse(read('original-suite-approved.json'));
const prior=JSON.parse(read('batch-222-baseline.json'));
const group='BULK_SAFE_07';
const grp=m.approved_groups[group];
assert.equal(grp?.secret,true);assert.equal(grp.entries.length,4);
assert.deepEqual(grp.entries.map(e=>[e.file,e.ids.length]),[
 ['tenant/probabilistic-forecasting/probabilistic-forecasting.spec.ts',72],
 ['tenant/adaptive-policy-engine/adaptive-policy-engine.spec.ts',23],
 ['tenant/tenant-audit/tenant-audit.spec.ts',40],
 ['tenant/alerts/alerts.spec.ts',25]
]);
const selected=grp.entries.flatMap(e=>e.ids);
assert.deepEqual(selected,baseline.selected_ids);
assert.equal(selected.length,160);assert.equal(new Set(selected).size,160);
assert.deepEqual(baseline.confirmed_green_ids,[...prior.confirmed_green_ids,...prior.selected_ids]);
assert.equal(baseline.confirmed_green_ids.length,921);assert.equal(new Set(baseline.confirmed_green_ids).size,921);
assert.deepEqual(baseline.held_unverified_ids,prior.held_unverified_ids);
assert.equal(baseline.held_unverified_ids.length,22);
const protectedIds=new Set([...baseline.confirmed_green_ids,...baseline.held_unverified_ids]);
assert([...selected].every(id=>!protectedIds.has(id)),'Previous green or held ID selected');
for(const [name,g] of Object.entries(m.approved_groups)){
 if(name===group)continue;
 for(const e of g.entries??[g]){
  for(const id of e.ids)assert(!selected.includes(id),`Previously approved ID ${name}/${id} repeated`);
 }
}
// AST-based test-body isolation, unlike regex slices that leak helper declarations.
for(const e of grp.entries){
 const file=`tests/${e.file}`;
 const s=read(file);
 assert.equal(hash(s),e.sha256,'Source fingerprint mismatch '+e.file);
 assert.equal(baseline.spec_sha256[e.file],e.sha256);
 assert(s.includes("from '../../../support/liveOriginalSafeTest'"),'Missing guarded test adapter '+e.file);
 const ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,`TS parse error ${file}`);
 const tests=new Map();
 function visit(n){
  if(ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text==='test'){
   const a=n.arguments[0], cb=n.arguments[1];
   if(a && ts.isStringLiteral(a) && cb && ts.isArrowFunction(cb)) {
    const id=a.text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
    if(id){ assert(!tests.has(id),`Duplicate ${id}`);tests.set(id,cb.getText(ast)); }
   }
  }
  ts.forEachChild(n,visit);
 }visit(ast);
 for(const id of e.ids){
  assert(tests.has(id),'Missing test '+id);
  const body=tests.get(id);
  assert(!/loginAsDisposableRole\s*\(|\brole\s*:\s*['"]PW_|browser\.newContext\s*\(/.test(body),'Requires disposable role or separate context '+id);
  assert(!/\.request\.(post|put|patch|delete)\s*\(/i.test(body),'Unmocked API write risk '+id);
  assert(!/route\.continue\s*\(|page\.route\s*\(\s*['"]\*\*\/\*/.test(body),'Unsafe page route '+id);
  assert(!/test\.skip|test\.only/.test(body),'Skipped or isolated test '+id);
 }
 for(const [oldName,old] of Object.entries(m.approved_groups)){
  if(oldName===group)continue;
  for(const entry of old.entries??[old]){
   if(entry.file===e.file)assert.equal(entry.sha256,e.sha256,`Old source fingerprint drift ${oldName}/${e.file}`);
  }
 }
}
// Pin previously GREEN source exactly, including all 30+ earlier live passes in these mature files.
for(const file of ['tenant/tenant-audit/tenant-audit.spec.ts','tenant/alerts/alerts.spec.ts']){
 assert.equal(hash(read(`tests/${file}`)),baseline.preserved_existing_source_sha256[file],`Previously run test file changed ${file}`);
}
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_07'));
assert(workflow.includes('node scripts/check-batch-223-contract.mjs'));
assert(!workflow.includes('continue-on-error: true'));
assert(workflow.includes("secrets.E2E_EMAIL") && workflow.includes('secrets.E2E_PASSWORD'));
const conf=read('playwright.live-original.config.ts');
assert(conf.includes("'BULK_SAFE_07'"));
assert(conf.includes('.includes(GROUP) ? 1'),'New group must be one worker');
assert(conf.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const guard=read('support/liveOriginalSafeTest.ts');
for(const key of ["page.context().route('**/*'", "property === 'continue'", "property === 'fulfill'", 'unexpectedlyCompletedWrites', 'blockedAtNetworkBoundary', "return route.abort('blockedbyclient')"]){
 assert(guard.includes(key),'Production guard weakened: '+key);
}
assert.equal(m.batch_223_preflight.prior_confirmed_green,921);
assert.equal(m.batch_223_preflight.prior_held_unverified,22);
assert.equal(m.batch_223_preflight.status,'offline_source_and_contract_checks_only_pending_github');
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_223_SELECTED_160_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,161);
assert.deepEqual(csv.slice(1).map(line=>line.split(',')[0]),selected);
console.log('PASS B223: exactly 160 previously unapproved originals in 4 TS-parsed tenant specs; no green or held replay.');
console.log('PASS B223: AST test-body and route-write check, source hashes, prior green file preservation.');
console.log('PASS B223: 921 confirmed GREEN, 22 held; origin, single-worker and production-write guards preserved.');
console.log('PENDING B223: live GitHub browser run. Offline preflight is not a browser PASS.');
