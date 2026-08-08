import type { ReactNode } from "react";
import type { TenantSubscriptionAccess } from '../../lib/tenantSubscriptionAccess';
import {
  EnterpriseInventoryHero,
  StatusMessages,
} from "./EnterpriseInventoryShared";
import { styles } from "./EnterpriseInventoryStyles";
import { EnterpriseInventoryTabs } from "./EnterpriseInventoryTabs";

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
  return (
    <div style={styles.page}>
      <EnterpriseInventoryHero
        onEvaluateParLevels={onEvaluateParLevels}
        evaluating={evaluatingParLevels}
        canEvaluate={canEvaluateParLevels}
      />

      <StatusMessages
        statusMessage={statusMessage}
        errorMessage={errorMessage}
      />

      {lastRefreshedAt ? (
        <p style={styles.helper}>Last refreshed: {new Date(lastRefreshedAt).toLocaleString()}</p>
      ) : null}

      <EnterpriseInventoryTabs
        activeTab={activeTab}
        onChange={onActiveTabChange}
        subscriptionAccess={subscriptionAccess}
      />

      {!activeTab ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>No Enterprise Inventory workspace available</h2>
          <p style={styles.helper}>
            None of the Enterprise Inventory tabs are available with the current permission set and tenant subscription.
          </p>
        </section>
      ) : children}
    </div>
  );
}
