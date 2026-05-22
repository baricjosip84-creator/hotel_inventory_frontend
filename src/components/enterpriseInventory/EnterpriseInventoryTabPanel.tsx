import type { ReactNode } from 'react';

interface EnterpriseInventoryTabPanelProps {
  activeTab: string;
  tab: string;
  children: ReactNode;
}

export function EnterpriseInventoryTabPanel({ activeTab, tab, children }: EnterpriseInventoryTabPanelProps) {
  if (activeTab !== tab) {
    return null;
  }

  return <>{children}</>;
}
