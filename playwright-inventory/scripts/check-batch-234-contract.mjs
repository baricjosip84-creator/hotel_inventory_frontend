import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f)),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const r=json('batch-234-review.json'),m=json('original-suite-approved.json');
assert.equal(r.batch,234);assert.equal(r.group,'BULK_SAFE_15');assert.equal(r.count,86);assert.equal(r.selected.length,86);assert.equal(m.expected_suite_ids,9900);assert.equal(m.expected_spec_files,152);assert(!m.approved_groups[r.group]);
const ledger=f=>read(f).trim().split(/\r?\n/).slice(1).map(l=>l.split(',')[0]).sort();
const p=ledger('INVENTORY_PLAYWRIGHT_BATCH_233_FINAL_CONFIRMED_2145_PASS_IDS.csv'),h=ledger('INVENTORY_PLAYWRIGHT_BATCH_233_FINAL_HELD_DEFERRED_407_IDS.csv');
assert.equal(p.length,2145);assert.equal(h.length,407);assert.equal(new Set([...p,...h]).size,2552);assert.deepEqual(p,[...r.prior_pass_ids].sort());assert.deepEqual(h,[...r.prior_held_ids].sort());
const tracker=read('docs/issue-evidence/INVENTORY_APPLICATION_ISSUES_TRACKER_BATCH_233_FINAL_2026-11-15.csv');assert.equal(sha(tracker),r.prior_issue_tracker_sha256);
const old=json('batch-233-review.json');const closed=new Set([...p,...h]);assert(old.selected.every(s=>closed.has(s.id)));
const historic=new Set(Object.values(m.approved_groups).flatMap(g=>(g.entries??[g]).flatMap(e=>e.ids??[])));
const selected=new Map(r.selected.map(s=>[s.id,s]));assert.equal(selected.size,86);assert(![...selected.keys()].some(id=>closed.has(id)||historic.has(id)));assert.equal(Object.keys(r.source_files).length,8);
const pattern=/\btest\(\s*['"]([A-Z0-9]+-\d{3})\s+([^'"\n]+)/g;
const forbidden=/loginAsDisposableRole|requireDisposable|PW_[A-Z0-9_]+|\.request\.(?:post|put|patch|delete)\(|page\.context\(\)\.route\(|page\.unroute|test\.skip\(|test\.fixme\(|\.waitForTimeout\(|\broute\.fetch\(|\bbrowser\.newContext\(|\bcontext\.newPage\(|\bpage\.routeFromHAR\(/;
const located=new Set();
for(const [file,info] of Object.entries(r.source_files)){
 assert(/^tenant\/[a-z0-9-]+\/[a-z0-9-]+\.spec\.ts$/.test(file));
 const src=read('tests/'+file);assert.equal(sha(src),info.source_sha256,`Source drift ${file}`);
 const matches=[...src.matchAll(pattern)];for(let i=0;i<matches.length;i++){const a=matches[i],id=a[1];if(!info.ids.includes(id))continue;const item=selected.get(id),b=src.slice(a.index,matches[i+1]?.index??src.length);assert(item&&item.file===file&&!located.has(id));assert.equal(sha(b),item.source_segment_sha256,`Body drift ${id}`);assert(!forbidden.test(b));assert(/\bexpect(?:\.poll|\.soft)?\s*\(/.test(b));located.add(id);}
 assert(info.ids.every(id=>located.has(id)));
 assert(info.body_corrections.every(c=>info.ids.includes(c.id)&&sha(c.before)===c.before_sha256&&sha(c.after)===c.after_sha256));
}
assert.equal(located.size,86);
assert.deepEqual(Object.keys(r.pages).sort(),[...new Set(Object.keys(r.source_files).map(f=>f.split('/')[1]))].sort());
const guard=read('support/liveOriginalSafeTest.ts');for(const mark of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])assert(guard.includes(mark));
console.log('PASS B234: 86 new pinned originals, eight reviewed spec files, 2145 GREEN and 407 HELD disjoint, all 474 issue records preserved.');
