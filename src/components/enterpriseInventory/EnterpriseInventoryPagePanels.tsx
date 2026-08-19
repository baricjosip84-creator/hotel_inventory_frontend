import { EnterpriseInventoryCatalogSupportPanels } from './EnterpriseInventoryCatalogSupportPanels';
import { EnterpriseInventoryCompliancePanels } from './EnterpriseInventoryCompliancePanels';
import { EnterpriseInventoryProcurementWorkflowPanels } from './EnterpriseInventoryProcurementWorkflowPanels';
import { EnterpriseInventoryStockOperationsPanels } from './EnterpriseInventoryStockOperationsPanels';
import type { EnterpriseInventoryPagePanelsProps } from './EnterpriseInventoryPanelTypes';

export function EnterpriseInventoryPagePanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPagePanelsProps) {
  const panelProps = { activeTab, actions, formState, pageData };

  return (
    <>
      <EnterpriseInventoryStockOperationsPanels {...panelProps} />
      <EnterpriseInventoryProcurementWorkflowPanels {...panelProps} />
      <EnterpriseInventoryCatalogSupportPanels {...panelProps} />
      <EnterpriseInventoryCompliancePanels {...panelProps} />
    </>
  );
}
