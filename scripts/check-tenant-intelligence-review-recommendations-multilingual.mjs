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
  } catch {
    // Ignore non-row TypeScript.
  }
}
const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literalKeys = [];
for (const match of pageSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TS catches malformed literals. */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Intelligence Review ui() literals missing from five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Intelligence Review recommendations/shared shell has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'All review categories', 'Decision intelligence', 'Governance findings', 'Remediation findings', 'Simulations', 'Optimisation', 'Cross-area reviews',
  'All review states', 'Pending review', 'Approval required', 'Escalated', 'Ready for human decision', 'Acknowledged', 'Approved for manual action',
  'Rejected', 'Suppressed', 'Execution request drafted', 'Acknowledge', 'Approve for manual action', 'Reject', 'Suppress', 'Escalate', 'Reopen review',
  'All urgency', 'Critical', 'High', 'Medium', 'Low', 'Unknown', 'Reopened', 'Risk context changed', 'Confidence too low', 'Insufficient evidence',
  'Business policy exception', 'Manual execution preferred', 'Policy violation', 'Duplicate or stale', 'Other', 'AI Copilot run', 'Local rules',
  'Local rules fallback', 'External AI response', 'Structured evidence', 'Metadata only'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Intelligence Review dynamic recommendation labels missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} dynamic recommendation/status/reason labels are catalog-backed.`);

const representativeRows = [
  'Intelligence Review', 'Recommendation reviews', 'Recommendation review controls', 'Review queue', 'Review decision',
  'Source confidence', 'How this result was produced', 'Review status', 'Review history', 'Human decision only'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Intelligence Review recommendation translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative recommendation rows are present in all five locales.`);

if (!pageSource.includes('useAppTranslation()')) fail('Intelligence Review must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(date, locale)')) fail('Recommendation timestamps must use locale-aware date/time formatting.');
if (!pageSource.includes('formatLocalizedNumber(Math.round(value * 100), locale)')) fail('Recommendation confidence percentages must use locale-aware number formatting.');
if (!pageSource.includes('formatLocalizedNumber(numberValue(summary.active_reviews), locale)')) fail('Recommendation KPI counts must use locale-aware number formatting.');
if (pageSource.includes('date.toLocaleString()')) fail('Intelligence Review must not use browser-default timestamp formatting.');
if (!process.exitCode) pass('Recommendation timestamps, confidence percentages, versions, and shared KPI counts use the selected application locale.');

const recommendationStart = pageSource.indexOf('<span>{ui("Recommendation review controls")}</span>');
const recommendationEnd = pageSource.indexOf("{activeView === 'readiness' ? (", recommendationStart);
if (recommendationStart < 0 || recommendationEnd < 0) {
  fail('Could not isolate the localized Recommendation Reviews workflow for regression checks.');
} else {
  const recommendationSource = pageSource.slice(recommendationStart, recommendationEnd);
  const forbiddenEnglishPresentation = [
    '>Recommendation review controls<', '>Review queue<', '>Source confidence<', '>Evidence preview<', '>How this result was produced<',
    '>Review status<', '>Review decision<', '>Review history<', "? 'Refreshing…' : 'Refresh review queue'",
    '>Open source page<', '>Create Execution Request draft<', 'placeholder="Record the evidence considered and why this decision is appropriate."'
  ];
  for (const pattern of forbiddenEnglishPresentation) if (recommendationSource.includes(pattern)) fail(`Recommendation Reviews still contains English-only presentation: ${pattern}`);
  if (!process.exitCode) pass('Recommendation Reviews presentation is routed through the shared translation contract.');
}


const usabilityContracts = [
  'formatLocalizedNumber(numberValue(summary.active_reviews), locale)',
  'reviewStateIsActive(lifecycle?.current_status || review.review_state)',
  'delete next[sourceActionId]',
  'dateInputEndOfDayIso(draft.escalation_due_at)',
  "option.value === 'escalated' && isEscalatedReview ? 'Update escalation' : option.label",
  'currentRoleOwnsEscalation',
  'adminCanReassignEscalation',
  "event.actor_name || (event.actor_role ? recommendationLabel(event.actor_role, ui)",
  "<summary>{ui(\'Governance readiness details\')}</summary>",
  '{ui("Open source page")}'
];
for (const contract of usabilityContracts) if (!pageSource.includes(contract)) fail(`Intelligence Review usability contract missing: ${contract}`);
if (!process.exitCode) pass('Intelligence Review KPI, lifecycle, escalation, history, and readiness-detail usability hardening is present.');

const forbiddenTechnicalTranslation = [
  "ui('/intelligence-review')", 'ui("/intelligence-review")',
  "ui('/operational-action-center/human-in-loop-ai-operations-summary')", 'ui("/operational-action-center/human-in-loop-ai-operations-summary")',
  "ui('ai_operation_domain')", 'ui("ai_operation_domain")', "ui('review_state')", 'ui("review_state")', "ui('urgency')", 'ui("urgency")',
  "ui('pending_review')", 'ui("pending_review")', "ui('approved_for_manual_action')", 'ui("approved_for_manual_action")',
  "ui('business_policy_exception')", 'ui("business_policy_exception")'
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical Intelligence Review value must remain language-independent: ${pattern}`);

const apiContracts = [
  "new URLSearchParams({ limit: '75' })", "params.set('ai_operation_domain', aiOperationDomain)", "params.set('review_state', reviewState)", "params.set('urgency', urgency)",
  'apiRequest<HumanAIReviewResponse>(`/operational-action-center/human-in-loop-ai-operations-summary?${params.toString()}`)',
  '`/operational-action-center/human-in-loop-ai-reviews/${encodeURIComponent(sourceActionId)}/history`',
  '`/operational-action-center/human-in-loop-ai-reviews/${encodeURIComponent(sourceActionId)}/decision`',
  '`/operational-action-center/human-in-loop-ai-reviews/${encodeURIComponent(sourceActionId)}/execution-request-draft`',
  "method: 'POST'", "decision,", "reason_category: draft.reason_category || null", "reviewer_notes: draft.reviewer_notes || null",
  "override_reason: draft.override_reason || null", "expected_version: review.lifecycle?.version || undefined"
];
for (const contract of apiContracts) if (!pageSource.includes(contract)) fail(`Intelligence Review recommendation API/lifecycle contract changed during localization: ${contract}`);

const routerContracts = [
  "path: 'intelligence-review'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ', '<HumanInLoopAIReviewPage />'
];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Intelligence Review router permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Recommendation query filters, lifecycle mutations, route, and permission contracts remain language-independent.');

const serverDataContracts = [
  '<h3>{review.title || review.review_id}</h3>', "review.summary || ui('No review summary was provided.')", '<p className="card__subtext">{evidencePreview.preview_summary}</p>',
  "guidance.review_queue_guidance || ui('Review source confidence, explainability, structured evidence, and approval requirements before acting elsewhere.')",
  "review.explainability_review.primary_factors.map(formatLabel).join(' · ')", 'lifecycle.reviewer_notes', 'lifecycle.override_reason',
  'error instanceof Error ? error.message', 'reviewHistoryQuery.error instanceof Error ? reviewHistoryQuery.error.message'
];
for (const contract of serverDataContracts) if (!pageSource.includes(contract)) fail(`Recommendation backend/business-data display boundary changed: ${contract}`);
const forbiddenServerTranslation = [
  'ui(review.title)', 'ui(review.summary)', 'ui(evidencePreview.preview_summary)', 'ui(guidance.review_queue_guidance)',
  'ui(lifecycle.reviewer_notes)', 'ui(lifecycle.override_reason)', 'ui(error.message)', 'ui(reviewHistoryQuery.error.message)'
];
for (const pattern of forbiddenServerTranslation) if (pageSource.includes(pattern)) fail(`Backend-returned review/business content must not be blindly translated: ${pattern}`);
if (!process.exitCode) pass('Backend review titles, summaries, evidence, guidance, notes, override text, and API errors remain data.');

if (!pageSource.includes("activeView === 'readiness'")) fail('Readiness & Governance view must remain available while multilingual conversion is staged.');
if (!pageSource.includes('data-ai-contract-panel="governance_dashboard"')) fail('The staged Readiness & Governance surface was unexpectedly removed during later multilingual sub-batches.');
if (!process.exitCode) pass('Readiness & Governance remains available for staged multilingual sub-batches.');

if (!process.exitCode) console.log('Tenant Intelligence Review recommendations multilingual hardening: PASS');
