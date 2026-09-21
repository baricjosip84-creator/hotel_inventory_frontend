#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const cross = read('src/pages/CrossDomainOptimizationPage.tsx');
const parTab = read('src/components/enterpriseInventory/tabs/ParLevelsTab.tsx');
const forms = read('src/components/enterpriseInventory/EnterpriseInventoryForms.ts');
const shared = read('src/components/enterpriseInventory/EnterpriseInventoryShared.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

// Cross-Domain source discovery must mirror the real transfer-before-buy replenishment workflow.
const replenishmentBuilderCalls = cross.match(/path: '\/optimization-plans\/replenishment'/g) || [];
check(replenishmentBuilderCalls.length === 1, 'Cross-Domain generates one replenishment source strategy, not competing synthetic strategies');
check(cross.includes("replenishment_strategy: 'transfer_first'"), 'Cross-Domain replenishment source discovery follows transfer-before-buy');
check(!cross.includes("replenishment_strategy: 'procurement_first'") && !cross.includes("replenishment_strategy: 'balanced'"), 'Cross-Domain no longer manufactures purchase-vs-transfer alternatives from strategy variants');
check(cross.includes("strategy === 'transfer_first'"), 'historical non-transfer-first replenishment recommendations are filtered from the manager decision list');
check(cross.includes('CROSS_DOMAIN_MIN_LABOR_REVIEW_HOURS_PER_DAY = 1'), 'labor staffing review has a material one-hour-per-day threshold');
check(cross.includes('dailyDemandHours >= CROSS_DOMAIN_MIN_LABOR_REVIEW_HOURS_PER_DAY'), 'tiny labor forecasts are not promoted to management decisions');

// Par-level save behavior must warn after Save when location minima leave part of the product minimum unassigned.
check(parTab.includes('minimumStockWarningForChange') && parTab.includes('locationMinimums += proposedMinimum') && parTab.includes('if (locationMinimums >= productMinimum) return null;'), 'Par-level minimum warning is calculated from combined active location minimums against the product minimum');
check(parTab.includes("ui('Location minimums are below the product minimum')"), 'Par-level save warning explains the inconsistency');
check(parTab.includes("ui('The remaining {remainder} units are not assigned to a specific location.')"), 'Par-level warning states the unassigned remainder');
check(parTab.includes("ui('Go back')") && parTab.includes("ui('Save anyway')"), 'Par-level warning allows Go back or Save anyway rather than blocking');
check(parTab.includes('acknowledgedWarningSignature') && parTab.includes('requestSubmit()'), 'Save anyway re-submits the same reviewed change without bypassing normal save handling');

// Reorder quantity must be explicit: zero means dynamic target calculation, positive means a fixed override.
check(forms.includes("reorder_quantity: '0'"), 'new par levels default fixed reorder quantity to zero');
check(parTab.includes("ui('Fixed reorder quantity (optional)')"), 'reorder field is clearly labeled as optional and fixed');
check(parTab.includes("ui('0 = automatically calculate the quantity needed to reach the target.')"), 'reorder field explains zero as automatic target calculation');
check(parTab.includes("ui('Automatic to target')"), 'configured par-level list renders zero reorder quantity as automatic-to-target');
check(shared.includes('helper?: string') && shared.includes('styles.fieldHelper'), 'shared input supports concise field helper text');

for (const text of [
  'Fixed reorder quantity (optional)',
  '0 = automatically calculate the quantity needed to reach the target.',
  'Automatic to target',
  'Location minimums are below the product minimum',
  'The remaining {remainder} units are not assigned to a specific location.',
  'This is allowed. Do you want to continue?',
  'Go back',
  'Save anyway'
]) {
  check(translations.includes(`["${text}"`), `v3.49.236 UI text is catalog-backed: ${text}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349236'] === 'node scripts/check-inventory-testing-hardening-v349236.mjs', 'v3.49.236 guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  check(chain.includes('check:inventory-testing-hardening-v349232 && npm run check:inventory-testing-hardening-v349236'), `v3.49.236 follows v3.49.232 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.236 Cross-Domain/par-level closure guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
