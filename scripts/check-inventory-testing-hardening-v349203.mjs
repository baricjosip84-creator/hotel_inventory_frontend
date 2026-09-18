import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const shipments = read('src/pages/ShipmentsPage.tsx');
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

check('Shipment Product options carry backend supplier-eligibility evidence',
  shipments.includes('eligible_supplier_ids?: string[];'));
check('Unlinked shipment Product list uses supplier-eligibility evidence instead of only Product default supplier',
  shipments.includes('product.eligible_supplier_ids.includes(selectedShipment.supplier_id)'));
check('Linked Purchase Order shipment list trusts the approved PO Product set instead of reinterpreting current Product supplier',
  shipments.includes('if (linkedProductIds) {') && shipments.includes('return linkedProductIds.has(product.id);'));
check('Shipment item preflight reuses the same rendered eligibility set',
  shipments.includes('if (!shipmentProductOptions.some((product) => product.id === selectedProduct.id))'));
check('Shipment Product option label does not misleadingly show an unrelated default supplier',
  !shipments.includes("{product.supplier_name ? ` · ${product.supplier_name}` : ''}"));
check('Shipment supplier relationship guidance no longer recommends unassigned Products',
  translations.includes('List is limited to Products currently supplied by this shipment supplier.')
  && translations.includes('List is limited to Products on the linked Purchase Order.')
  && translations.includes('Product is not supplied by the selected shipment supplier.'));
check('v3.49.203 frontend hardening guard is registered',
  packageJson.includes('check:inventory-testing-hardening-v349203'));
check('v3.49.203 frontend hardening guard is in lint/build/CI prerequisite chains',
  (packageJson.match(/check:inventory-testing-hardening-v349203/g) || []).length >= 4);

if (failures.length) {
  console.error(`v3.49.203 Inventory testing hardening frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.203 Inventory testing hardening frontend guard: PASS (${passed}/${passed})`);
