import { EnterpriseInventoryOperationalAnalyticsPanels } from "./EnterpriseInventoryOperationalAnalyticsPanels";
import { EnterpriseInventoryStockOperationsPanels } from "./EnterpriseInventoryStockOperationsPanels";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryOperationalPanels(props: EnterpriseInventoryPanelBaseProps) {
  const { activeTab, pageData } = props;

  return (
    <>
      <EnterpriseInventoryOperationalAnalyticsPanels
        activeTab={activeTab}
        pageData={pageData}
      />

      <EnterpriseInventoryStockOperationsPanels {...props} />
    </>
  );
}
