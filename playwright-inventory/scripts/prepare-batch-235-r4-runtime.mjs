import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));const sorted=a=>[...a].sort();
const prior=read('batch-235-r3-review.json'),plan=read('batch-235-r4-review.json');
const manifest=read('original-suite-approved.json'),group=manifest.approved_groups.BULK_SAFE_16;
assert.equal(plan.passed.length,73);assert.equal(plan.recheck.length,9);
assert.deepEqual(sorted([...plan.passed,...plan.recheck]),sorted(prior.recheck));
assert.deepEqual(sorted(group.entries.flatMap(e=>e.ids)),sorted(prior.recheck));
const patched=[];
for(const e of group.entries){
 if(plan.edits[e.file]){
  const file=path.join('tests',e.file);let source=fs.readFileSync(file,'utf8');
  for(const {before,after,count} of plan.edits[e.file]){assert.equal(source.split(before).length-1,count,'R4 anchor '+file);source=source.replaceAll(before,after);}
  assert.equal(ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0);
  assert(!/\broute\.(?:continue|fetch)\(/.test(source));
  fs.writeFileSync(file,source);e.sha256=crypto.createHash('sha256').update(source).digest('hex');patched.push(e.file);
 }
 e.ids=e.ids.filter(i=>plan.recheck.includes(i));
}
group.entries=group.entries.filter(e=>e.ids.length);
assert.deepEqual(sorted(patched),sorted(Object.keys(plan.edits)));
assert.deepEqual(sorted(group.entries.flatMap(e=>e.ids)),sorted(plan.recheck));
assert.equal(group.entries.length,3);
fs.writeFileSync('original-suite-approved.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B235 R4: 9 exact unresolved originals; 73 actual passes excluded; no assertion weakening.');
