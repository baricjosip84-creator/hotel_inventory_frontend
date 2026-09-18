#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const purchaseOrders = read('src/pages/PurchaseOrdersPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const packageJson = read('package.json');

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};

check('Purchase Order Product guidance describes current supply eligibility instead of only Product-page assignment',
  purchaseOrders.includes("Only products currently supplied by the selected supplier are shown.")
  && !purchaseOrders.includes("Only products assigned to the selected supplier are shown."));
check('Purchase Order empty-state guidance points to Supplier Catalog or Product default supplier',
  purchaseOrders.includes("No products are currently supplied by this supplier. Configure the Supplier Catalog or Product default supplier first.")
  && !purchaseOrders.includes("Assign products to the supplier on the Products page first."));
check('Updated PO supplier relationship guidance is translated across the tenant language table',
  translations.includes('["Only products currently supplied by the selected supplier are shown."')
  && translations.includes('["No products are currently supplied by this supplier. Configure the Supplier Catalog or Product default supplier first."'));
check('v3.49.204 frontend hardening guard is registered',
  packageJson.includes('check:inventory-testing-hardening-v349204'));
check('v3.49.204 frontend hardening guard follows v3.49.203 in lint/build/CI prerequisite chains',
  (packageJson.match(/check:inventory-testing-hardening-v349203 && npm run check:inventory-testing-hardening-v349204/g) || []).length >= 3);

if (failures.length) {
  console.error(`v3.49.204 Inventory testing hardening frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.204 Inventory testing hardening frontend guard: PASS (${passed}/${passed})`);
