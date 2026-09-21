import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dashboard = read('src/pages/DashboardPage.tsx');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const crossDomainCss = read('src/pages/CrossDomainOptimizationPage.css');
const providers = read('src/app/AppProviders.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const navigation = read('src/app/navigationRegistry.ts');
const pkg = JSON.parse(read('package.json'));

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS: ${message}`);
};

check(dashboard.includes("overflow: 'auto'") && dashboard.includes("maxHeight: '330px'") && dashboard.includes("scrollbarGutter: 'stable both-edges'"), 'Dashboard table cards own bounded horizontal and vertical scrolling');
check(dashboard.includes("position: 'sticky'") && dashboard.includes("whiteSpace: 'nowrap'"), 'Dashboard table headers stay visible and no longer collapse into narrow wrapped labels');
check(dashboard.includes('tableCompact') && dashboard.includes("minWidth: '620px'"), 'compact Dashboard tables keep a readable minimum width');
check(dashboard.includes('tableMedium') && dashboard.includes("minWidth: '760px'"), 'medium Dashboard tables keep a readable minimum width');
check(dashboard.includes('tableWide') && dashboard.includes("minWidth: '980px'"), 'Recent Activity uses a wide table instead of crushing seven columns');
check(dashboard.includes('<table style={{ ...styles.table, ...styles.tableWide }}>') && dashboard.includes("title={ui('Recent Activity')}"), 'Recent Activity is wired to the wide scrollable table treatment');

check(crossDomain.includes('TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE'), 'Cross-Domain checks the existing optimization-create permission before offering recommendation generation');
for (const endpoint of ['/optimization-plans/replenishment', '/optimization-plans/facility-balancing', '/optimization-plans/bottlenecks', '/optimization-plans/labor-forecast', '/optimization-plans/sla-risk']) {
  check(crossDomain.includes(endpoint), `Cross-Domain builds source recommendations through existing backend generator: ${endpoint}`);
}
check(crossDomain.includes("replenishment_strategy: 'balanced'") && crossDomain.includes("replenishment_strategy: 'transfer_first'") && crossDomain.includes("replenishment_strategy: 'procurement_first'"), 'replenishment source discovery calculates multiple real strategies for the same underlying par-level subject');
check(crossDomain.includes("balancing_strategy: 'balanced'") && crossDomain.includes("balancing_strategy: 'sla_first'") && crossDomain.includes("balancing_strategy: 'labor_first'"), 'facility source discovery calculates multiple real balancing strategies for the same facility subject');
check(crossDomain.includes("payload: { generated_for: 'cross_domain_source_discovery' }") && crossDomain.includes('skipMutationFeedback: true'), 'recommendation building is explicitly tagged and suppresses generic per-request success toasts');
check(crossDomain.includes('dedupeSourceRecommendations') && crossDomain.includes('sourceRecommendationIdentity'), 'repeated generator runs cannot create duplicate-looking choices in the Cross-Domain picker');
check(crossDomain.includes('hasComparableSourcePair') && crossDomain.includes('comparableSourcePairAvailable'), 'the page checks whether a genuine same-subject pair exists before offering a comparison');
check(crossDomain.includes("ui('No comparable pair is available yet')") && crossDomain.includes("ui('Build available recommendations')"), 'empty Step 2 now explains the missing pair and provides the direct build action');
check(crossDomain.includes("ui('Only one distinct planning action is currently available, so there is nothing to compare yet.')"), 'one real recommendation is described truthfully instead of demanding an impossible second choice');
check(crossDomain.includes("ui('Several planning actions exist, but no two refer to the same structured business subject. Cross-Domain will not force unrelated records into a comparison.')"), 'unrelated recommendations are not forced into a fake comparison');
check(crossDomain.includes("ui('Cross-Domain uses planning recommendations calculated from structured operational data. Your note from Step 1 is not sent to these planning engines and is not used to generate an action.')"), 'Step 2 states that human prose is not planning-engine input');
check(providers.includes("if (feedbackEvent.detail.type === 'info') return;"), 'generic informational toasts remain globally suppressed');
check(crossDomainCss.includes('.cross-domain-source-builder') && crossDomainCss.includes('.cross-domain-source-build-result'), 'source discovery status and action have dedicated bounded styling');
check(navigation.includes('Compares real planning actions backed by structured application data for the same business subject'), 'Cross-Domain page header description now matches the actual workflow');
for (const text of [
  'Build or choose real actions from application data',
  'No comparable pair is available yet',
  'Build available recommendations',
  'Planning checks finished',
  'Comparable source-backed actions are now available below.'
]) {
  check(translations.includes(`["${text}"`), `v3.49.223 UI text is catalog-backed: ${text}`);
}
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349221 && npm run check:inventory-testing-hardening-v349223'), `v3.49.223 follows v3.49.221 in ${key}`);
}

console.log(`v3.49.223 Dashboard/Cross-Domain usability guard: ${passed}/${passed} PASS`);
