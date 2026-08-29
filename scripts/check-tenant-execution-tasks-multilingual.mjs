import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/ExecutionTasksPage.tsx');
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
if (missing.length) fail(`Execution Tasks ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Execution Tasks page has ${literalSet.size} catalog-backed literal UI keys.`);

const conditionalUiKeys = [
  'Workflow access', 'Read-only access', 'Refreshing…', 'Refresh',
  'Priority order is active, so open work is ranked by urgency, status, source, and due risk.',
  'Find tenant work, review its status, and open a task for actions and detail.',
  'Priority order on', 'Use priority order', 'Loading tasks…', 'No execution tasks match the current filters.',
  'Loading…', 'Workload, SLA, mobile queues, batches, and planning', 'Scan required', 'No scan required',
  'Blocked reason', 'Cancellation reason'
];
const missingConditional = conditionalUiKeys.filter((key) => !unique.has(key));
if (missingConditional.length) fail(`Execution Tasks conditional/dynamic UI keys missing translations: ${missingConditional.join(' | ')}`);
else pass('Execution Tasks conditional/dynamic presentation branches are catalog-backed.');

const renderStart = pageSource.indexOf('export default function');
const renderSource = renderStart >= 0 ? pageSource.slice(renderStart) : pageSource;
const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Execution Tasks: ${rawText.join(' | ')}`);
else pass('Execution Tasks page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain in Execution Tasks: ${rawAttributes.join(' | ')}`);
else pass('Execution Tasks page has zero raw literal hero/section/placeholder/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "import type { AppLocale } from '../i18n/config';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(parsed, locale)',
  'formatLocalizedNumber(value, locale, { maximumFractionDigits: 2 })',
  "ui('{start}–{end} of {total} matching tasks')",
  "ui('Audit trail ({count})')",
]) if (!pageSource.includes(required)) fail(`Execution Tasks shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Execution Tasks uses the shared tenant translation runtime with locale-aware date and numeric presentation.');

for (const required of [
  "path: 'execution-tasks'",
  'TENANT_PERMISSIONS.EXECUTION_TASKS_READ',
  '<ExecutionTasksPage />',
]) if (!routerSource.includes(required)) fail(`Execution Tasks tenant route contract changed or missing: ${required}`);
for (const required of [
  "EXECUTION_TASKS_READ: 'execution_tasks.read'",
  "EXECUTION_TASKS_CREATE: 'execution_tasks.create'",
  "EXECUTION_TASKS_ASSIGN: 'execution_tasks.assign'",
  "EXECUTION_TASKS_UPDATE: 'execution_tasks.update'",
  "EXECUTION_TASKS_CANCEL: 'execution_tasks.cancel'",
  "EXECUTION_TASKS_COMPLETE: 'execution_tasks.complete'",
  "INVENTORY_OPTIMIZATION_READ: 'inventory_optimization.read'",
  "INVENTORY_OPTIMIZATION_CREATE: 'inventory_optimization.create'",
]) if (!permissionsSource.includes(required)) fail(`Execution Tasks frontend permission identifier changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Execution Tasks route and task/optimization permission identifiers remain unchanged.');

for (const required of [
  "'/execution-tasks/options'",
  "priorityQueueMode ? '/execution-tasks/priority-queue' : '/execution-tasks'",
  '`/execution-tasks/summary?${summaryParams.toString()}`',
  '`/execution-tasks/${requestedTaskId}`',
  '`/execution-tasks/batches?${batchParams.toString()}`',
  '`/execution-tasks/workload?${workloadParams.toString()}`',
  '`/execution-tasks/sla-queue?${slaParams.toString()}`',
  '`/execution-tasks/throughput-dashboard?${throughputParams.toString()}`',
  '`/execution-tasks/mobile-queue?${mobileParams.toString()}`',
  "'/optimization-plans/execution-dashboard?limit=10&minimum_score=0'",
  "'/optimization-plans/mobile-visibility?limit=8&minimum_score=0'",
  '`/execution-tasks/${selected.id}/audit?limit=100`',
  '`/execution-tasks/${taskId}`',
  "'/execution-tasks'",
  '`/execution-tasks/${task.id}/${action}`',
  '`/execution-tasks/batches/${batch.id}/${action}`',
  '`/execution-tasks/analytics.csv?${params.toString()}`',
  "'/optimization-plans/analytics.csv?days=90&limit=10000&minimum_score=0'",
  "'/optimization-plans/ai-recommendations'",
]) if (!pageSource.includes(required)) fail(`Execution Tasks read/mutation/analytics endpoint contract changed or missing: ${required}`);
if (!process.exitCode) pass('Execution Tasks task/batch/audit/analytics and embedded optimization endpoint contracts remain unchanged.');

for (const required of [
  'const canRead = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);',
  'const canCreate = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CREATE);',
  'const canAssign = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_ASSIGN);',
  'const canUpdate = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE);',
  'const canComplete = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE);',
  'const canCancel = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CANCEL);',
  'const canReadOptimization = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_READ);',
  'const canCreateOptimization = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE);',
]) if (!pageSource.includes(required)) fail(`Execution Tasks capability boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Execution Tasks read/create/assign/update/complete/cancel and optimization capability boundaries remain unchanged.');

for (const required of [
  'task_type: form.task_type', 'priority: form.priority', 'status: form.status', 'source_type: form.source_type',
  "source_id: form.source_type === 'manual' ? null : form.source_id.trim()",
  'facility_id: form.facility_id.trim() || null', 'storage_location_id: form.storage_location_id || null',
  'assigned_to: form.assigned_to || null', 'due_at: toIsoOrNull(form.due_at)', 'sla_due_at: toIsoOrNull(form.sla_due_at)',
  '? { assigned_to: assigneeId }', '? { blocked_reason: value.trim() }', '? { cancellation_reason: value.trim() }', '? { completion_note: value.trim() }',
  "title: 'AI recommendation scaffolding'", "recommendation_mode: 'operations_review'", 'minimum_score: 0', 'limit: 25',
]) if (!pageSource.includes(required)) fail(`Execution Tasks canonical payload/value contract changed: ${required}`);
if (!process.exitCode) pass('Execution Tasks create/lifecycle/batch/optimization payload keys and canonical values remain unchanged.');

for (const required of [
  '`execution-task-analytics-${new Date().toISOString().slice(0, 10)}.csv`',
  '`inventory-optimization-analytics-${new Date().toISOString().slice(0, 10)}.csv`',
  "title: 'AI recommendation scaffolding'",
]) if (!pageSource.includes(required)) fail(`Execution Tasks technical export/planning contract changed unexpectedly: ${required}`);
for (const forbidden of [
  "downloadTextFile(csv, ui(`execution-task-analytics-",
  "downloadTextFile(csv, ui(`inventory-optimization-analytics-",
  "title: ui('AI recommendation scaffolding')",
]) if (pageSource.includes(forbidden)) fail(`Execution Tasks translates technical/stored contract data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Technical CSV filenames and stored optimization request title remain canonical data.');

for (const required of [
  'task.task_code', 'task.title', 'task.description', 'task.step_label', 'task.blocked_reason', 'task.cancellation_reason', 'task.completion_note',
  'user.name', 'user.email', 'location.name', 'batch.batch_code', 'batch.title', 'item.recommendation', 'item.rationale',
  'row.action', 'String(value)', 'error.message',
]) if (!pageSource.includes(required)) fail(`Execution Tasks business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(task.title)', 'ui(task.description)', 'ui(task.step_label)', 'ui(task.blocked_reason)', 'ui(task.cancellation_reason)', 'ui(task.completion_note)',
  'ui(user.name)', 'ui(user.email)', 'ui(location.name)', 'ui(batch.title)', 'ui(item.recommendation)', 'ui(item.rationale)', 'ui(error.message)',
]) if (pageSource.includes(forbidden)) fail(`Execution Tasks translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Task/batch/operator/location/recommendation/audit/error business and server data remain raw.');

for (const required of [
  'Operational task queue', 'Task queue', 'Create operational task', 'Task detail', 'Management insights',
  'Execution batches', 'Operator workload', 'Mobile execution queue', 'SLA and escalation queue', 'Advisory optimization',
  'Coordinate tenant work from assignment through completion. Execution tasks organize and evidence the work; stock-changing actions remain governed by their source workflows.',
  'Create a coordination record for tenant work. If the work changes stock, use the source module to perform the actual stock transaction.',
  'Confirm the information that will be written to the task audit trail.', 'Confirm {action}',
  'Generated advisory plan {planCode} with {count} signals. No task or stock record was changed.',
  'Complete filtered task analytics exported. The export is safely limited to 10,000 rows.',
  'No execution tasks match the current filters.', 'No audit events were returned for this task.',
]) if (!unique.has(required)) fail(`Execution Tasks page-completion presentation is not catalog-backed: ${required}`);
if (!process.exitCode) pass('Execution Tasks shell, queue/create/detail/actions, management analytics, batches, mobile/SLA, and advisory presentation are catalog-backed.');

if (process.exitCode) process.exit(process.exitCode);
pass('Tenant Execution Tasks multilingual page-completion checks passed.');
