import { CostControlTab } from "./tabs";
import { buildEnterpriseInventoryCostControlTabProps } from "./EnterpriseInventoryCostControlTabProps";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelDataProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryCostControlPanel({
  activeTab,
  pageData,
}: EnterpriseInventoryPanelDataProps) {
  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="cost-control">
      <CostControlTab {...buildEnterpriseInventoryCostControlTabProps(pageData)} />
    </EnterpriseInventoryTabPanel>
  );
}
