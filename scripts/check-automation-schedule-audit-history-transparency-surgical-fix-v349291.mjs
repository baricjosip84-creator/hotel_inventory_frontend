import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/AutomationSchedulesPage.tsx'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/types/inventory.ts'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/i18n/tenantUiTranslations.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/AutomationSchedulesPage.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
let failed = false;
let passed = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
  else passed += 1;
};

check('audit-pack response exposes typed schedule audit events', types.includes('export interface AutomationScheduleAuditEvent') && types.includes('automation_schedule: AutomationScheduleAuditEvent[]'));
check('schedule event type exposes action, actor, metadata, and timestamp', ['action: string;', 'user_name?: string | null;', 'metadata: Record<string, unknown>;', 'created_at: string;'].every((needle) => types.includes(needle)));
check('audit history has a dedicated focus ref', page.includes('const auditHistoryRef = useRef<HTMLDivElement | null>(null);'));
const loadAuditPackBlock = page.split('const loadAuditPack = async')[1]?.split('const runDueSchedulesOnce = async')[0] || '';
check('loaded audit history scrolls to the audit panel rather than the top of schedule detail', loadAuditPackBlock.includes("auditHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })") && !loadAuditPackBlock.includes("document.getElementById('automation-schedule-detail')?.scrollIntoView"));
check('loaded audit history receives programmatic focus', page.includes('auditHistoryRef.current?.focus({ preventScroll: true });'));
check('audit history panel is an explicit scroll anchor', page.includes('id="automation-schedule-audit-history"') && page.includes('automation-schedules-result-panel automation-schedules-scroll-anchor'));
check('audit history panel is focusable without entering the normal tab order', page.includes('tabIndex={-1}'));
check('schedule event list is rendered from backend audit trail', page.includes('auditPack.audit_trail.automation_schedule.map((event) =>'));
check('event table includes event, actor, time, and context columns', ['ui(\'Event\')', 'ui(\'Actor\')', 'ui(\'When\')', 'ui(\'Context\')'].every((needle) => page.includes(needle)));
check('event actor uses backend user name with system fallback', page.includes("event.user_name || ui('System')"));
check('event timestamp is formatted for the current locale', page.includes('formatDateTime(event.created_at, locale)'));
check('known lifecycle actions receive human-readable labels', ['Schedule created','Schedule updated','Schedule activated','Schedule paused','Schedule disabled'].every((label) => page.includes(`ui('${label}')`)));
check('request-preparation audit actions receive human-readable labels', ['Manual request created','Scheduled request created','Manual request skipped — duplicate found','Scheduled request skipped — duplicate found'].every((label) => page.includes(`ui('${label}')`)));
check('unknown schedule audit actions still have a readable fallback', page.includes("humanize(action.split('.').pop() || action)"));
check('status transitions are surfaced from audit metadata', page.includes('metadata.previous_status') && page.includes('metadata.next_status') && page.includes("ui('Status: {from} → {to}')"));
check('disable reason is surfaced from audit metadata', page.includes('metadata.disabled_reason') && page.includes("ui('Reason: {reason}')"));
check('request type and status are surfaced from audit metadata', page.includes('metadata.request_type') && page.includes('metadata.request_status') && page.includes("ui('Request: {type} · {status}')"));
check('duplicate-skip context is surfaced without raw JSON', page.includes('metadata.duplicate_guard_triggered === true') && page.includes("ui('Duplicate request reused; no new request was created.')"));
check('event table does not expose raw metadata JSON', !page.includes('JSON.stringify(event.metadata'));
check('empty schedule-audit state is explicit', page.includes("ui('No schedule audit events were found.')"));
check('aggregate audit summary remains present', page.includes('auditPack.evidence_summary.schedule_audit_event_count') && page.includes('auditPack.checks.map'));
check('linked execution requests remain present after event detail list', page.includes('auditPack.linked_execution_requests.map'));
check('audit-event table gets dedicated spacing', css.includes('.automation-schedules-audit-events'));
check('new audit labels and context strings are in translation catalog', ['Schedule audit events','Chronological record of schedule lifecycle and request-preparation activity.','No schedule audit events were found.','Status: {from} → {to}','Request: {type} · {status}'].every((label) => translations.includes(`["${label}"`)));
check('new audit-event title translation is unique', (translations.match(/\["Schedule audit events"/g) || []).length === 1);
check('Batch 050 guard is registered', pkg.scripts?.['check:inventory-automation-schedule-audit-history-transparency-v349291'] === 'node scripts/check-automation-schedule-audit-history-transparency-surgical-fix-v349291.mjs');

console.log(`Automation schedule audit-history transparency surgical fix: ${passed}/26 PASS`);
if (failed) process.exit(1);
