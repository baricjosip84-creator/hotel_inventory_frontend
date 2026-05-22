import { ForecastTab, InsightsTab, OperationsDashboardTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryOperationalAnalyticsPanelsProps = Pick<
  EnterpriseInventoryPanelBaseProps,
  "activeTab" | "pageData"
>;

export function EnterpriseInventoryOperationalAnalyticsPanels({
  activeTab,
  pageData,
}: EnterpriseInventoryOperationalAnalyticsPanelsProps) {
  const { queries, stableData, viewData } = pageData;

  const {
    dashboardLowStockQuery,
    dashboardOverdueShipmentsQuery,
    dashboardRecentActivityQuery,
    dashboardSupplierPerformanceQuery,
    dashboardUnresolvedAlertsQuery,
    demandForecastQuery,
    depletionRiskQuery,
    inventoryAnomaliesQuery,
    operationalHealthQuery,
    reorderRecommendationsQuery,
    supplierTrustScoresQuery,
  } = queries;

  const {
    dashboardLowStockRows,
    dashboardOverdueShipments,
    dashboardRecentActivity,
    dashboardSupplierPerformance,
    dashboardUnresolvedAlerts,
    depletionRiskRows,
    inventoryAnomalies,
    reorderRecommendations,
    supplierTrustScores,
  } = stableData;

  const { insightsSummary, operationsDashboardSummary } = viewData;

  return (
    <>
      <EnterpriseInventoryTabPanel
        activeTab={activeTab}
        tab="operations-dashboard"
      >
        <OperationsDashboardTab
          summary={operationsDashboardSummary}
          lowStockRows={dashboardLowStockRows}
          lowStockLoading={dashboardLowStockQuery.isLoading}
          overdueShipments={dashboardOverdueShipments}
          overdueShipmentsLoading={dashboardOverdueShipmentsQuery.isLoading}
          unresolvedAlerts={dashboardUnresolvedAlerts}
          unresolvedAlertsLoading={dashboardUnresolvedAlertsQuery.isLoading}
          recentActivity={dashboardRecentActivity}
          recentActivityLoading={dashboardRecentActivityQuery.isLoading}
          supplierPerformance={dashboardSupplierPerformance}
          supplierPerformanceLoading={
            dashboardSupplierPerformanceQuery.isLoading
          }
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="insights">
        <InsightsTab
          operationalHealth={operationalHealthQuery.data}
          operationalHealthLoading={operationalHealthQuery.isLoading}
          inventoryAnomalies={inventoryAnomalies}
          inventoryAnomaliesLoading={inventoryAnomaliesQuery.isLoading}
          reorderRecommendations={reorderRecommendations}
          reorderRecommendationsLoading={reorderRecommendationsQuery.isLoading}
          depletionRiskRows={depletionRiskRows}
          depletionRiskLoading={depletionRiskQuery.isLoading}
          supplierTrustScores={supplierTrustScores}
          supplierTrustScoresLoading={supplierTrustScoresQuery.isLoading}
          insightsSummary={insightsSummary}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="forecast">
        <ForecastTab
          demandForecastRows={demandForecastQuery.data ?? []}
          isLoading={demandForecastQuery.isLoading}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
