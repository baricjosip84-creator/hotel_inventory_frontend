import { EnterpriseInventoryCatalogPanels } from "./EnterpriseInventoryCatalogPanels";
import { EnterpriseInventoryStockTransferPanel } from "./EnterpriseInventoryStockTransferPanel";
import type { EnterpriseInventoryPanelWithNavigationProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryMasterDataPanels(
  props: EnterpriseInventoryPanelWithNavigationProps,
) {
  return (
    <>
      <EnterpriseInventoryStockTransferPanel {...props} />
      <EnterpriseInventoryCatalogPanels {...props} />
    </>
  );
}
