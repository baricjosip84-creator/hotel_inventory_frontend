import { formatCurrencyAmount, getActiveTenantCurrency, normalizeCurrencyCode } from '../lib/tenantCurrency';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "../lib/api";
import { getRoleCapabilities, hasPermission, TENANT_PERMISSIONS } from "../lib/permissions";
import {
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs,
} from "../components/ui/OperationalWorkspace";
import { SidebarAttentionMarker, SidebarAttentionTabDot, sidebarAttentionItemStyle } from "../components/ui/SidebarAttentionMarker";
import "./ProcurementRecommendationsPage.css";

type CurrencyTotal = { currency_code: string; amount: number | string };

type RecommendationSummary = {
  total_products?: number | string;
  recommended_count?: number | string;
  critical_count?: number | string;
  high_count?: number | string;
  medium_count?: number | string;
  low_count?: number | string;
  blocked_count?: number | string;
  estimated_total_cost?: number | string | null;
  estimated_total_cost_by_currency?: CurrencyTotal[];
  mixed_currency?: boolean;
  currency?: string | null;
  budget_currency?: string | null;
  budget_limit?: number | string | null;
  budget_variance?: number | string | null;
  budget_remaining_after_recommendation?: number | string | null;
  budget_status?: string | null;
  budget_blocker_code?: string | null;
  budget_blocker_message?: string | null;
};


type ProcurementRecommendationOptionsResponse = {
  generated_at: string;
  tenant_id: string;
  suppliers: Array<{
    id: string;
    name: string;
    email?: string | null;
  }>;
};

type ConfirmationState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone: "primary" | "danger";
  action: () => void;
};

type RecommendationProductionReviewResponse = {
  generated_at: string;
  tenant_id: string;
  production_status: string;
  safety_contract: {
    mode: string;
    mutates_inventory: boolean;
    creates_purchase_orders: boolean;
    approves_recommendations: boolean;
    requires_human_approval_for_execution: boolean;
  };
  readiness_buckets: {
    ready_for_approval: number | string;
    blocked: number | string;
    approved_not_converted: number | string;
    pending_review: number | string;
    high_priority: number | string;
    shortage_window: number | string;
  };
  blockers: Array<{
    code?: string | null;
    severity?: string | null;
    affected_count?: number | string | null;
    message?: string | null;
    required_action?: string | null;
  }>;
  warnings: Array<{
    code?: string | null;
    severity?: string | null;
    affected_count?: number | string | null;
    message?: string | null;
    recommended_action?: string | null;
  }>;
  next_actions: string[];
  evidence_requirements: string[];
  sample_rows: Array<{
    product_id: string;
    product_name?: string | null;
    urgency?: string | null;
    procurement_ready?: boolean;
    recommended_reorder_quantity?: number | string | null;
    recommended_supplier_name?: string | null;
    blocker_code?: string | null;
    supplier_performance_status?: string | null;
    estimated_total_cost?: number | string | null;
    decision_status?: string | null;
    converted_purchase_order_id?: string | null;
  }>;
};

type RecommendationPagination = {
  limit: number | string;
  offset: number | string;
  returned: number | string;
  total: number | string;
  has_more: boolean;
};

type ReplenishmentRecommendation = {
  product_id: string;
  product_name: string;
  product_version?: number | string | null;
  category?: string | null;
  unit?: string | null;
  current_quantity: number | string;
  min_stock: number | string;
  product_min_stock?: number | string | null;
  calculated_min_stock?: number | string | null;
  system_recommended_min_stock?: number | string | null;
  governed_min_stock?: number | string | null;
  min_stock_recommendation_status?: string | null;
  min_stock_confidence_score?: number | string | null;
  min_stock_direction?: string | null;
  min_stock_formula_version?: string | null;
  average_daily_usage: number | string;
  estimated_days_of_coverage: number | string | null;
  projected_depletion_date?: string | null;
  target_coverage_days?: number | string | null;
  target_stock_quantity?: number | string | null;
  gross_open_inbound_quantity?: number | string | null;
  reliable_open_inbound_quantity?: number | string | null;
  at_risk_open_inbound_quantity?: number | string | null;
  current_inventory_position?: number | string | null;
  base_reorder_quantity?: number | string | null;
  moq_adjusted_reorder_quantity?: number | string | null;
  recommended_reorder_quantity: number | string;
  replenishment_plan?: {
    formula_version?: string | null;
    formula?: string | null;
    target_coverage_days?: number | string | null;
    target_stock_quantity?: number | string | null;
    gross_open_inbound_quantity?: number | string | null;
    reliable_open_inbound_quantity?: number | string | null;
    at_risk_open_inbound_quantity?: number | string | null;
    inventory_position?: number | string | null;
    pre_moq_reorder_quantity?: number | string | null;
    min_order_quantity?: number | string | null;
    moq_adjusted_reorder_quantity?: number | string | null;
    units_per_order_package?: number | string | null;
    recommended_order_package_count?: number | string | null;
    recommended_reorder_quantity?: number | string | null;
    warnings?: string[];
    assumptions?: string[];
  };
  order_package_id?: string | null;
  order_package_name?: string | null;
  units_per_order_package?: number | string | null;
  recommended_order_package_count?: number | string | null;
  package_rounding_applied?: boolean;
  package_rounding_added_quantity?: number | string | null;
  urgency: string;
  recommendation_status?: string | null;
  source_signal?: string | null;
  recommended_supplier_id?: string | null;
  recommended_supplier_name?: string | null;
  supplier_source?: string | null;
  supplier_sku?: string | null;
  lead_time_days?: number | string | null;
  effective_lead_time_days?: number | string | null;
  lead_time_configured?: boolean;
  lead_time_buffer_days?: number | string | null;
  min_order_quantity?: number | string | null;
  estimated_unit_cost?: number | string | null;
  estimated_cost_source?: string | null;
  estimated_total_cost?: number | string | null;
  budget_limit?: number | string | null;
  budget_currency?: string | null;
  budget_variance?: number | string | null;
  budget_remaining_after_recommendation?: number | string | null;
  budget_status?: string | null;
  budget_blocker_message?: string | null;
  currency?: string | null;
  last_purchase_unit_cost?: number | string | null;
  last_purchase_currency?: string | null;
  last_purchase_date?: string | null;
  supplier_total_shipments?: number | string | null;
  supplier_received_shipments?: number | string | null;
  supplier_partial_shipments?: number | string | null;
  supplier_open_late_shipments?: number | string | null;
  supplier_last_delivery_date?: string | null;
  supplier_selection_reason?: string | null;
  supplier_selection_confidence?: string | null;
  supplier_performance_status?: string | null;
  supplier_performance_score?: number | string | null;
  procurement_ready?: boolean;
  blocker_code?: string | null;
  blocker_message?: string | null;
  decision_status?: string | null;
  decision_note?: string | null;
  decided_at?: string | null;
  decided_by_user_id?: string | null;
  decision_id?: string | null;
  converted_purchase_order_id?: string | null;
  converted_purchase_order_status?: string | null;
  converted_at?: string | null;
  previous_decision_status?: string | null;
  previous_decision_note?: string | null;
  previous_decided_at?: string | null;
  previous_decision_id?: string | null;
  previous_converted_purchase_order_id?: string | null;
  previous_converted_purchase_order_status?: string | null;
  previous_converted_at?: string | null;
};

type ReplenishmentRecommendationDetail = ReplenishmentRecommendation & {
  detail?: {
    recommendation_key?: string;
    execution_scope?: string;
    can_enter_approval_review?: boolean;
    can_generate_po_draft?: boolean;
    current_conversion_open?: boolean;
    readiness?: string;
    blockers?: Array<{ code?: string | null; message?: string | null }>;
    warnings?: Array<{ code?: string | null; message?: string | null }>;
    reasoning?: string[];
  };
};

type ProcurementRecommendationAttentionSummary = {
  requires_attention: boolean;
  actionable_count: number | string;
  high_risk_pending_decision_count: number | string;
  approved_ready_po_draft_count: number | string;
  approved_recheck_count: number | string;
  attention_product_ids?: string[];
};

type ReplenishmentRecommendationDetailResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number | string;
  target_coverage_days?: number | string;
  lead_time_buffer_days?: number | string;
  row: ReplenishmentRecommendationDetail;
};

type ReplenishmentRecommendationBulkDecisionResponse = {
  generated_at: string;
  tenant_id: string;
  status: "approved" | "rejected" | "deferred";
  requested_count: number | string;
  decided_count: number | string;
  blocked_count: number | string;
  failed_count: number | string;
  results: Array<{
    product_id: string;
    product_name?: string | null;
    status: "decided" | "blocked" | "failed";
    code?: string | null;
    message?: string | null;
    decision?: { id?: string; status?: string; decided_at?: string };
  }>;
};

type RecommendationPoDraftConversionResponse = {
  generated_at: string;
  tenant_id: string;
  requested_count: number | string;
  converted_count: number | string;
  purchase_order_count: number | string;
  estimated_total_cost?: number | string | null;
  estimated_total_cost_by_currency?: CurrencyTotal[];
  mixed_currency?: boolean;
  purchase_orders: Array<{
    purchase_order_id: string;
    po_number: string;
    supplier_id: string;
    supplier_name?: string | null;
    expected_delivery_date?: string | null;
    status: string;
    item_count: number | string;
    currency?: string | null;
    estimated_total_cost?: number | string | null;
  }>;
};

type RecommendationPoDraftReviewResponse = {
  generated_at: string;
  tenant_id: string;
  status: string;
  pagination: RecommendationPagination;
  summary: {
    draft_count: number | string;
    submitted_count: number | string;
    warning_count: number | string;
    estimated_total_cost: number | string | null;
    estimated_total_cost_by_currency?: CurrencyTotal[];
    mixed_currency?: boolean;
  };
  rows: Array<{
    purchase_order_id: string;
    po_number: string;
    currency?: string | null;
    status: string;
    supplier_id: string;
    supplier_name?: string | null;
    expected_delivery_date?: string | null;
    created_at?: string | null;
    submitted_at?: string | null;
    approved_at?: string | null;
    cancelled_at?: string | null;
    item_count: number | string;
    total_quantity: number | string;
    estimated_total_cost: number | string;
    linked_recommendation_count: number | string;
    recommendation_linkage_complete: boolean;
    review_status: string;
    governance_warnings: Array<{
      code?: string | null;
      message?: string | null;
    }>;
    items: Array<{
      product_id?: string | null;
      product_name?: string | null;
      quantity?: number | string | null;
      unit_cost?: number | string | null;
      estimated_total_cost?: number | string | null;
      recommendation_key?: string | null;
      decision_id?: string | null;
      decision_note?: string | null;
      decided_at?: string | null;
      item_notes?: string | null;
    }>;
  }>;
};


type ProcurementExecutionDashboardResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days?: number | string | null;
  summary: {
    recommendation_count: number | string;
    ready_recommendation_count: number | string;
    blocked_recommendation_count: number | string;
    critical_count: number | string;
    high_count: number | string;
    high_risk_count: number | string;
    ready_high_risk_count: number | string;
    pending_high_risk_count: number | string;
    approved_count: number | string;
    converted_count: number | string;
    open_po_draft_count: number | string;
    po_draft_warning_count: number | string;
    estimated_recommendation_spend: number | string | null;
    estimated_recommendation_spend_by_currency?: CurrencyTotal[];
    mixed_recommendation_currency?: boolean;
    open_po_draft_spend: number | string | null;
    open_po_draft_spend_by_currency?: CurrencyTotal[];
    mixed_po_currency?: boolean;
    shortages_preventable_count: number | string;
    po_conversion_evidence_count?: number | string;
    projected_stockout_avoidance_count: number | string;
    pending_procurement_risk_count: number | string;
    execution_risk_score: number | string;
  };
  supplier_execution: Array<{
    supplier_id?: string | null;
    supplier_name: string;
    recommendation_count: number | string;
    ready_count: number | string;
    blocked_count: number | string;
    approved_count: number | string;
    converted_count: number | string;
    estimated_total_cost: number | string | null;
    estimated_total_cost_by_currency?: CurrencyTotal[];
    mixed_recommendation_currency?: boolean;
    open_po_draft_count: number | string;
    open_po_draft_spend: number | string | null;
    open_po_draft_spend_by_currency?: CurrencyTotal[];
    mixed_po_currency?: boolean;
  }>;
  recommendation_aging: {
    buckets: Record<string, number | string>;
    oldest_decisions: Array<{
      product_id: string;
      product_name: string;
      decision_status: string;
      decided_at?: string | null;
      age_days: number | string;
      aging_bucket: string;
      converted_purchase_order_id?: string | null;
    }>;
  };
  risk_highlights: Array<{
    product_id: string;
    product_name: string;
    urgency: string;
    estimated_days_of_coverage?: number | string | null;
    projected_depletion_date?: string | null;
    recommended_reorder_quantity?: number | string | null;
    recommended_supplier_name?: string | null;
    procurement_ready?: boolean;
    decision_status?: string | null;
    converted_purchase_order_id?: string | null;
    blocker_message?: string | null;
  }>;
};


type ProcurementExceptionQueueResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number | string;
  pagination: RecommendationPagination;
  summary: {
    total_exceptions: number | string;
    critical_count: number | string;
    high_count: number | string;
    medium_count: number | string;
    low_count: number | string;
    affected_product_count: number | string;
    affected_supplier_count: number | string;
    by_category?: Record<string, number | string>;
    by_code?: Record<string, number | string>;
  };
  rows: Array<{
    exception_key: string;
    code: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    product_id: string;
    product_name: string;
    supplier_id?: string | null;
    supplier_name?: string | null;
    urgency?: string | null;
    decision_status?: string | null;
    procurement_ready?: boolean;
    recommended_reorder_quantity?: number | string | null;
    estimated_total_cost?: number | string | null;
    currency?: string | null;
    estimated_days_of_coverage?: number | string | null;
    projected_depletion_date?: string | null;
    converted_purchase_order_id?: string | null;
    resolution_hint?: string | null;
    row?: ReplenishmentRecommendationDetail;
  }>;
};


type ProcurementExceptionResolutionResponse = {
  generated_at: string;
  tenant_id: string;
  action: "assign_supplier" | "approve" | "reject" | "defer" | "rerun";
  product_id: string;
  cleared_exception_count: number | string;
  remaining_exception_count: number | string;
  mutation?: unknown;
  before?: { exceptions?: Array<{ code?: string | null; message?: string | null }> };
  after?: { row?: ReplenishmentRecommendationDetail; exceptions?: Array<{ code?: string | null; message?: string | null }> };
  cleared_exceptions?: Array<{ code?: string | null; message?: string | null }>;
  remaining_exceptions?: Array<{ code?: string | null; message?: string | null }>;
};


type ProcurementRecommendationScheduledRunResponse = {
  generated_at: string;
  tenant_id: string;
  schedule_run_id?: string;
  run_mode: string;
  status: string;
  dry_run: boolean;
  auto_approve_ready: boolean;
  convert_to_po_drafts: boolean;
  max_approvals: number | string;
  lookback_days: number | string;
  shortage_window_days?: number | string | null;
  budget_limit?: number | string | null;
  budget_currency?: string | null;
  summary: {
    candidate_count: number | string;
    ready_count: number | string;
    blocked_count: number | string;
    approved_count: number | string;
    po_draft_count: number | string;
    estimated_total_cost?: number | string | null;
    estimated_total_cost_by_currency?: CurrencyTotal[];
    mixed_currency?: boolean;
    currency?: string | null;
    status: string;
  };
  blockers?: Array<{ code?: string | null; message?: string | null }>;
  warnings?: Array<{ code?: string | null; message?: string | null }>;
  plan_rows?: Array<{
    product_id: string;
    product_name?: string | null;
    supplier_name?: string | null;
    urgency?: string | null;
    recommended_reorder_quantity?: number | string | null;
    estimated_total_cost?: number | string | null;
    currency?: string | null;
    readiness?: string | null;
    warnings?: Array<{ code?: string | null; message?: string | null }>;
  }>;
};


type ProcurementExecutionHistoryResponse = {
  generated_at: string;
  tenant_id: string;
  pagination: {
    limit: number | string;
    offset: number | string;
    decision_total: number | string;
    schedule_run_total: number | string;
    returned: number | string;
    has_more: boolean;
  };
  summary: {
    decision_event_count: number | string;
    approved_count: number | string;
    rejected_count: number | string;
    deferred_count: number | string;
    converted_count: number | string;
    scheduled_decision_count: number | string;
    schedule_run_count: number | string;
    dry_run_count: number | string;
    blocked_run_count: number | string;
    po_draft_count: number | string;
    estimated_total_cost?: number | string | null;
    estimated_total_cost_by_currency?: CurrencyTotal[];
    mixed_currency?: boolean;
  };
  decisions: Array<{
    event_type: "recommendation_decision";
    source?: string | null;
    decision_id: string;
    recommendation_key?: string | null;
    product_id?: string | null;
    product_name?: string | null;
    supplier_name?: string | null;
    status: string;
    decision_note?: string | null;
    recommended_reorder_quantity?: number | string | null;
    estimated_total_cost?: number | string | null;
    currency?: string | null;
    urgency?: string | null;
    procurement_ready?: boolean;
    blocker_code?: string | null;
    decided_at?: string | null;
    converted_purchase_order_id?: string | null;
    converted_po_number?: string | null;
    converted_at?: string | null;
  }>;
  schedule_runs: Array<{
    event_type: "scheduled_run";
    schedule_run_id: string;
    run_mode: string;
    status: string;
    candidate_count: number | string;
    ready_count: number | string;
    blocked_count: number | string;
    approved_count: number | string;
    po_draft_count: number | string;
    estimated_total_cost?: number | string | null;
    budget_currency?: string | null;
    estimated_total_cost_by_currency?: Record<string, number | string>;
    created_at?: string | null;
    blockers?: Array<{ code?: string | null; message?: string | null }>;
    warnings?: Array<{ code?: string | null; message?: string | null }>;
  }>;
  timeline: Array<Record<string, unknown> & { event_type?: string; occurred_at?: string | null }>;
};

type ProcurementRecommendationOutcomesResponse = {
  generated_at: string;
  tenant_id: string;
  pagination: RecommendationPagination;
  summary: {
    total: number | string;
    threshold_met_count: number | string;
    received_complete_count: number | string;
    rows_with_post_decision_alerts: number | string;
    by_status: Record<string, number | string>;
  };
  rows: Array<{
    decision_id: string;
    recommendation_key?: string | null;
    product_id?: string | null;
    product_name?: string | null;
    unit?: string | null;
    decision_status: string;
    decision_note?: string | null;
    decided_at?: string | null;
    recommended_reorder_quantity?: number | string | null;
    governed_min_stock_at_decision?: number | string | null;
    current_min_stock?: number | string | null;
    current_quantity?: number | string | null;
    threshold_met: boolean;
    converted_purchase_order_id?: string | null;
    converted_at?: string | null;
    po_number?: string | null;
    purchase_order_status?: string | null;
    expected_delivery_date?: string | null;
    ordered_quantity?: number | string | null;
    received_quantity?: number | string | null;
    fulfillment_ratio?: number | string | null;
    last_received_at?: string | null;
    post_decision_alert_count: number | string;
    outcome_status: string;
  }>;
  safety_contract: {
    read_only: boolean;
    creates_purchase_orders: boolean;
    mutates_inventory: boolean;
    evaluates_recorded_outcomes_only: boolean;
  };
};

type ReplenishmentRecommendationBulkReadinessResponse = {
  generated_at: string;
  tenant_id: string;
  status: "approved" | "rejected" | "deferred";
  lookback_days: number | string;
  summary: {
    requested_count: number | string;
    ready_count: number | string;
    blocked_count: number | string;
    failed_count: number | string;
    warning_count: number | string;
    estimated_total_cost: number | string | null;
    estimated_total_cost_by_currency?: CurrencyTotal[];
    mixed_currency?: boolean;
    budget_limit?: number | string | null;
    budget_currency?: string | null;
    budget_variance?: number | string | null;
    budget_status?: string | null;
    budget_blocker_message?: string | null;
    approval_ready: boolean;
  };
  results: Array<{
    product_id: string;
    product_name?: string | null;
    supplier_name?: string | null;
    readiness: "ready" | "blocked" | "missing";
    can_approve: boolean;
    can_defer: boolean;
    can_reject: boolean;
    recommended_reorder_quantity?: number | string | null;
    moq_adjusted_reorder_quantity?: number | string | null;
    order_package_name?: string | null;
    units_per_order_package?: number | string | null;
    recommended_order_package_count?: number | string | null;
    package_rounding_applied?: boolean;
    package_rounding_added_quantity?: number | string | null;
    estimated_total_cost?: number | string | null;
    currency?: string | null;
    blocker_codes?: string[];
    blockers?: Array<{ code?: string | null; message?: string | null }>;
    warnings?: Array<{ code?: string | null; message?: string | null }>;
  }>;
};

type ReplenishmentRecommendationsResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number | string;
  target_coverage_days?: number | string;
  lead_time_buffer_days?: number | string;
  pagination?: RecommendationPagination;
  summary?: RecommendationSummary;
  rows: ReplenishmentRecommendation[];
};

type ProcurementWorkspaceSection = "overview" | "queue" | "bulk" | "drafts" | "detail" | "advanced";

type RecommendationFilters = {
  lookbackDays: number;
  urgency: string;
  supplierId: string;
  procurementReady: string;
  shortageWindowDays: string;
  search: string;
  budgetLimit: string;
  limit: number;
  offset: number;
};

const DEFAULT_FILTERS: RecommendationFilters = {
  lookbackDays: 30,
  urgency: "",
  supplierId: "",
  procurementReady: "",
  shortageWindowDays: "",
  search: "",
  budgetLimit: "",
  limit: 50,
  offset: 0,
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return formatCurrencyAmount(parsed, currency || getActiveTenantCurrency(), 2);
}


function formatMoneyBreakdown(rows?: CurrencyTotal[] | null, fallbackValue?: number | string | null, fallbackCurrency?: string | null): string {
  const usable = (rows ?? []).filter((row) => row.currency_code && Number.isFinite(Number(row.amount)));
  if (usable.length > 0) return usable.map((row) => formatMoney(row.amount, row.currency_code)).join(' · ');
  return formatMoney(fallbackValue, fallbackCurrency);
}

// Retained for the historical tenant-currency hardening contract; visible multilingual currency uses formatUiMoneyBreakdown.
void formatMoneyBreakdown;
function hasPoDraftCostWarning(po: RecommendationPoDraftReviewResponse["rows"][number]): boolean {
  return toNumber(po.estimated_total_cost) <= 0 || po.governance_warnings.some((warning) => warning.code === "MISSING_ESTIMATED_COST");
}

function buildPurchaseOrderUrl(purchaseOrderId: string): string {
  return `/purchase-orders?purchaseOrderId=${encodeURIComponent(purchaseOrderId)}`;
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isRecommendationRowApprovalReady(row: ReplenishmentRecommendation): boolean {
  return Boolean(
    row.procurement_ready &&
      row.recommended_supplier_id &&
      row.supplier_selection_confidence !== "blocked" &&
      toNumber(row.recommended_reorder_quantity) > 0 &&
      toNumber(row.lead_time_days) >= 0 &&
      row.budget_status !== "over_budget" &&
      !row.converted_purchase_order_id,
  );
}

function getErrorMessage(error: unknown, ui: (englishText: string) => string): string {
  if (error instanceof ApiError) {
    const details = error.details && typeof error.details === "object"
      ? (error.details as { blockers?: Array<{ message?: string | null; code?: string | null }> })
      : null;
    const blockerText = (details?.blockers || [])
      .map((blocker) => blocker.message || blocker.code)
      .filter(Boolean)
      .join("; ");
    return blockerText ? `${error.message}: ${blockerText}` : error.message;
  }
  if (error instanceof Error) return error.message;
  return ui("Unable to load procurement recommendations.");
}

function buildRecommendationsPath(filters: RecommendationFilters): string {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  params.set("limit", String(filters.limit));
  params.set("offset", String(filters.offset));
  params.set("active_only", "true");

  if (filters.urgency) params.set("urgency", filters.urgency);
  if (filters.supplierId) params.set("supplier_id", filters.supplierId);
  if (filters.procurementReady)
    params.set("procurement_ready", filters.procurementReady);
  if (filters.shortageWindowDays)
    params.set("shortage_window_days", filters.shortageWindowDays);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.budgetLimit.trim())
    params.set("budget_limit", filters.budgetLimit.trim());

  return `/reorder-insights/recommendations?${params.toString()}`;
}

async function fetchRecommendations(
  filters: RecommendationFilters,
): Promise<ReplenishmentRecommendationsResponse> {
  return apiRequest<ReplenishmentRecommendationsResponse>(
    buildRecommendationsPath(filters),
  );
}



async function fetchProcurementRecommendationOptions(): Promise<ProcurementRecommendationOptionsResponse> {
  return apiRequest<ProcurementRecommendationOptionsResponse>(
    "/reorder-insights/recommendations/options",
  );
}

async function fetchAllRecommendationRows(
  filters: RecommendationFilters,
): Promise<{ rows: ReplenishmentRecommendation[]; generatedAt?: string; total: number }> {
  const rows: ReplenishmentRecommendation[] = [];
  let offset = 0;
  let generatedAt: string | undefined;
  let total = 0;

  while (rows.length < 5000) {
    const page = await fetchRecommendations({ ...filters, limit: 500, offset });
    generatedAt = page.generated_at || generatedAt;
    total = toNumber(page.pagination?.total);
    rows.push(...(page.rows || []));
    if (!page.pagination?.has_more || page.rows.length === 0) break;
    offset += page.rows.length;
  }

  const exportedRows = rows.slice(0, 5000);
  if (total > exportedRows.length) {
    throw new Error(
      `The filtered result contains ${total} recommendations. Export is limited to 5,000 rows; narrow the filters and try again.`,
    );
  }

  return { rows: exportedRows, generatedAt, total };
}

async function fetchRecommendationProductionReview(
  filters: RecommendationFilters,
): Promise<RecommendationProductionReviewResponse> {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  if (filters.supplierId) params.set("supplier_id", filters.supplierId);
  if (filters.shortageWindowDays) {
    params.set("shortage_window_days", filters.shortageWindowDays);
  }
  if (filters.budgetLimit.trim()) {
    params.set("budget_limit", filters.budgetLimit.trim());
  }
  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  return apiRequest<RecommendationProductionReviewResponse>(
    `/reorder-insights/recommendations/production-review?${params.toString()}`,
  );
}


async function fetchProcurementExecutionDashboard(
  filters: RecommendationFilters,
): Promise<ProcurementExecutionDashboardResponse> {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  if (filters.supplierId) params.set("supplier_id", filters.supplierId);
  if (filters.shortageWindowDays) {
    params.set("shortage_window_days", filters.shortageWindowDays);
  }
  if (filters.budgetLimit.trim()) {
    params.set("budget_limit", filters.budgetLimit.trim());
  }
  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  return apiRequest<ProcurementExecutionDashboardResponse>(
    `/reorder-insights/recommendations/execution-dashboard?${params.toString()}`,
  );
}



async function fetchProcurementExecutionHistory(): Promise<ProcurementExecutionHistoryResponse> {
  return apiRequest<ProcurementExecutionHistoryResponse>(
    "/reorder-insights/recommendations/execution-history?limit=50&offset=0",
  );
}

async function fetchProcurementRecommendationOutcomes(): Promise<ProcurementRecommendationOutcomesResponse> {
  return apiRequest<ProcurementRecommendationOutcomesResponse>(
    "/reorder-insights/recommendations/outcomes?limit=50&offset=0",
  );
}


async function fetchProcurementExceptionQueue(
  filters: RecommendationFilters,
): Promise<ProcurementExceptionQueueResponse> {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  params.set("limit", "50");
  params.set("offset", "0");
  if (filters.supplierId) params.set("supplier_id", filters.supplierId);
  if (filters.shortageWindowDays) {
    params.set("shortage_window_days", filters.shortageWindowDays);
  }
  if (filters.budgetLimit.trim()) {
    params.set("budget_limit", filters.budgetLimit.trim());
  }
  if (filters.search.trim()) {
    params.set("search", filters.search.trim());
  }
  return apiRequest<ProcurementExceptionQueueResponse>(
    `/reorder-insights/recommendations/exceptions?${params.toString()}`,
  );
}


async function resolveProcurementException(
  productId: string,
  filters: RecommendationFilters,
  action: "assign_supplier" | "approve" | "reject" | "defer" | "rerun",
  supplierId?: string,
  note?: string,
): Promise<ProcurementExceptionResolutionResponse> {
  return apiRequest<ProcurementExceptionResolutionResponse>(
    `/reorder-insights/recommendations/exceptions/resolve?${buildRecommendationActionQuery(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        action,
        supplier_id: supplierId?.trim() || undefined,
        note: note || null,
      }),
    },
  );
}

function buildRecommendationDetailPath(
  productId: string,
  filters: RecommendationFilters,
): string {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  if (filters.shortageWindowDays)
    params.set("shortage_window_days", filters.shortageWindowDays);
  if (filters.budgetLimit.trim())
    params.set("budget_limit", filters.budgetLimit.trim());
  return `/reorder-insights/recommendations/${encodeURIComponent(productId)}?${params.toString()}`;
}

async function fetchRecommendationDetail(
  productId: string,
  filters: RecommendationFilters,
): Promise<ReplenishmentRecommendationDetailResponse> {
  return apiRequest<ReplenishmentRecommendationDetailResponse>(
    buildRecommendationDetailPath(productId, filters),
  );
}

async function decideRecommendation(
  productId: string,
  filters: RecommendationFilters,
  status: "approved" | "rejected" | "deferred",
  note?: string,
): Promise<ReplenishmentRecommendationDetailResponse> {
  return apiRequest<ReplenishmentRecommendationDetailResponse>(
    `${buildRecommendationDetailPath(productId, filters).replace(/\?.*$/, "")}/decision?${buildRecommendationActionQuery(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note: note || null }),
    },
  );
}

function buildRecommendationActionQuery(
  filters: RecommendationFilters,
): string {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  if (filters.supplierId) params.set("supplier_id", filters.supplierId);
  if (filters.shortageWindowDays) {
    params.set("shortage_window_days", filters.shortageWindowDays);
  }
  if (filters.budgetLimit.trim()) {
    params.set("budget_limit", filters.budgetLimit.trim());
  }
  return params.toString();
}

async function previewRecommendationsBulk(
  productIds: string[],
  filters: RecommendationFilters,
  status: "approved" | "rejected" | "deferred" = "approved",
): Promise<ReplenishmentRecommendationBulkReadinessResponse> {
  return apiRequest<ReplenishmentRecommendationBulkReadinessResponse>(
    `/reorder-insights/recommendations/bulk-readiness?${buildRecommendationActionQuery(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds, status }),
    },
  );
}

async function decideRecommendationsBulk(
  productIds: string[],
  filters: RecommendationFilters,
  status: "approved" | "rejected" | "deferred",
  note?: string,
): Promise<ReplenishmentRecommendationBulkDecisionResponse> {
  return apiRequest<ReplenishmentRecommendationBulkDecisionResponse>(
    `/reorder-insights/recommendations/bulk-decision?${buildRecommendationActionQuery(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_ids: productIds,
        status,
        note: note || null,
      }),
    },
  );
}

async function fetchRecommendationPoDraftReview(
  offset = 0,
  limit = 25,
): Promise<RecommendationPoDraftReviewResponse> {
  return apiRequest<RecommendationPoDraftReviewResponse>(
    `/reorder-insights/recommendations/po-drafts?status=all&limit=${limit}&offset=${offset}`,
  );
}

async function fetchAllRecommendationPoDraftReview(): Promise<RecommendationPoDraftReviewResponse> {
  const rows: RecommendationPoDraftReviewResponse["rows"] = [];
  let offset = 0;
  let firstPage: RecommendationPoDraftReviewResponse | null = null;
  let total = 0;

  while (rows.length < 5000) {
    const page = await fetchRecommendationPoDraftReview(offset, 200);
    firstPage ||= page;
    total = toNumber(page.pagination.total);
    rows.push(...page.rows);
    if (!page.pagination.has_more || page.rows.length === 0) break;
    offset += page.rows.length;
  }

  const exportedRows = rows.slice(0, 5000);
  if (total > exportedRows.length) {
    throw new Error(
      `The generated purchase-order review contains ${total} records. Export is limited to 5,000 rows; narrow the underlying data set before exporting.`,
    );
  }

  const base = firstPage ?? (await fetchRecommendationPoDraftReview(0, 1));
  return {
    ...base,
    pagination: {
      ...base.pagination,
      limit: exportedRows.length || 1,
      offset: 0,
      returned: exportedRows.length,
      total,
      has_more: false,
    },
    rows: exportedRows,
  };
}

async function convertRecommendationsToPoDrafts(
  productIds: string[],
  filters: RecommendationFilters,
): Promise<RecommendationPoDraftConversionResponse> {
  return apiRequest<RecommendationPoDraftConversionResponse>(
    `/reorder-insights/recommendations/convert-to-po-drafts?${buildRecommendationActionQuery(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    },
  );
}


async function runRecommendationScheduledRun(
  filters: RecommendationFilters,
  options: { dryRun: boolean; autoApproveReady: boolean; convertToPoDrafts: boolean; maxApprovals: number; note?: string },
): Promise<ProcurementRecommendationScheduledRunResponse> {
  return apiRequest<ProcurementRecommendationScheduledRunResponse>(
    `/reorder-insights/recommendations/scheduled-run?${buildRecommendationActionQuery(filters)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dry_run: options.dryRun,
        auto_approve_ready: options.autoApproveReady,
        convert_to_po_drafts: options.convertToPoDrafts,
        max_approvals: options.maxApprovals,
        note: options.note || null,
      }),
    },
  );
}

function neutralizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function csvEscape(value: unknown): string {
  const safe = neutralizeCsvCell(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const body = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportRecommendationRowsCsv({
  rows,
  generatedAt,
  scope,
}: {
  rows: ReplenishmentRecommendation[];
  generatedAt?: string;
  scope: string;
}) {
  const headers = [
    "export_scope",
    "generated_at",
    "product_id",
    "product_name",
    "category",
    "unit",
    "current_quantity",
    "product_min_stock",
    "calculated_min_stock",
    "system_recommended_min_stock",
    "governed_min_stock",
    "min_stock_recommendation_status",
    "min_stock_confidence_score",
    "average_daily_usage",
    "estimated_days_of_coverage",
    "projected_depletion_date",
    "source_signal",
    "urgency",
    "recommendation_status",
    "target_stock_quantity",
    "gross_open_inbound_quantity",
    "reliable_open_inbound_quantity",
    "at_risk_open_inbound_quantity",
    "current_inventory_position",
    "base_reorder_quantity",
    "moq_adjusted_reorder_quantity",
    "recommended_reorder_quantity",
    "order_package_id",
    "order_package_name",
    "units_per_order_package",
    "recommended_order_package_count",
    "package_rounding_applied",
    "package_rounding_added_quantity",
    "recommended_supplier_id",
    "recommended_supplier_name",
    "supplier_source",
    "supplier_sku",
    "supplier_selection_confidence",
    "supplier_selection_reason",
    "supplier_performance_status",
    "supplier_performance_score",
    "supplier_total_shipments",
    "supplier_received_shipments",
    "supplier_partial_shipments",
    "supplier_open_late_shipments",
    "supplier_last_delivery_date",
    "lead_time_days",
    "effective_lead_time_days",
    "lead_time_configured",
    "lead_time_buffer_days",
    "min_order_quantity",
    "estimated_unit_cost",
    "estimated_cost_source",
    "estimated_total_cost",
    "currency",
    "last_purchase_unit_cost",
    "last_purchase_currency",
    "last_purchase_date",
    "budget_limit",
    "budget_status",
    "budget_variance",
    "budget_remaining_after_recommendation",
    "budget_blocker_message",
    "procurement_ready",
    "blocker_code",
    "blocker_message",
    "decision_id",
    "decision_status",
    "decision_note",
    "decided_at",
    "decided_by_user_id",
    "converted_purchase_order_id",
    "converted_at",
  ];
  const csvRows = rows.map((row) => [
    scope,
    generatedAt || "",
    row.product_id,
    row.product_name,
    row.category || "",
    row.unit || "",
    row.current_quantity,
    row.product_min_stock ?? row.min_stock,
    row.calculated_min_stock ?? "",
    row.system_recommended_min_stock ?? "",
    row.governed_min_stock ?? row.min_stock,
    row.min_stock_recommendation_status || "",
    row.min_stock_confidence_score ?? "",
    row.average_daily_usage,
    row.estimated_days_of_coverage ?? "",
    row.projected_depletion_date || "",
    row.source_signal || "",
    row.urgency,
    row.recommendation_status || "",
    row.target_stock_quantity ?? "",
    row.gross_open_inbound_quantity ?? "",
    row.reliable_open_inbound_quantity ?? "",
    row.at_risk_open_inbound_quantity ?? "",
    row.current_inventory_position ?? "",
    row.base_reorder_quantity ?? "",
    row.moq_adjusted_reorder_quantity ?? "",
    row.recommended_reorder_quantity,
    row.order_package_id || "",
    row.order_package_name || "",
    row.units_per_order_package ?? "",
    row.recommended_order_package_count ?? "",
    row.package_rounding_applied ? "yes" : "no",
    row.package_rounding_added_quantity ?? "",
    row.recommended_supplier_id || "",
    row.recommended_supplier_name || "",
    row.supplier_source || "",
    row.supplier_sku || "",
    row.supplier_selection_confidence || "",
    row.supplier_selection_reason || "",
    row.supplier_performance_status || "",
    row.supplier_performance_score ?? "",
    row.supplier_total_shipments ?? "",
    row.supplier_received_shipments ?? "",
    row.supplier_partial_shipments ?? "",
    row.supplier_open_late_shipments ?? "",
    row.supplier_last_delivery_date || "",
    row.lead_time_days ?? "",
    row.effective_lead_time_days ?? "",
    row.lead_time_configured === false ? "no" : "yes",
    row.lead_time_buffer_days ?? "",
    row.min_order_quantity ?? "",
    row.estimated_unit_cost ?? "",
    row.estimated_cost_source || "",
    row.estimated_total_cost ?? "",
    row.currency || "",
    row.last_purchase_unit_cost ?? "",
    row.last_purchase_currency || "",
    row.last_purchase_date || "",
    row.budget_limit ?? "",
    row.budget_status || "",
    row.budget_variance ?? "",
    row.budget_remaining_after_recommendation ?? "",
    row.budget_blocker_message || "",
    row.procurement_ready ? "yes" : "no",
    row.blocker_code || "",
    row.blocker_message || "",
    row.decision_id || "",
    row.decision_status || "pending",
    row.decision_note || "",
    row.decided_at || "",
    row.decided_by_user_id || "",
    row.converted_purchase_order_id || "",
    row.converted_at || "",
  ]);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCsv(
    `procurement-recommendations-${scope}-${stamp}.csv`,
    headers,
    csvRows,
  );
}

function exportPoDraftReviewCsv(payload: RecommendationPoDraftReviewResponse) {
  const headers = [
    "generated_at",
    "po_status_filter",
    "purchase_order_id",
    "po_number",
    "po_status",
    "review_status",
    "supplier_id",
    "supplier_name",
    "expected_delivery_date",
    "created_at",
    "submitted_at",
    "approved_at",
    "cancelled_at",
    "item_count",
    "total_quantity",
    "po_estimated_total_cost",
    "linked_recommendation_count",
    "recommendation_linkage_complete",
    "governance_warning_codes",
    "governance_warning_messages",
    "product_id",
    "product_name",
    "recommended_quantity",
    "unit_cost",
    "line_estimated_total_cost",
    "recommendation_key",
    "decision_id",
    "decision_note",
    "decided_at",
    "line_notes",
  ];

  const rows = payload.rows.flatMap((po) => {
    const warningCodes = po.governance_warnings
      .map((warning) => warning.code || "")
      .filter(Boolean)
      .join("; ");
    const warningMessages = po.governance_warnings
      .map((warning) => warning.message || warning.code || "")
      .filter(Boolean)
      .join("; ");

    const items = po.items.length ? po.items : [null];
    return items.map((item) => [
      payload.generated_at,
      payload.status,
      po.purchase_order_id,
      po.po_number,
      po.status,
      po.review_status,
      po.supplier_id,
      po.supplier_name || "",
      po.expected_delivery_date || "",
      po.created_at || "",
      po.submitted_at || "",
      po.approved_at || "",
      po.cancelled_at || "",
      po.item_count,
      po.total_quantity,
      po.estimated_total_cost,
      po.linked_recommendation_count,
      po.recommendation_linkage_complete ? "yes" : "no",
      warningCodes,
      warningMessages,
      item?.product_id || "",
      item?.product_name || "",
      item?.quantity ?? "",
      item?.unit_cost ?? "",
      item?.estimated_total_cost ?? "",
      item?.recommendation_key || "",
      item?.decision_id || "",
      item?.decision_note || "",
      item?.decided_at || "",
      item?.item_notes || "",
    ]);
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadCsv(
    `procurement-po-draft-review-${payload.status}-${stamp}.csv`,
    headers,
    rows,
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div
      style={{
        ...styles.statCard,
        ...(tone ? styles[`${tone}Stat` as const] : {}),
      }}
    >
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <span
      style={{
        ...styles.badge,
        ...styles[`${tone || "neutral"}Badge` as const],
      }}
    >
      {children}
    </span>
  );
}

export default function ProcurementRecommendationsPage() {
  const navigate = useNavigate();
  const { locale, ui } = useAppTranslation();
  const formatUiNumber = (value: number | string | null | undefined, digits = 2): string => {
    if (value === null || value === undefined || value === "") return "—";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(value);
    return formatLocalizedNumber(parsed, locale, { maximumFractionDigits: digits });
  };
  const formatUiMoney = (value: number | string | null | undefined, currency?: string | null): string => {
    if (value === null || value === undefined || value === "") return "—";
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return String(value);
    return formatLocalizedCurrency(parsed, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 });
  };
  const formatUiMoneyBreakdown = (rows?: CurrencyTotal[] | null, fallbackValue?: number | string | null, fallbackCurrency?: string | null): string => {
    const usable = (rows ?? []).filter((row) => row.currency_code && Number.isFinite(Number(row.amount)));
    if (usable.length > 0) return usable.map((row) => formatUiMoney(row.amount, row.currency_code)).join(" · ");
    return formatUiMoney(fallbackValue, fallbackCurrency);
  };
  const formatUiMoneyRecordBreakdown = (rows?: Record<string, number | string> | null, fallbackValue?: number | string | null, fallbackCurrency?: string | null): string => {
    const usable = Object.entries(rows ?? {}).map(([currency_code, amount]) => ({ currency_code, amount }));
    return formatUiMoneyBreakdown(usable, fallbackValue, fallbackCurrency);
  };
  const formatUiDate = (value: string | null | undefined): string => value ? formatLocalizedDate(value, locale) : "—";
  const formatUiDateTime = (value: string | null | undefined): string => value ? formatLocalizedDateTime(value, locale) : "—";
  const canonicalDisplayLabel = (value: string | null | undefined): string => {
    const normalized = String(value || "").trim().toLowerCase();
    const key = ({
      critical: "Critical", high: "High", medium: "Medium", low: "Low",
      approved: "Approved", rejected: "Rejected", deferred: "Deferred", pending: "Pending",
      draft: "Draft", submitted: "Submitted", cancelled: "Cancelled", completed: "Completed",
      ready: "Ready", blocked: "Blocked", unknown: "Unknown",
      not_configured: "Not configured", within_budget: "Within budget", over_budget: "Over budget", under_budget: "Under budget",
      high_confidence: "High confidence", medium_confidence: "Medium confidence", low_confidence: "Low confidence",
      product_replenishment: "Product replenishment",
      needs_review: "Needs review", needs_cost_review: "Needs cost review", submitted_for_approval: "Submitted for approval", linked: "Linked",
      usage_and_minimum_stock: "Usage and minimum stock", usage_velocity: "Usage velocity", minimum_stock: "Minimum stock", inventory_threshold: "Inventory threshold",
      calculated: "Calculated", no_outbound_history: "No outbound history", limited_history: "Limited history",
      missing_supplier: "Missing supplier", product_default_supplier: "Product default supplier", preferred_catalog_with_current_price: "Preferred catalog with current price",
      preferred_catalog_supplier: "Preferred catalog supplier", product_default_with_purchase_history: "Product default with purchase history",
      late_risk: "Late risk", reliable: "Reliable", watch: "Watch", review: "Review",
      ready_for_controlled_use: "Ready for controlled use", monitor_only: "Monitor only", read_only_review: "Read-only review",
      dry_run: "Dry run", approval_and_po_draft_run: "Approval and PO draft run", approval_run: "Approval run", completed_with_warnings: "Completed with warnings",
      scheduled_run: "Scheduled run", decision_recorded: "Decision recorded", not_approved: "Not approved", approved_awaiting_po: "Approved awaiting PO",
      po_cancelled: "PO cancelled", received_complete: "Received complete", receiving_partial: "Receiving partial", awaiting_receipt: "Awaiting receipt", po_draft_or_review: "PO draft or review",
      supplier: "Supplier", quantity: "Quantity", stock: "Stock", shortage: "Shortage", decision: "Decision", execution: "Execution", cost: "Cost", budget: "Budget", package: "Package", general: "General",
      converted: "Converted", open: "Open", assign_supplier: "Assign supplier", rerun: "Re-run"
    } as Record<string, string>)[normalized];
    return key ? ui(key) : titleCase(value);
  };
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const canApproveRecommendations = capabilities.canApprovePurchaseOrders;
  const canCreatePurchaseOrderDrafts = capabilities.canCreatePurchaseOrders;
  const sidebarAttentionQuery = useQuery({
    queryKey: ["procurement-recommendations", "page-attention-items", canApproveRecommendations, canCreatePurchaseOrderDrafts],
    queryFn: () => apiRequest<ProcurementRecommendationAttentionSummary>("/reorder-insights/recommendations/attention-summary"),
    enabled: canApproveRecommendations || canCreatePurchaseOrderDrafts,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const sidebarAttentionProductIds = useMemo(
    () => new Set(sidebarAttentionQuery.data?.attention_product_ids || []),
    [sidebarAttentionQuery.data?.attention_product_ids],
  );
  const canViewGeneratedPurchaseOrderDrafts = capabilities.canViewPurchaseOrders;
  const canManageProducts = capabilities.canManageProducts;
  const canViewSuppliers = hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ);
  const [filters, setFilters] =
    useState<RecommendationFilters>(DEFAULT_FILTERS);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [decisionNote, setDecisionNote] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkDecisionNote, setBulkDecisionNote] = useState("");
  const [exceptionResolutionNotes, setExceptionResolutionNotes] = useState<Record<string, string>>({});
  const [exceptionSupplierIds, setExceptionSupplierIds] = useState<Record<string, string>>({});
  const [scheduledMaxApprovals, setScheduledMaxApprovals] = useState(25);
  const [scheduledNote, setScheduledNote] = useState("Scheduled procurement recommendation run.");
  const [scheduledConvertToPo, setScheduledConvertToPo] = useState(false);
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [poDraftOffset, setPoDraftOffset] = useState(0);
  const poDraftLimit = 25;
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<ProcurementWorkspaceSection>("overview");
  const queueRef = useRef<HTMLDivElement>(null);
  const bulkRef = useRef<HTMLDivElement>(null);
  const poDraftRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDivElement>(null);

  const optionsQuery = useQuery({
    queryKey: ["procurement-recommendation-options"],
    queryFn: fetchProcurementRecommendationOptions,
    enabled: canViewSuppliers,
  });

  const recommendationsQuery = useQuery({
    queryKey: ["procurement-recommendations", filters],
    queryFn: () => fetchRecommendations(filters),
  });

  const exportFilteredMutation = useMutation({
    mutationFn: () => fetchAllRecommendationRows(filters),
    onSuccess: (payload) => {
      exportRecommendationRowsCsv({
        rows: payload.rows,
        generatedAt: payload.generatedAt,
        scope: "filtered",
      });
    },
  });

  const decisionMutation = useMutation({
    mutationFn: ({
      productId,
      status,
      note,
    }: {
      productId: string;
      status: "approved" | "rejected" | "deferred";
      note?: string;
    }) => decideRecommendation(productId, filters, status, note),
    onSuccess: () => {
      setDecisionNote("");
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendations"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendation-detail"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendation-po-draft-review"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-execution-dashboard"],
      });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-outcomes"] });
    },
  });

  const bulkDecisionMutation = useMutation({
    mutationFn: ({
      productIds,
      status,
      note,
    }: {
      productIds: string[];
      status: "approved" | "rejected" | "deferred";
      note?: string;
    }) => decideRecommendationsBulk(productIds, filters, status, note),
    onSuccess: () => {
      setBulkDecisionNote("");
      setSelectedProductIds([]);
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendations"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendation-detail"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-execution-dashboard"],
      });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-outcomes"] });
    },
  });

  const bulkReadinessMutation = useMutation({
    mutationFn: ({
      productIds,
      status,
    }: {
      productIds: string[];
      status: "approved" | "rejected" | "deferred";
    }) => previewRecommendationsBulk(productIds, filters, status),
  });

  const poDraftConversionMutation = useMutation({
    mutationFn: ({ productIds }: { productIds: string[] }) =>
      convertRecommendationsToPoDrafts(productIds, filters),
    onSuccess: () => {
      setSelectedProductIds([]);
      setPoDraftOffset(0);
      bulkReadinessMutation.reset();
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendations"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendation-detail"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-recommendation-po-draft-review"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["procurement-execution-dashboard"],
      });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-outcomes"] });
    },
  });

  const poDraftReviewQuery = useQuery({
    queryKey: ["procurement-recommendation-po-draft-review", poDraftOffset, poDraftLimit],
    queryFn: () => fetchRecommendationPoDraftReview(poDraftOffset, poDraftLimit),
    enabled: canViewGeneratedPurchaseOrderDrafts,
  });

  const exportPoDraftReviewMutation = useMutation({
    mutationFn: fetchAllRecommendationPoDraftReview,
    onSuccess: exportPoDraftReviewCsv,
  });


  const executionDashboardQuery = useQuery({
    queryKey: [
      "procurement-execution-dashboard",
      filters.lookbackDays,
      filters.shortageWindowDays,
      filters.budgetLimit,
      filters.search,
    ],
    enabled: governanceOpen,
    queryFn: () => fetchProcurementExecutionDashboard(filters),
  });



  const productionReviewQuery = useQuery({
    queryKey: [
      "procurement-recommendation-production-review",
      filters.lookbackDays,
      filters.shortageWindowDays,
      filters.budgetLimit,
      filters.search,
    ],
    enabled: governanceOpen,
    queryFn: () => fetchRecommendationProductionReview(filters),
  });


  const executionHistoryQuery = useQuery({
    queryKey: ["procurement-execution-history"],
    enabled: governanceOpen,
    queryFn: fetchProcurementExecutionHistory,
  });

  const recommendationOutcomesQuery = useQuery({
    queryKey: ["procurement-recommendation-outcomes"],
    enabled: governanceOpen,
    queryFn: fetchProcurementRecommendationOutcomes,
  });


  const exceptionQueueQuery = useQuery({
    queryKey: [
      "procurement-exception-queue",
      filters.lookbackDays,
      filters.shortageWindowDays,
      filters.budgetLimit,
      filters.search,
    ],
    enabled: governanceOpen,
    queryFn: () => fetchProcurementExceptionQueue(filters),
  });


  const exceptionResolutionMutation = useMutation({
    mutationFn: ({
      productId,
      action,
      supplierId,
      note,
    }: {
      productId: string;
      action: "assign_supplier" | "approve" | "reject" | "defer" | "rerun";
      supplierId?: string;
      note?: string;
    }) => resolveProcurementException(productId, filters, action, supplierId, note),
    onSuccess: () => {
      setExceptionResolutionNotes({});
      setExceptionSupplierIds({});
      setSelectedProductIds([]);
      bulkReadinessMutation.reset();
      poDraftConversionMutation.reset();
      void queryClient.invalidateQueries({ queryKey: ["procurement-exception-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-detail"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-po-draft-review"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-outcomes"] });
    },
  });


  const scheduledRunMutation = useMutation({
    mutationFn: ({ dryRun }: { dryRun: boolean }) =>
      runRecommendationScheduledRun(filters, {
        dryRun,
        autoApproveReady: !dryRun,
        convertToPoDrafts: !dryRun && scheduledConvertToPo && canCreatePurchaseOrderDrafts,
        maxApprovals: scheduledMaxApprovals,
        note: scheduledNote,
      }),
    onSuccess: () => {
      setSelectedProductIds([]);
      setPoDraftOffset(0);
      bulkReadinessMutation.reset();
      poDraftConversionMutation.reset();
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-exception-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-po-draft-review"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-outcomes"] });
    },
  });

  const detailQuery = useQuery({
    queryKey: [
      "procurement-recommendation-detail",
      selectedProductId,
      filters.lookbackDays,
      filters.shortageWindowDays,
      filters.budgetLimit,
    ],
    queryFn: () =>
      fetchRecommendationDetail(selectedProductId as string, filters),
    enabled: Boolean(selectedProductId),
  });

  const data = recommendationsQuery.data;
  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const summary: RecommendationSummary = data?.summary ?? {};
  const dashboard = executionDashboardQuery.data;
  const dashboardSummary = dashboard?.summary;
  const productionReview = productionReviewQuery.data;
  const exceptions = exceptionQueueQuery.data;
  const pagination = data?.pagination;

  const highestRiskRows = useMemo(() => {
    const urgencyScore: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return [...rows]
      .filter((row) => ["critical", "high"].includes(row.urgency))
      .sort(
        (a, b) =>
          (urgencyScore[b.urgency] || 0) - (urgencyScore[a.urgency] || 0),
      )
      .slice(0, 5);
  }, [rows]);

  const clearBulkSelectionState = () => {
    setSelectedProductIds([]);
    bulkReadinessMutation.reset();
    poDraftConversionMutation.reset();
  };

  const setFilter = <K extends keyof RecommendationFilters>(
    key: K,
    value: RecommendationFilters[K],
  ) => {
    clearBulkSelectionState();
    setFilters((current) => ({
      ...current,
      [key]: value,
      offset: key === "offset" ? Number(value) : 0,
    }));
  };

  const canPrevious = filters.offset > 0;
  const canNext = Boolean(pagination?.has_more);
  const totalRows = toNumber(pagination?.total ?? rows.length);
  const selectedDetail = detailQuery.data?.row;
  const selectedRows = rows.filter((row) =>
    selectedProductIds.includes(row.product_id),
  );
  const approvableSelectedCount = selectedRows.filter(
    isRecommendationRowApprovalReady,
  ).length;
  const poConvertibleSelectedCount = selectedRows.filter(
    (row) =>
      isRecommendationRowApprovalReady(row) &&
      row.decision_status === "approved",
  ).length;
  const bulkReadiness = bulkReadinessMutation.data;
  const approvalPreviewReady = Boolean(bulkReadiness?.summary?.approval_ready);
  const resolvingExceptionKey = exceptionResolutionMutation.variables
    ? `${exceptionResolutionMutation.variables.productId}:${exceptionResolutionMutation.variables.action}`
    : null;
  const updateExceptionNote = (exceptionKey: string, value: string) => {
    setExceptionResolutionNotes((current) => ({ ...current, [exceptionKey]: value }));
  };
  const updateExceptionSupplierId = (exceptionKey: string, value: string) => {
    setExceptionSupplierIds((current) => ({ ...current, [exceptionKey]: value }));
  };
  const requestConfirmation = (next: ConfirmationState) => {
    setConfirmation(next);
  };

  const resolveException = (
    exception: ProcurementExceptionQueueResponse["rows"][number],
    action: "assign_supplier" | "approve" | "reject" | "defer" | "rerun",
  ) => {
    exceptionResolutionMutation.mutate({
      productId: exception.product_id,
      action,
      supplierId: exceptionSupplierIds[exception.exception_key],
      note: exceptionResolutionNotes[exception.exception_key],
    });
  };
  const toggleSelectedProduct = (productId: string, checked: boolean) => {
    setSelectedProductIds((current) =>
      checked
        ? [...new Set([...current, productId])]
        : current.filter((id) => id !== productId),
    );
    bulkReadinessMutation.reset();
    poDraftConversionMutation.reset();
  };
  const selectPageReady = () => {
    setSelectedProductIds(
      rows
        .filter(isRecommendationRowApprovalReady)
        .map((row) => row.product_id),
    );
    bulkReadinessMutation.reset();
    poDraftConversionMutation.reset();
  };

  const navigateWorkspaceSection = (section: ProcurementWorkspaceSection, target: HTMLElement | null) => {
    setActiveWorkspaceSection(section);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="procurement-recommendations-page io-operational-page io-workspace-page" id="procurement-recommendations-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/procurement-recommendations"
        eyebrow={ui("Procurement")}
        title={ui("Procurement recommendations")}
        description={ui("Review replenishment needs, choose what should be ordered, and turn approved recommendations into purchase order drafts without changing stock directly.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Human approval")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Transfer-before-buy aware")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>
                          {ui("Generated {date}").replace("{date}", data?.generated_at ? formatUiDateTime(data.generated_at) : "—")}
                        </OperationalWorkspaceMetaPill>
                      </>
                    
          */
        }
        aside={
          <div className="procurement-recommendations-hero-actions">
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={() => {
                clearBulkSelectionState();
                void recommendationsQuery.refetch();
                void optionsQuery.refetch();
                if (canViewGeneratedPurchaseOrderDrafts) void poDraftReviewQuery.refetch();
                if (governanceOpen) {
                  void executionDashboardQuery.refetch();
                  void productionReviewQuery.refetch();
                  void executionHistoryQuery.refetch();
                  void recommendationOutcomesQuery.refetch();
                  void exceptionQueueQuery.refetch();
                }
              }}
            >
              {ui("Refresh")}
            </button>
            <button
              type="button"
              className="app-button app-button--primary"
              onClick={() => navigate('/replenishment-planning')}
            >
              {ui("Check transfers first")}
            </button>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui("Procurement recommendation summary")}>
        <OperationalWorkspaceStatCard
          label={ui("Active recommendations")}
          value={formatUiNumber(summary.recommended_count ?? 0, 0)}
          helper={ui("Current products suggested for replenishment")}
          tone={toNumber(summary.recommended_count) > 0 ? "blue" : "neutral"}
          iconPath="/procurement-recommendations"
          loading={recommendationsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Critical")}
          value={formatUiNumber(summary.critical_count ?? 0, 0)}
          helper={ui("Highest urgency recommendations")}
          tone={toNumber(summary.critical_count) > 0 ? "danger" : "good"}
          iconPath="/alerts"
          loading={recommendationsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Blocked")}
          value={formatUiNumber(summary.blocked_count ?? 0, 0)}
          helper={ui("Recommendations missing required buying evidence")}
          tone={toNumber(summary.blocked_count) > 0 ? "warn" : "good"}
          iconPath="/alerts"
          loading={recommendationsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Recommendation spend")}
          value={formatUiMoneyBreakdown(summary.estimated_total_cost_by_currency, summary.estimated_total_cost, summary.currency)}
          helper={ui("Estimated value of the filtered recommendations")}
          tone="neutral"
          iconPath="/purchase-orders"
          loading={recommendationsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Budget status")}
          value={canonicalDisplayLabel(summary.budget_status || "not_configured")}
          helper={summary.budget_status === "not_configured" ? ui("No procurement budget limit is configured") : ui("Budget check for the current recommendation scope")}
          tone={summary.budget_status === "over_budget" ? "danger" : summary.budget_status === "within_budget" ? "good" : "neutral"}
          iconPath="/reports"
          loading={recommendationsQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("Procurement recommendation work areas")} hint={ui("Jump to the part of the procurement workflow you need.")}>
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === "overview"}
          iconPath="/dashboard"
          label={ui("Overview")}
          onClick={() => navigateWorkspaceSection("overview", document.getElementById("procurement-recommendations-workspace-top"))}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === "queue"}
          iconPath="/procurement-recommendations"
          label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{ui("Recommendations")}{sidebarAttentionQuery.data?.requires_attention ? <SidebarAttentionTabDot label={ui("Attention required")} /> : null}</span>}
          count={totalRows}
          onClick={() => navigateWorkspaceSection("queue", queueRef.current)}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === "bulk"}
          iconPath="/execution-requests"
          label={ui("Bulk actions")}
          count={selectedProductIds.length || undefined}
          disabled={rows.length === 0}
          onClick={() => navigateWorkspaceSection("bulk", bulkRef.current)}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === "drafts"}
          iconPath="/purchase-orders"
          label={ui("PO drafts")}
          count={canViewGeneratedPurchaseOrderDrafts ? toNumber(poDraftReviewQuery.data?.pagination.total) : undefined}
          onClick={() => navigateWorkspaceSection("drafts", poDraftRef.current)}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === "detail"}
          iconPath="/audit"
          label={ui("Recommendation detail")}
          disabled={!selectedProductId}
          onClick={() => navigateWorkspaceSection("detail", detailRef.current)}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === "advanced"}
          iconPath="/reliability-command"
          label={ui("Advanced controls")}
          onClick={() => {
            setGovernanceOpen(true);
            navigateWorkspaceSection("advanced", advancedRef.current);
          }}
        />
      </OperationalWorkspaceTabs>

      <div ref={queueRef} className="procurement-recommendations-scroll-anchor">
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Recommendation filters")}</h2>
            <p style={styles.panelSubtitle}>
              {ui("Focus the queue by product, urgency, supplier, and readiness. More technical planning filters stay tucked away.")}
            </p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => {
              clearBulkSelectionState();
              setFilters(DEFAULT_FILTERS);
            }}
          >
            {ui("Reset")}
          </button>
        </div>
        <div className="procurement-recommendations-primary-filters">
          <label style={styles.label}>
            {ui("Search")}
            <input
              style={styles.input}
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder={ui("Product, supplier, SKU...")}
            />
          </label>
          <label style={styles.label}>
            {ui("Urgency")}
            <select
              style={styles.input}
              value={filters.urgency}
              onChange={(event) => setFilter("urgency", event.target.value)}
            >
              <option value="">{ui("All urgencies")}</option>
              <option value="critical">{ui("Critical")}</option>
              <option value="high">{ui("High")}</option>
              <option value="medium">{ui("Medium")}</option>
              <option value="low">{ui("Low")}</option>
            </select>
          </label>
          {canViewSuppliers ? (
            <label style={styles.label}>
              {ui("Supplier")}
              <select
                style={styles.input}
                value={filters.supplierId}
                onChange={(event) => setFilter("supplierId", event.target.value)}
              >
                <option value="">{ui("All suppliers")}</option>
                {(optionsQuery.data?.suppliers || []).map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label style={styles.label}>
            {ui("Readiness")}
            <select
              style={styles.input}
              value={filters.procurementReady}
              onChange={(event) => setFilter("procurementReady", event.target.value)}
            >
              <option value="">{ui("All recommendations")}</option>
              <option value="true">{ui("Supplier assigned")}</option>
              <option value="false">{ui("Supplier missing")}</option>
            </select>
          </label>
        </div>

        <details className="procurement-recommendations-advanced-filters">
          <summary>{ui("Advanced planning filters")}</summary>
          <div className="procurement-recommendations-advanced-filter-grid">
            <label style={styles.label}>
              {ui("Shortage window")}
              <select
                style={styles.input}
                value={filters.shortageWindowDays}
                onChange={(event) => setFilter("shortageWindowDays", event.target.value)}
              >
                <option value="">{ui("Any")}</option>
                <option value="7">{ui('≤ {count} days').replace('{count}', formatLocalizedNumber(7, locale))}</option>
                <option value="14">{ui('≤ {count} days').replace('{count}', formatLocalizedNumber(14, locale))}</option>
                <option value="30">{ui('≤ {count} days').replace('{count}', formatLocalizedNumber(30, locale))}</option>
                <option value="60">{ui('≤ {count} days').replace('{count}', formatLocalizedNumber(60, locale))}</option>
              </select>
            </label>
            <label style={styles.label}>
              {ui("Budget limit")}
              <input
                style={styles.input}
                type="number"
                min={0}
                step="0.01"
                value={filters.budgetLimit}
                onChange={(event) => setFilter("budgetLimit", event.target.value)}
                placeholder={ui("Optional spend cap")}
              />
            </label>
            <label style={styles.label}>
              {ui("Usage lookback")}
              <input
                style={styles.input}
                type="number"
                min={1}
                max={90}
                value={filters.lookbackDays}
                onChange={(event) => setFilter("lookbackDays", Number(event.target.value) || 30)}
              />
            </label>
            <label style={styles.label}>
              {ui("Rows per page")}
              <select
                style={styles.input}
                value={filters.limit}
                onChange={(event) => setFilter("limit", Number(event.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </details>
        {optionsQuery.isError ? (
          <div style={styles.errorBox}>{ui("Supplier filters could not be loaded: {error}").replace("{error}", getErrorMessage(optionsQuery.error, ui))}</div>
        ) : null}
        <div className="procurement-recommendations-helper-note">
          {ui("Supplier assignment is only the first readiness check. Cost, lead time, package, budget, and supplier performance can still block approval or PO creation.")}
        </div>
      </section>
      </div>

      {recommendationsQuery.isLoading ? (
        <div style={styles.infoBox}>{ui("Loading procurement recommendations...")}</div>
      ) : null}
      {recommendationsQuery.isError ? (
        <div style={styles.errorBox}>
          {getErrorMessage(recommendationsQuery.error, ui)}
        </div>
      ) : null}
      {exportFilteredMutation.isError ? (
        <div style={styles.errorBox}>{ui("Filtered export failed: {error}").replace("{error}", getErrorMessage(exportFilteredMutation.error, ui))}</div>
      ) : null}

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Recommendation queue")}</h2>
            <p style={styles.panelSubtitle}>
              {ui("{count} matching active recommendation(s) · showing {from}–{to}")
                .replace("{count}", formatUiNumber(totalRows, 0))
                .replace("{from}", formatUiNumber(rows.length ? filters.offset + 1 : 0, 0))
                .replace("{to}", formatUiNumber(filters.offset + rows.length, 0))}
            </p>
          </div>
          <div style={styles.paginationControls}>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={rows.length === 0 || exportFilteredMutation.isPending}
              onClick={() => exportFilteredMutation.mutate()}
            >
              {exportFilteredMutation.isPending ? ui("Preparing export...") : ui("Export filtered CSV")}
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={selectedRows.length === 0}
              onClick={() =>
                exportRecommendationRowsCsv({
                  rows: selectedRows,
                  generatedAt: data?.generated_at,
                  scope: "selected",
                })
              }
            >
              {ui("Export selected CSV")}
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canPrevious}
              onClick={() =>
                setFilter("offset", Math.max(0, filters.offset - filters.limit))
              }
            >
              {ui("Previous")}
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canNext}
              onClick={() =>
                setFilter("offset", filters.offset + filters.limit)
              }
            >
              {ui("Next")}
            </button>
          </div>
        </div>

        <div className="procurement-recommendations-table-wrap">
          <table className="procurement-recommendations-table">
            <thead>
              <tr>
                <th>{ui("Select")}</th>
                <th>{ui("Product")}</th>
                <th>{ui("Urgency")}</th>
                <th>{ui("Stock & coverage")}</th>
                <th>{ui("Recommended order")}</th>
                <th>{ui("Supplier")}</th>
                <th>{ui("Estimated cost")}</th>
                <th>{ui("Readiness")}</th>
                <th>{ui("Decision")}</th>
                <th>{ui("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const causesSidebarAttention = sidebarAttentionProductIds.has(row.product_id);
                return (
                <tr
                  key={row.product_id}
                  className={selectedProductId === row.product_id ? "is-selected" : undefined}
                  style={causesSidebarAttention ? sidebarAttentionItemStyle : undefined}
                  data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(row.product_id)}
                      onChange={(event) => toggleSelectedProduct(row.product_id, event.target.checked)}
                      aria-label={ui("Select {name}").replace("{name}", row.product_name)}
                    />
                  </td>
                  <td>
                    {causesSidebarAttention ? <div style={{ marginBottom: 6 }}><SidebarAttentionMarker label={ui('Attention required')} /></div> : null}
                    <div className="procurement-recommendations-product-name">{row.product_name}</div>
                    <div className="procurement-recommendations-cell-note">
                      {row.category || ui("Uncategorized")} · {row.unit || ui("unit")}
                    </div>
                  </td>
                  <td>
                    <Badge
                      tone={row.urgency === "critical" ? "bad" : row.urgency === "high" || row.urgency === "medium" ? "warn" : "good"}
                    >
                      {canonicalDisplayLabel(row.urgency)}
                    </Badge>
                  </td>
                  <td>
                    <div className="procurement-recommendations-cell-main">
                      {ui("{quantity} {unit} on hand").replace("{quantity}", formatUiNumber(row.current_quantity)).replace("{unit}", row.unit || "")}
                    </div>
                    <div className="procurement-recommendations-cell-note">
                      {row.estimated_days_of_coverage === null
                        ? ui("Coverage unavailable")
                        : ui("{days} days coverage").replace("{days}", formatUiNumber(row.estimated_days_of_coverage))}
                    </div>
                    {toNumber(row.reliable_open_inbound_quantity) > 0 ? (
                      <div className="procurement-recommendations-cell-note">
                        + {ui("{quantity} reliable inbound").replace("{quantity}", formatUiNumber(row.reliable_open_inbound_quantity))}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <div className="procurement-recommendations-cell-main">
                      {formatUiNumber(row.recommended_reorder_quantity)} {row.unit || ""}
                    </div>
                    <div className="procurement-recommendations-cell-note">
                      {ui("Target {quantity}").replace("{quantity}", formatUiNumber(row.target_stock_quantity))}
                      {toNumber(row.min_order_quantity) > 0 ? ` · ${ui("MOQ {quantity}").replace("{quantity}", formatUiNumber(row.min_order_quantity))}` : ""}
                    </div>
                    {row.package_rounding_applied ? (
                      <div className="procurement-recommendations-cell-warning">{ui("Package rounding applied")}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className="procurement-recommendations-cell-main">
                      {row.recommended_supplier_name || ui("Not assigned")}
                    </div>
                    <div className="procurement-recommendations-cell-note">
                      {ui("{level} confidence").replace("{level}", canonicalDisplayLabel(row.supplier_selection_confidence || "unknown"))}
                    </div>
                    {row.lead_time_configured === false ? (
                      <div className="procurement-recommendations-cell-warning">{ui("Lead time missing")}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className="procurement-recommendations-cell-main">
                      {formatUiMoney(row.estimated_total_cost, row.currency)}
                    </div>
                    <div className="procurement-recommendations-cell-note">
                      {ui("{status} budget").replace("{status}", canonicalDisplayLabel(row.budget_status || "not_configured"))}
                    </div>
                  </td>
                  <td>
                    <Badge tone={row.procurement_ready ? "good" : "bad"}>
                      {row.procurement_ready ? ui("Ready for review") : ui("Needs setup")}
                    </Badge>
                    {row.blocker_message ? (
                      <div className="procurement-recommendations-cell-blocker">{row.blocker_message}</div>
                    ) : null}
                  </td>
                  <td>
                    <Badge
                      tone={row.decision_status === "approved" ? "good" : row.decision_status === "rejected" ? "bad" : row.decision_status === "deferred" ? "warn" : "neutral"}
                    >
                      {canonicalDisplayLabel(row.decision_status || "pending")}
                    </Badge>
                    {row.converted_purchase_order_id ? (
                      <div className="procurement-recommendations-cell-note">{ui("PO draft created")}</div>
                    ) : null}
                  </td>
                  <td>
                    <button
                      className="app-button app-button--secondary app-button--compact"
                      type="button"
                      onClick={() => {
                        setSelectedProductId(row.product_id);
                        navigateWorkspaceSection("detail", detailRef.current);
                      }}
                    >
                      {ui("Review")}
                    </button>
                  </td>
                </tr>
                );
              })}
              {!recommendationsQuery.isLoading && rows.length === 0 ? (
                <tr>
                  <td className="procurement-recommendations-empty-cell" colSpan={10}>
                    {ui("No procurement recommendations match the current filters.")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <div ref={bulkRef} className="procurement-recommendations-scroll-anchor">
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Bulk actions")}</h2>
            <p style={styles.panelSubtitle}>
              {ui("Select recommendations from the current page, run readiness preview, then approve, defer, or reject in one governed action.")}
            </p>
          </div>
          <div style={styles.actionRow}>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={selectPageReady}
              disabled={rows.length === 0}
            >
              {ui("Select page-ready candidates")}
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={clearBulkSelectionState}
              disabled={selectedProductIds.length === 0}
            >
              {ui("Clear")}
            </button>
          </div>
        </div>
        <div style={styles.bulkGrid}>
          <StatCard
            label={ui("Selected")}
            value={formatUiNumber(selectedProductIds.length, 0)}
          />
          <StatCard
            label={ui("Ready to approve")}
            value={formatUiNumber(approvableSelectedCount, 0)}
            tone={
              approvableSelectedCount === selectedProductIds.length &&
              selectedProductIds.length > 0
                ? "good"
                : selectedProductIds.length > 0
                  ? "warn"
                  : undefined
            }
          />
          <StatCard
            label={ui("Approved for PO draft")}
            value={formatUiNumber(poConvertibleSelectedCount, 0)}
            tone={
              poConvertibleSelectedCount > 0 &&
              poConvertibleSelectedCount === selectedProductIds.length
                ? "good"
                : selectedProductIds.length > 0
                  ? "warn"
                  : undefined
            }
          />
          <StatCard
            label={ui("Blocked selected")}
            value={formatUiNumber(
              Math.max(0, selectedProductIds.length - approvableSelectedCount),
              0,
            )}
            tone={
              selectedProductIds.length - approvableSelectedCount > 0
                ? "bad"
                : "good"
            }
          />
        </div>
        <label style={{ ...styles.label, marginTop: 12 }}>
          {ui("Bulk decision note")}
          <textarea
            style={styles.textarea}
            value={bulkDecisionNote}
            onChange={(event) => setBulkDecisionNote(event.target.value)}
            placeholder={ui("Optional note applied to every selected recommendation")}
          />
        </label>
        {!canApproveRecommendations ? (
          <div style={styles.infoBox}>{ui("Purchase order approval permission is required for bulk readiness, bulk approval, defer, and reject actions.")}</div>
        ) : null}
        {!canCreatePurchaseOrderDrafts ? (
          <div style={styles.infoBox}>{ui("Purchase order create permission is required to convert approved recommendations into PO drafts.")}</div>
        ) : null}
        {bulkReadinessMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(bulkReadinessMutation.error, ui)}
          </div>
        ) : null}
        {bulkDecisionMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(bulkDecisionMutation.error, ui)}
          </div>
        ) : null}
        {bulkReadiness ? (
          <div
            style={
              bulkReadiness.summary.approval_ready
                ? styles.infoBox
                : styles.errorBox
            }
          >
            {ui("Readiness preview: {ready} ready, {blocked} blocked, {failed} failed, {warnings} warnings · estimated spend {spend}.")
              .replace("{ready}", formatUiNumber(bulkReadiness.summary.ready_count, 0))
              .replace("{blocked}", formatUiNumber(bulkReadiness.summary.blocked_count, 0))
              .replace("{failed}", formatUiNumber(bulkReadiness.summary.failed_count, 0))
              .replace("{warnings}", formatUiNumber(bulkReadiness.summary.warning_count, 0))
              .replace("{spend}", formatUiMoneyBreakdown(bulkReadiness.summary.estimated_total_cost_by_currency, bulkReadiness.summary.estimated_total_cost, bulkReadiness.summary.budget_currency))}
            {bulkReadiness.summary.budget_status &&
            bulkReadiness.summary.budget_status !== "not_configured" ? (
              <>
                {" "}
                {ui("Budget: {status} ({variance} variance).").replace("{status}", canonicalDisplayLabel(bulkReadiness.summary.budget_status)).replace("{variance}", formatUiMoney(bulkReadiness.summary.budget_variance, bulkReadiness.summary.budget_currency))}
              </>
            ) : null}
            {bulkReadiness.results.some((row) => !row.can_approve) ? (
              <ul style={styles.reasonList}>
                {bulkReadiness.results
                  .filter((row) => !row.can_approve)
                  .slice(0, 5)
                  .map((row) => (
                    <li key={`bulk-preview-${row.product_id}`}>
                      {row.product_name || row.product_id}:{" "}
                      {(row.blockers || [])
                        .map((blocker) => blocker.message || blocker.code)
                        .join("; ") || ui("Not approvable")}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {bulkDecisionMutation.data ? (
          <div style={styles.infoBox}>
            {ui("Bulk decision complete: {decided} decided, {blocked} blocked, {failed} failed.")
              .replace("{decided}", formatUiNumber(bulkDecisionMutation.data.decided_count, 0))
              .replace("{blocked}", formatUiNumber(bulkDecisionMutation.data.blocked_count, 0))
              .replace("{failed}", formatUiNumber(bulkDecisionMutation.data.failed_count, 0))}
          </div>
        ) : null}
        {poDraftConversionMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(poDraftConversionMutation.error, ui)}
          </div>
        ) : null}
        {poDraftConversionMutation.data ? (
          <div style={styles.infoBox}>
            {ui("PO draft conversion complete: {recommendations} recommendations converted into {orders} draft PO(s).")
              .replace("{recommendations}", formatUiNumber(poDraftConversionMutation.data.converted_count, 0))
              .replace("{orders}", formatUiNumber(poDraftConversionMutation.data.purchase_order_count, 0))}
            <ul style={styles.reasonList}>
              {poDraftConversionMutation.data.purchase_orders.map((po) => (
                <li key={po.purchase_order_id} style={styles.conversionResultItem}>
                  <span>
                    {po.po_number} · {po.supplier_name || ui("Supplier unavailable")} · {ui("{count} item(s)").replace("{count}", formatUiNumber(po.item_count, 0))} · {formatUiMoney(po.estimated_total_cost, po.currency)}
                  </span>
                  <button
                    type="button"
                    style={styles.inlineActionButton}
                    onClick={() => navigate(buildPurchaseOrderUrl(po.purchase_order_id))}
                  >
                    {ui("Open draft")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div style={styles.actionRow}>
          <button
            className="app-button app-button--secondary"
            type="button"
            disabled={
              !canApproveRecommendations ||
              selectedProductIds.length === 0 || bulkReadinessMutation.isPending
            }
            onClick={() =>
              bulkReadinessMutation.mutate({
                productIds: selectedProductIds,
                status: "approved",
              })
            }
          >
            {ui("Preview approval readiness")}
          </button>
          <button
            className="app-button app-button--primary"
            type="button"
            disabled={
              !canApproveRecommendations ||
              selectedProductIds.length === 0 ||
              !approvalPreviewReady ||
              bulkDecisionMutation.isPending
            }
            onClick={() =>
              requestConfirmation({
                title: ui("Approve {count} recommendation(s)?").replace("{count}", formatUiNumber(selectedProductIds.length, 0)),
                message: ui("This records approval decisions only after the server rechecks every selected recommendation under transaction locks."),
                confirmLabel: ui("Bulk approve"),
                tone: "primary",
                action: () =>
                  bulkDecisionMutation.mutate({
                    productIds: selectedProductIds,
                    status: "approved",
                    note: bulkDecisionNote,
                  }),
              })
            }
          >
            {ui("Bulk approve")}
          </button>
          <button
            className="app-button app-button--primary"
            type="button"
            disabled={
              !canCreatePurchaseOrderDrafts ||
              selectedProductIds.length === 0 ||
              poConvertibleSelectedCount !== selectedProductIds.length ||
              poDraftConversionMutation.isPending
            }
            onClick={() =>
              requestConfirmation({
                title: ui("Create purchase order draft(s) from {count} approval(s)?").replace("{count}", formatUiNumber(selectedProductIds.length, 0)),
                message: ui("The server rechecks approved supplier, quantity, cost, package, and threshold evidence under transaction locks before creating supplier-grouped purchase order drafts. Stock is not changed."),
                confirmLabel: ui("Create PO drafts"),
                tone: "primary",
                action: () =>
                  poDraftConversionMutation.mutate({
                    productIds: selectedProductIds,
                  }),
              })
            }
          >
            {ui("Create PO draft(s)")}
          </button>
          <button
            className="app-button app-button--secondary"
            type="button"
            disabled={
              !canApproveRecommendations ||
              selectedProductIds.length === 0 || bulkDecisionMutation.isPending
            }
            onClick={() =>
              bulkDecisionMutation.mutate({
                productIds: selectedProductIds,
                status: "deferred",
                note: bulkDecisionNote,
              })
            }
          >
            {ui("Bulk defer")}
          </button>
          <button
            className="app-button app-button--danger"
            type="button"
            disabled={
              !canApproveRecommendations ||
              selectedProductIds.length === 0 || bulkDecisionMutation.isPending
            }
            onClick={() =>
              requestConfirmation({
                title: ui("Reject {count} recommendation(s)?").replace("{count}", formatUiNumber(selectedProductIds.length, 0)),
                message: ui("This records a rejection decision for every selected recommendation."),
                confirmLabel: ui("Bulk reject"),
                tone: "danger",
                action: () =>
                  bulkDecisionMutation.mutate({
                    productIds: selectedProductIds,
                    status: "rejected",
                    note: bulkDecisionNote,
                  }),
              })
            }
          >
            {ui("Bulk reject")}
          </button>
        </div>
      </section>

      </div>

      <div ref={poDraftRef} className="procurement-recommendations-scroll-anchor">
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Purchase order drafts")}</h2>
            <p style={styles.panelSubtitle}>
              {ui("Review purchase order drafts created from approved recommendations before they move through the normal purchase order lifecycle.")}
            </p>
          </div>
          <div style={styles.actionGroup}>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canViewGeneratedPurchaseOrderDrafts || toNumber(poDraftReviewQuery.data?.pagination.total) === 0 || exportPoDraftReviewMutation.isPending}
              onClick={() => exportPoDraftReviewMutation.mutate()}
            >
              {exportPoDraftReviewMutation.isPending ? ui("Preparing export...") : ui("Export draft CSV")}
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canViewGeneratedPurchaseOrderDrafts}
              onClick={() => void poDraftReviewQuery.refetch()}
            >
              {ui("Refresh drafts")}
            </button>
          </div>
        </div>
        {!canViewGeneratedPurchaseOrderDrafts ? (
          <div style={styles.infoBox}>{ui("Purchase order read permission is required to load recommendation-generated PO draft review data.")}</div>
        ) : null}
        {poDraftReviewQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading generated PO drafts...")}</div>
        ) : null}
        {poDraftReviewQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(poDraftReviewQuery.error, ui)}
          </div>
        ) : null}
        {exportPoDraftReviewMutation.isError ? (
          <div style={styles.errorBox}>{ui("PO draft export failed: {error}").replace("{error}", getErrorMessage(exportPoDraftReviewMutation.error, ui))}</div>
        ) : null}
        {poDraftReviewQuery.data ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label={ui("Loaded drafts")}
                value={formatUiNumber(
                  poDraftReviewQuery.data.summary.draft_count,
                  0,
                )}
                tone={
                  toNumber(poDraftReviewQuery.data.summary.draft_count) > 0
                    ? "warn"
                    : undefined
                }
              />
              <StatCard
                label={ui("Loaded submitted")}
                value={formatUiNumber(
                  poDraftReviewQuery.data.summary.submitted_count,
                  0,
                )}
              />
              <StatCard
                label={ui("Loaded warnings")}
                value={formatUiNumber(
                  poDraftReviewQuery.data.summary.warning_count,
                  0,
                )}
                tone={
                  toNumber(poDraftReviewQuery.data.summary.warning_count) > 0
                    ? "bad"
                    : "good"
                }
              />
              <StatCard
                label={ui("Loaded spend")}
                value={formatUiMoneyBreakdown(
                  poDraftReviewQuery.data.summary.estimated_total_cost_by_currency,
                  poDraftReviewQuery.data.summary.estimated_total_cost,
                )}
              />
            </div>
            {toNumber(poDraftReviewQuery.data.summary.warning_count) > 0 ? (
              <div style={styles.commercialWarningBox}>
                {ui("Commercial review required: one or more generated PO drafts have missing or zero item costs. Open the draft in Purchase Orders, edit the draft line costs, then submit or approve it from the normal PO lifecycle.")}
              </div>
            ) : null}
            <div style={{ ...styles.tableWrap, marginTop: 12 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("PO draft")}</th>
                    <th style={styles.th}>{ui("Supplier")}</th>
                    <th style={styles.th}>{ui("Status")}</th>
                    <th style={styles.th}>{ui("Items")}</th>
                    <th style={styles.th}>{ui("Estimated spend")}</th>
                    <th style={styles.th}>{ui("Source link")}</th>
                    <th style={styles.th}>{ui("Warnings")}</th>
                    <th style={styles.th}>{ui("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {poDraftReviewQuery.data.rows.map((po) => (
                    <tr key={po.purchase_order_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.primaryText}>{po.po_number}</div>
                        <div style={styles.mutedText}>
                          {ui("Created {date}").replace("{date}", formatUiDateTime(po.created_at))}
                        </div>
                        <div style={styles.mutedText}>
                          {ui("Expected {date}").replace("{date}", po.expected_delivery_date ? formatUiDate(po.expected_delivery_date) : ui("Not set"))}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {po.supplier_name || po.supplier_id}
                      </td>
                      <td style={styles.td}>
                        <Badge
                          tone={
                            po.status === "draft"
                              ? "warn"
                              : po.status === "cancelled"
                                ? "bad"
                                : "good"
                          }
                        >
                          {hasPoDraftCostWarning(po) && po.status === "draft" ? ui("Needs cost review") : canonicalDisplayLabel(po.review_status || po.status)}
                        </Badge>
                      </td>
                      <td style={styles.td}>
                        <div>{ui("{count} item(s)").replace("{count}", formatUiNumber(po.item_count, 0))}</div>
                        <div style={styles.mutedText}>
                          {ui("Qty {quantity}").replace("{quantity}", formatUiNumber(po.total_quantity))}
                        </div>
                        <ul style={styles.reasonList}>
                          {po.items.slice(0, 3).map((item) => (
                            <li
                              key={`${po.purchase_order_id}-${item.product_id}`}
                            >
                              {item.product_name || item.product_id}:{" "}
                              {formatUiNumber(item.quantity)} @{" "}
                              {formatUiMoney(item.unit_cost, po.currency)}
                            </li>
                          ))}
                          {po.items.length > 3 ? (
                            <li>{ui("+{count} more").replace("{count}", formatUiNumber(po.items.length - 3, 0))}</li>
                          ) : null}
                        </ul>
                      </td>
                      <td style={styles.td}>
                        {formatUiMoney(po.estimated_total_cost, po.currency)}
                      </td>
                      <td style={styles.td}>
                        <Badge
                          tone={
                            po.recommendation_linkage_complete ? "good" : "bad"
                          }
                        >
                          {po.recommendation_linkage_complete
                            ? "Linked"
                            : "Needs review"}
                        </Badge>
                        <div style={styles.mutedText}>
                          {ui("{linked} / {total} linked")
                            .replace("{linked}", formatUiNumber(po.linked_recommendation_count, 0))
                            .replace("{total}", formatUiNumber(po.item_count, 0))}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {po.governance_warnings.length === 0 ? (
                          <Badge tone="good">{ui("Clear")}</Badge>
                        ) : (
                          <ul style={styles.reasonList}>
                            {po.governance_warnings.map((warning) => (
                              <li
                                key={`${po.purchase_order_id}-${warning.code}`}
                              >
                                {warning.message || warning.code}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.primaryButton}
                          onClick={() => navigate(buildPurchaseOrderUrl(po.purchase_order_id))}
                        >
                          {ui("Open purchase order")}
                        </button>
                        {hasPoDraftCostWarning(po) ? (
                          <div style={styles.blockerText}>{ui("Enter positive item costs in Purchase Orders before submitting this draft.")}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {poDraftReviewQuery.data.rows.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={8}>
                        {ui("No recommendation-generated PO drafts found.")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div style={styles.paginationFooter}>
              <span style={styles.mutedText}>
                {ui("Showing {start}–{end} of {total} generated purchase order(s)")
                  .replace("{start}", formatUiNumber(poDraftReviewQuery.data.rows.length ? poDraftOffset + 1 : 0, 0))
                  .replace("{end}", formatUiNumber(poDraftOffset + poDraftReviewQuery.data.rows.length, 0))
                  .replace("{total}", formatUiNumber(poDraftReviewQuery.data.pagination.total, 0))}
              </span>
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  disabled={poDraftOffset === 0 || poDraftReviewQuery.isFetching}
                  onClick={() => setPoDraftOffset(Math.max(0, poDraftOffset - poDraftLimit))}
                >
                  {ui("Previous")}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  disabled={!poDraftReviewQuery.data.pagination.has_more || poDraftReviewQuery.isFetching}
                  onClick={() => setPoDraftOffset(poDraftOffset + poDraftLimit)}
                >
                  {ui("Next")}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      </div>

      <div ref={detailRef} className="procurement-recommendations-scroll-anchor">
      <section style={styles.detailPanel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Recommendation detail")}</h2>
            <p style={styles.panelSubtitle}>
              {ui("Review the selected product's stock need, supplier evidence, cost, and approval readiness.")}
            </p>
          </div>
          {selectedProductId ? (
            <div style={styles.actionRow}>
              <button
                style={styles.secondaryButton}
                type="button"
                disabled={!selectedDetail}
                onClick={() =>
                  selectedDetail
                    ? exportRecommendationRowsCsv({
                        rows: [selectedDetail],
                        generatedAt: detailQuery.data?.generated_at,
                        scope: "detail",
                      })
                    : undefined
                }
              >
                {ui("Export detail CSV")}
              </button>
              <button
                style={styles.secondaryButton}
                type="button"
                onClick={() => setSelectedProductId(null)}
              >
                {ui("Close")}
              </button>
            </div>
          ) : null}
        </div>

        {!selectedProductId ? (
          <div style={styles.infoBox}>
            {ui("Select “Review” on a recommendation row to see the full buying evidence and available actions.")}
          </div>
        ) : null}
        {selectedProductId && detailQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading recommendation detail...")}</div>
        ) : null}
        {selectedProductId && detailQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(detailQuery.error, ui)}
          </div>
        ) : null}

        {selectedDetail ? (
          <div style={styles.detailGrid}>
            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Product")}</div>
              <h3 style={styles.detailTitle}>{selectedDetail.product_name}</h3>
              <p style={styles.riskText}>
                {selectedDetail.category || ui("Uncategorized")} ·{" "}
                {selectedDetail.unit || ui("unit")} ·{" "}
                {canonicalDisplayLabel(selectedDetail.source_signal)}
              </p>
              <Badge tone={selectedDetail.procurement_ready ? "good" : "bad"}>
                {selectedDetail.procurement_ready ? ui("Supplier assigned") : ui("Supplier missing")}
              </Badge>
              <p style={styles.riskText}>
                {ui("Execution scope:")}{" "}
                {canonicalDisplayLabel(
                  selectedDetail.detail?.execution_scope ||
                    "product_replenishment",
                )}
              </p>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Depletion reasoning")}</div>
              <div style={styles.metricLine}>
                <strong>{ui("ADU:")}</strong>{" "}
                {ui("{value} {unit}/day")
                  .replace("{value}", formatUiNumber(selectedDetail.average_daily_usage))
                  .replace("{unit}", selectedDetail.unit || ui("unit"))}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Coverage:")}</strong>{" "}
                {selectedDetail.estimated_days_of_coverage === null
                  ? ui("No usage signal")
                  : ui("{count} days").replace("{count}", formatUiNumber(selectedDetail.estimated_days_of_coverage))}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Projected depletion:")}</strong>{" "}
                {formatUiDate(selectedDetail.projected_depletion_date)}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Lead time + buffer:")}</strong>{" "}
                {selectedDetail.lead_time_configured === false
                  ? ui("Missing lead time · effective {effective} + buffer {buffer} day(s)")
                      .replace("{effective}", formatUiNumber(toNumber(selectedDetail.effective_lead_time_days), 0))
                      .replace("{buffer}", formatUiNumber(toNumber(selectedDetail.lead_time_buffer_days ?? detailQuery.data?.lead_time_buffer_days), 0))
                  : ui("{count} days").replace(
                      "{count}",
                      formatUiNumber(
                        toNumber(selectedDetail.lead_time_days) +
                          toNumber(selectedDetail.lead_time_buffer_days ?? detailQuery.data?.lead_time_buffer_days),
                        0,
                      ),
                    )}
              </div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Threshold and supply position")}</div>
              <div style={styles.metricLine}><strong>{ui("Current stock:")}</strong> {formatUiNumber(selectedDetail.current_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Current product minimum:")}</strong> {formatUiNumber(selectedDetail.product_min_stock ?? selectedDetail.min_stock)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Calculated threshold:")}</strong> {formatUiNumber(selectedDetail.system_recommended_min_stock ?? selectedDetail.calculated_min_stock)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Governed threshold:")}</strong> {formatUiNumber(selectedDetail.governed_min_stock ?? selectedDetail.min_stock)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Threshold evidence:")}</strong> {formatUiNumber(toNumber(selectedDetail.min_stock_confidence_score) * 100, 0)}% · {canonicalDisplayLabel(selectedDetail.min_stock_recommendation_status)}</div>
              <div style={styles.metricLine}><strong>{ui("Gross open inbound:")}</strong> {formatUiNumber(selectedDetail.gross_open_inbound_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Reliable inbound counted:")}</strong> {formatUiNumber(selectedDetail.reliable_open_inbound_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("At-risk inbound excluded:")}</strong> {formatUiNumber(selectedDetail.at_risk_open_inbound_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Inventory position:")}</strong> {formatUiNumber(selectedDetail.current_inventory_position)} {selectedDetail.unit || ""}</div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Separate reorder plan")}</div>
              <div style={styles.metricLine}><strong>{ui("Target coverage:")}</strong> {ui("{count} days").replace("{count}", formatUiNumber(selectedDetail.target_coverage_days ?? detailQuery.data?.target_coverage_days, 0))}</div>
              <div style={styles.metricLine}><strong>{ui("Target stock:")}</strong> {formatUiNumber(selectedDetail.target_stock_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Need before MOQ:")}</strong> {formatUiNumber(selectedDetail.base_reorder_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("MOQ-adjusted need:")}</strong> {formatUiNumber(selectedDetail.moq_adjusted_reorder_quantity)} {selectedDetail.unit || ""}</div>
              <div style={styles.metricLine}><strong>{ui("Recommended order:")}</strong> {formatUiNumber(selectedDetail.recommended_reorder_quantity)} {selectedDetail.unit || ""}</div>
              <p style={styles.riskText}>{ui("Package size and MOQ affect this order quantity only; they do not inflate the minimum-stock threshold.")}</p>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Budget governance")}</div>
              <div style={styles.metricLine}>
                <strong>{ui("Status:")}</strong>{" "}
                {canonicalDisplayLabel(selectedDetail.budget_status || "not_configured")}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Limit:")}</strong>{" "}
                {formatUiMoney(selectedDetail.budget_limit, selectedDetail.budget_currency)}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Remaining:")}</strong>{" "}
                {formatUiMoney(
                  selectedDetail.budget_remaining_after_recommendation,
                  selectedDetail.budget_currency,
                )}
              </div>
              {selectedDetail.budget_blocker_message ? (
                <p style={styles.blockerText}>
                  {selectedDetail.budget_blocker_message}
                </p>
              ) : null}
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Supplier reasoning")}</div>
              <div style={styles.metricLine}>
                <strong>{ui("Supplier:")}</strong>{" "}
                {selectedDetail.recommended_supplier_name || "-"}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Confidence:")}</strong>{" "}
                {canonicalDisplayLabel(selectedDetail.supplier_selection_confidence)}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Reason:")}</strong>{" "}
                {canonicalDisplayLabel(selectedDetail.supplier_selection_reason)}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Performance:")}</strong>{" "}
                {canonicalDisplayLabel(selectedDetail.supplier_performance_status)}{" "}
                {selectedDetail.supplier_performance_score !== null &&
                selectedDetail.supplier_performance_score !== undefined
                  ? `· ${formatUiNumber(selectedDetail.supplier_performance_score, 0)}`
                  : ""}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Last purchase:")}</strong>{" "}
                {formatUiDate(selectedDetail.last_purchase_date)} ·{" "}
                {formatUiMoney(
                  selectedDetail.last_purchase_unit_cost,
                  selectedDetail.last_purchase_currency ||
                    selectedDetail.currency,
                )}
              </div>
            </div>

            <div style={styles.detailCardWide}>
              <div style={styles.statLabel}>{ui("Approval decision")}</div>
              <div style={styles.metricLine}>
                <strong>{ui("Status:")}</strong>{" "}
                {canonicalDisplayLabel(selectedDetail.decision_status || "pending")}
              </div>
              {selectedDetail.decided_at ? (
                <div style={styles.metricLine}>
                  <strong>{ui("Decided:")}</strong>{" "}
                  {formatUiDateTime(selectedDetail.decided_at)}
                </div>
              ) : null}
              {selectedDetail.decision_note ? (
                <div style={styles.metricLine}>
                  <strong>{ui("Last note:")}</strong> {selectedDetail.decision_note}
                </div>
              ) : null}
              {selectedDetail.converted_purchase_order_id ? (
                <div style={styles.metricLine}>
                  <strong>{ui("PO draft:")}</strong>{" "}
                  <button
                    type="button"
                    style={styles.linkButton}
                    onClick={() => navigate(buildPurchaseOrderUrl(selectedDetail.converted_purchase_order_id as string))}
                  >
                    {ui("Open in Purchase Orders")}
                  </button>
                  {selectedDetail.converted_at
                    ? ` · ${formatUiDateTime(selectedDetail.converted_at)}`
                    : ""}
                </div>
              ) : null}
              {selectedDetail.previous_converted_purchase_order_id ? (
                <div style={styles.infoBox}>
                  <strong>{ui("Previous procurement cycle:")}</strong>{" "}
                  <button
                    type="button"
                    style={styles.linkButton}
                    onClick={() => navigate(buildPurchaseOrderUrl(selectedDetail.previous_converted_purchase_order_id as string))}
                  >
                    {ui("Open previous purchase order")}
                  </button>
                  {selectedDetail.previous_converted_purchase_order_status
                    ? ` · ${canonicalDisplayLabel(selectedDetail.previous_converted_purchase_order_status)}`
                    : ""}
                  <div style={styles.mutedText}>
                    {ui("That purchase order is closed. The current stock need is a new recommendation cycle and requires a new decision.")}
                  </div>
                </div>
              ) : null}
              <label style={{ ...styles.label, marginTop: 10 }}>
                {ui("Decision note")}
                <textarea
                  style={styles.textarea}
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder={ui("Optional approval, rejection, or defer note")}
                  disabled={!canApproveRecommendations || Boolean(selectedDetail.detail?.current_conversion_open)}
                />
              </label>
              {!canApproveRecommendations ? (
                <div style={styles.infoBox}>{ui("Purchase order approval permission is required to approve, defer, or reject this recommendation.")}</div>
              ) : null}
              {decisionMutation.isError ? (
                <div style={styles.errorBox}>
                  {getErrorMessage(decisionMutation.error, ui)}
                </div>
              ) : null}
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  type="button"
                  disabled={
                    !canApproveRecommendations ||
                    !selectedDetail.detail?.can_enter_approval_review ||
                    decisionMutation.isPending
                  }
                  onClick={() =>
                    requestConfirmation({
                      title: ui("Approve recommendation?"),
                      message: ui("The server rechecks approval readiness under a transaction lock, then records the current commercial snapshot. Purchase order creation remains a separate action."),
                      confirmLabel: ui("Approve"),
                      tone: "primary",
                      action: () =>
                        decisionMutation.mutate({
                          productId: selectedDetail.product_id,
                          status: "approved",
                          note: decisionNote,
                        }),
                    })
                  }
                >
                  {ui("Approve")}
                </button>
                <button
                  style={styles.secondaryButton}
                  type="button"
                  disabled={!canApproveRecommendations || Boolean(selectedDetail.detail?.current_conversion_open) || decisionMutation.isPending}
                  onClick={() =>
                    decisionMutation.mutate({
                      productId: selectedDetail.product_id,
                      status: "deferred",
                      note: decisionNote,
                    })
                  }
                >
                  {ui("Defer")}
                </button>
                <button
                  style={styles.dangerButton}
                  type="button"
                  disabled={!canApproveRecommendations || Boolean(selectedDetail.detail?.current_conversion_open) || decisionMutation.isPending}
                  onClick={() =>
                    requestConfirmation({
                      title: ui("Reject recommendation?"),
                      message: ui("This records a rejection decision for the current recommendation evidence."),
                      confirmLabel: ui("Reject"),
                      tone: "danger",
                      action: () =>
                        decisionMutation.mutate({
                          productId: selectedDetail.product_id,
                          status: "rejected",
                          note: decisionNote,
                        }),
                    })
                  }
                >
                  {ui("Reject")}
                </button>
              </div>
              {!selectedDetail.detail?.can_enter_approval_review ? (
                <p style={styles.blockerText}>
                  {ui("Approval is blocked until the current recommendation passes all row-level readiness checks. Review the blockers below.")}
                </p>
              ) : null}
            </div>

            <div style={styles.detailCardWide}>
              <div style={styles.statLabel}>{ui("Recommendation explanation")}</div>
              <ul style={styles.reasonList}>
                {(selectedDetail.detail?.reasoning || []).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
                {selectedDetail.detail?.blockers?.map((blocker) => (
                  <li
                    key={`${blocker.code}-${blocker.message}`}
                    style={styles.blockerText}
                  >
                    {blocker.message || blocker.code}
                  </li>
                ))}
                {selectedDetail.detail?.warnings?.map((warning) => (
                  <li key={`warning-${warning.code}-${warning.message}`} style={styles.warningText}>
                    {warning.message || warning.code}
                  </li>
                ))}
              </ul>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>{ui("Cost and conversion")}</div>
              <div style={styles.metricLine}>
                <strong>{ui("Unit cost:")}</strong>{" "}
                {formatUiMoney(
                  selectedDetail.estimated_unit_cost,
                  selectedDetail.currency,
                )}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Total cost:")}</strong>{" "}
                {formatUiMoney(
                  selectedDetail.estimated_total_cost,
                  selectedDetail.currency,
                )}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("MOQ:")}</strong>{" "}
                {formatUiNumber(selectedDetail.min_order_quantity)}{" "}
                {selectedDetail.unit || ""}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Order package:")}</strong>{" "}
                {selectedDetail.order_package_name || ui("Base unit")}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Package count:")}</strong>{" "}
                {formatUiNumber(
                  selectedDetail.recommended_order_package_count,
                  0,
                )}{" "}
                × {formatUiNumber(selectedDetail.units_per_order_package || 1)}{" "}
                {selectedDetail.unit || ui("unit(s)")}
              </div>
              {selectedDetail.package_rounding_applied ? (
                <div style={styles.metricLine}>
                  <strong>{ui("Package rounding:")}</strong> +
                  {formatUiNumber(selectedDetail.package_rounding_added_quantity)}{" "}
                  {selectedDetail.unit || ""}
                </div>
              ) : null}
              <div style={styles.metricLine}>
                <strong>{ui("Approval readiness:")}</strong>{" "}
                {selectedDetail.detail?.can_enter_approval_review ? ui("Ready") : ui("Blocked")}
              </div>
              <div style={styles.metricLine}>
                <strong>{ui("Approved and eligible for PO-draft conversion:")}</strong>{" "}
                {selectedDetail.detail?.can_generate_po_draft ? ui("Yes") : ui("No")}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Priority review")}</h2>
            <p style={styles.panelSubtitle}>
              {ui("The most urgent recommendations in the current queue, summarized for quick review.")}
            </p>
          </div>
        </div>
        <div style={styles.riskGrid}>
          {highestRiskRows.map((row) => (
            <article key={`risk-${row.product_id}`} style={styles.riskCard}>
              <div style={styles.riskCardHeader}>
                <strong>{row.product_name}</strong>
                <Badge tone={row.urgency === "critical" ? "bad" : "warn"}>
                  {canonicalDisplayLabel(row.urgency)}
                </Badge>
              </div>
              <p style={styles.riskText}>
                {row.estimated_days_of_coverage === null
                  ? ui("Coverage cannot be projected.")
                  : ui("{count} days of coverage remain.").replace("{count}", formatUiNumber(row.estimated_days_of_coverage))}
              </p>
              <p style={styles.riskText}>
                {ui("Recommend {quantity} {unit} from {supplier}.")
                  .replace("{quantity}", formatUiNumber(row.recommended_reorder_quantity))
                  .replace("{unit}", row.unit || ui("units"))
                  .replace("{supplier}", row.recommended_supplier_name || ui("unassigned supplier"))}
              </p>
              <p style={styles.riskText}>
                {ui("Supplier confidence: {confidence} · {performance}.")
                  .replace("{confidence}", canonicalDisplayLabel(row.supplier_selection_confidence || "unknown"))
                  .replace("{performance}", canonicalDisplayLabel(row.supplier_performance_status || "unknown"))}
              </p>
              {row.package_rounding_applied ? (
                <p style={styles.riskText}>
                  {ui("Package governance rounded the order to {count} pack(s).").replace("{count}", formatUiNumber(row.recommended_order_package_count, 0))}
                </p>
              ) : null}
            </article>
          ))}
          {!recommendationsQuery.isLoading && highestRiskRows.length === 0 ? (
            <div style={styles.infoBox}>
              {ui("No active high-risk recommendations to summarize.")}
            </div>
          ) : null}
        </div>
      </section>

      <div ref={advancedRef} className="procurement-recommendations-scroll-anchor">
      <details
        style={styles.governanceDetails}
        open={governanceOpen}
        onToggle={(event) => setGovernanceOpen(event.currentTarget.open)}
      >
        <summary style={styles.governanceSummary}>
          <span>{ui("Advanced procurement controls")}</span>
          <span style={styles.mutedText}>{ui("Scheduling, exception handling, execution history, and operational review")}</span>
        </summary>
        <div style={styles.governanceContent}>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Procurement execution dashboard")}</h2>
            <p style={styles.panelSubtitle}>{ui("Execution-level view of shortage response, pending risk, supplier workload, generated PO drafts, and recommendation aging.")}</p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void executionDashboardQuery.refetch()}
          >
            {ui("Refresh dashboard")}
          </button>
        </div>
        {executionDashboardQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading execution dashboard…")}</div>
        ) : null}
        {executionDashboardQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(executionDashboardQuery.error, ui)}
          </div>
        ) : null}
        {dashboardSummary ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label={ui("Shortages preventable")}
                value={formatUiNumber(
                  dashboardSummary.shortages_preventable_count,
                  0,
                )}
                tone={
                  toNumber(dashboardSummary.shortages_preventable_count) > 0
                    ? "warn"
                    : "good"
                }
              />
              <StatCard
                label={ui("PO conversions recorded")}
                value={formatUiNumber(
                  dashboardSummary.po_conversion_evidence_count ?? dashboardSummary.projected_stockout_avoidance_count,
                  0,
                )}
                tone="good"
              />
              <StatCard
                label={ui("Pending risk")}
                value={formatUiNumber(
                  dashboardSummary.pending_procurement_risk_count,
                  0,
                )}
                tone={
                  toNumber(dashboardSummary.pending_procurement_risk_count) > 0
                    ? "bad"
                    : "good"
                }
              />
              <StatCard
                label={ui("Open PO drafts")}
                value={formatUiNumber(dashboardSummary.open_po_draft_count, 0)}
                tone={
                  toNumber(dashboardSummary.po_draft_warning_count) > 0
                    ? "warn"
                    : undefined
                }
              />
              <StatCard
                label={ui("Open draft spend")}
                value={formatUiMoneyBreakdown(dashboardSummary.open_po_draft_spend_by_currency, dashboardSummary.open_po_draft_spend)}
              />
              <StatCard
                label={ui("Execution risk score")}
                value={formatUiNumber(dashboardSummary.execution_risk_score, 0)}
                tone={
                  toNumber(dashboardSummary.execution_risk_score) > 25
                    ? "bad"
                    : toNumber(dashboardSummary.execution_risk_score) > 10
                      ? "warn"
                      : "good"
                }
              />
            </div>
            <div style={styles.dashboardColumns}>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>{ui("Supplier execution")}</div>
                <div style={styles.compactList}>
                  {(dashboard?.supplier_execution || []).slice(0, 6).map((supplier) => (
                    <div
                      key={supplier.supplier_id || supplier.supplier_name}
                      style={styles.compactListRow}
                    >
                      <div>
                        <strong>{supplier.supplier_name}</strong>
                        <div style={styles.mutedText}>
                          {ui("{recommendations} recs · {ready} ready · {blocked} blocked · {drafts} draft(s)")
                            .replace("{recommendations}", formatUiNumber(supplier.recommendation_count, 0))
                            .replace("{ready}", formatUiNumber(supplier.ready_count, 0))
                            .replace("{blocked}", formatUiNumber(supplier.blocked_count, 0))
                            .replace("{drafts}", formatUiNumber(supplier.open_po_draft_count, 0))}
                        </div>
                      </div>
                      <div style={styles.primaryText}>
                        {formatUiMoneyBreakdown(supplier.estimated_total_cost_by_currency, supplier.estimated_total_cost)}
                      </div>
                    </div>
                  ))}
                  {!dashboard?.supplier_execution?.length ? (
                    <div style={styles.mutedText}>{ui("No supplier workload to show.")}</div>
                  ) : null}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>{ui("Risk highlights")}</div>
                <div style={styles.compactList}>
                  {(dashboard?.risk_highlights || []).slice(0, 6).map((risk) => (
                    <div key={`dashboard-risk-${risk.product_id}`} style={styles.compactListRow}>
                      <div>
                        <strong>{risk.product_name}</strong>
                        <div style={styles.mutedText}>
                          {canonicalDisplayLabel(risk.urgency)} · {risk.estimated_days_of_coverage === null || risk.estimated_days_of_coverage === undefined ? ui("No coverage") : ui("{count} days").replace("{count}", formatUiNumber(risk.estimated_days_of_coverage))} · {risk.recommended_supplier_name || ui("No supplier")}
                        </div>
                        {risk.blocker_message ? (
                          <div style={styles.blockerText}>{risk.blocker_message}</div>
                        ) : null}
                      </div>
                      <Badge tone={risk.procurement_ready ? "good" : "bad"}>
                        {risk.procurement_ready ? ui("Ready") : ui("Blocked")}
                      </Badge>
                    </div>
                  ))}
                  {!dashboard?.risk_highlights?.length ? (
                    <div style={styles.mutedText}>{ui("No high-risk procurement highlights.")}</div>
                  ) : null}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>{ui("Recommendation aging")}</div>
                <div style={styles.metricLine}>
                  <strong>{ui("0–2 days:")}</strong> {formatUiNumber(dashboard.recommendation_aging.buckets["0_2_days"], 0)} · <strong>{ui("3–6 days:")}</strong> {formatUiNumber(dashboard.recommendation_aging.buckets["3_6_days"], 0)} · <strong>{ui("7–13 days:")}</strong> {formatUiNumber(dashboard.recommendation_aging.buckets["7_13_days"], 0)} · <strong>{ui("14+ days:")}</strong> {formatUiNumber(dashboard.recommendation_aging.buckets["14_plus_days"], 0)}
                </div>
                <div style={styles.compactList}>
                  {dashboard.recommendation_aging.oldest_decisions.slice(0, 4).map((row) => (
                    <div key={`aging-${row.product_id}-${row.decided_at}`} style={styles.compactListRow}>
                      <div>
                        <strong>{row.product_name}</strong>
                        <div style={styles.mutedText}>
                          {ui("{status} · {count} days old")
                            .replace("{status}", canonicalDisplayLabel(row.decision_status))
                            .replace("{count}", formatUiNumber(row.age_days))}
                        </div>
                      </div>
                      <Badge tone={row.converted_purchase_order_id ? "good" : "warn"}>
                        {row.converted_purchase_order_id ? ui("Converted") : ui("Open")}
                      </Badge>
                    </div>
                  ))}
                  {!dashboard.recommendation_aging.oldest_decisions.length ? (
                    <div style={styles.mutedText}>{ui("No persisted recommendation decisions yet.")}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Recommendation production review")}</h2>
            <p style={styles.panelSubtitle}>{ui("Read-only production check for the current replenishment recommendations: supplier readiness, cost evidence, lead-time evidence, budget blockers, and human approval safety.")}</p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void productionReviewQuery.refetch()}
          >
            {ui("Refresh review")}
          </button>
        </div>
        {productionReviewQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading production review…")}</div>
        ) : null}
        {productionReviewQuery.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(productionReviewQuery.error, ui)}</div>
        ) : null}
        {productionReview ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label={ui("Production status")}
                value={canonicalDisplayLabel(productionReview.production_status)}
                tone={
                  productionReview.production_status === "blocked"
                    ? "bad"
                    : productionReview.production_status === "needs_review"
                      ? "warn"
                      : "good"
                }
              />
              <StatCard
                label={ui("Ready for approval")}
                value={formatUiNumber(productionReview.readiness_buckets.ready_for_approval, 0)}
                tone="good"
              />
              <StatCard
                label={ui("Blocked")}
                value={formatUiNumber(productionReview.readiness_buckets.blocked, 0)}
                tone={toNumber(productionReview.readiness_buckets.blocked) > 0 ? "bad" : "good"}
              />
              <StatCard
                label={ui("Approved not converted")}
                value={formatUiNumber(productionReview.readiness_buckets.approved_not_converted, 0)}
                tone={toNumber(productionReview.readiness_buckets.approved_not_converted) > 0 ? "warn" : "good"}
              />
              <StatCard
                label={ui("High priority")}
                value={formatUiNumber(productionReview.readiness_buckets.high_priority, 0)}
                tone={toNumber(productionReview.readiness_buckets.high_priority) > 0 ? "warn" : "good"}
              />
              <StatCard
                label={ui("Shortage window")}
                value={formatUiNumber(productionReview.readiness_buckets.shortage_window, 0)}
                tone={toNumber(productionReview.readiness_buckets.shortage_window) > 0 ? "bad" : "good"}
              />
            </div>
            <div style={styles.dashboardColumns}>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>{ui("Safety contract")}</div>
                <div style={styles.metricLine}>
                  {ui("Mode:")} <strong>{canonicalDisplayLabel(productionReview.safety_contract.mode)}</strong>
                </div>
                <div style={styles.mutedText}>
                  {ui("Mutates inventory: {inventory} · Creates POs: {purchaseOrders} · Approves recommendations: {approvals}")
                    .replace("{inventory}", productionReview.safety_contract.mutates_inventory ? ui("Yes") : ui("No"))
                    .replace("{purchaseOrders}", productionReview.safety_contract.creates_purchase_orders ? ui("Yes") : ui("No"))
                    .replace("{approvals}", productionReview.safety_contract.approves_recommendations ? ui("Yes") : ui("No"))}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>{ui("Blockers")}</div>
                <div style={styles.compactList}>
                  {productionReview.blockers.map((blocker) => (
                    <div key={`production-blocker-${blocker.code}`} style={styles.compactListRow}>
                      <div>
                        <strong>{blocker.code || "BLOCKER"}</strong>
                        <div style={styles.blockerText}>{blocker.message || ui("Production blocker requires review.")}</div>
                        {blocker.required_action ? <div style={styles.mutedText}>{blocker.required_action}</div> : null}
                      </div>
                      <Badge tone="bad">{formatUiNumber(blocker.affected_count ?? 0, 0)}</Badge>
                    </div>
                  ))}
                  {!productionReview.blockers.length ? <div style={styles.mutedText}>{ui("No production blockers for current filters.")}</div> : null}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>{ui("Warnings")}</div>
                <div style={styles.compactList}>
                  {productionReview.warnings.map((warning) => (
                    <div key={`production-warning-${warning.code}`} style={styles.compactListRow}>
                      <div>
                        <strong>{warning.code || "WARNING"}</strong>
                        <div style={styles.mutedText}>{warning.message || ui("Recommendation evidence should be reviewed.")}</div>
                        {warning.recommended_action ? <div style={styles.mutedText}>{warning.recommended_action}</div> : null}
                      </div>
                      <Badge tone={warning.severity === "high" ? "bad" : "warn"}>{formatUiNumber(warning.affected_count ?? 0, 0)}</Badge>
                    </div>
                  ))}
                  {!productionReview.warnings.length ? <div style={styles.mutedText}>{ui("No warning-level evidence gaps for current filters.")}</div> : null}
                </div>
              </div>
            </div>
            <div style={styles.detailPanel}>
              <div style={styles.statLabel}>{ui("Next safe actions")}</div>
              <ul style={styles.list}>
                {productionReview.next_actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Recommendation scheduling engine")}</h2>
            <p style={styles.panelSubtitle}>{ui("Preview or execute a bounded scheduled recommendation run using the current lookback, shortage-window, and budget filters. Execution can auto-approve ready rows and optionally generate PO drafts.")}</p>
          </div>
          <div style={styles.buttonRow}>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => scheduledRunMutation.mutate({ dryRun: true })}
              disabled={!canApproveRecommendations || scheduledRunMutation.isPending}
            >
              {ui("Preview scheduled run")}
            </button>
            <button
              style={styles.primaryButton}
              type="button"
              onClick={() =>
                requestConfirmation({
                  title: ui("Execute scheduled procurement run?"),
                  message: scheduledConvertToPo && canCreatePurchaseOrderDrafts
                    ? ui("This can approve up to {count} ready recommendations and create purchase order drafts.").replace("{count}", formatUiNumber(scheduledMaxApprovals, 0))
                    : ui("This can approve up to {count} ready recommendations. It will not create purchase order drafts.").replace("{count}", formatUiNumber(scheduledMaxApprovals, 0)),
                  confirmLabel: ui("Execute run"),
                  tone: "primary",
                  action: () => scheduledRunMutation.mutate({ dryRun: false }),
                })
              }
              disabled={!canApproveRecommendations || scheduledRunMutation.isPending}
            >
              {ui("Execute scheduled run")}
            </button>
          </div>
        </div>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            {ui("Max approvals")}
            <input
              style={styles.input}
              type="number"
              min={1}
              max={100}
              value={scheduledMaxApprovals}
              onChange={(event) => setScheduledMaxApprovals(Math.min(100, Math.max(1, Number(event.target.value) || 1)))}
            />
          </label>
          <label style={styles.label}>
            {ui("Execution note")}
            <input
              style={styles.input}
              value={scheduledNote}
              onChange={(event) => setScheduledNote(event.target.value)}
            />
          </label>
          <label style={{ ...styles.label, justifyContent: "center" }}>
            <span>{ui("Generate PO drafts after approval")}</span>
            <input
              type="checkbox"
              checked={scheduledConvertToPo && canCreatePurchaseOrderDrafts}
              disabled={!canCreatePurchaseOrderDrafts || scheduledRunMutation.isPending}
              onChange={(event) => setScheduledConvertToPo(event.target.checked)}
            />
          </label>
        </div>
        {!canApproveRecommendations ? (
          <div style={styles.infoBox}>{ui("Purchase order approval permission is required to preview or execute scheduled procurement recommendation runs.")}</div>
        ) : null}
        {!canCreatePurchaseOrderDrafts ? (
          <div style={styles.infoBox}>{ui("Purchase order create permission is required before scheduled runs can generate PO drafts.")}</div>
        ) : null}
        {scheduledRunMutation.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(scheduledRunMutation.error, ui)}</div>
        ) : null}
        {scheduledRunMutation.data ? (
          <div style={styles.detailPanel}>
            <div style={styles.bulkGrid}>
              <StatCard label={ui("Run mode")} value={canonicalDisplayLabel(scheduledRunMutation.data.run_mode)} />
              <StatCard label={ui("Status")} value={canonicalDisplayLabel(scheduledRunMutation.data.status)} tone={scheduledRunMutation.data.status === "blocked" ? "bad" : scheduledRunMutation.data.status === "completed_with_warnings" ? "warn" : "good"} />
              <StatCard label={ui("Candidates")} value={formatUiNumber(scheduledRunMutation.data.summary.candidate_count, 0)} />
              <StatCard label={ui("Ready")} value={formatUiNumber(scheduledRunMutation.data.summary.ready_count, 0)} tone="good" />
              <StatCard label={ui("Approved")} value={formatUiNumber(scheduledRunMutation.data.summary.approved_count, 0)} />
              <StatCard label={ui("PO drafts")} value={formatUiNumber(scheduledRunMutation.data.summary.po_draft_count, 0)} />
            </div>
            {(scheduledRunMutation.data.blockers?.length || 0) > 0 ? (
              <div style={styles.errorBox}>
                {scheduledRunMutation.data.blockers?.map((blocker) => blocker.message || blocker.code).join(" · ")}
              </div>
            ) : null}
            {(scheduledRunMutation.data.warnings?.length || 0) > 0 ? (
              <div style={styles.infoBox}>
                {scheduledRunMutation.data.warnings?.map((warning) => warning.message || warning.code).join(" · ")}
              </div>
            ) : null}
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Supplier")}</th>
                    <th style={styles.th}>{ui("Urgency")}</th>
                    <th style={styles.th}>{ui("Qty")}</th>
                    <th style={styles.th}>{ui("Cost")}</th>
                    <th style={styles.th}>{ui("Warnings")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(scheduledRunMutation.data.plan_rows ?? []).slice(0, 10).map((row) => (
                    <tr key={`scheduled-${row.product_id}`} style={styles.tr}>
                      <td style={styles.td}>{row.product_name || row.product_id}</td>
                      <td style={styles.td}>{row.supplier_name || "-"}</td>
                      <td style={styles.td}>{canonicalDisplayLabel(row.urgency)}</td>
                      <td style={styles.td}>{formatUiNumber(row.recommended_reorder_quantity)}</td>
                      <td style={styles.td}>{formatUiMoney(row.estimated_total_cost, row.currency)}</td>
                      <td style={styles.td}>{(row.warnings ?? []).map((warning) => warning.code).join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Procurement execution history")}</h2>
            <p style={styles.panelSubtitle}>{ui("Auditable trail of recommendation decisions, scheduled runs, PO draft conversion outcomes, and automation execution status.")}</p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void executionHistoryQuery.refetch()}
          >
            {ui("Refresh history")}
          </button>
        </div>
        {executionHistoryQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading procurement execution history…")}</div>
        ) : null}
        {executionHistoryQuery.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(executionHistoryQuery.error, ui)}</div>
        ) : null}
        {executionHistoryQuery.data ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard label={ui("Decision events")} value={formatUiNumber(executionHistoryQuery.data.summary.decision_event_count, 0)} />
              <StatCard label={ui("Approved")} value={formatUiNumber(executionHistoryQuery.data.summary.approved_count, 0)} tone="good" />
              <StatCard label={ui("Converted")} value={formatUiNumber(executionHistoryQuery.data.summary.converted_count, 0)} />
              <StatCard label={ui("Scheduled runs")} value={formatUiNumber(executionHistoryQuery.data.summary.schedule_run_count, 0)} />
              <StatCard label={ui("Blocked runs")} value={formatUiNumber(executionHistoryQuery.data.summary.blocked_run_count, 0)} tone={toNumber(executionHistoryQuery.data.summary.blocked_run_count) > 0 ? "bad" : "good"} />
              <StatCard label={ui("PO drafts")} value={formatUiNumber(executionHistoryQuery.data.summary.po_draft_count, 0)} />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("When")}</th>
                    <th style={styles.th}>{ui("Event")}</th>
                    <th style={styles.th}>{ui("Subject")}</th>
                    <th style={styles.th}>{ui("Status")}</th>
                    <th style={styles.th}>{ui("Cost")}</th>
                    <th style={styles.th}>{ui("PO linkage")}</th>
                  </tr>
                </thead>
                <tbody>
                  {executionHistoryQuery.data.timeline.slice(0, 20).map((event, index) => {
                    const isRun = event.event_type === "scheduled_run";
                    const subject = isRun
                      ? ui("{mode} · {count} candidates")
                          .replace("{mode}", canonicalDisplayLabel(String(event.run_mode || "scheduled_run")))
                          .replace("{count}", formatUiNumber(event.candidate_count as string | number | undefined, 0))
                      : String(event.product_name || event.recommendation_key || event.product_id || ui("Recommendation"));
                    const status = String(event.status || "-");
                    const poLink = isRun
                      ? ui("{count} draft(s)").replace("{count}", formatUiNumber(event.po_draft_count as string | number | undefined, 0))
                      : String(event.converted_po_number || event.converted_purchase_order_id || "-");
                    return (
                      <tr key={`execution-history-${index}-${String(event.occurred_at || "")}`} style={styles.tr}>
                        <td style={styles.td}>{event.occurred_at ? formatUiDateTime(String(event.occurred_at)) : "—"}</td>
                        <td style={styles.td}>{isRun ? ui("Scheduled run") : ui("Decision")}</td>
                        <td style={styles.td}>{subject}</td>
                        <td style={styles.td}><Badge tone={status === "blocked" || status === "rejected" ? "bad" : status === "deferred" || status === "completed_with_warnings" ? "warn" : "good"}>{canonicalDisplayLabel(status)}</Badge></td>
                        <td style={styles.td}>{isRun
                          ? formatUiMoneyRecordBreakdown(event.estimated_total_cost_by_currency as Record<string, number | string> | undefined, event.estimated_total_cost as string | number | null | undefined, event.budget_currency as string | null | undefined)
                          : formatUiMoney(event.estimated_total_cost as string | number | null | undefined, event.currency as string | null | undefined)}</td>
                        <td style={styles.td}>{poLink}</td>
                      </tr>
                    );
                  })}
                  {executionHistoryQuery.data.timeline.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>{ui("No procurement execution history yet.")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Recommendation outcomes")}</h2>
            <p style={styles.panelSubtitle}>{ui("Read-only follow-up showing whether approved recommendations reached a purchase order, were received, restored the governed threshold, or still produced alerts.")}</p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void recommendationOutcomesQuery.refetch()}
          >
            {ui("Refresh outcomes")}
          </button>
        </div>
        {recommendationOutcomesQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading recorded recommendation outcomes…")}</div>
        ) : null}
        {recommendationOutcomesQuery.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(recommendationOutcomesQuery.error, ui)}</div>
        ) : null}
        {recommendationOutcomesQuery.data ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard label={ui("Loaded outcomes")} value={formatUiNumber(recommendationOutcomesQuery.data.summary.total, 0)} />
              <StatCard label={ui("Threshold restored")} value={formatUiNumber(recommendationOutcomesQuery.data.summary.threshold_met_count, 0)} tone="good" />
              <StatCard label={ui("Fully received")} value={formatUiNumber(recommendationOutcomesQuery.data.summary.received_complete_count, 0)} tone="good" />
              <StatCard
                label={ui("Post-decision alerts")}
                value={formatUiNumber(recommendationOutcomesQuery.data.summary.rows_with_post_decision_alerts, 0)}
                tone={toNumber(recommendationOutcomesQuery.data.summary.rows_with_post_decision_alerts) > 0 ? "warn" : "good"}
              />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Decision")}</th>
                    <th style={styles.th}>{ui("Outcome")}</th>
                    <th style={styles.th}>{ui("Recommended / ordered")}</th>
                    <th style={styles.th}>{ui("Received")}</th>
                    <th style={styles.th}>{ui("Current stock / threshold")}</th>
                    <th style={styles.th}>{ui("PO")}</th>
                    <th style={styles.th}>{ui("Alerts after decision")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendationOutcomesQuery.data.rows.map((row) => (
                    <tr key={row.decision_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.primaryText}>{row.product_name || row.product_id || ui("Unknown product")}</div>
                        <div style={styles.mutedText}>{row.decided_at ? formatUiDateTime(row.decided_at) : "—"}</div>
                      </td>
                      <td style={styles.td}>{canonicalDisplayLabel(row.decision_status)}</td>
                      <td style={styles.td}>
                        <Badge tone={row.outcome_status === "received_complete" ? "good" : row.outcome_status === "po_cancelled" || row.outcome_status === "not_approved" ? "bad" : "warn"}>
                          {canonicalDisplayLabel(row.outcome_status)}
                        </Badge>
                      </td>
                      <td style={styles.td}>
                        {formatUiNumber(row.recommended_reorder_quantity)} / {formatUiNumber(row.ordered_quantity)} {row.unit || ""}
                      </td>
                      <td style={styles.td}>
                        {formatUiNumber(row.received_quantity)} {row.unit || ""}
                        {row.fulfillment_ratio !== null && row.fulfillment_ratio !== undefined ? (
                          <div style={styles.mutedText}>{ui("{percent}% fulfilled").replace("{percent}", formatUiNumber(toNumber(row.fulfillment_ratio) * 100, 0))}</div>
                        ) : null}
                      </td>
                      <td style={styles.td}>
                        {formatUiNumber(row.current_quantity)} / {formatUiNumber(row.governed_min_stock_at_decision)} {row.unit || ""}
                        <div style={row.threshold_met ? styles.mutedText : styles.warningText}>
                          {row.threshold_met ? ui("Threshold met") : ui("Below governed threshold")}
                        </div>
                      </td>
                      <td style={styles.td}>
                        {row.po_number || row.converted_purchase_order_id || ui("Not created")}
                        {row.purchase_order_status ? <div style={styles.mutedText}>{canonicalDisplayLabel(row.purchase_order_status)}</div> : null}
                      </td>
                      <td style={styles.td}>{formatUiNumber(row.post_decision_alert_count, 0)}</td>
                    </tr>
                  ))}
                  {recommendationOutcomesQuery.data.rows.length === 0 ? (
                    <tr><td style={styles.emptyCell} colSpan={8}>{ui("No recommendation outcomes have been recorded yet.")}</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>{ui("Procurement exception queue")}</h2>
            <p style={styles.panelSubtitle}>{ui("Operational blockers and warnings across supplier assignment, quantity, stockout, approval, conversion, budget, and package governance.")}</p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void exceptionQueueQuery.refetch()}
          >
            {ui("Refresh exceptions")}
          </button>
        </div>
        {exceptionQueueQuery.isLoading ? (
          <div style={styles.infoBox}>{ui("Loading procurement exceptions…")}</div>
        ) : null}
        {exceptionQueueQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(exceptionQueueQuery.error, ui)}
          </div>
        ) : null}
        {exceptionResolutionMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(exceptionResolutionMutation.error, ui)}
          </div>
        ) : null}
        {exceptionResolutionMutation.data ? (
          <div style={styles.infoBox}>
            {ui("Resolution {action} completed: {cleared} cleared, {remaining} remaining.")
              .replace("{action}", canonicalDisplayLabel(exceptionResolutionMutation.data.action))
              .replace("{cleared}", formatUiNumber(exceptionResolutionMutation.data.cleared_exception_count, 0))
              .replace("{remaining}", formatUiNumber(exceptionResolutionMutation.data.remaining_exception_count, 0))}
          </div>
        ) : null}
        {!canApproveRecommendations ? (
          <div style={styles.infoBox}>{ui("Purchase order approval permission is required to resolve procurement exceptions or apply recommendation decisions from this page.")}</div>
        ) : null}
        {canApproveRecommendations && !canManageProducts ? (
          <div style={styles.infoBox}>{ui("Product write permission is additionally required to assign a supplier to a product from an exception.")}</div>
        ) : null}
        {optionsQuery.isError ? (
          <div style={styles.errorBox}>{ui("Supplier choices could not be loaded: {error}").replace("{error}", getErrorMessage(optionsQuery.error, ui))}</div>
        ) : null}
        {exceptions ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label={ui("Total exceptions")}
                value={formatUiNumber(exceptions.summary.total_exceptions, 0)}
                tone={toNumber(exceptions.summary.total_exceptions) > 0 ? "warn" : "good"}
              />
              <StatCard
                label={ui("Critical")}
                value={formatUiNumber(exceptions.summary.critical_count, 0)}
                tone={toNumber(exceptions.summary.critical_count) > 0 ? "bad" : "good"}
              />
              <StatCard
                label={ui("High")}
                value={formatUiNumber(exceptions.summary.high_count, 0)}
                tone={toNumber(exceptions.summary.high_count) > 0 ? "bad" : "good"}
              />
              <StatCard
                label={ui("Affected products")}
                value={formatUiNumber(exceptions.summary.affected_product_count, 0)}
              />
              <StatCard
                label={ui("Affected suppliers")}
                value={formatUiNumber(exceptions.summary.affected_supplier_count, 0)}
              />
            </div>
            <div style={{ ...styles.tableWrap, marginTop: 12 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Exception")}</th>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Supplier")}</th>
                    <th style={styles.th}>{ui("Coverage")}</th>
                    <th style={styles.th}>{ui("Decision")}</th>
                    <th style={styles.th}>{ui("Resolution")}</th>
                  </tr>
                </thead>
                <tbody>
                  {exceptions.rows.slice(0, 12).map((exception) => (
                    <tr key={exception.exception_key} style={styles.tr}>
                      <td style={styles.td}>
                        <Badge
                          tone={
                            exception.severity === "critical"
                              ? "bad"
                              : exception.severity === "high"
                                ? "bad"
                                : exception.severity === "medium"
                                  ? "warn"
                                  : "neutral"
                          }
                        >
                          {canonicalDisplayLabel(exception.severity)}
                        </Badge>
                        <div style={styles.primaryText}>{titleCase(exception.code)}</div>
                        <div style={styles.mutedText}>{canonicalDisplayLabel(exception.category)}</div>
                        <div style={styles.blockerText}>{exception.message}</div>
                      </td>
                      <td style={styles.td}>
                        <button
                          style={styles.linkButton}
                          type="button"
                          onClick={() => setSelectedProductId(exception.product_id)}
                        >
                          {exception.product_name}
                        </button>
                        <div style={styles.mutedText}>{canonicalDisplayLabel(exception.urgency || "unknown")}</div>
                        <div style={styles.mutedText}>
                          {ui("Recommend {quantity} · {cost}")
                            .replace("{quantity}", formatUiNumber(exception.recommended_reorder_quantity))
                            .replace("{cost}", formatUiMoney(exception.estimated_total_cost, exception.currency || exception.row?.currency))}
                        </div>
                      </td>
                      <td style={styles.td}>{exception.supplier_name || ui("Unassigned")}</td>
                      <td style={styles.td}>
                        {exception.estimated_days_of_coverage === null || exception.estimated_days_of_coverage === undefined
                          ? ui("No projection")
                          : ui("{count} days").replace("{count}", formatUiNumber(exception.estimated_days_of_coverage))}
                        <div style={styles.mutedText}>{ui("Depletion {date}").replace("{date}", formatUiDate(exception.projected_depletion_date))}</div>
                      </td>
                      <td style={styles.td}>
                        <Badge
                          tone={
                            exception.decision_status === "approved"
                              ? "good"
                              : exception.decision_status === "rejected"
                                ? "bad"
                                : exception.decision_status === "deferred"
                                  ? "warn"
                                  : "neutral"
                          }
                        >
                          {canonicalDisplayLabel(exception.decision_status || "pending")}
                        </Badge>
                        {exception.converted_purchase_order_id ? (
                          <div style={styles.mutedText}>{ui("Converted")}</div>
                        ) : null}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.mutedText}>{exception.resolution_hint || ui("Review recommendation detail.")}</div>
                        {exception.code === "MISSING_SUPPLIER" && canViewSuppliers ? (
                          <select
                            style={{ ...styles.input, marginTop: 8, width: "100%" }}
                            value={exceptionSupplierIds[exception.exception_key] || ""}
                            onChange={(event) => updateExceptionSupplierId(exception.exception_key, event.target.value)}
                            disabled={!canManageProducts}
                          >
                            <option value="">{ui("Select active supplier")}</option>
                            {(optionsQuery.data?.suppliers || []).map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                            ))}
                          </select>
                        ) : null}
                        <textarea
                          style={{ ...styles.textarea, marginTop: 8, width: "100%", minHeight: 54 }}
                          value={exceptionResolutionNotes[exception.exception_key] || ""}
                          onChange={(event) => updateExceptionNote(exception.exception_key, event.target.value)}
                          placeholder={ui("Resolution note")}
                        />
                        <div style={styles.exceptionActionRow}>
                          {exception.code === "MISSING_SUPPLIER" && canViewSuppliers ? (
                            <button
                              style={styles.secondaryButton}
                              type="button"
                              disabled={!canApproveRecommendations || !canManageProducts || !canViewSuppliers || !exceptionSupplierIds[exception.exception_key] || exceptionResolutionMutation.isPending}
                              onClick={() =>
                                requestConfirmation({
                                  title: ui("Assign supplier to product?"),
                                  message: ui("This changes the product's default supplier and records the change in the audit trail."),
                                  confirmLabel: ui("Assign supplier"),
                                  tone: "primary",
                                  action: () => resolveException(exception, "assign_supplier"),
                                })
                              }
                            >
                              {ui("Assign supplier")}
                            </button>
                          ) : null}
                          <button
                            style={styles.secondaryButton}
                            type="button"
                            disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                            onClick={() => resolveException(exception, "rerun")}
                          >
                            {ui("Re-run")}
                          </button>
                          {exception.code === "HIGH_RISK_PENDING_DECISION" ? (
                            <>
                              <button
                                style={styles.secondaryButton}
                                type="button"
                                disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                                onClick={() => resolveException(exception, "defer")}
                              >
                                {ui("Defer")}
                              </button>
                              {exception.row?.detail?.can_enter_approval_review ? (
                                <button
                                  style={styles.primaryButton}
                                  type="button"
                                  disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                                  onClick={() =>
                                    requestConfirmation({
                                      title: ui("Approve recommendation?"),
                                      message: ui("Approval records a governed procurement decision. It does not create a purchase order until conversion is requested."),
                                      confirmLabel: ui("Approve"),
                                      tone: "primary",
                                      action: () => resolveException(exception, "approve"),
                                    })
                                  }
                                >
                                  {ui("Approve")}
                                </button>
                              ) : null}
                              <button
                                style={styles.dangerButton}
                                type="button"
                                disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                                onClick={() =>
                                  requestConfirmation({
                                    title: ui("Reject recommendation?"),
                                    message: ui("This records a rejection decision for the current recommendation evidence."),
                                    confirmLabel: ui("Reject"),
                                    tone: "danger",
                                    action: () => resolveException(exception, "reject"),
                                  })
                                }
                              >
                                {ui("Reject")}
                              </button>
                            </>
                          ) : null}
                        </div>
                        {resolvingExceptionKey?.startsWith(`${exception.product_id}:`) ? (
                          <div style={styles.mutedText}>{ui("Applying resolution…")}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {exceptions.rows.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>
                        {ui("No procurement exceptions found for the current filters.")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

        </div>
      </details>

      </div>

      {confirmation ? (
        <div style={styles.modalBackdrop} role="presentation" onMouseDown={() => setConfirmation(null)}>
          <div
            style={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="procurement-confirmation-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="procurement-confirmation-title" style={styles.modalTitle}>{confirmation.title}</h2>
            <p style={styles.modalMessage}>{confirmation.message}</p>
            <div style={styles.modalActions}>
              <button type="button" style={styles.secondaryButton} onClick={() => setConfirmation(null)}>
                {ui("Cancel")}
              </button>
              <button
                type="button"
                style={confirmation.tone === "danger" ? styles.dangerButton : styles.primaryButton}
                onClick={() => {
                  const action = confirmation.action;
                  setConfirmation(null);
                  action();
                }}
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 20 },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  kicker: {
    margin: 0,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "#64748b",
    fontWeight: 700,
  },
  title: { margin: "6px 0", fontSize: 32, lineHeight: 1.15, color: "#0f172a" },
  subtitle: { margin: 0, maxWidth: 760, color: "#475569", lineHeight: 1.5 },
  generatedBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    background: "#ffffff",
    minWidth: 220,
  },
  generatedLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  generatedValue: { fontWeight: 700, marginTop: 4 },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  governanceDetails: { border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc", overflow: "hidden" },
  governanceSummary: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "16px 18px", cursor: "pointer", fontWeight: 800, color: "#0f172a", flexWrap: "wrap" },
  governanceContent: { display: "flex", flexDirection: "column", gap: 20, padding: "0 14px 14px" },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  bulkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  statCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 16,
    background: "#ffffff",
  },
  goodStat: { borderColor: "#bbf7d0", background: "#f0fdf4" },
  warnStat: { borderColor: "#fde68a", background: "#fffbeb" },
  badStat: { borderColor: "#fecaca", background: "#fef2f2" },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statValue: { fontSize: 24, fontWeight: 800, marginTop: 6 },
  panel: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#ffffff",
    padding: 18,
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  panelTitle: { margin: 0, fontSize: 20 },
  panelSubtitle: { margin: "4px 0 0", color: "#64748b" },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    background: "#ffffff",
    color: "#111827",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "9px 12px",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButton: {
    border: "1px solid #2563eb",
    borderRadius: 8,
    padding: "9px 12px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  dangerButton: {
    border: "1px solid #ef4444",
    borderRadius: 8,
    padding: "9px 12px",
    background: "#ef4444",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  actionRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 },
  actionGroup: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  buttonRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  inlineActionButton: { border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 8px", background: "#ffffff", color: "#0f172a", cursor: "pointer", fontSize: 12, fontWeight: 800 },
  conversionResultItem: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  commercialWarningBox: { border: "1px solid #fed7aa", background: "#fff7ed", color: "#9a3412", borderRadius: 14, padding: 14, marginTop: 12, lineHeight: 1.5 },
  exceptionActionRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  textarea: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#ffffff",
    minHeight: 76,
  },
  paginationControls: { display: "flex", gap: 8, flexWrap: "wrap" },
  paginationFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 1120 },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #e2e8f0",
    padding: "10px 8px",
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  tr: { borderBottom: "1px solid #f1f5f9" },
  selectedTr: { background: "#f8fafc" },
  td: { padding: "12px 8px", verticalAlign: "top", fontSize: 14 },
  primaryText: { fontWeight: 800, color: "#0f172a" },
  mutedText: { color: "#64748b", fontSize: 12, marginTop: 3 },
  blockerText: { color: "#b91c1c", fontSize: 12, marginTop: 5, maxWidth: 220 },
  warningText: { color: "#b45309", fontSize: 12, marginTop: 5, lineHeight: 1.4 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 800,
  },
  goodBadge: { background: "#dcfce7", color: "#166534" },
  warnBadge: { background: "#fef3c7", color: "#92400e" },
  badBadge: { background: "#fee2e2", color: "#991b1b" },
  neutralBadge: { background: "#e2e8f0", color: "#334155" },
  linkButton: { border: 0, background: "transparent", color: "#2563eb", cursor: "pointer", padding: 0, fontWeight: 800, textAlign: "left" },
  emptyCell: { padding: 24, textAlign: "center", color: "#64748b" },
  infoBox: {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 14,
    padding: 14,
  },
  errorBox: {
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 14,
    padding: 14,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "min(520px, 100%)",
    borderRadius: 18,
    background: "#ffffff",
    padding: 22,
    boxShadow: "0 24px 64px rgba(15, 23, 42, 0.3)",
  },
  modalTitle: { margin: 0, fontSize: 22, color: "#0f172a" },
  modalMessage: { margin: "10px 0 0", color: "#475569", lineHeight: 1.55 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginTop: 20 },
  riskGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  dashboardColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    marginTop: 12,
  },
  compactList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 10 },
  compactListRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
  },
  riskCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    background: "#f8fafc",
  },
  riskCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  riskText: { margin: "8px 0 0", color: "#475569", lineHeight: 1.4 },
  detailPanel: {
    border: "1px solid #bfdbfe",
    borderRadius: 12,
    background: "#ffffff",
    padding: 18,
    boxShadow: "0 2px 10px rgba(37, 99, 235, 0.05)",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
  },
  detailCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    background: "#ffffff",
  },
  detailCardWide: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    background: "#ffffff",
    gridColumn: "span 2",
  },
  detailTitle: { margin: "6px 0", fontSize: 18 },
  metricLine: { marginTop: 8, color: "#334155", lineHeight: 1.4 },
  list: {
    margin: "8px 0 0",
    paddingLeft: 20,
    color: "#475569",
    lineHeight: 1.5,
  },
  reasonList: {
    margin: "8px 0 0",
    paddingLeft: 18,
    color: "#475569",
    lineHeight: 1.5,
  },
};
