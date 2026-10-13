#!/usr/bin/env node
// Cross-repository guard: the staging CASE fixture must never be deleted from
// an unverified POST receipt; matching an unguessable marker from GET is required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const backend=process.env.BACKEND_ROOT || path.resolve(root,'../../hotel-inventory-backend');
const probe=fs.readFileSync(path.join(backend,'scripts/check-batch160-persistence-smoke.cjs'),'utf8');
const regression=fs.readFileSync(path.join(backend,'scripts/check-batch180-case-cleanup-ownership.cjs'),'utf8');
const workflow=fs.readFileSync(path.join(backend,'.github/workflows/original-audit-persistence-staging.yml'),'utf8');
let n=0;
const ok=(predicate,description)=>{assert.ok(predicate,description);n++};
ok(probe.includes('const probeMarker = `INV-QA-${randomUUID()}`'),'per-run random marker retained');
ok(probe.includes('uomReceipt = await request(endpoint'), 'POST receipt held separately');
ok(probe.includes('const ownsTemporaryCase ='), 'single ownership predicate');
ok(probe.includes('row.barcode === probeMarker'), 'GET ownership uses barcode marker');
ok(probe.includes('row.version === 1'), 'only initial version eligible for cleanup');
ok(probe.includes('row.purchase_uom === false && row.issue_uom === false'),'original flags verified');
ok(probe.includes('String(persisted.id) !== String(uomReceipt.id)'), 'GET and POST record IDs cross-checked');
ok(probe.includes('uomRecord = persisted'), 'cleanup is claimed from verified GET');
ok(probe.includes('if (ownsTemporaryCase(uomRecord))'), 'DELETE requires ownership guard');
ok(probe.includes("'If-Match-Version': String(uomRecord.version)"), 'DELETE retains version protection');
ok(regression.includes("'changed-marker'"),'foreign marker test preserved');
ok(regression.includes("'changed-version'"),'version-change test preserved');
ok(regression.includes("'changed-id'"),'wrong record ID test preserved');
ok(regression.includes("'lost-receipt'"),'lost receipt recovery test preserved');
ok(workflow.includes("if: inputs.mode == 'disposable-staging-write'"),'staging write remains conditional');
ok(workflow.includes('Require exact backend deployment before staging writes'),'deployment identity gate retained');
console.log(`Batch180 CASE cleanup cross-repository contract: ${n}/${n} PASS`);
