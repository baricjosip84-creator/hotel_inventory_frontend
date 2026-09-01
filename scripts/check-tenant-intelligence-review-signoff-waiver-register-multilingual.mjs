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

const start = pageSource.indexOf('data-ai-contract-panel="runtime_signoff_evidence_ledger"');
const end = pageSource.indexOf('data-ai-contract-panel="runtime_waiver_escalation_matrix"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review runtime signoff/waiver-register multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);
for (const panel of ['runtime_signoff_evidence_ledger', 'runtime_waiver_review_register']) {
  if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Runtime signoff/waiver contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Runtime Signoff Evidence Ledger and Runtime Waiver Review Register remain present and ordered before the escalation matrix.');

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
if (missingLiterals.length) fail(`Runtime signoff/waiver-register ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Runtime signoff/waiver-register slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Not reported',
  'Runtime evidence ready for operator signoff', 'Blocking runtime evidence or waiver required', 'Runtime evidence watch item',
  'Manual runtime signoff waiver packet required', 'Runtime signoff watch item — no critical waiver required',
  'Runtime signoff evidence or waiver required before unwaived commercial release',
  'Runtime signoff evidence ready for operator review', 'Runtime signoff evidence watch items present',
  'Waiver review required before commercial enablement', 'Waiver watch review required',
  'Weekly until closed or disabled', 'Twice monthly until closed or disabled', 'Monthly until closed or disabled',
  'Executive product owner and operations owner', 'Product owner and operations owner',
  'Critical/high runtime waiver reviews required before commercial AI enablement',
  'Runtime waiver reviews required before enablement', 'No runtime waiver reviews required',
  'No backend endpoint registered for feature', 'No frontend consumer registered for feature',
  'No tenant runtime evidence rows', 'Registered evidence schema not fully present'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Runtime signoff/waiver-register canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} signoff, waiver, cadence, owner, priority, and gap labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence runtime signoff evidence ledger<', '>Evidence-ready features<', '>Blocking / waiver required<', '>Manual waiver packets<',
  '>Signoff readiness<', '>Signoff release status<', '>Runtime signoff evidence rows<', '>Manual waiver packet queue<',
  '>Intelligence runtime waiver review register<', '>Waiver review rows<', '>Critical/high reviews<', '>Review release status<',
  '>Waiver review register rows<', '>No runtime signoff evidence rows reported.<', '>No runtime waiver review rows reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Runtime signoff/waiver-register slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Runtime signoff/waiver-register frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.evidence_ready_feature_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.blocking_or_waiver_required_feature_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.manual_waiver_packet_required_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.signoff_readiness_percent), locale)',
  'formatLocalizedNumber(numberValue(row.runtime_coverage_score), locale)',
  'formatLocalizedNumber(numberValue(row.backend_endpoint_count), locale)',
  'formatLocalizedNumber(numberValue(row.frontend_consumer_count), locale)',
  'formatLocalizedNumber(numberValue(row.tenant_runtime_evidence_rows), locale)',
  'formatLocalizedNumber(numberValue(row.existing_evidence_table_count), locale)',
  'formatLocalizedNumber(numberValue(row.expected_evidence_table_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverReviewRegister?.waiver_review_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiRuntimeWaiverReviewRegister?.critical_high_waiver_review_count), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Runtime signoff/waiver-register locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Signoff/waiver counts, coverage, readiness percentages, and schema/evidence counts use the selected application locale.');

const displayContracts = [
  "readinessCoreLabel(aiRuntimeSignoffEvidenceLedger?.signoff_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.production_priority || 'unknown', ui)",
  "readinessCoreLabel(row.signoff_status || 'not_reported', ui)",
  'row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui))',
  "readinessCoreLabel(row.waiver_packet_status || 'not_reported', ui)",
  "readinessCoreLabel(aiRuntimeWaiverReviewRegister?.waiver_review_release_status || 'not_reported', ui)",
  "readinessCoreLabel(row.review_status || 'not_reported', ui)",
  "readinessCoreLabel(row.waiver_review_cadence || 'not_reported', ui)",
  "readinessCoreLabel(row.review_owner_hint || 'not_reported', ui)"
];
for (const contract of displayContracts) if (!sliceSource.includes(contract)) fail(`Known runtime signoff/waiver canonical value is not using localized display mapping: ${contract}`);
if (!process.exitCode) pass('Known priorities, signoff/waiver states, cadence, owner hints, and runtime gap codes use localized display mapping.');

const canonicalContracts = [
  "production-readiness-summary${forceRefresh ? '?refresh=true' : ''}",
  "'runtime_signoff_evidence_ledger'", "'runtime_waiver_review_register'", "'runtime_waiver_escalation_matrix'",
  'runtime_evidence_ready_for_operator_signoff', 'blocking_runtime_evidence_or_waiver_required',
  'manual_runtime_signoff_waiver_packet_required', 'waiver_review_required_before_commercial_enablement',
  'weekly_until_closed_or_disabled', 'executive_product_owner_and_operations_owner'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Runtime signoff/waiver canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')", 'ui("/intelligence-readiness/production-readiness-summary")',
  "ui('runtime_signoff_evidence_ledger')", "ui('runtime_waiver_review_register')", "ui('runtime_waiver_escalation_matrix')",
  "ui('runtime_evidence_ready_for_operator_signoff')", "ui('waiver_review_required_before_commercial_enablement')",
  "ui('weekly_until_closed_or_disabled')", "ui('executive_product_owner_and_operations_owner')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical runtime signoff/waiver identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, status/cadence/owner identifiers, and backend contracts remain language-independent.');

const localizedSystemContracts = [
  'localizedReadinessSystemText(row.feature_label, ui)',
  'localizedReadinessSystemText(row.signoff_evidence_statement, ui)',
  'localizedReadinessSystemList(row.pass_criteria, ui)',
  'localizedReadinessSystemText(row.release_rule, ui)'
];
for (const contract of localizedSystemContracts) if (!pageSource.includes(contract)) fail(`System-owned runtime signoff presentation is not localized explicitly: ${contract}`);
const canonicalDataContracts = [
  '<strong>{row.feature_label || row.feature_key}</strong>',
  "row.minimum_manual_waiver_fields?.join(', ')",
  'row.expiration_control || ui("Not reported")',
  'row.renewal_rule || ui("Not reported")',
  "row.closure_evidence_required.join(', ')",
  'readinessQuery.error instanceof ApiError',
  '? readinessQuery.error.message'
];
for (const contract of canonicalDataContracts) if (!pageSource.includes(contract)) fail(`Expected canonical runtime waiver/API data boundary missing: ${contract}`);
const forbiddenServerTranslation = [
  'ui(row.feature_label)', 'ui(row.signoff_evidence_statement)', 'ui(row.pass_criteria', 'ui(row.minimum_manual_waiver_fields',
  'ui(row.release_rule)', 'ui(row.expiration_control)', 'ui(row.renewal_rule)', 'ui(row.closure_evidence_required', 'ui(readinessQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned runtime signoff/waiver content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('System-owned signoff feature labels, evidence statements, release rules, and pass criteria use the readiness localization boundary; canonical waiver fields/rules and API errors remain data.');

if (sliceSource.includes('apiRequest<') || sliceSource.includes('method:')) fail('Runtime signoff/waiver-register slice must remain presentation-only and must not introduce mutation calls.');
else pass('Runtime signoff/waiver-register slice remains presentation-only and read-only.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review runtime signoff/waiver-register multilingual hardening: PASS');
