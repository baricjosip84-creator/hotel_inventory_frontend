import { useMutation } from "@tanstack/react-query";
import type { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import {
  buildCycleCountPayload,
  buildParLevelPayload,
  buildRequisitionPayload,
  buildStockAdjustmentPayload,
  buildStockTransferCancelPayload,
  buildStockTransferPayload,
} from "./EnterpriseInventoryPayloads";
import { postEnterpriseInventoryRequest } from "./EnterpriseInventoryRequests";
import {
  emptyCycleCountForm,
  emptyParLevelForm,
  emptyRequisitionForm,
  emptyStockAdjustmentForm,
  emptyStockTransferForm,
} from "./EnterpriseInventoryForms";
import type {
  CycleCount,
  CycleCountForm,
  DepartmentRequisition,
  ParLevel,
  ParLevelForm,
  RequisitionForm,
  StockAdjustmentForm,
  StockTransfer,
  StockTransferForm,
} from "./EnterpriseInventoryTypes";

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof createEnterpriseInventoryBoundMutationFeedback
>;

type SetForm<TForm> = (form: TForm) => void;

export function useEnterpriseInventoryStockMutations(
  mutationFeedback: EnterpriseInventoryMutationFeedback,
  setParLevelForm: SetForm<ParLevelForm>,
  setRequisitionForm: SetForm<RequisitionForm>,
  setCycleCountForm: SetForm<CycleCountForm>,
  setStockAdjustmentForm: SetForm<StockAdjustmentForm>,
  setStockTransferForm: SetForm<StockTransferForm>,
) {
  const createParLevelMutation = useMutation({
    mutationFn: (input: ParLevelForm) =>
      postEnterpriseInventoryRequest<ParLevel>(
        "/enterprise-inventory/par-levels",
        buildParLevelPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Par level saved.",
      ["enterprise-par-levels"],
      () => setParLevelForm(emptyParLevelForm),
    ),
    onError: mutationFeedback.error("Failed to save par level."),
  });

  const evaluateParLevelsMutation = useMutation({
    mutationFn: () =>
      postEnterpriseInventoryRequest<ParLevel[]>(
        "/enterprise-inventory/par-levels/evaluate",
      ),
    onSuccess: mutationFeedback.result(
      (items: ParLevel[]) =>
        `${items.length} low-stock par level signal(s) generated.`,
      ["enterprise-notifications", "enterprise-par-levels"],
    ),
    onError: mutationFeedback.error("Failed to evaluate par levels."),
  });

  const createRequisitionMutation = useMutation({
    mutationFn: (input: RequisitionForm) =>
      postEnterpriseInventoryRequest<DepartmentRequisition>(
        "/enterprise-inventory/department-requisitions",
        buildRequisitionPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Department requisition created.",
      ["enterprise-requisitions", "enterprise-notifications"],
      () => setRequisitionForm(emptyRequisitionForm),
    ),
    onError: mutationFeedback.error("Failed to create requisition."),
  });

  const createCycleCountMutation = useMutation({
    mutationFn: (input: CycleCountForm) =>
      postEnterpriseInventoryRequest<CycleCount>(
        "/enterprise-inventory/cycle-counts",
        buildCycleCountPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Cycle count created.",
      ["enterprise-cycle-counts"],
      () => setCycleCountForm(emptyCycleCountForm),
    ),
    onError: mutationFeedback.error("Failed to create cycle count."),
  });

  const reconcileCycleCountMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<{ message: string; id: string }>(
        `/enterprise-inventory/cycle-counts/${id}/reconcile`,
      ),
    onSuccess: mutationFeedback.invalidating(
      "Cycle count reconciled and stock movements posted.",
      [
        "enterprise-cycle-counts",
        "enterprise-low-stock",
        "enterprise-stock-movements",
        "enterprise-notifications",
      ],
    ),
    onError: mutationFeedback.error("Failed to reconcile cycle count."),
  });

  const adjustStockMutation = useMutation({
    mutationFn: (input: StockAdjustmentForm) =>
      postEnterpriseInventoryRequest<{ message: string }>(
        "/stock/adjust",
        buildStockAdjustmentPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Manual stock adjustment posted.",
      [
        "enterprise-cycle-counts",
        "enterprise-low-stock",
        "enterprise-stock-movements",
        "enterprise-notifications",
      ],
      () => setStockAdjustmentForm(emptyStockAdjustmentForm),
    ),
    onError: mutationFeedback.error("Failed to post stock adjustment."),
  });

  const createStockTransferMutation = useMutation({
    mutationFn: (input: StockTransferForm) =>
      postEnterpriseInventoryRequest<StockTransfer>(
        "/stock-transfers",
        buildStockTransferPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Transfer draft created successfully.",
      ["enterprise-stock-transfers", "enterprise-stock-movements"],
      () => setStockTransferForm(emptyStockTransferForm),
    ),
    onError: mutationFeedback.error("Failed to create stock transfer."),
  });

  const executeStockTransferMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<StockTransfer>(
        `/stock-transfers/${id}/execute`,
      ),
    onSuccess: mutationFeedback.invalidating("Transfer executed successfully.", [
      "enterprise-stock-transfers",
      "enterprise-stock-overview",
      "enterprise-low-stock",
      "enterprise-stock-movements",
      "enterprise-products",
    ]),
    onError: mutationFeedback.error("Failed to execute stock transfer."),
  });

  const cancelStockTransferMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<StockTransfer>(
        `/stock-transfers/${id}/cancel`,
        buildStockTransferCancelPayload(),
      ),
    onSuccess: mutationFeedback.invalidating("Transfer cancelled successfully.", [
      "enterprise-stock-transfers",
    ]),
    onError: mutationFeedback.error("Failed to cancel stock transfer."),
  });

  return {
    createParLevelMutation,
    evaluateParLevelsMutation,
    createRequisitionMutation,
    createCycleCountMutation,
    reconcileCycleCountMutation,
    adjustStockMutation,
    createStockTransferMutation,
    executeStockTransferMutation,
    cancelStockTransferMutation,
  };
}
