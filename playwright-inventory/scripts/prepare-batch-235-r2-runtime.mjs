import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sorted=a=>[...a].sort();
export function applyR2(root,entries){
 const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
 const prior=read('batch-235-recheck-review.json'),plan=read('batch-235-r2-review.json');
 const partition=[...plan.passed,...plan.held,...plan.recheck];
 assert.equal(plan.passed.length,41);assert.equal(plan.held.length,3);assert.equal(plan.recheck.length,118);
 assert.deepEqual(sorted(partition),sorted(prior.recheck));
 assert.deepEqual(sorted(entries.flatMap(e=>e.ids)),sorted(prior.recheck));
 const keep=new Set(plan.recheck);
 const patch=(file,edits)=>{
  const name=path.join(root,file);let s=fs.readFileSync(name,'utf8');
  for(const {before,after} of edits){assert.equal(s.split(before).length,2,'R2 anchor mismatch '+file);s=s.replace(before,after);}
  assert.equal(ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS).parseDiagnostics.length,0,file);
  fs.writeFileSync(name,s);return s;
 };
 for(const e of entries){
  if(plan.edits[e.file]){
   const source=patch('tests/'+e.file,plan.edits[e.file]);
   assert(!/\broute\.(?:continue|fetch)\(/.test(source));
   e.sha256=crypto.createHash('sha256').update(source).digest('hex');
  }
  e.ids=e.ids.filter(i=>keep.has(i));
 }
 patch('support/tenantSession.ts',[
  {before:"import { restoreBulkTenantSession } from './liveOriginalSafeTest';",after:"import { restoreBulkTenantSession } from './liveOriginalSafeTest';\nimport { ensureB235Dashboard } from './b235DashboardRecovery.mjs';\nimport { writeFileSync } from 'node:fs';"},
  {before:`    await page.goto('/dashboard');
    const dashboard = page.getByRole('heading', { name: 'Operations Dashboard' });
    try {
      await expect(dashboard).toBeVisible({ timeout: 9_000 });
    } catch {
      // A rotated/invalid refresh session can outlive the JWT's nominal expiry.
      // Reauthenticate this worker once, then require the protected dashboard.
      // Do not silently skip the test when the account still cannot access it.
      await restoreBulkTenantSession(page);
      await expect(dashboard).toBeVisible({ timeout: 15_000 });
    }`,after:`    await ensureB235Dashboard(page,restoreBulkTenantSession,(reason:string)=>writeFileSync('.b234-auth-stop',reason,{mode:0o600}));`}
 ]);
 patch('support/liveOriginalSafeTest.ts',[
 {before:`        await page.goto('/login', { timeout: 20_000 });
        await page.locator('#login-email').fill(email, { timeout: 10_000 });
        await page.locator('#login-password').fill(password, { timeout: 10_000 });`,after:`        const loginDocument=await page.goto('/login',{waitUntil:'domcontentloaded',timeout:30_000});
        const status=loginDocument?.status()??0;
        if([401,403,429].includes(status)){stopAuthentication('HTTP '+status);throw new LoginFailure('Login document HTTP '+status,true);}
        if(status>=400)throw new LoginFailure('Login document HTTP '+status);
        if(new URL(page.url()).origin!==FRONTEND_ORIGIN)throw new LoginFailure('Unexpected login origin',true);
        await page.locator('#login-email').fill(email,{timeout:30_000});
        await page.locator('#login-password').fill(password,{timeout:20_000});`}
 ]);
 const selected=entries.filter(e=>e.ids.length);
 assert.deepEqual(sorted(selected.flatMap(e=>e.ids)),sorted(plan.recheck));
 assert.deepEqual(sorted(Object.keys(plan.pages)),sorted(new Set(selected.map(e=>e.file.split('/')[1]))));
 console.log('PASS B235 R2: 118 exact originals, 41 fresh passes excluded, 3 held; protected GET retry before credential renewal.');
 return selected;
}
