import { ReportsTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryReportsPanelProps = Pick<
  EnterpriseInventoryPanelBaseProps,
  "activeTab" | "pageData"
>;

export function EnterpriseInventoryReportsPanel({
  activeTab,
  pageData,
}: EnterpriseInventoryReportsPanelProps) {
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
