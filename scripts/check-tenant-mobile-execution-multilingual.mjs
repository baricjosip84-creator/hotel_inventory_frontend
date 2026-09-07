import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/MobileExecutionPage.tsx');
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
const keys = rows.map((row) => row[0]);
const catalog = new Set(keys);
if (keys.length !== catalog.size) {
  const seen = new Set();
  const duplicates = [...new Set(keys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
const decode = (literal) => literal.startsWith('"')
  ? JSON.parse(literal)
  : JSON.parse(`"${literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
const literalKeys = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literalKeys.push(decode(match[1])); } catch { /* lint/typecheck owns malformed source */ }
}
const missingLiteral = [...new Set(literalKeys.filter((key) => !catalog.has(key)))];
if (missingLiteral.length) fail(`Mobile Execution has ui() literals missing from five-language catalog: ${missingLiteral.join(' | ')}`);
else pass(`Mobile Execution has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamic = [
  'All urgency', 'Critical', 'High', 'Medium', 'Low',
  'All task sources', 'Execution requests', 'Manual', 'Reservation', 'Requisition', 'Purchase order', 'Shipment', 'Transfer', 'Cycle count', 'Replenishment',
  'My tasks', 'Unassigned tasks', 'Team tasks', 'Work assigned to you.', 'Work that still needs an owner.', 'Assigned work across the team. Other people’s tasks are read-only here.',
  'Take task', 'Start', 'Complete', 'Block', 'Unblock',
  'Unknown', 'Ready', 'Assigned', 'In progress', 'Blocked', 'Completed', 'Cancelled', 'Overdue', 'Due soon', 'Scheduled', 'No deadline', 'Execution request',
  'Mobile work queue'
];
const missingDynamic = dynamic.filter((key) => !catalog.has(key));
if (missingDynamic.length) fail(`Mobile Execution dynamic labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamic.length} dynamic Mobile Execution labels are catalog-backed.`);

for (const contract of [
  'useAppTranslation()',
  'formatLocalizedDateTime(date, locale)',
  'formatLocalizedNumber(total, locale)',
  'formatLocalizedNumber(numberValue(summary.overdue), locale)',
  'formatLocalizedNumber(pending.length, locale)',
  'formatLocalizedNumber(task.compact_payload.quantity, locale)'
]) if (!pageSource.includes(contract)) fail(`Mobile Execution locale formatting contract missing: ${contract}`);
if (!process.exitCode) pass('Mobile Execution dates, counts and quantities use the selected application locale.');

for (const contract of [
  "type AssignmentScope = 'mine' | 'unassigned' | 'team'",
  "new URLSearchParams({ assignment_scope: assignmentScope, limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) })",
  "params.set('urgency', urgency)",
  "params.set('source_type', sourceType)",
  "apiRequest<MobileExecutionResponse>(`/execution-tasks/mobile-queue?${params.toString()}`)",
  "apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync'",
  "type MobileAction = 'take' | 'start' | 'complete' | 'block' | 'unblock'",
  'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE)',
  'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_COMPLETE)',
  'hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_WRITE)',
  "entity_type: 'execution_task'",
  "to={`/scanner?mode=task&executionTaskId=${encodeURIComponent(task.id)}`}",
  '(page > 0 || total > PAGE_SIZE)'
]) if (!pageSource.includes(contract)) fail(`Mobile Execution API/permission/workflow contract changed: ${contract}`);
if (!process.exitCode) pass('Mobile Execution responsibility, offline action, scanner, evidence and pagination contracts remain language-independent.');

for (const pattern of [
  "ui('/mobile-execution')", 'ui("/mobile-execution")',
  "ui('/execution-tasks/mobile-queue')", 'ui("/execution-tasks/mobile-queue")',
  "ui('/inventory-capabilities/mobile-sync')", 'ui("/inventory-capabilities/mobile-sync")',
  "ui('mine')", "ui('unassigned')", "ui('team')", "ui('shipment')", "ui('critical')"
]) if (pageSource.includes(pattern)) fail(`Canonical Mobile Execution technical value must remain language-independent: ${pattern}`);

for (const contract of [
  "{task.title || ui('Untitled mobile task')}",
  "{task.description || localizedSystemText(task.step_label_key, task.step_label, 'No task summary was provided.', ui)}",
  'task.step_label_key', 'task.assigned_to_name', 'task.storage_location_name', 'task.source_route', 'task.source_id',
  'mobileExecutionQuery.error instanceof ApiError ? mobileExecutionQuery.error.message'
]) if (!pageSource.includes(contract)) fail(`Mobile Execution backend/business display contract changed: ${contract}`);
for (const forbidden of ['ui(task.title)', 'ui(task.description)', 'ui(task.assigned_to_name)', 'ui(mobileExecutionQuery.error.message)']) {
  if (pageSource.includes(forbidden)) fail(`Backend-returned business/error content must not be blindly translated: ${forbidden}`);
}
if (!pageSource.includes("return text ? (key ? ui(text) : text) : ui(fallback);")) fail('Mobile Execution must translate backend text only when the backend marks it as stable system-owned text.');
if (!process.exitCode) pass('Mobile Execution keeps user/business task text raw while localizing keyed backend-owned step guidance.');

if (!pageSource.includes('LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))')) fail('Mobile Execution legacy unscoped cache cleanup must remain intact.');
if (!pageSource.includes('getTenantObservabilityIdentity(getAccessToken())') || !pageSource.includes("const scope = `${identity.tenantId}:${actorType}:${actorId}`")) fail('Mobile Execution cached/offline data must remain tenant-and-user scoped.');
else pass('Mobile Execution offline cache remains tenant/user isolated and cleans legacy unscoped keys.');

for (const contract of [
  "path: 'mobile-execution'",
  'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ',
  'TENANT_PERMISSIONS.EXECUTION_TASKS_READ',
  '<MobileExecutionPage />'
]) if (!routerSource.includes(contract)) fail(`Mobile Execution router permission contract changed: ${contract}`);
if (!process.exitCode) pass('Mobile Execution router access contract remains intact.');

if (!process.exitCode) console.log('Tenant Mobile Execution multilingual and operational contract: PASS');
