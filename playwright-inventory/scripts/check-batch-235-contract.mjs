import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
export const review=JSON.parse(read('batch-235-review.json'));
const manifest=JSON.parse(read('original-suite-approved.json'));
const ledger=f=>read(f).trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]);
const sorted=x=>[...x].sort();
const ids=s=>[...s.matchAll(/\btest\(\s*['"]([A-Z0-9]+-\d{3})\s+/g)].map(m=>m[1]);
assert.equal(review.batch,235);assert.equal(review.group,'BULK_SAFE_16');assert.equal(review.count,209);
assert(!manifest.approved_groups.BULK_SAFE_16);
assert(manifest.approved_groups.BULK_SAFE_11_RECHECK||(!process.env.GITHUB_ACTIONS&&process.env.PW_B235_OFFLINE_BASELINE==='YES'),'Actual installed B230 final group is required');
const pass=ledger('INVENTORY_PLAYWRIGHT_BATCH_234_FINAL_CONFIRMED_2230_PASS_IDS.csv');
const held=ledger('INVENTORY_PLAYWRIGHT_BATCH_234_HELD_408_AFTER_RECHECK_IDS.csv');
assert.equal(new Set([...pass,...held]).size,2638);
assert.deepEqual(sorted(pass),sorted(review.prior_pass_ids));assert.deepEqual(sorted(held),sorted(review.prior_held_ids));
assert.equal(pass.length,2230);assert.equal(held.length,408);
const all=[];
for(const f of fs.readdirSync(path.join(root,'tests/tenant'),{recursive:true}))if(f.endsWith('.spec.ts'))all.push(...ids(read('tests/tenant/'+f)));
assert.equal(all.length,2938);assert.equal(new Set(all).size,2938);
const chosen=review.selected.map(s=>s.id);
assert.equal(new Set(chosen).size,209);assert(chosen.every(i=>all.includes(i)&&!pass.includes(i)));
assert.equal(chosen.filter(i=>held.includes(i)).length,71);
const planned=Object.entries(review.source_files).flatMap(([file,info])=>info.ids.map(id=>({file,id})));
assert.deepEqual(sorted(planned.map(x=>x.id)),sorted(chosen));
for(const {file,id} of planned)assert(review.selected.some(x=>x.file===file&&x.id===id));
assert.equal(Object.keys(review.pages).length,13);
// The installed B230 nine-case patch is authoritative. The reconstructed
// reference may predate those nine body edits. Only allow isolated differences
// inside those already-green original calls; all helpers and selected calls
// must be byte-identical. Preserve the actual installed bodies in the overlay.
const historicalRechecks=new Set((manifest.approved_groups.BULK_SAFE_11_RECHECK?.entries??[]).flatMap(e=>e.ids));
function calls(source,file){
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,file+' invalid source');
 const found=[];
 function visit(node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='test'&&node.arguments.length>1&&ts.isStringLiteral(node.arguments[0])){
   const id=node.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
   if(id)found.push({id,start:node.getStart(tree),end:node.end,text:node.getText(tree)});
  }
  ts.forEachChild(node,visit);
 }
 visit(tree);return found;
}
export const runtimeSources=new Map();
for(const [file,info] of Object.entries(review.source_files)){
 assert(file.startsWith('tenant/')&&!file.includes('..'));
 const source=read('tests/'+file).replace(/\r\n/g,'\n');
 assert.equal(sha(info.original),info.source_sha256);
 assert.equal(sha(info.patched),info.runtime_sha256);
 let runtime=info.patched;
 if(sha(source)!==info.source_sha256){
  const previous=calls(info.original,file),actual=calls(source,file),patched=calls(runtime,file);
  assert.deepEqual(previous.map(x=>x.id),actual.map(x=>x.id));
  const skeleton=(s,a)=>{for(const x of [...a].sort((a,b)=>b.start-a.start))if(historicalRechecks.has(x.id)&&!info.ids.includes(x.id))s=s.slice(0,x.start)+'/*B230-'+x.id+'*/'+s.slice(x.end);return s;};
  assert.equal(sha(skeleton(source,actual)),sha(skeleton(info.original,previous)),'Unreviewed helper or selected-body change: '+file);
  for(const x of [...patched].sort((a,b)=>b.start-a.start)){
   const a=actual.find(t=>t.id===x.id),p=previous.find(t=>t.id===x.id);
   if(a.text!==p.text){
    assert(historicalRechecks.has(x.id)&&!info.ids.includes(x.id)&&pass.includes(x.id));
    runtime=runtime.slice(0,x.start)+a.text.replaceAll('route.continue()','route.fallback()')+runtime.slice(x.end);
   }
  }
 }
 runtimeSources.set(file,runtime);
 assert.deepEqual(ids(source),ids(info.patched));
 assert(info.ids.every(i=>ids(source).includes(i)));
 assert(info.patched.includes("../../../support/liveOriginalSafeTest'"));
 assert(!/\broute\.(?:continue|fetch)\(/.test(info.patched));
 // Only fixture routing, safe poll initialization, and source-backed users
 // notification scopes are approved. Reverse these edits and verify the
 // original assertion/test count and all original strings are preserved.
 const count=s=>(s.match(/\bexpect(?:\.poll|\.soft)?\s*\(/g)||[]).length;
 assert.equal(count(info.original),count(info.patched));
 calls(runtime,file);
 const route=file.split('/')[1];assert(review.pages[route]);
}
const guard=read('support/liveOriginalSafeTest.ts');
assert(guard.includes("route.abort('blockedbyclient')")&&guard.includes('mockedWriteRequests')&&guard.includes('unexpectedlyCompletedWrites'));
const wf=read('../.github/workflows/inventory-original-suite.yml');
assert(wf.includes("inputs.group != 'BULK_SAFE_16'")&&wf.includes('PLAYWRIGHT_JSON_OUTPUT_FILE: batch-235-results.json'));
assert(wf.includes('node scripts/check-batch-235-executed.mjs')&&wf.includes('--workers=1 --reporter=list,json'));
console.log('PASS B235: 209 unique unresolved tenant IDs, 71 tracked rechecks, 138 first executions; 16 pinned source specs; 13 access gates.');
