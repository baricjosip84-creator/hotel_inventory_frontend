import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useAppTranslation } from "../../i18n/I18nContext";
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from "../../i18n/formatters";
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs,
} from "../../components/ui/OperationalWorkspace";
import { InventoryUsageBulkRecorder } from "./InventoryUsageBulkRecorder";
import { SidebarAttentionMarker, SidebarAttentionTabDot } from "../../components/ui/SidebarAttentionMarker";
import { sidebarAttentionItemStyle } from "../../components/ui/SidebarAttentionStyles";
import { useOperationalAttentionItems } from "../../lib/sidebarAttentionItems";
import { InventoryUsageQuickConsumePanel } from "./InventoryUsageQuickConsumePanel";
import { InventoryUsageGovernancePanel } from "./InventoryUsageGovernancePanel";
import { InventoryUsagePeriodClosuresPanel } from "./InventoryUsagePeriodClosuresPanel";
import { InventoryUsageScheduledTemplatesPanel } from "./InventoryUsageScheduledTemplatesPanel";
import { InventoryUsageTemplatesPanel } from "./InventoryUsageTemplatesPanel";
import { fetchInventoryUsageAnomalies, fetchInventoryUsageImpact } from "./inventoryUsageApi";
import {
  DEFAULT_USAGE_FILTERS,
  USAGE_REASON_OPTIONS,
} from "./inventoryUsageConfig";
import {
  formatCodeLabel,
  formatUsageReason,
  shortenId,
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
  InventoryUsageProductOption,
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

type UsageWorkspaceArea = "overview" | "record" | "templates" | "close" | "ledger";

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
  invalidDateRange: boolean;
  exportRowCount: number;
  exportingCsv?: boolean;
  refreshingPage?: boolean;
  onRefreshPage: () => void;
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
  productOptions: InventoryUsageProductOption[];
  storageLocations: InventoryUsageStorageLocationOption[];
  filterProductOptions: InventoryUsageProductOption[];
  filterStorageLocations: InventoryUsageStorageLocationOption[];
  departmentOptions: string[];
  usageOptionsLoading: boolean;
  usageOptionsError?: Error | null;
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
  ledgerPage: number;
  ledgerPageSize: number;
  ledgerTotal: number;
  onLedgerPageChange: (page: number) => void;
  onLedgerPageSizeChange: (size: number) => void;
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
  invalidDateRange,
  exportRowCount,
  exportingCsv = false,
  refreshingPage = false,
  onRefreshPage,
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
  productOptions,
  storageLocations,
  filterProductOptions,
  filterStorageLocations,
  departmentOptions,
  usageOptionsLoading,
  usageOptionsError,
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
  ledgerPage,
  ledgerPageSize,
  ledgerTotal,
  onLedgerPageChange,
  onLedgerPageSizeChange,
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
  const { locale, ui } = useAppTranslation();
  const usageAttentionItemsQuery = useOperationalAttentionItems("usage_ledger", permissions.canReview);
  const usageAttentionIds = usageAttentionItemsQuery.attentionIds;
  const formatNumber = (value: number | string | null | undefined, maximumFractionDigits = 2) => {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return formatLocalizedNumber(numeric, locale, { maximumFractionDigits });
  };
  const formatDateLocal = (value: string | null | undefined) => formatLocalizedDate(value, locale);
  const formatDateTimeLocal = (value: string | null | undefined) => formatLocalizedDateTime(value, locale);
  const formatMoneyLocal = (value: number | string | null | undefined, currency?: string | null) =>
    formatLocalizedCurrency(toNumber(value), currency || "EUR", locale, { maximumFractionDigits: 2 });
  const formatDaysLocal = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "—";
    const days = toNumber(value);
    return `${formatLocalizedNumber(days, locale, { maximumFractionDigits: days < 10 ? 1 : 0 })} ${Math.abs(days - 1) < 0.0001 ? ui("day") : ui("days")}`;
  };
  const formatUsageReasonLocal = (reason: string | null | undefined) => {
    const labels: Record<string, string> = {
      guest_use: "Guest use", internal_use: "Internal use", damage: "Damage", waste: "Waste",
      event: "Event", maintenance: "Maintenance", other: "Other"
    };
    return reason && labels[reason] ? ui(labels[reason]) : (reason ? formatUsageReason(reason) : ui("Unassigned"));
  };
  const formatCodeLabelLocal = (value: string | null | undefined) => {
    const labels: Record<string, string> = {
      pending: "Pending", reviewed: "Reviewed", follow_up_required: "Follow-up required",
      depleted: "Depleted", below_minimum: "Below minimum", usage_exceeds_current_stock: "Usage exceeds current stock", healthy: "Healthy"
    };
    return value && labels[value] ? ui(labels[value]) : formatCodeLabel(value);
  };
  const totals = summary?.totals;
  const ledgerStart = ledgerTotal > 0 ? (ledgerPage - 1) * ledgerPageSize + 1 : 0;
  const ledgerEnd = ledgerTotal > 0
    ? Math.min(ledgerPage * ledgerPageSize, ledgerTotal)
    : 0;
  const [exportingImpact, setExportingImpact] = useState(false);
  const [exportingAnomalies, setExportingAnomalies] = useState(false);
  const [analyticsExportError, setAnalyticsExportError] = useState("");
  const [activeArea, setActiveArea] = useState<UsageWorkspaceArea>("overview");

  useEffect(() => {
    if (activeArea === "record" && !permissions.canRecord && !permissions.canBulkRecord) {
      setActiveArea("overview");
      return;
    }
    if (activeArea === "close" && !permissions.canClosePeriods) {
      setActiveArea("overview");
    }
  }, [activeArea, permissions.canBulkRecord, permissions.canClosePeriods, permissions.canRecord]);

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

  const exportImpactCsv = async () => {
    setExportingImpact(true);
    setAnalyticsExportError("");

    try {
      const allRows = [];
      const batchSize = 500;
      let offset = 0;

      while (true) {
        const response = await fetchInventoryUsageImpact(filters, batchSize, offset);
        const batch = response.rows || [];
        allRows.push(...batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }

      const headers = [
        "product_id", "product_name", "storage_location_id", "storage_location_name",
        "usage_count", "total_quantity", "unit", "estimated_usage_value",
        "missing_cost_count", "observed_usage_days", "average_daily_usage",
        "current_quantity", "effective_min_quantity", "estimated_days_of_coverage",
        "recommended_reorder_quantity", "impact_status", "last_consumed_at",
      ];

      downloadCsv(
        `inventory-usage-stock-impact-${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        allRows.map((row) => ({
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
    } catch (error) {
      setAnalyticsExportError(error instanceof Error ? error.message : ui("Could not export usage impact."));
    } finally {
      setExportingImpact(false);
    }
  };

  const exportAnomaliesCsv = async () => {
    setExportingAnomalies(true);
    setAnalyticsExportError("");

    try {
      const allRows = [];
      const batchSize = 500;
      let offset = 0;

      while (true) {
        const response = await fetchInventoryUsageAnomalies(filters, batchSize, offset);
        const batch = response.rows || [];
        allRows.push(...batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }

      const headers = [
        "usage_date", "product_id", "product_name", "daily_quantity", "unit",
        "usage_count", "average_daily_quantity", "spike_multiplier", "observed_days",
      ];

      downloadCsv(
        `inventory-usage-anomalies-${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        allRows.map((row) => ({
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
    } catch (error) {
      setAnalyticsExportError(error instanceof Error ? error.message : ui("Could not export usage anomalies."));
    } finally {
      setExportingAnomalies(false);
    }
  };

  return (
    <div className="io-operational-page io-usage-ledger-page io-workspace-page" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/inventory-usage"
        eyebrow={ui("Usage operations")}
        title={ui("Inventory usage ledger")}
        description={ui("Record and review why stock leaves the business, with operational attribution, stock impact, audit evidence, templates, and controlled period close.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
            <>
                      <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
                      <OperationalWorkspaceMetaPill>{ui("Stock-linked audit trail")}</OperationalWorkspaceMetaPill>
                      <OperationalWorkspaceMetaPill>{permissions.canRecord || permissions.canBulkRecord ? ui("Usage recording available") : ui("Review-only for current role")}</OperationalWorkspaceMetaPill>
                    </>
          */
        }
        aside={
          <div style={styles.heroActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onRefreshPage}
              disabled={refreshingPage}
            >
              {refreshingPage ? ui("Refreshing...") : ui("Refresh page")}
            </button>
            <button
              type="button"
              style={styles.primaryButton}
              onClick={onExportCsv}
              disabled={!exportRowCount || exportingCsv}
            >
              {exportingCsv ? ui("Preparing CSV...") : ui("Export filtered CSV")}
            </button>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui("Usage summary")}>
        <OperationalWorkspaceStatCard
          label={ui("Usage events")}
          value={formatNumber(totals?.usage_count, 0)}
          helper={ui("Matching the current filters")}
          iconPath="/inventory-usage"
          loading={summaryLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Quantity consumed")}
          value={formatNumber(totals?.total_quantity)}
          helper={ui("May combine products measured in different units")}
          iconPath="/stock"
          loading={summaryLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Estimated usage value")}
          value={formatMoneyLocal(totals?.estimated_usage_value, summary?.currency_code)}
          helper={ui("Estimated from available cost evidence")}
          tone="blue"
          iconPath="/reports"
          loading={summaryLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Missing cost entries")}
          value={formatNumber(totals?.missing_cost_count, 0)}
          helper={ui("Usage records without usable cost evidence")}
          tone={toNumber(totals?.missing_cost_count) > 0 ? "warn" : "good"}
          iconPath="/alerts"
          loading={summaryLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("First consumed")}
          value={formatDateTimeLocal(totals?.first_consumed_at)}
          helper={ui("Earliest matching usage event")}
          iconPath="/inventory-usage"
          loading={summaryLoading}
          className="io-workspace-stat--timestamp"
        />
        <OperationalWorkspaceStatCard
          label={ui("Last consumed")}
          value={formatDateTimeLocal(totals?.last_consumed_at)}
          helper={ui("Most recent matching usage event")}
          iconPath="/inventory-usage"
          loading={summaryLoading}
          className="io-workspace-stat--timestamp"
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("Usage ledger work areas")} hint={ui("Choose the part of usage operations you want to work in.")}>
        <OperationalWorkspaceTab
          active={activeArea === "overview"}
          iconPath="/dashboard"
          label={ui("Overview")}
          count={toNumber(totals?.usage_count) || undefined}
          onClick={() => setActiveArea("overview")}
        />
        {permissions.canRecord || permissions.canBulkRecord ? (
          <OperationalWorkspaceTab
            active={activeArea === "record"}
            iconPath="/inventory-usage"
            label={ui("Record usage")}
            onClick={() => setActiveArea("record")}
          />
        ) : null}
        <OperationalWorkspaceTab
          active={activeArea === "templates"}
          iconPath="/automation-schedules"
          label={ui("Templates")}
          count={templates.length || undefined}
          onClick={() => setActiveArea("templates")}
        />
        {permissions.canClosePeriods ? (
          <OperationalWorkspaceTab
            active={activeArea === "close"}
            iconPath="/audit"
            label={ui("Period close")}
            count={periodClosures.length || undefined}
            onClick={() => setActiveArea("close")}
          />
        ) : null}
        <OperationalWorkspaceTab
          active={activeArea === "ledger"}
          iconPath="/stock-movements"
          label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{ui("Ledger")}{usageAttentionItemsQuery.data?.requires_attention ? <SidebarAttentionTabDot label={ui("Attention required")} /> : null}</span>}
          count={ledgerTotal || undefined}
          onClick={() => setActiveArea("ledger")}
        />
      </OperationalWorkspaceTabs>

      {(activeArea === "overview" || activeArea === "ledger") ? (
      <section style={styles.filterCard}>
        <OperationalSectionHeader
          iconPath="/stock-movements"
          title={ui("Operational filters")}
          description={ui("Filter by product, location, reason, department, date, and reversal status.")}
          actions={
            <div style={styles.inlineActions}>
              <span style={styles.filterPill}>{activeFilterCount} {ui("active")}</span>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => setFilters(DEFAULT_USAGE_FILTERS)}
                disabled={activeFilterCount === 0}
              >
                {ui("Reset filters")}</button>
            </div>
          }
        />

        <div style={styles.filterGrid}>
          <label style={styles.fieldLabel}>
            {ui("Product")}<select
              style={styles.input}
              value={filters.product_id}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  product_id: event.target.value,
                }))
              }
              disabled={usageOptionsLoading}
            >
              <option value="">{ui("All products")}</option>
              {filterProductOptions.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}{product.unit ? ` · ${product.unit}` : ""}{product.retired ? ui(" · Retired") : ""}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {ui("Storage location")}<select
              style={styles.input}
              value={filters.storage_location_id}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  storage_location_id: event.target.value,
                }))
              }
              disabled={usageOptionsLoading}
            >
              <option value="">{ui("All locations")}</option>
              {filterStorageLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}{location.retired ? ui(" · Retired") : ""}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {ui("Reason")}<select
              style={styles.input}
              value={filters.consumption_reason}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  consumption_reason: event.target.value,
                }))
              }
            >
              <option value="">{ui("All reasons")}</option>
              {USAGE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            {ui("Department / team")}<input
              style={styles.input}
              value={filters.department}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  department: event.target.value,
                }))
              }
              placeholder={ui("Housekeeping, kitchen, maintenance...")}
              list="inventory-usage-departments"
            />
            <datalist id="inventory-usage-departments">
              {departmentOptions.map((department) => (
                <option key={department} value={department} />
              ))}
            </datalist>
          </label>
          <label style={styles.fieldLabel}>
            {ui("From")}<input
              type="date"
              style={styles.input}
              value={filters.start_date}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  start_date: event.target.value,
                }))
              }
            />
          </label>
          <label style={styles.fieldLabel}>
            {ui("To")}<input
              type="date"
              style={styles.input}
              value={filters.end_date}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  end_date: event.target.value,
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
            {ui("Include reversed usage")}</label>
        </div>
        {invalidDateRange ? (
          <p style={styles.errorText}>
            {ui("The To date must be the same as or later than the From date.")}</p>
        ) : null}
        {usageOptionsError ? (
          <p style={styles.errorText}>
            {ui("Product and location choices could not be loaded: ")}{usageOptionsError.message}
          </p>
        ) : null}
      </section>
      ) : null}

      {activeArea === "record" && permissions.canRecord ? (
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
          storageLocationsLoading={usageOptionsLoading}
          storageLocationsError={usageOptionsError}
          onPreviewBarcodeUsage={onPreviewBarcodeUsage}
          onRecordBarcodeUsage={onRecordBarcodeUsage}
        />
      ) : null}

      {activeArea === "record" && permissions.canBulkRecord ? (
        <InventoryUsageBulkRecorder
          selectedTemplate={selectedTemplate}
          productOptions={productOptions}
          storageLocations={storageLocations}
          optionsLoading={usageOptionsLoading}
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

      {activeArea === "templates" ? (
        <>
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
        productOptions={productOptions}
        storageLocations={storageLocations}
        optionsLoading={usageOptionsLoading}
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
        </>
      ) : null}

      {activeArea === "overview" ? (
        <>

      <InventoryUsageGovernancePanel
        filters={filters}
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
          <h2 style={styles.sectionTitle}>{ui("By reason")}</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>{ui("Loading reason breakdown...")}</p>
          ) : !summary?.by_reason?.length ? (
            <p style={styles.emptyState}>
              {ui("No usage reason data for the selected filters.")}</p>
          ) : (
            <div style={styles.breakdownList}>
              {summary.by_reason.map((row) => (
                <div key={row.consumption_reason} style={styles.breakdownRow}>
                  <span>{formatUsageReasonLocal(row.consumption_reason)}</span>
                  <strong>{formatNumber(row.total_quantity)}</strong>
                  <small>
                    {formatNumber(row.usage_count, 0)} {ui("events ·")}{" "}
                    {formatMoneyLocal(row.estimated_usage_value, summary?.currency_code)} {ui("est. value")}{toNumber(row.missing_cost_count)
                      ? ` · ${formatNumber(row.missing_cost_count, 0)} ${ui("missing cost")}`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>{ui("By department")}</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              {ui("Loading department breakdown...")}</p>
          ) : !summary?.by_department?.length ? (
            <p style={styles.emptyState}>
              {ui("No department data for the selected filters.")}</p>
          ) : (
            <div style={styles.breakdownList}>
              {summary.by_department.map((row) => (
                <div
                  key={row.department || "unassigned"}
                  style={styles.breakdownRow}
                >
                  <span>{row.department || ui("Unassigned")}</span>
                  <strong>{formatNumber(row.total_quantity)}</strong>
                  <small>
                    {formatNumber(row.usage_count, 0)} {ui("events ·")}{" "}
                    {formatMoneyLocal(row.estimated_usage_value, summary?.currency_code)} {ui("est. value")}{toNumber(row.missing_cost_count)
                      ? ` · ${formatNumber(row.missing_cost_count, 0)} ${ui("missing cost")}`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>{ui("By location")}</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              {ui("Loading location breakdown...")}</p>
          ) : !summary?.by_location?.length ? (
            <p style={styles.emptyState}>
              {ui("No location data for the selected filters.")}</p>
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
                  <strong>{formatNumber(row.total_quantity)}</strong>
                  <small>
                    {formatNumber(row.usage_count, 0)} {ui("events ·")}{" "}
                    {formatMoneyLocal(row.estimated_usage_value, summary?.currency_code)} {ui("est. value · last")}{" "}
                    {formatDateTimeLocal(row.last_consumed_at)}
                    {toNumber(row.missing_cost_count)
                      ? ` · ${formatNumber(row.missing_cost_count, 0)} ${ui("missing cost")}`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>{ui("By user")}</h2>
          {summaryLoading ? (
            <p style={styles.sectionDescription}>{ui("Loading user breakdown...")}</p>
          ) : !summary?.by_user?.length ? (
            <p style={styles.emptyState}>
              {ui("No user attribution data for the selected filters.")}</p>
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
                      ui("System / unknown")}
                  </span>
                  <strong>{formatNumber(row.total_quantity)}</strong>
                  <small>
                    {formatNumber(row.usage_count, 0)} {ui("events ·")}{" "}
                    {formatMoneyLocal(row.estimated_usage_value, summary?.currency_code)} {ui("est. value · last")}{" "}
                    {formatDateTimeLocal(row.last_consumed_at)}
                    {toNumber(row.missing_cost_count)
                      ? ` · ${formatNumber(row.missing_cost_count, 0)} ${ui("missing cost")}`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {analyticsExportError ? (
          <div style={styles.cardWide}>
            <p style={styles.errorText}>{ui("Usage analytics export failed: ")}{analyticsExportError}</p>
          </div>
        ) : null}

        <div style={styles.cardWide}>
          <OperationalSectionHeader
            iconPath="/reports"
            title={ui("Daily usage trend")}
          />
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              {ui("Loading daily usage trend...")}</p>
          ) : !summary?.by_day?.length ? (
            <p style={styles.emptyState}>
              {ui("No daily usage trend data for the selected filters.")}</p>
          ) : (
            <div style={styles.trendList}>
              {summary.by_day.map((row) => (
                <div key={row.usage_date} style={styles.trendRow}>
                  <span>{formatDateLocal(row.usage_date)}</span>
                  <strong>{formatNumber(row.total_quantity)} {ui("consumed")}</strong>
                  <small>
                    {formatNumber(row.usage_count, 0)} {ui("events ·")}{" "}
                    {formatNumber(row.product_count, 0)} {ui("products ·")}{" "}
                    {formatNumber(row.location_count, 0)} {ui("locations ·")}{" "}
                    {formatMoneyLocal(row.estimated_usage_value, summary?.currency_code)} {ui("est. value")}{toNumber(row.missing_cost_count)
                      ? ` · ${formatNumber(row.missing_cost_count, 0)} ${ui("missing cost")}`
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.cardWide}>
          <OperationalSectionHeader
            iconPath="/stock"
            title={ui("Usage stock impact")}
            description={ui("Shows consumed products whose current stock may now be depleted, below minimum, or lower than the quantity consumed in the selected period.")}
            actions={
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={exportImpactCsv}
                disabled={exportingImpact || !impact?.rows?.length}
              >
                {exportingImpact ? ui("Preparing impact CSV...") : ui("Export filtered impact CSV")}
              </button>
            }
          />
          {impactLoading ? (
            <p style={styles.sectionDescription}>
              {ui("Loading usage stock impact...")}</p>
          ) : !impact?.rows?.length ? (
            <p style={styles.emptyState}>
              {ui("No stock impact rows for the selected filters.")}</p>
          ) : (
            <>
              <div style={styles.governanceGrid}>
                <div style={styles.governanceCard}>
                  <span>{ui("Impacted rows")}</span>
                  <strong>{formatNumber(impact.summary?.impacted_count, 0)}</strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Depleted")}</span>
                  <strong>{formatNumber(impact.summary?.depleted_count, 0)}</strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Below minimum")}</span>
                  <strong>
                    {formatNumber(impact.summary?.below_minimum_count, 0)}
                  </strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Usage value")}</span>
                  <strong>
                    {formatMoneyLocal(impact.summary?.estimated_usage_value, impact?.currency_code)}
                  </strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Reorder positions")}</span>
                  <strong>
                    {formatNumber(impact.summary?.recommended_reorder_position_count, 0)}
                  </strong>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>{ui("Product")}</th>
                      <th style={styles.th}>{ui("Location")}</th>
                      <th style={styles.th}>{ui("Used")}</th>
                      <th style={styles.th}>{ui("Current")}</th>
                      <th style={styles.th}>{ui("Minimum")}</th>
                      <th style={styles.th}>{ui("Avg/day")}</th>
                      <th style={styles.th}>{ui("Coverage")}</th>
                      <th style={styles.th}>{ui("Reorder")}</th>
                      <th style={styles.th}>{ui("Status")}</th>
                      <th style={styles.th}>{ui("Last used")}</th>
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
                          {formatNumber(row.total_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.current_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.effective_min_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.average_daily_usage)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatDaysLocal(row.estimated_days_of_coverage)}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.recommended_reorder_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatCodeLabelLocal(String(row.impact_status))}
                        </td>
                        <td style={styles.td}>
                          {formatDateTimeLocal(row.last_consumed_at)}
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
          <OperationalSectionHeader
            iconPath="/alerts"
            title={ui("Usage anomaly watch")}
            description={ui("Flags products whose highest daily usage in the selected period is more than 2× their observed daily average.")}
            actions={
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={exportAnomaliesCsv}
                disabled={exportingAnomalies || !anomalies?.rows?.length}
              >
                {exportingAnomalies ? ui("Preparing anomalies CSV...") : ui("Export filtered anomalies CSV")}
              </button>
            }
          />
          {anomaliesLoading ? (
            <p style={styles.sectionDescription}>{ui("Loading anomaly watch...")}</p>
          ) : !anomalies?.rows?.length ? (
            <p style={styles.emptyState}>
              {ui("No usage spikes detected for the selected filters.")}</p>
          ) : (
            <>
              <div style={styles.governanceGrid}>
                <div style={styles.governanceCard}>
                  <span>{ui("Spike days")}</span>
                  <strong>{formatNumber(anomalies.summary?.spike_count, 0)}</strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Impacted products")}</span>
                  <strong>
                    {formatNumber(anomalies.summary?.impacted_product_count, 0)}
                  </strong>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Highest multiplier")}</span>
                  <strong>
                    {formatNumber(anomalies.summary?.highest_spike_multiplier)}{ui("×")}</strong>
                </div>
              </div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>{ui("Date")}</th>
                      <th style={styles.th}>{ui("Product")}</th>
                      <th style={styles.th}>{ui("Daily usage")}</th>
                      <th style={styles.th}>{ui("Average")}</th>
                      <th style={styles.th}>{ui("Spike")}</th>
                      <th style={styles.th}>{ui("Observed days")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.rows.map((row) => (
                      <tr key={`${row.product_id}-${row.usage_date}`}>
                        <td style={styles.td}>{formatDateLocal(row.usage_date)}</td>
                        <td style={styles.td}>
                          {row.product_name || row.product_id}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.daily_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.average_daily_quantity)}{" "}
                          {row.product_unit || ""}
                        </td>
                        <td style={styles.td}>
                          {formatNumber(row.spike_multiplier)}{ui("×")}</td>
                        <td style={styles.td}>{formatNumber(row.observed_days, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div style={styles.cardWide}>
          <OperationalSectionHeader
            iconPath="/products"
            title={ui("Top consumed products")}
          />
          {summaryLoading ? (
            <p style={styles.sectionDescription}>
              {ui("Loading product breakdown...")}</p>
          ) : !summary?.by_product?.length ? (
            <p style={styles.emptyState}>
              {ui("No product usage data for the selected filters.")}</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Events")}</th>
                    <th style={styles.th}>{ui("Quantity")}</th>
                    <th style={styles.th}>{ui("Estimated value")}</th>
                    <th style={styles.th}>{ui("Unit cost")}</th>
                    <th style={styles.th}>{ui("Unit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_product.map((row) => (
                    <tr key={row.product_id}>
                      <td style={styles.td}>
                        {row.product_name || row.product_id}
                      </td>
                      <td style={styles.td}>{formatNumber(row.usage_count, 0)}</td>
                      <td style={styles.td}>{formatNumber(row.total_quantity)}</td>
                      <td style={styles.td}>
                        {formatMoneyLocal(row.estimated_usage_value, summary?.currency_code)}
                      </td>
                      <td style={styles.td}>
                        {row.estimated_unit_cost
                          ? formatMoneyLocal(row.estimated_unit_cost, summary?.currency_code)
                          : ui("Missing")}
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
        </>
      ) : null}

      {activeArea === "close" && permissions.canClosePeriods ? (
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

      {activeArea === "ledger" && selectedUsageLogId ? (
        <section style={styles.card}>
          <OperationalSectionHeader
            iconPath="/audit"
            title={ui("Usage log detail")}
            description={ui("Operational audit view for the selected consumption entry, including stock movements, review state, reversal linkage, and evidence attachments.")}
            actions={
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={onCloseUsageLogDetail}
              >
                {ui("Close detail")}</button>
            }
          />

          {usageLogDetailLoading ? (
            <p style={styles.sectionDescription}>{ui("Loading usage detail...")}</p>
          ) : usageLogDetailError ? (
            <p style={styles.errorText}>
              {ui("Failed to load usage detail: ")}{usageLogDetailError.message}
            </p>
          ) : usageLogDetail ? (
            <>
              <div style={styles.governanceGrid}>
                <div style={styles.governanceCard}>
                  <span>{ui("Product")}</span>
                  <strong>
                    {usageLogDetail.product_name || usageLogDetail.product_id}
                  </strong>
                  <small>
                    {formatNumber(usageLogDetail.quantity)}{" "}
                    {usageLogDetail.product_unit || ""} {ui("consumed")}</small>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Location")}</span>
                  <strong>
                    {usageLogDetail.storage_location_name ||
                      usageLogDetail.storage_location_id}
                  </strong>
                  <small>
                    {usageLogDetail.storage_location_temperature_zone ||
                      ui("No temperature zone")}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Reason / department")}</span>
                  <strong>
                    {formatUsageReasonLocal(usageLogDetail.consumption_reason)}
                  </strong>
                  <small>
                    {usageLogDetail.department || ui("No department")}
                    {usageLogDetail.event_name
                      ? ` · ${usageLogDetail.event_name}`
                      : ""}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Estimated value")}</span>
                  <strong>
                    {formatMoneyLocal(usageLogDetail.estimated_usage_value, usageLogDetail.currency_code)}
                  </strong>
                  <small>
                    {usageLogDetail.estimated_unit_cost
                      ? `${formatMoneyLocal(usageLogDetail.estimated_unit_cost, usageLogDetail.currency_code)} / ${usageLogDetail.product_unit || ui("unit")}`
                      : ui("Missing standard cost")}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Balance impact")}</span>
                  <strong>
                    {formatNumber(usageLogDetail.quantity_before)} →{" "}
                    {formatNumber(usageLogDetail.quantity_after)}
                  </strong>
                  <small>
                    {ui("Movement ")}{shortenId(usageLogDetail.stock_movement_id, 12)}
                  </small>
                </div>
                <div style={styles.governanceCard}>
                  <span>{ui("Review status")}</span>
                  <strong>{formatCodeLabelLocal(usageLogDetail.review_status || "pending")}</strong>
                  <small>
                    {usageLogDetail.reviewed_by_user_name ||
                      usageLogDetail.reviewed_by_user_id ||
                      ui("Not reviewed")}
                    {usageLogDetail.reviewed_at
                      ? ` · ${formatDateTimeLocal(usageLogDetail.reviewed_at)}`
                      : ""}
                  </small>
                </div>
              </div>

              <div style={styles.governanceGrid}>
                <div style={styles.governanceCardWide}>
                  <span>{ui("Notes and reference")}</span>
                  <strong>{usageLogDetail.notes || ui("No notes captured")}</strong>
                  <small>
                    {usageLogDetail.reference_type
                      ? `${formatCodeLabelLocal(usageLogDetail.reference_type)}: ${shortenId(usageLogDetail.reference_id, 12)}`
                      : ui("No linked reference")}
                  </small>
                  <small>
                    {ui("Recorded by")}{" "}
                    {usageLogDetail.created_by_user_name ||
                      usageLogDetail.created_by_user_id ||
                      "system"}{" "}
                    {ui("· consumed ")}{formatDateTimeLocal(usageLogDetail.consumed_at)}
                  </small>
                </div>
                <div style={styles.governanceCardWide}>
                  <span>{ui("Movement audit")}</span>
                  <strong>
                    {ui("Usage movement:")}{" "}
                    {shortenId(usageLogDetail.stock_movement?.id || usageLogDetail.stock_movement_id, 12)}
                  </strong>
                  <small>
                    {usageLogDetail.stock_movement
                      ? `${usageLogDetail.stock_movement.reason || ui("No reason")} · ${usageLogDetail.stock_movement.change ?? "-"} · ${formatDateTimeLocal(usageLogDetail.stock_movement.created_at)}`
                      : ui("No stock movement summary returned")}
                  </small>
                  <strong>
                    {ui("Reversal movement:")}{" "}
                    {shortenId(usageLogDetail.reversal_stock_movement?.id || usageLogDetail.reversal_stock_movement_id, 12)}
                  </strong>
                  <small>
                    {usageLogDetail.reversal_stock_movement
                      ? `${usageLogDetail.reversal_stock_movement.reason || ui("No reason")} · ${usageLogDetail.reversal_stock_movement.change ?? "-"} · ${formatDateTimeLocal(usageLogDetail.reversal_stock_movement.created_at)}`
                      : usageLogDetail.reversal_reason || ui("Not reversed")}
                  </small>
                </div>
              </div>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>{ui("Evidence file")}</th>
                      <th style={styles.th}>{ui("Type")}</th>
                      <th style={styles.th}>{ui("Uploaded by")}</th>
                      <th style={styles.th}>{ui("Uploaded")}</th>
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
                            {formatDateTimeLocal(attachment.created_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.td} colSpan={4}>
                          {ui("No evidence attachments linked to this usage log.")}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {activeArea === "ledger" ? (
      <section style={styles.card}>
        <OperationalSectionHeader
          iconPath="/stock-movements"
          title={ui("Usage ledger")}
          description={<>
            {ui("Filtered usage records linked to stock movement IDs for audit traceability. Reversals restore stock through a compensating movement instead of deleting history.")}<br />
            {ui("Showing ")}{ledgerStart}-{ledgerEnd} {ui("of ")}{ledgerTotal} {ui("matching usage records.")}</>}
          actions={
            <label style={styles.fieldLabel}>
              {ui("Rows per page")}<select
                style={styles.input}
                value={ledgerPageSize}
                onChange={(event) => onLedgerPageSizeChange(Number(event.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          }
        />
        {reverseError ? (
          <p style={styles.errorText}>
            {ui("Usage reversal failed: ")}{reverseError.message}
          </p>
        ) : null}

        {logsLoading ? (
          <p style={styles.sectionDescription}>{ui("Loading usage ledger...")}</p>
        ) : logsError ? (
          <p style={styles.errorText}>
            {ui("Failed to load usage ledger: ")}{logsError.message}
          </p>
        ) : !logs.length ? (
          <p style={styles.emptyState}>
            {ui("No usage logs match the selected filters.")}</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Consumed")}</th>
                  <th style={styles.th}>{ui("Product")}</th>
                  <th style={styles.th}>{ui("Location")}</th>
                  <th style={styles.th}>{ui("Reason")}</th>
                  <th style={styles.th}>{ui("Department")}</th>
                  <th style={styles.th}>{ui("Quantity")}</th>
                  <th style={styles.th}>{ui("Est. value")}</th>
                  <th style={styles.th}>{ui("Balance")}</th>
                  <th style={styles.th}>{ui("Context")}</th>
                  <th style={styles.th}>{ui("Status")}</th>
                  <th style={styles.th}>{ui("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((usage) => {
                  const causesSidebarAttention = usageAttentionIds.has(usage.id);
                  return (
                  <tr
                    key={usage.id}
                    data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}
                    style={causesSidebarAttention ? sidebarAttentionItemStyle : undefined}
                  >
                    <td style={styles.td}>
                      {formatDateTimeLocal(usage.consumed_at)}
                    </td>
                    <td style={styles.td}>
                      {usage.product_name || usage.product_id}
                    </td>
                    <td style={styles.td}>
                      {usage.storage_location_name || usage.storage_location_id}
                    </td>
                    <td style={styles.td}>
                      {formatUsageReasonLocal(usage.consumption_reason)}
                    </td>
                    <td style={styles.td}>{usage.department || "-"}</td>
                    <td style={styles.td}>
                      -{formatNumber(usage.quantity)} {usage.product_unit || ""}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contextCell}>
                        <span>{formatMoneyLocal(usage.estimated_usage_value, usage.currency_code)}</span>
                        <small>
                          {usage.estimated_unit_cost
                            ? `${formatMoneyLocal(usage.estimated_unit_cost, usage.currency_code)} / ${usage.product_unit || ui("unit")}`
                            : ui("Missing standard cost")}
                        </small>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {formatNumber(usage.quantity_before)} →{" "}
                      {formatNumber(usage.quantity_after)}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.contextCell}>
                        <span>{usage.event_name || ui("No event/job")}</span>
                        <small>{usage.notes ? ui("Notes recorded — open Details") : ui("No notes")}</small>
                        <small>
                          {usage.reference_type
                            ? `${formatCodeLabelLocal(usage.reference_type)}: ${shortenId(usage.reference_id, 12)}`
                            : ui("No linked reference")}
                        </small>
                        <small>
                          {ui("Movement ")}{shortenId(usage.stock_movement_id, 12)}
                        </small>
                        <small>
                          {ui("By")}{" "}
                          {usage.created_by_user_name ||
                            usage.created_by_user_id ||
                            ui("System")}
                        </small>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {causesSidebarAttention ? <div style={{ marginBottom: 6 }}><SidebarAttentionMarker label={ui("Attention required")} /></div> : null}
                      {usage.reversed_at ? (
                        <div style={styles.contextCell}>
                          <strong>{ui("Reversed")}</strong>
                          <small>{formatDateTimeLocal(usage.reversed_at)}</small>
                          <small>
                            {usage.reversal_reason || ui("No reversal reason")}
                          </small>
                        </div>
                      ) : (
                        <span>{ui("Active")}</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => onSelectUsageLog(usage.id)}
                        >
                          {ui("Details")}</button>
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
                              ? ui("Reversing...")
                              : ui("Reverse")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {ledgerTotal > ledgerPageSize ? (
          <div style={styles.bulkFooter}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => onLedgerPageChange(Math.max(1, ledgerPage - 1))}
              disabled={ledgerPage <= 1 || logsLoading}
            >
              {ui("Previous")}</button>
            <span style={styles.filterPill}>{ui("Page ")}{ledgerPage} {ui("of ")}{Math.max(1, Math.ceil(ledgerTotal / ledgerPageSize))}</span>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => onLedgerPageChange(ledgerPage + 1)}
              disabled={ledgerPage >= Math.ceil(ledgerTotal / ledgerPageSize) || logsLoading}
            >
              {ui("Next")}</button>
          </div>
        ) : null}
      </section>
      ) : null}
    </div>
  );
}
