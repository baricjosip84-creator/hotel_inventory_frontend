import {
  useStableArray,
  useStableFieldArray,
  useStableRows,
  useStableSnapshotRows,
} from './EnterpriseInventoryQueryData';
import type { useEnterpriseInventoryQueries } from './EnterpriseInventoryQueries';
import type { ExecutionAdapter } from './EnterpriseInventoryTypes';

type EnterpriseInventoryQueriesResult = ReturnType<typeof useEnterpriseInventoryQueries>;

type EnterpriseInventoryStableDataInput = Pick<
  EnterpriseInventoryQueriesResult,
  | 'productsQuery'
  | 'storageLocationsQuery'
  | 'suppliersQuery'
  | 'availableSuppliersQuery'
  | 'supplierSlaBreachesQuery'
  | 'lowStockQuery'
  | 'stockMovementsQuery'
  | 'dashboardLowStockQuery'
  | 'dashboardOverdueShipmentsQuery'
  | 'dashboardUnresolvedAlertsQuery'
  | 'dashboardRecentActivityQuery'
  | 'dashboardSupplierPerformanceQuery'
  | 'reorderRecommendationsQuery'
  | 'depletionRiskQuery'
  | 'supplierTrustScoresQuery'
  | 'inventoryAnomaliesQuery'
  | 'systemContextSnapshotsQuery'
  | 'automationSchedulesQuery'
  | 'automationRunEventsQuery'
  | 'automationRunnerSafetyReportQuery'
  | 'automationRunnerGovernancePackQuery'
  | 'automationRunnerOperationsReviewQuery'
  | 'automationRunnerPolicyMatrixQuery'
  | 'automationRunnerAccountabilityDigestQuery'
  | 'executionRequestsQuery'
  | 'executionAdaptersQuery'
  | 'stockTransfersQuery'
  | 'purchaseOrdersQuery'
  | 'shipmentsQuery'
  | 'alertsQuery'
  | 'auditLogsQuery'
  | 'shipmentItemsQuery'
>;

export function useEnterpriseInventoryStableData({
  productsQuery,
  storageLocationsQuery,
  suppliersQuery,
  availableSuppliersQuery,
  supplierSlaBreachesQuery,
  lowStockQuery,
  stockMovementsQuery,
  dashboardLowStockQuery,
  dashboardOverdueShipmentsQuery,
  dashboardUnresolvedAlertsQuery,
  dashboardRecentActivityQuery,
  dashboardSupplierPerformanceQuery,
  reorderRecommendationsQuery,
  depletionRiskQuery,
  supplierTrustScoresQuery,
  inventoryAnomaliesQuery,
  systemContextSnapshotsQuery,
  automationSchedulesQuery,
  automationRunEventsQuery,
  automationRunnerSafetyReportQuery,
  automationRunnerGovernancePackQuery,
  automationRunnerOperationsReviewQuery,
  automationRunnerPolicyMatrixQuery,
  automationRunnerAccountabilityDigestQuery,
  executionRequestsQuery,
  executionAdaptersQuery,
  stockTransfersQuery,
  purchaseOrdersQuery,
  shipmentsQuery,
  alertsQuery,
  auditLogsQuery,
  shipmentItemsQuery,
}: EnterpriseInventoryStableDataInput) {
  return {
    products: useStableArray(productsQuery.data),
    storageLocations: useStableArray(storageLocationsQuery.data),
    suppliers: useStableArray(suppliersQuery.data),
    availableSuppliers: useStableArray(availableSuppliersQuery.data),
    supplierSlaBreaches: useStableArray(supplierSlaBreachesQuery.data),
    lowStockItems: useStableArray(lowStockQuery.data),
    recentStockMovements: useStableArray(stockMovementsQuery.data),
    dashboardLowStockRows: useStableArray(dashboardLowStockQuery.data),
    dashboardOverdueShipments: useStableArray(dashboardOverdueShipmentsQuery.data),
    dashboardUnresolvedAlerts: useStableArray(dashboardUnresolvedAlertsQuery.data),
    dashboardRecentActivity: useStableArray(dashboardRecentActivityQuery.data),
    dashboardSupplierPerformance: useStableArray(dashboardSupplierPerformanceQuery.data),
    reorderRecommendations: useStableRows(reorderRecommendationsQuery.data),
    depletionRiskRows: useStableRows(depletionRiskQuery.data),
    supplierTrustScores: useStableRows(supplierTrustScoresQuery.data),
    inventoryAnomalies: useStableRows(inventoryAnomaliesQuery.data),
    systemContextSnapshots: useStableSnapshotRows(systemContextSnapshotsQuery.data),
    automationSchedules: useStableRows(automationSchedulesQuery.data),
    automationRunEvents: useStableRows(automationRunEventsQuery.data),
    automationRunnerSafetyChecks: useStableFieldArray<Record<string, unknown>, 'checks'>(
      automationRunnerSafetyReportQuery.data,
      'checks',
    ),
    automationRunnerGovernanceChecks: useStableFieldArray<Record<string, unknown>, 'checks'>(
      automationRunnerGovernancePackQuery.data,
      'checks',
    ),
    automationRunnerOperationsChecks: useStableFieldArray<Record<string, unknown>, 'checks'>(
      automationRunnerOperationsReviewQuery.data,
      'checks',
    ),
    automationRunnerPolicyRows: useStableFieldArray<Record<string, unknown>, 'policy_rows'>(
      automationRunnerPolicyMatrixQuery.data,
      'policy_rows',
    ),
    automationRunnerActorBreakdown: useStableFieldArray<Record<string, unknown>, 'actor_breakdown'>(
      automationRunnerAccountabilityDigestQuery.data,
      'actor_breakdown',
    ),
    automationRunnerRequestBreakdown: useStableFieldArray<
      Record<string, unknown>,
      'request_status_breakdown'
    >(automationRunnerAccountabilityDigestQuery.data, 'request_status_breakdown'),
    automationRunnerDueSchedules: useStableFieldArray<Record<string, unknown>, 'due_schedules'>(
      automationRunnerGovernancePackQuery.data,
      'due_schedules',
    ),
    automationRunnerLinkedRequests: useStableFieldArray<
      Record<string, unknown>,
      'linked_schedule_requests'
    >(automationRunnerGovernancePackQuery.data, 'linked_schedule_requests'),
    executionRequests: useStableRows(executionRequestsQuery.data),
    executionAdapters: useStableFieldArray<ExecutionAdapter, 'adapters'>(
      executionAdaptersQuery.data,
      'adapters',
    ),
    stockTransfers: useStableArray(stockTransfersQuery.data),
    purchaseOrders: useStableArray(purchaseOrdersQuery.data),
    shipments: useStableArray(shipmentsQuery.data),
    alerts: useStableArray(alertsQuery.data),
    auditLogs: useStableArray(auditLogsQuery.data),
    selectedShipmentItems: useStableArray(shipmentItemsQuery.data),
  };
}
