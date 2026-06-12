import { CostControlTab } from "./tabs/CostControlTab";
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
