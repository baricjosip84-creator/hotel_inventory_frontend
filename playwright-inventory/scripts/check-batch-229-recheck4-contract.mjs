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
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const canonical=o=>JSON.stringify(o,Object.keys(o).sort());
const manifest=json('original-suite-approved.json');
const approved=manifest.approved_groups;
const groupName='BULK_SAFE_10_RECHECK_4';
const group=approved[groupName];
const prior=Object.fromEntries(Object.entries(approved).filter(([name])=>!['BULK_SAFE_10_RECHECK_4','BULK_SAFE_10_RECHECK_5','BULK_SAFE_10_RECHECK_6'].includes(name)));
const historical=json('batch-229-recheck4-prior-approved-groups.json');
assert.equal(Object.keys(prior).length,historical.prior_group_count,'Historical group count changed');
assert.equal(sha(JSON.stringify(prior,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)),historical.previous_approved_groups_sha256,'Historical approved groups changed');
assert.deepEqual(Object.keys(approved).filter(k=>!['BULK_SAFE_10_RECHECK_5','BULK_SAFE_10_RECHECK_6'].includes(k)).slice(-5),[
  'BULK_SAFE_10','BULK_SAFE_10_RECHECK','BULK_SAFE_10_RECHECK_2','BULK_SAFE_10_RECHECK_3',groupName]);
assert.equal(group.secret,true);
assert.deepEqual(group.entries.map(e=>[e.file,e.ids]),[['tenant/products/products.spec.ts',['TPROD-076']]]);
const revision=json('batch-229-recheck4-product-source-sha256.json')['tenant/products/products.spec.ts'];
const oldSources=json('batch-229-recheck3-152-source-sha256.json');
const previousBodies=json('batch-229-recheck4-before-9900-body-sha256.json');
assert.equal(Object.keys(previousBodies).length,9900);
assert.equal(Object.keys(oldSources).length,152);
assert.equal(oldSources['tenant/products/products.spec.ts'],revision.previous_sha256);
assert.equal(group.entries[0].sha256,revision.new_sha256);
assert.equal(revision.modified_test_id,'TPROD-076');
assert.deepEqual(manifest.batch_229_recheck4.github_fail_ids,['TPROD-076']);
assert.deepEqual(manifest.batch_229_recheck4.github_pass_ids,[]);
assert.equal(manifest.batch_229_recheck4.confirmed_green_before_run,1381);
const confirmed=new Set([
  ...Object.keys(json('batch-229-confirmed-1290-green-body-sha256.json')),
  ...Object.keys(json('batch-229-confirmed-87-green-body-sha256.json')),
  ...manifest.batch_229_recheck2.confirmed_pass_ids,
  'TSUP-054'
]);
assert.equal(confirmed.size,1381,'Earlier passes were not accounted for');
const excluded=new Set([
  ...json('batch-229-baseline.json').held_unverified_ids,
  ...json('batch-229-baseline.json').deferred_unverified_ids,
  ...manifest.batch_229_recheck.deferred_unverified_ids
]);
assert.equal(excluded.size,120,'Historical holds changed');
assert(!confirmed.has('TPROD-076')&&!excluded.has('TPROD-076'));
const known=new Map();let specs=0,skips=0;
function list(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const file=path.join(dir,e.name);
  return e.isDirectory()?list(file):e.name.endsWith('.spec.ts')?[file]:[];
});}
for(const file of list(path.join(root,'tests'))){
 specs++;
 const relative=path.relative(path.join(root,'tests'),file).replaceAll('\\','/');
 const source=fs.readFileSync(file,'utf8');
 const actual=sha(source);
 if(relative==='tenant/products/products.spec.ts'){const fifth=json('batch-229-recheck5-product-source-sha256.json')[relative];
   assert.equal(fifth.previous_sha256,revision.new_sha256);
   const sixth=json('batch-229-recheck6-product-source-sha256.json')[relative];
   assert.equal(sixth.previous_sha256,fifth.new_sha256);
   assert.equal(actual,sixth.new_sha256,'Product source differs from sixth reviewed fix');
 }
 else assert.equal(actual,oldSources[relative],'Non-selected original file changed: '+relative);
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,'TS parse failed '+relative);
 function visit(n){
  if(ts.isCallExpression(n)&&n.arguments.length>=2&&ts.isStringLiteral(n.arguments[0])){
   const call=n.expression;
   const normal=ts.isIdentifier(call)&&['test','it'].includes(call.text);
   const skip=ts.isPropertyAccessExpression(call)&&call.expression.getText(tree)==='test'&&call.name.text==='skip';
   if(normal||skip){
    const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
    if(id){
     assert(!known.has(id),'Duplicate original test ID '+id);
     const body=n.arguments[1].getText(tree);
     known.set(id,{file:relative,body,hash:sha(body),skip});
     if(skip)skips++;
    }
   }
  }
  ts.forEachChild(n,visit);
 }
 visit(tree);
}
assert.equal(specs,152);assert.equal(known.size,9900);assert.equal(skips,357);
let diffs=[];
for(const [id,expected] of Object.entries(previousBodies)){
 const current=known.get(id);assert(current,'Missing original test '+id);
 if(current.hash!==expected) diffs.push(id);
}
assert.deepEqual(diffs,['TPROD-076'],'Only previously failed original test TPROD-076 may change');
for(const id of confirmed)assert.equal(known.get(id)?.hash,previousBodies[id],'Confirmed passing body changed '+id);
for(const id of excluded)assert.equal(known.get(id)?.hash,previousBodies[id],'Previously held body changed '+id);
const t=known.get('TPROD-076');
assert(t&&!t.skip&&t.file==='tenant/products/products.spec.ts');
assert(t.body.includes(".locator('xpath=ancestor::section[1]')"));
assert(t.body.includes("const button = governancePanel.locator('button[type=\"button\"]').first()"));
assert(t.body.includes('await expect(governancePanel).toHaveCount(1)'));
assert(t.body.includes('await expect(button).toHaveCount(1)'));
assert(t.body.includes('await expect(button).toBeVisible()'));
assert(t.body.includes('await expect(button).toBeEnabled()'));
assert(t.body.includes('await button.click()'));
assert(t.body.includes('await expect.poll(() => reads).toBeGreaterThanOrEqual(1)'));
assert(t.body.includes("page.route('**/products/cost-governance-summary?*'"));
assert(!/\bloginAsDisposableRole\s*\(|\bpage\.request\.(post|patch|put|delete)\s*\(|\.waitForTimeout\s*\(|\btest\.skip\s*\(/.test(t.body));
const safe=json('batch-229-baseline.json').safety_source_sha256;
for(const [file,digest] of Object.entries(safe))assert.equal(sha(read(file)),digest,'Network/auth safety source changed '+file);
const guard=read('support/liveOriginalSafeTest.ts');
for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])
 assert(guard.includes(marker),'Production safety boundary weakened: '+marker);
const config=read('playwright.live-original.config.ts');
assert(config.includes("'BULK_SAFE_10_RECHECK_4'"));
assert(config.includes("'BULK_SAFE_10_RECHECK_3','BULK_SAFE_10_RECHECK_4'"));
assert(config.includes("retries: GROUP === 'BULK_SAFE_10_RECHECK_3' ? 1 : 0"));
assert(config.includes('target.origin !== approvedOrigin'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_10_RECHECK_4'));
assert(workflow.includes('node scripts/check-batch-229-recheck4-contract.mjs'));
assert(workflow.includes('secrets.E2E_EMAIL')&&workflow.includes('secrets.E2E_PASSWORD'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'"));
assert(!workflow.includes('continue-on-error: true'));
const options=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(options);
assert.deepEqual([...options[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(x=>x[1]),['DISCOVER_ALL',...Object.keys(approved)]);
console.log('PASS B229 R4: all 9,900 original IDs and 152 specs preserved; 357 deliberate skips unchanged.');
console.log('PASS B229 R4: only previously failed TPROD-076 body changed; all 1,381 confirmed passes and 120 held/deferred frozen.');
console.log('PASS B229 R4: panel scoped by actual Governance Summary heading with direct header button and API refetch still asserted.');
console.log('PASS B229 R4: production write guard, single worker, origin pin, credentials and no-trace policy unchanged.');
console.log('PENDING: real GitHub browser result for TPROD-076; no live pass claimed.');
