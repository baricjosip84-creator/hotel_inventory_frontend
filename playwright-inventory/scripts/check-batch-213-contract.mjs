import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const prior = manifest.approved_groups.BULK_SAFE_04;
const replay = manifest.approved_groups.BULK_SAFE_04_RECHECK;
const result = manifest.batch_212_last_execution;
const record = manifest.batch_213_selected_recheck;
assert.equal(result.total,120);
assert.equal(result.passed,51);
assert.equal(result.failed,69);
assert.equal(new Set(result.passed_ids).size,51);
assert.equal(new Set(result.failed_ids).size,69);
const originalIds = prior.entries.flatMap(x=>x.ids);
assert.equal(originalIds.length,120);
assert.deepEqual(new Set([...result.passed_ids,...result.failed_ids]),new Set(originalIds));
const held = Object.keys(result.held_unverified);
assert.deepEqual(new Set(held),new Set(['TALERT-004','TALERT-005','TALERT-006','TALERT-007','TALERT-009','TALERT-011']));
const selected = replay.entries.flatMap(x=>x.ids);
assert.equal(replay.secret,true);
assert.deepEqual(replay.entries.map(x=>[x.file,x.ids.length]),[
 ['tenant/alerts/alerts.spec.ts',4],
 ['tenant/system-context/system-context.spec.ts',50],
 ['tenant/operations-feed/operations-feed.spec.ts',9]
]);
assert.equal(selected.length,63);
assert.equal(new Set(selected).size,63);
assert.deepEqual(new Set(selected),new Set(result.failed_ids.filter(x=>!held.includes(x))));
assert(selected.every(x=>!result.passed_ids.includes(x)));
assert.equal(record.last_verified_green_total,619);
assert.deepEqual(record.selected_ids,selected);
for(const entry of replay.entries){
  const file = path.join(root,'tests',entry.file);
  const code = fs.readFileSync(file,'utf8');
  const sha = crypto.createHash('sha256').update(code).digest('hex');
  assert.equal(sha,entry.sha256,`Unreviewed source drift: ${entry.file}`);
  assert(code.includes("from '../../../support/liveOriginalSafeTest'"));
  const ast = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,`TypeScript syntax invalid: ${entry.file}`);
  for(const id of entry.ids)
    assert.equal((code.match(new RegExp(`\\btest\\s*\\(\\s*['\"]${id}\\b`,'g'))??[]).length,1,`Missing/duplicate ${id}`);
}
for(const codePath of ['support/liveOriginalSafeTest.ts','support/tenantSession.ts']){
  const file=path.join(root,codePath);
  const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,`TypeScript syntax invalid: ${codePath}`);
}
const alerts = fs.readFileSync(path.join(root,'tests/tenant/alerts/alerts.spec.ts'),'utf8');
assert(alerts.includes("name:'Alert queue', exact:true"),'Alerts heading must be exact to avoid Filter heading');
assert(alerts.includes("name:'Open Stock',exact:true"),'Stock link must not collide with Stock Transfers');
const context = fs.readFileSync(path.join(root,'tests/tenant/system-context/system-context.spec.ts'),'utf8');
assert(context.includes("if (!path.startsWith('/system-context') && path !== '/execution-requests') return route.fallback()"));
assert(context.includes("if (path === '/execution-requests' && route.request().method() === 'POST') return fulfillJson(route"));
assert(context.includes('return route.fallback();\n  });\n  await page.goto(\'/system-context\')'),'Unreviewed System Context requests must fall through to safety guard');
const guard = fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
assert(guard.includes('restoreBulkTenantSession(page: Page)'));
assert(guard.includes('MAX_SESSION_AGE_MS'));
assert(guard.includes("page.context().route('**/*'"));
assert(guard.includes("property === 'continue'"));
assert(guard.includes('unexpectedlyCompletedWrites'));
assert(guard.includes("approvedLogin(method, route.request().url())"));
assert(!guard.includes('PW_BULK_SHARED_AUTH_STATE'));
const tenant = fs.readFileSync(path.join(root,'support/tenantSession.ts'),'utf8');
assert(tenant.includes('await restoreBulkTenantSession(page)'));
const config = fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
assert(config.includes("'BULK_SAFE_04_RECHECK'") && config.includes(".includes(GROUP) ? 1"));
const workflow = fs.readFileSync(path.join(repo,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_04_RECHECK'));
assert(workflow.includes('node scripts/check-batch-213-contract.mjs'));
console.log('PASS Batch 213: 120 logged results reconciled; 51 passed never repeated; exactly 63 failed-only IDs across 3 source-hashed specs.');
console.log('PASS: six unresolved Alerts filter behaviors held; no earlier results marked green without browser verification.');
console.log('PASS: exact heading/link locators; System Context writes cannot bypass production network guard.');
console.log('PASS: proactive worker renewal, safe dashboard recovery, full workflow/manifest and TypeScript source checks.');
