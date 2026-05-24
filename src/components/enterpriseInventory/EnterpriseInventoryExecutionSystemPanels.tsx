import { ExecutionTab, SystemContextTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelWithSystemContextProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryExecutionSystemPanels({
  activeTab,
  actions,
  formState,
  pageData,
  refreshSystemContext,
}: EnterpriseInventoryPanelWithSystemContextProps) {
  const { executionFilters, setExecutionFilters } = formState;

  const {
    systemStatusQuery,
    systemExecutionGateQuery,
    systemContextQuery,
    systemContextSnapshotsQuery,
    systemContextSnapshotComparisonQuery,
    systemContextForecastRiskQuery,
    supportContextQuery,
    maintenanceContextQuery,
    announcementContextQuery,
    incidentContextQuery,
    executionAdaptersQuery,
    executionHardeningQuery,
    executionRequestsQuery,
  } = pageData.queries;

  const { systemContextSnapshots, executionRequests, executionAdapters } =
    pageData.stableData;

  const {
    approveExecutionRequestMutation,
    cancelExecutionRequestMutation,
    captureSystemContextSnapshotMutation,
    executeExecutionRequestMutation,
    executeNoopExecutionRequestMutation,
    rejectExecutionRequestMutation,
    submitExecutionRequestMutation,
  } = actions;

  return (
    <>
      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="execution">
        <ExecutionTab
          systemStatusQuery={systemStatusQuery}
          executionRequestsQuery={executionRequestsQuery}
          executionAdaptersQuery={executionAdaptersQuery}
          executionHardeningQuery={executionHardeningQuery}
          executionRequests={executionRequests}
          executionAdapters={executionAdapters}
          executionFilters={executionFilters}
          setExecutionFilters={setExecutionFilters}
          submitExecutionRequestMutation={submitExecutionRequestMutation}
          approveExecutionRequestMutation={approveExecutionRequestMutation}
          rejectExecutionRequestMutation={rejectExecutionRequestMutation}
          executeExecutionRequestMutation={executeExecutionRequestMutation}
          executeNoopExecutionRequestMutation={
            executeNoopExecutionRequestMutation
          }
          cancelExecutionRequestMutation={cancelExecutionRequestMutation}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="system-context">
        <SystemContextTab
          systemExecutionGateQuery={systemExecutionGateQuery}
          systemContextQuery={systemContextQuery}
          systemContextSnapshotsQuery={systemContextSnapshotsQuery}
          systemContextSnapshotComparisonQuery={
            systemContextSnapshotComparisonQuery
          }
          systemContextForecastRiskQuery={systemContextForecastRiskQuery}
          supportContextQuery={supportContextQuery}
          maintenanceContextQuery={maintenanceContextQuery}
          announcementContextQuery={announcementContextQuery}
          incidentContextQuery={incidentContextQuery}
          systemContextSnapshots={systemContextSnapshots}
          captureSystemContextSnapshotMutation={
            captureSystemContextSnapshotMutation
          }
          refreshSystemContextQueries={refreshSystemContext}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
