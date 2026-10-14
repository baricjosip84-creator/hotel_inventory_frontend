import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.SOURCE_ROOT || process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/ShipmentsPage.tsx'), 'utf8');
const { resolveShipmentForHandoff: lookup } = await import(pathToFileURL(path.join(root, 'src/utils/resolveShipmentForHandoff.ts')).href);
let checks = 0;
function check(condition, label) { assert.ok(condition, label); checks++; }

let fetchCalls = 0;
const found = { id: 'SHP-1', status: 'pending' };
const inList = await lookup('SHP-1', [found], async () => { fetchCalls++; throw new Error('should not GET'); });
check(inList.shipment === found, 'uses exact registry match');
check(inList.source === 'list', 'identifies registry result');
check(fetchCalls === 0, 'no duplicate GET when already listed');
const missing = await lookup('SHP-2', [found], async (id) => { fetchCalls++; check(id === 'SHP-2', 'direct GET uses exact scan ID'); return { id, status: 'partial' }; });
check(missing.shipment.id === 'SHP-2', 'opens shipment absent from registry');
check(missing.source === 'direct', 'identifies direct fallback');
check(fetchCalls === 1, 'fallback GET executes once');
await assert.rejects(() => lookup('SHP-3', [], async () => ({ id: 'SHP-OTHER' })), /different record/); checks++;
await assert.rejects(() => lookup('SHP-4', [], async () => { throw new Error('Not found or forbidden'); }), /Not found or forbidden/); checks++;
await assert.rejects(() => lookup('  ', [], async () => { fetchCalls++; return found; }), /required/); checks++;
check(fetchCalls === 1, 'invalid ID cannot issue GET');

check(page.includes("resolveShipmentForHandoff(shipmentId, shipments, fetchShipmentById)"), 'scanner effect uses direct ID fallback');
check(page.includes("if (shipmentsQuery.isPending) return;"), 'avoids request while list is loading');
check(page.includes("if (current?.some((item) => item.id === shipment.id)) return current;"), 'does not duplicate registry row');
check(page.includes("if (cancelled) return;"), 'stale navigation cannot populate old shipment');
check(page.includes("if (!matchedShipment) return;"), 'scanner parameters remain available while GET runs');
check(!page.includes("setPageError(ui('Scanned shipment was not found in the current shipment list.'))"), 'no false list-only failure');
check(page.includes("if (searchParams.get('source') === 'purchase-order' || searchParams.get('source') === 'dashboard')"), 'Dashboard and PO effects remain independent');
check(page.includes("setSearchParams(nextParams, { replace: true });\n    focusShipmentDetail('smooth');"), 'successful scanner handoff still focuses the shipment');
check(page.includes("setPendingAutoReceive({"), 'item scan receiving draft path preserved');
console.log(`Scanner missing-list direct lookup regression: ${checks}/${checks} PASS`);
