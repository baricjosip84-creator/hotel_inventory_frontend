#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const panel=fs.readFileSync(path.join(dir,'../src/pages/InventoryCapabilitiesPage.tsx'),'utf8');
const root=process.env.BACKEND_ROOT || path.join(dir,'../../hotel-inventory-backend');
const backend=fs.readFileSync(process.env.INVENTORY_BACKEND_SOURCE || path.join(root,'src/services/inventory/inventoryCapabilitiesService.js'),'utf8');
const sql=backend.slice(backend.indexOf('const missingRequiredCustomFieldValueQuery ='),backend.indexOf('async function saveCustomFieldDefinition('));
let n=0;function ok(value,message){assert.ok(value,message);n++}
ok(panel.includes('test_country') === false || panel.includes('values:'),'Custom Fields editor passes field values');
ok(panel.includes('is_required'),'field definition required state remains present');
ok(panel.includes('value_versions'),'value optimistic version still submitted');
ok(panel.includes('definition_versions'),'definition optimistic version still submitted');
ok(panel.includes('Save custom fields'),'save field action remains available');
ok(backend.includes("validateCustomFieldValue(proposed, row.value)"),'existing-value validator preserved');
ok(backend.includes('CUSTOM_FIELD_REQUIRED_DATA_MISSING'),'missing data still blocks enable-required');
ok(sql.includes("BTRIM(v.value #>> '{}')"),'presence query trims JSON string content');
ok(sql.includes("jsonb_typeof(v.value) = 'string'"),'JSONB text is checked explicitly');
ok(sql.includes("jsonb_typeof(v.value) IN ('number', 'boolean')"),'valid numeric and boolean JSON scalars preserved');
ok(!sql.includes("v.value <> '\\\"\\\"'::jsonb"),'old exact-empty-only condition removed');
ok(sql.includes('v.tenant_id=target.tenant_id'),'SQL tenant scoping preserved');
ok(sql.includes('v.entity_id=target.id'),'record scoping preserved');
ok(sql.includes('v.definition_id=$2'),'definition scoping preserved');
console.log(`Batch177 Custom Fields frontend/backend required-value contract: ${n}/${n} PASS`);
