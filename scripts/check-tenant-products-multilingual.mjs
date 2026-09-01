import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const productDir = path.join(root, 'src/pages/products');
const productFiles = fs.readdirSync(productDir)
  .filter((name) => /\.(?:ts|tsx)$/.test(name))
  .sort();

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a translation row.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}

const literalKeys = [];
const translatedSourceFiles = [];
for (const file of productFiles) {
  const source = read(`src/pages/products/${file}`);
  let found = false;
  for (const match of source.matchAll(literalUiPattern)) {
    try {
      literalKeys.push(decodeLiteral(match[1]));
      found = true;
    } catch {
      // Ignore future complex literal forms; they will be caught by TypeScript/lint.
    }
  }
  if (found) translatedSourceFiles.push(file);
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Products has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Products has ${new Set(literalKeys).size} catalog-backed literal UI keys across ${translatedSourceFiles.length} source files.`);

const representativeRows = [
  'Products', 'Product List', 'Create Product', 'Update Product', 'Archive product',
  'Product created successfully.', 'Product updated successfully.', 'Product archived successfully.',
  'Packages', 'Package created successfully.', 'Package updated successfully.', 'Package archived successfully.',
  'Search products', 'Scan barcode', 'Default Barcode', 'Minimum Stock', 'Standard unit cost',
  'Cost intelligence', 'Cost Action Summary', 'Cost Report Summary', 'Cost Governance Summary',
  'Cost Valuation Summary', 'Cost Risk Summary', 'Recommendations', 'Readiness Score', 'Weighted Avg Cost',
  'No cost basis', 'Received movement cost', 'Standard fallback', 'Review required',
  'Unable to load cost dashboard summary.', 'Unable to load cost valuation summary.'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Products translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Product rows are present in all five locales.`);

const dynamicCatalogKeys = [
  'Critical', 'High', 'Medium', 'Low', 'Watch', 'Passed', 'Failed', 'Ready', 'Clear', 'Controlled',
  'Present', 'None', 'Tenant scoped', 'Tenant actor', 'Read-only', 'Follow-up required', 'Review required',
  'Final review required', 'Ready for sign-off', 'Not ready', 'Conditional review', 'Ready to close',
  'Ready to archive', 'Ready for handoff', 'Steady state', 'Operationally ready', 'Readiness watch',
  'Readiness review', 'Performance ready', 'Performance watch', 'Performance review', 'Security ready',
  'Security watch', 'Security review', 'Capture missing cost', 'Review standard cost',
  'Investigate cost history', 'Investigate cost spike', 'Refresh cost evidence', 'Missing cost',
  'High variance', 'Cost spike', 'Inconsistent history', 'Stale cost', 'Received cost',
  'Standard fallback', 'No cost', 'Unknown basis', 'Recent received cost', 'Stale received cost',
  'Standard fallback only', 'No cost date', 'Valued inventory review', 'Unvalued stock review', 'Master data review'
];
const missingDynamic = dynamicCatalogKeys.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Products dynamic display labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicCatalogKeys.length} dynamic Product labels are catalog-backed.`);

const formattingSource = read('src/pages/products/productFormatting.ts');
if (!formattingSource.includes('formatLocalizedDateTime(') || !formattingSource.includes('formatLocalizedCurrency(') || !formattingSource.includes('formatLocalizedNumber(')) {
  fail('Products formatting must use locale-aware date/time, currency, and number helpers.');
} else {
  pass('Products date/time, currency, number, and percentage formatting is locale-aware.');
}

const reportSource = read('src/pages/products/ProductCostReportSummaryPanel.tsx');
if (!reportSource.includes('ui(formatStatusLabel(row.metric))')) {
  fail('Products report metrics must translate canonical metric labels at display time.');
}

const productSources = Object.fromEntries(productFiles.map((file) => [file, read(`src/pages/products/${file}`)]));
const forbiddenMixedLanguage = [
  ['ProductCostOperationsSummaryPanel.tsx', '.toFixed('],
  ['ProductCostGovernanceSummaryPanel.tsx', '.toFixed('],
  ['ProductCostGovernanceFinalizationPanel.tsx', '.toFixed('],
  ['ProductCostActionCoveragePanel.tsx', '.toFixed('],
  ['ProductCostDashboardSummaryPanel.tsx', '.toFixed('],
  ['ProductCostHardeningSummaryPanel.tsx', '.toFixed('],
  ['ProductCostReportSummaryPanel.tsx', "row.metric.split('_')"],
  ['productMutations.ts', "setFormMessage('Product created successfully.')"],
  ['productActionHandlers.ts', "setFormError('SKU is required.')"]
];
for (const [file, pattern] of forbiddenMixedLanguage) {
  if (productSources[file]?.includes(pattern)) fail(`Products still contains locale-neutral or English-only presentation in ${file}: ${pattern}`);
}

const forbiddenTechnicalTranslation = [
  "ui('/products')", 'ui("/products")',
  "ui('products.write')", 'ui("products.write")',
  "ui('product_packages.write')", 'ui("product_packages.write")',
  "ui('BEV-COFFEE-001')", 'ui("BEV-COFFEE-001")',
  "ui('shipment_item_unit_cost')", 'ui("shipment_item_unit_cost")'
];
for (const pattern of forbiddenTechnicalTranslation) {
  for (const [file, source] of Object.entries(productSources)) {
    if (source.includes(pattern)) fail(`Technical Product value must remain canonical in ${file}: ${pattern}`);
  }
}

const coreApi = read('src/pages/products/productCoreApi.ts');
const packageApi = read('src/pages/products/productPackageApi.ts');
const management = read('src/pages/products/ProductManagementSectionsPanel.tsx');
const canonicalContracts = [
  [coreApi, "apiRequest<ProductItem>('/products'"],
  [coreApi, 'standard_unit_cost: input.standard_unit_cost.trim()'],
  [coreApi, 'barcode: input.barcode.trim() || null'],
  [packageApi, '`/products/${input.productId}/packages`'],
  [management, 'templateColumns={canViewSuppliers'],
  [management, "? ['sku', 'name', 'category', 'unit', 'min_stock', 'standard_unit_cost', 'supplier_name', 'barcode', 'requires_lot_tracking', 'requires_expiry_date']"],
  [management, ": ['sku', 'name', 'category', 'unit', 'min_stock', 'standard_unit_cost', 'barcode', 'requires_lot_tracking', 'requires_expiry_date']"],
  [management, "sku: 'BEV-COFFEE-001'"],
  [management, "requires_lot_tracking: 'false'"],
  [management, "requires_expiry_date: 'false'"]
];
for (const [source, contract] of canonicalContracts) if (!source.includes(contract)) fail(`Products canonical API/import contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Products API routes, import headers/examples, permission identifiers, and stored field names remain language-independent.');

const productPage = read('src/pages/products/ProductPageContent.tsx');
if (!productPage.includes('useAppTranslation')) fail('Products workspace must use the shared translation context.');
const scanner = read('src/pages/products/ProductSearchBarcodeScanner.tsx');
if (!scanner.includes('setError(ui(formatScannerError(scannerError)))')) fail('Product barcode scanner errors must pass through the translation catalog.');
const exportsSource = read('src/pages/products/productCsvExports.ts');
if (!exportsSource.includes('ui(')) fail('Product CSV/export presentation must use translated headers/labels.');
for (const forbiddenExportId of ['movement_id:', 'product_id:', 'shipment_id:', 'history_id:', 'selectedCostProduct.id', 'changed_by_user_id ||', 'user_id ||']) {
  if (exportsSource.includes(forbiddenExportId)) fail(`Product CSV exports must not expose technical identifiers: ${forbiddenExportId}`);
}
if (!exportsSource.includes('withoutTechnicalIdentifiers(row)')) fail('Backend-owned Product export rows must be stripped of technical identifier fields before download.');

if (!process.exitCode) console.log('Tenant Products multilingual hardening: PASS');
