import { styles } from './EnterpriseInventoryShared';

export const enterpriseInventoryTabs = [
  ['operations-dashboard', 'Dashboard'],
  ['par-levels', 'Par levels'],
  ['cycle-counts', 'Cycle counts'],
  ['stock-risk', 'Stock risk'],
  ['insights', 'Insights'],
  ['forecast', 'Forecast'],
  ['reports', 'Reports'],
  ['automation', 'Automation'],
  ['execution', 'Execution'],
  ['system-context', 'System context'],
  ['cost-control', 'Cost control'],
  ['stock-transfers', 'Transfers'],
  ['products', 'Products'],
  ['suppliers', 'Suppliers'],
  ['locations', 'Locations'],
  ['alerts', 'Alerts'],
  ['audit', 'Audit trail'],
  ['procurement-match', 'PO matching'],
  ['receiving', 'Receiving'],
  ['requisitions', 'Requisitions'],
  ['approvals', 'Approvals'],
  ['invoices', 'Invoices'],
  ['labels', 'Barcode labels'],
  ['packages', 'Product packages'],
  ['attachments', 'Attachments'],
  ['notifications', 'Notifications']
] as const;

export type EnterpriseInventoryTabKey = (typeof enterpriseInventoryTabs)[number][0];

type EnterpriseInventoryTabsProps = {
  activeTab: string;
  onChange: (tab: EnterpriseInventoryTabKey) => void;
};

export function EnterpriseInventoryTabs({ activeTab, onChange }: EnterpriseInventoryTabsProps) {
  return (
    <div style={styles.tabs}>
      {enterpriseInventoryTabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          style={activeTab === key ? styles.activeTab : styles.tab}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
