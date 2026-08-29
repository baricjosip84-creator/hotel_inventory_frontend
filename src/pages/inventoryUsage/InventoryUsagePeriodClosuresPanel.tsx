import { useMemo, useState } from "react";
import { OperationalSectionHeader } from "../../components/ui/OperationalWorkspace";
import { useAppTranslation } from "../../i18n/I18nContext";
import {
  formatLocalizedCurrency,
  formatLocalizedDateTime,
  formatLocalizedNumber,
} from "../../i18n/formatters";

import { toNumber } from "./inventoryUsageFormatting";
import { styles } from "./inventoryUsageStyles";
import type {
  InventoryUsagePeriodClosure,
  InventoryUsagePeriodClosureDraft,
  InventoryUsagePeriodClosurePreviewResponse,
  InventoryUsagePeriodClosureResponse,
} from "./inventoryUsageTypes";

type InventoryUsagePeriodClosuresPanelProps = {
  closures: InventoryUsagePeriodClosure[];
  loading: boolean;
  error?: Error | null;
  previewing: boolean;
  previewError?: Error | null;
  previewResult?: InventoryUsagePeriodClosurePreviewResponse | null;
  onPreviewPeriodClose: (draft: InventoryUsagePeriodClosureDraft) => void;
  closing: boolean;
  closeError?: Error | null;
  closeResult?: InventoryUsagePeriodClosureResponse | null;
  onClosePeriod: (draft: InventoryUsagePeriodClosureDraft) => void;
};

const toLocalDateTimeInput = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const defaultPeriodStart = () => {
  const now = new Date();
  return toLocalDateTimeInput(
    new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0),
  );
};

const defaultPeriodEnd = () => {
  const now = new Date();
  return toLocalDateTimeInput(
    new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0),
  );
};

export function InventoryUsagePeriodClosuresPanel({
  closures,
  loading,
  error,
  previewing,
  previewError,
  previewResult,
  onPreviewPeriodClose,
  closing,
  closeError,
  closeResult,
  onClosePeriod,
}: InventoryUsagePeriodClosuresPanelProps) {
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [notes, setNotes] = useState("");
  const { locale, ui } = useAppTranslation();
  const formatNumber = (value: number | string | null | undefined, maximumFractionDigits = 2) => {
    if (value === null || value === undefined || value === "") return "—";
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    return formatLocalizedNumber(numeric, locale, { maximumFractionDigits });
  };
  const formatDateTimeLocal = (value: string | null | undefined) =>
    formatLocalizedDateTime(value, locale);
  const formatMoneyLocal = (value: number | string | null | undefined, currency?: string | null) =>
    formatLocalizedCurrency(toNumber(value), currency || "EUR", locale, { maximumFractionDigits: 2 });

  const currentPeriodAlreadyClosed = useMemo(() => {
    if (!periodStart || !periodEnd) {
      return false;
    }

    const startIso = new Date(periodStart).toISOString();
    const endIso = new Date(periodEnd).toISOString();

    return closures.some((closure) => {
      return (
        new Date(closure.period_start).toISOString() === startIso &&
        new Date(closure.period_end).toISOString() === endIso
      );
    });
  }, [closures, periodEnd, periodStart]);

  const canClose =
    Boolean(periodStart && periodEnd) &&
    new Date(periodEnd).getTime() > new Date(periodStart).getTime() &&
    !currentPeriodAlreadyClosed &&
    !closing;

  const buildDraft = (): InventoryUsagePeriodClosureDraft => ({
    period_start: new Date(periodStart).toISOString(),
    period_end: new Date(periodEnd).toISOString(),
    notes: notes.trim() || undefined,
  });

  const handlePreview = () => {
    if (
      !periodStart ||
      !periodEnd ||
      new Date(periodEnd).getTime() <= new Date(periodStart).getTime()
    ) {
      return;
    }

    onPreviewPeriodClose(buildDraft());
  };

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
    if (!rows.length) {
      return;
    }

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

  const handleExportPreviewCsv = () => {
    const preview = previewResult?.preview;
    if (!preview) {
      return;
    }

    const headers = [
      "period_start",
      "period_end",
      "status",
      "blocker_code",
      "blocker_message",
      "existing_closure_id",
      "existing_closure_closed_at",
      "usage_count",
      "total_quantity",
      "estimated_usage_value",
      "currency_code",
      "exception_count",
      "reversed_count",
      "follow_up_count",
    ];

    downloadCsv(
      `inventory-usage-period-close-preview-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      [
        {
          period_start: preview.period_start,
          period_end: preview.period_end,
          status: preview.blocked ? "blocked" : "ready",
          blocker_code: preview.blocker_code || "",
          blocker_message: preview.blocker_message || "",
          existing_closure_id: preview.existing_closure?.id || "",
          existing_closure_closed_at: preview.existing_closure?.closed_at || "",
          usage_count: preview.usage_count ?? "",
          total_quantity: preview.total_quantity ?? "",
          estimated_usage_value: preview.estimated_usage_value ?? "",
          currency_code: preview.currency_code || "",
          exception_count: preview.exception_count ?? "",
          reversed_count: preview.reversed_count ?? "",
          follow_up_count: preview.follow_up_count ?? "",
        },
      ],
    );
  };

  const handleExportClosuresCsv = () => {
    if (!closures.length) {
      return;
    }

    const headers = [
      "period_closure_id",
      "period_start",
      "period_end",
      "usage_count",
      "total_quantity",
      "estimated_usage_value",
      "currency_code",
      "exception_count",
      "reversed_count",
      "follow_up_count",
      "closed_by",
      "closed_by_user_id",
      "closed_at",
      "created_at",
      "notes",
    ];

    downloadCsv(
      `inventory-usage-period-closures-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      closures.map((closure) => ({
        period_closure_id: closure.id,
        period_start: closure.period_start,
        period_end: closure.period_end,
        usage_count: closure.usage_count ?? "",
        total_quantity: closure.total_quantity ?? "",
        estimated_usage_value: closure.estimated_usage_value ?? "",
        currency_code: closure.currency_code || "",
        exception_count: closure.exception_count ?? "",
        reversed_count: closure.reversed_count ?? "",
        follow_up_count: closure.follow_up_count ?? "",
        closed_by:
          closure.closed_by_user_name || closure.closed_by_user_id || ui("System"),
        closed_by_user_id: closure.closed_by_user_id || "",
        closed_at: closure.closed_at || "",
        created_at: closure.created_at || "",
        notes: closure.notes || "",
      })),
    );
  };

  const handleSubmit = () => {
    if (!canClose) {
      return;
    }

    const confirmed = window.confirm(
      ui("Close this usage period? This creates an immutable usage rollup and locks usage posting/reversal inside the period."),
    );
    if (!confirmed) {
      return;
    }

    onClosePeriod(buildDraft());
  };

  return (
    <section style={styles.cardWide}>
      <OperationalSectionHeader
        iconPath="/audit"
        title={ui("Usage period close")}
        description={ui("Freeze a usage period into an audit-ready rollup with quantity, estimated value, exceptions, reversals, and follow-up exposure. Closed periods block new backdated usage and usage reversals inside the closed range.")}
      />

      <div style={styles.formGrid}>
        <label style={styles.fieldLabel}>
          {ui("Period start")}
          <input
            type="datetime-local"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            style={styles.input}
          />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Period end")}
          <input
            type="datetime-local"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            style={styles.input}
          />
        </label>
        <label style={styles.fieldLabel}>
          {ui("Closure notes")}
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={ui("Month-end close, department review, finance export...")}
            style={styles.input}
          />
        </label>
      </div>

      <div style={styles.inlineActions}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={handlePreview}
          disabled={
            previewing ||
            !periodStart ||
            !periodEnd ||
            new Date(periodEnd).getTime() <= new Date(periodStart).getTime()
          }
        >
          {previewing ? ui("Previewing...") : ui("Preview close impact")}
        </button>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={handleSubmit}
          disabled={!canClose || Boolean(previewResult?.preview?.blocked)}
        >
          {closing ? ui("Closing period...") : ui("Close usage period")}
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={handleExportPreviewCsv}
          disabled={!previewResult?.preview}
        >
          {ui("Export preview CSV")}
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={handleExportClosuresCsv}
          disabled={!closures.length}
        >
          {ui("Export closures CSV")}
        </button>
        {currentPeriodAlreadyClosed ? (
          <span style={styles.warningText}>
            {ui("This exact period is already closed and locked.")}
          </span>
        ) : null}
        {periodStart &&
        periodEnd &&
        new Date(periodEnd).getTime() <= new Date(periodStart).getTime() ? (
          <span style={styles.warningText}>
            {ui("Period end must be after period start.")}
          </span>
        ) : null}
      </div>

      {previewError ? (
        <p style={styles.errorText}>
          {ui("Period close preview failed: ")}{previewError.message}
        </p>
      ) : null}
      {closeError ? (
        <p style={styles.errorText}>
          {ui("Period close failed: ")}{closeError.message}
        </p>
      ) : null}
      {error ? (
        <p style={styles.errorText}>
          {ui("Failed to load period closures: ")}{error.message}
        </p>
      ) : null}
      {previewResult?.preview ? (
        <div style={styles.metricGrid}>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>{ui("Preview status")}</span>
            <strong
              style={
                previewResult.preview.blocked
                  ? styles.dangerText
                  : styles.successText
              }
            >
              {previewResult.preview.blocked ? ui("Blocked") : ui("Ready")}
            </strong>
            <small>
              {previewResult.preview.blocker_message || previewResult.message}
            </small>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>{ui("Usage events")}</span>
            <strong>{formatNumber(previewResult.preview.usage_count, 0)}</strong>
            <small>
              {formatNumber(previewResult.preview.total_quantity)} {ui("total quantity")}
            </small>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>{ui("Estimated value")}</span>
            <strong>
              {formatMoneyLocal(previewResult.preview.estimated_usage_value, previewResult.preview.currency_code)}
            </strong>
            <small>
              {formatNumber(previewResult.preview.exception_count, 0)} {ui("exceptions")}
            </small>
          </div>
          <div style={styles.metricCard}>
            <span style={styles.metricLabel}>{ui("Governance")}</span>
            <strong>
              {formatNumber(previewResult.preview.follow_up_count, 0)} {ui("follow-up")}
            </strong>
            <small>
              {formatNumber(previewResult.preview.reversed_count, 0)} {ui("reversed entries in range")}
            </small>
          </div>
        </div>
      ) : null}
      {closeResult?.closure ? (
        <p style={styles.successText}>
          {ui("Closed period with")} {formatNumber(closeResult.closure.usage_count, 0)} {ui("usage events and")} {formatMoneyLocal(closeResult.closure.estimated_usage_value, closeResult.closure.currency_code)} {ui("estimated usage value.")}
        </p>
      ) : null}

      {loading ? (
        <p style={styles.sectionDescription}>
          {ui("Loading usage period closures...")}
        </p>
      ) : !closures.length ? (
        <p style={styles.emptyState}>{ui("No usage periods have been closed yet.")}</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>{ui("Period")}</th>
                <th style={styles.th}>{ui("Usage")}</th>
                <th style={styles.th}>{ui("Quantity")}</th>
                <th style={styles.th}>{ui("Estimated value")}</th>
                <th style={styles.th}>{ui("Exceptions")}</th>
                <th style={styles.th}>{ui("Reversals")}</th>
                <th style={styles.th}>{ui("Follow-up")}</th>
                <th style={styles.th}>{ui("Closed by")}</th>
                <th style={styles.th}>{ui("Notes")}</th>
              </tr>
            </thead>
            <tbody>
              {closures.map((closure) => (
                <tr key={closure.id}>
                  <td style={styles.td}>
                    <div style={styles.contextCell}>
                      <span>{formatDateTimeLocal(closure.period_start)}</span>
                      <small>{ui("to")} {formatDateTimeLocal(closure.period_end)}</small>
                    </div>
                  </td>
                  <td style={styles.td}>{formatNumber(closure.usage_count, 0)}</td>
                  <td style={styles.td}>{formatNumber(closure.total_quantity)}</td>
                  <td style={styles.td}>
                    {formatMoneyLocal(closure.estimated_usage_value, closure.currency_code)}
                  </td>
                  <td style={styles.td}>{formatNumber(closure.exception_count, 0)}</td>
                  <td style={styles.td}>{formatNumber(closure.reversed_count, 0)}</td>
                  <td style={styles.td}>{formatNumber(closure.follow_up_count, 0)}</td>
                  <td style={styles.td}>
                    <div style={styles.contextCell}>
                      <span>
                        {closure.closed_by_user_name ||
                          closure.closed_by_user_id ||
                          ui("System")}
                      </span>
                      <small>{formatDateTimeLocal(closure.closed_at)}</small>
                    </div>
                  </td>
                  <td style={styles.td}>{closure.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
