// Local CI report only, never uploaded or printed (may include failure diagnostics).
import fs from 'node:fs';import assert from 'node:assert/strict';
const plan=JSON.parse(fs.readFileSync('batch-234-final-recheck-review.json','utf8'));
assert.equal(plan.recheck_ids.length,7);
assert(fs.existsSync('batch-234-live-access.json'),'B234 stopped before live-access initialization; all seven rechecks remain unverified');
const access=JSON.parse(fs.readFileSync('batch-234-live-access.json','utf8'));
assert.equal(access.status,'PROBED');assert.equal(access.blocked.length,0,'Access-unverified originals cannot be green');assert.deepEqual([...access.runnable].sort(),[...plan.recheck_ids].sort());
assert(fs.existsSync('batch-234-results.json'),'B234 original execution report missing; no passing results can be certified');
const report=JSON.parse(fs.readFileSync('batch-234-results.json','utf8'));
const found=new Map();function walk(suite){for(const spec of suite.specs??[]){const match=spec.title.match(/^([A-Z0-9]+-\d{3})\b/);assert(match);assert(!found.has(match[1]));assert.equal(spec.tests.length,1);const t=spec.tests[0];assert.equal(t.expectedStatus,'passed');assert.equal(t.results.length,1);found.set(match[1],t.results[0].status);}for(const s of suite.suites??[])walk(s);}
for(const suite of report.suites??[])walk(suite);assert.deepEqual([...found.keys()].sort(),[...access.runnable].sort());
const pass=[...found].filter(([,s])=>s==='passed').map(([id])=>id);const unresolved=[...found].filter(([,s])=>s!=='passed').map(([id])=>id);
console.log('B234 final recheck actual passed: '+pass.length+'/7; unresolved: '+unresolved.length);console.log('PASS IDs: '+pass.join(','));console.log('UNRESOLVED IDs: '+unresolved.join(','));
assert.equal(unresolved.length,0,'Not every reviewed original actually passed');console.log('B234 actual results: all seven rechecked original IDs passed (zero skipped or unexecuted).');
