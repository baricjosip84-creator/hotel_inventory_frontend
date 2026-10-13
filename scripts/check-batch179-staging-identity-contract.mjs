#!/usr/bin/env node
// Cross-repository release contract: a disposable CASE=24/Croatia staging write
// must never be attempted on a backend revision that was not approved.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const backend = process.env.BACKEND_ROOT || path.resolve(dir, '../../hotel-inventory-backend');
const workflow = fs.readFileSync(path.join(backend, '.github/workflows/original-audit-persistence-staging.yml'), 'utf8');
const gate = fs.readFileSync(path.join(backend, 'scripts/check-batch179-staging-deployment-identity.cjs'), 'utf8');
const probe = fs.readFileSync(path.join(backend, 'scripts/check-batch160-persistence-smoke.cjs'), 'utf8');
let checks = 0;
function ok(test, label) { assert.ok(test, label); checks++; }
ok(workflow.includes('workflow_dispatch:'), 'manual only trigger exists');
ok(!/^\s+(?:push|schedule|pull_request):/m.test(workflow), 'no automatic mutation triggers');
ok(workflow.includes("environment: inventory-staging"), 'protected staging environment preserved');
ok(workflow.includes('check-batch179-staging-deployment-identity.cjs --self-test'), 'offline self test integrated');
ok(/name: Require exact backend deployment before staging writes\n\s*if: inputs.mode == 'disposable-staging-write'/.test(workflow), 'identity check is required on write mode');
ok(workflow.includes('INVENTORY_STAGING_EXPECTED_BACKEND_COMMIT: ${{ vars.INVENTORY_STAGING_EXPECTED_BACKEND_COMMIT }}'), 'expected backend commit is an environment variable');
ok(workflow.includes('INVENTORY_STAGING_API_BASE: ${{ vars.INVENTORY_STAGING_API_BASE }}'), 'staging backend URL is environment variable');
ok(workflow.includes('INVENTORY_SMOKE_STAGING_APPROVED_ORIGIN: ${{ vars.INVENTORY_STAGING_APPROVED_ORIGIN }}'), 'approved origin reused');
ok(workflow.indexOf('Require exact backend deployment before staging writes') < workflow.indexOf('Approved disposable staging API POST/PUT readback'), 'identity gate precedes write probe');
ok(gate.includes('/health/ready'), 'backend readiness endpoint used');
ok(gate.includes('deployment?.git_commit'), 'deployed backend identity checked');
ok(gate.includes('checks?.database'), 'backend DB readiness must be good');
ok(gate.includes('checks?.schema'), 'backend schema readiness must be good');
ok(gate.includes("redirect: 'error'"), 'redirect forbidden');
ok(gate.includes('STAGING_DEPLOYMENT_IDENTITY_VERIFIED'), 'successful identity emitted');
ok(probe.includes('CASE_FIXTURE_NOT_EMPTY'), 'existing CASE is protected');
ok(probe.includes('STAGING_ORIGIN_MISMATCH'), 'API write origin still explicitly locked');
ok(workflow.includes('INVENTORY_SMOKE_CSRF_TOKEN'), 'CSRF retains protection');
ok(!/console\.log\([^)]*(?:token|password)/i.test(gate), 'gate must not log secrets');
ok(!workflow.includes('INVENTORY_STAGING_EXPECTED_BACKEND_COMMIT: ${{ secrets.'), 'commit identity need not be secret');
console.log(`BATCH179 staging identity cross-repository contract: ${checks}/${checks} PASS`);
