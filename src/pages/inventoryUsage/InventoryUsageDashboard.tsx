import type { Dispatch, SetStateAction } from "react";
import { InventoryUsageBulkRecorder } from "./InventoryUsageBulkRecorder";
import { InventoryUsageQuickConsumePanel } from "./InventoryUsageQuickConsumePanel";
import { InventoryUsageGovernancePanel } from "./InventoryUsageGovernancePanel";
import { InventoryUsagePeriodClosuresPanel } from "./InventoryUsagePeriodClosuresPanel";
import { InventoryUsageScheduledTemplatesPanel } from "./InventoryUsageScheduledTemplatesPanel";
import { InventoryUsageTemplatesPanel } from "./InventoryUsageTemplatesPanel";
import {
  DEFAULT_USAGE_FILTERS,
  USAGE_REASON_OPTIONS,
} from "./inventoryUsageConfig";
import {
  formatDateTime,
  formatMoney,
  formatUsageReason,
  toNumber,
} from "./inventoryUsageFormatting";
import { styles } from "./inventoryUsageStyles";
import type {
  InventoryUsageAlertScanResponse,
  InventoryUsageAnomalies,
  InventoryUsageAttachmentResponse,
  InventoryUsageBarcodeRequest,
  InventoryUsageBarcodePreviewResponse,
  InventoryUsageBarcodeResponse,
  InventoryUsageBulkLine,
  InventoryUsageBulkReadinessResponse,
  InventoryUsageBulkResponse,
  InventoryUsageExceptions,
  InventoryUsageImpact,
  InventoryUsageLog,
  InventoryUsageLogDetail,
  InventoryUsagePeriodClosure,
  InventoryUsagePeriodClosureDraft,
  InventoryUsagePeriodClosurePreviewResponse,
  InventoryUsagePeriodClosureResponse,
  InventoryUsageScheduledTemplates,
  InventoryUsageStorageLocationOption,
  InventoryUsageSummary,
  InventoryUsageTemplate,
  InventoryUsageScheduledTemplateRunDueResponse,
  InventoryUsageTemplateConsumeResponse,
  InventoryUsageTemplateDraft,
  InventoryUsageTemplateReadiness,
  UsageFilters,
} from "./inventoryUsageTypes";

type InventoryUsageDashboardProps = {
  permissions: {
    canRecord: boolean;
    canBulkRecord: boolean;
    canReverse: boolean;
    canReview: boolean;
    canClosePeriods: boolean;
    canManageTemplates: boolean;
    canRunScheduled: boolean;
  };
  filters: UsageFilters;
  setFilters: Dispatch<SetStateAction<UsageFilters>>;
  activeFilterCount: number;
  exportRowCount: number;
  onExportCsv: () => void;
  summary?: InventoryUsageSummary;
  summaryLoading: boolean;
  exceptions?: InventoryUsageExceptions;
  exceptionsLoading: boolean;
  anomalies?: InventoryUsageAnomalies;
  anomaliesLoading: boolean;
  impact?: InventoryUsageImpact;
  impactLoading: boolean;
  periodClosures: InventoryUsagePeriodClosure[];
  periodClosuresLoading: boolean;
  periodClosuresError?: Error | null;
  periodPreviewing: boolean;
  periodPreviewError?: Error | null;
  periodPreviewResult?: InventoryUsagePeriodClosurePreviewResponse | null;
  onPreviewPeriodClose: (draft: InventoryUsagePeriodClosureDraft) => void;
  periodClosing: boolean;
  periodCloseError?: Error | null;
  periodCloseResult?: InventoryUsagePeriodClosureResponse | null;
  onClosePeriod: (draft: InventoryUsagePeriodClosureDraft) => void;
  templates: InventoryUsageTemplate[];
  templatesLoading: boolean;
  scheduledTemplates?: InventoryUsageScheduledTemplates;
  scheduledTemplatesLoading: boolean;
  scheduledTemplatesError?: Error | null;
  scheduledTemplatesRunning?: boolean;
  scheduledTemplatesRunError?: Error | null;
  scheduledTemplatesRunResult?: InventoryUsageScheduledTemplateRunDueResponse | null;
  onRunDueScheduledTemplates?: () => void;
  templatesError?: Error | null;
  templateCreating: boolean;
  templateCreateError?: Error | null;
  templateArchivingId?: string | null;
  templateArchiveError?: Error | null;
  templateRecordingId?: string | null;
  templateRecordError?: Error | null;
  templateRecordResult?: InventoryUsageTemplateConsumeResponse | null;
  templateReadinessById?: Record<string, InventoryUsageTemplateReadiness>;
  selectedTemplate?: InventoryUsageTemplate | null;
  onCreateTemplate: (draft: InventoryUsageTemplateDraft) => void;
  onUseTemplate: (template: InventoryUsageTemplate) => void;
  onArchiveTemplate: (template: InventoryUsageTemplate) => void;
  onRecordTemplate: (template: InventoryUsageTemplate) => void;
  barcodePreviewing?: boolean;
  barcodePreviewError?: Error | null;
  barcodePreviewResult?: InventoryUsageBarcodePreviewResponse | null;
  barcodeRecording: boolean;
  barcodeError?: Error | null;
  barcodeResult?: InventoryUsageBarcodeResponse | null;
  barcodeCompletionKey?: number;
  barcodeCompletionMessage?: string;
  barcodeEvidenceLinking?: boolean;
  barcodeEvidenceError?: Error | null;
  barcodeEvidenceResult?: InventoryUsageAttachmentResponse | null;
  storageLocations: InventoryUsageStorageLocationOption[];
  storageLocationsLoading: boolean;
  storageLocationsError?: Error | null;
  onPreviewBarcodeUsage?: (payload: InventoryUsageBarcodeRequest) => void;
  onRecordBarcodeUsage: (payload: InventoryUsageBarcodeRequest) => Promise<InventoryUsageBarcodeResponse>;
  bulkPreviewing?: boolean;
  bulkPreviewError?: Error | null;
  bulkPreviewResult?: InventoryUsageBulkReadinessResponse | null;
  onPreviewBulkUsage?: (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    items: InventoryUsageBulkLine[];
  }) => void;
  bulkRecording: boolean;
  bulkError?: Error | null;
  bulkResult?: InventoryUsageBulkResponse | null;
  onRecordBulkUsage: (payload: {
    consumption_reason?: string;
    department?: string;
    event_name?: string;
    notes?: string;
    consumed_at?: string;
    reference_type?: string;
    reference_id?: string;
    items: InventoryUsageBulkLine[];
  }) => void;
  logs: InventoryUsageLog[];
  logsLoading: boolean;
  logsError?: Error | null;
  selectedUsageLogId?: string;
  usageLogDetail?: InventoryUsageLogDetail | null;
  usageLogDetailLoading?: boolean;
  usageLogDetailError?: Error | null;
  onSelectUsageLog: (usageLogId: string) => void;
  onCloseUsageLogDetail: () => void;
  reversingUsageId?: string | null;
  reverseError?: Error | null;
  onReverseUsage: (usageLogId: string) => void;
  reviewingUsageId?: string | null;
  reviewError?: Error | null;
  onReviewUsage: (
    usageLogId: string,
    reviewStatus: "reviewed" | "follow_up_required",
  ) => void;
  scanningAlerts?: boolean;
  alertScanError?: Error | null;
  alertScanResult?: InventoryUsageAlertScanResponse | null;
  onScanAlerts?: () => void;
};

export function InventoryUsageDashboard({
  permissions,
  filters,
  setFilters,
  activeFilterCount,
  exportRowCount,
  onExportCsv,
  summary,
  summaryLoading,
  exceptions,
  exceptionsLoading,
  anomalies,
  anomaliesLoading,
  impact,
  impactLoading,
  periodClosures,
  periodClosuresLoading,
  periodClosuresError,
  periodPreviewing,
  periodPreviewError,
  periodPreviewResult,
  onPreviewPeriodClose,
  periodClosing,
  periodCloseError,
  periodCloseResult,
  onClosePeriod,
  templates,
  templatesLoading,
  scheduledTemplates,
  scheduledTemplatesLoading,
  scheduledTemplatesError,
  scheduledTemplatesRunning,
  scheduledTemplatesRunError,
  scheduledTemplatesRunResult,
  onRunDueScheduledTemplates,
  templatesError,
  templateCreating,
  templateCreateError,
  templateArchivingId,
  templateArchiveError,
  templateRecordingId,
  templateRecordError,
  templateRecordResult,
  templateReadinessById,
  selectedTemplate,
  onCreateTemplate,
  onUseTemplate,
  onArchiveTemplate,
  onRecordTemplate,
  barcodePreviewing,
  barcodePreviewError,
  barcodePreviewResult,
  barcodeRecording,
  barcodeError,
  barcodeResult,
  barcodeCompletionKey = 0,
  barcodeCompletionMessage = "",
  barcodeEvidenceLinking,
  barcodeEvidenceError,
  barcodeEvidenceResult,
  storageLocations,
  storageLocationsLoading,
  storageLocationsError,
  onPreviewBarcodeUsage,
  onRecordBarcodeUsage,
  bulkPreviewing,
  bulkPreviewError,
  bulkPreviewResult,
  onPreviewBulkUsage,
  bulkRecording,
  bulkError,
  bulkResult,
  onRecordBulkUsage,
  logs,
  logsLoading,
  logsError,
  selectedUsageLogId,
  usageLogDetail,
  usageLogDetailLoading,
  usageLogDetailError,
  onSelectUsageLog,
  onCloseUsageLogDetail,
  reversingUsageId,
  reverseError,
  onReverseUsage,
  reviewingUsageId,
  reviewError,
  onReviewUsage,
  scanningAlerts,
  alertScanError,
  alertScanResult,
  onScanAlerts,
}: InventoryUsageDashboardProps) {
  const totals = summary?.totals;

  const escapeCsvCell = (value: unknown) => {
    const raw = value === null || value === undefined ? "" : String(value);
    const safeRaw = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safeRaw.replace(/"/g, '""')}"`;
  };

  const downloadCsv = (
    filename: string,
    headers: string[],
    rows: Array<Record<string, unknown>>,
  ) => {
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCsvCell(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportImpactCsv = () => {
    const headers = [
      "product_id",
      "product_name",
      "storage_location_id",
      "storage_location_name",
      "usage_count",
      "total_quantity",
      "unit",
      "estimated_usage_value",
      "missing_cost_count",
      "observed_usage_days",
      "average_daily_usage",
      "current_quantity",
      "effective_min_quantity",
      "estimated_days_of_coverage",
      "recommended_reorder_quantity",
      "impact_status",
      "last_consumed_at",
    ];

    downloadCsv(
      `inventory-usage-stock-impact-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      (impact?.rows ?? []).map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        storage_location_id: row.storage_location_id,
        storage_location_name: row.storage_location_name,
        usage_count: row.usage_count,
        total_quantity: row.total_quantity,
        unit: row.product_unit,
        estimated_usage_value: row.estimated_usage_value,
        missing_cost_count: row.missing_cost_count,
        observed_usage_days: row.observed_usage_days,
        average_daily_usage: row.average_daily_usage,
        current_quantity: row.current_quantity,
        effective_min_quantity: row.effective_min_quantity,
        estimated_days_of_coverage: row.estimated_days_of_coverage,
        recommended_reorder_quantity: row.recommended_reorder_quantity,
        impact_status: row.impact_status,
        last_consumed_at: row.last_consumed_at,
      })),
    );
  };

  const exportAnomaliesCsv = () => {
    const headers = [
      "usage_date",
      "product_id",
      "product_name",
      "daily_quantity",
      "unit",
      "usage_count",
      "average_daily_quantity",
      "spike_multiplier",
      "observed_days",
    ];

    downloadCsv(
      `inventory-usage-anomalies-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      (anomalies?.rows ?? []).map((row) => ({
        usage_date: row.usage_date,
        product_id: row.product_id,
        product_name: row.product_name,
        daily_quantity: row.daily_quantity,
        unit: row.product_unit,
        usage_count: row.usage_count,
        average_daily_quantity: row.average_daily_quantity,
        spike_multiplier: row.spike_multiplier,
        observed_days: row.observed_days,
      })),
    );
  };

  return (
    <div style={styles.page}>
      <section style={styles.heroCard}>
        <div>
          <p style={styles.eyebrow}>Feature 2 · Usage / Consumption Logging</p>
          <h1 style={styles.title}>Inventory usage ledger</h1>
          <p style={styles.subtitle}>
            Track why stock leaves the business: guest use, internal use, waste,
            damage, events, maintenance, and other operational consumption.
          </p>
        </div>
        <div style={styles.heroActions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setFilters(DEFAULT_USAGE_FILTERS)}
            disabled={activeFilterCount === 0}
          >
            Reset filters
          </button>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={onExportCsv}
            disabled={!exportRowCount}
          >
            Export CSV
          </button>
        </div>
      </section>

      <section style={styles.filterCard}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Operational filters</h2>
            <p style={styles.sectionDescription}>
              Use exact product/location IDs when drilling from audit records or
              stock screens.
            </p>
          </div>
          <span style={styles.filterPill}>{activeFilterCount} active</span>
        </div>

        <div style={styles.filterGrid}>
          <label style={styles.fieldLabel}>
            Product ID
            <input
              style={styles.input}
              value={filters.product_id}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  product_id: event.target.value,
                }))
              }
              placeholder="Optional product UUID"
            />
          </label>
          <label style={styles.fieldLabel}>
            Location ID
            <input
              style={styles.input}
              value={filters.storage_location_id}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  storage_location_id: event.target.value,
                }))
              }
              placeholder="Optional location UUID"
            />
          </label>
          <label style={styles.fieldLabel}>
            Reason
            <select
              style={styles.input}
              value={filters.consumption_reason}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  consumption_reason: event.target.value,
                }))
              }
            >
              <option value="">All reasons</option>
              {USAGE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Department / team
            <input
              style={styles.input}
              value={filters.department}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  department: event.target.value,
                }))
              }
              placeholder="Housekeeping, kitchen, maintenance..."
            />
          </label>
          <label style={styles.fieldLabel}>
            From
            <input
              type="date"
              style={styles.input}
              value={filters.date_from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  date_from: event.target.value,
                }))
              }
            />
          </label>
          <label style={styles.fieldLabel}>
            To
            <input
              type="date"
              style={styles.input}
              value={filters.date_to}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  date_to: event.target.value,
                }))
              }
            />
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={filters.include_reversed === "true"}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  include_reversed: event.target.checked ? "true" : "",
                }))
              }
            />
            Include reversed usage
          </label>
        </div>
      </section>

      <InventoryUsageScheduledTemplatesPanel
        canRunDueTemplates={permissions.canRunScheduled}
        scheduled={scheduledTemplates}
        loading={scheduledTemplatesLoading}
        error={scheduledTemplatesError}
        runningDueTemplates={scheduledTemplatesRunning}
        runDueError={scheduledTemplatesRunError}
        runDueResult={scheduledTemplatesRunResult}
        onRunDueTemplates={
          permissions.canRunScheduled ? onRunDueScheduledTemplates : undefined
        }
      />

      <InventoryUsageTemplatesPanel
        canManageTemplates={permissions.canManageTemplates}
        canRecordTemplates={permissions.canRecord}
        templates={templates}
        loading={templatesLoading}
        error={templatesError}
        creating={templateCreating}
        createError={templateCreateError}
        archivingTemplateId={templateArchivingId}
        archiveError={templateArchiveError}
        recordingTemplateId={templateRecordingId}
        recordError={templateRecordError}
        recordResult={templateRecordResult}
        templateReadinessById={templateReadinessById}
        onCreateTemplate={onCreateTemplate}
        onUseTemplate={onUseTemplate}
        onArchiveTemplate={onArchiveTemplate}
        onRecordTemplate={onRecordTemplate}
      />

      {permissions.canRecord ? (
        <InventoryUsageQuickConsumePanel
          key={barcodeCompletionKey}
          completionMessage={barcodeCompletionMessage}
          canRecord={permissions.canRecord}
          previewing={Boolean(barcodePreviewing)}
          previewError={barcodePreviewError}
          previewResult={barcodePreviewResult}
          recording={barcodeRecording}
          error={barcodeError}
          result={barcodeResult}
          evidenceLinking={barcodeEvidenceLinking}
          evidenceError={barcodeEvidenceError}
          evidenceResult={barcodeEvidenceResult}
          storageLocations={storageLocations}
          storageLocationsLoading={storageLocationsLoading}
          storageLocationsError={storageLocationsError}
          onPreviewBarcodeUsage={onPreviewBarcodeUsage}
          onRecordBarcodeUsage={onRecordBarcodeUsage}
        />
      ) : null}

      {permissions.canBulkRecord ? (
        <InventoryUsageBulkRecorder
          selectedTemplate={selectedTemplate}
          previewing={Boolean(bulkPreviewing)}
          previewError={bulkPreviewError}
          previewResult={bulkPreviewResult}
          onPreviewBulkUsage={onPreviewBulkUsage}
          recording={bulkRecording}
          error={bulkError}
          result={bulkResult}
          onRecordBulkUsage={onRecordBulkUsage}
        />
      ) : null}

      <section style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Usage events</span>
          <strong style={styles.statValue}>
            {toNumber(totals?.usage_count)}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Quantity consumed</span>
          <strong style={styles.statValue}>
            {toNumber(totals?.total_quantity)}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Estimated usage value</span>
          <strong style={styles.statValue}>
            {formatMoney(totals?.estimated_usage_value)}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Missing cost entries</span>
          <strong style={styles.statValue}>
            {toNumber(totals?.missing_cost_count)}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>First consumed</span>
          <strong style={styles.statValueSmall}>
            {formatDateTime(totals?.first_consumed_at)}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Last consumed</span>
          <strong style={styles.statValueSmall}>
            {formatDateTime(totals?.last_consumed_at)}
          </strong>
        </div>
      </section>

      <InventoryUsageGovernancePanel
        canReviewUsage={permissions.canReview}
        summary={summary}
        exceptions={exceptions}
        logs={logs}
        loading={
          summaryLoading || exceptionsLoading || anomaliesLoading || logsLoading
        }
        reviewingUsageId={reviewingUsageId}
        reviewError={reviewError}
        canScanAlerts={permissions.canReview}
        scanningAlerts={scanningAlerts}
        alertScanError={alertScanError}
        alertScanResult={alertScanResult}
        onScanAlerts={onScanAlerts}
        onReviewUsage={onReviewUsage}
      />

      <section style={styles.breakdownGrid}>
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>By reason</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>Loading reason breakdown...</p>
          ) : !summary?.by_reason?.length ? (
            <p style={styles.emptyState}>
              No usage reason data for the selected filters.
            </p>
          ) : (
            <div style={styles.breakdownList}>
              {summary.by_reason.map((row) => (
                <div key={row.consumption_reason} style={styles.breakdownRow}>
                  <span>{formatUsageReason(row.consumption_reason)}</span>
                  <strong>{toNumber(row.total_quantity)}</strong>
                  <small>
                    {toNumber(row.usage_count)} events ·{" "}
                    {formatMoney(row.estimated_usage_value)} est. value
                    {toNumber(row.missing_cost_count)
                      ? ` · ${toNumber(row.missing_cost_count)} missing cost`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>By department</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              Loading department breakdown...
            </p>
          ) : !summary?.by_department?.length ? (
            <p style={styles.emptyState}>
              No department data for the selected filters.
            </p>
          ) : (
            <div style={styles.breakdownList}>
              {summary.by_department.map((row) => (
                <div
                  key={row.department || "unassigned"}
                  style={styles.breakdownRow}
                >
                  <span>{row.department || "Unassigned"}</span>
                  <strong>{toNumber(row.total_quantity)}</strong>
                  <small>
                    {toNumber(row.usage_count)} events ·{" "}
                    {formatMoney(row.estimated_usage_value)} est. value
                    {toNumber(row.missing_cost_count)
                      ? ` · ${toNumber(row.missing_cost_count)} missing cost`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>By location</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              Loading location breakdown...
            </p>
          ) : !summary?.by_location?.length ? (
            <p style={styles.emptyState}>
              No location data for the selected filters.
            </p>
          ) : (
            <div style={styles.breakdownList}>
              {summary.by_location.map((row) => (
                <div
                  key={row.storage_location_id}
                  style={styles.breakdownRowStacked}
                >
                  <span>
                    {row.storage_location_name || row.storage_location_id}
                  </span>
                  <strong>{toNumber(row.total_quantity)}</strong>
                  <small>
                    {toNumber(row.usage_count)} events ·{" "}
                    {formatMoney(row.estimated_usage_value)} est. value · last{" "}
                    {formatDateTime(row.last_consumed_at)}
                    {toNumber(row.missing_cost_count)
                      ? ` · ${toNumber(row.missing_cost_count)} missing cost`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>By user</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>Loading user breakdown...</p>
          ) : !summary?.by_user?.length ? (
            <p style={styles.emptyState}>
              No user attribution data for the selected filters.
            </p>
          ) : (
            <div style={styles.breakdownList}>
              {summary.by_user.map((row) => (
                <div
                  key={
                    row.created_by_user_id ||
                    row.created_by_user_name ||
                    "system"
                  }
                  style={styles.breakdownRowStacked}
                >
                  <span>
                    {row.created_by_user_name ||
                      row.created_by_user_id ||
                      "System / unknown"}
                  </span>
                  <strong>{toNumber(row.total_quantity)}</strong>
                  <small>
                    {toNumber(row.usage_count)} events ·{" "}
                    {formatMoney(row.estimated_usage_value)} est. value · last{" "}
                    {formatDateTime(row.last_consumed_at)}
                    {toNumber(row.missing_cost_count)
                      ? ` · ${toNumber(row.missing_cost_count)} missing cost`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.cardWide}>
          <h2 style={styles.sectionTitle}>Daily usage trend</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              Loading daily usage trend...
            </p>
          ) : !summary?.by_day?.length ? (
            <p style={styles.emptyState}>
              No daily usage trend data for the selected filters.
            </p>
          ) : (
            <div style={styles.trendList}>
              {summary.by_day.map((row) => (
                <div key={row.usage_date} style={styles.trendRow}>
                  <span>{row.usage_date}</span>
                  <strong>{toNumber(row.total_quantity)} consumed</strong>
                  <small>
                    {toNumber(row.usage_count)} events ·{" "}
                    {toNumber(row.product_count)} products ·{" "}
                    {toNumber(row.location_count)} locations ·{" "}
                    {formatMoney(row.estimated_usage_value)} est. value
                    {toNumber(row.missing_cost_count)
                      ? ` · ${toNumber(row.missing_cost_count)} missing cost`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.cardWide}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Usage stock impact</h2>
              <p style={styles.sectionDescription}>
                Shows consumed products whose current stock may now be depleted,
                below minimum, or lower than the quantity consumed in the
                selected period.
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={exportImpactCsv}
              disabled={!impact?.rows?.length}
            >
              Export impact CSV
            </button>
          </div>
          {impactLoading ? (
            <p style={styles.sectionDescription}>
              Loading usage stock impact...
            </p>
          ) : !impact?.rows?.length ? (
            <p style={styles.emptyState}>
              No stock impact rows for the selected filters.
            </p>
          ) : (
            <>
              <div style={styles.governanceGrid}>
                <div style={styles.governanceCard}>
                  <span>Impacted rows</span>
                  <strong>{toNumber(impact.summary?.impacted_count)}</strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>Depleted</span>
                  <strong>{toNumber(impact.summary?.depleted_count)}</strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>Below minimum</span>
                  <strong>
                    {toNumber(impact.summary?.below_minimum_count)}
                  </strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>Usage value</span>
                  <strong>
                    {formatMoney(impact.summary?.estimated_usage_value)}
                  </strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>Recommended reorder</span>
                  <strong>
                    {toNumber(impact.summary?.recommended_reorder_quantity)}
                  </strong>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Location</th>
                      <th style={styles.th}>Used</th>
                      <th style={styles.th}>Current</th>
                      <th style={styles.th}>Minimum</th>
                      <th style={styles.th}>Avg/day</th>
                      <th style={styles.th}>Coverage</th>
                      <th style={styles.th}>Reorder</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Last used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.rows.map((row) => (
                      <tr key={`${row.product_id}-${row.storage_location_id}`}>
                        <td style={styles.td}>
                          {row.product_name || row.product_id}
                        </td>
                        <td style={styles.td}>
                          {row.storage_location_name || row.storage_location_id}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.total_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.current_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.effective_min_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.average_daily_usage)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {row.estimated_days_of_coverage === null || row.estimated_days_of_coverage === undefined
                            ? "-"
                            : `${toNumber(row.estimated_days_of_coverage)} days`}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.recommended_reorder_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {String(row.impact_status).replace(/_/g, " ")}
                        </td>
                        <td style={styles.td}>
                          {formatDateTime(row.last_consumed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={styles.cardWide}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Usage anomaly watch</h2>
              <p style={styles.sectionDescription}>
                Flags products whose highest daily usage in the selected period
                is more than 2× their observed daily average.
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={exportAnomaliesCsv}
              disabled={!anomalies?.rows?.length}
            >
              Export anomalies CSV
            </button>
          </div>
          {anomaliesLoading ? (
            <p style={styles.sectionDescription}>Loading anomaly watch...</p>
          ) : !anomalies?.rows?.length ? (
            <p style={styles.emptyState}>
              No usage spikes detected for the selected filters.
            </p>
          ) : (
            <>
              <div style={styles.governanceGrid}>
                <div style={styles.governanceCard}>
                  <span>Spike days</span>
                  <strong>{toNumber(anomalies.summary?.spike_count)}</strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>Impacted products</span>
                  <strong>
                    {toNumber(anomalies.summary?.impacted_product_count)}
                  </strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>Highest multiplier</span>
                  <strong>
                    {toNumber(anomalies.summary?.highest_spike_multiplier)}×
                  </strong>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Daily usage</th>
                      <th style={styles.th}>Average</th>
                      <th style={styles.th}>Spike</th>
                      <th style={styles.th}>Observed days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.rows.map((row) => (
                      <tr key={`${row.product_id}-${row.usage_date}`}>
                        <td style={styles.td}>{row.usage_date}</td>
                        <td style={styles.td}>
                          {row.product_name || row.product_id}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.daily_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.average_daily_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.spike_multiplier)}×
                        </td>
                        <td style={styles.td}>{toNumber(row.observed_days)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={styles.cardWide}>
          <h2 style={styles.sectionTitle}>Top consumed products</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              Loading product breakdown...
            </p>
          ) : !summary?.by_product?.length ? (
            <p style={styles.emptyState}>
              No product usage data for the selected filters.
            </p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Events</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_product.map((row) => (
                    <tr key={row.product_id}>
                      <td style={styles.td}>
                        {row.product_name || row.product_id}
                      </td>
                      <td style={styles.td}>{toNumber(row.usage_count)}</td>
                      <td style={styles.td}>{toNumber(row.total_quantity)}</td>
                      <td style={styles.td}>
                        {formatMoney(row.estimated_usage_value)}
                      </td>
                      <td style={styles.td}>
                        {row.estimated_unit_cost
                          ? formatMoney(row.estimated_unit_cost)
                          : "Missing"}
                      </td>
                      <td style={styles.td}>{row.product_unit || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {permissions.canClosePeriods ? (
        <InventoryUsagePeriodClosuresPanel
          closures={periodClosures}
          loading={periodClosuresLoading}
          error={periodClosuresError}
          previewing={periodPreviewing}
          previewError={periodPreviewError}
          previewResult={periodPreviewResult}
          onPreviewPeriodClose={onPreviewPeriodClose}
          closing={periodClosing}
          closeError={periodCloseError}
          closeResult={periodCloseResult}
          onClosePeriod={onClosePeriod}
        />
      ) : null}

      {selectedUsageLogId ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Usage log detail</h2>
              <p style={styles.sectionDescription}>
                Operational audit view for the selected consumption entry,
                including stock movements, review state, reversal linkage, and
                evidence attachments.
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onCloseUsageLogDetail}
            >
              Close detail
            </button>
          </div>

          {usageLogDetailLoading ? (
            <p style={styles.sectionDescription}>Loading usage detail...</p>
          ) : usageLogDetailError ? (
            <p style={styles.errorText}>
              Failed to load usage detail: {usageLogDetailError.message}
            </p>
          ) : usageLogDetail ? (
            <>
              <div style={styles.governanceGrid}>
                <div style={styles.governanceCard}>
                  <span>Product</span>
                  <strong>
                    {usageLogDetail.product_name || usageLogDetail.product_id}
                  </strong>
                  <small>
                    {toNumber(usageLogDetail.quantity)}{" "}
                    {usageLogDetail.product_unit || ""} consumed
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>Location</span>
                  <strong>
                    {usageLogDetail.storage_location_name ||
                      usageLogDetail.storage_location_id}
                  </strong>
                  <small>
                    {usageLogDetail.storage_location_temperature_zone ||
                      "No temperature zone"}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>Reason / department</span>
                  <strong>
                    {formatUsageReason(usageLogDetail.consumption_reason)}
                  </strong>
                  <small>
                    {usageLogDetail.department || "No department"}
                    {usageLogDetail.event_name
                      ? ` · ${usageLogDetail.event_name}`
                      : ""}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>Estimated value</span>
                  <strong>
                    {formatMoney(usageLogDetail.estimated_usage_value)}
                  </strong>
                  <small>
                    {usageLogDetail.estimated_unit_cost
                      ? `${formatMoney(usageLogDetail.estimated_unit_cost)} / ${usageLogDetail.product_unit || "unit"}`
                      : "Missing standard cost"}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>Balance impact</span>
                  <strong>
                    {usageLogDetail.quantity_before ?? "-"} →{" "}
                    {usageLogDetail.quantity_after ?? "-"}
                  </strong>
                  <small>
                    Movement {usageLogDetail.stock_movement_id || "not linked"}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>Review status</span>
                  <strong>{usageLogDetail.review_status || "pending"}</strong>
                  <small>
                    {usageLogDetail.reviewed_by_user_name ||
                      usageLogDetail.reviewed_by_user_id ||
                      "Not reviewed"}
                    {usageLogDetail.reviewed_at
                      ? ` · ${formatDateTime(usageLogDetail.reviewed_at)}`
                      : ""}
                  </small>
                </div>
              </div>

              <div style={styles.governanceGrid}>
                <div style={styles.governanceCardWide}>
                  <span>Notes and reference</span>
                  <strong>{usageLogDetail.notes || "No notes captured"}</strong>
                  <small>
                    {usageLogDetail.reference_type
                      ? `${usageLogDetail.reference_type}: ${usageLogDetail.reference_id || "unlinked"}`
                      : "No linked reference"}
                  </small>
                  <small>
                    Recorded by{" "}
                    {usageLogDetail.created_by_user_name ||
                      usageLogDetail.created_by_user_id ||
                      "system"}{" "}
                    · consumed {formatDateTime(usageLogDetail.consumed_at)}
                  </small>
                </div>
                <div style={styles.governanceCardWide}>
                  <span>Movement audit</span>
                  <strong>
                    Usage movement:{" "}
                    {usageLogDetail.stock_movement?.id ||
                      usageLogDetail.stock_movement_id ||
                      "not linked"}
                  </strong>
                  <small>
                    {usageLogDetail.stock_movement
                      ? `${usageLogDetail.stock_movement.reason || "No reason"} · ${usageLogDetail.stock_movement.change ?? "-"} · ${formatDateTime(usageLogDetail.stock_movement.created_at)}`
                      : "No stock movement summary returned"}
                  </small>
                  <strong>
                    Reversal movement:{" "}
                    {usageLogDetail.reversal_stock_movement?.id ||
                      usageLogDetail.reversal_stock_movement_id ||
                      "not linked"}
                  </strong>
                  <small>
                    {usageLogDetail.reversal_stock_movement
                      ? `${usageLogDetail.reversal_stock_movement.reason || "No reason"} · ${usageLogDetail.reversal_stock_movement.change ?? "-"} · ${formatDateTime(usageLogDetail.reversal_stock_movement.created_at)}`
                      : usageLogDetail.reversal_reason || "Not reversed"}
                  </small>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Evidence file</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Uploaded by</th>
                      <th style={styles.th}>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogDetail.attachments?.length ? (
                      usageLogDetail.attachments.map((attachment) => (
                        <tr key={attachment.id}>
                          <td style={styles.td}>
                            {attachment.original_filename ||
                              attachment.stored_filename ||
                              attachment.id}
                          </td>
                          <td style={styles.td}>
                            {attachment.mime_type || "-"}
                          </td>
                          <td style={styles.td}>
                            {attachment.uploaded_by_user_name ||
                              attachment.uploaded_by_user_id ||
                              "-"}
                          </td>
                          <td style={styles.td}>
                            {formatDateTime(attachment.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan={4}>
                          No evidence attachments linked to this usage log.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Usage ledger</h2>
            <p style={styles.sectionDescription}>
              Latest 100 first-class usage logs, linked back to stock movement
              IDs for audit traceability. Reversals restore stock through a
              compensating movement instead of deleting history.
            </p>
            {reverseError ? (
              <p style={styles.errorText}>
                Usage reversal failed: {reverseError.message}
              </p>
            ) : null}
          </div>
        </div>

        {logsLoading ? (
          <p style={styles.sectionDescription}>Loading usage ledger...</p>
        ) : logsError ? (
          <p style={styles.errorText}>
            Failed to load usage ledger: {logsError.message}
          </p>
        ) : !logs.length ? (
          <p style={styles.emptyState}>
            No usage logs match the selected filters.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Consumed</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Est. value</th>
                  <th style={styles.th}>Balance</th>
                  <th style={styles.th}>Context</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((usage) => (
                  <tr key={usage.id}>
                    <td style={styles.td}>
                      {formatDateTime(usage.consumed_at)}
                    </td>
                    <td style={styles.td}>
                      {usage.product_name || usage.product_id}
                    </td>
                    <td style={styles.td}>
                      {usage.storage_location_name || usage.storage_location_id}
                    </td>
                    <td style={styles.td}>
                      {formatUsageReason(usage.consumption_reason)}
                    </td>
                    <td style={styles.td}>{usage.department || "-"}</td>
                    <td style={styles.td}>
                      -{toNumber(usage.quantity)} {usage.product_unit || ""}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contextCell}>
                        <span>{formatMoney(usage.estimated_usage_value)}</span>
                        <small>
                          {usage.estimated_unit_cost
                            ? `${formatMoney(usage.estimated_unit_cost)} / ${usage.product_unit || "unit"}`
                            : "Missing standard cost"}
                        </small>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {usage.quantity_before ?? "-"} →{" "}
                      {usage.quantity_after ?? "-"}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contextCell}>
                        <span>{usage.event_name || "No event/job"}</span>
                        <small>{usage.notes || "No notes"}</small>
                        <small>
                          {usage.reference_type
                            ? `${usage.reference_type}: ${usage.reference_id || "unlinked"}`
                            : "No linked reference"}
                        </small>
                        <small>
                          Movement {usage.stock_movement_id || "not linked"}
                        </small>
                        <small>
                          By{" "}
                          {usage.created_by_user_name ||
                            usage.created_by_user_id ||
                            "system"}
                        </small>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {usage.reversed_at ? (
                        <div style={styles.contextCell}>
                          <strong>Reversed</strong>
                          <small>{formatDateTime(usage.reversed_at)}</small>
                          <small>
                            {usage.reversal_reason || "No reversal reason"}
                          </small>
                        </div>
                      ) : (
                        <span>Active</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => onSelectUsageLog(usage.id)}
                        >
                          Details
                        </button>
                        {permissions.canReverse ? (
                          <button
                            type="button"
                            style={styles.dangerButton}
                            data-skip-global-action-feedback="true"
                            onClick={() => onReverseUsage(usage.id)}
                            disabled={
                              Boolean(usage.reversed_at) ||
                              reversingUsageId === usage.id
                            }
                          >
                            {reversingUsageId === usage.id
                              ? "Reversing..."
                              : "Reverse"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
