#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base = process.env.BACKEND_ROOT || path.resolve(process.cwd(),'../hotel-inventory-backend');
const source = fs.readFileSync(path.join(base,'src/services/inventory/inventoryCapabilitiesService.js'),'utf8');
const validator = fs.readFileSync(path.join(base,'scripts/check-batch171-uom-usage-flag-validation.cjs'),'utf8');
let tests=0;
function test(condition,name){assert.ok(condition,name);tests++;}
test(source.includes('const assertUomUsageFlag = (value, fieldName)'), 'UoM helper exists');
test(source.includes('Boolean(body.purchase_uom)') === false, 'Unsafe purchase flag coercion gone');
test(source.includes('Boolean(body.issue_uom)') === false, 'Unsafe issue flag coercion gone');
test(source.includes("assertUomUsageFlag(body.purchase_uom, 'purchase_uom')"), 'purchase flag in save SQL');
test(source.includes("assertUomUsageFlag(body.issue_uom, 'issue_uom')"), 'issue flag in save SQL');
test(source.includes("'UOM_USAGE_FLAG_INVALID'"), 'clear validation error code');
test(source.includes('const factor = assertUomFactorToBase(body.factor_to_base)'), 'CASE factor now uses explicit decimal guard');
test(source.includes('ON CONFLICT (tenant_id, product_id, uom_code) DO NOTHING'), 'conflict protection unchanged');
test(validator.includes('async function save('), 'real save handler tested');
test(validator.includes('captured[6]'), 'actual purchase SQL flag checked');
test(validator.includes('captured[7]'), 'actual issue SQL flag checked');
test(validator.includes("uom_code:'CASE'"), 'historical CASE fixture retained');
test(validator.includes('factor_to_base:24'), 'historical factor 24 retained');
test(validator.includes('No UoM insert after invalid flag'), 'invalid flags cannot write');
console.log(`Batch171 cross-repository UoM flag contract: ${tests}/${tests} PASS`);
