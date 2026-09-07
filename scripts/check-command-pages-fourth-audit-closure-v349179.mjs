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
const router = read('src/app/router.tsx');
const mobile = read('src/pages/MobileExecutionPage.tsx');
const feed = read('src/pages/RealTimeOperationsFeedPage.tsx');
const workflow = read('src/pages/WorkflowAutomationComposerPage.tsx');
const copilot = read('src/pages/AIOperationsCopilotPage.tsx');
const actionCenter = read('src/pages/OperationalActionCenterPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit still leads frontend CI');
check(ci.includes('npm run check:command-pages-fourth-audit-closure-v349179'), 'v3.49.179 fourth-audit guard is wired into frontend CI');

check(router.includes('function ScannerProtectedPage()')
  && router.includes("mode === 'task'")
  && router.includes('TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE, TENANT_PERMISSIONS.PRODUCTS_READ')
  && router.includes("mode === 'product'")
  && router.includes('TENANT_PERMISSIONS.SHIPMENTS_READ, TENANT_PERMISSIONS.SHIPMENTS_RECEIVE')
  && router.includes(': [TENANT_PERMISSIONS.SHIPMENTS_READ]'),
  'Scanner route permission contract is mode-aware and matches task/shipment backend requirements');
check(router.includes("path: 'scanner'") && router.includes('element: <ScannerProtectedPage />'), 'Scanner tenant route uses the mode-aware guard');

check(mobile.includes("task.source_type === 'cycle_count'") && mobile.includes("params.set('tab', 'cycle-counts')"), 'Mobile Execution opens Cycle Count work on the Cycle Counts tab');
check(mobile.includes("task.source_type === 'replenishment'") && mobile.includes("params.set('tab', 'par-levels')"), 'Mobile Execution opens replenishment work on the Par Levels tab');

check(feed.includes("if (sourceSurface === '/control-tower') return '/action-center';")
  && !feed.includes("if (sourceSurface === '/control-tower') return '/reliability-command';"),
  'Operations Feed sends Control Tower context to Action Center instead of a separately permissioned Reliability page');
check(feed.includes("if (domain === 'control_tower') return '/action-center';"), 'Operations Feed uses the Action Center icon/path for Control Tower context');
check(workflow.includes("if (sourceSurface === '/control-tower') return '/action-center';")
  && !workflow.includes("if (sourceSurface === '/control-tower') return '/reliability-command';"),
  'Workflow Composer sends Control Tower context to Action Center instead of Reliability Command');

check(actionCenter.includes("if (sourceSurface === '/control-tower') return hasPermission(TENANT_PERMISSIONS.PLATFORM_RELIABILITY_READ) ? '/reliability-command' : null;"),
  'Action Center exposes Reliability Command for Control Tower context only when Reliability permission is present');

const promotionPermissions = [
  'DECISION_INTELLIGENCE_READ',
  'DECISION_INTELLIGENCE_GOVERN',
  'PRODUCTS_READ',
  'STOCK_READ',
  'SHIPMENTS_READ',
  'SUPPLIER_CATALOG_READ',
  'INVENTORY_RESERVATIONS_READ',
  'PURCHASE_ORDERS_READ'
];
check(copilot.includes('const canPromoteReplenishmentForReview = [')
  && promotionPermissions.every((permission) => copilot.includes(`TENANT_PERMISSIONS.${permission}`))
  && copilot.includes('].every((permission) => hasPermission(permission));'),
  'AI Copilot mirrors the complete backend permission set before replenishment promotion');
check(copilot.includes('disabled={!canPromoteReplenishmentForReview || promoteReplenishmentMutation.isPending}'), 'AI Copilot disables review promotion when procurement evidence permissions are incomplete');
check(copilot.includes("ui('Additional procurement access is required to send this replenishment recommendation for review.')"), 'AI Copilot explains why replenishment review promotion is unavailable');
check(translations.includes('Additional procurement access is required to send this replenishment recommendation for review.'), 'new AI Copilot permission guidance is catalog-backed');

if (failures.length) {
  console.error(`Command pages fourth-audit closure v3.49.179: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Command pages fourth-audit closure v3.49.179: ${passed}/${passed} PASS.`);
