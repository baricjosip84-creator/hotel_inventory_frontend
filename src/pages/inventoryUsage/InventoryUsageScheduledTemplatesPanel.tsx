import { formatDateTime, formatUsageReason, toNumber } from './inventoryUsageFormatting';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsageScheduledTemplateRunDueResponse, InventoryUsageScheduledTemplates } from './inventoryUsageTypes';

type InventoryUsageScheduledTemplatesPanelProps = {
  scheduled?: InventoryUsageScheduledTemplates;
  loading: boolean;
  error?: Error | null;
  runningDueTemplates?: boolean;
  runDueError?: Error | null;
  runDueResult?: InventoryUsageScheduledTemplateRunDueResponse | null;
  canRunDueTemplates?: boolean;
  onRunDueTemplates?: () => void;
};

const getStatusStyle = (status?: string) => {
  if (status === 'due') return styles.warningPill;
  if (status === 'insufficient_stock' || status === 'missing_stock' || status === 'missing_evidence_acknowledgement_required' || status === 'empty') return styles.dangerPill;
  if (status === 'ready_with_warnings') return styles.warningPill;
  if (status === 'scheduled') return styles.successPill;
  return styles.filterPill;
};

const formatSchedule = (frequency?: string | null, interval?: number | string | null) => {
  if (!frequency) return 'No schedule';
  const count = Math.max(1, toNumber(interval || 1));
  const plural = count === 1 ? frequency : `${frequency}s`;
  return count === 1 ? `Every ${frequency}` : `Every ${count} ${plural}`;
};

export function InventoryUsageScheduledTemplatesPanel({ scheduled, loading, error, runningDueTemplates = false, runDueError, runDueResult, canRunDueTemplates = false, onRunDueTemplates }: InventoryUsageScheduledTemplatesPanelProps) {
  const rows = scheduled?.rows || [];
  const summary = scheduled?.summary;

  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Scheduled usage templates</h2>
          <p style={styles.sectionDescription}>
            Monitor recurring usage packs before staff records them, with readiness and stock-risk status.
          </p>
        </div>
        <div style={styles.templateMetrics}>
          <span style={styles.filterPill}>{toNumber(summary?.template_count)} scheduled</span>
          <span style={styles.warningPill}>{toNumber(summary?.due_count)} due</span>
          <span style={styles.dangerPill}>{toNumber(summary?.blocked_count)} blocked</span>
          <span style={styles.warningPill}>{toNumber(summary?.evidence_acknowledgement_required_count)} need evidence ack</span>
          {canRunDueTemplates && onRunDueTemplates ? (
            <button
              type="button"
              style={styles.secondaryButton}
              disabled={runningDueTemplates || toNumber(summary?.due_count) <= 0}
              onClick={onRunDueTemplates}
            >
              {runningDueTemplates ? 'Recording due...' : 'Record due templates'}
            </button>
          ) : null}
        </div>
      </div>

      {runDueError ? <p style={styles.errorText}>Failed to record due templates: {runDueError.message}</p> : null}
      {runDueResult ? (
        <p style={styles.successText}>
          {runDueResult.message} · {toNumber(runDueResult.processed_count)} templates recorded
        </p>
      ) : null}

      {loading ? (
        <p style={styles.sectionDescription}>Loading scheduled templates...</p>
      ) : error ? (
        <p style={styles.errorText}>Failed to load scheduled templates: {error.message}</p>
      ) : !rows.length ? (
        <p style={styles.emptyState}>No scheduled usage templates configured yet.</p>
      ) : (
        <div style={styles.templateList}>
          {rows.map((row) => (
            <div key={row.id} style={styles.templateCard}>
              <div>
                <strong>{row.name}</strong>
                <p style={styles.templateMeta}>
                  {formatSchedule(row.schedule_frequency, row.schedule_interval)} · {formatUsageReason(String(row.consumption_reason || 'internal_use'))}
                </p>
                <p style={styles.templateMeta}>
                  Next run: {formatDateTime(row.next_run_at)} · Last scheduled: {formatDateTime(row.last_scheduled_run_at)}
                </p>
                <p style={styles.templateMeta}>
                  {row.department || 'No department'} · {row.event_name || 'No event/job'} · {toNumber(row.line_count)} lines
                </p>
                <div style={styles.templateMetrics}>
                  <span style={getStatusStyle(row.schedule_status)}>{row.schedule_status || 'scheduled'}</span>
                  <span style={styles.dangerPill}>{toNumber(row.insufficient_stock_count) + toNumber(row.missing_stock_row_count)} blocked lines</span>
                  <span style={styles.warningPill}>{toNumber(row.below_minimum_after_use_count)} below-min warnings</span>
                  <span style={styles.warningPill}>{toNumber(row.evidence_acknowledgement_required_count)} evidence ack</span>
                  <span style={styles.filterPill}>{toNumber(row.use_count)} recorded</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
