#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const parLevels = read('src/components/enterpriseInventory/tabs/ParLevelsTab.tsx');
const stockMutations = read('src/components/enterpriseInventory/EnterpriseInventoryStockMutations.ts');
const stockPanels = read('src/components/enterpriseInventory/EnterpriseInventoryStockOperationsPanels.tsx');
const tasks = read('src/pages/ExecutionTasksPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');
const pkg = read('package.json');

expect(stockMutations.includes('createReplenishmentExecutionTaskMutation'), 'Par-level workflow has a dedicated replenishment execution-task mutation');
expect(stockMutations.includes('`/execution-tasks/from-par-level/${parLevelId}`'), 'Par-level action uses the hardened source-linked backend route');
expect(stockPanels.includes('onCreateExecutionTask={(parLevelId) => createReplenishmentExecutionTaskMutation.mutate(parLevelId)}'), 'Par-level panel wires the source record directly to execution-task creation');
expect(parLevels.includes("ui('Create execution task')"), 'configured par levels expose a human-visible Create execution task action');
expect(parLevels.includes('TENANT_PERMISSIONS.EXECUTION_TASKS_CREATE'), 'source action checks execution-task create permission');
expect(parLevels.includes('TENANT_PERMISSIONS.PAR_LEVELS_READ'), 'source action checks par-level read permission');
expect(parLevels.includes('TENANT_PERMISSIONS.STOCK_READ'), 'source action checks stock read permission');
expect(parLevels.includes('!item.active || !item.storage_location_id'), 'source action is unavailable for inactive or locationless par levels');

expect(tasks.includes('replenishment_capability?: {'), 'execution-task user options type includes replenishment capability');
expect(tasks.includes('can_perform_replenishment: boolean;'), 'frontend consumes the explicit combined replenishment capability');
expect(tasks.includes("sourceType !== 'execution_request' && sourceType !== 'replenishment'"), 'generic advanced linkage no longer asks users for a raw replenishment source UUID');
expect(tasks.includes('Replenishment tasks are created directly from Par levels so the source is selected for you.'), 'generic task guidance routes replenishment work to the source workflow');
expect(tasks.includes('createAssigneeCapabilityWarning'), 'new-task assignment checks the selected user capability');
expect(tasks.includes('replenishmentAssignmentWarning'), 'existing replenishment task reassignment checks the selected user capability');
expect(tasks.includes('Assignee cannot complete the inventory movement alone.'), 'capability mismatch is clearly surfaced to the assigning manager');
expect(tasks.includes('lacks Stock Transfer create and/or execute permission'), 'warning explains the exact operational authority gap');
expect(tasks.includes('An authorized user must record the actual stock transfer.'), 'warning preserves the task/stock-system boundary');

for (const key of [
  'Create execution task',
  'Execution task {taskCode} created from this par level.',
  'Assignee cannot complete the inventory movement alone.',
  'This replenishment task can still coordinate the work, but the selected user lacks Stock Transfer create and/or execute permission. An authorized user must record the actual stock transfer.'
]) {
  expect(translations.includes(`["${key}"`), `tenant multilingual catalog includes: ${key}`);
}

expect(pkg.includes('check:simulation-replenishment-task-delegation-v349153'), 'v153 checker is wired into frontend package scripts');

console.log(`v3.49.153 replenishment task delegation: ${checks.length}/${checks.length} PASS`);
