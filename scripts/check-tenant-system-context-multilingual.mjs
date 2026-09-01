import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const defaultBackendRoot = path.join(root, '..', 'hotel-inventory-backend');
const backendRoot = path.resolve(process.argv[2] || process.env.BACKEND_ROOT || defaultBackendRoot);
const backendExplicitlyConfigured = Boolean(process.argv[2] || process.env.BACKEND_ROOT);
const readBackend = (file) => fs.readFileSync(path.join(backendRoot, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/SystemContextPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const router = read('src/app/router.tsx');
const permissions = read('src/lib/permissions.ts');
let backendRoute = '';
try { backendRoute = readBackend('src/routes/systemContext.js'); }
catch {
  if (backendExplicitlyConfigured) fail(`System Context backend route is unavailable under configured BACKEND_ROOT: ${backendRoot}`);
  else pass('System Context backend contract validation deferred to the cross-repository CI job (BACKEND_ROOT not configured in frontend-only validation).');
}

const rows = [];
for (const line of catalog.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

for (const row of rows) {
  const expected = [...row[0].matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
  for (const translated of row.slice(1)) {
    const actual = [...translated.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
    if (actual !== expected) fail(`Placeholder mismatch for tenant UI key: ${row[0]}`);
  }
}
if (!process.exitCode) pass('Tenant UI placeholder parity is intact across all five languages.');

if (!router.includes("path: 'system-context'") || !router.includes('requiredPermissions={[TENANT_PERMISSIONS.SYSTEM_CONTEXT_READ]}') || !router.includes('<SystemContextPage />')) {
  fail('System Context route permission/mount contract changed or missing.');
} else pass('System Context remains mounted at /system-context behind SYSTEM_CONTEXT_READ.');

for (const permission of [
  "SYSTEM_CONTEXT_READ: 'system_context.read'",
  "DECISION_INTELLIGENCE_GOVERN: 'decision_intelligence.govern'",
  "EXECUTION_REQUESTS_CREATE: 'execution_requests.create'",
  "TENANT_DIAGNOSTICS_READ: 'tenant_diagnostics.read'"
]) {
  if (!permissions.includes(permission)) fail(`System Context permission identifier changed or missing: ${permission}`);
}
if (!process.exitCode) pass('System Context and downstream governance permission identifiers remain canonical.');

for (const required of [
  'useAppTranslation',
  'formatLocalizedCurrency(',
  'formatLocalizedDateTime(',
  'formatLocalizedNumber(',
  'formatCurrencyAmount',
  'getActiveTenantCurrency'
]) {
  if (!page.includes(required)) fail(`System Context locale/currency presentation contract missing: ${required}`);
}
if (!process.exitCode) pass('System Context uses the established translation runtime and locale-aware number/date/percentage/currency presentation.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const displayKeys = new Set();
for (const match of page.matchAll(literalPattern)) {
  try { displayKeys.add(decodeLiteral(match[1])); } catch {}
}
const mapping = page.match(/const KNOWN_VALUE_LABELS: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!mapping) fail('System Context known-value display mapping is missing.');
else for (const match of mapping[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
const ownedSystemText = page.match(/const SYSTEM_CONTEXT_OWNED_TEXT = new Set\(\[([\s\S]*?)\n\]\);/);
if (!ownedSystemText) fail('System Context owned-system-text localization boundary is missing.');
else for (const match of ownedSystemText[1].matchAll(/'([^']+)'/g)) displayKeys.add(match[1]);
const metricLabels = page.match(/const SYSTEM_CONTEXT_METRIC_LABELS: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!metricLabels) fail('System Context metric-label localization mapping is missing.');
else for (const match of metricLabels[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`System Context UI keys missing translations: ${missing.join(' | ')}`);
else pass(`System Context has ${displayKeys.size} catalog-backed literal/dynamic UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint|description|eyebrow)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawDynamicPresentationPattern = /\b(?:subtitle|placeholder|title|ariaLabel|aria-label|label|helper|hint|description|eyebrow)=\{`[^`]*[A-Za-z][^`]*`\}/g;
const rawText = [...page.matchAll(rawTextPattern)].map((m) => m[1].trim()).filter(Boolean);
const rawAttributes = [...page.matchAll(rawAttributePattern)].map((m) => m[0]);
const rawDynamic = [...page.matchAll(rawDynamicPresentationPattern)].map((m) => m[0]);
if (rawText.length) fail(`Raw direct JSX presentation remains in SystemContextPage: ${rawText.join(' | ')}`);
if (rawAttributes.length) fail(`Raw literal presentation attributes remain in SystemContextPage: ${rawAttributes.join(' | ')}`);
if (rawDynamic.length) fail(`Raw dynamic presentation template literals remain in SystemContextPage: ${rawDynamic.join(' | ')}`);
for (const anchor of [
  "ui('{count} affected item.')",
  "ui('{count} affected items.')",
  "ui('{count} stale source')",
  "ui('{count} stale sources')",
  "ui('Quality {quality} · Last observed {time}')",
  "ui('{count} risk signal · refreshed {time}')",
  "ui('{count} risk signals · refreshed {time}')"
]) if (!page.includes(anchor)) fail(`System Context dynamic presentation localization missing: ${anchor}`);
if (!rawText.length && !rawAttributes.length && !rawDynamic.length && !process.exitCode) pass('SystemContextPage has zero raw direct JSX text, targeted literal attributes, and raw dynamic presentation templates in converted surfaces.');

for (const endpoint of [
  "'/system-context'",
  "'/system-context/execution-gate'",
  "'/system-context/snapshots?limit=25'",
  '`/system-context/snapshots/${selectedSnapshotId}`',
  "'/system-context/snapshots/compare/latest'",
  "'/system-context/snapshots/forecast-scenarios?limit=25'",
  "'/system-context/snapshots/forecast-scenarios/history?limit=10'",
  "'/execution-requests'",
  "'/system-context/snapshots/capture'",
  "'/system-context/snapshots/forecast-scenarios/capture'"
]) {
  if (!page.includes(endpoint)) fail(`System Context endpoint contract changed or missing: ${endpoint}`);
}
for (const contract of [
  "request_type: 'system_recommendation'",
  "source: 'system_context_page'",
  "requested_action: 'review_system_context_recommendations'",
  "note: 'Created from System Context recommendations. This is a review request only and does not execute actions.'",
  'body: JSON.stringify({ sections: [] })',
  'body: JSON.stringify({ limit: 25 })',
  'canCreateExecutionRequests',
  'canGovernDecisionIntelligence',
  'canViewTenantDiagnostics'
]) if (!page.includes(contract)) fail(`System Context operational/payload contract changed or missing: ${contract}`);
if (!process.exitCode) pass('System Context read, review-request, snapshot, scenario, and capability contracts remain canonical.');

for (const localizationAnchor of [
  'formatSystemOwnedText(signal.message, ui)',
  'formatSystemOwnedText(item.title, ui)',
  'formatSystemOwnedText(item.action, ui)',
  'formatSystemOwnedText(item.ranking_reason, ui)',
  'formatSystemOwnedText(data.context_quality.summary, ui)',
  'formatFreshnessMessage(item, ui)',
  'formatSystemOwnedText(item.label, ui)',
  'formatScenarioLabel(scenario, ui)',
  'formatSystemOwnedText(source.description, ui)',
  'return SYSTEM_CONTEXT_OWNED_TEXT.has(value) ? ui(value) : value;',
  'return item.message;',
  ': scenario.label;'
]) {
  if (!page.includes(localizationAnchor)) fail(`System Context owned-system localization/raw fallback boundary changed or missing: ${localizationAnchor}`);
}
if (!process.exitCode) pass('System Context localizes only explicitly owned backend presentation while preserving unknown server/business prose as raw data.');

for (const permissionAnchor of [
  'hasPermission(TENANT_PERMISSIONS.ALERTS_READ)',
  'hasPermission(TENANT_PERMISSIONS.STOCK_READ)',
  'hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ)',
  'hasPermission(TENANT_PERMISSIONS.REPORTS_READ)',
  'hasPermission(TENANT_PERMISSIONS.AUDIT_READ)',
  'hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)'
]) {
  if (!page.includes(permissionAnchor)) fail(`System Context source-workflow link permission gate missing: ${permissionAnchor}`);
}
if (!page.includes("case 'access':") || !page.includes("{ to: '/audit', label: ui('Open Audit') }")) {
  fail('System Context access/support-session evidence no longer routes to tenant Audit when permitted.');
}
if (!process.exitCode) pass('System Context aggregate read stays independent while direct source-workflow links fail closed on the destination permission.');


if (backendRoute) {
  for (const anchor of [
    'const requireSystemContextRead = requirePermission(TENANT_PERMISSIONS.SYSTEM_CONTEXT_READ);',
    'const requireSystemContextGovern = requirePermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN);',
    "'/execution-gate'",
    "'/snapshots/compare/latest'",
    "'/snapshots/forecast-scenarios'",
    "'/snapshots/forecast-scenarios/capture'",
    "'/snapshots/forecast-scenarios/history'",
    "'/snapshots/capture'",
    "'/snapshots/:id'"
  ]) if (!backendRoute.includes(anchor)) fail(`System Context backend route contract changed or missing: ${anchor}`);
  for (const postRoute of ["'/snapshots/forecast-scenarios/capture'", "'/snapshots/capture'"]) {
    const start = backendRoute.indexOf(postRoute);
    const block = start >= 0 ? backendRoute.slice(start, start + 320) : '';
    if (!block.includes('requireSystemContextRead') || !block.includes('requireSystemContextGovern')) fail(`System Context governed analytical capture lost read/govern permission chaining: ${postRoute}`);
  }
  if (!process.exitCode) pass('Backend System Context reads remain SYSTEM_CONTEXT_READ; analytical snapshot/scenario persistence additionally requires DECISION_INTELLIGENCE_GOVERN.');
}

if (!process.exitCode) console.log('Tenant System Context multilingual check passed.');
