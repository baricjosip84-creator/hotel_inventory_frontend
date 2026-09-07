import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/CrossDomainOptimizationPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-column rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literals.push(decode(match[1])); } catch {}
}
const dynamicKeys = new Set();
for (const match of pageSource.matchAll(/\b(?:title|description): '([^']+)'/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/\b(?:title|description)="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/headers=\{\[([^\]]+)\]\}/g)) for (const item of match[1].matchAll(/'([^']+)'/g)) dynamicKeys.add(item[1]);
const canonicalStart = pageSource.indexOf('const CANONICAL_LABELS');
const canonicalEnd = pageSource.indexOf('const REVIEW_SECTIONS', canonicalStart + 1);
if (canonicalStart < 0 || canonicalEnd <= canonicalStart) fail('Unable to isolate Cross-Domain canonical label block.');
else for (const match of pageSource.slice(canonicalStart, canonicalEnd).matchAll(/: '([^']+)'/g)) dynamicKeys.add(match[1]);
const missing = [...new Set([...literals, ...dynamicKeys].filter((key) => !unique.has(key)))];
if (missing.length) fail(`Cross-Domain Optimization display keys missing catalog rows: ${missing.join(' | ')}`);
else pass(`${new Set(literals).size + dynamicKeys.size} Cross-Domain Optimization display keys are catalog-backed.`);

const rawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const matches = [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
});
if (rawText.length) fail(`Raw direct JSX presentation remains: ${rawText.join(' | ')}`);
else pass('CrossDomainOptimizationPage has zero raw direct JSX presentation text.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN",
  "apiRequest<OptimizationSummary>(`/decision-intelligence/cross-domain-optimization-summary?${queryString}`)",
  "params.set('review_run_id', selectedRunId)",
  "mixed_run_review_checks_allowed",
  "Create planning review",
  "Govern the important tradeoffs",
  "Expected result compared with actual result",
  "Optimization governance settings",
  "Send selected option to Intelligence Review"
]) if (!pageSource.includes(required)) fail(`Cross-Domain Optimization operational/multilingual wiring missing: ${required}`);

for (const required of ["path: 'cross-domain-optimization'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<CrossDomainOptimizationPage />']) {
  if (!routerSource.includes(required)) fail(`Cross-Domain Optimization route contract missing: ${required}`);
}

for (const required of [
  "'/decision-intelligence/cross-domain-optimization/reviews'",
  "'/decision-intelligence/cross-domain-optimization/settings'",
  "action: 'request_intelligence_review'",
  "action: 'select_option'",
  "action: 'update_ownership'"
]) if (!pageSource.includes(required)) fail(`Governed Cross-Domain mutation path missing: ${required}`);

for (const prohibited of [
  '/purchase-orders', '/stock/movements', '/shipments/dispatch', '/reservations/',
  'autonomous_plan_application', 'supplier_transaction_execution', 'erp_writeback'
]) if (pageSource.includes(prohibited)) fail(`Cross-Domain page contains prohibited operational execution wiring: ${prohibited}`);

if (!process.exitCode) {
  pass('Cross-Domain Optimization is multilingual/catalog-backed, run-scoped, human-governed, and contains no direct operational execution path.');
  pass('CrossDomainOptimizationPage staged multilingual conversion remains protected after operational completion.');
}
