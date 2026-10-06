import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');
const translations = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');

const checks = [
  ['technical continuous-learning posture is mapped to business language', page.includes("controlled_learning_observation_posture: 'Observation only'") && page.includes("learning_review_required: 'Review required'")],
  ['hero uses Learning status instead of exposing continuous learning posture wording', page.includes("label={`${ui('Learning status')} · ${ui('refreshed')}") && page.includes('learningBusinessPostureLabel(governance.continuous_learning_posture, ui)')],
  ['summary posture card uses the same business status mapping', page.includes('<LocalizedLearningStatCard label="Learning status"') && !page.includes('<LocalizedLearningStatCard label="Posture" value={governance?.continuous_learning_posture')],
  ['routine next-review focus becomes concrete business guidance', page.includes("routine_learning_monitoring: 'No urgent follow-up; continue monitoring'") && page.includes('learningNextReviewFocusLabel(plan?.next_review_focus, ui)')],
  ['action evidence count explicitly states its action-specific scope', page.includes("<th>{ui('Evidence requiring this action')}</th>")],
  ['learning signal is hidden when there is no evidence', page.includes("const learningSignalValue = totalEvidenceCount > 0 ? formatLearningPercentage(assessment?.learning_signal_score, locale) : '—';")],
  ['zero-evidence and one-record signal context are explained', page.includes("ui('No learning signal yet — record evidence first.')") && page.includes("ui('Preliminary signal — based on one evidence record.')")],
  ['learning signal and drift pressure are presented as percentages', page.includes('formatLearningPercentage(assessment?.learning_signal_score, locale)') && page.includes('formatLearningPercentage(assessment?.drift_pressure_score, locale)')],
  ['normalized learning scores use two decimals rather than four', page.includes('minimumFractionDigits: 2, maximumFractionDigits: 2')],
  ['impact summary labels make normalized score scales explicit', page.includes('label="Avg outcome score (-1 to 1)"') && page.includes('label="Avg policy score (-1 to 1)"') && page.includes('label="Avg optimization value (-1 to 1)"')],
  ['forecast summary identifies percentage error explicitly', page.includes('label="Avg forecast error (%)"') && page.includes('formatLearningPercentage(assessment.average_forecast_percentage_error, locale)')],
  ['evidence table uses mode-specific metric labels', page.includes('<th>{learningMetricLabel(mode, ui)}</th>') && page.includes("if (mode === 'policy-effectiveness') return ui('Effectiveness score (-1 to 1)');")],
  ['forecast evidence table uses percentage error consistently with the summary', page.includes("const score = mode === 'forecast-accuracy'\n                  ? row.percentage_error") && !page.includes('row.outcome_score ?? row.absolute_error ?? row.effectiveness_score ?? row.realized_value_score')],
  ['detail card uses the same mode-specific metric contract', page.includes('<strong>{learningMetricLabel(detailMode, ui)}</strong>') && page.includes('learningMetricValue(detailMode, metric, locale)')],
  ['generic Score / Error is no longer used in the business evidence table/detail', !page.includes("<th>{ui('Score / Error')}</th>") && !page.includes("<strong>{ui('Score / Error')}</strong>")],
  ['single Feedback records tab chrome is suppressed when no sibling view is exposed', page.includes('{showTenantLearningFeedbackReadinessChecks && canViewDiagnostics ? (\n        <OperationalWorkspaceTabs') && page.includes('<OperationalWorkspaceTab active={view === \'readiness\'}')],
  ['raw technical structured evidence remains diagnostics-permission gated and collapsed', page.includes('{canViewDiagnostics ? (') && page.includes("<summary>{ui('Technical structured evidence')}</summary>")],
  ['new business-clarity strings have five-language catalog entries', [
    'Observation only', 'Evidence monitored', 'Learning status', 'No urgent follow-up; continue monitoring',
    'Evidence requiring this action', 'Preliminary signal — based on one evidence record.',
    'Avg policy score (-1 to 1)', 'Forecast error (%)', 'Effectiveness score (-1 to 1)'
  ].every((key) => translations.includes(`["${key}"`))]
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS - ${label}`);
  else { failed += 1; console.error(`FAIL - ${label}`); }
}
if (failed) process.exit(1);
console.log(`v3.49.262 Learning Feedback business clarity surgical guard: ${checks.length}/${checks.length} PASS`);
