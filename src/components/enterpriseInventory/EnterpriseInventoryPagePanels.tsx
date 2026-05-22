import { EnterpriseInventoryCompliancePanels } from "./EnterpriseInventoryCompliancePanels";
import { EnterpriseInventoryGovernancePanels } from "./EnterpriseInventoryGovernancePanels";
import { EnterpriseInventoryOperationalPanels } from "./EnterpriseInventoryOperationalPanels";
import { EnterpriseInventoryMasterDataPanels } from "./EnterpriseInventoryMasterDataPanels";
import { EnterpriseInventoryProcurementPanels } from "./EnterpriseInventoryProcurementPanels";
import type {
  EnterpriseInventoryPanelBaseProps,
  EnterpriseInventoryPanelNavigationProps,
  EnterpriseInventorySystemContextRefreshProps,
} from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryPagePanelsProps = EnterpriseInventoryPanelBaseProps &
  EnterpriseInventoryPanelNavigationProps &
  EnterpriseInventorySystemContextRefreshProps;

export function EnterpriseInventoryPagePanels({
  activeTab,
  setActiveTab,
  actions,
  formState,
  pageData,
  refreshSystemContext,
}: EnterpriseInventoryPagePanelsProps) {
  return (
    <>
      <EnterpriseInventoryOperationalPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />

      <EnterpriseInventoryGovernancePanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
        refreshSystemContext={refreshSystemContext}
      />

      <EnterpriseInventoryMasterDataPanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />

      <EnterpriseInventoryProcurementPanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />

      <EnterpriseInventoryCompliancePanels
        activeTab={activeTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
      />
    </>
  );
}
