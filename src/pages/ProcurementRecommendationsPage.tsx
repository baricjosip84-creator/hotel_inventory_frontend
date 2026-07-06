import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "../lib/api";
import { getRoleCapabilities } from "../lib/permissions";

type RecommendationSummary = {
  total_products?: number | string;
  recommended_count?: number | string;
  critical_count?: number | string;
  high_count?: number | string;
  medium_count?: number | string;
  low_count?: number | string;
  blocked_count?: number | string;
  estimated_total_cost?: number | string;
  budget_limit?: number | string | null;
  budget_variance?: number | string | null;
  budget_remaining_after_recommendation?: number | string | null;
  budget_status?: string | null;
  budget_blocker_code?: string | null;
  budget_blocker_message?: string | null;
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
  category?: string | null;
  unit?: string | null;
  current_quantity: number | string;
  min_stock: number | string;
  average_daily_usage: number | string;
  estimated_days_of_coverage: number | string | null;
  projected_depletion_date?: string | null;
  base_reorder_quantity?: number | string | null;
  moq_adjusted_reorder_quantity?: number | string | null;
  recommended_reorder_quantity: number | string;
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
  converted_at?: string | null;
};

type ReplenishmentRecommendationDetail = ReplenishmentRecommendation & {
  detail?: {
    recommendation_key?: string;
    execution_scope?: string;
    can_generate_po_draft?: boolean;
    readiness?: string;
    blockers?: Array<{ code?: string | null; message?: string | null }>;
    reasoning?: string[];
  };
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
  purchase_orders: Array<{
    purchase_order_id: string;
    po_number: string;
    supplier_id: string;
    supplier_name?: string | null;
    expected_delivery_date?: string | null;
    status: string;
    item_count: number | string;
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
    estimated_total_cost: number | string;
  };
  rows: Array<{
    purchase_order_id: string;
    po_number: string;
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
    estimated_recommendation_spend: number | string;
    open_po_draft_spend: number | string;
    shortages_preventable_count: number | string;
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
    estimated_total_cost: number | string;
    open_po_draft_count: number | string;
    open_po_draft_spend: number | string;
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
    estimated_days_of_coverage?: number | string | null;
    projected_depletion_date?: string | null;
    converted_purchase_order_id?: string | null;
    resolution_hint?: string | null;
  }>;
};


type ProcurementExceptionResolutionResponse = {
  generated_at: string;
  tenant_id: string;
  action: "assign_supplier" | "approve" | "reject" | "defer" | "suppress" | "rerun";
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
  summary: {
    candidate_count: number | string;
    ready_count: number | string;
    blocked_count: number | string;
    approved_count: number | string;
    po_draft_count: number | string;
    estimated_total_cost?: number | string | null;
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
    created_at?: string | null;
    blockers?: Array<{ code?: string | null; message?: string | null }>;
    warnings?: Array<{ code?: string | null; message?: string | null }>;
  }>;
  timeline: Array<Record<string, unknown> & { event_type?: string; occurred_at?: string | null }>;
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
    estimated_total_cost: number | string;
    budget_limit?: number | string | null;
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

type RecommendationFilters = {
  lookbackDays: number;
  urgency: string;
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

function formatNumber(
  value: number | string | null | undefined,
  digits = 2,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
  }).format(parsed);
}

function formatMoney(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  const currencyCode = currency || "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `${formatNumber(parsed)} ${currencyCode}`;
  }
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Unable to load procurement recommendations.";
}

function buildRecommendationsPath(filters: RecommendationFilters): string {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  params.set("limit", String(filters.limit));
  params.set("offset", String(filters.offset));

  if (filters.urgency) params.set("urgency", filters.urgency);
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



async function fetchRecommendationProductionReview(
  filters: RecommendationFilters,
): Promise<RecommendationProductionReviewResponse> {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
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


async function fetchProcurementExceptionQueue(
  filters: RecommendationFilters,
): Promise<ProcurementExceptionQueueResponse> {
  const params = new URLSearchParams();
  params.set("lookback_days", String(filters.lookbackDays));
  params.set("limit", "50");
  params.set("offset", "0");
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
  action: "assign_supplier" | "approve" | "reject" | "defer" | "suppress" | "rerun",
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

async function fetchRecommendationPoDraftReview(): Promise<RecommendationPoDraftReviewResponse> {
  return apiRequest<RecommendationPoDraftReviewResponse>(
    "/reorder-insights/recommendations/po-drafts?status=all&limit=25&offset=0",
  );
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
    "min_stock",
    "average_daily_usage",
    "estimated_days_of_coverage",
    "projected_depletion_date",
    "source_signal",
    "urgency",
    "recommendation_status",
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
    row.min_stock,
    row.average_daily_usage,
    row.estimated_days_of_coverage ?? "",
    row.projected_depletion_date || "",
    row.source_signal || "",
    row.urgency,
    row.recommendation_status || "",
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
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const canApproveRecommendations = capabilities.canApprovePurchaseOrders;
  const canCreatePurchaseOrderDrafts = capabilities.canCreatePurchaseOrders;
  const canViewGeneratedPurchaseOrderDrafts = capabilities.canViewPurchaseOrders;
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

  const recommendationsQuery = useQuery({
    queryKey: ["procurement-recommendations", filters],
    queryFn: () => fetchRecommendations(filters),
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
    },
  });

  const poDraftReviewQuery = useQuery({
    queryKey: ["procurement-recommendation-po-draft-review"],
    queryFn: fetchRecommendationPoDraftReview,
    enabled: canViewGeneratedPurchaseOrderDrafts,
  });


  const executionDashboardQuery = useQuery({
    queryKey: [
      "procurement-execution-dashboard",
      filters.lookbackDays,
      filters.shortageWindowDays,
      filters.budgetLimit,
      filters.search,
    ],
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
    queryFn: () => fetchRecommendationProductionReview(filters),
  });


  const executionHistoryQuery = useQuery({
    queryKey: ["procurement-execution-history"],
    queryFn: fetchProcurementExecutionHistory,
  });


  const exceptionQueueQuery = useQuery({
    queryKey: [
      "procurement-exception-queue",
      filters.lookbackDays,
      filters.shortageWindowDays,
      filters.budgetLimit,
      filters.search,
    ],
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
      action: "assign_supplier" | "approve" | "reject" | "defer" | "suppress" | "rerun";
      supplierId?: string;
      note?: string;
    }) => resolveProcurementException(productId, filters, action, supplierId, note),
    onSuccess: () => {
      setExceptionResolutionNotes({});
      setExceptionSupplierIds({});
      void queryClient.invalidateQueries({ queryKey: ["procurement-exception-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-detail"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-po-draft-review"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
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
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-exception-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-recommendation-po-draft-review"] });
      void queryClient.invalidateQueries({ queryKey: ["procurement-execution-history"] });
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
  const rows = data?.rows ?? [];
  const summary = data?.summary ?? {};
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
      .sort(
        (a, b) =>
          (urgencyScore[b.urgency] || 0) - (urgencyScore[a.urgency] || 0),
      )
      .slice(0, 5);
  }, [rows]);

  const setFilter = <K extends keyof RecommendationFilters>(
    key: K,
    value: RecommendationFilters[K],
  ) => {
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
    (row) =>
      row.procurement_ready && toNumber(row.recommended_reorder_quantity) > 0,
  ).length;
  const poConvertibleSelectedCount = selectedRows.filter(
    (row) =>
      row.procurement_ready &&
      toNumber(row.recommended_reorder_quantity) > 0 &&
      row.decision_status === "approved" &&
      !row.converted_purchase_order_id,
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
  const resolveException = (
    exception: ProcurementExceptionQueueResponse["rows"][number],
    action: "assign_supplier" | "approve" | "reject" | "defer" | "suppress" | "rerun",
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
        .filter(
          (row) =>
            row.procurement_ready &&
            toNumber(row.recommended_reorder_quantity) > 0,
        )
        .map((row) => row.product_id),
    );
    bulkReadinessMutation.reset();
    poDraftConversionMutation.reset();
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>
            Feature #5 · Procurement Execution Automation
          </p>
          <h1 style={styles.title}>Procurement recommendations</h1>
          <p style={styles.subtitle}>
            Action queue for turning stock, usage velocity, supplier lead time,
            and MOQ evidence into procurement-ready replenishment decisions.
          </p>
        </div>
        <div style={styles.generatedBox}>
          <div style={styles.generatedLabel}>Generated</div>
          <div style={styles.generatedValue}>
            {data?.generated_at
              ? new Date(data.generated_at).toLocaleString()
              : "-"}
          </div>
        </div>
      </header>

      <section style={styles.statsGrid}>
        <StatCard
          label="Recommended"
          value={formatNumber(summary.recommended_count ?? 0, 0)}
          tone="warn"
        />
        <StatCard
          label="Critical"
          value={formatNumber(summary.critical_count ?? 0, 0)}
          tone={toNumber(summary.critical_count) > 0 ? "bad" : "good"}
        />
        <StatCard
          label="Blocked"
          value={formatNumber(summary.blocked_count ?? 0, 0)}
          tone={toNumber(summary.blocked_count) > 0 ? "bad" : "good"}
        />
        <StatCard
          label="Estimated spend"
          value={formatMoney(summary.estimated_total_cost ?? 0)}
        />
        <StatCard
          label="Budget status"
          value={titleCase(summary.budget_status || "not_configured")}
          tone={
            summary.budget_status === "over_budget"
              ? "bad"
              : summary.budget_status === "within_budget"
                ? "good"
                : undefined
          }
        />
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Procurement execution dashboard</h2>
            <p style={styles.panelSubtitle}>
              Execution-level view of shortage prevention, pending risk,
              supplier workload, generated PO drafts, and recommendation aging.
            </p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void executionDashboardQuery.refetch()}
          >
            Refresh dashboard
          </button>
        </div>
        {executionDashboardQuery.isLoading ? (
          <div style={styles.infoBox}>Loading execution dashboard...</div>
        ) : null}
        {executionDashboardQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(executionDashboardQuery.error)}
          </div>
        ) : null}
        {dashboardSummary ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label="Shortages preventable"
                value={formatNumber(
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
                label="Stockout avoided"
                value={formatNumber(
                  dashboardSummary.projected_stockout_avoidance_count,
                  0,
                )}
                tone="good"
              />
              <StatCard
                label="Pending risk"
                value={formatNumber(
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
                label="Open PO drafts"
                value={formatNumber(dashboardSummary.open_po_draft_count, 0)}
                tone={
                  toNumber(dashboardSummary.po_draft_warning_count) > 0
                    ? "warn"
                    : undefined
                }
              />
              <StatCard
                label="Open draft spend"
                value={formatMoney(dashboardSummary.open_po_draft_spend)}
              />
              <StatCard
                label="Execution risk score"
                value={formatNumber(dashboardSummary.execution_risk_score, 0)}
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
                <div style={styles.statLabel}>Supplier execution</div>
                <div style={styles.compactList}>
                  {(dashboard?.supplier_execution || []).slice(0, 6).map((supplier) => (
                    <div
                      key={supplier.supplier_id || supplier.supplier_name}
                      style={styles.compactListRow}
                    >
                      <div>
                        <strong>{supplier.supplier_name}</strong>
                        <div style={styles.mutedText}>
                          {formatNumber(supplier.recommendation_count, 0)} recs · {formatNumber(supplier.ready_count, 0)} ready · {formatNumber(supplier.blocked_count, 0)} blocked · {formatNumber(supplier.open_po_draft_count, 0)} draft(s)
                        </div>
                      </div>
                      <div style={styles.primaryText}>
                        {formatMoney(supplier.estimated_total_cost)}
                      </div>
                    </div>
                  ))}
                  {!dashboard?.supplier_execution?.length ? (
                    <div style={styles.mutedText}>No supplier workload to show.</div>
                  ) : null}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>Risk highlights</div>
                <div style={styles.compactList}>
                  {(dashboard?.risk_highlights || []).slice(0, 6).map((risk) => (
                    <div key={`dashboard-risk-${risk.product_id}`} style={styles.compactListRow}>
                      <div>
                        <strong>{risk.product_name}</strong>
                        <div style={styles.mutedText}>
                          {titleCase(risk.urgency)} · {risk.estimated_days_of_coverage === null || risk.estimated_days_of_coverage === undefined ? "No coverage" : `${formatNumber(risk.estimated_days_of_coverage)} days`} · {risk.recommended_supplier_name || "No supplier"}
                        </div>
                        {risk.blocker_message ? (
                          <div style={styles.blockerText}>{risk.blocker_message}</div>
                        ) : null}
                      </div>
                      <Badge tone={risk.procurement_ready ? "good" : "bad"}>
                        {risk.procurement_ready ? "Ready" : "Blocked"}
                      </Badge>
                    </div>
                  ))}
                  {!dashboard?.risk_highlights?.length ? (
                    <div style={styles.mutedText}>No high-risk procurement highlights.</div>
                  ) : null}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>Recommendation aging</div>
                <div style={styles.metricLine}>
                  <strong>0-2 days:</strong> {formatNumber(dashboard.recommendation_aging.buckets["0_2_days"], 0)} · <strong>3-6:</strong> {formatNumber(dashboard.recommendation_aging.buckets["3_6_days"], 0)} · <strong>7-13:</strong> {formatNumber(dashboard.recommendation_aging.buckets["7_13_days"], 0)} · <strong>14+:</strong> {formatNumber(dashboard.recommendation_aging.buckets["14_plus_days"], 0)}
                </div>
                <div style={styles.compactList}>
                  {dashboard.recommendation_aging.oldest_decisions.slice(0, 4).map((row) => (
                    <div key={`aging-${row.product_id}-${row.decided_at}`} style={styles.compactListRow}>
                      <div>
                        <strong>{row.product_name}</strong>
                        <div style={styles.mutedText}>
                          {titleCase(row.decision_status)} · {formatNumber(row.age_days)} days old
                        </div>
                      </div>
                      <Badge tone={row.converted_purchase_order_id ? "good" : "warn"}>
                        {row.converted_purchase_order_id ? "Converted" : "Open"}
                      </Badge>
                    </div>
                  ))}
                  {!dashboard.recommendation_aging.oldest_decisions.length ? (
                    <div style={styles.mutedText}>No persisted recommendation decisions yet.</div>
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
            <h2 style={styles.panelTitle}>Recommendation production review</h2>
            <p style={styles.panelSubtitle}>
              Read-only production check for the current replenishment recommendations: supplier readiness, cost evidence, lead-time evidence, budget blockers, and human approval safety.
            </p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void productionReviewQuery.refetch()}
          >
            Refresh review
          </button>
        </div>
        {productionReviewQuery.isLoading ? (
          <div style={styles.infoBox}>Loading production review...</div>
        ) : null}
        {productionReviewQuery.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(productionReviewQuery.error)}</div>
        ) : null}
        {productionReview ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label="Production status"
                value={titleCase(productionReview.production_status)}
                tone={
                  productionReview.production_status === "blocked"
                    ? "bad"
                    : productionReview.production_status === "needs_review"
                      ? "warn"
                      : "good"
                }
              />
              <StatCard
                label="Ready for approval"
                value={formatNumber(productionReview.readiness_buckets.ready_for_approval, 0)}
                tone="good"
              />
              <StatCard
                label="Blocked"
                value={formatNumber(productionReview.readiness_buckets.blocked, 0)}
                tone={toNumber(productionReview.readiness_buckets.blocked) > 0 ? "bad" : "good"}
              />
              <StatCard
                label="Approved not converted"
                value={formatNumber(productionReview.readiness_buckets.approved_not_converted, 0)}
                tone={toNumber(productionReview.readiness_buckets.approved_not_converted) > 0 ? "warn" : "good"}
              />
              <StatCard
                label="High priority"
                value={formatNumber(productionReview.readiness_buckets.high_priority, 0)}
                tone={toNumber(productionReview.readiness_buckets.high_priority) > 0 ? "warn" : "good"}
              />
              <StatCard
                label="Shortage window"
                value={formatNumber(productionReview.readiness_buckets.shortage_window, 0)}
                tone={toNumber(productionReview.readiness_buckets.shortage_window) > 0 ? "bad" : "good"}
              />
            </div>
            <div style={styles.dashboardColumns}>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>Safety contract</div>
                <div style={styles.metricLine}>
                  Mode: <strong>{titleCase(productionReview.safety_contract.mode)}</strong>
                </div>
                <div style={styles.mutedText}>
                  Mutates inventory: {productionReview.safety_contract.mutates_inventory ? "yes" : "no"} · Creates POs: {productionReview.safety_contract.creates_purchase_orders ? "yes" : "no"} · Approves recommendations: {productionReview.safety_contract.approves_recommendations ? "yes" : "no"}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>Blockers</div>
                <div style={styles.compactList}>
                  {productionReview.blockers.map((blocker) => (
                    <div key={`production-blocker-${blocker.code}`} style={styles.compactListRow}>
                      <div>
                        <strong>{blocker.code || "BLOCKER"}</strong>
                        <div style={styles.blockerText}>{blocker.message || "Production blocker requires review."}</div>
                        {blocker.required_action ? <div style={styles.mutedText}>{blocker.required_action}</div> : null}
                      </div>
                      <Badge tone="bad">{formatNumber(blocker.affected_count ?? 0, 0)}</Badge>
                    </div>
                  ))}
                  {!productionReview.blockers.length ? <div style={styles.mutedText}>No production blockers for current filters.</div> : null}
                </div>
              </div>
              <div style={styles.detailCardWide}>
                <div style={styles.statLabel}>Warnings</div>
                <div style={styles.compactList}>
                  {productionReview.warnings.map((warning) => (
                    <div key={`production-warning-${warning.code}`} style={styles.compactListRow}>
                      <div>
                        <strong>{warning.code || "WARNING"}</strong>
                        <div style={styles.mutedText}>{warning.message || "Recommendation evidence should be reviewed."}</div>
                        {warning.recommended_action ? <div style={styles.mutedText}>{warning.recommended_action}</div> : null}
                      </div>
                      <Badge tone={warning.severity === "high" ? "bad" : "warn"}>{formatNumber(warning.affected_count ?? 0, 0)}</Badge>
                    </div>
                  ))}
                  {!productionReview.warnings.length ? <div style={styles.mutedText}>No warning-level evidence gaps for current filters.</div> : null}
                </div>
              </div>
            </div>
            <div style={styles.detailPanel}>
              <div style={styles.statLabel}>Next safe actions</div>
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
            <h2 style={styles.panelTitle}>Recommendation scheduling engine</h2>
            <p style={styles.panelSubtitle}>
              Preview or execute a bounded scheduled recommendation run using the current lookback, shortage-window, and budget filters. Execution can auto-approve ready rows and optionally generate PO drafts.
            </p>
          </div>
          <div style={styles.buttonRow}>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => scheduledRunMutation.mutate({ dryRun: true })}
              disabled={!canApproveRecommendations || scheduledRunMutation.isPending}
            >
              Preview scheduled run
            </button>
            <button
              style={styles.primaryButton}
              type="button"
              onClick={() => scheduledRunMutation.mutate({ dryRun: false })}
              disabled={!canApproveRecommendations || scheduledRunMutation.isPending}
            >
              Execute scheduled run
            </button>
          </div>
        </div>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Max approvals
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
            Execution note
            <input
              style={styles.input}
              value={scheduledNote}
              onChange={(event) => setScheduledNote(event.target.value)}
            />
          </label>
          <label style={{ ...styles.label, justifyContent: "center" }}>
            <span>Generate PO drafts after approval</span>
            <input
              type="checkbox"
              checked={scheduledConvertToPo && canCreatePurchaseOrderDrafts}
              disabled={!canCreatePurchaseOrderDrafts || scheduledRunMutation.isPending}
              onChange={(event) => setScheduledConvertToPo(event.target.checked)}
            />
          </label>
        </div>
        {!canApproveRecommendations ? (
          <div style={styles.infoBox}>Purchase order approval permission is required to preview or execute scheduled procurement recommendation runs.</div>
        ) : null}
        {!canCreatePurchaseOrderDrafts ? (
          <div style={styles.infoBox}>Purchase order create permission is required before scheduled runs can generate PO drafts.</div>
        ) : null}
        {scheduledRunMutation.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(scheduledRunMutation.error)}</div>
        ) : null}
        {scheduledRunMutation.data ? (
          <div style={styles.detailPanel}>
            <div style={styles.bulkGrid}>
              <StatCard label="Run mode" value={titleCase(scheduledRunMutation.data.run_mode)} />
              <StatCard label="Status" value={titleCase(scheduledRunMutation.data.status)} tone={scheduledRunMutation.data.status === "blocked" ? "bad" : scheduledRunMutation.data.status === "completed_with_warnings" ? "warn" : "good"} />
              <StatCard label="Candidates" value={formatNumber(scheduledRunMutation.data.summary.candidate_count, 0)} />
              <StatCard label="Ready" value={formatNumber(scheduledRunMutation.data.summary.ready_count, 0)} tone="good" />
              <StatCard label="Approved" value={formatNumber(scheduledRunMutation.data.summary.approved_count, 0)} />
              <StatCard label="PO drafts" value={formatNumber(scheduledRunMutation.data.summary.po_draft_count, 0)} />
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
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Urgency</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Cost</th>
                    <th style={styles.th}>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {(scheduledRunMutation.data.plan_rows ?? []).slice(0, 10).map((row) => (
                    <tr key={`scheduled-${row.product_id}`} style={styles.tr}>
                      <td style={styles.td}>{row.product_name || row.product_id}</td>
                      <td style={styles.td}>{row.supplier_name || "-"}</td>
                      <td style={styles.td}>{titleCase(row.urgency)}</td>
                      <td style={styles.td}>{formatNumber(row.recommended_reorder_quantity)}</td>
                      <td style={styles.td}>{formatMoney(row.estimated_total_cost)}</td>
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
            <h2 style={styles.panelTitle}>Procurement execution history</h2>
            <p style={styles.panelSubtitle}>
              Auditable trail of recommendation decisions, scheduled runs, PO draft conversion outcomes, and automation execution status.
            </p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void executionHistoryQuery.refetch()}
          >
            Refresh history
          </button>
        </div>
        {executionHistoryQuery.isLoading ? (
          <div style={styles.infoBox}>Loading procurement execution history...</div>
        ) : null}
        {executionHistoryQuery.isError ? (
          <div style={styles.errorBox}>{getErrorMessage(executionHistoryQuery.error)}</div>
        ) : null}
        {executionHistoryQuery.data ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard label="Decision events" value={formatNumber(executionHistoryQuery.data.summary.decision_event_count, 0)} />
              <StatCard label="Approved" value={formatNumber(executionHistoryQuery.data.summary.approved_count, 0)} tone="good" />
              <StatCard label="Converted" value={formatNumber(executionHistoryQuery.data.summary.converted_count, 0)} />
              <StatCard label="Scheduled runs" value={formatNumber(executionHistoryQuery.data.summary.schedule_run_count, 0)} />
              <StatCard label="Blocked runs" value={formatNumber(executionHistoryQuery.data.summary.blocked_run_count, 0)} tone={toNumber(executionHistoryQuery.data.summary.blocked_run_count) > 0 ? "bad" : "good"} />
              <StatCard label="PO drafts" value={formatNumber(executionHistoryQuery.data.summary.po_draft_count, 0)} />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>When</th>
                    <th style={styles.th}>Event</th>
                    <th style={styles.th}>Subject</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Cost</th>
                    <th style={styles.th}>PO linkage</th>
                  </tr>
                </thead>
                <tbody>
                  {executionHistoryQuery.data.timeline.slice(0, 20).map((event, index) => {
                    const isRun = event.event_type === "scheduled_run";
                    const subject = isRun
                      ? `${titleCase(String(event.run_mode || "scheduled_run"))} · ${formatNumber(event.candidate_count as string | number | undefined, 0)} candidates`
                      : String(event.product_name || event.recommendation_key || event.product_id || "Recommendation");
                    const status = String(event.status || "-");
                    const poLink = isRun
                      ? `${formatNumber(event.po_draft_count as string | number | undefined, 0)} draft(s)`
                      : String(event.converted_po_number || event.converted_purchase_order_id || "-");
                    return (
                      <tr key={`execution-history-${index}-${String(event.occurred_at || "")}`} style={styles.tr}>
                        <td style={styles.td}>{event.occurred_at ? new Date(String(event.occurred_at)).toLocaleString() : "-"}</td>
                        <td style={styles.td}>{isRun ? "Scheduled run" : "Decision"}</td>
                        <td style={styles.td}>{subject}</td>
                        <td style={styles.td}><Badge tone={status === "blocked" || status === "rejected" ? "bad" : status === "deferred" || status === "completed_with_warnings" ? "warn" : "good"}>{titleCase(status)}</Badge></td>
                        <td style={styles.td}>{formatMoney(event.estimated_total_cost as string | number | null | undefined)}</td>
                        <td style={styles.td}>{poLink}</td>
                      </tr>
                    );
                  })}
                  {executionHistoryQuery.data.timeline.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>No procurement execution history yet.</td>
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
            <h2 style={styles.panelTitle}>Procurement exception queue</h2>
            <p style={styles.panelSubtitle}>
              Operational blockers and warnings across supplier assignment, quantity, stockout, approval, conversion, budget, and package governance.
            </p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => void exceptionQueueQuery.refetch()}
          >
            Refresh exceptions
          </button>
        </div>
        {exceptionQueueQuery.isLoading ? (
          <div style={styles.infoBox}>Loading procurement exceptions...</div>
        ) : null}
        {exceptionQueueQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(exceptionQueueQuery.error)}
          </div>
        ) : null}
        {exceptionResolutionMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(exceptionResolutionMutation.error)}
          </div>
        ) : null}
        {exceptionResolutionMutation.data ? (
          <div style={styles.infoBox}>
            Resolution {titleCase(exceptionResolutionMutation.data.action)} completed: {formatNumber(exceptionResolutionMutation.data.cleared_exception_count, 0)} cleared, {formatNumber(exceptionResolutionMutation.data.remaining_exception_count, 0)} remaining.
          </div>
        ) : null}
        {!canApproveRecommendations ? (
          <div style={styles.infoBox}>Purchase order approval permission is required to resolve procurement exceptions or apply recommendation decisions from this page.</div>
        ) : null}
        {exceptions ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label="Total exceptions"
                value={formatNumber(exceptions.summary.total_exceptions, 0)}
                tone={toNumber(exceptions.summary.total_exceptions) > 0 ? "warn" : "good"}
              />
              <StatCard
                label="Critical"
                value={formatNumber(exceptions.summary.critical_count, 0)}
                tone={toNumber(exceptions.summary.critical_count) > 0 ? "bad" : "good"}
              />
              <StatCard
                label="High"
                value={formatNumber(exceptions.summary.high_count, 0)}
                tone={toNumber(exceptions.summary.high_count) > 0 ? "bad" : "good"}
              />
              <StatCard
                label="Affected products"
                value={formatNumber(exceptions.summary.affected_product_count, 0)}
              />
              <StatCard
                label="Affected suppliers"
                value={formatNumber(exceptions.summary.affected_supplier_count, 0)}
              />
            </div>
            <div style={{ ...styles.tableWrap, marginTop: 12 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Exception</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Coverage</th>
                    <th style={styles.th}>Decision</th>
                    <th style={styles.th}>Resolution</th>
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
                          {titleCase(exception.severity)}
                        </Badge>
                        <div style={styles.primaryText}>{titleCase(exception.code)}</div>
                        <div style={styles.mutedText}>{titleCase(exception.category)}</div>
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
                        <div style={styles.mutedText}>{titleCase(exception.urgency || "unknown")}</div>
                        <div style={styles.mutedText}>
                          Recommend {formatNumber(exception.recommended_reorder_quantity)} · {formatMoney(exception.estimated_total_cost)}
                        </div>
                      </td>
                      <td style={styles.td}>{exception.supplier_name || "Unassigned"}</td>
                      <td style={styles.td}>
                        {exception.estimated_days_of_coverage === null || exception.estimated_days_of_coverage === undefined
                          ? "No projection"
                          : `${formatNumber(exception.estimated_days_of_coverage)} days`}
                        <div style={styles.mutedText}>Depletion {exception.projected_depletion_date || "-"}</div>
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
                          {titleCase(exception.decision_status || "pending")}
                        </Badge>
                        {exception.converted_purchase_order_id ? (
                          <div style={styles.mutedText}>Converted</div>
                        ) : null}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.mutedText}>{exception.resolution_hint || "Review recommendation detail."}</div>
                        {exception.code === "MISSING_SUPPLIER" ? (
                          <input
                            style={{ ...styles.input, marginTop: 8, width: "100%" }}
                            value={exceptionSupplierIds[exception.exception_key] || ""}
                            onChange={(event) => updateExceptionSupplierId(exception.exception_key, event.target.value)}
                            placeholder="Supplier UUID"
                          />
                        ) : null}
                        <textarea
                          style={{ ...styles.textarea, marginTop: 8, width: "100%", minHeight: 54 }}
                          value={exceptionResolutionNotes[exception.exception_key] || ""}
                          onChange={(event) => updateExceptionNote(exception.exception_key, event.target.value)}
                          placeholder="Resolution note"
                        />
                        <div style={styles.exceptionActionRow}>
                          {exception.code === "MISSING_SUPPLIER" ? (
                            <button
                              style={styles.secondaryButton}
                              type="button"
                              disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                              onClick={() => resolveException(exception, "assign_supplier")}
                            >
                              Assign supplier
                            </button>
                          ) : null}
                          <button
                            style={styles.secondaryButton}
                            type="button"
                            disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                            onClick={() => resolveException(exception, "rerun")}
                          >
                            Re-run
                          </button>
                          <button
                            style={styles.secondaryButton}
                            type="button"
                            disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                            onClick={() => resolveException(exception, "suppress")}
                          >
                            Suppress
                          </button>
                          <button
                            style={styles.secondaryButton}
                            type="button"
                            disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                            onClick={() => resolveException(exception, "defer")}
                          >
                            Defer
                          </button>
                          {exception.procurement_ready ? (
                            <button
                              style={styles.primaryButton}
                              type="button"
                              disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                              onClick={() => resolveException(exception, "approve")}
                            >
                              Approve
                            </button>
                          ) : null}
                          <button
                            style={styles.dangerButton}
                            type="button"
                            disabled={!canApproveRecommendations || exceptionResolutionMutation.isPending}
                            onClick={() => resolveException(exception, "reject")}
                          >
                            Reject
                          </button>
                        </div>
                        {resolvingExceptionKey?.startsWith(`${exception.product_id}:`) ? (
                          <div style={styles.mutedText}>Applying resolution...</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {exceptions.rows.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>
                        No procurement exceptions found for the current filters.
                      </td>
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
            <h2 style={styles.panelTitle}>Queue controls</h2>
            <p style={styles.panelSubtitle}>
              Filter recommendations before future approval and PO conversion
              flows are added.
            </p>
          </div>
          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Reset
          </button>
        </div>
        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Search
            <input
              style={styles.input}
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Product, supplier, SKU..."
            />
          </label>
          <label style={styles.label}>
            Urgency
            <select
              style={styles.input}
              value={filters.urgency}
              onChange={(event) => setFilter("urgency", event.target.value)}
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label style={styles.label}>
            Procurement readiness
            <select
              style={styles.input}
              value={filters.procurementReady}
              onChange={(event) =>
                setFilter("procurementReady", event.target.value)
              }
            >
              <option value="">All</option>
              <option value="true">Ready</option>
              <option value="false">Blocked</option>
            </select>
          </label>
          <label style={styles.label}>
            Shortage window
            <select
              style={styles.input}
              value={filters.shortageWindowDays}
              onChange={(event) =>
                setFilter("shortageWindowDays", event.target.value)
              }
            >
              <option value="">Any</option>
              <option value="7">≤ 7 days</option>
              <option value="14">≤ 14 days</option>
              <option value="30">≤ 30 days</option>
              <option value="60">≤ 60 days</option>
            </select>
          </label>
          <label style={styles.label}>
            Budget limit
            <input
              style={styles.input}
              type="number"
              min={0}
              step="0.01"
              value={filters.budgetLimit}
              onChange={(event) => setFilter("budgetLimit", event.target.value)}
              placeholder="Optional spend cap"
            />
          </label>
          <label style={styles.label}>
            Lookback days
            <input
              style={styles.input}
              type="number"
              min={1}
              max={90}
              value={filters.lookbackDays}
              onChange={(event) =>
                setFilter("lookbackDays", Number(event.target.value) || 30)
              }
            />
          </label>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Bulk approval controls</h2>
            <p style={styles.panelSubtitle}>
              Select recommendations from the current page, run readiness
              preview, then approve, defer, or reject in one governed action.
            </p>
          </div>
          <div style={styles.actionRow}>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={selectPageReady}
              disabled={rows.length === 0}
            >
              Select page-ready
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              onClick={() => {
                setSelectedProductIds([]);
                bulkReadinessMutation.reset();
                poDraftConversionMutation.reset();
              }}
              disabled={selectedProductIds.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
        <div style={styles.bulkGrid}>
          <StatCard
            label="Selected"
            value={formatNumber(selectedProductIds.length, 0)}
          />
          <StatCard
            label="Approvable selected"
            value={formatNumber(approvableSelectedCount, 0)}
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
            label="PO-draft ready"
            value={formatNumber(poConvertibleSelectedCount, 0)}
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
            label="Blocked selected"
            value={formatNumber(
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
          Bulk decision note
          <textarea
            style={styles.textarea}
            value={bulkDecisionNote}
            onChange={(event) => setBulkDecisionNote(event.target.value)}
            placeholder="Optional note applied to every selected recommendation"
          />
        </label>
        {!canApproveRecommendations ? (
          <div style={styles.infoBox}>Purchase order approval permission is required for bulk readiness, bulk approval, defer, and reject actions.</div>
        ) : null}
        {!canCreatePurchaseOrderDrafts ? (
          <div style={styles.infoBox}>Purchase order create permission is required to convert approved recommendations into PO drafts.</div>
        ) : null}
        {bulkReadinessMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(bulkReadinessMutation.error)}
          </div>
        ) : null}
        {bulkDecisionMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(bulkDecisionMutation.error)}
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
            Readiness preview:{" "}
            {formatNumber(bulkReadiness.summary.ready_count, 0)} ready,{" "}
            {formatNumber(bulkReadiness.summary.blocked_count, 0)} blocked,{" "}
            {formatNumber(bulkReadiness.summary.failed_count, 0)} failed,{" "}
            {formatNumber(bulkReadiness.summary.warning_count, 0)} warnings ·
            estimated spend{" "}
            {formatMoney(bulkReadiness.summary.estimated_total_cost)}.
            {bulkReadiness.summary.budget_status &&
            bulkReadiness.summary.budget_status !== "not_configured" ? (
              <>
                {" "}
                Budget: {titleCase(bulkReadiness.summary.budget_status)} (
                {formatMoney(bulkReadiness.summary.budget_variance)} variance).
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
                        .join("; ") || "Not approvable"}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {bulkDecisionMutation.data ? (
          <div style={styles.infoBox}>
            Bulk decision complete:{" "}
            {formatNumber(bulkDecisionMutation.data.decided_count, 0)} decided,{" "}
            {formatNumber(bulkDecisionMutation.data.blocked_count, 0)} blocked,{" "}
            {formatNumber(bulkDecisionMutation.data.failed_count, 0)} failed.
          </div>
        ) : null}
        {poDraftConversionMutation.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(poDraftConversionMutation.error)}
          </div>
        ) : null}
        {poDraftConversionMutation.data ? (
          <div style={styles.infoBox}>
            PO draft conversion complete:{" "}
            {formatNumber(poDraftConversionMutation.data.converted_count, 0)}{" "}
            recommendations converted into{" "}
            {formatNumber(
              poDraftConversionMutation.data.purchase_order_count,
              0,
            )}{" "}
            draft PO(s).
            <ul style={styles.reasonList}>
              {poDraftConversionMutation.data.purchase_orders.map((po) => (
                <li key={po.purchase_order_id}>
                  {po.po_number} · {po.supplier_name || po.supplier_id} ·{" "}
                  {formatNumber(po.item_count, 0)} item(s) ·{" "}
                  {formatMoney(po.estimated_total_cost)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div style={styles.actionRow}>
          <button
            style={styles.secondaryButton}
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
            Preview approval readiness
          </button>
          <button
            style={styles.primaryButton}
            type="button"
            disabled={
              !canApproveRecommendations ||
              selectedProductIds.length === 0 ||
              !approvalPreviewReady ||
              bulkDecisionMutation.isPending
            }
            onClick={() =>
              bulkDecisionMutation.mutate({
                productIds: selectedProductIds,
                status: "approved",
                note: bulkDecisionNote,
              })
            }
          >
            Bulk approve
          </button>
          <button
            style={styles.primaryButton}
            type="button"
            disabled={
              !canCreatePurchaseOrderDrafts ||
              selectedProductIds.length === 0 ||
              poConvertibleSelectedCount !== selectedProductIds.length ||
              poDraftConversionMutation.isPending
            }
            onClick={() =>
              poDraftConversionMutation.mutate({
                productIds: selectedProductIds,
              })
            }
          >
            Create PO draft(s)
          </button>
          <button
            style={styles.secondaryButton}
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
            Bulk defer
          </button>
          <button
            style={styles.dangerButton}
            type="button"
            disabled={
              !canApproveRecommendations ||
              selectedProductIds.length === 0 || bulkDecisionMutation.isPending
            }
            onClick={() =>
              bulkDecisionMutation.mutate({
                productIds: selectedProductIds,
                status: "rejected",
                note: bulkDecisionNote,
              })
            }
          >
            Bulk reject
          </button>
        </div>
      </section>

      {recommendationsQuery.isLoading ? (
        <div style={styles.infoBox}>Loading procurement recommendations...</div>
      ) : null}
      {recommendationsQuery.isError ? (
        <div style={styles.errorBox}>
          {getErrorMessage(recommendationsQuery.error)}
        </div>
      ) : null}

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Recommendation queue</h2>
            <p style={styles.panelSubtitle}>
              {formatNumber(totalRows, 0)} matching products ·{" "}
              {formatNumber(toNumber(pagination?.returned ?? rows.length), 0)}{" "}
              shown
            </p>
          </div>
          <div style={styles.paginationControls}>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={rows.length === 0}
              onClick={() =>
                exportRecommendationRowsCsv({
                  rows,
                  generatedAt: data?.generated_at,
                  scope: "queue",
                })
              }
            >
              Export queue CSV
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
              Export selected CSV
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canPrevious}
              onClick={() =>
                setFilter("offset", Math.max(0, filters.offset - filters.limit))
              }
            >
              Previous
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canNext}
              onClick={() =>
                setFilter("offset", filters.offset + filters.limit)
              }
            >
              Next
            </button>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Select</th>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Urgency</th>
                <th style={styles.th}>Coverage</th>
                <th style={styles.th}>Reorder qty</th>
                <th style={styles.th}>Supplier</th>
                <th style={styles.th}>Supplier signal</th>
                <th style={styles.th}>Lead/MOQ</th>
                <th style={styles.th}>Package governance</th>
                <th style={styles.th}>Est. cost</th>
                <th style={styles.th}>Readiness</th>
                <th style={styles.th}>Decision</th>
                <th style={styles.th}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.product_id}
                  style={{
                    ...styles.tr,
                    ...(selectedProductId === row.product_id
                      ? styles.selectedTr
                      : {}),
                  }}
                >
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(row.product_id)}
                      onChange={(event) =>
                        toggleSelectedProduct(
                          row.product_id,
                          event.target.checked,
                        )
                      }
                      aria-label={`Select ${row.product_name}`}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.primaryText}>{row.product_name}</div>
                    <div style={styles.mutedText}>
                      {row.category || "Uncategorized"} · {row.unit || "unit"} ·{" "}
                      {titleCase(row.source_signal)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <Badge
                      tone={
                        row.urgency === "critical"
                          ? "bad"
                          : row.urgency === "high" || row.urgency === "medium"
                            ? "warn"
                            : "good"
                      }
                    >
                      {titleCase(row.urgency)}
                    </Badge>
                  </td>
                  <td style={styles.td}>
                    <div>
                      {row.estimated_days_of_coverage === null
                        ? "No usage signal"
                        : `${formatNumber(row.estimated_days_of_coverage)} days`}
                    </div>
                    <div style={styles.mutedText}>
                      Depletion: {row.projected_depletion_date || "-"}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.primaryText}>
                      {formatNumber(row.recommended_reorder_quantity)}{" "}
                      {row.unit || ""}
                    </div>
                    <div style={styles.mutedText}>
                      Current {formatNumber(row.current_quantity)} · Min{" "}
                      {formatNumber(row.min_stock)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div>{row.recommended_supplier_name || "-"}</div>
                    <div style={styles.mutedText}>
                      {row.supplier_sku
                        ? `SKU ${row.supplier_sku}`
                        : titleCase(row.supplier_source)}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div>
                      <Badge
                        tone={
                          row.supplier_selection_confidence === "high"
                            ? "good"
                            : row.supplier_selection_confidence === "blocked"
                              ? "bad"
                              : "warn"
                        }
                      >
                        {titleCase(
                          row.supplier_selection_confidence || "unknown",
                        )}
                      </Badge>
                    </div>
                    <div style={styles.mutedText}>
                      {titleCase(row.supplier_selection_reason)}
                    </div>
                    <div style={styles.mutedText}>
                      Performance: {titleCase(row.supplier_performance_status)}{" "}
                      {row.supplier_performance_score !== null &&
                      row.supplier_performance_score !== undefined
                        ? `· ${formatNumber(row.supplier_performance_score, 0)}`
                        : ""}
                    </div>
                  </td>
                  <td style={styles.td}>
                    {row.lead_time_configured === false
                      ? "Lead time missing"
                      : `${formatNumber(row.lead_time_days, 0)} days`} · MOQ{" "}
                    {formatNumber(row.min_order_quantity)}
                    {row.lead_time_configured === false ? (
                      <div style={styles.warningText}>
                        Using {formatNumber(row.effective_lead_time_days, 0)} effective day(s) plus buffer until configured.
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <div>
                      {row.order_package_name || "Base unit"}
                      {row.recommended_order_package_count !== null &&
                      row.recommended_order_package_count !== undefined
                        ? ` · ${formatNumber(row.recommended_order_package_count, 0)} pack(s)`
                        : ""}
                    </div>
                    <div style={styles.mutedText}>
                      {formatNumber(row.units_per_order_package || 1)}{" "}
                      {row.unit || "unit(s)"}/pack
                    </div>
                    {row.package_rounding_applied ? (
                      <div style={styles.warningText}>
                        Rounded +
                        {formatNumber(row.package_rounding_added_quantity)}{" "}
                        {row.unit || ""}
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <div>
                      {formatMoney(row.estimated_total_cost, row.currency)}
                    </div>
                    <div style={styles.mutedText}>
                      {titleCase(row.estimated_cost_source)}
                    </div>
                    {row.last_purchase_date ? (
                      <div style={styles.mutedText}>
                        Last PO {row.last_purchase_date}
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <Badge
                      tone={
                        row.budget_status === "over_budget"
                          ? "bad"
                          : row.budget_status === "within_budget"
                            ? "good"
                            : "neutral"
                      }
                    >
                      {titleCase(row.budget_status || "not_configured")}
                    </Badge>
                    {row.budget_limit ? (
                      <div style={styles.mutedText}>
                        Limit {formatMoney(row.budget_limit)} · remaining{" "}
                        {formatMoney(row.budget_remaining_after_recommendation)}
                      </div>
                    ) : null}
                    {row.budget_blocker_message ? (
                      <div style={styles.blockerText}>
                        {row.budget_blocker_message}
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <Badge tone={row.procurement_ready ? "good" : "bad"}>
                      {row.procurement_ready ? "Ready" : "Blocked"}
                    </Badge>
                    {row.blocker_message ? (
                      <div style={styles.blockerText}>
                        {row.blocker_message}
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <Badge
                      tone={
                        row.decision_status === "approved"
                          ? "good"
                          : row.decision_status === "rejected"
                            ? "bad"
                            : row.decision_status === "deferred"
                              ? "warn"
                              : "neutral"
                      }
                    >
                      {titleCase(row.decision_status || "pending")}
                    </Badge>
                    {row.decided_at ? (
                      <div style={styles.mutedText}>
                        {new Date(row.decided_at).toLocaleString()}
                      </div>
                    ) : null}
                    {row.converted_purchase_order_id ? (
                      <div style={styles.mutedText}>PO draft created</div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.secondaryButton}
                      type="button"
                      onClick={() => setSelectedProductId(row.product_id)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {!recommendationsQuery.isLoading && rows.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={14}>
                    No procurement recommendations match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>PO draft review workspace</h2>
            <p style={styles.panelSubtitle}>
              Review recommendation-generated purchase order drafts before they
              move through the normal purchase order lifecycle.
            </p>
          </div>
          <div style={styles.actionGroup}>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canViewGeneratedPurchaseOrderDrafts || !poDraftReviewQuery.data?.rows.length}
              onClick={() => {
                if (poDraftReviewQuery.data) {
                  exportPoDraftReviewCsv(poDraftReviewQuery.data);
                }
              }}
            >
              Export PO draft CSV
            </button>
            <button
              style={styles.secondaryButton}
              type="button"
              disabled={!canViewGeneratedPurchaseOrderDrafts}
              onClick={() => void poDraftReviewQuery.refetch()}
            >
              Refresh drafts
            </button>
          </div>
        </div>
        {!canViewGeneratedPurchaseOrderDrafts ? (
          <div style={styles.infoBox}>Purchase order read permission is required to load recommendation-generated PO draft review data.</div>
        ) : null}
        {poDraftReviewQuery.isLoading ? (
          <div style={styles.infoBox}>Loading generated PO drafts...</div>
        ) : null}
        {poDraftReviewQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(poDraftReviewQuery.error)}
          </div>
        ) : null}
        {poDraftReviewQuery.data ? (
          <>
            <div style={styles.bulkGrid}>
              <StatCard
                label="Generated drafts"
                value={formatNumber(
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
                label="Submitted"
                value={formatNumber(
                  poDraftReviewQuery.data.summary.submitted_count,
                  0,
                )}
              />
              <StatCard
                label="Warnings"
                value={formatNumber(
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
                label="Draft spend"
                value={formatMoney(
                  poDraftReviewQuery.data.summary.estimated_total_cost,
                )}
              />
            </div>
            <div style={{ ...styles.tableWrap, marginTop: 12 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>PO draft</th>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Items</th>
                    <th style={styles.th}>Estimated spend</th>
                    <th style={styles.th}>Recommendation linkage</th>
                    <th style={styles.th}>Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {poDraftReviewQuery.data.rows.map((po) => (
                    <tr key={po.purchase_order_id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.primaryText}>{po.po_number}</div>
                        <div style={styles.mutedText}>
                          Created{" "}
                          {po.created_at
                            ? new Date(po.created_at).toLocaleString()
                            : "-"}
                        </div>
                        <div style={styles.mutedText}>
                          Expected {po.expected_delivery_date || "not set"}
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
                          {titleCase(po.review_status || po.status)}
                        </Badge>
                      </td>
                      <td style={styles.td}>
                        <div>{formatNumber(po.item_count, 0)} item(s)</div>
                        <div style={styles.mutedText}>
                          Qty {formatNumber(po.total_quantity)}
                        </div>
                        <ul style={styles.reasonList}>
                          {po.items.slice(0, 3).map((item) => (
                            <li
                              key={`${po.purchase_order_id}-${item.product_id}`}
                            >
                              {item.product_name || item.product_id}:{" "}
                              {formatNumber(item.quantity)} @{" "}
                              {formatMoney(item.unit_cost)}
                              {item.recommendation_key ? (
                                <div style={styles.mutedText}>
                                  Recommendation {item.recommendation_key}
                                </div>
                              ) : null}
                            </li>
                          ))}
                          {po.items.length > 3 ? (
                            <li>+{po.items.length - 3} more</li>
                          ) : null}
                        </ul>
                      </td>
                      <td style={styles.td}>
                        {formatMoney(po.estimated_total_cost)}
                      </td>
                      <td style={styles.td}>
                        <Badge
                          tone={
                            po.recommendation_linkage_complete ? "good" : "bad"
                          }
                        >
                          {po.recommendation_linkage_complete
                            ? "Complete"
                            : "Incomplete"}
                        </Badge>
                        <div style={styles.mutedText}>
                          {formatNumber(po.linked_recommendation_count, 0)} /{" "}
                          {formatNumber(po.item_count, 0)} linked
                        </div>
                      </td>
                      <td style={styles.td}>
                        {po.governance_warnings.length === 0 ? (
                          <Badge tone="good">Clear</Badge>
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
                    </tr>
                  ))}
                  {poDraftReviewQuery.data.rows.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={7}>
                        No recommendation-generated PO drafts found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section style={styles.detailPanel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Recommendation detail</h2>
            <p style={styles.panelSubtitle}>
              Drawer-style inspection for depletion reasoning, usage velocity,
              supplier fit, stock snapshot, and PO readiness.
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
                Export detail CSV
              </button>
              <button
                style={styles.secondaryButton}
                type="button"
                onClick={() => setSelectedProductId(null)}
              >
                Close
              </button>
            </div>
          ) : null}
        </div>

        {!selectedProductId ? (
          <div style={styles.infoBox}>
            Select “Inspect” on a recommendation row to review the procurement
            evidence package.
          </div>
        ) : null}
        {selectedProductId && detailQuery.isLoading ? (
          <div style={styles.infoBox}>Loading recommendation detail...</div>
        ) : null}
        {selectedProductId && detailQuery.isError ? (
          <div style={styles.errorBox}>
            {getErrorMessage(detailQuery.error)}
          </div>
        ) : null}

        {selectedDetail ? (
          <div style={styles.detailGrid}>
            <div style={styles.detailCard}>
              <div style={styles.statLabel}>Product</div>
              <h3 style={styles.detailTitle}>{selectedDetail.product_name}</h3>
              <p style={styles.riskText}>
                {selectedDetail.category || "Uncategorized"} ·{" "}
                {selectedDetail.unit || "unit"} ·{" "}
                {titleCase(selectedDetail.source_signal)}
              </p>
              <Badge tone={selectedDetail.procurement_ready ? "good" : "bad"}>
                {selectedDetail.procurement_ready ? "PO-ready" : "Blocked"}
              </Badge>
              <p style={styles.riskText}>
                Execution scope:{" "}
                {titleCase(
                  selectedDetail.detail?.execution_scope ||
                    "product_replenishment",
                )}
              </p>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>Depletion reasoning</div>
              <div style={styles.metricLine}>
                <strong>ADU:</strong>{" "}
                {formatNumber(selectedDetail.average_daily_usage)}{" "}
                {selectedDetail.unit || ""}/day
              </div>
              <div style={styles.metricLine}>
                <strong>Coverage:</strong>{" "}
                {selectedDetail.estimated_days_of_coverage === null
                  ? "No usage signal"
                  : `${formatNumber(selectedDetail.estimated_days_of_coverage)} days`}
              </div>
              <div style={styles.metricLine}>
                <strong>Projected depletion:</strong>{" "}
                {selectedDetail.projected_depletion_date || "-"}
              </div>
              <div style={styles.metricLine}>
                <strong>Lead time + buffer:</strong>{" "}
                {selectedDetail.lead_time_configured === false
                  ? `Missing lead time · effective ${formatNumber(
                      toNumber(selectedDetail.effective_lead_time_days),
                      0,
                    )} + buffer ${formatNumber(
                      toNumber(selectedDetail.lead_time_buffer_days ?? detailQuery.data?.lead_time_buffer_days),
                      0,
                    )} day(s)`
                  : `${formatNumber(
                      toNumber(selectedDetail.lead_time_days) +
                        toNumber(selectedDetail.lead_time_buffer_days ?? detailQuery.data?.lead_time_buffer_days),
                      0,
                    )} days`}
              </div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>Stock snapshot</div>
              <div style={styles.metricLine}>
                <strong>Current:</strong>{" "}
                {formatNumber(selectedDetail.current_quantity)}{" "}
                {selectedDetail.unit || ""}
              </div>
              <div style={styles.metricLine}>
                <strong>Minimum:</strong>{" "}
                {formatNumber(selectedDetail.min_stock)}{" "}
                {selectedDetail.unit || ""}
              </div>
              <div style={styles.metricLine}>
                <strong>Target coverage:</strong>{" "}
                {formatNumber(detailQuery.data?.target_coverage_days, 0)} days
              </div>
              <div style={styles.metricLine}>
                <strong>Recommended reorder:</strong>{" "}
                {formatNumber(selectedDetail.recommended_reorder_quantity)}{" "}
                {selectedDetail.unit || ""}
              </div>
              <div style={styles.metricLine}>
                <strong>MOQ-adjusted need:</strong>{" "}
                {formatNumber(selectedDetail.moq_adjusted_reorder_quantity)}{" "}
                {selectedDetail.unit || ""}
              </div>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>Budget governance</div>
              <div style={styles.metricLine}>
                <strong>Status:</strong>{" "}
                {titleCase(selectedDetail.budget_status || "not_configured")}
              </div>
              <div style={styles.metricLine}>
                <strong>Limit:</strong>{" "}
                {formatMoney(selectedDetail.budget_limit)}
              </div>
              <div style={styles.metricLine}>
                <strong>Remaining:</strong>{" "}
                {formatMoney(
                  selectedDetail.budget_remaining_after_recommendation,
                )}
              </div>
              {selectedDetail.budget_blocker_message ? (
                <p style={styles.blockerText}>
                  {selectedDetail.budget_blocker_message}
                </p>
              ) : null}
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>Supplier reasoning</div>
              <div style={styles.metricLine}>
                <strong>Supplier:</strong>{" "}
                {selectedDetail.recommended_supplier_name || "-"}
              </div>
              <div style={styles.metricLine}>
                <strong>Confidence:</strong>{" "}
                {titleCase(selectedDetail.supplier_selection_confidence)}
              </div>
              <div style={styles.metricLine}>
                <strong>Reason:</strong>{" "}
                {titleCase(selectedDetail.supplier_selection_reason)}
              </div>
              <div style={styles.metricLine}>
                <strong>Performance:</strong>{" "}
                {titleCase(selectedDetail.supplier_performance_status)}{" "}
                {selectedDetail.supplier_performance_score !== null &&
                selectedDetail.supplier_performance_score !== undefined
                  ? `· ${formatNumber(selectedDetail.supplier_performance_score, 0)}`
                  : ""}
              </div>
              <div style={styles.metricLine}>
                <strong>Last purchase:</strong>{" "}
                {selectedDetail.last_purchase_date || "-"} ·{" "}
                {formatMoney(
                  selectedDetail.last_purchase_unit_cost,
                  selectedDetail.last_purchase_currency ||
                    selectedDetail.currency,
                )}
              </div>
            </div>

            <div style={styles.detailCardWide}>
              <div style={styles.statLabel}>Approval decision</div>
              <div style={styles.metricLine}>
                <strong>Status:</strong>{" "}
                {titleCase(selectedDetail.decision_status || "pending")}
              </div>
              {selectedDetail.decided_at ? (
                <div style={styles.metricLine}>
                  <strong>Decided:</strong>{" "}
                  {new Date(selectedDetail.decided_at).toLocaleString()}
                </div>
              ) : null}
              {selectedDetail.decision_note ? (
                <div style={styles.metricLine}>
                  <strong>Last note:</strong> {selectedDetail.decision_note}
                </div>
              ) : null}
              {selectedDetail.converted_purchase_order_id ? (
                <div style={styles.metricLine}>
                  <strong>PO draft:</strong>{" "}
                  {selectedDetail.converted_purchase_order_id}
                  {selectedDetail.converted_at
                    ? ` · ${new Date(selectedDetail.converted_at).toLocaleString()}`
                    : ""}
                </div>
              ) : null}
              <label style={{ ...styles.label, marginTop: 10 }}>
                Decision note
                <textarea
                  style={styles.textarea}
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Optional approval, rejection, or defer note"
                />
              </label>
              {!canApproveRecommendations ? (
                <div style={styles.infoBox}>Purchase order approval permission is required to approve, defer, or reject this recommendation.</div>
              ) : null}
              {decisionMutation.isError ? (
                <div style={styles.errorBox}>
                  {getErrorMessage(decisionMutation.error)}
                </div>
              ) : null}
              <div style={styles.actionRow}>
                <button
                  style={styles.primaryButton}
                  type="button"
                  disabled={
                    !canApproveRecommendations ||
                    !selectedDetail.detail?.can_generate_po_draft ||
                    decisionMutation.isPending
                  }
                  onClick={() =>
                    decisionMutation.mutate({
                      productId: selectedDetail.product_id,
                      status: "approved",
                      note: decisionNote,
                    })
                  }
                >
                  Approve
                </button>
                <button
                  style={styles.secondaryButton}
                  type="button"
                  disabled={!canApproveRecommendations || decisionMutation.isPending}
                  onClick={() =>
                    decisionMutation.mutate({
                      productId: selectedDetail.product_id,
                      status: "deferred",
                      note: decisionNote,
                    })
                  }
                >
                  Defer
                </button>
                <button
                  style={styles.dangerButton}
                  type="button"
                  disabled={!canApproveRecommendations || decisionMutation.isPending}
                  onClick={() =>
                    decisionMutation.mutate({
                      productId: selectedDetail.product_id,
                      status: "rejected",
                      note: decisionNote,
                    })
                  }
                >
                  Reject
                </button>
              </div>
              {!selectedDetail.detail?.can_generate_po_draft ? (
                <p style={styles.blockerText}>
                  Approval is blocked until the recommendation is
                  procurement-ready and has a positive reorder quantity.
                </p>
              ) : null}
            </div>

            <div style={styles.detailCardWide}>
              <div style={styles.statLabel}>Recommendation explanation</div>
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
              </ul>
            </div>

            <div style={styles.detailCard}>
              <div style={styles.statLabel}>Cost and conversion</div>
              <div style={styles.metricLine}>
                <strong>Unit cost:</strong>{" "}
                {formatMoney(
                  selectedDetail.estimated_unit_cost,
                  selectedDetail.currency,
                )}
              </div>
              <div style={styles.metricLine}>
                <strong>Total cost:</strong>{" "}
                {formatMoney(
                  selectedDetail.estimated_total_cost,
                  selectedDetail.currency,
                )}
              </div>
              <div style={styles.metricLine}>
                <strong>MOQ:</strong>{" "}
                {formatNumber(selectedDetail.min_order_quantity)}{" "}
                {selectedDetail.unit || ""}
              </div>
              <div style={styles.metricLine}>
                <strong>Order package:</strong>{" "}
                {selectedDetail.order_package_name || "Base unit"}
              </div>
              <div style={styles.metricLine}>
                <strong>Package count:</strong>{" "}
                {formatNumber(
                  selectedDetail.recommended_order_package_count,
                  0,
                )}{" "}
                × {formatNumber(selectedDetail.units_per_order_package || 1)}{" "}
                {selectedDetail.unit || "unit(s)"}
              </div>
              {selectedDetail.package_rounding_applied ? (
                <div style={styles.metricLine}>
                  <strong>Package rounding:</strong> +
                  {formatNumber(selectedDetail.package_rounding_added_quantity)}{" "}
                  {selectedDetail.unit || ""}
                </div>
              ) : null}
              <div style={styles.metricLine}>
                <strong>Can generate PO draft:</strong>{" "}
                {selectedDetail.detail?.can_generate_po_draft ? "Yes" : "No"}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.panelTitle}>Highest-risk recommendations</h2>
            <p style={styles.panelSubtitle}>
              Prioritized review list for procurement leads before approval
              automation is added.
            </p>
          </div>
        </div>
        <div style={styles.riskGrid}>
          {highestRiskRows.map((row) => (
            <article key={`risk-${row.product_id}`} style={styles.riskCard}>
              <div style={styles.riskCardHeader}>
                <strong>{row.product_name}</strong>
                <Badge tone={row.urgency === "critical" ? "bad" : "warn"}>
                  {titleCase(row.urgency)}
                </Badge>
              </div>
              <p style={styles.riskText}>
                {row.estimated_days_of_coverage === null
                  ? "Coverage cannot be projected."
                  : `${formatNumber(row.estimated_days_of_coverage)} days of coverage remain.`}
              </p>
              <p style={styles.riskText}>
                Recommend {formatNumber(row.recommended_reorder_quantity)}{" "}
                {row.unit || "units"} from{" "}
                {row.recommended_supplier_name || "unassigned supplier"}.
              </p>
              <p style={styles.riskText}>
                Supplier confidence:{" "}
                {titleCase(row.supplier_selection_confidence || "unknown")} ·{" "}
                {titleCase(row.supplier_performance_status || "unknown")}.
              </p>
              {row.package_rounding_applied ? (
                <p style={styles.riskText}>
                  Package governance rounded the order to{" "}
                  {formatNumber(row.recommended_order_package_count, 0)}{" "}
                  pack(s).
                </p>
              ) : null}
            </article>
          ))}
          {!recommendationsQuery.isLoading && highestRiskRows.length === 0 ? (
            <div style={styles.infoBox}>
              No high-risk recommendations to summarize.
            </div>
          ) : null}
        </div>
      </section>
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
  title: { margin: "6px 0", fontSize: 32, lineHeight: 1.1 },
  subtitle: { margin: 0, maxWidth: 760, color: "#475569", lineHeight: 1.5 },
  generatedBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
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
    borderRadius: 16,
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
    borderRadius: 18,
    background: "#ffffff",
    padding: 18,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.05)",
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
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#ffffff",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "9px 12px",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  primaryButton: {
    border: "1px solid #2563eb",
    borderRadius: 10,
    padding: "9px 12px",
    background: "#2563eb",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  dangerButton: {
    border: "1px solid #dc2626",
    borderRadius: 10,
    padding: "9px 12px",
    background: "#dc2626",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
  },
  actionRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 },
  exceptionActionRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 },
  textarea: {
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#ffffff",
    minHeight: 76,
  },
  paginationControls: { display: "flex", gap: 8 },
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
    border: "1px solid #c7d2fe",
    borderRadius: 18,
    background: "#ffffff",
    padding: 18,
    boxShadow: "0 8px 24px rgba(79, 70, 229, 0.08)",
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
  reasonList: {
    margin: "8px 0 0",
    paddingLeft: 18,
    color: "#475569",
    lineHeight: 1.5,
  },
};
