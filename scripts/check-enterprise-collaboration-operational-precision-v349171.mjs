import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const page = read('src/pages/EnterpriseCollaborationPage.tsx');
const alerts = read('src/pages/AlertsPage.tsx');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const collaborationCss = read('src/pages/EnterpriseCollaborationPage.css');
const alertsCss = read('src/pages/AlertsPage.css');
const feedCss = read('src/pages/RealTimeOperationsFeedPage.css');

let checked = 0;
let failed = 0;
const need = (source, text, label) => {
  checked += 1;
  if (!source.includes(text)) { failed += 1; console.error(`FAIL: ${label}`); }
  else console.log(`PASS: ${label}`);
};
const forbid = (source, pattern, label) => {
  checked += 1;
  if (pattern.test(source)) { failed += 1; console.error(`FAIL: ${label}`); }
  else console.log(`PASS: ${label}`);
};

need(page, "attentionState: 'all'", 'Collaboration has a responsibility/attention filter state.');
for (const value of ['assigned_to_me', 'unassigned', 'escalation_recommended', 'active_coordination', 'blocked', 'overdue']) {
  need(page, `{ value: '${value}'`, `Collaboration exposes practical filter ${value}.`);
}
need(page, "params.set('attention_state', filters.attentionState)", 'Attention filtering is sent to the backend instead of applied after a page limit.');
need(page, "params = new URLSearchParams({ limit: filters.limit, offset: String(offset) })", 'Page offset is sent to the backend.');
need(page, 'totalMatching', 'Collaboration distinguishes total matches from current-page rows.');
need(page, 'totalIsCapped', 'Collaboration visibly handles bounded-scan totals.');
need(page, "refetchInterval: 30_000", 'Collaboration auto-refreshes while open.');
need(page, 'refetchOnWindowFocus: true', 'Collaboration refreshes when the user returns to the page.');
need(page, "ui('Why this appeared')", 'Recommendation cards explain why coordination was suggested.');
need(page, 'thread.coordination_reason?.key', 'Reason copy uses the stable backend localization boundary.');
need(page, "ui('Current owner or assignee')", 'Recommendation cards show the real assignee when known.');
need(page, 'actual_assignee_name', 'Assignee data is consumed from the permitted response.');
need(page, "ui('Suggested coordination responsibilities')", 'Participant guidance is presented as responsibilities rather than assumed literal job titles.');
need(page, 'businessAreaLabel(', 'Recommendation cards expose the real business area/source subtype.');
need(page, "new URLSearchParams({ alert_id: sourceId })", 'Alert recommendations create exact-record links.');
need(page, "new URLSearchParams({ task_id: sourceId })", 'Execution recommendations create exact-task links.');
need(page, "new URLSearchParams({ source_action_id: sourceActionId })", 'Review/Action Center recommendations create exact action links.');
need(page, "new URLSearchParams({ timeline_item_id: timelineItemId })", 'Operational-event recommendations create exact timeline links.');
need(page, "ui('Open exact Action Center item')", 'Cards provide an exact Action Center fallback when the source page is different.');
need(page, 'pagination.has_more', 'Recommendation paging uses backend has-more truth.');
need(page, 'pagination.has_previous', 'Recommendation paging uses backend previous-page truth.');
need(collaborationCss, '.collaboration-pagination', 'Pagination has responsive presentation.');
need(collaborationCss, '.collaboration-guidance-block--reason', 'Reason guidance is visually separated from generic guidance.');
need(alerts, "searchParams.get('alert_id')", 'Alerts recognizes exact alert links.');
need(alerts, 'fetchAlertById(requestedAlertId)', 'Alerts can fetch a linked record even when normal filters would omit it.');
need(alerts, 'id={`alert-${alert.id}`}', 'Alerts provides a stable focus target for exact navigation.');
need(alertsCss, '.alerts-alert-card--focused', 'The exact alert is visibly focused.');
need(feed, "searchParams.get('timeline_item_id')", 'Operations Feed recognizes exact timeline links.');
need(feed, "focusedTimelineItemId ? '200' : '75'", 'Exact event focus expands only the bounded read window needed for navigation.');
need(feed, 'item.timeline_item_id !== requestedTimelineItemId', 'Operations Feed focuses the requested timeline item.');
need(feedCss, '.operations-feed-page__timeline-card--focused', 'The exact operational event is visibly focused.');
for (const phrase of [
  'This execution task is blocked and cannot progress normally.',
  'This execution task is overdue and needs follow-up.',
  'This execution task has no assignee.',
  'A governed human review or approval is required before the work can proceed safely.',
  'This operational event is blocked or failed and needs human follow-up.'
]) need(translations, phrase, `Five-language catalog contains Collaboration system reason: ${phrase}`);
forbid(page, /\buseMutation\b/, 'Collaboration page remains mutation-free.');
forbid(page, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'Collaboration page contains no write HTTP method.');

if (failed) {
  console.error(`Enterprise Collaboration v3.49.171 frontend precision guard: ${checked - failed}/${checked} PASS, ${failed} FAIL.`);
  process.exit(1);
}
console.log(`Enterprise Collaboration v3.49.171 frontend precision guard: ${checked}/${checked} PASS.`);
