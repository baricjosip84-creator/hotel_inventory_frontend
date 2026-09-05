#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL - ${message}`);
  checks.push(message);
};

const purchaseOrders = read('src/pages/PurchaseOrdersPage.tsx');
const suppliers = read('src/pages/SuppliersPage.tsx');
const shipments = read('src/pages/ShipmentsPage.tsx');

check(purchaseOrders.includes("if (status === 'finalize_open_shipment') return 'Finalize Shipment';"), 'Purchase Orders labels the new next action as Finalize Shipment');
check(purchaseOrders.includes("status === 'receive_open_shipment' || status === 'finalize_open_shipment'"), 'Purchase Orders styles receive/finalize receiving work consistently');
check(purchaseOrders.includes("['receive_open_shipment', 'finalize_open_shipment'].includes"), 'Purchase Order receiving summary counts both receive and finalize work as open receiving');
check(purchaseOrders.includes('finalize_open_shipment: 2'), 'ready-to-finalize POs are prioritized in the attention queue');
check(purchaseOrders.includes('navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`)'), 'PO detail retains a direct link to the exact linked shipment that must be finalized');
check(shipments.includes("ui('Finalize Shipment')"), 'Shipments page exposes the explicit finalization action');
check(shipments.includes("ui('This shipment is already finalized.')"), 'Shipments page treats finalized receiving records as closed');
check(suppliers.includes('title={ui("Partially Received")}'), 'Supplier Performance keeps partial shipments presented as current receiving work');
check(suppliers.includes('subtitle={ui("Shipments still awaiting remaining items")}'), 'Supplier Performance explains partial count as still-open work');
check(suppliers.includes('title={ui("Late Open")}'), 'Supplier Performance explicitly labels the overdue metric as open work');
check(suppliers.includes('ui("No overdue shipments.")'), 'Supplier registry reports no overdue work when the open-late set is empty');

console.log(`PASS - v3.49.134 procurement lifecycle frontend remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
