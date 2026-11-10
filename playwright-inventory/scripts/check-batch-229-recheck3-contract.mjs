import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const ts=createRequire(import.meta.url)('typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.dirname(root);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('original-suite-approved.json'));
const group=manifest.approved_groups.BULK_SAFE_10_RECHECK_3;
const old=manifest.approved_groups.BULK_SAFE_10_RECHECK_2;
const original=manifest.approved_groups.BULK_SAFE_10;
assert.equal(group.secret,true);
assert.deepEqual(group.entries,[old.entries[1]]);
assert.equal(group.entries[0].ids[0],'TPROD-076');
assert(original.entries.some(e=>e.file===group.entries[0].file && e.ids.includes('TPROD-076')));
assert.deepEqual(Object.keys(manifest.approved_groups).filter(k=>!['BULK_SAFE_10_RECHECK_4','BULK_SAFE_10_RECHECK_5','BULK_SAFE_10_RECHECK_6'].includes(k)).slice(-4),[
 'BULK_SAFE_10','BULK_SAFE_10_RECHECK','BULK_SAFE_10_RECHECK_2','BULK_SAFE_10_RECHECK_3']);
assert.deepEqual(manifest.batch_229_recheck3.github_pass_ids,['TSUP-054']);
assert.deepEqual(manifest.batch_229_recheck3.github_fail_ids,['TPROD-076']);
assert.equal(manifest.batch_229_recheck3.confirmed_green_before_run,1381);
const passed=new Set([
 ...Object.keys(JSON.parse(read('batch-229-confirmed-1290-green-body-sha256.json'))),
 ...Object.keys(JSON.parse(read('batch-229-confirmed-87-green-body-sha256.json'))),
 ...manifest.batch_229_recheck2.confirmed_pass_ids,
 'TSUP-054'
]);
assert.equal(passed.size,1381);
assert(!passed.has('TPROD-076'));
const excluded=new Set([
 ...JSON.parse(read('batch-229-baseline.json')).held_unverified_ids,
 ...JSON.parse(read('batch-229-baseline.json')).deferred_unverified_ids,
 ...manifest.batch_229_recheck.deferred_unverified_ids
]);
assert.equal(excluded.size,120);assert(!excluded.has('TPROD-076'));
const fingerprints=JSON.parse(read('batch-229-recheck3-152-source-sha256.json'));
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const results=new Map();let skipped=0;
for(const [name,expected] of Object.entries(fingerprints)){
 const code=read('tests/'+name);
 if(name==='tenant/products/products.spec.ts') {
   const newer=JSON.parse(read('batch-229-recheck4-product-source-sha256.json'))[name];
   assert.equal(newer.previous_sha256,expected);
   const fifth=JSON.parse(read('batch-229-recheck5-product-source-sha256.json'))[name];
   assert.equal(fifth.previous_sha256,newer.new_sha256);
   const sixth=JSON.parse(read('batch-229-recheck6-product-source-sha256.json'))[name];
   assert.equal(sixth.previous_sha256,fifth.new_sha256);
   assert.equal(sha(code),sixth.new_sha256,'Unexpected products source revision');
 } else assert.equal(sha(code),expected,'Historical file changed: '+name);
 const tree=ts.createSourceFile(name,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,name);
 function visit(n){
  if(ts.isCallExpression(n)&&n.arguments.length>=2&&ts.isStringLiteral(n.arguments[0])){
   const e=n.expression;
   const normal=ts.isIdentifier(e)&&['test','it'].includes(e.text);
   const isSkip=ts.isPropertyAccessExpression(e)&&e.expression.getText(tree)==='test'&&e.name.text==='skip';
   if(normal||isSkip){const id=n.arguments[0].text.match(/^([A-Z0-9]+-\d{3})\b/)?.[1];
    if(id){assert(!results.has(id));results.set(id,{name,sha:sha(n.arguments[1].getText(tree)),skipped:isSkip});if(isSkip)skipped++;}
   }
  }ts.forEachChild(n,visit);
 }visit(tree);
}
assert.equal(Object.keys(fingerprints).length,152);
assert.equal(results.size,9900);assert.equal(skipped,357);
for(const [id,hash] of Object.entries(JSON.parse(read('batch-229-confirmed-1290-green-body-sha256.json')))){
 assert.equal(results.get(id)?.sha,hash,'Changed historical passing body '+id);
}
for(const [id,hash] of Object.entries(JSON.parse(read('batch-229-confirmed-87-green-body-sha256.json')))){
 assert.equal(results.get(id)?.sha,hash,'Changed B229 passing body '+id);
}
assert.equal(results.get('TPROD-076').name,'tenant/products/products.spec.ts');
assert(!results.get('TPROD-076').skipped);

// The selected original source file must be SHA-pinned and not edited at all.
assert.equal(fingerprints['tenant/products/products.spec.ts'],group.entries[0].sha256);
const config=read('playwright.live-original.config.ts');
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(config.includes("'BULK_SAFE_10_RECHECK_3'"));
assert(config.includes("retries: GROUP === 'BULK_SAFE_10_RECHECK_3' ? 1 : 0"));
assert(config.includes('target.origin !== approvedOrigin'));
assert(config.includes("trace: 'off', screenshot: 'off', video: 'off'"));
assert(workflow.includes('          - BULK_SAFE_10_RECHECK_3'));
assert(workflow.includes('node scripts/check-batch-229-recheck3-contract.mjs'));
assert(workflow.includes("inputs.confirmation == 'ORIGINALTESTS'"));
assert(!workflow.includes('continue-on-error: true'));
const guard=read('support/liveOriginalSafeTest.ts');
for(const token of ["page.context().route('**/*'","property === 'continue'","property === 'fulfill'","return route.abort('blockedbyclient')"]){assert(guard.includes(token));}
const choices=workflow.match(/^\s{8}options:\s*$([\s\S]*?)(?=^\s{6}confirmation:)/m);
assert(choices);
assert.deepEqual([...choices[1].matchAll(/^\s{10}-\s+([A-Z0-9_]+)\s*$/gm)].map(x=>x[1]),['DISCOVER_ALL',...Object.keys(manifest.approved_groups)]);
console.log('PASS B229 R3: exactly one failed-only TPROD-076, 1381 GREEN and 120 HELD/deferred excluded.');
console.log('PASS B229 R3: 9900 original IDs, 152 unchanged sources, 357 skips and protected prod network guard.');
console.log('PASS B229 R3: bounded one-run Playwright retry for transient bootstrap ONLY in this selected group.');
console.log('PENDING B229 R3: authenticated GitHub browser result; no local live access.');
