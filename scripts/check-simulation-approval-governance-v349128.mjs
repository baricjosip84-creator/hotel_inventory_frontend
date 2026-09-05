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

const tab = read('src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');
const payloads = read('src/components/enterpriseInventory/EnterpriseInventoryPayloads.ts');
const mutations = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');

for (const permission of ['PURCHASE_ORDERS_READ', 'INVOICES_READ', 'REQUISITIONS_READ', 'CYCLE_COUNTS_READ', 'SUPPLIER_RETURNS_READ']) {
  check(tab.includes(`TENANT_PERMISSIONS.${permission}`), `approval rule entity choices respect ${permission}`);
}
check(tab.includes('.filter((option) => option.visible)'), 'hidden approval-rule domains are removed from the entity selector');
check(tab.includes("window.prompt(ui('Rejection reason'))"), 'approval rejection asks for an explicit reason');
check(tab.includes('comment.length < 3'), 'approval rejection refuses an empty/too-short reason before submit');
check(tab.includes('executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action, comment })'), 'approval rejection sends the reason');
check(payloads.includes('comment?: string'), 'approval payload accepts an optional comment');
check(payloads.includes("comment: input.comment?.trim() || null"), 'approval payload transmits normalized comment');
check(mutations.includes('comment?: string'), 'approval mutation input preserves the rejection comment');

console.log(`PASS - v3.49.128 frontend approval governance remediation (${checks.length}/${checks.length})`);
for (const message of checks) console.log(`PASS - ${message}`);
