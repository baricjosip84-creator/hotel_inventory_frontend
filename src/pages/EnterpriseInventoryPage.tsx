import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { DataTable, EnterpriseInventoryHero, InputField, MetricCard, SectionCard, SelectField, StatusMessages, TextareaField, styles } from '../components/enterpriseInventory/EnterpriseInventoryShared';
import { EnterpriseInventoryTabs } from '../components/enterpriseInventory/EnterpriseInventoryTabs';

import type {
  ParLevel,
  CycleCount,
  DepartmentRequisition,
  ApprovalRule,
  ApprovalRuleForm,
  SupplierInvoice,
  SupplierCatalogItem,
  NotificationEvent,
  NotificationDelivery,
  AlertItem,
  AlertForm,
  AlertFilters,
  AuditLog,
  AuditFilters,
  EntityAttachment,
  BarcodeLabel,
  ProductOption,
  ProductPackage,
  StorageLocationOption,
  SupplierOption,
  SupplierPerformance,
  SupplierSlaBreach,
  StockItem,
  StockMovement,
  DashboardSummary,
  DashboardLowStockRow,
  DashboardOverdueShipment,
  DashboardSupplierPerformance,
  InventoryValuationRow,
  InventoryValuationReport,
  StockByLocationReportRow,
  ProductMovementReportRow,
  ProcurementSummaryReport,
  ProductCostRiskRow,
  ProductCostRiskSummary,
  ProductCostValuationRow,
  ProductCostValuationSummary,
  ProductCostValuationDetails,
  ProductCostActionSummary,
  ProductCostGenericSummary,
  ReorderRecommendation,
  ReorderRecommendationsResponse,
  DepletionRiskRow,
  DepletionRiskResponse,
  SupplierRiskFlag,
  SupplierTrustScore,
  SupplierTrustScoresResponse,
  OperationalHealthResponse,
  InventoryAnomaly,
  InventoryAnomaliesResponse,
  DemandForecastRow,
  AutomationTypeDefinition,
  AutomationTypesResponse,
  AutomationSchedule,
  AutomationSchedulesResponse,
  AutomationRunnerReadiness,
  AutomationRunnerStatus,
  AutomationRunEvent,
  AutomationRunEventsResponse,
  AutomationRunnerEvidenceResponse,
  AutomationScheduleForm,
  SystemStatusResponse,
  SystemContextResponse,
  SystemExecutionGateResponse,
  SystemContextSnapshot,
  SystemContextSnapshotList,
  TenantPublicContext,
  ExecutionAdapter,
  ExecutionAdapterRegistry,
  ExecutionHardeningSummary,
  ExecutionRequest,
  ExecutionRequestsResponse,
  ExecutionFilters,
  StockTransfer,
  StockTransferItem,
  PurchaseOrder,
  Shipment,
  ShipmentItem,
  ShipmentBarcodeLookup,
  ShipmentBarcodeScanForm,
  PurchaseOrderShipmentForm,
  ShipmentReceivingForm,
  ParLevelForm,
  RequisitionForm,
  CycleCountForm,
  StockAdjustmentForm,
  StockTransferForm,
  StorageLocationForm,
  SupplierForm,
  ProductForm,
  ProductPackageForm,
  BarcodeLabelForm,
  SupplierCatalogForm,
  SupplierInvoiceForm,
  NotificationDeliveryForm,
  AttachmentForm
} from '../components/enterpriseInventory/EnterpriseInventoryTypes';

import {
  emptyAlertFilters,
  emptyAlertForm,
  emptyAttachmentForm,
  emptyAuditFilters,
  emptyAutomationScheduleForm,
  emptyApprovalRuleForm,
  emptyBarcodeLabelForm,
  emptyCycleCountForm,
  emptyExecutionFilters,
  emptyNotificationDeliveryForm,
  emptyParLevelForm,
  emptyProductForm,
  emptyProductPackageForm,
  emptyPurchaseOrderShipmentForm,
  emptyRequisitionForm,
  emptyShipmentBarcodeScanForm,
  emptyShipmentReceivingForm,
  emptyStockAdjustmentForm,
  emptyStockTransferForm,
  emptyStorageLocationForm,
  emptySupplierCatalogForm,
  emptySupplierForm,
  emptySupplierInvoiceForm
} from '../components/enterpriseInventory/EnterpriseInventoryForms';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatRecordValue, formatValue, normalizeError, toNumber } from '../components/enterpriseInventory/EnterpriseInventoryFormat';
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
  fetchReorderRecommendations,
  fetchDepletionRisk,
  fetchSupplierTrustScores,
  fetchOperationalHealth,
  fetchInventoryAnomalies,
  fetchDemandForecast,
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
  lookupShipmentBarcode
} from '../components/enterpriseInventory/EnterpriseInventoryApi';

function EnterpriseInventoryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('par-levels');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parLevelForm, setParLevelForm] = useState<ParLevelForm>(emptyParLevelForm);
  const [requisitionForm, setRequisitionForm] = useState<RequisitionForm>(emptyRequisitionForm);
  const [cycleCountForm, setCycleCountForm] = useState<CycleCountForm>(emptyCycleCountForm);
  const [stockAdjustmentForm, setStockAdjustmentForm] = useState<StockAdjustmentForm>(emptyStockAdjustmentForm);
  const [stockTransferForm, setStockTransferForm] = useState<StockTransferForm>(emptyStockTransferForm);
  const [storageLocationForm, setStorageLocationForm] = useState<StorageLocationForm>(emptyStorageLocationForm);
  const [editingStorageLocationId, setEditingStorageLocationId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplierPerformanceId, setSelectedSupplierPerformanceId] = useState('');
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productPackageForm, setProductPackageForm] = useState<ProductPackageForm>(emptyProductPackageForm);
  const [editingProductPackageId, setEditingProductPackageId] = useState<string | null>(null);
  const [purchaseOrderShipmentForm, setPurchaseOrderShipmentForm] = useState<PurchaseOrderShipmentForm>(emptyPurchaseOrderShipmentForm);
  const [shipmentReceivingForm, setShipmentReceivingForm] = useState<ShipmentReceivingForm>(emptyShipmentReceivingForm);
  const [shipmentBarcodeScanForm, setShipmentBarcodeScanForm] = useState<ShipmentBarcodeScanForm>(emptyShipmentBarcodeScanForm);
  const [lastBarcodeLookup, setLastBarcodeLookup] = useState<ShipmentBarcodeLookup | null>(null);
  const [approvalRuleForm, setApprovalRuleForm] = useState<ApprovalRuleForm>(emptyApprovalRuleForm);
  const [barcodeLabelForm, setBarcodeLabelForm] = useState<BarcodeLabelForm>(emptyBarcodeLabelForm);
  const [supplierCatalogForm, setSupplierCatalogForm] = useState<SupplierCatalogForm>(emptySupplierCatalogForm);
  const [supplierInvoiceForm, setSupplierInvoiceForm] = useState<SupplierInvoiceForm>(emptySupplierInvoiceForm);
  const [notificationDeliveryForm, setNotificationDeliveryForm] = useState<NotificationDeliveryForm>(emptyNotificationDeliveryForm);
  const [alertForm, setAlertForm] = useState<AlertForm>(emptyAlertForm);
  const [alertFilters, setAlertFilters] = useState<AlertFilters>(emptyAlertFilters);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>(emptyAuditFilters);
  const [alertResolutionNotes, setAlertResolutionNotes] = useState<Record<string, string>>({});
  const [attachmentForm, setAttachmentForm] = useState<AttachmentForm>(emptyAttachmentForm);
  const [automationScheduleForm, setAutomationScheduleForm] = useState<AutomationScheduleForm>(emptyAutomationScheduleForm);
  const [automationDisableReasons, setAutomationDisableReasons] = useState<Record<string, string>>({});
  const [executionFilters, setExecutionFilters] = useState<ExecutionFilters>(emptyExecutionFilters);

  const productsQuery = useQuery({ queryKey: ['enterprise-products', productSearch], queryFn: () => fetchProducts(productSearch) });
  const productPackagesQuery = useQuery({
    queryKey: ['enterprise-product-packages', productPackageForm.product_id],
    queryFn: () => fetchProductPackages(productPackageForm.product_id),
    enabled: Boolean(productPackageForm.product_id)
  });
  const storageLocationsQuery = useQuery({ queryKey: ['enterprise-storage-locations'], queryFn: fetchStorageLocations });
  const suppliersQuery = useQuery({ queryKey: ['enterprise-suppliers', supplierSearch], queryFn: () => fetchSuppliers(supplierSearch) });
  const availableSuppliersQuery = useQuery({ queryKey: ['enterprise-available-suppliers'], queryFn: fetchAvailableSuppliers });
  const supplierSlaBreachesQuery = useQuery({ queryKey: ['enterprise-supplier-sla-breaches'], queryFn: fetchSupplierSlaBreaches });
  const supplierPerformanceQuery = useQuery({
    queryKey: ['enterprise-supplier-performance', selectedSupplierPerformanceId],
    queryFn: () => fetchSupplierPerformance(selectedSupplierPerformanceId),
    enabled: Boolean(selectedSupplierPerformanceId)
  });
  const lowStockQuery = useQuery({ queryKey: ['enterprise-low-stock'], queryFn: fetchLowStock });
  const stockMovementsQuery = useQuery({ queryKey: ['enterprise-stock-movements'], queryFn: fetchStockMovements });
  const dashboardSummaryQuery = useQuery({ queryKey: ['enterprise-dashboard-summary'], queryFn: fetchDashboardSummary });
  const dashboardLowStockQuery = useQuery({ queryKey: ['enterprise-dashboard-low-stock'], queryFn: fetchDashboardLowStock });
  const dashboardOverdueShipmentsQuery = useQuery({ queryKey: ['enterprise-dashboard-overdue-shipments'], queryFn: fetchDashboardOverdueShipments });
  const dashboardUnresolvedAlertsQuery = useQuery({ queryKey: ['enterprise-dashboard-unresolved-alerts'], queryFn: fetchDashboardUnresolvedAlerts });
  const dashboardRecentActivityQuery = useQuery({ queryKey: ['enterprise-dashboard-recent-activity'], queryFn: fetchDashboardRecentActivity });
  const dashboardSupplierPerformanceQuery = useQuery({ queryKey: ['enterprise-dashboard-supplier-performance'], queryFn: fetchDashboardSupplierPerformance });
  const inventoryValuationReportQuery = useQuery({ queryKey: ['enterprise-inventory-valuation-report'], queryFn: fetchInventoryValuationReport });
  const stockByLocationReportQuery = useQuery({ queryKey: ['enterprise-stock-by-location-report'], queryFn: fetchStockByLocationReport });
  const productMovementReportQuery = useQuery({ queryKey: ['enterprise-product-movement-report'], queryFn: fetchProductMovementReport });
  const procurementSummaryReportQuery = useQuery({ queryKey: ['enterprise-procurement-summary-report'], queryFn: fetchProcurementSummaryReport });
  const productCostRiskSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-risk-summary'], queryFn: fetchProductCostRiskSummary });
  const productCostValuationSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-valuation-summary'], queryFn: fetchProductCostValuationSummary });
  const productCostValuationDetailsQuery = useQuery({ queryKey: ['enterprise-product-cost-valuation-details'], queryFn: fetchProductCostValuationDetails });
  const productCostActionSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-summary'], queryFn: fetchProductCostActionSummary });
  const productCostActionPlanSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-plan-summary'], queryFn: fetchProductCostActionPlanSummary });
  const productCostActionCategorySummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-category-summary'], queryFn: fetchProductCostActionCategorySummary });
  const productCostActionImpactSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-impact-summary'], queryFn: fetchProductCostActionImpactSummary });
  const productCostActionSupplierSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-supplier-summary'], queryFn: fetchProductCostActionSupplierSummary });
  const productCostActionSourceSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-source-summary'], queryFn: fetchProductCostActionSourceSummary });
  const productCostActionAgeSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-age-summary'], queryFn: fetchProductCostActionAgeSummary });
  const productCostActionCoverageSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-action-coverage-summary'], queryFn: fetchProductCostActionCoverageSummary });
  const productCostAlertSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-alert-summary'], queryFn: fetchProductCostAlertSummary });
  const productCostRecommendationSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-recommendation-summary'], queryFn: fetchProductCostRecommendationSummary });
  const productCostDashboardSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-dashboard-summary'], queryFn: fetchProductCostDashboardSummary });
  const productCostReportSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-report-summary'], queryFn: fetchProductCostReportSummary });
  const productCostGovernanceSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-summary'], queryFn: fetchProductCostGovernanceSummary });
  const productCostGovernanceDetailsQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-details'], queryFn: fetchProductCostGovernanceDetails });
  const productCostGovernanceAuditPackQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-audit-pack'], queryFn: fetchProductCostGovernanceAuditPack });
  const productCostGovernanceSignoffSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-signoff-summary'], queryFn: fetchProductCostGovernanceSignoffSummary });
  const productCostGovernanceReviewQueueQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-review-queue'], queryFn: fetchProductCostGovernanceReviewQueue });
  const productCostGovernanceReviewPackQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-review-pack'], queryFn: fetchProductCostGovernanceReviewPack });
  const productCostGovernanceClosureSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-closure-summary'], queryFn: fetchProductCostGovernanceClosureSummary });
  const productCostGovernanceHandoffSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-governance-handoff-summary'], queryFn: fetchProductCostGovernanceHandoffSummary });
  const productCostHardeningSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-hardening-summary'], queryFn: fetchProductCostHardeningSummary });
  const productCostOperationsRunbookSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-runbook-summary'], queryFn: fetchProductCostOperationsRunbookSummary });
  const productCostOperationsControlSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-control-summary'], queryFn: fetchProductCostOperationsControlSummary });
  const productCostOperationsEvidenceSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-evidence-summary'], queryFn: fetchProductCostOperationsEvidenceSummary });
  const productCostOperationsReadinessSummaryQuery = useQuery({ queryKey: ['enterprise-product-cost-operations-readiness-summary'], queryFn: fetchProductCostOperationsReadinessSummary });
  const reorderRecommendationsQuery = useQuery({ queryKey: ['enterprise-reorder-recommendations'], queryFn: fetchReorderRecommendations });
  const depletionRiskQuery = useQuery({ queryKey: ['enterprise-depletion-risk'], queryFn: fetchDepletionRisk });
  const supplierTrustScoresQuery = useQuery({ queryKey: ['enterprise-supplier-trust-scores'], queryFn: fetchSupplierTrustScores });
  const operationalHealthQuery = useQuery({ queryKey: ['enterprise-operational-health'], queryFn: fetchOperationalHealth });
  const inventoryAnomaliesQuery = useQuery({ queryKey: ['enterprise-inventory-anomalies'], queryFn: fetchInventoryAnomalies });
  const demandForecastQuery = useQuery({ queryKey: ['enterprise-demand-forecast'], queryFn: fetchDemandForecast });
  const automationTypesQuery = useQuery({ queryKey: ['enterprise-automation-types'], queryFn: fetchAutomationTypes });
  const automationSchedulesQuery = useQuery({ queryKey: ['enterprise-automation-schedules'], queryFn: fetchAutomationSchedules });
  const automationRunnerReadinessQuery = useQuery({ queryKey: ['enterprise-automation-runner-readiness'], queryFn: fetchAutomationRunnerReadiness });
  const automationRunnerStatusQuery = useQuery({ queryKey: ['enterprise-automation-runner-status'], queryFn: fetchAutomationRunnerStatus });
  const automationRunEventsQuery = useQuery({ queryKey: ['enterprise-automation-run-events'], queryFn: fetchAutomationRunEvents });
  const automationRunnerSafetyReportQuery = useQuery({ queryKey: ['enterprise-automation-runner-safety-report'], queryFn: fetchAutomationRunnerSafetyReport });
  const automationRunnerGovernancePackQuery = useQuery({ queryKey: ['enterprise-automation-runner-governance-pack'], queryFn: fetchAutomationRunnerGovernancePack });
  const automationRunnerOperationsReviewQuery = useQuery({ queryKey: ['enterprise-automation-runner-operations-review'], queryFn: fetchAutomationRunnerOperationsReview });
  const automationRunnerAccountabilityDigestQuery = useQuery({ queryKey: ['enterprise-automation-runner-accountability-digest'], queryFn: fetchAutomationRunnerAccountabilityDigest });
  const automationRunnerPolicyMatrixQuery = useQuery({ queryKey: ['enterprise-automation-runner-policy-matrix'], queryFn: fetchAutomationRunnerPolicyMatrix });
  const systemStatusQuery = useQuery({ queryKey: ['enterprise-system-status'], queryFn: fetchSystemStatus });
  const systemContextQuery = useQuery({ queryKey: ['enterprise-system-context'], queryFn: fetchSystemContext });
  const systemExecutionGateQuery = useQuery({ queryKey: ['enterprise-system-execution-gate'], queryFn: fetchSystemExecutionGate });
  const systemContextSnapshotsQuery = useQuery({ queryKey: ['enterprise-system-context-snapshots'], queryFn: fetchSystemContextSnapshots });
  const systemContextSnapshotComparisonQuery = useQuery({ queryKey: ['enterprise-system-context-snapshot-comparison'], queryFn: fetchSystemContextSnapshotComparison });
  const systemContextForecastRiskQuery = useQuery({ queryKey: ['enterprise-system-context-forecast-risk'], queryFn: fetchSystemContextForecastRisk });
  const supportContextQuery = useQuery({ queryKey: ['enterprise-support-context'], queryFn: fetchSupportContext });
  const maintenanceContextQuery = useQuery({ queryKey: ['enterprise-maintenance-context'], queryFn: fetchMaintenanceContext });
  const announcementContextQuery = useQuery({ queryKey: ['enterprise-announcement-context'], queryFn: fetchAnnouncementContext });
  const incidentContextQuery = useQuery({ queryKey: ['enterprise-incident-context'], queryFn: fetchIncidentContext });
  const executionAdaptersQuery = useQuery({ queryKey: ['enterprise-execution-adapters'], queryFn: fetchExecutionAdapters });
  const executionHardeningQuery = useQuery({ queryKey: ['enterprise-execution-hardening'], queryFn: fetchExecutionHardeningSummary });
  const executionRequestsQuery = useQuery({ queryKey: ['enterprise-execution-requests', executionFilters], queryFn: () => fetchExecutionRequests(executionFilters) });
  const stockTransfersQuery = useQuery({ queryKey: ['enterprise-stock-transfers'], queryFn: fetchStockTransfers });
  const purchaseOrdersQuery = useQuery({ queryKey: ['enterprise-purchase-orders'], queryFn: fetchPurchaseOrders });
  const shipmentsQuery = useQuery({ queryKey: ['enterprise-shipments'], queryFn: fetchShipments });
  const shipmentItemsQuery = useQuery({
    queryKey: ['enterprise-shipment-items', shipmentReceivingForm.shipment_id],
    queryFn: () => fetchShipmentItems(shipmentReceivingForm.shipment_id),
    enabled: Boolean(shipmentReceivingForm.shipment_id)
  });
  const parLevelsQuery = useQuery({ queryKey: ['enterprise-par-levels'], queryFn: fetchParLevels });
  const cycleCountsQuery = useQuery({ queryKey: ['enterprise-cycle-counts'], queryFn: fetchCycleCounts });
  const requisitionsQuery = useQuery({ queryKey: ['enterprise-requisitions'], queryFn: fetchDepartmentRequisitions });
  const approvalRulesQuery = useQuery({ queryKey: ['enterprise-approval-rules'], queryFn: fetchApprovalRules });
  const invoicesQuery = useQuery({ queryKey: ['enterprise-invoices'], queryFn: fetchSupplierInvoices });
  const supplierCatalogQuery = useQuery({ queryKey: ['enterprise-supplier-catalog'], queryFn: fetchSupplierCatalog });
  const notificationsQuery = useQuery({ queryKey: ['enterprise-notifications'], queryFn: fetchNotifications });
  const alertsQuery = useQuery({ queryKey: ['enterprise-alerts', alertFilters], queryFn: () => fetchAlerts(alertFilters) });
  const auditLogsQuery = useQuery({ queryKey: ['enterprise-audit-logs', auditFilters], queryFn: () => fetchAuditLogs(auditFilters) });
  const barcodeLabelsQuery = useQuery({ queryKey: ['enterprise-barcode-labels'], queryFn: fetchBarcodeLabels });
  const attachmentsQuery = useQuery({
    queryKey: ['enterprise-attachments', attachmentForm.entity_type, attachmentForm.entity_id],
    queryFn: () => fetchAttachments(attachmentForm.entity_type, attachmentForm.entity_id),
    enabled: Boolean(attachmentForm.entity_type && attachmentForm.entity_id)
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const storageLocations = useMemo(() => storageLocationsQuery.data ?? [], [storageLocationsQuery.data]);
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);
  const availableSuppliers = useMemo(() => availableSuppliersQuery.data ?? [], [availableSuppliersQuery.data]);
  const supplierSlaBreaches = useMemo(() => supplierSlaBreachesQuery.data ?? [], [supplierSlaBreachesQuery.data]);
  const supplierCatalogItems = useMemo(() => supplierCatalogQuery.data ?? [], [supplierCatalogQuery.data]);
  const lowStockItems = useMemo(() => lowStockQuery.data ?? [], [lowStockQuery.data]);
  const recentStockMovements = useMemo(() => stockMovementsQuery.data ?? [], [stockMovementsQuery.data]);
  const dashboardLowStockRows = useMemo(() => dashboardLowStockQuery.data ?? [], [dashboardLowStockQuery.data]);
  const dashboardOverdueShipments = useMemo(() => dashboardOverdueShipmentsQuery.data ?? [], [dashboardOverdueShipmentsQuery.data]);
  const dashboardUnresolvedAlerts = useMemo(() => dashboardUnresolvedAlertsQuery.data ?? [], [dashboardUnresolvedAlertsQuery.data]);
  const dashboardRecentActivity = useMemo(() => dashboardRecentActivityQuery.data ?? [], [dashboardRecentActivityQuery.data]);
  const dashboardSupplierPerformance = useMemo(() => dashboardSupplierPerformanceQuery.data ?? [], [dashboardSupplierPerformanceQuery.data]);
  const inventoryValuationRows = useMemo(() => inventoryValuationReportQuery.data?.rows ?? [], [inventoryValuationReportQuery.data]);
  const stockByLocationRows = useMemo(() => stockByLocationReportQuery.data ?? [], [stockByLocationReportQuery.data]);
  const productMovementRows = useMemo(() => productMovementReportQuery.data ?? [], [productMovementReportQuery.data]);
  const productCostRiskSummary = productCostRiskSummaryQuery.data;
  const highVarianceCostRows = useMemo(() => productCostRiskSummary?.high_variance ?? [], [productCostRiskSummary]);
  const missingCostRows = useMemo(() => productCostRiskSummary?.missing_cost ?? [], [productCostRiskSummary]);
  const inconsistentCostRows = useMemo(() => productCostRiskSummary?.inconsistent_cost_history ?? [], [productCostRiskSummary]);
  const productCostValuationSummary = productCostValuationSummaryQuery.data;
  const productCostBasisRows = useMemo(() => productCostValuationSummary?.basis_breakdown ?? [], [productCostValuationSummary]);
  const productCostCategoryRows = useMemo(() => productCostValuationSummary?.category_breakdown ?? [], [productCostValuationSummary]);
  const productCostTopValueRows = useMemo(() => productCostValuationSummary?.top_value_products ?? [], [productCostValuationSummary]);
  const productCostValuationDetailRows = useMemo(() => productCostValuationDetailsQuery.data?.rows ?? [], [productCostValuationDetailsQuery.data]);
  const productCostActionRows = useMemo(() => productCostActionSummaryQuery.data?.actions ?? productCostActionSummaryQuery.data?.rows ?? [], [productCostActionSummaryQuery.data]);
  const productCostPriorityBands = useMemo(() => productCostActionPlanSummaryQuery.data?.priority_bands ?? [], [productCostActionPlanSummaryQuery.data]);
  const productCostNextActions = useMemo(() => productCostActionPlanSummaryQuery.data?.next_actions ?? [], [productCostActionPlanSummaryQuery.data]);
  const productCostActionCategories = useMemo(() => productCostActionCategorySummaryQuery.data?.categories ?? [], [productCostActionCategorySummaryQuery.data]);
  const productCostImpactRows = useMemo(() => productCostActionImpactSummaryQuery.data?.impact_breakdown ?? [], [productCostActionImpactSummaryQuery.data]);
  const productCostTopImpactProducts = useMemo(() => productCostActionImpactSummaryQuery.data?.top_impact_products ?? [], [productCostActionImpactSummaryQuery.data]);
  const productCostActionSuppliers = useMemo(() => productCostActionSupplierSummaryQuery.data?.suppliers ?? [], [productCostActionSupplierSummaryQuery.data]);
  const productCostActionSources = useMemo(() => productCostActionSourceSummaryQuery.data?.sources ?? [], [productCostActionSourceSummaryQuery.data]);
  const productCostActionAgeBands = useMemo(() => productCostActionAgeSummaryQuery.data?.age_bands ?? [], [productCostActionAgeSummaryQuery.data]);
  const productCostActionCoverageRows = useMemo(() => productCostActionCoverageSummaryQuery.data?.category_coverage ?? [], [productCostActionCoverageSummaryQuery.data]);
  const productCostCoverageGaps = useMemo(() => productCostActionCoverageSummaryQuery.data?.coverage_gaps ?? [], [productCostActionCoverageSummaryQuery.data]);
  const productCostAlertGroups = useMemo(() => productCostAlertSummaryQuery.data?.alert_groups ?? [], [productCostAlertSummaryQuery.data]);
  const productCostTopAlerts = useMemo(() => productCostAlertSummaryQuery.data?.top_alerts ?? [], [productCostAlertSummaryQuery.data]);
  const productCostRecommendationGroups = useMemo(() => productCostRecommendationSummaryQuery.data?.recommendation_groups ?? [], [productCostRecommendationSummaryQuery.data]);
  const productCostTopRecommendations = useMemo(() => productCostRecommendationSummaryQuery.data?.top_recommendations ?? [], [productCostRecommendationSummaryQuery.data]);
  const productCostDashboardCategories = useMemo(() => productCostDashboardSummaryQuery.data?.top_review_categories ?? [], [productCostDashboardSummaryQuery.data]);
  const productCostDashboardPriorityProducts = useMemo(() => productCostDashboardSummaryQuery.data?.priority_products ?? [], [productCostDashboardSummaryQuery.data]);
  const productCostGovernanceChecklist = useMemo(() => productCostGovernanceSummaryQuery.data?.checklist ?? [], [productCostGovernanceSummaryQuery.data]);
  const productCostGovernanceFailedChecklist = useMemo(() => productCostGovernanceDetailsQuery.data?.failed_checklist ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernanceWatchChecklist = useMemo(() => productCostGovernanceDetailsQuery.data?.watch_checklist ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernanceRemediationPlan = useMemo(() => productCostGovernanceDetailsQuery.data?.remediation_plan ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernancePriorityProducts = useMemo(() => productCostGovernanceDetailsQuery.data?.priority_products ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernanceAuditRows = useMemo(() => productCostGovernanceAuditPackQuery.data?.audit_rows ?? [], [productCostGovernanceAuditPackQuery.data]);
  const productCostGovernanceSignoffChecklist = useMemo(() => productCostGovernanceSignoffSummaryQuery.data?.signoff_checklist ?? [], [productCostGovernanceSignoffSummaryQuery.data]);
  const productCostGovernanceBlockers = useMemo(() => productCostGovernanceSignoffSummaryQuery.data?.blockers ?? [], [productCostGovernanceSignoffSummaryQuery.data]);
  const productCostGovernanceWarnings = useMemo(() => productCostGovernanceSignoffSummaryQuery.data?.warnings ?? [], [productCostGovernanceSignoffSummaryQuery.data]);
  const productCostGovernanceQueueItems = useMemo(() => productCostGovernanceReviewQueueQuery.data?.queue_items ?? [], [productCostGovernanceReviewQueueQuery.data]);
  const productCostGovernanceReviewExportRows = useMemo(() => productCostGovernanceReviewPackQuery.data?.review_export_rows ?? [], [productCostGovernanceReviewPackQuery.data]);
  const productCostGovernanceClosureChecklist = useMemo(() => productCostGovernanceClosureSummaryQuery.data?.closure_checklist ?? [], [productCostGovernanceClosureSummaryQuery.data]);
  const productCostGovernanceHandoffChecklist = useMemo(() => productCostGovernanceHandoffSummaryQuery.data?.handoff_checklist ?? [], [productCostGovernanceHandoffSummaryQuery.data]);
  const productCostGovernanceOwnerSummary = useMemo(() => productCostGovernanceHandoffSummaryQuery.data?.owner_summary ?? [], [productCostGovernanceHandoffSummaryQuery.data]);
  const productCostHardeningFailedChecklist = useMemo(() => productCostHardeningSummaryQuery.data?.failed_checklist ?? [], [productCostHardeningSummaryQuery.data]);
  const productCostOperationsRhythm = useMemo(() => productCostOperationsRunbookSummaryQuery.data?.operating_rhythm ?? [], [productCostOperationsRunbookSummaryQuery.data]);
  const productCostOperationsEscalationRules = useMemo(() => productCostOperationsRunbookSummaryQuery.data?.escalation_rules ?? [], [productCostOperationsRunbookSummaryQuery.data]);
  const productCostOperationsControlChecks = useMemo(() => productCostOperationsControlSummaryQuery.data?.control_checks ?? [], [productCostOperationsControlSummaryQuery.data]);
  const productCostOperationsEvidenceSections = useMemo(() => productCostOperationsEvidenceSummaryQuery.data?.evidence_sections ?? [], [productCostOperationsEvidenceSummaryQuery.data]);
  const productCostOperationsReadinessChecklist = useMemo(() => productCostOperationsReadinessSummaryQuery.data?.readiness_checklist ?? [], [productCostOperationsReadinessSummaryQuery.data]);
  const reorderRecommendations = useMemo(() => reorderRecommendationsQuery.data?.rows ?? [], [reorderRecommendationsQuery.data]);
  const depletionRiskRows = useMemo(() => depletionRiskQuery.data?.rows ?? [], [depletionRiskQuery.data]);
  const supplierTrustScores = useMemo(() => supplierTrustScoresQuery.data?.rows ?? [], [supplierTrustScoresQuery.data]);
  const inventoryAnomalies = useMemo(() => inventoryAnomaliesQuery.data?.rows ?? [], [inventoryAnomaliesQuery.data]);
  const demandForecastRows = useMemo(() => demandForecastQuery.data ?? [], [demandForecastQuery.data]);
  const systemContextSnapshots = useMemo(() => systemContextSnapshotsQuery.data?.rows ?? systemContextSnapshotsQuery.data?.snapshots ?? [], [systemContextSnapshotsQuery.data]);
  const automationSchedules = useMemo(() => automationSchedulesQuery.data?.rows ?? [], [automationSchedulesQuery.data]);
  const automationRunEvents = useMemo(() => automationRunEventsQuery.data?.rows ?? [], [automationRunEventsQuery.data]);
  const automationRunnerSafetyChecks = useMemo(() => automationRunnerSafetyReportQuery.data?.checks ?? [], [automationRunnerSafetyReportQuery.data]);
  const automationRunnerGovernanceChecks = useMemo(() => automationRunnerGovernancePackQuery.data?.checks ?? [], [automationRunnerGovernancePackQuery.data]);
  const automationRunnerOperationsChecks = useMemo(() => automationRunnerOperationsReviewQuery.data?.checks ?? [], [automationRunnerOperationsReviewQuery.data]);
  const automationRunnerPolicyRows = useMemo(() => automationRunnerPolicyMatrixQuery.data?.policy_rows ?? [], [automationRunnerPolicyMatrixQuery.data]);
  const automationRunnerActorBreakdown = useMemo(() => automationRunnerAccountabilityDigestQuery.data?.actor_breakdown ?? [], [automationRunnerAccountabilityDigestQuery.data]);
  const automationRunnerRequestBreakdown = useMemo(() => automationRunnerAccountabilityDigestQuery.data?.request_status_breakdown ?? [], [automationRunnerAccountabilityDigestQuery.data]);
  const automationRunnerDueSchedules = useMemo(() => automationRunnerGovernancePackQuery.data?.due_schedules ?? [], [automationRunnerGovernancePackQuery.data]);
  const automationRunnerLinkedRequests = useMemo(() => automationRunnerGovernancePackQuery.data?.linked_schedule_requests ?? [], [automationRunnerGovernancePackQuery.data]);
  const executionRequests = useMemo(() => executionRequestsQuery.data?.rows ?? [], [executionRequestsQuery.data]);
  const executionAdapters = useMemo(() => executionAdaptersQuery.data?.adapters ?? [], [executionAdaptersQuery.data]);
  const stockTransfers = useMemo(() => stockTransfersQuery.data ?? [], [stockTransfersQuery.data]);
  const purchaseOrders = useMemo(() => purchaseOrdersQuery.data ?? [], [purchaseOrdersQuery.data]);
  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);
  const alerts = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const auditLogs = useMemo(() => auditLogsQuery.data ?? [], [auditLogsQuery.data]);

  const operationsDashboardSummary = useMemo(() => {
    const summary = dashboardSummaryQuery.data;
    const totalStockRows = toNumber(summary?.stock?.total_stock_rows);
    const lowStockRows = toNumber(summary?.stock?.low_stock_rows);
    const lowStockRate = totalStockRows > 0 ? (lowStockRows / totalStockRows) * 100 : 0;

    return {
      totalProducts: toNumber(summary?.master_data?.total_products),
      totalSuppliers: toNumber(summary?.master_data?.total_suppliers),
      totalStorageLocations: toNumber(summary?.master_data?.total_storage_locations),
      openShipments: toNumber(summary?.shipments?.pending_shipments) + toNumber(summary?.shipments?.partial_shipments),
      unresolvedAlerts: toNumber(summary?.alerts?.unresolved_alerts),
      criticalAlerts: toNumber(summary?.alerts?.critical_unresolved_alerts),
      lowStockRows,
      lowStockRate
    };
  }, [dashboardSummaryQuery.data]);

  const auditSummary = useMemo(() => {
    const entityTypes = new Set(auditLogs.map((item) => item.entity_type).filter(Boolean));
    const supportActions = auditLogs.filter((item) => item.metadata?.actor_type === 'support_session').length;
    return { total: auditLogs.length, entityTypes: entityTypes.size, supportActions };
  }, [auditLogs]);

  const alertsSummary = useMemo(() => {
    const unresolved = alerts.filter((item) => !item.resolved).length;
    const critical = alerts.filter((item) => !item.resolved && item.severity === 'critical').length;
    const unacknowledged = alerts.filter((item) => !item.resolved && !item.acknowledged).length;
    return { unresolved, critical, unacknowledged };
  }, [alerts]);

  const reportsSummary = useMemo(() => {
    const procurement = procurementSummaryReportQuery.data;
    return {
      valuationRows: toNumber(inventoryValuationReportQuery.data?.totals?.row_count ?? inventoryValuationRows.length),
      estimatedValue: toNumber(inventoryValuationReportQuery.data?.totals?.estimated_inventory_value),
      stockLocations: stockByLocationRows.length,
      movementRows: productMovementRows.length,
      overdueShipments: toNumber(procurement?.shipments?.overdue_shipments),
      discrepancy: toNumber(procurement?.lines?.total_discrepancy)
    };
  }, [inventoryValuationReportQuery.data, inventoryValuationRows.length, stockByLocationRows.length, productMovementRows.length, procurementSummaryReportQuery.data]);

  const selectedReceivingShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === shipmentReceivingForm.shipment_id) ?? null,
    [shipments, shipmentReceivingForm.shipment_id]
  );
  const selectedShipmentItems = useMemo(() => shipmentItemsQuery.data ?? [], [shipmentItemsQuery.data]);

  const stockRiskSummary = useMemo(() => {
    const critical = lowStockItems.filter((item) => toNumber(item.quantity) <= 0).length;
    const shortageUnits = lowStockItems.reduce((total, item) => {
      const threshold = toNumber(item.product_min_stock ?? item.min_quantity);
      const quantity = toNumber(item.quantity);
      return total + Math.max(threshold - quantity, 0);
    }, 0);

    return { critical, shortageUnits };
  }, [lowStockItems]);

  const stockTransferSummary = useMemo(() => {
    const draft = stockTransfers.filter((item) => item.status === 'draft').length;
    const executed = stockTransfers.filter((item) => item.status === 'executed').length;
    const cancelled = stockTransfers.filter((item) => item.status === 'cancelled').length;
    const totalUnits = stockTransfers.reduce((total, item) => total + toNumber(item.total_quantity), 0);

    return { draft, executed, cancelled, totalUnits };
  }, [stockTransfers]);

  const procurementMatchRows = useMemo(() => {
    const invoices = invoicesQuery.data ?? [];

    return purchaseOrders.map((purchaseOrder) => {
      const linkedShipments = shipments.filter((shipment) => shipment.purchase_order_id === purchaseOrder.id);
      const linkedInvoices = invoices.filter((invoice) => invoice.purchase_order_id === purchaseOrder.id);
      const totalInvoiced = linkedInvoices.reduce((total, invoice) => total + toNumber(invoice.total_amount), 0);
      const varianceLabels = Array.from(new Set(linkedInvoices.map((invoice) => invoice.variance_status).filter(Boolean)));

      return {
        purchaseOrder,
        linkedShipmentCount: linkedShipments.length || toNumber(purchaseOrder.linked_shipment_count),
        linkedInvoiceCount: linkedInvoices.length,
        totalInvoiced,
        shipmentStatus: linkedShipments.length ? linkedShipments.map((shipment) => shipment.status).join(', ') : '-',
        invoiceVariance: varianceLabels.length ? varianceLabels.join(', ') : '-',
        firstShipment: linkedShipments[0]
      };
    });
  }, [purchaseOrders, shipments, invoicesQuery.data]);

  const insightsSummary = useMemo(() => {
    const criticalReorders = reorderRecommendations.filter((item) => item.urgency === 'critical').length;
    const highRiskStockRows = depletionRiskRows.filter((item) => ['critical', 'high'].includes(item.risk_tier)).length;
    const supplierRiskRows = supplierTrustScores.filter((item) => (item.risk_flags ?? []).length > 0).length;
    const highAnomalies = inventoryAnomalies.filter((item) => ['critical', 'high'].includes(item.anomaly_tier)).length;

    return {
      criticalReorders,
      highRiskStockRows,
      supplierRiskRows,
      highAnomalies
    };
  }, [depletionRiskRows, inventoryAnomalies, reorderRecommendations, supplierTrustScores]);

  const forecastSummary = useMemo(() => {
    const sorted = [...demandForecastRows].sort((left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage));
    const totalAverageDailyUsage = sorted.reduce((total, item) => total + toNumber(item.avg_daily_usage), 0);

    return {
      rowCount: sorted.length,
      totalAverageDailyUsage,
      highestUsageProduct: sorted[0]?.product_name || sorted[0]?.product_id || '-'
    };
  }, [demandForecastRows]);

  const automationSummary = useMemo(() => {
    const draft = automationSchedules.filter((item) => item.status === 'draft').length;
    const paused = automationSchedules.filter((item) => item.status === 'paused').length;
    const disabled = automationSchedules.filter((item) => item.status === 'disabled').length;
    const due = automationSchedules.filter((item) => item.next_run_at && new Date(item.next_run_at).getTime() <= Date.now()).length;

    return { total: automationSchedules.length, draft, paused, disabled, due };
  }, [automationSchedules]);

  const procurementSummary = useMemo(() => {
    const openPurchaseOrders = purchaseOrders.filter((item) => !['completed', 'cancelled'].includes(item.status)).length;
    const overduePurchaseOrders = purchaseOrders.filter((item) => item.delivery_status === 'overdue').length;
    const unmatchedInvoices = (invoicesQuery.data ?? []).filter((invoice) => !invoice.purchase_order_id && !invoice.shipment_id).length;
    const receivingGaps = purchaseOrders.filter((item) => ['pending_receipt', 'open_short', 'closed_short', 'over_received'].includes(item.variance_status || '')).length;

    return { openPurchaseOrders, overduePurchaseOrders, unmatchedInvoices, receivingGaps };
  }, [purchaseOrders, invoicesQuery.data]);

  const receivingSummary = useMemo(() => {
    const activeShipments = shipments.filter((shipment) => !['received', 'cancelled'].includes(shipment.status)).length;
    const partiallyReceived = shipments.filter((shipment) => shipment.status === 'partial').length;
    const discrepancyRows = selectedShipmentItems.filter((item) => toNumber(item.discrepancy) !== 0).length;
    const remainingUnits = selectedShipmentItems.reduce((total, item) => {
      const ordered = toNumber(item.quantity);
      const received = toNumber(item.received_quantity);
      return total + Math.max(ordered - received, 0);
    }, 0);

    return { activeShipments, partiallyReceived, discrepancyRows, remainingUnits };
  }, [shipments, selectedShipmentItems]);

  const selectedProductPackages = productPackagesQuery.data ?? [];

  const selectedSupplierName = useMemo(() => {
    const invoices = invoicesQuery.data ?? [];
    const firstInvoice = invoices[0];
    if (!firstInvoice) return null;
    return suppliers.find((supplier) => supplier.id === firstInvoice.supplier_id)?.name ?? null;
  }, [invoicesQuery.data, suppliers]);

  const approvalQueue = useMemo(() => {
    const requisitions = (requisitionsQuery.data ?? [])
      .filter((item) => ['draft', 'submitted', 'pending_approval'].includes(item.status))
      .map((item) => ({
        entity_type: 'department_requisition',
        entity_id: item.id,
        label: `${item.department} requisition`,
        status: item.status,
        created_at: item.created_at
      }));

    const cycleCounts = (cycleCountsQuery.data ?? [])
      .filter((item) => ['draft', 'submitted', 'approved'].includes(item.status))
      .map((item) => ({
        entity_type: 'cycle_count',
        entity_id: item.id,
        label: `${item.department || 'Unassigned'} cycle count`,
        status: item.status,
        created_at: item.created_at
      }));

    const invoices = (invoicesQuery.data ?? [])
      .filter((item) => item.status === 'pending_approval')
      .map((item) => ({
        entity_type: 'supplier_invoice',
        entity_id: item.id,
        label: `Invoice ${item.invoice_number}`,
        status: item.status,
        created_at: item.created_at
      }));

    return [...requisitions, ...cycleCounts, ...invoices]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [requisitionsQuery.data, cycleCountsQuery.data, invoicesQuery.data]);

  useEffect(() => {
    if (!statusMessage && !errorMessage) return;
    const timer = window.setTimeout(() => {
      setStatusMessage(null);
      setErrorMessage(null);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [statusMessage, errorMessage]);

  const refreshAutomationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enterprise-automation-schedules'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-automation-runner-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-automation-runner-status'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-automation-run-events'] })
    ]);
  };

  const refreshExecutionQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-status'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-execution-adapters'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-execution-hardening'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-execution-requests'] })
    ]);
  };

  const refreshSystemContextQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-context'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-execution-gate'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-context-snapshots'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-context-snapshot-comparison'] }),
      queryClient.invalidateQueries({ queryKey: ['enterprise-system-context-forecast-risk'] })
    ]);
  };


  const submitExecutionRequestMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => apiRequest<ExecutionRequest>(`/execution-requests/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ note: note || null })
    }),
    onSuccess: async () => {
      setStatusMessage('Execution request submitted for review.');
      await refreshExecutionQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to submit execution request.'))
  });

  const approveExecutionRequestMutation = useMutation({
    mutationFn: ({ id, review_note }: { id: string; review_note?: string }) => apiRequest<ExecutionRequest>(`/execution-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ review_note: review_note || null })
    }),
    onSuccess: async () => {
      setStatusMessage('Execution request approved.');
      await refreshExecutionQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to approve execution request.'))
  });

  const rejectExecutionRequestMutation = useMutation({
    mutationFn: ({ id, rejection_reason }: { id: string; rejection_reason: string }) => apiRequest<ExecutionRequest>(`/execution-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason })
    }),
    onSuccess: async () => {
      setStatusMessage('Execution request rejected.');
      await refreshExecutionQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to reject execution request.'))
  });

  const executeExecutionRequestMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => apiRequest<ExecutionRequest>(`/execution-requests/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ note: note || null })
    }),
    onSuccess: async () => {
      setStatusMessage('Execution request executed.');
      await refreshExecutionQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to execute request.'))
  });

  const executeNoopExecutionRequestMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => apiRequest<ExecutionRequest>(`/execution-requests/${id}/execute-noop`, {
      method: 'POST',
      body: JSON.stringify({ note: note || null })
    }),
    onSuccess: async () => {
      setStatusMessage('Execution request marked noop completed.');
      await refreshExecutionQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to noop execute request.'))
  });

  const cancelExecutionRequestMutation = useMutation({
    mutationFn: ({ id, cancel_reason }: { id: string; cancel_reason: string }) => apiRequest<ExecutionRequest>(`/execution-requests/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancel_reason })
    }),
    onSuccess: async () => {
      setStatusMessage('Execution request cancelled.');
      await refreshExecutionQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to cancel execution request.'))
  });

  const captureSystemContextSnapshotMutation = useMutation({
    mutationFn: () => apiRequest<Record<string, unknown>>('/system-context/snapshots/capture', {
      method: 'POST',
      body: JSON.stringify({ sections: ['inventory', 'procurement', 'costing', 'alerts', 'audit', 'access'] })
    }),
    onSuccess: async () => {
      setStatusMessage('System context snapshot captured.');
      await refreshSystemContextQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to capture system context snapshot.'))
  });

  const createAutomationScheduleMutation = useMutation({
    mutationFn: (input: AutomationScheduleForm) => apiRequest<AutomationSchedule>('/automation-schedules', {
      method: 'POST',
      body: JSON.stringify({
        automation_type: input.automation_type,
        name: input.name.trim(),
        description: input.description.trim() || null,
        schedule_kind: input.schedule_kind,
        schedule_config: {
          frequency: input.schedule_kind,
          time: input.time || '09:00',
          timezone: input.timezone.trim() || 'Europe/Zagreb'
        },
        request_defaults: {
          default_status: input.default_status
        }
      })
    }),
    onSuccess: async () => {
      setAutomationScheduleForm(emptyAutomationScheduleForm);
      setStatusMessage('Automation schedule created.');
      await refreshAutomationQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create automation schedule.'))
  });

  const dryRunAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) => apiRequest<Record<string, unknown>>(`/automation-schedules/${id}/dry-run`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Automation schedule dry run completed without creating execution requests.');
      await refreshAutomationQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to dry-run automation schedule.'))
  });

  const runAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) => apiRequest<Record<string, unknown>>(`/automation-schedules/${id}/run`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Manual automation schedule run requested.');
      await refreshAutomationQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to run automation schedule.'))
  });

  const pauseAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) => apiRequest<AutomationSchedule>(`/automation-schedules/${id}/pause`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Automation schedule paused.');
      await refreshAutomationQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to pause automation schedule.'))
  });

  const resumeAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) => apiRequest<AutomationSchedule>(`/automation-schedules/${id}/resume`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Automation schedule resumed.');
      await refreshAutomationQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to resume automation schedule.'))
  });

  const disableAutomationScheduleMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => apiRequest<AutomationSchedule>(`/automation-schedules/${id}/disable`, {
      method: 'POST',
      body: JSON.stringify({ disabled_reason: reason.trim() || 'Disabled from enterprise inventory UI' })
    }),
    onSuccess: async () => {
      setStatusMessage('Automation schedule disabled.');
      await refreshAutomationQueries();
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to disable automation schedule.'))
  });

  const createParLevelMutation = useMutation({
    mutationFn: (input: ParLevelForm) => apiRequest<ParLevel>('/enterprise-inventory/par-levels', {
      method: 'POST',
      body: JSON.stringify({
        product_id: input.product_id,
        storage_location_id: input.storage_location_id || null,
        department: input.department.trim() || null,
        min_quantity: Number(input.min_quantity),
        par_quantity: Number(input.par_quantity),
        reorder_quantity: Number(input.reorder_quantity),
        active: true
      })
    }),
    onSuccess: async () => {
      setParLevelForm(emptyParLevelForm);
      setStatusMessage('Par level saved.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-par-levels'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to save par level.'))
  });

  const evaluateParLevelsMutation = useMutation({
    mutationFn: () => apiRequest<ParLevel[]>('/enterprise-inventory/par-levels/evaluate', { method: 'POST' }),
    onSuccess: async (items) => {
      setStatusMessage(`${items.length} low-stock par level signal(s) generated.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-par-levels'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to evaluate par levels.'))
  });

  const createRequisitionMutation = useMutation({
    mutationFn: (input: RequisitionForm) => apiRequest<DepartmentRequisition>('/enterprise-inventory/department-requisitions', {
      method: 'POST',
      body: JSON.stringify({
        department: input.department.trim(),
        storage_location_id: input.storage_location_id || null,
        priority: input.priority,
        notes: input.notes.trim() || null,
        items: [
          {
            product_id: input.product_id,
            requested_quantity: Number(input.requested_quantity)
          }
        ]
      })
    }),
    onSuccess: async () => {
      setRequisitionForm(emptyRequisitionForm);
      setStatusMessage('Department requisition created.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-requisitions'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create requisition.'))
  });

  const createCycleCountMutation = useMutation({
    mutationFn: (input: CycleCountForm) => apiRequest<CycleCount>('/enterprise-inventory/cycle-counts', {
      method: 'POST',
      body: JSON.stringify({
        storage_location_id: input.storage_location_id || null,
        department: input.department.trim() || null,
        notes: input.notes.trim() || null,
        items: [
          {
            product_id: input.product_id,
            storage_location_id: input.storage_location_id || null,
            expected_quantity: Number(input.expected_quantity),
            counted_quantity: input.counted_quantity === '' ? null : Number(input.counted_quantity)
          }
        ]
      })
    }),
    onSuccess: async () => {
      setCycleCountForm(emptyCycleCountForm);
      setStatusMessage('Cycle count created.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-cycle-counts'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create cycle count.'))
  });

  const reconcileCycleCountMutation = useMutation({
    mutationFn: (id: string) => apiRequest<{ message: string; id: string }>(`/enterprise-inventory/cycle-counts/${id}/reconcile`, {
      method: 'POST'
    }),
    onSuccess: async () => {
      setStatusMessage('Cycle count reconciled and stock movements posted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-cycle-counts'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-low-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to reconcile cycle count.'))
  });

  const adjustStockMutation = useMutation({
    mutationFn: (input: StockAdjustmentForm) => apiRequest<{ message: string }>('/stock/adjust', {
      method: 'POST',
      body: JSON.stringify({
        product_id: input.product_id,
        storage_location_id: input.storage_location_id,
        change: Number(input.change),
        reason: input.reason.trim() || 'manual_adjustment'
      })
    }),
    onSuccess: async () => {
      setStockAdjustmentForm(emptyStockAdjustmentForm);
      setStatusMessage('Manual stock adjustment posted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-cycle-counts'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-low-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to post stock adjustment.'))
  });

  const createStockTransferMutation = useMutation({
    mutationFn: (input: StockTransferForm) => apiRequest<StockTransfer>('/stock-transfers', {
      method: 'POST',
      body: JSON.stringify({
        from_storage_location_id: input.from_storage_location_id,
        to_storage_location_id: input.to_storage_location_id,
        notes: input.notes.trim() || null,
        items: [
          {
            product_id: input.product_id,
            quantity: Number(input.quantity)
          }
        ]
      })
    }),
    onSuccess: async () => {
      setStockTransferForm(emptyStockTransferForm);
      setStatusMessage('Stock transfer draft created.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-movements'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create stock transfer.'))
  });

  const executeStockTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest<StockTransfer>(`/stock-transfers/${id}/execute`, {
      method: 'POST'
    }),
    onSuccess: async () => {
      setStatusMessage('Stock transfer executed.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-low-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-movements'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to execute stock transfer.'))
  });

  const cancelStockTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest<StockTransfer>(`/stock-transfers/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'cancelled_from_enterprise_inventory_ui' })
    }),
    onSuccess: async () => {
      setStatusMessage('Stock transfer cancelled.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-stock-transfers'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to cancel stock transfer.'))
  });


  const saveStorageLocationMutation = useMutation({
    mutationFn: (input: StorageLocationForm) => apiRequest<StorageLocationOption>(
      editingStorageLocationId ? `/storage-locations/${editingStorageLocationId}` : '/storage-locations',
      {
        method: editingStorageLocationId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: input.name.trim(),
          temperature_zone: input.temperature_zone.trim() || null
        })
      }
    ),
    onSuccess: async () => {
      setStorageLocationForm(emptyStorageLocationForm);
      setEditingStorageLocationId(null);
      setStatusMessage('Storage location saved.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-storage-locations'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to save storage location.'))
  });

  const deleteStorageLocationMutation = useMutation({
    mutationFn: (id: string) => apiRequest<{ message?: string }>(`/storage-locations/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setStatusMessage('Storage location deleted.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-storage-locations'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to delete storage location.'))
  });

  const saveSupplierMutation = useMutation({
    mutationFn: (input: SupplierForm) => apiRequest<SupplierOption>(
      editingSupplierId ? `/suppliers/${editingSupplierId}` : '/suppliers',
      {
        method: editingSupplierId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: input.name.trim(),
          email: input.email.trim() || null,
          contact_info: input.contact_info.trim() || null
        })
      }
    ),
    onSuccess: async () => {
      setSupplierForm(emptySupplierForm);
      setEditingSupplierId(null);
      setStatusMessage('Supplier saved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-supplier-performance'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to save supplier.'))
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => apiRequest<{ message?: string }>(`/suppliers/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setSupplierForm(emptySupplierForm);
      setEditingSupplierId(null);
      setStatusMessage('Supplier deleted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-supplier-performance'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to delete supplier.'))
  });

  const saveProductMutation = useMutation({
    mutationFn: (input: ProductForm) => {
      const editingProduct = editingProductId ? products.find((item) => item.id === editingProductId) : null;
      const body = {
        name: input.name.trim(),
        category: input.category.trim() || null,
        unit: input.unit.trim(),
        min_stock: Number(input.min_stock || 0),
        supplier_id: input.supplier_id || null,
        barcode: input.barcode.trim() || null,
        standard_unit_cost: input.standard_unit_cost === '' ? null : Number(input.standard_unit_cost),
        package_name: input.package_name.trim() || undefined,
        units_per_package: input.units_per_package === '' ? undefined : Number(input.units_per_package)
      };

      return apiRequest<ProductOption>(editingProductId ? `/products/${editingProductId}` : '/products', {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: editingProductId && editingProduct?.version ? { 'If-Match-Version': String(editingProduct.version) } : undefined,
        body: JSON.stringify(body)
      });
    },
    onSuccess: async () => {
      setProductForm(emptyProductForm);
      setEditingProductId(null);
      setStatusMessage('Product saved.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-product-cost-risk-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-inventory-valuation-report'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to save product.'))
  });

  const deleteProductMutation = useMutation({
    mutationFn: (product: ProductOption) => apiRequest<{ message?: string }>(`/products/${product.id}`, {
      method: 'DELETE',
      headers: product.version ? { 'If-Match-Version': String(product.version) } : undefined
    }),
    onSuccess: async () => {
      setProductForm(emptyProductForm);
      setEditingProductId(null);
      setStatusMessage('Product deleted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-product-cost-risk-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-inventory-valuation-report'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to delete product.'))
  });

  const createShipmentFromPurchaseOrderMutation = useMutation({
    mutationFn: (input: PurchaseOrderShipmentForm) => {
      const purchaseOrder = purchaseOrders.find((item) => item.id === input.purchase_order_id);
      if (!purchaseOrder) {
        throw new Error('Select a purchase order before creating a shipment.');
      }

      return apiRequest<Shipment>(`/purchase-orders/${input.purchase_order_id}/create-shipment`, {
        method: 'POST',
        headers: {
          'If-Match-Version': String(purchaseOrder.version)
        },
        body: JSON.stringify({
          delivery_date: input.delivery_date || null
        })
      });
    },
    onSuccess: async () => {
      setPurchaseOrderShipmentForm(emptyPurchaseOrderShipmentForm);
      setStatusMessage('Shipment created from purchase order.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-shipments'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create shipment from purchase order.'))
  });


  const purchaseOrderLifecycleMutation = useMutation({
    mutationFn: ({ purchaseOrder, action, reason }: { purchaseOrder: PurchaseOrder; action: 'submit' | 'approve' | 'close' | 'reopen' | 'cancel'; reason?: string }) => {
      const body = action === 'close'
        ? { reason: reason?.trim() || 'Closed from enterprise inventory control tower.' }
        : action === 'cancel'
          ? { reason: reason?.trim() || null }
          : undefined;

      return apiRequest<PurchaseOrder>(`/purchase-orders/${purchaseOrder.id}/${action}`, {
        method: 'POST',
        headers: {
          'If-Match-Version': String(purchaseOrder.version)
        },
        body: body ? JSON.stringify(body) : undefined
      });
    },
    onSuccess: async (_purchaseOrder, variables) => {
      setStatusMessage(`Purchase order ${variables.action} action completed.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-purchase-orders'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-procurement-summary-report'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to update purchase order lifecycle.'))
  });

  const receiveShipmentMutation = useMutation({
    mutationFn: (input: ShipmentReceivingForm) => {
      const shipment = shipments.find((item) => item.id === input.shipment_id);
      if (!shipment) {
        throw new Error('Select a shipment before receiving stock.');
      }

      return apiRequest<Shipment>(`/shipments/${input.shipment_id}/receive`, {
        method: 'POST',
        headers: {
          'If-Match-Version': String(shipment.version)
        },
        body: JSON.stringify({
          items: [
            {
              product_id: input.product_id,
              storage_location_id: input.storage_location_id,
              quantity_received: Number(input.quantity_received),
              discrepancy_reason: input.discrepancy_reason.trim() || null,
              receiving_note: input.receiving_note.trim() || null
            }
          ]
        })
      });
    },
    onSuccess: async () => {
      setShipmentReceivingForm((current) => ({
        ...current,
        product_id: '',
        quantity_received: '',
        discrepancy_reason: '',
        receiving_note: ''
      }));
      setStatusMessage('Shipment receipt posted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-shipments'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-shipment-items'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-low-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-stock-movements'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to receive shipment.'))
  });

  const barcodeLookupMutation = useMutation({
    mutationFn: (input: ShipmentBarcodeScanForm) => {
      if (!shipmentReceivingForm.shipment_id) {
        throw new Error('Select a shipment before scanning a barcode.');
      }
      const barcode = input.barcode.trim();
      if (!barcode) {
        throw new Error('Enter or scan a barcode.');
      }
      return lookupShipmentBarcode(shipmentReceivingForm.shipment_id, barcode);
    },
    onSuccess: (result) => {
      const scannedPackages = Math.max(toNumber(shipmentBarcodeScanForm.package_count), 1);
      const unitsPerPackage = Math.max(toNumber(result.package?.units_per_package), 1);
      const receivedUnits = scannedPackages * unitsPerPackage;
      setLastBarcodeLookup(result);
      setShipmentReceivingForm((current) => ({
        ...current,
        product_id: result.product_id,
        storage_location_id: result.storage_location_id || current.storage_location_id,
        quantity_received: String(receivedUnits),
        discrepancy_reason: result.discrepancy_reason || current.discrepancy_reason
      }));
      setStatusMessage(`Barcode resolved to ${result.product_name || result.product?.name || result.product_id}; ${formatNumber(receivedUnits)} unit(s) staged for receipt.`);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to resolve shipment barcode.'))
  });

  const finalizeShipmentMutation = useMutation({
    mutationFn: (shipment: Shipment) => apiRequest<Shipment>(`/shipments/${shipment.id}/finalize`, {
      method: 'POST',
      headers: {
        'If-Match-Version': String(shipment.version)
      }
    }),
    onSuccess: async () => {
      setStatusMessage('Shipment finalized.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-shipments'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-shipment-items'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-purchase-orders'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to finalize shipment.'))
  });

  const createApprovalRuleMutation = useMutation({
    mutationFn: (input: ApprovalRuleForm) => apiRequest<ApprovalRule>('/enterprise-inventory/approval-rules', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: input.entity_type,
        department: input.department.trim() || null,
        storage_location_id: input.storage_location_id || null,
        min_amount: Number(input.min_amount || 0),
        max_amount: input.max_amount === '' ? null : Number(input.max_amount),
        required_role: input.required_role.trim(),
        active: true
      })
    }),
    onSuccess: async () => {
      setApprovalRuleForm(emptyApprovalRuleForm);
      setStatusMessage('Approval rule saved.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-approval-rules'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to save approval rule.'))
  });

  const executeApprovalMutation = useMutation({
    mutationFn: (input: { entity_type: string; entity_id: string; action: 'approved' | 'rejected' }) => apiRequest<{ message: string }>('/enterprise-inventory/approvals/execute', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        action: input.action
      })
    }),
    onSuccess: async (_, input) => {
      setStatusMessage(`Approval ${input.action}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-requisitions'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to execute approval.'))
  });

  const createSupplierCatalogMutation = useMutation({
    mutationFn: (input: SupplierCatalogForm) => apiRequest<SupplierCatalogItem>('/enterprise-inventory/supplier-catalog', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: input.supplier_id,
        product_id: input.product_id,
        supplier_sku: input.supplier_sku.trim() || null,
        supplier_product_name: input.supplier_product_name.trim() || null,
        lead_time_days: Number(input.lead_time_days || 0),
        min_order_quantity: Number(input.min_order_quantity || 0),
        preferred: input.preferred,
        active: true,
        unit_cost: input.unit_cost === '' ? null : Number(input.unit_cost),
        currency: input.currency.trim() || 'EUR',
        effective_from: input.effective_from || null
      })
    }),
    onSuccess: async () => {
      setSupplierCatalogForm(emptySupplierCatalogForm);
      setStatusMessage('Supplier catalog item saved.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-catalog'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to save supplier catalog item.'))
  });

  const createSupplierInvoiceMutation = useMutation({
    mutationFn: (input: SupplierInvoiceForm) => apiRequest<SupplierInvoice>('/enterprise-inventory/supplier-invoices', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: input.supplier_id,
        purchase_order_id: input.purchase_order_id || null,
        shipment_id: input.shipment_id || null,
        invoice_number: input.invoice_number.trim(),
        invoice_date: input.invoice_date,
        currency: 'EUR',
        subtotal_amount: Number(input.subtotal_amount || 0),
        tax_amount: Number(input.tax_amount || 0),
        total_amount: Number(input.total_amount || 0),
        items: [
          {
            product_id: input.product_id,
            quantity: Number(input.quantity || 0),
            unit_cost: Number(input.unit_cost || 0),
            expected_quantity: input.expected_quantity === '' ? null : Number(input.expected_quantity),
            expected_unit_cost: input.expected_unit_cost === '' ? null : Number(input.expected_unit_cost)
          }
        ]
      })
    }),
    onSuccess: async () => {
      setSupplierInvoiceForm(emptySupplierInvoiceForm);
      setStatusMessage('Supplier invoice created.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create supplier invoice.'))
  });

  const createBarcodeLabelMutation = useMutation({
    mutationFn: (input: BarcodeLabelForm) => apiRequest<BarcodeLabel>('/enterprise-inventory/barcode-labels', {
      method: 'POST',
      body: JSON.stringify({
        product_id: input.product_id,
        barcode_value: input.barcode_value.trim() || null,
        barcode_type: input.barcode_type,
        label_template: input.label_template.trim() || 'default',
        lot_number: input.lot_number.trim() || null,
        batch_number: input.batch_number.trim() || null,
        expiry_date: input.expiry_date || null
      })
    }),
    onSuccess: async () => {
      setBarcodeLabelForm(emptyBarcodeLabelForm);
      setStatusMessage('Barcode label created.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-barcode-labels'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create barcode label.'))
  });


  const createProductPackageMutation = useMutation({
    mutationFn: (input: ProductPackageForm) => apiRequest<ProductPackage>(`/products/${input.product_id}/packages`, {
      method: 'POST',
      body: JSON.stringify({
        package_name: input.package_name.trim(),
        barcode: input.barcode.trim(),
        units_per_package: Number(input.units_per_package),
        is_default: input.is_default
      })
    }),
    onSuccess: async () => {
      setProductPackageForm((current) => ({ ...emptyProductPackageForm, product_id: current.product_id }));
      setEditingProductPackageId(null);
      setStatusMessage('Product package barcode created.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-product-packages'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create product package.'))
  });

  const updateProductPackageMutation = useMutation({
    mutationFn: ({ packageId, input }: { packageId: string; input: ProductPackageForm }) => apiRequest<ProductPackage>(`/products/${input.product_id}/packages/${packageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        package_name: input.package_name.trim(),
        barcode: input.barcode.trim(),
        units_per_package: Number(input.units_per_package),
        is_default: input.is_default
      })
    }),
    onSuccess: async () => {
      setProductPackageForm((current) => ({ ...emptyProductPackageForm, product_id: current.product_id }));
      setEditingProductPackageId(null);
      setStatusMessage('Product package barcode updated.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-product-packages'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to update product package.'))
  });

  const deleteProductPackageMutation = useMutation({
    mutationFn: (item: ProductPackage) => apiRequest<{ message: string }>(`/products/${item.product_id}/packages/${item.id}`, {
      method: 'DELETE'
    }),
    onSuccess: async () => {
      setStatusMessage('Product package barcode deleted.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-product-packages'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to delete product package.'))
  });

  const queueNotificationDeliveryMutation = useMutation({
    mutationFn: (input: NotificationDeliveryForm) => apiRequest<NotificationDelivery>('/enterprise-inventory/notifications/deliveries', {
      method: 'POST',
      body: JSON.stringify({
        notification_event_id: input.notification_event_id,
        channel: input.channel,
        recipient: input.recipient.trim() || null
      })
    }),
    onSuccess: async () => {
      setNotificationDeliveryForm(emptyNotificationDeliveryForm);
      setStatusMessage('Notification delivery queued.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to queue notification delivery.'))
  });

  const processNotificationDeliveriesMutation = useMutation({
    mutationFn: () => apiRequest<{ processed: number }>('/enterprise-inventory/notifications/deliveries/process', {
      method: 'POST'
    }),
    onSuccess: async (result) => {
      setStatusMessage(`${result.processed} notification deliver${result.processed === 1 ? 'y' : 'ies'} processed.`);
      await queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to process notification deliveries.'))
  });

  const createAlertMutation = useMutation({
    mutationFn: (input: AlertForm) => apiRequest<AlertItem>('/alerts', {
      method: 'POST',
      body: JSON.stringify({
        type: input.type.trim(),
        message: input.message.trim(),
        product_id: input.product_id || null,
        severity: input.severity || undefined,
        escalation_level: input.escalation_level === '' ? undefined : Number(input.escalation_level)
      })
    }),
    onSuccess: async () => {
      setAlertForm(emptyAlertForm);
      setStatusMessage('Alert created.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-alerts'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to create alert.'))
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (id: string) => apiRequest<AlertItem>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Alert acknowledged.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-alerts'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to acknowledge alert.'))
  });

  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, resolution_note }: { id: string; resolution_note: string }) => apiRequest<AlertItem>(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_note: resolution_note.trim() || null })
    }),
    onSuccess: async (_, input) => {
      setAlertResolutionNotes((current) => ({ ...current, [input.id]: '' }));
      setStatusMessage('Alert resolved.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-alerts'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to resolve alert.'))
  });

  const reopenAlertMutation = useMutation({
    mutationFn: (id: string) => apiRequest<AlertItem>(`/alerts/${id}/reopen`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Alert reopened.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-alerts'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to reopen alert.'))
  });

  const escalateAlertMutation = useMutation({
    mutationFn: (id: string) => apiRequest<AlertItem>(`/alerts/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ severity: 'critical' })
    }),
    onSuccess: async () => {
      setStatusMessage('Alert escalated.');
      await queryClient.invalidateQueries({ queryKey: ['enterprise-alerts'] });
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to escalate alert.'))
  });

  const createAttachmentMutation = useMutation({
    mutationFn: (input: AttachmentForm) => apiRequest<EntityAttachment>('/enterprise-inventory/attachments', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        original_filename: input.original_filename.trim(),
        stored_filename: input.stored_filename.trim(),
        mime_type: input.mime_type.trim() || null,
        file_size_bytes: Number(input.file_size_bytes || 0),
        storage_path: input.storage_path.trim() || null
      })
    }),
    onSuccess: async (attachment) => {
      setStatusMessage('Attachment linked.');
      setAttachmentForm((current) => ({
        ...current,
        entity_type: attachment.entity_type,
        entity_id: attachment.entity_id,
        original_filename: '',
        stored_filename: '',
        mime_type: '',
        file_size_bytes: '0',
        storage_path: ''
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-attachments'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-notifications'] })
      ]);
    },
    onError: (error) => setErrorMessage(normalizeError(error, 'Failed to link attachment.'))
  });

  const handleParLevelSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createParLevelMutation.mutate(parLevelForm);
  };

  const handleRequisitionSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createRequisitionMutation.mutate(requisitionForm);
  };

  const handleCycleCountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createCycleCountMutation.mutate(cycleCountForm);
  };

  const handleStockAdjustmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    adjustStockMutation.mutate(stockAdjustmentForm);
  };

  const handleStockTransferSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createStockTransferMutation.mutate(stockTransferForm);
  };

  const handlePurchaseOrderShipmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createShipmentFromPurchaseOrderMutation.mutate(purchaseOrderShipmentForm);
  };


  const handlePurchaseOrderLifecycleAction = (purchaseOrder: PurchaseOrder, action: 'submit' | 'approve' | 'close' | 'reopen' | 'cancel') => {
    setErrorMessage(null);
    setStatusMessage(null);
    const reason = action === 'close' || action === 'cancel'
      ? window.prompt(action === 'close' ? 'Close reason' : 'Cancellation reason', '') || undefined
      : undefined;
    purchaseOrderLifecycleMutation.mutate({ purchaseOrder, action, reason });
  };

  const handleShipmentBarcodeLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    barcodeLookupMutation.mutate(shipmentBarcodeScanForm);
  };

  const handleShipmentReceivingSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    receiveShipmentMutation.mutate(shipmentReceivingForm);
  };

  const handleSupplierSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveSupplierMutation.mutate(supplierForm);
  };

  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProductMutation.mutate(productForm);
  };

  const startProductEdit = (product: ProductOption) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      category: product.category || '',
      unit: product.unit || '',
      min_stock: String(product.min_stock ?? '0'),
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || '',
      standard_unit_cost: product.standard_unit_cost === null || product.standard_unit_cost === undefined ? '' : String(product.standard_unit_cost),
      package_name: '',
      units_per_package: '1'
    });
    setActiveTab('products');
  };

  const startSupplierEdit = (supplier: SupplierOption) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      name: supplier.name || '',
      email: supplier.email || '',
      contact_info: supplier.contact_info || ''
    });
  };

  const handleStorageLocationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveStorageLocationMutation.mutate(storageLocationForm);
  };

  const startEditingStorageLocation = (location: StorageLocationOption) => {
    setEditingStorageLocationId(location.id);
    setStorageLocationForm({
      name: location.name || '',
      temperature_zone: location.temperature_zone || ''
    });
    setActiveTab('locations');
  };

  const handleApprovalRuleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createApprovalRuleMutation.mutate(approvalRuleForm);
  };

  const handleSupplierCatalogSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createSupplierCatalogMutation.mutate(supplierCatalogForm);
  };

  const handleSupplierInvoiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createSupplierInvoiceMutation.mutate(supplierInvoiceForm);
  };

  const handleBarcodeLabelSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createBarcodeLabelMutation.mutate(barcodeLabelForm);
  };


  const handleProductPackageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingProductPackageId) {
      updateProductPackageMutation.mutate({ packageId: editingProductPackageId, input: productPackageForm });
      return;
    }
    createProductPackageMutation.mutate(productPackageForm);
  };

  const beginEditProductPackage = (item: ProductPackage) => {
    setProductPackageForm({
      product_id: item.product_id,
      package_name: item.package_name,
      barcode: item.barcode,
      units_per_package: String(item.units_per_package),
      is_default: Boolean(item.is_default)
    });
    setEditingProductPackageId(item.id);
  };

  const cancelEditProductPackage = () => {
    setProductPackageForm((current) => ({ ...emptyProductPackageForm, product_id: current.product_id }));
    setEditingProductPackageId(null);
  };

  const handleNotificationDeliverySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    queueNotificationDeliveryMutation.mutate(notificationDeliveryForm);
  };

  const handleAlertSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createAlertMutation.mutate(alertForm);
  };

  const handleAttachmentSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createAttachmentMutation.mutate(attachmentForm);
  };

  const handleExecutionAction = (request: ExecutionRequest, action: 'submit' | 'approve' | 'reject' | 'execute' | 'noop' | 'cancel') => {
    if (action === 'submit') {
      const note = window.prompt('Submit note (optional)', '') || '';
      submitExecutionRequestMutation.mutate({ id: request.id, note });
      return;
    }
    if (action === 'approve') {
      const review_note = window.prompt('Review note (optional)', '') || '';
      approveExecutionRequestMutation.mutate({ id: request.id, review_note });
      return;
    }
    if (action === 'reject') {
      const rejection_reason = window.prompt('Rejection reason') || '';
      if (rejection_reason.trim().length >= 3) rejectExecutionRequestMutation.mutate({ id: request.id, rejection_reason });
      return;
    }
    if (action === 'execute') {
      const note = window.prompt('Execution note (optional)', '') || '';
      executeExecutionRequestMutation.mutate({ id: request.id, note });
      return;
    }
    if (action === 'noop') {
      const note = window.prompt('No-op execution note (optional)', '') || '';
      executeNoopExecutionRequestMutation.mutate({ id: request.id, note });
      return;
    }
    const cancel_reason = window.prompt('Cancel reason') || '';
    if (cancel_reason.trim().length >= 3) cancelExecutionRequestMutation.mutate({ id: request.id, cancel_reason });
  };

  return (
    <div style={styles.page}>
      <EnterpriseInventoryHero
        onEvaluateParLevels={() => evaluateParLevelsMutation.mutate()}
        evaluating={evaluateParLevelsMutation.isPending}
      />

      <StatusMessages statusMessage={statusMessage} errorMessage={errorMessage} />

      <EnterpriseInventoryTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'operations-dashboard' ? (
        <section style={styles.stack}>
          <div style={styles.metricsGrid}>
            <MetricCard label="Products" value={operationsDashboardSummary.totalProducts} helper="Active catalog rows" />
            <MetricCard label="Suppliers" value={operationsDashboardSummary.totalSuppliers} helper="Active suppliers" />
            <MetricCard label="Locations" value={operationsDashboardSummary.totalStorageLocations} helper="Storage locations" />
            <MetricCard label="Open shipments" value={operationsDashboardSummary.openShipments} helper="Pending + partial" />
            <MetricCard label="Low-stock rows" value={operationsDashboardSummary.lowStockRows} helper={`${operationsDashboardSummary.lowStockRate.toFixed(1)}% of stock rows`} />
            <MetricCard label="Critical alerts" value={operationsDashboardSummary.criticalAlerts} helper={`${operationsDashboardSummary.unresolvedAlerts} unresolved total`} />
          </div>

          <section style={styles.grid}>
            <SectionCard title="Dashboard low stock">
              <DataTable
                loading={dashboardLowStockQuery.isLoading}
                empty="No dashboard low-stock rows."
                headers={['Product', 'Location', 'Qty', 'Min', 'Shortage', 'Updated']}
                rows={dashboardLowStockRows.map((item) => [
                  item.product_name || item.product_id,
                  item.storage_location_name || item.storage_location_id,
                  formatNumber(item.quantity),
                  formatNumber(item.min_stock ?? item.product_min_stock ?? item.min_quantity),
                  formatNumber(item.shortage),
                  formatDateTime(item.updated_at)
                ])}
              />
            </SectionCard>

            <SectionCard title="Overdue shipments">
              <DataTable
                loading={dashboardOverdueShipmentsQuery.isLoading}
                empty="No overdue dashboard shipments."
                headers={['PO', 'Supplier', 'Delivery', 'Status', 'Lines', 'Received / Ordered']}
                rows={dashboardOverdueShipments.map((item) => [
                  item.po_number || item.id,
                  item.supplier_name || item.supplier_id,
                  formatDate(item.delivery_date),
                  item.status,
                  formatNumber(item.line_count),
                  `${formatNumber(item.total_received_quantity)} / ${formatNumber(item.total_ordered_quantity)}`
                ])}
              />
            </SectionCard>

            <SectionCard title="Unresolved dashboard alerts">
              <DataTable
                loading={dashboardUnresolvedAlertsQuery.isLoading}
                empty="No unresolved dashboard alerts."
                headers={['Severity', 'Type', 'Product', 'Message', 'Ack', 'Created']}
                rows={dashboardUnresolvedAlerts.map((item) => [
                  item.severity,
                  item.type,
                  item.product_name || item.product_id || '-',
                  item.message,
                  item.acknowledged ? 'Yes' : 'No',
                  formatDateTime(item.created_at)
                ])}
              />
            </SectionCard>

            <SectionCard title="Recent dashboard activity">
              <DataTable
                loading={dashboardRecentActivityQuery.isLoading}
                empty="No dashboard activity rows."
                headers={['Product', 'Change', 'Reason', 'Shipment', 'User', 'Created']}
                rows={dashboardRecentActivity.map((item) => [
                  item.product_name || item.product_id,
                  formatNumber(item.change),
                  item.reason,
                  item.shipment_po_number || item.shipment_id || '-',
                  item.user_name || '-',
                  formatDateTime(item.created_at)
                ])}
              />
            </SectionCard>

            <SectionCard title="Supplier performance">
              <DataTable
                loading={dashboardSupplierPerformanceQuery.isLoading}
                empty="No supplier performance rows."
                headers={['Supplier', 'Total', 'Pending', 'Partial', 'Received', 'Overdue', 'Last delivery']}
                rows={dashboardSupplierPerformance.map((item) => [
                  item.supplier_name || item.supplier_id,
                  formatNumber(item.total_shipments),
                  formatNumber(item.pending_shipments),
                  formatNumber(item.partial_shipments),
                  formatNumber(item.received_shipments),
                  formatNumber(item.overdue_shipments),
                  formatDate(item.last_delivery_date)
                ])}
              />
            </SectionCard>
          </section>
        </section>
      ) : null}

      {activeTab === 'par-levels' ? (
        <section style={styles.grid}>
          <form onSubmit={handleParLevelSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Create / update par level</h2>
            <SelectField
              label="Product"
              value={parLevelForm.product_id}
              onChange={(value) => setParLevelForm((current) => ({ ...current, product_id: value }))}
              options={products.map((product) => ({ value: product.id, label: product.name }))}
              required
            />
            <SelectField
              label="Storage location"
              value={parLevelForm.storage_location_id}
              onChange={(value) => setParLevelForm((current) => ({ ...current, storage_location_id: value }))}
              options={storageLocations.map((location) => ({ value: location.id, label: location.name }))}
            />
            <InputField label="Department" value={parLevelForm.department} onChange={(value) => setParLevelForm((current) => ({ ...current, department: value }))} />
            <InputField label="Minimum quantity" type="number" value={parLevelForm.min_quantity} onChange={(value) => setParLevelForm((current) => ({ ...current, min_quantity: value }))} required />
            <InputField label="Par quantity" type="number" value={parLevelForm.par_quantity} onChange={(value) => setParLevelForm((current) => ({ ...current, par_quantity: value }))} required />
            <InputField label="Reorder quantity" type="number" value={parLevelForm.reorder_quantity} onChange={(value) => setParLevelForm((current) => ({ ...current, reorder_quantity: value }))} required />
            <button type="submit" disabled={createParLevelMutation.isPending} style={styles.primaryButton}>Save par level</button>
          </form>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Configured par levels</h2>
            <DataTable
              loading={parLevelsQuery.isLoading}
              empty="No par levels configured yet."
              headers={['Product', 'Location', 'Department', 'Min', 'Par', 'Reorder']}
              rows={(parLevelsQuery.data ?? []).map((item) => [
                item.product_name || item.product_id,
                item.storage_location_name || '-',
                item.department || '-',
                formatNumber(item.min_quantity),
                formatNumber(item.par_quantity),
                formatNumber(item.reorder_quantity)
              ])}
            />
          </div>
        </section>
      ) : null}

      {activeTab === 'cycle-counts' ? (
        <section style={styles.grid}>
          <div style={styles.stack}>
            <form onSubmit={handleCycleCountSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Create cycle count</h2>
              <SelectField label="Storage location" value={cycleCountForm.storage_location_id} onChange={(value) => setCycleCountForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
              <InputField label="Department" value={cycleCountForm.department} onChange={(value) => setCycleCountForm((current) => ({ ...current, department: value }))} />
              <InputField label="Notes" value={cycleCountForm.notes} onChange={(value) => setCycleCountForm((current) => ({ ...current, notes: value }))} />
              <SelectField label="Product" value={cycleCountForm.product_id} onChange={(value) => setCycleCountForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
              <InputField label="Expected quantity" type="number" value={cycleCountForm.expected_quantity} onChange={(value) => setCycleCountForm((current) => ({ ...current, expected_quantity: value }))} required />
              <InputField label="Counted quantity" type="number" value={cycleCountForm.counted_quantity} onChange={(value) => setCycleCountForm((current) => ({ ...current, counted_quantity: value }))} />
              <button type="submit" disabled={createCycleCountMutation.isPending} style={styles.primaryButton}>Create cycle count</button>
            </form>

            <form onSubmit={handleStockAdjustmentSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Manual inventory adjustment</h2>
              <p style={styles.helper}>Posts to the existing /stock/adjust endpoint and records a stock movement.</p>
              <SelectField label="Product" value={stockAdjustmentForm.product_id} onChange={(value) => setStockAdjustmentForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
              <SelectField label="Storage location" value={stockAdjustmentForm.storage_location_id} onChange={(value) => setStockAdjustmentForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
              <InputField label="Quantity change" type="number" value={stockAdjustmentForm.change} onChange={(value) => setStockAdjustmentForm((current) => ({ ...current, change: value }))} required />
              <InputField label="Reason" value={stockAdjustmentForm.reason} onChange={(value) => setStockAdjustmentForm((current) => ({ ...current, reason: value }))} required />
              <button type="submit" disabled={adjustStockMutation.isPending} style={styles.primaryButton}>Post adjustment</button>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Cycle counts</h2>
            {cycleCountsQuery.isLoading ? (
              <p style={styles.helper}>Loading…</p>
            ) : (cycleCountsQuery.data ?? []).length ? (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Notes</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cycleCountsQuery.data ?? []).map((item) => {
                      const canReconcile = ['draft', 'submitted', 'approved'].includes(item.status);
                      return (
                        <tr key={item.id}>
                          <td style={styles.td}>{item.status}</td>
                          <td style={styles.td}>{item.department || '-'}</td>
                          <td style={styles.td}>{item.notes || '-'}</td>
                          <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              disabled={!canReconcile || reconcileCycleCountMutation.isPending}
                              style={canReconcile ? styles.smallButton : styles.disabledButton}
                              onClick={() => reconcileCycleCountMutation.mutate(item.id)}
                            >
                              Reconcile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={styles.helper}>No cycle counts yet.</p>
            )}
          </div>
        </section>
      ) : null}


      {activeTab === 'stock-risk' ? (
        <section style={styles.grid}>
          <div style={styles.stack}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Low stock dashboard</h2>
              <p style={styles.helper}>Reads the existing /stock?low_stock=true endpoint and compares live stock quantity to product minimum stock.</p>
              <div style={styles.statGrid}>
                <MetricCard label="Low stock rows" value={lowStockItems.length} />
                <MetricCard label="Out of stock rows" value={stockRiskSummary.critical} />
                <MetricCard label="Shortage units" value={formatNumber(stockRiskSummary.shortageUnits)} />
              </div>
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Recent stock movements</h2>
              <DataTable
                loading={stockMovementsQuery.isLoading}
                empty="No stock movements found."
                headers={['Product', 'Change', 'Reason', 'Shipment', 'User', 'Created']}
                rows={recentStockMovements.map((item) => [
                  item.product_name || item.product_id,
                  formatNumber(item.change),
                  item.reason,
                  item.shipment_po_number || item.shipment_id || '-',
                  item.user_name || '-',
                  formatDateTime(item.created_at)
                ])}
              />
            </section>
          </div>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Products below minimum stock</h2>
            <DataTable
              loading={lowStockQuery.isLoading}
              empty="No products are below their configured minimum stock."
              headers={['Product', 'Location', 'Quantity', 'Minimum', 'Shortage', 'Updated']}
              rows={lowStockItems.map((item) => {
                const minimum = toNumber(item.product_min_stock ?? item.min_quantity);
                const quantity = toNumber(item.quantity);
                return [
                  item.product_name || item.product_id,
                  item.storage_location_name || item.storage_location_id,
                  `${formatNumber(item.quantity)} ${item.product_unit || ''}`.trim(),
                  formatNumber(minimum),
                  formatNumber(Math.max(minimum - quantity, 0)),
                  formatDateTime(item.updated_at)
                ];
              })}
            />
          </section>
        </section>
      ) : null}


      {activeTab === 'insights' ? (
        <section style={styles.stack}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Operational insights</h2>
            <p style={styles.helper}>Reads the existing analytics endpoints for operational health, inventory anomalies, reorder recommendations, depletion risk, and supplier trust scores.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Health score" value={operationalHealthQuery.data ? formatNumber(operationalHealthQuery.data.health_score) : '-'} helper={operationalHealthQuery.data?.health_tier || 'not loaded'} />
              <MetricCard label="Critical reorders" value={insightsSummary.criticalReorders} />
              <MetricCard label="High-risk stock rows" value={insightsSummary.highRiskStockRows} />
              <MetricCard label="High anomalies" value={insightsSummary.highAnomalies} />
              <MetricCard label="Suppliers with risk" value={insightsSummary.supplierRiskRows} />
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Operational health drivers</h2>
            <DataTable
              loading={operationalHealthQuery.isLoading}
              empty="Operational health has not loaded."
              headers={['Metric', 'Value']}
              rows={operationalHealthQuery.data ? [
                ['Unresolved alerts', formatNumber(operationalHealthQuery.data.metrics?.unresolved_alerts)],
                ['Overdue shipments', formatNumber(operationalHealthQuery.data.metrics?.overdue_shipments)],
                ['Low-stock rows', formatNumber(operationalHealthQuery.data.metrics?.low_stock_rows)],
                ['Low-stock rate', `${formatNumber(operationalHealthQuery.data.metrics?.low_stock_rate_pct)}%`],
                ['Discrepancy rate', `${formatNumber(operationalHealthQuery.data.metrics?.discrepancy_rate_pct)}%`],
                ['Alert penalty', formatNumber(operationalHealthQuery.data.penalties?.alert_penalty)],
                ['Overdue penalty', formatNumber(operationalHealthQuery.data.penalties?.overdue_penalty)],
                ['Low-stock penalty', formatNumber(operationalHealthQuery.data.penalties?.low_stock_penalty)],
                ['Discrepancy penalty', formatNumber(operationalHealthQuery.data.penalties?.discrepancy_penalty)]
              ] : []}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Inventory anomalies</h2>
            <p style={styles.helper}>Uses the real GET /operational-insights/anomalies route with a 7-day short window and 30-day baseline.</p>
            <DataTable
              loading={inventoryAnomaliesQuery.isLoading}
              empty="No inventory anomalies returned."
              headers={['Product', 'Recent outbound', 'Baseline outbound', 'Recent daily', 'Baseline daily', 'Spike ratio', 'Score', 'Tier']}
              rows={inventoryAnomalies.map((item) => [
                item.product_name || item.product_id,
                `${formatNumber(item.recent_outbound_quantity)} ${item.product_unit || ''}`.trim(),
                `${formatNumber(item.baseline_outbound_quantity)} ${item.product_unit || ''}`.trim(),
                formatNumber(item.recent_daily_outbound),
                formatNumber(item.baseline_daily_outbound),
                formatNumber(item.spike_ratio),
                formatNumber(item.anomaly_score),
                item.anomaly_tier
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Reorder recommendations</h2>
            <DataTable
              loading={reorderRecommendationsQuery.isLoading}
              empty="No reorder recommendations returned."
              headers={['Product', 'Current', 'Min', 'Recent outbound', 'Daily usage', 'Coverage days', 'Recommended reorder', 'Urgency']}
              rows={reorderRecommendations.map((item) => [
                item.product_name || item.product_id,
                formatNumber(item.current_quantity),
                formatNumber(item.min_stock),
                formatNumber(item.recent_outbound),
                formatNumber(item.average_daily_usage),
                item.estimated_days_of_coverage === null || item.estimated_days_of_coverage === undefined ? '-' : formatNumber(item.estimated_days_of_coverage),
                `${formatNumber(item.recommended_reorder_quantity)} ${item.unit || ''}`.trim(),
                item.urgency
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Depletion risk</h2>
            <DataTable
              loading={depletionRiskQuery.isLoading}
              empty="No depletion risk rows returned."
              headers={['Product', 'Location', 'On hand', 'Configured min', 'Recent outbound', 'Daily outbound', 'Coverage days', 'Risk score', 'Risk tier']}
              rows={depletionRiskRows.map((item) => [
                item.product_name || item.product_id,
                item.storage_location_name || item.storage_location_id,
                formatNumber(item.current_quantity),
                formatNumber(item.configured_min_quantity),
                formatNumber(item.recent_outbound_quantity),
                formatNumber(item.average_daily_outbound),
                item.estimated_days_of_coverage === null || item.estimated_days_of_coverage === undefined ? '-' : formatNumber(item.estimated_days_of_coverage),
                formatNumber(item.risk_score),
                item.risk_tier
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Supplier trust scores</h2>
            <DataTable
              loading={supplierTrustScoresQuery.isLoading}
              empty="No supplier trust scores returned."
              headers={['Supplier', 'Trust score', 'Tier', 'Fill rate', 'Discrepancy rate', 'Overdue shipments', 'Open POs', 'PO remaining value', 'Risk flags']}
              rows={supplierTrustScores.map((item) => [
                item.supplier_name || item.supplier_id,
                formatNumber(item.trust_score),
                item.trust_tier,
                `${formatNumber(item.fill_rate_pct)}%`,
                `${formatNumber(item.discrepancy_rate_pct)}%`,
                formatNumber(item.overdue_shipments),
                formatNumber(item.open_purchase_orders),
                formatNumber(item.po_remaining_value),
                (item.risk_flags ?? []).map((flag) => flag.label || flag.code || flag.severity || 'risk').join(', ') || '-'
              ])}
            />
          </section>
        </section>
      ) : null}


      {activeTab === 'forecast' ? (
        <section style={styles.stack}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Demand forecast</h2>
            <p style={styles.helper}>Reads the existing GET /forecast endpoint. Backend calculates 30-day average daily outbound usage from stock movements.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Forecast rows" value={forecastSummary.rowCount} />
              <MetricCard label="Total avg daily usage" value={formatNumber(forecastSummary.totalAverageDailyUsage)} />
              <MetricCard label="Highest usage product" value={forecastSummary.highestUsageProduct} />
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Usage-based forecast rows</h2>
            <DataTable
              loading={demandForecastQuery.isLoading}
              empty="No demand forecast rows returned."
              headers={['Product', 'Average daily usage']}
              rows={demandForecastRows
                .slice()
                .sort((left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage))
                .map((item) => [
                  item.product_name || item.product_id,
                  formatNumber(item.avg_daily_usage)
                ])}
            />
          </section>
        </section>
      ) : null}


      {activeTab === 'execution' ? (
        <section style={styles.stack}>
          <div style={styles.metricsGrid}>
            <MetricCard label="System status" value={String(systemStatusQuery.data?.status || 'unknown')} helper={`Write lock: ${String(systemStatusQuery.data?.write_lock ?? false)}`} />
            <MetricCard label="Execution requests" value={formatNumber(executionRequestsQuery.data?.total)} helper="Filtered request total" />
            <MetricCard label="Adapters" value={formatNumber(executionAdapters.length)} helper="Registered execution adapters" />
            <MetricCard label="Maintenance" value={String(systemStatusQuery.data?.maintenance_mode ?? false)} helper="Tenant operational mode" />
          </div>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Execution controls</h2>
            <div style={styles.formGrid}>
              <SelectField
                label="Status"
                value={executionFilters.status}
                onChange={(value) => setExecutionFilters((current) => ({ ...current, status: value }))}
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending_review', label: 'Pending review' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
              />
              <SelectField
                label="Request type"
                value={executionFilters.request_type}
                onChange={(value) => setExecutionFilters((current) => ({ ...current, request_type: value }))}
                options={[
                  { value: '', label: 'All types' },
                  { value: 'cost_review', label: 'Cost review' },
                  { value: 'cost_standard_update', label: 'Cost standard update' },
                  { value: 'product_min_stock_update', label: 'Product min stock update' },
                  { value: 'product_pricing_update', label: 'Product pricing update' },
                  { value: 'supplier_review', label: 'Supplier review' },
                  { value: 'inventory_review', label: 'Inventory review' },
                  { value: 'system_recommendation', label: 'System recommendation' }
                ]}
              />
              <label style={styles.field}>
                Search
                <input
                  value={executionFilters.search}
                  onChange={(event) => setExecutionFilters((current) => ({ ...current, search: event.target.value }))}
                  style={styles.input}
                  placeholder="Search payload, status, type"
                />
              </label>
              <button type="button" style={styles.secondaryButton} onClick={() => setExecutionFilters(emptyExecutionFilters)}>
                Reset filters
              </button>
            </div>
          </section>

          <DataTable
            loading={executionRequestsQuery.isLoading}
            empty="No execution requests found."
            headers={['Type', 'Status', 'Execution', 'Requested by', 'Updated', 'Payload', 'Actions']}
            rows={executionRequests.map((request) => [
              request.request_type,
              request.status,
              request.execution_status || '-',
              request.requested_by_name || '-',
              formatDateTime(request.updated_at || request.created_at),
              JSON.stringify(request.payload || {}).slice(0, 120),
              [
                request.status === 'draft' ? 'Submit' : null,
                request.status === 'pending_review' ? 'Approve / reject' : null,
                request.status === 'approved' && !request.execution_status ? 'Execute / no-op' : null,
                ['draft', 'pending_review', 'approved'].includes(request.status) ? 'Cancel' : null
              ].filter(Boolean).join(', ') || '-'
            ])}
          />

          <div style={styles.cardGrid}>
            {executionRequests.slice(0, 12).map((request) => (
              <article key={request.id} style={styles.card}>
                <h3 style={styles.cardTitle}>{request.request_type}</h3>
                <p style={styles.muted}>{request.id}</p>
                <p>Status: <strong>{request.status}</strong></p>
                <p>Execution: <strong>{request.execution_status || 'not executed'}</strong></p>
                <div style={styles.actions}>
                  {request.status === 'draft' ? <button type="button" style={styles.secondaryButton} onClick={() => handleExecutionAction(request, 'submit')}>Submit</button> : null}
                  {request.status === 'pending_review' ? <button type="button" style={styles.secondaryButton} onClick={() => handleExecutionAction(request, 'approve')}>Approve</button> : null}
                  {request.status === 'pending_review' ? <button type="button" style={styles.dangerButton} onClick={() => handleExecutionAction(request, 'reject')}>Reject</button> : null}
                  {request.status === 'approved' && !request.execution_status ? <button type="button" style={styles.primaryButton} onClick={() => handleExecutionAction(request, 'execute')}>Execute</button> : null}
                  {request.status === 'approved' && !request.execution_status ? <button type="button" style={styles.secondaryButton} onClick={() => handleExecutionAction(request, 'noop')}>No-op</button> : null}
                  {['draft', 'pending_review', 'approved'].includes(request.status) ? <button type="button" style={styles.dangerButton} onClick={() => handleExecutionAction(request, 'cancel')}>Cancel</button> : null}
                </div>
              </article>
            ))}
          </div>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Adapter registry</h2>
            <DataTable
              loading={executionAdaptersQuery.isLoading}
              empty="No execution adapters returned."
              headers={['Type', 'Label', 'Execution enabled', 'Risk']}
              rows={executionAdapters.map((adapter) => [
                adapter.request_type || adapter.type || '-',
                adapter.label || adapter.description || '-',
                String(adapter.execution_enabled ?? false),
                adapter.risk_level || '-'
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Hardening summary</h2>
            <pre style={styles.pre}>{JSON.stringify(executionHardeningQuery.data || {}, null, 2)}</pre>
          </section>
        </section>
      ) : null}

      {activeTab === 'system-context' ? (
        <section style={styles.stack}>
          <div style={styles.actions}>
            <button type="button" style={styles.primaryButton} onClick={() => captureSystemContextSnapshotMutation.mutate()} disabled={captureSystemContextSnapshotMutation.isPending}>
              Capture snapshot
            </button>
            <button type="button" style={styles.secondaryButton} onClick={() => refreshSystemContextQueries()}>
              Refresh context
            </button>
          </div>

          <div style={styles.metricsGrid}>
            <MetricCard label="Execution gate" value={systemExecutionGateQuery.data?.status || (systemExecutionGateQuery.data?.allowed ? 'allowed' : 'blocked')} helper={(systemExecutionGateQuery.data?.reasons ?? []).join(', ') || 'Read-only execution readiness'} />
            <MetricCard label="Products" value={formatRecordValue(systemContextQuery.data?.inventory, 'total_products')} helper="System context inventory count" />
            <MetricCard label="Low stock" value={formatRecordValue(systemContextQuery.data?.inventory, 'low_stock_products')} helper="Products at or below minimum" />
            <MetricCard label="Open POs" value={formatRecordValue(systemContextQuery.data?.procurement, 'open_purchase_orders')} helper="Draft/submitted/approved" />
            <MetricCard label="Unresolved alerts" value={formatRecordValue(systemContextQuery.data?.alerts, 'unresolved_alerts')} helper={`${formatRecordValue(systemContextQuery.data?.alerts, 'critical_unresolved_alerts')} critical`} />
            <MetricCard label="Support sessions" value={formatRecordValue(systemContextQuery.data?.access, 'active_support_sessions')} helper="Active platform access" />
          </div>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Tenant platform context</h2>
            <DataTable
              loading={supportContextQuery.isLoading || maintenanceContextQuery.isLoading || announcementContextQuery.isLoading || incidentContextQuery.isLoading}
              empty="No tenant context returned."
              headers={['Context', 'Status', 'Details']}
              rows={[
                ['Support session', supportContextQuery.data?.active ? 'Active' : 'Inactive', formatValue(supportContextQuery.data)],
                ['Maintenance', maintenanceContextQuery.data?.active || maintenanceContextQuery.data?.enabled ? 'Active' : 'Inactive', formatValue(maintenanceContextQuery.data)],
                ['Announcements', Array.isArray(announcementContextQuery.data?.announcements) && announcementContextQuery.data.announcements.length ? 'Active' : 'None', formatValue(announcementContextQuery.data)],
                ['Incidents', Array.isArray(incidentContextQuery.data?.incidents) && incidentContextQuery.data.incidents.length ? 'Open' : 'None', formatValue(incidentContextQuery.data)]
              ]}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>System context summaries</h2>
            <DataTable
              loading={systemContextQuery.isLoading}
              empty="System context unavailable."
              headers={['Section', 'Summary']}
              rows={[
                ['Tenant', formatValue(systemContextQuery.data?.tenant)],
                ['Inventory', formatValue(systemContextQuery.data?.inventory)],
                ['Procurement', formatValue(systemContextQuery.data?.procurement)],
                ['Costing', formatValue(systemContextQuery.data?.costing)],
                ['Alerts', formatValue(systemContextQuery.data?.alerts)],
                ['Audit', formatValue(systemContextQuery.data?.audit)],
                ['Access', formatValue(systemContextQuery.data?.access)]
              ]}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Snapshots</h2>
            <DataTable
              loading={systemContextSnapshotsQuery.isLoading}
              empty="No system context snapshots captured yet."
              headers={['Generated', 'Created by', 'Inventory', 'Procurement', 'Alerts']}
              rows={systemContextSnapshots.map((snapshot) => [
                formatDateTime(snapshot.generated_at || snapshot.created_at),
                snapshot.created_by_user_name || snapshot.created_by || '-',
                formatValue(snapshot.inventory_summary),
                formatValue(snapshot.procurement_summary),
                formatValue(snapshot.alerts_summary)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Snapshot comparison and forecast risk</h2>
            <DataTable
              loading={systemContextSnapshotComparisonQuery.isLoading || systemContextForecastRiskQuery.isLoading}
              empty="No comparison data yet."
              headers={['Signal', 'Details']}
              rows={[
                ['Latest comparison', formatValue(systemContextSnapshotComparisonQuery.data)],
                ['Forecast risk classification', formatValue(systemContextForecastRiskQuery.data)]
              ]}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'automation' ? (
        <section style={styles.stack}>
          <div style={styles.metricsGrid}>
            <MetricCard label="Schedules" value={automationSummary.total} helper="Configured schedules" />
            <MetricCard label="Draft" value={automationSummary.draft} helper="Request-ready configs" />
            <MetricCard label="Paused" value={automationSummary.paused} helper="Temporarily held" />
            <MetricCard label="Disabled" value={automationSummary.disabled} helper="Blocked configs" />
            <MetricCard label="Due" value={automationSummary.due} helper="Next run is due" />
            <MetricCard label="Auto requests" value={automationRunnerStatusQuery.data?.can_create_execution_requests_automatically ? 'Enabled' : 'Locked'} helper="Runner safety posture" />
          </div>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Create automation schedule</h2>
            <form onSubmit={(event) => { event.preventDefault(); createAutomationScheduleMutation.mutate(automationScheduleForm); }}>
              <div style={styles.inlineGrid}>
                <SelectField
                  label="Automation type"
                  value={automationScheduleForm.automation_type}
                  required
                  onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, automation_type: value }))}
                  options={(automationTypesQuery.data?.automation_types ?? []).map((item) => ({ value: item.automation_type, label: item.label || item.automation_type }))}
                />
                <SelectField
                  label="Schedule kind"
                  value={automationScheduleForm.schedule_kind}
                  required
                  onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, schedule_kind: value }))}
                  options={(automationTypesQuery.data?.schedule_kinds ?? ['manual', 'daily', 'weekly', 'monthly']).map((item) => ({ value: item, label: item }))}
                />
                <SelectField
                  label="Default request status"
                  value={automationScheduleForm.default_status}
                  required
                  onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, default_status: value }))}
                  options={(automationTypesQuery.data?.request_default_statuses ?? ['draft', 'pending_review']).map((item) => ({ value: item, label: item }))}
                />
                <InputField label="Run time" value={automationScheduleForm.time} required onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, time: value }))} />
              </div>
              <InputField label="Name" value={automationScheduleForm.name} required onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, name: value }))} />
              <InputField label="Timezone" value={automationScheduleForm.timezone} onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, timezone: value }))} />
              <TextareaField
                label="Description"
                value={automationScheduleForm.description}
                onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, description: value }))}
              />
              <button type="submit" style={styles.primaryButton} disabled={createAutomationScheduleMutation.isPending}>
                {createAutomationScheduleMutation.isPending ? 'Creating…' : 'Create schedule'}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Runner readiness and safety</h2>
            <div style={styles.statGrid}>
              <MetricCard label="Ready" value={automationRunnerReadinessQuery.data?.ready ? 'Yes' : 'No'} />
              <MetricCard label="Runner active" value={automationRunnerStatusQuery.data?.running || automationRunnerStatusQuery.data?.runner_enabled ? 'Yes' : 'No'} />
              <MetricCard label="Can start runner" value={automationRunnerStatusQuery.data?.can_start_background_runner ? 'Yes' : 'No'} />
              <MetricCard label="Can execute" value={automationRunnerStatusQuery.data?.can_execute_requests ? 'Yes' : 'No'} />
            </div>
            <DataTable
              loading={automationRunnerReadinessQuery.isLoading || automationRunnerStatusQuery.isLoading}
              empty="No automation readiness checks returned."
              headers={['Check', 'Status', 'Detail']}
              rows={[...(automationRunnerReadinessQuery.data?.checks ?? []), ...(automationRunnerStatusQuery.data?.checks ?? [])].slice(0, 12).map((item) => [item.label || item.key || '-', item.status || '-', item.detail || '-'])}
            />
          </section>

          <SectionCard title="Automation schedules">
            {automationSchedulesQuery.isLoading ? <p style={styles.helper}>Loading…</p> : null}
            {!automationSchedulesQuery.isLoading && !automationSchedules.length ? <p style={styles.helper}>No automation schedules yet.</p> : null}
            <div style={styles.stack}>
              {automationSchedules.map((schedule) => (
                <div key={schedule.id} style={styles.metricCard}>
                  <strong>{schedule.name}</strong>
                  <p style={styles.helper}>{schedule.automation_type} · {schedule.schedule_kind} · {schedule.status} · next {formatDateTime(schedule.next_run_at)}</p>
                  {schedule.description ? <p style={styles.helper}>{schedule.description}</p> : null}
                  <div style={styles.actions}>
                    <button type="button" style={styles.secondarySmallButton} onClick={() => dryRunAutomationScheduleMutation.mutate(schedule.id)}>Dry run</button>
                    <button type="button" style={schedule.status === 'disabled' ? styles.disabledButton : styles.smallButton} disabled={schedule.status === 'disabled'} onClick={() => runAutomationScheduleMutation.mutate(schedule.id)}>Manual run</button>
                    <button type="button" style={schedule.status === 'disabled' ? styles.disabledButton : styles.secondarySmallButton} disabled={schedule.status === 'disabled'} onClick={() => pauseAutomationScheduleMutation.mutate(schedule.id)}>Pause</button>
                    <button type="button" style={schedule.status === 'disabled' ? styles.disabledButton : styles.secondarySmallButton} disabled={schedule.status === 'disabled'} onClick={() => resumeAutomationScheduleMutation.mutate(schedule.id)}>Resume</button>
                  </div>
                  <div style={{ ...styles.actions, marginTop: 8 }}>
                    <input
                      style={styles.inlineInput}
                      placeholder="Disable reason"
                      value={automationDisableReasons[schedule.id] ?? ''}
                      onChange={(event) => setAutomationDisableReasons((current) => ({ ...current, [schedule.id]: event.target.value }))}
                    />
                    <button
                      type="button"
                      style={schedule.status === 'disabled' ? styles.disabledButton : styles.dangerButton}
                      disabled={schedule.status === 'disabled'}
                      onClick={() => disableAutomationScheduleMutation.mutate({ id: schedule.id, reason: automationDisableReasons[schedule.id] ?? '' })}
                    >
                      Disable
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Run ledger">
            <DataTable
              loading={automationRunEventsQuery.isLoading}
              empty="No automation run events yet."
              headers={['Schedule', 'Mode', 'Status', 'Request', 'Started', 'Completed']}
              rows={automationRunEvents.map((item) => [item.schedule_name || item.automation_schedule_id, item.run_mode || '-', item.status || '-', item.request_status || item.execution_request_id || '-', formatDateTime(item.started_at || item.created_at), formatDateTime(item.completed_at)])}
            />
          </SectionCard>

          <SectionCard title="Runner governance evidence">
            <p style={styles.helper}>Reads existing automation runner governance endpoints only; these controls do not start jobs, approve requests, execute requests, or mutate inventory.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Safety mode" value={formatRecordValue(automationRunnerSafetyReportQuery.data, 'runner_mode')} />
              <MetricCard label="Request creation" value={automationRunnerSafetyReportQuery.data?.request_creation_enabled ? 'Enabled' : 'Locked'} />
              <MetricCard label="Operations posture" value={formatRecordValue(automationRunnerOperationsReviewQuery.data, 'operations_posture')} />
              <MetricCard label="Policy matrix" value={formatRecordValue(automationRunnerPolicyMatrixQuery.data, 'matrix_type')} />
            </div>
            <DataTable
              loading={automationRunnerSafetyReportQuery.isLoading || automationRunnerGovernancePackQuery.isLoading || automationRunnerOperationsReviewQuery.isLoading}
              empty="No runner governance checks returned."
              headers={['Source', 'Check', 'Status', 'Detail']}
              rows={[
                ...automationRunnerSafetyChecks.map((item) => ({ ...item, source: 'safety' })),
                ...automationRunnerGovernanceChecks.map((item) => ({ ...item, source: 'governance' })),
                ...automationRunnerOperationsChecks.map((item) => ({ ...item, source: 'operations' }))
              ].slice(0, 24).map((item) => [
                formatRecordValue(item, 'source'),
                formatRecordValue(item, 'label') || formatRecordValue(item, 'key'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={automationRunnerPolicyMatrixQuery.isLoading}
              empty="No runner policy rows returned."
              headers={['Capability', 'Manual', 'Automatic', 'Status', 'Boundary']}
              rows={automationRunnerPolicyRows.map((item) => [
                formatRecordValue(item, 'capability'),
                formatRecordValue(item, 'manual_allowed'),
                formatRecordValue(item, 'automatic_allowed'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'boundary')
              ])}
            />
            <DataTable
              loading={automationRunnerAccountabilityDigestQuery.isLoading}
              empty="No runner accountability actors returned."
              headers={['Mode', 'Trigger', 'Actor', 'Events', 'Failed', 'Latest']}
              rows={automationRunnerActorBreakdown.map((item) => [
                formatRecordValue(item, 'run_mode'),
                formatRecordValue(item, 'trigger_source'),
                formatRecordValue(item, 'actor_name'),
                formatRecordValue(item, 'run_event_count'),
                formatRecordValue(item, 'failed_count'),
                formatDateTime(formatRecordValue(item, 'latest_event_at'))
              ])}
            />
            <DataTable
              loading={automationRunnerAccountabilityDigestQuery.isLoading}
              empty="No schedule-created request status rows returned."
              headers={['Request status', 'Execution status', 'Requests', 'Latest']}
              rows={automationRunnerRequestBreakdown.map((item) => [
                formatRecordValue(item, 'request_status'),
                formatRecordValue(item, 'execution_status'),
                formatRecordValue(item, 'request_count'),
                formatDateTime(formatRecordValue(item, 'latest_request_at'))
              ])}
            />
            <DataTable
              loading={automationRunnerGovernancePackQuery.isLoading}
              empty="No due governance schedules or linked requests returned."
              headers={['Type', 'Name/request', 'Status', 'Schedule kind', 'Timestamp']}
              rows={[
                ...automationRunnerDueSchedules.map((item) => ({ ...item, row_type: 'due schedule' })),
                ...automationRunnerLinkedRequests.map((item) => ({ ...item, row_type: 'linked request' }))
              ].map((item) => [
                formatRecordValue(item, 'row_type'),
                formatRecordValue(item, 'name') || formatRecordValue(item, 'request_type') || formatRecordValue(item, 'id'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'schedule_kind') || formatRecordValue(item, 'execution_status'),
                formatDateTime(formatRecordValue(item, 'next_run_at') !== '-' ? formatRecordValue(item, 'next_run_at') : formatRecordValue(item, 'created_at'))
              ])}
            />
          </SectionCard>
        </section>
      ) : null}

      {activeTab === 'reports' ? (
        <section style={styles.stack}>
          <SectionCard title="Management reports">
            <p style={styles.helper}>Reads the existing report endpoints for inventory valuation, stock by location, product movements, and procurement summary.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Valuation rows" value={formatNumber(reportsSummary.valuationRows)} />
              <MetricCard label="Estimated value" value={formatNumber(reportsSummary.estimatedValue)} />
              <MetricCard label="Stock locations" value={reportsSummary.stockLocations} />
              <MetricCard label="Movement rows" value={reportsSummary.movementRows} />
              <MetricCard label="Overdue shipments" value={formatNumber(reportsSummary.overdueShipments)} />
              <MetricCard label="Total discrepancy" value={formatNumber(reportsSummary.discrepancy)} />
            </div>
          </SectionCard>

          <SectionCard title="Inventory valuation">
            <DataTable
              loading={inventoryValuationReportQuery.isLoading}
              empty="No inventory valuation rows returned."
              headers={['Product', 'Category', 'Location', 'Quantity', 'Estimated unit cost', 'Estimated value', 'Updated']}
              rows={inventoryValuationRows.map((item) => [
                item.product_name || item.product_id,
                item.product_category || '-',
                item.storage_location_name || item.storage_location_id,
                `${formatNumber(item.quantity)} ${item.product_unit || ''}`.trim(),
                formatNumber(item.estimated_unit_cost),
                formatNumber(item.estimated_total_value),
                formatDateTime(item.updated_at)
              ])}
            />
          </SectionCard>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Stock by location</h2>
            <DataTable
              loading={stockByLocationReportQuery.isLoading}
              empty="No stock by location rows returned."
              headers={['Location', 'Temperature zone', 'Stock rows', 'Total quantity']}
              rows={stockByLocationRows.map((item) => [
                item.storage_location_name || item.storage_location_id,
                item.temperature_zone || '-',
                formatNumber(item.stock_row_count),
                formatNumber(item.total_quantity)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Product movements</h2>
            <DataTable
              loading={productMovementReportQuery.isLoading}
              empty="No product movement rows returned."
              headers={['Product', 'Category', 'Movements', 'Total increase', 'Total decrease', 'Last movement']}
              rows={productMovementRows.map((item) => [
                item.product_name || item.product_id,
                item.product_category || '-',
                formatNumber(item.movement_count),
                `${formatNumber(item.total_increase)} ${item.product_unit || ''}`.trim(),
                `${formatNumber(item.total_decrease)} ${item.product_unit || ''}`.trim(),
                formatDateTime(item.last_movement_at)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Procurement summary</h2>
            <DataTable
              loading={procurementSummaryReportQuery.isLoading}
              empty="Procurement summary has not loaded."
              headers={['Metric', 'Value']}
              rows={procurementSummaryReportQuery.data ? [
                ['Total shipments', formatNumber(procurementSummaryReportQuery.data.shipments?.total_shipments)],
                ['Pending shipments', formatNumber(procurementSummaryReportQuery.data.shipments?.pending_shipments)],
                ['Partial shipments', formatNumber(procurementSummaryReportQuery.data.shipments?.partial_shipments)],
                ['Received shipments', formatNumber(procurementSummaryReportQuery.data.shipments?.received_shipments)],
                ['Overdue shipments', formatNumber(procurementSummaryReportQuery.data.shipments?.overdue_shipments)],
                ['Active shipment lines', formatNumber(procurementSummaryReportQuery.data.lines?.total_active_shipment_lines)],
                ['Ordered quantity', formatNumber(procurementSummaryReportQuery.data.lines?.total_ordered_quantity)],
                ['Received quantity', formatNumber(procurementSummaryReportQuery.data.lines?.total_received_quantity)],
                ['Total discrepancy', formatNumber(procurementSummaryReportQuery.data.lines?.total_discrepancy)]
              ] : []}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'cost-control' ? (
        <section style={styles.stack}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Product cost control</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-risk-summary endpoint. Backend compares standard costs, latest received costs, inventory value, and historical cost spread.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Total products" value={formatNumber(productCostRiskSummary?.totals?.total_products)} />
              <MetricCard label="Stocked products" value={formatNumber(productCostRiskSummary?.totals?.stocked_products)} />
              <MetricCard label="Missing cost" value={formatNumber(productCostRiskSummary?.totals?.missing_cost_products)} />
              <MetricCard label="High variance" value={formatNumber(productCostRiskSummary?.totals?.high_variance_products)} />
              <MetricCard label="Inconsistent history" value={formatNumber(productCostRiskSummary?.totals?.inconsistent_cost_history_products)} />
              <MetricCard label="Variance threshold" value={`${formatNumber(productCostRiskSummary?.thresholds?.variance_threshold_percent)}%`} />
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost valuation summary</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-valuation-summary endpoint for inventory value by costing basis and category.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Estimated inventory value" value={formatCurrency(productCostValuationSummary?.totals?.total_estimated_inventory_value)} />
              <MetricCard label="Received-cost value" value={formatCurrency(productCostValuationSummary?.totals?.received_cost_value)} />
              <MetricCard label="Standard fallback value" value={formatCurrency(productCostValuationSummary?.totals?.standard_fallback_value)} />
              <MetricCard label="Unvalued stocked products" value={formatNumber(productCostValuationSummary?.totals?.unvalued_stocked_products)} />
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Valuation basis breakdown</h2>
            <DataTable
              loading={productCostValuationSummaryQuery.isLoading}
              empty="No valuation basis breakdown returned."
              headers={['Basis', 'Stocked products', 'Quantity', 'Estimated value']}
              rows={productCostBasisRows.map((item) => [
                formatRecordValue(item, 'valuation_basis'),
                formatRecordValue(item, 'stocked_products'),
                formatRecordValue(item, 'stock_quantity'),
                formatCurrency(item.estimated_value as number | string | null | undefined)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Top value categories</h2>
            <DataTable
              loading={productCostValuationSummaryQuery.isLoading}
              empty="No cost category breakdown returned."
              headers={['Category', 'Stocked products', 'Quantity', 'Estimated value', 'Unvalued products']}
              rows={productCostCategoryRows.map((item) => [
                formatRecordValue(item, 'category'),
                formatRecordValue(item, 'stocked_products'),
                formatRecordValue(item, 'stock_quantity'),
                formatCurrency(item.estimated_value as number | string | null | undefined),
                formatRecordValue(item, 'unvalued_stocked_products')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Top value products</h2>
            <DataTable
              loading={productCostValuationSummaryQuery.isLoading}
              empty="No top value products returned."
              headers={['Product', 'Category', 'Stock', 'Basis', 'Effective cost', 'Estimated value']}
              rows={productCostTopValueRows.map((item) => [
                item.name || item.product_name || item.product_id || item.id || '-',
                item.category || '-',
                `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
                item.valuation_basis || '-',
                formatCurrency(item.effective_unit_cost),
                formatCurrency(item.estimated_inventory_value)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Detailed valuation rows</h2>
            <DataTable
              loading={productCostValuationDetailsQuery.isLoading}
              empty="No valuation detail rows returned."
              headers={['Product', 'Category', 'Stock', 'Latest cost', 'Standard cost', 'Basis', 'Value']}
              rows={productCostValuationDetailRows.map((item) => [
                item.name || item.product_name || item.product_id || item.id || '-',
                item.category || '-',
                `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
                formatCurrency(item.latest_unit_cost),
                formatCurrency(item.standard_unit_cost),
                item.valuation_basis || '-',
                formatCurrency(item.estimated_inventory_value)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost action summary</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-action-summary endpoint for prioritized cost remediation signals.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Total actions" value={formatNumber(productCostActionSummaryQuery.data?.totals?.total_actions)} />
              <MetricCard label="Critical actions" value={formatNumber(productCostActionSummaryQuery.data?.totals?.critical_actions)} />
              <MetricCard label="High priority" value={formatNumber(productCostActionSummaryQuery.data?.totals?.high_priority_actions)} />
              <MetricCard label="Generated" value={formatDateTime(productCostActionSummaryQuery.data?.generated_at)} />
            </div>
            <DataTable
              loading={productCostActionSummaryQuery.isLoading}
              empty="No cost action summary rows returned."
              headers={['Action', 'Priority', 'Products', 'Estimated value', 'Reason']}
              rows={productCostActionRows.map((item) => [
                formatRecordValue(item, 'action'),
                formatRecordValue(item, 'priority'),
                formatRecordValue(item, 'product_count'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'reason')
              ])}
            />
          </section>



          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost action plan</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-action-plan-summary endpoint for prioritized costing follow-up bands and next actions.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Actionable products" value={formatNumber(productCostActionPlanSummaryQuery.data?.totals?.total_actionable_products)} />
              <MetricCard label="Critical products" value={formatNumber(productCostActionPlanSummaryQuery.data?.totals?.critical_products)} />
              <MetricCard label="High products" value={formatNumber(productCostActionPlanSummaryQuery.data?.totals?.high_products)} />
              <MetricCard label="Urgent value" value={formatCurrency(productCostActionPlanSummaryQuery.data?.totals?.urgent_estimated_inventory_value)} />
            </div>
            <DataTable
              loading={productCostActionPlanSummaryQuery.isLoading}
              empty="No cost action priority bands returned."
              headers={['Priority band', 'Products', 'Stock quantity', 'Estimated value', 'Max score']}
              rows={productCostPriorityBands.map((item) => [
                formatRecordValue(item, 'priority_band'),
                formatRecordValue(item, 'product_count'),
                formatRecordValue(item, 'stock_quantity'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'max_priority_score')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Next cost actions</h2>
            <DataTable
              loading={productCostActionPlanSummaryQuery.isLoading}
              empty="No next cost actions returned."
              headers={['Product', 'Category', 'Action', 'Priority', 'Score', 'Recommended action']}
              rows={productCostNextActions.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'category'),
                formatRecordValue(item, 'action_type'),
                formatRecordValue(item, 'priority_band'),
                formatRecordValue(item, 'action_priority_score'),
                formatRecordValue(item, 'recommended_action')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost action category pressure</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-action-category-summary endpoint.</p>
            <DataTable
              loading={productCostActionCategorySummaryQuery.isLoading}
              empty="No cost action categories returned."
              headers={['Category', 'Products', 'Critical', 'High', 'Estimated value', 'Recommended focus']}
              rows={productCostActionCategories.map((item) => [
                formatRecordValue(item, 'category'),
                formatRecordValue(item, 'product_count'),
                formatRecordValue(item, 'critical_products'),
                formatRecordValue(item, 'high_products'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommended_focus')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost action impact</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-action-impact-summary endpoint.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Valued review" value={formatNumber(productCostActionImpactSummaryQuery.data?.totals?.valued_inventory_review_products)} />
              <MetricCard label="Unvalued stock" value={formatNumber(productCostActionImpactSummaryQuery.data?.totals?.unvalued_stock_review_products)} />
              <MetricCard label="Master data review" value={formatNumber(productCostActionImpactSummaryQuery.data?.totals?.master_data_review_products)} />
              <MetricCard label="Actionable value" value={formatCurrency(productCostActionImpactSummaryQuery.data?.totals?.total_actionable_estimated_value)} />
            </div>
            <DataTable
              loading={productCostActionImpactSummaryQuery.isLoading}
              empty="No cost impact rows returned."
              headers={['Impact type', 'Products', 'Stock quantity', 'Estimated value', 'Max score']}
              rows={productCostImpactRows.map((item) => [
                formatRecordValue(item, 'impact_type'),
                formatRecordValue(item, 'product_count'),
                formatRecordValue(item, 'stock_quantity'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'max_priority_score')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Top cost impact products</h2>
            <DataTable
              loading={productCostActionImpactSummaryQuery.isLoading}
              empty="No top impact products returned."
              headers={['Product', 'Impact type', 'Action', 'Stock', 'Value', 'Score']}
              rows={productCostTopImpactProducts.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'impact_type'),
                formatRecordValue(item, 'action_type'),
                formatRecordValue(item, 'current_stock_quantity'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'action_priority_score')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Supplier and source cost action split</h2>
            <p style={styles.helper}>Reads the existing supplier/source cost action summary endpoints.</p>
            <DataTable
              loading={productCostActionSupplierSummaryQuery.isLoading}
              empty="No supplier action rows returned."
              headers={['Supplier', 'Products', 'Critical', 'High', 'Estimated value', 'Recommended action']}
              rows={productCostActionSuppliers.map((item) => [
                formatRecordValue(item, 'supplier_name'),
                formatRecordValue(item, 'product_count'),
                formatRecordValue(item, 'critical_products'),
                formatRecordValue(item, 'high_products'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommended_supplier_action')
              ])}
            />
            <DataTable
              loading={productCostActionSourceSummaryQuery.isLoading}
              empty="No cost source rows returned."
              headers={['Cost source', 'Products', 'Missing source', 'Estimated value', 'Recommended source action']}
              rows={productCostActionSources.map((item) => [
                formatRecordValue(item, 'cost_source'),
                formatRecordValue(item, 'product_count'),
                formatRecordValue(item, 'missing_source_products'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommended_source_action')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost evidence age and coverage</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-action-age-summary and GET /products/cost-action-coverage-summary endpoints.</p>
            <div style={styles.statGrid}>
              <MetricCard label="No cost date" value={formatNumber(productCostActionAgeSummaryQuery.data?.totals?.no_cost_date_products)} />
              <MetricCard label="Stale received cost" value={formatNumber(productCostActionAgeSummaryQuery.data?.totals?.stale_received_cost_products)} />
              <MetricCard label="Stocked cost coverage" value={`${formatNumber(productCostActionCoverageSummaryQuery.data?.totals?.stocked_cost_coverage_percent)}%`} />
              <MetricCard label="Coverage gaps" value={formatNumber(productCostActionCoverageSummaryQuery.data?.totals?.uncosted_stocked_products)} />
            </div>
            <DataTable
              loading={productCostActionAgeSummaryQuery.isLoading}
              empty="No cost age bands returned."
              headers={['Age band', 'Products', 'Missing cost', 'Estimated value', 'Recommended age action']}
              rows={productCostActionAgeBands.map((item) => [
                formatRecordValue(item, 'cost_age_band'),
                formatRecordValue(item, 'product_count'),
                formatRecordValue(item, 'missing_cost_products'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommended_age_action')
              ])}
            />
            <DataTable
              loading={productCostActionCoverageSummaryQuery.isLoading}
              empty="No category coverage rows returned."
              headers={['Category', 'Stocked products', 'With cost basis', 'Uncosted', 'Coverage %', 'Actionable value']}
              rows={productCostActionCoverageRows.map((item) => [
                formatRecordValue(item, 'category'),
                formatRecordValue(item, 'stocked_products'),
                formatRecordValue(item, 'stocked_products_with_cost_basis'),
                formatRecordValue(item, 'uncosted_stocked_products'),
                `${formatRecordValue(item, 'stocked_cost_coverage_percent')}%`,
                formatCurrency(item.actionable_estimated_value as number | string | null | undefined)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost coverage gaps</h2>
            <DataTable
              loading={productCostActionCoverageSummaryQuery.isLoading}
              empty="No cost coverage gaps returned."
              headers={['Product', 'Category', 'Stock', 'Cost source', 'Action', 'Score']}
              rows={productCostCoverageGaps.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'category'),
                formatRecordValue(item, 'current_stock_quantity'),
                formatRecordValue(item, 'effective_cost_source'),
                formatRecordValue(item, 'action_type'),
                formatRecordValue(item, 'action_priority_score')
              ])}
            />
          </section>


          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost alert summary</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-alert-summary endpoint.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Total alerts" value={formatNumber(productCostAlertSummaryQuery.data?.totals?.total_alerts)} />
              <MetricCard label="Critical alerts" value={formatNumber(productCostAlertSummaryQuery.data?.totals?.critical_alerts)} />
              <MetricCard label="Warning alerts" value={formatNumber(productCostAlertSummaryQuery.data?.totals?.warning_alerts)} />
              <MetricCard label="Alerted value" value={formatCurrency(productCostAlertSummaryQuery.data?.totals?.alerted_estimated_value)} />
            </div>
            <DataTable
              loading={productCostAlertSummaryQuery.isLoading}
              empty="No alert groups returned."
              headers={['Type', 'Severity', 'Count', 'Stock quantity', 'Value', 'Recommended action']}
              rows={productCostAlertGroups.map((item) => [
                formatRecordValue(item, 'alert_type'),
                formatRecordValue(item, 'alert_severity'),
                formatRecordValue(item, 'alert_count'),
                formatRecordValue(item, 'stock_quantity'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommended_alert_action')
              ])}
            />
            <DataTable
              loading={productCostAlertSummaryQuery.isLoading}
              empty="No top alert products returned."
              headers={['Product', 'Alert', 'Severity', 'Value', 'Variance %', 'Score']}
              rows={productCostTopAlerts.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'alert_type'),
                formatRecordValue(item, 'alert_severity'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'cost_variance_percent'),
                formatRecordValue(item, 'alert_priority_score')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost recommendation summary</h2>
            <p style={styles.helper}>Reads the existing GET /products/cost-recommendation-summary endpoint.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Recommendations" value={formatNumber(productCostRecommendationSummaryQuery.data?.totals?.total_recommendations)} />
              <MetricCard label="Critical" value={formatNumber(productCostRecommendationSummaryQuery.data?.totals?.critical_recommendations)} />
              <MetricCard label="High" value={formatNumber(productCostRecommendationSummaryQuery.data?.totals?.high_recommendations)} />
              <MetricCard label="Recommended value" value={formatCurrency(productCostRecommendationSummaryQuery.data?.totals?.recommended_estimated_value)} />
            </div>
            <DataTable
              loading={productCostRecommendationSummaryQuery.isLoading}
              empty="No recommendation groups returned."
              headers={['Type', 'Priority', 'Count', 'Stock quantity', 'Value', 'Recommended action']}
              rows={productCostRecommendationGroups.map((item) => [
                formatRecordValue(item, 'recommendation_type'),
                formatRecordValue(item, 'recommendation_priority'),
                formatRecordValue(item, 'recommendation_count'),
                formatRecordValue(item, 'stock_quantity'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommended_action')
              ])}
            />
            <DataTable
              loading={productCostRecommendationSummaryQuery.isLoading}
              empty="No top recommendation products returned."
              headers={['Product', 'Recommendation', 'Priority', 'Value', 'Score']}
              rows={productCostTopRecommendations.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'recommendation_type'),
                formatRecordValue(item, 'recommendation_priority'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommendation_score')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost executive dashboard and governance</h2>
            <p style={styles.helper}>Reads existing dashboard, report, and governance cost endpoints without mutating product or stock data.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Dashboard value" value={formatCurrency(productCostDashboardSummaryQuery.data?.totals?.total_estimated_inventory_value)} />
              <MetricCard label="Review value" value={formatCurrency(productCostDashboardSummaryQuery.data?.totals?.review_estimated_value)} />
              <MetricCard label="Governance score" value={formatNumber(productCostGovernanceSummaryQuery.data?.readiness_score)} />
              <MetricCard label="Governance status" value={formatRecordValue(productCostGovernanceSummaryQuery.data as unknown as Record<string, unknown>, 'governance_status')} />
            </div>
            <DataTable
              loading={productCostDashboardSummaryQuery.isLoading}
              empty="No dashboard review categories returned."
              headers={['Category', 'Products', 'Review value', 'Critical', 'High']}
              rows={productCostDashboardCategories.map((item) => [
                formatRecordValue(item, 'category'),
                formatRecordValue(item, 'product_count'),
                formatCurrency(item.review_estimated_value as number | string | null | undefined),
                formatRecordValue(item, 'critical_recommendations'),
                formatRecordValue(item, 'high_recommendations')
              ])}
            />
            <DataTable
              loading={productCostDashboardSummaryQuery.isLoading}
              empty="No dashboard priority products returned."
              headers={['Product', 'Recommendation', 'Priority', 'Value', 'Dashboard score']}
              rows={productCostDashboardPriorityProducts.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'recommendation_type'),
                formatRecordValue(item, 'recommendation_priority'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'dashboard_priority_score')
              ])}
            />
            <DataTable
              loading={productCostGovernanceSummaryQuery.isLoading}
              empty="No governance checklist returned."
              headers={['Check', 'Status', 'Detail']}
              rows={productCostGovernanceChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostReportSummaryQuery.isLoading}
              empty="No report export rows returned."
              headers={['Section', 'Metric', 'Value']}
              rows={(productCostReportSummaryQuery.data?.export_rows ?? []).map((item) => [
                formatRecordValue(item, 'section'),
                formatRecordValue(item, 'metric'),
                formatRecordValue(item, 'value')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost governance audit and handoff</h2>
            <p style={styles.helper}>Reads the existing cost governance detail, audit-pack, sign-off, review, closure, and handoff endpoints without mutating costing or stock records.</p>
            <div style={styles.statGrid}>
              <MetricCard label="Detail readiness" value={formatNumber(productCostGovernanceDetailsQuery.data?.readiness_score)} />
              <MetricCard label="Sign-off status" value={formatRecordValue(productCostGovernanceSignoffSummaryQuery.data as unknown as Record<string, unknown>, 'signoff_status')} />
              <MetricCard label="Review status" value={formatRecordValue(productCostGovernanceReviewQueueQuery.data as unknown as Record<string, unknown>, 'review_status')} />
              <MetricCard label="Handoff status" value={formatRecordValue(productCostGovernanceHandoffSummaryQuery.data as unknown as Record<string, unknown>, 'handoff_status')} />
            </div>
            <DataTable
              loading={productCostGovernanceDetailsQuery.isLoading}
              empty="No failed governance checklist rows returned."
              headers={['Failed check', 'Status', 'Detail']}
              rows={productCostGovernanceFailedChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceDetailsQuery.isLoading}
              empty="No watch governance checklist rows returned."
              headers={['Watch check', 'Status', 'Detail']}
              rows={productCostGovernanceWatchChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceDetailsQuery.isLoading}
              empty="No remediation plan rows returned."
              headers={['Key', 'Priority', 'Action', 'Source']}
              rows={productCostGovernanceRemediationPlan.map((item) => [
                formatRecordValue(item, 'key'),
                formatRecordValue(item, 'priority'),
                formatRecordValue(item, 'action'),
                formatRecordValue(item, 'source')
              ])}
            />
            <DataTable
              loading={productCostGovernanceDetailsQuery.isLoading}
              empty="No priority products returned."
              headers={['Product', 'Category', 'Value', 'Recommendation']}
              rows={productCostGovernancePriorityProducts.map((item) => [
                formatRecordValue(item, 'name'),
                formatRecordValue(item, 'category'),
                formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
                formatRecordValue(item, 'recommendation') || formatRecordValue(item, 'action')
              ])}
            />
            <DataTable
              loading={productCostGovernanceAuditPackQuery.isLoading}
              empty="No audit pack rows returned."
              headers={['Section', 'Key', 'Status', 'Value']}
              rows={productCostGovernanceAuditRows.slice(0, 20).map((item) => [
                formatRecordValue(item, 'section'),
                formatRecordValue(item, 'key'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'value')
              ])}
            />
            <DataTable
              loading={productCostGovernanceSignoffSummaryQuery.isLoading}
              empty="No sign-off checklist rows returned."
              headers={['Check', 'Status', 'Detail']}
              rows={productCostGovernanceSignoffChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceSignoffSummaryQuery.isLoading}
              empty="No blockers or warnings returned."
              headers={['Type', 'Key', 'Severity', 'Detail']}
              rows={[...productCostGovernanceBlockers.map((item) => ({ ...item, issue_type: 'blocker' })), ...productCostGovernanceWarnings.map((item) => ({ ...item, issue_type: 'warning' }))].map((item) => [
                formatRecordValue(item, 'issue_type'),
                formatRecordValue(item, 'key'),
                formatRecordValue(item, 'severity'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceReviewQueueQuery.isLoading}
              empty="No governance review queue items returned."
              headers={['Type', 'Priority', 'Owner', 'Detail']}
              rows={productCostGovernanceQueueItems.map((item) => [
                formatRecordValue(item, 'queue_type'),
                formatRecordValue(item, 'priority'),
                formatRecordValue(item, 'owner_hint'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceReviewPackQuery.isLoading}
              empty="No review export rows returned."
              headers={['Section', 'Key', 'Status', 'Value']}
              rows={productCostGovernanceReviewExportRows.slice(0, 20).map((item) => [
                formatRecordValue(item, 'section'),
                formatRecordValue(item, 'key'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'value')
              ])}
            />
            <DataTable
              loading={productCostGovernanceClosureSummaryQuery.isLoading}
              empty="No closure checklist rows returned."
              headers={['Check', 'Status', 'Detail']}
              rows={productCostGovernanceClosureChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceHandoffSummaryQuery.isLoading}
              empty="No handoff checklist rows returned."
              headers={['Check', 'Status', 'Detail']}
              rows={productCostGovernanceHandoffChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostGovernanceHandoffSummaryQuery.isLoading}
              empty="No owner handoff rows returned."
              headers={['Owner', 'Responsibility', 'Status']}
              rows={productCostGovernanceOwnerSummary.map((item) => [
                formatRecordValue(item, 'owner'),
                formatRecordValue(item, 'responsibility'),
                formatRecordValue(item, 'status')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Cost operations readiness</h2>
            <div style={styles.metricsGrid}>
              <MetricCard label="Hardening issues" value={formatNumber(productCostHardeningSummaryQuery.data?.totals?.issue_count)} />
              <MetricCard label="Runbook status" value={formatRecordValue(productCostOperationsRunbookSummaryQuery.data as unknown as Record<string, unknown>, 'runbook_status')} />
              <MetricCard label="Control status" value={formatRecordValue(productCostOperationsControlSummaryQuery.data as unknown as Record<string, unknown>, 'control_status')} />
              <MetricCard label="Readiness score" value={formatNumber(productCostOperationsReadinessSummaryQuery.data?.readiness_score)} />
            </div>
            <DataTable
              loading={productCostHardeningSummaryQuery.isLoading}
              empty="No cost hardening checklist issues returned."
              headers={['Check', 'Status', 'Detail']}
              rows={productCostHardeningFailedChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostOperationsRunbookSummaryQuery.isLoading}
              empty="No operating rhythm rows returned."
              headers={['Cadence', 'Owner', 'Status', 'Action']}
              rows={productCostOperationsRhythm.map((item) => [
                formatRecordValue(item, 'cadence'),
                formatRecordValue(item, 'owner'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'action')
              ])}
            />
            <DataTable
              loading={productCostOperationsRunbookSummaryQuery.isLoading}
              empty="No escalation rules returned."
              headers={['Key', 'Current value', 'Condition', 'Escalation']}
              rows={productCostOperationsEscalationRules.map((item) => [
                formatRecordValue(item, 'key'),
                formatRecordValue(item, 'current_value'),
                formatRecordValue(item, 'condition'),
                formatRecordValue(item, 'escalation')
              ])}
            />
            <DataTable
              loading={productCostOperationsControlSummaryQuery.isLoading}
              empty="No control checks returned."
              headers={['Check', 'Owner', 'Status', 'Value', 'Detail']}
              rows={productCostOperationsControlChecks.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'owner'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'value'),
                formatRecordValue(item, 'detail')
              ])}
            />
            <DataTable
              loading={productCostOperationsEvidenceSummaryQuery.isLoading}
              empty="No evidence sections returned."
              headers={['Evidence', 'Source', 'Rows', 'Status', 'Purpose']}
              rows={productCostOperationsEvidenceSections.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'source'),
                formatRecordValue(item, 'rows'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'purpose')
              ])}
            />
            <DataTable
              loading={productCostOperationsReadinessSummaryQuery.isLoading}
              empty="No readiness checklist rows returned."
              headers={['Check', 'Status', 'Value', 'Detail']}
              rows={productCostOperationsReadinessChecklist.map((item) => [
                formatRecordValue(item, 'label'),
                formatRecordValue(item, 'status'),
                formatRecordValue(item, 'value'),
                formatRecordValue(item, 'detail')
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>High cost variance</h2>
            <DataTable
              loading={productCostRiskSummaryQuery.isLoading}
              empty="No high variance products returned."
              headers={['Product', 'Category', 'Stock', 'Standard cost', 'Latest cost', 'Variance %', 'Inventory value']}
              rows={highVarianceCostRows.map((item) => [
                item.name || item.product_name || item.product_id || item.id || '-',
                item.category || '-',
                `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
                formatNumber(item.standard_unit_cost),
                formatNumber(item.latest_unit_cost),
                `${formatNumber(item.cost_variance_percent)}%`,
                formatNumber(item.estimated_inventory_value)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Missing product cost</h2>
            <DataTable
              loading={productCostRiskSummaryQuery.isLoading}
              empty="No stocked products are missing cost."
              headers={['Product', 'Category', 'Stock', 'Effective cost', 'Cost source', 'Variance status']}
              rows={missingCostRows.map((item) => [
                item.name || item.product_name || item.product_id || item.id || '-',
                item.category || '-',
                `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
                formatNumber(item.effective_unit_cost),
                item.effective_cost_source || '-',
                item.cost_variance_status || '-'
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Inconsistent cost history</h2>
            <DataTable
              loading={productCostRiskSummaryQuery.isLoading}
              empty="No inconsistent cost history rows returned."
              headers={['Product', 'Category', 'Stock', 'Latest cost', 'History spread %', 'Inventory value']}
              rows={inconsistentCostRows.map((item) => [
                item.name || item.product_name || item.product_id || item.id || '-',
                item.category || '-',
                `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
                formatNumber(item.latest_unit_cost),
                `${formatNumber(item.cost_history_spread_percent)}%`,
                formatNumber(item.estimated_inventory_value)
              ])}
            />
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Recommended actions</h2>
            <DataTable
              loading={productCostRiskSummaryQuery.isLoading}
              empty="No recommended cost actions returned."
              headers={['Action']}
              rows={(productCostRiskSummary?.recommended_actions ?? []).map((action) => [action])}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'stock-transfers' ? (
        <section style={styles.grid}>
          <form onSubmit={handleStockTransferSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Create internal stock transfer</h2>
            <p style={styles.helper}>Uses the real POST /stock-transfers route and creates a draft transfer with one product line.</p>
            <SelectField label="From location" value={stockTransferForm.from_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, from_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
            <SelectField label="To location" value={stockTransferForm.to_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, to_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
            <SelectField label="Product" value={stockTransferForm.product_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
            <InputField label="Quantity" type="number" value={stockTransferForm.quantity} onChange={(value) => setStockTransferForm((current) => ({ ...current, quantity: value }))} required />
            <InputField label="Notes" value={stockTransferForm.notes} onChange={(value) => setStockTransferForm((current) => ({ ...current, notes: value }))} />
            <button type="submit" disabled={createStockTransferMutation.isPending} style={styles.primaryButton}>Create transfer draft</button>
          </form>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Transfer execution controls</h2>
            <p style={styles.helper}>Uses the real GET /stock-transfers, POST /stock-transfers/:id/execute, and POST /stock-transfers/:id/cancel routes.</p>
            <div style={styles.metricsGrid}>
              <MetricCard label="Draft transfers" value={stockTransferSummary.draft} />
              <MetricCard label="Executed transfers" value={stockTransferSummary.executed} />
              <MetricCard label="Cancelled transfers" value={stockTransferSummary.cancelled} />
              <MetricCard label="Total transfer units" value={formatNumber(stockTransferSummary.totalUnits)} />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['From', 'To', 'Status', 'Items', 'Quantity', 'Created', 'Executed', 'Actions'].map((header) => (
                      <th key={header} style={styles.th}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockTransfersQuery.isLoading ? (
                    <tr><td colSpan={8} style={styles.td}>Loading…</td></tr>
                  ) : stockTransfers.length === 0 ? (
                    <tr><td colSpan={8} style={styles.td}>No stock transfers yet.</td></tr>
                  ) : stockTransfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td style={styles.td}>{transfer.from_storage_location_name || transfer.from_storage_location_id}</td>
                      <td style={styles.td}>{transfer.to_storage_location_name || transfer.to_storage_location_id}</td>
                      <td style={styles.td}>{transfer.status}</td>
                      <td style={styles.td}>{formatNumber(transfer.item_count)}</td>
                      <td style={styles.td}>{formatNumber(transfer.total_quantity)}</td>
                      <td style={styles.td}>{formatDateTime(transfer.created_at)}</td>
                      <td style={styles.td}>{formatDateTime(transfer.executed_at)}</td>
                      <td style={styles.td}>
                        {transfer.status === 'draft' ? (
                          <div style={styles.actionRow}>
                            <button type="button" onClick={() => executeStockTransferMutation.mutate(transfer.id)} disabled={executeStockTransferMutation.isPending} style={styles.smallButton}>Execute</button>
                            <button type="button" onClick={() => cancelStockTransferMutation.mutate(transfer.id)} disabled={cancelStockTransferMutation.isPending} style={styles.dangerButton}>Cancel</button>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'products' ? (
        <section style={styles.grid}>
          <form style={styles.card} onSubmit={handleProductSubmit}>
            <h2 style={styles.sectionTitle}>{editingProductId ? 'Edit product' : 'Create product'}</h2>
            <InputField label="Name" value={productForm.name} required onChange={(value) => setProductForm((current) => ({ ...current, name: value }))} />
            <InputField label="Category" value={productForm.category} onChange={(value) => setProductForm((current) => ({ ...current, category: value }))} />
            <InputField label="Unit" value={productForm.unit} required onChange={(value) => setProductForm((current) => ({ ...current, unit: value }))} />
            <InputField label="Minimum stock" type="number" min="0" value={productForm.min_stock} onChange={(value) => setProductForm((current) => ({ ...current, min_stock: value }))} />
            <SelectField
              label="Supplier"
              value={productForm.supplier_id}
              onChange={(value) => setProductForm((current) => ({ ...current, supplier_id: value }))}
              options={[{ value: '', label: 'No supplier' }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]}
            />
            <InputField label="Default barcode" value={productForm.barcode} onChange={(value) => setProductForm((current) => ({ ...current, barcode: value }))} />
            <InputField label="Standard unit cost" type="number" min="0" value={productForm.standard_unit_cost} onChange={(value) => setProductForm((current) => ({ ...current, standard_unit_cost: value }))} />
            <InputField label="Default package name" value={productForm.package_name} onChange={(value) => setProductForm((current) => ({ ...current, package_name: value }))} />
            <InputField label="Units per package" type="number" min="0.0001" value={productForm.units_per_package} onChange={(value) => setProductForm((current) => ({ ...current, units_per_package: value }))} />
            <div style={styles.actions}>
              <button type="submit" style={styles.primaryButton} disabled={saveProductMutation.isPending}>{editingProductId ? 'Save product' : 'Create product'}</button>
              {editingProductId ? (
                <button type="button" style={styles.secondaryButton} onClick={() => { setEditingProductId(null); setProductForm(emptyProductForm); }}>Cancel edit</button>
              ) : null}
            </div>
          </form>
          <section style={styles.cardWide}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Product master data</h2>
              <input style={{ ...styles.input, maxWidth: 260 }} placeholder="Search products" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
            </div>
            {productsQuery.isLoading ? <p style={styles.helper}>Loading…</p> : products.length ? (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Unit</th>
                      <th style={styles.th}>Supplier</th>
                      <th style={styles.th}>Min stock</th>
                      <th style={styles.th}>Stock</th>
                      <th style={styles.th}>Cost</th>
                      <th style={styles.th}>Barcode</th>
                      <th style={styles.th}>Packages</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td style={styles.td}>{product.name}</td>
                        <td style={styles.td}>{product.category || '-'}</td>
                        <td style={styles.td}>{product.unit || '-'}</td>
                        <td style={styles.td}>{product.supplier_name || '-'}</td>
                        <td style={styles.td}>{formatNumber(product.min_stock)}</td>
                        <td style={styles.td}>{formatNumber(product.current_stock_quantity)}</td>
                        <td style={styles.td}>{formatCurrency(product.effective_unit_cost)}</td>
                        <td style={styles.td}>{product.barcode || '-'}</td>
                        <td style={styles.td}>{formatNumber(product.package_count)}</td>
                        <td style={styles.td}>
                          <div style={styles.inlineActions}>
                            <button type="button" style={styles.secondaryButton} onClick={() => startProductEdit(product)}>Edit</button>
                            <button type="button" style={styles.secondaryButton} onClick={() => { setProductPackageForm({ ...emptyProductPackageForm, product_id: product.id }); setActiveTab('packages'); }}>Packages</button>
                            <button type="button" style={styles.dangerButton} disabled={deleteProductMutation.isPending} onClick={() => deleteProductMutation.mutate(product)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={styles.helper}>No products found.</p>}
          </section>
        </section>
      ) : null}

      {activeTab === 'suppliers' ? (
        <section style={styles.grid}>
          <div style={styles.stack}>
            <form style={styles.card} onSubmit={handleSupplierSubmit}>
              <h2 style={styles.sectionTitle}>{editingSupplierId ? 'Edit supplier' : 'Create supplier'}</h2>
              <p style={styles.helper}>Uses the real POST/PATCH/DELETE /suppliers routes for supplier master data.</p>
              <InputField label="Name" value={supplierForm.name} required onChange={(value) => setSupplierForm((current) => ({ ...current, name: value }))} />
              <InputField label="Email" value={supplierForm.email} type="email" onChange={(value) => setSupplierForm((current) => ({ ...current, email: value }))} />
              <InputField label="Contact info" value={supplierForm.contact_info} onChange={(value) => setSupplierForm((current) => ({ ...current, contact_info: value }))} />
              <div style={styles.actions}>
                <button type="submit" style={styles.primaryButton} disabled={saveSupplierMutation.isPending}>{editingSupplierId ? 'Save supplier' : 'Create supplier'}</button>
                {editingSupplierId ? (
                  <button type="button" style={styles.secondaryButton} onClick={() => { setEditingSupplierId(null); setSupplierForm(emptySupplierForm); }}>Cancel edit</button>
                ) : null}
              </div>
            </form>

            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>Supplier SLA breaches</h2>
              <p style={styles.helper}>Uses the real GET /suppliers/sla-breaches route for overdue pending/partial shipment exposure by supplier.</p>
              <DataTable
                loading={supplierSlaBreachesQuery.isLoading}
                empty="No supplier SLA breaches found."
                headers={['Supplier', 'Late shipments', 'Earliest missed', 'Latest missed']}
                rows={supplierSlaBreaches.map((breach) => [
                  breach.supplier_name || breach.supplier_id,
                  formatNumber(breach.late_shipments),
                  breach.earliest_missed_delivery || '-',
                  breach.latest_missed_delivery || '-'
                ])}
              />
            </section>
          </div>

          <section style={styles.stack}>
            <section style={styles.card}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Supplier master data</h2>
                <input style={{ ...styles.input, maxWidth: 260 }} placeholder="Search suppliers" value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} />
              </div>
              {suppliersQuery.isLoading ? <p style={styles.helper}>Loading…</p> : suppliers.length ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Contact</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((supplier) => (
                        <tr key={supplier.id}>
                          <td style={styles.td}>{supplier.name}</td>
                          <td style={styles.td}>{supplier.email || '-'}</td>
                          <td style={styles.td}>{supplier.contact_info || '-'}</td>
                          <td style={styles.td}>
                            <div style={styles.inlineActions}>
                              <button type="button" style={styles.secondaryButton} onClick={() => startSupplierEdit(supplier)}>Edit</button>
                              <button type="button" style={styles.smallButton} onClick={() => setSelectedSupplierPerformanceId(supplier.id)}>Performance</button>
                              <button type="button" style={styles.dangerButton} disabled={deleteSupplierMutation.isPending} onClick={() => deleteSupplierMutation.mutate(supplier.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={styles.helper}>No suppliers found.</p>}
            </section>

            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>Supplier performance drilldown</h2>
              <p style={styles.helper}>Uses the real GET /suppliers/:id/performance route. Available supplier options are loaded from GET /suppliers/available.</p>
              <SelectField
                label="Supplier"
                value={selectedSupplierPerformanceId}
                onChange={setSelectedSupplierPerformanceId}
                options={availableSuppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
              />
              {!selectedSupplierPerformanceId ? (
                <p style={styles.helper}>Select a supplier to load performance metrics.</p>
              ) : supplierPerformanceQuery.isLoading ? (
                <p style={styles.helper}>Loading supplier performance…</p>
              ) : supplierPerformanceQuery.data ? (
                <div style={styles.statGrid}>
                  <MetricCard label="Supplier" value={supplierPerformanceQuery.data.supplier?.name || selectedSupplierPerformanceId} />
                  <MetricCard label="Total shipments" value={formatNumber(supplierPerformanceQuery.data.metrics?.total_shipments)} />
                  <MetricCard label="Pending" value={formatNumber(supplierPerformanceQuery.data.metrics?.pending_shipments)} />
                  <MetricCard label="Partial" value={formatNumber(supplierPerformanceQuery.data.metrics?.partial_shipments)} />
                  <MetricCard label="Received" value={formatNumber(supplierPerformanceQuery.data.metrics?.received_shipments)} />
                  <MetricCard label="Last delivery" value={supplierPerformanceQuery.data.metrics?.last_delivery_date || '-'} />
                </div>
              ) : (
                <p style={styles.helper}>No supplier performance returned.</p>
              )}
            </section>
          </section>
        </section>
      ) : null}

      {activeTab === 'locations' ? (
        <section style={styles.grid}>
          <form onSubmit={handleStorageLocationSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>{editingStorageLocationId ? 'Edit storage location' : 'Create storage location'}</h2>
            <p style={styles.helper}>Uses the real POST/PATCH /storage-locations routes and the actual name + temperature_zone fields.</p>
            <InputField label="Name" value={storageLocationForm.name} onChange={(value) => setStorageLocationForm((current) => ({ ...current, name: value }))} required />
            <InputField label="Temperature zone" value={storageLocationForm.temperature_zone} onChange={(value) => setStorageLocationForm((current) => ({ ...current, temperature_zone: value }))} />
            <div style={styles.actions}>
              <button type="submit" disabled={saveStorageLocationMutation.isPending} style={styles.primaryButton}>{editingStorageLocationId ? 'Update location' : 'Create location'}</button>
              {editingStorageLocationId ? (
                <button type="button" style={styles.secondaryButton} onClick={() => { setEditingStorageLocationId(null); setStorageLocationForm(emptyStorageLocationForm); }}>Cancel edit</button>
              ) : null}
            </div>
          </form>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Storage locations</h2>
            <p style={styles.helper}>Uses the real GET /storage-locations and DELETE /storage-locations/:id routes.</p>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Temperature zone</th>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {storageLocationsQuery.isLoading ? (
                    <tr><td colSpan={4} style={styles.td}>Loading…</td></tr>
                  ) : storageLocations.length === 0 ? (
                    <tr><td colSpan={4} style={styles.td}>No storage locations yet.</td></tr>
                  ) : storageLocations.map((location) => (
                    <tr key={location.id}>
                      <td style={styles.td}>{location.name}</td>
                      <td style={styles.td}>{location.temperature_zone || '-'}</td>
                      <td style={styles.td}>{formatDateTime(location.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          <button type="button" style={styles.smallButton} onClick={() => startEditingStorageLocation(location)}>Edit</button>
                          <button type="button" style={styles.dangerButton} disabled={deleteStorageLocationMutation.isPending} onClick={() => deleteStorageLocationMutation.mutate(location.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      ) : null}

      {activeTab === 'procurement-match' ? (
        <section style={styles.grid}>
          <div style={styles.stack}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>PO → shipment → invoice control tower</h2>
              <p style={styles.helper}>Reads existing /purchase-orders, /shipments, and /enterprise-inventory/supplier-invoices endpoints, then joins records by purchase_order_id and shipment_id.</p>
              <div style={styles.statGrid}>
                <MetricCard label="Open POs" value={procurementSummary.openPurchaseOrders} />
                <MetricCard label="Overdue POs" value={procurementSummary.overduePurchaseOrders} />
                <MetricCard label="Receiving gaps" value={procurementSummary.receivingGaps} />
                <MetricCard label="Unmatched invoices" value={procurementSummary.unmatchedInvoices} />
              </div>
            </section>

            <form onSubmit={handlePurchaseOrderShipmentSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Create shipment from approved PO</h2>
              <p style={styles.helper}>Uses the real POST /purchase-orders/:id/create-shipment route with the selected PO version in If-Match-Version.</p>
              <SelectField
                label="Approved purchase order"
                value={purchaseOrderShipmentForm.purchase_order_id}
                onChange={(value) => setPurchaseOrderShipmentForm((current) => ({ ...current, purchase_order_id: value }))}
                options={purchaseOrders
                  .filter((purchaseOrder) => purchaseOrder.status === 'approved')
                  .map((purchaseOrder) => ({ value: purchaseOrder.id, label: `${purchaseOrder.po_number || purchaseOrder.id} · ${purchaseOrder.supplier_name || purchaseOrder.supplier_id} · v${purchaseOrder.version}` }))}
                required
              />
              <InputField label="Delivery date" type="date" value={purchaseOrderShipmentForm.delivery_date} onChange={(value) => setPurchaseOrderShipmentForm((current) => ({ ...current, delivery_date: value }))} />
              <button type="submit" disabled={createShipmentFromPurchaseOrderMutation.isPending} style={styles.primaryButton}>Create linked shipment</button>
            </form>
          </div>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Purchase order lifecycle + matching status</h2>
            <p style={styles.helper}>Uses real PO lifecycle routes: POST /purchase-orders/:id/submit, /approve, /close, /reopen, and /cancel with If-Match-Version.</p>
            {purchaseOrdersQuery.isLoading || shipmentsQuery.isLoading || invoicesQuery.isLoading ? (
              <p style={styles.helper}>Loading…</p>
            ) : procurementMatchRows.length === 0 ? (
              <p style={styles.helper}>No purchase orders found.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['PO', 'Supplier', 'PO status', 'Shipments', 'Shipment status', 'Invoices', 'Invoiced total', 'Variance', 'Expected', 'Actions'].map((header) => <th key={header} style={styles.th}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {procurementMatchRows.map((row) => {
                      const purchaseOrder = row.purchaseOrder;
                      return (
                        <tr key={purchaseOrder.id}>
                          <td style={styles.td}>{purchaseOrder.po_number || purchaseOrder.id}</td>
                          <td style={styles.td}>{purchaseOrder.supplier_name || purchaseOrder.supplier_id}</td>
                          <td style={styles.td}>{purchaseOrder.status}</td>
                          <td style={styles.td}>{formatNumber(row.linkedShipmentCount)}</td>
                          <td style={styles.td}>{row.shipmentStatus}</td>
                          <td style={styles.td}>{formatNumber(row.linkedInvoiceCount)}</td>
                          <td style={styles.td}>{formatNumber(row.totalInvoiced)}</td>
                          <td style={styles.td}>{row.invoiceVariance || purchaseOrder.variance_status || '-'}</td>
                          <td style={styles.td}>{purchaseOrder.expected_delivery_date || '-'}</td>
                          <td style={styles.td}>
                            <div style={styles.actions}>
                              {purchaseOrder.status === 'draft' ? <button type="button" style={styles.secondarySmallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'submit')}>Submit</button> : null}
                              {purchaseOrder.status === 'submitted' ? <button type="button" style={styles.smallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'approve')}>Approve</button> : null}
                              {['approved', 'completed'].includes(purchaseOrder.status) ? <button type="button" style={styles.secondarySmallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'close')}>Close</button> : null}
                              {purchaseOrder.status === 'cancelled' ? <button type="button" style={styles.secondarySmallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'reopen')}>Reopen</button> : null}
                              {!['cancelled', 'completed'].includes(purchaseOrder.status) ? <button type="button" style={styles.dangerButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'cancel')}>Cancel</button> : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === 'receiving' ? (
        <section style={styles.grid}>
          <div style={styles.stack}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Shipment receiving controls</h2>
              <p style={styles.helper}>Uses the real GET /shipment-items/:shipmentId, GET /shipments/:shipmentId/barcode/:barcode, POST /shipments/:id/receive, and POST /shipments/:id/finalize routes with the selected shipment version.</p>
              <div style={styles.statGrid}>
                <MetricCard label="Active shipments" value={receivingSummary.activeShipments} />
                <MetricCard label="Partial receipts" value={receivingSummary.partiallyReceived} />
                <MetricCard label="Selected discrepancies" value={receivingSummary.discrepancyRows} />
                <MetricCard label="Remaining units" value={formatNumber(receivingSummary.remainingUnits)} />
              </div>
            </section>

            <form onSubmit={handleShipmentBarcodeLookupSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Barcode receiving scanner</h2>
              <p style={styles.helper}>Uses the real GET /shipments/:shipmentId/barcode/:barcode route to resolve package barcodes against the selected shipment before posting receipt.</p>
              <InputField label="Package / product barcode" value={shipmentBarcodeScanForm.barcode} onChange={(value) => setShipmentBarcodeScanForm((current) => ({ ...current, barcode: value }))} required />
              <InputField label="Packages scanned" type="number" min="1" value={shipmentBarcodeScanForm.package_count} onChange={(value) => setShipmentBarcodeScanForm((current) => ({ ...current, package_count: value }))} required />
              <button type="submit" disabled={barcodeLookupMutation.isPending || !selectedReceivingShipment} style={styles.secondaryButton}>Resolve barcode</button>
              {lastBarcodeLookup ? (
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Last barcode match</span>
                  <strong style={styles.metricValue}>{lastBarcodeLookup.product_name || lastBarcodeLookup.product?.name || lastBarcodeLookup.product_id}</strong>
                  <span style={styles.metricHelper}>Package: {lastBarcodeLookup.package?.package_name || '-'} · units/package {formatNumber(lastBarcodeLookup.package?.units_per_package)} · remaining {formatNumber(lastBarcodeLookup.calculated?.remaining_quantity ?? lastBarcodeLookup.remaining_quantity)}</span>
                </div>
              ) : null}
            </form>

            <form onSubmit={handleShipmentReceivingSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Post receipt line</h2>
              <SelectField
                label="Shipment"
                value={shipmentReceivingForm.shipment_id}
                onChange={(value) => {
                  setShipmentReceivingForm((current) => ({
                    ...current,
                    shipment_id: value,
                    product_id: '',
                    quantity_received: '',
                    discrepancy_reason: '',
                    receiving_note: ''
                  }));
                  setLastBarcodeLookup(null);
                  setShipmentBarcodeScanForm(emptyShipmentBarcodeScanForm);
                }}
                options={shipments
                  .filter((shipment) => !['received', 'cancelled'].includes(shipment.status))
                  .map((shipment) => ({ value: shipment.id, label: `${shipment.po_number || shipment.linked_purchase_order_number || shipment.id} · ${shipment.supplier_name || shipment.supplier_id} · ${shipment.status} · v${shipment.version}` }))}
                required
              />
              <SelectField
                label="Shipment item"
                value={shipmentReceivingForm.product_id}
                onChange={(value) => {
                  const item = selectedShipmentItems.find((shipmentItem) => shipmentItem.product_id === value);
                  setShipmentReceivingForm((current) => ({
                    ...current,
                    product_id: value,
                    storage_location_id: item?.storage_location_id || current.storage_location_id
                  }));
                }}
                options={selectedShipmentItems.map((item) => ({
                  value: item.product_id,
                  label: `${item.product_name || item.product_id} · ordered ${formatNumber(item.quantity)} · received ${formatNumber(item.received_quantity)}`
                }))}
                required
              />
              <SelectField label="Receive into location" value={shipmentReceivingForm.storage_location_id} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
              <InputField label="Quantity received" type="number" value={shipmentReceivingForm.quantity_received} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, quantity_received: value }))} required />
              <InputField label="Discrepancy reason" value={shipmentReceivingForm.discrepancy_reason} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, discrepancy_reason: value }))} />
              <InputField label="Receiving note" value={shipmentReceivingForm.receiving_note} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, receiving_note: value }))} />
              <button type="submit" disabled={receiveShipmentMutation.isPending || !selectedReceivingShipment} style={styles.primaryButton}>Post receipt</button>
            </form>
          </div>

          <div style={styles.stack}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Selected shipment lines</h2>
              <DataTable
                loading={shipmentItemsQuery.isLoading}
                empty={shipmentReceivingForm.shipment_id ? 'No shipment items found.' : 'Select a shipment to load its items.'}
                headers={['Product', 'Ordered', 'Received', 'Remaining', 'Discrepancy', 'Reason', 'Last received']}
                rows={selectedShipmentItems.map((item) => {
                  const ordered = toNumber(item.quantity);
                  const received = toNumber(item.received_quantity);
                  return [
                    item.product_name || item.product_id,
                    formatNumber(item.quantity),
                    formatNumber(item.received_quantity),
                    formatNumber(Math.max(ordered - received, 0)),
                    formatNumber(item.discrepancy),
                    item.discrepancy_reason || '-',
                    formatDateTime(item.last_received_at)
                  ];
                })}
              />
              {selectedReceivingShipment && selectedReceivingShipment.status !== 'received' ? (
                <button type="button" onClick={() => finalizeShipmentMutation.mutate(selectedReceivingShipment)} disabled={finalizeShipmentMutation.isPending} style={styles.secondaryButton}>Finalize selected shipment</button>
              ) : null}
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Shipment queue</h2>
              <DataTable
                loading={shipmentsQuery.isLoading}
                empty="No shipments found."
                headers={['Shipment', 'Supplier', 'Status', 'PO', 'Lines', 'Ordered', 'Received', 'Delivery', 'Version']}
                rows={shipments.map((shipment) => [
                  shipment.id,
                  shipment.supplier_name || shipment.supplier_id,
                  shipment.status,
                  shipment.po_number || shipment.linked_purchase_order_number || '-',
                  formatNumber(shipment.line_count),
                  formatNumber(shipment.total_ordered_quantity),
                  formatNumber(shipment.total_received_quantity),
                  shipment.delivery_date || '-',
                  String(shipment.version)
                ])}
              />
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'requisitions' ? (
        <section style={styles.grid}>
          <form onSubmit={handleRequisitionSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Create department requisition</h2>
            <InputField label="Department" value={requisitionForm.department} onChange={(value) => setRequisitionForm((current) => ({ ...current, department: value }))} required />
            <SelectField label="Storage location" value={requisitionForm.storage_location_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
            <SelectField label="Priority" value={requisitionForm.priority} onChange={(value) => setRequisitionForm((current) => ({ ...current, priority: value }))} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
            <SelectField label="Product" value={requisitionForm.product_id} onChange={(value) => setRequisitionForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
            <InputField label="Requested quantity" type="number" value={requisitionForm.requested_quantity} onChange={(value) => setRequisitionForm((current) => ({ ...current, requested_quantity: value }))} required />
            <InputField label="Notes" value={requisitionForm.notes} onChange={(value) => setRequisitionForm((current) => ({ ...current, notes: value }))} />
            <button type="submit" disabled={createRequisitionMutation.isPending} style={styles.primaryButton}>Create requisition</button>
          </form>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Department requisitions</h2>
            <DataTable loading={requisitionsQuery.isLoading} empty="No requisitions yet." headers={['Department', 'Status', 'Priority', 'Created']} rows={(requisitionsQuery.data ?? []).map((item) => [item.department, item.status, item.priority, formatDateTime(item.created_at)])} />
          </div>
        </section>
      ) : null}

      {activeTab === 'approvals' ? (
        <section style={styles.grid}>
          <form onSubmit={handleApprovalRuleSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Create approval rule</h2>
            <SelectField
              label="Entity type"
              value={approvalRuleForm.entity_type}
              onChange={(value) => setApprovalRuleForm((current) => ({ ...current, entity_type: value }))}
              options={[
                { value: 'purchase_order', label: 'Purchase order' },
                { value: 'supplier_invoice', label: 'Supplier invoice' },
                { value: 'department_requisition', label: 'Department requisition' },
                { value: 'cycle_count', label: 'Cycle count' },
                { value: 'shipment', label: 'Shipment' }
              ]}
              required
            />
            <InputField label="Department" value={approvalRuleForm.department} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, department: value }))} />
            <SelectField label="Storage location" value={approvalRuleForm.storage_location_id} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
            <InputField label="Minimum amount" type="number" value={approvalRuleForm.min_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, min_amount: value }))} required />
            <InputField label="Maximum amount" type="number" value={approvalRuleForm.max_amount} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, max_amount: value }))} />
            <InputField label="Required role" value={approvalRuleForm.required_role} onChange={(value) => setApprovalRuleForm((current) => ({ ...current, required_role: value }))} required />
            <button type="submit" disabled={createApprovalRuleMutation.isPending} style={styles.primaryButton}>Save approval rule</button>
          </form>

          <div style={styles.stack}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Approval queue</h2>
              {approvalQueue.length ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Entity</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Created</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalQueue.map((item) => (
                        <tr key={`${item.entity_type}-${item.entity_id}`}>
                          <td style={styles.td}>{item.label}</td>
                          <td style={styles.td}>{item.status}</td>
                          <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                          <td style={styles.td}>
                            <div style={styles.actions}>
                              <button
                                type="button"
                                style={styles.smallButton}
                                disabled={executeApprovalMutation.isPending}
                                onClick={() => executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action: 'approved' })}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                style={styles.dangerButton}
                                disabled={executeApprovalMutation.isPending}
                                onClick={() => executeApprovalMutation.mutate({ entity_type: item.entity_type, entity_id: item.entity_id, action: 'rejected' })}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p style={styles.helper}>No items currently waiting for approval.</p>}
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Approval rules</h2>
              <DataTable loading={approvalRulesQuery.isLoading} empty="No approval rules configured yet." headers={['Entity', 'Department', 'Min amount', 'Max amount', 'Required role', 'Active']} rows={(approvalRulesQuery.data ?? []).map((item) => [item.entity_type, item.department || '-', formatNumber(item.min_amount), item.max_amount ? formatNumber(item.max_amount) : '-', item.required_role, item.active ? 'Yes' : 'No'])} />
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'invoices' ? (
        <section style={styles.grid}>
          <div style={styles.stack}>
            <form onSubmit={handleSupplierCatalogSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Supplier catalog item</h2>
              <SelectField label="Supplier" value={supplierCatalogForm.supplier_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
              <SelectField label="Product" value={supplierCatalogForm.product_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
              <InputField label="Supplier SKU" value={supplierCatalogForm.supplier_sku} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_sku: value }))} />
              <InputField label="Supplier product name" value={supplierCatalogForm.supplier_product_name} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_product_name: value }))} />
              <InputField label="Lead time days" type="number" value={supplierCatalogForm.lead_time_days} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, lead_time_days: value }))} />
              <InputField label="Minimum order quantity" type="number" value={supplierCatalogForm.min_order_quantity} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, min_order_quantity: value }))} />
              <InputField label="Latest unit cost" type="number" value={supplierCatalogForm.unit_cost} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, unit_cost: value }))} />
              <InputField label="Currency" value={supplierCatalogForm.currency} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, currency: value }))} />
              <InputField label="Effective from" type="date" value={supplierCatalogForm.effective_from} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, effective_from: value }))} />
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={supplierCatalogForm.preferred} onChange={(event) => setSupplierCatalogForm((current) => ({ ...current, preferred: event.target.checked }))} />
                Preferred supplier item
              </label>
              <button type="submit" disabled={createSupplierCatalogMutation.isPending} style={styles.primaryButton}>Save catalog item</button>
            </form>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Supplier catalog</h2>
              <DataTable loading={supplierCatalogQuery.isLoading} empty="No supplier catalog items yet." headers={['Supplier', 'Product', 'SKU', 'Cost', 'Lead time', 'MOQ', 'Preferred']} rows={supplierCatalogItems.map((item) => [item.supplier_name || item.supplier_id, item.product_name || item.product_id, item.supplier_sku || '-', item.latest_unit_cost ? `${formatNumber(item.latest_unit_cost)} ${item.latest_currency || ''}` : '-', formatNumber(item.lead_time_days), formatNumber(item.min_order_quantity), item.preferred ? 'Yes' : 'No'])} />
            </section>
          </div>

          <div style={styles.stack}>
            <form onSubmit={handleSupplierInvoiceSubmit} style={styles.card}>
              <h2 style={styles.cardTitle}>Create supplier invoice</h2>
              <SelectField label="Supplier" value={supplierInvoiceForm.supplier_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
              <InputField label="Invoice number" value={supplierInvoiceForm.invoice_number} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_number: value }))} required />
              <InputField label="Invoice date" type="date" value={supplierInvoiceForm.invoice_date} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_date: value }))} required />
              <InputField label="Subtotal" type="number" value={supplierInvoiceForm.subtotal_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, subtotal_amount: value }))} />
              <InputField label="Tax" type="number" value={supplierInvoiceForm.tax_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, tax_amount: value }))} />
              <InputField label="Total" type="number" value={supplierInvoiceForm.total_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, total_amount: value }))} required />
              <SelectField label="Invoice product" value={supplierInvoiceForm.product_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
              <InputField label="Quantity" type="number" value={supplierInvoiceForm.quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, quantity: value }))} required />
              <InputField label="Unit cost" type="number" value={supplierInvoiceForm.unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, unit_cost: value }))} required />
              <InputField label="Expected quantity" type="number" value={supplierInvoiceForm.expected_quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_quantity: value }))} />
              <InputField label="Expected unit cost" type="number" value={supplierInvoiceForm.expected_unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_unit_cost: value }))} />
              <button type="submit" disabled={createSupplierInvoiceMutation.isPending} style={styles.primaryButton}>Create invoice</button>
            </form>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Supplier invoices</h2>
              <p style={styles.helper}>3-way invoice matching and variance escalation. {selectedSupplierName ? `Latest supplier: ${selectedSupplierName}.` : ''}</p>
              <DataTable loading={invoicesQuery.isLoading} empty="No supplier invoices yet." headers={['Invoice', 'Supplier', 'PO', 'Shipment', 'Status', 'Variance', 'Total', 'Created']} rows={(invoicesQuery.data ?? []).map((item) => [item.invoice_number, suppliers.find((supplier) => supplier.id === item.supplier_id)?.name || item.supplier_id, purchaseOrders.find((purchaseOrder) => purchaseOrder.id === item.purchase_order_id)?.po_number || item.purchase_order_id || '-', shipments.find((shipment) => shipment.id === item.shipment_id)?.po_number || item.shipment_id || '-', item.status, item.variance_status || '-', formatNumber(item.total_amount), formatDateTime(item.created_at)])} />
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'labels' ? (
        <section style={styles.grid}>
          <form onSubmit={handleBarcodeLabelSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Create barcode label</h2>
            <SelectField
              label="Product"
              value={barcodeLabelForm.product_id}
              onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, product_id: value }))}
              options={products.map((product) => ({ value: product.id, label: product.name }))}
              required
            />
            <InputField label="Barcode value" value={barcodeLabelForm.barcode_value} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_value: value }))} />
            <SelectField
              label="Barcode type"
              value={barcodeLabelForm.barcode_type}
              onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_type: value }))}
              options={[
                { value: 'CODE128', label: 'CODE128' },
                { value: 'EAN13', label: 'EAN13' },
                { value: 'QR', label: 'QR' }
              ]}
              required
            />
            <InputField label="Label template" value={barcodeLabelForm.label_template} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, label_template: value }))} />
            <InputField label="Lot number" value={barcodeLabelForm.lot_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, lot_number: value }))} />
            <InputField label="Batch number" value={barcodeLabelForm.batch_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, batch_number: value }))} />
            <InputField label="Expiry date" type="date" value={barcodeLabelForm.expiry_date} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, expiry_date: value }))} />
            <button type="submit" disabled={createBarcodeLabelMutation.isPending} style={styles.primaryButton}>Create label</button>
          </form>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Barcode labels</h2>
            <DataTable loading={barcodeLabelsQuery.isLoading} empty="No barcode labels yet." headers={['Product', 'Barcode', 'Type', 'Lot', 'Batch', 'Expiry', 'Created']} rows={(barcodeLabelsQuery.data ?? []).map((item) => [item.product_name || item.product_id, item.barcode_value, item.barcode_type, item.lot_number || '-', item.batch_number || '-', item.expiry_date || '-', formatDateTime(item.created_at)])} />
          </section>
        </section>
      ) : null}


      {activeTab === 'packages' ? (
        <section style={styles.grid}>
          <form onSubmit={handleProductPackageSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>{editingProductPackageId ? 'Update product package barcode' : 'Create product package barcode'}</h2>
            <SelectField
              label="Product"
              value={productPackageForm.product_id}
              onChange={(value) => {
                setProductPackageForm({ ...emptyProductPackageForm, product_id: value });
                setEditingProductPackageId(null);
              }}
              options={products.map((product) => ({ value: product.id, label: product.name }))}
              required
            />
            <InputField label="Package name" value={productPackageForm.package_name} onChange={(value) => setProductPackageForm((current) => ({ ...current, package_name: value }))} required />
            <InputField label="Package barcode" value={productPackageForm.barcode} onChange={(value) => setProductPackageForm((current) => ({ ...current, barcode: value }))} required />
            <InputField label="Units per package" type="number" min="0.0001" value={productPackageForm.units_per_package} onChange={(value) => setProductPackageForm((current) => ({ ...current, units_per_package: value }))} required />
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={productPackageForm.is_default}
                onChange={(event) => setProductPackageForm((current) => ({ ...current, is_default: event.target.checked }))}
              />
              Set as default product barcode
            </label>
            <button type="submit" disabled={createProductPackageMutation.isPending || updateProductPackageMutation.isPending} style={styles.primaryButton}>
              {editingProductPackageId ? 'Update package barcode' : 'Create package barcode'}
            </button>
            {editingProductPackageId ? <button type="button" onClick={cancelEditProductPackage} style={styles.secondaryButton}>Cancel edit</button> : null}
          </form>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Package barcodes</h2>
            {!productPackageForm.product_id ? (
              <p style={styles.helper}>Select a product to load its package barcodes.</p>
            ) : productPackagesQuery.isLoading ? (
              <p style={styles.helper}>Loading…</p>
            ) : selectedProductPackages.length === 0 ? (
              <p style={styles.helper}>No package barcodes configured for this product.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Package</th>
                      <th style={styles.th}>Barcode</th>
                      <th style={styles.th}>Units/package</th>
                      <th style={styles.th}>Default</th>
                      <th style={styles.th}>Created</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductPackages.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.package_name}</td>
                        <td style={styles.td}>{item.barcode}</td>
                        <td style={styles.td}>{formatNumber(item.units_per_package)}</td>
                        <td style={styles.td}>{item.is_default ? 'Yes' : 'No'}</td>
                        <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                        <td style={styles.td}>
                          <button type="button" style={styles.smallButton} onClick={() => beginEditProductPackage(item)}>Edit</button>
                          <button type="button" style={styles.dangerButton} disabled={deleteProductPackageMutation.isPending} onClick={() => deleteProductPackageMutation.mutate(item)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === 'attachments' ? (
        <section style={styles.grid}>
          <form onSubmit={handleAttachmentSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Link attachment</h2>
            <SelectField
              label="Entity type"
              value={attachmentForm.entity_type}
              onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_type: value }))}
              options={[
                { value: 'purchase_order', label: 'Purchase order' },
                { value: 'shipment', label: 'Shipment' },
                { value: 'supplier', label: 'Supplier' },
                { value: 'product', label: 'Product' },
                { value: 'supplier_invoice', label: 'Supplier invoice' },
                { value: 'department_requisition', label: 'Department requisition' }
              ]}
              required
            />
            <InputField label="Entity ID" value={attachmentForm.entity_id} onChange={(value) => setAttachmentForm((current) => ({ ...current, entity_id: value }))} required />
            <InputField label="Original filename" value={attachmentForm.original_filename} onChange={(value) => setAttachmentForm((current) => ({ ...current, original_filename: value }))} required />
            <InputField label="Stored filename" value={attachmentForm.stored_filename} onChange={(value) => setAttachmentForm((current) => ({ ...current, stored_filename: value }))} required />
            <InputField label="MIME type" value={attachmentForm.mime_type} onChange={(value) => setAttachmentForm((current) => ({ ...current, mime_type: value }))} />
            <InputField label="File size bytes" type="number" value={attachmentForm.file_size_bytes} onChange={(value) => setAttachmentForm((current) => ({ ...current, file_size_bytes: value }))} />
            <InputField label="Storage path" value={attachmentForm.storage_path} onChange={(value) => setAttachmentForm((current) => ({ ...current, storage_path: value }))} />
            <button type="submit" disabled={createAttachmentMutation.isPending} style={styles.primaryButton}>Link attachment</button>
          </form>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Entity attachments</h2>
            <p style={styles.helper}>Enter an entity type and entity ID to load linked files.</p>
            <DataTable
              loading={attachmentsQuery.isLoading}
              empty="No attachments found for this entity."
              headers={['File', 'Stored file', 'MIME type', 'Size', 'Path', 'Created']}
              rows={(attachmentsQuery.data ?? []).map((item) => [
                item.original_filename,
                item.stored_filename,
                item.mime_type || '-',
                formatNumber(item.file_size_bytes),
                item.storage_path || '-',
                formatDateTime(item.created_at)
              ])}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'alerts' ? (
        <section style={styles.grid}>
          <form onSubmit={handleAlertSubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Create manual alert</h2>
            <InputField label="Type" value={alertForm.type} onChange={(value) => setAlertForm((current) => ({ ...current, type: value }))} required />
            <SelectField
              label="Product"
              value={alertForm.product_id}
              onChange={(value) => setAlertForm((current) => ({ ...current, product_id: value }))}
              options={products.map((product) => ({ value: product.id, label: product.name }))}
            />
            <SelectField
              label="Severity"
              value={alertForm.severity}
              onChange={(value) => setAlertForm((current) => ({ ...current, severity: value }))}
              options={[
                { value: 'info', label: 'Info' },
                { value: 'warning', label: 'Warning' },
                { value: 'critical', label: 'Critical' }
              ]}
              required
            />
            <InputField label="Escalation level" type="number" min="0" value={alertForm.escalation_level} onChange={(value) => setAlertForm((current) => ({ ...current, escalation_level: value }))} />
            <TextareaField
              label="Message"
              value={alertForm.message}
              required
              rows={5}
              onChange={(value) => setAlertForm((current) => ({ ...current, message: value }))}
            />
            <button type="submit" disabled={createAlertMutation.isPending} style={styles.primaryButton}>Create alert</button>
          </form>

          <section style={styles.stack}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Alert filters</h2>
              <div style={styles.inlineGrid}>
                <SelectField
                  label="Resolved"
                  value={alertFilters.resolved}
                  onChange={(value) => setAlertFilters((current) => ({ ...current, resolved: value }))}
                  options={[
                    { value: 'false', label: 'Open' },
                    { value: 'true', label: 'Resolved' }
                  ]}
                />
                <SelectField
                  label="Acknowledged"
                  value={alertFilters.acknowledged}
                  onChange={(value) => setAlertFilters((current) => ({ ...current, acknowledged: value }))}
                  options={[
                    { value: 'false', label: 'Unacknowledged' },
                    { value: 'true', label: 'Acknowledged' }
                  ]}
                />
                <SelectField
                  label="Severity"
                  value={alertFilters.severity}
                  onChange={(value) => setAlertFilters((current) => ({ ...current, severity: value }))}
                  options={[
                    { value: 'info', label: 'Info' },
                    { value: 'warning', label: 'Warning' },
                    { value: 'critical', label: 'Critical' }
                  ]}
                />
                <InputField label="Search" value={alertFilters.search} onChange={(value) => setAlertFilters((current) => ({ ...current, search: value }))} />
              </div>
              <button type="button" style={styles.secondaryButton} onClick={() => setAlertFilters(emptyAlertFilters)}>Reset filters</button>
              <div style={styles.statGrid}>
                <MetricCard label="Open alerts" value={alertsSummary.unresolved} />
                <MetricCard label="Critical open" value={alertsSummary.critical} />
                <MetricCard label="Unacknowledged" value={alertsSummary.unacknowledged} />
              </div>
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Operational alerts</h2>
              {alertsQuery.isLoading ? <p style={styles.helper}>Loading…</p> : alerts.length === 0 ? <p style={styles.helper}>No alerts match these filters.</p> : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Severity', 'Type', 'Product', 'Message', 'State', 'Created', 'Actions'].map((header) => <th key={header} style={styles.th}>{header}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map((alert) => (
                        <tr key={alert.id}>
                          <td style={styles.td}>{alert.severity}</td>
                          <td style={styles.td}>{alert.type}</td>
                          <td style={styles.td}>{alert.product_name || '-'}</td>
                          <td style={styles.td}>{alert.message}</td>
                          <td style={styles.td}>{alert.resolved ? 'Resolved' : alert.acknowledged ? 'Acknowledged' : 'Open'}</td>
                          <td style={styles.td}>{formatDateTime(alert.created_at)}</td>
                          <td style={styles.td}>
                            <div style={styles.actions}>
                              {!alert.acknowledged && !alert.resolved ? <button type="button" style={styles.smallButton} disabled={acknowledgeAlertMutation.isPending} onClick={() => acknowledgeAlertMutation.mutate(alert.id)}>Acknowledge</button> : null}
                              {!alert.resolved ? <button type="button" style={styles.smallButton} disabled={escalateAlertMutation.isPending} onClick={() => escalateAlertMutation.mutate(alert.id)}>Escalate</button> : null}
                              {!alert.resolved ? (
                                <>
                                  <input
                                    style={styles.inlineInput}
                                    placeholder="Resolution note"
                                    value={alertResolutionNotes[alert.id] ?? ''}
                                    onChange={(event) => setAlertResolutionNotes((current) => ({ ...current, [alert.id]: event.target.value }))}
                                  />
                                  <button type="button" style={styles.smallButton} disabled={resolveAlertMutation.isPending} onClick={() => resolveAlertMutation.mutate({ id: alert.id, resolution_note: alertResolutionNotes[alert.id] ?? '' })}>Resolve</button>
                                </>
                              ) : <button type="button" style={styles.secondarySmallButton} disabled={reopenAlertMutation.isPending} onClick={() => reopenAlertMutation.mutate(alert.id)}>Reopen</button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        </section>
      ) : null}

      {activeTab === 'audit' ? (
        <section style={styles.grid}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Audit filters</h2>
            <InputField label="Action" value={auditFilters.action} onChange={(value) => setAuditFilters((current) => ({ ...current, action: value }))} />
            <InputField label="Entity type" value={auditFilters.entity_type} onChange={(value) => setAuditFilters((current) => ({ ...current, entity_type: value }))} />
            <InputField label="Entity ID" value={auditFilters.entity_id} onChange={(value) => setAuditFilters((current) => ({ ...current, entity_id: value }))} />
            <InputField label="User ID" value={auditFilters.user_id} onChange={(value) => setAuditFilters((current) => ({ ...current, user_id: value }))} />
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={auditFilters.support_only} onChange={(event) => setAuditFilters((current) => ({ ...current, support_only: event.target.checked }))} />
              Support-session actions only
            </label>
            <button type="button" style={styles.secondaryButton} onClick={() => setAuditFilters(emptyAuditFilters)}>Reset filters</button>
            <div style={styles.statGrid}>
              <MetricCard label="Audit rows" value={auditSummary.total} />
              <MetricCard label="Entity types" value={auditSummary.entityTypes} />
              <MetricCard label="Support actions" value={auditSummary.supportActions} />
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Tenant audit trail</h2>
            <DataTable
              loading={auditLogsQuery.isLoading}
              empty="No audit rows match these filters."
              headers={['Action', 'Entity', 'Entity ID', 'Actor', 'Created', 'Metadata']}
              rows={auditLogs.map((item) => [
                item.action,
                item.entity_type || '-',
                item.entity_id || '-',
                item.user_name || item.user_email || item.user_id || 'System',
                formatDateTime(item.created_at),
                item.metadata ? JSON.stringify(item.metadata) : '-'
              ])}
            />
          </section>
        </section>
      ) : null}

      {activeTab === 'notifications' ? (
        <section style={styles.grid}>
          <form onSubmit={handleNotificationDeliverySubmit} style={styles.card}>
            <h2 style={styles.cardTitle}>Queue notification delivery</h2>
            <SelectField
              label="Notification event"
              value={notificationDeliveryForm.notification_event_id}
              onChange={(value) => setNotificationDeliveryForm((current) => ({ ...current, notification_event_id: value }))}
              options={(notificationsQuery.data ?? []).map((event) => ({ value: event.id, label: `${event.severity}: ${event.title}` }))}
              required
            />
            <SelectField
              label="Channel"
              value={notificationDeliveryForm.channel}
              onChange={(value) => setNotificationDeliveryForm((current) => ({ ...current, channel: value }))}
              options={[
                { value: 'in_app', label: 'In-app' },
                { value: 'email', label: 'Email' },
                { value: 'webhook', label: 'Webhook' }
              ]}
              required
            />
            <InputField label="Recipient" value={notificationDeliveryForm.recipient} onChange={(value) => setNotificationDeliveryForm((current) => ({ ...current, recipient: value }))} />
            <button type="submit" disabled={queueNotificationDeliveryMutation.isPending} style={styles.primaryButton}>Queue delivery</button>
            <button
              type="button"
              disabled={processNotificationDeliveriesMutation.isPending}
              style={styles.secondaryButton}
              onClick={() => processNotificationDeliveriesMutation.mutate()}
            >
              Process queued deliveries
            </button>
          </form>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Notification events</h2>
            <DataTable loading={notificationsQuery.isLoading} empty="No notification events yet." headers={['Severity', 'Event', 'Title', 'Message', 'Created']} rows={(notificationsQuery.data ?? []).map((item) => [item.severity, item.event_type, item.title, item.message || '-', formatDateTime(item.created_at)])} />
          </section>
        </section>
      ) : null}
    </div>
  );
}



export default EnterpriseInventoryPage;
