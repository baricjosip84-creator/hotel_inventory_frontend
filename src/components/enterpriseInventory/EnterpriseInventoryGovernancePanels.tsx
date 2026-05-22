import { EnterpriseInventoryAutomationPanel } from "./EnterpriseInventoryAutomationPanel";
import { EnterpriseInventoryCostControlPanel } from "./EnterpriseInventoryCostControlPanel";
import { EnterpriseInventoryExecutionSystemPanels } from "./EnterpriseInventoryExecutionSystemPanels";
import { EnterpriseInventoryReportsPanel } from "./EnterpriseInventoryReportsPanel";
import type {
  EnterpriseInventoryPanelBaseProps,
  EnterpriseInventorySystemContextRefreshProps,
} from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryGovernancePanelsProps =
  EnterpriseInventoryPanelBaseProps &
    EnterpriseInventorySystemContextRefreshProps;

export function EnterpriseInventoryGovernancePanels({
  activeTab,
  actions,
  formState,
  pageData,
  refreshSystemContext,
}: EnterpriseInventoryGovernancePanelsProps) {
  return (
    <>
      <EnterpriseInventoryExecutionSystemPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
        refreshSystemContext={refreshSystemContext}
      />

      <EnterpriseInventoryAutomationPanel
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />

      <EnterpriseInventoryReportsPanel
        activeTab={activeTab}
        pageData={pageData}
      />

      <EnterpriseInventoryCostControlPanel
        activeTab={activeTab}
        pageData={pageData}
      />
    </>
  );
}
