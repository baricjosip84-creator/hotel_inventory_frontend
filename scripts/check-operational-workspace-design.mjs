import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Every visible tenant-navigation route is intentionally listed here. The
// navigation registry is checked against this contract below, so adding a new
// tenant page without putting it on the shared design system fails CI.
const routeContracts = [
  ['/dashboard', ['src/pages/DashboardPage.tsx']],
  ['/action-center', ['src/pages/OperationalActionCenterPage.tsx']],
  ['/workspace', ['src/pages/RoleAwareWorkspacePage.tsx']],
  ['/mobile-execution', ['src/pages/MobileExecutionPage.tsx']],
  ['/real-time-operations-feed', ['src/pages/RealTimeOperationsFeedPage.tsx']],
  ['/workflow-composer', ['src/pages/WorkflowAutomationComposerPage.tsx']],
  ['/intelligence-review', ['src/pages/HumanInLoopAIReviewPage.tsx']],
  ['/ai-copilot', ['src/pages/AIOperationsCopilotPage.tsx']],
  ['/decision-learning-feedback', ['src/pages/DecisionLearningFeedbackPage.tsx']],
  ['/adaptive-policy-engine', ['src/pages/AdaptivePolicyEnginePage.tsx']],
  ['/probabilistic-forecasting', ['src/pages/ProbabilisticForecastingPage.tsx']],
  ['/cross-domain-optimization', ['src/pages/CrossDomainOptimizationPage.tsx']],
  ['/collaboration', ['src/pages/EnterpriseCollaborationPage.tsx']],
  ['/digital-twin', ['src/pages/DigitalTwinVisualizationPage.tsx']],
  ['/reliability-command', ['src/pages/ReliabilityCommandPage.tsx']],
  ['/alerts', ['src/pages/AlertsPage.tsx']],
  ['/insights', ['src/pages/InsightsPage.tsx']],
  ['/system-context', ['src/pages/SystemContextPage.tsx']],
  ['/products', ['src/pages/products/ProductPageContent.tsx']],
  ['/suppliers', ['src/pages/SuppliersPage.tsx']],
  ['/stock', ['src/pages/StockPage.tsx']],
  ['/stock-movements', ['src/pages/StockMovementsPage.tsx']],
  ['/stock-transfers', ['src/pages/StockTransfersPage.tsx']],
  ['/storage-locations', ['src/pages/StorageLocationsPage.tsx']],
  ['/inventory-capabilities', ['src/pages/InventoryCapabilitiesPage.tsx']],
  ['/scanner', ['src/pages/ScannerPage.tsx']],
  ['/outbound', ['src/pages/OutboundPage.tsx']],
  ['/inventory-usage', ['src/pages/inventoryUsage/InventoryUsageDashboard.tsx']],
  ['/inventory-requisitions', ['src/pages/InventoryRequisitionsPage.tsx']],
  ['/inventory-reservations', ['src/pages/InventoryReservationsPage.tsx']],
  ['/execution-requests', ['src/pages/ExecutionRequestsPage.tsx']],
  ['/execution-tasks', ['src/pages/ExecutionTasksPage.tsx']],
  ['/automation-schedules', ['src/pages/AutomationSchedulesPage.tsx']],
  ['/purchase-orders', ['src/pages/PurchaseOrdersPage.tsx']],
  ['/procurement-recommendations', ['src/pages/ProcurementRecommendationsPage.tsx']],
  ['/replenishment-planning', ['src/pages/ReplenishmentPlanningPage.tsx']],
  ['/shipments', ['src/pages/ShipmentsPage.tsx']],
  ['/enterprise-inventory', ['src/components/enterpriseInventory/EnterpriseInventoryPageLayout.tsx', 'src/components/enterpriseInventory/EnterpriseInventoryShared.tsx']],
  ['/reports', ['src/pages/ReportsPage.tsx']],
  ['/users', ['src/pages/UsersPage.tsx']],
  ['/permissions', ['src/components/permissions/RolePermissionEditor.tsx']],
  ['/audit', ['src/pages/TenantAuditPage.tsx']],
  ['/tenant-settings', ['src/pages/TenantSettingsPage.tsx']],
  ['/admin-system', ['src/pages/AdminSystemPage.tsx']],
  ['/sessions', ['src/pages/SessionsPage.tsx']]
];

const tabbedRoutes = new Set([
  '/intelligence-review',
  '/decision-learning-feedback',
  '/adaptive-policy-engine',
  '/probabilistic-forecasting',
  '/cross-domain-optimization',
  '/collaboration',
  '/digital-twin',
  '/reliability-command',
  '/system-context',
  '/products',
  '/inventory-capabilities',
  '/outbound',
  '/inventory-usage',
  '/inventory-reservations',
  '/execution-requests',
  '/automation-schedules',
  '/purchase-orders',
  '/procurement-recommendations',
  '/reports'
]);

// Routes whose normal state deliberately begins Hero -> primary KPIs. The
// subset with tabs is additionally checked for Hero -> KPIs -> Tabs.
const primaryKpiRoutes = new Set([
  '/dashboard', '/action-center', '/workspace', '/mobile-execution', '/real-time-operations-feed',
  '/workflow-composer', '/intelligence-review', '/ai-copilot', '/decision-learning-feedback',
  '/adaptive-policy-engine', '/probabilistic-forecasting', '/cross-domain-optimization',
  '/collaboration', '/digital-twin', '/reliability-command', '/alerts', '/insights', '/system-context',
  '/suppliers', '/stock', '/stock-movements', '/stock-transfers', '/storage-locations',
  '/inventory-capabilities', '/outbound', '/inventory-usage', '/inventory-requisitions',
  '/inventory-reservations', '/execution-requests', '/execution-tasks', '/automation-schedules',
  '/purchase-orders', '/procurement-recommendations', '/replenishment-planning', '/shipments',
  '/enterprise-inventory', '/reports', '/users', '/audit', '/tenant-settings', '/admin-system', '/sessions'
]);

const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

for (const required of ['src/components/ui/OperationalWorkspace.tsx', 'src/components/ui/OperationalWorkspace.css']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`${required}: shared workspace design source is missing`);
}

// Make the design contract exhaustive against the actual tenant navigation.
const navSource = read('src/app/navigationRegistry.ts');
const registryRoutes = [...navSource.matchAll(/\bto:\s*'([^']+)'/g)].map((match) => match[1]);
const contractRoutes = routeContracts.map(([route]) => route);
const registrySet = new Set(registryRoutes);
const contractSet = new Set(contractRoutes);
for (const route of registrySet) if (!contractSet.has(route)) failures.push(`${route}: tenant navigation route is missing from the design-system contract`);
for (const route of contractSet) if (!registrySet.has(route)) failures.push(`${route}: design-system contract no longer maps to a tenant navigation route`);
if (registrySet.size !== 45) failures.push(`tenant navigation registry expected 45 routes, found ${registrySet.size}`);
if (contractSet.size !== 45) failures.push(`design-system contract expected 45 routes, found ${contractSet.size}`);

for (const [route, files] of routeContracts) {
  const missing = files.filter((relative) => !fs.existsSync(path.join(root, relative)));
  if (missing.length) {
    failures.push(`${route}: implementation file(s) missing: ${missing.join(', ')}`);
    continue;
  }
  const source = files.map(read).join('\n');
  if (!source.includes('io-operational-page')) failures.push(`${route}: missing shared operational surface class`);
  if (!source.includes('io-workspace-page')) failures.push(`${route}: missing shared workspace layout class`);
  if (!source.includes('OperationalWorkspaceHero')) failures.push(`${route}: missing shared OperationalWorkspaceHero`);

  if (primaryKpiRoutes.has(route)) {
    const hasStats = source.includes('<OperationalWorkspaceStats') || source.includes('io-workspace-stats');
    const hasStatCard = source.includes('<OperationalWorkspaceStatCard');
    if (!hasStats) failures.push(`${route}: primary KPI surface does not use OperationalWorkspaceStats`);
    if (!hasStatCard) failures.push(`${route}: primary KPI cards do not delegate to OperationalWorkspaceStatCard`);
  }

  if (tabbedRoutes.has(route)) {
    if (!source.includes('OperationalWorkspaceTabs') || !source.includes('OperationalWorkspaceTab')) {
      failures.push(`${route}: tabbed workspace does not use shared OperationalWorkspaceTabs/Tab`);
    }
  }
}

// Canonical normal-state ordering is checked only in direct page sources where
// all three elements live together. Delegated/composed pages are covered by the
// component contract above.
const canonicalFiles = new Map([
  ['/dashboard', 'src/pages/DashboardPage.tsx'],
  ['/action-center', 'src/pages/OperationalActionCenterPage.tsx'],
  ['/workspace', 'src/pages/RoleAwareWorkspacePage.tsx'],
  ['/mobile-execution', 'src/pages/MobileExecutionPage.tsx'],
  ['/real-time-operations-feed', 'src/pages/RealTimeOperationsFeedPage.tsx'],
  ['/workflow-composer', 'src/pages/WorkflowAutomationComposerPage.tsx'],
  ['/intelligence-review', 'src/pages/HumanInLoopAIReviewPage.tsx'],
  ['/ai-copilot', 'src/pages/AIOperationsCopilotPage.tsx'],
  ['/decision-learning-feedback', 'src/pages/DecisionLearningFeedbackPage.tsx'],
  ['/adaptive-policy-engine', 'src/pages/AdaptivePolicyEnginePage.tsx'],
  ['/probabilistic-forecasting', 'src/pages/ProbabilisticForecastingPage.tsx'],
  ['/cross-domain-optimization', 'src/pages/CrossDomainOptimizationPage.tsx'],
  ['/collaboration', 'src/pages/EnterpriseCollaborationPage.tsx'],
  ['/digital-twin', 'src/pages/DigitalTwinVisualizationPage.tsx'],
  ['/reliability-command', 'src/pages/ReliabilityCommandPage.tsx'],
  ['/alerts', 'src/pages/AlertsPage.tsx'],
  ['/insights', 'src/pages/InsightsPage.tsx'],
  ['/system-context', 'src/pages/SystemContextPage.tsx'],
  ['/suppliers', 'src/pages/SuppliersPage.tsx'],
  ['/stock', 'src/pages/StockPage.tsx'],
  ['/stock-movements', 'src/pages/StockMovementsPage.tsx'],
  ['/stock-transfers', 'src/pages/StockTransfersPage.tsx'],
  ['/storage-locations', 'src/pages/StorageLocationsPage.tsx'],
  ['/inventory-capabilities', 'src/pages/InventoryCapabilitiesPage.tsx'],
  ['/outbound', 'src/pages/OutboundPage.tsx'],
  ['/inventory-usage', 'src/pages/inventoryUsage/InventoryUsageDashboard.tsx'],
  ['/inventory-requisitions', 'src/pages/InventoryRequisitionsPage.tsx'],
  ['/inventory-reservations', 'src/pages/InventoryReservationsPage.tsx'],
  ['/execution-requests', 'src/pages/ExecutionRequestsPage.tsx'],
  ['/execution-tasks', 'src/pages/ExecutionTasksPage.tsx'],
  ['/automation-schedules', 'src/pages/AutomationSchedulesPage.tsx'],
  ['/purchase-orders', 'src/pages/PurchaseOrdersPage.tsx'],
  ['/procurement-recommendations', 'src/pages/ProcurementRecommendationsPage.tsx'],
  ['/replenishment-planning', 'src/pages/ReplenishmentPlanningPage.tsx'],
  ['/shipments', 'src/pages/ShipmentsPage.tsx'],
  ['/reports', 'src/pages/ReportsPage.tsx'],
  ['/users', 'src/pages/UsersPage.tsx'],
  ['/audit', 'src/pages/TenantAuditPage.tsx'],
  ['/tenant-settings', 'src/pages/TenantSettingsPage.tsx'],
  ['/admin-system', 'src/pages/AdminSystemPage.tsx'],
  ['/sessions', 'src/pages/SessionsPage.tsx']
]);

for (const [route, relative] of canonicalFiles) {
  const source = read(relative);
  const hero = source.indexOf('<OperationalWorkspaceHero');
  const statsComponent = source.indexOf('<OperationalWorkspaceStats', Math.max(hero, 0));
  const statsClass = source.indexOf('io-workspace-stats', Math.max(hero, 0));
  const statsCandidates = [statsComponent, statsClass].filter((value) => value >= 0);
  const stats = statsCandidates.length ? Math.min(...statsCandidates) : -1;
  if (hero < 0 || stats < 0 || stats < hero) {
    failures.push(`${route}: canonical normal-state order must begin Hero -> primary KPIs`);
    continue;
  }
  if (tabbedRoutes.has(route)) {
    const tabs = source.indexOf('<OperationalWorkspaceTabs', stats);
    if (tabs < 0 || tabs < stats) failures.push(`${route}: canonical tabbed order must be Hero -> primary KPIs -> Tabs`);
  }
}

const sharedSource = read('src/components/ui/OperationalWorkspace.tsx');
const sharedCss = read('src/components/ui/OperationalWorkspace.css');
for (const component of ['OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalWorkspaceStatCard', 'OperationalWorkspaceTabs', 'OperationalWorkspaceTab', 'OperationalSectionHeader']) {
  if (!sharedSource.includes(`export function ${component}`)) failures.push(`OperationalWorkspace.tsx: shared ${component} component is missing`);
}
for (const token of ['.io-workspace-page', '.io-workspace-hero', '.io-workspace-stats', '.io-workspace-stat__label', '.io-workspace-stat__value', '.io-workspace-tabs', '.io-workspace-section-header']) {
  if (!sharedCss.includes(token)) failures.push(`OperationalWorkspace.css: shared design token ${token} is missing`);
}
if (!sharedCss.includes('.io-workspace-page.io-workspace-legacy-normalized .card')) {
  failures.push('OperationalWorkspace.css: legacy tenant-page normalization layer is missing');
}

const reportsSource = read('src/pages/ReportsPage.tsx');
if (!reportsSource.includes('reports-page io-operational-page io-workspace-page')) failures.push('/reports: page root is not explicitly on both shared design contracts');

const productsCss = read('src/pages/products/ProductsPage.css');
for (const legacySelector of ['products-hero', 'products-workspace-tabs', 'products-workspace-tab']) {
  if (productsCss.includes(legacySelector)) failures.push(`ProductsPage.css: legacy ${legacySelector} styling reintroduced`);
}

if (failures.length) {
  console.error('Operational workspace design consistency check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Operational workspace design consistency check passed (${routeContracts.length}/45 tenant routes covered, ${tabbedRoutes.size} shared tab surfaces, shared Hero/KPI rules, exhaustive navigation coverage).`);
