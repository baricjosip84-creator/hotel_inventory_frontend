import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/RealTimeOperationsFeedPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a translation row.
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
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript/lint catches malformed literals. */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Operations Feed has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Operations Feed has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'All work areas', 'Alerts', 'Inventory events', 'Procurement events', 'Reservation events', 'Execution tasks', 'Optimisation events',
  'Control tower', 'Decision intelligence', 'AI governance', 'Financial events', 'Integration events', 'Audit events', 'All cross-area items',
  'All urgency levels', 'Critical', 'High', 'Medium', 'Low',
  'All shown', 'Today', 'Last 24 hours', 'All items', 'New since last visit',
  'Nothing is changed here', 'Reading or refreshing the feed does not update tasks, alerts, stock, or integrations.',
  'Only your company’s items', 'The backend collects information only for the company currently signed in.',
  'Role and permission controlled', 'The feed includes only source areas the current user is allowed to read.',
  'A person handles follow-up', 'The user opens the source page and completes the real work there.',
  'Approvals still apply', 'The feed cannot bypass an approval or governance requirement.',
  'Unknown', 'Open', 'Pending', 'Ready', 'Assigned', 'In progress', 'Acknowledged', 'Retrying', 'Delayed', 'Blocked', 'Failed', 'Completed', 'Cancelled',
  'Inventory', 'Procurement', 'Reservation', 'Execution', 'Optimisation', 'Financial', 'Integration', 'Audit', 'Cross-area',
  'Read only', 'Advisory only', 'Tenant isolated', 'Permission gated', 'Audit-traceable source', 'Human action only', 'Approval gated when required',
  'No direct inventory mutation', 'No direct procurement mutation', 'No direct execution mutation', 'No direct financial mutation',
  'No ERP writeback', 'No accounting writeback', 'No supplier execution', 'No carrier execution', 'No external workflow execution', 'No external AI callout'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Operations Feed dynamic display labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} dynamic Operations Feed labels are catalog-backed.`);

const representativeRows = [
  'Operational coordination', 'Operations Feed', 'Operations feed controls', 'Operational coordination feed', 'Why this feed is safe to use',
  'Refresh feed', 'No matching items', 'Technical event details', 'Technical safety details', 'Open in Action Center'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Operations Feed translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Operations Feed rows are present in all five locales.`);

if (!pageSource.includes('useAppTranslation()')) fail('Operations Feed must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(date, locale)')) fail('Operations Feed timestamps must use locale-aware shared date/time formatting.');
const localizedNumberContracts = [
  'formatLocalizedNumber(displayTimeline.length, locale)',
  'formatLocalizedNumber(visibleCriticalCount, locale)',
  'formatLocalizedNumber(visibleBlockedOrFailedCount, locale)',
  'formatLocalizedNumber(visibleNewCount, locale)',
  'formatLocalizedNumber(numberValue(item.delivery_attempt_count), locale)',
  'formatLocalizedNumber(numberValue(item.priority_score), locale)'
];
for (const contract of localizedNumberContracts) if (!pageSource.includes(contract)) fail(`Operations Feed displayed number is not locale-aware: ${contract}`);
if (!pageSource.includes('.toLocaleString()')) pass('Operations Feed does not use browser-default date formatting.');
if (!process.exitCode) pass('Operations Feed dates and displayed counts use the selected application locale.');

const forbiddenEnglishPresentation = [
  'eyebrow="Operational coordination"', 'title="Operations Feed"', '>Operations feed controls<', '>Operational coordination feed<',
  '>Why this feed is safe to use<', "? 'Refreshing…' : 'Refresh feed'", '>Open in Action Center<', '>Technical event details<'
];
for (const pattern of forbiddenEnglishPresentation) if (pageSource.includes(pattern)) fail(`Operations Feed still contains English-only presentation: ${pattern}`);

const forbiddenTechnicalTranslation = [
  "ui('/real-time-operations-feed')", 'ui("/real-time-operations-feed")',
  "ui('/operational-action-center/realtime-event-coordination-summary')", 'ui("/operational-action-center/realtime-event-coordination-summary")',
  "ui('event_domain')", 'ui("event_domain")', "ui('urgency')", 'ui("urgency")',
  "ui('alerts')", 'ui("alerts")', "ui('integration')", 'ui("integration")', "ui('multi_domain')", 'ui("multi_domain")',
  "ui('event_stream_message')", 'ui("event_stream_message")', "ui('event_delivery_disruption')", 'ui("event_delivery_disruption")'
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical Operations Feed technical value must remain language-independent: ${pattern}`);

const canonicalContracts = [
  "new URLSearchParams({ limit: focusedTimelineItemId ? '1' : '75' })", "params.set('event_domain', eventDomain)", "params.set('urgency', urgency)", "params.set('timeline_item_id', focusedTimelineItemId)",
  'apiRequest<RealTimeOperationsFeedResponse>(`/operational-action-center/realtime-event-coordination-summary?${params.toString()}`)',
  "new URLSearchParams({ resolved: 'false' })", "params.set('search', search)",
  "new URLSearchParams({ task_id: sourceId })", "new URLSearchParams({ source_action_id: item.correlation_id })",
  'hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ)', 'hasPermission(TENANT_PERMISSIONS.ALERTS_READ)',
  'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ)', 'hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ)',
  'hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)', 'hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ)'
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Operations Feed API/filter/permission contract changed during localization: ${contract}`);

const routerContracts = [
  "path: 'real-time-operations-feed'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', '<RealTimeOperationsFeedPage />'
];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Operations Feed router permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Operations Feed route, query filters, source links, and permission contracts remain language-independent.');

const serverContentContracts = [
  'title_key?: string | null', 'summary_key?: string | null', 'recommended_next_step_key?: string | null',
  'coordination_guidance_key?: string | null', 'incident_timeline_guidance_key?: string | null', 'disruption_guidance_key?: string | null',
  "return text ? (key ? ui(text) : text) : ui(fallback);",
  'if (title) return item.title_key ? ui(title) : title;',
  "return deliveryDisruptionSummary(item, ui)",
  "|| localizedSystemText(item.summary_key, item.summary, 'No summary was provided.', ui);",
  "rawTarget === 'the configured destination' ? ui('the configured destination') : rawTarget",
  "return localizedSystemText(item.recommended_next_step_key, item.recommended_next_step, 'Open the source page and review the item there.', ui);",
  "localizedSystemText(guidance.coordination_guidance_key, guidance.coordination_guidance, 'Open the source page for the item and complete the work there.', ui)",
  "localizedSystemText(guidance.incident_timeline_guidance_key, guidance.incident_timeline_guidance, 'The feed combines permitted work items and integration event summaries.', ui)",
  "localizedSystemText(guidance.disruption_guidance_key, guidance.disruption_guidance, 'Review the source workflow and coordinate a human response.', ui)",
  'feedQuery.error instanceof ApiError ? feedQuery.error.message'
];
for (const contract of serverContentContracts) if (!pageSource.includes(contract)) fail(`Operations Feed keyed system/business content display contract changed: ${contract}`);
const forbiddenServerContentTranslation = [
  'ui(item.title)', 'ui(item.summary)', 'ui(item.recommended_next_step)', 'ui(guidance.coordination_guidance)',
  'ui(guidance.incident_timeline_guidance)', 'ui(guidance.disruption_guidance)', 'ui(feedQuery.error.message)'
];
for (const pattern of forbiddenServerContentTranslation) if (pageSource.includes(pattern)) fail(`Backend-returned Operations Feed content must not be blindly translated without a stable system key: ${pattern}`);
if (!process.exitCode) pass('Operations Feed localizes backend-owned keyed system text while arbitrary business/source text, identifiers, and errors remain raw.');

const readOnlyContracts = [
  'refetchOnReconnect: true', 'refetchOnWindowFocus: true', 'feedQuery.refetch()',
  'refetchInterval: OPERATIONS_FEED_AUTO_REFRESH_MS', 'refetchIntervalInBackground: false',
  "timeline_type === 'event_delivery_disruption'", "timeline_type === 'event_stream_message'",
  "if (sourceSurface === '/control-tower') return '/action-center';",
  'Showing the last available operations-feed snapshot. Try refreshing again before acting on time-sensitive information.',
  "viewScope === 'new'", 'timelineItemSearchText(item, ui)', "timeWindow === '24h'"
];
for (const contract of readOnlyContracts) if (!pageSource.includes(contract)) fail(`Operations Feed read-only coordination behavior changed: ${contract}`);
if (!process.exitCode) pass('Operations Feed remains a read-only coordination surface with source-workflow follow-up.');

if (!process.exitCode) console.log('Tenant Real-time Operations Feed multilingual hardening: PASS');
