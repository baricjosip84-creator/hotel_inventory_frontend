import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=JSON.parse(read('original-suite-approved.json'));
const previous=JSON.parse(read('batch-226-baseline.json'));
const current=JSON.parse(read('batch-227-baseline.json'));
const result=manifest.batch_226_last_execution;
const group=manifest.approved_groups.BULK_SAFE_08_RECHECK;
assert.equal(result.github_log,'logs_115424410070 (1).zip');
assert.equal(result.group,'BULK_SAFE_08');
assert.deepEqual([result.selected_original,result.passed_original,result.failed_original],[125,113,12]);
assert.equal(new Set([...result.passed_ids,...result.failed_ids]).size,125);
assert.deepEqual(new Set([...result.passed_ids,...result.failed_ids]),new Set(previous.selected_ids));
assert.deepEqual(current.confirmed_green_ids,[...previous.confirmed_green_ids,...result.passed_ids]);
assert.equal(new Set(current.confirmed_green_ids).size,1193);
assert.equal(current.held_unverified_ids.length,23);
assert.deepEqual(current.held_unverified_ids,previous.held_unverified_ids);
assert.equal(new Set(current.held_unverified_ids).size,23);
assert.equal(current.expected_original_suite_ids,9900);
assert.equal(current.live_status,'offline_preflight_only_gitHub_pending');
assert.deepEqual(current.selected_ids,result.failed_ids);
assert.deepEqual(result.failed_ids,['TFEED-036','TRC-060','TRC-061','TRC-062','TRC-063','TRC-064','TWKS-044','TWKS-045','TWKS-047','TWKS-048','TWKS-049','TWKS-050']);
assert(group.secret===true && group.entries.length===3);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]),[
 ['tenant/operations-feed/operations-feed.spec.ts',1],
 ['tenant/reliability-command/reliability-command.spec.ts',5],
 ['tenant/workspace/workspace.spec.ts',6]
]);
assert.deepEqual(group.entries.flatMap(e=>e.ids),result.failed_ids);
assert.equal(new Set([...current.confirmed_green_ids,...current.held_unverified_ids,...current.selected_ids]).size,1193+23+12);
const unsafe=[/test\.skip\s*\(/,/test\.only\s*\(/,/loginAsDisposableRole\s*\(/,/page\.request\.(?:post|patch|put|delete)\s*\(/,/route\.continue\s*\(/];
const collected=new Map();
for (const e of group.entries){
  const filename='tests/'+e.file,src=read(filename);
  assert.equal(sha(src),e.sha256,'Modified original source has unexpected fingerprint: '+filename);
  assert.equal(current.spec_sha256[e.file],e.sha256);
  assert(src.includes("from '../../../support/liveOriginalSafeTest'"),'Missing live safe guard: '+filename);
  const ast=ts.createSourceFile(filename,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,'Parse error '+filename);
  function visit(n){
    if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])&&ts.isArrowFunction(n.arguments[1])){
      const m=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/);
      if(m) {assert(!collected.has(m[1]),'Duplicate test ID '+m[1]);collected.set(m[1],n.arguments[1].getText(ast));}
    }
    ts.forEachChild(n,visit);
  }visit(ast);
  for(const id of e.ids) {
    const body=collected.get(id);assert(body,'Missing selected original test ID '+id);
    for(const rx of unsafe)assert(!rx.test(body),'Unsafe production operation '+id+' '+rx);
  }
}
for(const [id,expected] of Object.entries(current.previously_passed_test_body_sha256)) {
  if (!collected.has(id)) {
    const file=Object.entries(previous.selected_by_file).find(([,ids])=>ids.includes(id))?.[0];
    assert(file,'Passed ID has no previous source '+id);
    const ast=ts.createSourceFile(file,read('tests/'+file),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
    function visit(n){
      if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text==='test'&&ts.isStringLiteral(n.arguments[0])&&n.arguments[0].text.startsWith(id+' ')&&ts.isArrowFunction(n.arguments[1]))collected.set(id,n.arguments[1].getText(ast));
      ts.forEachChild(n,visit);
    }visit(ast);
  }
  assert.equal(sha(collected.get(id)||''),expected,'A previously passing original test body changed '+id);
}
assert.equal(Object.keys(current.previously_passed_test_body_sha256).length,113);
const ops=read('tests/tenant/operations-feed/operations-feed.spec.ts');
const addition=`    // Do not inspect option nodes before the async allowed-domains GET has populated the select.\n    // evaluateAll() does not retry on an empty locator; the original race returned [].\n    const workArea = page.getByLabel('Work area');\n    await expect(workArea).toBeVisible();\n    await expect(workArea.locator('option')).toHaveCount(3);\n    const choices = await workArea.locator('option').evaluateAll(options =>`;
const original=`    const choices = await page.getByLabel('Work area').locator('option').evaluateAll(options =>`;
assert(ops.includes(addition),'Async domain option readiness wait is missing');
assert.equal(sha(ops.replace(addition,original)),current.source_revision.previous_sha256,'Source change is not the one audited selector race fix');
assert.equal(sha(ops),current.source_revision.revised_sha256);
assert(current.source_revision.only_failed_test_id==='TFEED-036');
for(const [name,grp] of Object.entries(manifest.approved_groups)){
 for(const e of grp.entries??[grp]) {
   if(e.file===current.source_revision.file)assert.equal(e.sha256,current.source_revision.revised_sha256,'Historical reviewed fingerprint not repinned '+name);
 }
}
const guard=read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'",'unexpectedlyCompletedWrites',"return route.abort('blockedbyclient')"])
 assert(guard.includes(marker),'Production live write guard weakened: '+marker);
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
const config=read('playwright.live-original.config.ts');
assert(workflow.includes('          - BULK_SAFE_08_RECHECK'));
assert(workflow.includes('node scripts/check-batch-227-contract.mjs'));
assert(workflow.includes('secrets.E2E_EMAIL') && workflow.includes('secrets.E2E_PASSWORD'));
assert(!workflow.includes('continue-on-error: true'));
assert(config.includes("'BULK_SAFE_08_RECHECK'") && config.includes('.includes(GROUP) ? 1'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const rows=read('INVENTORY_PLAYWRIGHT_BATCH_227_SELECTED_12_IDS.csv').trim().split(/\r?\n/);
assert.equal(rows.length,13);
assert.deepEqual(rows.slice(1).map(r=>r.split(',')[0]),current.selected_ids);
console.log('PASS B227: GitHub B226 log reconciled exactly 113 GREEN / 12 FAIL; cumulative 1193 confirmed.');
console.log('PASS B227: 12 selected are exactly failed original IDs, with 1193 passed and 23 held excluded.');
console.log('PASS B227: Original 9900 IDs and all 113 winning test bodies retained; one audited selector readiness fix.');
console.log('PASS B227: Approved fingerprints, single-worker dispatch, JWT isolation and write boundary intact.');
console.log('PENDING B227: GitHub browser execution of 12 tests; offline verification is not a live PASS.');
