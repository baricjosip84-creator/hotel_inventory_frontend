import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/AutomationSchedulesPage.tsx');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literals.push(decodeLiteral(match[1])); } catch {}
}
const literalSet = new Set(literals);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Automation Schedules ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Automation Schedules page has ${literalSet.size} catalog-backed literal UI keys.`);

const dynamicUiKeys = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Cost Risk Review', 'Prepare a controlled review request for cost-risk signals.',
  'Cost Governance Review', 'Prepare a controlled review request for costing governance and audit readiness.',
  'System Context Review', 'Prepare a reviewable System Context recommendation snapshot.',
  'Execution Readiness Review', 'Prepare a review request for execution gates and readiness signals.',
  'Cost Review', 'System Recommendation', 'Pending Review', 'Automatic', 'Success', 'Idle', 'Manual Run', 'Automatic Run'
];
const missingDynamic = dynamicUiKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Automation Schedules dynamic/fallback display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass('Automation Schedules fallback schedule types, weekdays, and known canonical dynamic display labels are catalog-backed.');

const renderStart = pageSource.indexOf('export default function');
const renderSource = renderStart >= 0 ? pageSource.slice(renderStart) : pageSource;
const rawText = [];
for (const match of renderSource.matchAll(/>\s*([^<>{}\n]*[A-Za-z][^<>{}\n]*)\s*</g)) {
  const value = match[1].trim();
  if (value && !value.startsWith('=')) rawText.push(value);
}
if (rawText.length) fail(`Raw direct JSX presentation remains in Automation Schedules: ${rawText.join(' | ')}`);
else pass('Automation Schedules page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]).filter((value) => value !== 'placeholder="Europe/Zagreb"');
if (rawAttributes.length) fail(`Raw presentation attributes remain in Automation Schedules: ${rawAttributes.join(' | ')}`);
else pass('Automation Schedules page has zero raw literal presentation attributes except the intentionally raw IANA timezone example.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "import type { AppLocale } from '../i18n/config';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(parsed, locale,',
  "ui('{count} drafts').replace('{count}', formatLocalizedNumber",
  "ui('{start}–{end} of {total}')",
  'schedulePattern(schedule, ui)',
  'placeholder="Europe/Zagreb"'
]) if (!pageSource.includes(required)) fail(`Automation Schedules shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Automation Schedules uses the shared tenant translation runtime with locale-aware date/number presentation and preserves the technical timezone identifier.');

for (const required of [
  "path: 'automation-schedules'",
  'TENANT_PERMISSIONS.AUTOMATION_SCHEDULES_VIEW',
  '<AutomationSchedulesPage />'
]) if (!routerSource.includes(required)) fail(`Automation Schedules tenant route contract changed or missing: ${required}`);
for (const required of [
  "AUTOMATION_SCHEDULES_VIEW: 'automation_schedules.view'",
  "AUTOMATION_SCHEDULES_CREATE: 'automation_schedules.create'",
  "AUTOMATION_SCHEDULES_UPDATE: 'automation_schedules.update'",
  "AUTOMATION_SCHEDULES_PAUSE: 'automation_schedules.pause'",
  "AUTOMATION_SCHEDULES_RESUME: 'automation_schedules.resume'",
  "AUTOMATION_SCHEDULES_DISABLE: 'automation_schedules.disable'",
  "EXECUTION_REQUESTS_VIEW: 'execution_requests.view'",
  "EXECUTION_REQUESTS_CREATE: 'execution_requests.create'"
]) if (!permissionsSource.includes(required)) fail(`Automation Schedules frontend permission identifier changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Automation Schedules route and schedule/execution-request permission identifiers remain unchanged.');

for (const required of [
  "apiRequest<AutomationScheduleListResponse>(`/automation-schedules?${query}`)",
  "apiRequest<AutomationScheduleTypesResponse>('/automation-schedules/types')",
  "apiRequest<AutomationRunnerReadinessResponse>('/automation-schedules/runner-readiness')",
  "apiRequest<AutomationRunnerStatusResponse>('/automation-schedules/runner-status')",
  "'/automation-schedules/run-events?limit=25&offset=0'",
  "apiRequest<AutomationSchedule>('/automation-schedules',",
  "`/automation-schedules/${schedule.id}`",
  "`/automation-schedules/${schedule.id}/pause`",
  "`/automation-schedules/${schedule.id}/resume`",
  "`/automation-schedules/${schedule.id}/disable`",
  "`/automation-schedules/${schedule.id}/dry-run`",
  "`/automation-schedules/${schedule.id}/run`",
  "`/automation-schedules/${schedule.id}/audit-pack`",
  "'/automation-schedules/runner/run-once'",
  "'/automation-schedules/runner/unsafe-output-review/acknowledge'"
]) if (!pageSource.includes(required)) fail(`Automation Schedules endpoint contract changed or missing: ${required}`);
if (!process.exitCode) pass('Automation Schedules registry/detail/lifecycle/dry-run/manual-run/runner/audit endpoint contracts remain unchanged.');

for (const required of [
  'const canCreateAutomationSchedules = capabilities.canCreateAutomationSchedules;',
  'const canUpdateAutomationSchedules = capabilities.canUpdateAutomationSchedules;',
  'const canPauseAutomationSchedules = capabilities.canPauseAutomationSchedules;',
  'const canResumeAutomationSchedules = capabilities.canResumeAutomationSchedules;',
  'const canDisableAutomationSchedules = capabilities.canDisableAutomationSchedules;',
  'const canCreateExecutionRequests = capabilities.canCreateExecutionRequests;',
  'const canViewExecutionRequests = capabilities.canViewExecutionRequests;'
]) if (!pageSource.includes(required)) fail(`Automation Schedules capability boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Automation Schedules create/update/pause/resume/disable and linked execution-request capability boundaries remain unchanged.');

for (const required of [
  'automation_type: form.automation_type',
  'schedule_kind: form.schedule_kind',
  'schedule_config: buildScheduleConfig(form)',
  "request_defaults: { default_status: form.default_status }",
  'automation_type: editForm.automation_type',
  'schedule_kind: editForm.schedule_kind',
  'schedule_config: buildScheduleConfig(editForm)',
  "body: JSON.stringify({ disabled_reason: reason.trim() })",
  'body: JSON.stringify({})',
  'body: JSON.stringify({ limit: numberValue(runnerStatus?.batch_limit) || 10, confirm_request_creation: true })',
  'confirm_unsafe_output_review: true',
  'expected_last_unsafe_runner_output_at: expectedLastUnsafeAt',
  'expected_unsafe_runner_output_count: expectedUnsafeCount',
  'review_note: reviewNote.trim()'
]) if (!pageSource.includes(required)) fail(`Automation Schedules mutation payload contract changed or missing: ${required}`);
if (!process.exitCode) pass('Automation Schedules create/update/disable/manual-run/run-once/anomaly-acknowledgement payload contracts remain unchanged.');

for (const required of [
  "type StatusFilter = '' | AutomationSchedule['status'];",
  "type ScheduleKind = 'manual' | 'daily' | 'weekly' | 'monthly';",
  "type RequestDefaultStatus = 'draft' | 'pending_review';",
  "automation_type: 'cost_risk_review'",
  "automation_type: 'cost_governance_review'",
  "automation_type: 'system_context_review'",
  "automation_type: 'execution_readiness_review'",
  "default_request_type: 'cost_review'",
  "default_request_type: 'system_recommendation'",
  "default_status: 'draft'"
]) if (!pageSource.includes(required)) fail(`Automation Schedules canonical status/type/request value changed or missing: ${required}`);
if (!process.exitCode) pass('Automation Schedules canonical schedule/status/type/request values remain unchanged.');

for (const required of [
  '{schedule.name}', '{schedule.type_definition?.label || ui(humanize(schedule.automation_type))}',
  '{selected.name}', "selected.description || ui('No description recorded.')", '{event.schedule_name}',
  '{check.detail}', '{row.label}', "row.by || ui('Unknown user')"
]) if (!pageSource.includes(required)) fail(`Automation Schedules business/server evidence boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Automation Schedules schedule names/descriptions, backend type labels, IDs, check detail, and run-event business/server evidence remain raw.');

if (!process.exitCode) console.log('Automation Schedules multilingual checker PASS.');
