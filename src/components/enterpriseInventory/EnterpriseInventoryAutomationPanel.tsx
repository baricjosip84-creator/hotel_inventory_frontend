import { AutomationTab } from './tabs/AutomationTab';
import { buildEnterpriseInventoryAutomationTabProps } from './EnterpriseInventoryAutomationTabProps';
import { EnterpriseInventoryTabPanel } from './EnterpriseInventoryTabPanel';
import type { EnterpriseInventoryPanelBaseProps } from './EnterpriseInventoryPanelTypes';

export function EnterpriseInventoryAutomationPanel({
  activeTab,
  actions,
  formState,
  pageData
}: EnterpriseInventoryPanelBaseProps) {
  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="automation">
      <AutomationTab
        {...buildEnterpriseInventoryAutomationTabProps({
          actions,
          formState,
          pageData
        })}
      />
    </EnterpriseInventoryTabPanel>
  );
}
