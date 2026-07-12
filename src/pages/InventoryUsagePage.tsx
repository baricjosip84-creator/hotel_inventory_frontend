import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InventoryUsageDashboard } from "./inventoryUsage/InventoryUsageDashboard";
import {
  archiveInventoryUsageTemplate,
  closeInventoryUsagePeriod,
  previewInventoryUsagePeriodClosure,
  createInventoryUsageAttachment,
  consumeInventoryUsageTemplate,
  createInventoryUsageTemplate,
  fetchInventoryUsageAnomalies,
  fetchInventoryUsageExceptions,
  fetchInventoryUsageImpact,
  fetchInventoryUsageLogDetail,
  fetchInventoryUsageLogs,
  fetchInventoryUsagePeriodClosures,
  fetchInventoryUsageSummary,
  fetchInventoryUsageStorageLocations,
  fetchInventoryUsageTemplates,
  fetchInventoryUsageScheduledTemplates,
  fetchInventoryUsageTemplateReadiness,
  previewInventoryUsageByBarcode,
  previewInventoryUsageBulk,
  recordInventoryUsageByBarcode,
  recordInventoryUsageBulk,
  reviewInventoryUsageLog,
  runDueInventoryUsageTemplates,
  reverseInventoryUsageLog,
  scanInventoryUsageAlerts,
} from "./inventoryUsage/inventoryUsageApi";
import { DEFAULT_USAGE_FILTERS } from "./inventoryUsage/inventoryUsageConfig";
import { getRoleCapabilities } from "../lib/permissions";
import type {
  InventoryUsageBarcodeRequest,
  InventoryUsageBulkLine,
  InventoryUsageBulkRequest,
  InventoryUsageBulkReadinessResponse,
  InventoryUsageLogDetail,
  InventoryUsagePeriodClosureDraft,
  InventoryUsagePeriodClosurePreviewResponse,
  InventoryUsageTemplate,
  InventoryUsageTemplateDraft,
  InventoryUsageTemplateReadiness,
} from "./inventoryUsage/inventoryUsageTypes";

export default function InventoryUsagePage() {
  const queryClient = useQueryClient();
  const permissions = getRoleCapabilities();
  const [filters, setFilters] = useState(DEFAULT_USAGE_FILTERS);
  const [selectedUsageLogId, setSelectedUsageLogId] = useState<string>("");

  const summaryQuery = useQuery({
    queryKey: ["inventory-usage-summary-page", filters],
    queryFn: () => fetchInventoryUsageSummary(filters),
  });

  const logsQuery = useQuery({
    queryKey: ["inventory-usage-logs-page", filters],
    queryFn: () => fetchInventoryUsageLogs(filters),
  });

  const exceptionsQuery = useQuery({
    queryKey: ["inventory-usage-exceptions-page", filters],
    queryFn: () => fetchInventoryUsageExceptions(filters),
  });

  const impactQuery = useQuery({
    queryKey: ["inventory-usage-impact-page", filters],
    queryFn: () => fetchInventoryUsageImpact(filters),
  });

  const anomaliesQuery = useQuery({
    queryKey: ["inventory-usage-anomalies-page", filters],
    queryFn: () => fetchInventoryUsageAnomalies(filters),
  });

  const templatesQuery = useQuery({
    queryKey: ["inventory-usage-templates-page"],
    queryFn: fetchInventoryUsageTemplates,
  });

  const scheduledTemplatesQuery = useQuery({
    queryKey: ["inventory-usage-scheduled-templates-page"],
    queryFn: fetchInventoryUsageScheduledTemplates,
  });

  const periodClosuresQuery = useQuery({
    queryKey: ["inventory-usage-period-closures-page"],
    queryFn: fetchInventoryUsagePeriodClosures,
  });

  const usageLogDetailQuery = useQuery<InventoryUsageLogDetail>({
    queryKey: ["inventory-usage-log-detail-page", selectedUsageLogId],
    queryFn: () => fetchInventoryUsageLogDetail(selectedUsageLogId),
    enabled: Boolean(selectedUsageLogId),
  });

  const storageLocationsQuery = useQuery({
    queryKey: ["inventory-usage-storage-locations-page"],
    queryFn: fetchInventoryUsageStorageLocations,
  });

  const templates = templatesQuery.data || [];

  const templateReadinessQuery = useQuery({
    queryKey: [
      "inventory-usage-template-readiness-page",
      templates.map((template) => template.id).join(","),
    ],
    queryFn: async () => {
      const readinessPairs = await Promise.all(
        templates.map(
          async (template) =>
            [
              template.id,
              await fetchInventoryUsageTemplateReadiness(template.id),
            ] as const,
        ),
      );

      return readinessPairs.reduce<
        Record<string, InventoryUsageTemplateReadiness>
      >((acc, [templateId, readiness]) => {
        acc[templateId] = readiness;
        return acc;
      }, {});
    },
    enabled: templates.length > 0,
  });

  const [selectedTemplate, setSelectedTemplate] =
    useState<InventoryUsageTemplate | null>(null);

  const reverseUsageMutation = useMutation({
    mutationFn: ({
      usageLogId,
      reversalReason,
    }: {
      usageLogId: string;
      reversalReason: string;
    }) => {
      return reverseInventoryUsageLog(usageLogId, reversalReason);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-anomalies-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-impact-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-log-detail-page", variables.usageLogId],
      });
    },
  });

  const reviewUsageMutation = useMutation({
    mutationFn: ({
      usageLogId,
      reviewStatus,
      reviewNotes,
    }: {
      usageLogId: string;
      reviewStatus: "reviewed" | "follow_up_required";
      reviewNotes?: string;
    }) => {
      return reviewInventoryUsageLog(usageLogId, {
        review_status: reviewStatus,
        review_notes: reviewNotes,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-log-detail-page", variables.usageLogId],
      });
    },
  });

  const barcodePreviewMutation = useMutation({
    mutationFn: (payload: InventoryUsageBarcodeRequest) =>
      previewInventoryUsageByBarcode(payload),
  });

  const barcodeEvidenceAttachmentMutation = useMutation({
    mutationFn: createInventoryUsageAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
    },
  });

  const barcodeUsageMutation = useMutation({
    mutationFn: (payload: InventoryUsageBarcodeRequest) =>
      recordInventoryUsageByBarcode({
        barcode: payload.barcode,
        storage_location_id: payload.storage_location_id,
        package_count: payload.package_count,
        quantity: payload.quantity,
        consumption_reason: payload.consumption_reason,
        department: payload.department,
        event_name: payload.event_name,
        notes: payload.notes,
        consumed_at: payload.consumed_at,
        client_scan_id: payload.client_scan_id,
        stock_risk_acknowledged: payload.stock_risk_acknowledged,
        missing_evidence_acknowledged: payload.missing_evidence_acknowledged,
        evidence_original_filename: payload.evidence_original_filename,
        evidence_stored_filename: payload.evidence_stored_filename,
        evidence_mime_type: payload.evidence_mime_type,
        evidence_file_size_bytes: payload.evidence_file_size_bytes,
        evidence_storage_path: payload.evidence_storage_path,
      }),
    onSuccess: (data, variables) => {
      barcodePreviewMutation.reset();
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-anomalies-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-impact-page"],
      });

      if (
        data.usage?.id &&
        variables.evidence_original_filename?.trim() &&
        variables.evidence_stored_filename?.trim()
      ) {
        barcodeEvidenceAttachmentMutation.mutate({
          entity_type: "inventory_usage_log",
          entity_id: data.usage.id,
          original_filename: variables.evidence_original_filename.trim(),
          stored_filename: variables.evidence_stored_filename.trim(),
          mime_type: variables.evidence_mime_type?.trim() || undefined,
          file_size_bytes: variables.evidence_file_size_bytes || 0,
          storage_path: variables.evidence_storage_path?.trim() || undefined,
        });
      }
    },
  });

  const bulkUsageReadinessMutation = useMutation({
    mutationFn: (payload: InventoryUsageBulkRequest) =>
      previewInventoryUsageBulk(payload),
  });

  const bulkUsageMutation = useMutation({
    mutationFn: (payload: InventoryUsageBulkRequest) =>
      recordInventoryUsageBulk(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-anomalies-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-impact-page"],
      });
      bulkUsageReadinessMutation.reset();
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (payload: InventoryUsageTemplateDraft) =>
      createInventoryUsageTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-templates-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-template-readiness-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-scheduled-templates-page"],
      });
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: ({
      templateId,
      reason,
    }: {
      templateId: string;
      reason?: string;
    }) => archiveInventoryUsageTemplate(templateId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-templates-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-template-readiness-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-scheduled-templates-page"],
      });
    },
  });

  const runDueScheduledTemplatesMutation = useMutation({
    mutationFn: (payload?: { missingEvidenceAcknowledged?: boolean }) => runDueInventoryUsageTemplates({
      limit: 25,
      missing_evidence_acknowledged: payload?.missingEvidenceAcknowledged || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-anomalies-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-impact-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-templates-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-template-readiness-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-scheduled-templates-page"],
      });
    },
  });

  const consumeTemplateMutation = useMutation({
    mutationFn: ({ templateId, missingEvidenceAcknowledged }: { templateId: string; missingEvidenceAcknowledged?: boolean }) =>
      consumeInventoryUsageTemplate(templateId, {
        missing_evidence_acknowledged: missingEvidenceAcknowledged || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-logs-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-anomalies-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-impact-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-template-readiness-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-scheduled-templates-page"],
      });
    },
  });

  const scanUsageAlertsMutation = useMutation({
    mutationFn: () => scanInventoryUsageAlerts({ lookback_days: 30 }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-anomalies-page"],
      });
    },
  });

  const previewPeriodCloseMutation = useMutation<
    InventoryUsagePeriodClosurePreviewResponse,
    Error,
    InventoryUsagePeriodClosureDraft
  >({
    mutationFn: (payload) => previewInventoryUsagePeriodClosure(payload),
  });

  const closePeriodMutation = useMutation({
    mutationFn: (payload: InventoryUsagePeriodClosureDraft) =>
      closeInventoryUsagePeriod(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-period-closures-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-summary-page"],
      });
      queryClient.invalidateQueries({
        queryKey: ["inventory-usage-exceptions-page"],
      });
    },
  });

  const handleScanUsageAlerts = () => {
    scanUsageAlertsMutation.mutate();
  };

  const handlePreviewBarcodeUsage = (payload: InventoryUsageBarcodeRequest) => {
    barcodeUsageMutation.reset();
    barcodeEvidenceAttachmentMutation.reset();
    barcodePreviewMutation.reset();
    barcodePreviewMutation.mutate({
      barcode: payload.barcode.trim(),
      storage_location_id: payload.storage_location_id.trim(),
      package_count: Number(payload.package_count || 1),
      quantity:
        payload.quantity !== undefined && payload.quantity !== ""
          ? Number(payload.quantity)
          : undefined,
      consumption_reason: payload.consumption_reason || undefined,
      department: payload.department?.trim() || undefined,
      event_name: payload.event_name?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      consumed_at: payload.consumed_at || undefined,
      evidence_original_filename:
        payload.evidence_original_filename?.trim() || undefined,
      evidence_stored_filename:
        payload.evidence_stored_filename?.trim() || undefined,
      evidence_mime_type: payload.evidence_mime_type?.trim() || undefined,
      evidence_file_size_bytes: payload.evidence_file_size_bytes || undefined,
      evidence_storage_path: payload.evidence_storage_path?.trim() || undefined,
    });
  };

  const handleRecordBarcodeUsage = (payload: InventoryUsageBarcodeRequest) => {
    barcodeUsageMutation.reset();
    barcodeEvidenceAttachmentMutation.reset();
    barcodeUsageMutation.mutate({
      barcode: payload.barcode.trim(),
      storage_location_id: payload.storage_location_id.trim(),
      package_count: Number(payload.package_count || 1),
      quantity:
        payload.quantity !== undefined && payload.quantity !== ""
          ? Number(payload.quantity)
          : undefined,
      consumption_reason: payload.consumption_reason || undefined,
      department: payload.department?.trim() || undefined,
      event_name: payload.event_name?.trim() || undefined,
      notes: payload.notes?.trim() || undefined,
      consumed_at: payload.consumed_at || undefined,
      client_scan_id: payload.client_scan_id || undefined,
      stock_risk_acknowledged: payload.stock_risk_acknowledged || undefined,
      missing_evidence_acknowledged:
        payload.missing_evidence_acknowledged || undefined,
      evidence_original_filename:
        payload.evidence_original_filename?.trim() || undefined,
      evidence_stored_filename:
        payload.evidence_stored_filename?.trim() || undefined,
      evidence_mime_type: payload.evidence_mime_type?.trim() || undefined,
      evidence_file_size_bytes: payload.evidence_file_size_bytes || undefined,
      evidence_storage_path: payload.evidence_storage_path?.trim() || undefined,
    });
  };

  const handlePreviewBulkUsage = (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    missing_evidence_acknowledged?: boolean;
    items: InventoryUsageBulkLine[];
  }) => {
    bulkUsageReadinessMutation.mutate({
      consumption_reason: payload.consumption_reason,
      department: payload.department,
      event_name: payload.event_name,
      notes: payload.notes,
      consumed_at: payload.consumed_at,
      reference_type: payload.reference_type,
      reference_id: payload.reference_id,
      missing_evidence_acknowledged: payload.missing_evidence_acknowledged,
      items: payload.items.map((item) => ({
        product_id: item.product_id.trim(),
        storage_location_id: item.storage_location_id.trim(),
        quantity: Number(item.quantity),
        consumption_reason: item.consumption_reason || undefined,
        department: item.department.trim() || undefined,
        event_name: item.event_name.trim() || undefined,
        notes: item.notes.trim() || undefined,
        reference_type: item.reference_type.trim() || undefined,
        reference_id: item.reference_id.trim() || undefined,
        missing_evidence_acknowledged: item.missing_evidence_acknowledged || undefined,
      })),
    });
  };

  const handleRecordBulkUsage = (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    missing_evidence_acknowledged?: boolean;
    items: InventoryUsageBulkLine[];
  }) => {
    bulkUsageMutation.mutate({
      consumption_reason: payload.consumption_reason,
      department: payload.department,
      event_name: payload.event_name,
      notes: payload.notes,
      consumed_at: payload.consumed_at,
      reference_type: payload.reference_type,
      reference_id: payload.reference_id,
      missing_evidence_acknowledged: payload.missing_evidence_acknowledged,
      items: payload.items.map((item) => ({
        product_id: item.product_id.trim(),
        storage_location_id: item.storage_location_id.trim(),
        quantity: Number(item.quantity),
        consumption_reason: item.consumption_reason || undefined,
        department: item.department.trim() || undefined,
        event_name: item.event_name.trim() || undefined,
        notes: item.notes.trim() || undefined,
        reference_type: item.reference_type.trim() || undefined,
        reference_id: item.reference_id.trim() || undefined,
        missing_evidence_acknowledged: item.missing_evidence_acknowledged || undefined,
      })),
    });
  };

  const handleCreateTemplate = (payload: InventoryUsageTemplateDraft) => {
    createTemplateMutation.mutate(payload);
  };

  const handlePreviewPeriodClose = (payload: InventoryUsagePeriodClosureDraft) => {
    previewPeriodCloseMutation.mutate(payload);
  };

  const handleClosePeriod = (payload: InventoryUsagePeriodClosureDraft) => {
    closePeriodMutation.mutate(payload);
  };

  const handleUseTemplate = (template: InventoryUsageTemplate) => {
    setSelectedTemplate(template);
  };

  const handleArchiveTemplate = (template: InventoryUsageTemplate) => {
    const reason = window.prompt(
      `Why are you archiving the usage template "${template.name}"?`,
    );

    if (reason === null) {
      return;
    }

    archiveTemplateMutation.mutate({
      templateId: template.id,
      reason: reason.trim() || undefined,
    });
  };

  const handleRunDueScheduledTemplates = () => {
    const dueCount = Number(
      scheduledTemplatesQuery.data?.summary?.due_count || 0,
    );
    const confirmed = window.confirm(
      `Record ${dueCount} due scheduled usage template${dueCount === 1 ? "" : "s"} now? This will deduct stock for every ready due template.`,
    );

    if (!confirmed) {
      return;
    }

    const evidenceAckCount = Number(
      scheduledTemplatesQuery.data?.summary?.evidence_acknowledgement_required_count || 0,
    );

    if (evidenceAckCount > 0) {
      const acknowledged = window.confirm(
        `${evidenceAckCount} scheduled usage template line${evidenceAckCount === 1 ? "" : "s"} use damage/waste reasons without linked evidence metadata. Record due templates anyway and audit the missing-evidence acknowledgement?`,
      );

      if (!acknowledged) {
        return;
      }

      runDueScheduledTemplatesMutation.mutate({ missingEvidenceAcknowledged: true });
      return;
    }

    runDueScheduledTemplatesMutation.mutate({});
  };

  const handleRecordTemplate = (template: InventoryUsageTemplate) => {
    const readiness = templateReadinessQuery.data?.[template.id];
    const evidenceAcknowledgementRequired =
      Number(readiness?.summary?.evidence_acknowledgement_required_count || 0) > 0;
    const confirmed = window.confirm(
      `Record usage now from template "${template.name}"? This will deduct stock for ${template.items?.length || 0} template lines.`,
    );

    if (!confirmed) {
      return;
    }

    if (evidenceAcknowledgementRequired) {
      const acknowledged = window.confirm(
        'This template includes damage or waste lines without linked evidence metadata. Record anyway and audit the missing-evidence acknowledgement?',
      );

      if (!acknowledged) {
        return;
      }

      consumeTemplateMutation.mutate({ templateId: template.id, missingEvidenceAcknowledged: true });
      return;
    }

    consumeTemplateMutation.mutate({ templateId: template.id });
  };

  const handleReverseUsage = (usageLogId: string) => {
    const reversalReason = window.prompt(
      "Why are you reversing this usage entry?",
    );

    if (!reversalReason || !reversalReason.trim()) {
      return;
    }

    reverseUsageMutation.mutate({
      usageLogId,
      reversalReason: reversalReason.trim(),
    });
  };

  const handleReviewUsage = (
    usageLogId: string,
    reviewStatus: "reviewed" | "follow_up_required",
  ) => {
    const promptMessage =
      reviewStatus === "follow_up_required"
        ? "What follow-up is required for this usage entry?"
        : "Optional review notes for this usage entry:";
    const reviewNotes = window.prompt(promptMessage);

    if (reviewNotes === null) {
      return;
    }

    if (reviewStatus === "follow_up_required" && !reviewNotes.trim()) {
      return;
    }

    reviewUsageMutation.mutate({
      usageLogId,
      reviewStatus,
      reviewNotes: reviewNotes.trim() || undefined,
    });
  };

  const usageLogs = logsQuery.data || [];

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter((value) => value.trim()).length;
  }, [filters]);

  const exportRows = useMemo(() => {
    return usageLogs.map((usage) => ({
      consumed_at: usage.consumed_at,
      product_id: usage.product_id,
      product: usage.product_name || usage.product_id,
      location_id: usage.storage_location_id,
      location: usage.storage_location_name || usage.storage_location_id,
      reason: usage.consumption_reason,
      department: usage.department || "",
      event_name: usage.event_name || "",
      quantity: usage.quantity,
      unit: usage.product_unit || "",
      estimated_unit_cost: usage.estimated_unit_cost ?? "",
      estimated_usage_value: usage.estimated_usage_value ?? "",
      estimated_cost_source: usage.estimated_cost_source || "",
      quantity_before: usage.quantity_before ?? "",
      quantity_after: usage.quantity_after ?? "",
      created_by: usage.created_by_user_name || usage.created_by_user_id || "",
      created_by_user_id: usage.created_by_user_id || "",
      review_status: usage.review_status || "pending",
      reviewed_at: usage.reviewed_at || "",
      reviewed_by: usage.reviewed_by_user_name || usage.reviewed_by_user_id || "",
      reviewed_by_user_id: usage.reviewed_by_user_id || "",
      review_notes: usage.review_notes || "",
      reversed_at: usage.reversed_at || "",
      reversed_by: usage.reversed_by_user_name || usage.reversed_by_user_id || "",
      reversed_by_user_id: usage.reversed_by_user_id || "",
      reversal_reason: usage.reversal_reason || "",
      reversal_stock_movement_id: usage.reversal_stock_movement_id || "",
      notes: usage.notes || "",
      reference_type: usage.reference_type || "",
      reference_id: usage.reference_id || "",
      stock_movement_id: usage.stock_movement_id || "",
    }));
  }, [usageLogs]);

  const handleExportCsv = () => {
    const headers = [
      "consumed_at",
      "product_id",
      "product",
      "location_id",
      "location",
      "reason",
      "department",
      "event_name",
      "quantity",
      "unit",
      "estimated_unit_cost",
      "estimated_usage_value",
      "estimated_cost_source",
      "quantity_before",
      "quantity_after",
      "created_by",
      "created_by_user_id",
      "review_status",
      "reviewed_at",
      "reviewed_by",
      "reviewed_by_user_id",
      "review_notes",
      "reversed_at",
      "reversed_by",
      "reversed_by_user_id",
      "reversal_reason",
      "reversal_stock_movement_id",
      "notes",
      "reference_type",
      "reference_id",
      "stock_movement_id",
    ];

    const escapeCell = (value: unknown) => {
      const raw = value === null || value === undefined ? "" : String(value);
      const safeRaw = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
      return `"${safeRaw.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(","),
      ...exportRows.map((row) =>
        headers
          .map((header) => escapeCell(row[header as keyof typeof row]))
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const canRecordStockUsage = permissions.canConsumeStock && permissions.canRecordInventoryUsage;
  const canBulkRecordStockUsage = permissions.canConsumeStock && permissions.canBulkRecordInventoryUsage;

  return (
    <InventoryUsageDashboard
      permissions={{
        canRecord: canRecordStockUsage,
        canBulkRecord: canBulkRecordStockUsage,
        canReverse: permissions.canReverseInventoryUsage,
        canReview: permissions.canReviewInventoryUsage,
        canClosePeriods: permissions.canCloseInventoryUsagePeriods,
        canManageTemplates: permissions.canManageInventoryUsageTemplates,
        canRunScheduled: permissions.canRunScheduledInventoryUsage,
      }}
      filters={filters}
      setFilters={setFilters}
      activeFilterCount={activeFilterCount}
      exportRowCount={exportRows.length}
      onExportCsv={handleExportCsv}
      summary={summaryQuery.data}
      summaryLoading={summaryQuery.isLoading}
      exceptions={exceptionsQuery.data}
      exceptionsLoading={exceptionsQuery.isLoading}
      anomalies={anomaliesQuery.data}
      anomaliesLoading={anomaliesQuery.isLoading}
      impact={impactQuery.data}
      impactLoading={impactQuery.isLoading}
      periodClosures={periodClosuresQuery.data || []}
      periodClosuresLoading={periodClosuresQuery.isLoading}
      periodClosuresError={
        periodClosuresQuery.isError
          ? (periodClosuresQuery.error as Error)
          : null
      }
      periodPreviewing={previewPeriodCloseMutation.isPending}
      periodPreviewError={
        previewPeriodCloseMutation.isError
          ? (previewPeriodCloseMutation.error as Error)
          : null
      }
      periodPreviewResult={previewPeriodCloseMutation.data || null}
      onPreviewPeriodClose={handlePreviewPeriodClose}
      periodClosing={closePeriodMutation.isPending}
      periodCloseError={
        closePeriodMutation.isError
          ? (closePeriodMutation.error as Error)
          : null
      }
      periodCloseResult={closePeriodMutation.data || null}
      onClosePeriod={handleClosePeriod}
      templates={templates}
      templatesLoading={
        templatesQuery.isLoading || templateReadinessQuery.isLoading
      }
      scheduledTemplates={scheduledTemplatesQuery.data}
      scheduledTemplatesLoading={scheduledTemplatesQuery.isLoading}
      scheduledTemplatesError={
        scheduledTemplatesQuery.isError
          ? (scheduledTemplatesQuery.error as Error)
          : null
      }
      scheduledTemplatesRunning={runDueScheduledTemplatesMutation.isPending}
      scheduledTemplatesRunError={
        runDueScheduledTemplatesMutation.isError
          ? (runDueScheduledTemplatesMutation.error as Error)
          : null
      }
      scheduledTemplatesRunResult={
        runDueScheduledTemplatesMutation.data || null
      }
      onRunDueScheduledTemplates={handleRunDueScheduledTemplates}
      templatesError={
        templatesQuery.isError
          ? (templatesQuery.error as Error)
          : templateReadinessQuery.isError
            ? (templateReadinessQuery.error as Error)
            : null
      }
      templateCreating={createTemplateMutation.isPending}
      templateCreateError={
        createTemplateMutation.isError
          ? (createTemplateMutation.error as Error)
          : null
      }
      templateArchivingId={
        archiveTemplateMutation.variables?.templateId || null
      }
      templateArchiveError={
        archiveTemplateMutation.isError
          ? (archiveTemplateMutation.error as Error)
          : null
      }
      templateRecordingId={
        consumeTemplateMutation.variables?.templateId || null
      }
      templateRecordError={
        consumeTemplateMutation.isError
          ? (consumeTemplateMutation.error as Error)
          : null
      }
      templateRecordResult={consumeTemplateMutation.data || null}
      templateReadinessById={templateReadinessQuery.data || {}}
      selectedTemplate={selectedTemplate}
      onCreateTemplate={handleCreateTemplate}
      onUseTemplate={handleUseTemplate}
      onArchiveTemplate={handleArchiveTemplate}
      onRecordTemplate={handleRecordTemplate}
      barcodePreviewing={barcodePreviewMutation.isPending}
      barcodePreviewError={
        barcodePreviewMutation.isError
          ? (barcodePreviewMutation.error as Error)
          : null
      }
      barcodePreviewResult={barcodePreviewMutation.data || null}
      barcodeRecording={barcodeUsageMutation.isPending}
      barcodeError={
        barcodeUsageMutation.isError
          ? (barcodeUsageMutation.error as Error)
          : null
      }
      barcodeResult={barcodeUsageMutation.data || null}
      barcodeEvidenceLinking={barcodeEvidenceAttachmentMutation.isPending}
      barcodeEvidenceError={
        barcodeEvidenceAttachmentMutation.isError
          ? (barcodeEvidenceAttachmentMutation.error as Error)
          : null
      }
      barcodeEvidenceResult={barcodeEvidenceAttachmentMutation.data || null}
      storageLocations={storageLocationsQuery.data || []}
      storageLocationsLoading={storageLocationsQuery.isLoading}
      storageLocationsError={
        storageLocationsQuery.isError
          ? (storageLocationsQuery.error as Error)
          : null
      }
      onPreviewBarcodeUsage={handlePreviewBarcodeUsage}
      onRecordBarcodeUsage={handleRecordBarcodeUsage}
      bulkPreviewing={bulkUsageReadinessMutation.isPending}
      bulkPreviewError={
        bulkUsageReadinessMutation.isError
          ? (bulkUsageReadinessMutation.error as Error)
          : null
      }
      bulkPreviewResult={(bulkUsageReadinessMutation.data as InventoryUsageBulkReadinessResponse) || null}
      onPreviewBulkUsage={handlePreviewBulkUsage}
      bulkRecording={bulkUsageMutation.isPending}
      bulkError={
        bulkUsageMutation.isError ? (bulkUsageMutation.error as Error) : null
      }
      bulkResult={bulkUsageMutation.data || null}
      onRecordBulkUsage={handleRecordBulkUsage}
      logs={usageLogs}
      logsLoading={logsQuery.isLoading}
      logsError={logsQuery.isError ? (logsQuery.error as Error) : null}
      selectedUsageLogId={selectedUsageLogId}
      usageLogDetail={usageLogDetailQuery.data || null}
      usageLogDetailLoading={usageLogDetailQuery.isLoading}
      usageLogDetailError={
        usageLogDetailQuery.isError
          ? (usageLogDetailQuery.error as Error)
          : null
      }
      onSelectUsageLog={setSelectedUsageLogId}
      onCloseUsageLogDetail={() => setSelectedUsageLogId("")}
      reversingUsageId={reverseUsageMutation.variables?.usageLogId || null}
      reverseError={
        reverseUsageMutation.isError
          ? (reverseUsageMutation.error as Error)
          : null
      }
      onReverseUsage={handleReverseUsage}
      reviewingUsageId={reviewUsageMutation.variables?.usageLogId || null}
      reviewError={
        reviewUsageMutation.isError
          ? (reviewUsageMutation.error as Error)
          : null
      }
      scanningAlerts={scanUsageAlertsMutation.isPending}
      alertScanError={scanUsageAlertsMutation.error}
      alertScanResult={scanUsageAlertsMutation.data}
      onScanAlerts={handleScanUsageAlerts}
      onReviewUsage={handleReviewUsage}
    />
  );
}
