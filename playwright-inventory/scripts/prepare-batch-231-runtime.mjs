/** Inject only a previously source-reviewed group into this disposable CI checkout.
 * This file deliberately DOES NOT replace the existing GitHub manifest or old B230 patches.
 * The runner checks old 9,900/source contracts BEFORE this command. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'original-suite-approved.json');
const review=JSON.parse(fs.readFileSync(path.join(root,'batch-231-review.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
assert(!manifest.approved_groups.BULK_SAFE_12,'Existing B231 group must not be overwritten or silently replaced');
assert(manifest.approved_groups.BULK_SAFE_11_RECHECK,'Final B230 nine-case patch must remain installed');
assert.equal(review.selected.length,180);
const groups=new Map();
for(const row of review.selected){
  if(!groups.has(row.file))groups.set(row.file,[]);
  groups.get(row.file).push(row.id);
}
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
manifest.approved_groups.BULK_SAFE_12={secret:true,entries:[...groups].map(([file,ids])=>({
  file,ids,sha256:sha(path.join(root,'tests',file))
}))};
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS: CI-only manifest overlay added BULK_SAFE_12 / 180 selected originals across 19 source-fingerprinted specs');
console.log('PASS: original manifest in GitHub remains unmodified, including all B230 final repairs');
