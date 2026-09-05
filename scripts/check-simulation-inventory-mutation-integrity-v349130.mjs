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

const tab = read('src/components/enterpriseInventory/tabs/CycleCountsTab.tsx');
const payloads = read('src/components/enterpriseInventory/EnterpriseInventoryPayloads.ts');
const forms = read('src/components/enterpriseInventory/EnterpriseInventoryForms.ts');
const approvals = read('src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');
const derived = read('src/components/enterpriseInventory/EnterpriseInventoryDerived.ts');

check(tab.includes("label={ui('Counted quantity')}"), 'Cycle Count form asks for the physical counted quantity');
check(!tab.includes('value={cycleCountForm.expected_quantity}'), 'Cycle Count UI does not accept client-authored expected Stock');
check(!payloads.includes('expected_quantity: Number(input.expected_quantity)'), 'Cycle Count payload does not send client-authored expected Stock');
check(!forms.includes("expected_quantity: '',\n  counted_quantity: ''"), 'Cycle Count form state no longer carries editable expected Stock');
check(tab.includes('const hasTrustedEvidence = evidence.length > 0'), 'Cycle Count actions require returned item evidence');
check(tab.includes("hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE) && hasPermission(TENANT_PERMISSIONS.STOCK_ADJUST)"), 'Cycle Count reconcile UI requires approval and Stock Adjust authority');
check(tab.includes("TENANT_PERMISSIONS.STOCK_ADJUST) ? ui('Requires {permission} permission.')"), 'Cycle Count reconcile UI explains the missing Stock Adjust prerequisite');
check(approvals.includes("item.entity_type === 'cycle_count'"), 'Approvals UI continues to expose Cycle Count evidence');
check(derived.includes('cycle_count_items: item.items ?? []'), 'Approval queue receives Cycle Count item evidence');

console.log(`PASS - v3.49.130 frontend inventory mutation integrity remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
