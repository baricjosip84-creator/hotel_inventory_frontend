import fs from 'node:fs';

const api = fs.readFileSync('src/lib/api.ts', 'utf8');
const reports = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');
const reportsE2e = fs.readFileSync('tests/e2e/reports.spec.ts', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredApiSnippets = [
  'export type ApiDownloadMetadata',
  'function readDownloadMetadata(response: Response): ApiDownloadMetadata',
  "response.headers.get('X-Report-Exported-Rows')",
  "response.headers.get('X-Report-Source-Rows')",
  "response.headers.get('X-Report-Row-Limit')",
  "response.headers.get('X-Report-Row-Limit-Applied')",
  'function parseOptionalHeaderNumber(value: string | null): number | null',
  'function parseOptionalHeaderBoolean(value: string | null): boolean',
  'function sanitizeDownloadFilename(filename: string): string',
  "link.setAttribute('aria-hidden', 'true')",
  'link.tabIndex = -1;',
  '} finally {',
  'link.remove();',
  'window.URL.revokeObjectURL(objectUrl);'
];

const requiredReportsSnippets = [
  'const MAX_REPORT_FILTER_LENGTH = 120;',
  'const PRODUCT_MOVEMENT_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;',
  'function getReportFilename',
  'function getExportButtonAriaLabel',
  'function getClearDownloadStatusAriaLabel',
  'const normalizedLocationCategoryFilter = useMemo(',
  'disabled={downloadingReport !== null}',
  'aria-busy={downloadingReport ===',
  'role="status"',
  'role="alert"',
  'aria-live="polite"',
  'aria-live="assertive"',
  'Original result had',
  'configured limit of',
  'role="tablist"',
  'aria-orientation="horizontal"',
  'role="tab"',
  'role={props.id ? \'tabpanel\' : undefined}',
  'aria-describedby={descriptionId}',
  'tabIndex={props.id ? 0 : undefined}',
  'handleReportTabKeyDown',
  "event.key === 'ArrowRight' || event.key === 'ArrowDown'",
  "event.key === 'ArrowLeft' || event.key === 'ArrowUp'",
  "event.key === 'Home'",
  "event.key === 'End'",
  'REPORT_TAB_LOCK_HINT_ID',
  'Report tabs are locked while',
  'aria-describedby={downloadingReport !== null ? REPORT_TAB_LOCK_HINT_ID : undefined}',
  'maxLength={MAX_REPORT_FILTER_LENGTH}',
  'getReportFilterHint(locationCategoryFilter)',
  'Maximum ${MAX_PRODUCT_MOVEMENT_REPORT_LIMIT} movement rows per report.',
  'apiDownloadFile(paths[report], getReportFilename(report))'
];


const requiredReportsE2eSnippets = [
  "reports page exposes CSV export controls and accessible tab navigation",
  "getByRole('tablist', { name: 'Reports' })",
  "toHaveAttribute('aria-orientation', 'horizontal')",
  "getByRole('tabpanel', { name: 'Stock by Location' })",
  "Export stock by location report as CSV.",
  "toHaveAttribute('maxlength', '120')",
  "Optional. Maximum 120 characters.",
  "getByRole('tabpanel', { name: 'Product Movements' })",
  "Export product movements report as CSV.",
  "Maximum 500 movement rows per report."
];

const requiredPackageScripts = [
  'check:report-csv-export-ui',
  'check:report-export-row-count-ui',
  'check:report-export-feature-closure'
];

const missing = [];

for (const snippet of requiredApiSnippets) {
  if (!api.includes(snippet)) {
    missing.push(`src/lib/api.ts missing required report export closure snippet: ${snippet}`);
  }
}

for (const snippet of requiredReportsSnippets) {
  if (!reports.includes(snippet)) {
    missing.push(`src/pages/ReportsPage.tsx missing required report export closure snippet: ${snippet}`);
  }
}


for (const snippet of requiredReportsE2eSnippets) {
  if (!reportsE2e.includes(snippet)) {
    missing.push(`tests/e2e/reports.spec.ts missing required report export E2E closure snippet: ${snippet}`);
  }
}

for (const scriptName of requiredPackageScripts) {
  if (!packageJson.scripts?.[scriptName]) {
    missing.push(`package.json missing ${scriptName}`);
  }
}

if (reports.includes('apiDownloadFile(paths[report], `${report}.csv`)')) {
  missing.push('ReportsPage still uses old technical report slug filenames for CSV exports.');
}

if (!reports.includes('} finally {\n      setDownloadingReport(null);\n    }')) {
  missing.push('ReportsPage must clear downloading state from a finally block.');
}

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('Report export feature closure check passed.');
