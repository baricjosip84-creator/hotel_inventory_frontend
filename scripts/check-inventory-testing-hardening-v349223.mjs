import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dashboard = read('src/pages/DashboardPage.tsx');
const dashboardCss = read('src/pages/DashboardPage.css');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const crossDomainCss = read('src/pages/CrossDomainOptimizationPage.css');
const providers = read('src/app/AppProviders.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS: ${message}`);
};

const activeDashboardCss = dashboardCss.split(/\r?\n/).filter((line) => !line.trim().startsWith('//')).join('\n');
check(dashboard.includes('dashboard-primary-grid') && dashboard.includes('dashboard-secondary-grid'), 'Dashboard keeps explicit operational section layout groups');
check(activeDashboardCss.includes('.dashboard-primary-grid') && activeDashboardCss.includes('grid-template-columns: 1fr !important'), 'Dashboard operational sections use a single readable page column');
check(activeDashboardCss.includes('overflow: visible !important') && activeDashboardCss.includes('max-height: none !important'), 'Dashboard record lists rely on page scrolling instead of nested scroll containers');
check(dashboard.includes('dashboard-record-card') && dashboard.includes('dashboard-activity-card'), 'Dashboard operational rows render as readable cards');

check(crossDomain.includes('TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE'), 'Cross-Domain checks the existing optimization-create permission before offering recommendation generation');
for (const endpoint of ['/optimization-plans/replenishment', '/optimization-plans/facility-balancing', '/optimization-plans/bottlenecks', '/optimization-plans/labor-forecast', '/optimization-plans/sla-risk']) {
  check(crossDomain.includes(endpoint), `Cross-Domain builds source recommendations through existing backend generator: ${endpoint}`);
}
check(crossDomain.includes("replenishment_strategy: 'transfer_first'") && !crossDomain.includes("replenishment_strategy: 'procurement_first'") && !crossDomain.includes("replenishment_strategy: 'balanced'"), 'replenishment source discovery follows the transfer-before-buy workflow without manufacturing procurement alternatives');
check(crossDomain.includes("balancing_strategy: 'balanced'") && crossDomain.includes("balancing_strategy: 'sla_first'") && crossDomain.includes("balancing_strategy: 'labor_first'"), 'facility source discovery calculates multiple real balancing strategies when data supports them');
check(crossDomain.includes("payload: { generated_for: 'cross_domain_source_discovery' }") && crossDomain.includes('skipMutationFeedback: true'), 'recommendation building is explicitly tagged and suppresses generic per-request success toasts');
check(crossDomain.includes('dedupeSourceRecommendations') && crossDomain.includes('sourceRecommendationIdentity'), 'repeated generator runs cannot create duplicate-looking choices in the Cross-Domain picker');
check(crossDomain.includes('sourceComparableAlternativeCount') && crossDomain.includes('selectedSourceSelectionValid'), 'Cross-Domain supports one-action review while preserving genuine same-subject comparisons');
check(crossDomain.includes("ui('Review action')") && crossDomain.includes("ui('Open source workflow')"), 'each available source-backed recommendation exposes a useful next action');
check(crossDomain.includes("sourceWorkflowPath") && crossDomain.includes("'/replenishment-planning'") && crossDomain.includes("'/execution-tasks'"), 'source-backed actions can hand off to the authoritative operational workflow');
check(providers.includes("if (feedbackEvent.detail.type === 'info') return;"), 'generic informational toasts remain globally suppressed');
check(crossDomainCss.includes('.cross-domain-action-toolbar') && crossDomainCss.includes('.cross-domain-source-card__actions'), 'actionable source discovery has compact bounded styling');
for (const text of ['Actions available from current application data','Available actions','Review action','Open source workflow','No actionable recommendation is available from the current data']) {
  check(translations.includes(`["${text}"`), `Cross-Domain UI text is catalog-backed: ${text}`);
}
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349221 && npm run check:inventory-testing-hardening-v349223'), `v3.49.223 follows v3.49.221 in ${key}`);
}

console.log(`v3.49.223 Dashboard/Cross-Domain usability guard: ${passed}/${passed} PASS`);
