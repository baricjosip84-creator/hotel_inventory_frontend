import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('src/pages/MobileExecutionPage.tsx');
const scanner = read('src/pages/ScannerPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(read('package.json'));
let passed = 0;
const checks = [];
const check = (label, condition) => {
  checks.push(label);
  if (!condition) {
    console.error(`FAIL - ${label}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`PASS - ${label}`);
  }
};

check('Mobile Execution uses the execution-task mobile queue', page.includes("/execution-tasks/mobile-queue?${params.toString()}"));
check('My/Unassigned/Team scopes are explicit', page.includes("type AssignmentScope = 'mine' | 'unassigned' | 'team'") && page.includes("label: 'My tasks'") && page.includes("label: 'Unassigned tasks'") && page.includes("label: 'Team tasks'"));
check('responsibility scope is sent to the server', page.includes("new URLSearchParams({ assignment_scope: assignmentScope"));
check('Mobile Execution defaults to My tasks', page.includes("useState<AssignmentScope>('mine')"));
check('offline take is part of the mobile action contract', page.includes("type MobileAction = 'take' | 'start' | 'complete' | 'block' | 'unblock'") && page.includes("operation.action === 'take'"));
check('Take task is a visible action', page.includes("take: 'Take task'"));
check('another team member task is read-only', page.includes("assignment === 'other'") && page.includes("Mobile Execution will not let you change its task state."));
check('assignment owner is visible', page.includes("ui('Assigned to')") && page.includes('task.assigned_to_name'));
check('physical location is visible', page.includes("ui('Location')") && page.includes('task.storage_location_name') && page.includes('from_location') && page.includes('to_location'));
check('deadline and overdue state are visible', page.includes("ui('Deadline')") && page.includes('task.is_overdue') && page.includes("ui('Due soon')"));
check('queue uses server-side offset pagination', page.includes('const PAGE_SIZE = 25') && page.includes("offset: String(page * PAGE_SIZE)") && page.includes('pagination.has_more'));
check('pagination remains recoverable on an empty later page', page.includes('(page > 0 || total > PAGE_SIZE)'));
check('queue displays the visible range and total', page.includes("Showing {from}-{to} of {total}"));

check('task scanner entry is wired from Mobile Execution', page.includes("/scanner?mode=task&executionTaskId=${encodeURIComponent(task.id)}"));
check('scanner recognizes task mode', scanner.includes("type ScannerMode = 'shipment' | 'product' | 'task'"));
check('task scanner calls governed verification endpoint', scanner.includes("/execution-tasks/${encodeURIComponent(executionTaskId)}/mobile-scan-verify"));
check('task scanner does not claim to execute source workflow', scanner.includes('It does not perform the stock movement or source-workflow action.') && scanner.includes('must still be completed in its source page.'));
check('successful task verification shows task evidence', scanner.includes("ui('Verified execution task')") && scanner.includes('taskVerification.task_code || taskVerification.task_id'));
check('successful task verification can open the real source workflow', scanner.includes("navigate(executionTaskSourceUrl(taskVerification))") && scanner.includes("ui('Open source workflow')"));
check('successful task verification can return to Mobile Execution', scanner.includes("navigate('/mobile-execution')") && scanner.includes("ui('Back to Mobile Execution')"));
check('task resolving state is explicit', scanner.includes("ui('Verifying barcode against the selected execution task...')"));

check('mobile photo capture uses the device camera hint', page.includes('accept="image/*" capture="environment"'));
check('mobile evidence upload targets the existing Execution Task attachment store', page.includes("entity_type: 'execution_task'") && page.includes('/enterprise-inventory/attachments/upload?'));
check('evidence upload requires attachment write and task read permission', page.includes('TENANT_PERMISSIONS.ATTACHMENTS_WRITE') && page.includes('TENANT_PERMISSIONS.EXECUTION_TASKS_READ'));
check('photo and general evidence controls are present', page.includes("ui('Take photo')") && page.includes("ui('Add evidence')"));

for (const key of [
  'My tasks', 'Unassigned tasks', 'Team tasks', 'Take task', 'Assigned to', 'Deadline',
  'Scan/verify task item', 'Take photo', 'Add evidence', 'Execution Task Scanner',
  'Scan a product, package, or inventory label to verify that it belongs to the selected execution task.',
  'Verified execution task', 'Task item verified. Complete the real source workflow before completing the execution task.'
]) {
  check(`translation catalog includes ${key}`, translations.includes(`["${key}"`) || translations.includes(`['${key}'`));
}
check('v160 frontend guard is wired into check:ci', (pkg.scripts?.['check:ci'] || '').includes('check:mobile-execution-operational-completion-v349160'));

if (process.exitCode) process.exit(process.exitCode);
console.log(`v3.49.160 Mobile Execution operational completion frontend: ${passed}/${checks.length} PASS`);
