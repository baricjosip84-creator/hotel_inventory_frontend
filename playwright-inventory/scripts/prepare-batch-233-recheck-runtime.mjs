import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target=path.join(root,'original-suite-approved.json');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
const r=JSON.parse(fs.readFileSync(path.join(root,'batch-233-recheck-review.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const initial=manifest.approved_groups.BULK_SAFE_14;
assert.equal(initial.entries.flatMap(e=>e.ids).length,500);
assert(!manifest.approved_groups[r.group]);
const entries=[];
for(const [file,patch] of Object.entries(r.edits)){
  const existing=initial.entries.find(e=>e.file===file);
  assert(existing&&patch.ids.every(id=>existing.ids.includes(id)));
  const filePath=path.join(root,'tests',file);
  let src=fs.readFileSync(filePath,'utf8');
  assert.equal(sha(src),patch.before_sha256,`Unexpected runtime source: ${file}`);
  assert.equal(sha(src),existing.sha256);
  for(const change of patch.changes){assert.equal(src.split(change.before).length-1,change.count,`Unexpected locator occurrences: ${file}`);src=src.split(change.before).join(change.after);}
  assert.equal(sha(src),patch.after_sha256,`Unexpected corrected output: ${file}`);
  assert(src.includes('support/liveOriginalSafeTest'));
  fs.writeFileSync(filePath,src);
  entries.push({file,ids:patch.ids,sha256:sha(src)});
}
assert.equal(entries.flatMap(e=>e.ids).length,40);
assert.deepEqual(entries.flatMap(e=>e.ids).sort(),r.selected.map(x=>x.id).sort());
// Do not leave the entire B233 group executable in this corrected runtime.
delete manifest.approved_groups.BULK_SAFE_14;
manifest.approved_groups[r.group]={secret:true,entries};
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B233 recheck: exactly 40 original IDs, locator/native validation changes only; protected fixture and original assertions retained.');
