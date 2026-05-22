import type { Dispatch, SetStateAction } from "react";
import type { useEnterpriseInventoryFormState } from "./EnterpriseInventoryFormState";
import type { useEnterpriseInventoryPageActions } from "./EnterpriseInventoryPageActions";
import type { useEnterpriseInventoryPageData } from "./EnterpriseInventoryPageData";
import type { useEnterpriseInventoryPageFeedback } from "./EnterpriseInventoryPageFeedback";

export type EnterpriseInventoryPanelBaseProps = {
  activeTab: string;
  actions: ReturnType<typeof useEnterpriseInventoryPageActions>;
  formState: ReturnType<typeof useEnterpriseInventoryFormState>;
  pageData: ReturnType<typeof useEnterpriseInventoryPageData>;
};

export type EnterpriseInventoryPanelNavigationProps = {
  setActiveTab: Dispatch<SetStateAction<string>>;
};

export type EnterpriseInventorySystemContextRefreshProps = {
  refreshSystemContext: ReturnType<
    typeof useEnterpriseInventoryPageFeedback
  >["refreshSystemContext"];
};
