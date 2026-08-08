import { hasPermission, type TenantPermission } from '../../lib/permissions';
import { getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import { styles } from './EnterpriseInventoryStyles';
import { enterpriseInventoryTabFeatures, enterpriseInventoryTabs, type EnterpriseInventoryTabKey } from './EnterpriseInventoryTabConfig';

type EnterpriseInventoryTabsProps = {
  activeTab: string;
  onChange: (tab: EnterpriseInventoryTabKey) => void;
  subscriptionAccess?: TenantSubscriptionAccess;
};

function permissionLabel(permission: TenantPermission): string {
  return permission;
}

export function EnterpriseInventoryTabs({ activeTab, onChange, subscriptionAccess }: EnterpriseInventoryTabsProps) {
  const isFeatureBlocked = (key: EnterpriseInventoryTabKey): boolean => {
    const feature = enterpriseInventoryTabFeatures[key];
    if (!feature) return false;
    return getTenantFeatureEntitlement(subscriptionAccess, feature)?.allowed === false;
  };

  const hasLockedTabs = enterpriseInventoryTabs.some(([key, , permission]) => !hasPermission(permission) || isFeatureBlocked(key));

  return (
    <>
      <div style={styles.tabs}>
        {enterpriseInventoryTabs.map(([key, label, permission]) => {
          const feature = enterpriseInventoryTabFeatures[key];
          const featureEntitlement = feature ? getTenantFeatureEntitlement(subscriptionAccess, feature) : null;
          const featureBlocked = featureEntitlement?.allowed === false;
          const canOpenTab = hasPermission(permission) && !featureBlocked;
          const disabledTitle = !hasPermission(permission)
            ? `Requires ${permissionLabel(permission)} permission.`
            : featureBlocked
              ? featureEntitlement?.reason || `${label} is not available for this tenant subscription.`
              : label;

          return (
            <button
              key={key}
              type="button"
              style={activeTab === key ? styles.activeTab : canOpenTab ? styles.tab : styles.disabledTab}
              onClick={() => {
                if (canOpenTab) onChange(key);
              }}
              disabled={!canOpenTab}
              aria-disabled={!canOpenTab}
              title={canOpenTab ? label : disabledTitle}
              data-skip-global-action-feedback="true"
            >
              {label}
            </button>
          );
        })}
      </div>
      {hasLockedTabs ? (
        <p style={styles.helper}>
          Some Enterprise Inventory tabs are disabled because of permissions or tenant subscription access.
        </p>
      ) : null}
    </>
  );
}
