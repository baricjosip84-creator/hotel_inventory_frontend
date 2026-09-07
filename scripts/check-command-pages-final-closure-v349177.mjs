import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
let passed = 0;
const check = (condition, message) => {
  if (condition) { console.log(`PASS: ${message}`); passed += 1; }
  else failures.push(message);
};

const packageJson = JSON.parse(read('package.json'));
const ci = String(packageJson.scripts?.['check:ci'] || '');
const mobile = read('src/pages/MobileExecutionPage.tsx');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const workflow = read('src/pages/WorkflowAutomationComposerPage.tsx');
const copilot = read('src/pages/AIOperationsCopilotPage.tsx');
const crossDomain = read('src/pages/CrossDomainOptimizationPage.tsx');
const digitalTwin = read('src/pages/DigitalTwinVisualizationPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const crossDomainGuard = read('scripts/check-cross-domain-optimization-operational-completion-v349170.mjs');

check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit still leads frontend CI');
check(ci.includes('npm run check:command-pages-final-closure-v349177'), 'v3.49.177 final command-page closure guard is wired into frontend CI');

check(mobile.includes('function mobileStorageAvailable()') && mobile.includes('function writeStored(') && mobile.includes('function writeStoredRaw('), 'Mobile Execution browser storage reads/writes are wrapped in failure-safe helpers');
check(mobile.includes("setStorageAvailable(false)") && mobile.includes('Offline storage is unavailable. Mobile Execution will continue'), 'Mobile Execution stays usable and tells the user when persistent offline storage is unavailable');
check(mobile.includes("params.set('requisitionId', task.source_id)") && mobile.includes("params.set('request_id', task.source_id)"), 'Mobile Execution opens exact requisition and execution-request source records');
check(mobile.includes('function canOpenTaskSource') && mobile.includes('TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ') && mobile.includes('TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW'), 'Mobile Execution source-workflow links are permission-aware');

check(feed.includes("params.set('alert_id', sourceId)"), 'Operations Feed opens the exact alert when an alert source ID is available');
check(workflow.includes("params.set('alert_id', sourceId)"), 'Workflow Composer opens the exact alert when its trigger reference is an alert ID');

check(copilot.includes('function permittedEvidenceHref') && copilot.includes("'/alerts': TENANT_PERMISSIONS.ALERTS_READ") && copilot.includes("'/suppliers': TENANT_PERMISSIONS.SUPPLIERS_READ"), 'AI Copilot evidence links are restricted to source pages the user may read');
check(copilot.includes('capabilities.canViewOperationalActionCenter && capabilities.canViewDecisionIntelligence') && copilot.includes('selectedRun.execution_request_id && capabilities.canViewExecutionRequests') && copilot.includes('selectedRun.purchase_order_id && capabilities.canViewPurchaseOrders'), 'AI Copilot review, Execution Request, and Purchase Order links are destination-permission aware');

check(!crossDomain.includes("navigate('/tenant-tasks')") && crossDomain.includes("navigate('/execution-tasks')"), 'Cross-Domain Optimization Tasks handoff uses the tenant Execution Tasks route, never the platform tenant-tasks route');
check(crossDomain.includes('canOpenIntelligenceReview') && crossDomain.includes('TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ') && crossDomain.includes('canOpenTasks') && crossDomain.includes('TENANT_PERMISSIONS.EXECUTION_TASKS_READ') && crossDomain.includes('canOpenExecutionRequests') && crossDomain.includes('TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW'), 'Cross-Domain handoff controls respect destination-page permissions');
check(crossDomainGuard.includes("navigate('/execution-tasks')") && !crossDomainGuard.includes("navigate('/tenant-tasks')"), 'Cross-Domain v3.49.170 regression guard now protects the correct tenant Tasks route');

check(digitalTwin.includes('function matchingCountLabel') && digitalTwin.includes("return bounded ? `${ui('At least')} ${formatted}` : formatted;"), 'Digital Twin headline counts visibly say At least when bounded source coverage may omit older records');
check((digitalTwin.match(/matchingCountLabel\(/g) || []).length >= 5, 'Digital Twin applies bounded-count wording across hero, summary, and list counts');

for (const phrase of [
  'Offline storage is unavailable. Mobile Execution will continue, but cached queue pages and queued actions are kept only while this page remains open.',
  'Task action is queued for this open page only. Keep this page open until the device is online so it can synchronize.',
  'Task action is waiting in this open page because synchronization could not be confirmed. Keep this page open until it can retry.'
]) check(catalog.includes(JSON.stringify(phrase)), `five-language catalog contains: ${phrase}`);

if (failures.length) {
  console.error(`Command pages final closure v3.49.177: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Command pages final closure v3.49.177: ${passed}/${passed} PASS.`);
