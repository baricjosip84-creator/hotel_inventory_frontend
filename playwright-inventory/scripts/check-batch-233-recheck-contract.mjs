import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const original=read('batch-233-review.json');
const r=read('batch-233-recheck-review.json');
assert.equal(r.batch,'233-recheck');assert.equal(r.group,'BULK_SAFE_14_RECHECK');
const selected=new Set(original.selected.map(x=>x.id)), pass=new Set(r.passed), fail=new Set(r.failed), deferred=new Set(r.deferred), retry=new Set(r.selected.map(x=>x.id));
assert.equal(selected.size,500);assert.equal(pass.size,330);assert.equal(fail.size,170);assert.equal(retry.size,40);assert.equal(deferred.size,130);
assert([...selected].every(id=>pass.has(id)!==fail.has(id)));assert([...fail].every(id=>retry.has(id)!==deferred.has(id)));assert([...retry].every(id=>fail.has(id)&&!pass.has(id)));
assert.deepEqual(Object.values(r.edits).flatMap(e=>e.ids).sort(),[...retry].sort());
const ids=name=>fs.readFileSync(path.join(root,name),'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(line=>line.split(',')[0]);
const ledger=new Set(ids('INVENTORY_PLAYWRIGHT_BATCH_233_CONFIRMED_2105_PASS_IDS.csv'));
const held=new Set(ids('INVENTORY_PLAYWRIGHT_BATCH_233_HELD_DEFERRED_407_IDS.csv'));
assert.equal(ledger.size,2105);assert.equal(held.size,407);
assert([...original.prior_pass_ids,...pass].every(id=>ledger.has(id)));assert([...original.prior_held_ids,...deferred].every(id=>held.has(id)));
assert([...retry].every(id=>!ledger.has(id)&&!held.has(id)));
assert([...ledger].every(id=>!held.has(id)));
for(const [file,entry] of Object.entries(r.edits)){
  assert(entry.ids.every(id=>original.selected.some(x=>x.id===id&&x.file===file)));
  assert(/^[a-f0-9]{64}$/.test(entry.before_sha256)&&/^[a-f0-9]{64}$/.test(entry.after_sha256));
  assert(entry.changes.length>0);
  for(const change of entry.changes){assert(Number.isInteger(change.count)&&change.count>0);assert(change.before!==change.after);assert(!/\.skip\(|\.fixme\(|route\.continue\(|route\.fetch\(|page\.unroute\(|\.waitForTimeout\(/.test(change.after));}
}
console.log('PASS B233 recheck ledger: 330 genuine passes + 130 deferred + exactly 40 failed IDs for recheck; no pass or prior held ID repeated.');
