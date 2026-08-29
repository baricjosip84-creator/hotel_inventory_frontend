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
  'formatLocalizedNumber(Number(filters.limit), locale)',
  'formatPercentage(model.confidence_score, locale)',
  'formatDate(model.updated_at || model.created_at, locale)',
  'formatIntervalRange(interval, locale)',
  'formatBoolean(observation.interval_captured_actual, ui)',
  "ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))",
  "ui('Observed: {value}').replace('{value}', formatNumber(observed, locale))"
]) if (!pageSource.includes(required)) fail(`Probabilistic Forecasting locale-aware presentation missing: ${required}`);
if (!process.exitCode) pass('Counts, limits, confidence, ranges, booleans, evidence totals, and timestamps use the tenant locale.');

for (const required of [
  'model.title || formatLabel(model.model_key)',
  'model.summary ? <span className="forecast-table__subtext">{model.summary}</span>',
  "{interval.unit || '—'}",
  "{risk.explanation_summary || '—'}",
  '<strong>{String(heading)}</strong>',
  'supportingText && supportingText !== heading ? <p>{String(supportingText)}</p>',
  '<pre>{JSON.stringify(data, null, 2)}</pre>'
]) if (!pageSource.includes(required)) fail(`Probabilistic Forecasting server/technical data boundary changed unexpectedly: ${required}`);
if (pageSource.includes('ui(formatLabel(')) fail('Probabilistic Forecasting translates arbitrary backend labels through ui(formatLabel(...)).');
else pass('Backend titles, summaries, units, explanations, checks, blockers, supporting text, identifiers, and technical JSON remain server/technical data.');

for (const required of [
  "apiRequest<ProbabilisticForecastingSummary>(`/decision-intelligence/probabilistic-forecasting-summary?${queryString}`)",
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  "ui('Review stored forecast models, uncertainty ranges, risk probabilities, and actual outcomes to judge whether a forecast deserves more or less trust. This workspace cannot create forecasts, alter confidence, retire models, or apply predictions to operations.')",
  "ui('These are advisory checks, not approvals or automated actions')",
  "ui('A passing check only means that the returned records satisfy that specific calculation. It does not create a forecast, increase confidence, approve business use, open an incident, replace a model, or retire anything.')"
]) if (!pageSource.includes(required)) fail(`Probabilistic Forecasting read-only/governance contract missing: ${required}`);
if (/\buseMutation\b/.test(pageSource) || /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(pageSource)) fail('Probabilistic Forecasting page unexpectedly contains a mutation path.');
else pass('Probabilistic Forecasting remains a read-only, human-governed review workspace with diagnostics permission gating.');

if (!process.exitCode) pass('ProbabilisticForecastingPage staged multilingual conversion is complete.');
