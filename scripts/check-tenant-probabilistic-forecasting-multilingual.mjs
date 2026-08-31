import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/ProbabilisticForecastingPage.tsx');
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
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

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
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Probabilistic Forecasting ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Probabilistic Forecasting has ${new Set(literals).size} catalog-backed literal UI keys.`);

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "path: 'probabilistic-forecasting'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<ProbabilisticForecastingPage />'
]) {
  const source = required.startsWith('path:') || required.includes('DECISION_INTELLIGENCE_READ') || required.includes('ProbabilisticForecastingPage') ? routerSource : pageSource;
  if (!source.includes(required)) fail(`Probabilistic Forecasting multilingual wiring missing: ${required}`);
}
if (!process.exitCode) pass('Probabilistic Forecasting keeps the shared multilingual runtime and DECISION_INTELLIGENCE_READ route contract.');

const rawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const matches = [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
});
if (rawText.length) fail(`Raw JSX presentation remains on ProbabilisticForecastingPage: ${rawText.join(' | ')}`);
else pass('ProbabilisticForecastingPage has zero raw direct JSX presentation text.');

const dynamicKeys = new Set();
for (const match of pageSource.matchAll(/\b(?:title|description|label): '([^']+)'/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/\b(?:title|description)="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/headers=\{\[([^\]]+)\]\}/g)) {
  for (const item of match[1].matchAll(/'([^']+)'/g)) dynamicKeys.add(item[1]);
}
for (const match of pageSource.matchAll(/label="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const [startToken, endToken] of [
  ['const DECISION_LABELS', 'const CANONICAL_LABELS'],
  ['const CANONICAL_LABELS', 'const LIFECYCLE_SECTIONS']
]) {
  const start = pageSource.indexOf(startToken);
  const end = pageSource.indexOf(endToken, start + 1);
  if (start < 0 || end <= start) fail(`Unable to isolate dynamic label block: ${startToken}`);
  const block = start >= 0 && end > start ? pageSource.slice(start, end) : '';
  for (const match of block.matchAll(/: '([^']+)'/g)) dynamicKeys.add(match[1]);
}
const missingDynamic = [...dynamicKeys].filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Probabilistic Forecasting dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicKeys.size} lifecycle, evidence, metric, and canonical display keys are catalog-backed.`);

for (const required of [
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(dataUpdatedAt, locale)',
  'formatLocalizedNumber(rows.length, locale)',
  "formatLocalizedNumber((pagination?.offset || 0) + 1, locale)",
  "formatLocalizedNumber(pagination?.total || rows.length, locale)",
  'formatPercentage(model.confidence_score, locale)',
  'formatDate(model.updated_at || model.created_at, locale)',
  'formatIntervalRange(interval, locale)',
  'formatBoolean(observation.interval_captured_actual, ui)',
  "ui('Observed: {value}').replace('{value}', formatNumber(observed, locale))"
]) if (!pageSource.includes(required)) fail(`Probabilistic Forecasting locale-aware presentation missing: ${required}`);
if (!process.exitCode) pass('Paged counts, confidence, ranges, booleans, evidence totals, and timestamps use the tenant locale.');

for (const required of [
  'model.title || formatLabel(model.model_key)',
  'model.summary ? <span className="forecast-table__subtext">{model.summary}</span>',
  "{interval.unit || '—'}",
  "canViewDiagnostics ? (risk.explanation_summary || '—') : ui('Risk is calculated from the current forecast range and available evidence.')",
  'diagnostics && rawHeading ? String(rawHeading) : genericHeading',
  'diagnostics && rawSupporting && rawSupporting !== rawHeading ? <p>{String(rawSupporting)}</p> : <p>{genericSupporting}</p>',
  '<pre>{JSON.stringify(data, null, 2)}</pre>'
]) if (!pageSource.includes(required)) fail(`Probabilistic Forecasting server/technical data boundary changed unexpectedly: ${required}`);
if (pageSource.includes('ui(formatLabel(')) fail('Probabilistic Forecasting translates arbitrary backend labels through ui(formatLabel(...)).');
else pass('Backend titles and units remain source data, while raw risk/check diagnostics are restricted to diagnostics users.');

for (const required of [
  "apiRequest<ProbabilisticForecastingSummary>(`/decision-intelligence/probabilistic-forecasting-summary?${queryString}`)",
  "apiRequest('/decision-intelligence/probabilistic-forecasting-refresh', { method: 'POST', body: JSON.stringify({}) })",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN',
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  "ui('Build and review advisory demand ranges, stockout risk, and forecast accuracy from the app’s real operating data. Forecasts never change inventory or other business records automatically.')",
  "ui('These are advisory checks, not approvals or automated actions')",
  "ui('A passing check only means the evidence satisfies that calculation. Models that need a human decision are reviewed in Intelligence Review; approval still does not change inventory or execute business work.')",
  'to="/intelligence-review"'
]) if (!pageSource.includes(required)) fail(`Probabilistic Forecasting governed refresh/review contract missing: ${required}`);
const mutationMethods = [...pageSource.matchAll(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/g)].map((match) => match[1]);
if (mutationMethods.length !== 1 || mutationMethods[0] !== 'POST') fail(`Probabilistic Forecasting must expose exactly one governed evidence-refresh mutation; found: ${mutationMethods.join(', ') || 'none'}.`);
else pass('Probabilistic Forecasting keeps operational use advisory-only: one governed evidence-refresh POST, human review handoff, and diagnostics permission gating.');

if (!process.exitCode) pass('ProbabilisticForecastingPage staged multilingual conversion is complete.');
