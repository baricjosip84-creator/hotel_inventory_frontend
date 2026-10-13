#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const be=process.env.BACKEND_ROOT||path.resolve(dir,'../../hotel-inventory-backend');
const smoke=fs.readFileSync(path.join(be,'scripts/check-batch160-persistence-smoke.cjs'),'utf8');
const focused=fs.readFileSync(path.join(be,'scripts/check-batch175-case-lost-post-reconcile.cjs'),'utf8');
const workflow=fs.readFileSync(path.join(be,'.github/workflows/original-audit-persistence-staging.yml'),'utf8');
let checks=0;
for(const token of [
 "const { randomUUID }", "const probeMarker = `INV-QA-${randomUUID()}`",
 'barcode: probeMarker', 'let attemptedUom = false', 'attemptedUom = true',
 'if (attemptedUom && !uomRecord?.id)', 'const latest = await request(endpoint)',
 'row.barcode === probeMarker', 'row.version === 1',
 "String(row.uom_code || '').toUpperCase() === testCode",
 'Number(row.factor_to_base) === 24',
 'row.purchase_uom === false && row.issue_uom === false',
 'uomRecord = candidate', 'UOM_RECONCILIATION_NOT_SAFE',
 'UOM_WRITE_OUTCOME_UNCERTAIN_MANUAL_CHECK',
 'If-Match-Version',
]) {assert(smoke.includes(token),`missing ${token}`);checks++;}
for(const token of [
 "fixture('commit')", "fixture('notcommitted')", "fixture('foreign')",
 "fixture('badfactor')", "fixture('newversion')", "fixture('unavailable')",
 "fixture('normal')", 'correctDeleteVersion',
]) {assert(focused.includes(token),`missing test coverage ${token}`);checks++;}
assert(workflow.includes('node scripts/check-batch175-case-lost-post-reconcile.cjs'));checks++;
assert(workflow.includes('workflow_dispatch:') && !/^\s+(push|schedule):/m.test(workflow));checks++;
console.log(`Batch175 cross-repo CASE receipt reconciliation: ${checks}/${checks} PASS`);
