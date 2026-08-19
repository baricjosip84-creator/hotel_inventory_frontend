import { hasPermission } from '../../lib/permissions';
import { getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import { styles } from './EnterpriseInventoryStyles';
import { enterpriseInventoryTabFeatures, enterpriseInventoryTabs, type EnterpriseInventoryTabKey } from './EnterpriseInventoryTabConfig';

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
    <div style={styles.tabs}>
      {visibleTabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          style={activeTab === key ? styles.activeTab : styles.tab}
          onClick={() => onChange(key)}
          title={label}
          data-skip-global-action-feedback="true"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
