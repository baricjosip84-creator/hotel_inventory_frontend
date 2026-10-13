#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const backend=process.env.BACKEND_ROOT||path.resolve(dir,'../../hotel-inventory-backend');
const smoke=fs.readFileSync(path.join(backend,'scripts/check-batch160-persistence-smoke.cjs'),'utf8');
const test=fs.readFileSync(path.join(backend,'scripts/check-batch174-country-uncertain-write-reconcile.cjs'),'utf8');
const workflow=fs.readFileSync(path.join(backend,'.github/workflows/original-audit-persistence-staging.yml'),'utf8');
let checks=0;
function has(source,needle){assert(source.includes(needle),`missing ${needle}`);checks++;}
for(const term of [
  'if (attemptedCountry && !wroteCountry)',
  'const latest = await request(valuesEndpoint)',
  "row?.value === 'Croatia'",
  'currentVersion === initialVersion + 1',
  'wroteCountry = true',
  'lastVersion = currentVersion',
  'COUNTRY_WRITE_OUTCOME_UNCERTAIN_MANUAL_CHECK',
  'if (wroteCountry && !leaveCroatia)',
  'value_versions: { test_country: lastVersion }',
  'COUNTRY_RESTORE_NOT_VERIFIED',
])has(smoke,term);
for(const term of ['lostAfterCommit','response lost after request submission','reconcileUnavailable','concurrent:true','putCount,2','original:null'])has(test,term);
for(const term of ['workflow_dispatch:','disposable-staging-write','INVENTORY_STAGING_READONLY_DATABASE_URL','I_APPROVE_DISPOSABLE_STAGING_WRITES'])has(workflow,term);
assert(!/^\s+(push|schedule):/m.test(workflow),'staging mutations must not be triggered by push or schedule');checks++;
console.log(`Batch174 cross-repo country-reconciliation contract: ${checks}/${checks} PASS`);
