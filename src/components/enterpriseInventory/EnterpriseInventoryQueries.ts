import { useQuery } from '@tanstack/react-query';
import { fetchTenantSubscriptionAccess, isTenantFeatureAllowed } from '../../lib/tenantSubscriptionAccess';
import { TENANT_PERMISSIONS, hasPermission } from '../../lib/permissions';

import type {
  AlertFilters,
  AuditFilters,
  ExecutionFilters
} from './EnterpriseInventoryTypes';

import {
  fetchParLevels,
  fetchCycleCounts,
  fetchDepartmentRequisitions,
  fetchApprovalRules,
  fetchSupplierInvoices,
  fetchSupplierCatalog,
  fetchNotifications,
  fetchAlerts,
  fetchAuditLogs,
  fetchBarcodeLabels,
  fetchAttachments,
  fetchProducts,
  fetchProductPackages,
  fetchStorageLocations,
  fetchSuppliers,
  fetchAvailableSuppliers,
  fetchSupplierSlaBreaches,
  fetchSupplierPerformance,
  fetchLowStock,
  fetchStockMovements,
  fetchDashboardSummary,
  fetchDashboardLowStock,
  fetchDashboardOverdueShipments,
  fetchDashboardUnresolvedAlerts,
  fetchDashboardRecentActivity,
  fetchDashboardSupplierPerformance,
  fetchInventoryValuationReport,
  fetchStockByLocationReport,
  fetchProductMovementReport,
  fetchProcurementSummaryReport,
  fetchProductCostRiskSummary,
  fetchProductCostValuationSummary,
  fetchProductCostValuationDetails,
  fetchProductCostActionSummary,
  fetchProductCostActionPlanSummary,
  fetchProductCostActionCategorySummary,
  fetchProductCostActionImpactSummary,
  fetchProductCostActionSupplierSummary,
  fetchProductCostActionSourceSummary,
  fetchProductCostActionAgeSummary,
  fetchProductCostActionCoverageSummary,
  fetchProductCostAlertSummary,
  fetchProductCostRecommendationSummary,
  fetchProductCostDashboardSummary,
  fetchProductCostReportSummary,
  fetchProductCostGovernanceSummary,
  fetchProductCostGovernanceDetails,
  fetchProductCostGovernanceAuditPack,
  fetchProductCostGovernanceSignoffSummary,
  fetchProductCostGovernanceReviewQueue,
  fetchProductCostGovernanceReviewPack,
  fetchProductCostGovernanceClosureSummary,
  fetchProductCostGovernanceHandoffSummary,
  fetchProductCostHardeningSummary,
  fetchProductCostOperationsRunbookSummary,
  fetchProductCostOperationsControlSummary,
  fetchProductCostOperationsEvidenceSummary,
  fetchProductCostOperationsReadinessSummary,
  fetchCarryingCostProductionReview,
  fetchDeadStockProductionReview,
  fetchMarginAwareProductionReview,
  fetchProcurementSpendProductionReview,
  fetchReorderRecommendations,
  fetchDepletionRisk,
  fetchSupplierTrustScores,
  fetchOperationalHealth,
  fetchInventoryAnomalies,
  fetchDemandForecast,
  fetchForecastAccuracyBacktest,
  fetchForecastCalibrationReview,
  fetchForecastDataQualityReview,
  fetchForecastReliabilityMatrix,
  fetchAutomationTypes,
  fetchAutomationSchedules,
  fetchAutomationRunnerReadiness,
  fetchAutomationRunnerStatus,
  fetchAutomationRunEvents,
  fetchAutomationRunnerSafetyReport,
  fetchAutomationRunnerGovernancePack,
  fetchAutomationRunnerOperationsReview,
  fetchAutomationRunnerAccountabilityDigest,
  fetchAutomationRunnerPolicyMatrix,
  fetchSystemStatus,
  fetchSystemContext,
  fetchSystemExecutionGate,
  fetchSystemContextSnapshots,
  fetchSystemContextSnapshotComparison,
  fetchSystemContextForecastRisk,
  fetchSupportContext,
  fetchMaintenanceContext,
  fetchAnnouncementContext,
  fetchIncidentContext,
  fetchExecutionAdapters,
  fetchExecutionHardeningSummary,
  fetchExecutionRequests,
  fetchStockTransfers,
  fetchPurchaseOrders,
  fetchShipments,
  fetchShipmentItems,
} from './EnterpriseInventoryApi';

type UseEnterpriseInventoryQueriesParams = {
  productSearch: string;
  productPackageProductId: string;
  supplierSearch: string;
  selectedSupplierPerformanceId: string;
  executionFilters: ExecutionFilters;
  shipmentReceivingShipmentId: string;
  alertFilters: AlertFilters;
  auditFilters: AuditFilters;
  attachmentEntityType: string;
  attachmentEntityId: string;
};

export function useEnterpriseInventoryQueries({
  productSearch,
  productPackageProductId,
  supplierSearch,
  selectedSupplierPerformanceId,
  executionFilters,
  shipmentReceivingShipmentId,
  alertFilters,
  auditFilters,
  attachmentEntityType,
  attachmentEntityId
}: UseEnterpriseInventoryQueriesParams) {
  const tenantSubscriptionAccessQuery = useQuery({
    queryKey: ['tenant-subscription-access', 'enterprise-inventory'],
    queryFn: fetchTenantSubscriptionAccess
  });
  const reportsFeatureReady = Boolean(tenantSubscriptionAccessQuery.data) && isTenantFeatureAllowed(tenantSubscriptionAccessQuery.data, 'reports');
  const automationFeatureReady = Boolean(tenantSubscriptionAccessQuery.data) && isTenantFeatureAllowed(tenantSubscriptionAccessQuery.data, 'automation');
  const purchaseOrdersFeatureReady = Boolean(tenantSubscriptionAccessQuery.data) && isTenantFeatureAllowed(tenantSubscriptionAccessQuery.data, 'purchase_orders');

  const canReadDashboard = hasPermission(TENANT_PERMISSIONS.DASHBOARD_READ);
  const canReadProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ);
  const canReadProductPackages = hasPermission(TENANT_PERMISSIONS.PRODUCT_PACKAGES_READ);
  const canReadSuppliers = hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ);
  const canReadStorageLocations = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ);
  const canReadStock = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canReadStockMovements = hasPermission(TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ);
  const canReadStockTransfers = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_READ);
  const canReadReports = hasPermission(TENANT_PERMISSIONS.REPORTS_READ);
  const canReadInsights = hasPermission(TENANT_PERMISSIONS.INSIGHTS_READ);
  const canReadAutomation = hasPermission(TENANT_PERMISSIONS.AUTOMATION_SCHEDULES_VIEW);
  const canReadSystemStatus = hasPermission(TENANT_PERMISSIONS.SYSTEM_STATUS_READ);
  const canReadSystemContext = hasPermission(TENANT_PERMISSIONS.SYSTEM_CONTEXT_READ);
  const canReadExecutionRequests = hasPermission(TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW);
  const canReadPurchaseOrders = hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ);
  const canReadShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ);
  const canReadShipmentItems = hasPermission(TENANT_PERMISSIONS.SHIPMENT_ITEMS_READ);
  const canReadParLevels = hasPermission(TENANT_PERMISSIONS.PAR_LEVELS_READ);
  const canReadCycleCounts = hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_READ);
  const canReadRequisitions = hasPermission(TENANT_PERMISSIONS.REQUISITIONS_READ);
  const canReadApprovalRules = hasPermission(TENANT_PERMISSIONS.APPROVAL_RULES_READ);
  const canReadInvoices = hasPermission(TENANT_PERMISSIONS.INVOICES_READ);
  const canReadSupplierCatalog = hasPermission(TENANT_PERMISSIONS.SUPPLIER_CATALOG_READ);
  const canReadAttachments = hasPermission(TENANT_PERMISSIONS.ATTACHMENTS_READ);
  const canReadNotifications = hasPermission(TENANT_PERMISSIONS.NOTIFICATIONS_READ);
  const canReadBarcodeLabels = hasPermission(TENANT_PERMISSIONS.BARCODE_LABELS_READ);
  const canReadAlerts = hasPermission(TENANT_PERMISSIONS.ALERTS_READ);
  const canReadAudit = hasPermission(TENANT_PERMISSIONS.AUDIT_READ);

  const productsQuery = useQuery({ queryKey: ['enterprise-products', productSearch], queryFn: () => fetchProducts(productSearch), enabled: canReadProducts });
  const productPackagesQuery = useQuery({
    queryKey: ['enterprise-product-packages', productPackageProductId],
    queryFn: () => fetchProductPackages(productPackageProductId),
    enabled: canReadProductPackages && Boolean(productPackageProductId)
  });
  const storageLocationsQuery = useQuery({ queryKey: ['enterprise-storage-locations'], queryFn: fetchStorageLocations, enabled: canReadStorageLocations });
  const suppliersQuery = useQuery({ queryKey: ['enterprise-suppliers', supplierSearch], queryFn: () => fetchSuppliers(supplierSearch), enabled: canReadSuppliers });
  const availableSuppliersQuery = useQuery({ queryKey: ['enterprise-available-suppliers'], queryFn: fetchAvailableSuppliers, enabled: canReadSuppliers });
  const supplierSlaBreachesQuery = useQuery({ queryKey: ['enterprise-supplier-sla-breaches'], queryFn: fetchSupplierSlaBreaches, enabled: canReadSuppliers });
  const supplierPerformanceQuery = useQuery({
    queryKey: ['enterprise-supplier-performance', selectedSupplierPerformanceId],
    queryFn: () => fetchSupplierPerformance(selectedSupplierPerformanceId),
    enabled: canReadSuppliers && Boolean(selectedSupplierPerformanceId)
  });
  const lowStockQuery = useQuery({ queryKey: ['enterprise-low-stock'], queryFn: fetchLowStock, enabled: canReadStock });
  const stockMovementsQuery = useQuery({ queryKey: ['enterprise-stock-movements'], queryFn: fetchStockMovements, enabled: canReadStockMovements });
  const dashboardSummaryQuery = useQuery({ queryKey: ['enterprise-dashboard-summary'], queryFn: fetchDashboardSummary, enabled: canReadDashboard });
  const dashboardLowStockQuery = useQuery({ queryKey: ['enterprise-dashboard-low-stock'], queryFn: fetchDashboardLowStock, enabled: canReadDashboard });
  const dashboardOverdueShipmentsQuery = useQuery({ queryKey: ['enterprise-dashboard-overdue-shipments'], queryFn: fetchDashboardOverdueShipments, enabled: canReadDashboard });
  const dashboardUnresolvedAlertsQuery = useQuery({ queryKey: ['enterprise-dashboard-unresolved-alerts'], queryFn: fetchDashboardUnresolvedAlerts, enabled: canReadDashboard });
  const dashboardRecentActivityQuery = useQuery({ queryKey: ['enterprise-dashboard-recent-activity'], queryFn: fetchDashboardRecentActivity, enabled: canReadDashboard });
  const dashboardSupplierPerformanceQuery = useQuery({ queryKey: ['enterprise-dashboard-supplier-performance'], queryFn: fetchDashboardSupplierPerformance, enabled: canReadDashboard });
  const inventoryValuationReportQuery = useQuery({ queryKey: ['enterprise-inventory-valuation-report'], queryFn: fetchInventoryValuationReport, enabled: reportsFeatureReady && canReadReports });
  const stockByLocationReportQuery = useQuery({ queryKey: ['enterprise-stock-by-location-report'], queryFn: fetchStockByLocationReport, enabled: reportsFeatureReady && canReadReports });
  const productMovementReportQuery = useQuery({ queryKey: ['enterprise-product-movement-report'], queryFn: fetchProductMovementReport, enabled: reportsFeatureReady && canReadReports });
  const procurementSummaryReportQuery = useQuery({ queryKey: ['enterprise-procurement-summary-report'], queryFn: fetchProcurementSummaryReport, enabled: reportsFeatureReady && canReadReports });
  const productCostRiskSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-risk-summary'], queryFn: fetchProductCostRiskSummary , enabled: canReadProducts });
  const productCostValuationSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-valuation-summary'], queryFn: fetchProductCostValuationSummary , enabled: canReadProducts });
  const productCostValuationDetailsQuery = useQuery({ queryKey: ['enterprise-product-cost-valuation-details'], queryFn: fetchProductCostValuationDetails , enabled: canReadProducts });
  const productCostActionSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-summary'], queryFn: fetchProductCostActionSummary , enabled: canReadProducts });
  const productCostActionPlanSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-plan-summary'], queryFn: fetchProductCostActionPlanSummary , enabled: canReadProducts });
  const productCostActionCategorySummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-category-summary'], queryFn: fetchProductCostActionCategorySummary , enabled: canReadProducts });
  const productCostActionImpactSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-impact-summary'], queryFn: fetchProductCostActionImpactSummary , enabled: canReadProducts });
  const productCostActionSupplierSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-supplier-summary'], queryFn: fetchProductCostActionSupplierSummary , enabled: canReadProducts });
  const productCostActionSourceSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-source-summary'], queryFn: fetchProductCostActionSourceSummary , enabled: canReadProducts });
  const productCostActionAgeSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-age-summary'], queryFn: fetchProductCostActionAgeSummary , enabled: canReadProducts });
  const productCostActionCoverageSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-coverage-summary'], queryFn: fetchProductCostActionCoverageSummary , enabled: canReadProducts });
  const productCostAlertSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-alert-summary'], queryFn: fetchProductCostAlertSummary , enabled: canReadProducts });
  const productCostRecommendationSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-recommendation-summary'], queryFn: fetchProductCostRecommendationSummary , enabled: canReadProducts });
  const productCostDashboardSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-dashboard-summary'], queryFn: fetchProductCostDashboardSummary , enabled: canReadProducts });
  const productCostReportSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-report-summary'], queryFn: fetchProductCostReportSummary , enabled: canReadProducts });
  const productCostGovernanceSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-summary'], queryFn: fetchProductCostGovernanceSummary , enabled: canReadProducts });
  const productCostGovernanceDetailsQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-details'], queryFn: fetchProductCostGovernanceDetails , enabled: canReadProducts });
  const productCostGovernanceAuditPackQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-audit-pack'], queryFn: fetchProductCostGovernanceAuditPack , enabled: canReadProducts });
  const productCostGovernanceSignoffSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-signoff-summary'], queryFn: fetchProductCostGovernanceSignoffSummary , enabled: canReadProducts });
  const productCostGovernanceReviewQueueQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-review-queue'], queryFn: fetchProductCostGovernanceReviewQueue , enabled: canReadProducts });
  const productCostGovernanceReviewPackQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-review-pack'], queryFn: fetchProductCostGovernanceReviewPack , enabled: canReadProducts });
  const productCostGovernanceClosureSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-closure-summary'], queryFn: fetchProductCostGovernanceClosureSummary , enabled: canReadProducts });
  const productCostGovernanceHandoffSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-handoff-summary'], queryFn: fetchProductCostGovernanceHandoffSummary , enabled: canReadProducts });
  const productCostHardeningSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-hardening-summary'], queryFn: fetchProductCostHardeningSummary , enabled: canReadProducts });
  const productCostOperationsRunbookSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-runbook-summary'], queryFn: fetchProductCostOperationsRunbookSummary , enabled: canReadProducts });
  const productCostOperationsControlSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-control-summary'], queryFn: fetchProductCostOperationsControlSummary , enabled: canReadProducts });
  const productCostOperationsEvidenceSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-evidence-summary'], queryFn: fetchProductCostOperationsEvidenceSummary , enabled: canReadProducts });
  const productCostOperationsReadinessSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-readiness-summary'], queryFn: fetchProductCostOperationsReadinessSummary , enabled: canReadProducts });
  const carryingCostProductionReviewQuery = useQuery({ queryKey: ['enterprise-carrying-cost-production-review'], queryFn: fetchCarryingCostProductionReview , enabled: canReadProducts });
  const deadStockProductionReviewQuery = useQuery({ queryKey: ['enterprise-dead-stock-production-review'], queryFn: fetchDeadStockProductionReview , enabled: canReadProducts });
  const marginAwareProductionReviewQuery = useQuery({ queryKey: ['enterprise-margin-aware-production-review'], queryFn: fetchMarginAwareProductionReview , enabled: canReadProducts });
  const procurementSpendProductionReviewQuery = useQuery({ queryKey: ['enterprise-procurement-spend-production-review'], queryFn: fetchProcurementSpendProductionReview , enabled: canReadProducts });
  const reorderRecommendationsQuery = useQuery({ queryKey: ['enterprise-reorder-recommendations'], queryFn: fetchReorderRecommendations , enabled: canReadInsights });
  const depletionRiskQuery = useQuery({ queryKey: ['enterprise-depletion-risk'], queryFn: fetchDepletionRisk , enabled: canReadInsights });
  const supplierTrustScoresQuery = useQuery({ queryKey: ['enterprise-supplier-trust-scores'], queryFn: fetchSupplierTrustScores , enabled: canReadInsights });
  const operationalHealthQuery = useQuery({ queryKey: ['enterprise-operational-health'], queryFn: fetchOperationalHealth , enabled: canReadInsights });
  const inventoryAnomaliesQuery = useQuery({ queryKey: ['enterprise-inventory-anomalies'], queryFn: fetchInventoryAnomalies , enabled: canReadInsights });
  const demandForecastQuery = useQuery({ queryKey: ['enterprise-demand-forecast'], queryFn: fetchDemandForecast , enabled: canReadInsights });
  const forecastAccuracyBacktestQuery = useQuery({ queryKey: ['enterprise-forecast-accuracy-backtest'], queryFn: fetchForecastAccuracyBacktest , enabled: canReadInsights });
  const forecastCalibrationReviewQuery = useQuery({ queryKey: ['enterprise-forecast-calibration-review'], queryFn: fetchForecastCalibrationReview , enabled: canReadInsights });
  const forecastDataQualityReviewQuery = useQuery({ queryKey: ['enterprise-forecast-data-quality-review'], queryFn: fetchForecastDataQualityReview , enabled: canReadInsights });
  const forecastReliabilityMatrixQuery = useQuery({ queryKey: ['enterprise-forecast-reliability-matrix'], queryFn: fetchForecastReliabilityMatrix , enabled: canReadInsights });
  const automationTypesQuery = useQuery({ queryKey: ['enterprise-automation-types'], queryFn: fetchAutomationTypes, enabled: automationFeatureReady && canReadAutomation });
  const automationSchedulesQuery = useQuery({ queryKey: ['enterprise-automation-schedules'], queryFn: fetchAutomationSchedules, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerReadinessQuery = useQuery({ queryKey: ['enterprise-automation-runner-readiness'], queryFn: fetchAutomationRunnerReadiness, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerStatusQuery = useQuery({ queryKey: ['enterprise-automation-runner-status'], queryFn: fetchAutomationRunnerStatus, enabled: automationFeatureReady && canReadAutomation });
  const automationRunEventsQuery = useQuery({ queryKey: ['enterprise-automation-run-events'], queryFn: fetchAutomationRunEvents, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerSafetyReportQuery = useQuery({ queryKey: ['enterprise-automation-runner-safety-report'], queryFn: fetchAutomationRunnerSafetyReport, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerGovernancePackQuery = useQuery({ queryKey: ['enterprise-automation-runner-governance-pack'], queryFn: fetchAutomationRunnerGovernancePack, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerOperationsReviewQuery = useQuery({ queryKey: ['enterprise-automation-runner-operations-review'], queryFn: fetchAutomationRunnerOperationsReview, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerAccountabilityDigestQuery = useQuery({ queryKey: ['enterprise-automation-runner-accountability-digest'], queryFn: fetchAutomationRunnerAccountabilityDigest, enabled: automationFeatureReady && canReadAutomation });
  const automationRunnerPolicyMatrixQuery = useQuery({ queryKey: ['enterprise-automation-runner-policy-matrix'], queryFn: fetchAutomationRunnerPolicyMatrix, enabled: automationFeatureReady && canReadAutomation });
  const systemStatusQuery = useQuery({ queryKey: ['enterprise-system-status'], queryFn: fetchSystemStatus , enabled: canReadSystemStatus });
  const systemContextQuery = useQuery({ queryKey: ['enterprise-system-context'], queryFn: fetchSystemContext , enabled: canReadSystemContext });
  const systemExecutionGateQuery = useQuery({ queryKey: ['enterprise-system-execution-gate'], queryFn: fetchSystemExecutionGate, enabled: canReadSystemContext });
  const systemContextSnapshotsQuery = useQuery({ queryKey: ['enterprise-system-context-snapshots'], queryFn: fetchSystemContextSnapshots , enabled: canReadSystemContext });
  const systemContextSnapshotComparisonQuery = useQuery({ queryKey: ['enterprise-system-context-snapshot-comparison'], queryFn: fetchSystemContextSnapshotComparison , enabled: canReadSystemContext });
  const systemContextForecastRiskQuery = useQuery({ queryKey: ['enterprise-system-context-forecast-risk'], queryFn: fetchSystemContextForecastRisk , enabled: canReadSystemContext });
  const supportContextQuery = useQuery({ queryKey: ['enterprise-support-context'], queryFn: fetchSupportContext , enabled: canReadSystemContext });
  const maintenanceContextQuery = useQuery({ queryKey: ['enterprise-maintenance-context'], queryFn: fetchMaintenanceContext , enabled: canReadSystemContext });
  const announcementContextQuery = useQuery({ queryKey: ['enterprise-announcement-context'], queryFn: fetchAnnouncementContext , enabled: canReadSystemContext });
  const incidentContextQuery = useQuery({ queryKey: ['enterprise-incident-context'], queryFn: fetchIncidentContext , enabled: canReadSystemContext });
  const executionAdaptersQuery = useQuery({ queryKey: ['enterprise-execution-adapters'], queryFn: fetchExecutionAdapters , enabled: canReadExecutionRequests });
  const executionHardeningQuery = useQuery({ queryKey: ['enterprise-execution-hardening'], queryFn: fetchExecutionHardeningSummary , enabled: canReadExecutionRequests });
  const executionRequestsQuery = useQuery({ queryKey: ['enterprise-execution-requests', executionFilters], queryFn: () => fetchExecutionRequests(executionFilters) , enabled: canReadExecutionRequests });
  const stockTransfersQuery = useQuery({ queryKey: ['enterprise-stock-transfers'], queryFn: fetchStockTransfers , enabled: canReadStockTransfers });
  const purchaseOrdersQuery = useQuery({ queryKey: ['enterprise-purchase-orders'], queryFn: fetchPurchaseOrders, enabled: purchaseOrdersFeatureReady && canReadPurchaseOrders });
  const shipmentsQuery = useQuery({ queryKey: ['enterprise-shipments'], queryFn: fetchShipments , enabled: canReadShipments });
  const shipmentItemsQuery = useQuery({
    queryKey: ['enterprise-shipment-items', shipmentReceivingShipmentId],
    queryFn: () => fetchShipmentItems(shipmentReceivingShipmentId),
    enabled: canReadShipmentItems && Boolean(shipmentReceivingShipmentId)
  });
  const parLevelsQuery = useQuery({ queryKey: ['enterprise-par-levels'], queryFn: fetchParLevels , enabled: canReadParLevels });
  const cycleCountsQuery = useQuery({ queryKey: ['enterprise-cycle-counts'], queryFn: fetchCycleCounts , enabled: canReadCycleCounts });
  const requisitionsQuery = useQuery({ queryKey: ['enterprise-requisitions'], queryFn: fetchDepartmentRequisitions , enabled: canReadRequisitions });
  const approvalRulesQuery = useQuery({ queryKey: ['enterprise-approval-rules'], queryFn: fetchApprovalRules , enabled: canReadApprovalRules });
  const invoicesQuery = useQuery({ queryKey: ['enterprise-invoices'], queryFn: fetchSupplierInvoices , enabled: canReadInvoices });
  const supplierCatalogQuery = useQuery({ queryKey: ['enterprise-supplier-catalog'], queryFn: fetchSupplierCatalog , enabled: canReadSupplierCatalog });
  const notificationsQuery = useQuery({ queryKey: ['enterprise-notifications'], queryFn: fetchNotifications , enabled: canReadNotifications });
  const alertsQuery = useQuery({ queryKey: ['enterprise-alerts', alertFilters], queryFn: () => fetchAlerts(alertFilters) , enabled: canReadAlerts });
  const auditLogsQuery = useQuery({ queryKey: ['enterprise-audit-logs', auditFilters], queryFn: () => fetchAuditLogs(auditFilters) , enabled: canReadAudit });
  const barcodeLabelsQuery = useQuery({ queryKey: ['enterprise-barcode-labels'], queryFn: fetchBarcodeLabels , enabled: canReadBarcodeLabels });
  const attachmentsQuery = useQuery({
    queryKey: ['enterprise-attachments', attachmentEntityType, attachmentEntityId],
    queryFn: () => fetchAttachments(attachmentEntityType, attachmentEntityId),
    enabled: canReadAttachments && Boolean(attachmentEntityType && attachmentEntityId)
  });

  return {
    productsQuery,
    productPackagesQuery,
    storageLocationsQuery,
    suppliersQuery,
    availableSuppliersQuery,
    supplierSlaBreachesQuery,
    supplierPerformanceQuery,
    lowStockQuery,
    stockMovementsQuery,
    dashboardSummaryQuery,
    dashboardLowStockQuery,
    dashboardOverdueShipmentsQuery,
    dashboardUnresolvedAlertsQuery,
    dashboardRecentActivityQuery,
    dashboardSupplierPerformanceQuery,
    inventoryValuationReportQuery,
    stockByLocationReportQuery,
    productMovementReportQuery,
    procurementSummaryReportQuery,
    productCostRiskSummaryQuery,
    productCostValuationSummaryQuery,
    productCostValuationDetailsQuery,
    productCostActionSummaryQuery,
    productCostActionPlanSummaryQuery,
    productCostActionCategorySummaryQuery,
    productCostActionImpactSummaryQuery,
    productCostActionSupplierSummaryQuery,
    productCostActionSourceSummaryQuery,
    productCostActionAgeSummaryQuery,
    productCostActionCoverageSummaryQuery,
    productCostAlertSummaryQuery,
    productCostRecommendationSummaryQuery,
    productCostDashboardSummaryQuery,
    productCostReportSummaryQuery,
    productCostGovernanceSummaryQuery,
    productCostGovernanceDetailsQuery,
    productCostGovernanceAuditPackQuery,
    productCostGovernanceSignoffSummaryQuery,
    productCostGovernanceReviewQueueQuery,
    productCostGovernanceReviewPackQuery,
    productCostGovernanceClosureSummaryQuery,
    productCostGovernanceHandoffSummaryQuery,
    productCostHardeningSummaryQuery,
    productCostOperationsRunbookSummaryQuery,
    productCostOperationsControlSummaryQuery,
    productCostOperationsEvidenceSummaryQuery,
    productCostOperationsReadinessSummaryQuery,
    carryingCostProductionReviewQuery,
    deadStockProductionReviewQuery,
    marginAwareProductionReviewQuery,
    procurementSpendProductionReviewQuery,
    reorderRecommendationsQuery,
    depletionRiskQuery,
    supplierTrustScoresQuery,
    operationalHealthQuery,
    inventoryAnomaliesQuery,
    demandForecastQuery,
    forecastAccuracyBacktestQuery,
    forecastCalibrationReviewQuery,
    forecastDataQualityReviewQuery,
    forecastReliabilityMatrixQuery,
    automationTypesQuery,
    automationSchedulesQuery,
    automationRunnerReadinessQuery,
    automationRunnerStatusQuery,
    automationRunEventsQuery,
    automationRunnerSafetyReportQuery,
    automationRunnerGovernancePackQuery,
    automationRunnerOperationsReviewQuery,
    automationRunnerAccountabilityDigestQuery,
    automationRunnerPolicyMatrixQuery,
    systemStatusQuery,
    systemContextQuery,
    systemExecutionGateQuery,
    systemContextSnapshotsQuery,
    systemContextSnapshotComparisonQuery,
    systemContextForecastRiskQuery,
    supportContextQuery,
    maintenanceContextQuery,
    announcementContextQuery,
    incidentContextQuery,
    executionAdaptersQuery,
    executionHardeningQuery,
    executionRequestsQuery,
    stockTransfersQuery,
    purchaseOrdersQuery,
    shipmentsQuery,
    shipmentItemsQuery,
    parLevelsQuery,
    cycleCountsQuery,
    requisitionsQuery,
    approvalRulesQuery,
    invoicesQuery,
    supplierCatalogQuery,
    notificationsQuery,
    alertsQuery,
    auditLogsQuery,
    barcodeLabelsQuery,
    attachmentsQuery,
  };
}
