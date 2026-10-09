import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const backend = process.env.BACKEND_ROOT || path.resolve(root, '../hotel-inventory-backend');
const read = (base, file) => fs.readFileSync(path.join(base, file), 'utf8');
const tab = read(root, 'src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');
const derived = read(root, 'src/components/enterpriseInventory/EnterpriseInventoryDerived.ts');
const reqPage = read(root, 'src/pages/InventoryRequisitionsPage.tsx');
const tr = read(root, 'src/i18n/tenantUiTranslations.ts');
const reqService = read(backend, 'src/services/inventory/inventoryRequisitionService.js');
const enterpriseService = read(backend, 'src/services/inventory/enterpriseInventoryService.js');
const reqRoute = read(backend, 'src/routes/inventoryRequisitions.js');
const reqController = read(backend, 'src/controllers/inventoryRequisitionsController.js');
const approvalTab = read(root, 'src/components/enterpriseInventory/EnterpriseInventoryProcurementWorkflowPanels.tsx');
let passed = 0;
function check(name, fn) { fn(); console.log(`PASS ${++passed}: ${name}`); }

check('original approval queue only includes department requisitions', () => assert.match(derived, /entity_type: 'department_requisition'/));
check('original department pending approval filter preserved', () => assert.match(derived, /filter\(\(item\) => item\.status === 'pending_approval'\)/));
check('two distinct requisition services are verified', () => { assert.match(reqService, /FROM inventory_requisitions/); assert.match(enterpriseService, /FROM department_requisitions/); });
check('inventory requisition submission remains submitted', () => assert.match(reqService, /status = 'submitted'/));
check('original department requisition workflow preserved', () => assert.match(enterpriseService, /const nextStatus = rule \? 'pending_approval' : 'approved'/));
check('manager direct approval enforces inventory requisitions permission', () => assert.match(reqService, /requireTenantPermission\(authContext, TENANT_PERMISSIONS\.INVENTORY_REQUISITIONS_APPROVE\)/));
check('inventory approval still guards self-approval', () => assert.match(reqService, /INVENTORY_REQUISITION_SELF_APPROVAL_BLOCKED/));
check('inventory approval still checks submitted status', () => assert.match(reqService, /Only submitted requisitions can be approved/));
check('queue reads same trusted backend as Requisitions', () => assert.match(tab, /apiRequest<SubmittedInventoryRequisition\[]>\(/));
check('queue requests only submitted records from server', () => assert.match(tab, /\/inventory-requisitions\?status=submitted&limit=/));
check('queue route requires inventory-requisitions read', () => assert.match(reqRoute, /requirePermission\(TENANT_PERMISSIONS\.INVENTORY_REQUISITIONS_READ\)/));
check('controller extracts request tenant', () => assert.match(reqController, /tenantId: assertTenantContext\(req\)/));
check('service scopes to tenant id', () => assert.match(reqService, /const conditions = \['ir\.tenant_id = \$1'\]/));
check('query gated by both read and approve permissions', () => { assert.match(tab, /hasPermission\(TENANT_PERMISSIONS\.INVENTORY_REQUISITIONS_READ\)/); assert.match(tab, /hasPermission\(TENANT_PERMISSIONS\.INVENTORY_REQUISITIONS_APPROVE\)/); assert.match(tab, /enabled: canReviewInventoryRequisitions/); });
check('not using shared enterprise approval-execute mutation for inventory', () => assert.doesNotMatch(tab, /handleApprovalAction\(item, 'approved'\).*inventory_requisition/));
check('inventory rows navigate to correct request detail', () => assert.match(tab, /navigate\(`\/inventory-requisitions\?requisitionId=\$\{encodeURIComponent\(item\.id\)\}`\)/));
check('target page understands requisitionId', () => assert.match(reqPage, /searchParams\.get\('requisitionId'\)/));
check('query cache separated from ordinary requisition list', () => assert.match(tab, /'approval-queue-submitted', requisitionPage/));
check('queue refetches when revisited', () => assert.match(tab, /refetchOnMount: 'always'/));
check('server-side pagination applied', () => { assert.match(tab, /REQUISITION_APPROVAL_PAGE_SIZE \+ 1/); assert.match(tab, /offset=\$\{requisitionPage \* REQUISITION_APPROVAL_PAGE_SIZE\}/); });
check('table displays limited page, detecting more', () => { assert.match(tab, /\.slice\(0, REQUISITION_APPROVAL_PAGE_SIZE\)/); assert.match(tab, /hasMoreRequisitions/); });
check('previous page navigation protected from negative indices', () => assert.match(tab, /Math\.max\(0, page - 1\)/));
check('next page navigation only when more available', () => assert.match(tab, /disabled=\{!hasMoreRequisitions\}/));
check('failed queue read surfaces operational error', () => assert.match(tab, /submittedRequisitionsQuery\.isError/));
check('failed read has recovery action', () => assert.match(tab, /submittedRequisitionsQuery\.refetch\(\)/));
check('no false empty state while loading', () => assert.match(tab, /submittedRequisitionsQuery\.isSuccess && submittedRequisitions\.length === 0/));
check('distinct source workflows explained to users', () => assert.match(tab, /The rules below govern Department requisitions, not Inventory requisitions/));
check('other approval entities still use existing action handler', () => assert.match(tab, /handleApprovalAction\(item, 'approved'\)/));
check('other approval queue source remains unchanged', () => assert.match(approvalTab, /approvalQueue=\{approvalQueue\}/));
check('all nine new UI texts translated across five locales', () => {
  const labels = ['Submitted inventory requisitions', 'Inventory requisitions use their own approval workflow. Open the request to review and approve it. The rules below govern Department requisitions, not Inventory requisitions.', 'Loading submitted requisitions…', 'Submitted requisitions could not be loaded. The approval queue may be incomplete.', 'No submitted inventory requisitions waiting for review.', 'No further submitted requisitions. Return to the previous page.', 'Other approval requests', 'No other approval requests are waiting.', 'Open requisition'];
  for (const label of labels) {
    const line = tr.split('\n').find((x) => x.startsWith(`  [${JSON.stringify(label)},`));
    assert.ok(line, `Missing translation: ${label}`);
    assert.equal((line.match(/", "/g) || []).length, 4, `Missing one of five locales: ${label}`);
  }
});
check('new flow introduces no database migration or backend change', () => assert.doesNotMatch(tab, /createApprovalRuleMutation\.mutate\(\{/));
console.log(`PASS ${passed}/${passed} Batch 071 approval-queue visibility checks`);
