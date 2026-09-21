#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const providers = read('src/app/AppProviders.tsx');
const css = read('src/pages/CrossDomainOptimizationPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (ok, label) => { checks.push([!!ok, label]); console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`); };

check(page.includes('const SHOW_V349218_TEXT_DRIVEN_CREATE_UI = false;') && page.includes('SHOW_V349218_TEXT_DRIVEN_CREATE_UI && showCreate && canGovern'), 'v3.49.218 text-driven wizard is preserved in source but no longer rendered');
check(page.includes("apiRequest<ReplenishmentRunListItem[]>('/replenishment-planning?limit=100')") && page.includes("`/replenishment-planning/${encodeURIComponent(sourceRunId)}`"), 'normal creation reads real Replenishment Planning runs and exact selected-run evidence');
check(page.includes("user_text_used_for_analysis: false") && page.includes("comparison_basis: 'structured_replenishment_evidence'"), 'saved comparison explicitly records that human prose is not analysis input');
check(page.includes("strategy: 'transfer_first_then_purchase'") && page.includes("strategy: 'supplier_purchase_without_recommended_transfers'"), 'two factual actions are derived from the same replenishment source data');
check(page.includes('const supplierOnlyPurchase = ceilToMultiple(Math.max(shortage, minimumOrderQuantity), packageSize);') && page.includes('supplier_only_purchase_quantity: supplierOnlyPurchase'), 'supplier-only alternative derives purchase quantity from factual shortage plus source MOQ/package rules, never prose');
check(page.includes('aggregate_score: null') && page.includes('confidence_score: null') && page.includes('unmeasured_effects_not_scored: true'), 'new data-backed choices do not fabricate winner scores or confidence');
check(page.includes('estimated_unit_cost') && page.includes('supplier_only_estimated_cost') && page.includes("Cost cannot be calculated for these lines because supplier unit cost evidence is incomplete."), 'cost comparison uses supplier unit-cost evidence and exposes missing evidence instead of guessing');
check(page.includes('unit: line.unit') && page.includes('comparison_lines: transferFirstLines') && page.includes('comparison_lines: supplierOnlyLines'), 'line-level product units are preserved instead of summing unlike quantities');
check(page.includes('<DataBackedOptionEvidence outcome={transferFirstPreviewOutcome}') && page.includes('<DataBackedOptionEvidence outcome={supplierOnlyPreviewOutcome}'), 'wizard shows source-backed figures for both alternatives before save');
check(page.includes("isReplenishmentProjectedOutcome(option.projected_outcome)") && page.includes("ui('No automatic winner or score is generated. Compare the source figures and let a person decide which action to take forward.')"), 'saved data-backed run renders factual figures instead of the historical scoring explanation');
check(page.includes("ui('Replenishment Planning data')") && page.includes("ui('Not automatically scored')"), 'evidence list labels new options as source-data comparisons rather than scores');
check(page.includes('skipMutationFeedback: true'), 'data-backed save suppresses generic mutation success narration for this workflow');
check(providers.includes("if (feedbackEvent.detail.type === 'info') return;"), 'generic blue Info action-feedback toasts are globally suppressed while success/error handling remains');
check(providers.includes("nextItem.type === 'success'") && providers.includes("setItems((current) => [...current.slice(-2), nextItem])"), 'real success and error feedback remain available');
check(css.includes('.cross-domain-create--data-backed') && css.includes('.cross-domain-data-table-wrap') && css.includes('.cross-domain-human-text-note'), 'data-backed comparison has dedicated responsive presentation styles');
for (const key of [
  'Your text is not analyzed',
  'Only the structured quantities, transfer recommendations, supplier links, and available supplier-cost evidence from the selected planning run. It does not analyze any sentence you type.',
  'No automatic winner or score is generated. Compare the source figures and let a person decide which action to take forward.'
]) check(translations.includes(`[\"${key.replaceAll('"','\\"')}\"`), `new truth-boundary copy is catalog-backed: ${key}`);
check(pkg.scripts['check:inventory-testing-hardening-v349220'] === 'node scripts/check-inventory-testing-hardening-v349220.mjs', 'v3.49.220 guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349220'), `v3.49.220 guard wired into ${key}`);

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.220 Cross-Domain data-backed comparison guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
