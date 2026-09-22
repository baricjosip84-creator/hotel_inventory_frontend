#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const cross = read('src/pages/CrossDomainOptimizationPage.tsx');
const replenish = read('src/pages/ReplenishmentPlanningPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

// Replenishment purchase rows with zero recommended/final quantity are not real review actions.
check(replenish.includes("const isActionablePurchase = (row: PlanItem): boolean => numberValue(row.recommended_purchase_quantity) > 0 || numberValue(row.final_purchase_quantity) > 0;"), 'zero-quantity supplier purchase rows are excluded from actionable purchase review');
check(replenish.includes("const pendingDecisionCount = actionablePurchaseRows.filter((row) => row.decision_status === 'pending').length"), 'frontend pending-decision count ignores non-actionable zero-quantity purchase rows');
check(!replenish.includes("numberValue(row.shortage_before_transfer) > 0 || numberValue(row.recommended_purchase_quantity) > 0"), 'shortage-before-transfer alone no longer makes a zero-purchase row actionable');

// Cross-Domain saved review is business-facing rather than a raw diagnostic dump.
check(cross.includes("ui('1 source-backed action')"), 'single source-backed action uses correct singular wording');
check(cross.includes("selected_action: 'Selected action'"), 'single ranked action can be presented as Selected action');
check(cross.includes('projectedSourceEvidence(projected, locale, ui)'), 'source-backed saved plan renders curated business evidence');
check(!cross.includes('flattenImpactFacts(projected.impact_snapshot).map'), 'raw projected impact snapshot is not dumped into saved-plan UI');
check(cross.includes("sourceBackedObjectiveTarget(ui)"), 'source-backed objective target is translated into business language');
check(cross.includes("ui('Structured application recommendation')"), 'raw source_backed/recommendation_ids objective metadata is replaced with a business label');

// Intelligence Review handoff cannot be sent repeatedly and approved source actions route back to their authoritative workflow.
check(cross.includes("skipMutationFeedback: body.action === 'request_intelligence_review'"), 'Intelligence Review send action suppresses the generic mutation toast without hiding feedback for unrelated run actions');
check(cross.includes('const reviewRequested = approved || Boolean(selectedRun.review_requested_at || selectedRun.intelligence_review_status || selectedRun.intelligence_review_decision);'), 'Cross-Domain detects already-requested Intelligence Review state');
check(cross.includes("ui('Sent to Intelligence Review')"), 'already-sent state is shown instead of another send button');
check(cross.includes('projectedSourceWorkflowPath(selectedProjected)'), 'approved source-backed action resolves its authoritative source workflow');
check(cross.includes("sourcePath === '/replenishment-planning' ? ui('Open Replenishment Planning') : ui('Open Execution Tasks')"), 'approved replenishment action offers Open Replenishment Planning');
check(cross.includes("ui('The recommendation is approved, but the operational change still has to be carried out in its source workflow.')"), 'approved state explains that execution is still manual');

check(cross.includes("showTenantActionSuccess(selectedRecommendations.length > 1 ? ui('Decision comparison saved.') : ui('Decision review saved.'))"), 'saved source-backed review uses a specific success message instead of generic item-created feedback');
check(cross.includes("showTenantActionSuccess(ui('Sent to Intelligence Review'))"), 'Intelligence Review handoff uses a specific success message');
check(cross.includes('sourceBackedSavedOptionTitle(option, projected, ui)'), 'saved source-backed option title is business-facing');
check(cross.includes('sourceBackedSavedOptionSummary(projected, ui)'), 'saved source-backed option summary is business-facing');
check(!cross.includes("<p>{option.summary || ui('No option summary was recorded.')}</p>"), 'saved source-backed option no longer always exposes the raw technical recommendation summary');
check(cross.includes("sourceBacked ? '—' : formatPercentage(option.confidence_score, locale)"), 'source-backed overview does not expose raw confidence as a manager-facing comparison metric');

// Governance controls remain available but are no longer a raw always-open manager-facing block.
check(cross.includes("<summary>{ui('Advanced governance settings')}</summary>"), 'governance thresholds are collapsed under Advanced governance settings');

for (const text of [
  '1 source-backed action',
  'Selected action',
  'Structured application recommendation',
  'Operational goal',
  'What the application found',
  'Structured application evidence is available for this recommendation.',
  'The recommendation is approved, but the operational change still has to be carried out in its source workflow.',
  'Sent to Intelligence Review',
  'This selected action is already in the human review workflow.',
  'Advanced governance settings',
  'Decision review saved.',
  'Decision comparison saved.',
  'Stock needs attention',
  'Execution work needs attention',
  'Execution workload needs staffing review',
  'Execution workload needs attention',
  'Source-backed action',
  'Review the current replenishment need in Replenishment Planning.',
  'Open Execution Tasks and review the work that needs attention.',
  'Open Execution Tasks and review the current workload.'
]) {
  check(translations.includes(`[\"${text}\"`), `v3.49.238 UI text is catalog-backed: ${text}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349238'] === 'node scripts/check-inventory-testing-hardening-v349238.mjs', 'v3.49.238 frontend guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check((pkg.scripts[key] || '').includes('check:inventory-testing-hardening-v349236 && npm run check:inventory-testing-hardening-v349238'), `v3.49.238 follows v3.49.236 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.238 Cross-Domain/replenishment UX closure guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
