import {assertHistoricalSourceCompatible} from './batch-229-recheck-source-allowlist.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url), ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const manifest=JSON.parse(read('original-suite-approved.json'));
const b=JSON.parse(read('batch-229-baseline.json'));
const source228=JSON.parse(read('batch-228-baseline.json'));
const priorRetry=JSON.parse(read('batch-228-recheck-baseline.json'));
const frozen=JSON.parse(read('batch-229-confirmed-1290-green-body-sha256.json'));
const frozen1205=JSON.parse(read('batch-228-frozen-green-body-sha256.json'));
const frozen70=JSON.parse(read('batch-228-confirmed-70-green-body-sha256.json'));
const group=manifest.approved_groups.BULK_SAFE_10;
assert(group && group.secret===true && Array.isArray(group.entries) && group.entries.length===14);
const approvedKeys=Object.keys(manifest.approved_groups);
const previousKeys=b.approved_groups_previous;
assert.deepEqual(approvedKeys.slice(0,previousKeys.length),previousKeys,'Historical groups changed');
assert.equal(approvedKeys[previousKeys.length],'BULK_SAFE_10');
assert.deepEqual(approvedKeys.slice(previousKeys.length+1),['BULK_SAFE_10_RECHECK','BULK_SAFE_10_RECHECK_2']);
assert.equal(b.all_original_tests,9900);assert.equal(b.original_spec_files,152);assert.equal(b.scenario_skips,357);
const confirmed=[...source228.confirmed_green_ids,...manifest.batch_228_execution.passed_ids,...priorRetry.recheck_ids];
const excluded=[...source228.held_unverified_ids,...manifest.batch_228_recheck.deferred_unverified_ids];
assert.deepEqual(confirmed,b.confirmed_green_ids);assert.deepEqual(excluded,[...b.held_unverified_ids,...b.deferred_unverified_ids]);
assert.equal(confirmed.length,1290); assert.equal(excluded.length,85);
assert.equal(new Set(confirmed).size,1290);assert.equal(new Set(excluded).size,85);
assert.equal(new Set([...confirmed,...excluded]).size,1375);
assert.equal(Object.keys(frozen).length,1290);
for(const [id,digest] of Object.entries(frozen1205))assert.equal(frozen[id],digest,'Historical B227 green hash lost '+id);
for(const [id,digest] of Object.entries(frozen70))assert.equal(frozen[id],digest,'B228 first run green hash lost '+id);
const ids=group.entries.flatMap(e=>e.ids);
assert.deepEqual(ids,b.selected_ids);assert.equal(ids.length,127);assert.equal(new Set(ids).size,127);
assert.equal(new Set([...ids,...confirmed,...excluded]).size,127+1290+85,'Repeated test is selected');
assert.deepEqual(group.entries.map(e=>e.file),Object.keys(b.selected_by_file));
const sourceFiles=new Set(group.entries.map(e=>e.file));
const observed=new Map();let specs=0;let skips=0;
function list(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const file=path.join(dir,e.name);return e.isDirectory()?list(file):e.name.endsWith('.spec.ts')?[file]:[];
});}
for(const file of list(path.join(root,'tests'))){
 specs++;const source=fs.readFileSync(file,'utf8');const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,'Invalid TypeScript syntax '+file);
 const relative=path.relative(path.join(root,'tests'),file).replaceAll('\\','/');
 function visit(n){
  if(ts.isCallExpression(n)){
   const expr=n.expression;
   const normal=ts.isIdentifier(expr)&&['test','it'].includes(expr.text);
   const skip=ts.isPropertyAccessExpression(expr)&&expr.expression.getText(tree)==='test'&&expr.name.text==='skip';
   if((normal||skip)&&ts.isStringLiteral(n.arguments[0])){
    const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
    if(id){assert(!observed.has(id),'Repeated authored ID '+id);observed.set(id,{file:relative,body:n.arguments[1]?.getText(tree)||'',skip});if(skip)skips++;}
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(tree);
}
assert.equal(specs,152);assert.equal(observed.size,9900);assert.equal(skips,357);
for(const [id,digest] of Object.entries(frozen)){
 const record=observed.get(id);assert(record&&!record.skip,'Past GREEN ID missing or skipped '+id);
 assert.equal(sha(record.body),digest,'Previously passing test BODY changed '+id);
}
const unsafe=[/\btest\.skip\s*\(/,/\btest\.only\s*\(/,/\bloginAsDisposableRole\s*\(/,/\bpage\.request\.(?:post|patch|put|delete)\s*\(/,/\broute\.continue\s*\(/,/\.waitForTimeout\s*\(/];
for(const e of group.entries){
 assert(/^tenant\/[a-z0-9-]+\/[a-z0-9-]+\.spec\.ts$/.test(e.file),'Non-tenant source path '+e.file);
 const source=read('tests/'+e.file);
 assert(source.includes("from '../../../support/liveOriginalSafeTest'"),'Missing protected Playwright fixture '+e.file);
 assertHistoricalSourceCompatible(e.file,sha(source),e.sha256,'Unreviewed spec changed '+e.file);
 if(!manifest.batch_229_recheck?.recheck_ids.some(id=>e.ids.includes(id)))
   assert.equal(e.sha256,b.spec_sha256[e.file]);
 assert.deepEqual(e.ids,b.selected_by_file[e.file]);
 for(const id of e.ids){
  const test=observed.get(id);assert(test&&!test.skip&&test.file===e.file,'Misplaced/skipped test '+id);
  assert(/\bexpect(?:\.|\s*\()/.test(test.body),'No assertion '+id);
  for(const rx of unsafe)assert(!rx.test(test.body),'Disallowed selected-test operation '+id+' '+rx);
 }
}
for(const [file,digest] of Object.entries(b.safety_source_sha256))assert.equal(sha(read(file)),digest,'Changed safety boundary '+file);
const guard=read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])
 assert(guard.includes(marker),'Live write guard weakened: '+marker);
const config=read('playwright.live-original.config.ts');
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(config.includes("'BULK_SAFE_10'")&&config.includes('.includes(GROUP) ? 1'),'Single-worker B229 missing');
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'")&&config.includes('target.origin !== approvedOrigin'));
assert(workflow.includes('          - BULK_SAFE_10') && workflow.includes('node scripts/check-batch-229-contract.mjs'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'")&&workflow.includes('secrets.E2E_EMAIL')&&workflow.includes('secrets.E2E_PASSWORD'));
assert(!workflow.includes('continue-on-error: true'));
const choices=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(choices);assert.deepEqual([...choices[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(x=>x[1]),['DISCOVER_ALL',...Object.keys(manifest.approved_groups)]);
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_229_SELECTED_127_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,128);assert.deepEqual(csv.slice(1).map(r=>r.split(',')[0]),ids);
console.log('PASS B229: 9,900 authored IDs / 152 spec files / 357 original skips; TypeScript syntax clean.');
console.log('PASS B229: 1,290 GREEN bodies unchanged; 23 old HELD + 62 deferred excluded.');
console.log('PASS B229: 127 new unskipped original tenant tests in 14 fingerprinted sources; no overlaps.');
console.log('PASS B229: Existing production guard, auth, single-worker execution, local origin and no-artifact settings retained.');
console.log('NOT VERIFIED: actual browser outcomes for Batch 229; require GitHub run.');
