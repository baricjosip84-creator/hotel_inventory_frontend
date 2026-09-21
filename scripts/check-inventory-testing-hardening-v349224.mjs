import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const page = read('src/pages/CrossDomainOptimizationPage.tsx');
const css = read('src/pages/CrossDomainOptimizationPage.css');
const dashboard = read('src/pages/DashboardPage.tsx');
const dashboardCss = read('src/pages/DashboardPage.css');
const pkg = JSON.parse(read('package.json'));
let passed = 0;
const check = (condition, message) => { if (!condition) throw new Error(`FAIL: ${message}`); passed += 1; console.log(`PASS: ${message}`); };
check(page.includes('cross-domain-owner-due-grid'), 'Responsible person and due-date controls use the same alignment grid');
check(css.includes('grid-template-rows: auto 42px minmax(1rem, auto)') && css.includes('height: 42px'), 'Responsible person and due-date controls reserve identical control height');
check(page.includes("ui('Refresh recommendations')") && page.includes('buildAvailableRecommendations.mutate()'), 'Step 2 keeps a direct recommendation refresh action');
check(page.includes('disabled={!canCreateOptimizationSources || buildAvailableRecommendations.isPending}'), 'recommendation generation remains permission-aware');
check(page.includes('onMutate: () =>') && page.includes('setSourceBuildReport(null)'), 'rebuilding clears the previous source-build report before new checks run');
check(css.includes('.cross-domain-action-toolbar'), 'source generation action has compact dedicated styling');
check(dashboard.includes('dashboard-primary-grid') && dashboard.includes('dashboard-secondary-grid'), 'Dashboard sections keep explicit layout classes');
check(dashboardCss.includes('grid-template-columns: 1fr !important'), 'Dashboard operational sections are full width rather than mixed card widths');
check(dashboardCss.includes('max-height: none !important') && dashboardCss.includes('overflow: visible !important'), 'Dashboard has no nested record-list scrolling');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  check(pkg.scripts[key]?.includes('check:inventory-testing-hardening-v349223 && npm run check:inventory-testing-hardening-v349224'), `v3.49.224 follows v3.49.223 in ${key}`);
}
console.log(`v3.49.224 visible usability guard: ${passed}/${passed} PASS`);
