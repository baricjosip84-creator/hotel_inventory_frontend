import { EnterpriseInventoryPageLayout } from "../components/enterpriseInventory/EnterpriseInventoryPageLayout";
import { EnterpriseInventoryPagePanels } from "../components/enterpriseInventory/EnterpriseInventoryPagePanels";
import { useEnterpriseInventoryPageController } from "../components/enterpriseInventory/EnterpriseInventoryPageController";
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';

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
      subscriptionAccess={pageData.queries.tenantSubscriptionAccessQuery.data}
      canEvaluateParLevels={activeTab === 'par-levels' && hasPermission(TENANT_PERMISSIONS.PAR_LEVELS_WRITE)}
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
