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
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (ok, label) => {
  checks.push([!!ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

const activeDashboardLines = dashboard.split(/\r?\n/).filter((line) => !line.trim().startsWith('//')).join('\n');
check(!activeDashboardLines.includes('<table'), 'Dashboard no longer uses horizontally scrollable tables');
check(dashboard.includes('dashboard-vertical-list') && dashboard.includes('dashboard-activity-list'), 'Dashboard operational lists use vertical-only record lists');
check(dashboard.includes('dashboard-primary-grid'), 'Top Dashboard cards use one explicit aligned grid');
check(dashboardCss.includes('overflow-x: hidden !important') && dashboardCss.includes('overflow-y: auto'), 'Dashboard explicitly disables left-right scrolling and keeps vertical scrolling');
check(dashboardCss.includes('.dashboard-record-card') && dashboardCss.includes('.dashboard-activity-card'), 'Dashboard rows are business cards instead of squeezed table columns');
check(dashboardCss.includes('.dashboard-primary-grid > .dashboard-panel') && dashboardCss.includes('height: 100%'), 'Top Dashboard cards align to the same row height');

check(cross.includes('recommendationsWithAComparableAlternative'), 'Cross-Domain hides recommendations that have no real same-subject alternative');
check(cross.includes("minimum_risk_level: 'medium'") && !cross.includes("minimum_risk_level: 'low'"), 'Cross-Domain no longer generates low-risk SLA noise');
check(cross.includes("minimum_severity: 'medium'") && !cross.includes("minimum_severity: 'low'"), 'Cross-Domain no longer generates low-severity facility-balance noise');
check(cross.includes('Where these recommendations come from'), 'Cross-Domain explains where source data came from');
check(cross.includes('sourceBusinessOrigin(item, ui)') && cross.includes('sourceBusinessOriginDescription(item, ui)'), 'Cross-Domain cards show a plain-language originating module and evidence source');
check(cross.includes('sourceBusinessAction(item, locale, ui)') && cross.includes('sourceBusinessSubject(item, ui)'), 'Cross-Domain cards separate the business subject from the suggested action');
check(cross.includes('Only real alternatives are shown'), 'Cross-Domain explicitly states that unrelated planning signals are hidden');
check(cross.includes('cross-domain-source-card--business'), 'Cross-Domain uses business-facing recommendation cards');
check(cross.includes('cross-domain-common-metric-list') && !cross.includes('<table className="data-table cross-domain-table"><thead><tr><th>{ui(\'Source field\')}'), 'Cross-Domain comparison metrics no longer require left-right table scrolling');
check(crossCss.includes('.cross-domain-source-business-facts') && crossCss.includes('.cross-domain-common-metric-list'), 'Cross-Domain business evidence has bounded responsive styling');

check(pkg.scripts['check:inventory-testing-hardening-v349228'] === 'node scripts/check-inventory-testing-hardening-v349228.mjs', 'v3.49.228 guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  check(chain.includes('check:inventory-testing-hardening-v349227 && npm run check:inventory-testing-hardening-v349228'), `v3.49.228 follows v3.49.227 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.228 Dashboard/Cross-Domain business usability guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
