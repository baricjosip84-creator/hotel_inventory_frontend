import { getActiveTenantCurrency } from '../../lib/tenantCurrency';
import { DEFAULT_LOCALE, type AppLocale } from '../../i18n/config';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/formatters';

export function formatDateTime(dateString: string | null | undefined, locale: AppLocale = DEFAULT_LOCALE): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return formatLocalizedDateTime(date, locale);
}

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

export function formatNumber(
  value: number | string | null | undefined,
  locale: AppLocale = DEFAULT_LOCALE,
  options: Intl.NumberFormatOptions = {}
): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return formatLocalizedNumber(amount, locale, options);
}

export function formatMoney(value: number | string | null | undefined, locale: AppLocale = DEFAULT_LOCALE): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return formatLocalizedCurrency(amount, getActiveTenantCurrency(), locale);
}


export function formatPercent(value: number | string | null | undefined, locale: AppLocale = DEFAULT_LOCALE, fractionDigits = 1): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return `${formatLocalizedNumber(amount, locale, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}%`;
}

export function formatPriorityBand(priorityBand?: string | null): string {
  if (priorityBand === 'critical') {
    return 'Critical';
  }

  if (priorityBand === 'high') {
    return 'High';
  }

  if (priorityBand === 'watch') {
    return 'Watch';
  }

  return 'Unclassified';
}

export function formatImpactType(impactType?: string | null): string {
  if (impactType === 'valued_inventory_review') return 'Valued inventory review';
  if (impactType === 'unvalued_stock_review') return 'Unvalued stock review';
  if (impactType === 'master_data_review') return 'Master data review';
  return impactType ? impactType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatCostSource(costSource?: string | null): string {
  if (costSource === 'no_cost') return 'No cost basis';
  if (costSource === 'product_standard') return 'Standard fallback';
  if (costSource === 'movement') return 'Received movement cost';
  return costSource ? costSource.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatKnownCostHistorySource(costSource?: string | null): string | null {
  if (costSource === 'product_standard_cost') return 'Product standard cost';
  if (costSource === 'shipment_item_unit_cost') return 'Shipment item unit cost';
  if (costSource === 'landed_cost') return 'Landed cost';
  if (costSource === 'movement') return 'Received movement cost';
  return null;
}

export function formatActionType(actionType?: string | null): string {
  if (actionType === 'capture_missing_cost') return 'Capture missing cost';
  if (actionType === 'review_standard_cost') return 'Review standard cost';
  if (actionType === 'investigate_cost_history') return 'Investigate cost history';
  return actionType ? actionType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatCostAgeBand(costAgeBand?: string | null): string {
  if (costAgeBand === 'no_cost_date') return 'No cost date';
  if (costAgeBand === 'standard_fallback_only') return 'Standard fallback only';
  if (costAgeBand === 'stale_received_cost') return 'Stale received cost';
  if (costAgeBand === 'recent_received_cost') return 'Recent received cost';
  return costAgeBand ? costAgeBand.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}


export function formatCostAlertType(alertType?: string | null): string {
  if (alertType === 'missing_cost') return 'Missing cost';
  if (alertType === 'high_variance') return 'High variance';
  if (alertType === 'cost_spike') return 'Cost spike';
  if (alertType === 'inconsistent_history') return 'Inconsistent history';
  if (alertType === 'stale_cost') return 'Stale cost';
  return alertType ? alertType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatCostAlertSeverity(severity?: string | null): string {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  if (severity === 'watch') return 'Watch';
  return severity ? severity.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}


export function formatCostRecommendationType(recommendationType?: string | null): string {
  if (recommendationType === 'capture_missing_cost') return 'Capture missing cost';
  if (recommendationType === 'investigate_cost_spike') return 'Investigate cost spike';
  if (recommendationType === 'investigate_cost_history') return 'Investigate cost history';
  if (recommendationType === 'review_standard_cost') return 'Review standard cost';
  if (recommendationType === 'refresh_cost_evidence') return 'Refresh cost evidence';
  return recommendationType ? recommendationType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatCostRecommendationPriority(priority?: string | null): string {
  if (priority === 'critical') return 'Critical';
  if (priority === 'high') return 'High';
  if (priority === 'medium') return 'Medium';
  if (priority === 'low') return 'Low';
  return priority ? priority.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatRiskType(riskType?: string | null): string {
  if (riskType === 'high_variance') return 'High variance';
  if (riskType === 'missing_cost') return 'Missing cost';
  if (riskType === 'inconsistent_history') return 'Inconsistent history';
  return riskType ? riskType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

export function formatValuationBasis(basis?: string | null) {
  if (basis === 'received') {
    return 'Received cost';
  }

  if (basis === 'standard') {
    return 'Standard fallback';
  }

  if (basis === 'none') {
    return 'No cost';
  }

  return 'Unknown basis';
}

export function formatCostVarianceStatus(value: string | null | undefined): string {
  if (!value) return '-';

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}


export type ProductStatusTone = 'good' | 'warn' | 'bad' | 'neutral';

const STATUS_LABELS: Record<string, string> = {
  pass: 'Passed',
  fail: 'Failed',
  watch: 'Watch',
  ready: 'Ready',
  clear: 'Clear',
  controlled: 'Controlled',
  present: 'Present',
  none: 'None',
  scoped: 'Tenant scoped',
  tenant_actor: 'Tenant actor',
  no_mutation: 'Read-only',
  followup_required: 'Follow-up required',
  review_required: 'Review required',
  final_review_required: 'Final review required',
  ready_for_signoff: 'Ready for sign-off',
  not_ready: 'Not ready',
  conditional_review: 'Conditional review',
  ready_to_close: 'Ready to close',
  ready_to_archive: 'Ready to archive',
  conditional_followup: 'Conditional follow-up',
  ready_for_handoff: 'Ready for handoff',
  conditional_handoff_review: 'Conditional handoff review',
  evidence_review: 'Evidence review',
  steady_state: 'Steady state',
  active_review: 'Active review',
  control_watch: 'Control watch',
  control_review: 'Control review',
  evidence_ready: 'Evidence ready',
  evidence_watch: 'Evidence watch',
  operationally_ready: 'Operationally ready',
  readiness_watch: 'Readiness watch',
  readiness_review: 'Readiness review',
  finalized: 'Finalized',
  final_watch: 'Final watch',
  performance_ready: 'Performance ready',
  performance_watch: 'Performance watch',
  performance_review: 'Performance review',
  indexes_ready: 'Indexes ready',
  indexes_pending: 'Indexes pending',
  security_ready: 'Security ready',
  security_watch: 'Security watch',
  security_review: 'Security review',
  tenant_scoped: 'Tenant scoped',
  tenant_scope_review: 'Tenant scope review'
};

export function formatStatusLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown';

  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'Unknown';

  return STATUS_LABELS[normalized] || normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getProductStatusTone(value: string | null | undefined): ProductStatusTone {
  const normalized = value?.trim().toLowerCase() || '';

  if (
    normalized === 'pass' ||
    normalized === 'ready' ||
    normalized === 'clear' ||
    normalized === 'controlled' ||
    normalized === 'steady_state' ||
    normalized === 'ready_for_signoff' ||
    normalized === 'ready_to_close' ||
    normalized === 'ready_to_archive' ||
    normalized === 'ready_for_handoff' ||
    normalized === 'operationally_ready' ||
    normalized === 'finalized' ||
    normalized === 'performance_ready' ||
    normalized === 'indexes_ready' ||
    normalized === 'security_ready' ||
    normalized === 'tenant_scoped' ||
    normalized === 'scoped' ||
    normalized === 'present' ||
    normalized === 'evidence_ready'
  ) {
    return 'good';
  }

  if (
    normalized === 'fail' ||
    normalized === 'not_ready' ||
    normalized === 'control_review' ||
    normalized === 'readiness_review' ||
    normalized === 'final_review_required' ||
    normalized === 'performance_review' ||
    normalized === 'security_review' ||
    normalized === 'tenant_scope_review'
  ) {
    return 'bad';
  }

  if (
    normalized.includes('watch') ||
    normalized.includes('review') ||
    normalized.includes('followup') ||
    normalized.includes('blocked') ||
    normalized === 'warning' ||
    normalized === 'medium' ||
    normalized === 'high' ||
    normalized === 'critical' ||
    normalized === 'indexes_pending' ||
    normalized === 'active_review'
  ) {
    return 'warn';
  }

  return 'neutral';
}

export function formatGovernanceValue(
  value: number | string | boolean | null | undefined,
  fallbackStatus?: string | null,
  locale: AppLocale = DEFAULT_LOCALE
): string {
  if (value === null || value === undefined || value === '') {
    return formatStatusLabel(fallbackStatus);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    return formatLocalizedNumber(value, locale);
  }

  const normalized = value.trim();
  if (!normalized) return formatStatusLabel(fallbackStatus);

  const parsedDate = new Date(normalized);
  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized) && !Number.isNaN(parsedDate.getTime())) {
    return formatLocalizedDateTime(parsedDate, locale);
  }

  if (/^[a-z0-9]+(?:_[a-z0-9]+)+$/i.test(normalized)) {
    return formatStatusLabel(normalized);
  }

  return normalized;
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

