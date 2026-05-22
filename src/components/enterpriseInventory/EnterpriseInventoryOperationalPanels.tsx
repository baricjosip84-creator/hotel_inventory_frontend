import { EnterpriseInventoryOperationalAnalyticsPanels } from "./EnterpriseInventoryOperationalAnalyticsPanels";
import { EnterpriseInventoryStockOperationsPanels } from "./EnterpriseInventoryStockOperationsPanels";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryOperationalPanelsProps = EnterpriseInventoryPanelBaseProps;

export function EnterpriseInventoryOperationalPanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryOperationalPanelsProps) {
  return (
    <>
      <EnterpriseInventoryOperationalAnalyticsPanels
        activeTab={activeTab}
        pageData={pageData}
      />

      <EnterpriseInventoryStockOperationsPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />
    </>
  );
}
