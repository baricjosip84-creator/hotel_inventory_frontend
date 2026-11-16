// Local CI report only, never uploaded or printed (may include failure diagnostics).
import fs from 'node:fs';import assert from 'node:assert/strict';
const access=JSON.parse(fs.readFileSync('batch-234-live-access.json','utf8'));
assert.equal(access.status,'PROBED');assert.equal(access.blocked.length,0,'Access-unverified originals cannot be green');assert.equal(access.runnable.length,86);
const report=JSON.parse(fs.readFileSync('batch-234-results.json','utf8'));
const found=new Map();function walk(suite){for(const spec of suite.specs??[]){const match=spec.title.match(/^([A-Z0-9]+-\d{3})\b/);assert(match);assert(!found.has(match[1]));assert.equal(spec.tests.length,1);const t=spec.tests[0];assert.equal(t.expectedStatus,'passed');assert.equal(t.results.length,1);found.set(match[1],t.results[0].status);}for(const s of suite.suites??[])walk(s);}
for(const suite of report.suites??[])walk(suite);assert.deepEqual([...found.keys()].sort(),[...access.runnable].sort());assert([...found.values()].every(x=>x==='passed'),'Not every reviewed original actually passed');console.log('B234 actual results: all 86 original IDs passed (zero skipped or unexecuted).');
