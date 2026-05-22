import { EnterpriseInventoryCatalogPanels } from "./EnterpriseInventoryCatalogPanels";
import { EnterpriseInventoryStockTransferPanel } from "./EnterpriseInventoryStockTransferPanel";
import type {
  EnterpriseInventoryPanelBaseProps,
  EnterpriseInventoryPanelNavigationProps,
} from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryMasterDataPanelsProps = EnterpriseInventoryPanelBaseProps &
  EnterpriseInventoryPanelNavigationProps;

export function EnterpriseInventoryMasterDataPanels({
  activeTab,
  setActiveTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryMasterDataPanelsProps) {
  return (
    <>
      <EnterpriseInventoryStockTransferPanel
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />

      <EnterpriseInventoryCatalogPanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />
    </>
  );
}
