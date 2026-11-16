import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const sorted=x=>[...x].sort();

export function applyRecheck(root,review,entries) {
 const plan=JSON.parse(fs.readFileSync(path.join(root,'batch-235-recheck-review.json'),'utf8'));
 assert.equal(plan.pass.length,47);
 assert.equal(plan.recheck.length,162);
 assert.equal(new Set([...plan.pass,...plan.recheck]).size,209);
 assert.deepEqual(sorted([...plan.pass,...plan.recheck]),sorted(review.selected.map(x=>x.id)));
 const keep=new Set(plan.recheck);
 const pageKeys=new Set(review.selected.filter(x=>keep.has(x.id)).map(x=>x.file.split('/')[1]));
 assert.deepEqual(sorted(Object.keys(plan.pages)),sorted(pageKeys));
 for(const entry of entries){
  const file=path.join(root,'tests',entry.file);
  let source=fs.readFileSync(file,'utf8');
  for(const {before,after} of plan.edits[entry.file]??[]){
   assert.equal(source.split(before).length,2,'B235 source anchor mismatch: '+entry.file);
   source=source.replace(before,after);
  }
  const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0,entry.file);
  assert(!/\broute\.(?:continue|fetch)\(/.test(source),'Unsafe route delegation: '+entry.file);
  fs.writeFileSync(file,source);
  entry.sha256=sha(source);entry.ids=entry.ids.filter(id=>keep.has(id));
 }
 const authFile=path.join(root,'support/liveOriginalSafeTest.ts');
 let auth=fs.readFileSync(authFile,'utf8');
 const change=(before,after)=>{assert.equal(auth.split(before).length,2,'B235 auth anchor mismatch');auth=auth.replace(before,after);};
 change("import { existsSync, readFileSync, writeFileSync } from 'node:fs';","import { existsSync, readFileSync, writeFileSync } from 'node:fs';\nimport { exchangeB235Session } from './b235SessionBroker';");
 change('    const session: WorkerSession = {\n      snapshot: await authenticateWithRecovery(),\n      lastLoginAt: Date.now(),\n      renew: async () => { session.snapshot = await authenticateWithRecovery(); session.lastLoginAt = Date.now(); },',
 `    // All B235 invocations are sequential. A private job-memory broker
    // survives Playwright worker replacement and the preceding route probe.
    // Never persist auth state to disk or share it with another account/job.
    ensureAuthenticationAllowed();
    const cached = await exchangeB235Session();
    const reusable = cached && Date.now() - cached.lastLoginAt <= MAX_SESSION_AGE_MS
      && !tokenExpiresSoon(cached.snapshot);
    const session: WorkerSession = {
      snapshot: reusable ? cached.snapshot : await authenticateWithRecovery(),
      lastLoginAt: reusable ? cached.lastLoginAt : Date.now(),
      renew: async () => {
        session.snapshot = await authenticateWithRecovery(); session.lastLoginAt = Date.now();
        await exchangeB235Session({snapshot:session.snapshot,lastLoginAt:session.lastLoginAt});
      },`);
 change('    await use(session);','    await exchangeB235Session({snapshot:session.snapshot,lastLoginAt:session.lastLoginAt});\n    await use(session);');
 change(`    try { await use(page); }
    finally { liveBulkSessions.delete(page); }`,
 `    try { await use(page); }
    finally {
      liveBulkSessions.delete(page);
      if (bulkEnabled()) {
        try { bulkSession.absorb(await page.context().storageState()); }
        catch { /* Closed page: retain the last proven session. */ }
        // Await publication before Playwright may discard a failed worker.
        await exchangeB235Session({snapshot:bulkSession.snapshot,lastLoginAt:bulkSession.lastLoginAt});
      }
    }`);
 // The earlier B234 synthetic guard ran before this extension. Check actual TS
 // syntax again and require the write guards to remain present.
 const {diagnostics}=ts.transpileModule(auth,{fileName:authFile,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 assert.equal(diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 assert(auth.includes("route.abort('blockedbyclient')")&&auth.includes('unexpectedlyCompletedWrites'));
 fs.writeFileSync(authFile,auth);
 const selected=entries.filter(x=>x.ids.length);
 assert.deepEqual(sorted(selected.flatMap(x=>x.ids)),sorted(plan.recheck));
 console.log('PASS B235 recheck: 162 exact unresolved original IDs; 47 passes excluded; private memory-only sequential session reuse.');
 return selected;
}
