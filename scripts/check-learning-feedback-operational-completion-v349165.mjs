import fs from 'node:fs';
const page = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/pages/DecisionLearningFeedbackPage.css', import.meta.url), 'utf8');
const translations = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
const checks = [
  ['observation date is explicit', page.includes("ui('Result observed on')") && page.includes("observed_at: toIsoDateTime(form.observedAt)")],
  ['recommendation measurement window is explicit', page.includes("ui('Measurement period from')") && page.includes('measurement_window_start')],
  ['source evidence is auto-prefilled', page.includes('const prefill = source.prefill || {}') && page.includes("mode === 'forecast-accuracy'")],
  ['forecast uses predicted and actual numeric inputs', page.includes("ui('Predicted value')") && page.includes("ui('Actual observed value')")],
  ['forecast error is calculated instead of typed score', page.includes("ui('Calculated forecast error')") && !page.includes("absolute_error: score")],
  ['legacy review editing is removed from payload', !page.includes('recommendation_outcome_review_status: form.reviewStatus')],
  ['review authority is explained as board-only', page.includes("Editing factual evidence cannot close its own review")],
  ['history has server search UI', page.includes('evidenceSearch') && page.includes("ui('Find recorded feedback')")],
  ['history has review/date filters', page.includes('evidenceReviewStatus') && page.includes('evidenceDateFrom') && page.includes('evidenceDateTo')],
  ['history has business sorting', page.includes("'best_result'") && page.includes("'worst_result'")],
  ['read-only detail action exists', page.includes("ui('View details')") && page.includes('EvidenceDetailCard')],
  ['detail view shows independent review evidence', page.includes('learning_feedback_assigned_reviewer_user_name') && page.includes('learning_feedback_review_note')],
  ['review queue exposes owner and deadline', page.includes("ui('Save owner / due')") && page.includes('onAssign')],
  ['review queue exposes escalation', page.includes("ui('Escalate')") && page.includes('onEscalate')],
  ['review decisions capture notes', page.includes("ui('Optional review note')") && page.includes('review_note')],
  ['controlled follow-up draft uses Execution Requests', page.includes("'/execution-requests'") && page.includes("request_type: 'system_recommendation'")],
  ['action plan can create follow-up draft', page.includes('createActionPlanFollowUp') && page.includes("ui('Create draft')")],
  ['six-month trend is shown', page.includes('function LearningTrendView') && page.includes('learning_trends')],
  ['new operational UI has layout styles', css.includes('.learning-feedback-filter-grid') && css.includes('.learning-feedback-detail__grid')],
  ['new UI strings are in five-language catalog', translations.includes('["Learning trend"') && translations.includes('["Result observed on"') && translations.includes('["Find recorded feedback"')],
];
let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS - ${label}`); else { failed++; console.error(`FAIL - ${label}`); }
}
if (failed) process.exit(1);
console.log(`v3.49.165 Learning Feedback operational completion frontend guard: ${checks.length}/${checks.length} PASS`);
