import { OperationalSectionHeader } from '../../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/formatters';
import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { toNumber } from './inventoryUsageFormatting';
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

type Ui = (text: string) => string;
type Locale = Parameters<typeof formatLocalizedNumber>[1];

const getStatusStyle = (status?: string) => {
  if (status === 'due') return styles.warningPill;
  if (status === 'insufficient_stock' || status === 'reserved_stock' || status === 'missing_stock' || status === 'missing_evidence_acknowledgement_required' || status === 'empty') return styles.dangerPill;
  if (status === 'ready_with_warnings') return styles.warningPill;
  if (status === 'scheduled') return styles.successPill;
  return styles.filterPill;
};

const formatScheduleStatus = (status: string | null | undefined, ui: Ui): string => {
  switch (status) {
    case 'reserved_stock':
      return ui('Blocked by reservations');
    case 'insufficient_stock':
      return ui('Insufficient stock');
    case 'missing_stock':
      return ui('Missing stock');
    case 'missing_evidence_acknowledgement_required':
      return ui('Evidence acknowledgement required');
    case 'ready_with_warnings':
      return ui('Ready with warnings');
    case 'due':
      return ui('Due');
    case 'scheduled':
      return ui('Scheduled');
    case 'empty':
      return ui('Empty');
    case 'inactive':
      return ui('Inactive');
    default:
      return status || ui('Scheduled');
  }
};

const formatUsageReasonDisplay = (reason: string | null | undefined, ui: Ui): string => {
  if (!reason) return ui('Unassigned');
  const option = USAGE_REASON_OPTIONS.find((entry) => entry.value === reason);
  return option ? ui(option.label) : reason;
};

const formatSchedule = (frequency: string | null | undefined, interval: number | string | null | undefined, ui: Ui, locale: Locale) => {
  if (!frequency) return ui('No schedule');
  const count = Math.max(1, toNumber(interval || 1));

  if (count === 1) {
    if (frequency === 'daily') return ui('Every day');
    if (frequency === 'weekly') return ui('Every week');
    if (frequency === 'monthly') return ui('Every month');
    return frequency;
  }

  const unit = frequency === 'daily'
    ? ui('days')
    : frequency === 'weekly'
      ? ui('weeks')
      : frequency === 'monthly'
        ? ui('months')
        : frequency;

  return `${ui('Every')} ${formatLocalizedNumber(count, locale)} ${unit}`;
};

export function InventoryUsageScheduledTemplatesPanel({ scheduled, loading, error, runningDueTemplates = false, runDueError, runDueResult, canRunDueTemplates = false, onRunDueTemplates }: InventoryUsageScheduledTemplatesPanelProps) {
  const { locale, ui } = useAppTranslation();
  const rows = scheduled?.rows || [];
  const summary = scheduled?.summary;

  return (
    <section style={styles.card}>
      <OperationalSectionHeader
        iconPath="/automation-schedules"
        title={ui('Scheduled usage templates')}
        description={ui('Monitor recurring usage packs before staff records them, with readiness and stock-risk status.')}
        actions={<>
          <div style={styles.templateMetrics}>
            <span style={styles.filterPill}>{formatLocalizedNumber(toNumber(summary?.template_count), locale)} {ui('scheduled')}</span>
            <span style={styles.warningPill}>{formatLocalizedNumber(toNumber(summary?.due_count), locale)} {ui('due')}</span>
            <span style={styles.dangerPill}>{formatLocalizedNumber(toNumber(summary?.blocked_count), locale)} {ui('blocked')}</span>
            <span style={styles.warningPill}>{formatLocalizedNumber(toNumber(summary?.evidence_acknowledgement_required_count), locale)} {ui('need evidence ack')}</span>
            {canRunDueTemplates && onRunDueTemplates ? (
              <button
                type="button"
                style={styles.secondaryButton}
                disabled={runningDueTemplates || toNumber(summary?.due_count) <= 0}
                onClick={onRunDueTemplates}
              >
                {runningDueTemplates ? ui('Recording due...') : ui('Record due templates')}
              </button>
            ) : null}
          </div>
        </>}
      />

      {runDueError ? <p style={styles.errorText}>{ui('Failed to record due templates: ')}{runDueError.message}</p> : null}
      {runDueResult ? (
        <p style={styles.successText}>
          {runDueResult.message} · {formatLocalizedNumber(toNumber(runDueResult.processed_count), locale)} {ui('templates recorded')}
        </p>
      ) : null}

      {loading ? (
        <p style={styles.sectionDescription}>{ui('Loading scheduled templates...')}</p>
      ) : error ? (
        <p style={styles.errorText}>{ui('Failed to load scheduled templates: ')}{error.message}</p>
      ) : !rows.length ? (
        <p style={styles.emptyState}>{ui('No scheduled usage templates configured yet.')}</p>
      ) : (
        <div style={styles.templateList}>
          {rows.map((row) => {
            const blockedCount = toNumber(row.insufficient_stock_count) + toNumber(row.reserved_stock_count) + toNumber(row.missing_stock_row_count);
            const lineCount = toNumber(row.line_count);

            return (
              <div key={row.id} style={styles.templateCard}>
                <div>
                  <strong>{row.name}</strong>
                  <p style={styles.templateMeta}>
                    {formatSchedule(row.schedule_frequency, row.schedule_interval, ui, locale)} · {formatUsageReasonDisplay(String(row.consumption_reason || 'internal_use'), ui)}
                  </p>
                  <p style={styles.templateMeta}>
                    {ui('Next run:')} {formatLocalizedDateTime(row.next_run_at, locale)} · {ui('Last scheduled:')} {formatLocalizedDateTime(row.last_scheduled_run_at, locale)}
                  </p>
                  <p style={styles.templateMeta}>
                    {row.department || ui('No department')} · {row.event_name || ui('No event/job')} · {formatLocalizedNumber(lineCount, locale)} {ui(lineCount === 1 ? 'line' : 'lines')}
                  </p>
                  <div style={styles.templateMetrics}>
                    <span style={getStatusStyle(row.schedule_status)}>{formatScheduleStatus(row.schedule_status, ui)}</span>
                    <span style={styles.dangerPill}>
                      {formatLocalizedNumber(blockedCount, locale)} {ui('blocked lines')}
                    </span>
                    {toNumber(row.reserved_stock_count) > 0 ? (
                      <span style={styles.dangerPill}>{formatLocalizedNumber(toNumber(row.reserved_stock_count), locale)} {ui('use reserved stock')}</span>
                    ) : null}
                    <span style={styles.warningPill}>{formatLocalizedNumber(toNumber(row.below_minimum_after_use_count), locale)} {ui('below-min warnings')}</span>
                    <span style={styles.warningPill}>{formatLocalizedNumber(toNumber(row.evidence_acknowledgement_required_count), locale)} {ui('evidence ack')}</span>
                    <span style={styles.filterPill}>{formatLocalizedNumber(toNumber(row.use_count), locale)} {ui('recorded')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
