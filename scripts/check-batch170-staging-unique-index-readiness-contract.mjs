#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const backend = process.env.BACKEND_ROOT || path.resolve(process.cwd(),'../hotel-inventory-backend');
const script = fs.readFileSync(path.join(backend,'scripts/check-batch169-persistence-schema-readiness.cjs'),'utf8');
const focused = fs.readFileSync(path.join(backend,'scripts/check-batch170-staging-unique-index-readiness.cjs'),'utf8');
const workflow = fs.readFileSync(path.join(backend,'.github/workflows/original-audit-persistence-staging.yml'),'utf8');
let n=0;
function check(ok, label) {assert.ok(ok,label);n++;}
check(script.includes('BEGIN TRANSACTION READ ONLY'),'read-only transaction preserved');
check(script.includes("client.query('ROLLBACK')"),'rollback preserved');
check(script.includes('pg_catalog.pg_index'),'catalog flags queried from PostgreSQL');
check(script.includes('indisunique AS is_unique'),'unique status read');
check(script.includes('indisvalid AS is_valid'),'index validity read');
check(script.includes('indisready AS is_ready'),'index readiness read');
check(script.includes('indimmediate AS is_immediate'),'immediacy read');
check(script.includes('indpred IS NULL'),'partial indexes distinguished');
check(script.includes('entry.is_valid === true'),'missing validity not accepted');
check(script.includes('entry.is_unconditional === true'),'missing predicate metadata not accepted');
check(focused.includes('partial unique fails'),'partial uniqueness regression included');
check(focused.includes('invalid unique fails'),'invalid index regression included');
check(focused.includes('deferred unique fails'),'deferred index regression included');
check(focused.includes('wrong indexed key fails'),'key mismatch regression included');
check(workflow.indexOf('Inspect staging persistence schema') < workflow.indexOf('Approved disposable staging API POST/PUT'),'preflight still gates staging writes');
check(workflow.includes('Write check BLOCKED'),'no unapproved write attempts');
console.log(`Batch170 staging index contract: ${n}/${n} PASS`);
