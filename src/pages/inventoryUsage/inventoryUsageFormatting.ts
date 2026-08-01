import type { UsageFilters } from './inventoryUsageTypes';

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}


export function formatMoney(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatUsageReason(reason: string | null | undefined): string {
  if (!reason) return 'Unassigned';

  return reason
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildUsageQuery(filters: UsageFilters, limit?: number, offset?: number): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Date inputs are calendar-day filters. Send an inclusive end-of-day
    // timestamp so selecting a To date includes usage recorded later that day.
    if (key === 'end_date' && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      params.set(key, `${trimmed}T23:59:59.999`);
      return;
    }

    if (key === 'start_date' && /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      params.set(key, `${trimmed}T00:00:00.000`);
      return;
    }

    params.set(key, trimmed);
  });

  if (limit) {
    params.set('limit', String(limit));
  }

  if (offset) {
    params.set('offset', String(offset));
  }

  return params.toString() ? `?${params.toString()}` : '';
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString();
}

export function formatDecimal(value: number | string | null | undefined, maximumFractionDigits = 2): string {
  const amount = toNumber(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(amount);
}

export function formatDays(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const days = toNumber(value);
  return `${formatDecimal(days, days < 10 ? 1 : 0)} day${Math.abs(days - 1) < 0.0001 ? '' : 's'}`;
}

export function formatCodeLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return value
    .split(/[_:]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function shortenId(value: string | null | undefined, length = 8): string {
  if (!value) return '-';
  return value.length <= length ? value : `${value.slice(0, length)}…`;
}
