import { useMutation } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import type { AppLocale } from "../../i18n/config";
import { formatLocalizedNumber } from "../../i18n/formatters";
import type { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import {
  buildAlertEscalationPayload,
  buildAlertPayload,
  buildAlertResolvePayload,
  buildApprovalExecutionPayload,
  buildApprovalRulePayload,
  buildBarcodeLabelPayload,
  buildNotificationDeliveryPayload,
  buildSupplierCatalogPayload,
  buildSupplierInvoicePayload,
} from "./EnterpriseInventoryPayloads";
import { refreshSystemContextQueries } from "./EnterpriseInventoryRefresh";
import {
  deleteEnterpriseInventoryRequest,
  patchEnterpriseInventoryRequest,
  postEnterpriseInventoryBinaryRequest,
  postEnterpriseInventoryRequest,
  postEnterpriseInventoryVersionedRequest,
} from "./EnterpriseInventoryRequests";
import type {
  AlertForm,
  AlertItem,
  ApprovalRule,
  ApprovalRuleForm,
  AttachmentForm,
  BarcodeLabel,
  BarcodeLabelForm,
  EntityAttachment,
  NotificationDelivery,
  NotificationDeliveryForm,
  SupplierCatalogForm,
  SupplierCatalogItem,
  SupplierInvoice,
  SupplierInvoiceForm,
} from "./EnterpriseInventoryTypes";

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof createEnterpriseInventoryBoundMutationFeedback
>;

type ApprovalExecutionInput = {
  entity_type: string;
  entity_id: string;
  action: "approved" | "rejected";
  comment?: string;
};

type AlertResolveInput = {
  id: string;
  resolution_note: string;
};

type SupplierInvoiceUpdateInput = {
  invoice: SupplierInvoice;
  form: SupplierInvoiceForm;
  afterSuccess?: () => void;
};

type SupplierInvoiceLifecycleAction = "submit" | "match" | "pay" | "cancel" | "revise";

type SupplierInvoiceLifecycleInput = {
  invoice: SupplierInvoice;
  action: SupplierInvoiceLifecycleAction;
  reason?: string;
  paymentReference?: string;
};

type AttachmentUploadInput = {
  form: AttachmentForm;
  file: File;
  afterSuccess?: () => void;
};

type UseEnterpriseInventoryWorkflowMutationsOptions = {
  mutationFeedback: EnterpriseInventoryMutationFeedback;
  ui: (englishText: string) => string;
  locale: AppLocale;
  resetApprovalRuleForm: () => void;
  resetSupplierCatalogForm: () => void;
  resetSupplierInvoiceForm: () => void;
  resetBarcodeLabelForm: () => void;
  resetNotificationDeliveryForm: () => void;
  resetAlertForm: () => void;
  setAlertResolutionNotes: Dispatch<SetStateAction<Record<string, string>>>;
  setAttachmentForm: Dispatch<SetStateAction<AttachmentForm>>;
};

export function useEnterpriseInventoryWorkflowMutations({
  mutationFeedback,
  ui,
  locale,
  resetApprovalRuleForm,
  resetSupplierCatalogForm,
  resetSupplierInvoiceForm,
  resetBarcodeLabelForm,
  resetNotificationDeliveryForm,
  resetAlertForm,
  setAlertResolutionNotes,
  setAttachmentForm,
}: UseEnterpriseInventoryWorkflowMutationsOptions) {
  const captureSystemContextSnapshotMutation = useMutation({
    mutationFn: () =>
      postEnterpriseInventoryRequest<Record<string, unknown>>(
        "/system-context/snapshots/capture",
      ),
    onSuccess: mutationFeedback.refresh(
      "System context snapshot captured.",
      refreshSystemContextQueries,
    ),
    onError: mutationFeedback.error(
      "Failed to capture system context snapshot.",
    ),
  });

  const createApprovalRuleMutation = useMutation({
    mutationFn: (input: ApprovalRuleForm) =>
      postEnterpriseInventoryRequest<ApprovalRule>(
        "/enterprise-inventory/approval-rules",
        buildApprovalRulePayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      ui("Approval rule saved."),
      ["enterprise-approval-rules"],
      resetApprovalRuleForm,
    ),
    onError: mutationFeedback.error(ui("Failed to save approval rule.")),
  });

  const executeApprovalMutation = useMutation({
    mutationFn: (input: ApprovalExecutionInput) =>
      postEnterpriseInventoryRequest<{ message: string }>(
        "/enterprise-inventory/approvals/execute",
        buildApprovalExecutionPayload(input),
      ),
    onSuccess: mutationFeedback.variable<ApprovalExecutionInput>(
      (input) => input.action === "approved"
        ? ui("Item approved successfully.")
        : ui("Item rejected successfully."),
      [
        "enterprise-requisitions",
        "enterprise-cycle-counts",
        "enterprise-invoices",
        "enterprise-supplier-returns",
        "enterprise-supplier-return-eligible-lots",
        "enterprise-notifications",
      ],
    ),
    onError: mutationFeedback.error(ui("Failed to execute approval.")),
  });

  const createSupplierCatalogMutation = useMutation({
    mutationFn: (input: SupplierCatalogForm) =>
      postEnterpriseInventoryRequest<SupplierCatalogItem>(
        "/enterprise-inventory/supplier-catalog",
        buildSupplierCatalogPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      ui("Supplier catalog item saved successfully."),
      ["enterprise-supplier-catalog"],
      resetSupplierCatalogForm,
    ),
    onError: mutationFeedback.error(ui("Failed to save supplier catalog item.")),
  });

  const deactivateSupplierCatalogMutation = useMutation({
    mutationFn: (item: SupplierCatalogItem) =>
      postEnterpriseInventoryVersionedRequest<SupplierCatalogItem>(
        `/enterprise-inventory/supplier-catalog/${item.id}/deactivate`,
        item.version ?? 1,
      ),
    onSuccess: mutationFeedback.invalidating(
      ui("Supplier catalog item deactivated successfully."),
      ["enterprise-supplier-catalog", "enterprise-reorder-recommendations"],
    ),
    onError: mutationFeedback.error(ui("Failed to deactivate supplier catalog item.")),
  });

  const createSupplierInvoiceMutation = useMutation({
    mutationFn: (input: SupplierInvoiceForm) =>
      postEnterpriseInventoryRequest<SupplierInvoice>(
        "/enterprise-inventory/supplier-invoices",
        buildSupplierInvoicePayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      ui("Supplier invoice draft created successfully."),
      ["enterprise-invoices", "enterprise-notifications"],
      resetSupplierInvoiceForm,
    ),
    onError: mutationFeedback.error(ui("Failed to create supplier invoice.")),
  });

  const updateSupplierInvoiceMutation = useMutation({
    mutationFn: ({ invoice, form }: SupplierInvoiceUpdateInput) =>
      patchEnterpriseInventoryRequest<SupplierInvoice>(
        `/enterprise-inventory/supplier-invoices/${invoice.id}`,
        buildSupplierInvoicePayload(form),
        invoice.version,
      ),
    onSuccess: mutationFeedback.custom<SupplierInvoice, SupplierInvoiceUpdateInput>(
      ui("Supplier invoice draft updated successfully."),
      ["enterprise-invoices"],
      (_result, input) => {
        resetSupplierInvoiceForm();
        input.afterSuccess?.();
      },
    ),
    onError: mutationFeedback.error(ui("Failed to update supplier invoice.")),
  });

  const supplierInvoiceLifecycleMutation = useMutation({
    mutationFn: ({ invoice, action, reason, paymentReference }: SupplierInvoiceLifecycleInput) => {
      const body = action === "cancel"
        ? { reason: reason || "Cancelled from supplier invoice workspace" }
        : action === "pay"
          ? { payment_reference: paymentReference?.trim() || null }
          : undefined;
      return postEnterpriseInventoryVersionedRequest<SupplierInvoice>(
        `/enterprise-inventory/supplier-invoices/${invoice.id}/${action}`,
        invoice.version,
        body,
      );
    },
    onSuccess: mutationFeedback.variable<SupplierInvoiceLifecycleInput>(
      (input) => {
        if (input.action === "submit") return ui("Supplier invoice submitted successfully.");
        if (input.action === "match") return ui("Supplier invoice marked matched.");
        if (input.action === "pay") return ui("Supplier invoice marked paid.");
        if (input.action === "cancel") return ui("Supplier invoice cancelled.");
        return ui("Supplier invoice returned to draft for revision.");
      },
      ["enterprise-invoices", "enterprise-notifications", "enterprise-approval-rules"],
    ),
    onError: mutationFeedback.error(ui("Failed to update supplier invoice lifecycle.")),
  });

  const createBarcodeLabelMutation = useMutation({
    mutationFn: (input: BarcodeLabelForm) =>
      postEnterpriseInventoryRequest<BarcodeLabel>(
        "/enterprise-inventory/barcode-labels",
        buildBarcodeLabelPayload(input),
      ),
    onSuccess: async (result, input) => {
      await resetBarcodeLabelForm();
      await mutationFeedback.variable<BarcodeLabelForm>(
        (variables) => {
          if (variables.barcode_type === "QR") return ui("QR code label created successfully.");
          if (variables.barcode_type === "EAN13") return ui("EAN-13 label created successfully.");
          return ui("Code 128 label created successfully.");
        },
        ["enterprise-barcode-labels"],
      )(result, input);
    },
    onError: mutationFeedback.error(ui("Failed to create barcode label.")),
  });


  const recordBarcodeLabelPrintsMutation = useMutation({
    mutationFn: (labelIds: string[]) =>
      postEnterpriseInventoryRequest<{ print_request_count: number; labels: BarcodeLabel[] }>(
        "/enterprise-inventory/barcode-labels/print-events",
        { label_ids: labelIds },
      ),
    onSuccess: mutationFeedback.result(
      (result: { print_request_count: number }) => {
        const count = formatLocalizedNumber(result.print_request_count, locale);
        return result.print_request_count === 1
          ? ui("Print dialog opened for {count} barcode label.").replace("{count}", count)
          : ui("Print dialog opened for {count} barcode labels.").replace("{count}", count);
      },
      ["enterprise-barcode-labels", "enterprise-audit"],
    ),
    onError: mutationFeedback.error(ui("Failed to record the barcode label print request.")),
  });

  const deleteBarcodeLabelMutation = useMutation({
    mutationFn: (labelId: string) =>
      deleteEnterpriseInventoryRequest<{ message: string }>(
        `/enterprise-inventory/barcode-labels/${encodeURIComponent(labelId)}`,
      ),
    onSuccess: mutationFeedback.invalidating(
      ui("Barcode label retired successfully."),
      ["enterprise-barcode-labels", "enterprise-audit"],
    ),
    onError: mutationFeedback.error(ui("Failed to retire barcode label.")),
  });

  const queueNotificationDeliveryMutation = useMutation({
    mutationFn: (input: NotificationDeliveryForm) =>
      postEnterpriseInventoryRequest<NotificationDelivery>(
        "/enterprise-inventory/notifications/deliveries",
        buildNotificationDeliveryPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      ui("Notification delivery queued."),
      ["enterprise-notifications", "enterprise-notification-deliveries"],
      resetNotificationDeliveryForm,
    ),
    onError: mutationFeedback.error(ui("Failed to queue notification delivery.")),
  });

  const processNotificationDeliveriesMutation = useMutation({
    mutationFn: () =>
      postEnterpriseInventoryRequest<{ processed: number }>(
        "/enterprise-inventory/notifications/deliveries/process",
      ),
    onSuccess: mutationFeedback.result(
      (result: { processed: number }) => {
        const count = formatLocalizedNumber(result.processed, locale);
        return result.processed === 1
          ? ui("{count} notification delivery processed.").replace("{count}", count)
          : ui("{count} notification deliveries processed.").replace("{count}", count);
      },
      ["enterprise-notifications", "enterprise-notification-deliveries"],
    ),
    onError: mutationFeedback.error(
      ui("Failed to process notification deliveries."),
    ),
  });

  const createAlertMutation = useMutation({
    mutationFn: (input: AlertForm) =>
      postEnterpriseInventoryRequest<AlertItem>(
        "/alerts",
        buildAlertPayload(input),
      ),
    onSuccess: mutationFeedback.resetting(
      "Manual alert created successfully.",
      ["enterprise-alerts"],
      resetAlertForm,
    ),
    onError: mutationFeedback.error("Failed to create alert."),
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<AlertItem>(`/alerts/${id}/acknowledge`),
    onSuccess: mutationFeedback.invalidating("Alert acknowledged successfully.", [
      "enterprise-alerts",
    ]),
    onError: mutationFeedback.error("Failed to acknowledge alert."),
  });

  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, resolution_note }: AlertResolveInput) =>
      postEnterpriseInventoryRequest<AlertItem>(
        `/alerts/${id}/resolve`,
        buildAlertResolvePayload(resolution_note),
      ),
    onSuccess: mutationFeedback.custom<AlertItem, AlertResolveInput>(
      "Alert resolved successfully.",
      ["enterprise-alerts"],
      (_result, input) =>
        setAlertResolutionNotes((current) => ({ ...current, [input.id]: "" })),
    ),
    onError: mutationFeedback.error("Failed to resolve alert."),
  });

  const reopenAlertMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<AlertItem>(`/alerts/${id}/reopen`),
    onSuccess: mutationFeedback.invalidating("Alert reopened successfully.", [
      "enterprise-alerts",
    ]),
    onError: mutationFeedback.error("Failed to reopen alert."),
  });

  const escalateAlertMutation = useMutation({
    mutationFn: (id: string) =>
      postEnterpriseInventoryRequest<AlertItem>(
        `/alerts/${id}/escalate`,
        buildAlertEscalationPayload(),
      ),
    onSuccess: mutationFeedback.invalidating("Alert escalated successfully.", [
      "enterprise-alerts",
    ]),
    onError: mutationFeedback.error("Failed to escalate alert."),
  });

  const createAttachmentMutation = useMutation({
    mutationFn: ({ form, file }: AttachmentUploadInput) => {
      const params = new URLSearchParams({
        entity_type: form.entity_type,
        entity_id: form.entity_id,
        original_filename: file.name,
      });
      if (file.type) params.set("mime_type", file.type);
      return postEnterpriseInventoryBinaryRequest<EntityAttachment>(
        `/enterprise-inventory/attachments/upload?${params.toString()}`,
        file,
      );
    },
    onSuccess: mutationFeedback.custom<EntityAttachment, AttachmentUploadInput>(
      ui("File uploaded and attached successfully."),
      ["enterprise-attachments", "enterprise-notifications"],
      (attachment, input) => {
        setAttachmentForm((current) => ({
          ...current,
          entity_type: attachment.entity_type,
          entity_id: attachment.entity_id,
        }));
        input.afterSuccess?.();
      },
    ),
    onError: mutationFeedback.error(ui("Failed to upload attachment.")),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) =>
      deleteEnterpriseInventoryRequest<{ message: string }>(
        `/enterprise-inventory/attachments/${attachmentId}`,
      ),
    onSuccess: mutationFeedback.invalidating(
      ui("Attachment deleted successfully."),
      ["enterprise-attachments"],
    ),
    onError: mutationFeedback.error(ui("Failed to delete attachment.")),
  });

  return {
    captureSystemContextSnapshotMutation,
    createApprovalRuleMutation,
    executeApprovalMutation,
    createSupplierCatalogMutation,
    deactivateSupplierCatalogMutation,
    createSupplierInvoiceMutation,
    updateSupplierInvoiceMutation,
    supplierInvoiceLifecycleMutation,
    createBarcodeLabelMutation,
    recordBarcodeLabelPrintsMutation,
    deleteBarcodeLabelMutation,
    queueNotificationDeliveryMutation,
    processNotificationDeliveriesMutation,
    createAlertMutation,
    acknowledgeAlertMutation,
    resolveAlertMutation,
    reopenAlertMutation,
    escalateAlertMutation,
    createAttachmentMutation,
    deleteAttachmentMutation,
  };
}
