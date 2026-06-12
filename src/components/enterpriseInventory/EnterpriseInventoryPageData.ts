import { useProductCostDerivedData } from './EnterpriseInventoryCostData';
import { useEnterpriseInventoryStableData } from './EnterpriseInventoryStableData';
import { useEnterpriseInventoryViewData } from './EnterpriseInventoryViewData';
import { useEnterpriseInventoryQueries } from './EnterpriseInventoryQueries';

type EnterpriseInventoryQueriesParams = Parameters<typeof useEnterpriseInventoryQueries>[0];

export function useEnterpriseInventoryPageData(params: EnterpriseInventoryQueriesParams) {
  const queries = useEnterpriseInventoryQueries(params);

  const stableData = useEnterpriseInventoryStableData(queries);

  const costData = useProductCostDerivedData({
    productCostRiskSummaryQuery: queries.productCostRiskSummaryQuery,
    productCostValuationSummaryQuery: queries.productCostValuationSummaryQuery,
    productCostValuationDetailsQuery: queries.productCostValuationDetailsQuery,
    productCostActionSummaryQuery: queries.productCostActionSummaryQuery,
    productCostActionPlanSummaryQuery: queries.productCostActionPlanSummaryQuery,
    productCostActionCategorySummaryQuery: queries.productCostActionCategorySummaryQuery,
    productCostActionImpactSummaryQuery: queries.productCostActionImpactSummaryQuery,
    productCostActionSupplierSummaryQuery: queries.productCostActionSupplierSummaryQuery,
    productCostActionSourceSummaryQuery: queries.productCostActionSourceSummaryQuery,
    productCostActionAgeSummaryQuery: queries.productCostActionAgeSummaryQuery,
    productCostActionCoverageSummaryQuery: queries.productCostActionCoverageSummaryQuery,
    productCostAlertSummaryQuery: queries.productCostAlertSummaryQuery,
    productCostRecommendationSummaryQuery: queries.productCostRecommendationSummaryQuery,
    productCostDashboardSummaryQuery: queries.productCostDashboardSummaryQuery,
    productCostGovernanceSummaryQuery: queries.productCostGovernanceSummaryQuery,
    productCostGovernanceDetailsQuery: queries.productCostGovernanceDetailsQuery,
    productCostGovernanceAuditPackQuery: queries.productCostGovernanceAuditPackQuery,
    productCostGovernanceSignoffSummaryQuery: queries.productCostGovernanceSignoffSummaryQuery,
    productCostGovernanceReviewQueueQuery: queries.productCostGovernanceReviewQueueQuery,
    productCostGovernanceReviewPackQuery: queries.productCostGovernanceReviewPackQuery,
    productCostGovernanceClosureSummaryQuery: queries.productCostGovernanceClosureSummaryQuery,
    productCostGovernanceHandoffSummaryQuery: queries.productCostGovernanceHandoffSummaryQuery,
    productCostHardeningSummaryQuery: queries.productCostHardeningSummaryQuery,
    productCostOperationsRunbookSummaryQuery: queries.productCostOperationsRunbookSummaryQuery,
    productCostOperationsControlSummaryQuery: queries.productCostOperationsControlSummaryQuery,
    productCostOperationsEvidenceSummaryQuery: queries.productCostOperationsEvidenceSummaryQuery,
    productCostOperationsReadinessSummaryQuery: queries.productCostOperationsReadinessSummaryQuery,
    carryingCostProductionReviewQuery: queries.carryingCostProductionReviewQuery,
    deadStockProductionReviewQuery: queries.deadStockProductionReviewQuery,
    marginAwareProductionReviewQuery: queries.marginAwareProductionReviewQuery,
    procurementSpendProductionReviewQuery: queries.procurementSpendProductionReviewQuery,
  });

  const viewData = useEnterpriseInventoryViewData({
    alerts: stableData.alerts,
    cycleCounts: queries.cycleCountsQuery.data ?? [],
    dashboardSummary: queries.dashboardSummaryQuery.data,
    depletionRiskRows: stableData.depletionRiskRows,
    inventoryAnomalies: stableData.inventoryAnomalies,
    invoices: queries.invoicesQuery.data ?? [],
    lowStockItems: stableData.lowStockItems,
    productPackages: queries.productPackagesQuery.data,
    purchaseOrders: stableData.purchaseOrders,
    requisitions: queries.requisitionsQuery.data ?? [],
    reorderRecommendations: stableData.reorderRecommendations,
    selectedShipmentId: params.shipmentReceivingShipmentId,
    selectedShipmentItems: stableData.selectedShipmentItems,
    shipments: stableData.shipments,
    stockTransfers: stableData.stockTransfers,
    suppliers: stableData.suppliers,
    supplierTrustScores: stableData.supplierTrustScores,
  });

  return {
    costData,
    queries,
    stableData,
    viewData,
  };
}
