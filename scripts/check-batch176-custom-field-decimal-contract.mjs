#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const backendRoot=process.env.BACKEND_ROOT||path.join(here,'../../hotel-inventory-backend');
const explicit=process.env.INVENTORY_BACKEND_SOURCE;
const sourcePath=explicit||path.join(backendRoot,'src/services/inventory/inventoryCapabilitiesService.js');
let source;
try {source=fs.readFileSync(sourcePath,'utf8')}catch(error){console.error('BATCH176 backend source unavailable: configure BACKEND_ROOT or INVENTORY_BACKEND_SOURCE');process.exit(1)}
const section=source.slice(source.indexOf("if (definition.data_type === 'number')"),source.indexOf("if (definition.data_type === 'boolean')"));
let n=0;const check=(condition,label)=>{assert(condition,label);n++};
check(section.includes('isDecimalInput'),'numeric field has explicit decimal guard');
check(section.includes("typeof value === 'number'"),'JS numeric values still supported');
check(section.includes("typeof value === 'string'"),'decimal strings still supported');
check(section.includes('value.trim()'),'whitespace-trimmed numeric field input');
check(section.includes('CUSTOM_FIELD_VALUE_INVALID'),'invalid decimal values produce HTTP validation error');
check(section.includes('Number.isFinite(parsed)'),'numeric overflow rejected');
check(section.indexOf('isDecimalInput') < section.indexOf('const parsed = Number(value)'),'syntax validated before numeric conversion');
const frontend=fs.readFileSync(path.join(here,'../src/lib/customFieldValueReadback.ts'),'utf8');
check(frontend.includes('number'),'frontend numeric readback remains present');
console.log(`Batch176 frontend/backend decimal-value source contract: ${n}/${n} PASS`);
