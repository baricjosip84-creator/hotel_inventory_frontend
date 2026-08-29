import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/AdminSystemPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const router = read('src/app/router.tsx');
const permissions = read('src/lib/permissions.ts');
const historical = read('scripts/check-admin-system-page-hardening.mjs');

const rows = [];
for (const line of catalog.split(/\r?\n/)) {
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
  const expected = [...row[0].matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
  for (const translated of row.slice(1)) {
    const actual = [...translated.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
    if (actual !== expected) fail(`Placeholder mismatch for tenant UI key: ${row[0]}`);
  }
}
if (!process.exitCode) pass('Tenant UI placeholder parity is intact across all five languages.');

if (!router.includes("path: 'admin-system'") || !router.includes('requiredPermissions={[TENANT_PERMISSIONS.SYSTEM_STATUS_READ]}') || !router.includes('<AdminSystemPage />')) {
  fail('Admin System route permission/mount contract changed or missing.');
} else pass('Admin System remains mounted at /admin-system behind SYSTEM_STATUS_READ.');

for (const permission of [
  "SYSTEM_STATUS_READ: 'system_status.read'",
  "TENANT_DIAGNOSTICS_READ: 'tenant_diagnostics.read'",
  "ALERTS_WRITE: 'alerts.write'",
  "ALERTS_OVERRIDE: 'alerts.override'"
]) {
  if (!permissions.includes(permission)) fail(`Admin System permission identifier changed or missing: ${permission}`);
}
if (!process.exitCode) pass('Admin System permission identifiers remain canonical.');

for (const required of ['useAppTranslation', 'formatLocalizedDateTime(', 'formatLocalizedNumber(']) {
  if (!page.includes(required)) fail(`Admin System locale presentation contract missing: ${required}`);
}
if (!process.exitCode) pass('Admin System uses the established translation runtime and locale-aware date/number formatting.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const displayKeys = new Set();
for (const match of page.matchAll(literalPattern)) {
  try { displayKeys.add(decodeLiteral(match[1])); } catch {}
}
for (const blockName of ['ALERT_TYPE_LABELS', 'ALERT_SEVERITY_LABELS']) {
  const block = page.match(new RegExp(`const ${blockName}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`));
  if (!block) fail(`${blockName} display mapping is missing.`);
  else for (const match of block[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
}
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Admin System UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Admin System has ${displayKeys.size} catalog-backed literal/dynamic UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint|description|eyebrow)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawText = [...page.matchAll(rawTextPattern)].map((m) => m[1].trim()).filter(Boolean);
const rawAttributes = [...page.matchAll(rawAttributePattern)].map((m) => m[0]);
if (rawText.length) fail(`Raw direct JSX presentation remains in AdminSystemPage: ${rawText.join(' | ')}`);
if (rawAttributes.length) fail(`Raw literal presentation attributes remain in AdminSystemPage: ${rawAttributes.join(' | ')}`);
if (!rawText.length && !rawAttributes.length) pass('AdminSystemPage has zero raw direct JSX text and targeted literal presentation attributes.');

for (const endpoint of [
  "'/system-status'",
  "'/admin/diagnostics/blocking-alerts?limit=100'",
  "'/admin/diagnostics/stock-integrity?limit=100'",
  "'/admin/diagnostics/broken-shipments?limit=100'",
  '`/admin/alerts/${id}/acknowledge`',
  '`/admin/alerts/${input.id}/resolve`',
  '`/admin/alerts/${input.id}/override`'
]) {
  if (!page.includes(endpoint)) fail(`Admin System endpoint contract changed or missing: ${endpoint}`);
}
for (const contract of [
  "body: JSON.stringify({ resolution_note: input.resolutionNote })",
  "body: JSON.stringify({ reason: input.reason })",
  'canViewTenantDiagnostics',
  'canManageAlerts',
  'canOverrideAlerts',
  'alertActionsBlockedByWriteLock',
  'resolutionNote.trim().length < 3',
  'overrideReason.trim().length < 3'
]) {
  if (!page.includes(contract)) fail(`Admin System operational contract changed or missing: ${contract}`);
}
if (!process.exitCode) pass('Admin System endpoints, alert payloads, permissions, validation, and write-lock presentation contracts remain unchanged.');

for (const rawField of [
  '{row.message}',
  '{row.product_name}',
  'row.storage_location_name',
  'row.supplier_name',
  'result.message ||',
  'systemStatusQuery.data.tenant_id'
]) {
  if (!page.includes(rawField)) fail(`Admin System business/server-data raw boundary changed or missing: ${rawField}`);
}
if (!page.includes("return label ? ui(label) : value;")) fail('Unknown alert type/severity values must remain raw rather than being catalog-populated dynamically.');
else pass('Admin System preserves tenant/business/server data and unknown backend values as raw data.');

for (const safetyAnchor of [
  'At least 3 characters are required before Resolve is enabled.',
  'Alert actions are disabled while the effective write status is locked.',
  'Override and close',
  'Each diagnostic list loads up to 100 current rows',
  'Documented receiving shortages are allowed by the current finalization workflow.'
]) {
  if (!historical.includes(safetyAnchor)) fail(`Historical Admin System hardening safeguard removed: ${safetyAnchor}`);
}
if (!process.exitCode) pass('Historical Admin System hardening safeguards remain present.');

if (!process.exitCode) console.log('Tenant Admin System multilingual check passed.');
