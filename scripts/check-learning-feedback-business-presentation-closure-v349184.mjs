import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');
const translations = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');

const checks = [
  ['known generated policy titles have a dedicated Learning Feedback mapping', page.includes('LEARNING_FEEDBACK_GENERATED_POLICY_TITLES') && page.includes("'live:inventory:dynamic-replenishment': 'Dynamic replenishment policy'")],
  ['known policy titles are localized by stable system key', page.includes("mode === 'policy-effectiveness' && LEARNING_FEEDBACK_GENERATED_POLICY_TITLES[sourceKey]") && page.includes('ui(LEARNING_FEEDBACK_GENERATED_POLICY_TITLES[sourceKey])')],
  ['unknown business source titles remain verbatim', page.includes('if (sourceLabel) {') && page.includes('return sourceLabel;')],
  ['forecast evidence labels use friendly period context', page.includes('formatLearningEvidencePeriod') && page.includes('source_forecast_period_start') && page.includes('source_forecast_period_end')],
  ['main evidence table no longer renders internal evidence keys as Record labels', page.includes('learningEvidenceDisplayLabel(mode, row, index, locale, ui)') && !page.includes('businessKey ? formatLabel(businessKey)')],
  ['review board no longer falls back to evidence_key as the visible source', page.includes('learningEvidenceDisplayLabel(feedbackModeFromEvidenceType(item.evidence_type)') && !page.includes('item.source_label || formatLabel(item.evidence_key)')],
  ['detail card uses the same friendly source-label resolver', page.includes('const sourceDisplayLabel = learningEvidenceDisplayLabel(detailMode, detail, null, locale, ui)') && page.includes('<div>{sourceDisplayLabel}</div>')],
  ['source picker hides source_key from normal option text', page.includes('feedbackSourceDisplayLabel(source, mode, locale, ui)') && !page.includes('{source.title} · {source.source_key}')],
  ['known source facts hide technical source_key', page.includes('feedbackSourceDisplayLabel(selectedSource, mode, locale, ui)') && !page.includes('{selectedSource.title} · {selectedSource.source_key}')],
  ['optimization option picker no longer exposes option_key', page.includes('{option.title} · {ui(formatLabel(option.status))}') && !page.includes('{option.title} · {option.option_key}')],
  ['portfolio evidence uses recommendation_label instead of recommendation_portfolio_key', page.includes('item.recommendation_label || `${ui(\'Recommendation\')}') && !page.includes('<td>{formatLabel(item.recommendation_portfolio_key)}</td>')],
  ['escalation evidence uses friendly outcome/recommendation labels', page.includes('item.outcome_label || `${ui(\'Recorded item\')}') && page.includes("item.recommendation_label || ui('Recommendation')") && !page.includes('<td>{formatLabel(item.outcome_key)}</td>')],
  ['raw keys remain available internally for edits and linking', page.includes('function recordKeyForMode') && page.includes('source_key: source.source_key')],
  ['generated policy titles remain present in the five-language catalog', translations.includes('["Dynamic replenishment policy"') && translations.includes('["Reservation allocation policy"') && translations.includes('["Supplier delivery policy"') && translations.includes('["Execution task flow policy"')]
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS - ${label}`);
  else { failed += 1; console.error(`FAIL - ${label}`); }
}
if (failed) process.exit(1);
console.log(`v3.49.184 Learning Feedback business presentation frontend guard: ${checks.length}/${checks.length} PASS`);
