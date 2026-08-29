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
if (missing.length) fail(`Cross-Domain Optimization ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Cross-Domain Optimization has ${new Set(literals).size} catalog-backed literal UI keys.`);

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "path: 'cross-domain-optimization'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<CrossDomainOptimizationPage />'
]) {
  const source = required.startsWith('path:') || required.includes('DECISION_INTELLIGENCE_READ') || required.includes('CrossDomainOptimizationPage') ? routerSource : pageSource;
  if (!source.includes(required)) fail(`Cross-Domain Optimization multilingual wiring missing: ${required}`);
}
if (!process.exitCode) pass('Cross-Domain Optimization keeps the shared multilingual runtime and DECISION_INTELLIGENCE_READ route contract.');

const rawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const matches = [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
});
if (rawText.length) fail(`Raw JSX presentation remains on CrossDomainOptimizationPage: ${rawText.join(' | ')}`);
else pass('CrossDomainOptimizationPage has zero raw direct JSX presentation text.');

const dynamicKeys = new Set();
for (const match of pageSource.matchAll(/\b(?:title|description|label): '([^']+)'/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/\b(?:title|description)="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/headers=\{\[([^\]]+)\]\}/g)) {
  for (const item of match[1].matchAll(/'([^']+)'/g)) dynamicKeys.add(item[1]);
}
for (const match of pageSource.matchAll(/label="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const [startToken, endToken] of [
  ['const DECISION_LABELS', 'const CANONICAL_LABELS'],
  ['const CANONICAL_LABELS', 'const REVIEW_SECTIONS']
]) {
  const start = pageSource.indexOf(startToken);
  const end = pageSource.indexOf(endToken, start + 1);
  if (start < 0 || end <= start) fail(`Unable to isolate dynamic label block: ${startToken}`);
  const block = start >= 0 && end > start ? pageSource.slice(start, end) : '';
  for (const match of block.matchAll(/: '([^']+)'/g)) dynamicKeys.add(match[1]);
}
const missingDynamic = [...dynamicKeys].filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Cross-Domain Optimization dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicKeys.size} review, evidence, metric, and canonical display keys are catalog-backed.`);

for (const required of [
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(dataUpdatedAt, locale)',
  'formatLocalizedNumber(Number(filters.limit), locale)',
  'formatPercentage(run.confidence_score, locale)',
  'formatDate(run.updated_at || run.created_at, locale)',
  'formatNumber(objective.weight, locale, 4)',
  "ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))",
  "ui('Observed: {value}').replace('{value}', formatObservedValue(observed, locale))"
]) if (!pageSource.includes(required)) fail(`Cross-Domain Optimization locale-aware presentation missing: ${required}`);
if (!process.exitCode) pass('Counts, limits, weights, confidence, scores, evidence totals, and timestamps use the tenant locale.');

for (const required of [
  'run.optimization_label || run.title ||',
  'run.summary ? <span className="forecast-table__subtext">{run.summary}</span>',
  'option.option_label || option.title ||',
  'option.summary ? <span className="forecast-table__subtext">{option.summary}</span>',
  '<strong>{String(heading)}</strong>',
  '{resolution ? <p>{String(resolution)}</p> : null}',
  'formatObservedValue(observed, locale)',
  'formatObservedValue(required, locale)'
]) if (!pageSource.includes(required)) fail(`Cross-Domain Optimization server/business data boundary changed unexpectedly: ${required}`);
if (pageSource.includes('ui(formatLabel(')) fail('Cross-Domain Optimization translates arbitrary backend labels through ui(formatLabel(...)).');
else pass('Backend titles, summaries, checks, blockers, resolutions, identifiers, and nonnumeric business values remain server/business data.');

for (const required of [
  "apiRequest<OptimizationSummary>(`/decision-intelligence/cross-domain-optimization-summary?${queryString}`)",
  "ui('Compare stored planning runs, business objectives, proposed options, tradeoffs, and recorded outcomes across business areas. This workspace supports human planning review only and cannot approve, apply, or scale a plan automatically.')",
  "ui('These are advisory checks, not approvals or automated actions')",
  "ui('A passing check only means that the returned records satisfy that specific calculation. It does not approve a plan, apply an option, change objective weights, promote a pattern, start monitoring, retire anything, or scale a plan to another business area.')"
]) if (!pageSource.includes(required)) fail(`Cross-Domain Optimization read-only/governance contract missing: ${required}`);
if (/\buseMutation\b/.test(pageSource) || /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/.test(pageSource)) fail('Cross-Domain Optimization page unexpectedly contains a mutation path.');
else pass('Cross-Domain Optimization remains a read-only, human-governed planning workspace.');

if (!process.exitCode) pass('CrossDomainOptimizationPage staged multilingual conversion is complete.');
