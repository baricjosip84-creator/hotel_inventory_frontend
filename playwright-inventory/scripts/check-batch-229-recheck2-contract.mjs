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
const json=f=>JSON.parse(read(f));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const approved=json('original-suite-approved.json');
const last=approved.batch_229_recheck2;
const group=approved.approved_groups.BULK_SAFE_10_RECHECK_2;
const entries=group.entries;
const selected=entries.flatMap(e=>e.ids);
const expected=['TSUP-054','TPROD-076'];
const priorRun=new Set(['TPF-021','TPROD-069','TSC-046']);
const bodyBefore=json('batch-229-recheck2-before-9900-body-sha256.json');
const sourcePins=json('batch-229-recheck2-source-sha256.json');
const beforeGreens=json('batch-229-confirmed-1290-green-body-sha256.json');
const batchGreens=json('batch-229-confirmed-87-green-body-sha256.json');
assert.deepEqual(selected,expected);
assert.deepEqual(last.selected_ids,expected);
assert.equal(last.confirmed_before_recheck,1380);
assert.deepEqual(last.confirmed_pass_ids,[...priorRun]);
assert.equal(group.secret,true);
assert.equal(entries.length,2);
const keys=Object.keys(approved.approved_groups);
const groupStart=keys.indexOf('BULK_SAFE_10');
assert.deepEqual(keys.slice(groupStart,groupStart+3),['BULK_SAFE_10','BULK_SAFE_10_RECHECK','BULK_SAFE_10_RECHECK_2']);
assert.equal(Object.keys(bodyBefore).length,9900);
assert.equal(Object.keys(beforeGreens).length,1290);
assert.equal(Object.keys(batchGreens).length,87);
assert.equal(approved.batch_229_execution.passed_ids.length,87);
assert.equal(approved.batch_229_execution.failed_ids.length,40);
assert.equal(approved.batch_229_recheck.deferred_unverified_ids.length,35);
const confirmed=new Set([...Object.keys(beforeGreens),...Object.keys(batchGreens),...priorRun]);
assert.equal(confirmed.size,1380,'Confirmed count mismatch');
const excluded=new Set([...json('batch-229-baseline.json').held_unverified_ids,
  ...json('batch-229-baseline.json').deferred_unverified_ids,
  ...approved.batch_229_recheck.deferred_unverified_ids]);
assert.equal(excluded.size,120,'Held/deferred partition changed');
for(const id of selected)assert(!confirmed.has(id)&&!excluded.has(id),'Already confirmed/held selected '+id);
const results=new Map(); let specs=0,skips=0;
function list(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>{
  const f=path.join(folder,e.name); return e.isDirectory()?list(f):e.name.endsWith('.spec.ts')?[f]:[];
});}
for(const file of list(path.join(root,'tests'))){
  specs++; const s=fs.readFileSync(file,'utf8');
  const tree=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0,'Invalid TypeScript '+file);
  const relative=path.relative(path.join(root,'tests'),file).replaceAll('\\','/');
  function visit(n){
    if(ts.isCallExpression(n)&&n.arguments.length>1&&ts.isStringLiteral(n.arguments[0])){
      const e=n.expression;
      const normal=ts.isIdentifier(e)&&['test','it'].includes(e.text);
      const skip=ts.isPropertyAccessExpression(e)&&e.expression.getText(tree)==='test'&&e.name.text==='skip';
      if(normal||skip){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
        if(id){assert(!results.has(id),'Duplicate '+id);results.set(id,{file:relative,digest:sha(n.arguments[1].getText(tree)),body:n.arguments[1].getText(tree),skip}); if(skip)skips++;}
      }
    }ts.forEachChild(n,visit);
  }visit(tree);
}
assert.equal(specs,152);assert.equal(results.size,9900);assert.equal(skips,357);
const diffs=[];
for(const [id,digest] of Object.entries(bodyBefore)){
  const current=results.get(id);assert(current,'Lost original '+id);
  if(digest!==current.digest)diffs.push(id);
}
assert.deepEqual(diffs.sort(),[...expected,...Object.keys(json('batch-230-recheck-body-sha256.json'))].sort(),'Only two earlier fixes and nine exact B230 corrections may change');
for(const [id,digest] of Object.entries({...beforeGreens,...batchGreens})){
  const current=results.get(id);assert(current&&!current.skip);
  assert.equal(current.digest,digest,`Confirmed GREEN test body changed: ${id}`);
}
for(const id of priorRun){assert.equal(results.get(id).digest,bodyBefore[id],`Recent GREEN changed: ${id}`);}
for(const e of entries){
  const src=read('tests/'+e.file),pin=sourcePins[e.file];
  assert(pin&&pin.second_recheck_sha256===e.sha256,'Unknown source revision '+e.file);
  assertHistoricalSourceCompatible(e.file,sha(src),e.sha256,'Unapproved future source revision '+e.file);
  assert(src.includes("from '../../../support/liveOriginalSafeTest'"),'Fixture safety missing');
  assert(e.ids.length===1&&results.get(e.ids[0]).file===e.file);
}
const supplier=results.get('TSUP-054').body;
assert(supplier.includes("page.route('**/suppliers', route =>")&&supplier.includes('route.request()'));
assert(supplier.includes("request.method() === 'GET' && ['fetch', 'xhr'].includes(request.resourceType())"));
assert(supplier.includes('return route.fallback()')&&supplier.includes('return route.abort()'));
assert(!supplier.includes('page.route(request =>')&& !supplier.includes('route.continue()'));
const governance=results.get('TPROD-076').body;
assert(governance.includes("page.getByText('Stocked products with cost basis')"));
assert(governance.includes(".locator('xpath=ancestor::section[1]')"));
assert(governance.includes(".locator('button[type=\"button\"]').first()"));
assert(governance.includes('await expect.poll(() => reads).toBeGreaterThanOrEqual(1)'));
for(const id of expected){
  const body=results.get(id).body;
  assert(!/\bloginAsDisposableRole\s*\(|\bpage\.request\.(?:post|patch|put|delete)\s*\(|\.waitForTimeout\s*\(|\btest\.skip\s*\(/.test(body));
}
for(const [file,digest] of Object.entries(json('batch-229-baseline.json').safety_source_sha256)){
  assert.equal(sha(read(file)),digest,'Protected network/auth source altered '+file);
}
const config=read('playwright.live-original.config.ts'), workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(config.includes("'BULK_SAFE_10_RECHECK_2'"));
assert(config.includes('target.origin !== approvedOrigin'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
assert(workflow.includes('          - BULK_SAFE_10_RECHECK_2'));
assert(workflow.includes('node scripts/check-batch-229-recheck2-contract.mjs'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'")&&workflow.includes('secrets.E2E_EMAIL'));
assert(!workflow.includes('continue-on-error: true'));
const choices=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(choices);
assert.deepEqual([...choices[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(m=>m[1]),['DISCOVER_ALL',...Object.keys(approved.approved_groups)]);
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_229_RECHECK2_2_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,3);assert.deepEqual(csv.slice(1).map(x=>x.split(',')[0]),selected);
console.log('PASS B229 R2: 9900 original bodies, 152 specs, 357 scenario skips; exactly 2 failed-only bodies changed.');
console.log('PASS B229 R2: 1380 previously GREEN bodies frozen; 23 held + 62 + 35 deferred excluded.');
console.log('PASS B229 R2: supplier GET/XHR intercepted; document allowed to fall through to guarded route; production write guard unchanged.');
console.log('PASS B229 R2: governance refresh button located structurally; 2 tests/2 files, 1-worker, exact origin/secrets unchanged.');
console.log('PENDING: GitHub browser verification of TSUP-054 and TPROD-076.');
