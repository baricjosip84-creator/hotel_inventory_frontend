#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const registry = read('src/app/navigationRegistry.ts');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/AppLayout.tsx');
const intelligenceReviewPage = read('src/pages/HumanInLoopAIReviewPage.tsx');
const collaborationPage = read('src/pages/EnterpriseCollaborationPage.tsx');
const digitalTwinPage = read('src/pages/DigitalTwinVisualizationPage.tsx');
const reliabilityCommandPage = read('src/pages/ReliabilityCommandPage.tsx');
const alertsPage = read('src/pages/AlertsPage.tsx');
const learningFeedbackPage = read('src/pages/DecisionLearningFeedbackPage.tsx');
const procurementRecommendationsPage = read('src/pages/ProcurementRecommendationsPage.tsx');
const executionRequestsPage = read('src/pages/ExecutionRequestsPage.tsx');
const usageLedgerPage = read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const requisitionsPage = read('src/pages/InventoryRequisitionsPage.tsx');
const executionTasksPage = read('src/pages/ExecutionTasksPage.tsx');
const reservationsPage = read('src/pages/InventoryReservationsPage.tsx');
const purchaseOrdersPage = read('src/pages/PurchaseOrdersPage.tsx');
const shipmentsPage = read('src/pages/ShipmentsPage.tsx');
const outboundPage = read('src/pages/OutboundPage.tsx');
const enterpriseInventoryTabs = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');
const approvalsTab = read('src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');
const cycleCountsTab = read('src/components/enterpriseInventory/tabs/CycleCountsTab.tsx');
const invoicesTab = read('src/components/enterpriseInventory/tabs/InvoicesTab.tsx');
const supplierReturnsTab = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const attentionMarker = read('src/components/ui/SidebarAttentionMarker.tsx');
const attentionStyles = read('src/components/ui/SidebarAttentionStyles.ts');
const attentionItemsHook = read('src/lib/sidebarAttentionItems.ts');

const commercialRoutes = [
  {
    route: '/action-center',
    routerPath: 'action-center',
    page: 'src/pages/OperationalActionCenterPage.tsx',
    label: 'Action Center'
  },
  {
    route: '/workspace',
    routerPath: 'workspace',
    page: 'src/pages/RoleAwareWorkspacePage.tsx',
    label: 'Workspace'
  },
  {
    route: '/mobile-execution',
    routerPath: 'mobile-execution',
    page: 'src/pages/MobileExecutionPage.tsx',
    label: 'Mobile Execution'
  },
  {
    route: '/real-time-operations-feed',
    routerPath: 'real-time-operations-feed',
    page: 'src/pages/RealTimeOperationsFeedPage.tsx',
    label: 'Operations Feed'
  },
  {
    route: '/workflow-composer',
    routerPath: 'workflow-composer',
    page: 'src/pages/WorkflowAutomationComposerPage.tsx',
    label: 'Workflow Composer'
  },
  {
    route: '/intelligence-review',
    routerPath: 'intelligence-review',
    page: 'src/pages/HumanInLoopAIReviewPage.tsx',
    label: 'Intelligence Review'
  },
  {
    route: '/collaboration',
    routerPath: 'collaboration',
    page: 'src/pages/EnterpriseCollaborationPage.tsx',
    label: 'Collaboration'
  },
  {
    route: '/digital-twin',
    routerPath: 'digital-twin',
    page: 'src/pages/DigitalTwinVisualizationPage.tsx',
    label: 'Digital Twin'
  },
  {
    route: '/reliability-command',
    routerPath: 'reliability-command',
    page: 'src/pages/ReliabilityCommandPage.tsx',
    label: 'Reliability Command'
  }
];

const requiredShellExports = [
  'tenantNavigationSections',
  'tenantModuleRegistry',
  'getTenantModuleForPathname',
  'getTenantPageMeta',
  'searchTenantModules'
];

const requiredLayoutSignals = [
  'tenantNavigationSections',
  'getTenantModuleForPathname',
  'getTenantPageMeta',
  'getTenantAccessSnapshot',
  'visibleNavSections'
];

const failures = [];

for (const exportName of requiredShellExports) {
  if (!registry.includes(exportName)) {
    failures.push(`navigationRegistry.ts is missing commercial shell export/signal: ${exportName}`);
  }
}

for (const signal of requiredLayoutSignals) {
  if (!layout.includes(signal)) {
    failures.push(`AppLayout.tsx is missing unified shell signal: ${signal}`);
  }
}

for (const item of commercialRoutes) {
  if (!registry.includes(`to: '${item.route}'`)) {
    failures.push(`navigationRegistry.ts is missing registry route ${item.route}`);
  }

  if (!registry.includes(`label: '${item.label}'`)) {
    failures.push(`navigationRegistry.ts is missing commercial label ${item.label}`);
  }

  if (!router.includes(`path: '${item.routerPath}'`)) {
    failures.push(`router.tsx is missing route path ${item.routerPath}`);
  }

  if (!existsSync(join(root, item.page))) {
    failures.push(`commercial page file is missing: ${item.page}`);
  }
}


if (!router.includes("path: 'ai-review'") || !router.includes('LegacyAIReviewRedirect')) {
  failures.push('router.tsx must keep the legacy /ai-review redirect for old bookmarks and deep links.');
}

for (const signal of [
  'Recommendation reviews',
  'Readiness & governance',
  'It does not prove that an external AI model was used',
  'How this result was produced',
  "activeView === 'recommendations'",
  "activeView === 'readiness'"
]) {
  if (!intelligenceReviewPage.includes(signal)) {
    failures.push(`Intelligence Review page is missing clarity/split-view signal: ${signal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './EnterpriseCollaborationPage.css';",
  "type CollaborationView = 'recommendations' | 'limits'",
  'data-collaboration-refined="true"',
  'Coordination recommendations',
  'Safety and limits'
]) {
  if (!collaborationPage.includes(signal)) {
    failures.push(`Collaboration page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  'canViewDiagnostics',
  "view === 'diagnostics'",
  'Technical response diagnostics',
  'JSON.stringify(response, null, 2)'
]) {
  if (collaborationPage.includes(forbiddenSignal)) {
    failures.push(`Collaboration page must keep technical diagnostics out of the normal tenant-owner interface: ${forbiddenSignal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './DigitalTwinVisualizationPage.css';",
  "type DigitalTwinView = 'context' | 'limits'",
  'data-digital-twin-refined="true"',
  'Operational context',
  'Safety and limits'
]) {
  if (!digitalTwinPage.includes(signal)) {
    failures.push(`Digital Twin page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  'canViewDiagnostics',
  "view === 'diagnostics'",
  'Technical response diagnostics',
  'JSON.stringify(response, null, 2)'
]) {
  if (digitalTwinPage.includes(forbiddenSignal)) {
    failures.push(`Digital Twin page must keep technical diagnostics out of the normal tenant-owner interface: ${forbiddenSignal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './ReliabilityCommandPage.css';",
  "type ReliabilityView = 'posture' | 'review-path' | 'limits'",
  'data-reliability-refined="true"',
  'Posture and risks',
  'Manual review path',
  'Safety and limits'
]) {
  if (!reliabilityCommandPage.includes(signal)) {
    failures.push(`Reliability Command page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  'TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ',
  'canViewDiagnostics',
  "view === 'diagnostics'",
  'Technical response diagnostics',
  'JSON.stringify(response.diagnostics, null, 2)'
]) {
  if (reliabilityCommandPage.includes(forbiddenSignal)) {
    failures.push(`Reliability Command page must keep technical diagnostics out of the normal tenant-owner interface: ${forbiddenSignal}`);
  }
}

for (const signal of [
  "import { TenantNavIcon } from '../components/ui/TenantNavIcon';",
  "import './AlertsPage.css';",
  'data-alerts-refined="true"',
  'Operational alert control',
  'Alert queue'
]) {
  if (!alertsPage.includes(signal)) {
    failures.push(`Alerts page is missing approved tenant presentation signal: ${signal}`);
  }
}

for (const signal of [
  "queryKey: ['alerts', 'navigation-attention'",
  "'/alerts/attention-summary'",
  'TENANT_PERMISSIONS.ALERTS_WRITE',
  'TENANT_PERMISSIONS.ALERTS_OVERRIDE',
  'canActOnAlerts',
  'alertAttentionScope',
  'tenantAccess.userId, alertAttentionScope',
  'executionRequestAttentionScope',
  'tenantAccess.userId, executionRequestAttentionScope',
  'intelligenceReviewAttentionScope',
  'tenantAccess.userId, intelligenceReviewAttentionScope',
  'hasAlertAttention',
  'hasTenantUserAttentionActor',
  '!supportSession.isSupportSession',
  'const canReadAlerts = hasTenantUserAttentionActor',
  'const canViewExecutionRequests = hasTenantUserAttentionActor',
  'const canViewIntelligenceReview = hasTenantUserAttentionActor',
  'const hasTenantActorForOperationalAttention = hasTenantUserAttentionActor',
  'alertIndicatorDot',
  "width: '280px', minWidth: '280px'",
  "whiteSpace: 'normal'",
  "marginLeft: 'auto'",
  "t('common.openAlertsAttention')",
  "'/navigation-attention/operational-summary'",
  "queryKey: ['tenant-sidebar', 'operational-navigation-attention'",
  'operationalNavigationAttentionScope',
  "`po-approve-${role || 'unknown'}`",
  "`supplier-return-approve-${role || 'unknown'}`",
  'tenantAccess.userId, operationalNavigationAttentionScope',
  'TENANT_MUTATION_FEEDBACK_EVENT',
  "queryKey: ['tenant-sidebar', 'operational-navigation-attention']",
  'hasUsageLedgerAttention',
  'hasRequisitionAttention',
  'hasExecutionTaskAttention',
  'hasReservationAttention',
  'hasPurchaseOrderAttention',
  'hasShipmentAttention',
  'hasOutboundAttention',
  'hasInventoryControlsAttention',
  'canExecuteInventoryApprovalQueueForAttention',
  'canApproveSupplierReturnsForAttention',
  'canApproveDepartmentRequisitionsInQueueForAttention',
  'canApproveCycleCountsInQueueForAttention',
  'canApproveSupplierInvoicesInQueueForAttention',
  'canApproveSupplierReturnsInQueueForAttention',
  'canReconcileCycleCountsForAttention',
  'canDispatchSupplierReturnsForAttention',
  'canManageSupplierInvoicesForAttention',
  'canReceiveShipmentsForAttention',
  'canFinalizeShipmentsForAttention',
  'shipments',
  'invoice_payment_due_count',
  'inventory_controls',
  "queryKey: ['decision-learning-feedback', 'navigation-attention'",
  "'/decision-intelligence-feedback/attention-summary'",
  'learningFeedbackAttentionScope',
  'hasLearningFeedbackAttention',
  "queryKey: ['procurement-recommendations', 'navigation-attention'",
  "'/reorder-insights/recommendations/attention-summary'",
  'procurementRecommendationAttentionScope',
  'hasProcurementRecommendationAttention',
]) {
  if (!layout.includes(signal)) {
    failures.push(`AppLayout.tsx is missing the role-aware alert navigation attention signal: ${signal}`);
  }
}

for (const forbiddenSignal of [
  "'/alerts?resolved=false&limit=1'",
  "queryKey: ['alerts', 'navigation-open-indicator'",
  'hasOpenAlerts'
]) {
  if (layout.includes(forbiddenSignal)) {
    failures.push(`AppLayout.tsx must not use existence-only alert navigation attention: ${forbiddenSignal}`);
  }
}



for (const supportUnsafeSignal of [
  'const canReadAlerts = tenantAccess.hasTenantContext',
  'const canViewExecutionRequests = tenantAccess.hasTenantContext',
  'const canViewIntelligenceReview = tenantAccess.hasTenantContext'
]) {
  if (layout.includes(supportUnsafeSignal)) {
    failures.push(`Sidebar attention must fail closed during support sessions: ${supportUnsafeSignal}`);
  }
}

const approvedSidebarAttentionPaths = [
  '/alerts',
  '/execution-requests',
  '/intelligence-review',
  '/inventory-usage',
  '/inventory-requisitions',
  '/execution-tasks',
  '/inventory-reservations',
  '/purchase-orders',
  '/shipments',
  '/outbound',
  '/enterprise-inventory',
  '/decision-learning-feedback',
  '/procurement-recommendations'
];

const sidebarAttentionDotCount = (layout.match(/style=\{styles\.alertIndicatorDot\}/g) || []).length;
if (sidebarAttentionDotCount !== approvedSidebarAttentionPaths.length) {
  failures.push(`AppLayout.tsx must expose exactly ${approvedSidebarAttentionPaths.length} approved role-actionable sidebar attention dots; found ${sidebarAttentionDotCount}.`);
}

for (const approvedPath of approvedSidebarAttentionPaths) {
  if (!layout.includes(`item.to === '${approvedPath}'`)) {
    failures.push(`AppLayout.tsx is missing approved sidebar attention binding for ${approvedPath}.`);
  }
}

// v3.49.124: the vague page-wide explanation banner is intentionally disabled.
// The actual record(s) that caused the sidebar dot must be marked in the authoritative queue instead.
if (!layout.includes('v3.49.124: intentionally hidden')) {
  failures.push('AppLayout.tsx must keep the old page-wide red-dot explanation banner commented out.');
}
if (layout.includes('data-sidebar-attention-explanation="true"')) {
  failures.push('The page-wide red-dot explanation banner must remain hidden; exact queue items now carry attention markers.');
}

const exactAttentionItemSources = [
  [alertsPage, 'Alerts'],
  [executionRequestsPage, 'Execution Requests'],
  [intelligenceReviewPage, 'Intelligence Review'],
  [learningFeedbackPage, 'Learning Feedback'],
  [procurementRecommendationsPage, 'Procurement Recommendations'],
  [usageLedgerPage, 'Usage Ledger'],
  [requisitionsPage, 'Requisitions'],
  [executionTasksPage, 'Execution Tasks'],
  [reservationsPage, 'Reservations'],
  [purchaseOrdersPage, 'Purchase Orders'],
  [shipmentsPage, 'Shipments'],
  [outboundPage, 'Outbound'],
  [approvalsTab, 'Inventory Controls approvals'],
  [cycleCountsTab, 'Inventory Controls cycle counts'],
  [invoicesTab, 'Inventory Controls invoices'],
  [supplierReturnsTab, 'Inventory Controls supplier returns']
];
for (const [source, label] of exactAttentionItemSources) {
  if (!source.includes('data-sidebar-attention-item')) failures.push(`${label} must mark the exact row/card responsible for its sidebar red dot.`);
  if (!source.includes('SidebarAttentionMarker')) failures.push(`${label} must visibly label the exact actionable row/card as Attention required.`);
}
if (!attentionMarker.includes('data-sidebar-attention-item-marker="true"')) failures.push('Shared exact-record attention marker is missing.');
if (!attentionMarker.includes('data-sidebar-attention-tab-marker="true"')) failures.push('Shared sub-tab attention dot is missing.');
if (attentionMarker.includes('export const sidebarAttentionItemStyle')) failures.push('SidebarAttentionMarker.tsx must export React components only so Vite Fast Refresh lint stays valid.');
if (!attentionStyles.includes('export const sidebarAttentionItemStyle')) failures.push('Shared sidebar attention row style must live in SidebarAttentionStyles.ts, outside the React component module.');
if (!attentionItemsHook.includes('identityKey') || !attentionItemsHook.includes('permissionKey')) failures.push('Exact-record attention queries must include tenant/user/permission identity in their cache key.');
if (!attentionItemsHook.includes('tenantAccess.hasTenantContext')) failures.push('Exact-record attention queries must fail closed without tenant context.');
for (const [source, label] of [
  [outboundPage, 'Outbound'],
  [enterpriseInventoryTabs, 'Inventory Controls'],
  [learningFeedbackPage, 'Learning Feedback'],
  [intelligenceReviewPage, 'Intelligence Review'],
  [usageLedgerPage, 'Usage Ledger'],
  [procurementRecommendationsPage, 'Procurement Recommendations'],
  [executionTasksPage, 'Execution Tasks'],
  [reservationsPage, 'Reservations'],
  [purchaseOrdersPage, 'Purchase Orders'],
  [shipmentsPage, 'Shipments']
]) {
  if (!source.includes('SidebarAttentionTabDot')) failures.push(`${label} must point to the relevant internal tab when attention could otherwise be hidden behind another view.`);
}


if (!learningFeedbackPage.includes("review_item_count || 0") || !learningFeedbackPage.includes("ui('Feedback records')")) {
  failures.push('Learning Feedback must put a sub-tab attention dot on Feedback records when its human review board has actionable items.');
}
if (!intelligenceReviewPage.includes("'/operational-action-center/human-in-loop-ai-reviews/escalation-attention-summary'") || !intelligenceReviewPage.includes('intelligenceAttentionQuery.data?.requires_attention')) {
  failures.push('Intelligence Review must use the role-aware escalation attention summary to mark Recommendation reviews.');
}
if (!usageLedgerPage.includes('usageAttentionItemsQuery.data?.requires_attention') || !usageLedgerPage.includes('ui("Ledger")')) {
  failures.push('Usage Ledger must mark the Ledger tab when exact review items are actionable.');
}

for (const [source, signal, message] of [
  [learningFeedbackPage, "queryKey: ['decision-learning-feedback', 'navigation-attention']", 'Learning Feedback review actions must immediately refresh their sidebar/page attention state.'],
  [procurementRecommendationsPage, 'queryKey: ["procurement-recommendations"]', 'Procurement Recommendation actions must invalidate the recommendation query prefix so navigation attention refreshes immediately.']
]) {
  if (!source.includes(signal)) failures.push(message);
}

if (/item\.to === ['"]\/action-center['"][\s\S]{0,240}alertIndicatorDot/.test(layout)) {
  failures.push('Action Center must remain an aggregation/routing surface and must not receive a sidebar red dot from its current mixed read/action summary.');
}

for (const forbiddenAttentionPath of ['/mobile-execution', '/stock-transfers', '/automation-schedules']) {
  const escaped = forbiddenAttentionPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`item\\.to === ['\"]${escaped}['\"][\\s\\S]{0,240}alertIndicatorDot`);
  if (pattern.test(layout)) {
    failures.push(`${forbiddenAttentionPath} must not receive a sidebar red dot without a distinct unresolved role-actionable condition.`);
  }
}

if (!registry.includes("commercialSurface: 'command'")) {
  failures.push('navigationRegistry.ts is missing command commercial surface classification.');
}

if (!registry.includes('TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ')) {
  failures.push('navigationRegistry.ts is missing action-center permission gating.');
}

if (!registry.includes('TENANT_PERMISSIONS.PLATFORM_RELIABILITY_READ')) {
  failures.push('navigationRegistry.ts is missing reliability command permission gating.');
}

if (failures.length > 0) {
  console.error('Commercial frontend regression check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Commercial frontend regression check passed for ${commercialRoutes.length} command routes.`);
