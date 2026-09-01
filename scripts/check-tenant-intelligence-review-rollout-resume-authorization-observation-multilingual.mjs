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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_resume_authorization_ledger"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_post_enablement_rollout_scope_expansion_authorization_board"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review rollout-resume authorization/observation multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_post_enablement_rollout_resume_authorization_ledger', 'runtime_post_enablement_rollout_resume_observation_board']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Rollout-resume authorization/observation contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Post-Enablement Rollout Resume Authorization Ledger and Observation Board remain present and ordered before Scope Expansion Authorization Board.');

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
if (missingLiterals.length) fail(`Rollout-resume authorization/observation ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Rollout-resume authorization/observation slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Rollout resume authorization blocked until prevention verification and runtime gap controls are closed',
  'Manual rollout resume authorization ready after prevention verification backlog',
  'No runtime AI post-enablement rollout resume authorization rows required',
  'Executive sponsor, product owner, customer success owner, support owner and runtime health owner',
  'Product operations owner, product owner, customer success owner, support owner and runtime health owner',
  'Feature owner, customer success owner, support owner and runtime health owner',
  'Same business day until executive rollout resume authorization is recorded',
  'Next business day until product operations rollout resume authorization is recorded',
  'Weekly until owner rollout resume authorization is recorded',
  'Post-resume observation blocked until rollout resume authorization and runtime gap controls are closed',
  'Manual post-resume observation ready after rollout resume authorization',
  'No runtime AI post-enablement rollout resume observation rows required',
  'Executive sponsor, runtime health owner, customer success owner and support owner',
  'Product operations owner, runtime health owner, customer success owner and support owner',
  'Feature owner, runtime health owner, customer success owner and support owner',
  'Critical AI features require same business day post-resume observation until executive acceptance',
  'High-priority AI features require next business day post-resume observation until product operations acceptance',
  'Runtime AI features require weekly post-resume observation until owner acceptance'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Rollout-resume authorization/observation canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} authorization, observation, owner, cadence/window, priority, and tier labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime post-enablement rollout resume authorization ledger<', '>Authorization rows<', '>Blocked authorization rows<',
  '>Executive authorization rows<', '>Authorization status<', '>Post-enablement rollout resume authorization rows<',
  '>No post-enablement rollout-resume authorization rows reported.<',
  '>Intelligence runtime post-enablement rollout resume observation board<', '>Observation rows<', '>Blocked observation rows<',
  '>Executive observation rows<', '>Observation status<', '>Post-resume observation rows<', '>No post-resume observation rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Rollout-resume authorization/observation slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Rollout-resume authorization/observation frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.blocked_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.executive_authorization_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.blocked_observation_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.executive_observation_row_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Rollout-resume authorization/observation locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Rollout-resume authorization/observation summary counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.rollout_resume_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_tier || 'unknown', ui)",
  "readinessCoreLabel(row.rollout_resume_authorization_status || 'not_reported', ui)",
  "readinessCoreLabel(row.authorization_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.authorization_review_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostEnablementRolloutResumeObservationBoard?.post_resume_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.post_resume_observation_status || 'not_reported', ui)",
  "readinessCoreLabel(row.observation_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.observation_window_policy || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known rollout-resume authorization/observation canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, tiers, authorization/observation states, owner hints, and cadence/window policies use localized display mapping.');

const canonicalContracts = [
  "production-readiness-summary${forceRefresh ? '?refresh=true' : ''}",
  "'runtime_post_enablement_rollout_resume_authorization_ledger'", "'runtime_post_enablement_rollout_resume_observation_board'", "'runtime_post_enablement_rollout_scope_expansion_authorization_board'",
  'rollout_resume_authorization_blocked_until_prevention_verification_and_runtime_gap_controls_are_closed',
  'manual_rollout_resume_authorization_ready_after_prevention_verification_backlog',
  'post_resume_observation_blocked_until_rollout_resume_authorization_and_runtime_gap_controls_are_closed',
  'manual_post_resume_observation_ready_after_rollout_resume_authorization'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Rollout-resume authorization/observation canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')",
  "ui('runtime_post_enablement_rollout_resume_authorization_ledger')", "ui('runtime_post_enablement_rollout_resume_observation_board')",
  "ui('rollout_resume_authorization_blocked_until_prevention_verification_and_runtime_gap_controls_are_closed')",
  "ui('post_resume_observation_blocked_until_rollout_resume_authorization_and_runtime_gap_controls_are_closed')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical rollout-resume authorization/observation identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, authorization/observation identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.authorization_decision_rule || ui("Not reported")',
  'row.tenant_scope_resume_condition || ui("Not reported")',
  'row.rollback_reconfirmation_condition || ui("Not reported")',
  'row.customer_success_resume_condition || ui("Not reported")',
  'row.post_resume_monitoring_condition || ui("Not reported")',
  "row.required_rollout_resume_authorization_evidence.join(', ')",
  'row.tenant_scope_observation_condition || ui("Not reported")',
  'row.runtime_health_metric_condition || ui("Not reported")',
  'row.customer_success_feedback_condition || ui("Not reported")',
  'row.rollback_readiness_condition || ui("Not reported")',
  'row.rollout_scope_expansion_condition || ui("Not reported")',
  "row.required_post_resume_observation_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend rollout-resume authorization/observation data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.authorization_decision_rule)', 'ui(row.tenant_scope_resume_condition)',
  'ui(row.rollback_reconfirmation_condition)', 'ui(row.customer_success_resume_condition)', 'ui(row.post_resume_monitoring_condition)',
  'ui(row.required_rollout_resume_authorization_evidence', 'ui(row.tenant_scope_observation_condition)',
  'ui(row.runtime_health_metric_condition)', 'ui(row.customer_success_feedback_condition)', 'ui(row.rollback_readiness_condition)',
  'ui(row.rollout_scope_expansion_condition)', 'ui(row.required_post_resume_observation_evidence', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned rollout-resume authorization/observation content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, authorization/observation conditions, evidence codes, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Rollout-resume authorization/observation slice must remain presentation-only and must not introduce mutation calls.');
else pass('Rollout-resume authorization/observation slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review rollout-resume authorization/observation multilingual hardening: PASS');
