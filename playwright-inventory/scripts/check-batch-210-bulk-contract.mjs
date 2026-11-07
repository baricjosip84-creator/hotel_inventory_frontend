import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';

// A fail-closed Batch 210 original-test contract; no browser, no credential, no network.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(root, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'original-suite-approved.json'),'utf8'));
const group = manifest.approved_groups.BULK_SAFE_03;
assert(group?.secret === true && group.entries?.length === 3, 'Batch 210 must be 3 reviewed, authenticated read-only specs');
const range = (prefix, start, end) => Array.from({length:end-start+1},(_,i)=>`${prefix}-${String(start+i).padStart(3,'0')}`);
const expected = new Map([
 ['tenant/reliability-command/reliability-command.spec.ts', [...range('TRC',1,26),...range('TRC',33,44),...range('TRC',46,48)]],
 ['tenant/workspace/workspace.spec.ts', range('TWKS',1,39)],
 ['tenant/operations-feed/operations-feed.spec.ts', [...range('TFEED',1,17),...range('TFEED',19,20),...range('TFEED',24,34),...range('TFEED',38,47)]]
]);
assert.equal(group.entries.reduce((n,e)=>n+e.ids.length,0),120);
const oldIds = new Set();
for (const [name, oldGroup] of Object.entries(manifest.approved_groups)) {
  if (name === 'BULK_SAFE_03') continue;
  for (const entry of oldGroup.entries ?? [oldGroup]) for (const id of entry.ids) oldIds.add(id);
}
const newIds = new Set();
for (const entry of group.entries) {
 assert.deepEqual(entry.ids, expected.get(entry.file), `Unexpected exact ID list in Batch 210: ${entry.file}`);
 const file = path.join(root,'tests',entry.file);
 const code = fs.readFileSync(file,'utf8');
 assert.equal(crypto.createHash('sha256').update(code).digest('hex'), entry.sha256);
 assert(code.includes("from '../../../support/liveOriginalSafeTest'"),'Missing live network safety fixture: '+entry.file);
 assert(!code.includes("from '@playwright/test'"),'Unprotected test import: '+entry.file);
 assert(!code.includes("page.route('**/*'"),'Unreviewed catch-all API route in selected specs');
 // Inspect each exact selected test body (not comments or other test descriptions).
 const tree = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const tests = new Map();
 function walk(node) {
   if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.Identifier && node.expression.text === 'test'
     && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
     const id = node.arguments[0].text.split(' ')[0];
     if (/^[A-Z0-9]+-\d{3}$/.test(id)) tests.set(id,node.getText(tree));
   }
   ts.forEachChild(node,walk);
 }
 walk(tree);
 for (const id of entry.ids) {
  assert(tests.has(id),'Missing original test: '+id);
  assert(!oldIds.has(id),'Previously executed/approved ID re-selected: '+id);
  assert(!newIds.has(id),'Duplicate Batch 210 ID: '+id);
  newIds.add(id);
  const body = tests.get(id);
  assert(!/loginAsDisposableRole\s*\(/.test(body),'Requires unavailable alternate role: '+id);
  assert(!/installWorkspacePermissions\s*\(/.test(body),'Changes effective permissions: '+id);
  assert(!/\b(?:POST|PUT|PATCH|DELETE)\b/.test(body),'Review write-like request explicitly: '+id);
 }
}
assert.equal(newIds.size,120);
const config = fs.readFileSync(path.join(root,'playwright.live-original.config.ts'),'utf8');
assert(config.includes("'BULK_SAFE_03','BULK_SAFE_02_RECHECK_2','BULK_SAFE_02_RECHECK_3'].includes(GROUP) ? 1"),'Batch 210 must be single worker to avoid login-rate limits');
assert(config.includes('maxFailures: GROUP ===') && config.includes(' : undefined'),'Do not hide failures with an early cutoff');
const env = fs.readFileSync(path.join(root,'support/environment.ts'),'utf8');
assert(env.includes('liveReviewedGroup'),'Credential gate must check manifest');
const guard = fs.readFileSync(path.join(root,'support/liveOriginalSafeTest.ts'),'utf8');
assert(guard.includes("page.context().route('**/*'") && guard.includes("property === 'continue'") && guard.includes('unexpectedlyCompletedWrites'),'Guard must block nonmocked writes');
const workflow = fs.readFileSync(path.join(projectRoot,'.github/workflows/inventory-original-suite.yml'),'utf8');
assert(workflow.includes('          - BULK_SAFE_03'),'Workflow option missing');
assert(workflow.includes('node scripts/check-batch-210-bulk-contract.mjs'),'Workflow is missing the Batch 210 preflight');
console.log('PASS: Batch 210 exactly 120 NEW ORIGINAL read-only synthetic scenarios across 3 source-hashed specs');
console.log('PASS: no reselected previously approved IDs, no unreviewed role impersonation or explicit writes');
console.log('PASS: single worker, credential guard, strict source hashes, production network protection');
