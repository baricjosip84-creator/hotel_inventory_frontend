import fs from 'node:fs';import assert from 'node:assert/strict';
const p=JSON.parse(fs.readFileSync('batch-244-review.json','utf8')),expected=p.selected,sort=x=>[...x].sort();
assert.equal(expected.length,3);
assert(fs.existsSync('batch-244-live-access.json'),'B244 browser preflight never ran');
const access=JSON.parse(fs.readFileSync('batch-244-live-access.json','utf8'));
assert.equal(access.status,'PROBED','B244 access preflight incomplete');
assert.deepEqual(sort([...access.runnable,...access.blocked]),sort(expected));
assert(fs.existsSync('batch-244-results.json'),'B244 actual browser report missing');
const report=JSON.parse(fs.readFileSync('batch-244-results.json','utf8')),seen=new Map();
function walk(s){for(const spec of s.specs??[]){
 const id=spec.title.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
 assert(id&&!seen.has(id));assert.equal(spec.tests.length,1);
 const t=spec.tests[0];seen.set(id,t.expectedStatus==='passed'&&t.results.length===1&&t.results[0].status==='passed'?'PASS':'UNVERIFIED');
}for(const child of s.suites??[])walk(child);}
for(const s of report.suites??[])walk(s);
assert([...seen.keys()].every(i=>access.runnable.includes(i)),'Unexpected original executed');
const pass=expected.filter(i=>seen.get(i)==='PASS'),unresolved=expected.filter(i=>seen.get(i)!=='PASS');
console.log('B244 ACTUAL PASS '+pass.length+'/3');console.log('PASS IDs: '+pass.join(','));
console.log('UNRESOLVED IDs: '+unresolved.join(','));
assert.equal(unresolved.length,0,'No false green: failed/skipped/unexecuted/access-unverified originals remain unresolved');
