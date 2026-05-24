import { EnterpriseInventoryProcurementReceivingPanels } from "./EnterpriseInventoryProcurementReceivingPanels";
import { EnterpriseInventoryProcurementWorkflowPanels } from "./EnterpriseInventoryProcurementWorkflowPanels";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryProcurementPanels(props: EnterpriseInventoryPanelBaseProps) {
  return (
    <>
      <EnterpriseInventoryProcurementReceivingPanels {...props} />
      <EnterpriseInventoryProcurementWorkflowPanels {...props} />
    </>
  );
}
