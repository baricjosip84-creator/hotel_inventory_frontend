import { formatUsageReason, toNumber } from './inventoryUsageFormatting';
import { styles } from './inventoryUsageStyles';
import type { InventoryUsageAlertScanResponse, InventoryUsageExceptions, InventoryUsageLog, InventoryUsageSummary } from './inventoryUsageTypes';

type InventoryUsageGovernancePanelProps = {
  summary?: InventoryUsageSummary;
  exceptions?: InventoryUsageExceptions;
  logs: InventoryUsageLog[];
  loading: boolean;
  reviewingUsageId?: string | null;
  reviewError?: Error | null;
  onReviewUsage: (usageLogId: string, reviewStatus: 'reviewed' | 'follow_up_required') => void;
  canScanAlerts?: boolean;
  scanningAlerts?: boolean;
  alertScanError?: Error | null;
  alertScanResult?: InventoryUsageAlertScanResponse | null;
  onScanAlerts?: () => void;
};

const getRiskLevel = (count: number) => {
  if (count >= 4) return 'High attention';
  if (count >= 2) return 'Watch';
  if (count === 1) return 'Low';
  return 'Clean';
};

export function InventoryUsageGovernancePanel({
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
  onScanAlerts
}: InventoryUsageGovernancePanelProps) {
  const missingDepartmentCount = logs.filter((usage) => !usage.department).length;
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
    (first, second) => toNumber(second.total_quantity) - toNumber(first.total_quantity)
  )[0];
  const exceptionSummary = exceptions?.summary;
  const exceptionRows = exceptions?.rows || [];
  const backendMissingDepartmentCount = toNumber(exceptionSummary?.missing_department_count);
  const backendMissingNotesCount = toNumber(exceptionSummary?.missing_notes_count);
  const backendBackdatedCount = toNumber(exceptionSummary?.backdated_count);
  const backendDamageWasteQuantity = toNumber(exceptionSummary?.damage_waste_quantity);
  const exceptionCount = toNumber(exceptionSummary?.exception_count);
  const pendingReviewCount = toNumber(exceptionSummary?.pending_review_count);
  const followUpRequiredCount = toNumber(exceptionSummary?.follow_up_required_count);


  const attentionCount = [
    (backendMissingDepartmentCount || missingDepartmentCount) > 0,
    (backendMissingNotesCount || missingNotesCount) > 0,
    (backendBackdatedCount || backdatedCount) > 0,
    (backendDamageWasteQuantity || damageWasteQuantity) > 0
  ].filter(Boolean).length;

  return (
    <section style={styles.cardWide}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Usage governance</h2>
          <p style={styles.sectionDescription}>
            Enterprise review signals for attribution quality, backdated usage, and waste/damage exposure.
          </p>
        </div>
        <div style={styles.inlineActions}>
          {canScanAlerts && onScanAlerts ? (
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onScanAlerts}
              disabled={scanningAlerts}
            >
              {scanningAlerts ? 'Scanning alerts...' : 'Scan alerts'}
            </button>
          ) : null}
          <span style={styles.filterPill}>{loading ? 'Reviewing...' : getRiskLevel(attentionCount)}</span>
        </div>
      </div>
      {alertScanError ? <p style={styles.errorText}>{alertScanError.message}</p> : null}
      {alertScanResult ? (
        <p style={styles.sectionDescription}>
          {alertScanResult.message}: {toNumber(alertScanResult.alert_count ?? alertScanResult.planned_alert_count)} alert signal{toNumber(alertScanResult.alert_count ?? alertScanResult.planned_alert_count) === 1 ? '' : 's'} for the last {alertScanResult.lookback_days || 30} day{Number(alertScanResult.lookback_days || 30) === 1 ? '' : 's'}.
        </p>
      ) : null}

      {loading ? (
        <p style={styles.sectionDescription}>Loading governance signals...</p>
      ) : !logs.length ? (
        <p style={styles.emptyState}>No usage logs available for governance review in the selected filters.</p>
      ) : (
        <div style={styles.governanceGrid}>
          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>Missing department</span>
            <strong style={styles.statValueSmall}>{backendMissingDepartmentCount || missingDepartmentCount} logs</strong>
            <small>Department attribution helps explain who consumed stock.</small>
          </div>
          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>Missing notes</span>
            <strong style={styles.statValueSmall}>{backendMissingNotesCount || missingNotesCount} logs</strong>
            <small>Notes are recommended for damage, waste, events, and maintenance usage.</small>
          </div>
          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>Backdated usage</span>
            <strong style={styles.statValueSmall}>{backendBackdatedCount || backdatedCount} logs</strong>
            <small>Older consumed-at dates should be reviewed during period close.</small>
          </div>
          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>Damage / waste quantity</span>
            <strong style={styles.statValueSmall}>{backendDamageWasteQuantity || toNumber(damageWasteQuantity)}</strong>
            <small>Operational loss quantity captured in the selected period.</small>
          </div>
          <div style={styles.governanceCard}>
            <span style={styles.statLabel}>Exception rows</span>
            <strong style={styles.statValueSmall}>{exceptionCount}</strong>
            <small>{pendingReviewCount} pending · {followUpRequiredCount} follow-up required.</small>
          </div>
          <div style={styles.governanceCardWide}>
            <span style={styles.statLabel}>Latest exceptions</span>
            {exceptionRows.length ? (
              <div style={styles.contextCell}>
                {exceptionRows.slice(0, 3).map((row) => (
                  <div key={row.id} style={styles.reviewRow}>
                    <small>
                      {(row.exception_types || []).join(', ') || 'exception'} · {row.product_name || row.product_id} · {formatUsageReason(row.consumption_reason)} · {row.review_status || 'pending'}
                    </small>
                    {!row.reversed_at && row.review_status !== 'reviewed' ? (
                      <div style={styles.inlineActions}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => onReviewUsage(row.id, 'reviewed')}
                          disabled={reviewingUsageId === row.id}
                        >
                          {reviewingUsageId === row.id ? 'Saving...' : 'Mark reviewed'}
                        </button>
                        <button
                          type="button"
                          style={styles.dangerButton}
                          onClick={() => onReviewUsage(row.id, 'follow_up_required')}
                          disabled={reviewingUsageId === row.id}
                        >
                          Follow up
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {reviewError ? <small style={styles.errorText}>{reviewError.message}</small> : null}
              </div>
            ) : (
              <small>No server-side exceptions returned.</small>
            )}
          </div>
          <div style={styles.governanceCardWide}>
            <span style={styles.statLabel}>Dominant reason</span>
            <strong style={styles.statValueSmall}>
              {topReason ? formatUsageReason(topReason.consumption_reason) : '-'}
            </strong>
            <small>
              {topReason
                ? `${toNumber(topReason.total_quantity)} consumed across ${toNumber(topReason.usage_count)} events.`
                : 'No reason concentration available.'}
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
