import { useMutation } from "@tanstack/react-query";
import type { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import {
  buildAutomationDisablePayload,
  buildAutomationSchedulePayload,
} from "./EnterpriseInventoryPayloads";
import { refreshAutomationQueries } from "./EnterpriseInventoryRefresh";
import { postEnterpriseInventoryRequest } from "./EnterpriseInventoryRequests";
import { emptyAutomationScheduleForm } from "./EnterpriseInventoryForms";
import type {
  AutomationSchedule,
  AutomationScheduleForm,
} from "./EnterpriseInventoryTypes";

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof createEnterpriseInventoryBoundMutationFeedback
>;

type SetAutomationScheduleForm = (form: AutomationScheduleForm) => void;

export function useEnterpriseInventoryAutomationMutations(
  mutationFeedback: EnterpriseInventoryMutationFeedback,
  setAutomationScheduleForm: SetAutomationScheduleForm,
) {
  const createAutomationScheduleMutation = useMutation({
    mutationFn: (input: AutomationScheduleForm) =>
      postEnterpriseInventoryRequest<AutomationSchedule>(
        "/automation-schedules",
        buildAutomationSchedulePayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Automation schedule created.",
      [
        "enterprise-automation-schedules",
        "enterprise-automation-runner-readiness",
        "enterprise-automation-runner-status",
        "enterprise-automation-run-events",
      ],
      () => setAutomationScheduleForm(emptyAutomationScheduleForm),
    ),
    onError: mutationFeedback.error("Failed to create automation schedule."),
  });

  const dryRunAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<Record<string, unknown>>(
        `/automation-schedules/${id}/dry-run`,
      ),
    onSuccess: mutationFeedback.refresh(
      "Automation schedule dry run completed without creating execution requests.",
      refreshAutomationQueries,
    ),
    onError: mutationFeedback.error("Failed to dry-run automation schedule."),
  });

  const runAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<Record<string, unknown>>(
        `/automation-schedules/${id}/run`,
      ),
    onSuccess: mutationFeedback.refresh(
      "Manual automation schedule run requested.",
      refreshAutomationQueries,
    ),
    onError: mutationFeedback.error("Failed to run automation schedule."),
  });

  const pauseAutomationScheduleMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<AutomationSchedule>(
        `/automation-schedules/${id}/pause`,
      ),
    onSuccess: mutationFeedback.refresh(
      "Automation schedule paused.",
      refreshAutomationQueries,
    ),
    onError: mutationFeedback.error("Failed to pause automation schedule."),
  });

  const disableAutomationScheduleMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      postEnterpriseInventoryRequest<AutomationSchedule>(
        `/automation-schedules/${id}/disable`,
        buildAutomationDisablePayload(reason),
      ),
    onSuccess: mutationFeedback.refresh(
      "Automation schedule disabled.",
      refreshAutomationQueries,
    ),
    onError: mutationFeedback.error("Failed to disable automation schedule."),
  });

  return {
    createAutomationScheduleMutation,
    dryRunAutomationScheduleMutation,
    runAutomationScheduleMutation,
    pauseAutomationScheduleMutation,
    disableAutomationScheduleMutation,
  };
}
