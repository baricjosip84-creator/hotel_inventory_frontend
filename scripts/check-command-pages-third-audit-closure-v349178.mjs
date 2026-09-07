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
const scanner = read('src/pages/ScannerPage.tsx');
const enterpriseController = read('src/components/enterpriseInventory/EnterpriseInventoryPageController.ts');
const adaptive = read('src/pages/AdaptivePolicyEnginePage.tsx');
const mobileGuard = read('scripts/check-mobile-execution-operational-completion-v349160.mjs');

check(ci.startsWith('npm run check:tenant-multilingual-closure-audit && '), 'tenant multilingual closure audit still leads frontend CI');
check(ci.includes('npm run check:command-pages-third-audit-closure-v349178'), 'v3.49.178 third-audit closure guard is wired into frontend CI');

check(scanner.includes('function canOpenExecutionTaskSource')
  && scanner.includes('TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ')
  && scanner.includes('TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ')
  && scanner.includes('TENANT_PERMISSIONS.PURCHASE_ORDERS_READ')
  && scanner.includes('TENANT_PERMISSIONS.SHIPMENTS_READ')
  && scanner.includes('TENANT_PERMISSIONS.STOCK_TRANSFERS_READ')
  && scanner.includes('TENANT_PERMISSIONS.CYCLE_COUNTS_READ')
  && scanner.includes('TENANT_PERMISSIONS.PAR_LEVELS_READ')
  && scanner.includes('TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW'),
  'Scanner source-workflow handoff checks the destination read permission for every governed source type');
check(scanner.includes('if (!canOpenExecutionTaskSource(verification)) return null;'), 'Scanner suppresses source navigation when the destination is not permitted');
check(scanner.includes("params.set('requisitionId', sourceId)"), 'Scanner opens the exact Inventory Requisition record');
check(scanner.includes("params.set('transfer_id', sourceId)") && !scanner.includes("params.set('transferId', sourceId)"), 'Scanner uses the Stock Transfers page exact transfer_id contract');
check(scanner.includes("params.set('request_id', sourceId)"), 'Scanner opens the exact Execution Request record');
check(scanner.includes("verification.source_type === 'cycle_count'") && scanner.includes("params.set('tab', 'cycle-counts')"), 'Scanner sends Cycle Count work to the Cycle Counts section');
check(scanner.includes("verification.source_type === 'replenishment'") && scanner.includes("params.set('tab', 'par-levels')"), 'Scanner sends replenishment work to the Par Levels section');
check(scanner.includes('executionTaskSourceUrl(taskVerification) ? (') && scanner.includes('if (sourceUrl) navigate(sourceUrl);'), 'Scanner only renders/uses the source-workflow button when an allowed source URL exists');

check(enterpriseController.includes('useSearchParams')
  && enterpriseController.includes("const requestedTab = searchParams.get('tab')?.trim() || ''")
  && enterpriseController.includes('isEnterpriseInventoryTabAccessible(key, subscriptionAccess)'),
  'Enterprise Inventory honors a requested tab only when that tab is permitted and entitled');

check(adaptive.includes('const canOpenIntelligenceReview = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ)')
  && adaptive.includes('hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)'),
  'Adaptive Policy Review handoff checks both Intelligence Review route permissions');
check(adaptive.includes("recommendation.source_action_id && canOpenIntelligenceReview ? <a")
  && adaptive.includes("recommendation.source_action_id && !canOpenIntelligenceReview ? ui('Not available')"),
  'Adaptive Policy hides the Review link and shows a non-action state when Intelligence Review is unavailable');

check(mobileGuard.includes('const sourceUrl = executionTaskSourceUrl(taskVerification);')
  && mobileGuard.includes('if (sourceUrl) navigate(sourceUrl);'),
  'legacy Mobile Execution completion guard now protects permission-safe source navigation');

if (failures.length) {
  console.error(`Command pages third-audit closure v3.49.178: ${passed} passed / ${failures.length} failed.`);
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`Command pages third-audit closure v3.49.178: ${passed}/${passed} PASS.`);
