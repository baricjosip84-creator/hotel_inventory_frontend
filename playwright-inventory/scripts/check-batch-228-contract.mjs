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
const read=(r)=>fs.readFileSync(path.join(root,r),'utf8');
const sha=(s)=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=JSON.parse(read('original-suite-approved.json'));
const state=JSON.parse(read('batch-228-baseline.json'));
const frozen=JSON.parse(read('batch-228-frozen-green-body-sha256.json'));
const b227=JSON.parse(read('batch-227-baseline.json'));
const group=manifest.approved_groups.BULK_SAFE_09;
assert(group && group.secret===true && group.entries.length===5);
assert.equal(state.expected_original_suite_ids,9900);
assert.equal(state.expected_original_spec_files,152);
assert.equal(state.selected_count,147);
assert.equal(state.confirmed_green_count,1205);
assert.equal(state.held_count,23);
assert.equal(state.prior_total_approved_unique,1228);
assert.equal(state.live_status,'offline_preflight_only_github_pending');
assert.deepEqual(new Set([...b227.confirmed_green_ids,...b227.selected_ids]),new Set(state.confirmed_green_ids),
 'B227 user-confirmed final 12 not included correctly');
assert.deepEqual(new Set(b227.held_unverified_ids),new Set(state.held_unverified_ids));
const selected=group.entries.flatMap(e=>e.ids);
assert.deepEqual(selected,state.selected_ids);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]),[
 ['tenant/inventory-reservations/inventory-reservations.spec.ts',36],
 ['tenant/inventory-requisitions/inventory-requisitions.spec.ts',32],
 ['tenant/execution-requests/execution-requests.spec.ts',29],
 ['tenant/inventory-usage/inventory-usage.spec.ts',32],
 ['tenant/cross-domain-optimization/cross-domain-optimization.spec.ts',18],
]);
assert.equal(selected.length,147);
assert.equal(new Set(selected).size,selected.length);
const green=new Set(state.confirmed_green_ids),held=new Set(state.held_unverified_ids);
assert.equal(green.size,1205);assert.equal(held.size,23);
assert(selected.every(id=>!green.has(id)&&!held.has(id)), 'Previously GREEN or held ID was reselected');
assert.equal(new Set([...green,...held,...selected]).size,1375);
// Prior approval groups cannot be revised by this new, independent batch.
const prior=Object.fromEntries(Object.entries(manifest.approved_groups).filter(([name])=>name!=='BULK_SAFE_09'&&name!=='BULK_SAFE_09_RECHECK'&&name!=='BULK_SAFE_10'&&name!=='BULK_SAFE_10_RECHECK'&&name!=='BULK_SAFE_10_RECHECK_2'&&name!=='BULK_SAFE_10_RECHECK_3'&&name!=='BULK_SAFE_10_RECHECK_4'));
const canonical=(o)=>JSON.stringify(o,(k,v)=> v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a<b?-1:a>b?1:0)):v);
assert.equal(sha(canonical(prior)),state.prior_approved_groups_sha256,'Earlier approved groups altered');
const astMaps=new Map();let total=0,skipCount=0,specCount=0;
const walkFiles=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
 const file=path.join(dir,e.name);
 return e.isDirectory()?walkFiles(file):e.name.endsWith('.spec.ts')?[file]:[];
});
for(const file of walkFiles(path.join(root,'tests'))){
 specCount++;const src=fs.readFileSync(file,'utf8');
 const ast=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(ast.parseDiagnostics.length,0,'Unparsable original TS '+file);
 const spec=path.relative(path.join(root,'tests'),file).replaceAll('\\','/');
 function visit(n){
  const isNormal=ts.isCallExpression(n) && ts.isIdentifier(n.expression)&&['test','it'].includes(n.expression.text);
  const isSkip=ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.getText(ast)==='test' && n.expression.name.text==='skip';
  if(ts.isCallExpression(n)&&(isNormal||isSkip)&&ts.isStringLiteral(n.arguments[0])){
   const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
   if(id){assert(!astMaps.has(id),'Duplicate original ID '+id);astMaps.set(id,{spec,body:n.arguments[1]?.getText(ast)||'',skipped:isSkip});total++;if(isSkip)skipCount++;}
  }
  ts.forEachChild(n,visit);
 }
 visit(ast);
}
assert.equal(specCount,152);assert.equal(total,9900);assert.equal(skipCount,357);
for(const [id,hash] of Object.entries(frozen)){
 const entry=astMaps.get(id);assert(entry&&!entry.skipped,'Missing past GREEN ID '+id);
 assert.equal(sha(entry.body),hash,'Previously GREEN test body changed '+id);
}
assert.equal(Object.keys(frozen).length,1205);
const forbidden=[/\btest\.skip\s*\(/,/\btest\.only\s*\(/,/\bloginAsDisposableRole\s*\(/,/\bpage\.request\.(?:post|put|patch|delete)\s*\(/,/\broute\.continue\s*\(/];
for(const e of group.entries){
 const file='tests/'+e.file,src=read(file);
 assert(src.includes("from '../../../support/liveOriginalSafeTest'"),'Missing production guard '+file);
 assert.equal(sha(src),e.sha256,'Selected source fingerprint mismatch '+file);
 assert.equal(e.sha256,e.file==='tenant/inventory-usage/inventory-usage.spec.ts' ? manifest.batch_228_recheck.recheck_usage_spec_sha256 : state.spec_sha256[e.file]);
 assert.deepEqual(e.ids,state.selected_by_file[e.file]);
 for(const id of e.ids){
  const entry=astMaps.get(id);assert(entry&&!entry.skipped&&entry.spec===e.file,'Selected ID misplaced or skipped '+id);
  assert(/\bexpect(?:\.|\s*\()/.test(entry.body),'Missing real assertion '+id);
  for(const f of forbidden)assert(!f.test(entry.body),'Unsafe production behavior '+id+' '+f);
 }
}
for(const [f,hash] of Object.entries(state.safety_source_sha256))
 assert.equal(sha(read(f)),hash,'Production safety/auth boundary changed '+f);
for(const marker of ["page.context().route('**/*'", "property === 'continue'", "property === 'fulfill'", "return route.abort('blockedbyclient')"])
 assert(read('support/liveOriginalSafeTest.ts').includes(marker),'Safety marker missing '+marker);
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
const config=read('playwright.live-original.config.ts');
assert(workflow.includes('          - BULK_SAFE_09'));
assert(workflow.includes('node scripts/check-batch-228-contract.mjs'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'"));
assert(workflow.includes('secrets.E2E_EMAIL')&&workflow.includes('secrets.E2E_PASSWORD'));
assert(!workflow.includes('continue-on-error: true'));
assert(config.includes("'BULK_SAFE_09'") && config.includes('.includes(GROUP) ? 1'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const csv=read('INVENTORY_PLAYWRIGHT_BATCH_228_SELECTED_IDS.csv').trim().split(/\r?\n/);
assert.equal(csv.length,148);
assert.deepEqual(csv.slice(1).map(s=>s.split(',')[0]),selected);
console.log('PASS B228: 9,900 original declarations / 152 spec files / 357 deliberate scenario skips.');
console.log('PASS B228: 1,205 past GREEN original bodies frozen; 23 HELD excluded; all old approval groups unchanged.');
console.log('PASS B228: exactly 147 unseen original test IDs in 5 fingerprinted, production-guarded specs.');
console.log('PASS B228: live origin, secrets, blocked-write boundary, no-artifact tracing and single-worker settings intact.');
console.log('PENDING B228: real GitHub/browser run not possible in local offline source preflight.');
