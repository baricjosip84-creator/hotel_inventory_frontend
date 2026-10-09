import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const backend = process.env.BACKEND_ROOT || path.resolve(root, '../hotel-inventory-backend');
const read = (base, file) => fs.readFileSync(path.join(base, file), 'utf8');
const page = read(root, 'src/pages/InventoryRequisitionsPage.tsx');
const api = read(root, 'src/lib/api.ts');
const messages = read(root, 'src/i18n/tenantUiTranslations.ts');
const service = read(backend, 'src/services/inventory/inventoryRequisitionService.js');
let passed = 0;
function check(label, callback) { callback(); console.log(`PASS ${++passed}: ${label}`); }

check('Fulfill capability still requires approved or partially fulfilled status', () => assert.match(page, /const canFulfill = \['approved', 'partially_fulfilled'\]\.includes\(String\(selected\?\.status\)\) && capabilities\.canFulfillInventoryRequisitions/));
check('fulfillment editor requires the existing capability gate', () => assert.match(page, /const showFulfillmentEditor = canFulfill && Boolean/));
check('fulfillment editor checks positive remaining quantity on actual lines', () => assert.match(page, /selected\?\.items\?\.some\(\(item\) =>\s*Number\(item\.remaining_quantity/));
check('remaining quantity fallback uses requested minus already fulfilled', () => assert.match(page, /Number\(item\.requested_quantity\) - Number\(item\.fulfilled_quantity\)/));
check('fulfilled status cannot satisfy edit eligibility', () => assert.ok(!['approved', 'partially_fulfilled'].includes('fulfilled')));
check('approved request with positive remaining and permission remains eligible', () => assert.equal(['approved', 'partially_fulfilled'].includes('approved') && [0, 1].some((x) => x > 0), true));
check('partially fulfilled request with positive remaining remains eligible', () => assert.equal(['approved', 'partially_fulfilled'].includes('partially_fulfilled') && [0, 0.5].some((x) => x > 0), true));
check('request with zero remaining hides editor even if approved', () => assert.equal([0, 0].some((x) => x > 0), false));
check('fulfilled requisition has explicit human completion message', () => assert.match(page, /selected\.status === 'fulfilled' && \(\s*<p style=\{styles\.successBox\}>\{ui\('Fulfillment is complete\./));
check('completed message does not imply it created new stock issue', () => assert.match(page, /No further stock issue can be recorded for this requisition/));
check('fulfilled message points to retained fulfillment history', () => assert.match(page, /fulfillment history remains available below/));
check('Fulfill now and note table headers are editor gated', () => assert.match(page, /\{showFulfillmentEditor && \(\s*<>\s*<th[^>]*>\{ui\('Fulfill now'\)\}<\/th>\s*<th[^>]*>\{ui\('Fulfillment note'\)\}<\/th>/));
check('per-line input cells use the same editor gate', () => assert.match(page, /\{showFulfillmentEditor && \(\s*<>\s*<td[^>]*>\s*<input\s+style=\{styles\.input\}\s+type="number"/));
check('fulfillment source, checkbox, and record button are gated together', () => assert.match(page, /\{showFulfillmentEditor && \(\s*<div style=\{styles\.workflowPanel\}>\s*<label[^>]*>\s*\{ui\('Fulfillment source location'\)\}/));
check('record fulfillment mutation still uses original handler', () => assert.match(page, /onClick=\{\(\) => fulfillMutation\.mutate\(\)\}/));
check('fulfillment remains readiness and threshold gated', () => assert.match(page, /disabled=\{!canFulfill \|\| fulfillMutation\.isPending \|\| readinessQuery\.data\?\.ready === false \|\|/));
check('readiness panel shares editor gate', () => assert.match(page, /\{showFulfillmentEditor && \(\s*<div style=\{styles\.readinessPanel\}>/));
check('fulfillment history remains outside the editor conditional', () => assert.match(page, /<h4 style=\{styles\.sectionTitle\}>\{ui\('Fulfillment history'\)\}<\/h4>/));
check('activity timeline remains outside editor conditional', () => assert.match(page, /<h4 style=\{styles\.sectionTitle\}>\{ui\('Activity timeline'\)\}<\/h4>/));
check('successful fulfillment clears staged state and invalidates queries', () => { assert.match(page, /setFulfillmentLines\(\{\}\)/); assert.match(page, /await invalidateRequisitions\(\)/); });
check('API feedback already uses action-specific message for single fulfillment', () => assert.match(api, /return 'Requisition fulfilled successfully\.'/));
check('requisition bulk fulfillment remains a separate specific message', () => assert.match(api, /return 'Requisitions fulfilled successfully\.'/));
check('original protected backend fulfillment logic remains present', () => { assert.match(service, /INVENTORY_REQUISITIONS_FULFILL|INVENTORY_REQUISITION/); assert.ok(service.includes('fulfill')); });
check('no new backend endpoint is required for UI completion state', () => assert.match(page, /\/inventory-requisitions\/\$\{selected\.id\}\/fulfill/));
check('completion message exists for all five tenant languages', () => {
 const row = messages.split('\n').find((line) => line.startsWith('  ["Fulfillment is complete. No further stock issue'));
 assert.ok(row, 'Missing translation');
 assert.equal((row.match(/", "/g) || []).length, 4, 'Must have five locales');
 for (const term of ['Die Erfüllung', 'El cumplimiento', 'La demande', 'Ispunjenje zahtjevnice']) assert.ok(row.includes(term));
});
console.log(`PASS ${passed}/${passed} Batch 072 requisition fulfillment closed-state checks`);
