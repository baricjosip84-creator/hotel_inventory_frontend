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

const start = pageSource.indexOf('<div className="section__title">{ui("Intelligence feature readiness")}</div>');
const end = pageSource.indexOf('data-ai-contract-panel="governance_dashboard"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review readiness-core multilingual slice.');
  process.exit(1);
}
const coreSource = pageSource.slice(start, end);

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literalKeys = [];
for (const match of coreSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript catches malformed literals */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Readiness-core ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Readiness core has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low',
  'Production candidate — tests and hardening required', 'Implemented — tenant data and tests required', 'Architecture present — workflow completion required', 'Not production ready yet',
  'Near production ready', 'Production hardening required', 'Implementation completion required', 'Foundation only',
  'Read-only inventory; no AI execution or training', 'Read-only risk scoring; no AI execution or training', 'Read-only lineage trace; no AI execution or training',
  'Read-only rollback planning; no AI execution or state mutation', 'Read-only maturity audit; no AI execution or training',
  'Hardening or test gap', 'Tenant evidence gap', 'Critical risk', 'High risk', 'Moderate risk', 'Controlled risk',
  'Missing tenant evidence', 'Low readiness score', 'Operator monitoring required',
  'Lineage ready for commercial review', 'Lineage needs hardening', 'Lineage blocked', 'Registered endpoint', 'Frontend surface', 'Evidence table registry',
  'Tenant evidence rows', 'Governance or review endpoint', 'Human review surface',
  'Rollback ready', 'Rollback needs operator confirmation', 'Rollback blocked', 'Missing operator surface', 'Missing governance endpoint',
  'Missing tenant evidence for rollback decision', 'Insufficient decision lineage', 'High-risk, low-readiness feature',
  'Rollback path blocked until controls are completed', 'Manual rollback review required before enablement', 'Rollback path ready for commercial governance review',
  'Commercial-grade — ready for controlled customer enablement', 'Commercial candidate — final governance evidence required', 'Pilot ready — hardening required', 'Not commercial grade yet',
  'Pass', 'Watch', 'Blocker'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Readiness-core canonical labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} readiness/risk/lineage/rollback/maturity labels are catalog-backed.`);

const requiredPanels = ['capability_inventory', 'risk_scoring', 'decision_lineage', 'rollback_orchestration', 'maturity_self_audit'];
for (const panel of requiredPanels) if (!coreSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Readiness-core contract panel missing: ${panel}`);
if (!process.exitCode) pass('All five readiness-core contract panels remain present and ordered before governance_dashboard.');

const forbiddenEnglishPresentation = [
  '>Intelligence feature readiness<', '>Intelligence capability inventory<', '>Intelligence risk scoring<', '>Intelligence decision lineage<',
  '>Intelligence rollback orchestration<', '>Intelligence maturity self-audit<', '>Tracked capabilities<', '>Average AI risk<', '>Average lineage<',
  '>Average rollback score<', '>Maturity score<', '>Commercial-grade state<', '>No AI risk-scoring rows reported.<', '>No critical/high AI lineage gaps reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (coreSource.includes(pattern)) fail(`Readiness core still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Readiness-core frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(feature.readiness_score), locale)',
  'formatLocalizedNumber(numberValue(feature.evidence?.tenant_data_rows), locale)',
  'formatLocalizedNumber(numberValue(aiRiskScoring?.average_ai_risk_score), locale)',
  'formatLocalizedNumber(numberValue(feature.ai_risk_score), locale)',
  'formatLocalizedNumber(numberValue(aiDecisionLineage?.average_lineage_completeness_score), locale)',
  'formatLocalizedNumber(numberValue(feature.lineage_completeness_score), locale)',
  'formatLocalizedNumber(numberValue(aiRollbackOrchestration?.average_rollback_score), locale)',
  'formatLocalizedNumber(numberValue(feature.rollback_score), locale)',
  'formatLocalizedNumber(numberValue(aiMaturitySelfAudit?.maturity_score), locale)',
  'formatLocalizedNumber(numberValue(action.sequence), locale)'
];
for (const contract of localeContracts) if (!coreSource.includes(contract)) fail(`Readiness-core locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Readiness-core scores, counts, percentages, and sequence numbers use the selected application locale.');

const canonicalContracts = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'capability_inventory'", "'risk_scoring'", "'decision_lineage'", "'rollback_orchestration'", "'maturity_self_audit'",
  "production_candidate_needs_tests_and_hardening", "lineage_ready_for_commercial_review", "rollback_needs_operator_confirmation"
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Readiness canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')", 'ui("/intelligence-readiness/production-readiness-summary")',
  "ui('capability_inventory')", "ui('risk_scoring')", "ui('decision_lineage')", "ui('rollback_orchestration')", "ui('maturity_self_audit')",
  "ui('production_candidate_needs_tests_and_hardening')", "ui('lineage_ready_for_commercial_review')", "ui('rollback_needs_operator_confirmation')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical readiness identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, and canonical state identifiers remain language-independent.');

const serverDataContracts = [
  '<h3 style={{ marginTop: 0 }}>{feature.label}</h3>', 'feature.implemented_capabilities.slice(0, 3).join', 'feature.completion_gaps.slice(0, 3).join',
  '<h3 style={{ marginTop: 0 }}>{gap.capability_label}</h3>', '<p className="card__subtext">{gap.feature_label}</p>', '<p className="card__subtext">{gap.required_resolution}</p>',
  '<p className="card__subtext">{feature.required_control}</p>', '<p className="card__subtext">{feature.required_lineage_control}</p>',
  '<h3 style={{ marginTop: 0 }}>{action.check_label}</h3>', '<p className="card__subtext">{action.required_resolution}</p>',
  'readinessQuery.error instanceof ApiError', '? readinessQuery.error.message'
];
for (const contract of serverDataContracts) if (!coreSource.includes(contract)) fail(`Backend readiness/business-data boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(feature.label)', 'ui(gap.capability_label)', 'ui(gap.feature_label)', 'ui(gap.required_resolution)', 'ui(feature.required_control)',
  'ui(feature.required_lineage_control)', 'ui(action.check_label)', 'ui(action.required_resolution)', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (coreSource.includes(pattern)) fail(`Backend-returned readiness content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend feature labels, capability/gap text, required controls/resolutions, audit actions, and API errors remain data.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review readiness core multilingual hardening: PASS');
