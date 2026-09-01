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

const startMarker = '<div className="card__label">{ui("Production validation suite")}</div>';
const endMarker = '<div className="card__label">{ui("Production remediation workbench")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Production Validation Suite / Signoff Checklist multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const label of ['Production validation suite', 'Production signoff checklist']) {
  if (!slice.includes(`ui("${label}")`) && !slice.includes(`ui('${label}')`)) fail(`Localized section missing: ${label}`);
}
if (!process.exitCode) pass('Production Validation Suite and Signoff Checklist are inside the bounded multilingual slice.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Validation/signoff ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Validation/signoff slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Blocked by critical/high evidence gaps',
  'Tenant isolation review required',
  'Ready for targeted regression execution',
  'Blocked until evidence is available',
  'Requires tenant isolation review',
  'Ready for targeted regression tests',
  'Watch before final tests',
  'Ready for final tests',
  'Ready for final testing',
  'Blocked',
  'Fail',
  'Pass',
  'Watch',
  'Critical',
  'High',
  'Medium',
  'Low'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical validation/signoff display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} validation/signoff state, priority, and result display labels are catalog-backed.`);

const forbidden = [
  '>Production validation suite<',
  '>Validation:',
  '>Cases:',
  '>Ready:',
  '>Blocked:',
  '>Tenant review:',
  '>Blocked validation cases<',
  '>Missing tables:',
  '>Empty tenant tables:',
  '>Tenant isolation review cases<',
  '>Required global assertions<',
  '>Suggested validation commands<',
  '>Production signoff checklist<',
  '>Checklist:',
  '>Features:',
  '>Passed:',
  '>Failed:',
  '>Blocked features:',
  '>Blocked signoff features<',
  '>Watch-before-final-test features<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only validation/signoff presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned validation/signoff presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(validationSuite?.totals?.validation_case_count), locale)',
  'formatLocalizedNumber(numberValue(validationSuite?.totals?.ready_case_count), locale)',
  'formatLocalizedNumber(numberValue(validationSuite?.totals?.blocked_case_count), locale)',
  'formatLocalizedNumber(numberValue(validationSuite?.totals?.tenant_isolation_review_case_count), locale)',
  'formatLocalizedNumber(numberValue(item.evidence_preconditions?.missing_tables?.length), locale)',
  'formatLocalizedNumber(numberValue(item.evidence_preconditions?.empty_tenant_tables?.length), locale)',
  'formatLocalizedNumber(numberValue(item.evidence_preconditions?.unscoped_tables?.length), locale)',
  'formatLocalizedNumber(numberValue(validationReadyCases.length), locale)',
  'formatLocalizedNumber(numberValue(signoffChecklist?.totals?.feature_count), locale)',
  'formatLocalizedNumber(numberValue(signoffChecklist?.totals?.pass_count), locale)',
  'formatLocalizedNumber(numberValue(signoffChecklist?.totals?.watch_count), locale)',
  'formatLocalizedNumber(numberValue(signoffChecklist?.totals?.fail_count), locale)',
  'formatLocalizedNumber(numberValue(signoffChecklist?.totals?.blocked_feature_count), locale)',
  'formatLocalizedNumber(numberValue(feature.failed_item_count), locale)',
  'formatLocalizedNumber(numberValue(feature.watch_item_count), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware validation/signoff number formatting missing: ${value}`);
if (!process.exitCode) pass('Validation/signoff counts use the selected locale.');

const display = [
  'readinessCoreLabel(validationSuite?.validation_status, ui)',
  'readinessCoreLabel(item.validation_status, ui)',
  'readinessCoreLabel(item.production_priority, ui)',
  'readinessCoreLabel(signoffChecklist?.checklist_status, ui)',
  'readinessCoreLabel(feature.production_priority, ui)',
  'readinessCoreLabel(feature.production_status, ui)',
  'readinessCoreLabel(feature.signoff_status, ui)'
];
for (const value of display) if (!slice.includes(value)) fail(`Localized validation/signoff display mapping missing: ${value}`);
if (!process.exitCode) pass('Known validation/signoff canonical states use localized display mapping.');

const systemPresentation = [
  'localizedReadinessSystemText(validationSuite.safety_rule, ui)',
  'localizedReadinessSystemText(item.feature_label, ui)',
  'validationGlobalAssertions.map((item)',
  'localizedReadinessSystemText(item, ui)',
  'localizedReadinessSystemText(signoffChecklist.release_rule, ui)',
  'localizedReadinessSystemText(feature.feature_label, ui)'
];
for (const value of systemPresentation) if (!slice.includes(value)) fail(`System-owned validation/signoff localization missing: ${value}`);
const preservedData = ['validationCommands.map((item)', 'validationSuiteQuery.error.message', 'signoffChecklistQuery.error.message'];
for (const value of preservedData) if (!slice.includes(value)) fail(`Validation command/API-error boundary missing: ${value}`);
for (const value of ['localizedReadinessSystemText(validationCommands', 'ui(validationSuiteQuery.error.message)', 'ui(signoffChecklistQuery.error.message)']) if (slice.includes(value)) fail(`Validation commands and API errors must remain untranslated: ${value}`);
if (!process.exitCode) pass('System-owned validation/signoff rules and assertions are localized while commands and API errors remain data.');

const canonical = [
  'blocked_by_critical_high_evidence_gaps',
  'tenant_isolation_review_required',
  'ready_for_targeted_regression_execution',
  'blocked_until_evidence_is_available',
  'requires_tenant_isolation_review',
  'ready_for_targeted_regression_tests',
  'watch_before_final_tests',
  'ready_for_final_tests',
  'ready_for_final_testing'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical validation/signoff identifier missing: ${value}`);
for (const value of canonical) if (pageSource.includes(`ui('${value}')`) || pageSource.includes(`ui("${value}")`)) fail(`Canonical validation/signoff identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Validation/signoff canonical identifiers remain language-independent.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Validation/signoff slice must remain presentation-only and must not introduce mutation calls.');
else pass('Production Validation Suite / Signoff Checklist slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}

if (!process.exitCode) pass('Tenant Intelligence Review Production Validation & Signoff multilingual gate passed.');
