import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const routerSource = read('src/app/router.tsx');
const tabsConfigSource = read('src/components/enterpriseInventory/EnterpriseInventoryTabConfig.ts');
const tabsSource = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');
const panelsSource = read('src/components/enterpriseInventory/EnterpriseInventoryPagePanels.tsx');
const catalogSupportSource = read('src/components/enterpriseInventory/EnterpriseInventoryCatalogSupportPanels.tsx');
const compliancePanelsSource = read('src/components/enterpriseInventory/EnterpriseInventoryCompliancePanels.tsx');
const labelsSource = read('src/components/enterpriseInventory/tabs/LabelsTab.tsx');
const attachmentsSource = read('src/components/enterpriseInventory/tabs/AttachmentsTab.tsx');
const notificationsSource = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');
const barcodeSource = read('src/lib/barcodeLabelSvg.ts');
const mutationSource = read('src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts');
const querySource = read('src/components/enterpriseInventory/EnterpriseInventoryQueries.ts');
const permissionsSource = read('src/lib/permissions.ts');
const queryStatusSource = read('src/components/enterpriseInventory/EnterpriseInventoryQueryStatus.ts');
const pageActionsSource = read('src/components/enterpriseInventory/EnterpriseInventoryPageActions.ts');
const cleanupSource = read('scripts/check-enterprise-inventory-cleanup.mjs');

const tabFiles = [
  'src/components/enterpriseInventory/tabs/ParLevelsTab.tsx',
  'src/components/enterpriseInventory/tabs/CycleCountsTab.tsx',
  'src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx',
  'src/components/enterpriseInventory/tabs/ApprovalsTab.tsx',
  'src/components/enterpriseInventory/tabs/SupplierCatalogsTab.tsx',
  'src/components/enterpriseInventory/tabs/InvoicesTab.tsx',
  'src/components/enterpriseInventory/tabs/LabelsTab.tsx',
  'src/components/enterpriseInventory/tabs/AttachmentsTab.tsx',
  'src/components/enterpriseInventory/tabs/NotificationsTab.tsx',
];
const tabSources = tabFiles.map((file) => [file, read(file)]);

const sharedFiles = [
  'src/components/enterpriseInventory/EnterpriseInventoryPageLayout.tsx',
  'src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx',
  'src/components/enterpriseInventory/EnterpriseInventoryShared.tsx',
  'src/components/enterpriseInventory/EnterpriseInventoryStockMutations.ts',
  'src/components/enterpriseInventory/EnterpriseInventoryWorkflowMutations.ts',
  'src/components/enterpriseInventory/EnterpriseInventorySubmitHandlers.ts',
  'src/components/enterpriseInventory/EnterpriseInventoryQueryStatus.ts',
];
const sharedSources = sharedFiles.map(read);

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

const retainedTabs = [
  ['par-levels', 'Par levels'],
  ['cycle-counts', 'Cycle counts'],
  ['supplier-returns', 'Supplier returns'],
  ['approvals', 'Approvals'],
  ['supplier-catalog', 'Supplier catalogs'],
  ['invoices', 'Invoices'],
  ['labels', 'Barcode labels'],
  ['attachments', 'Attachments'],
  ['notifications', 'Notifications'],
];
for (const [key, label] of retainedTabs) {
  if (!tabsConfigSource.includes(`['${key}', '${label}'`)) fail(`Retained Enterprise Inventory tab changed or missing: ${key}`);
  if (!unique.has(label)) fail(`Retained Enterprise Inventory tab label is not catalog-backed: ${label}`);
}
const configuredTabs = [...tabsConfigSource.matchAll(/^\s*\['([^']+)',\s*'([^']+)'/gm)].map((match) => match[1]);
if (configuredTabs.length !== retainedTabs.length || configuredTabs.some((key, index) => key !== retainedTabs[index][0])) {
  fail(`Enterprise Inventory live-tab set is not the expected nine-tab surface: ${configuredTabs.join(', ')}`);
} else pass('Enterprise Inventory live route remains exactly the nine retained operational tabs.');

if (!routerSource.includes("path: 'enterprise-inventory'") || !routerSource.includes('<EnterpriseInventoryPage />')) fail('Enterprise Inventory route contract changed or missing.');
else pass('Enterprise Inventory route remains mounted at /enterprise-inventory.');

for (const required of [
  'EnterpriseInventoryStockOperationsPanels',
  'EnterpriseInventoryProcurementWorkflowPanels',
  'EnterpriseInventoryCatalogSupportPanels',
  'EnterpriseInventoryCompliancePanels',
]) if (!panelsSource.includes(required)) fail(`Enterprise Inventory retained panel family missing: ${required}`);
if (!process.exitCode) pass('All four retained Enterprise Inventory panel families remain mounted.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literalSet = new Set();
for (const source of [...tabSources.map(([, source]) => source), ...sharedSources]) {
  for (const match of source.matchAll(literalPattern)) {
    try { literalSet.add(decodeLiteral(match[1])); } catch {}
  }
}
for (const [, label] of retainedTabs) literalSet.add(label);
for (const match of notificationsSource.matchAll(/^\s*[a-z0-9_]+:\s*'([^']+)',?$/gm)) literalSet.add(match[1]);
for (const match of attachmentsSource.matchAll(/^\s*\['[^']+',\s*'([^']+)'\],?$/gm)) literalSet.add(match[1]);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Enterprise Inventory page-completion UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Enterprise Inventory full live route has ${literalSet.size} catalog-backed literal/dynamic UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
for (const [file, source] of tabSources) {
  const rawText = [...source.matchAll(rawTextPattern)].map((match) => match[1].trim()).filter(Boolean);
  const rawAttributes = [...source.matchAll(rawAttributePattern)].map((match) => match[0]);
  if (rawText.length) fail(`Raw direct JSX presentation remains in ${file}: ${rawText.join(' | ')}`);
  if (rawAttributes.length) fail(`Raw literal presentation attributes remain in ${file}: ${rawAttributes.join(' | ')}`);
}
if (!process.exitCode) pass('All nine live Enterprise Inventory tabs have zero raw direct JSX text and raw literal presentation attributes.');

for (const [name, source] of [['Labels', labelsSource], ['Attachments', attachmentsSource], ['Notifications', notificationsSource]]) {
  if (!source.includes('useAppTranslation')) fail(`${name} does not use the tenant translation runtime.`);
}
for (const required of [
  'formatLocalizedDate(',
  'formatLocalizedDateTime(',
  'formatLocalizedNumber(',
  "ui('Inventory barcode labels')",
  "ui('Printable inventory barcode label')",
  "ui('Code 128 barcode')",
  "ui('EAN-13 barcode')",
  "ui('QR barcode')",
]) if (!labelsSource.includes(required)) fail(`Labels locale/print presentation contract missing: ${required}`);
for (const required of ['formatLocalizedDateTime(', 'formatLocalizedNumber(']) if (!attachmentsSource.includes(required)) fail(`Attachments locale formatting missing: ${required}`);
for (const required of ['formatLocalizedDateTime(', 'formatLocalizedNumber(', 'displayToken(', 'tenantFacingNotificationDescription(']) if (!notificationsSource.includes(required)) fail(`Notifications locale/display mapping missing: ${required}`);
if (!process.exitCode) pass('Labels, Attachments, and Notifications use locale-aware human presentation and known-code display mapping.');

for (const required of [
  'createBarcodeLabelSvgMarkup(label, presentation)',
  'createBarcodeLabelSvgMarkup(printable, barcodePresentation)',
  'ariaLabel: ui(\'Printable inventory barcode label\')',
  'inventoryProduct: ui(\'Inventory product\')',
  'lotLabel: ui(\'Lot\')',
  'batchLabel: ui(\'Batch\')',
  'expiryLabel: ui(\'Expiry\')',
]) if (!labelsSource.includes(required)) fail(`Localized printable barcode-label presentation path missing: ${required}`);
for (const required of [
  "presentation.lotLabel || 'Lot'",
  "presentation.batchLabel || 'Batch'",
  "presentation.expiryLabel || 'Expiry'",
  "presentation.ariaLabel || 'Printable inventory barcode label'",
  "presentation.inventoryProduct || 'Inventory product'",
]) if (!barcodeSource.includes(required)) fail(`Barcode SVG presentation contract changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Printable barcode SVGs receive localized label metadata and accessibility presentation while retaining safe fallback defaults.');

for (const required of [
  "BARCODE_LABELS_READ: 'barcode_labels.read'",
  "BARCODE_LABELS_WRITE: 'barcode_labels.write'",
  "ATTACHMENTS_READ: 'attachments.read'",
  "ATTACHMENTS_WRITE: 'attachments.write'",
  "NOTIFICATIONS_READ: 'notifications.read'",
  "NOTIFICATIONS_WRITE: 'notifications.write'",
]) if (!permissionsSource.includes(required)) fail(`Enterprise Inventory final-scope permission identifier changed or missing: ${required}`);
if (!process.exitCode) pass('Barcode-label, attachment, and notification permission identifiers remain unchanged.');

for (const required of [
  '"/enterprise-inventory/barcode-labels"',
  '"/enterprise-inventory/barcode-labels/print-events"',
  '`/enterprise-inventory/barcode-labels/${encodeURIComponent(labelId)}`',
  '"/enterprise-inventory/notifications/deliveries"',
  '"/enterprise-inventory/notifications/deliveries/process"',
  '`/enterprise-inventory/attachments/upload?${params.toString()}`',
  '`/enterprise-inventory/attachments/${attachmentId}`',
  'buildBarcodeLabelPayload(input)',
  'buildNotificationDeliveryPayload(input)',
]) if (!mutationSource.includes(required)) fail(`Enterprise Inventory final-scope endpoint/payload contract changed or missing: ${required}`);
if (!process.exitCode) pass('Barcode-label, attachment, and notification endpoint/payload contracts remain unchanged.');

for (const required of [
  "enabled: canReadNotifications && tabIs('notifications')",
  "enabled: canReadBarcodeLabels && tabIs('labels')",
  "enabled: canReadAttachments && tabIs('attachments') && Boolean(attachmentEntityType && attachmentEntityId)",
]) if (!querySource.includes(required)) fail(`Enterprise Inventory final-scope query permission/tab scoping changed: ${required}`);
if (!process.exitCode) pass('Labels, Attachments, and Notifications queries remain permission- and active-tab-scoped.');

for (const required of [
  'selectedProduct.name', 'label.product_name || label.product_id', 'label.lot_number', 'label.batch_number',
  'selectedFile.name', 'item.original_filename', 'item.mime_type', 'item.content_sha256',
  'item.last_error', 'item.title || displayToken(item.event_type, ui)',
]) if (!(labelsSource + attachmentsSource + notificationsSource).includes(required)) fail(`Business/server raw-data boundary changed or missing: ${required}`);
if (!notificationsSource.includes('// Backend-generated notification titles remain raw by multilingual-project policy.')) fail('Backend-generated notification-title raw boundary is no longer explicit.');
else pass('Product/traceability/file/server error/backend notification data remain raw while frontend-owned presentation is localized.');

for (const required of [
  'ui("QR code label created successfully.")',
  'ui("EAN-13 label created successfully.")',
  'ui("Code 128 label created successfully.")',
  'ui("Failed to create barcode label.")',
  'ui("Barcode label retired successfully.")',
  'ui("Notification delivery queued.")',
  'ui("Failed to queue notification delivery.")',
  'ui("File uploaded and attached successfully.")',
  'ui("Failed to upload attachment.")',
  'ui("Attachment deleted successfully.")',
  'ui("Failed to delete attachment.")',
]) if (!mutationSource.includes(required)) fail(`Enterprise Inventory final-scope mutation feedback is not localized: ${required}`);
if (!process.exitCode) pass('Final-scope frontend mutation feedback is catalog-backed while concrete API errors remain preserved.');

if (compliancePanelsSource.includes('processNotificationDeliveriesMutation') || notificationsSource.includes('Process due deliveries now') || notificationsSource.includes('onProcessNotificationDeliveries')) {
  fail('Background notification-delivery processor is exposed as a normal tenant action.');
} else pass('Background notification-delivery processing remains hidden from the tenant UI.');

for (const required of [
  "ui('Could not load {section}: {error}')",
  "normalizeError(queries[failedQueryName]?.error, ui('Request failed'))",
]) if (!queryStatusSource.includes(required)) fail(`Enterprise Inventory query-failure wrapper localization missing: ${required}`);
if (!pageActionsSource.includes('const { locale, ui } = useAppTranslation();') || !pageActionsSource.includes('    ui,')) fail('Enterprise Inventory page actions do not pass locale/translator into shared actions.');
if (!process.exitCode) pass('Shared Enterprise Inventory query/action presentation remains multilingual.');

if (!tabsSource.includes('const visibleTabs = enterpriseInventoryTabs.filter') || !tabsSource.includes('label={ui(label)}')) fail('Enterprise Inventory tab navigation does not filter by permission and localize live labels.');
if (!cleanupSource.includes("'par-levels', 'cycle-counts', 'supplier-returns', 'approvals', 'supplier-catalog',") || !cleanupSource.includes("'invoices', 'labels', 'attachments', 'notifications'")) fail('Enterprise Inventory cleanup checker no longer protects the nine-tab live surface.');
if (!process.exitCode) pass('Enterprise Inventory navigation and cleanup guards remain aligned to the nine-tab live route.');

if (!catalogSupportSource.includes('LabelsTab') || !catalogSupportSource.includes('AttachmentsTab') || !compliancePanelsSource.includes('NotificationsTab')) fail('Final live Enterprise Inventory panels are no longer mounted.');
else pass('Labels, Attachments, and Notifications remain reachable through the retained Enterprise Inventory panel families.');

if (!process.exitCode) pass('Tenant Enterprise Inventory full-page multilingual completion checks passed.');
