import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/HumanInLoopAIReviewPage.tsx');
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

const startMarker = '<div className="card__label">{ui("Production operational runbook")}</div>';
const endMarker = '<div className="card__label">{ui("Production validation suite")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Production Operational Runbook multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
if (!slice.includes('ui("Production operational runbook")')) fail('Localized Production Operational Runbook heading missing.');
else pass('Production Operational Runbook is inside the bounded multilingual slice.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) {
  try { literals.push(decode(match[1])); } catch {}
}
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Runbook ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Runbook slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Final-test runbook ready',
  'Remediation runbook required',
  'Blocked — follow remediation sequence',
  'Watch — follow final-test sequence',
  'Ready for final-test sequence',
  'No-go — production blocked',
  'Conditional go — governance acceptance required',
  'Go — ready for final production tests',
  'Critical',
  'High',
  'Pass',
  'Watch',
  'Not reported'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical runbook display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} runbook, release, priority, and signoff display labels are catalog-backed.`);

const forbidden = [
  '>Production operational runbook<',
  '>Runbook:',
  '>Release:',
  '>Next actions:',
  '>Daily operator sequence<',
  '>Next operator actions<',
  '>First step:',
  '>Emergency stop conditions<',
  '>No blocked or watch operator actions reported by the runbook.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only runbook presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned runbook presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(nextOperatorActions.length, locale)',
  'formatLocalizedNumber(numberValue(action.readiness_score), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware runbook number formatting missing: ${value}`);
if (!process.exitCode) pass('Runbook action counts and readiness scores use the selected locale.');

const display = [
  'readinessCoreLabel(operationalRunbook?.runbook_status, ui)',
  'readinessCoreLabel(operationalRunbook?.release_decision?.recommendation, ui)',
  'readinessCoreLabel(action.runbook_status, ui)',
  'readinessCoreLabel(action.production_priority, ui)',
  'readinessCoreLabel(action.signoff_status, ui)'
];
for (const value of display) if (!slice.includes(value)) fail(`Localized runbook display mapping missing: ${value}`);
if (!process.exitCode) pass('Known runbook/release/priority/signoff canonical values use localized display mapping.');

const systemPresentation = [
  'localizedReadinessSystemText(operationalRunbook.operator_warning, ui)',
  'dailyOperatorSequence.map((item)',
  'localizedReadinessOperatorInstruction(item, locale, ui)',
  'localizedReadinessSystemText(action.feature_label, ui)',
  'localizedReadinessOperatorInstruction(action.operator_sequence[0], locale, ui)',
  'emergencyStopConditions.map((item)'
];
for (const value of systemPresentation) if (!slice.includes(value)) fail(`System-owned runbook localization missing: ${value}`);
if (!slice.includes('operationalRunbookQuery.error.message')) fail('Runbook API-error boundary missing.');
for (const value of ['ui(operationalRunbookQuery.error.message)', 'localizedReadinessSystemText(operationalRunbookQuery.error.message']) if (slice.includes(value)) fail(`Runbook API errors must remain untranslated: ${value}`);
if (!process.exitCode) pass('System-owned runbook guidance is localized explicitly while API errors remain data.');

const canonical = [
  'final_test_runbook_ready',
  'remediation_runbook_required',
  'blocked_follow_remediation_sequence',
  'watch_follow_final_test_sequence',
  'ready_for_final_test_sequence'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical runbook identifier missing: ${value}`);
for (const value of canonical) if (pageSource.includes(`ui('${value}')`) || pageSource.includes(`ui("${value}")`)) fail(`Canonical runbook identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Runbook canonical identifiers remain language-independent.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Runbook slice must remain presentation-only and must not introduce mutation calls.');
else pass('Production Operational Runbook slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
