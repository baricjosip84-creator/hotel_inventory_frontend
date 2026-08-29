import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/OperationalActionCenterPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a translation row.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}

const literalKeys = [];
for (const match of pageSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript/lint catches malformed literals. */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Action Center has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Action Center has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const representativeRows = [
  'Action Center', 'Command & prioritization', 'Action inbox', 'Open actions shown', 'Highest urgency',
  'Approval gated', 'Execution mode', 'Recommended next step', 'How this page works', 'Refresh'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Action Center translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Action Center rows are present in all five locales.`);

const dynamicLabels = [
  'All domains', 'Alerts', 'Execution', 'Control tower', 'Decision intelligence', 'AI governance', 'Multi-domain',
  'All urgency', 'Critical', 'High', 'Medium', 'Low',
  'Open alert workflow', 'Open execution task', 'Open intelligence review', 'Open source workflow',
  'Approval required', 'Review required', 'In review', 'In progress', 'Escalated'
];
const missingDynamicLabels = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamicLabels.length) fail(`Action Center dynamic display labels are missing translations: ${missingDynamicLabels.join(' | ')}`);
else pass(`${dynamicLabels.length} dynamic Action Center labels are catalog-backed.`);

if (!pageSource.includes('useAppTranslation()')) fail('Action Center must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(value, locale)')) fail('Action Center timestamps must use locale-aware shared date/time formatting.');
if (!pageSource.includes('formatLocalizedNumber(')) fail('Action Center displayed numbers must use locale-aware formatting.');
else pass('Action Center dates and displayed numbers use the selected application locale.');

const forbiddenEnglishPresentation = [
  'eyebrow="Command & prioritization"', 'title="Action Center"', '>Action inbox<', '>Technical details<',
  '>Governance readiness details<', '>Read-only safety guarantees<', 'aria-label="Filter by action domain"',
  "? 'Refreshing…' : 'Refresh'", "? 'The requested action is highlighted below.'"
];
for (const pattern of forbiddenEnglishPresentation) {
  if (pageSource.includes(pattern)) fail(`Action Center still contains English-only presentation: ${pattern}`);
}

const forbiddenTechnicalTranslation = [
  "ui('/action-center')", 'ui("/action-center")', "ui('/operational-action-center/summary')", 'ui("/operational-action-center/summary")',
  "ui('all')", 'ui("all")', "ui('critical')", 'ui("critical")', "ui('control_tower')", 'ui("control_tower")',
  "ui('operational_action_center.read')", 'ui("operational_action_center.read")'
];
for (const pattern of forbiddenTechnicalTranslation) {
  if (pageSource.includes(pattern)) fail(`Canonical Action Center technical value must remain language-independent: ${pattern}`);
}

const canonicalContracts = [
  "apiRequest<ActionCenterResponse>(`/operational-action-center/summary?${params.toString()}`)",
  "params.set('action_domain', domain)", "params.set('urgency', urgency)",
  "paramName: 'domain'", "paramName: 'urgency'", "allowedValues: ACTION_DOMAIN_VALUES", "allowedValues: URGENCY_FILTER_VALUES",
  'hasPermission(TENANT_PERMISSIONS.ALERTS_READ)', 'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)',
  'hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)', 'hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Action Center API/filter/permission contract changed during localization: ${contract}`);

const routerContract = [
  "path: 'action-center'",
  'requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}',
  '<OperationalActionCenterPage />'
];
for (const contract of routerContract) if (!routerSource.includes(contract)) fail(`Action Center router permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Action Center route, query filters, permissions, and read-only backend endpoint remain language-independent.');

const serverContentContracts = [
  '{actionTitleLabel(action)}',
  "{action.summary || ui('No summary provided.')}",
  "{action.recommended_next_step || ui('Review source workflow before acting.')}"
];
for (const contract of serverContentContracts) if (!pageSource.includes(contract)) fail(`Action Center backend-returned content display contract changed: ${contract}`);
const forbiddenServerContentTranslation = ['ui(action.title)', 'ui(action.summary)', 'ui(action.recommended_next_step)'];
for (const pattern of forbiddenServerContentTranslation) if (pageSource.includes(pattern)) fail(`Backend-returned Action Center human content must not be blindly translated as a UI key: ${pattern}`);
if (!process.exitCode) pass('Backend-returned action titles, summaries, and recommended steps remain server content rather than UI translation keys.');

if (!process.exitCode) console.log('Tenant Action Center multilingual hardening: PASS');
