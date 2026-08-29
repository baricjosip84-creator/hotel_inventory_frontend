import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const returnsSource = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const approvalsSource = read('src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');
const catalogSource = read('src/components/enterpriseInventory/tabs/SupplierCatalogsTab.tsx');
const invoicesSource = read('src/components/enterpriseInventory/tabs/InvoicesTab.tsx');
const importSource = read('src/components/imports/SupplierCatalogImportPanel.tsx');
const workflowMutationSource = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const pageActionsSource = read('src/components/enterpriseInventory/EnterpriseInventoryPageActions.ts');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');
const labelsSource = read('src/components/enterpriseInventory/tabs/LabelsTab.tsx');
const attachmentsSource = read('src/components/enterpriseInventory/tabs/AttachmentsTab.tsx');
const notificationsSource = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

for (const row of rows) {
  const expected = [...row[0].matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort().join('|');
  for (const translated of row.slice(1)) {
    const actual = [...translated.matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort().join('|');
    if (actual !== expected) fail(`Placeholder mismatch for tenant UI key: ${row[0]}`);
  }
}
if (!process.exitCode) pass('Tenant UI placeholder parity is intact across all five languages.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const scopedSources = [returnsSource, approvalsSource, catalogSource, invoicesSource, importSource, workflowMutationSource];
const literalSet = new Set();
for (const source of scopedSources) {
  for (const match of source.matchAll(literalPattern)) {
    try { literalSet.add(decodeLiteral(match[1])); } catch {}
  }
}
for (const dynamic of [
  'Supplier return {returnNumber} submitted successfully.',
  'Supplier return {returnNumber} approved successfully.',
  'Supplier return {returnNumber} rejected successfully.',
  'Supplier return {returnNumber} dispatched successfully.',
  'Supplier return {returnNumber} completed successfully.',
  'Supplier return {returnNumber} cancelled successfully.',
  'Available', 'Hold', 'Quarantine', 'Damaged', 'Rejected', 'Draft', 'Submitted', 'Pending approval', 'Approved', 'Dispatched', 'Completed', 'Cancelled',
  'Matched', 'Paid', 'Variance detected', 'No variance', 'Not checked',
  'Purchase order', 'Supplier invoice', 'Department requisition', 'Cycle count', 'Supplier return', 'Admin', 'Manager', 'Staff',
  'Pending', 'Validated', 'Committed', 'Failed', 'Exact supplier SKU', 'Exact internal SKU', 'Exact barcode', 'Create Product', 'Matched existing', 'Created', 'Updated', 'Unchanged', 'Deactivated', 'Skipped', 'None'
]) literalSet.add(dynamic);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Enterprise Inventory procurement-workflow UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Enterprise Inventory procurement workflow has ${literalSet.size} catalog-backed literal/dynamic UI keys.`);

for (const [name, source] of [
  ['Supplier Returns', returnsSource], ['Approvals', approvalsSource], ['Supplier Catalogs', catalogSource], ['Invoices', invoicesSource], ['Supplier Catalog Import', importSource]
]) {
  const rawText = source.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
  if (rawText.length) fail(`Raw direct JSX presentation remains in ${name}: ${rawText.join(' | ')}`);
  else pass(`${name} has zero raw direct JSX presentation text.`);
  const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
  const rawAttributes = [...source.matchAll(rawAttributePattern)].map((match) => match[0]);
  if (rawAttributes.length) fail(`Raw literal presentation attributes remain in ${name}: ${rawAttributes.join(' | ')}`);
  else pass(`${name} has zero raw literal presentation attributes.`);
}

for (const required of [
  "const { locale, ui } = useAppTranslation();",
  'formatLocalizedDateTime(item.created_at, locale)',
  'formatLocalizedCurrency(parsed, currency || getActiveTenantCurrency(), locale',
  'formatLocalizedDateTime(item.created_at, locale)',
  "formatLocalizedDate(invoice.invoice_date, locale)",
  "formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 })",
]) if (!(returnsSource + approvalsSource + catalogSource + invoicesSource).includes(required)) fail(`Procurement workflow locale-aware presentation missing: ${required}`);
if (!process.exitCode) pass('Procurement Workflow uses the shared tenant translation runtime with locale-aware dates, timestamps, quantities, and currency.');

for (const required of [
  'ui("Approval rule saved.")', 'ui("Failed to save approval rule.")',
  'ui("Item approved successfully.")', 'ui("Item rejected successfully.")',
  'ui("Supplier catalog item saved successfully.")', 'ui("Supplier catalog item deactivated successfully.")',
  'ui("Supplier invoice draft created successfully.")', 'ui("Supplier invoice draft updated successfully.")',
  'ui("Supplier invoice submitted successfully.")', 'ui("Supplier invoice marked matched.")', 'ui("Supplier invoice marked paid.")',
  'ui("Failed to update supplier invoice lifecycle.")'
]) if (!workflowMutationSource.includes(required)) fail(`Procurement Workflow mutation feedback is not localized: ${required}`);
if (!pageActionsSource.includes('const { locale, ui } = useAppTranslation();') || !pageActionsSource.includes('    ui,')) fail('Enterprise Inventory page actions do not pass ui into workflow mutations.');
else pass('Approval, supplier-catalog, and invoice frontend mutation feedback is localized while API/server errors remain raw.');

for (const required of [
  "path: 'enterprise-inventory'", '<EnterpriseInventoryPage />'
]) if (!routerSource.includes(required)) fail(`Enterprise Inventory route contract changed or missing: ${required}`);
for (const required of [
  "SUPPLIER_RETURNS_READ: 'supplier_returns.read'", "SUPPLIER_RETURNS_WRITE: 'supplier_returns.write'", "SUPPLIER_RETURNS_DISPATCH: 'supplier_returns.dispatch'",
  "APPROVAL_RULES_READ: 'approval_rules.read'", "APPROVAL_RULES_WRITE: 'approval_rules.write'", "APPROVALS_EXECUTE: 'approvals.execute'",
  "SUPPLIER_CATALOG_READ: 'supplier_catalog.read'", "SUPPLIER_CATALOG_WRITE: 'supplier_catalog.write'",
  "INVOICES_READ: 'invoices.read'", "INVOICES_WRITE: 'invoices.write'"
]) if (!permissionsSource.includes(required)) fail(`Enterprise Inventory procurement permission identifier changed or missing: ${required}`);
if (!process.exitCode) pass('Enterprise Inventory Procurement Workflow route and permission identifiers remain unchanged.');

for (const required of [
  "'/enterprise-inventory/supplier-returns'", "'/enterprise-inventory/approvals/execute'", '`/enterprise-inventory/supplier-returns/${item.id}/cancel`',
  '"/enterprise-inventory/approval-rules"', '"/enterprise-inventory/approvals/execute"',
  '"/enterprise-inventory/supplier-catalog"', '`/enterprise-inventory/supplier-catalog/${item.id}/deactivate`',
  '"/enterprise-inventory/supplier-invoices"', '`/enterprise-inventory/supplier-invoices/${invoice.id}`', '`/enterprise-inventory/supplier-invoices/${invoice.id}/${action}`',
  'buildApprovalRulePayload(input)', 'buildApprovalExecutionPayload(input)', 'buildSupplierCatalogPayload(input)', 'buildSupplierInvoicePayload(input)'
]) if (!(returnsSource + workflowMutationSource).includes(required)) fail(`Procurement Workflow endpoint/payload contract changed or missing: ${required}`);
if (!process.exitCode) pass('Supplier-return, approval, catalog, and invoice endpoint/payload contracts remain unchanged.');

for (const required of [
  'supplier.name', 'product.name', 'item.supplier_name', 'item.product_name', 'invoice.invoice_number', 'invoice.notes', 'invoice.supplier_name',
  'item.detail', 'item.reason', 'invoice.payment_reference', 'invoice.cancellation_reason', 'item.message'
]) if (!(returnsSource + approvalsSource + catalogSource + invoicesSource + importSource).includes(required)) fail(`Business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Supplier/product names, notes/reasons/references, approval detail, and server validation messages remain raw business/server data.');

for (const required of [
  "'supplier_sku'", "'supplier_product_name'", "'internal_sku'", "'unit_cost'", "'lead_time_days'", "'action'",
  "action: (row.action || 'auto').toLowerCase()", "importType: 'supplier_catalog'", "anchor.download = 'supplier-catalog-import-template.csv'",
  '<option value="auto">', '<option value="match">', '<option value="create"', '<option value="deactivate">', '<option value="skip">'
]) if (!importSource.includes(required)) fail(`Supplier catalog import technical contract changed or missing: ${required}`);
if (!process.exitCode) pass('Supplier catalog CSV columns, canonical action values, import type, and technical filename remain unchanged.');

if (!labelsSource.includes("ui('Create printable barcode label')") || !attachmentsSource.includes("ui('Upload attachment')") || !notificationsSource.includes("ui('Queue notification delivery')")) {
  fail('Expected later Enterprise Inventory operational-support surfaces changed unexpectedly.');
} else pass('Procurement Workflow compatibility recognizes the promoted multilingual Labels, Attachments, and Notifications surfaces.');

if (!process.exitCode) pass('Tenant Enterprise Inventory Procurement Workflow multilingual checks passed.');
