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

const start = pageSource.indexOf('data-ai-contract-panel="governance_dashboard"');
const end = pageSource.indexOf('data-ai-contract-panel="route_exposure_audit"', start);
if (start < 0 || end < 0) {
  fail('Could not isolate the Intelligence Review governance/release multilingual slice.');
  process.exit(1);
}
const sliceSource = pageSource.slice(start, end);

const requiredPanels = ['governance_dashboard', 'commercial_release_gate', 'commercial_release_evidence_dossier'];
for (const panel of requiredPanels) if (!sliceSource.includes(`data-ai-contract-panel="${panel}"`)) fail(`Governance/release contract panel missing: ${panel}`);
if (!process.exitCode) pass('Governance dashboard, commercial release gate, and evidence dossier remain present and ordered before route exposure audit.');

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
if (missingLiterals.length) fail(`Governance/release ui() literals missing translations: ${missingLiterals.join(' | ')}`);
else pass(`Governance/release slice has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'Pass', 'Watch', 'Blocker',
  'Commercial enablement blocked', 'Governance waiver or final review required', 'Ready for controlled commercial enablement',
  'Commercial AI release blocked', 'Commercial AI release requires governance waiver', 'Commercial AI release ready for operator approval',
  'Release evidence incomplete', 'Release evidence requires governance waiver', 'Release evidence ready for operator review',
  'Unified AI capability inventory', 'Unified AI risk scoring', 'Unified AI decision lineage', 'Unified AI rollback orchestration',
  'Unified AI maturity self-audit', 'Unified AI governance dashboard', 'Unified AI commercial release gate',
  'Production audit pack', 'Production signoff checklist', 'Production monitoring contract', 'Production release decision board'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Governance/release canonical labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} governance/release/evidence canonical display labels are catalog-backed.`);

const forbiddenEnglishPresentation = [
  '>Intelligence governance dashboard<', '>Governance readiness<', '>Governance state<', '>Commercial enablement<',
  '>Intelligence commercial release gate<', '>Release gate state<', '>Release gate score<', '>Automated release allowed<',
  '>Intelligence commercial release evidence dossier<', '>Dossier state<', '>Evidence score<',
  '>No unified intelligence governance dashboard actions reported.<', '>No commercial AI release-gate actions reported.<', '>No release evidence artifacts reported.<'
];
for (const pattern of forbiddenEnglishPresentation) if (sliceSource.includes(pattern)) fail(`Governance/release slice still contains English-only frontend presentation: ${pattern}`);
if (!process.exitCode) pass('Governance/release frontend presentation is routed through the shared translation contract.');

const localeContracts = [
  'formatLocalizedNumber(numberValue(aiGovernanceDashboard?.governance_readiness_score), locale)',
  'formatLocalizedNumber(numberValue(aiGovernanceDashboard?.blocker_source_count), locale)',
  'formatLocalizedNumber(numberValue(aiGovernanceDashboard?.watch_source_count), locale)',
  'formatLocalizedNumber(numberValue(action.blocker_count), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialReleaseGate?.release_gate_score), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialReleaseGate?.blocker_check_count), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialReleaseGate?.watch_check_count), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialReleaseEvidenceDossier?.evidence_score), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialReleaseEvidenceDossier?.blocker_check_count), locale)',
  'formatLocalizedNumber(numberValue(aiCommercialReleaseEvidenceDossier?.watch_check_count), locale)',
  'formatLocalizedNumber(numberValue(artifact.sequence), locale)'
];
for (const contract of localeContracts) if (!sliceSource.includes(contract)) fail(`Governance/release locale-aware numeric formatting missing: ${contract}`);
if (!process.exitCode) pass('Governance/release scores, counts, percentages, and sequence numbers use the selected application locale.');

const canonicalContracts = [
  "production-readiness-summary${forceRefresh ? '?refresh=true' : ''}",
  "'governance_dashboard'", "'commercial_release_gate'", "'commercial_release_evidence_dossier'",
  'commercial_enablement_blocked', 'commercial_ai_release_requires_governance_waiver', 'release_evidence_ready_for_operator_review',
  'unified_ai_commercial_release_gate', 'production_release_decision_board'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Governance/release canonical/API contract changed during localization: ${contract}`);
const forbiddenTechnicalTranslation = [
  "ui('/intelligence-readiness/production-readiness-summary')", 'ui("/intelligence-readiness/production-readiness-summary")',
  "ui('governance_dashboard')", "ui('commercial_release_gate')", "ui('commercial_release_evidence_dossier')",
  "ui('commercial_enablement_blocked')", "ui('commercial_ai_release_requires_governance_waiver')", "ui('release_evidence_ready_for_operator_review')",
  "ui('unified_ai_commercial_release_gate')", "ui('production_release_decision_board')"
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical governance/release identifier must remain language-independent: ${pattern}`);
if (!process.exitCode) pass('Readiness endpoint, panel keys, canonical states, and evidence-source identifiers remain language-independent.');

const localizedSystemContracts = [
  'localizedReadinessSystemText(action.source_label, ui)',
  'localizedReadinessSystemText(action.required_resolution, ui)',
  'localizedReadinessSystemText(action.check_label, ui)',
  'localizedReadinessSystemText(artifact.artifact_label, ui)',
  'localizedReadinessSystemText(artifact.required_artifact, ui)'
];
for (const contract of localizedSystemContracts) if (!sliceSource.includes(contract)) fail(`System-owned governance/release presentation is not localized explicitly: ${contract}`);
const forbiddenServerTranslation = [
  'ui(action.source_label)', 'ui(action.required_resolution)', 'ui(action.check_label)', 'ui(artifact.artifact_label)', 'ui(artifact.required_artifact)'
];
for (const pattern of forbiddenServerTranslation) if (sliceSource.includes(pattern)) fail(`Backend-returned governance/release content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('System-owned governance/release labels, resolutions, and artifact requirements use the explicit readiness localization boundary.');

if (!sliceSource.includes('readinessCoreLabel(aiGovernanceDashboard?.governance_state, ui)')) fail('Governance state must use canonical localized display mapping.');
if (!sliceSource.includes('readinessCoreLabel(aiCommercialReleaseGate?.release_gate_state, ui)')) fail('Release-gate state must use canonical localized display mapping.');
if (!sliceSource.includes('readinessCoreLabel(aiCommercialReleaseEvidenceDossier?.dossier_state, ui)')) fail('Evidence-dossier state must use canonical localized display mapping.');
if (!sliceSource.includes('readinessCoreLabel(artifact.evidence_source, ui)')) fail('Known evidence-source identifiers must use localized display labels without changing canonical values.');
if (!process.exitCode) pass('Known governance, release, dossier, status, severity, and evidence-source codes use localized display mapping.');

const routerContracts = ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review route/permission contract changed: ${contract}`);

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>');
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}
if (!process.exitCode) console.log('Tenant Intelligence Review governance/release multilingual hardening: PASS');
