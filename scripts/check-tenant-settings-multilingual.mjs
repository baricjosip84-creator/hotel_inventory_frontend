import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/TenantSettingsPage.tsx');
const css = read('src/pages/TenantSettingsPage.css');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const router = read('src/app/router.tsx');
const permissions = read('src/lib/permissions.ts');
const historical = read('scripts/check-tenant-settings-page-hardening.mjs');
const currencyHardening = read('scripts/check-tenant-currency-hardening.mjs');

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

if (!router.includes("path: 'tenant-settings'") || !router.includes('requiredPermissions={[TENANT_PERMISSIONS.TENANT_READ]}') || !router.includes('<TenantSettingsPage />')) {
  fail('Tenant Settings route permission/mount contract changed or missing.');
} else pass('Tenant Settings remains mounted at /tenant-settings behind TENANT_READ.');
for (const required of ["TENANT_READ: 'tenant.read'", "TENANT_UPDATE: 'tenant.update'"]) {
  if (!permissions.includes(required)) fail(`Tenant Settings permission identifier changed or missing: ${required}`);
}
if (!process.exitCode) pass('TENANT_READ and TENANT_UPDATE permission identifiers remain canonical.');

for (const required of ['useAppTranslation', 'formatLocalizedDate(', 'formatLocalizedDateTime(']) {
  if (!page.includes(required)) fail(`Tenant Settings locale presentation contract missing: ${required}`);
}
if (!process.exitCode) pass('Tenant Settings uses the established translation runtime and locale-aware date/timestamp formatting.');

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
for (const constant of ['INVENTORY_CURRENCY_HELP', 'LEGACY_CURRENCY_HELP']) {
  const match = page.match(new RegExp(`const ${constant} =\\n\\s*'([^']+)';`));
  if (!match) fail(`${constant} canonical help text is missing.`);
  else displayKeys.add(match[1]);
}
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Tenant Settings UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Tenant Settings has ${displayKeys.size} catalog-backed literal/help UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint|eyebrow|description)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawText = [...page.matchAll(rawTextPattern)].map((m) => m[1].trim()).filter((value) => value && value !== 'i');
const rawAttributes = [...page.matchAll(rawAttributePattern)].map((m) => m[0]);
if (rawText.length) fail(`Raw direct JSX presentation remains in TenantSettingsPage: ${rawText.join(' | ')}`);
if (rawAttributes.length) fail(`Raw literal presentation attributes remain in TenantSettingsPage: ${rawAttributes.join(' | ')}`);
if (!rawText.length && !rawAttributes.length) pass('TenantSettingsPage has zero raw direct JSX text and raw literal presentation attributes.');

for (const required of [
  "apiRequest<TenantSettingsRow[]>('/tenants')",
  "apiRequest<TenantSettingsRow>(`/tenants/${input.tenantId}`",
  "method: 'PUT'",
  'confirm_inventory_currency: confirmInventoryCurrency',
  'setActiveTenantCurrency(tenant.inventory_currency)',
  'LOCALE_OPTIONS',
  'default_locale: formState.default_locale',
]) if (!page.includes(required)) fail(`Tenant Settings endpoint/payload/runtime invariant missing: ${required}`);
if (!process.exitCode) pass('Tenant Settings GET/PUT endpoint, currency confirmation, active currency, and default-locale contracts remain intact.');

for (const required of [
  'This does not change your personal language. Use the language selector in the sidebar.',
]) if (!page.includes(required)) fail(`Tenant Settings default-language UX clarification missing: ${required}`);
if (!css.includes('.tenant-settings-field select')) fail('Tenant Settings select controls are not covered by the standard field styling contract.');
if (!process.exitCode) pass('Tenant Settings clearly separates tenant default language from personal language and styles the selector consistently.');

for (const required of [
  'canReadTenants = hasPermission(TENANT_PERMISSIONS.TENANT_READ, role)',
  'canUpdateTenants = hasPermission(TENANT_PERMISSIONS.TENANT_UPDATE, role)',
  'disabled={!canUpdateTenants || isWriteLocked || isSaving || !isDirty || !formValid}',
  "window.addEventListener('beforeunload', warnBeforeUnload)",
  "window.confirm(ui('Discard unsaved tenant settings and leave this page?'))",
  'legacyCurrencyChangeNeedsConfirmation',
  'dateRangeInvalid',
  'businessEmailInvalid',
]) if (!page.includes(required)) fail(`Tenant Settings frontend safety invariant missing: ${required}`);
if (!process.exitCode) pass('Tenant Settings permission, write-lock UX, unsaved-navigation, validation, and legacy-currency safeguards remain intact.');

for (const required of [
  'currentTenant.name', 'currentTenant.location', 'currentTenant.id',
  'formState.legal_name', 'formState.business_address', 'formState.business_email',
  'formState.business_phone', 'formState.tax_id', 'formState.default_purchase_order_payment_terms',
  'readableError(', 'option.label',
]) if (!page.includes(required)) fail(`Tenant Settings business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Tenant-entered company data, technical identifiers, language autonyms, and concrete backend errors remain raw.');

for (const required of [
  'formatOrganizationTypeLabel(currentTenant.organization_type, ui)',
  "normalized.toLowerCase() === 'facility'",
  "ui('Facility')",
  "ui('Configured')", "ui('Partial')", "ui('Not set')",
  "ui('Required')", "ui('Self-approval')",
]) if (!page.includes(required)) fail(`Tenant Settings known-value display localization invariant missing: ${required}`);
if (!process.exitCode) pass('Known settings/status values are localized only at display time while custom organization data remains canonical.');

for (const required of [
  'Current Tenant', 'UNSAVED CHANGES', 'Tenant write lock is active.',
  'Legacy currency confirmation required', 'Discard unsaved tenant settings and leave this page?',
]) if (!historical.includes(required)) fail(`Historical Tenant Settings hardening safeguard missing: ${required}`);
if (!currencyHardening.includes('confirm_inventory_currency') || !currencyHardening.includes('DEFAULT_INVENTORY_CURRENCY')) {
  fail('Historical tenant currency hardening safeguards for Tenant Settings are missing.');
}
if (!process.exitCode) pass('Historical Tenant Settings and tenant-currency hardening safeguards remain present.');

if (process.exitCode) process.exit(process.exitCode);
pass('Tenant Settings multilingual page-completion check passed.');
