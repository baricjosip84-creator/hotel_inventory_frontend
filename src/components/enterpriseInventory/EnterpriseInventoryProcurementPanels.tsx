import { EnterpriseInventoryProcurementReceivingPanels } from "./EnterpriseInventoryProcurementReceivingPanels";
import { EnterpriseInventoryProcurementWorkflowPanels } from "./EnterpriseInventoryProcurementWorkflowPanels";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryProcurementPanelsProps = EnterpriseInventoryPanelBaseProps;

export function EnterpriseInventoryProcurementPanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryProcurementPanelsProps) {
  return (
    <>
      <EnterpriseInventoryProcurementReceivingPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />
      <EnterpriseInventoryProcurementWorkflowPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />
    </>
  );
}
