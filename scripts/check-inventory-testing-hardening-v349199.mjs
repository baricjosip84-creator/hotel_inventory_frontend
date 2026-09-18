#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const execution = read('src/pages/ExecutionRequestsPage.tsx');
const supplierCatalog = read('src/components/imports/SupplierCatalogImportPanel.tsx');
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

check('List no-op completion is disabled when another authorized executor exists', /Complete without change[\s\S]{0,40}<\/button>/.test(execution) && execution.includes('disabled={saving || Boolean(request.action_eligibility?.execute?.blocked)}'));
check('Detail no-op completion is disabled when another authorized executor exists', execution.includes('disabled={saving || Boolean(selected.action_eligibility?.execute?.blocked)}'));
check('No-op completion explains when another authorized user must execute', execution.includes("ui('Another authorized user must execute this request.')"));
check('No-op completion explains the single-authorized-user fallback', execution.includes("ui('No other authorized user is available, so you may execute this request.')"));
check('Detail guidance covers both real and no-op approved requests', execution.includes('(selected.adapter?.execution_enabled ? canWriteProducts : true) && selected.action_eligibility?.execute?.blocked'));
check('Mutation responses immediately refresh the selected request and matching registry row before a network reload', execution.includes('const applyReturnedRequest = useCallback') && execution.includes('rows: current.rows.map((row) => row.id === updated.id ? { ...row, ...updated } : row)') && (execution.match(/applyReturnedRequest\(updated\);/g) || []).length >= 7);

check('Supplier Catalog preview translates update_catalog resolution', supplierCatalog.includes("update_catalog: 'Update catalog item'"));
check('Supplier Catalog preview translates match_product resolution', supplierCatalog.includes("match_product: 'Match Product'"));
check('Supplier Catalog preview translates create catalog change', supplierCatalog.includes("create: 'Create catalog item'"));
check('Supplier Catalog preview translates update catalog change', supplierCatalog.includes("update: 'Update catalog item'"));
check('Supplier Catalog preview translates reactivate catalog change', supplierCatalog.includes("reactivate: 'Reactivate'"));
check('Supplier Catalog preview translates deactivate and skip outcomes', supplierCatalog.includes("deactivate: 'Deactivate'") && supplierCatalog.includes("skip: 'Skip'"));

check('Create catalog item has five-language translation coverage', translations.includes('["Create catalog item", "Katalogeintrag erstellen", "Crear elemento del catálogo", "Créer un élément du catalogue", "Stvori stavku kataloga"]'));
check('Update catalog item has five-language translation coverage', translations.includes('["Update catalog item", "Katalogeintrag aktualisieren", "Actualizar elemento del catálogo", "Mettre à jour l’élément du catalogue", "Ažuriraj stavku kataloga"]'));
check('Match Product has five-language translation coverage', translations.includes('["Match Product", "Produkt zuordnen", "Vincular Producto", "Associer le Produit", "Poveži Proizvod"]'));
check('Clicking the top Create order workspace tab starts a fresh form after a successful create instead of reopening the locked completed form', purchaseOrders.includes('if (createdDraftId && !editingId) resetForm();'));

check('v3.49.199 frontend hardening guard is registered', packageJson.includes('check:inventory-testing-hardening-v349199'));
check('v3.49.199 follows v3.49.198 in prelint', /check:inventory-testing-hardening-v349198 && npm run check:inventory-testing-hardening-v349199/.test(packageJson));
check('v3.49.199 follows v3.49.198 in prebuild', /check:inventory-testing-hardening-v349198 && npm run check:inventory-testing-hardening-v349199/.test(packageJson));
check('v3.49.199 is wired into check:ci', packageJson.includes('npm run check:inventory-testing-hardening-v349199'));

if (failures.length) {
  console.error(`v3.49.199 Inventory testing hardening frontend guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.199 Inventory testing hardening frontend guard: PASS (${passed}/${passed})`);
