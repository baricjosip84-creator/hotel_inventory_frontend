import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/AdaptivePolicyEnginePage.tsx');
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
if (missing.length) fail(`Adaptive Policy Engine ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Adaptive Policy Engine has ${new Set(literals).size} catalog-backed literal UI keys.`);

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "path: 'adaptive-policy-engine'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ',
  '<AdaptivePolicyEnginePage />'
]) {
  const source = required.startsWith('path:') || required.includes('DECISION_INTELLIGENCE_READ') || required.includes('AdaptivePolicyEnginePage') ? routerSource : pageSource;
  if (!source.includes(required)) fail(`Adaptive Policy Engine multilingual wiring missing: ${required}`);
}
if (!process.exitCode) pass('Adaptive Policy Engine keeps the shared multilingual runtime and DECISION_INTELLIGENCE_READ route contract.');

const rawText = pageSource.split(/\r?\n/).flatMap((line) => {
  const matches = [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
});
if (rawText.length) fail(`Raw JSX presentation remains on AdaptivePolicyEnginePage: ${rawText.join(' | ')}`);
else pass('AdaptivePolicyEnginePage has zero raw direct JSX presentation text.');

const dynamicKeys = new Set();
for (const match of pageSource.matchAll(/\b(?:title|description|label): '([^']+)'/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/\b(?:title|description)="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const match of pageSource.matchAll(/headers=\{\[([^\]]+)\]\}/g)) {
  for (const item of match[1].matchAll(/'([^']+)'/g)) dynamicKeys.add(item[1]);
}
for (const match of pageSource.matchAll(/label="([^"]+)"/g)) dynamicKeys.add(match[1]);
for (const blockName of ['const GENERATED_POLICY_COPY', 'const GENERATED_RECOMMENDATION_COPY']) {
  const start = pageSource.indexOf(blockName);
  const end = pageSource.indexOf('};', start + 1);
  const block = start >= 0 && end > start ? pageSource.slice(start, end) : '';
  for (const match of block.matchAll(/:\s*'([^']+)'/g)) dynamicKeys.add(match[1]);
}
for (const [startToken, endToken] of [
  ['const DECISION_LABELS', 'const LIFECYCLE_SECTIONS'],
  ['const CANONICAL_LABELS', 'function formatCanonicalLabel']
]) {
  const start = pageSource.indexOf(startToken);
  const end = pageSource.indexOf(endToken, start + 1);
  if (start < 0 || end <= start) fail(`Unable to isolate dynamic label block: ${startToken}`);
  const block = start >= 0 && end > start ? pageSource.slice(start, end) : '';
  for (const match of block.matchAll(/: '([^']+)'/g)) dynamicKeys.add(match[1]);
}
const missingDynamic = [...dynamicKeys].filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Adaptive Policy Engine dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicKeys.size} lifecycle, evidence, metric, and canonical display keys are catalog-backed.`);

for (const required of [
  "const { locale, ui } = useAppTranslation();",
  "formatLocalizedDateTime(dataUpdatedAt, locale)",
  "formatLocalizedNumber(Number(filters.limit), locale)",
  "formatStoredConfidence(policy.confidence_score, locale)",
  "formatLocalizedDateTime(policy.updated_at || policy.created_at, locale)",
  "formatDelta(measurement.delta_score, locale)",
  "ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))",
  "ui('Evidence records counted: {count}').replace('{count}', formatLocalizedNumber(check.observed_count, locale))"
]) if (!pageSource.includes(required)) fail(`Adaptive Policy Engine locale-aware presentation missing: ${required}`);
if (!process.exitCode) pass('Counts, limits, confidence, deltas, evidence totals, and timestamps use the tenant locale.');

let serverBoundaryMissing = false;
for (const required of [
  'policyDisplayCopy(policy, ui)',
  'recommendationDisplaySummary(recommendation, ui)',
  '{formatLabel(signal.signal_type)}',
  '{formatLabel(measurement.measurement_type)}',
  'canViewDiagnostics ? (',
  "<CheckList title={ui('What needs attention')} items={blockers} kind=\"blockers\" />",
  "<CheckList title={ui('Evidence checks')} items={checks} kind=\"checks\" />",
  '<pre>{JSON.stringify(data, null, 2)}</pre>'
]) {
  if (!pageSource.includes(required)) {
    serverBoundaryMissing = true;
    fail(`Adaptive Policy Engine server/technical data boundary changed unexpectedly: ${required}`);
  }
}
if (!serverBoundaryMissing) pass('Generated policy copy is localized in the frontend while raw readiness diagnostics remain restricted to diagnostic users.');

for (const required of [
  "apiRequest<AdaptivePolicySummary>(`/decision-intelligence/adaptive-policy-engine-summary?${queryString}`)",
  "'/decision-intelligence/adaptive-policy-engine-refresh'",
  'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN',
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  "ui('Checks real operating results to see whether recurring inventory, reservation, supplier, or execution rules may need human review and adjustment. Nothing is changed automatically.')",
  "ui('These checks support a human review; they are not approvals')",
  "ui('A passing check means the returned evidence satisfies that specific rule. It does not automatically approve, apply, promote, roll back, or retire a policy.')",
  'recommendation.source_action_id',
  '/intelligence-review?source_action_id='
]) if (!pageSource.includes(required)) fail(`Adaptive Policy Engine governed refresh/review contract missing: ${required}`);
if (!/useMutation/.test(pageSource) || !/method:\s*['"]POST['"]/.test(pageSource)) fail('Adaptive Policy Engine governed evidence-refresh action is missing.');
if (/method:\s*['"](?:PUT|PATCH|DELETE)['"]/.test(pageSource)) fail('Adaptive Policy Engine contains an unexpected direct policy mutation method.');
else pass('Adaptive Policy Engine supports a DECISION_INTELLIGENCE_GOVERN evidence refresh and Intelligence Review handoff without direct policy application.');

if (!process.exitCode) pass('AdaptivePolicyEnginePage staged multilingual conversion is complete.');
