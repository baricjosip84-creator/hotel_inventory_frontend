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
const check = (ok, label) => { checks.push([!!ok, label]); console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`); };

const activeDashboardLines = dashboard.split(/\r?\n/).filter((line) => !line.trim().startsWith('//')).join('\n');
const activeDashboardCss = dashboardCss.split(/\r?\n/).filter((line) => !line.trim().startsWith('//')).join('\n');
check(!activeDashboardLines.includes('<table'), 'Dashboard no longer uses squeezed operational tables');
check(dashboard.includes('dashboard-vertical-list') && dashboard.includes('dashboard-activity-list'), 'Dashboard operational data uses record-card lists');
check(activeDashboardCss.includes('grid-template-columns: 1fr !important'), 'Dashboard operational sections use one consistent full width');
check(activeDashboardCss.includes('overflow: visible !important') && activeDashboardCss.includes('max-height: none !important'), 'Dashboard has no nested vertical or horizontal record scrolling');
check(dashboardCss.includes('.dashboard-record-card') && dashboardCss.includes('.dashboard-activity-card'), 'Dashboard rows are business cards instead of squeezed columns');

check(cross.includes("minimum_risk_level: 'medium'") && !cross.includes("minimum_risk_level: 'low'"), 'Cross-Domain does not generate low-risk SLA noise');
check(cross.includes("minimum_severity: 'medium'") && !cross.includes("minimum_severity: 'low'"), 'Cross-Domain does not generate low-severity facility-balance noise');
check(cross.includes('sourceBusinessOrigin(item, ui)') && cross.includes('sourceBusinessAction(item, locale, ui)') && cross.includes('sourceBusinessSubject(item, ui)'), 'Cross-Domain cards show source, business subject, and suggested action');
check(cross.includes('sourceBusinessEvidence(item, locale, ui)'), 'Cross-Domain cards show the structured facts behind the action');
check(cross.includes("ui('Review action')") && cross.includes("ui('Open source workflow')"), 'Cross-Domain recommendations provide immediate useful actions');
check(cross.includes('selectedSourceSelectionValid = selectedRecommendations.length === 1'), 'Cross-Domain can review one real recommendation without fabricating an alternative');
check(cross.includes('sourceComparableAlternativeCount') && cross.includes("ui('Add to comparison')"), 'real same-subject alternatives remain available for comparison when they exist');
check(cross.includes('cross-domain-source-card--business'), 'Cross-Domain uses business-facing recommendation cards');
check(cross.includes('cross-domain-common-metric-list') && !cross.includes('<table className="data-table cross-domain-table"><thead><tr><th>{ui(\'Source field\')}'), 'Cross-Domain comparison metrics do not require left-right table scrolling');
check(crossCss.includes('.cross-domain-source-business-facts') && crossCss.includes('.cross-domain-common-metric-list'), 'Cross-Domain business evidence has bounded responsive styling');

check(pkg.scripts['check:inventory-testing-hardening-v349228'] === 'node scripts/check-inventory-testing-hardening-v349228.mjs', 'v3.49.228 guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  check(chain.includes('check:inventory-testing-hardening-v349227 && npm run check:inventory-testing-hardening-v349228'), `v3.49.228 follows v3.49.227 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.228 Dashboard/Cross-Domain business usability guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
