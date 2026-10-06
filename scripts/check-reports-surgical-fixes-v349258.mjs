import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const reports = read('src/pages/ReportsPage.tsx');
const reportCss = read('src/pages/ReportsPage.css');
const appCss = read('src/App.css');

const checks = [
  ['all report filter defaults are centralized', reports.includes('DEFAULT_LOW_STOCK_FILTERS') && reports.includes('DEFAULT_LEDGER_FILTERS')],
  ['clear filters is visible in report actions', reports.includes('Clear filters') && reports.includes('clearReportFilters(report)')],
  ['clear filters disables when already at defaults', reports.includes('!hasActiveReportFilters(report)')],
  ['print summary uses separated label/value columns', reports.includes('grid-template-columns:minmax(150px,1fr) auto')],
  ['print table gives adjacent cells a visible boundary', reports.includes('.reports-table td+td{border-left:1px solid #eef2f7}')],
  ['global select popup requests light color scheme', appCss.includes('color-scheme: light') && appCss.includes('select option')],
  ['reports select options use light surface', reportCss.includes('.reports-field select option') && reportCss.includes('background: #fff')],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failed += 1; }
}
if (failed) process.exit(1);
console.log(`PASS (${checks.length}/${checks.length})`);
