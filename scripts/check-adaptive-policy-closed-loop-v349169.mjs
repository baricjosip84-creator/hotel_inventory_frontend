import fs from 'node:fs';
const page = fs.readFileSync(new URL('../src/pages/AdaptivePolicyEnginePage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/pages/AdaptivePolicyEnginePage.css', import.meta.url), 'utf8');
const translations = fs.readFileSync(new URL('../src/i18n/tenantUiTranslations.ts', import.meta.url), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const checkCi = packageJson.scripts?.['check:ci'] || '';

const checks = [
  ['authoritative analysis-generated time is separate from page update time', page.includes("ui('Analysis generated')") && page.includes("ui('Page updated')") && page.includes('data?.analysis?.analysis_generated_at')],
  ['new application history is part of the page contract', page.includes('applications?: PolicyApplicationRecord[]') && page.includes("title={ui('Applied policy changes')}")],
  ['approved recommendation can record actual application', page.includes("recommendation.recommendation_status === 'approved_for_manual_application'") && page.includes("ui(hasActiveApplication ? 'Record approved recalibration' : 'Record applied change')")],
  ['application recording uses the governed POST endpoint', page.includes('/adaptive-policy-engine/policies/${encodeURIComponent(draft.policyId)}/applications') && page.includes('recommendation_id: draft.recommendationId')],
  ['previous and actually applied values are explicit', page.includes("ui('Previous rule value')") && page.includes("ui('Actually applied rule value')")],
  ['application explains approval is not application', page.includes('Approval alone is not application.')],
  ['recommendations expose specific evidence-backed scope', page.includes('recommendedAdjustmentSummary') && page.includes('affected_product_count') && page.includes('affected_supplier_count')],
  ['application history shows baseline and applied value', page.includes("headers={['Policy', 'Status', 'Recorded change', 'Applied value', 'Baseline', 'Applied', 'Lifecycle action']}")],
  ['recalibration review action is exposed', page.includes("open_recalibration_review") && page.includes("ui('Recalibrate')")],
  ['rollback review and completed rollback actions are exposed', page.includes("open_rollback_review") && page.includes("record_rollback") && page.includes("ui('Record rollback')")],
  ['monitoring resume action is exposed', page.includes("resume_monitoring") && page.includes("ui('Resume')")],
  ['retirement action is exposed', page.includes("retire_policy") && page.includes("ui('Retire')")],
  ['lifecycle actions use the governed POST endpoint', page.includes('/adaptive-policy-engine/applications/${encodeURIComponent(draft.applicationId)}/action')],
  ['business blockers and checks are shown to policy users', page.includes('<div className="adaptive-policy-check-grid">') && page.includes("<CheckList title={ui('What needs attention')}") && !/canViewDiagnostics\s*\?\s*\(\s*<div className="adaptive-policy-check-grid">/.test(page)],
  ['raw technical response stays diagnostics-restricted', page.includes("view === 'diagnostics' && canViewDiagnostics") && page.includes('<pre>{JSON.stringify(data, null, 2)}</pre>')],
  ['new applied lifecycle statuses are filterable and localized', page.includes("'applied_monitoring'") && page.includes("'recalibration_review'") && page.includes("'rollback_review'") && translations.includes('["Applied — monitoring"')],
  ['closed-loop form styles exist', css.includes('.adaptive-policy-governance-form') && css.includes('.adaptive-policy-form-grid') && css.includes('.adaptive-policy-row-actions')],
  ['Adaptive Policy multilingual guard remains present', Boolean(packageJson.scripts?.['check:tenant-adaptive-policy-engine-multilingual'])],
  ['dedicated v3.49.169 frontend guard is registered', Boolean(packageJson.scripts?.['check:adaptive-policy-closed-loop-v349169'])],
  ['normal frontend CI enforces v3.49.169 after v3.49.166 release guard', checkCi.includes('check:learning-feedback-ci-closure-v349166 && npm run check:adaptive-policy-closed-loop-v349169')]
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) console.log(`PASS - ${label}`);
  else { failed += 1; console.error(`FAIL - ${label}`); }
}
if (failed) process.exit(1);
console.log(`v3.49.169 Adaptive Policy closed-loop frontend guard: ${checks.length}/${checks.length} PASS`);
