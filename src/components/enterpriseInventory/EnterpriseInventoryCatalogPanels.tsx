import { EnterpriseInventoryCatalogCorePanels } from "./EnterpriseInventoryCatalogCorePanels";
import { EnterpriseInventoryCatalogSupportPanels } from "./EnterpriseInventoryCatalogSupportPanels";
import type { EnterpriseInventoryPanelWithNavigationProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryCatalogPanels(
  props: EnterpriseInventoryPanelWithNavigationProps,
) {
  const { activeTab, actions, formState, pageData } = props;
  const supportPanelProps = { activeTab, actions, formState, pageData };

  return (
    <>
      <EnterpriseInventoryCatalogCorePanels {...props} />
      <EnterpriseInventoryCatalogSupportPanels {...supportPanelProps} />
    </>
  );
}
