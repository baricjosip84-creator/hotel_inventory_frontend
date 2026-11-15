// B232 browser-result recheck. Keep the original dropdown and safety fixture.
// Called only AFTER both existing B232 contract checks and the guarded import overlay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target=path.join(root,'original-suite-approved.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
const group=manifest.approved_groups.BULK_SAFE_13;
const review=JSON.parse(fs.readFileSync(path.join(root,'batch-232-review.json'),'utf8'));
assert.equal(group.secret,true);
assert.equal(group.entries.length,8);
const originalIds=group.entries.flatMap(e=>e.ids);
assert.equal(originalIds.length,240);
assert.deepEqual([...originalIds].sort(),review.selected.map(s=>s.id).sort());
const evidence=JSON.parse(fs.readFileSync(path.join(root,'batch-232-browser-results.json'),'utf8'));
assert.equal(evidence.log,'logs_118165626648.zip');
assert.equal(evidence.passed.length,136); assert.equal(evidence.failed.length,104);
assert.deepEqual([...evidence.passed,...evidence.failed].sort(),[...originalIds].sort());
const fixes=[
 {id:'TINT-001',file:'tenant/intelligence-review/intelligence-review.spec.ts',from:"getByRole('heading',{name:'Intelligence Review'})",to:"getByRole('heading',{name:'Intelligence Review',level:1,exact:true})"},
 {id:'TINT-006',file:'tenant/intelligence-review/intelligence-review.spec.ts',from:"page.getByRole('link',{name:'Open action center'})",to:"page.locator('#ai-review-pw-action-001').getByRole('link',{name:'Open action center',exact:true})"},
 {id:'TUSR-019',file:'tenant/users/users.spec.ts',from:"page.getByRole('status')).toContainText('User created successfully.')",to:"page.locator('#tenant-users-workspace-top').getByRole('status')).toContainText('User created successfully.')"},
 {id:'TSES-049',file:'tenant/sessions/sessions-batch33.spec.ts',from:"await page.addInitScript(()=>{localStorage.removeItem('inventory_access_token');localStorage.removeItem('inventory_csrf_token');});",to:"await page.context().clearCookies();\n  await page.addInitScript(()=>{localStorage.removeItem('inventory_access_token');localStorage.removeItem('inventory_csrf_token');});"},
];
assert.deepEqual(fixes.map(f=>f.id).sort(),[...evidence.recheck].sort());
for(const f of fixes) assert(evidence.failed.includes(f.id)&&!evidence.passed.includes(f.id),`Not failed-only: ${f.id}`);
const entries=[];
for(const e of group.entries){
 const srcPath=path.join(root,'tests',e.file), original=fs.readFileSync(srcPath,'utf8');
 assert.equal(sha(original),e.sha256,`Runtime source drift: ${e.file}`);
 const relevant=fixes.filter(f=>f.file===e.file);
 if(!relevant.length)continue;
 let source=original;
 for(const f of relevant){
  assert(e.ids.includes(f.id));
  const start=source.indexOf(`test('${f.id} `);
  assert(start>=0,`Missing case ${f.id}`);
  const next=source.indexOf("test('",start+6);
  const end=next<0?source.length:next;
  const body=source.slice(start,end);
  assert.equal(body.split(f.from).length,2,`Expected exactly one scoped correction for ${f.id}`);
  source=source.slice(0,start)+body.replace(f.from,f.to)+source.slice(end);
 }
 assert(source.includes("from '../../../support/liveOriginalSafeTest'"));
 fs.writeFileSync(srcPath,source);
 entries.push({file:e.file,ids:relevant.map(f=>f.id),sha256:sha(source)});
}
assert.equal(entries.length,3);assert.equal(entries.flatMap(e=>e.ids).length,4);
group.entries=entries;
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS: BULK_SAFE_13 now contains exactly four failed-only original test IDs; 136 GREEN and 100 deferred B232 IDs excluded.');
