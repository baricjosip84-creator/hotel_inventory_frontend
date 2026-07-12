import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const apiPath = path.join(root, 'src/pages/inventoryUsage/inventoryUsageApi.ts');
const pagePath = path.join(root, 'src/pages/InventoryUsagePage.tsx');
const typesPath = path.join(root, 'src/pages/inventoryUsage/inventoryUsageTypes.ts');
const dashboardPath = path.join(root, 'src/pages/inventoryUsage/InventoryUsageDashboard.tsx');

const api = fs.readFileSync(apiPath, 'utf8');
const page = fs.readFileSync(pagePath, 'utf8');
const types = fs.readFileSync(typesPath, 'utf8');
const dashboard = fs.readFileSync(dashboardPath, 'utf8');

const requiredApiContracts = [
  ['reversal route', '`/stock/usage/${usageLogId}/reverse`'],
  ['generic mutation feedback suppressed', 'skipMutationFeedback: true']
];

for (const [label, contract] of requiredApiContracts) {
  if (!api.includes(contract)) {
    throw new Error(`Inventory usage reversal API contract missing: ${label}`);
  }
}

const requiredPageContracts = [
  ['specific success wording', 'Inventory usage reversed successfully'],
  ['restored stock details', 'restored; stock ${previousQuantity} → ${newQuantity}.'],
  ['success feedback event', 'detail: { type: "success", message: completionMessage }'],
  ['specific failure wording', 'Inventory usage reversal failed: ${message}'],
  ['usage summary refresh', 'queryKey: ["inventory-usage-summary-page"]'],
  ['usage ledger refresh', 'queryKey: ["inventory-usage-logs-page"]']
];

for (const [label, contract] of requiredPageContracts) {
  if (!page.includes(contract)) {
    throw new Error(`Inventory usage reversal page contract missing: ${label}`);
  }
}

if (!types.includes('product?: {') || !types.includes('name: string;')) {
  throw new Error('Inventory usage reversal response product contract missing.');
}

if (page.includes('Stock created successfully.')) {
  throw new Error('Inventory usage reversal page still contains the incorrect stock-creation message.');
}

if (!/data-skip-global-action-feedback="true"[\s\S]{0,300}onClick=\{\(\) => onReverseUsage\(usage\.id\)\}/.test(dashboard)) {
  throw new Error('Inventory usage Reverse action still allows the generic global Action started notification.');
}

console.log('Inventory usage reversal feedback contract passed.');
