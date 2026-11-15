import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const review=json('batch-233-review.json'), manifest=json('original-suite-approved.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
assert.equal(review.batch,233); assert.equal(review.group,'BULK_SAFE_14');
assert.equal(manifest.expected_suite_ids,9900);assert.equal(manifest.expected_spec_files,152);
assert(!manifest.approved_groups.BULK_SAFE_14,'Run checks before temporary group injection');
const p=new Set(review.prior_pass_ids),h=new Set(review.prior_held_ids);
assert.equal(p.size,1775);assert.equal(h.size,277);assert(![...p].some(i=>h.has(i)));
const ledgerIds=(f)=>fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(s=>s.split(',')[0]).sort();
assert.deepEqual(ledgerIds('INVENTORY_PLAYWRIGHT_BATCH_232_FINAL_CONFIRMED_1775_PASS_IDS.csv'),[...p].sort());
assert.deepEqual(ledgerIds('INVENTORY_PLAYWRIGHT_BATCH_232_FINAL_HELD_DEFERRED_277_IDS.csv'),[...h].sort());
const previous=json('batch-232-browser-results.json');
assert.equal(previous.passed.length,136);assert.equal(previous.recheck.length,4);assert.equal(previous.deferred.length,100);
assert([...previous.passed,...previous.recheck].every(i=>p.has(i)));assert(previous.deferred.every(i=>h.has(i)));
assert(json('batch-231-review.json').selected.every(i=>p.has(i.id)));
const historic=new Set(Object.values(manifest.approved_groups).flatMap(g=>(g.entries??[g]).flatMap(e=>e.ids??[])));
const selected=new Map(review.selected.map(x=>[x.id,x]));assert.equal(selected.size,500);assert.equal(review.selected.length,500);
assert(![...selected.keys()].some(i=>p.has(i)||h.has(i)||historic.has(i)), 'Previously attempted or held original selected');
assert.equal(Object.keys(review.source_files).length,14);
const disallowed=/loginAsDisposableRole|requireDisposable|\brole\s*:|PW_[A-Z0-9_]+|\breadonly\s*[:=]\s*true|\.request\.(?:post|put|patch|delete)\(|page\.context\(\)\.route\(|page\.unroute|localStorage\.setItem\(\s*['"]inventory_access_token|test\.skip\(|test\.fixme\(|\.waitForTimeout\(|\broute\.fetch\(|\bbrowser\.newContext\(|\bcontext\.newPage\(|\bpage\.routeFromHAR\(/;
const located=new Set();
for(const [file,info] of Object.entries(review.source_files)){
 assert(/^tenant\/[a-z0-9-]+\/[a-z0-9-]+\.spec\.ts$/.test(file));
 const src=fs.readFileSync(path.join(root,'tests',file),'utf8');assert.equal(sha(src),info.source_sha256,`Source drift: ${file}`);
 const matches=[...src.matchAll(/\btest\(\s*['"]([A-Z0-9]+-\d{3})\s+([^'"\n]+)/g)];
 for(let j=0;j<matches.length;j++){
  const m=matches[j],id=m[1];if(!info.ids.includes(id))continue;
  const item=selected.get(id),body=src.slice(m.index,matches[j+1]?.index??src.length);
  assert(item&&item.file===file&&!located.has(id));
  assert.equal(item.source_segment_sha256,sha(body),`Selected scenario drift: ${id}`);
  assert(!disallowed.test(body)&&id!=='TPRC-038',`Unsafe selected body: ${id}`);
  assert(/\bexpect(?:\.poll|\.soft)?\s*\(/.test(body));located.add(id);
 }
 assert(info.ids.every(i=>located.has(i)),`Missing selected original in ${file}`);
}
assert.equal(located.size,500);
const guard=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
for(const mark of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"]) assert(guard.includes(mark),'Live write safety missing: '+mark);
console.log('PASS B233: 500 pinned original cases, 14 source files, no overlap with 1775 GREEN or 277 HELD, no disposable-role selections.');
