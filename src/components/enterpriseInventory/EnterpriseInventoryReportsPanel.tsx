import { ReportsTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelDataProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryReportsPanel({
  activeTab,
  pageData,
}: EnterpriseInventoryPanelDataProps) {
  const {
    inventoryValuationReportQuery,
    stockByLocationReportQuery,
    productMovementReportQuery,
    procurementSummaryReportQuery,
  } = pageData.queries;

  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="reports">
      <ReportsTab
        inventoryValuationReport={inventoryValuationReportQuery.data}
        inventoryValuationLoading={inventoryValuationReportQuery.isLoading}
        stockByLocationRows={stockByLocationReportQuery.data ?? []}
        stockByLocationLoading={stockByLocationReportQuery.isLoading}
        productMovementRows={productMovementReportQuery.data ?? []}
        productMovementLoading={productMovementReportQuery.isLoading}
        procurementSummaryReport={procurementSummaryReportQuery.data}
        procurementSummaryLoading={procurementSummaryReportQuery.isLoading}
      />
    </EnterpriseInventoryTabPanel>
  );
}
