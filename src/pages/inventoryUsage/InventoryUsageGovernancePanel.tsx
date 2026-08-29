import { useState } from 'react';
import { OperationalSectionHeader } from '../../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';
import { USAGE_REASON_OPTIONS } from './inventoryUsageConfig';
import { toNumber } from './inventoryUsageFormatting';
import { fetchInventoryUsageExceptions } from './inventoryUsageApi';
import { styles } from './inventoryUsageStyles';
import type {
  InventoryUsageAlertScanResponse,
  InventoryUsageExceptions,
  InventoryUsageLog,
  InventoryUsageSummary,
  UsageFilters,
} from './inventoryUsageTypes';

type InventoryUsageGovernancePanelProps = {
  filters: UsageFilters;
  canReviewUsage?: boolean;
  summary?: InventoryUsageSummary;
  exceptions?: InventoryUsageExceptions;
  logs: InventoryUsageLog[];
  loading: boolean;
  reviewingUsageId?: string | null;
  reviewError?: Error | null;
  onReviewUsage: (
    usageLogId: string,
    reviewStatus: 'reviewed' | 'follow_up_required',
  ) => void;
  canScanAlerts?: boolean;
  scanningAlerts?: boolean;
  alertScanError?: Error | null;
  alertScanResult?: InventoryUsageAlertScanResponse | null;
  onScanAlerts?: () => void;
};

type Ui = (text: string) => string;

const getRiskLevel = (count: number, ui: Ui) => {
  if (count >= 4) return ui('High attention');
  if (count >= 2) return ui('Watch');
  if (count === 1) return ui('Low');
  return ui('Clean');
};

const formatUsageReasonDisplay = (reason: string | null | undefined, ui: Ui): string => {
  if (!reason) return ui('Unassigned');
  const option = USAGE_REASON_OPTIONS.find((entry) => entry.value === reason);
  return option ? ui(option.label) : reason;
};

const formatExceptionType = (value: string, ui: Ui): string => {
  switch (value) {
    case 'missing_department':
      return ui('Missing department');
    case 'missing_notes':
      return ui('Missing notes');
    case 'backdated_usage':
      return ui('Backdated usage');
    case 'damage_waste':
      return ui('Damage / waste');
    default:
      return value;
  }
};

const formatReviewStatus = (value: string | null | undefined, ui: Ui): string => {
  switch (value) {
    case 'reviewed':
      return ui('Reviewed');
    case 'follow_up_required':
      return ui('Follow-up required');
    case 'pending':
      return ui('Pending');
    default:
      return value || ui('Pending');
  }
};

export function InventoryUsageGovernancePanel({
  filters,
  canReviewUsage,
  summary,
  exceptions,
  logs,
  loading,
  reviewingUsageId,
  reviewError,
  onReviewUsage,
  canScanAlerts,
  scanningAlerts,
  alertScanError,
  alertScanResult,
  onScanAlerts,
}: InventoryUsageGovernancePanelProps) {
  const { locale, ui } = useAppTranslation();
  const [exportingExceptions, setExportingExceptions] = useState(false);
  const [exceptionExportError, setExceptionExportError] = useState('');
  const missingDepartmentCount = logs.filter(
    (usage) => !usage.department,
  ).length;
  const missingNotesCount = logs.filter((usage) => !usage.notes).length;
  const backdatedCount = logs.filter((usage) => {
    if (!usage.consumed_at) return false;

    const consumedAt = new Date(usage.consumed_at).getTime();
    if (Number.isNaN(consumedAt)) return false;

    return consumedAt < Date.now() - 1000 * 60 * 60 * 24 * 14;
  }).length;

  const damageWasteQuantity = (summary?.by_reason || [])
    .filter((row) => ['damage', 'waste'].includes(row.consumption_reason))
    .reduce((total, row) => total + toNumber(row.total_quantity), 0);

  const topReason = [...(summary?.by_reason || [])].sort(
    (first, second) =>
      toNumber(second.total_quantity) - toNumber(first.total_quantity),
  )[0];

  const exceptionSummary = exceptions?.summary;
  const exceptionRows = exceptions?.rows || [];
  const backendMissingDepartmentCount = toNumber(
    exceptionSummary?.missing_department_count,
  );
  const backendMissingNotesCount = toNumber(
    exceptionSummary?.missing_notes_count,
  );
  const backendBackdatedCount = toNumber(exceptionSummary?.backdated_count);
  const backendDamageWasteQuantity = toNumber(
    exceptionSummary?.damage_waste_quantity,
  );
  const exceptionCount = toNumber(exceptionSummary?.exception_count);
  const pendingReviewCount = toNumber(exceptionSummary?.pending_review_count);
  const followUpRequiredCount = toNumber(
    exceptionSummary?.follow_up_required_count,
  );

  const escapeCsvCell = (value: unknown) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const safeRaw = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safeRaw.replace(/"/g, '""')}"`;
  };

  const exportExceptionsCsv = async () => {
    setExportingExceptions(true);
    setExceptionExportError('');

    try {
      const allRows = [];
      const batchSize = 500;
      let offset = 0;

      while (true) {
        const response = await fetchInventoryUsageExceptions(filters, batchSize, offset);
        const batch = response.rows || [];
        allRows.push(...batch);
        if (batch.length < batchSize) break;
        offset += batchSize;
      }

      const headers = [
        'usage_log_id', 'exception_types', 'product_id', 'product_name',
        'storage_location_id', 'storage_location_name', 'consumption_reason',
        'department', 'quantity', 'unit', 'estimated_usage_value', 'currency_code',
        'review_status', 'reviewed_at', 'reviewed_by_user_id',
        'reviewed_by_user_name', 'reversed_at', 'consumed_at',
        'created_by_user_id', 'created_by_user_name', 'notes',
      ];

      const rows = allRows.map((row) => ({
        usage_log_id: row.id,
        exception_types: (row.exception_types || []).join(';'),
        product_id: row.product_id,
        product_name: row.product_name,
        storage_location_id: row.storage_location_id,
        storage_location_name: row.storage_location_name,
        consumption_reason: row.consumption_reason,
        department: row.department || '',
        quantity: row.quantity,
        unit: row.product_unit || '',
        estimated_usage_value: row.estimated_usage_value ?? '',
        currency_code: row.currency_code || '',
        review_status: row.review_status || 'pending',
        reviewed_at: row.reviewed_at || '',
        reviewed_by_user_id: row.reviewed_by_user_id || '',
        reviewed_by_user_name: row.reviewed_by_user_name || '',
        reversed_at: row.reversed_at || '',
        consumed_at: row.consumed_at || '',
        created_by_user_id: row.created_by_user_id || '',
        created_by_user_name: row.created_by_user_name || '',
        notes: row.notes || '',
      }));

      const csv = [
        headers.join(','),
        ...rows.map((row) =>
          headers.map((header) => escapeCsvCell(row[header as keyof typeof row])).join(','),
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-usage-exceptions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setExceptionExportError(error instanceof Error ? error.message : ui('Could not export usage exceptions.'));
    } finally {
      setExportingExceptions(false);
    }
  };

  const attentionCount = [
    (backendMissingDepartmentCount || missingDepartmentCount) > 0,
    (backendMissingNotesCount || missingNotesCount) > 0,
    (backendBackdatedCount || backdatedCount) > 0,
    (backendDamageWasteQuantity || damageWasteQuantity) > 0,
  ].filter(Boolean).length;

  const alertSignalCount = toNumber(
    alertScanResult?.alert_count ?? alertScanResult?.planned_alert_count,
  );
  const lookbackDays = Number(alertScanResult?.lookback_days || 30);

  return (
    <section style={styles.cardWide}>
      <OperationalSectionHeader
        iconPath="/audit"
        title={ui('Usage governance')}
        description={ui('Enterprise review signals for attribution quality, backdated usage, and waste/damage exposure.')}
        actions={<>
          <div style={styles.inlineActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={exportExceptionsCsv}
              disabled={exportingExceptions || !exceptionRows.length}
            >
              {exportingExceptions ? ui('Preparing exceptions CSV...') : ui('Export filtered exceptions CSV')}
            </button>
            {canScanAlerts && onScanAlerts ? (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={onScanAlerts}
                disabled={scanningAlerts}
              >
                {scanningAlerts ? ui('Scanning alerts...') : ui('Scan alerts')}
              </button>
            ) : null}
            <span style={styles.filterPill}>
              {loading ? ui('Reviewing...') : getRiskLevel(attentionCount, ui)}
            </span>
          </div>
        </>}
      />

      {alertScanError ? (
        <p style={styles.errorText}>{alertScanError.message}</p>
      ) : null}

      {exceptionExportError ? (
        <p style={styles.errorText}>{ui('Usage exception export failed: ')}{exceptionExportError}</p>
      ) : null}

      {alertScanResult ? (
        <p style={styles.sectionDescription}>
          {alertScanResult.message}: {formatLocalizedNumber(alertSignalCount, locale)} {ui(alertSignalCount === 1 ? 'alert signal' : 'alert signals')} {ui('for the last')} {formatLocalizedNumber(lookbackDays, locale)} {ui(lookbackDays === 1 ? 'day' : 'days')}.
        </p>
      ) : null}

      {loading ? (
        <p style={styles.sectionDescription}>{ui('Loading governance signals...')}</p>
      ) : !logs.length ? (
        <p style={styles.emptyState}>
          {ui('No usage logs available for governance review in the selected filters.')}
        </p>
      ) : (
        <div style={styles.governanceGrid}>
          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>{ui('Missing department')}</span>
            <strong style={styles.statValueSmall}>
              {formatLocalizedNumber(backendMissingDepartmentCount || missingDepartmentCount, locale)} {ui('logs')}
            </strong>
            <small>
              {ui('Department attribution helps explain who consumed stock.')}
            </small>
          </div>

          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>{ui('Missing notes')}</span>
            <strong style={styles.statValueSmall}>
              {formatLocalizedNumber(backendMissingNotesCount || missingNotesCount, locale)} {ui('logs')}
            </strong>
            <small>
              {ui('Notes are recommended for damage, waste, events, and maintenance usage.')}
            </small>
          </div>

          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>{ui('Backdated usage')}</span>
            <strong style={styles.statValueSmall}>
              {formatLocalizedNumber(backendBackdatedCount || backdatedCount, locale)} {ui('logs')}
            </strong>
            <small>
              {ui('Older consumed-at dates should be reviewed during period close.')}
            </small>
          </div>

          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>{ui('Damage / waste quantity')}</span>
            <strong style={styles.statValueSmall}>
              {formatLocalizedNumber(backendDamageWasteQuantity || toNumber(damageWasteQuantity), locale, { maximumFractionDigits: 2 })}
            </strong>
            <small>
              {ui('Operational loss quantity captured in the selected period.')}
            </small>
          </div>

          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>{ui('Exception rows')}</span>
            <strong style={styles.statValueSmall}>{formatLocalizedNumber(exceptionCount, locale)}</strong>
            <small>
              {formatLocalizedNumber(pendingReviewCount, locale)} {ui('pending')} · {formatLocalizedNumber(followUpRequiredCount, locale)} {ui('follow-up required')}.
            </small>
          </div>

          <div style={styles.governanceCardWide}>
            <span style={styles.statLabel}>{ui('Latest exceptions')}</span>
            {exceptionRows.length ? (
              <div style={styles.contextCell}>
                {exceptionRows.slice(0, 3).map((row) => (
                  <div key={row.id} style={styles.reviewRow}>
                    <small>
                      {(row.exception_types || []).map((value) => formatExceptionType(value, ui)).join(', ') || ui('Exception')} ·{' '}
                      {row.product_name || row.product_id} ·{' '}
                      {formatUsageReasonDisplay(row.consumption_reason, ui)} ·{' '}
                      {formatReviewStatus(row.review_status || 'pending', ui)}
                    </small>

                    {!row.reversed_at && row.review_status !== 'reviewed' ? (
                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => onReviewUsage(row.id, 'reviewed')}
                          disabled={
                            !canReviewUsage || reviewingUsageId === row.id
                          }
                        >
                          {reviewingUsageId === row.id
                            ? ui('Saving...')
                            : ui('Mark reviewed')}
                        </button>

                        <button
                          type="button"
                          style={styles.dangerButton}
                          onClick={() =>
                            onReviewUsage(row.id, 'follow_up_required')
                          }
                          disabled={
                            !canReviewUsage || reviewingUsageId === row.id
                          }
                        >
                          {ui('Follow up')}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}

                {reviewError ? (
                  <small style={styles.errorText}>{reviewError.message}</small>
                ) : null}
              </div>
            ) : (
              <small>{ui('No server-side exceptions returned.')}</small>
            )}
          </div>

          <div style={styles.governanceCardWide}>
            <span style={styles.statLabel}>{ui('Dominant reason')}</span>
            <strong style={styles.statValueSmall}>
              {topReason
                ? formatUsageReasonDisplay(topReason.consumption_reason, ui)
                : '-'}
            </strong>
            <small>
              {topReason
                ? <>{formatLocalizedNumber(toNumber(topReason.total_quantity), locale, { maximumFractionDigits: 2 })} {ui('consumed across')} {formatLocalizedNumber(toNumber(topReason.usage_count), locale)} {ui(toNumber(topReason.usage_count) === 1 ? 'event.' : 'events.')}</>
                : ui('No reason concentration available.')}
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
