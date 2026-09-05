import { hasPermission } from '../../lib/permissions';
import { getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import {
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs,
} from '../ui/OperationalWorkspace';
import { useAppTranslation } from '../../i18n/I18nContext';
import { useOperationalAttentionItems } from '../../lib/sidebarAttentionItems';
import { SidebarAttentionTabDot } from '../ui/SidebarAttentionMarker';
import {
  enterpriseInventoryTabFeatures,
  enterpriseInventoryTabIconPaths,
  enterpriseInventoryTabs,
  type EnterpriseInventoryTabKey,
} from './EnterpriseInventoryTabConfig';

type EnterpriseInventoryTabsProps = {
  activeTab: string;
  onChange: (tab: EnterpriseInventoryTabKey) => void;
  subscriptionAccess?: TenantSubscriptionAccess;
};

export function EnterpriseInventoryTabs({ activeTab, onChange, subscriptionAccess }: EnterpriseInventoryTabsProps) {
  const { ui } = useAppTranslation();
  const visibleTabs = enterpriseInventoryTabs.filter(([key, , permission]) => {
    if (!hasPermission(permission)) return false;
    const feature = enterpriseInventoryTabFeatures[key];
    if (!feature) return true;
    return getTenantFeatureEntitlement(subscriptionAccess, feature)?.allowed !== false;
  });
  const inventoryAttentionQuery = useOperationalAttentionItems(
    'inventory_controls',
    visibleTabs.some(([key]) => ['approvals', 'cycle-counts', 'supplier-returns', 'invoices'].includes(key))
  );
  const attention = inventoryAttentionQuery.data;
  const tabNeedsAttention = (key: EnterpriseInventoryTabKey) => {
    if (key === 'approvals') return Boolean(attention?.approval_item_keys?.length);
    if (key === 'cycle-counts') return Boolean(attention?.cycle_count_reconcile_ids?.length);
    if (key === 'supplier-returns') return Boolean(attention?.supplier_return_approval_ids?.length || attention?.supplier_return_dispatch_ids?.length);
    if (key === 'invoices') return Boolean(attention?.invoice_match_ids?.length || attention?.invoice_payment_due_ids?.length);
    return false;
  };

  return (
    <OperationalWorkspaceTabs
      ariaLabel={ui('Inventory control work areas')}
    >
      {visibleTabs.map(([key, label]) => (
        <OperationalWorkspaceTab
          key={key}
          active={activeTab === key}
          iconPath={enterpriseInventoryTabIconPaths[key]}
          label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{ui(label)}{tabNeedsAttention(key) ? <SidebarAttentionTabDot label={ui('Attention required')} /> : null}</span>}
          onClick={() => onChange(key)}
          title={ui(label)}
          data-skip-global-action-feedback="true"
        />
      ))}
    </OperationalWorkspaceTabs>
  );
}
