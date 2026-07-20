import type { EnterpriseInventoryPanelBaseProps } from './EnterpriseInventoryPanelTypes';

type AutomationTabSource = Pick<
  EnterpriseInventoryPanelBaseProps,
  'actions' | 'formState' | 'pageData'
>;

export function buildEnterpriseInventoryAutomationTabProps({
  actions,
  formState,
  pageData
}: AutomationTabSource) {
  const {
    automationDisableReasons,
    automationScheduleForm,
    setAutomationDisableReasons,
    setAutomationScheduleForm
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
    automationRunnerPolicyMatrixQuery
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
    automationRunnerLinkedRequests
  } = pageData.stableData;

  const {
    createAutomationScheduleMutation,
    disableAutomationScheduleMutation,
    dryRunAutomationScheduleMutation,
    pauseAutomationScheduleMutation,
    runAutomationScheduleMutation
  } = actions;

  return {
    automationSchedules,
    automationRunEvents,
    automationScheduleForm,
    setAutomationScheduleForm,
    automationDisableReasons,
    setAutomationDisableReasons,
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
    automationRunnerSafetyChecks,
    automationRunnerGovernanceChecks,
    automationRunnerOperationsChecks,
    automationRunnerPolicyRows,
    automationRunnerActorBreakdown,
    automationRunnerRequestBreakdown,
    automationRunnerDueSchedules,
    automationRunnerLinkedRequests,
    createAutomationScheduleMutation,
    dryRunAutomationScheduleMutation,
    runAutomationScheduleMutation,
    pauseAutomationScheduleMutation,
    disableAutomationScheduleMutation
  };
}

export type AutomationTabProps = ReturnType<
  typeof buildEnterpriseInventoryAutomationTabProps
>;
