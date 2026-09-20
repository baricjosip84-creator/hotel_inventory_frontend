#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const adaptive = read('src/pages/AdaptivePolicyEnginePage.tsx');
const forecast = read('src/pages/ProbabilisticForecastingPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(adaptive.includes('const showTenantAdaptivePolicyReadinessChecks = false;'),
  'Adaptive Policy readiness checks are hidden from the normal tenant UI');
check(adaptive.includes('const showTenantAdaptivePolicyDiagnostics = false;'),
  'Adaptive Policy diagnostics are hidden from the normal tenant UI');
check(adaptive.includes("<OperationalWorkspaceTab active={view === 'readiness'}") && adaptive.includes("view === 'readiness' ? ("),
  'Adaptive Policy readiness implementation remains in source');
check(adaptive.includes("canViewDiagnostics ? <OperationalWorkspaceTab active={view === 'diagnostics'}") && adaptive.includes("view === 'diagnostics' && canViewDiagnostics ? ("),
  'Adaptive Policy diagnostics implementation remains in source');
check(adaptive.includes("ui('Lists show up to {limit} matching records in each evidence category. Totals use all matching evidence, not only the rows shown here.')"),
  'Adaptive Policy visible evidence note no longer references the hidden readiness surface');
check(translations.includes('["Lists show up to {limit} matching records in each evidence category. Totals use all matching evidence, not only the rows shown here."'),
  'Simplified Adaptive Policy evidence note is catalog-backed');

check(forecast.includes('const showTenantForecastDiagnostics = false;'),
  'Probabilistic Forecasting diagnostics are hidden from the normal tenant UI');
check(forecast.includes("!focusedMode && canViewDiagnostics ? <OperationalWorkspaceTab active={view === 'diagnostics'}") && forecast.includes("!focusedMode && view === 'diagnostics' && canViewDiagnostics ? ("),
  'Probabilistic Forecasting diagnostics implementation remains in source');
check(forecast.includes("active={view === 'readiness'}") && forecast.includes("view === 'readiness' ? ("),
  'Probabilistic Forecasting business-facing readiness view remains available');

check(pkg.scripts['check:inventory-testing-hardening-v349213'] === 'node scripts/check-inventory-testing-hardening-v349213.mjs',
  'v3.49.213 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349212 && npm run check:inventory-testing-hardening-v349213'),
    `v3.49.213 frontend guard follows v3.49.212 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.213 tenant diagnostics simplification guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
