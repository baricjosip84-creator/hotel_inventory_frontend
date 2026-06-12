import { AutomationTab } from "./tabs/AutomationTab";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryAutomationPanel({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const {
    automationDisableReasons,
    automationScheduleForm,
    setAutomationDisableReasons,
    setAutomationScheduleForm,
  } = formState;

  const {
    automationTypesQuery,
    automationSchedulesQuery,
    automationRunnerReadinessQuery,
    automationRunnerStatusQuery,
    automationRunEventsQuery,
    automationRunnerSafetyReportQuery,
    automationRunnerGovernancePackQuery,
    automationRunnerOperationsReviewQuery,
    automationRunnerAccountabilityDigestQuery,
    automationRunnerPolicyMatrixQuery,
  } = pageData.queries;

  const {
    automationSchedules,
    automationRunEvents,
    automationRunnerSafetyChecks,
    automationRunnerGovernanceChecks,
    automationRunnerOperationsChecks,
    automationRunnerPolicyRows,
    automationRunnerActorBreakdown,
    automationRunnerRequestBreakdown,
    automationRunnerDueSchedules,
    automationRunnerLinkedRequests,
  } = pageData.stableData;

  const {
    createAutomationScheduleMutation,
    disableAutomationScheduleMutation,
    dryRunAutomationScheduleMutation,
    pauseAutomationScheduleMutation,
    runAutomationScheduleMutation,
  } = actions;

  return (
    <EnterpriseInventoryTabPanel activeTab={activeTab} tab="automation">
      <AutomationTab
        automationSchedules={automationSchedules}
        automationRunEvents={automationRunEvents}
        automationScheduleForm={automationScheduleForm}
        setAutomationScheduleForm={setAutomationScheduleForm}
        automationDisableReasons={automationDisableReasons}
        setAutomationDisableReasons={setAutomationDisableReasons}
        automationTypesQuery={automationTypesQuery}
        automationSchedulesQuery={automationSchedulesQuery}
        automationRunnerReadinessQuery={automationRunnerReadinessQuery}
        automationRunnerStatusQuery={automationRunnerStatusQuery}
        automationRunEventsQuery={automationRunEventsQuery}
        automationRunnerSafetyReportQuery={automationRunnerSafetyReportQuery}
        automationRunnerGovernancePackQuery={
          automationRunnerGovernancePackQuery
        }
        automationRunnerOperationsReviewQuery={
          automationRunnerOperationsReviewQuery
        }
        automationRunnerAccountabilityDigestQuery={
          automationRunnerAccountabilityDigestQuery
        }
        automationRunnerPolicyMatrixQuery={automationRunnerPolicyMatrixQuery}
        automationRunnerSafetyChecks={automationRunnerSafetyChecks}
        automationRunnerGovernanceChecks={automationRunnerGovernanceChecks}
        automationRunnerOperationsChecks={automationRunnerOperationsChecks}
        automationRunnerPolicyRows={automationRunnerPolicyRows}
        automationRunnerActorBreakdown={automationRunnerActorBreakdown}
        automationRunnerRequestBreakdown={automationRunnerRequestBreakdown}
        automationRunnerDueSchedules={automationRunnerDueSchedules}
        automationRunnerLinkedRequests={automationRunnerLinkedRequests}
        createAutomationScheduleMutation={createAutomationScheduleMutation}
        dryRunAutomationScheduleMutation={dryRunAutomationScheduleMutation}
        runAutomationScheduleMutation={runAutomationScheduleMutation}
        pauseAutomationScheduleMutation={pauseAutomationScheduleMutation}
        disableAutomationScheduleMutation={disableAutomationScheduleMutation}
      />
    </EnterpriseInventoryTabPanel>
  );
}
