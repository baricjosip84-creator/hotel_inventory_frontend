import { useMemo, useState } from 'react';

import { formatDateTime, formatMoney, toNumber } from './inventoryUsageFormatting';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsagePeriodClosure, InventoryUsagePeriodClosureDraft, InventoryUsagePeriodClosureResponse } from './inventoryUsageTypes';

type InventoryUsagePeriodClosuresPanelProps = {
  closures: InventoryUsagePeriodClosure[];
  loading: boolean;
  error?: Error | null;
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
  return toLocalDateTimeInput(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0));
};

const defaultPeriodEnd = () => {
  const now = new Date();
  return toLocalDateTimeInput(new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0));
};

export function InventoryUsagePeriodClosuresPanel({
  closures,
  loading,
  error,
  closing,
  closeError,
  closeResult,
  onClosePeriod
}: InventoryUsagePeriodClosuresPanelProps) {
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd);
  const [notes, setNotes] = useState('');

  const currentPeriodAlreadyClosed = useMemo(() => {
    if (!periodStart || !periodEnd) {
      return false;
    }

    const startIso = new Date(periodStart).toISOString();
    const endIso = new Date(periodEnd).toISOString();

    return closures.some((closure) => {
      return new Date(closure.period_start).toISOString() === startIso
        && new Date(closure.period_end).toISOString() === endIso;
    });
  }, [closures, periodEnd, periodStart]);

  const canClose = Boolean(periodStart && periodEnd)
    && new Date(periodEnd).getTime() > new Date(periodStart).getTime()
    && !currentPeriodAlreadyClosed
    && !closing;

  const handleSubmit = () => {
    if (!canClose) {
      return;
    }

    const confirmed = window.confirm('Close this usage period? This creates an immutable usage rollup and locks usage posting/reversal inside the period.');
    if (!confirmed) {
      return;
    }

    onClosePeriod({
      period_start: new Date(periodStart).toISOString(),
      period_end: new Date(periodEnd).toISOString(),
      notes: notes.trim() || undefined
    });
  };

  return (
    <section style={styles.cardWide}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Usage period close</h2>
          <p style={styles.sectionDescription}>
            Freeze a usage period into an audit-ready rollup with quantity, estimated value,
            exceptions, reversals, and follow-up exposure. Closed periods block new backdated usage
            and usage reversals inside the closed range.
          </p>
        </div>
      </div>

      <div style={styles.formGrid}>
        <label style={styles.fieldLabel}>
          Period start
          <input
            type="datetime-local"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            style={styles.input}
          />
        </label>
        <label style={styles.fieldLabel}>
          Period end
          <input
            type="datetime-local"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            style={styles.input}
          />
        </label>
        <label style={styles.fieldLabel}>
          Closure notes
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Month-end close, department review, finance export..."
            style={styles.input}
          />
        </label>
      </div>

      <div style={styles.inlineActions}>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={handleSubmit}
          disabled={!canClose}
        >
          {closing ? 'Closing period...' : 'Close usage period'}
        </button>
        {currentPeriodAlreadyClosed ? <span style={styles.warningText}>This exact period is already closed and locked.</span> : null}
        {periodStart && periodEnd && new Date(periodEnd).getTime() <= new Date(periodStart).getTime() ? (
          <span style={styles.warningText}>Period end must be after period start.</span>
        ) : null}
      </div>

      {closeError ? <p style={styles.errorText}>Period close failed: {closeError.message}</p> : null}
      {error ? <p style={styles.errorText}>Failed to load period closures: {error.message}</p> : null}
      {closeResult?.closure ? (
        <p style={styles.successText}>
          Closed period with {toNumber(closeResult.closure.usage_count)} usage events and {formatMoney(closeResult.closure.estimated_usage_value)} estimated usage value.
        </p>
      ) : null}

      {loading ? (
        <p style={styles.sectionDescription}>Loading usage period closures...</p>
      ) : !closures.length ? (
        <p style={styles.emptyState}>No usage periods have been closed yet.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Usage</th>
                <th style={styles.th}>Quantity</th>
                <th style={styles.th}>Estimated value</th>
                <th style={styles.th}>Exceptions</th>
                <th style={styles.th}>Reversals</th>
                <th style={styles.th}>Follow-up</th>
                <th style={styles.th}>Closed by</th>
                <th style={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {closures.map((closure) => (
                <tr key={closure.id}>
                  <td style={styles.td}>
                    <div style={styles.contextCell}>
                      <span>{formatDateTime(closure.period_start)}</span>
                      <small>to {formatDateTime(closure.period_end)}</small>
                    </div>
                  </td>
                  <td style={styles.td}>{toNumber(closure.usage_count)}</td>
                  <td style={styles.td}>{toNumber(closure.total_quantity)}</td>
                  <td style={styles.td}>{formatMoney(closure.estimated_usage_value)}</td>
                  <td style={styles.td}>{toNumber(closure.exception_count)}</td>
                  <td style={styles.td}>{toNumber(closure.reversed_count)}</td>
                  <td style={styles.td}>{toNumber(closure.follow_up_count)}</td>
                  <td style={styles.td}>
                    <div style={styles.contextCell}>
                      <span>{closure.closed_by_user_name || closure.closed_by_user_id || 'System'}</span>
                      <small>{formatDateTime(closure.closed_at)}</small>
                    </div>
                  </td>
                  <td style={styles.td}>{closure.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
