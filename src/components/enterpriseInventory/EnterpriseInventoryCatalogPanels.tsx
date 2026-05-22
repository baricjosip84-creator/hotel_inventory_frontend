import { EnterpriseInventoryCatalogCorePanels } from "./EnterpriseInventoryCatalogCorePanels";
import { EnterpriseInventoryCatalogSupportPanels } from "./EnterpriseInventoryCatalogSupportPanels";
import type {
  EnterpriseInventoryPanelBaseProps,
  EnterpriseInventoryPanelNavigationProps,
} from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryCatalogPanelsProps = EnterpriseInventoryPanelBaseProps &
  EnterpriseInventoryPanelNavigationProps;

export function EnterpriseInventoryCatalogPanels({
  activeTab,
  setActiveTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryCatalogPanelsProps) {
  return (
    <>
      <EnterpriseInventoryCatalogCorePanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
        setActiveTab={setActiveTab}
      />

      <EnterpriseInventoryCatalogSupportPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />
    </>
  );
}
