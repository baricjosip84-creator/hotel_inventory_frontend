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
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const startMarker = '<div className="section__title">{ui("Production enablement manifest")}</div>';
const endMarker = '<div className="section__title">{ui("Governance and safety")}</div>';
const start = pageSource.indexOf(startMarker);
const end = pageSource.indexOf(endMarker, start);
if (start < 0 || end < 0 || end <= start) {
  fail('Could not isolate Production Enablement Manifest / Production Monitoring Contract multilingual slice.');
  process.exit(1);
}
const slice = pageSource.slice(start, end);
for (const label of ['Production enablement manifest', 'Production monitoring contract']) {
  if (!slice.includes(`ui("${label}")`) && !slice.includes(`ui('${label}')`)) fail(`Localized section missing: ${label}`);
}
if (!process.exitCode) pass('Production Enablement Manifest and Production Monitoring Contract are inside the bounded multilingual slice.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decode(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of slice.matchAll(literalPattern)) { try { literals.push(decode(match[1])); } catch {} }
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Production enablement/monitoring ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Production enablement/monitoring slice has ${new Set(literals).size} catalog-backed literal UI keys.`);

const dynamic = [
  'Production enablement blocked',
  'Controlled enablement partially available',
  'Controlled enablement ready for final tests',
  'Eligible for controlled enablement',
  'Blocked or requires governance waiver',
  'Not enabled pending hardening',
  'Monitoring blocked by critical/high readiness gaps',
  'Controlled enablement monitoring required',
  'Pre-enablement monitoring required',
  'Monitor after controlled enablement',
  'Monitor blockers before enablement',
  'Monitor hardening progress',
  'Daily until final signoff, then weekly',
  'Twice weekly until final signoff, then weekly',
  'Weekly until final signoff, then monthly'
];
const missingDynamic = dynamic.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Canonical production enablement/monitoring display labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} production enablement/monitoring state and cadence labels are catalog-backed.`);

const forbidden = [
  '>Production enablement manifest<',
  '>Loading intelligence and AI-assisted production enablement manifest…<',
  ": 'Unable to load intelligence and AI-assisted production enablement manifest.'",
  '>Manifest: ',
  '>Eligible: ',
  '>Blocked/waiver: ',
  '>Pending: ',
  '>Enablement sequence<',
  '>Blocked or waiver-required features<',
  '>Eligible for controlled final testing<',
  '>Production monitoring contract<',
  '>Loading intelligence and AI-assisted production monitoring contract…<',
  ": 'Unable to load intelligence and AI-assisted production monitoring contract.'",
  '>Contract: ',
  '>Monitored: ',
  '>Controlled: ',
  '>Global monitoring checks<',
  '>Blocked monitoring items<',
  'Cadence {formatLabel(',
  '>Controlled enablement monitoring<',
  '>Escalation rules<'
];
for (const value of forbidden) if (slice.includes(value)) fail(`English-only production enablement/monitoring presentation remains: ${value}`);
if (!process.exitCode) pass('Frontend-owned production enablement/monitoring presentation uses the shared translation contract.');

const numeric = [
  'formatLocalizedNumber(numberValue(enablementManifest?.totals?.eligible_for_controlled_enablement), locale)',
  'formatLocalizedNumber(numberValue(enablementManifest?.totals?.blocked_or_requires_governance_waiver), locale)',
  'formatLocalizedNumber(numberValue(enablementManifest?.totals?.not_enabled_pending_hardening), locale)',
  'formatLocalizedNumber(numberValue(feature.release_blocker_count), locale)',
  'formatLocalizedNumber(numberValue(feature.required_evidence_gap_count), locale)',
  'formatLocalizedNumber(numberValue(monitoringContract?.totals?.monitored_feature_count), locale)',
  'formatLocalizedNumber(numberValue(monitoringContract?.totals?.monitor_blockers_before_enablement), locale)',
  'formatLocalizedNumber(numberValue(monitoringContract?.totals?.monitor_after_controlled_enablement), locale)'
];
for (const value of numeric) if (!slice.includes(value)) fail(`Locale-aware production enablement/monitoring number formatting missing: ${value}`);
if (!process.exitCode) pass('Production enablement/monitoring counts use the selected locale.');

const display = [
  'readinessCoreLabel(enablementManifest?.manifest_status, ui)',
  'readinessCoreLabel(feature.enablement_state, ui)',
  'readinessCoreLabel(feature.production_priority, ui)',
  'readinessCoreLabel(feature.signoff_status, ui)',
  'readinessCoreLabel(feature.validation_status, ui)',
  'readinessCoreLabel(monitoringContract?.contract_status, ui)',
  'readinessCoreLabel(feature.monitoring_state, ui)',
  'readinessCoreLabel(feature.monitoring_cadence, ui)'
];
for (const value of display) if (!slice.includes(value)) fail(`Localized production enablement/monitoring display mapping missing: ${value}`);
if (!process.exitCode) pass('Known manifest, monitoring, priority, signoff, validation, and cadence states use localized display mapping.');

const systemPresentation = [
  'localizedReadinessSystemText(enablementManifest.global_enablement_rule, ui)',
  'enablementSequence.map((item)',
  'localizedReadinessSystemText(item, ui)',
  'localizedReadinessSystemText(feature.feature_label, ui)',
  'localizedReadinessSystemText(feature.operator_enablement_note, ui)',
  'localizedReadinessSystemText(monitoringContract.safety_rule, ui)',
  'monitoringChecks.slice(0, 6).map((check)',
  'localizedReadinessSystemText(check, ui)',
  'localizedReadinessSystemText(feature.operator_response, ui)',
  'monitoringEscalationRules.slice(0, 4).map((rule)',
  'localizedReadinessSystemText(rule, ui)'
];
for (const value of systemPresentation) if (!slice.includes(value)) fail(`System-owned enablement/monitoring localization missing: ${value}`);
const preservedData = ['enablementManifestQuery.error.message', 'monitoringContractQuery.error.message'];
for (const value of preservedData) if (!slice.includes(value)) fail(`Enablement/monitoring API-error boundary missing: ${value}`);
for (const value of ['ui(enablementManifestQuery.error.message)', 'ui(monitoringContractQuery.error.message)', 'localizedReadinessSystemText(enablementManifestQuery.error.message', 'localizedReadinessSystemText(monitoringContractQuery.error.message']) if (slice.includes(value)) fail(`API errors must remain untranslated: ${value}`);
if (!process.exitCode) pass('System-owned enablement/monitoring rules, labels, notes and escalation guidance are localized while API errors remain data.');

const canonical = [
  'production_enablement_blocked',
  'controlled_enablement_partially_available',
  'controlled_enablement_ready_for_final_tests',
  'eligible_for_controlled_enablement',
  'blocked_or_requires_governance_waiver',
  'not_enabled_pending_hardening',
  'monitoring_blocked_by_critical_high_readiness_gaps',
  'controlled_enablement_monitoring_required',
  'pre_enablement_monitoring_required',
  'monitor_after_controlled_enablement',
  'monitor_blockers_before_enablement',
  'monitor_hardening_progress',
  'daily_until_final_signoff_then_weekly',
  'twice_weekly_until_final_signoff_then_weekly',
  'weekly_until_final_signoff_then_monthly'
];
for (const value of canonical) if (!pageSource.includes(value)) fail(`Canonical production enablement/monitoring identifier missing: ${value}`);
for (const value of canonical) if (pageSource.includes(`ui('${value}')`) || pageSource.includes(`ui("${value}")`)) fail(`Canonical production enablement/monitoring identifier must remain language-independent: ${value}`);
if (!process.exitCode) pass('Production enablement/monitoring canonical identifiers remain language-independent.');

if (slice.includes('apiRequest<') || slice.includes('method:') || slice.includes('.mutate(')) fail('Production enablement/monitoring presentation slice must not introduce mutation calls.');
else pass('Production enablement/monitoring slice remains presentation-only and read-only.');

for (const value of ["path: 'intelligence-review'", 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ']) if (!routerSource.includes(value)) fail(`Router/permission contract changed: ${value}`);
if (!process.exitCode) pass('Intelligence Review route and permission contract remain unchanged.');

const rawText = slice.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/>\s*([A-Za-z][^<>{}]*)\s*</);
  return match ? [match[1].trim()] : [];
}).filter(Boolean);
if (rawText.length) fail(`Raw JSX presentation remains in the completed Production Enablement / Monitoring slice: ${rawText.join(' | ')}`);
else pass('Production Enablement / Monitoring slice has no raw JSX presentation remaining.');

const laterStart = pageSource.indexOf('<div className="section__title">{ui("Governance and safety")}</div>', end);
if (laterStart < 0) fail('Could not locate terminal Governance and Safety multilingual boundary.');
else {
  const laterSlice = pageSource.slice(laterStart);
  if (!laterSlice.includes('ui("Governance and safety")') && !laterSlice.includes("ui('Governance and safety')")) fail('Terminal Governance and Safety multilingual boundary is missing.');
  else pass('Terminal Governance and Safety multilingual boundary is present.');
}

if (!process.exitCode) pass('Tenant Intelligence Review Production Enablement & Monitoring multilingual gate passed.');
