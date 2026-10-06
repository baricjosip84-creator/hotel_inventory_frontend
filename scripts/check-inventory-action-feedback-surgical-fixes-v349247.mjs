import fs from 'node:fs';

const api = fs.readFileSync('src/lib/api.ts', 'utf8');
const providers = fs.readFileSync('src/app/AppProviders.tsx', 'utf8');
const outbound = fs.readFileSync('src/pages/OutboundPage.tsx', 'utf8');
const capabilities = fs.readFileSync('src/pages/InventoryCapabilitiesPage.tsx', 'utf8');
const capabilityCss = fs.readFileSync('src/pages/InventoryCapabilitiesPage.css', 'utf8');
const translations = fs.readFileSync('src/i18n/tenantUiTranslations.ts', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });

check(api.includes("return 'Stock adjustment applied successfully.';"), 'stock adjustment uses action-specific toast');
check(api.includes("return 'Policy analysis refreshed successfully.';"), 'adaptive policy refresh uses action-specific toast');
check(api.includes("return 'Forecast analysis refreshed successfully.';"), 'forecast refresh uses action-specific toast');
check(api.includes("return 'Requisition fulfilled successfully.';"), 'requisition fulfillment uses action-specific toast');
check(api.includes("return 'Recommendation approved successfully.';"), 'recommendation approval uses action-specific toast');
check(api.includes("return 'API key secret rotated successfully.';"), 'API key rotation uses action-specific toast');
check(api.includes("return 'Webhook signing secret rotated successfully.';"), 'webhook rotation uses action-specific toast');

check((outbound.match(/skipMutationFeedback:\s*true/g) || []).length >= 3, 'read-only outbound preview calls suppress mutation success toasts');
check(outbound.includes('/documents/preview') && outbound.includes('/email-preview'), 'outbound preview endpoints remain present');

check(providers.includes('recentFeedbackRef'), 'global toast dedupe state exists');
check(providers.includes('now - previousAt < 1200'), 'near-simultaneous duplicate feedback is collapsed');

check(capabilities.includes('Select at least one API permission.'), 'API key zero-scope guidance is visible');
check(capabilities.includes("apiScopes.length === 0"), 'API key scope guidance follows empty scope state');
check(capabilityCss.includes('flex-wrap: wrap !important;'), 'advanced inventory capability tabs wrap on desktop');
check(capabilityCss.includes('@media (max-width: 720px)') && capabilityCss.includes('overflow-x: auto;'), 'narrow-screen capability tabs retain horizontal fallback');

for (const message of [
  'Policy analysis refreshed successfully.',
  'Forecast analysis refreshed successfully.',
  'Requisition fulfilled successfully.',
  'Recommendation approved successfully.',
  'API key secret rotated successfully.',
  'Webhook signing secret rotated successfully.'
]) {
  check(translations.includes(`[\"${message}\"`), `${message} is registered for tenant translation`);
}

check(pkg.scripts?.['check:inventory-action-feedback-surgical-fixes-v349247'] === 'node scripts/check-inventory-action-feedback-surgical-fixes-v349247.mjs', 'v3.49.247 surgical feedback guard is registered');

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nv3.49.247 action-feedback surgical guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nv3.49.247 action-feedback surgical guard: ${checks.length}/${checks.length} PASS`);
