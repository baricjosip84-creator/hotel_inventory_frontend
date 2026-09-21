#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const dashboard = read('src/pages/DashboardPage.tsx');
const dashboardCss = read('src/pages/DashboardPage.css');
const cross = read('src/pages/CrossDomainOptimizationPage.tsx');
const crossCss = read('src/pages/CrossDomainOptimizationPage.css');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

const checks = [];
const check = (condition, label) => {
  const ok = Boolean(condition);
  checks.push([ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

// Dashboard: the browser page owns vertical scrolling. Dashboard panels must not create
// their own horizontal or vertical scrolling areas.
check(dashboardCss.includes('grid-template-columns: 1fr !important'), 'Dashboard operational sections use one consistent full-width layout');
check(dashboardCss.includes('max-height: none !important') && dashboardCss.includes('overflow: visible !important'), 'Dashboard record lists have no nested scrolling');
const activeDashboard = dashboard.split(/\r?\n/).filter((line) => !line.trim().startsWith('//')).join('\n');
check(!activeDashboard.includes('<table'), 'Dashboard does not reintroduce horizontally scrollable tables');
check(dashboard.includes('dashboard-record-card') && dashboard.includes('dashboard-activity-card'), 'Dashboard operational data remains in readable business cards');

// Cross-Domain: one real backend recommendation is enough to create a useful review.
check(cross.includes('selectedSourceSelectionValid = selectedRecommendations.length === 1'), 'Cross-Domain permits one real structured action to be reviewed');
check(cross.includes('selected_option_index: selectedRecommendations.length === 1 ? 0 : null'), 'single-action review is selected immediately through the existing backend contract');
check(cross.includes("ui('Review action')") && cross.includes("setSelectedRecommendationIds([item.id]); setCreateStep(3);"), 'each real recommendation has an immediate Review action');
check(cross.includes("ui('Open source workflow')") && cross.includes('sourceWorkflowPath(item)'), 'each supported recommendation can hand off to its operational source workflow');
check(cross.includes("ui('Add to comparison')") && cross.includes('sourceComparableAlternativeCount'), 'comparison remains optional and only appears for real same-subject alternatives');
check(cross.includes('sharedSourceScope([...selectedRecommendations, candidate]).length > 0'), 'unrelated recommendations still cannot be combined into a fake comparison');
check(cross.includes("'/optimization-plans/replenishment'") && cross.includes("'/optimization-plans/bottlenecks'") && cross.includes("'/optimization-plans/labor-forecast'") && cross.includes("'/optimization-plans/sla-risk'"), 'recommendation refresh uses existing structured backend planning engines');
check(cross.includes('human_text_not_analyzed: true') && cross.includes("comparison_basis: 'structured_application_evidence'"), 'human note remains context only and is not planning-engine input');
check(cross.includes("ui('No actionable recommendation is available from the current data')") && cross.includes("ui('Open Replenishment Planning')") && cross.includes("ui('Open Execution Tasks')"), 'empty source state offers direct operational next actions instead of an explanatory dead end');
check(crossCss.includes('.cross-domain-source-card__actions') && crossCss.includes('.cross-domain-action-toolbar'), 'action-oriented Cross-Domain controls have bounded responsive styling');

for (const text of [
  'Actions available from current application data',
  'Review action',
  'Open source workflow',
  'Add to comparison',
  'Review selected',
  'No actionable recommendation is available from the current data',
  'Open Replenishment Planning',
  'Open Execution Tasks',
  'Save decision review'
]) {
  check(translations.includes(`["${text}"`), `v3.49.232 UI text is catalog-backed: ${text}`);
}

check(pkg.scripts['check:inventory-testing-hardening-v349232'] === 'node scripts/check-inventory-testing-hardening-v349232.mjs', 'v3.49.232 guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  check(chain.includes('check:inventory-testing-hardening-v349228 && npm run check:inventory-testing-hardening-v349232'), `v3.49.232 follows v3.49.228 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.232 Dashboard/Cross-Domain actionable workflow guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
