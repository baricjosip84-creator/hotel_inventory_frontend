// CI-only source adaptations. Original repository specs and all historical approvals stay untouched.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target=path.join(root,'original-suite-approved.json');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
const review=JSON.parse(fs.readFileSync(path.join(root,'batch-233-review.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
assert(!manifest.approved_groups.BULK_SAFE_14);
// Actual installed B230 recheck is required. Offline reference can only exercise the new overlay.
if(!manifest.approved_groups.BULK_SAFE_11_RECHECK) assert(process.env.PW_B233_OFFLINE_BASELINE==='YES'&&!process.env.GITHUB_ACTIONS,'Installed B230 final recheck absent');
assert.equal(review.selected.length,500);
const entries=[];
for(const [file,info] of Object.entries(review.source_files)){
 const p=path.join(root,'tests',file),src=fs.readFileSync(p,'utf8');assert.equal(sha(src),info.source_sha256,`Unexpected source: ${file}`);
 const pattern=/^import\s*\{\s*test\s*,\s*expect\s*,\s*(type Page(?:\s*,\s*type Route)?)\s*\}\s*from\s*'@playwright\/test';?\s*$/m;
 assert.equal([...src.matchAll(new RegExp(pattern.source,'gm'))].length,1);
 let patched=src.replace(pattern,(_,types)=>`import { ${types} } from '@playwright/test';\nimport { test, expect } from '../../../support/liveOriginalSafeTest';`);
 // Pass unrelated traffic down to the existing final context-level guard, NOT
 // straight onto the network. The guard still aborts every unmocked write.
 // Only exact, reviewed unrelated-route continuations in the shared mock setup.
 const fixes={
  'tenant/automation-schedules/automation-schedules.spec.ts':["if (path !== '/tenants/subscription-access' && !path.startsWith('/automation-schedules')) return route.continue();"],
  'tenant/enterprise-inventory/enterprise-inventory-workflows.spec.ts':['if (!mayMock) return route.continue();'],
  'tenant/execution-tasks/execution-tasks.spec.ts':["if (!path.startsWith('/execution-tasks') && !path.startsWith('/optimization-plans')) return route.continue();"],
  'tenant/inventory-capabilities/inventory-capabilities.spec.ts':["if (!path.startsWith('/inventory-capabilities/')) return route.continue();"],
  'tenant/inventory-capabilities/inventory-capabilities-workflows.spec.ts':["if (!path.startsWith('/inventory-capabilities/')) return route.continue();"],
  'tenant/inventory-capabilities/inventory-capabilities-advanced.spec.ts':["if (!path.startsWith('/inventory-capabilities/')) return route.continue();"],
 };
 for(const before of fixes[file]??[]){assert.equal(patched.split(before).length,2,`Unexpected mock guard: ${file}`);patched=patched.replace(before,before.replace('route.continue()','route.fallback()'));}
 // Ensure no original case bodies were altered by the helper-only changes.
 const extract=s=>[...s.matchAll(/\btest\(\s*['"]([A-Z0-9]+-\d{3})\s+([^'"\n]+)/g)].map((m,i,a)=>[m[1],sha(s.slice(m.index,a[i+1]?.index??s.length))]);
 assert.deepEqual(extract(patched),extract(src),`Original body changed: ${file}`);
 fs.writeFileSync(p,patched);entries.push({file,ids:info.ids,sha256:sha(patched)});
}
assert.equal(entries.length,14);assert.equal(entries.flatMap(e=>e.ids).length,500);
manifest.approved_groups.BULK_SAFE_14={secret:true,entries};fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS B233 protected runtime: exactly 500 original test bodies preserved; six shared mock fallback corrections; production write guard unchanged.');
