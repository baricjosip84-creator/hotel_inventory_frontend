import { http } from './http';

export const DEFAULT_INVENTORY_CURRENCY = 'EUR';

export type TenantCurrencyContext = {
  currency_code: string;
  configured: boolean;
  automatic_fx_conversion: false;
};

let activeTenantCurrency = DEFAULT_INVENTORY_CURRENCY;

export function normalizeCurrencyCode(value: string | null | undefined, fallback = DEFAULT_INVENTORY_CURRENCY): string {
  const normalized = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

export function setActiveTenantCurrency(value: string | null | undefined): string {
  activeTenantCurrency = normalizeCurrencyCode(value);
  return activeTenantCurrency;
}

export function getActiveTenantCurrency(): string {
  return activeTenantCurrency;
}

export async function fetchTenantCurrencyContext(): Promise<TenantCurrencyContext> {
  const context = await http<TenantCurrencyContext>('/tenants/currency-context');
  setActiveTenantCurrency(context.currency_code);
  return {
    ...context,
    currency_code: normalizeCurrencyCode(context.currency_code)
  };
}

export function formatCurrencyAmount(
  value: number | string | null | undefined,
  currency: string | null | undefined = getActiveTenantCurrency(),
  maximumFractionDigits = 2
): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(undefined, { maximumFractionDigits })} ${code}`;
  }
}
