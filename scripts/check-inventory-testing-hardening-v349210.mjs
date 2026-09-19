#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const review = read('src/pages/HumanInLoopAIReviewPage.tsx');
const css = read('src/pages/HumanInLoopAIReviewPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (ok, label) => {
  checks.push([Boolean(ok), label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(review.includes('function AdaptivePolicyEvidencePanel'),
  'Intelligence Review has a dedicated Adaptive Policy evidence renderer');
check(review.includes("review.source_reference?.source_type !== 'adaptive_policy_recommendation'"),
  'Detailed evidence renderer is scoped only to Adaptive Policy reviews');
check(review.includes('metrics.signal_observed') && review.includes('metrics.recommended_adjustment'),
  'Adaptive Policy review combines signal counts with recommendation evidence');
check(review.includes("ui('Products evaluated')") && review.includes("ui('Products needing replenishment')"),
  'Dynamic replenishment review exposes the actual Product denominator and affected count');
check(review.includes("'{affected} of {evaluated} evaluated products currently need replenishment after reservations and committed supply are considered.'"),
  'Dynamic replenishment summary explains the numerator and denominator in plain language');
check(review.includes('adjustment.replenishment_candidates ?? signal.replenishment_candidates'),
  'Dynamic replenishment review renders the stored affected Product candidates');
for (const field of ['current_stock','active_reservations','available_after_reservations','reliable_inbound','at_risk_inbound','approved_po_unshipped','inventory_position','target_stock','recommended_reorder_quantity','supplier_name']) {
  check(review.includes(`candidate.${field}`), `Dynamic replenishment Product evidence renders ${field}`);
}
check(review.includes('adjustment.threshold_candidates') && review.includes("ui('Thresholds suggested for review')"),
  'Threshold candidates are shown separately from the supply-position evidence');
check(review.includes('candidate.current_product_min_stock') && review.includes('candidate.effective_location_minimum_total') && review.includes('candidate.governed_min_stock'),
  'Threshold review exposes current Product, location, and governed minimum evidence');
check(review.includes("adjustmentKind === 'review_supplier_selection_and_receiving_rules'") && review.includes('supplier_review_candidates'),
  'Supplier policy reviews also expose their stored candidate evidence');
check(review.includes("adjustmentKind === 'review_reservation_allocation_rules'") && review.includes('sample_reservations'),
  'Reservation policy reviews expose affected reservation samples');
check(review.includes("adjustmentKind === 'review_task_routing_or_labor_allocation_rules'") && review.includes('sample_blocked_tasks'),
  'Execution policy reviews expose blocked task samples');
check(review.includes('<AdaptivePolicyEvidencePanel review={review} ui={ui} locale={locale} />'),
  'Detailed policy evidence is rendered before the human decision controls');
check(css.includes('.ai-review-page__adaptive-evidence') && css.includes('.ai-review-page__adaptive-table-wrap') && css.includes('overflow-x: auto'),
  'Detailed evidence has dedicated readable and horizontally safe layout styling');

for (const phrase of [
  'Evidence behind this recommendation',
  'Dynamic replenishment evidence',
  'Analysis snapshot',
  'Products needing replenishment',
  'Configured locations evaluated',
  'Configured locations with shortage',
  'Products requiring replenishment',
  'Thresholds suggested for review',
  'These are review candidates only; no minimum-stock value changes automatically.',
  'This evidence is read-only. A review decision does not change stock, thresholds, Purchase Orders, or supplier settings automatically.'
]) {
  check(translations.includes(`["${phrase}"`), `Tenant translation catalog contains: ${phrase}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349210'] === 'node scripts/check-inventory-testing-hardening-v349210.mjs',
  'v3.49.210 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349209 && npm run check:inventory-testing-hardening-v349210'),
    `v3.49.210 frontend guard follows v3.49.209 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.210 Adaptive Policy evidence frontend guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
