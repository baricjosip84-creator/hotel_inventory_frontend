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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_waiver_escalation_matrix"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_closure_monitoring_plan"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review waiver escalation/closure multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_waiver_escalation_matrix', 'runtime_waiver_closure_board']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Waiver escalation/closure contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Waiver Escalation Matrix and Runtime Waiver Closure Board remain present and ordered before post-closure monitoring.');

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
if (missingLiterals.length) fail(`Waiver escalation/closure ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Waiver escalation/closure slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Escalation required before commercial AI enablement', 'Owner follow-up required before enablement',
  'Executive sponsor, product owner, operations owner and security owner',
  'Product owner, operations owner and support owner', 'Feature owner',
  'Executive runtime AI waiver escalation required before enablement',
  'Product/operations runtime AI waiver escalation required before enablement',
  'Runtime AI waiver owner follow-up required before enablement', 'No runtime waiver escalations required',
  'Closure blocked by open runtime gaps', 'Closure ready for manual operator review',
  'Product owner, operations owner, support owner and feature owner', 'Feature owner and operations owner',
  'Executive runtime AI waiver closure required before enablement',
  'Product/operations runtime AI waiver closure required before enablement',
  'Runtime AI waiver closure required before enablement', 'Runtime AI waiver closure ready for operator review',
  'No runtime waiver closure rows required',
  'No backend endpoint registered for feature', 'No frontend consumer registered for feature',
  'No tenant runtime evidence rows', 'Registered evidence schema not fully present'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Waiver escalation/closure canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} waiver escalation, closure, owner, priority, and runtime-gap labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime waiver escalation matrix<', '>Escalation rows<', '>Executive escalations<', '>Product/ops escalations<',
  '>Escalation release status<', '>Waiver escalation rows<', '>No runtime waiver escalations reported.<',
  '>Intelligence runtime waiver closure board<', '>Closure rows<', '>Blocked closures<', '>Executive blocked closures<',
  '>Closure release status<', '>Waiver closure rows<', '>No runtime waiver closure rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Waiver escalation/closure slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Waiver escalation/closure frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverEscalationMatrix?.escalation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverEscalationMatrix?.tier_1_executive_escalation_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverEscalationMatrix?.tier_2_product_operations_escalation_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverClosureBoard?.closure_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverClosureBoard?.blocked_closure_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverClosureBoard?.executive_blocked_closure_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Waiver escalation/closure locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Waiver escalation/closure summary counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimeWaiverEscalationMatrix?.escalation_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_tier || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.escalation_owner_hint || 'not_reported', ui)",
  'row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui))',
  "readinessCoreLabel(aiRuntimeWaiverClosureBoard?.closure_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.closure_readiness_status || 'not_reported', ui)",
  "readinessCoreLabel(row.closure_owner_hint || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known waiver escalation/closure canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, tiers, escalation/closure states, owner hints, and runtime-gap codes use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_waiver_escalation_matrix'", "'runtime_waiver_closure_board'", "'runtime_post_closure_monitoring_plan'",
  'tier_1_executive_escalation', 'tier_2_product_operations_escalation', 'tier_3_owner_followup',
  'escalation_required_before_commercial_ai_enablement', 'closure_blocked_by_open_runtime_gaps'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Waiver escalation/closure canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')", "ui('runtime_waiver_escalation_matrix')", "ui('runtime_waiver_closure_board')",
  "ui('tier_1_executive_escalation')", "ui('escalation_required_before_commercial_ai_enablement')", "ui('closure_blocked_by_open_runtime_gaps')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical waiver escalation/closure identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, escalation/closure identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.escalation_due_policy || ui("Not reported")', 'row.executive_release_condition || ui("Not reported")',
  'row.closure_due_policy || ui("Not reported")', 'row.closure_release_condition || ui("Not reported")',
  "row.closure_evidence_required.join(', ')", 'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend waiver escalation/closure data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.escalation_due_policy)', 'ui(row.executive_release_condition)',
  'ui(row.closure_due_policy)', 'ui(row.closure_release_condition)', 'ui(row.closure_evidence_required', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned waiver escalation/closure content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, due/release conditions, closure-evidence codes, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Waiver escalation/closure slice must remain presentation-only and must not introduce mutation calls.');
else pass('Waiver escalation/closure slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review waiver escalation/closure multilingual hardening: PASS');
