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

const start = pageSource.indexOf('data-ai-contract-panel="contract_freeze_manifest"');
const end = pageSource.indexOf('<div className="card__label">{ui("Production audit pack")}</div>', start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Contract Freeze Manifest / Response Contract Audit multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const panel of ['contract_freeze_manifest', 'response_contract_audit']) {
  if (!slice.includes(`data-ai-contract-panel="${panel}"`)) fail(`Contract panel missing: ${panel}`);
}
if (!process.exitCode) pass('Contract Freeze Manifest and Response Contract Audit remain present and ordered before Production Audit Pack.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch { /* TypeScript catches malformed literals */ } }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Contract freeze/response audit ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Contract freeze/response audit slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Not reported',
  'Freeze drift detected', 'Freeze manifest aligned',
  'Contract drift detected', 'Contract frozen and aligned',
  'Frontend panel contract manifest aligned', 'Frontend panel contract manifest drift detected',
  'Frontend runtime DOM-anchor manifest drift detected', 'Frontend runtime DOM-anchor manifest aligned',
  'Frontend runtime DOM-anchor manifest order drift detected', 'Frontend runtime DOM-anchor manifest order aligned',
  'Aligned', 'Drift', 'Yes', 'No', 'yes', 'no', 'none', 'not registered'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} contract-freeze/audit states and UI values are catalog-backed.`);

const forbidden = [
  '>Intelligence contract freeze manifest<', '>Freeze status<', '>Registered key alignment<', '>Frozen / returned keys<',
  '>Intelligence response contract audit<', '>Contract status<', '>Expected / returned keys<', '>Safety-contract gaps<', '>Runtime anchor self-check<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned contract-freeze/response-audit presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(aiContractFreezeManifest?.registered_contract_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiContractFreezeManifest?.frozen_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiContractFreezeManifest?.returned_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.expected_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.returned_key_count), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.missing_response_keys?.length), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.unexpected_response_keys?.length), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.missing_or_unsafe_safety_contract_keys?.length), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.safety_contract_coverage_percent), locale)',
  'formatLocalizedNumber(numberValue(aiResponseContractAudit?.required_frontend_panel_count), locale)',
  'formatLocalizedNumber(numberValue(frontendRuntimeAnchorSelfCheck.backend_required_panel_count), locale)',
  'formatLocalizedNumber(numberValue(frontendRuntimeAnchorSelfCheck.frontend_declared_anchor_count), locale)',
  'formatLocalizedNumber(numberValue(frontendRuntimeAnchorSelfCheck.order_mismatches.length), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware number formatting missing: ${value}`);
if (!process.exitCode) pass('Contract freeze and response audit counts use the selected locale.');

const display = [
  "readinessCoreLabel(aiContractFreezeManifest?.freeze_status || 'not_reported', ui)",
  "readinessCoreLabel(aiResponseContractAudit?.contract_status || 'not_reported', ui)",
  "readinessCoreLabel(aiResponseContractAudit?.frontend_panel_contract_status || 'not_reported', ui)",
  "readinessCoreLabel(frontendRuntimeAnchorSelfCheck.status || 'not_reported', ui)",
  "readinessCoreLabel(frontendRuntimeAnchorSelfCheck.order_status || 'not_reported', ui)"
];
for (const value of display) if (!slice.includes(value)) fail(`Localized display mapping missing: ${value}`);
if (!process.exitCode) pass('Known contract and runtime-anchor states use localized display mapping.');

const canonical = [
  "production-readiness-summary${forceRefresh ? '?refresh=true' : ''}",
  "'contract_freeze_manifest'", "'response_contract_audit'",
  'freeze_drift_detected', 'freeze_manifest_aligned', 'contract_drift_detected', 'contract_frozen_and_aligned',
  'frontend_panel_contract_manifest_aligned', 'frontend_runtime_dom_anchor_manifest_aligned'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical/API contract changed: ${value}`);
for (const value of ["ui('/intelligence-readiness/production-readiness-summary')", "ui('contract_freeze_manifest')", "ui('response_contract_audit')"]) if (pageSource.includes(value)) fail(`Canonical identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Endpoint, panel keys, canonical states, and technical identifiers remain language-independent.');

const serverData = [
  'aiContractFreezeManifest.contract_version_alignment_policy.current_alignment_statement',
  'aiContractFreezeManifest.contract_version_alignment_policy.version_must_change_when.slice(0, 5).map((rule)',
  'panel.required_frontend_panel_key', 'panel.required_frontend_panel_dom_attribute', 'panel.breaking_change_rule',
  'aiContractFreezeManifest.missing_response_keys.map(formatLabel)',
  'panel.required_panel_label || formatLabel(panel.response_key)', 'panel.required_rendering', 'panel.required_panel_dom_attribute',
  'aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.failure_policy',
  'aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.ordered_status_value',
  'frontendRuntimeAnchorSelfCheck.missing_frontend_anchors.map(formatLabel)',
  'frontendRuntimeAnchorSelfCheck.unexpected_frontend_anchors.map(formatLabel)',
  'aiResponseContractAudit.missing_response_keys.map(formatLabel)'
];
for (const value of serverData) if (!slice.includes(value)) fail(`Expected backend/technical data boundary missing: ${value}`);
for (const value of ['ui(aiContractFreezeManifest.contract_version_alignment_policy.current_alignment_statement)', 'ui(rule)', 'ui(panel.required_frontend_panel_key)', 'ui(panel.required_frontend_panel_dom_attribute)', 'ui(panel.breaking_change_rule)', 'ui(panel.required_rendering)', 'ui(aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.failure_policy)', 'ui(aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.ordered_status_value)', 'ui(readinessQuery.error.message)']) if (slice.includes(value)) fail(`Backend-returned or technical content must not be blindly translated: ${value}`);
if (!process.exitCode) pass('Backend rules, technical manifest values, response keys, DOM anchors, evidence/contract details, and API errors remain data.');

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

if (!process.exitCode) pass('Tenant Intelligence Review Contract Freeze & Response Audit multilingual gate passed.');
