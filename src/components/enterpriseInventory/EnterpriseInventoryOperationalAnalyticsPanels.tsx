import { ForecastTab } from "./tabs/ForecastTab";
import { InsightsTab } from "./tabs/InsightsTab";
import { OperationsDashboardTab } from "./tabs/OperationsDashboardTab";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelDataProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryOperationalAnalyticsPanels({
  activeTab,
  pageData,
}: EnterpriseInventoryPanelDataProps) {
  const { queries, stableData, viewData } = pageData;

  const {
    dashboardLowStockQuery,
    dashboardOverdueShipmentsQuery,
    dashboardRecentActivityQuery,
    dashboardSupplierPerformanceQuery,
    dashboardUnresolvedAlertsQuery,
    stockOverviewQuery,
    demandForecastQuery,
    forecastAccuracyBacktestQuery,
    forecastCalibrationReviewQuery,
    forecastDataQualityReviewQuery,
    forecastReliabilityMatrixQuery,
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
          currentStockRows={stockOverviewQuery.data ?? []}
          currentStockLoading={stockOverviewQuery.isLoading}
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
          forecastAccuracyBacktest={forecastAccuracyBacktestQuery.data}
          forecastCalibrationReview={forecastCalibrationReviewQuery.data}
          forecastDataQualityReview={forecastDataQualityReviewQuery.data}
          forecastReliabilityMatrix={forecastReliabilityMatrixQuery.data}
          accuracyLoading={forecastAccuracyBacktestQuery.isLoading}
          calibrationLoading={forecastCalibrationReviewQuery.isLoading}
          dataQualityLoading={forecastDataQualityReviewQuery.isLoading}
          reliabilityLoading={forecastReliabilityMatrixQuery.isLoading}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
