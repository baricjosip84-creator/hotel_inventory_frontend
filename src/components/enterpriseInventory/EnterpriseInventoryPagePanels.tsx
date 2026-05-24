import { EnterpriseInventoryCompliancePanels } from "./EnterpriseInventoryCompliancePanels";
import { EnterpriseInventoryGovernancePanels } from "./EnterpriseInventoryGovernancePanels";
import { EnterpriseInventoryOperationalPanels } from "./EnterpriseInventoryOperationalPanels";
import { EnterpriseInventoryMasterDataPanels } from "./EnterpriseInventoryMasterDataPanels";
import { EnterpriseInventoryProcurementPanels } from "./EnterpriseInventoryProcurementPanels";
import type { EnterpriseInventoryPagePanelsProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryPagePanels({
  activeTab,
  setActiveTab,
  actions,
  formState,
  pageData,
  refreshSystemContext,
}: EnterpriseInventoryPagePanelsProps) {
  const panelProps = { activeTab, actions, formState, pageData };

  return (
    <>
      <EnterpriseInventoryOperationalPanels {...panelProps} />

      <EnterpriseInventoryGovernancePanels
        {...panelProps}
        refreshSystemContext={refreshSystemContext}
      />

      <EnterpriseInventoryMasterDataPanels
        {...panelProps}
        setActiveTab={setActiveTab}
      />

      <EnterpriseInventoryProcurementPanels {...panelProps} />

      <EnterpriseInventoryCompliancePanels {...panelProps} />
    </>
  );
}
