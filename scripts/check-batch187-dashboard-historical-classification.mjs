#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/pages/DashboardPage.tsx'), 'utf8');
let checks = 0;
const ok = (value, description) => { assert.ok(value, description); checks++; };
const eq = (value, expected, description) => { assert.equal(value, expected, description); checks++; };
const extract = pattern => { const match = source.match(pattern); ok(match, 'Found actual dashboard presentation helper'); return match[0]; };
const display = extract(/function movementDisplayValue\(row: RecentActivityRow\): string \{[\s\S]*?\n\}/);
const reason = extract(/function dashboardReasonLabel\(row: RecentActivityRow, ui: \(englishText: string\) => string\): string \{[\s\S]*?\n\}/);
const enumLabel = extract(/function enumDisplayLabel\(value: string, ui: UiTranslator\): string \{[\s\S]*?\n\}/);
const code = display.replace('(row: RecentActivityRow): string', '(row)')
 + '\n' + reason.replace('(row: RecentActivityRow, ui: (englishText: string) => string): string','(row, ui)').replaceAll(': Record<string, string>', '')
 + '\n' + enumLabel.replace('(value: string, ui: UiTranslator): string','(value, ui)')
 + '\nthis.display = movementDisplayValue; this.reason = dashboardReasonLabel; this.enumLabel = enumDisplayLabel;';
const sandbox = vm.createContext({});
vm.runInContext(code,sandbox);
for (const type of ['shipment_receive','usage','stock_count','manual_adjustment','stock_transfer_in','other']) {
  eq(sandbox.display({movement_kind:'unclassified', movement_type:type, reason:'usage:123'}), 'unproven_legacy', `legacy ${type} must not be shown as proven`);
}
for (const [kind,type] of [['receipt','shipment_receive'],['consumption','usage'],['adjustment','manual_adjustment'],['transfer_out','stock_transfer_out']]) {
  eq(sandbox.display({movement_kind:kind,movement_type:type}),type,`verified ${type} retains its label`);
}
eq(sandbox.display({movement_kind:'unclassified',movement_type:'shipment_receive'}),'unproven_legacy','stored classification overrides explicit type');
eq(sandbox.display({movement_kind:null,movement_type:'shipment_receive'}),'shipment_receive','legacy absent classification preserves old fallback');
eq(sandbox.display({movement_kind:'consumption',movement_type:null}),'consumption','stored kind remains fallback');
eq(sandbox.reason({movement_kind:'unclassified',shipment_id:'s',reason:'shipment_receive'},x=>x),'shipment_receive','unproven receipt reason is NOT normalized into confirmed shipment');
eq(sandbox.reason({movement_kind:'unclassified',reason:'usage:source-1'},x=>x),'usage:source-1','unproven usage reason is presented as raw evidence');
eq(sandbox.reason({movement_kind:'receipt',shipment_id:'s',reason:'shipment_receive',shipment_po_number:'PO100'},x=>x),'PO100','proven shipment reason still shows human PO reference');
eq(sandbox.enumLabel('unproven_legacy',x=>x),'Unproven legacy movement','unclassified status translates using existing localized string');
for (const fallback of ['Historical Product name unavailable','Historical unit unavailable','Historical location unavailable','Historical actor unavailable']) {
  ok(source.includes(`ui('${fallback}')`),`Dashboard has explicit historical unavailable fallback: ${fallback}`);
}
ok(source.includes("enumDisplayLabel(movementDisplayValue(row), ui)"),'Recent Activity displayed type uses corrected classification helper');
ok(source.includes("dashboardBusinessReasonLabel(row, ui)"),'Recent Activity displays business-friendly reason using the current helper');
ok(source.includes('const raw = dashboardReasonLabel(row, ui);'),'business-facing presentation retains historical evidence-aware helper');
console.log(`Batch187 dashboard historical UI classification: ${checks}/${checks} PASS (actual TS helper expressions; no browser)`);
