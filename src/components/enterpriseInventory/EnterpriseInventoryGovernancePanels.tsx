import { EnterpriseInventoryAutomationPanel } from "./EnterpriseInventoryAutomationPanel";
import { EnterpriseInventoryCostControlPanel } from "./EnterpriseInventoryCostControlPanel";
import { EnterpriseInventoryExecutionSystemPanels } from "./EnterpriseInventoryExecutionSystemPanels";
import { EnterpriseInventoryReportsPanel } from "./EnterpriseInventoryReportsPanel";
import type { EnterpriseInventoryPanelWithSystemContextProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryGovernancePanels({
  activeTab,
  actions,
  formState,
  pageData,
  refreshSystemContext,
}: EnterpriseInventoryPanelWithSystemContextProps) {
  const panelProps = { activeTab, actions, formState, pageData };
  const dataPanelProps = { activeTab, pageData };

  return (
    <>
      <EnterpriseInventoryExecutionSystemPanels
        {...panelProps}
        refreshSystemContext={refreshSystemContext}
      />

      <EnterpriseInventoryAutomationPanel {...panelProps} />
      <EnterpriseInventoryReportsPanel {...dataPanelProps} />
      <EnterpriseInventoryCostControlPanel {...dataPanelProps} />
    </>
  );
}
