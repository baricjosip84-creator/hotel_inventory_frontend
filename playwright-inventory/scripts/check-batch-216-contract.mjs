import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const b215 = JSON.parse(fs.readFileSync(path.join(root,'batch-215-baseline.json'),'utf8'));
const b216 = JSON.parse(fs.readFileSync(path.join(root,'batch-216-baseline.json'),'utf8'));
const rec = manifest.batch_215_last_execution;
const group = manifest.approved_groups.BULK_SAFE_05_RECHECK;
assert(group?.secret === true && group.entries?.length === 4);
const current = group.entries.flatMap(e=>e.ids);
const legacy = b215.confirmed_green_ids;
const newPassed = rec.passed_ids;
const historicHeld = b215.held_unverified_ids;
assert.equal(legacy.length,682);
assert.equal(newPassed.length,89);
assert.equal(current.length,31);
assert.equal(new Set(current).size,31);
assert.equal(new Set([...legacy,...newPassed,...current,...historicHeld]).size,823);
assert.deepEqual(b216.confirmed_green_ids,[...legacy,...newPassed]);
assert.deepEqual(b216.held_unverified_ids,historicHeld);
assert.deepEqual(b216.selected_ids,current);
assert.deepEqual(current,rec.failed_ids);
assert.deepEqual(new Set([...newPassed,...current]),new Set(b215.selected_ids));
assert.deepEqual(group.entries.map(e=>[e.file,e.ids.length]),[
 ['tenant/action-center/action-center.spec.ts',1],
 ['tenant/collaboration/collaboration.spec.ts',8],
 ['tenant/tenant-audit/tenant-audit.spec.ts',20],
 ['tenant/workflow-composer/workflow-composer.spec.ts',2]
]);
for (const e of group.entries) {
 const sourceFile = path.join(root,'tests',e.file);
 const code = fs.readFileSync(sourceFile,'utf8');
 assert.equal(crypto.createHash('sha256').update(code).digest('hex'),e.sha256);
 const tree=ts.createSourceFile(sourceFile,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 assert.equal(tree.parseDiagnostics.length,0,'Syntax: '+e.file);
 assert(code.includes("from '../../../support/liveOriginalSafeTest'"));
 for(const id of e.ids) assert.equal([...code.matchAll(/\btest\s*\(\s*['"]([A-Z0-9]+-\d{3})\s+/g)].filter(m=>m[1]===id).length,1,id);
 assert(!/\btest\.only\s*\(/.test(code));
}
const audit=fs.readFileSync(path.join(root,'tests/tenant/tenant-audit/tenant-audit.spec.ts'),'utf8');
assert(audit.includes("await page.route('**/audit**'") && !audit.includes("await page.route('**/*', async (route: Route)"),'Narrow audit route must not hijack authentication refresh');
const collab=fs.readFileSync(path.join(root,'tests/tenant/collaboration/collaboration.spec.ts'),'utf8');
for(const key of ['collaboration_domain','thread_type','urgency','attention_state','limit']) {
 assert(collab.includes(`url ? new URL(url).searchParams.get('${key}') : null`),'URL polling fix '+key);
}
assert(collab.includes("Maximum recommendations')).toHaveValue('50')"));
const action=fs.readFileSync(path.join(root,'tests/tenant/action-center/action-center.spec.ts'),'utf8');
assert(action.includes("filter({ hasText:'Open actions shown' })"));
const composer=fs.readFileSync(path.join(root,'tests/tenant/workflow-composer/workflow-composer.spec.ts'),'utf8');
assert(composer.includes("getByRole('heading',{name:'Workflow Composer',level:1})"));
assert(composer.includes('await expect(options).toHaveCount(3)'));
const worker=fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
assert(worker.includes("'BULK_SAFE_05_RECHECK'") && worker.includes('.includes(GROUP) ? 1'));
const workflow=fs.readFileSync(path.join(root,'../.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_05_RECHECK'));
assert(workflow.includes('node scripts/check-batch-216-contract.mjs'));
assert(!workflow.includes('continue-on-error: true'));
const guard=fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
assert(guard.includes("page.context().route('**/*'"));
assert(guard.includes("property === 'continue'"));
assert(guard.includes('unexpectedlyCompletedWrites'));
assert(guard.includes('approvedLogin(method, route.request().url())'));
console.log('PASS B216: exactly 31 prior GitHub-failed IDs selected; 771 confirmed passes and 21 historical held excluded.');
console.log('PASS B216: four original spec hashes, TypeScript parsing, fixed failure contracts, authentication isolation and non-write boundary.');
assert.equal(manifest.batch_216_last_execution.passed_original,27);
assert.equal(manifest.batch_216_last_execution.failed_original,4);
assert.deepEqual(new Set([...manifest.batch_216_last_execution.passed_ids,...manifest.batch_216_last_execution.failed_ids]),new Set(current));
assert.deepEqual(manifest.batch_216_last_execution.failed_ids,['TAUD-012','TAUD-013','TAUD-015','TAUD-017']);
assert.equal(manifest.batch_216_preflight.status,'completed_27_pass_4_fail');
console.log('GITHUB RESULT B216: 27 passed, 4 failed; 798 unique original tests confirmed GREEN.');
