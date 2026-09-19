import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const tasks = read('src/pages/ExecutionTasksPage.tsx');
const outbound = read('src/pages/OutboundPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
const checks = [];
const check = (condition, message) => checks.push({ condition: Boolean(condition), message });

check(outbound.includes("setPickOrderId(isPickingOpen ? '' : order.id)"), 'Outbound order action is a real Open Picking / Close Picking toggle');
check(outbound.includes("isPickingOpen ? ui('Close Picking') : ui('Open Picking')") && !outbound.includes("isPickingOpen ? ui('Picking Open')"), 'Outbound no longer renders a clickable no-op Picking Open state');
check(outbound.includes('const pickingWorkbenchRef = useRef<HTMLElement | null>(null);') && outbound.includes("pickingWorkbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })"), 'opening Picking moves the user to the workbench');
check(outbound.includes('<section ref={pickingWorkbenchRef} className="outbound-panel">'), 'the rendered Picking workbench owns the scroll target');
check(tasks.includes('execution_task_capability?: {') && tasks.includes('can_be_assigned?: boolean;'), 'Execution Task user options carry backend capability evidence');
check(tasks.includes('disabled={!canUserBeAssignedExecutionTask(user)}') && tasks.includes('executionTaskAssigneeOptionLabel(user, ui)'), 'assignment lists visibly disable users who cannot complete tasks');
check(tasks.includes("ui(canUserBeAssignedExecutionTask(user) ? 'Can complete' : 'Cannot complete task')"), 'assignee options explain completion capability in plain language');
check(tasks.includes("if (form.assigned_to && !canUserBeAssignedExecutionTask(selectedCreateAssignee)) return ui('Select a user who can work and complete execution tasks.')"), 'manual task creation cannot submit an incapable assignee');
check(tasks.includes("Boolean(dialog.kind === 'task' && dialog.assigneeId && canUserBeAssignedExecutionTask(selectedAssignee))"), 'assign confirmation fails closed when the selected user cannot complete the task');
check(tasks.includes('const currentUserId = getCurrentTenantUserId();') && tasks.includes('const assignedToAnotherUser = Boolean(task.assigned_to && task.assigned_to !== currentUserId);'), 'Execution Tasks resolves the current tenant user and detects another assignee');
check(tasks.includes('const canWorkTask = canUpdate && canComplete && !assignedToAnotherUser;'), 'Start and Complete are only offered to a fully capable current owner or on unassigned work');
check(tasks.includes("{canWorkTask && ['ready', 'assigned', 'blocked'].includes(task.status)") && tasks.includes("{canWorkTask && ['ready', 'assigned', 'in_progress'].includes(task.status)"), 'Start and Complete both use the ownership-aware worker rule');
for (const key of ['Close Picking', 'Can complete', 'Cannot complete task', 'Select a user who can work and complete execution tasks.', 'This user cannot be assigned because they cannot currently work and complete execution tasks.']) {
  check(translations.includes(`["${key}"`), `translation catalog contains ${key}`);
}
check(pkg.scripts['check:inventory-testing-hardening-v349207'] === 'node scripts/check-inventory-testing-hardening-v349207.mjs', 'v3.49.207 frontend guard is registered');
for (const key of ['prelint', 'prebuild', 'check:ci']) {
  const chain = pkg.scripts[key] || '';
  const p206 = chain.indexOf('npm run check:inventory-testing-hardening-v349206');
  const p207 = chain.indexOf('npm run check:inventory-testing-hardening-v349207');
  check(p206 >= 0 && p207 > p206, `v3.49.207 frontend guard follows v3.49.206 in ${key}`);
}

const failures = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.message}`);
if (failures.length) {
  console.error(`v3.49.207 Picking and Execution Task assignment frontend guard: FAIL (${checks.length - failures.length}/${checks.length})`);
  process.exit(1);
}
console.log(`v3.49.207 Picking and Execution Task assignment frontend guard: PASS (${checks.length}/${checks.length})`);
