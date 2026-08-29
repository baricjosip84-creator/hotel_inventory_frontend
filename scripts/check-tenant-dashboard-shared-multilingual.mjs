import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translations = read('src/i18n/tenantUiTranslations.ts');
const dashboard = read('src/pages/DashboardPage.tsx');
const protectedRoute = read('src/components/ProtectedRoute.tsx');
const copyright = read('src/components/CopyrightNotice.tsx');
const errorFallback = read('src/components/ApplicationErrorFallback.tsx');
const inventoryShared = read('src/components/enterpriseInventory/EnterpriseInventoryShared.tsx');
const inventoryLayout = read('src/components/enterpriseInventory/EnterpriseInventoryPageLayout.tsx');
const inventoryTabs = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');

const representative = [
  'Operations workspace', 'Live operational summary', 'Getting started', 'Open Stock',
  'Operational Health', 'Depletion Risk', 'Reorder Recommendations', 'Low Stock',
  'Overdue Shipments', 'Unresolved Alerts', 'Inventory Anomalies', 'Recent Activity',
  'Supplier Performance', 'Checking session…', 'Application error', 'All rights reserved.',
  'Specialized inventory workflows', 'Inventory control work areas', 'Write enabled', 'Read only'
];
for (const phrase of representative) {
  if (!translations.includes(JSON.stringify(phrase))) fail(`Missing dashboard/shared translation row: ${phrase}`);
}
if (!process.exitCode) pass(`${representative.length} representative dashboard/shared translation rows are present.`);

if (!dashboard.includes('useAppTranslation')) fail('Dashboard must use the shared translation context.');
if (!dashboard.includes("eyebrow={ui('Operations overview')}")) fail('Dashboard hero must be localized.');
if (!dashboard.includes("{ui(step.label)}")) fail('Backend setup-checklist labels must pass through the tenant UI translator.');
if (!dashboard.includes('enumDisplayLabel(row.status, ui)')) fail('Dashboard canonical status values must be translated only at display time.');
if (!dashboard.includes('formatLocalizedDateTime(value, locale)')) fail('Dashboard date/time formatting must use the selected locale.');
if (!dashboard.includes('formatLocalizedNumber')) fail('Dashboard numbers must use locale-aware formatting.');
if (dashboard.includes('>Loading dashboard...</')) fail('Dashboard loading state must not regress to hard-coded English.');
if (dashboard.includes('label="Open Shipment"')) fail('Dashboard actions must not regress to hard-coded English.');
else pass('Dashboard content, canonical status labels, actions, dates and numbers are localization-aware.');

if (!protectedRoute.includes("ui('Checking session…')")) fail('Tenant protected-route loading state must be localized.');
if (!copyright.includes("ui('All rights reserved.')")) fail('Shared copyright footer must be localized.');
if (!errorFallback.includes("translateTenantUi(locale, englishText)")) fail('Root application error fallback must localize without depending on the provider it can replace.');
else pass('Shared tenant route/error/footer states are localization-aware.');

if (!inventoryShared.includes("ui('Select…')")) fail('Shared inventory select placeholder must be localized.');
if (!inventoryShared.includes("ui('Specialized inventory workflows')")) fail('Shared specialized-inventory hero must be localized.');
if (!inventoryShared.includes('formatLocalizedDateTime(lastRefreshedAt, locale)')) fail('Shared specialized-inventory refresh time must use selected locale.');
if (!inventoryLayout.includes("label={ui('Available controls')}")) fail('Specialized-inventory workspace summary must be localized.');
if (!inventoryTabs.includes('label={ui(label)}')) fail('Specialized-inventory tab labels must be localized at display time.');
else pass('Reusable specialized-inventory workspace primitives are localization-aware.');

if (!process.exitCode) console.log('Tenant dashboard/shared multilingual hardening: PASS');
