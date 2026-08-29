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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_post_closure_monitoring_plan"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_broad_release_readiness_board"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review post-closure monitoring/evidence-acceptance multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_post_closure_monitoring_plan', 'runtime_post_closure_evidence_acceptance_gate']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Post-closure monitoring/acceptance contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Post-Closure Monitoring Plan and Runtime Post-Closure Evidence Acceptance Gate remain present and ordered before broad-release readiness.');

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
if (missingLiterals.length) fail(`Post-closure monitoring/acceptance ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Post-closure monitoring/acceptance slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Tier 1 — Executive escalation', 'Tier 2 — Product/operations escalation', 'Tier 3 — Owner follow-up',
  'Monitoring blocked until runtime gaps are closed or time-boxed waiver is recorded',
  'Post-closure monitoring ready for operator execution',
  'Post-closure runtime monitoring blocked until closure or time-boxed waiver evidence exists',
  'Post-closure runtime monitoring ready for operator execution',
  'No post-closure runtime monitoring rows required',
  'Executive sponsor, product owner, operations owner, security owner and support owner',
  'Product owner, operations owner, support owner and feature owner',
  'Feature owner, operations owner and support owner',
  'Daily for first 7 days after closure, then weekly until runtime evidence is stable',
  'Twice weekly for first 14 days after closure, then weekly until runtime evidence is stable',
  'Weekly until runtime evidence is stable',
  'Evidence acceptance blocked until runtime gaps are closed or time-boxed waiver exists',
  'Post-closure evidence ready for manual acceptance review',
  'Post-closure runtime evidence acceptance blocked until monitoring evidence or time-boxed waiver exists',
  'No post-closure runtime evidence acceptance rows required'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Post-closure monitoring/acceptance canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} monitoring, acceptance, owner, cadence, priority, and tier labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime post-closure monitoring plan<', '>Monitoring rows<', '>Blocked monitoring<', '>Executive monitoring<',
  '>Monitoring release status<', '>Post-closure monitoring rows<', '>No post-closure runtime monitoring rows reported.<',
  '>Intelligence runtime post-closure evidence acceptance gate<', '>Acceptance rows<', '>Blocked acceptance<', '>Executive acceptance<',
  '>Acceptance release status<', '>Evidence acceptance rows<', '>No post-closure evidence acceptance rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Post-closure monitoring/acceptance slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Post-closure monitoring/acceptance frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimePostClosureMonitoringPlan?.monitoring_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostClosureMonitoringPlan?.blocked_monitoring_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostClosureMonitoringPlan?.executive_monitoring_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.acceptance_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.blocked_acceptance_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.executive_acceptance_row_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Post-closure monitoring/acceptance locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Post-closure monitoring/acceptance summary counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimePostClosureMonitoringPlan?.monitoring_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.escalation_tier || 'unknown', ui)",
  "readinessCoreLabel(row.monitoring_status || 'not_reported', ui)",
  "readinessCoreLabel(row.monitoring_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(row.monitoring_cadence || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimePostClosureEvidenceAcceptanceGate?.evidence_acceptance_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.evidence_acceptance_status || 'not_reported', ui)",
  "readinessCoreLabel(row.acceptance_owner_hint || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known post-closure monitoring/acceptance canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, tiers, monitoring/acceptance states, owner hints, and monitoring cadence use localized display mapping.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'runtime_post_closure_monitoring_plan'", "'runtime_post_closure_evidence_acceptance_gate'", "'runtime_broad_release_readiness_board'",
  'monitoring_blocked_until_runtime_gaps_are_closed_or_time_boxed_waiver_is_recorded',
  'post_closure_monitoring_ready_for_operator_execution',
  'evidence_acceptance_blocked_until_runtime_gaps_are_closed_or_time_boxed_waiver_exists',
  'post_closure_evidence_ready_for_manual_acceptance_review'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Post-closure monitoring/acceptance canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')",
  "ui('runtime_post_closure_monitoring_plan')", "ui('runtime_post_closure_evidence_acceptance_gate')",
  "ui('monitoring_blocked_until_runtime_gaps_are_closed_or_time_boxed_waiver_is_recorded')",
  "ui('post_closure_evidence_ready_for_manual_acceptance_review')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical post-closure monitoring/acceptance identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, monitoring/acceptance identifiers, and backend contracts remain language-independent.');

const serverDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  'row.release_monitoring_condition || ui("Not reported")',
  "row.required_monitoring_evidence.join(', ')",
  'row.acceptance_due_policy || ui("Not reported")',
  'row.acceptance_release_condition || ui("Not reported")',
  "row.required_acceptance_evidence.join(', ')",
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Backend post-closure monitoring/acceptance data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.release_monitoring_condition)', 'ui(row.required_monitoring_evidence',
  'ui(row.acceptance_due_policy)', 'ui(row.acceptance_release_condition)', 'ui(row.required_acceptance_evidence',
  'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned post-closure monitoring/acceptance content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, release conditions, due policy, evidence codes, and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Post-closure monitoring/acceptance slice must remain presentation-only and must not introduce mutation calls.');
else pass('Post-closure monitoring/acceptance slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review post-closure monitoring/acceptance multilingual hardening: PASS');
