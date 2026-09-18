#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const purchaseOrders = read('src/pages/PurchaseOrdersPage.tsx');
const purchaseOrdersCss = read('src/pages/PurchaseOrdersPage.css');
const supplierCatalog = read('src/components/imports/SupplierCatalogImportPanel.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const historical197 = read('scripts/check-inventory-testing-findings-v349197.mjs');
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
const sliceBetween = (source, startToken, endToken) => {
  const start = source.indexOf(startToken);
  if (start < 0) return '';
  const end = source.indexOf(endToken, start + startToken.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
};

const createMutation = sliceBetween(purchaseOrders, 'const createMutation = useMutation({', 'const updateMutation = useMutation({');
const resetForm = sliceBetween(purchaseOrders, 'const resetForm = () => {', 'useEffect(() => {');
const startEdit = sliceBetween(purchaseOrders, 'const startEdit = () => {', 'const addItem = () => {');
const formSection = sliceBetween(purchaseOrders, '<div ref={createRef} id="purchase-order-create"', '<div ref={detailRef} id="purchase-order-detail"');

check('PO create no longer clears a long form immediately after success', createMutation.includes('setCreatedDraftId(created.id)') && !createMutation.includes('setForm(emptyForm())'));
check('PO create does not force-scroll after success', !createMutation.includes('scrollIntoView'));
check('Completed PO form is locked instead of remaining editable', formSection.includes('fieldset className="purchase-orders-form-fields" disabled={Boolean(createdDraftId && !editingId)}'));
check('Post-create footer offers a deliberate Order detail action', formSection.includes("navigateWorkspaceSection('detail', detailRef.current)") && formSection.includes("ui('Order detail')"));
check('Post-create footer offers a deliberate Create order reset', formSection.includes("onClick={resetForm}>{ui('Create order')}</button>"));
check('Resetting the PO form clears the post-create lock', resetForm.includes('setCreatedDraftId(null)'));
check('Editing an existing draft clears the post-create lock before loading edit state', startEdit.includes('setCreatedDraftId(null)'));
check('Locked-form fieldset follows the page grid spacing and removes native fieldset chrome', purchaseOrdersCss.includes('.purchase-orders-form-fields') && purchaseOrdersCss.includes('border: 0'));
check('Add item remains beside Order items after post-create hardening', /purchase-orders-items-heading[\s\S]{0,420}onClick=\{addItem\}/.test(purchaseOrders));
check('Add another item remains below the current item list', /purchase-orders-items-actions[\s\S]{0,260}Add another item/.test(purchaseOrders));

const catalogCopy = 'Auto can update an existing supplier SKU, match an exact active Product, or prepare Restore for an exact archived Product. It never creates a new Product by itself.';
check('Supplier Catalog Auto wording now explains archived-Product Restore', supplierCatalog.includes(catalogCopy));
check('Supplier Catalog Auto wording still states that Auto never creates a new Product', supplierCatalog.includes('It never creates a new Product by itself.'));
check('Updated Supplier Catalog explanation is present in the five-language catalog', translations.includes(catalogCopy));
check('Historical v3.49.197 guard was reconciled with the no-collapse PO behavior', historical197.includes('Successful PO create preserves the completed form without force-scrolling the page'));

check('v3.49.198 frontend hardening guard is registered', packageJson.includes('check:inventory-testing-hardening-v349198'));
check('v3.49.198 frontend hardening follows v3.49.197 in prelint', /check:inventory-testing-findings-v349197 && npm run check:inventory-testing-hardening-v349198/.test(packageJson));
check('v3.49.198 frontend hardening follows v3.49.197 in prebuild', /check:inventory-testing-findings-v349197 && npm run check:inventory-testing-hardening-v349198/.test(packageJson));
check('v3.49.198 frontend hardening is wired into check:ci', packageJson.includes('npm run check:inventory-testing-hardening-v349198'));

if (failures.length) {
  console.error(`v3.49.198 Inventory testing hardening frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.198 Inventory testing hardening frontend guard: PASS (${passed}/${passed})`);
