import fs from 'node:fs';

const api = fs.readFileSync('src/lib/api.ts', 'utf8');
const reports = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');

const requiredApiSnippets = [
  'export type ApiDownloadMetadata',
  "response.headers.get('X-Report-Exported-Rows')",
  "response.headers.get('X-Report-Source-Rows')",
  "response.headers.get('X-Report-Row-Limit')",
  "response.headers.get('X-Report-Row-Limit-Applied')",
  'Promise<ApiDownloadMetadata>',
  'return readDownloadMetadata(response);'
];

const requiredReportsSnippets = [
  'type ApiDownloadMetadata',
  'downloadInfo',
  'setDownloadInfo({ report, format, metadata })',
  'metadata.exportedRows',
  'metadata.originalRows',
  'metadata.rowLimit',
  'metadata.wasRowLimited',
  'Original result had',
  'configured limit of',
  'role="status"',
  'aria-live="polite"',
  'role="alert"',
  'aria-live="assertive"',
  'clearDownloadStatus',
  'Clear message',
  'finally {',
  'setDownloadingReport(null)',
  'setDownloadFormat(null)'
];

const missing = [];
for (const token of requiredApiSnippets) if (!api.includes(token)) missing.push(`src/lib/api.ts missing ${token}`);
for (const token of requiredReportsSnippets) if (!reports.includes(token)) missing.push(`src/pages/ReportsPage.tsx missing ${token}`);
if (missing.length) {
  console.error(missing.join('\n'));
  process.exit(1);
}
console.log('Report export row-count UI check passed.');
