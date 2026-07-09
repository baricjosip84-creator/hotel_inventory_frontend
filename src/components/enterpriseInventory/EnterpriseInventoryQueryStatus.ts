import { normalizeError } from './EnterpriseInventoryFormat';

type EnterpriseInventoryQueryLike = {
  dataUpdatedAt?: number;
  error?: unknown;
  isError?: boolean;
};

type EnterpriseInventoryQueryRecord = Record<string, EnterpriseInventoryQueryLike | undefined>;

const TAB_QUERY_MAP: Record<string, string[]> = {
  'operations-dashboard': [
    'dashboardSummaryQuery',
    'dashboardLowStockQuery',
    'dashboardOverdueShipmentsQuery',
    'dashboardUnresolvedAlertsQuery',
    'dashboardRecentActivityQuery',
    'dashboardSupplierPerformanceQuery',
    'stockOverviewQuery'
  ],
  'par-levels': ['parLevelsQuery'],
  'cycle-counts': ['cycleCountsQuery'],
  'stock-risk': ['lowStockQuery', 'stockMovementsQuery'],
  insights: [
    'operationalHealthQuery',
    'inventoryAnomaliesQuery',
    'reorderRecommendationsQuery',
    'depletionRiskQuery',
    'supplierTrustScoresQuery'
  ],
  forecast: [
    'demandForecastQuery',
    'forecastAccuracyBacktestQuery',
    'forecastCalibrationReviewQuery',
    'forecastDataQualityReviewQuery',
    'forecastReliabilityMatrixQuery'
  ],
  reports: [
    'inventoryValuationReportQuery',
    'stockByLocationReportQuery',
    'productMovementReportQuery',
    'procurementSummaryReportQuery'
  ],
  automation: [
    'automationTypesQuery',
    'automationSchedulesQuery',
    'automationRunnerReadinessQuery',
    'automationRunnerStatusQuery',
    'automationRunEventsQuery'
  ],
  execution: ['systemStatusQuery', 'executionAdaptersQuery', 'executionHardeningQuery', 'executionRequestsQuery'],
  'system-context': [
    'systemContextQuery',
    'systemExecutionGateQuery',
    'systemContextSnapshotsQuery',
    'systemContextSnapshotComparisonQuery',
    'systemContextForecastRiskQuery',
    'supportContextQuery',
    'maintenanceContextQuery',
    'announcementContextQuery',
    'incidentContextQuery'
  ],
  'cost-control': [
    'productCostRiskSummaryQuery',
    'productCostValuationSummaryQuery',
    'productCostActionSummaryQuery',
    'productCostGovernanceSummaryQuery',
    'productCostHardeningSummaryQuery'
  ],
  'stock-transfers': ['stockTransfersQuery'],
  products: ['productsQuery'],
  suppliers: ['suppliersQuery', 'availableSuppliersQuery', 'supplierSlaBreachesQuery', 'supplierPerformanceQuery'],
  locations: ['storageLocationsQuery'],
  alerts: ['alertsQuery'],
  audit: ['auditLogsQuery'],
  'procurement-match': ['purchaseOrdersQuery', 'shipmentsQuery', 'invoicesQuery'],
  receiving: ['shipmentsQuery', 'shipmentItemsQuery'],
  requisitions: ['requisitionsQuery'],
  approvals: ['approvalRulesQuery'],
  invoices: ['invoicesQuery', 'supplierCatalogQuery'],
  labels: ['barcodeLabelsQuery'],
  packages: ['productPackagesQuery'],
  attachments: ['attachmentsQuery'],
  notifications: ['notificationsQuery']
};

export function getEnterpriseInventoryLastUpdatedAt(queries: EnterpriseInventoryQueryRecord): number | null {
  const latest = Object.values(queries).reduce((currentLatest, query) => {
    const updatedAt = query?.dataUpdatedAt ?? 0;
    return Number.isFinite(updatedAt) && updatedAt > currentLatest ? updatedAt : currentLatest;
  }, 0);

  return latest > 0 ? latest : null;
}

export function getEnterpriseInventoryActiveTabQueryError(
  activeTab: string,
  queries: EnterpriseInventoryQueryRecord
): string | null {
  const queryNames = TAB_QUERY_MAP[activeTab] ?? [];
  const failedQueryName = queryNames.find((name) => queries[name]?.isError);

  if (!failedQueryName) {
    return null;
  }

  const label = failedQueryName.replace(/Query$/, '').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  return `Could not load ${label}: ${normalizeError(queries[failedQueryName]?.error, 'Request failed')}`;
}
