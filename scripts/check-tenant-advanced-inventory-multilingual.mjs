import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const backendCandidates = [
  process.env.BACKEND_ROOT,
  path.resolve(root, '../hotel-inventory-backend'),
  path.resolve(root, '../backend'),
].filter(Boolean);
const backendRoot = backendCandidates.find((candidate) => fs.existsSync(candidate));
if (!backendRoot) {
  console.error(`FAIL: Backend source folder not found. Checked: ${backendCandidates.join(', ')}`);
  process.exit(1);
}
const readBackend = (file) => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/InventoryCapabilitiesPage.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a catalog row.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(', ')}`);
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
for (const match of pageSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* ignore future complex literals */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Advanced Inventory has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Advanced Inventory has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicCatalogKeys = [
  'APIs & integrations', 'Active API keys', 'Serial tracking', 'Active serial identities',
  'Units of measure', 'Saved conversions', 'Custom fields', 'Active field definitions',
  'Landed cost', 'Finalized cost records', 'Variants', 'Variant products', 'Location hierarchy',
  'Nested locations', 'BOM & assemblies', 'Active BOMs', 'Offline task mode', 'Offline sync batches',
  'Read products', 'Manage products', 'Read stock', 'Read suppliers', 'Manage suppliers',
  'Read purchase orders', 'Create purchase orders', 'Update purchase order drafts', 'Create shipments', 'Submit integration events',
  'products', 'suppliers', 'storage locations', 'shipments', 'purchase orders',
  'Active', 'Available', 'Reserved', 'Issued', 'Damaged', 'Quarantine', 'Retired',
  'Configured', 'Disabled', 'Pending', 'Queued', 'Blocked', 'Delivered', 'Failed', 'Received',
  'Custom', 'ERP', 'Accounting', 'E-commerce', 'WMS', 'Both directions', 'Into inventory app',
  'Out of inventory app', 'Yes/No', 'Select list', 'Number', 'Date', 'Text', 'By item value',
  'By quantity', 'Equal per line', 'Warehouse', 'Zone', 'Aisle', 'Rack', 'Shelf', 'Bin', 'Storage'
];
const missingDynamic = dynamicCatalogKeys.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Advanced Inventory dynamic labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicCatalogKeys.length} dynamic Advanced Inventory labels are catalog-backed.`);

const representativeRows = [
  'Advanced inventory workspace', 'Public API', 'Automatic outbound notifications', 'Connection registry',
  'Serial-number tracking', 'Register serial for existing stock', 'Units of measure', 'Custom fields',
  'Landed-cost allocation', 'Product variants', 'Location hierarchy', 'BOM, kits, assembly and disassembly',
  'Offline mobile task execution', 'This is a stock-changing action. The app validates permissions, available stock, reservations, lot integrity, and serial-tracking rules before posting movements.',
  'Operators can start, complete, block, or unblock execution tasks while disconnected. When connectivity returns, queued actions are replayed through the normal task permissions and audit trail. Stock-changing work such as receiving, transfers, counts, and dispatch still requires connectivity so the app does not create conflicting offline inventory ledgers.'
];
for (const key of representativeRows) if (!uniqueKeys.has(key)) fail(`Missing representative Advanced Inventory translation row: ${key}`);
if (!process.exitCode) pass(`${representativeRows.length} representative Advanced Inventory rows are present in all five locales.`);

if (!pageSource.includes('useAppTranslation')) fail('Advanced Inventory must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(') || !pageSource.includes('formatLocalizedNumber(') || !pageSource.includes('formatLocalizedCurrency(')) {
  fail('Advanced Inventory must use locale-aware date/time, number and currency formatting.');
}
if (!pageSource.includes('displayCanonicalLabel(')) fail('Advanced Inventory canonical enum/status values must be translated only at display time.');

const forbiddenMixedLanguage = [
  'Number(lot.quantity).toLocaleString()',
  '> {row.status}<',
  ' — {s.status}',
  'total.toFixed(2)',
  '<td>{a.received_quantity}</td>',
  '<td>{a.base_unit_cost}</td>',
  '`Save ${config.label.toLowerCase()} custom fields`',
  'placeholder={ui("CASE")}',
  'placeholder={ui("country_of_origin")}',
  'placeholder={ui("WH1-A03-R02-B04")}',
];
for (const pattern of forbiddenMixedLanguage) if (pageSource.includes(pattern)) fail(`Advanced Inventory still contains mixed-language or translated technical presentation: ${pattern}`);

const canonicalContracts = [
  "{ value: 'products:read', label: 'Read products', requiredPermissions: [TENANT_PERMISSIONS.PRODUCTS_READ] }",
  "{ value: 'products:write', label: 'Manage products', requiredPermissions: [TENANT_PERMISSIONS.PRODUCTS_WRITE] }",
  "{ value: 'stock:read', label: 'Read stock', requiredPermissions: [TENANT_PERMISSIONS.STOCK_READ] }",
  "const [apiScopes, setApiScopes] = useState<string[]>([])",
  "const grantableApiScopes = API_SCOPE_OPTIONS.filter((scope) => scope.requiredPermissions.every((permission) => hasPermission(permission)))",
  "reason: 'Revoked from tenant Integrations page'",
  "apiRequest<WebhookEventCatalog>('/inventory-capabilities/webhook-events')",
  'placeholder="CASE"',
  'placeholder="country_of_origin"',
  'placeholder="WH1-A03-R02-B04"',
  "status: 'available'",
  "status: row.status === 'configured' ? 'disabled' : 'configured'",
  "direction === 'assemble'",
  "<option value=\"assemble\">",
  "<option value=\"disassemble\">",
  "apiRequest('/inventory-capabilities/boms'",
  "apiRequest('/inventory-capabilities/landed-costs/finalize'"
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Advanced Inventory canonical business/API contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Advanced Inventory canonical scopes, event names, statuses, directions and API routes remain language-independent.');

if (!process.exitCode) console.log('Tenant Advanced Inventory multilingual hardening: PASS');


const inventoryCapabilitiesBackend = readBackend('src/services/inventory/inventoryCapabilitiesService.js');
if (!inventoryCapabilitiesBackend.includes('has_more: hasMore')
    || !inventoryCapabilitiesBackend.includes('OR p.sku ILIKE')) {
  fail('Serial Registry paged backend contract must expose has_more and make the advertised SKU search real.');
} else {
  pass('Serial Registry paged backend contract exposes has_more and searches serial, Product name, and SKU.');
}
