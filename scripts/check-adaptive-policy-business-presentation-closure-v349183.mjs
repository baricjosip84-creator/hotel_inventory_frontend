import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/AdaptivePolicyEnginePage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const packageJson = JSON.parse(read('package.json'));

const checks = [
  ['known generated policy keys resolve through friendly policy titles', page.includes('policyTitleFromKey(signal.policy_key, data?.policies, ui)') && page.includes('policyTitleFromKey(recommendation.policy_key, data?.policies, ui)') && page.includes('policyTitleFromKey(application.policy_key, data?.policies, ui)') && page.includes('policyTitleFromKey(measurement.policy_key, data?.policies, ui)')],
  ['known signal types use catalog-backed business labels', page.includes('SIGNAL_TYPE_LABELS') && page.includes("risk_indicator: 'Risk indicator'") && page.includes("service_indicator: 'Service indicator'") && page.includes("performance_indicator: 'Performance indicator'") && page.includes("capacity_indicator: 'Capacity indicator'") && page.includes('formatKnownSystemLabel(signal.signal_type, SIGNAL_TYPE_LABELS, ui)')],
  ['known effectiveness measurement type uses catalog-backed business label', page.includes("policy_effectiveness: 'Policy effectiveness'") && page.includes('formatKnownSystemLabel(measurement.measurement_type, MEASUREMENT_TYPE_LABELS, ui)')],
  ['generated recommendation keys are replaced by friendly review labels', page.includes("text.endsWith(':tuning-review')") && page.includes("ui('Tuning review')") && page.includes("text.includes(':recalibration:')") && page.includes("ui('Recalibration review')") && page.includes('recommendationDisplayLabel(recommendation.recommendation_key, ui)')],
  ['generated analysis measurement keys are replaced by a friendly measurement label', page.includes("text.includes(':analysis:') ? ui('Effectiveness measurement') : text") && page.includes('measurementDisplayLabel(measurement.measurement_key, ui)')],
  ['ordinary evidence tables no longer humanize raw policy/recommendation/measurement identifiers', !page.includes('{formatLabel(signal.policy_key)}') && !page.includes('{formatLabel(recommendation.policy_key)}') && !page.includes('{formatLabel(recommendation.recommendation_key)}') && !page.includes('{formatLabel(application.policy_key)}') && !page.includes('{formatLabel(measurement.policy_key)}') && !page.includes('{formatLabel(measurement.measurement_key)}')],
  ['ordinary signal and measurement enums no longer use generic English-style humanization', !page.includes('{formatLabel(signal.signal_type)}') && !page.includes('{formatLabel(measurement.measurement_type)}')],
  ['unknown or tenant/server-owned values remain verbatim instead of being blindly translated', page.includes('return generated ? ui(generated.title) : text;') && page.includes('return label ? ui(label) : text;') && page.includes('return generated ? ui(generated) : recommendation.explanation_summary;') && page.includes('summary: generated ? ui(generated.summary) : policy.summary')],
  ['raw technical evidence remains available only through the diagnostics surface', page.includes('canViewDiagnostics ? (') && page.includes('<pre>{JSON.stringify(data, null, 2)}</pre>')],
  ['new business labels exist in the shared five-language catalog', ['Risk indicator','Service indicator','Performance indicator','Capacity indicator','Tuning review','Effectiveness measurement'].every((key) => translations.includes(`["${key}",`))],
  ['existing friendly generated policy titles remain catalog-backed', ['Dynamic replenishment policy','Reservation allocation policy','Supplier delivery policy','Execution task flow policy'].every((key) => translations.includes(`["${key}",`))],
  ['existing policy-effectiveness and recalibration labels remain catalog-backed', translations.includes('["Policy effectiveness",') && translations.includes('["Recalibration review",')],
  ['v3.49.183 guard remains in frontend CI after the later presentation-closure guards', packageJson.scripts?.['check:adaptive-policy-business-presentation-closure-v349183'] === 'node scripts/check-adaptive-policy-business-presentation-closure-v349183.mjs' && packageJson.scripts?.['check:ci']?.startsWith('npm run check:tenant-multilingual-closure-audit && npm run check:backend-system-text-remaining-enum-localization-v349187 && npm run check:command-pages-final-business-presentation-closure-v349186 && npm run check:adaptive-policy-source-workflow-presentation-closure-v349185 && npm run check:learning-feedback-business-presentation-closure-v349184 && npm run check:adaptive-policy-business-presentation-closure-v349183 && ')]
];

for (const [label, ok] of checks) ok ? pass(label) : fail(label);
if (!process.exitCode) console.log(`v3.49.183 Adaptive Policy business-presentation closure guard: ${checks.length}/${checks.length} PASS`);
