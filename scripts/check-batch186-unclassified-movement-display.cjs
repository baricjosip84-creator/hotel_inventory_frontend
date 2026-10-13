#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const feRoot = process.argv[2] || path.resolve(__dirname, '..');
const beRoot = process.argv[3] || path.resolve(feRoot, '../hotel-inventory-backend');
const frontendSource = fs.readFileSync(path.join(feRoot, 'src/pages/StockMovementsPage.tsx'), 'utf8');
const match = frontendSource.match(/function movementTypeFromRow\(movement: StockMovement\): string \{[\s\S]*?\n\}/);
let assertions = 0;
const eq = (actual, expected, description) => { assert.equal(actual, expected, description); assertions++; };
const ok = (value, description) => { assert.ok(value, description); assertions++; };
ok(match, 'load actual StockMovementsPage classification code');
const sandbox = vm.createContext({});
vm.runInContext(match[0].replace('(movement: StockMovement): string', '(movement)') + '\nthis.classify = movementTypeFromRow;', sandbox);
const classify = sandbox.classify;
// A stored unclassified kind is explicitly uncertain, regardless of how a legacy movement_type was populated.
for (const movement_type of ['stock_count', 'manual_adjustment', 'other', 'shipment_receive', 'usage', 'outbound_dispatch', 'stock_transfer_in', 'cycle_count_reconciliation', 'customer_return']) {
  eq(classify({movement_kind:'unclassified', movement_type, reason:'shipment_receive'}), 'unproven_legacy', `unclassified ${movement_type} never shown as proven activity`);
}
// Opposite-sign legacy entries can retain their old movement_type while their business meaning remains unproven.
eq(classify({movement_kind:'unclassified', movement_type:'usage', change:'10'}), 'unproven_legacy', 'positive legacy usage does not appear as proven consumption');
eq(classify({movement_kind:'unclassified', movement_type:'shipment_receive', change:'-3'}), 'unproven_legacy', 'negative legacy shipment does not appear as proven receipt');
for (const [movement_type,movement_kind] of [['shipment_receive','receipt'],['usage','consumption'],['stock_count','count_reconciliation'],['manual_adjustment','adjustment'],['stock_transfer_out','transfer_out'],['stock_transfer_in','transfer_in'],['opening_stock','adjustment']]) {
  eq(classify({movement_kind, movement_type}), movement_type, `proven ${movement_type} keeps its explicit label`);
}
eq(classify({movement_kind:'unclassified', movement_type:null, reason:'shipment_receive'}),'unproven_legacy','unclassified rows do not infer labels from free-form reasons');
eq(classify({movement_kind:null, movement_type:'shipment_receive', reason:''}),'shipment_receive','backward-compatible response without classification retains its explicit type');
eq(classify({movement_kind:null, movement_type:null, reason:'inventory_count'}),'stock_count','old absent-kind fallback preserved');
eq(classify({movement_kind:null, movement_type:null, reason:'unknown'}),'unproven_legacy','unknown kind+type stays unproven');
const migration = fs.readFileSync(path.join(beRoot, 'db/migrations/527_stock_movement_structured_reclassification.sql'),'utf8');
ok(migration.includes('movement_kind=\'unclassified\''),'legacy migration explicitly preserves unclassified evidence');
ok(migration.includes('AND change < 0') && migration.includes('AND change > 0'),'reclassification refuses opposite-sign evidence');
const backend = fs.readFileSync(path.join(beRoot,'src/services/inventory/stockService.js'),'utf8');
ok(/sm\.movement_type,\s*sm\.movement_kind,/.test(backend),'backend returns stored kind and type');
ok(frontendSource.includes('movementTypeLabel(movementTypeFromRow(movement))'),'CSV exports use exactly the same classification function as ledger');
ok(frontendSource.includes('const type = movementTypeFromRow(movement);'),'ledger badge uses classification function');
console.log(`Batch186 unclassified historical movement display: ${assertions}/${assertions} PASS (real FE helper + persisted migration contract, no browser/database)`);
