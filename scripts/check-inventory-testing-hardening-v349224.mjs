import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const dashboard = read('src/pages/DashboardPage.tsx');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const crossDomainCss = read('src/pages/CrossDomainOptimizationPage.css');
const pkg = JSON.parse(read('package.json'));

let passed = 0;
const check = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  passed += 1;
  console.log(`PASS: ${message}`);
};

check(crossDomain.includes("ui('Responsible person')}</span><select") && crossDomain.includes("ui('Decision due date')}</span><input"), 'Responsible person and due-date controls start on the same row without pre-input helper offset');
check(crossDomain.includes('<input className="input" type="date"') && crossDomain.includes("ui('Optional. Leave it blank if there is no deadline.')}</span></label>"), 'due-date help now follows the input instead of pushing the date control downward');
check(crossDomain.includes('cross-domain-source-primary-action'), 'Cross-Domain has a persistent prominent recommendation-build action area');
check(crossDomain.includes('canReadOptimizationSources && canCreateOptimizationSources ? <div className="cross-domain-source-primary-action"'), 'build action is shown whenever the user can read and create optimization recommendations, not only inside one empty-state branch');
check(crossDomain.includes('disabled={buildAvailableRecommendations.isPending}') && !crossDomain.includes('disabled={buildAvailableRecommendations.isPending || sourceBuildReport !== null}'), 'recommendations can be rebuilt after a completed planning check');
check(crossDomain.includes('onMutate: () =>') && crossDomain.includes('setSourceBuildReport(null);'), 'rebuilding clears the previous build report before new source checks run');
check(crossDomainCss.includes('.cross-domain-source-primary-action') && crossDomainCss.includes('grid-template-columns: minmax(0, 1fr) auto'), 'prominent source-build action has dedicated aligned styling');

check(dashboard.includes('wide?: boolean;') && dashboard.includes('order?: number;'), 'Dashboard sections can opt into a full-width grid row without redesigning unrelated cards');
check(dashboard.includes('...(props.wide ? styles.panelWide : {})'), 'Dashboard Section applies the full-width layout only when requested');
check(dashboard.includes('order={1}') && dashboard.includes("title={ui('Inventory Anomalies')}"), 'Inventory Anomalies stays first in the lower Dashboard group');
check(dashboard.includes('order={2}') && dashboard.includes("title={ui('Supplier Performance')}"), 'Supplier Performance sits beside Inventory Anomalies before Recent Activity');
check(dashboard.includes('wide\n          order={3}\n          title={ui(\'Recent Activity\')}'), 'Recent Activity now occupies a full-width row after the compact cards');
check(dashboard.includes('tableWrapperActivity') && dashboard.includes("height: '300px'") && dashboard.includes("overflow: 'scroll'"), 'Recent Activity owns an obvious bounded vertical and horizontal scroll area');
check(dashboard.includes('<div style={{ ...styles.tableWrapper, ...styles.tableWrapperActivity }}>'), 'Recent Activity is wired to the dedicated always-scrollable wrapper');

for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349223 && npm run check:inventory-testing-hardening-v349224'), `v3.49.224 follows v3.49.223 in ${key}`);
}

console.log(`v3.49.224 Dashboard/Cross-Domain visible usability guard: ${passed}/${passed} PASS`);
