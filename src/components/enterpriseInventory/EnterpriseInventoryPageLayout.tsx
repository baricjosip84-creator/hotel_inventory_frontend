import type { ReactNode } from "react";
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
  children,
}: EnterpriseInventoryPageLayoutProps) {
  return (
    <div style={styles.page}>
      <EnterpriseInventoryHero
        onEvaluateParLevels={onEvaluateParLevels}
        evaluating={evaluatingParLevels}
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
      />

      {children}
    </div>
  );
}
