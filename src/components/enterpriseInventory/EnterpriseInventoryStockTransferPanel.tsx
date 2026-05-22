import { StockTransfersTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryStockTransferPanelProps = EnterpriseInventoryPanelBaseProps;

export function EnterpriseInventoryStockTransferPanel({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryStockTransferPanelProps) {
  const { setStockTransferForm, stockTransferForm } = formState;
  const { queries, stableData, viewData } = pageData;
  const { stockTransfersQuery } = queries;
  const { products, storageLocations, stockTransfers } = stableData;
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
