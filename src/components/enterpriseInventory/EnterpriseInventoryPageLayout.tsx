import type { ReactNode } from "react";
import {
  EnterpriseInventoryHero,
  StatusMessages,
  styles,
} from "./EnterpriseInventoryShared";
import { EnterpriseInventoryTabs } from "./EnterpriseInventoryTabs";

type EnterpriseInventoryPageLayoutProps = {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  statusMessage: string | null;
  errorMessage: string | null;
  onEvaluateParLevels: () => void;
  evaluatingParLevels: boolean;
  children: ReactNode;
};

export function EnterpriseInventoryPageLayout({
  activeTab,
  onActiveTabChange,
  statusMessage,
  errorMessage,
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

      <EnterpriseInventoryTabs
        activeTab={activeTab}
        onChange={onActiveTabChange}
      />

      {children}
    </div>
  );
}
