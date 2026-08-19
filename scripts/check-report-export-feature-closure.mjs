import fs from 'node:fs';

const reports = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');
const css = fs.readFileSync('src/pages/ReportsPage.css', 'utf8');

const required = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceTabs',
  'OperationalWorkspaceTab',
  'OperationalSectionHeader',
  'Print + PDF + CSV',
  'const printReport = (report: ReportTab) =>',
  "downloadReport(report, 'pdf')",
  "downloadReport(report, 'csv')",
  'printWindow.print()',
  'data-report-controls="true"',
  "| 'low-stock'",
  "| 'usage-summary'",
  "| 'supplier-performance'",
  "| 'expiry-risk'",
  'aria-controls={getReportPanelId(tab.key)}',
  'onKeyDown={(event) => handleReportTabKeyDown(event, tab.key)}',
  'tabIndex={activeTab === tab.key ? 0 : -1}',
  'role="tabpanel"',
  'Foreign-currency receipt costs are preserved separately and are not silently converted.',
  "row.product_unit || 'units'",
  'formatQuantityByUnit(row.quantity_by_unit, row.total_quantity)'
];

const forbidden = [
  'mobileCards',
  'Product ID:',
  'supports CSV export.'
];

const missing = required.filter((token) => !reports.includes(token));
const presentForbidden = forbidden.filter((token) => reports.includes(token));
if (!css.includes('.reports-table-wrap') || !css.includes('.reports-filter-bar')) {
  missing.push('report-specific responsive table/filter styling');
}
if (missing.length || presentForbidden.length) {
  for (const token of missing) console.error(`ReportsPage missing required report closure invariant: ${token}`);
  for (const token of presentForbidden) console.error(`ReportsPage still contains obsolete report pattern: ${token}`);
  process.exit(1);
}
console.log('Report export feature closure check passed.');
