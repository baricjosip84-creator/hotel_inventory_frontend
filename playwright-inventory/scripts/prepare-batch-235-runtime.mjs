import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {review,runtimeSources} from './check-batch-235-contract.mjs';
import crypto from 'node:crypto';
import {applyBatch234AuthRuntime} from './prepare-batch-234-auth-runtime.mjs';
import {applyRecheck} from './prepare-batch-235-recheck-runtime.mjs';
import {applyR2} from './prepare-batch-235-r2-runtime.mjs';
import {applyR3} from './prepare-batch-235-r3-runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await applyBatch234AuthRuntime(root);
const target=path.join(root,'original-suite-approved.json');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
const entries=[];
for(const [file,info] of Object.entries(review.source_files)){
 const source=runtimeSources.get(file);
 fs.writeFileSync(path.join(root,'tests',file),source);
 entries.push({file,ids:info.ids,sha256:crypto.createHash('sha256').update(source).digest('hex')});
}
manifest.approved_groups[review.group]={secret:true,entries:applyR3(root,applyR2(root,applyRecheck(root,review,entries)))};
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B235: guarded ephemeral overlay; original committed specs unchanged.');
