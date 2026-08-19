import { hasPermission } from '../../lib/permissions';
import { getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import {
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs,
} from '../ui/OperationalWorkspace';
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
  const visibleTabs = enterpriseInventoryTabs.filter(([key, , permission]) => {
    if (!hasPermission(permission)) return false;
    const feature = enterpriseInventoryTabFeatures[key];
    if (!feature) return true;
    return getTenantFeatureEntitlement(subscriptionAccess, feature)?.allowed !== false;
  });

  return (
    <OperationalWorkspaceTabs
      ariaLabel="Inventory control work areas"
      hint="Choose the specialized inventory control you need."
    >
      {visibleTabs.map(([key, label]) => (
        <OperationalWorkspaceTab
          key={key}
          active={activeTab === key}
          iconPath={enterpriseInventoryTabIconPaths[key]}
          label={label}
          onClick={() => onChange(key)}
          title={label}
          data-skip-global-action-feedback="true"
        />
      ))}
    </OperationalWorkspaceTabs>
  );
}
