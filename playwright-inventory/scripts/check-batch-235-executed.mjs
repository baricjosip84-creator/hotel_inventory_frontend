import fs from 'node:fs';import assert from 'node:assert/strict';
const plan=JSON.parse(fs.readFileSync('batch-235-review.json','utf8'));
const expected=plan.selected.map(x=>x.id),sort=x=>[...x].sort();
assert.equal(expected.length,209);
assert(fs.existsSync('batch-235-live-access.json'),'B235 not executed: access preflight missing');
const access=JSON.parse(fs.readFileSync('batch-235-live-access.json','utf8'));
assert.equal(access.status,'PROBED','B235 access preflight incomplete');
assert.deepEqual(sort([...access.runnable,...access.blocked]),sort(expected));
assert(fs.existsSync('batch-235-results.json'),'B235 execution report missing');
const report=JSON.parse(fs.readFileSync('batch-235-results.json','utf8'));
const seen=new Map();
function walk(s){
 for(const spec of s.specs??[]){
  const id=spec.title.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
  assert(id&&!seen.has(id));assert.equal(spec.tests.length,1);
  const t=spec.tests[0];seen.set(id,t.expectedStatus==='passed'&&t.results.length===1&&t.results[0].status==='passed'?'PASS':'UNVERIFIED');
 }
 for(const child of s.suites??[])walk(child);
}
for(const s of report.suites??[])walk(s);
assert([...seen.keys()].every(i=>access.runnable.includes(i)));
const pass=expected.filter(i=>seen.get(i)==='PASS'),unresolved=expected.filter(i=>seen.get(i)!=='PASS');
console.log('B235 ACTUAL PASS '+pass.length+'/209');
console.log('PASS IDs: '+pass.join(','));
console.log('UNRESOLVED IDs: '+unresolved.join(','));
assert.equal(unresolved.length,0,'No false green: failed, skipped, unexecuted and access-gated originals remain unresolved.');
