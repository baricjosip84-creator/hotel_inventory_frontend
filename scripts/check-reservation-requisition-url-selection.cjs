'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const helperPath = path.join(root, 'src/lib/recordSelectionParams.ts');
const reservationsPath = path.join(root, 'src/pages/InventoryReservationsPage.tsx');
const requisitionsPath = path.join(root, 'src/pages/InventoryRequisitionsPage.tsx');
let checks = 0;
const check = (test, message) => { assert.ok(test, message); checks += 1; };
const read = (p) => fs.readFileSync(p, 'utf8');
function parseSource(file) {
  const fileText = read(file);
  const ast = ts.createSourceFile(file, fileText, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  check(ast.parseDiagnostics.length === 0, `${path.basename(file)} TS parser: ${ast.parseDiagnostics.map((d) => d.messageText).join('; ')}`);
  return fileText;
}
const helper = parseSource(helperPath);
const reservations = parseSource(reservationsPath);
const requisitions = parseSource(requisitionsPath);
const transpiled = ts.transpileModule(helper, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const exportsObj = {};
vm.runInNewContext(transpiled.outputText, { exports: exportsObj, URLSearchParams });
const { selectedRecordId, withSelectedRecordId } = exportsObj;
check(typeof selectedRecordId === 'function', 'Selection reader exported');
check(typeof withSelectedRecordId === 'function', 'Selection writer exported');
for (const [key, old] of [['reservationId','reservation_id'], ['requisitionId','requisition_id']]) {
  check(selectedRecordId(new URLSearchParams(`${key}=record-1`), key, old) === 'record-1', `${key}: canonical key`);
  check(selectedRecordId(new URLSearchParams(`${old}=record-2`), key, old) === 'record-2', `${key}: legacy key`);
  check(selectedRecordId(new URLSearchParams(`${key}=record-1&${old}=record-2`), key, old) === 'record-1', `${key}: canonical wins`);
  check(selectedRecordId(new URLSearchParams(`${key}=+++&${old}=record-2`), key, old) === 'record-2', `${key}: empty canonical falls back`);
  check(selectedRecordId(new URLSearchParams(''), key, old) === '', `${key}: no selection`);
  const original = new URLSearchParams(`tab=open&${old}=old&search=foo`);
  const selected = withSelectedRecordId(original, key, old, ' new-ID ');
  check(selected.get(key) === 'new-ID', `${key}: new selection`);
  check(!selected.has(old), `${key}: legacy key removed`);
  check(selected.get('tab') === 'open' && selected.get('search') === 'foo', `${key}: unrelated parameters preserved`);
  check(original.has(old) && !original.has(key), `${key}: original query untouched`);
  const switched = withSelectedRecordId(selected, key, old, 'another-ID');
  check(selectedRecordId(switched, key, old) === 'another-ID', `${key}: selecting another record`);
  check(selectedRecordId(selected, key, old) === 'new-ID', `${key}: prior URL is stable for browser Back`);
  const cleared = withSelectedRecordId(switched, key, old, ' ');
  check(!cleared.has(key) && !cleared.has(old), `${key}: clearing selection`);
  check(cleared.get('tab') === 'open', `${key}: clear preserves other filters`);
}
check(reservations.includes("selectedRecordId(searchParams, 'reservationId', 'reservation_id')"), 'Reservations: derive from URL');
check(reservations.includes("setSearchParams((current) => withSelectedRecordId(current, 'reservationId', 'reservation_id', reservationId))"), 'Reservations: write URL on selection');
check(!reservations.includes('setSelectedReservationId('), 'Reservations: no stale second state');
check(!reservations.includes('const [selectedReservationId,'), 'Reservations: no local state shadowing the URL');
check(requisitions.includes("selectedRecordId(searchParams, 'requisitionId', 'requisition_id') || null"), 'Requisitions: derive from URL');
check(requisitions.includes("setSearchParams((current) => withSelectedRecordId(current, 'requisitionId', 'requisition_id', id))"), 'Requisitions: update URL');
check(!requisitions.includes('setSelectedId('), 'Requisitions: no stale second state');
check(requisitions.includes('onClick={() => selectRequisition(item.id)}'), 'Requisitions: list item click updates URL');
for (const mutation of ['saved.id','updated.id','response.requisition.id']) {
  check(requisitions.includes(`selectRequisition(${mutation})`), `Requisitions: successful mutation selects through URL (${mutation})`);
}
console.log(`PASS: ${checks}/${checks} reservation/requisition URL-selection checks`);
