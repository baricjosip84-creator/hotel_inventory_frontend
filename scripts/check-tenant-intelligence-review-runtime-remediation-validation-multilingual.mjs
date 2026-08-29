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
  } catch { /* ignore non-row TypeScript */ }
}
const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);

const start = pageSource.indexOf('data-ai-contract-panel="runtime_remediation_worklist"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_signoff_evidence_ledger"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review runtime remediation/validation multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);

for (const panel of ['runtime_remediation_worklist', 'runtime_validation_drill']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Runtime remediation/validation contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Remediation Worklist and Runtime Validation Drill remain present and ordered before the signoff ledger.');

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literalKeys = [];
for (const match of sliceSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript catches malformed literals */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Runtime remediation/validation ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Runtime remediation/validation slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Backend platform owner', 'Frontend product owner',
  'Blocks or requires waiver for commercial AI release', 'Watch item for commercial AI release',
  'Runtime remediation required before unwaived commercial release', 'Runtime remediation watch items present', 'Runtime remediation worklist clear',
  'Blocking runtime validation drill required', 'Runtime validation drill recommended',
  'Runtime validation drill required before unwaived commercial release', 'Runtime validation drill watch items present', 'Runtime validation drill clear',
  'Runtime coverage gaps detected', 'Runtime coverage contracts present', 'Runtime coverage gap detected', 'Runtime coverage contract present',
  'No backend endpoint registered for feature', 'No frontend consumer registered for feature',
  'No tenant runtime evidence rows', 'Registered evidence schema not fully present'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Runtime remediation/validation canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} runtime remediation, validation, owner, release, priority, and gap labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime remediation worklist<', '>Remediation items<', '>Blocking items<', '>Highest urgency<', '>Release status<',
  '>Prioritized runtime remediation items<', '>Intelligence runtime validation drill<', '>Drill items<', '>Blocking drill items<',
  '>Drill release status<', '>Runtime coverage status<', '>Runtime validation drill rows<', '>No runtime remediation items reported.<',
  '>No runtime validation drill items reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Runtime remediation/validation slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Runtime remediation/validation frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimeRemediationWorklist?.total_runtime_remediation_items), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeRemediationWorklist?.blocking_runtime_remediation_items), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeRemediationWorklist?.highest_urgency_score), locale)',
  'formatLocalizedNumber(numberValue(item.urgency_score), locale)',
  'formatLocalizedNumber(numberValue(item.runtime_coverage_score), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeValidationDrill?.total_drill_items), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeValidationDrill?.blocking_drill_items), locale)',
  'formatLocalizedNumber(numberValue(row.urgency_score), locale)',
  'formatLocalizedNumber(numberValue(row.current_backend_endpoint_count), locale)',
  'formatLocalizedNumber(numberValue(row.current_frontend_consumer_count), locale)',
  'formatLocalizedNumber(numberValue(row.current_tenant_runtime_evidence_rows), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Runtime remediation/validation locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Runtime remediation/validation counts, urgency scores, coverage percentages, and evidence counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimeRemediationWorklist?.commercial_release_status || 'not_reported', ui)",
  "readinessCoreLabel(item.production_priority || 'unknown', ui)",
  "readinessCoreLabel(item.owner_hint || 'unknown', ui)",
  "readinessCoreLabel(item.commercial_release_impact || 'not_reported', ui)",
  'item.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui))',
  "readinessCoreLabel(aiRuntimeValidationDrill?.drill_release_status || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimeValidationDrill?.runtime_coverage_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.drill_status || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known runtime remediation/validation canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known runtime priorities, owner hints, release impacts/statuses, drill statuses, and gap codes use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_remediation_worklist'", "'runtime_validation_drill'", "'runtime_signoff_evidence_ledger'",
  'runtime_remediation_required_before_unwaived_commercial_release', 'blocks_or_requires_waiver_for_commercial_ai_release',
  'blocking_runtime_validation_drill_required', 'runtime_validation_drill_required_before_unwaived_commercial_release',
  'backend_platform_owner', 'frontend_product_owner'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Runtime remediation/validation canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')", 'ui("/intelligence-readiness/production-readiness-summary")',
  "ui('runtime_remediation_worklist')", "ui('runtime_validation_drill')", "ui('runtime_signoff_evidence_ledger')",
  "ui('blocking_runtime_validation_drill_required')", "ui('backend_platform_owner')", "ui('blocks_or_requires_waiver_for_commercial_ai_release')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical runtime remediation/validation identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, owner/status/action identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{item.feature_label}</strong>', "item.recommended_next_actions.join(', ')", '<strong>{row.feature_label}</strong>',
  "row.required_evidence_artifacts.join(', ')", "row.pass_criteria.join(', ')", "row.operator_drill_steps.join(', ')",
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend runtime remediation/validation data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(item.feature_label)', 'ui(item.recommended_next_actions', 'ui(row.feature_label)', 'ui(row.required_evidence_artifacts',
  'ui(row.pass_criteria', 'ui(row.operator_drill_steps', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned runtime remediation/validation content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, recommended actions, evidence artifact codes, pass criteria, drill steps, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Runtime remediation/validation slice must remain presentation-only and must not introduce mutation calls.');
else pass('Runtime remediation/validation slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review runtime remediation/validation multilingual hardening: PASS');
