#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const cross = read('src/pages/CrossDomainOptimizationPage.tsx');
const crossCss = read('src/pages/CrossDomainOptimizationPage.css');
const dashboard = read('src/pages/DashboardPage.tsx');
const dashboardCss = read('src/pages/DashboardPage.css');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (ok, label) => {
  checks.push([!!ok, label]);
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${label}`);
};

check(cross.includes('cross-domain-owner-due-grid'), 'Responsible person and due date use an explicit shared alignment grid');
check(cross.includes('cross-domain-owner-due-field'), 'Both Step 1 controls share one field structure');
check(crossCss.includes('grid-template-rows: auto 42px minmax(1rem, auto);'), 'Step 1 control rows reserve identical control height');
check(crossCss.includes('.cross-domain-owner-due-field .input') && crossCss.includes("height: 42px"), 'Responsible person and due date controls have the same explicit height');
check(cross.includes('canReadOptimizationSources ? <div className="cross-domain-source-primary-action cross-domain-source-primary-action--prominent">'), 'Recommendation builder is visibly rendered whenever source evidence can be read');
check(cross.includes('disabled={!canCreateOptimizationSources || buildAvailableRecommendations.isPending}'), 'Recommendation builder stays visible but respects source-create permission');
check(cross.includes("ui('Structured application data')"), 'Step 2 visibly identifies the structured-data boundary');
check(cross.includes('cross-domain-source-primary-action__steps'), 'Step 2 shows a visible build-select-compare sequence');
check(crossCss.includes('.cross-domain-source-primary-action--prominent') && crossCss.includes('border-width: 2px'), 'Recommendation builder has unmistakable prominent styling');
check(dashboard.includes("import './DashboardPage.css';"), 'Dashboard loads dedicated visible scrollbar/layout styling');
check(dashboard.includes('className="dashboard-secondary-grid"'), 'Dashboard lower operational area uses an explicit layout class');
check(dashboard.includes("dashboard-panel${props.wide ? ' dashboard-panel--wide' : ''}"), 'Wide Dashboard sections receive a concrete wide-panel class');
check(dashboardCss.includes('.dashboard-secondary-grid > .dashboard-panel--wide') && dashboardCss.includes('grid-column: 1 / -1 !important;'), 'Recent Activity is forced to span the full Dashboard row');
check(dashboard.includes('dashboard-table-scroll dashboard-table-scroll--activity'), 'Recent Activity uses the explicit internal scroll container');
check(dashboardCss.includes('::-webkit-scrollbar') && dashboardCss.includes('scrollbar-color:'), 'Dashboard table scrollbars are visibly styled');
check(dashboard.includes("minWidth: '1120px'"), 'Recent Activity has enough table width to stop crushing seven columns');
check(dashboard.includes("height: '320px'") && dashboard.includes("maxHeight: '320px'"), 'Recent Activity has a bounded internal vertical scroll area');
check(pkg.scripts['check:inventory-testing-hardening-v349226'] === 'node scripts/check-inventory-testing-hardening-v349226.mjs', 'v3.49.226 guard registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349225') && pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349226'), `v3.49.226 follows v3.49.225 in ${key}`);
}

const failed = checks.filter(([ok]) => !ok);
console.log(`v3.49.226 visible usability guard: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
