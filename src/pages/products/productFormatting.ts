export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });
}


export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return `${amount.toFixed(1)}%`;
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

