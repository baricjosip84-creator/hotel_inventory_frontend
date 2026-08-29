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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_incident_closure_board"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_resume_authorization_ledger"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review incident-closure/prevention-verification multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_incident_closure_board', 'runtime_post_enablement_prevention_verification_backlog']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Incident-closure/prevention-verification contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Post-Enablement Incident Closure Board and Prevention Verification Backlog remain present and ordered before Rollout Resume Authorization Ledger.');

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
if (missingLiterals.length) fail(`Incident-closure/prevention-verification ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Incident-closure/prevention-verification slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Incident closure blocked until runtime gaps and incident response controls are closed',
  'Manual incident closure ready after triage, rollback and customer communication review',
  'Manual incident closure ready after incident response queue',
  'No runtime AI post-enablement incident closure rows required',
  'Executive sponsor, incident commander, customer success owner, support owner and product owner',
  'Product operations owner, incident commander, customer success owner, support owner and product owner',
  'Feature owner, incident commander, customer success owner and support owner',
  'Same business day until critical AI incident closure is approved',
  'Next business day until high-priority AI incident closure is approved',
  'Weekly until watchlisted AI incident closure is approved',
  'Prevention verification blocked until incident closure and runtime gap controls are closed',
  'Manual prevention verification ready after incident closure board',
  'No runtime AI post-enablement prevention verification rows required',
  'Executive sponsor, product owner, incident commander, customer success owner and runtime monitoring owner',
  'Product operations owner, product owner, incident commander, customer success owner and runtime monitoring owner',
  'Feature owner, incident commander, customer success owner and runtime monitoring owner',
  'Same business day until critical AI prevention effectiveness is accepted',
  'Next business day until high-priority AI prevention effectiveness is accepted',
  'Weekly until post-incident prevention effectiveness is accepted'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Incident-closure/prevention canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} closure, prevention, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime post-enablement incident closure board<', '>Blocked closure rows<', '>Executive closure rows<',
  '>Closure status<', '>Post-enablement incident closure rows<', '>No post-enablement incident closure rows reported.<',
  '>Intelligence runtime post-enablement prevention verification backlog<', '>Prevention rows<', '>Blocked prevention rows<',
  '>Executive prevention rows<', '>Prevention status<', '>Post-enablement prevention verification rows<',
  '>No post-enablement prevention verification rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Incident-closure/prevention slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Incident-closure/prevention frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentClosureBoard?.closure_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentClosureBoard?.blocked_closure_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentClosureBoard?.executive_closure_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.prevention_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.blocked_prevention_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.executive_prevention_row_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Incident-closure/prevention locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Incident-closure/prevention summary counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimePostEnablementIncidentClosureBoard?.incident_closure_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_tier || 'unknown', ui)",
  "readinessCoreLabel(row.incident_closure_status || 'not_reported', ui)",
  "readinessCoreLabel(row.closure_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.closure_review_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementPreventionVerificationBacklog?.prevention_verification_status || 'not_reported', ui)",
  "readinessCoreLabel(row.prevention_verification_status || 'not_reported', ui)",
  "readinessCoreLabel(row.prevention_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.prevention_review_cadence || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known incident-closure/prevention canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, tiers, closure/prevention states, owner hints, and cadences use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_enablement_incident_closure_board'", "'runtime_post_enablement_prevention_verification_backlog'", "'runtime_post_enablement_rollout_resume_authorization_ledger'",
  'incident_closure_blocked_until_runtime_gaps_and_incident_response_controls_are_closed',
  'manual_incident_closure_ready_after_incident_response_queue',
  'prevention_verification_blocked_until_incident_closure_and_runtime_gap_controls_are_closed',
  'manual_prevention_verification_ready_after_incident_closure_board'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Incident-closure/prevention canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')",
  "ui('runtime_post_enablement_incident_closure_board')", "ui('runtime_post_enablement_prevention_verification_backlog')",
  "ui('incident_closure_blocked_until_runtime_gaps_and_incident_response_controls_are_closed')",
  "ui('prevention_verification_blocked_until_incident_closure_and_runtime_gap_controls_are_closed')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical incident-closure/prevention identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, closure/prevention identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.closure_decision_rule || ui("Not reported")',
  'row.rollout_resume_condition || ui("Not reported")',
  'row.prevention_action_condition || ui("Not reported")',
  'row.customer_follow_up_condition || ui("Not reported")',
  "row.required_incident_closure_evidence.join(', ')",
  'row.prevention_decision_rule || ui("Not reported")',
  'row.rollout_resume_guardrail || ui("Not reported")',
  'row.monitoring_reentry_condition || ui("Not reported")',
  'row.customer_success_follow_up_condition || ui("Not reported")',
  "row.required_prevention_verification_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend incident-closure/prevention data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.closure_decision_rule)', 'ui(row.rollout_resume_condition)', 'ui(row.prevention_action_condition)',
  'ui(row.customer_follow_up_condition)', 'ui(row.required_incident_closure_evidence', 'ui(row.prevention_decision_rule)',
  'ui(row.rollout_resume_guardrail)', 'ui(row.monitoring_reentry_condition)', 'ui(row.customer_success_follow_up_condition)',
  'ui(row.required_prevention_verification_evidence', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned incident-closure/prevention content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, decision/rollout/customer conditions, evidence codes, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Incident-closure/prevention slice must remain presentation-only and must not introduce mutation calls.');
else pass('Incident-closure/prevention slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review incident-closure/prevention-verification multilingual hardening: PASS');
