import { CostControlTab } from "./tabs";
import { buildEnterpriseInventoryCostControlTabProps } from "./EnterpriseInventoryCostControlTabProps";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryCostControlPanelProps = Pick<
  EnterpriseInventoryPanelBaseProps,
  "activeTab" | "pageData"
>;

export function EnterpriseInventoryCostControlPanel({
  activeTab,
  pageData,
}: EnterpriseInventoryCostControlPanelProps) {
  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="cost-control">
      <CostControlTab {...buildEnterpriseInventoryCostControlTabProps(pageData)} />
    </EnterpriseInventoryTabPanel>
  );
}
