import fs from 'node:fs';import assert from 'node:assert/strict';
const p=JSON.parse(fs.readFileSync('batch-245-review.json','utf8')),expected=p.selected,sort=x=>[...x].sort();
assert.equal(expected.length,19);
const blocked=fs.readFileSync('INVENTORY_PLAYWRIGHT_BATCH_245_BLOCKED_228_IDS.csv','utf8').trim().split(/\r?\n/).slice(1).map(l=>l.split(',')[0]);
assert.equal(blocked.length,228);assert.equal(new Set([...expected,...blocked]).size,247);
console.log('TENANT CLOSURE BLOCKED: 228 originals require security conditions not present in this workflow. No 100% claim.');
assert(fs.existsSync('batch-245-live-access.json'),'B245 browser preflight never ran');
const access=JSON.parse(fs.readFileSync('batch-245-live-access.json','utf8'));
assert.equal(access.status,'PROBED','B245 access preflight incomplete');
assert.deepEqual(sort([...access.runnable,...access.blocked]),sort(expected));
assert(fs.existsSync('batch-245-results.json'),'B245 actual browser report missing');
const report=JSON.parse(fs.readFileSync('batch-245-results.json','utf8')),seen=new Map();
function walk(s){for(const spec of s.specs??[]){
 const id=spec.title.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
 assert(id&&!seen.has(id));assert.equal(spec.tests.length,1);
 const t=spec.tests[0];seen.set(id,t.expectedStatus==='passed'&&t.results.length===1&&t.results[0].status==='passed'?'PASS':'UNVERIFIED');
}for(const child of s.suites??[])walk(child);}
for(const s of report.suites??[])walk(s);
assert([...seen.keys()].every(i=>access.runnable.includes(i)),'Unexpected original executed');
const pass=expected.filter(i=>seen.get(i)==='PASS'),unresolved=expected.filter(i=>seen.get(i)!=='PASS');
const total=2691+pass.length;
console.log('B245 ACTUAL PASS '+pass.length+'/19');console.log('PASS IDs: '+pass.join(','));
console.log('UNRESOLVED SELECTED IDs: '+unresolved.join(','));
console.log('TENANT TOTAL '+total+'/2938 ('+(100*total/2938).toFixed(2)+'%); remaining '+(2938-total));
console.log('ORIGINAL TOTAL '+total+'/9900 ('+(100*total/9900).toFixed(2)+'%); remaining '+(9900-total));
assert.equal(unresolved.length,0,'No false green: failed/skipped/unexecuted/access-unverified originals remain unresolved');
