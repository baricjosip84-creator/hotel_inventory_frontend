#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const page = read('src/pages/InventoryRequisitionsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

check(page.includes('target_storage_location_id?: string | null;') && page.includes('target_storage_location_name?: string | null;'), 'requisition fulfillment/readiness types carry target-location evidence');
check(page.includes('parseFulfillmentSerialNumbers'), 'requisition fulfillment normalizes exact serial-number input');
check(page.includes('serial_numbers: parseFulfillmentSerialNumbers(fulfillmentSerialNumbers[requisition_item_id])'), 'readiness and fulfillment payloads send selected serial identities');
check(page.includes("ui('Serial numbers')") && page.includes("ui('One serial per unit; required only for products configured to require serials')"), 'serial-tracked transfer UI requests exact serial evidence');
check(page.includes("ui('Target location')}: {selected.target_storage_location_name}"), 'fulfillment panel clearly shows the selected tracked target location');
check(page.includes("String(location.id) !== String(selected.target_storage_location_id || '')"), 'fulfillment source selector excludes the tracked target location');
check(page.includes("String(location.id) !== String(form.target_storage_location_id || '')"), 'draft source selector excludes the selected target location');
check(page.includes("String(location.id) !== String(form.source_storage_location_id || '')"), 'draft target selector excludes the selected source location');
check(page.includes("<th style={styles.th}>{ui('Target')}</th>"), 'fulfillment history includes a Target column');
check(page.includes('line.target_storage_location_name || selected.target_storage_location_name ||'), 'fulfillment history renders the actual target location');
check(page.includes('setFulfillmentSerialNumbers({});'), 'successful or bulk-all workflow resets stale serial selections');
check(translations.includes('["Target location"') && translations.includes('["Serial numbers"'), 'newly exposed target/serial UI uses existing multilingual vocabulary');

console.log(`PASS - v3.49.131 frontend requisition target transfer integrity remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
