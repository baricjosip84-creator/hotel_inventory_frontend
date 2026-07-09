import { StockTransfersTab } from "./tabs/StockTransfersTab";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryStockTransferPanel({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const { setStockTransferForm, stockTransferForm } = formState;
  const { queries, stableData, viewData } = pageData;
  const { stockTransfersQuery } = queries;
  const { products, storageLocations, stockItems, stockTransfers } = stableData;
  const { stockTransferSummary } = viewData;

  const {
    cancelStockTransferMutation,
    createStockTransferMutation,
    executeStockTransferMutation,
  } = actions;

  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="stock-transfers">
      <StockTransfersTab
        products={products}
        storageLocations={storageLocations}
        stockItems={stockItems}
        stockTransferForm={stockTransferForm}
        setStockTransferForm={setStockTransferForm}
        stockTransferSummary={stockTransferSummary}
        stockTransfers={stockTransfers}
        stockTransfersQuery={stockTransfersQuery}
        createStockTransferMutation={createStockTransferMutation}
        executeStockTransferMutation={executeStockTransferMutation}
        cancelStockTransferMutation={cancelStockTransferMutation}
      />
    </EnterpriseInventoryTabPanel>
  );
}
