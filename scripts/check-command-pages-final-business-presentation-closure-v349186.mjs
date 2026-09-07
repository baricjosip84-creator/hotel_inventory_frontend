import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
let passed = 0;
const check = (condition, message) => {
  if (condition) { console.log(`PASS: ${message}`); passed += 1; }
  else failures.push(message);
};

const pkg = JSON.parse(read('package.json'));
const ci = String(pkg.scripts?.['check:ci'] || '');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const review = read('src/pages/HumanInLoopAIReviewPage.tsx');
const copilot = read('src/pages/AIOperationsCopilotPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

const rows = [];
for (const line of translations.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((value) => typeof value === 'string')) rows.push(row);
  } catch {}
}
const byEnglish = new Map(rows.map((row) => [row[0], row]));
const genuine = (english) => {
  const row = byEnglish.get(english);
  return Boolean(row && row.slice(1).every((translation) => translation.trim() && translation !== row[0]));
};

check(ci.includes('npm run check:backend-system-text-remaining-enum-localization-v349187 && npm run check:command-pages-final-business-presentation-closure-v349186 && '), 'v3.49.187 now precedes v3.49.186 while the multilingual closure remains the CI leader');
check(ci.includes('npm run check:adaptive-policy-source-workflow-presentation-closure-v349185'), 'v3.49.185 remains in the frontend CI chain');

check(feed.includes("summary_key: blocked ? 'operations_feed_delivery_blocked_summary' : 'operations_feed_delivery_failed_summary'") === false, 'frontend does not invent backend delivery-summary ownership keys');
check(feed.includes('delivery_event_name?: string | null;'), 'Operations Feed response model preserves the backend event display identity for localized delivery summaries');
check(feed.includes('function deliveryDisruptionSummary('), 'Operations Feed has a dedicated localized delivery-disruption summary formatter');
check(feed.includes("rawTarget === 'the configured destination' ? ui('the configured destination') : rawTarget"), 'Operations Feed localizes only the application-owned fallback destination and preserves configured destination names verbatim');
check(feed.includes("'{event} could not be delivered to {target} after {count} delivery attempts.'"), 'blocked delivery summaries use a parameterized translation template');
check(feed.includes("'{event} was not delivered to {target} after {count} delivery attempts.'"), 'failed delivery summaries use a parameterized translation template');
for (const text of [
  '{event} could not be delivered to {target}.',
  '{event} could not be delivered to {target} after one delivery attempt.',
  '{event} could not be delivered to {target} after {count} delivery attempts.',
  '{event} was not delivered to {target}.',
  '{event} was not delivered to {target} after one delivery attempt.',
  '{event} was not delivered to {target} after {count} delivery attempts.',
  'the configured destination'
]) check(genuine(text), `Operations Feed delivery-summary system text is genuinely translated: ${text}`);

check(review.includes('preview_metrics?: Record<string, unknown>;'), 'Intelligence Review accepts structured evidence without pretending every metric is scalar');
check(review.includes('function adaptivePolicyAdjustmentImpact('), 'Intelligence Review converts Adaptive Policy adjustment objects into business-facing summaries');
check(review.includes('function expectedImpactSummary('), 'Intelligence Review converts structured expected-impact evidence into a business-facing summary');
check(review.includes("return ui('Structured evidence available');"), 'unknown structured business-impact objects degrade to a friendly summary instead of raw JSON');
check(!review.includes("typeof value === 'object' ? JSON.stringify(value)"), 'Business impact no longer stringifies structured objects into normal reviewer UI');
check(review.includes("value: reviewSystemValueLabel(review.source_scope_domain, ui)"), 'Affected area uses catalog-backed known system labels');
check(review.includes('return canonical ? ui(canonical) : raw;'), 'Intelligence Review translates only known system vocabulary and preserves unknown source text verbatim');
check(review.includes('primary_factors.map((factor) => explainabilityFactorLabel(factor, ui)).join(\' · \')'), 'Explainability factors use the known-system label boundary instead of generic English humanization');
check(!review.includes('primary_factors.map(formatLabel).join(\' · \')'), 'old generic explainability-factor formatting is removed');
for (const text of [
  'Recalibrate applied policy',
  'Recover or improve post-application outcome',
  'Current issue ratio: {current} · desired issue ratio: {desired}'
]) check(genuine(text), `Intelligence Review business-impact system text is genuinely translated: ${text}`);

check(copilot.includes('const COPILOT_SYSTEM_LABELS: Record<string, string>'), 'AI Copilot has an explicit canonical map for backend-owned proposal/pricing enums');
check(copilot.includes('return canonical ? ui(canonical) : String(value);'), 'AI Copilot translates only known bounded enums and does not blindly humanize unexpected values');
for (const enumValue of [
  'product_min_stock_update', 'cost_standard_update', 'replenishment_purchase_order_draft',
  'verified_supplier_catalog', 'previous_purchase_reference', 'needs_confirmation',
  'weighted_average_unit_cost_90d', 'current_supplier_catalog_price', 'latest_cost_bearing_movement', 'current_standard_cost'
]) check(copilot.includes(`${enumValue}:`), `AI Copilot canonical map covers ${enumValue}`);
check(copilot.includes('copilotSystemLabel(standardCostEvidence.suggested_reference_basis, ui)'), 'Suggestion basis uses the canonical multilingual enum boundary');
check(copilot.includes('copilotSystemLabel(proposal.request_type, ui)'), 'Proposal request type uses the canonical multilingual enum boundary');
check(copilot.includes('copilotSystemLabel(proposal.payload?.pricing_status, ui)'), 'Pricing evidence uses the canonical multilingual enum boundary');
for (const text of [
  'Minimum stock update proposal', 'Standard cost update proposal', 'Purchase Order draft recommendation',
  'Verified supplier catalog price', 'Previous purchase price', 'Needs price confirmation',
  '90-day weighted average cost', 'Current supplier catalog price', 'Latest cost-bearing movement'
]) check(genuine(text), `AI Copilot backend-owned enum label is genuinely translated: ${text}`);

if (failures.length) {
  console.error(`Command pages final business presentation closure v3.49.186: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Command pages final business presentation closure v3.49.186: ${passed}/${passed} PASS.`);
