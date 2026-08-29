import { hasPermission } from '../../lib/permissions';
import { getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import {
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs,
} from '../ui/OperationalWorkspace';
import { useAppTranslation } from '../../i18n/I18nContext';
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

  return (
    <OperationalWorkspaceTabs
      ariaLabel={ui('Inventory control work areas')}
    >
      {visibleTabs.map(([key, label]) => (
        <OperationalWorkspaceTab
          key={key}
          active={activeTab === key}
          iconPath={enterpriseInventoryTabIconPaths[key]}
          label={ui(label)}
          onClick={() => onChange(key)}
          title={ui(label)}
          data-skip-global-action-feedback="true"
        />
      ))}
    </OperationalWorkspaceTabs>
  );
}
