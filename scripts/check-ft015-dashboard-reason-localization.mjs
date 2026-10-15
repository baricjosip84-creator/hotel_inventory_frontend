#!/usr/bin/env node
// FT-015: test the actual FE Dashboard helper against the observed live reason strings.
// Do not change a movement's classification, evidence or stored reason.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/pages/DashboardPage.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
let checks = 0;
function test(actual, expected, label) {
  assert.equal(actual, expected, label);
  checks++;
}
const match = src.match(/function dashboardReasonLabel\(row: RecentActivityRow, ui: \(englishText: string\) => string\): string \{[\s\S]*?\n\}/);
assert.ok(match, 'Real Dashboard reason helper exists');
checks++;
const executable = match[0]
  .replace('(row: RecentActivityRow, ui: (englishText: string) => string): string', '(row, ui)')
  .replace(/: Record<string, string>/g, '');
const sandbox = vm.createContext({});
vm.runInContext(`${executable}\nthis.formatReason=dashboardReasonLabel;`, sandbox, {timeout:1500});
const formatter = sandbox.formatReason;
const locales = ['en','de','es','fr','hr'];
const keys = [
  ['requisition fulfillment', 'Requisition Fulfillment', ['Requisition Fulfillment','Anforderungsentnahme','Cumplimiento de requisición','Exécution de réquisition','Ispunjenje zahtjeva']],
  ['supplier return dispatch', 'Supplier Return Dispatch', ['Supplier Return Dispatch','Lieferantenrücksendung','Salida de devolución a proveedor','Expédition de retour fournisseur','Otprema povrata dobavljaču']],
  ['cycle count reconciliation', 'Cycle Count Reconciliation', ['Cycle Count Reconciliation','Zykluszählungsabgleich','Conciliación de conteo cíclico','Rapprochement d’inventaire tournant','Usklađenje cikličkog brojanja']],
];
const translated = {};
for (const [reason,key,words] of keys) {
  assert.ok(catalog.includes('["'+key+'",'),`Translations exist for ${key}`);
  checks++;
  translated[key] = words;
  for (let i=0;i<locales.length;i++) {
    const ui = s => translated[s] ? translated[s][i] : s;
    const variants = [reason,reason.replaceAll(' ','_'),reason.toUpperCase(),reason.replaceAll(' ','_')+':source-id'];
    for (const variant of variants) {
      test(formatter({movement_kind:'consumption',reason:variant},ui),words[i],`${locales[i]} known reason ${variant}`);
    }
  }
}
const ui = x=>x;
test(formatter({movement_kind:'unclassified',reason:'requisition fulfillment'},ui), 'requisition fulfillment', 'legacy raw evidence not rewritten');
test(formatter({movement_kind:'unclassified',reason:'supplier_return_dispatch:id'},ui),'supplier_return_dispatch:id','legacy raw machine evidence retained for source helper');
test(formatter({movement_kind:'transfer_out',reason:'stock_transfer_out:abc'},ui),'Stock transfer','stock transfer unchanged');
test(formatter({movement_kind:'consumption',reason:'usage:abc'},ui),'Stock consumed','usage unchanged');
test(formatter({movement_kind:'adjustment',reason:'manual_adjustment'},ui),'Manual adjustment','manual adjustment unchanged');
test(formatter({movement_kind:'receipt',reason:'shipment_receive',shipment_id:'s',shipment_po_number:'PO-001'},ui),'PO-001','existing receipt reference preserved');
test(formatter({movement_kind:'receipt',reason:'SHP-123'},ui),'SHP-123','shipment reference preserved');
test(formatter({movement_kind:'adjustment',reason:'Broken jar recorded by manager'},ui),'Broken jar recorded by manager','human note preserved');
test(formatter({movement_kind:'adjustment',reason:'warehouse_note:abc'},ui),'Other recorded movement: warehouse note','unknown machine category remains neutral');
assert.ok(src.includes('title={row.reason || undefined}'),'raw reason remains visible on hover'); checks++;
console.log(`FT-015 dashboard reason localization: ${checks}/${checks} PASS (5 languages, live samples, legacy evidence, regression)`);
