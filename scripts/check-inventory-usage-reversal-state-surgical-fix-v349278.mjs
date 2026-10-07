import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/InventoryUsagePage.tsx'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'src/pages/inventoryUsage/InventoryUsageDashboard.tsx'), 'utf8');
const backendRoot = process.env.BACKEND_ROOT;
let backendService = '';
if (backendRoot) {
  backendService = fs.readFileSync(path.join(backendRoot, 'src/services/inventory/stockService.js'), 'utf8');
}

const checks = [
  ['reversal requires a reason prompt', page.includes('ui("Why are you reversing this usage entry?")')],
  ['blank reversal reason is rejected locally', page.includes('if (!reversalReason || !reversalReason.trim())')],
  ['mutation receives trimmed reason', page.includes('reversalReason: reversalReason.trim()')],
  ['reversal success callback waits for reconciliation', page.includes('onSuccess: async (data, variables) => {')],
  ['reversal invalidations are awaited together', page.includes('await Promise.all([')],
  ['usage log list is invalidated after reversal', page.includes('queryKey: ["inventory-usage-logs-page"]')],
  ['selected usage detail is invalidated after reversal', page.includes('queryKey: ["inventory-usage-log-detail-page", variables.usageLogId]')],
  ['reversing id is gated by mutation pending state', page.includes('reversingUsageId={reverseUsageMutation.isPending ? (reverseUsageMutation.variables?.usageLogId || null) : null}')],
  ['terminal reversed rows do not render reverse action', dashboard.includes('permissions.canReverse && !usage.reversed_at')],
  ['active row disables action only while same reversal is pending', dashboard.includes('disabled={reversingUsageId === usage.id}')],
  ['transient reversing label remains available only for active request', dashboard.includes('? ui("Reversing...")')],
  ['persisted reversed state remains visible', dashboard.includes('<strong>{ui("Reversed")}</strong>')],
  ['reversal reason remains visible after completion', dashboard.includes('usage.reversal_reason || ui("No reversal reason")')],
  ['global generic mutation toast stays suppressed for reverse button', dashboard.includes('data-skip-global-action-feedback="true"')],
];

if (backendRoot) {
  checks.push(
    ['backend still rejects already reversed usage', backendService.includes("USAGE_LOG_ALREADY_REVERSED")],
    ['backend reversal permission remains enforced', backendService.includes('TENANT_PERMISSIONS.INVENTORY_USAGE_REVERSE')],
  );
}

let passed = 0;
for (const [label, ok] of checks) {
  if (!ok) {
    console.error(`FAIL: ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${label}`);
    passed += 1;
  }
}
console.log(`${passed}/${checks.length} checks passed`);
if (process.exitCode) process.exit(process.exitCode);
