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
  "apiDownloadFile(paths[report], getReportFilename(report))",
  "function getReportFilename",
  "const REPORT_LABELS",
  "'/reports/inventory-valuation?format=csv'",
  "'stock-by-location': `/reports/stock-by-location${buildQueryString({",
  "'product-movements': `/reports/product-movements${buildQueryString({",
  "'/reports/procurement-summary?format=csv'",
  "onClick={() => downloadReportCsv('inventory-valuation')}",
  "onClick={() => downloadReportCsv('stock-by-location')}",
  "onClick={() => downloadReportCsv('product-movements')}",
  "onClick={() => downloadReportCsv('procurement-summary')}"
];

for (const token of requiredApiTokens) {
  if (!apiSource.includes(token)) {
    throw new Error(`Missing API download helper token: ${token}`);
  }
}

for (const token of requiredReportTokens) {
  if (!reportsSource.includes(token)) {
    throw new Error(`Missing Reports CSV export UI token: ${token}`);
  }
}

if (reportsSource.includes('if (error instanceof ApiError) {\n  if (error instanceof ApiError)')) {
  throw new Error('ReportsPage still contains the duplicated ApiError branch.');
}

console.log('Report CSV export UI check passed.');
