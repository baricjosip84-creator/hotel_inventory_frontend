import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { ApiError, apiRequest } from '../lib/api';
import { showTenantActionError, showTenantActionSuccess } from '../lib/actionFeedback';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { formatCurrencyAmount } from '../lib/tenantCurrency';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './InsightsPage.css';

type DepletionRiskResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  rows: Array<{
    stock_id: string;
    product_id: string;
    product_name: string;
    product_category?: string | null;
    product_unit?: string | null;
    storage_location_name: string;
    current_quantity: number | string;
    configured_min_quantity: number | string;
    recent_outbound_quantity: number | string;
    average_daily_outbound: number | string;
    estimated_days_of_coverage: number | null;
    risk_score: number | string;
    risk_tier: string;
  }>;
};


type DepletionRiskRootCauseResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  scope: string;
  safety_contract: {
    read_only: boolean;
    advisory_only: boolean;
    no_inventory_mutation: boolean;
    no_procurement_execution: boolean;
    no_autonomous_approval: boolean;
  };
  summary: {
    total_rows: number;
    rows_requiring_human_review: number;
    by_factor_severity: Record<string, number>;
    by_factor_code: Record<string, number>;
  };
  rows: Array<DepletionRiskResponse['rows'][number] & {
    highest_factor_severity: 'critical' | 'high' | 'medium' | 'low';
    root_cause_factors: Array<{
      code: string;
      label: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      detail: string;
    }>;
    recommended_investigation_steps: string[];
    production_safety: {
      read_only: boolean;
      advisory_only: boolean;
      creates_reorder_or_stock_change: boolean;
      requires_human_review: boolean;
    };
  }>;
};

type ReorderRecommendationsResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  rows: Array<{
    product_id: string;
    product_name: string;
    unit: string;
    current_quantity: number | string;
    min_stock: number | string;
    average_daily_usage: number | string;
    estimated_days_of_coverage: number | null;
    recommended_reorder_quantity: number | string;
    urgency: string;
  }>;
};

type OperationalHealthResponse = {
  generated_at: string;
  tenant_id: string;
  health_score: number | string;
  health_tier: string;
  metrics: {
    unresolved_alerts: number;
    overdue_shipments: number;
    total_stock_rows: number;
    low_stock_rows: number;
    low_stock_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
  };
};

type AnomaliesResponse = {
  generated_at: string;
  tenant_id: string;
  short_window_days: number;
  baseline_window_days: number;
  rows: Array<{
    product_id: string;
    product_name: string;
    product_category?: string | null;
    product_unit?: string | null;
    recent_daily_outbound: number | string;
    baseline_daily_outbound: number | string;
    spike_ratio: number | string;
    anomaly_score: number | string;
    anomaly_tier: string;
  }>;
};

type AnomalyProductionReviewResponse = {
  generated_at: string;
  tenant_id: string;
  short_window_days: number;
  baseline_window_days: number;
  production_status: 'blocked' | 'needs_review' | 'ready_for_controlled_use' | 'monitor_only';
  safety_contract: {
    mode: string;
    read_only: boolean;
    advisory_only: boolean;
    mutates_inventory: boolean;
    suppresses_alerts: boolean;
    creates_procurement_actions: boolean;
    requires_human_approval_for_execution: boolean;
  };
  operational_health_context: {
    health_score: number | string;
    health_tier: string;
    unresolved_alerts: number | string;
    overdue_shipments: number | string;
    low_stock_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
  };
  summary: {
    total_rows: number;
    rows_requiring_human_review: number;
    by_severity: Record<string, number>;
    by_factor_code: Record<string, number>;
  };
  blockers: Array<{ code: string; severity: string; affected_count: number; message: string }>;
  warnings: Array<{ code: string; severity: string; affected_count: number; message: string }>;
  next_actions: string[];
  rows: Array<AnomaliesResponse['rows'][number] & {
    highest_factor_severity: string;
    review_factors: Array<{ code: string; severity: string; label: string; detail: string }>;
    recommended_investigation_steps: string[];
    production_safety: {
      read_only: boolean;
      advisory_only: boolean;
      mutates_inventory: boolean;
      suppresses_alerts: boolean;
      requires_human_review: boolean;
    };
  }>;
};

type SupplierTrustResponse = {
  generated_at: string;
  tenant_id: string;
  summary?: {
    total_suppliers: number | string;
    rated_suppliers: number | string;
    unrated_suppliers: number | string;
    suppliers_with_risk: number | string;
    total_risk_flags: number | string;
    high_risk_flags: number | string;
    medium_risk_flags: number | string;
    low_risk_flags: number | string;
    overdue_open_purchase_orders: number | string;
    closed_short_purchase_orders: number | string;
    po_remaining_quantity: number | string;
    po_remaining_value: number | string;
    currency_code?: string | null;
    risk_supplier_rate_pct: number | string;
  };
  rows: Array<{
    supplier_id: string;
    supplier_name: string;
    completion_rate_pct: number | string;
    overdue_rate_pct: number | string;
    fill_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
    trust_score: number | string | null;
    trust_tier: string;
    trust_evidence_status?: 'rated' | 'insufficient_history';
    total_shipments: number | string;
    total_purchase_orders: number | string;
    completed_purchase_orders: number | string;
    cancelled_purchase_orders: number | string;
    open_purchase_orders: number | string;
    overdue_open_purchase_orders: number | string;
    fully_received_purchase_orders: number | string;
    manually_closed_purchase_orders: number | string;
    closed_short_purchase_orders: number | string;
    po_ordered_quantity: number | string;
    po_received_quantity: number | string;
    po_remaining_quantity: number | string;
    po_ordered_value: number | string;
    po_received_value: number | string;
    po_remaining_value: number | string;
    currency_code?: string | null;
    po_fill_rate_pct: number | string;
    po_completion_rate_pct: number | string;
    po_short_close_rate_pct: number | string;
    risk_flags?: Array<{
      code: string;
      label: string;
      severity: 'high' | 'medium' | 'low';
      detail: string;
    }>;
  }>;
};


type SupplierTrustProductionReviewResponse = {
  generated_at: string;
  tenant_id: string;
  scope: string;
  production_status: 'blocked' | 'needs_review' | 'ready_for_controlled_use' | 'monitor_only';
  safety_contract: {
    mode: string;
    read_only: boolean;
    advisory_only: boolean;
    mutates_supplier_records: boolean;
    creates_purchase_orders: boolean;
    changes_supplier_status: boolean;
    requires_human_approval_for_execution: boolean;
  };
  summary: {
    total_rows: number;
    rows_requiring_human_review: number;
    by_factor_severity: Record<string, number>;
    by_factor_code: Record<string, number>;
  };
  blockers: Array<{ code: string; severity: string; affected_count: number; message: string }>;
  warnings: Array<{ code: string; severity: string; affected_count: number; message: string }>;
  next_actions: string[];
  rows: Array<SupplierTrustResponse['rows'][number] & {
    highest_factor_severity: string;
    review_factors: Array<{ code: string; severity: string; label: string; detail: string }>;
    recommended_supplier_review_steps: string[];
    production_safety: {
      read_only: boolean;
      advisory_only: boolean;
      mutates_supplier_records: boolean;
      creates_purchase_orders: boolean;
      changes_supplier_status: boolean;
      requires_human_review: boolean;
    };
  }>;
};

type SupplierRiskFilter = 'all' | 'with_risk' | 'high' | 'medium' | 'low' | 'none';
type SupplierTierFilter = 'all' | 'excellent' | 'strong' | 'watch' | 'risk' | 'unrated';
type SupplierSort =
  | 'trust_asc'
  | 'trust_desc'
  | 'risk_flags_desc'
  | 'remaining_value_desc'
  | 'overdue_pos_desc'
  | 'fill_rate_asc';

type SupplierPageSize = 6 | 12 | 24 | 48;

type UiTranslator = (englishText: string) => string;

const SUPPLIER_RISK_FILTERS: SupplierRiskFilter[] = ['all', 'with_risk', 'high', 'medium', 'low', 'none'];
const SUPPLIER_TIER_FILTERS: SupplierTierFilter[] = ['all', 'excellent', 'strong', 'watch', 'risk', 'unrated'];
const SUPPLIER_SORT_OPTIONS: SupplierSort[] = ['trust_asc', 'trust_desc', 'risk_flags_desc', 'remaining_value_desc', 'overdue_pos_desc', 'fill_rate_asc'];
const SUPPLIER_PAGE_SIZE_OPTIONS: SupplierPageSize[] = [6, 12, 24, 48];

function normalizeSupplierRiskFilter(value: string | null): SupplierRiskFilter {
  return SUPPLIER_RISK_FILTERS.includes(value as SupplierRiskFilter) ? (value as SupplierRiskFilter) : 'all';
}

function normalizeSupplierTierFilter(value: string | null): SupplierTierFilter {
  return SUPPLIER_TIER_FILTERS.includes(value as SupplierTierFilter) ? (value as SupplierTierFilter) : 'all';
}

function normalizeSupplierSort(value: string | null): SupplierSort {
  return SUPPLIER_SORT_OPTIONS.includes(value as SupplierSort) ? (value as SupplierSort) : 'risk_flags_desc';
}

function normalizeSupplierPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeSupplierPageSize(value: string | null): SupplierPageSize {
  const parsed = Number(value);
  return SUPPLIER_PAGE_SIZE_OPTIONS.includes(parsed as SupplierPageSize) ? (parsed as SupplierPageSize) : 6;
}

function normalizeLookbackDays(value: string | null): number {
  const parsed = Number(value);
  return [14, 30, 60, 90].includes(parsed) ? parsed : 30;
}

function neutralizeSpreadsheetFormula(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function toReadableError(error: unknown, unknownErrorLabel: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return unknownErrorLabel;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function escapeCsv(value: unknown): string {
  const normalized = neutralizeSpreadsheetFormula(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
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

function escapeHtml(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);

  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRiskFlagStyle(severity: 'high' | 'medium' | 'low'): CSSProperties {
  if (severity === 'high') {
    return styles.riskFlagHigh;
  }

  if (severity === 'medium') {
    return styles.riskFlagMedium;
  }

  return styles.riskFlagLow;
}

const INSIGHTS_SYSTEM_TEXT = new Set([
  'No stock on hand',
  'Current quantity is zero or below zero, so this stock row needs immediate operational review.',
  'Below configured minimum',
  'Near configured minimum',
  'Very short coverage',
  'Limited coverage',
  'No recent usage baseline',
  'No recent outbound movement was found in the selected lookback window, so coverage cannot be estimated from consumption.',
  'High usage velocity',
  'Recent consumption pressure',
  'Demand history is incomplete',
  'Some historical negative stock movements are unclassified or lack location context, so the consumption signal is incomplete.',
  'No immediate depletion driver',
  'Stock, minimum threshold, and recent outbound usage do not currently indicate a strong depletion driver.',
  'Confirm the physical count at the listed storage location before placing or approving replenishment.',
  'Check whether open shipments, pending purchase orders, or transfer activity already cover this shortage.',
  'Review recent stock movements and usage events for abnormal consumption, damage, waste, or event-driven demand.',
  'Compare current usage against upcoming operations before adjusting minimum stock.',
  'Do not treat this as a demand forecast until more outbound movement history exists.',
  'Review unclassified or location-missing historical negative movements before relying on this demand signal.',
  'Keep normal monitoring cadence and re-check after the next stock movement cycle.',
  'Critical consumption spike',
  'Recent classified consumption is materially higher than the product baseline and requires same-day human review.',
  'High consumption spike',
  'Recent classified consumption is substantially higher than the product baseline.',
  'Watch-level variance',
  'Recent classified consumption is above baseline but not yet a critical production blocker.',
  'No baseline but recent activity exists',
  'The product has recent classified consumption without meaningful historical baseline evidence.',
  '3x or higher spike ratio',
  'Recent daily classified consumption is at least three times the baseline daily consumption rate.',
  '2x or higher spike ratio',
  'Recent daily classified consumption is at least twice the baseline daily consumption rate.',
  'Cold-start anomaly',
  'The anomaly may be caused by a new product pattern rather than true abnormal consumption.',
  'Some historical negative stock movements are still unclassified, so the consumption baseline is incomplete and should not be treated as fully authoritative.',
  'Normal operational variance',
  'Current movement pattern does not require escalation beyond normal monitoring.',
  'Review the most recent stock movements for the product and confirm the structured movement types and users responsible for consumption changes.',
  'Check whether an event, maintenance activity, waste entry, damage entry, or manual adjustment explains the spike.',
  'Confirm whether this is a new product, new location pattern, or recent onboarding case before treating it as abnormal usage.',
  'Review unclassified historical negative movements before relying on this anomaly as a complete demand signal.',
  'Compare recent daily classified consumption with normal par levels and upcoming demand before changing reorder assumptions.',
  'Continue normal monitoring and review only if the anomaly score increases in the next operating window.',
  'Do not mutate stock, approve procurement, or suppress alerts from this review without a separate authorized workflow.',
  'Critical anomaly rows exist and require human operational review before production reliance.',
  'High anomaly rows should be investigated before managers rely on anomaly output for decisions.',
  'Tenant operational health is critical, so anomaly output should be reviewed together with alerts, overdue shipments, and low-stock pressure.',
  'Investigate critical anomaly rows before relying on anomaly output in production decisions.',
  'Confirm stock movement reason codes and users for critical spike rows.',
  'Review high anomaly rows and tenant health context before acting.',
  'Keep anomaly review read-only unless a separate authorized workflow is used.',
  'Continue controlled monitoring and review anomaly rows during normal operational cadence.',
  'Overdue open POs',
  'Closed short',
  'Open remaining qty',
  'Low PO fill rate',
  'High short-close rate',
  'Overdue shipments',
  'Partial shipments',
  'Shipment discrepancies',
  'Suppliers with high-risk performance factors must be reviewed before their scores support controlled procurement decisions.',
  'Overdue supplier purchase orders require manual delivery-date verification.',
  'Medium-risk supplier trust factors should remain on the manager review queue.',
  'Review suppliers with high-risk factors before relying on trust scores for procurement decisions.',
  'Keep suppliers without shipment history unrated and review their commitments manually.',
  'Verify overdue and short-closed purchase orders against supplier commitments.',
  'Use this review as advisory evidence only; it does not update suppliers, create POs, or approve procurement.'
]);

function localizeInsightsSystemText(value: string, ui: UiTranslator): string {
  return INSIGHTS_SYSTEM_TEXT.has(value) ? ui(value) : value;
}

function localizeSupplierRiskFlag(
  flag: NonNullable<SupplierTrustResponse['rows'][number]['risk_flags']>[number],
  row: SupplierTrustResponse['rows'][number],
  ui: UiTranslator,
  formatNumber: (value: number | string | null | undefined, digits?: number) => string
) {
  const label = localizeInsightsSystemText(flag.label, ui);
  switch (flag.code) {
    case 'po_overdue':
      return { ...flag, label, detail: ui('{count} open PO(s) are past expected delivery.').replace('{count}', formatNumber(row.overdue_open_purchase_orders, 0)) };
    case 'po_closed_short':
      return { ...flag, label, detail: ui('{count} PO(s) were manually closed with remaining quantity.').replace('{count}', formatNumber(row.closed_short_purchase_orders, 0)) };
    case 'po_remaining_quantity':
      return { ...flag, label, detail: ui('{quantity} ordered units are still not received.').replace('{quantity}', formatNumber(row.po_remaining_quantity)) };
    case 'po_low_fill_rate':
      return { ...flag, label, detail: ui('PO fill rate is {rate}%.').replace('{rate}', formatNumber(row.po_fill_rate_pct)) };
    case 'po_short_close_rate':
      return { ...flag, label, detail: ui('{rate}% of POs were closed short.').replace('{rate}', formatNumber(row.po_short_close_rate_pct)) };
    case 'shipment_overdue':
      return { ...flag, label, detail: ui('{count} shipment(s) are overdue.').replace('{count}', formatNumber(row.overdue_shipments, 0)) };
    case 'shipment_partial':
      return { ...flag, label, detail: ui('{count} shipment(s) are partially received.').replace('{count}', formatNumber(row.partial_shipments, 0)) };
    case 'shipment_discrepancy':
      return { ...flag, label, detail: ui('{quantity} units are recorded as shipment discrepancy.').replace('{quantity}', formatNumber(row.total_discrepancy_quantity)) };
    default:
      return { ...flag, label, detail: flag.detail };
  }
}

function localizeDepletionRootCauseFactor(
  factor: DepletionRiskRootCauseResponse['rows'][number]['root_cause_factors'][number],
  row: DepletionRiskRootCauseResponse['rows'][number],
  ui: UiTranslator,
  formatNumber: (value: number | string | null | undefined, digits?: number) => string
) {
  const label = localizeInsightsSystemText(factor.label, ui);
  switch (factor.code) {
    case 'below_configured_minimum':
      return { ...factor, label, detail: ui('Current quantity {current} is below configured minimum {minimum}.').replace('{current}', formatNumber(row.current_quantity)).replace('{minimum}', formatNumber(row.configured_min_quantity)) };
    case 'near_configured_minimum':
      return { ...factor, label, detail: ui('Current quantity {current} is close to configured minimum {minimum}.').replace('{current}', formatNumber(row.current_quantity)).replace('{minimum}', formatNumber(row.configured_min_quantity)) };
    case 'short_coverage_window':
    case 'limited_coverage_window':
      return { ...factor, label, detail: ui('Estimated coverage is {days} days at the recent average daily outbound rate.').replace('{days}', formatNumber(row.estimated_days_of_coverage, 2)) };
    case 'high_usage_velocity_vs_stock':
      return { ...factor, label, detail: ui('Average daily outbound {outbound} is high compared with current quantity {quantity}.').replace('{outbound}', formatNumber(row.average_daily_outbound)).replace('{quantity}', formatNumber(row.current_quantity)) };
    case 'recent_consumption_pressure':
      return { ...factor, label, detail: ui('Recent outbound quantity is {quantity} in the selected lookback window.').replace('{quantity}', formatNumber(row.recent_outbound_quantity)) };
    default:
      return { ...factor, label, detail: localizeInsightsSystemText(factor.detail, ui) };
  }
}

function getSupplierRecommendedActions(
  row: SupplierTrustResponse['rows'][number],
  locale: AppLocale,
  ui: UiTranslator
): Array<{ code: string; title: string; detail: string; priority: 'high' | 'medium' | 'low' }> {
  const actions: Array<{ code: string; title: string; detail: string; priority: 'high' | 'medium' | 'low' }> = [];
  const riskFlags = row.risk_flags ?? [];
  const displayNumber = (value: number | string | null | undefined, digits = 2) =>
    formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits: digits });
  const displayMoney = (value: number | string | null | undefined, currency?: string | null) => {
    const amount = toNumber(value);
    if (currency) {
      try {
        return formatLocalizedCurrency(amount, currency, locale, { maximumFractionDigits: 2 });
      } catch {
        return formatCurrencyAmount(value, currency, 2);
      }
    }
    return formatCurrencyAmount(value, currency, 2);
  };
  const hasRiskCode = (...codes: string[]) => riskFlags.some((flag) => codes.includes(flag.code));

  if (hasRiskCode('po_overdue', 'overdue_open_purchase_orders')) {
    actions.push({
      code: 'follow_up_overdue_pos',
      title: ui('Follow up overdue POs'),
      detail: ui('{count} open POs are overdue for this supplier.').replace('{count}', displayNumber(row.overdue_open_purchase_orders, 0)),
      priority: 'high'
    });
  }

  if (hasRiskCode('po_closed_short', 'closed_short_purchase_orders')) {
    actions.push({
      code: 'review_short_closed_pos',
      title: ui('Review short-closed POs'),
      detail: ui('{count} POs were manually closed short. Confirm whether this is supplier under-delivery or planned cancellation.').replace('{count}', displayNumber(row.closed_short_purchase_orders, 0)),
      priority: 'high'
    });
  }

  if (hasRiskCode('po_low_fill_rate', 'low_po_fill_rate')) {
    actions.push({
      code: 'check_po_fill_performance',
      title: ui('Check PO fill performance'),
      detail: ui('PO fill rate is {rate}%. Compare ordered vs received quantities before new large orders.').replace('{rate}', displayNumber(row.po_fill_rate_pct)),
      priority: 'medium'
    });
  }

  if (hasRiskCode('po_remaining_quantity')) {
    actions.push({
      code: 'monitor_remaining_exposure',
      title: ui('Monitor remaining exposure'),
      detail: ui('{quantity} units remain open with estimated value {value}.')
        .replace('{quantity}', displayNumber(row.po_remaining_quantity))
        .replace('{value}', displayMoney(row.po_remaining_value, row.currency_code)),
      priority: 'medium'
    });
  }

  if (hasRiskCode('shipment_discrepancy', 'shipment_discrepancies')) {
    actions.push({
      code: 'investigate_shipment_discrepancies',
      title: ui('Investigate shipment discrepancies'),
      detail: ui('Shipment discrepancy rate is {rate}%. Review receiving notes and shipment audits.').replace('{rate}', displayNumber(row.discrepancy_rate_pct)),
      priority: 'medium'
    });
  }

  if (hasRiskCode('shipment_overdue', 'shipment_partial', 'overdue_shipments', 'partial_shipments')) {
    actions.push({
      code: 'review_shipment_reliability',
      title: ui('Review shipment reliability'),
      detail: ui('Shipment overdue rate is {overdue}% and fill rate is {fill}%.')
        .replace('{overdue}', displayNumber(row.overdue_rate_pct))
        .replace('{fill}', displayNumber(row.fill_rate_pct)),
      priority: 'low'
    });
  }

  if (row.trust_evidence_status === 'insufficient_history') {
    actions.push({
      code: 'build_delivery_history',
      title: ui('Build delivery history'),
      detail: ui('Not enough delivery history exists to calculate a trustworthy supplier score. Review open commitments manually until real receiving history is available.'),
      priority: 'medium'
    });
  }

  if (!actions.length) {
    actions.push({
      code: 'maintain_supplier_cadence',
      title: ui('Maintain supplier cadence'),
      detail: ui('No active supplier risk flags. Keep normal monitoring and periodic review cadence.'),
      priority: 'low'
    });
  }

  return actions.slice(0, 5);
}

async function fetchDepletionRisk(lookbackDays: number): Promise<DepletionRiskResponse> {
  return apiRequest<DepletionRiskResponse>(`/inventory-insights/depletion-risk?lookback_days=${lookbackDays}`);
}

async function fetchDepletionRiskRootCause(lookbackDays: number): Promise<DepletionRiskRootCauseResponse> {
  return apiRequest<DepletionRiskRootCauseResponse>(`/inventory-insights/depletion-risk/root-cause-review?lookback_days=${lookbackDays}`);
}

async function fetchReorderRecommendations(lookbackDays: number): Promise<ReorderRecommendationsResponse> {
  return apiRequest<ReorderRecommendationsResponse>(`/reorder-insights/recommendations?lookback_days=${lookbackDays}`);
}

async function fetchOperationalHealth(): Promise<OperationalHealthResponse> {
  return apiRequest<OperationalHealthResponse>('/operational-insights/health-score');
}

async function fetchAnomalies(): Promise<AnomaliesResponse> {
  return apiRequest<AnomaliesResponse>('/operational-insights/anomalies');
}

async function fetchAnomalyProductionReview(): Promise<AnomalyProductionReviewResponse> {
  return apiRequest<AnomalyProductionReviewResponse>('/operational-insights/anomalies/production-review');
}

async function fetchSupplierTrust(): Promise<SupplierTrustResponse> {
  return apiRequest<SupplierTrustResponse>('/supplier-insights/trust-scores');
}

async function fetchSupplierTrustProductionReview(): Promise<SupplierTrustProductionReviewResponse> {
  return apiRequest<SupplierTrustProductionReviewResponse>('/supplier-insights/trust-scores/production-review');
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode; iconPath?: string }) {
  const iconPath = props.iconPath ?? '/insights';

  return (
    <section className="app-panel app-panel--padded insights-section" style={styles.panel}>
      <div className="insights-section__header" style={styles.panelHeader}>
        <div className="insights-section__heading">
          <span className="insights-section__icon" aria-hidden="true">
            <TenantNavIcon path={iconPath} size={19} />
          </span>
          <div style={styles.panelHeaderText}>
            <h3 style={styles.panelTitle}>{props.title}</h3>
            <p style={styles.panelSubtitle}>{props.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="insights-section__body">{props.children}</div>
    </section>
  );
}

function StatCard(props: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'default' | 'warn' | 'bad' | 'good';
  iconPath?: string;
}) {
  return (
    <OperationalWorkspaceStatCard
      label={props.title}
      value={props.value}
      helper={props.subtitle}
      tone={props.tone}
      iconPath={props.iconPath ?? '/insights'}
    />
  );
}

export default function InsightsPage() {
  const { locale, ui } = useAppTranslation();
  const formatNumber = useCallback((value: number | string | null | undefined, digits = 2) =>
    formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits: digits }), [locale]);
  const formatSupplierMoney = useCallback((value: number | string | null | undefined, currency?: string | null) => {
    const amount = toNumber(value);
    if (currency) {
      try {
        return formatLocalizedCurrency(amount, currency, locale, { maximumFractionDigits: 2 });
      } catch {
        return formatCurrencyAmount(value, currency, 2);
      }
    }
    return formatCurrencyAmount(value, currency, 2);
  }, [locale]);
  const formatDateTime = useCallback((value: string | null | undefined) => formatLocalizedDateTime(value, locale), [locale]);
  const formatReadableStatus = useCallback((value: string | null | undefined) => {
    if (!value) return ui('Not available');
    const known: Record<string, string> = {
      critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', healthy: 'Healthy', watch: 'Watch',
      excellent: 'Excellent', strong: 'Strong', risk: 'Risk', unrated: 'Unrated', rated: 'Rated',
      blocked: 'Blocked', needs_review: 'Needs review', ready_for_controlled_use: 'Ready for controlled use', monitor_only: 'Monitor only',
      insufficient_history: 'Not enough history'
    };
    const label = known[value.toLowerCase()];
    return label ? ui(label) : value;
  }, [ui]);
  const formatSupplierTrustScore = useCallback((row: SupplierTrustResponse['rows'][number]) =>
    row.trust_evidence_status === 'insufficient_history' || row.trust_score === null ? ui('Not rated') : formatNumber(row.trust_score, 0), [formatNumber, ui]);
  const formatSupplierRiskFilter = (value: SupplierRiskFilter) => {
    const labels: Record<SupplierRiskFilter, string> = {
      all: 'All risk levels', with_risk: 'Any risk flag', high: 'High risk', medium: 'Medium risk', low: 'Low risk', none: 'No risk flags'
    };
    return ui(labels[value]);
  };
  const formatSupplierTierFilter = (value: SupplierTierFilter) => {
    const labels: Record<SupplierTierFilter, string> = {
      all: 'All tiers', excellent: 'Excellent', strong: 'Strong', watch: 'Watch', risk: 'Risk', unrated: 'Not enough history'
    };
    return ui(labels[value]);
  };
  const formatSupplierSort = (value: SupplierSort) => {
    const labels: Record<SupplierSort, string> = {
      risk_flags_desc: 'Most risk flags', trust_asc: 'Lowest performance first', trust_desc: 'Highest performance first',
      remaining_value_desc: 'Highest remaining value', overdue_pos_desc: 'Most overdue POs', fill_rate_asc: 'Lowest PO fill rate'
    };
    return ui(labels[value]);
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [lookbackDays, setLookbackDays] = useState(() => normalizeLookbackDays(searchParams.get('lookback_days')));
  const [supplierRiskFilter, setSupplierRiskFilter] = useState<SupplierRiskFilter>(() => normalizeSupplierRiskFilter(searchParams.get('supplier_risk')));
  const [supplierTierFilter, setSupplierTierFilter] = useState<SupplierTierFilter>(() => normalizeSupplierTierFilter(searchParams.get('supplier_tier')));
  const [supplierSort, setSupplierSort] = useState<SupplierSort>(() => normalizeSupplierSort(searchParams.get('supplier_sort')));
  const [supplierSearch, setSupplierSearch] = useState(() => searchParams.get('supplier_search') ?? '');
  const [supplierPage, setSupplierPage] = useState(() => normalizeSupplierPage(searchParams.get('supplier_page')));
  const [supplierPageSize, setSupplierPageSize] = useState<SupplierPageSize>(() => normalizeSupplierPageSize(searchParams.get('supplier_page_size')));
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(() => searchParams.get('supplier_id'));
  const lastSyncedSearchParamsRef = useRef(searchParams.toString());
  const hasMountedSupplierFilterResetRef = useRef(false);
  const skipNextSupplierFilterResetRef = useRef(false);

  const canOpenDashboard = hasPermission(TENANT_PERMISSIONS.DASHBOARD_READ);
  const canOpenProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ);
  const canOpenStock = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canOpenStockMovements = hasPermission(TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ);
  const canOpenSuppliers = hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ);
  const canOpenPurchaseOrders = hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ);

  const depletionRiskQuery = useQuery({
    queryKey: ['insights', 'depletion-risk', lookbackDays],
    queryFn: () => fetchDepletionRisk(lookbackDays)
  });

  const depletionRootCauseQuery = useQuery({
    queryKey: ['insights', 'depletion-risk-root-cause', lookbackDays],
    queryFn: () => fetchDepletionRiskRootCause(lookbackDays)
  });

  const reorderQuery = useQuery({
    queryKey: ['insights', 'reorder-recommendations', lookbackDays],
    queryFn: () => fetchReorderRecommendations(lookbackDays)
  });

  const healthQuery = useQuery({
    queryKey: ['insights', 'health-score'],
    queryFn: fetchOperationalHealth
  });

  const anomaliesQuery = useQuery({
    queryKey: ['insights', 'anomalies'],
    queryFn: fetchAnomalies
  });

  const anomalyProductionReviewQuery = useQuery({
    queryKey: ['insights', 'anomalies-production-review'],
    queryFn: fetchAnomalyProductionReview
  });

  const supplierTrustQuery = useQuery({
    queryKey: ['insights', 'supplier-trust'],
    queryFn: fetchSupplierTrust
  });


  const supplierTrustProductionReviewQuery = useQuery({
    queryKey: ['insights', 'supplier-trust-production-review'],
    queryFn: fetchSupplierTrustProductionReview
  });

  useEffect(() => {
    const currentSearchParams = searchParams.toString();

    if (currentSearchParams !== lastSyncedSearchParamsRef.current) {
      const nextLookbackDays = normalizeLookbackDays(searchParams.get('lookback_days'));
      const nextSupplierSearch = searchParams.get('supplier_search') ?? '';
      const nextSupplierRiskFilter = normalizeSupplierRiskFilter(searchParams.get('supplier_risk'));
      const nextSupplierTierFilter = normalizeSupplierTierFilter(searchParams.get('supplier_tier'));
      const nextSupplierSort = normalizeSupplierSort(searchParams.get('supplier_sort'));
      const nextSupplierPage = normalizeSupplierPage(searchParams.get('supplier_page'));
      const nextSupplierPageSize = normalizeSupplierPageSize(searchParams.get('supplier_page_size'));
      const nextSelectedSupplierId = searchParams.get('supplier_id');

      if (
        nextSupplierSearch !== supplierSearch
        || nextSupplierRiskFilter !== supplierRiskFilter
        || nextSupplierTierFilter !== supplierTierFilter
        || nextSupplierSort !== supplierSort
        || nextSupplierPageSize !== supplierPageSize
      ) {
        skipNextSupplierFilterResetRef.current = true;
      }

      setLookbackDays(nextLookbackDays);
      setSupplierSearch(nextSupplierSearch);
      setSupplierRiskFilter(nextSupplierRiskFilter);
      setSupplierTierFilter(nextSupplierTierFilter);
      setSupplierSort(nextSupplierSort);
      setSupplierPage(nextSupplierPage);
      setSupplierPageSize(nextSupplierPageSize);
      setSelectedSupplierId(nextSelectedSupplierId);
      lastSyncedSearchParamsRef.current = currentSearchParams;
      return;
    }

    const nextParams = new URLSearchParams(searchParams);

    const setOrDelete = (key: string, value: string | null, defaultValue?: string) => {
      const normalizedValue = value?.trim() ?? '';
      if (!normalizedValue || normalizedValue === defaultValue) {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, normalizedValue);
    };

    setOrDelete('lookback_days', String(lookbackDays), '30');
    setOrDelete('supplier_search', supplierSearch);
    setOrDelete('supplier_risk', supplierRiskFilter, 'all');
    setOrDelete('supplier_tier', supplierTierFilter, 'all');
    setOrDelete('supplier_sort', supplierSort, 'risk_flags_desc');
    setOrDelete('supplier_page', String(supplierPage), '1');
    setOrDelete('supplier_page_size', String(supplierPageSize), '6');
    setOrDelete('supplier_id', selectedSupplierId);

    if (nextParams.toString() !== searchParams.toString()) {
      lastSyncedSearchParamsRef.current = nextParams.toString();
      setSearchParams(nextParams, { replace: true });
    }
  }, [lookbackDays, searchParams, selectedSupplierId, setSearchParams, supplierPage, supplierPageSize, supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter]);


  const activeReorderRows = useMemo(
    () => (reorderQuery.data?.rows ?? [])
      .filter((row) => toNumber(row.recommended_reorder_quantity) > 0)
      .sort((a, b) => {
        const urgencyRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return (urgencyRank[b.urgency] ?? 0) - (urgencyRank[a.urgency] ?? 0)
          || toNumber(b.recommended_reorder_quantity) - toNumber(a.recommended_reorder_quantity)
          || a.product_name.localeCompare(b.product_name);
      }),
    [reorderQuery.data?.rows]
  );

  const prioritizedDepletionRows = useMemo(
    () => [...(depletionRiskQuery.data?.rows ?? [])].sort((a, b) =>
      toNumber(b.risk_score) - toNumber(a.risk_score)
      || a.product_name.localeCompare(b.product_name)
      || a.storage_location_name.localeCompare(b.storage_location_name)
    ),
    [depletionRiskQuery.data?.rows]
  );

  const allInsightQueries = [
    depletionRiskQuery,
    depletionRootCauseQuery,
    reorderQuery,
    healthQuery,
    anomaliesQuery,
    anomalyProductionReviewQuery,
    supplierTrustQuery,
    supplierTrustProductionReviewQuery
  ];
  const isRefreshingAll = allInsightQueries.some((query) => query.isFetching);
  const actionAgendaLoading = [healthQuery, reorderQuery, depletionRiskQuery, anomaliesQuery, supplierTrustQuery]
    .some((query) => query.isLoading);
  const actionAgendaUnavailable = [healthQuery, reorderQuery, depletionRiskQuery, anomaliesQuery, supplierTrustQuery]
    .some((query) => query.isError);

  async function refreshAllInsights() {
    try {
      const results = await Promise.all(allInsightQueries.map((query) => query.refetch()));
      const failed = results.find((result) => result.isError);
      if (failed?.error) throw failed.error;
      showTenantActionSuccess(ui('Insights refreshed.'));
    } catch (error) {
      showTenantActionError(ui('Unable to refresh all insights. {error}').replace('{error}', toReadableError(error, ui('Unknown error'))));
    }
  }

  const actionAgenda = useMemo(() => {
    const nextActions: Array<{
      title: string;
      detail: string;
      route: string;
      linkLabel: string;
      tone: 'good' | 'warn' | 'bad';
    }> = [];

    const healthTier = healthQuery.data?.health_tier;
    if ((healthTier === 'critical' || healthTier === 'watch') && canOpenDashboard) {
      nextActions.push({
        title: ui('Operational health needs review'),
        detail: ui('Current tenant health is {tier}. Review low stock, overdue shipments, and unresolved alerts first.').replace('{tier}', formatReadableStatus(healthTier)),
        route: '/dashboard?panel=operational-health',
        linkLabel: ui('Open Dashboard'),
        tone: healthTier === 'critical' ? 'bad' : 'warn'
      });
    }

    const reorderTop = activeReorderRows[0];
    if (reorderTop && canOpenProducts) {
      nextActions.push({
        title: ui('Reorder highest urgency product'),
        detail: ui('{product} currently recommends a reorder quantity of {quantity}.').replace('{product}', reorderTop.product_name).replace('{quantity}', formatNumber(reorderTop.recommended_reorder_quantity)),
        route: reorderTop ? `/products?search=${encodeURIComponent(reorderTop.product_name)}` : '/products',
        linkLabel: ui('Open Products'),
        tone: reorderTop.urgency === 'critical' ? 'bad' : 'warn'
      });
    }

    const depletionTop = prioritizedDepletionRows[0];
    if (depletionTop && canOpenStock) {
      nextActions.push({
        title: ui('Protect depletion-risk stock'),
        detail: ui('{product} at {location} is currently one of the highest depletion-risk rows.').replace('{product}', depletionTop.product_name).replace('{location}', depletionTop.storage_location_name),
        route: depletionTop ? `/stock?product_id=${encodeURIComponent(depletionTop.product_id)}` : '/stock',
        linkLabel: ui('Open Stock'),
        tone: depletionTop.risk_tier === 'critical' ? 'bad' : 'warn'
      });
    }

    const anomalyTop = anomaliesQuery.data?.rows?.[0];
    if (anomalyTop && canOpenStockMovements) {
      nextActions.push({
        title: ui('Review unusual outbound activity'),
        detail: ui('{product} is showing an anomaly spike ratio of {ratio} against baseline demand.').replace('{product}', anomalyTop.product_name).replace('{ratio}', formatNumber(anomalyTop.spike_ratio)),
        route: anomalyTop ? `/stock-movements?product_id=${encodeURIComponent(anomalyTop.product_id)}` : '/stock-movements',
        linkLabel: ui('Open Stock Movements'),
        tone: anomalyTop.anomaly_tier === 'critical' ? 'bad' : 'warn'
      });
    }

    const supplierBottom = [...(supplierTrustQuery.data?.rows ?? [])]
      .filter((row) => row.trust_evidence_status !== 'insufficient_history' && row.trust_score !== null)
      .sort((a, b) => toNumber(a.trust_score) - toNumber(b.trust_score))[0];

    if (supplierBottom && canOpenSuppliers) {
      nextActions.push({
        title: ui('Follow up lowest-rated supplier'),
        detail: ui('{supplier} currently scores {score} on supplier performance.').replace('{supplier}', supplierBottom.supplier_name).replace('{score}', formatSupplierTrustScore(supplierBottom)),
        route: `/suppliers?search=${encodeURIComponent(supplierBottom.supplier_name)}`,
        linkLabel: ui('Open Suppliers'),
        tone: toNumber(supplierBottom.trust_score) < 50 ? 'bad' : 'warn'
      });
    }

    return nextActions.slice(0, 4);
  }, [
    activeReorderRows,
    anomaliesQuery.data?.rows,
    canOpenDashboard,
    canOpenProducts,
    canOpenStock,
    canOpenStockMovements,
    canOpenSuppliers,
    prioritizedDepletionRows,
    formatNumber,
    formatReadableStatus,
    formatSupplierTrustScore,
    healthQuery.data?.health_tier,
    supplierTrustQuery.data?.rows,
    ui
  ]);

  const visibleSupplierTrustRows = useMemo(() => {
    const rows = [...(supplierTrustQuery.data?.rows ?? [])];

    const normalizedSupplierSearch = supplierSearch.trim().toLowerCase();

    return rows
      .filter((row) => {
        const riskFlags = row.risk_flags ?? [];

        if (normalizedSupplierSearch) {
          const localizedRiskText = riskFlags.flatMap((flag) => {
            const localizedFlag = localizeSupplierRiskFlag(flag, row, ui, formatNumber);
            return [localizedFlag.label, localizedFlag.detail, formatReadableStatus(flag.severity)];
          });
          const searchableText = [
            row.supplier_name,
            row.trust_tier,
            ...riskFlags.flatMap((flag) => [flag.label, flag.detail, flag.severity]),
            ...localizedRiskText
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (!searchableText.includes(normalizedSupplierSearch)) {
            return false;
          }
        }

        if (supplierTierFilter !== 'all' && row.trust_tier !== supplierTierFilter) {
          return false;
        }

        if (supplierRiskFilter === 'with_risk') {
          return riskFlags.length > 0;
        }

        if (supplierRiskFilter === 'none') {
          return riskFlags.length === 0;
        }

        if (supplierRiskFilter !== 'all') {
          return riskFlags.some((flag) => flag.severity === supplierRiskFilter);
        }

        return true;
      })
      .sort((a, b) => {
        const aRated = a.trust_evidence_status !== 'insufficient_history' && a.trust_score !== null;
        const bRated = b.trust_evidence_status !== 'insufficient_history' && b.trust_score !== null;
        if (aRated !== bRated) return aRated ? -1 : 1;

        if (supplierSort === 'trust_asc') {
          return toNumber(a.trust_score) - toNumber(b.trust_score);
        }

        if (supplierSort === 'trust_desc') {
          return toNumber(b.trust_score) - toNumber(a.trust_score);
        }

        if (supplierSort === 'remaining_value_desc') {
          return toNumber(b.po_remaining_value) - toNumber(a.po_remaining_value);
        }

        if (supplierSort === 'overdue_pos_desc') {
          return toNumber(b.overdue_open_purchase_orders) - toNumber(a.overdue_open_purchase_orders);
        }

        if (supplierSort === 'fill_rate_asc') {
          return toNumber(a.po_fill_rate_pct) - toNumber(b.po_fill_rate_pct);
        }

        return (b.risk_flags?.length ?? 0) - (a.risk_flags?.length ?? 0);
      });
  }, [formatNumber, formatReadableStatus, supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter, supplierTrustQuery.data?.rows, ui]);

  const supplierTotalPages = Math.max(1, Math.ceil(visibleSupplierTrustRows.length / supplierPageSize));
  const supplierCurrentPage = Math.min(supplierPage, supplierTotalPages);
  const pagedSupplierTrustRows = visibleSupplierTrustRows.slice((supplierCurrentPage - 1) * supplierPageSize, supplierCurrentPage * supplierPageSize);

  const filteredSupplierTrustSummary = useMemo(() => {
    return visibleSupplierTrustRows.reduce((summary, row) => {
      const riskFlags = row.risk_flags ?? [];
      if (riskFlags.length > 0) summary.suppliers_with_risk += 1;
      summary.high_risk_flags += riskFlags.filter((flag) => flag.severity === 'high').length;
      summary.overdue_open_purchase_orders += toNumber(row.overdue_open_purchase_orders);
      summary.po_remaining_value += toNumber(row.po_remaining_value);
      if (!summary.currency_code && row.currency_code) summary.currency_code = row.currency_code;
      return summary;
    }, {
      suppliers_with_risk: 0,
      high_risk_flags: 0,
      overdue_open_purchase_orders: 0,
      po_remaining_value: 0,
      currency_code: supplierTrustQuery.data?.summary?.currency_code ?? null
    } as {
      suppliers_with_risk: number;
      high_risk_flags: number;
      overdue_open_purchase_orders: number;
      po_remaining_value: number;
      currency_code: string | null;
    });
  }, [supplierTrustQuery.data?.summary?.currency_code, visibleSupplierTrustRows]);


  const supplierTrustBreakdown = useMemo(() => {
    const rows = supplierTrustQuery.data?.rows ?? [];

    const countTier = (tier: SupplierTierFilter) => rows.filter((row) => row.trust_tier === tier).length;
    const countRisk = (severity: Exclude<SupplierRiskFilter, 'all' | 'with_risk' | 'none'>) => rows.filter((row) => (row.risk_flags ?? []).some((flag) => flag.severity === severity)).length;

    return {
      total: rows.length,
      withRisk: rows.filter((row) => (row.risk_flags ?? []).length > 0).length,
      noRisk: rows.filter((row) => (row.risk_flags ?? []).length === 0).length,
      highRisk: countRisk('high'),
      mediumRisk: countRisk('medium'),
      lowRisk: countRisk('low'),
      excellent: countTier('excellent'),
      strong: countTier('strong'),
      watch: countTier('watch'),
      risk: countTier('risk'),
      unrated: countTier('unrated')
    };
  }, [supplierTrustQuery.data?.rows]);


  const supplierRecommendedActionSummary = useMemo(() => {
    const rows = supplierTrustQuery.data?.rows ?? [];
    const actionRows = rows.flatMap((row) =>
      getSupplierRecommendedActions(row, locale, ui)
        .filter((action) => action.code !== 'maintain_supplier_cadence')
        .map((action) => ({ ...action, supplier: row.supplier_name, supplierId: row.supplier_id }))
    );

    const priorityWeight = { high: 0, medium: 1, low: 2 } as const;
    actionRows.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || a.supplier.localeCompare(b.supplier));

    return {
      total: actionRows.length,
      high: actionRows.filter((action) => action.priority === 'high').length,
      medium: actionRows.filter((action) => action.priority === 'medium').length,
      low: actionRows.filter((action) => action.priority === 'low').length,
      topActions: actionRows.slice(0, 5)
    };
  }, [locale, supplierTrustQuery.data?.rows, ui]);

  useEffect(() => {
    if (!hasMountedSupplierFilterResetRef.current) {
      hasMountedSupplierFilterResetRef.current = true;
      return;
    }

    if (skipNextSupplierFilterResetRef.current) {
      skipNextSupplierFilterResetRef.current = false;
      return;
    }

    setSupplierPage(1);
  }, [supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter, supplierPageSize]);

  useEffect(() => {
    if (supplierPage > supplierTotalPages) {
      setSupplierPage(supplierTotalPages);
    }
  }, [supplierPage, supplierTotalPages]);

  const selectedSupplierTrustRow = useMemo(() => {
    if (!selectedSupplierId) {
      return null;
    }

    return supplierTrustQuery.data?.rows.find((row) => row.supplier_id === selectedSupplierId) ?? null;
  }, [selectedSupplierId, supplierTrustQuery.data?.rows]);

  const supplierActiveFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (supplierSearch.trim()) {
      chips.push({
        key: 'supplier-search',
        label: ui('Search: {value}').replace('{value}', supplierSearch.trim()),
        onClear: () => setSupplierSearch('')
      });
    }

    if (supplierRiskFilter !== 'all') {
      chips.push({
        key: 'supplier-risk',
        label: ui('Risk: {value}').replace('{value}', formatReadableStatus(supplierRiskFilter)),
        onClear: () => setSupplierRiskFilter('all')
      });
    }

    if (supplierTierFilter !== 'all') {
      chips.push({
        key: 'supplier-tier',
        label: ui('Tier: {value}').replace('{value}', formatReadableStatus(supplierTierFilter)),
        onClear: () => setSupplierTierFilter('all')
      });
    }

    return chips;
  }, [formatReadableStatus, supplierRiskFilter, supplierSearch, supplierTierFilter, ui]);

  function clearSupplierTrustFilters() {
    setSupplierSearch('');
    setSupplierRiskFilter('all');
    setSupplierTierFilter('all');
  }

  function buildSupplierTrustViewUrl() {
    const params = new URLSearchParams(searchParams);

    const setOrDelete = (key: string, value: string | null, defaultValue?: string) => {
      const normalizedValue = value?.trim() ?? '';
      if (!normalizedValue || normalizedValue === defaultValue) {
        params.delete(key);
        return;
      }

      params.set(key, normalizedValue);
    };

    setOrDelete('lookback_days', String(lookbackDays), '30');
    setOrDelete('supplier_search', supplierSearch);
    setOrDelete('supplier_risk', supplierRiskFilter, 'all');
    setOrDelete('supplier_tier', supplierTierFilter, 'all');
    setOrDelete('supplier_sort', supplierSort, 'risk_flags_desc');
    setOrDelete('supplier_page', String(supplierCurrentPage), '1');
    setOrDelete('supplier_page_size', String(supplierPageSize), '6');
    setOrDelete('supplier_id', selectedSupplierId);

    const query = params.toString();
    return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
  }

  async function copySupplierTrustViewLink() {
    const viewUrl = buildSupplierTrustViewUrl();

    if (!navigator.clipboard?.writeText) {
      showTenantActionError(ui('Clipboard is not available. Copy the link from the address bar instead.'));
      return;
    }

    try {
      await navigator.clipboard.writeText(viewUrl);
      showTenantActionSuccess(ui('Supplier performance view link copied.'));
    } catch (error) {
      showTenantActionError(ui('Unable to copy the supplier view link. {error}').replace('{error}', toReadableError(error, ui('Unknown error'))));
    }
  }

  function exportSupplierTrustCsv() {
    const header = [
      'Supplier',
      'Performance Score',
      'Performance Tier',
      'Risk Flags',
      'High Risk Flags',
      'Open POs',
      'Overdue Open POs',
      'Closed Short POs',
      'PO Fill Rate %',
      'PO Remaining Quantity',
      'PO Remaining Value',
      'PO Ordered Value',
      'PO Received Value',
      'Currency'
    ];

    const rows = visibleSupplierTrustRows.map((row) => {
      const riskFlags = row.risk_flags ?? [];

      return [
        row.supplier_name,
        formatSupplierTrustScore(row),
        row.trust_tier,
        riskFlags.map((flag) => `${flag.severity}: ${flag.label}`).join(' | '),
        riskFlags.filter((flag) => flag.severity === 'high').length,
        formatNumber(row.open_purchase_orders, 0),
        formatNumber(row.overdue_open_purchase_orders, 0),
        formatNumber(row.closed_short_purchase_orders, 0),
        formatNumber(row.po_fill_rate_pct),
        formatNumber(row.po_remaining_quantity),
        formatNumber(row.po_remaining_value),
        formatNumber(row.po_ordered_value),
        formatNumber(row.po_received_value),
        row.currency_code || ''
      ];
    });

    downloadCsv('supplier-performance-insights.csv', [header, ...rows]);
  }



  function exportSupplierTrustDetailCsv(row: SupplierTrustResponse['rows'][number]) {
    const riskFlags = row.risk_flags ?? [];

    const metricRows: Array<Array<unknown>> = [
      ['Metric', 'Value'],
      ['Supplier', row.supplier_name],
      ['Performance Score', formatSupplierTrustScore(row)],
      ['Performance Tier', row.trust_tier === 'unrated' ? ui('Not enough history') : formatReadableStatus(row.trust_tier)],
      ['Shipment Completion Rate %', formatNumber(row.completion_rate_pct)],
      ['Shipment Overdue Rate %', formatNumber(row.overdue_rate_pct)],
      ['Shipment Fill Rate %', formatNumber(row.fill_rate_pct)],
      ['Shipment Discrepancy Rate %', formatNumber(row.discrepancy_rate_pct)],
      ['Total Shipments', formatNumber(row.total_shipments, 0)],
      ['Total POs', formatNumber(row.total_purchase_orders, 0)],
      ['Completed POs', formatNumber(row.completed_purchase_orders, 0)],
      ['Cancelled POs', formatNumber(row.cancelled_purchase_orders, 0)],
      ['Open POs', formatNumber(row.open_purchase_orders, 0)],
      ['Overdue Open POs', formatNumber(row.overdue_open_purchase_orders, 0)],
      ['Fully Received POs', formatNumber(row.fully_received_purchase_orders, 0)],
      ['Manually Closed POs', formatNumber(row.manually_closed_purchase_orders, 0)],
      ['Closed Short POs', formatNumber(row.closed_short_purchase_orders, 0)],
      ['PO Ordered Quantity', formatNumber(row.po_ordered_quantity)],
      ['PO Received Quantity', formatNumber(row.po_received_quantity)],
      ['PO Remaining Quantity', formatNumber(row.po_remaining_quantity)],
      ['PO Ordered Value', formatSupplierMoney(row.po_ordered_value, row.currency_code)],
      ['PO Received Value', formatSupplierMoney(row.po_received_value, row.currency_code)],
      ['PO Remaining Value', formatSupplierMoney(row.po_remaining_value, row.currency_code)],
      ['Currency', row.currency_code || ''],
      ['PO Fill Rate %', formatNumber(row.po_fill_rate_pct)],
      ['PO Completion Rate %', formatNumber(row.po_completion_rate_pct)],
      ['PO Short Close Rate %', formatNumber(row.po_short_close_rate_pct)],
      [],
      ['Risk Severity', 'Risk Label', 'Risk Detail'],
      ...(riskFlags.length
        ? riskFlags.map((flag) => [flag.severity, flag.label, flag.detail])
        : [['none', 'No active supplier risk flags', '']]),
      [],
      ['Recommended Action Priority', 'Recommended Action', 'Recommended Action Detail'],
      ...getSupplierRecommendedActions(row, locale, ui).map((action) => [action.priority, action.title, action.detail])
    ];

    downloadCsv(`supplier-performance-detail-${row.supplier_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'supplier'}.csv`, metricRows);
  }

  function printSupplierTrustDetail(row: SupplierTrustResponse['rows'][number]) {
    const printedAt = formatDateTime(new Date().toISOString());
    const riskFlags = row.risk_flags ?? [];
    const riskRowsHtml = riskFlags.length
      ? riskFlags
          .map(
            (flag) => {
              const localizedFlag = localizeSupplierRiskFlag(flag, row, ui, formatNumber);
              return `
              <tr>
                <td>${escapeHtml(formatReadableStatus(flag.severity))}</td>
                <td>${escapeHtml(localizedFlag.label)}</td>
                <td>${escapeHtml(localizedFlag.detail)}</td>
              </tr>`;
            }
          )
          .join('')
      : `<tr><td colspan="3">${escapeHtml(ui('No active supplier risk flags.'))}</td></tr>`;
    const actionRowsHtml = getSupplierRecommendedActions(row, locale, ui)
      .map(
        (action) => `
          <tr>
            <td>${escapeHtml(formatReadableStatus(action.priority))}</td>
            <td>${escapeHtml(action.title)}</td>
            <td>${escapeHtml(action.detail)}</td>
          </tr>`
      )
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(ui('Supplier performance detail'))} - ${escapeHtml(row.supplier_name)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 6px; }
            h2 { margin-top: 24px; }
            .meta { color: #475569; margin-bottom: 18px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .summary-grid div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
            .summary-grid strong { display: block; font-size: 20px; }
            .summary-grid span { color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
            @media print { body { margin: 12px; } .summary-grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(row.supplier_name)}</h1>
          <div class="meta">${escapeHtml(ui('Supplier performance detail · Printed {time}').replace('{time}', printedAt))}</div>
          <section class="summary-grid">
            <div><strong>${escapeHtml(formatSupplierTrustScore(row))}</strong><span>${escapeHtml(ui('Performance score'))}</span></div>
            <div><strong>${escapeHtml(row.trust_tier === 'unrated' ? ui('Not enough history') : formatReadableStatus(row.trust_tier))}</strong><span>${escapeHtml(ui('Performance tier'))}</span></div>
            <div><strong>${escapeHtml(formatSupplierMoney(row.po_remaining_value, row.currency_code))}</strong><span>${escapeHtml(ui('Remaining PO value'))}</span></div>
            <div><strong>${escapeHtml(String(riskFlags.length))}</strong><span>${escapeHtml(ui('Risk flags'))}</span></div>
          </section>
          <h2>${escapeHtml(ui('Performance Metrics'))}</h2>
          <table>
            <tbody>
              <tr><th>${escapeHtml(ui('Shipment completion'))}</th><td>${escapeHtml(formatNumber(row.completion_rate_pct))}%</td><th>${escapeHtml(ui('Shipment overdue'))}</th><td>${escapeHtml(formatNumber(row.overdue_rate_pct))}%</td></tr>
              <tr><th>${escapeHtml(ui('Shipment fill'))}</th><td>${escapeHtml(formatNumber(row.fill_rate_pct))}%</td><th>${escapeHtml(ui('Shipment discrepancy'))}</th><td>${escapeHtml(formatNumber(row.discrepancy_rate_pct))}%</td></tr>
              <tr><th>${escapeHtml(ui('Total POs'))}</th><td>${escapeHtml(formatNumber(row.total_purchase_orders, 0))}</td><th>${escapeHtml(ui('Open POs'))}</th><td>${escapeHtml(formatNumber(row.open_purchase_orders, 0))}</td></tr>
              <tr><th>${escapeHtml(ui('Overdue open POs'))}</th><td>${escapeHtml(formatNumber(row.overdue_open_purchase_orders, 0))}</td><th>${escapeHtml(ui('Closed-short POs'))}</th><td>${escapeHtml(formatNumber(row.closed_short_purchase_orders, 0))}</td></tr>
              <tr><th>${escapeHtml(ui('PO ordered qty'))}</th><td>${escapeHtml(formatNumber(row.po_ordered_quantity))}</td><th>${escapeHtml(ui('PO received qty'))}</th><td>${escapeHtml(formatNumber(row.po_received_quantity))}</td></tr>
              <tr><th>${escapeHtml(ui('PO remaining qty'))}</th><td>${escapeHtml(formatNumber(row.po_remaining_quantity))}</td><th>${escapeHtml(ui('PO fill rate'))}</th><td>${escapeHtml(formatNumber(row.po_fill_rate_pct))}%</td></tr>
              <tr><th>${escapeHtml(ui('PO ordered value'))}</th><td>${escapeHtml(formatSupplierMoney(row.po_ordered_value, row.currency_code))}</td><th>${escapeHtml(ui('PO received value'))}</th><td>${escapeHtml(formatSupplierMoney(row.po_received_value, row.currency_code))}</td></tr>
              <tr><th>${escapeHtml(ui('PO remaining value'))}</th><td>${escapeHtml(formatSupplierMoney(row.po_remaining_value, row.currency_code))}</td><th>${escapeHtml(ui('Short-close rate'))}</th><td>${escapeHtml(formatNumber(row.po_short_close_rate_pct))}%</td></tr>
            </tbody>
          </table>
          <h2>${escapeHtml(ui('Risk Flags'))}</h2>
          <table>
            <thead><tr><th>${escapeHtml(ui('Severity'))}</th><th>${escapeHtml(ui('Label'))}</th><th>${escapeHtml(ui('Detail'))}</th></tr></thead>
            <tbody>${riskRowsHtml}</tbody>
          </table>
          <h2>${escapeHtml(ui('Recommended Actions'))}</h2>
          <table>
            <thead><tr><th>${escapeHtml(ui('Priority'))}</th><th>${escapeHtml(ui('Action'))}</th><th>${escapeHtml(ui('Detail'))}</th></tr></thead>
            <tbody>${actionRowsHtml}</tbody>
          </table>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      showTenantActionError(ui('The print window was blocked. Allow pop-ups and try again.'));
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function printSupplierTrust() {
    const summary = filteredSupplierTrustSummary;
    const printedAt = formatDateTime(new Date().toISOString());
    const filterLabel = [
      ui('Search: {value}').replace('{value}', supplierSearch.trim() || ui('All')),
      ui('Risk: {value}').replace('{value}', formatSupplierRiskFilter(supplierRiskFilter)),
      ui('Tier: {value}').replace('{value}', formatSupplierTierFilter(supplierTierFilter)),
      ui('Sort: {value}').replace('{value}', formatSupplierSort(supplierSort))
    ].join(' · ');

    const summaryHtml = summary
      ? `
        <section class="summary-grid">
          <div><strong>${escapeHtml(formatNumber(summary.suppliers_with_risk, 0))}</strong><span>${escapeHtml(ui('Suppliers with risk'))}</span></div>
          <div><strong>${escapeHtml(formatNumber(summary.high_risk_flags, 0))}</strong><span>${escapeHtml(ui('High-risk flags'))}</span></div>
          <div><strong>${escapeHtml(formatNumber(summary.overdue_open_purchase_orders, 0))}</strong><span>${escapeHtml(ui('Overdue open POs'))}</span></div>
          <div><strong>${escapeHtml(formatSupplierMoney(summary.po_remaining_value, summary.currency_code))}</strong><span>${escapeHtml(ui('Remaining PO value'))}</span></div>
        </section>`
      : '';

    const rowsHtml = visibleSupplierTrustRows
      .map((row) => {
        const riskFlags = row.risk_flags ?? [];
        const riskText = riskFlags.length
          ? riskFlags
              .map((flag) => {
                const localizedFlag = localizeSupplierRiskFlag(flag, row, ui, formatNumber);
                return `${escapeHtml(formatReadableStatus(flag.severity))}: ${escapeHtml(localizedFlag.label)} — ${escapeHtml(localizedFlag.detail)}`;
              })
              .join('<br />')
          : ui('No risk flags');

        return `
          <tr>
            <td>${escapeHtml(row.supplier_name)}</td>
            <td>${escapeHtml(formatSupplierTrustScore(row))}</td>
            <td>${escapeHtml(row.trust_tier === 'unrated' ? ui('Not enough history') : formatReadableStatus(row.trust_tier))}</td>
            <td>${escapeHtml(formatNumber(row.open_purchase_orders, 0))}</td>
            <td>${escapeHtml(formatNumber(row.overdue_open_purchase_orders, 0))}</td>
            <td>${escapeHtml(formatNumber(row.closed_short_purchase_orders, 0))}</td>
            <td>${escapeHtml(formatNumber(row.po_fill_rate_pct))}%</td>
            <td>${escapeHtml(formatSupplierMoney(row.po_remaining_value, row.currency_code))}</td>
            <td>${riskText}</td>
          </tr>`;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(ui('Supplier Performance Insights'))}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 6px; }
            .meta { color: #475569; margin-bottom: 18px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .summary-grid div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
            .summary-grid strong { display: block; font-size: 20px; }
            .summary-grid span { color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
            @media print { body { margin: 12px; } .summary-grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(ui('Supplier Performance Insights'))}</h1>
          <div class="meta">${escapeHtml(ui('Printed {time} · {filters} · {count} supplier(s)').replace('{time}', printedAt).replace('{filters}', filterLabel).replace('{count}', formatNumber(visibleSupplierTrustRows.length, 0)))}</div>
          ${summaryHtml}
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(ui('Supplier'))}</th>
                <th>${escapeHtml(ui('Performance'))}</th>
                <th>${escapeHtml(ui('Tier'))}</th>
                <th>${escapeHtml(ui('Open POs'))}</th>
                <th>${escapeHtml(ui('Overdue POs'))}</th>
                <th>${escapeHtml(ui('Closed Short'))}</th>
                <th>${escapeHtml(ui('PO Fill'))}</th>
                <th>${escapeHtml(ui('Remaining Value'))}</th>
                <th>${escapeHtml(ui('Risk Flags'))}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || `<tr><td colspan="9">${escapeHtml(ui('No suppliers match the current filters.'))}</td></tr>`}</tbody>
          </table>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      showTenantActionError(ui('The print window was blocked. Allow pop-ups and try again.'));
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="io-operational-page insights-page io-workspace-page" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/insights"
        eyebrow={ui("Management intelligence")}
        title={ui("Insights workspace")}
        description={
          <p>
            {ui("Review tenant health, supplier performance, depletion pressure, reorder needs, and unusual movement evidence in one place. Insights remain read-only; operational changes stay in their authoritative source workflows.")}
          </p>
        }
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui("Read-only intelligence")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Tenant-scoped evidence")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Source workflows stay authoritative")}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <>
            <OperationalWorkspaceStatus
              value={healthQuery.data ? formatNumber(healthQuery.data.health_score, 0) : '—'}
              label={healthQuery.data?.generated_at ? ui('health score · refreshed {time}').replace('{time}', formatDateTime(healthQuery.data.generated_at)) : ui('tenant health score · not loaded yet')}
            />
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={() => void refreshAllInsights()}
              disabled={isRefreshingAll}
            >
              {isRefreshingAll ? ui('Refreshing…') : ui('Refresh insights')}
            </button>
          </>
        }
      />

      <section className="app-grid-stats insights-summary-grid io-workspace-stats" style={styles.statsGrid}>
        <StatCard
          title={ui("Operational Health")}
          value={healthQuery.data ? formatNumber(healthQuery.data.health_score, 0) : '-'}
          subtitle={healthQuery.data ? ui('Current tier: {tier}').replace('{tier}', formatReadableStatus(healthQuery.data.health_tier)) : ui('Tenant-level health score.')}
          tone={!healthQuery.data ? 'default' : healthQuery.data.health_tier === 'critical' ? 'bad' : healthQuery.data.health_tier === 'watch' ? 'warn' : 'good'}
          iconPath="/dashboard"
        />
        <StatCard
          title={ui("Stock rows assessed")}
          value={depletionRiskQuery.data ? String(depletionRiskQuery.data.rows.length) : '-'}
          subtitle={ui("Product and location rows reviewed for depletion pressure.")}
          iconPath="/stock"
        />
        <StatCard
          title={ui("Reorder Candidates")}
          value={reorderQuery.data ? String(activeReorderRows.length) : '-'}
          subtitle={ui("Products with a recommended reorder quantity.")}
          iconPath="/products"
        />
        <StatCard
          title={ui("Rated suppliers")}
          value={supplierTrustQuery.data ? formatNumber(supplierTrustQuery.data.summary?.rated_suppliers ?? 0, 0) : '-'}
          subtitle={supplierTrustQuery.data ? ui('{count} supplier(s) need delivery history.').replace('{count}', formatNumber(supplierTrustQuery.data.summary?.unrated_suppliers ?? 0, 0)) : ui('Supplier performance based on real delivery history.')}
          iconPath="/suppliers"
        />
      </section>

      <Section title={ui("What needs action next")} subtitle={ui("Use these recommendations to move from analytics into operational decisions.")} iconPath="/action-center">
        {actionAgenda.length ? (
          <>
            {actionAgendaLoading ? (
              <div className="app-empty-state" style={styles.infoState}>{ui("Some insight sources are still loading, so this action agenda may change.")}</div>
            ) : null}
            {actionAgendaUnavailable ? (
              <div className="app-error-state" style={styles.errorState}>{ui("Some insight sources are unavailable, so this action agenda may be incomplete.")}</div>
            ) : null}
            <div style={styles.actionAgendaGrid}>
              {actionAgenda.map((item) => (
                <article
                  key={item.title}
                  className="insights-action-card"
                  data-tone={item.tone}
                  style={item.tone === 'bad' ? styles.actionCardBad : item.tone === 'warn' ? styles.actionCardWarn : styles.actionCardGood}
                >
                  <div className="insights-action-card__header">
                    <span className="insights-action-card__icon" aria-hidden="true">
                      <TenantNavIcon path={item.route} size={18} />
                    </span>
                    <div style={styles.actionCardTitle}>{item.title}</div>
                  </div>
                  <div style={styles.actionCardText}>{item.detail}</div>
                  <Link to={item.route} style={styles.actionCardLink}>
                    {item.linkLabel}
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : actionAgendaLoading ? (
          <div className="app-empty-state" style={styles.infoState}>{ui("Loading action agenda...")}</div>
        ) : actionAgendaUnavailable ? (
          <div className="app-error-state" style={styles.errorState}>{ui("The action agenda is unavailable because one or more insight sources could not be loaded.")}</div>
        ) : (
          <div className="app-empty-state" style={styles.infoState}>
            {ui("No urgent action agenda is available yet. As data accumulates, this section will point managers to the next best operational decisions.")}
          </div>
        )}
      </Section>

      <Section title={ui("Insight controls")} subtitle={ui("Choose the recent-history window used by the supported windowed analyses. Refresh status and the global refresh action are available above.")} iconPath="/insights">
        <div className="app-actions" style={styles.controlRow}>
          <label style={styles.label}>
            {ui("Recent history window")}
            <select style={styles.select} value={lookbackDays} onChange={(event) => setLookbackDays(Number(event.target.value))}>
              <option value={14}>{ui("14 days")}</option>
              <option value={30}>{ui("30 days")}</option>
              <option value={60}>{ui("60 days")}</option>
              <option value={90}>{ui("90 days")}</option>
            </select>
          </label>
          <div className="insights-control-note">
            <span className="insights-control-note__icon" aria-hidden="true">
              <TenantNavIcon path="/stock-movements" size={18} />
            </span>
            <div>
              <strong>{ui("Windowed evidence")}</strong>
              <span>{ui("The history window applies to depletion and reorder analysis; other management signals use their current supported evidence windows.")}</span>
            </div>
          </div>
        </div>
      </Section>

      <div className="insights-sections" style={styles.grid}>
        <Section title={ui("Operational health")} subtitle={ui("Tenant-level health based on alerts, overdue shipments, low-stock pressure, and discrepancy pressure.")} iconPath="/dashboard">
          {healthQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading health score...")}</div> : null}
          {healthQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(healthQuery.error, ui('Unknown error'))}</div> : null}
          {healthQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>{ui("Health Score")}</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.health_score, 0)}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>{ui("Tier")}</strong>
                <span style={styles.keyValue}>{formatReadableStatus(healthQuery.data.health_tier)}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>{ui("Unresolved Alerts")}</strong>
                <span style={styles.keyValue}>{healthQuery.data.metrics.unresolved_alerts}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>{ui("Overdue Shipments")}</strong>
                <span style={styles.keyValue}>{healthQuery.data.metrics.overdue_shipments}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>{ui("Low Stock Rate")}</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.metrics.low_stock_rate_pct)}%</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>{ui("Discrepancy Rate")}</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.metrics.discrepancy_rate_pct)}%</span>
              </div>
            </div>
          ) : null}
        </Section>

        <Section title={ui("Supplier performance")} subtitle={ui("Delivery-based supplier scores plus separate purchase-order and receiving risk signals. Suppliers without shipment history stay unrated.")} iconPath="/suppliers">
          {supplierTrustQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading supplier performance...")}</div> : null}
          {supplierTrustQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(supplierTrustQuery.error, ui('Unknown error'))}</div> : null}
          {supplierTrustProductionReviewQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading supplier performance review...")}</div> : null}
          {supplierTrustProductionReviewQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(supplierTrustProductionReviewQuery.error, ui('Unknown error'))}</div> : null}
          {supplierTrustProductionReviewQuery.data ? (
            <div className="insights-review-panel" style={styles.supplierBreakdownPanel} aria-label={ui("Supplier performance review")}>
              <div style={styles.itemTitle}>{ui("Supplier Performance Review")}</div>
              <div className="app-grid-stats" style={styles.supplierSummaryGrid}>
                <StatCard
                  title={ui("Review status")}
                  value={formatReadableStatus(supplierTrustProductionReviewQuery.data.production_status)}
                  subtitle={ui("Advisory status based on delivery history and active risk factors.")}
                  tone={supplierTrustProductionReviewQuery.data.summary.total_rows === 0 ? 'default' : supplierTrustProductionReviewQuery.data.production_status === 'blocked' ? 'bad' : supplierTrustProductionReviewQuery.data.production_status === 'needs_review' ? 'warn' : 'good'}
                  iconPath="/suppliers"
                />
                <StatCard
                  title={ui("Suppliers needing review")}
                  value={formatNumber(supplierTrustProductionReviewQuery.data.summary.rows_requiring_human_review, 0)}
                  subtitle={ui('{count} suppliers reviewed.').replace('{count}', formatNumber(supplierTrustProductionReviewQuery.data.summary.total_rows, 0))}
                  tone={supplierTrustProductionReviewQuery.data.summary.total_rows === 0 ? 'default' : supplierTrustProductionReviewQuery.data.summary.rows_requiring_human_review > 0 ? 'warn' : 'good'}
                  iconPath="/suppliers"
                />
                <StatCard
                  title={ui("Blockers")}
                  value={formatNumber(supplierTrustProductionReviewQuery.data.blockers.length, 0)}
                  subtitle={ui("Blocking supplier performance issues requiring human review.")}
                  tone={supplierTrustProductionReviewQuery.data.summary.total_rows === 0 ? 'default' : supplierTrustProductionReviewQuery.data.blockers.length > 0 ? 'bad' : 'good'}
                  iconPath="/suppliers"
                />
                <StatCard
                  title={ui("Read-only review")}
                  value={supplierTrustProductionReviewQuery.data.safety_contract.read_only ? ui('Yes') : ui('No')}
                  subtitle={ui("Does not change suppliers, update status, or create purchase orders.")}
                  tone={supplierTrustProductionReviewQuery.data.safety_contract.read_only ? 'good' : 'bad'}
                  iconPath="/suppliers"
                />
              </div>
              {supplierTrustProductionReviewQuery.data.summary.total_rows === 0 ? (
                <div className="app-empty-state" style={styles.infoState}>{ui('No supplier rows were available for production review.')}</div>
              ) : supplierTrustProductionReviewQuery.data.blockers.length || supplierTrustProductionReviewQuery.data.warnings.length ? (
                <div style={styles.list}>
                  {[...supplierTrustProductionReviewQuery.data.blockers, ...supplierTrustProductionReviewQuery.data.warnings].map((reviewItem) => (
                    <div key={reviewItem.code} className="insights-item-card" style={styles.itemCard}>
                      <div style={styles.itemTitle}>{localizeInsightsSystemText(reviewItem.message, ui)}</div>
                      <div style={styles.itemMeta}>{ui('Severity {severity} · {count} supplier(s) affected').replace('{severity}', formatReadableStatus(reviewItem.severity)).replace('{count}', formatNumber(reviewItem.affected_count, 0))}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {supplierTrustProductionReviewQuery.data.summary.total_rows > 0 && supplierTrustProductionReviewQuery.data.next_actions.length ? (
                <ul style={styles.compactList}>
                  {supplierTrustProductionReviewQuery.data.next_actions.map((action) => <li key={action}>{localizeInsightsSystemText(action, ui)}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
          {supplierTrustQuery.data?.rows.length ? (
            <>
              {supplierTrustQuery.data.summary ? (
                <div className="app-grid-stats" style={styles.supplierSummaryGrid}>
                  <StatCard
                    title={ui("Suppliers with risk signals")}
                    value={formatNumber(supplierTrustQuery.data.summary.suppliers_with_risk, 0)}
                    subtitle={ui('{rate}% of suppliers have at least one active risk flag.').replace('{rate}', formatNumber(supplierTrustQuery.data.summary.risk_supplier_rate_pct))}
                    tone={toNumber(supplierTrustQuery.data.summary.high_risk_flags) > 0 ? 'bad' : toNumber(supplierTrustQuery.data.summary.suppliers_with_risk) > 0 ? 'warn' : 'good'}
                    iconPath="/suppliers"
                  />
                  <StatCard
                    title={ui("High-risk signals")}
                    value={formatNumber(supplierTrustQuery.data.summary.high_risk_flags, 0)}
                    subtitle={ui('{count} total supplier risk flags.').replace('{count}', formatNumber(supplierTrustQuery.data.summary.total_risk_flags, 0))}
                    tone={toNumber(supplierTrustQuery.data.summary.high_risk_flags) > 0 ? 'bad' : 'good'}
                    iconPath="/suppliers"
                  />
                  <StatCard
                    title={ui("Overdue Open POs")}
                    value={formatNumber(supplierTrustQuery.data.summary.overdue_open_purchase_orders, 0)}
                    subtitle={ui("Open supplier POs past expected delivery date.")}
                    tone={toNumber(supplierTrustQuery.data.summary.overdue_open_purchase_orders) > 0 ? 'bad' : 'good'}
                    iconPath="/suppliers"
                  />
                  <StatCard
                    title={ui("Remaining PO Value")}
                    value={formatSupplierMoney(supplierTrustQuery.data.summary.po_remaining_value, supplierTrustQuery.data.summary.currency_code)}
                    subtitle={ui('{quantity} units still open across supplier POs.').replace('{quantity}', formatNumber(supplierTrustQuery.data.summary.po_remaining_quantity))}
                    tone={toNumber(supplierTrustQuery.data.summary.po_remaining_quantity) > 0 ? 'warn' : 'good'}
                    iconPath="/suppliers"
                  />
                </div>
              ) : null}
              <div className="insights-meta-panel" style={styles.supplierDataMetaPanel} aria-label={ui("Supplier performance data status")}>
                <span>{ui('Generated {time}').replace('{time}', formatDateTime(supplierTrustQuery.data.generated_at))}</span>
                <span>{ui('{matching} matching suppliers · {total} total suppliers').replace('{matching}', formatNumber(visibleSupplierTrustRows.length, 0)).replace('{total}', formatNumber(supplierTrustQuery.data.rows.length, 0))}</span>
                {supplierTrustQuery.isFetching ? <span>{ui('Refreshing…')}</span> : null}
              </div>
              <div className="insights-action-summary" style={styles.supplierActionSummaryPanel} aria-label={ui("Supplier recommended action summary")}>
                <div style={styles.supplierActionSummaryHeader}>
                  <div>
                    <div style={styles.itemTitle}>{ui("Recommended action summary")}</div>
                    <div style={styles.itemMeta}>
                      {supplierRecommendedActionSummary.total
                        ? ui('{total} supplier action(s): {high} high · {medium} medium · {low} low')
                            .replace('{total}', formatNumber(supplierRecommendedActionSummary.total, 0))
                            .replace('{high}', formatNumber(supplierRecommendedActionSummary.high, 0))
                            .replace('{medium}', formatNumber(supplierRecommendedActionSummary.medium, 0))
                            .replace('{low}', formatNumber(supplierRecommendedActionSummary.low, 0))
                        : ui('No supplier follow-up actions are currently recommended.')}
                    </div>
                  </div>
                </div>
                {supplierRecommendedActionSummary.topActions.length ? (
                  <div style={styles.riskFlagDetailList}>
                    {supplierRecommendedActionSummary.topActions.map((action) => (
                      <button
                        key={`${action.supplierId}-${action.priority}-${action.title}`}
                        type="button"
                        style={styles.supplierActionSummaryItem}
                        onClick={() => setSelectedSupplierId(action.supplierId)}
                      >
                        <span style={action.priority === 'high' ? styles.riskFlagHigh : action.priority === 'medium' ? styles.riskFlagMedium : styles.riskFlagLow}>
                          {formatReadableStatus(action.priority)}
                        </span>
                        <span style={styles.supplierActionSummaryText}>
                          <strong>{action.supplier}</strong> · {action.title}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="app-empty-state" style={styles.infoState}>{ui("No supplier follow-up actions need attention.")}</div>
                )}
              </div>
              <div style={styles.supplierControls}>
                <label style={styles.label}>
                  {ui("Search suppliers")}
                  <input
                    style={styles.input}
                    value={supplierSearch}
                    onChange={(event) => setSupplierSearch(event.target.value)}
                    placeholder={ui("Search supplier, tier, or risk flag")}
                  />
                </label>
                <label style={styles.label}>
                  {ui("Risk filter")}
                  <select
                    style={styles.select}
                    value={supplierRiskFilter}
                    onChange={(event) => setSupplierRiskFilter(event.target.value as SupplierRiskFilter)}
                  >
                    <option value="all">{ui("All risk levels")}</option>
                    <option value="with_risk">{ui("Any risk flag")}</option>
                    <option value="high">{ui("High risk")}</option>
                    <option value="medium">{ui("Medium risk")}</option>
                    <option value="low">{ui("Low risk")}</option>
                    <option value="none">{ui("No risk flags")}</option>
                  </select>
                </label>
                <label style={styles.label}>
                  {ui("Performance tier")}
                  <select
                    style={styles.select}
                    value={supplierTierFilter}
                    onChange={(event) => setSupplierTierFilter(event.target.value as SupplierTierFilter)}
                  >
                    <option value="all">{ui("All tiers")}</option>
                    <option value="excellent">{ui("Excellent")}</option>
                    <option value="strong">{ui("Strong")}</option>
                    <option value="watch">{ui("Watch")}</option>
                    <option value="risk">{ui("Risk")}</option>
                    <option value="unrated">{ui("Not enough history")}</option>
                  </select>
                </label>
                <label style={styles.label}>
                  {ui("Sort suppliers")}
                  <select
                    style={styles.select}
                    value={supplierSort}
                    onChange={(event) => setSupplierSort(event.target.value as SupplierSort)}
                  >
                    <option value="risk_flags_desc">{ui("Most risk flags")}</option>
                    <option value="trust_asc">{ui("Lowest performance first")}</option>
                    <option value="trust_desc">{ui("Highest performance first")}</option>
                    <option value="remaining_value_desc">{ui("Highest remaining value")}</option>
                    <option value="overdue_pos_desc">{ui("Most overdue POs")}</option>
                    <option value="fill_rate_asc">{ui("Lowest PO fill rate")}</option>
                  </select>
                </label>
                <label style={styles.label}>
                  {ui("Page size")}
                  <select
                    style={styles.select}
                    value={supplierPageSize}
                    onChange={(event) => setSupplierPageSize(Number(event.target.value) as SupplierPageSize)}
                  >
                    {SUPPLIER_PAGE_SIZE_OPTIONS.map((pageSize) => (
                      <option key={pageSize} value={pageSize}>{ui('{count} per page').replace('{count}', formatNumber(pageSize, 0))}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={clearSupplierTrustFilters}
                  disabled={!supplierActiveFilterChips.length}
                >
                  {ui("Clear supplier filters")}
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={() => void supplierTrustQuery.refetch()}
                  disabled={supplierTrustQuery.isFetching}
                >
                  {supplierTrustQuery.isFetching ? ui('Refreshing…') : ui('Refresh supplier performance')}
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={exportSupplierTrustCsv}
                  disabled={!visibleSupplierTrustRows.length}
                >
                  {ui("Export supplier CSV")}
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={printSupplierTrust}
                  disabled={!visibleSupplierTrustRows.length}
                >
                  {ui("Print supplier view")}
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={() => void copySupplierTrustViewLink()}
                >
                  {ui("Copy supplier view link")}
                </button>
              </div>
              {supplierActiveFilterChips.length ? (
                <div style={styles.activeFilterBar} aria-label={ui("Active supplier performance filters")}>
                  {supplierActiveFilterChips.map((chip) => (
                    <span key={chip.key} style={styles.activeFilterChip}>
                      {chip.label}
                      <button type="button" style={styles.chipRemoveButton} onClick={chip.onClear} aria-label={ui('Remove {filter} filter').replace('{filter}', chip.label)}>
                        ×
                      </button>
                    </span>
                  ))}
                  <button type="button" style={styles.breakdownButton} onClick={clearSupplierTrustFilters}>
                    {ui("Clear all filters")}
                  </button>
                </div>
              ) : null}
              <div style={styles.itemMeta}>
                {ui('Showing {start}-{end} of {matching} matching suppliers · {total} total.').replace('{start}', formatNumber(pagedSupplierTrustRows.length ? ((supplierCurrentPage - 1) * supplierPageSize) + 1 : 0, 0)).replace('{end}', formatNumber(Math.min(supplierCurrentPage * supplierPageSize, visibleSupplierTrustRows.length), 0)).replace('{matching}', formatNumber(visibleSupplierTrustRows.length, 0)).replace('{total}', formatNumber(supplierTrustQuery.data.rows.length, 0))}
              </div>
              <div className="insights-breakdown-panel" style={styles.supplierBreakdownPanel} aria-label={ui("Supplier performance breakdown filters")}>
                <div style={styles.itemTitle}>{ui("Supplier performance breakdown")}</div>
                <div style={styles.supplierBreakdownGrid}>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('with_risk'); setSupplierTierFilter('all'); }}>
                    {ui('Any risk · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.withRisk, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('high'); setSupplierTierFilter('all'); }}>
                    {ui('High risk · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.highRisk, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('medium'); setSupplierTierFilter('all'); }}>
                    {ui('Medium risk · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.mediumRisk, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('low'); setSupplierTierFilter('all'); }}>
                    {ui('Low risk · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.lowRisk, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('none'); setSupplierTierFilter('all'); }}>
                    {ui('No risk · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.noRisk, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('excellent'); setSupplierRiskFilter('all'); }}>
                    {ui('Excellent · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.excellent, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('strong'); setSupplierRiskFilter('all'); }}>
                    {ui('Strong · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.strong, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('watch'); setSupplierRiskFilter('all'); }}>
                    {ui('Watch · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.watch, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('risk'); setSupplierRiskFilter('all'); }}>
                    {ui('Risk tier · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.risk, 0))}
                  </button>
                  <button type="button" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('unrated'); setSupplierRiskFilter('all'); }}>
                    {ui('Not enough history · {count}').replace('{count}', formatNumber(supplierTrustBreakdown.unrated, 0))}
                  </button>
                </div>
              </div>
              <div style={styles.list}>
              {pagedSupplierTrustRows.map((row) => (
                <article key={row.supplier_id} className="insights-item-card insights-item-card--supplier" style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.supplier_name}</div>
                  <div style={styles.itemMeta}>{ui('Performance {score} · {tier}').replace('{score}', formatSupplierTrustScore(row)).replace('{tier}', row.trust_tier === 'unrated' ? ui('Not enough delivery history') : ui('Tier {tier}').replace('{tier}', formatReadableStatus(row.trust_tier)))}</div>
                  <div style={styles.itemText}>
                    {ui('Shipments: completion {completion}% · overdue {overdue}% · fill {fill}%').replace('{completion}', formatNumber(row.completion_rate_pct)).replace('{overdue}', formatNumber(row.overdue_rate_pct)).replace('{fill}', formatNumber(row.fill_rate_pct))}
                  </div>
                  <div style={styles.itemText}>
                    {ui('POs: {total} total · {open} open · {overdue} overdue').replace('{total}', formatNumber(row.total_purchase_orders, 0)).replace('{open}', formatNumber(row.open_purchase_orders, 0)).replace('{overdue}', formatNumber(row.overdue_open_purchase_orders, 0))}
                  </div>
                  <div style={styles.itemText}>
                    {ui('PO fill {fill}% · short-closed {closed} · remaining value {value}').replace('{fill}', formatNumber(row.po_fill_rate_pct)).replace('{closed}', formatNumber(row.closed_short_purchase_orders, 0)).replace('{value}', formatSupplierMoney(row.po_remaining_value, row.currency_code))}
                  </div>
                  {row.risk_flags?.length ? (
                    <div style={styles.riskFlagGroup} aria-label={ui('Supplier risk flags for {supplier}').replace('{supplier}', row.supplier_name)}>
                      {row.risk_flags.map((flag) => (
                        <span key={flag.code} style={getRiskFlagStyle(flag.severity)} title={localizeSupplierRiskFlag(flag, row, ui, formatNumber).detail}>
                          {localizeSupplierRiskFlag(flag, row, ui, formatNumber).label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.itemText}>{ui("No supplier risk flags.")}</div>
                  )}
                  <div style={styles.inlineActionGroup}>
                    {canOpenSuppliers ? (
                      <Link to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`} style={styles.inlineActionLink}>{ui("Open supplier")}</Link>
                    ) : null}
                    {canOpenPurchaseOrders ? (
                      <Link to={`/purchase-orders?supplier_id=${encodeURIComponent(row.supplier_id)}`} style={styles.inlineActionLink}>{ui("Open POs")}</Link>
                    ) : null}
                    <button
                      type="button"
                      style={styles.inlineActionButton}
                      onClick={() => setSelectedSupplierId(row.supplier_id)}
                    >
                      {ui("View Detail")}
                    </button>
                  </div>
                </article>
              ))}
              </div>
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={() => setSupplierPage((page) => Math.max(1, page - 1))}
                  disabled={supplierCurrentPage <= 1}
                >
                  {ui("Previous suppliers")}
                </button>
                <span style={styles.itemMeta}>{ui('Page {page} of {total}').replace('{page}', formatNumber(supplierCurrentPage, 0)).replace('{total}', formatNumber(supplierTotalPages, 0))}</span>
                <button
                  type="button"
                  className="app-button app-button--secondary insights-secondary-button"
                  style={styles.secondaryButton}
                  onClick={() => setSupplierPage((page) => Math.min(supplierTotalPages, page + 1))}
                  disabled={supplierCurrentPage >= supplierTotalPages}
                >
                  {ui("Next suppliers")}
                </button>
              </div>
              {selectedSupplierTrustRow ? (
                <article className="insights-supplier-detail" style={styles.supplierDetailPanel} aria-label={ui('Supplier performance detail for {supplier}').replace('{supplier}', selectedSupplierTrustRow.supplier_name)}>
                  <div style={styles.supplierDetailHeader}>
                    <div>
                      <div style={styles.itemTitle}>{selectedSupplierTrustRow.supplier_name}</div>
                      <div style={styles.itemMeta}>{ui('Supplier performance detail · Performance {score} · {tier}').replace('{score}', formatSupplierTrustScore(selectedSupplierTrustRow)).replace('{tier}', selectedSupplierTrustRow.trust_tier === 'unrated' ? ui('Not enough delivery history') : ui('Tier {tier}').replace('{tier}', formatReadableStatus(selectedSupplierTrustRow.trust_tier)))}</div>
                    </div>
                    <div style={styles.inlineActionGroup}>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => exportSupplierTrustDetailCsv(selectedSupplierTrustRow)}
                      >
                        {ui("Export detail CSV")}
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => printSupplierTrustDetail(selectedSupplierTrustRow)}
                      >
                        {ui("Print detail")}
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => void copySupplierTrustViewLink()}
                      >
                        {ui("Copy detail link")}
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => setSelectedSupplierId(null)}
                      >
                        {ui("Close detail")}
                      </button>
                    </div>
                  </div>
                  <div className="app-grid-stats" style={styles.supplierDetailGrid}>
                    <StatCard
                      title={ui("Shipment Performance")}
                      value={`${formatNumber(selectedSupplierTrustRow.completion_rate_pct)}%`}
                      subtitle={ui('Overdue {overdue}% · Fill {fill}% · Discrepancy {discrepancy}%').replace('{overdue}', formatNumber(selectedSupplierTrustRow.overdue_rate_pct)).replace('{fill}', formatNumber(selectedSupplierTrustRow.fill_rate_pct)).replace('{discrepancy}', formatNumber(selectedSupplierTrustRow.discrepancy_rate_pct))}
                      tone={toNumber(selectedSupplierTrustRow.overdue_rate_pct) > 20 || toNumber(selectedSupplierTrustRow.discrepancy_rate_pct) > 10 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title={ui("PO Completion")}
                      value={`${formatNumber(selectedSupplierTrustRow.po_completion_rate_pct)}%`}
                      subtitle={ui('{received} fully received · {closed} manually closed').replace('{received}', formatNumber(selectedSupplierTrustRow.fully_received_purchase_orders, 0)).replace('{closed}', formatNumber(selectedSupplierTrustRow.manually_closed_purchase_orders, 0))}
                      tone={toNumber(selectedSupplierTrustRow.po_completion_rate_pct) >= 80 ? 'good' : 'warn'}
                    />
                    <StatCard
                      title={ui("Open PO Exposure")}
                      value={formatSupplierMoney(selectedSupplierTrustRow.po_remaining_value, selectedSupplierTrustRow.currency_code)}
                      subtitle={ui('{quantity} units remaining · {count} overdue open POs').replace('{quantity}', formatNumber(selectedSupplierTrustRow.po_remaining_quantity)).replace('{count}', formatNumber(selectedSupplierTrustRow.overdue_open_purchase_orders, 0))}
                      tone={toNumber(selectedSupplierTrustRow.overdue_open_purchase_orders) > 0 ? 'bad' : toNumber(selectedSupplierTrustRow.po_remaining_quantity) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title={ui("Short Close Rate")}
                      value={`${formatNumber(selectedSupplierTrustRow.po_short_close_rate_pct)}%`}
                      subtitle={ui('{count} closed-short POs').replace('{count}', formatNumber(selectedSupplierTrustRow.closed_short_purchase_orders, 0))}
                      tone={toNumber(selectedSupplierTrustRow.closed_short_purchase_orders) > 0 ? 'warn' : 'good'}
                    />
                  </div>
                  <div style={styles.supplierDetailBody}>
                    <div style={styles.keyValueRow}>
                      <strong style={styles.keyLabel}>{ui("PO quantities")}</strong>
                      <span style={styles.keyValue}>{ui('Ordered {ordered} · Received {received} · Remaining {remaining}').replace('{ordered}', formatNumber(selectedSupplierTrustRow.po_ordered_quantity)).replace('{received}', formatNumber(selectedSupplierTrustRow.po_received_quantity)).replace('{remaining}', formatNumber(selectedSupplierTrustRow.po_remaining_quantity))}</span>
                    </div>
                    <div style={styles.keyValueRow}>
                      <strong style={styles.keyLabel}>{ui("PO values")}</strong>
                      <span style={styles.keyValue}>{ui('Ordered {ordered} · Received {received} · Remaining {remaining}').replace('{ordered}', formatSupplierMoney(selectedSupplierTrustRow.po_ordered_value, selectedSupplierTrustRow.currency_code)).replace('{received}', formatSupplierMoney(selectedSupplierTrustRow.po_received_value, selectedSupplierTrustRow.currency_code)).replace('{remaining}', formatSupplierMoney(selectedSupplierTrustRow.po_remaining_value, selectedSupplierTrustRow.currency_code))}</span>
                    </div>
                    <div style={styles.keyValueRow}>
                      <strong style={styles.keyLabel}>{ui("PO counts")}</strong>
                      <span style={styles.keyValue}>{ui('{total} total · {open} open · {cancelled} cancelled').replace('{total}', formatNumber(selectedSupplierTrustRow.total_purchase_orders, 0)).replace('{open}', formatNumber(selectedSupplierTrustRow.open_purchase_orders, 0)).replace('{cancelled}', formatNumber(selectedSupplierTrustRow.cancelled_purchase_orders, 0))}</span>
                    </div>
                  </div>
                  {selectedSupplierTrustRow.risk_flags?.length ? (
                    <div style={styles.riskFlagDetailList}>
                      {selectedSupplierTrustRow.risk_flags.map((flag) => (
                        (() => {
                          const localizedFlag = localizeSupplierRiskFlag(flag, selectedSupplierTrustRow, ui, formatNumber);
                          return (
                            <div key={flag.code} style={styles.riskFlagDetailItem}>
                              <span style={getRiskFlagStyle(flag.severity)}>{localizedFlag.label}</span>
                              <span style={styles.itemText}>{localizedFlag.detail}</span>
                            </div>
                          );
                        })()
                      ))}
                    </div>
                  ) : (
                    <div className="app-empty-state" style={styles.infoState}>{ui("No active supplier risk flags.")}</div>
                  )}
                  <div className="insights-recommended-action-panel" style={styles.recommendedActionPanel}>
                    <div style={styles.itemTitle}>{ui("Recommended Actions")}</div>
                    <div style={styles.riskFlagDetailList}>
                      {getSupplierRecommendedActions(selectedSupplierTrustRow, locale, ui).map((action) => (
                        <div key={`${action.priority}-${action.title}`} style={styles.recommendedActionItem}>
                          <span style={action.priority === 'high' ? styles.riskFlagHigh : action.priority === 'medium' ? styles.riskFlagMedium : styles.riskFlagLow}>
                            {formatReadableStatus(action.priority)}
                          </span>
                          <div>
                            <div style={styles.itemTitle}>{action.title}</div>
                            <div style={styles.itemText}>{action.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={styles.inlineActionGroup}>
                    {canOpenSuppliers ? (
                      <Link to={`/suppliers?search=${encodeURIComponent(selectedSupplierTrustRow.supplier_name)}`} style={styles.inlineActionLink}>{ui("Open supplier")}</Link>
                    ) : null}
                    {canOpenPurchaseOrders ? (
                      <Link to={`/purchase-orders?supplier_id=${encodeURIComponent(selectedSupplierTrustRow.supplier_id)}`} style={styles.inlineActionLink}>{ui("Open supplier POs")}</Link>
                    ) : null}
                  </div>
                </article>
              ) : selectedSupplierId && supplierTrustQuery.data && !supplierTrustQuery.isLoading && !supplierTrustQuery.isError ? (
                <div className="app-empty-state" style={styles.infoState}>
                  <div>{ui("The requested supplier detail is not available in the current Insights snapshot.")}</div>
                  <button
                    type="button"
                    className="app-button app-button--secondary"
                    style={styles.secondaryButton}
                    onClick={() => setSelectedSupplierId(null)}
                  >
                    {ui("Close detail")}
                  </button>
                </div>
              ) : null}
              {!visibleSupplierTrustRows.length ? (
                <div className="app-empty-state" style={styles.infoState}>
                  {ui("No suppliers match the current supplier filters.")}
                </div>
              ) : null}
            </>
          ) : !supplierTrustQuery.isLoading && !supplierTrustQuery.isError ? <div className="app-empty-state" style={styles.infoState}>{ui("No supplier performance rows were returned.")}</div> : null}
        </Section>
      </div>

      <div style={styles.grid}>
        <Section title={ui("Depletion pressure")} subtitle={ui("Products and locations under the greatest consumption pressure relative to stock on hand.")} iconPath="/stock">
          {depletionRiskQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading depletion risk...")}</div> : null}
          {depletionRiskQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(depletionRiskQuery.error, ui('Unknown error'))}</div> : null}
          {prioritizedDepletionRows.length ? (
            <div style={styles.list}>
              {prioritizedDepletionRows.slice(0, 10).map((row) => (
                <article key={row.stock_id} className="insights-item-card insights-item-card--stock" style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>
                    {ui('{location} · Risk {risk} · Tier {tier}').replace('{location}', row.storage_location_name).replace('{risk}', formatNumber(row.risk_score, 0)).replace('{tier}', formatReadableStatus(row.risk_tier))}
                  </div>
                  <div style={styles.itemText}>
                    {ui('Qty {quantity} · Min {min} · Coverage {coverage}').replace('{quantity}', formatNumber(row.current_quantity)).replace('{min}', formatNumber(row.configured_min_quantity)).replace('{coverage}', row.estimated_days_of_coverage === null ? ui('Not available') : ui('{days} days').replace('{days}', formatNumber(row.estimated_days_of_coverage, 1)))}
                  </div>
                  {canOpenStock ? (
                    <Link to={`/stock?product_id=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>{ui("Open in Stock")}</Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : !depletionRiskQuery.isLoading && !depletionRiskQuery.isError ? <div className="app-empty-state" style={styles.infoState}>{ui("No depletion risk rows returned.")}</div> : null}
        </Section>

        <Section title={ui("Why stock is under pressure")} subtitle={ui("Explains the current stock and recent usage factors that operators should verify before replenishment decisions.")} iconPath="/stock">
          {depletionRootCauseQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading depletion root-cause review...")}</div> : null}
          {depletionRootCauseQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(depletionRootCauseQuery.error, ui('Unknown error'))}</div> : null}
          {depletionRootCauseQuery.data ? (
            <div style={styles.list}>
              <div className="insights-meta-panel" style={styles.supplierDataMetaPanel}>
                <span>{ui('{count} stock rows reviewed').replace('{count}', formatNumber(depletionRootCauseQuery.data.summary.total_rows, 0))}</span>
                <span>{ui('{count} need human review').replace('{count}', formatNumber(depletionRootCauseQuery.data.summary.rows_requiring_human_review, 0))}</span>
                <span>{ui('Read-only: {value}').replace('{value}', depletionRootCauseQuery.data.safety_contract.read_only ? ui('Yes') : ui('No'))}</span>
              </div>
              {depletionRootCauseQuery.data.rows.slice(0, 8).map((row) => (
                <article key={`${row.stock_id}-root-cause`} className="insights-item-card insights-item-card--root-cause" style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>
                    {ui('{location} · Highest concern {severity} · Risk {score} / {tier}').replace('{location}', row.storage_location_name).replace('{severity}', formatReadableStatus(row.highest_factor_severity)).replace('{score}', formatNumber(row.risk_score, 0)).replace('{tier}', formatReadableStatus(row.risk_tier))}
                  </div>
                  <div style={styles.riskFlagDetailList}>
                    {row.root_cause_factors.slice(0, 3).map((factor) => (
                      (() => {
                        const localizedFactor = localizeDepletionRootCauseFactor(factor, row, ui, formatNumber);
                        return (
                          <div key={`${row.stock_id}-${factor.code}`} style={styles.riskFlagDetailItem}>
                            <span style={factor.severity === 'critical' || factor.severity === 'high' ? styles.riskFlagHigh : factor.severity === 'medium' ? styles.riskFlagMedium : styles.riskFlagLow}>
                              {formatReadableStatus(factor.severity)}
                            </span>
                            <div>
                              <div style={styles.itemTitle}>{localizedFactor.label}</div>
                              <div style={styles.itemText}>{localizedFactor.detail}</div>
                            </div>
                          </div>
                        );
                      })()
                    ))}
                  </div>
                  <div className="insights-recommended-action-panel" style={styles.recommendedActionPanel}>
                    <div style={styles.itemTitle}>{ui("Investigation steps")}</div>
                    <ul style={styles.compactList}>
                      {row.recommended_investigation_steps.slice(0, 3).map((step) => (
                        <li key={`${row.stock_id}-${step}`} style={styles.itemText}>{localizeInsightsSystemText(step, ui)}</li>
                      ))}
                    </ul>
                  </div>
                  {canOpenStock ? (
                    <Link to={`/stock?product_id=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>{ui("Open in Stock")}</Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : !depletionRootCauseQuery.isLoading && !depletionRootCauseQuery.isError ? <div className="app-empty-state" style={styles.infoState}>{ui("No depletion root-cause review returned.")}</div> : null}
        </Section>

        <Section title={ui("Reorder recommendations")} subtitle={ui("Explainable reorder quantities based on current stock and recent outbound usage.")} iconPath="/products">
          {reorderQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading reorder recommendations...")}</div> : null}
          {reorderQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(reorderQuery.error, ui('Unknown error'))}</div> : null}
          {activeReorderRows.length ? (
            <div style={styles.list}>
              {activeReorderRows.slice(0, 8).map((row) => (
                <article key={row.product_id} className="insights-item-card" style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>{ui('Urgency {urgency} · Reorder {quantity}').replace('{urgency}', formatReadableStatus(row.urgency)).replace('{quantity}', formatNumber(row.recommended_reorder_quantity))}</div>
                  <div style={styles.itemText}>
                    {ui('Current {current} · Min {min} · Avg Daily Usage {usage}').replace('{current}', formatNumber(row.current_quantity)).replace('{min}', formatNumber(row.min_stock)).replace('{usage}', formatNumber(row.average_daily_usage))}
                  </div>
                  {canOpenProducts ? (
                    <Link to={`/products?search=${encodeURIComponent(row.product_name)}`} style={styles.inlineActionLink}>{ui("Open product")}</Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : !reorderQuery.isLoading && !reorderQuery.isError ? <div className="app-empty-state" style={styles.infoState}>{ui("No active reorder quantity is currently recommended.")}</div> : null}
        </Section>
      </div>



      <Section title={ui("Anomaly reliability review")} subtitle={ui("Checks whether unusual movement signals have enough context for human review. This section remains read-only and never changes stock or suppresses alerts.")} iconPath="/reliability-command">
        {anomalyProductionReviewQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading anomaly reliability review...")}</div> : null}
        {anomalyProductionReviewQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(anomalyProductionReviewQuery.error, ui('Unknown error'))}</div> : null}
        {anomalyProductionReviewQuery.data ? (
          <div style={styles.list}>
            <div className="app-grid-stats" style={styles.supplierSummaryGrid}>
              <StatCard
                title={ui("Review status")}
                value={formatReadableStatus(anomalyProductionReviewQuery.data.production_status)}
                subtitle={ui('Health tier: {tier}').replace('{tier}', formatReadableStatus(anomalyProductionReviewQuery.data.operational_health_context.health_tier))}
                tone={anomalyProductionReviewQuery.data.summary.total_rows === 0 ? 'default' : anomalyProductionReviewQuery.data.production_status === 'blocked' ? 'bad' : anomalyProductionReviewQuery.data.production_status === 'needs_review' ? 'warn' : 'good'}
                iconPath="/reliability-command"
              />
              <StatCard
                title={ui("Rows needing review")}
                value={formatNumber(anomalyProductionReviewQuery.data.summary.rows_requiring_human_review, 0)}
                subtitle={ui('{count} anomaly rows reviewed.').replace('{count}', formatNumber(anomalyProductionReviewQuery.data.summary.total_rows, 0))}
                tone={anomalyProductionReviewQuery.data.summary.total_rows === 0 ? 'default' : anomalyProductionReviewQuery.data.summary.rows_requiring_human_review > 0 ? 'warn' : 'good'}
                iconPath="/reliability-command"
              />
              <StatCard
                title={ui("Review safeguards")}
                value={anomalyProductionReviewQuery.data.safety_contract.read_only ? ui('Read-only review') : ui('Write-enabled review')}
                subtitle={anomalyProductionReviewQuery.data.safety_contract.mutates_inventory ? ui('Mutation enabled') : ui('Read-only; no stock mutation or alert suppression.')}
                tone={anomalyProductionReviewQuery.data.safety_contract.mutates_inventory ? 'bad' : 'good'}
                iconPath="/reliability-command"
              />
            </div>

            {anomalyProductionReviewQuery.data.summary.total_rows === 0 ? (
              <div className="app-empty-state" style={styles.infoState}>{ui('No anomaly rows were available for reliability review.')}</div>
            ) : anomalyProductionReviewQuery.data.blockers.length || anomalyProductionReviewQuery.data.warnings.length ? (
              <div style={styles.list}>
                {[...anomalyProductionReviewQuery.data.blockers, ...anomalyProductionReviewQuery.data.warnings].map((item) => (
                  <article key={item.code} className="insights-action-card" data-tone={item.severity === 'critical' ? 'bad' : 'warn'} style={item.severity === 'critical' ? styles.actionCardBad : styles.actionCardWarn}>
                    <div style={styles.actionCardTitle}>{localizeInsightsSystemText(item.message, ui)}</div>
                    <div style={styles.itemMeta}>{ui('Affected rows: {count} · Severity {severity}').replace('{count}', formatNumber(item.affected_count, 0)).replace('{severity}', formatReadableStatus(item.severity))}</div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="app-empty-state" style={styles.infoState}>{ui("No blocking anomaly-review issues were found.")}</div>
            )}

            {anomalyProductionReviewQuery.data.summary.total_rows > 0 ? (
              <div className="insights-item-card" style={styles.itemCard}>
                <div style={styles.itemTitle}>{ui("Next actions")}</div>
                <ul style={styles.compactList}>
                  {anomalyProductionReviewQuery.data.next_actions.map((action) => <li key={action}>{localizeInsightsSystemText(action, ui)}</li>)}
                </ul>
              </div>
            ) : null}

            {anomalyProductionReviewQuery.data.rows.slice(0, 8).map((row) => (
              <article key={row.product_id} className="insights-item-card" style={styles.itemCard}>
                <div style={styles.itemTitle}>{row.product_name}</div>
                <div style={styles.itemMeta}>{ui('Anomaly {score} · Tier {tier} · Review severity {severity}').replace('{score}', formatNumber(row.anomaly_score, 0)).replace('{tier}', formatReadableStatus(row.anomaly_tier)).replace('{severity}', formatReadableStatus(row.highest_factor_severity))}</div>
                <div style={styles.itemText}>{row.review_factors.map((factor) => `${localizeInsightsSystemText(factor.label, ui)}: ${localizeInsightsSystemText(factor.detail, ui)}`).join(' ')}</div>
                <ul style={styles.compactList}>
                  {row.recommended_investigation_steps.map((step) => <li key={step}>{localizeInsightsSystemText(step, ui)}</li>)}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title={ui("Unusual inventory movement")} subtitle={ui("Products whose recent outbound activity looks unusual compared to their own baseline.")} iconPath="/stock-movements">
        {anomaliesQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>{ui("Loading anomaly signals...")}</div> : null}
        {anomaliesQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(anomaliesQuery.error, ui('Unknown error'))}</div> : null}
        {anomaliesQuery.data?.rows.length ? (
          <div style={styles.list}>
            {anomaliesQuery.data.rows.slice(0, 10).map((row) => (
              <article key={row.product_id} className="insights-item-card" style={styles.itemCard}>
                <div style={styles.itemTitle}>{row.product_name}</div>
                <div style={styles.itemMeta}>{ui('Anomaly {score} · Tier {tier}').replace('{score}', formatNumber(row.anomaly_score, 0)).replace('{tier}', formatReadableStatus(row.anomaly_tier))}</div>
                <div style={styles.itemText}>
                  {ui('Recent Daily {recent} · Baseline Daily {baseline} · Spike Ratio {ratio}').replace('{recent}', formatNumber(row.recent_daily_outbound)).replace('{baseline}', formatNumber(row.baseline_daily_outbound)).replace('{ratio}', formatNumber(row.spike_ratio))}
                </div>
                {canOpenStockMovements ? (
                  <Link to={`/stock-movements?product_id=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>{ui("Open movements")}</Link>
                ) : null}
              </article>
            ))}
          </div>
        ) : !anomaliesQuery.isLoading && !anomaliesQuery.isError ? <div className="app-empty-state" style={styles.infoState}>{ui("No anomaly rows returned.")}</div> : null}
      </Section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'grid',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  statsGrid: {
    width: '100%',
    minWidth: 0
  },
  supplierSummaryGrid: {
    width: '100%',
    minWidth: 0,
    marginBottom: '14px'
  },
  supplierControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'end',
    marginBottom: '12px',
    minWidth: 0
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '12px',
    marginBottom: '12px'
  },
  statCard: {
    background: '#fff',
    border: '1px solid #dbe4ef',
    borderRadius: '12px',
    padding: '18px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    minWidth: 0
  },
  statTitle: {
    color: '#64748b',
    fontSize: '0.82rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  statValue: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  statValueGood: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#166534'
  },
  statValueWarn: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#b45309'
  },
  statValueBad: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#b91c1c'
  },
  statSubtitle: {
    marginTop: '8px',
    color: '#475569',
    lineHeight: 1.5
  },
  grid: {
    display: 'contents'
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#475569',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  controlRow: {
    minWidth: 0,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'end',
    gap: '12px'
  },
  refreshMeta: {
    display: 'grid',
    gap: '4px',
    color: '#475569',
    fontSize: '0.9rem',
    padding: '8px 0'
  },
  primaryButton: {
    border: '1px solid #1d4ed8',
    background: '#2563eb',
    color: '#fff',
    borderRadius: '10px',
    padding: '11px 15px',
    minHeight: '42px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  label: {
    display: 'grid',
    gap: '8px',
    fontWeight: 600,
    color: '#334155',
    minWidth: 0
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '0.95rem',
    minWidth: '180px',
    maxWidth: '100%'
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '0.95rem',
    minWidth: '240px',
    maxWidth: '100%'
  },
  secondaryButton: {
    alignSelf: 'end',
    whiteSpace: 'nowrap',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '10px',
    padding: '9px 12px',
    minHeight: '38px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  list: {
    display: 'grid',
    gap: '12px',
    minWidth: 0
  },
  actionAgendaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    minWidth: 0
  },
  actionCardBad: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    borderRadius: '12px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardWarn: {
    border: '1px solid #fde68a',
    background: '#fffbeb',
    borderRadius: '12px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardGood: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    borderRadius: '12px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  actionCardText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  actionCardLink: {
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none'
  },
  itemCard: {
    border: '1px solid #dbe4ef',
    borderRadius: '12px',
    padding: '14px',
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  itemTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  itemMeta: {
    color: '#64748b',
    fontSize: '0.88rem',
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  itemText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  keyValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    minWidth: 0
  },
  keyLabel: {
    flexShrink: 0
  },
  keyValue: {
    minWidth: 0,
    flex: '1 1 220px',
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  infoState: {
    margin: 0
  },
  errorState: {
    margin: 0
  },
  inlineActionGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  },
  inlineActionLink: {
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '0.92rem'
  },
  inlineActionButton: {
    padding: '7px 10px',
    fontSize: '0.85rem',
    minHeight: '34px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#0f172a',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  supplierDetailPanel: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    borderRadius: '12px',
    padding: '16px',
    display: 'grid',
    gap: '14px',
    minWidth: 0
  },
  supplierDetailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  supplierDetailGrid: {
    width: '100%',
    minWidth: 0
  },
  supplierDetailBody: {
    display: 'grid',
    gap: '10px',
    background: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
    padding: '14px',
    minWidth: 0
  },
  riskFlagDetailList: {
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  riskFlagDetailItem: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    background: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
    padding: '10px',
    minWidth: 0
  },
  activeFilterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '12px',
    minWidth: 0
  },
  activeFilterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: '999px',
    padding: '5px 8px 5px 10px',
    fontSize: '0.82rem',
    fontWeight: 700,
    maxWidth: '100%'
  },
  chipRemoveButton: {
    border: 0,
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 0
  },
  supplierBreakdownPanel: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '14px',
    display: 'grid',
    gap: '12px',
    minWidth: 0
  },
  supplierBreakdownGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center'
  },
  breakdownButton: {
    padding: '7px 10px',
    fontSize: '0.85rem',
    minHeight: '34px',
    whiteSpace: 'nowrap',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#0f172a',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  supplierDataMetaPanel: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    color: '#475569',
    fontSize: '0.86rem',
    fontWeight: 700,
    marginBottom: '14px',
    minWidth: 0
  },
  supplierActionSummaryPanel: {
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    borderRadius: '12px',
    padding: '14px',
    display: 'grid',
    gap: '12px',
    marginBottom: '14px',
    minWidth: 0
  },
  supplierActionSummaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    minWidth: 0
  },
  supplierActionSummaryItem: {
    border: '1px solid #bfdbfe',
    background: '#fff',
    borderRadius: '12px',
    padding: '10px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    textAlign: 'left',
    cursor: 'pointer',
    minWidth: 0
  },
  supplierActionSummaryText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  compactList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'grid',
    gap: '6px'
  },
  recommendedActionPanel: {
    display: 'grid',
    gap: '10px',
    background: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
    padding: '14px',
    minWidth: 0
  },
  recommendedActionItem: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'start',
    gap: '10px',
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '10px',
    minWidth: 0
  },
  riskFlagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center'
  },
  riskFlagHigh: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#991b1b',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '0.78rem',
    fontWeight: 800
  },
  riskFlagMedium: {
    border: '1px solid #fde68a',
    background: '#fffbeb',
    color: '#92400e',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '0.78rem',
    fontWeight: 800
  },
  riskFlagLow: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '0.78rem',
    fontWeight: 800
  }
};
