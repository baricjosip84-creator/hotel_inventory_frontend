import { hasPermission, type TenantPermission } from '../../lib/permissions';
import { styles } from './EnterpriseInventoryStyles';
import { enterpriseInventoryTabs, type EnterpriseInventoryTabKey } from './EnterpriseInventoryTabConfig';

type EnterpriseInventoryTabsProps = {
  activeTab: string;
  onChange: (tab: EnterpriseInventoryTabKey) => void;
};

function permissionLabel(permission: TenantPermission): string {
  return permission;
}

export function EnterpriseInventoryTabs({ activeTab, onChange }: EnterpriseInventoryTabsProps) {
  const hasLockedTabs = enterpriseInventoryTabs.some(([, , permission]) => !hasPermission(permission));

  return (
    <>
      <div style={styles.tabs}>
        {enterpriseInventoryTabs.map(([key, label, permission]) => {
          const canOpenTab = hasPermission(permission);
          const disabledTitle = `Requires ${permissionLabel(permission)} permission.`;

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
          Some Enterprise Inventory tabs are disabled because your role does not include the required read permission.
        </p>
      ) : null}
    </>
  );
}
