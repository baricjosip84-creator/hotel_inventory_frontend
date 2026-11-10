import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const j=f=>JSON.parse(read(f));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const manifest=j('original-suite-approved.json');
const group='BULK_SAFE_10_RECHECK_5';
const approved=manifest.approved_groups;
const historical=j('batch-229-recheck4-prior-approved-groups.json');
const oldEntries=Object.fromEntries(Object.entries(approved).filter(([key])=>!['BULK_SAFE_10_RECHECK_4',group,'BULK_SAFE_10_RECHECK_6'].includes(key)));
const sortedJson=JSON.stringify(oldEntries,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
assert.equal(Object.keys(oldEntries).length,historical.prior_group_count);
assert.equal(sha(sortedJson),historical.previous_approved_groups_sha256,'Historical approved groups edited');
assert.deepEqual(Object.keys(approved).filter(k=>k!=='BULK_SAFE_10_RECHECK_6').slice(-2),['BULK_SAFE_10_RECHECK_4',group]);
assert.deepEqual(approved[group],{entries:[{file:'tenant/products/products.spec.ts',ids:['TPROD-076'],sha256:j('batch-229-recheck5-product-source-sha256.json')['tenant/products/products.spec.ts'].new_sha256}],secret:true});
assert.deepEqual(manifest.batch_229_recheck5.github_fail_ids,['TPROD-076']);
assert.equal(manifest.batch_229_recheck5.confirmed_green_before_run,1381);
const before=j('batch-229-recheck4-before-9900-body-sha256.json');
const sources=j('batch-229-recheck3-152-source-sha256.json');
const fourth=j('batch-229-recheck4-product-source-sha256.json')['tenant/products/products.spec.ts'];
const fifth=j('batch-229-recheck5-product-source-sha256.json')['tenant/products/products.spec.ts'];
assert.equal(fifth.previous_sha256,fourth.new_sha256);
assert.equal(Object.keys(before).length,9900);assert.equal(Object.keys(sources).length,152);
const confirmed=new Set([...Object.keys(j('batch-229-confirmed-1290-green-body-sha256.json')),...Object.keys(j('batch-229-confirmed-87-green-body-sha256.json')),...manifest.batch_229_recheck2.confirmed_pass_ids,'TSUP-054']);
const held=new Set([...j('batch-229-baseline.json').held_unverified_ids,...j('batch-229-baseline.json').deferred_unverified_ids,...manifest.batch_229_recheck.deferred_unverified_ids]);
assert.equal(confirmed.size,1381);assert.equal(held.size,120);assert(!confirmed.has('TPROD-076')&&!held.has('TPROD-076'));
function list(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const file=path.join(dir,e.name);return e.isDirectory()?list(file):e.name.endsWith('.spec.ts')?[file]:[];});}
const found=new Map(); let skips=0,specs=0;
for(const file of list(path.join(root,'tests'))){
 specs++;const rel=path.relative(path.join(root,'tests'),file).replaceAll('\\','/');const src=fs.readFileSync(file,'utf8');
 assert.equal(sha(src),rel==='tenant/products/products.spec.ts'?j('batch-229-recheck6-product-source-sha256.json')[rel].new_sha256:sources[rel],`Source drift ${rel}`);
 const tree=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS); assert.equal(tree.parseDiagnostics.length,0,`TS parse ${rel}`);
 function visit(node){
  if(ts.isCallExpression(node)&&node.arguments.length>1&&ts.isStringLiteral(node.arguments[0])){
   const c=node.expression;const ok=ts.isIdentifier(c)&&['test','it'].includes(c.text);const skip=ts.isPropertyAccessExpression(c)&&c.expression.getText(tree)==='test'&&c.name.text==='skip';
   if(ok||skip){const id=node.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];if(id){assert(!found.has(id),`Duplicate ${id}`);found.set(id,{file:rel,body:node.arguments[1].getText(tree),hash:sha(node.arguments[1].getText(tree)),skip});if(skip)skips++;}}
  }
  ts.forEachChild(node,visit);
 }visit(tree);
}
assert.equal(specs,152);assert.equal(found.size,9900);assert.equal(skips,357);
const diffs=Object.keys(before).filter(id=>before[id]!==found.get(id)?.hash);
assert.deepEqual(diffs,['TPROD-076']);
for(const id of confirmed) assert.equal(found.get(id).hash,before[id],`Passing body changed ${id}`);
for(const id of held) assert.equal(found.get(id).hash,before[id],`Held/deferred body changed ${id}`);
const t=found.get('TPROD-076');assert.equal(t.file,'tenant/products/products.spec.ts');assert(!t.skip);
for(const token of ["page.getByText('Stocked products with cost basis', { exact: true })",".locator('xpath=ancestor::section[1]')","governancePanel.locator('button[type=\"button\"]').first()","await expect(button).toHaveCount(1)","await expect(button).toBeVisible()","await expect(button).toBeEnabled()","await button.click()","await expect.poll(() => reads).toBeGreaterThanOrEqual(1)","page.route('**/products/cost-governance-summary?*'"]){assert(t.body.includes(token),`Test evidence missing: ${token}`);}
assert(!t.body.includes("has: page.getByRole('heading'"));
assert(!/\bloginAsDisposableRole\s*\(|\bpage\.request\.(?:post|put|patch|delete)\s*\(|\.waitForTimeout\s*\(|\btest\.skip\s*\(/.test(t.body));
for(const [filename,digest] of Object.entries(j('batch-229-baseline.json').safety_source_sha256))assert.equal(sha(read(filename)),digest,`Network/auth guard changed ${filename}`);
const guard=read('support/liveOriginalSafeTest.ts');for(const marker of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"])assert(guard.includes(marker));
const config=read('playwright.live-original.config.ts');assert(config.includes(`'${group}'`));assert(config.includes('target.origin !== approvedOrigin'));assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');assert(workflow.includes(`          - ${group}`));assert(workflow.includes('node scripts/check-batch-229-recheck5-contract.mjs'));assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'"));assert(workflow.includes('secrets.E2E_EMAIL')&&workflow.includes('secrets.E2E_PASSWORD'));assert(!workflow.includes('continue-on-error: true'));
const choices=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert.deepEqual([...choices[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(x=>x[1]),['DISCOVER_ALL',...Object.keys(approved)]);
console.log('PASS B229 RECHECK5: 9900 original IDs, 152 specs, 357 original skips');
console.log('PASS B229 RECHECK5: exact one-test correction, all 1381 GREEN and 120 held/deferred unchanged');
console.log('PASS B229 RECHECK5: anchored to visible StatCard and nearest section, structural header button, GET refetch assertion preserved');
console.log('PASS B229 RECHECK5: production safety/network/auth guards identical and GitHub one-test selector verified statically');
console.log('NOT VERIFIED: actual browser execution. TPROD-076 remains unconfirmed.');
