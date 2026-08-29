import type { ReactNode } from "react";
import type { TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import { getTenantFeatureEntitlement } from '../../lib/tenantSubscriptionAccess';
import { hasPermission } from '../../lib/permissions';
import {
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
} from '../ui/OperationalWorkspace';
import {
  EnterpriseInventoryHero,
  StatusMessages,
} from "./EnterpriseInventoryShared";
import { styles } from "./EnterpriseInventoryStyles";
import { useAppTranslation } from '../../i18n/I18nContext';
import { EnterpriseInventoryTabs } from "./EnterpriseInventoryTabs";
import {
  enterpriseInventoryPrimaryWritePermissions,
  enterpriseInventoryTabFeatures,
  enterpriseInventoryTabIconPaths,
  enterpriseInventoryTabs,
  type EnterpriseInventoryTabKey,
} from './EnterpriseInventoryTabConfig';

type EnterpriseInventoryPageLayoutProps = {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  statusMessage: string | null;
  errorMessage: string | null;
  lastRefreshedAt: number | null;
  onEvaluateParLevels: () => void;
  evaluatingParLevels: boolean;
  subscriptionAccess?: TenantSubscriptionAccess;
  canEvaluateParLevels: boolean;
  children: ReactNode;
};

export function EnterpriseInventoryPageLayout({
  activeTab,
  onActiveTabChange,
  statusMessage,
  errorMessage,
  lastRefreshedAt,
  onEvaluateParLevels,
  evaluatingParLevels,
  subscriptionAccess,
  canEvaluateParLevels,
  children,
}: EnterpriseInventoryPageLayoutProps) {
  const { ui } = useAppTranslation();
  const visibleTabs = enterpriseInventoryTabs.filter(([key, , permission]) => {
    if (!hasPermission(permission)) return false;
    const feature = enterpriseInventoryTabFeatures[key];
    if (!feature) return true;
    return getTenantFeatureEntitlement(subscriptionAccess, feature)?.allowed !== false;
  });
  const activeConfig = visibleTabs.find(([key]) => key === activeTab);
  const activeKey = activeConfig?.[0] as EnterpriseInventoryTabKey | undefined;
  const activeLabel = ui(activeConfig?.[1] ?? 'None');
  const activeWritePermission = activeKey ? enterpriseInventoryPrimaryWritePermissions[activeKey] : undefined;
  const canWriteActiveArea = activeWritePermission ? hasPermission(activeWritePermission) : false;

  return (
    <div className="inventory-controls-page io-operational-page io-workspace-page" style={styles.page}>
      <EnterpriseInventoryHero
        onEvaluateParLevels={onEvaluateParLevels}
        evaluating={evaluatingParLevels}
        canEvaluate={canEvaluateParLevels}
        lastRefreshedAt={lastRefreshedAt}
      />

      <StatusMessages
        statusMessage={statusMessage}
        errorMessage={errorMessage}
      />

      <OperationalWorkspaceStats ariaLabel={ui('Inventory controls summary')}>
        <OperationalWorkspaceStatCard
          label={ui('Available controls')}
          value={visibleTabs.length}
          helper={ui('Visible with your current tenant permissions')}
          tone="blue"
          iconPath="/enterprise-inventory"
        />
        <OperationalWorkspaceStatCard
          label={ui('Current workspace')}
          value={activeLabel}
          helper={ui('Selected specialized inventory control')}
          tone="neutral"
          iconPath={activeKey ? enterpriseInventoryTabIconPaths[activeKey] : '/enterprise-inventory'}
          className="inventory-controls-stat--text"
        />
        <OperationalWorkspaceStatCard
          label={ui('Action access')}
          value={canWriteActiveArea ? ui('Write enabled') : ui('Read only')}
          helper={canWriteActiveArea ? ui('Primary actions are available in this area') : ui('This area is available for review only')}
          tone={canWriteActiveArea ? 'good' : 'neutral'}
          iconPath="/permissions"
          className="inventory-controls-stat--text"
        />
      </OperationalWorkspaceStats>

      <EnterpriseInventoryTabs
        activeTab={activeTab}
        onChange={onActiveTabChange}
        subscriptionAccess={subscriptionAccess}
      />

      {!activeTab ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('No inventory controls available')}</h2>
          <p style={styles.helper}>
            {ui('Your current permissions do not include any of these specialized inventory controls.')}
          </p>
        </section>
      ) : children}
    </div>
  );
}
