import { EnterpriseInventoryPageLayout } from "../components/enterpriseInventory/EnterpriseInventoryPageLayout";
import { EnterpriseInventoryPagePanels } from "../components/enterpriseInventory/EnterpriseInventoryPagePanels";
import { useEnterpriseInventoryPageController } from "../components/enterpriseInventory/EnterpriseInventoryPageController";

function EnterpriseInventoryPage() {
  const {
    actions,
    activeTab,
    errorMessage,
    formState,
    pageData,
    lastRefreshedAt,
    refreshSystemContext,
    setActiveTab,
    statusMessage,
  } = useEnterpriseInventoryPageController();

  return (
    <EnterpriseInventoryPageLayout
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      statusMessage={statusMessage}
      errorMessage={errorMessage}
      lastRefreshedAt={lastRefreshedAt}
      onEvaluateParLevels={() => actions.evaluateParLevelsMutation.mutate()}
      evaluatingParLevels={actions.evaluateParLevelsMutation.isPending}
    >
      <EnterpriseInventoryPagePanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
        refreshSystemContext={refreshSystemContext}
      />
    </EnterpriseInventoryPageLayout>
  );
}

export default EnterpriseInventoryPage;
