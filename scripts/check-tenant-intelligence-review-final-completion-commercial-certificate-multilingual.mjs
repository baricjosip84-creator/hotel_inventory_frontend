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
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const start = pageSource.indexOf('data-ai-contract-panel="final_completion_freeze_manifest"');
const end = pageSource.indexOf('data-ai-contract-panel="contract_freeze_manifest"', start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Final Completion Freeze / Commercial Completion multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const panel of ['final_completion_freeze_manifest', 'commercial_completion_certificate']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Final Completion Freeze and Commercial Completion panels remain present and ordered before Contract Freeze Manifest.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Final completion/commercial certificate ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Final completion/commercial certificate slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Not reported',
  'Final completion freeze blocked until final governance audit is ready',
  'Manual final completion freeze ready for owner acceptance',
  'No runtime AI final completion freeze rows required',
  'AI governance owner, product owner, operations owner, customer success owner and support owner',
  'Commercial completion certificate blocked until final freeze rows are ready',
  'Manual commercial completion certificate ready for owner acceptance',
  'No runtime AI commercial completion certificate rows required',
  'Not code complete until final freeze blockers are closed',
  'Code track complete pending manual owner acceptance and external runtime proof',
  'AI governance owner, product owner, customer success owner, support owner and operations owner'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} final-freeze/certificate states and owner labels are catalog-backed.`);

const forbidden = [
  '>Intelligence final completion freeze manifest<', '>Freeze rows<', '>No final completion freeze rows reported.<',
  '>Intelligence commercial completion certificate<', '>Certificate rows<', '>No commercial completion certificate rows reported.<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned final-freeze/commercial-certificate presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiFinalCompletionFreezeManifest?.final_completion_freeze_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiFinalCompletionFreezeManifest?.blocked_final_completion_freeze_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiFinalCompletionFreezeManifest?.ready_final_completion_freeze_row_count), locale)',
  'formatLocalizedNumber(aiBlockedFinalCompletionFreezeRows.length, locale)',
  'formatLocalizedNumber(numberValue(aiCommercialCompletionCertificate?.commercial_completion_certificate_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialCompletionCertificate?.blocked_commercial_completion_certificate_row_count), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialCompletionCertificate?.ready_commercial_completion_certificate_row_count), locale)',
  'formatLocalizedNumber(aiBlockedCommercialCompletionCertificateRows.length, locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Final freeze and commercial certificate counts use the selected locale.');

const display = [
  "readinessCoreLabel(aiFinalCompletionFreezeManifest?.final_completion_freeze_status || 'not_reported', ui)",
  "readinessCoreLabel(row.final_completion_freeze_status || 'not_reported', ui)",
  "readinessCoreLabel(row.final_completion_freeze_owner_hint || 'not_reported', ui)",
  "readinessCoreLabel(aiCommercialCompletionCertificate?.commercial_completion_certificate_status || 'not_reported', ui)",
  "readinessCoreLabel(aiCommercialCompletionCertificate?.ai_governance_code_track_status || 'not_reported', ui)",
  "readinessCoreLabel(row.commercial_completion_certificate_status || 'not_reported', ui)",
  "readinessCoreLabel(row.commercial_completion_certificate_owner_hint || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known final-freeze/certificate states and owner hints use localized display mapping.');

const canonical = [
  "apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary')",
  "'final_completion_freeze_manifest'", "'commercial_completion_certificate'", "'contract_freeze_manifest'",
  'final_completion_freeze_blocked_until_final_governance_audit_is_ready',
  'manual_final_completion_freeze_ready_for_owner_acceptance',
  'commercial_completion_certificate_blocked_until_final_freeze_rows_are_ready',
  'manual_commercial_completion_certificate_ready_for_owner_acceptance',
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('final_completion_freeze_manifest')", "ui('commercial_completion_certificate')", "ui('contract_freeze_manifest')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical states, and technical identifiers remain language-independent.');

const serverData = [
  'row.feature_label || row.feature_key || ui("AI feature")',
  'row.final_completion_freeze_release_rule || ui("Not reported")',
  'row.final_completion_contract_condition || ui("Not reported")',
  'row.final_completion_runtime_condition || ui("Not reported")',
  'row.final_completion_business_condition || ui("Not reported")',
  "row.required_final_completion_freeze_evidence.join(', ')",
  "formatLabel(aiCommercialCompletionCertificate?.ai_governance_next_best_move || 'not_reported')",
  "aiCommercialCompletionCertificate.remaining_external_proof_requirements.join(', ')",
  "aiCommercialCompletionCertificate.next_non_ai_track_recommendation.recommended_scope.join(', ')",
  'row.commercial_completion_certificate_rule || ui("Not reported")',
  'row.commercial_claim_rule || ui("Not reported")',
  'row.runtime_proof_condition || ui("Not reported")',
  'row.external_launch_condition || ui("Not reported")',
  "row.required_certificate_evidence.join(', ')"
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend-returned data boundary missing: ${value}`);
for (const value of ['ui(row.feature_label)', 'ui(row.final_completion_freeze_release_rule)', 'ui(row.final_completion_contract_condition)', 'ui(row.final_completion_runtime_condition)', 'ui(row.final_completion_business_condition)', 'ui(row.required_final_completion_freeze_evidence', 'ui(aiCommercialCompletionCertificate?.ai_governance_next_best_move', 'ui(aiCommercialCompletionCertificate.remaining_external_proof_requirements', 'ui(aiCommercialCompletionCertificate.next_non_ai_track_recommendation', 'ui(row.commercial_completion_certificate_rule)', 'ui(row.commercial_claim_rule)', 'ui(row.runtime_proof_condition)', 'ui(row.external_launch_condition)', 'ui(row.required_certificate_evidence', 'ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend feature labels, rules, proof/scope codes, evidence codes, and API errors remain data.');

if (slice.includes('apiRequest<') || slice.includes('method:')) fail('Slice must remain presentation-only and must not introduce mutation calls.');
else pass('Slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}

if (!process.exitCode) pass('Tenant Intelligence Review Final Completion & Commercial Certificate multilingual gate passed.');
