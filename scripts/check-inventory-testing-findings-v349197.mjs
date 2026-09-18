#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const files = {
  packageJson: read('package.json'),
  productApi: read('src/pages/products/productCoreApi.ts'),
  archivedPanel: read('src/pages/products/ArchivedProductsPanel.tsx'),
  productSections: read('src/pages/products/ProductManagementSectionsPanel.tsx'),
  supplierCatalogImport: read('src/components/imports/SupplierCatalogImportPanel.tsx'),
  purchaseOrders: read('src/pages/PurchaseOrdersPage.tsx'),
  purchaseOrdersCss: read('src/pages/PurchaseOrdersPage.css'),
  executionRequests: read('src/pages/ExecutionRequestsPage.tsx'),
  inventoryTypes: read('src/types/inventory.ts'),
  translations: read('src/i18n/tenantUiTranslations.ts')
};

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
const has = (source, token) => source.includes(token);
const sliceBetween = (source, startToken, endToken) => {
  const start = source.indexOf(startToken);
  if (start < 0) return '';
  const end = source.indexOf(endToken, start + startToken.length);
  return end < 0 ? source.slice(start) : source.slice(start, end);
};

// Product archive/restore UI.
check('Product API exposes archived Product read', has(files.productApi, "apiRequest<ProductItem[]>('/products/archived')"));
check('Product API restores by ID with If-Match-Version', has(files.productApi, '`/products/${product.id}/restore`') && has(files.productApi, "'If-Match-Version': String(product.version)"));
check('Products page includes an Archived Products panel', has(files.productSections, '<ArchivedProductsPanel canManageProducts={canManageProducts} />'));
check('Archived Products panel is read-visible but Restore is Products-write gated', has(files.archivedPanel, "queryKey: ['products', 'archived']") && has(files.archivedPanel, 'disabled={!canManageProducts || restoreMutation.isPending}'));
check('Restore invalidates active Product and supplier-catalog views', has(files.archivedPanel, "queryKey: ['products']") && has(files.archivedPanel, "queryKey: ['enterprise-supplier-catalog']"));

// Supplier Catalog import restore path.
check('Supplier Catalog import offers Restore Product', has(files.supplierCatalogImport, '<option value="restore"') && has(files.supplierCatalogImport, "restore_product: 'Restore Product'"));
check('Restore Product option requires Products write permission', /option value="restore" disabled=\{!canCreateProducts\}/.test(files.supplierCatalogImport));
check('Commit warning clearly includes Product restoration', has(files.supplierCatalogImport, 'This may create or restore Products'));
check('Commit summary reports restored Product count', has(files.supplierCatalogImport, 'Products restored: {restored}') && has(files.supplierCatalogImport, 'summary.restored_products'));

// PO stability and item-entry UX.
const createMutation = sliceBetween(files.purchaseOrders, 'const createMutation = useMutation({', 'const updateMutation = useMutation({');
check('Successful PO create seeds the new detail record directly', has(createMutation, "setQueryData(['purchase-order', created.id], created)"));
check('Successful PO create preserves the completed form without force-scrolling the page', has(createMutation, 'setCreatedDraftId(created.id)') && !has(createMutation, 'setForm(emptyForm())') && !has(createMutation, 'scrollIntoView'));
check('Successful PO create keeps the user in the Create workspace instead of jumping the viewport', has(createMutation, "setActiveWorkspaceSection('create')"));
const createHeader = sliceBetween(files.purchaseOrders, 'title={editingId ? ui(\'Edit purchase order draft\')', '<div className="purchase-orders-form-grid">');
check('Add item is no longer attached to the top create-section header', !has(createHeader, 'onClick={addItem}'));
check('Add item is positioned beside the Order items heading', /purchase-orders-items-heading[\s\S]{0,420}onClick=\{addItem\}/.test(files.purchaseOrders));
check('A second Add another item action is available after the current item list', /purchase-orders-items-actions[\s\S]{0,260}onClick=\{addItem\}[\s\S]{0,120}Add another item/.test(files.purchaseOrders));
check('PO item action row has dedicated layout styling', has(files.purchaseOrdersCss, '.purchase-orders-items-actions'));

// Execution Request staffing-aware separation UX.
check('Execution Request type carries server action eligibility', has(files.inventoryTypes, 'action_eligibility?:') && has(files.inventoryTypes, 'fallback_allowed: boolean'));
check('Review buttons disable only when the server says another reviewer must act', has(files.executionRequests, 'request.action_eligibility?.review?.blocked') && has(files.executionRequests, 'selected.action_eligibility?.review?.blocked'));
check('Execute buttons disable only when the server says another executor must act', has(files.executionRequests, 'request.action_eligibility?.execute?.blocked') && has(files.executionRequests, 'selected.action_eligibility?.execute?.blocked'));
check('UI explains when another authorized reviewer is required', has(files.executionRequests, 'Another authorized user must review this request.'));
check('UI explains when another authorized executor is required', has(files.executionRequests, 'Another authorized user must execute this request.'));
check('UI explains the single-authorized-user review fallback', has(files.executionRequests, 'No other authorized user is available, so you may review this request.'));
check('UI explains the single-authorized-user execution fallback', has(files.executionRequests, 'No other authorized user is available, so you may execute this request.'));
check('Fallback guidance is shown only to users who have the matching action permission', has(files.executionRequests, "canReviewExecutionRequests && selected.status === 'pending_review' && selected.action_eligibility?.review?.fallback_allowed") && has(files.executionRequests, "canExecuteExecutionRequests && canWriteProducts && selected.status === 'approved'"));

for (const key of [
  'Archived products',
  'Restore Product',
  'Add another item',
  'Another authorized user must review this request.',
  'Another authorized user must execute this request.',
  'No other authorized user is available, so you may review this request.',
  'No other authorized user is available, so you may execute this request.'
]) {
  check(`Tenant translation catalog contains ${key}`, has(files.translations, `["${key}"`));
}

check('v3.49.197 frontend guard is registered', has(files.packageJson, 'check:inventory-testing-findings-v349197'));
check('v3.49.197 follows v3.49.196 in prelint', /check:decision-intelligence-layout-ci-closure-v349196 && npm run check:inventory-testing-findings-v349197/.test(files.packageJson));
check('v3.49.197 follows v3.49.196 in prebuild', /check:decision-intelligence-layout-ci-closure-v349196 && npm run check:inventory-testing-findings-v349197/.test(files.packageJson));
check('v3.49.197 is wired into check:ci', has(files.packageJson, 'npm run check:inventory-testing-findings-v349197'));

if (failures.length) {
  console.error(`v3.49.197 Inventory testing findings frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.197 Inventory testing findings frontend guard: PASS (${passed}/${passed})`);
