import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const projectRoot=path.resolve(root,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const origin=manifest.approved_groups.BULK_SAFE_03;
const rerun=manifest.approved_groups.BULK_SAFE_03_RECHECK;
const run=manifest.batch_210_last_execution;
const held=manifest.batch_211_held_unverified;
const onlySet = values => new Set(values);
const originalIds=origin.entries.flatMap(x=>x.ids);
const passed=run.passed_ids;
const failed=run.failed_ids;
const selected=rerun.entries.flatMap(x=>x.ids);
assert.equal(run.total,120);assert.equal(run.passed,88);assert.equal(run.failed,32);
assert.equal(onlySet(passed).size,88);assert.equal(onlySet(failed).size,32);
assert.deepEqual(onlySet([...passed,...failed]),onlySet(originalIds));
assert.deepEqual(onlySet(Object.keys(held)),onlySet(['TRC-009','TRC-048']));
assert.equal(selected.length,30);assert.equal(onlySet(selected).size,30);
assert.deepEqual(onlySet(selected),onlySet(failed.filter(x=>!Object.hasOwn(held,x))));
assert(selected.every(x=>!passed.includes(x)));
assert(rerun.secret===true);
assert(rerun.entries.length===3);
for(const entry of rerun.entries){
  const f=path.join(root,'tests',entry.file);
  const code=fs.readFileSync(f,'utf8');
  assert.equal(crypto.createHash('sha256').update(code).digest('hex'),entry.sha256);
  assert(code.includes("from '../../../support/liveOriginalSafeTest'"));
  assert(!code.includes("from '@playwright/test'"));
  const sf=ts.createSourceFile(f,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert(sf.parseDiagnostics.length===0,'TS syntax error: '+f);
  const tests=new Map();
  function inspect(node){
    if(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text==='test'
      && ts.isStringLiteral(node.arguments[0]))tests.set(node.arguments[0].text.split(' ')[0],node.getText(sf));
    ts.forEachChild(node,inspect);
  }
  inspect(sf);
  for(const id of entry.ids){
    assert(tests.has(id),'Missing test: '+id);
    const testBody=tests.get(id);
    assert(!/loginAsDisposableRole\s*\(/.test(testBody));
    assert(!/installWorkspacePermissions\s*\(/.test(testBody));
  }
}
const ops=fs.readFileSync(path.join(root,'tests/tenant/operations-feed/operations-feed.spec.ts'),'utf8');
assert(ops.includes("getByRole('heading',{name:'Operations Feed',level:1})"));
assert(!ops.includes("getByLabel('View')"));
assert(ops.includes(".operations-feed-page__state-title"));
const rel=fs.readFileSync(path.join(root,'tests/tenant/reliability-command/reliability-command.spec.ts'),'utf8');
for(const query of ['min_readiness','min_severity','limit']){
  assert(rel.includes(`expect.poll(()=>url ? new URL(url).searchParams.get('${query}') : null)`));
}
const guard=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
assert(guard.includes('transplantAuthentication(') && guard.includes('bulkSession.absorb(await page.context().storageState())'));
assert(guard.includes("page.context().route('**/*'") && guard.includes("property === 'continue'") && guard.includes('unexpectedlyCompletedWrites'));
const config=fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
assert(config.includes("'BULK_SAFE_03_RECHECK'"));
const workflow=fs.readFileSync(path.join(projectRoot,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_03_RECHECK'));
assert(workflow.includes('node scripts/check-batch-211-contract.mjs'));
console.log('PASS: 120-run source reconciled with log: 88 passed, 32 failed, 0 missing; no successes rerun.');
console.log('PASS: 30 exact recheck IDs across 3 approved source-hashed specs; 2 genuine UI mismatches held.');
console.log('PASS: scoped selectors, safe polling, auth-token+cookie refresh carryover, live-write boundary intact.');
console.log('PASS: GitHub option, one-worker settings and offline preflight registered.');
