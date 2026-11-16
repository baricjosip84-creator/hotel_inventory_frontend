// Ephemeral CI overlay only. Never overwrite the committed original specs or historic groups.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import { applyBatch234AuthRuntime } from './prepare-batch-234-auth-runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const target=path.join(root,'original-suite-approved.json');
const m=JSON.parse(fs.readFileSync(target,'utf8')),r=JSON.parse(fs.readFileSync(path.join(root,'batch-234-review.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');assert(!m.approved_groups[r.group]);
if(!m.approved_groups.BULK_SAFE_11_RECHECK)assert(process.env.PW_B234_OFFLINE_BASELINE==='YES'&&!process.env.GITHUB_ACTIONS,'Actual installed B230 final group is required');
assert.equal(r.selected.length,86);const outputs=[];
const pattern=/\btest\(\s*['"]([A-Z0-9]+-\d{3})\s+([^'"\n]+)/g;
const extract=s=>[...s.matchAll(pattern)].map((v,i,a)=>({id:v[1],body:s.slice(v.index,a[i+1]?.index??s.length)}));
for(const [file,info] of Object.entries(r.source_files)){
 const target=path.join(root,'tests',file),src=fs.readFileSync(target,'utf8');assert.equal(sha(src),info.source_sha256);
 const importPattern=/^import\s*\{\s*test\s*,\s*expect\s*,\s*(type Page(?:\s*,\s*type Route)?)\s*\}\s*from\s*'@playwright\/test';?$/m;
 let patched=src.replace(importPattern,(_,types)=>`import { ${types} } from '@playwright/test';\nimport { test, expect } from '../../../support/liveOriginalSafeTest';`);assert(patched!==src);
 for(const c of info.helper_corrections){assert.equal(patched.split(c.before).length-1,c.count);assert.equal(c.after,c.before.replace('route.continue()','route.fallback()'));patched=patched.split(c.before).join(c.after);}
 for(const c of info.body_corrections){assert(info.ids.includes(c.id));const b=extract(patched).find(v=>v.id===c.id);assert.equal(b.body,c.before);assert.equal(sha(b.body),c.before_sha256);assert.equal(patched.split(c.before).length,2);patched=patched.replace(c.before,c.after);assert.equal(sha(extract(patched).find(v=>v.id===c.id).body),c.after_sha256);}
 assert.equal(sha(patched),info.runtime_sha256);const before=extract(src),after=extract(patched);assert.deepEqual(before.map(v=>v.id),after.map(v=>v.id));
 for(const v of before)if(!info.body_corrections.some(c=>c.id===v.id))assert.equal(after.find(x=>x.id===v.id).body,v.body);
 outputs.push({target,patched,entry:{file,ids:info.ids,sha256:sha(patched)}});
}
assert.equal(outputs.flatMap(o=>o.entry.ids).length,86);assert.deepEqual(outputs.flatMap(o=>o.entry.ids).sort(),r.selected.map(s=>s.id).sort());
await applyBatch234AuthRuntime(root);
for(const o of outputs)fs.writeFileSync(o.target,o.patched);m.approved_groups[r.group]={secret:true,entries:outputs.map(o=>o.entry)};fs.writeFileSync(target,JSON.stringify(m,null,2)+'\n');
console.log('PASS B234: 86 exact reviewed originals, safe fixture, source-pinned scoped locator repairs and fallback guards.');
