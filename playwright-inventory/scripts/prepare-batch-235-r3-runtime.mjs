import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sorted=a=>[...a].sort();
export function applyR3(root,entries){
 const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
 const prior=read('batch-235-r2-review.json'),plan=read('batch-235-r3-review.json');
 assert.equal(plan.passed.length,35);assert.equal(plan.held.length,1);assert.equal(plan.recheck.length,82);
 assert.deepEqual(sorted([...plan.passed,...plan.held,...plan.recheck]),sorted(prior.recheck));
 assert.deepEqual(sorted(entries.flatMap(e=>e.ids)),sorted(prior.recheck));
 const keep=new Set(plan.recheck),patched=new Set();
 for(const e of entries){
  if(plan.edits[e.file]){
   const name=path.join(root,'tests',e.file);let source=fs.readFileSync(name,'utf8');
   for(const {before,after,count} of plan.edits[e.file]){
    assert.equal(source.split(before).length-1,count,'R3 anchor mismatch '+e.file);
    source=source.replaceAll(before,after);
   }
   assert.equal(ts.createSourceFile(e.file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0,e.file);
   assert(!/\broute\.(?:continue|fetch)\(/.test(source));
   if(e.file.includes('tenant-permissions/')){
    assert(/permissions\/me'\)\)\s*return route\.fallback\(\)/.test(source));
    assert(!/permissions\/me[^\n]*fulfillJson/.test(source));
   }
   fs.writeFileSync(name,source);e.sha256=crypto.createHash('sha256').update(source).digest('hex');patched.add(e.file);
  }
  e.ids=e.ids.filter(i=>keep.has(i));
 }
 const selected=entries.filter(e=>e.ids.length);
 assert.deepEqual(sorted(patched),sorted(Object.keys(plan.edits)));
 assert.deepEqual(sorted(selected.flatMap(e=>e.ids)),sorted(plan.recheck));
 assert.deepEqual(sorted(Object.keys(plan.pages)),sorted(new Set(selected.map(e=>e.file.split('/')[1]))));
 assert.equal(new Set(plan.canary).size,2);assert(plan.canary.every(i=>keep.has(i)&&i.startsWith('TPER-')));
 console.log('PASS B235 R3: 82 unresolved originals, 35 actual passes excluded, 1 additional held; genuine permission GET preserved.');
 return selected;
}
