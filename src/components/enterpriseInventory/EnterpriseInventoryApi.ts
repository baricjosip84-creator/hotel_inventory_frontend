import { apiRequest } from '../../lib/api';

import type {
  AlertFilters,
  AlertItem,
  ApprovalRule,
  AuditFilters,
  AuditLog,
  AutomationRunEventsResponse,
  AutomationRunnerEvidenceResponse,
  AutomationRunnerReadiness,
  AutomationRunnerStatus,
  AutomationSchedulesResponse,
  AutomationTypesResponse,
  BarcodeLabel,
  CycleCount,
  DashboardLowStockRow,
  DashboardOverdueShipment,
  DashboardSummary,
  DashboardSupplierPerformance,
  DemandForecastRow,
  ForecastAccuracyBacktestResponse,
  ForecastCalibrationReviewResponse,
  ForecastDataQualityReviewResponse,
  ForecastReliabilityMatrixResponse,
  DepartmentRequisition,
  DepletionRiskResponse,
  EntityAttachment,
  ExecutionAdapterRegistry,
  ExecutionFilters,
  ExecutionHardeningSummary,
  ExecutionRequestsResponse,
  InventoryAnomaliesResponse,
  InventoryValuationReport,
  NotificationEvent,
  OperationalHealthResponse,
  ParLevel,
  ProcurementSummaryReport,
  ProductCostActionSummary,
  ProductCostGenericSummary,
  ProductCostRiskSummary,
  ProductionReviewResponse,
  ProductCostValuationDetails,
  ProductCostValuationSummary,
  ProductMovementReportRow,
  ProductOption,
  ProductPackage,
  PurchaseOrder,
  ReorderRecommendationsResponse,
  Shipment,
  ShipmentBarcodeLookup,
  ShipmentItem,
  StockByLocationReportRow,
  StockItem,
  StockMovement,
  StockTransfer,
  StorageLocationOption,
  SupplierCatalogItem,
  SupplierInvoice,
  SupplierOption,
  SupplierPerformance,
  SupplierSlaBreach,
  SupplierTrustScoresResponse,
  SystemContextResponse,
  SystemContextSnapshotList,
  SystemExecutionGateResponse,
  SystemStatusResponse,
  TenantPublicContext
} from './EnterpriseInventoryTypes';

export async function fetchParLevels(): Promise<ParLevel[]> {
  return apiRequest<ParLevel[]>('/enterprise-inventory/par-levels');
}

export async function fetchCycleCounts(): Promise<CycleCount[]> {
  return apiRequest<CycleCount[]>('/enterprise-inventory/cycle-counts');
}

export async function fetchDepartmentRequisitions(): Promise<DepartmentRequisition[]> {
  return apiRequest<DepartmentRequisition[]>('/enterprise-inventory/department-requisitions');
}

export async function fetchApprovalRules(): Promise<ApprovalRule[]> {
  return apiRequest<ApprovalRule[]>('/enterprise-inventory/approval-rules');
}

export async function fetchSupplierInvoices(): Promise<SupplierInvoice[]> {
  return apiRequest<SupplierInvoice[]>('/enterprise-inventory/supplier-invoices');
}

export async function fetchSupplierCatalog(): Promise<SupplierCatalogItem[]> {
  return apiRequest<SupplierCatalogItem[]>('/enterprise-inventory/supplier-catalog');
}

export async function fetchNotifications(): Promise<NotificationEvent[]> {
  return apiRequest<NotificationEvent[]>('/enterprise-inventory/notifications');
}

export async function fetchAlerts(filters: AlertFilters): Promise<AlertItem[]> {
  const params = new URLSearchParams();
  if (filters.resolved) params.set('resolved', filters.resolved);
  if (filters.acknowledged) params.set('acknowledged', filters.acknowledged);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  const query = params.toString();
  return apiRequest<AlertItem[]>(`/alerts${query ? `?${query}` : ''}`);
}

export async function fetchAuditLogs(filters: AuditFilters): Promise<AuditLog[]> {
  const params = new URLSearchParams({ limit: '100' });
  if (filters.action.trim()) params.set('action', filters.action.trim());
  if (filters.entity_type.trim()) params.set('entity_type', filters.entity_type.trim());
  if (filters.entity_id.trim()) params.set('entity_id', filters.entity_id.trim());
  if (filters.user_id.trim()) params.set('user_id', filters.user_id.trim());
  if (filters.support_only) params.set('support_only', 'true');
  return apiRequest<AuditLog[]>(`/audit?${params.toString()}`);
}

export async function fetchBarcodeLabels(): Promise<BarcodeLabel[]> {
  return apiRequest<BarcodeLabel[]>('/enterprise-inventory/barcode-labels');
}

export async function fetchAttachments(entityType: string, entityId: string): Promise<EntityAttachment[]> {
  if (!entityType || !entityId) return [];
  const params = new URLSearchParams({ entity_type: entityType, entity_id: entityId });
  return apiRequest<EntityAttachment[]>(`/enterprise-inventory/attachments?${params.toString()}`);
}

export async function fetchProducts(search = ''): Promise<ProductOption[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  const query = params.toString();
  return apiRequest<ProductOption[]>(`/products${query ? `?${query}` : ''}`);
}

export async function fetchProductPackages(productId: string): Promise<ProductPackage[]> {
  if (!productId) return [];
  return apiRequest<ProductPackage[]>(`/products/${productId}/packages`);
}

export async function fetchStorageLocations(): Promise<StorageLocationOption[]> {
  return apiRequest<StorageLocationOption[]>('/storage-locations');
}

export async function fetchSuppliers(search = ''): Promise<SupplierOption[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  const query = params.toString();
  return apiRequest<SupplierOption[]>(`/suppliers${query ? `?${query}` : ''}`);
}

export async function fetchAvailableSuppliers(): Promise<SupplierOption[]> {
  return apiRequest<SupplierOption[]>('/suppliers/available');
}

export async function fetchSupplierSlaBreaches(): Promise<SupplierSlaBreach[]> {
  return apiRequest<SupplierSlaBreach[]>('/suppliers/sla-breaches');
}

export async function fetchSupplierPerformance(supplierId: string): Promise<SupplierPerformance | null> {
  if (!supplierId) return null;
  return apiRequest<SupplierPerformance>(`/suppliers/${supplierId}/performance`);
}

export async function fetchLowStock(): Promise<StockItem[]> {
  return apiRequest<StockItem[]>('/stock?low_stock=true');
}

export async function fetchStockMovements(): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>('/stock/movements?limit=50');
}


export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>('/dashboard/summary');
}

export async function fetchDashboardLowStock(): Promise<DashboardLowStockRow[]> {
  return apiRequest<DashboardLowStockRow[]>('/dashboard/low-stock?limit=10');
}

export async function fetchDashboardOverdueShipments(): Promise<DashboardOverdueShipment[]> {
  return apiRequest<DashboardOverdueShipment[]>('/dashboard/overdue-shipments?limit=10');
}

export async function fetchDashboardUnresolvedAlerts(): Promise<AlertItem[]> {
  return apiRequest<AlertItem[]>('/dashboard/unresolved-alerts?limit=10');
}

export async function fetchDashboardRecentActivity(): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>('/dashboard/recent-activity?limit=10');
}

export async function fetchDashboardSupplierPerformance(): Promise<DashboardSupplierPerformance[]> {
  return apiRequest<DashboardSupplierPerformance[]>('/dashboard/supplier-performance?limit=10');
}

export async function fetchInventoryValuationReport(): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>('/reports/inventory-valuation');
}

export async function fetchStockByLocationReport(): Promise<StockByLocationReportRow[]> {
  return apiRequest<StockByLocationReportRow[]>('/reports/stock-by-location');
}

export async function fetchProductMovementReport(): Promise<ProductMovementReportRow[]> {
  return apiRequest<ProductMovementReportRow[]>('/reports/product-movements?limit=50');
}

export async function fetchProcurementSummaryReport(): Promise<ProcurementSummaryReport> {
  return apiRequest<ProcurementSummaryReport>('/reports/procurement-summary');
}

export async function fetchProductCostRiskSummary(): Promise<ProductCostRiskSummary> {
  return apiRequest<ProductCostRiskSummary>('/products/cost-risk-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}


export async function fetchProductCostValuationSummary(): Promise<ProductCostValuationSummary> {
  return apiRequest<ProductCostValuationSummary>('/products/cost-valuation-summary?limit=10');
}

export async function fetchProductCostValuationDetails(): Promise<ProductCostValuationDetails> {
  return apiRequest<ProductCostValuationDetails>('/products/cost-valuation-details?limit=10&sort=estimated_value&direction=desc');
}

export async function fetchProductCostActionSummary(): Promise<ProductCostActionSummary> {
  return apiRequest<ProductCostActionSummary>('/products/cost-action-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostActionPlanSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-plan-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostActionCategorySummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-category-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostActionImpactSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-impact-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostActionSupplierSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-supplier-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostActionSourceSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-source-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostActionAgeSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-age-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90');
}

export async function fetchProductCostActionCoverageSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-action-coverage-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25');
}

export async function fetchProductCostAlertSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-alert-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostRecommendationSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-recommendation-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostDashboardSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-dashboard-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostReportSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-report-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceDetails(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-details?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceAuditPack(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-audit-pack?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceSignoffSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-signoff-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceReviewQueue(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-review-queue?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceReviewPack(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-review-pack?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceClosureSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-closure-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostGovernanceHandoffSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-governance-handoff-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostHardeningSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-hardening-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostOperationsRunbookSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-operations-runbook-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostOperationsControlSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-operations-control-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostOperationsEvidenceSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-operations-evidence-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchProductCostOperationsReadinessSummary(): Promise<ProductCostGenericSummary> {
  return apiRequest<ProductCostGenericSummary>('/products/cost-operations-readiness-summary?limit=10&variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35');
}

export async function fetchCarryingCostProductionReview(): Promise<ProductionReviewResponse> {
  return apiRequest<ProductionReviewResponse>('/financial-intelligence/carrying-cost/production-review');
}

export async function fetchDeadStockProductionReview(): Promise<ProductionReviewResponse> {
  return apiRequest<ProductionReviewResponse>('/financial-intelligence/dead-stock-risk/production-review');
}

export async function fetchMarginAwareProductionReview(): Promise<ProductionReviewResponse> {
  return apiRequest<ProductionReviewResponse>('/financial-intelligence/margin-aware-replenishment/production-review');
}

export async function fetchProcurementSpendProductionReview(): Promise<ProductionReviewResponse> {
  return apiRequest<ProductionReviewResponse>('/financial-intelligence/procurement-spend-intelligence/production-review');
}

export async function fetchReorderRecommendations(): Promise<ReorderRecommendationsResponse> {
  return apiRequest<ReorderRecommendationsResponse>('/reorder-insights/recommendations?lookback_days=30');
}

export async function fetchDepletionRisk(): Promise<DepletionRiskResponse> {
  return apiRequest<DepletionRiskResponse>('/inventory-insights/depletion-risk?lookback_days=30');
}

export async function fetchSupplierTrustScores(): Promise<SupplierTrustScoresResponse> {
  return apiRequest<SupplierTrustScoresResponse>('/supplier-insights/trust-scores');
}


export async function fetchOperationalHealth(): Promise<OperationalHealthResponse> {
  return apiRequest<OperationalHealthResponse>('/operational-insights/health-score');
}

export async function fetchInventoryAnomalies(): Promise<InventoryAnomaliesResponse> {
  return apiRequest<InventoryAnomaliesResponse>('/operational-insights/anomalies?short_window_days=7&baseline_window_days=30');
}

export async function fetchDemandForecast(): Promise<DemandForecastRow[]> {
  return apiRequest<DemandForecastRow[]>('/forecast');
}

export async function fetchForecastAccuracyBacktest(): Promise<ForecastAccuracyBacktestResponse> {
  return apiRequest<ForecastAccuracyBacktestResponse>('/forecast/accuracy-backtest');
}

export async function fetchForecastCalibrationReview(): Promise<ForecastCalibrationReviewResponse> {
  return apiRequest<ForecastCalibrationReviewResponse>('/forecast/calibration-review');
}

export async function fetchForecastDataQualityReview(): Promise<ForecastDataQualityReviewResponse> {
  return apiRequest<ForecastDataQualityReviewResponse>('/forecast/data-quality-review');
}

export async function fetchForecastReliabilityMatrix(): Promise<ForecastReliabilityMatrixResponse> {
  return apiRequest<ForecastReliabilityMatrixResponse>('/forecast/reliability-matrix');
}

export async function fetchAutomationTypes(): Promise<AutomationTypesResponse> {
  return apiRequest<AutomationTypesResponse>('/automation-schedules/types');
}

export async function fetchAutomationSchedules(): Promise<AutomationSchedulesResponse> {
  return apiRequest<AutomationSchedulesResponse>('/automation-schedules?limit=100');
}

export async function fetchAutomationRunnerReadiness(): Promise<AutomationRunnerReadiness> {
  return apiRequest<AutomationRunnerReadiness>('/automation-schedules/runner-readiness');
}

export async function fetchAutomationRunnerStatus(): Promise<AutomationRunnerStatus> {
  return apiRequest<AutomationRunnerStatus>('/automation-schedules/runner-status');
}

export async function fetchAutomationRunEvents(): Promise<AutomationRunEventsResponse> {
  return apiRequest<AutomationRunEventsResponse>('/automation-schedules/run-events?limit=50');
}

export async function fetchAutomationRunnerSafetyReport(): Promise<AutomationRunnerEvidenceResponse> {
  return apiRequest<AutomationRunnerEvidenceResponse>('/automation-schedules/runner-safety-report');
}

export async function fetchAutomationRunnerGovernancePack(): Promise<AutomationRunnerEvidenceResponse> {
  return apiRequest<AutomationRunnerEvidenceResponse>('/automation-schedules/runner-governance-pack');
}

export async function fetchAutomationRunnerOperationsReview(): Promise<AutomationRunnerEvidenceResponse> {
  return apiRequest<AutomationRunnerEvidenceResponse>('/automation-schedules/runner-operations-review');
}

export async function fetchAutomationRunnerAccountabilityDigest(): Promise<AutomationRunnerEvidenceResponse> {
  return apiRequest<AutomationRunnerEvidenceResponse>('/automation-schedules/runner-accountability-digest');
}

export async function fetchAutomationRunnerPolicyMatrix(): Promise<AutomationRunnerEvidenceResponse> {
  return apiRequest<AutomationRunnerEvidenceResponse>('/automation-schedules/runner-policy-matrix');
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  return apiRequest<SystemStatusResponse>('/system-status');
}


export async function fetchSystemContext(): Promise<SystemContextResponse> {
  return apiRequest<SystemContextResponse>('/system-context');
}

export async function fetchSystemExecutionGate(): Promise<SystemExecutionGateResponse> {
  return apiRequest<SystemExecutionGateResponse>('/system-context/execution-gate');
}

export async function fetchSystemContextSnapshots(): Promise<SystemContextSnapshotList> {
  return apiRequest<SystemContextSnapshotList>('/system-context/snapshots?limit=10');
}

export async function fetchSystemContextSnapshotComparison(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/system-context/snapshots/compare/latest');
}

export async function fetchSystemContextForecastRisk(): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/system-context/snapshots/forecast-risk-classification?limit=10');
}

export async function fetchSupportContext(): Promise<TenantPublicContext> {
  return apiRequest<TenantPublicContext>('/support-context/current');
}

export async function fetchMaintenanceContext(): Promise<TenantPublicContext> {
  return apiRequest<TenantPublicContext>('/maintenance-context/current');
}

export async function fetchAnnouncementContext(): Promise<TenantPublicContext> {
  return apiRequest<TenantPublicContext>('/announcement-context/current');
}

export async function fetchIncidentContext(): Promise<TenantPublicContext> {
  return apiRequest<TenantPublicContext>('/incident-context/current');
}

export async function fetchExecutionAdapters(): Promise<ExecutionAdapterRegistry> {
  return apiRequest<ExecutionAdapterRegistry>('/execution-requests/adapters');
}

export async function fetchExecutionHardeningSummary(): Promise<ExecutionHardeningSummary> {
  return apiRequest<ExecutionHardeningSummary>('/execution-requests/hardening-summary');
}

export async function fetchExecutionRequests(filters: ExecutionFilters): Promise<ExecutionRequestsResponse> {
  const params = new URLSearchParams({ limit: '50' });
  if (filters.status) params.set('status', filters.status);
  if (filters.request_type) params.set('request_type', filters.request_type);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  return apiRequest<ExecutionRequestsResponse>(`/execution-requests?${params.toString()}`);
}

export async function fetchStockTransfers(): Promise<StockTransfer[]> {
  return apiRequest<StockTransfer[]>('/stock-transfers?limit=100');
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  return apiRequest<PurchaseOrder[]>('/purchase-orders?limit=100');
}

export async function fetchShipments(): Promise<Shipment[]> {
  return apiRequest<Shipment[]>('/shipments?limit=100');
}

export async function fetchShipmentItems(shipmentId: string): Promise<ShipmentItem[]> {
  if (!shipmentId) return [];
  return apiRequest<ShipmentItem[]>(`/shipment-items/${shipmentId}`);
}

export async function lookupShipmentBarcode(shipmentId: string, barcode: string): Promise<ShipmentBarcodeLookup> {
  return apiRequest<ShipmentBarcodeLookup>(`/shipments/${shipmentId}/barcode/${encodeURIComponent(barcode)}`);
}
