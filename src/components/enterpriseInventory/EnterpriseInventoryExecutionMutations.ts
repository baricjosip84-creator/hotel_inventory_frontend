import { useMutation } from "@tanstack/react-query";
import type { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import {
  buildExecutionCancelPayload,
  buildExecutionNotePayload,
  buildExecutionRejectPayload,
  buildExecutionReviewPayload,
} from "./EnterpriseInventoryPayloads";
import { refreshExecutionQueries } from "./EnterpriseInventoryRefresh";
import { postEnterpriseInventoryRequest } from "./EnterpriseInventoryRequests";
import type { ExecutionRequest } from "./EnterpriseInventoryTypes";

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof createEnterpriseInventoryBoundMutationFeedback
>;

export function useEnterpriseInventoryExecutionMutations(
  mutationFeedback: EnterpriseInventoryMutationFeedback,
) {
  const submitExecutionRequestMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      postEnterpriseInventoryRequest<ExecutionRequest>(
        `/execution-requests/${id}/submit`,
        buildExecutionNotePayload(note),
      ),
    onSuccess: mutationFeedback.refresh(
      "Execution request submitted for review.",
      refreshExecutionQueries,
    ),
    onError: mutationFeedback.error("Failed to submit execution request."),
  });

  const approveExecutionRequestMutation = useMutation({
    mutationFn: ({ id, review_note }: { id: string; review_note?: string }) =>
      postEnterpriseInventoryRequest<ExecutionRequest>(
        `/execution-requests/${id}/approve`,
        buildExecutionReviewPayload(review_note),
      ),
    onSuccess: mutationFeedback.refresh(
      "Execution request approved.",
      refreshExecutionQueries,
    ),
    onError: mutationFeedback.error("Failed to approve execution request."),
  });

  const rejectExecutionRequestMutation = useMutation({
    mutationFn: ({
      id,
      rejection_reason,
    }: {
      id: string;
      rejection_reason: string;
    }) =>
      postEnterpriseInventoryRequest<ExecutionRequest>(
        `/execution-requests/${id}/reject`,
        buildExecutionRejectPayload(rejection_reason),
      ),
    onSuccess: mutationFeedback.refresh(
      "Execution request rejected.",
      refreshExecutionQueries,
    ),
    onError: mutationFeedback.error("Failed to reject execution request."),
  });

  const executeExecutionRequestMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      postEnterpriseInventoryRequest<ExecutionRequest>(
        `/execution-requests/${id}/execute`,
        buildExecutionNotePayload(note),
      ),
    onSuccess: mutationFeedback.refresh(
      "Execution request executed.",
      refreshExecutionQueries,
    ),
    onError: mutationFeedback.error("Failed to execute request."),
  });

  const executeNoopExecutionRequestMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      postEnterpriseInventoryRequest<ExecutionRequest>(
        `/execution-requests/${id}/execute-noop`,
        buildExecutionNotePayload(note),
      ),
    onSuccess: mutationFeedback.refresh(
      "Execution request marked noop completed.",
      refreshExecutionQueries,
    ),
    onError: mutationFeedback.error("Failed to noop execute request."),
  });

  const cancelExecutionRequestMutation = useMutation({
    mutationFn: ({
      id,
      cancel_reason,
    }: {
      id: string;
      cancel_reason: string;
    }) =>
      postEnterpriseInventoryRequest<ExecutionRequest>(
        `/execution-requests/${id}/cancel`,
        buildExecutionCancelPayload(cancel_reason),
      ),
    onSuccess: mutationFeedback.refresh(
      "Execution request cancelled.",
      refreshExecutionQueries,
    ),
    onError: mutationFeedback.error("Failed to cancel execution request."),
  });

  return {
    submitExecutionRequestMutation,
    approveExecutionRequestMutation,
    rejectExecutionRequestMutation,
    executeExecutionRequestMutation,
    executeNoopExecutionRequestMutation,
    cancelExecutionRequestMutation,
  };
}
