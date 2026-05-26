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

export function buildUsageQuery(filters: UsageFilters, limit?: number): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  });

  if (limit) {
    params.set('limit', String(limit));
  }

  return params.toString() ? `?${params.toString()}` : '';
}
