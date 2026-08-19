import fs from 'node:fs';

const apiSource = fs.readFileSync('src/lib/api.ts', 'utf8');
const reportsSource = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');

const requiredApiTokens = [
  'export async function apiDownloadFile',
  'response.blob()',
  'window.URL.createObjectURL(blob)',
  'redirectToLoginAfterExpiredSession()'
];

const requiredReportTokens = [
  "type ExportFormat = 'csv' | 'pdf';",
  'function getReportFilename',
  'const REPORT_LABELS',
  'const getExportPath = (report: ReportTab, format: ExportFormat)',
  "case 'inventory-valuation': return `/reports/inventory-valuation",
  "case 'stock-by-location': return `/reports/stock-by-location",
  "case 'product-movements': return `/reports/product-movements",
  "case 'movement-ledger': return `/reports/movement-ledger",
  "case 'inventory-variance': return `/reports/inventory-variance",
  "case 'procurement-summary': return `/reports/procurement-summary",
  "case 'purchasing-spend': return `/reports/purchasing-spend",
  "case 'low-stock': return `/reports/low-stock",
  "case 'slow-moving': return `/reports/slow-moving",
  "case 'usage-summary': return `/reports/usage-summary",
  "case 'supplier-performance': return `/reports/supplier-performance",
  "case 'expiry-risk': return `/reports/expiry-risk",
  "case 'forecast': return `/reports/forecast",
  "apiDownloadFile(getExportPath(report, format), getReportFilename(report, format))",
  "downloadReport(report, 'csv')",
  'Export CSV'
];

for (const token of requiredApiTokens) {
  if (!apiSource.includes(token)) throw new Error(`Missing API download helper token: ${token}`);
}
for (const token of requiredReportTokens) {
  if (!reportsSource.includes(token)) throw new Error(`Missing Reports export UI token: ${token}`);
}

console.log('Report CSV export UI check passed.');
