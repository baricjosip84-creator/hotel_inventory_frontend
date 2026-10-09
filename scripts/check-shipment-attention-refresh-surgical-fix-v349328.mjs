import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fe = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.resolve(fe, '..', 'hotel-inventory-backend');
const read = (root, filename) => fs.readFileSync(path.join(root, filename), 'utf8');
const page = read(fe, 'src/pages/ShipmentsPage.tsx');
const hook = read(fe, 'src/lib/sidebarAttentionItems.ts');
const layout = read(fe, 'src/layouts/AppLayout.tsx');
const service = read(backend, 'src/services/operations/navigationAttentionService.js');
const pkg = JSON.parse(read(fe, 'package.json'));
const between = (start, end) => {
  const i = page.indexOf(start);
  assert.ok(i >= 0, `Missing ${start}`);
  const j = page.indexOf(end, i + start.length);
  assert.ok(j > i, `Missing ${end}`);
  return page.slice(i, j);
};
const receive = between('const receiveShipmentMutation = useMutation({', 'const finalizeShipmentMutation = useMutation({');
const finalize = between('const finalizeShipmentMutation = useMutation({', 'const previewShipmentSupplierEmailMutation = useMutation({');
const shortage = between('const recordReceivingDiscrepancyMutation = useMutation({', 'const autoReorderShipmentMutation = useMutation({');
const rows = between('pagedShipments.map((shipment) => {', '</button>');
const backendShipments = service.slice(service.indexOf("if (normalizedSurface === 'shipments')"), service.indexOf("if (normalizedSurface === 'outbound')"));
const prefix = "['tenant-sidebar', 'operational-navigation-attention']";
const tests = [
  ['page uses server-backed shipment attention hook', () => assert.match(page, /useOperationalAttentionItems\('shipments', canReceiveShipments \|\| canFinalizeShipments\)/)],
  ['attention ids remain provided by server', () => assert.match(page, /const shipmentAttentionIds = shipmentAttentionItemsQuery\.attentionIds/)],
  ['attention item query uses shared prefix', () => assert.match(hook, /queryKey:\s*\['tenant-sidebar', 'operational-navigation-attention', 'items', surface/)],
  ['sidebar operational summary shares same prefix', () => assert.match(layout, /queryKey:\s*\['tenant-sidebar', 'operational-navigation-attention', tenantAccess\.tenantId/)],
  ['the item query fetches real server attention', () => assert.match(hook, /\/navigation-attention\/operational-items\/\$\{surface\}/)],
  ['the sidebar summary fetches real server attention', () => assert.match(layout, /\/navigation-attention\/operational-summary/)],
  ['backend still requires shipment read plus receive', () => assert.match(backendShipments, /SHIPMENTS_READ\)[\s\S]*?SHIPMENTS_RECEIVE\)/)],
  ['backend still requires shipment read plus finalize', () => assert.match(backendShipments, /SHIPMENTS_READ\)[\s\S]*?SHIPMENTS_FINALIZE\)/)],
  ['due-receive attention excludes finalized shipments', () => assert.match(backendShipments, /sh\.status IN \('pending', 'partial'\) AND sh\.delivery_date <= CURRENT_DATE/)],
  ['ready-finalize attention excludes finalized shipments', () => assert.match(backendShipments, /sh\.status IN \('pending', 'partial'\)\s*\n\s*AND EXISTS/)],
  ['backend still derives attention ids from actual database rows', () => assert.match(backendShipments, /attention_ids:\s*Array\.from\(new Set\(\[\.\.\.dueReceiveIds, \.\.\.readyFinalizeIds\]\)\)/)],
  ['card marker remains server driven', () => assert.match(rows, /causesSidebarAttention = shipmentAttentionIds\.has\(shipment\.id\)/)],
  ['card marker is not masked by Received status', () => assert.match(rows, /\{causesSidebarAttention \? <div/)],
  ['shortage reason mutation still refetches shipment items', () => assert.match(shortage, /queryClient\.refetchQueries\(\{ queryKey: \['shipment-items', selectedShipmentId\] \}\)/)],
  ['shortage reason mutation refreshes attention', () => assert.ok(shortage.includes(`await queryClient.invalidateQueries({ queryKey: ${prefix} });`))],
  ['receiving mutation refetches shipments', () => assert.match(receive, /queryClient\.refetchQueries\(\{ queryKey: \['shipments'\] \}\)/)],
  ['receiving mutation refreshes attention', () => assert.ok(receive.includes(`await queryClient.invalidateQueries({ queryKey: ${prefix} });`))],
  ['finalization mutation refetches shipments', () => assert.match(finalize, /queryClient\.refetchQueries\(\{ queryKey: \['shipments'\] \}\)/)],
  ['finalization mutation refreshes attention', () => assert.ok(finalize.includes(`await queryClient.invalidateQueries({ queryKey: ${prefix} });`))],
  ['receiving attention refresh follows shipment list refresh', () => assert.ok(receive.indexOf('queryClient.invalidateQueries({ queryKey: '+prefix) > receive.indexOf("queryClient.refetchQueries({ queryKey: ['shipments']"))],
  ['finalization attention refresh follows shipment list refresh', () => assert.ok(finalize.indexOf('queryClient.invalidateQueries({ queryKey: '+prefix) > finalize.indexOf("queryClient.refetchQueries({ queryKey: ['shipments']"))],
  ['shortage attention refresh follows shipment list refresh', () => assert.ok(shortage.indexOf('queryClient.invalidateQueries({ queryKey: '+prefix) > shortage.indexOf("queryClient.refetchQueries({ queryKey: ['shipments']"))],
  ['finalization success feedback preserved', () => assert.match(finalize, /ui\('✔ Shipment finalized and locked for receiving\.'\)/)],
  ['receiving success feedback preserved', () => assert.match(receive, /ui\('✔ \{product\} \+\{quantity\} received into stock\.\{poProgress\}'\)/)],
  ['finalize still invalidates linked purchase order', () => assert.match(finalize, /queryKey: \['purchase-orders'\]/)],
  ['finalize still updates dashboards and alerts', () => assert.match(finalize, /queryKey: \['dashboard-summary'\][\s\S]*?queryKey: \['alerts'\]/)],
  ['all three refresh only on mutation success', () => {for (const section of [receive, finalize, shortage]) assert.ok(section.indexOf('operational-navigation-attention') < section.indexOf('onError:'));}],
  ['no local forced clear of server attention data', () => assert.doesNotMatch(page, /shipmentAttentionIds\.delete\(|setQueryData\(\s*\['tenant-sidebar', 'operational-navigation-attention'/)],
  ['backend code is untouched by this frontend correction', () => assert.match(backendShipments, /due_receive_ids: dueReceiveIds,[\s\S]*?ready_finalize_ids: readyFinalizeIds/)],
  ['new guard is registered in package scripts', () => assert.equal(pkg.scripts['check:shipment-attention-refresh-v349328'], 'node scripts/check-shipment-attention-refresh-surgical-fix-v349328.mjs')],
];
let pass=0;
for(const [name, check] of tests){try{check();pass++; console.log('PASS',name);}catch(error){console.error('FAIL',name,error.message);throw error;}}
console.log(`Shipment attention refresh: ${pass}/${tests.length} PASS`);
