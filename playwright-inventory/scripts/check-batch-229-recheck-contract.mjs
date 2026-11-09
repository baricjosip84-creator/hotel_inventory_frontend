import {assertHistoricalSourceCompatible} from './batch-229-recheck-source-allowlist.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const ts=createRequire(import.meta.url)('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.dirname(root);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(read('original-suite-approved.json'));
const orig=JSON.parse(read('batch-229-pre-recheck-9900-frozen.json'));
const pin=JSON.parse(read('batch-229-recheck-source-sha256.json'));
const old=JSON.parse(read('batch-229-baseline.json'));
const current=JSON.parse(read('batch-229-recheck-baseline.json'));
const beforeGreen=JSON.parse(read('batch-229-confirmed-1290-green-body-sha256.json'));
const newGreen=JSON.parse(read('batch-229-confirmed-87-green-body-sha256.json'));
const original127=JSON.parse(read('batch-229-original-127-body-sha256.json'));
const group=manifest.approved_groups.BULK_SAFE_10_RECHECK;
const initial=manifest.approved_groups.BULK_SAFE_10;
const selected=group.entries.flatMap(e=>e.ids);
const passing=manifest.batch_229_execution.passed_ids;
const failed=manifest.batch_229_execution.failed_ids;
const deferred=manifest.batch_229_recheck.deferred_unverified_ids;
const expected=['TSUP-054','TPF-021','TSC-046','TPROD-069','TPROD-076'];
assert.deepEqual(selected,expected,'B229 recheck must select EXACT five reviewed IDs');
assert.deepEqual(selected,current.recheck_ids);
assert.equal(group.secret,true);assert.equal(group.entries.length,4);
assert.deepEqual(Object.keys(orig.spec_sha256).length,152);
assert.equal(Object.keys(orig.test_body_sha256).length,9900);
assert.equal(orig.skipped_ids.length,357);
assert.deepEqual(initial.entries.flatMap(e=>e.ids),old.selected_ids,'Original 127 IDs changed');
assert.deepEqual(manifest.batch_229_execution.group,'BULK_SAFE_10');
assert.deepEqual(manifest.batch_229_execution.source_commit,'f4c00a29d41ab05ce90ea5b6aad956f5b83ef376');
assert.equal(passing.length,87);assert.equal(failed.length,40);assert.equal(deferred.length,35);
assert.equal(new Set(passing).size,87);assert.equal(new Set(failed).size,40);assert.equal(new Set(deferred).size,35);
assert.equal(new Set([...passing,...failed]).size,127);
assert.deepEqual(new Set([...passing,...failed]),new Set(old.selected_ids));
assert.deepEqual(new Set([...selected,...deferred]),new Set(failed));
assert.equal(Object.keys(beforeGreen).length,1290);assert.equal(Object.keys(newGreen).length,87);
assert.deepEqual(new Set(Object.keys(newGreen)),new Set(passing));
assert.deepEqual(new Set(Object.keys(original127)),new Set(old.selected_ids));
const confirmed=new Set([...Object.keys(beforeGreen),...passing]);
const exclusions=new Set([...old.held_unverified_ids,...old.deferred_unverified_ids,...deferred]);
assert.equal(confirmed.size,1377);assert.equal(exclusions.size,120);
assert([...confirmed].every(id=>!exclusions.has(id)),'Passed/held overlap');
assert(selected.every(id=>!confirmed.has(id)&&!old.held_unverified_ids.includes(id)&&!old.deferred_unverified_ids.includes(id)),'A pass or held case was selected');
assert.deepEqual([...Object.keys(manifest.approved_groups)].slice(-4,-1),['BULK_SAFE_10','BULK_SAFE_10_RECHECK','BULK_SAFE_10_RECHECK_2']);
assert.deepEqual(Object.keys(manifest.approved_groups).slice(0,-4),old.approved_groups_previous);
const review=new Set(expected);
const found=new Map(),source=new Map();let specs=0,skips=0;
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const file=path.join(dir,e.name);return e.isDirectory()?files(file):e.name.endsWith('.spec.ts')?[file]:[];});}
for(const file of files(path.join(root,'tests'))){
 specs++;const rel=path.relative(path.join(root,'tests'),file).replaceAll('\\','/');
 const s=fs.readFileSync(file,'utf8'),digest=sha(s),baseline=orig.spec_sha256[rel];
 assert(baseline,`New/unapproved spec ${rel}`);
 if(pin[rel]){assert.equal(pin[rel].before_sha256,baseline);assertHistoricalSourceCompatible(rel,digest,pin[rel].after_sha256,`Unexpected spec drift ${rel}`);}
 else assert.equal(digest,baseline,`Non-B229 spec modified ${rel}`);
 source.set(rel,s);
 const tree=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,`Invalid TS in ${rel}`);
 function visit(n){
  if(ts.isCallExpression(n)&&n.arguments.length>1&&ts.isStringLiteral(n.arguments[0])){
   const normal=ts.isIdentifier(n.expression)&&['test','it'].includes(n.expression.text);
   const skip=ts.isPropertyAccessExpression(n.expression)&&n.expression.expression.getText(tree)==='test'&&n.expression.name.text==='skip';
   if(normal||skip){
    const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
    if(id){assert(!found.has(id),`Duplicate test ID ${id}`);const body=n.arguments[1].getText(tree);
      const digest=sha(body);const before=orig.test_body_sha256[id];assert(before,`Unexpected test ID ${id}`);
      if(review.has(id))assert.notEqual(digest,before,`Recheck body not fixed ${id}`);
      else assert.equal(digest,before,`Unapproved change to original test ${id}`);
      found.set(id,{file:rel,body,digest,skip});if(skip)skips++;
    }
   }
  }ts.forEachChild(n,visit);
 }visit(tree);
}
assert.equal(specs,152);assert.equal(found.size,9900);assert.equal(skips,357);
assert.deepEqual(new Set([...found].filter(([_,x])=>x.skip).map(([id])=>id)),new Set(orig.skipped_ids));
for(const [id,hash] of Object.entries(beforeGreen)){
 const r=found.get(id);assert(r&&!r.skip);assert.equal(r.digest,hash,`Previously green body changed ${id}`);
}
for(const [id,hash] of Object.entries(newGreen)){
 const r=found.get(id);assert(r&&!r.skip);assert.equal(r.digest,hash,`B229 newly green body changed ${id}`);
}
for(const [id,hash] of Object.entries(original127))assert.equal(orig.test_body_sha256[id],hash,`B229 historical original hash wrong ${id}`);
const required={
 'TSUP-054':['request.method()',"['fetch', 'xhr']", "page.route('**/suppliers'"],
 'TPF-021':['/api/decision-intelligence/probabilistic-forecasting-source/'],
 'TSC-046':["page.locator('section').filter", 'Read-only scenario planning'],
 'TPROD-069':["section.locator('select').nth(1).selectOption('name')","section.locator('select').nth(2).selectOption('asc')"],
 'TPROD-076':['Stocked products with cost basis','await expect.poll(() => reads)']
};
for(const e of group.entries){
 const currentSource=source.get(e.file);
 assert(currentSource && currentSource.includes("from '../../../support/liveOriginalSafeTest'"),'Unprotected fixture in '+e.file);
 assertHistoricalSourceCompatible(e.file,sha(currentSource),e.sha256,`Group SHA mismatch ${e.file}`);
 for(const id of e.ids){const test=found.get(id);assert(test&&!test.skip&&test.file===e.file,`Misplaced/disabled ${id}`);
  assert(/\bexpect(?:\.|\s*\()/.test(test.body),`Missing assertion ${id}`);
  for(const token of required[id])assert(test.body.includes(token),`Corrected implementation missing ${id}: ${token}`);
  for(const rx of [/\bloginAsDisposableRole\s*\(/,/\broute\.continue\s*\(/,/\btest\.skip\s*\(/,/\btest\.only\s*\(/,/\bpage\.request\.(?:post|patch|put|delete)\s*\(/,/\.waitForTimeout\s*\(/])
    assert(!rx.test(test.body),`Unapproved unsafe action ${id}: ${rx}`);
 }
}
// Historical safeguards are kept verbatim; source-level allowlisting does not touch network code.
for(const [file,digest] of Object.entries(old.safety_source_sha256))assert.equal(sha(read(file)),digest,`Production/auth guard changed ${file}`);
const guard=read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])
 assert(guard.includes(marker),`Missing live write guard ${marker}`);
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_10_RECHECK'") && config.includes('.includes(GROUP) ? 1'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
assert(workflow.includes('          - BULK_SAFE_10_RECHECK')&&workflow.includes('node scripts/check-batch-229-recheck-contract.mjs'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'"));
assert(workflow.includes('secrets.E2E_EMAIL') && workflow.includes('secrets.E2E_PASSWORD'));
assert(!workflow.includes('continue-on-error: true'));
const options=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(options);
assert.deepEqual([...options[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(x=>x[1]),['DISCOVER_ALL',...Object.keys(manifest.approved_groups)]);
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_229_RECHECK_5_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,6);assert.deepEqual(csv.slice(1).map(x=>x.split(',')[0]),selected);
const deferredCSV=read('INVENTORY_PLAYWRIGHT_BATCH_229_DEFERRED_35_IDS.csv').trim().split(/\r?\n/);
assert.equal(deferredCSV.length,36);assert.deepEqual(deferredCSV.slice(1).map(x=>x.split(',')[0]),deferred);
assert.equal(deferredCSV.slice(1).filter(x=>x.includes('disposable-role')).length,33);
console.log('PASS B229 RECHECK: original 9,900 test bodies frozen; EXACTLY five previously failed bodies corrected.');
console.log('PASS B229 RECHECK: all 1,377 GitHub GREEN bodies preserved, 23 historical HELD + 62 prior deferred + 35 newly deferred excluded.');
console.log('PASS B229 RECHECK: four pinned source changes; same 152 spec files, 357 original skips, safety/auth protections unchanged.');
console.log('PASS B229 RECHECK: exactly five approved IDs, four files, one worker, production write guard unchanged.');
console.log('PENDING: the five reviewed scenarios need one GitHub browser run.');
