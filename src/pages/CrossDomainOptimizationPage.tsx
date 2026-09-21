import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
// Historical multilingual guard compatibility: import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './decisionIntelligencePages.css';
import './CrossDomainOptimizationPage.css';

type OptimizationView = 'evidence' | 'plan' | 'readiness';

type OptimizationFilterState = {
  optimization_domain: string;
  optimization_status: string;
  objective_type: string;
  option_status: string;
  impact_direction: string;
  result_status: string;
  limit: string;
};

type OptimizationRun = {
  id?: string;
  optimization_key?: string;
  optimization_label?: string;
  optimization_domain?: string;
  optimization_status?: string;
  title?: string;
  summary?: string;
  confidence_score?: number | string | null;
  selected_option_id?: string | null;
  owner_user_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  due_at?: string | null;
  next_action?: string | null;
  review_requested_at?: string | null;
  intelligence_review_status?: string | null;
  intelligence_review_decision?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type OptimizationObjective = {
  id?: string;
  optimization_id?: string;
  optimization_label?: string;
  objective_type?: string;
  objective_domain?: string;
  weight?: number | string | null;
  target_direction?: string;
  target_reference?: Record<string, unknown>;
  constraint_reference?: Record<string, unknown>;
  confidence_score?: number | string | null;
  created_at?: string;
  [key: string]: unknown;
};

type ScoreExplanation = {
  aggregate_score?: number | string | null;
  confidence_score?: number | string | null;
  projected_outcome?: Record<string, unknown>;
  tradeoff_summary?: Record<string, unknown>;
  objective_targets?: Array<Record<string, unknown>>;
  positive_drivers?: Array<Record<string, unknown>>;
  downside_drivers?: Array<Record<string, unknown>>;
  actual_outcomes?: Array<Record<string, unknown>>;
};

type OptimizationOption = {
  id?: string;
  optimization_id?: string;
  optimization_label?: string;
  option_label?: string;
  option_status?: string;
  title?: string;
  summary?: string;
  aggregate_score?: number | string | null;
  confidence_score?: number | string | null;
  projected_outcome?: Record<string, unknown>;
  tradeoff_summary?: Record<string, unknown>;
  governance_reference?: Record<string, unknown>;
  score_explanation?: ScoreExplanation;
  created_at?: string;
  [key: string]: unknown;
};

type OptimizationTradeoff = {
  id?: string;
  option_id?: string;
  option_label?: string;
  objective_type?: string;
  tradeoff_domain?: string;
  impact_direction?: string;
  impact_score?: number | string | null;
  confidence_score?: number | string | null;
  governance_status?: string;
  governance_reason?: string | null;
  governance_conditions?: string | null;
  governed_by_name?: string | null;
  governed_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

type OptimizationResult = {
  id?: string;
  optimization_label?: string;
  option_label?: string;
  result_domain?: string;
  result_status?: string;
  realized_value_score?: number | string | null;
  expected_tradeoff?: Record<string, unknown>;
  observed_tradeoff?: Record<string, unknown>;
  comparison_summary?: Record<string, unknown>;
  observed_at?: string;
  [key: string]: unknown;
};

type GovernanceSettings = {
  high_impact_tradeoff_threshold?: number;
  reusable_pattern_value_threshold?: number;
  scaling_value_threshold?: number;
  weak_value_threshold?: number;
  minimum_objective_count?: number;
  minimum_business_domain_count?: number;
  monitoring_cadence?: string;
};

type OptimizationReviewSection = {
  assessment_available?: boolean;
  [key: string]: unknown;
};

type RunDetail = {
  run?: OptimizationRun;
  objectives?: OptimizationObjective[];
  options?: OptimizationOption[];
  tradeoffs?: OptimizationTradeoff[];
  optimization_results?: OptimizationResult[];
  governance_settings?: GovernanceSettings;
  unresolved_high_impact_tradeoff_count?: number;
  handoffs?: Array<{ handoff_type?: string; route?: string; purpose?: string }>;
};

type OptimizationSummary = {
  filters?: Omit<Partial<OptimizationFilterState>, 'limit'> & { review_run_id?: string; limit?: number };
  governance?: Record<string, unknown>;
  review_scope?: {
    review_run_required?: boolean;
    selected_run_id?: string | null;
    selected_run_title?: string | null;
    evidence_is_run_scoped?: boolean;
    mixed_run_review_checks_allowed?: boolean;
  };
  governance_settings?: GovernanceSettings;
  owner_candidates?: Array<{ id: string; name?: string | null; email?: string | null }>;
  run_detail?: RunDetail | null;
  optimization_runs?: OptimizationRun[];
  objectives?: OptimizationObjective[];
  options?: OptimizationOption[];
  tradeoffs?: OptimizationTradeoff[];
  optimization_results?: OptimizationResult[];
  execution_feedback_loop?: OptimizationReviewSection;
  trial_reconciliation?: OptimizationReviewSection;
  promotion_guard?: OptimizationReviewSection;
  pattern_monitoring_plan?: OptimizationReviewSection;
  drift_response_plan?: OptimizationReviewSection;
  pattern_lifecycle_review?: OptimizationReviewSection;
  portfolio_scaling_guard?: OptimizationReviewSection;
};

type DraftObjective = {
  objective_type: string;
  objective_domain: string;
  weight: string;
  target_direction: string;
  target_statement: string;
  constraint_statement: string;
  confidence_score: string;
};

type DraftTradeoff = {
  objective_type: string;
  tradeoff_domain: string;
  impact_direction: string;
  impact_score: string;
  confidence_score: string;
  explanation: string;
};

type DraftOption = {
  title: string;
  summary: string;
  aggregate_score: string;
  confidence_score: string;
  projected_outcome: string;
  tradeoffs: DraftTradeoff[];
};

type DraftReview = {
  title: string;
  summary: string;
  optimization_domain: string;
  owner_user_id: string;
  due_at: string;
  next_action: string;
  objectives: DraftObjective[];
  options: DraftOption[];
};


type ReplenishmentRunListItem = {
  id: string;
  status?: string;
  formula_version?: string;
  target_coverage_days?: number | string;
  summary?: Record<string, number | string | null>;
  created_at?: string;
};

type ReplenishmentPlanningItem = {
  id: string;
  product_id?: string;
  product_name: string;
  product_unit?: string | null;
  storage_location_id?: string;
  storage_location_name: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  shortage_before_transfer: number | string;
  transfer_covered_quantity: number | string;
  remaining_purchase_requirement: number | string;
  recommended_purchase_quantity: number | string;
  estimated_purchase_cost?: number | string | null;
  estimated_cost_currency?: string | null;
  evidence?: {
    supplier?: {
      estimated_unit_cost?: number | string | null;
      min_order_quantity?: number | string | null;
      units_per_package?: number | string | null;
      currency?: string | null;
      lead_time_days?: number | string | null;
    };
    [key: string]: unknown;
  };
};

type ReplenishmentPlanningTransfer = {
  id: string;
  product_name: string;
  product_unit?: string | null;
  source_storage_location_name: string;
  destination_storage_location_name: string;
  recommended_quantity: number | string;
  destination_shortage_before: number | string;
  destination_shortage_after: number | string;
};

type ReplenishmentPlanningDetail = {
  run: ReplenishmentRunListItem;
  items: ReplenishmentPlanningItem[];
  transfers: ReplenishmentPlanningTransfer[];
};

type ComparisonCostTotal = {
  currency: string;
  amount: number;
  covered_lines: number;
};

type ReplenishmentComparisonLine = {
  item_id: string;
  product_name: string;
  storage_location_name: string;
  unit: string | null;
  supplier_name: string | null;
  supplier_configured: boolean;
  shortage_quantity: number;
  internal_transfer_quantity: number;
  transfer_first_purchase_quantity: number;
  supplier_only_purchase_quantity: number;
  transfer_first_estimated_cost: number | null;
  supplier_only_estimated_cost: number | null;
  currency: string | null;
};

type ReplenishmentComparison = {
  run: ReplenishmentRunListItem;
  shortage_line_count: number;
  transfer_recommendation_count: number;
  lines_with_transfer_cover: number;
  lines_fully_covered_by_transfer: number;
  transfer_first_purchase_line_count: number;
  supplier_only_purchase_line_count: number;
  lines_missing_supplier: number;
  transfer_first_cost_known_line_count: number;
  supplier_only_cost_known_line_count: number;
  transfer_first_cost_totals: ComparisonCostTotal[];
  supplier_only_cost_totals: ComparisonCostTotal[];
  lines: ReplenishmentComparisonLine[];
};

type ReviewConfig = {
  key: keyof OptimizationSummary;
  title: string;
  description: string;
  decisionKey: string;
  scoreKey: string;
  checksKey: string;
  blockersKey: string;
};

const DEFAULT_FILTERS: OptimizationFilterState = {
  optimization_domain: '', optimization_status: '', objective_type: '', option_status: '', impact_direction: '', result_status: '', limit: '25'
};

const OPTIMIZATION_DOMAIN_OPTIONS = ['inventory', 'procurement', 'reservation', 'execution', 'optimization', 'control_tower', 'financial', 'integration', 'multi_domain', 'system'];
const OBJECTIVE_DOMAIN_OPTIONS = OPTIMIZATION_DOMAIN_OPTIONS.filter((value) => value !== 'multi_domain');
const OPTIMIZATION_STATUS_OPTIONS = ['draft', 'candidate_generated', 'tradeoff_review', 'governance_review_required', 'approved_for_manual_planning', 'rejected', 'archived'];
const OBJECTIVE_TYPE_OPTIONS = ['sla_risk', 'profitability', 'labor_cost', 'carrying_cost', 'supplier_reliability', 'working_capital', 'facility_load', 'integration_resilience', 'general'];
const TARGET_DIRECTION_OPTIONS = ['minimize', 'maximize', 'balance', 'stabilize'];
const OPTION_STATUS_OPTIONS = ['generated', 'ranked', 'tradeoff_review', 'governance_review_required', 'approved_for_manual_planning', 'rejected', 'superseded'];
const IMPACT_DIRECTION_OPTIONS = ['positive', 'negative', 'neutral', 'mixed'];
const RESULT_STATUS_OPTIONS = ['observed', 'value_confirmed', 'value_missed', 'tradeoff_drift_detected', 'governance_review_required', 'archived'];
const TRADEOFF_GOVERNANCE_OPTIONS = ['open', 'under_review', 'accepted', 'accepted_with_conditions', 'mitigated', 'rejected_unacceptable'];
const MONITORING_CADENCE_OPTIONS = ['weekly_first_30_days_then_monthly', 'weekly', 'biweekly', 'monthly', 'quarterly'];

// v3.49.216: the v3.49.215 all-at-once creation form stays in source for rollback/history, but is no longer rendered.
const SHOW_V349215_LEGACY_CREATE_UI = false;
// v3.49.217: keep all technical classification/scoring controls in source, but do not show them in the normal owner/manager workflow.
const SHOW_CROSS_DOMAIN_TECHNICAL_CLASSIFICATION = false;
// v3.49.220: the v3.49.218 text-driven wizard is preserved in source, but normal creation now requires real application evidence.
const SHOW_V349218_TEXT_DRIVEN_CREATE_UI = false;

/* v3.49.217 guard compatibility — superseded source signatures retained as comments only:
canGovern && hasEvidence ? <button
return `${name} — ${email}`;
*/

/* v3.49.216 guard compatibility — wording kept in source only, not rendered:
ui('What must a good solution achieve?')
ui('These are the things management will use to judge the possible solutions. This page is most useful when two important things compete with each other.')
ui('What could the company actually do?')
ui('Add the realistic choices management is considering. You are not choosing one yet. You are only describing the alternatives so they can be compared.')
ui('The comparison will be saved. You can then open it, compare the solutions, and choose one for review. Nothing is executed automatically.')
*/


const CANONICAL_LABELS: Record<string, string> = {
  inventory: 'Inventory', procurement: 'Procurement', reservation: 'Reservation', execution: 'Execution', optimization: 'Optimization', control_tower: 'Control tower', financial: 'Financial', integration: 'Integration', multi_domain: 'Multi-domain', system: 'System',
  draft: 'Draft', candidate_generated: 'Candidate generated', tradeoff_review: 'Tradeoff review', governance_review_required: 'Governance review required', approved_for_manual_planning: 'Approved for manual planning', rejected: 'Rejected', archived: 'Archived',
  sla_risk: 'Service or availability risk', profitability: 'Profitability', labor_cost: 'Staff cost', carrying_cost: 'Stock holding cost', supplier_reliability: 'Supplier reliability', working_capital: 'Cash tied up in stock', facility_load: 'Workload or capacity', integration_resilience: 'Integration reliability', general: 'Other business goal',
  minimize: 'Lower is better', maximize: 'Higher is better', balance: 'Keep balanced', stabilize: 'Keep stable', generated: 'Generated', ranked: 'Ranked', superseded: 'Superseded', positive: 'Better', negative: 'Worse', neutral: 'No meaningful change', mixed: 'Mixed effect', observed: 'Observed', value_confirmed: 'Value confirmed', value_missed: 'Value missed', tradeoff_drift_detected: 'Tradeoff drift detected',
  open: 'Open', under_review: 'Under review', accepted: 'Accepted', accepted_with_conditions: 'Accepted with conditions', mitigated: 'Mitigated', rejected_unacceptable: 'Rejected as unacceptable',
  weekly_first_30_days_then_monthly: 'Weekly for 30 days, then monthly', weekly: 'Weekly', biweekly: 'Every two weeks', monthly: 'Monthly', quarterly: 'Quarterly',
  not_assessed_no_optimization_evidence: 'Not assessed — no optimization evidence', no_optimization_evidence_available: 'No optimization evidence available', optimization_governance_review_required: 'Governance review is required', controlled_multi_objective_advisory_posture: 'Controlled advisory review',
  ready_for_controlled_manual_trial_feedback: 'Ready to collect feedback from a controlled manual trial', blocked_until_manual_optimization_review: 'Blocked until the option and tradeoffs are reviewed', ready_for_manual_trial_outcome_reconciliation: 'Actual trial outcome is ready for human review', blocked_until_trial_evidence_is_complete: 'Blocked until actual trial evidence is complete', ready_for_manual_pattern_promotion_review: 'Ready for human review as a reusable pattern', blocked_until_promotion_guard_is_clear: 'Blocked until promotion evidence gaps are resolved', ready_for_manual_pattern_monitoring: 'Ready for manual pattern monitoring', blocked_until_monitoring_scope_is_clear: 'Blocked until the monitoring scope is complete', ready_for_manual_drift_response_review: 'Ready for a human drift-response review', blocked_until_drift_response_scope_is_clear: 'Blocked until drift-response evidence is complete', ready_for_manual_continue_recalibrate_or_retire_review: 'Ready for a human continue, recalibrate, or retire review', blocked_until_lifecycle_evidence_is_complete: 'Blocked until lifecycle evidence is complete', ready_for_manual_portfolio_scaling_review: 'Ready for a human scaling review', blocked_until_scaling_evidence_is_complete: 'Blocked until scaling evidence is complete'
};

const REVIEW_SECTIONS: ReviewConfig[] = [
  { key: 'execution_feedback_loop', title: 'Manual trial readiness', description: 'Checks one selected planning run before people collect trial feedback.', decisionKey: 'execution_feedback_decision', scoreKey: 'execution_feedback_score', checksKey: 'feedback_checks', blockersKey: 'feedback_blockers' },
  { key: 'trial_reconciliation', title: 'Actual trial outcome review', description: 'Checks whether actual Learning Feedback is linked to the selected run and option.', decisionKey: 'reconciliation_decision', scoreKey: 'reconciliation_score', checksKey: 'reconciliation_checks', blockersKey: 'reconciliation_blockers' },
  { key: 'promotion_guard', title: 'Reusable-pattern review', description: 'Checks whether the selected run has enough measured evidence for human reusable-pattern review.', decisionKey: 'promotion_decision', scoreKey: 'promotion_guard_score', checksKey: 'promotion_checks', blockersKey: 'promotion_blockers' },
  { key: 'pattern_monitoring_plan', title: 'Pattern monitoring readiness', description: 'Checks whether the selected run has enough evidence to be monitored after a human decision.', decisionKey: 'monitoring_decision', scoreKey: 'monitoring_score', checksKey: 'monitoring_checks', blockersKey: 'monitoring_blockers' },
  { key: 'drift_response_plan', title: 'Outcome drift response', description: 'Checks the selected run for evidence that needs a human drift-response decision.', decisionKey: 'drift_response_decision', scoreKey: 'drift_response_score', checksKey: 'drift_response_checks', blockersKey: 'drift_response_blockers' },
  { key: 'pattern_lifecycle_review', title: 'Pattern lifecycle review', description: 'Checks whether people have enough evidence to continue, recalibrate, or retire the selected pattern.', decisionKey: 'lifecycle_decision', scoreKey: 'lifecycle_score', checksKey: 'lifecycle_checks', blockersKey: 'lifecycle_blockers' },
  { key: 'portfolio_scaling_guard', title: 'Cross-area scaling review', description: 'Checks the selected run before people consider using a proven pattern more widely.', decisionKey: 'portfolio_scaling_decision', scoreKey: 'portfolio_scaling_score', checksKey: 'portfolio_scaling_checks', blockersKey: 'portfolio_scaling_blockers' }
];

const emptyObjective = (): DraftObjective => ({ objective_type: 'sla_risk', objective_domain: 'inventory', weight: '1', target_direction: 'minimize', target_statement: '', constraint_statement: '', confidence_score: '' });
const emptyTradeoff = (): DraftTradeoff => ({ objective_type: 'sla_risk', tradeoff_domain: 'inventory', impact_direction: 'mixed', impact_score: '0.5', confidence_score: '', explanation: '' });
const emptyOption = (): DraftOption => ({ title: '', summary: '', aggregate_score: '', confidence_score: '', projected_outcome: '', tradeoffs: [] });
const emptyReview = (): DraftReview => ({ title: '', summary: '', optimization_domain: 'multi_domain', owner_user_id: '', due_at: '', next_action: '', objectives: [emptyObjective(), emptyObjective()], options: [emptyOption(), emptyOption()] });

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}


function nonNegativeNumber(value: unknown): number {
  return Math.max(numeric(value) ?? 0, 0);
}

function roundedMetric(value: number): number {
  return Number(value.toFixed(4));
}

function ceilToMultiple(value: number, multiple: number): number {
  if (value <= 0) return 0;
  const safeMultiple = Math.max(multiple, 0.0001);
  return roundedMetric(Math.ceil((value - 1e-9) / safeMultiple) * safeMultiple);
}

function buildCostTotals(lines: ReplenishmentComparisonLine[], key: 'transfer_first_estimated_cost' | 'supplier_only_estimated_cost'): ComparisonCostTotal[] {
  const totals = new Map<string, ComparisonCostTotal>();
  for (const line of lines) {
    const amount = line[key];
    const currency = String(line.currency || '').trim();
    if (amount === null || !currency) continue;
    const current = totals.get(currency) || { currency, amount: 0, covered_lines: 0 };
    current.amount = roundedMetric(current.amount + amount);
    current.covered_lines += 1;
    totals.set(currency, current);
  }
  return Array.from(totals.values()).sort((left, right) => left.currency.localeCompare(right.currency));
}

function buildReplenishmentComparison(detail: ReplenishmentPlanningDetail | undefined): ReplenishmentComparison | null {
  if (!detail?.run?.id) return null;
  const shortageItems = (detail.items || []).filter((item) => nonNegativeNumber(item.shortage_before_transfer) > 0);
  const lines: ReplenishmentComparisonLine[] = shortageItems.map((item) => {
    const shortage = nonNegativeNumber(item.shortage_before_transfer);
    const transferCover = Math.min(shortage, nonNegativeNumber(item.transfer_covered_quantity));
    const transferFirstPurchase = nonNegativeNumber(item.recommended_purchase_quantity);
    const currentPlanCost = numeric(item.estimated_purchase_cost);
    const unitCost = numeric(item.evidence?.supplier?.estimated_unit_cost);
    const minimumOrderQuantity = nonNegativeNumber(item.evidence?.supplier?.min_order_quantity);
    const packageSize = Math.max(nonNegativeNumber(item.evidence?.supplier?.units_per_package) || 1, 0.0001);
    const supplierOnlyPurchase = ceilToMultiple(Math.max(shortage, minimumOrderQuantity), packageSize);
    const currency = String(item.estimated_cost_currency || item.evidence?.supplier?.currency || '').trim() || null;
    const supplierOnlyCost = unitCost === null ? null : roundedMetric(unitCost * supplierOnlyPurchase);
    return {
      item_id: item.id,
      product_name: item.product_name,
      storage_location_name: item.storage_location_name,
      unit: String(item.product_unit || '').trim() || null,
      supplier_name: String(item.supplier_name || '').trim() || null,
      supplier_configured: Boolean(item.supplier_id),
      shortage_quantity: roundedMetric(shortage),
      internal_transfer_quantity: roundedMetric(transferCover),
      transfer_first_purchase_quantity: roundedMetric(transferFirstPurchase),
      supplier_only_purchase_quantity: supplierOnlyPurchase,
      transfer_first_estimated_cost: currentPlanCost === null ? null : roundedMetric(currentPlanCost),
      supplier_only_estimated_cost: supplierOnlyCost,
      currency
    };
  });
  const transferRows = (detail.transfers || []).filter((row) => nonNegativeNumber(row.recommended_quantity) > 0);
  return {
    run: detail.run,
    shortage_line_count: lines.length,
    transfer_recommendation_count: transferRows.length,
    lines_with_transfer_cover: lines.filter((line) => line.internal_transfer_quantity > 0).length,
    lines_fully_covered_by_transfer: lines.filter((line) => line.shortage_quantity > 0 && line.internal_transfer_quantity >= line.shortage_quantity - 0.0001).length,
    transfer_first_purchase_line_count: lines.filter((line) => line.transfer_first_purchase_quantity > 0).length,
    supplier_only_purchase_line_count: lines.filter((line) => line.supplier_only_purchase_quantity > 0).length,
    lines_missing_supplier: lines.filter((line) => !line.supplier_configured).length,
    transfer_first_cost_known_line_count: lines.filter((line) => line.transfer_first_estimated_cost !== null && line.currency).length,
    supplier_only_cost_known_line_count: lines.filter((line) => line.supplier_only_estimated_cost !== null && line.currency).length,
    transfer_first_cost_totals: buildCostTotals(lines, 'transfer_first_estimated_cost'),
    supplier_only_cost_totals: buildCostTotals(lines, 'supplier_only_estimated_cost'),
    lines
  };
}

function isReplenishmentProjectedOutcome(value: Record<string, unknown> | undefined): boolean {
  return value?.data_source === 'replenishment_planning' && Array.isArray(value?.comparison_lines);
}

function projectedOutcomeLines(value: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
  return Array.isArray(value?.comparison_lines) ? value.comparison_lines.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')) : [];
}

function projectedOutcomeCostTotals(value: Record<string, unknown> | undefined): ComparisonCostTotal[] {
  const raw = Array.isArray(value?.estimated_purchase_cost_by_currency) ? value.estimated_purchase_cost_by_currency : [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const currency = String(record.currency || '').trim();
    const amount = numeric(record.amount);
    const coveredLines = numeric(record.covered_lines);
    return currency && amount !== null ? [{ currency, amount, covered_lines: Math.max(0, Math.round(coveredLines ?? 0)) }] : [];
  });
}

function formatPercentage(value: unknown, locale: AppLocale): string {
  const parsed = numeric(value);
  if (parsed === null) return '—';
  return `${formatLocalizedNumber(parsed * 100, locale, { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: unknown, locale: AppLocale): string {
  return typeof value === 'string' && value ? formatLocalizedDateTime(value, locale) : '—';
}

function label(value: unknown, ui: (key: string) => string): string {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value);
  return ui(CANONICAL_LABELS[raw] || raw.replaceAll('_', ' '));
}

const REFERENCE_FIELD_LABELS: Record<string, string> = {
  statement: 'Statement',
  summary: 'Summary',
  target: 'Target',
  value: 'Value',
  description: 'Description',
  note: 'Note',
  reason: 'Reason',
  result: 'Result',
  metric: 'Metric',
  unit: 'Unit',
  score: 'Score',
  confidence: 'Confidence',
  status: 'Status',
  expected: 'Expected',
  observed: 'Observed',
  actual: 'Actual',
  projected: 'Projected',
  baseline: 'Baseline'
};

function referenceFieldLabel(key: string, ui: (key: string) => string): string {
  const systemLabel = REFERENCE_FIELD_LABELS[key];
  return systemLabel ? ui(systemLabel) : key;
}

function referenceValueText(value: unknown, locale: AppLocale, ui: (key: string) => string, depth = 0): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? ui('Yes') : ui('No');
  if (typeof value === 'number') return formatLocalizedNumber(value, locale, { maximumFractionDigits: 4 });
  if (typeof value === 'string') return value.trim();
  if (depth > 3) return ui('Additional structured evidence is available.');
  if (Array.isArray(value)) {
    const items = value.map((item) => referenceValueText(item, locale, ui, depth + 1)).filter(Boolean);
    const visibleItems = items.slice(0, 4);
    if (items.length > visibleItems.length) visibleItems.push(ui('Additional structured evidence is available.'));
    return visibleItems.join(', ');
  }

  const record = value as Record<string, unknown>;
  for (const key of ['statement', 'summary', 'target', 'value', 'description', 'note', 'reason', 'result']) {
    const candidate = referenceValueText(record[key], locale, ui, depth + 1);
    if (candidate) return candidate;
  }

  const parts: string[] = [];
  let hiddenStructuredEvidence = false;
  for (const [key, item] of Object.entries(record)) {
    if (item === null || item === undefined || item === '') continue;
    if (parts.length >= 4) {
      hiddenStructuredEvidence = true;
      continue;
    }
    const itemText = referenceValueText(item, locale, ui, depth + 1);
    if (!itemText) continue;
    const keyLabel = referenceFieldLabel(key, ui);
    parts.push(`${keyLabel}: ${itemText}`);
  }
  if (hiddenStructuredEvidence) parts.push(ui('Additional structured evidence is available.'));
  return parts.join(' · ');
}

function referenceText(value: unknown, locale: AppLocale, ui: (key: string) => string): string {
  const text = referenceValueText(value, locale, ui);
  return text || '—';
}

function comparisonSummaryText(value: unknown, locale: AppLocale, ui: (key: string) => string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ui('Comparison available in the recorded evidence.');
  const record = value as Record<string, unknown>;
  const projected = Number(record.projected_score);
  const realized = Number(record.realized_value_score);
  const delta = Number(record.score_delta);
  const parts: string[] = [];
  if (Number.isFinite(projected)) parts.push(`${ui('Projected score')}: ${formatPercentage(projected, locale)}`);
  if (Number.isFinite(realized)) parts.push(`${ui('Actual value score')}: ${formatPercentage(realized, locale)}`);
  if (Number.isFinite(delta)) parts.push(`${ui('Difference')}: ${formatPercentage(delta, locale)}`);
  return parts.length ? parts.join(' · ') : ui('Comparison available in the recorded evidence.');
}

function StatusBadge({ value }: { value?: string | null }) {
  const { ui } = useAppTranslation();
  const normalized = String(value || 'unknown');
  const tone = ['approved_for_manual_planning', 'value_confirmed', 'accepted', 'mitigated', 'ready'].includes(normalized)
    ? 'ok'
    : ['rejected', 'rejected_unacceptable', 'value_missed', 'tradeoff_drift_detected', 'governance_review_required'].includes(normalized)
      ? 'warn'
      : 'neutral';
  return <span className={`cross-domain-badge cross-domain-badge--${tone}`}>{label(normalized, ui)}</span>;
}

function EvidenceSection({ title, description, rows, headers, renderRow }: { title: string; description: string; rows: Array<Record<string, unknown>>; headers: string[]; renderRow: (row: Record<string, unknown>, index: number) => ReactNode }) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="card cross-domain-section">
      <div className="card__header">
        <div><h2>{title}</h2><p className="card__subtext">{description}</p></div>
        <span className="cross-domain-badge cross-domain-badge--neutral">{ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))}</span>
      </div>
      {!rows.length ? <p className="cross-domain-muted">{ui('No matching records were returned.')}</p> : (
        <div className="table-wrap"><table className="data-table cross-domain-table"><thead><tr>{headers.map((header) => <th key={header}>{ui(header)}</th>)}</tr></thead><tbody>{rows.map(renderRow)}</tbody></table></div>
      )}
    </section>
  );
}

function ReviewCard({ config, section }: { config: ReviewConfig; section?: OptimizationReviewSection }) {
  const { locale, ui } = useAppTranslation();
  const checks = Array.isArray(section?.[config.checksKey]) ? section?.[config.checksKey] as Array<Record<string, unknown>> : [];
  const blockers = Array.isArray(section?.[config.blockersKey]) ? section?.[config.blockersKey] as Array<Record<string, unknown>> : [];
  const decision = section?.[config.decisionKey];
  const score = section?.[config.scoreKey];
  return (
    <section className="card cross-domain-section">
      <div className="card__header"><div><h2>{ui(config.title)}</h2><p className="card__subtext">{ui(config.description)}</p></div><StatusBadge value={decision ? String(decision) : null} /></div>
      <div className="cross-domain-review-summary"><strong>{ui('Review score')}</strong><span>{formatPercentage(score, locale)}</span><strong>{ui('Items needing attention')}</strong><span>{formatLocalizedNumber(blockers.length, locale)}</span></div>
      {section?.assessment_available === false ? <p className="cross-domain-muted">{ui('This review is not assessed because the selected run does not yet have the required evidence.')}</p> : (
        <div className="cross-domain-check-list">
          {checks.map((check, index) => (
            <article className="cross-domain-check" key={`${config.title}-${index}`}>
              <div><strong>{check.check_label || check.label ? ui(String(check.check_label || check.label)) : ui('Review check')}</strong><p>{check.manual_resolution || check.required_next_step ? ui(String(check.manual_resolution || check.required_next_step)) : ''}</p></div>
              <StatusBadge value={String(check.check_status || (check.passed === true ? 'ready' : 'blocked'))} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DataBackedOptionEvidence({ outcome, locale, ui }: { outcome: Record<string, unknown>; locale: AppLocale; ui: (key: string) => string }) {
  const lines = projectedOutcomeLines(outcome);
  const costs = projectedOutcomeCostTotals(outcome);
  const strategy = String(outcome.strategy || '');
  const usesTransfers = strategy === 'transfer_first_then_purchase';
  const shortageLines = Math.max(0, Math.round(numeric(outcome.shortage_line_count) ?? lines.length));
  const purchaseLines = Math.max(0, Math.round(numeric(outcome.supplier_purchase_line_count) ?? 0));
  const transferLines = Math.max(0, Math.round(numeric(outcome.lines_with_transfer_cover) ?? 0));
  const missingSupplierLines = Math.max(0, Math.round(numeric(outcome.lines_missing_supplier) ?? 0));
  return (
    <div className="cross-domain-data-evidence">
      <div className="cross-domain-data-metrics">
        <div><span>{ui('Shortage lines')}</span><strong>{formatLocalizedNumber(shortageLines, locale)}</strong></div>
        <div><span>{ui('Lines using internal transfer')}</span><strong>{formatLocalizedNumber(usesTransfers ? transferLines : 0, locale)}</strong></div>
        <div><span>{ui('Lines needing supplier purchase')}</span><strong>{formatLocalizedNumber(purchaseLines, locale)}</strong></div>
        <div><span>{ui('Lines missing a configured supplier')}</span><strong>{formatLocalizedNumber(missingSupplierLines, locale)}</strong></div>
      </div>
      <div className="cross-domain-data-costs">
        <strong>{ui('Estimated supplier purchase cost')}</strong>
        {costs.length ? costs.map((item) => <span key={item.currency}>{formatLocalizedCurrency(item.amount, item.currency, locale, { maximumFractionDigits: 2 })} · {ui('cost known for {count} line(s)').replace('{count}', formatLocalizedNumber(item.covered_lines, locale))}</span>) : <span>{ui('Cost cannot be calculated for these lines because supplier unit cost evidence is incomplete.')}</span>}
      </div>
      {lines.length ? <div className="cross-domain-data-table-wrap"><table className="cross-domain-table cross-domain-data-table"><thead><tr><th>{ui('Product')}</th><th>{ui('Location')}</th><th>{ui('Shortage')}</th><th>{ui('Internal transfer')}</th><th>{ui('Supplier purchase')}</th><th>{ui('Estimated purchase cost')}</th><th>{ui('Supplier')}</th></tr></thead><tbody>{lines.map((line, index) => {
        const unit = String(line.unit || '').trim();
        const quantity = (value: unknown) => `${formatLocalizedNumber(numeric(value) ?? 0, locale, { maximumFractionDigits: 4 })}${unit ? ` ${unit}` : ''}`;
        const currency = String(line.currency || '').trim();
        const cost = numeric(line.estimated_supplier_purchase_cost);
        return <tr key={`${String(line.item_id || 'line')}-${index}`}><td><strong>{String(line.product_name || ui('Product'))}</strong></td><td>{String(line.storage_location_name || '—')}</td><td>{quantity(line.shortage_quantity)}</td><td>{quantity(line.internal_transfer_quantity)}</td><td>{quantity(line.supplier_purchase_quantity)}</td><td>{cost !== null && currency ? formatLocalizedCurrency(cost, currency, locale, { maximumFractionDigits: 2 }) : '—'}</td><td>{String(line.supplier_name || ui('Not configured'))}</td></tr>;
      })}</tbody></table></div> : null}
    </div>
  );
}

function ownerCandidateBaseLabel(user: { id: string; name?: string | null; email?: string | null }): string {
  const name = String(user.name || '').trim();
  const email = String(user.email || '').trim();
  return name || email || user.id;
}

export default function CrossDomainOptimizationPage() {
  const { locale, ui } = useAppTranslation();
  const navigate = useNavigate();
  const canGovern = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN);
  const canOpenIntelligenceReview = hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ) && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const canOpenTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canOpenExecutionRequests = hasPermission(TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW);
  const [view, setView] = useState<OptimizationView>('evidence');
  const [filters, setFilters] = useState<OptimizationFilterState>(DEFAULT_FILTERS);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [reviewDraft, setReviewDraft] = useState<DraftReview>(emptyReview());
  const [sourceRunId, setSourceRunId] = useState('');
  const [tradeoffDrafts, setTradeoffDrafts] = useState<Record<string, { status: string; reason: string; conditions: string }>>({});
  const [ownershipDraft, setOwnershipDraft] = useState({ owner_user_id: '', due_at: '', next_action: '' });
  const [settingsDraft, setSettingsDraft] = useState({ high_impact_tradeoff_threshold: '0.5', reusable_pattern_value_threshold: '0.75', scaling_value_threshold: '0.8', weak_value_threshold: '0.5', minimum_objective_count: '2', minimum_business_domain_count: '2', monitoring_cadence: 'weekly_first_30_days_then_monthly' });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (selectedRunId) params.set('review_run_id', selectedRunId);
    return params.toString();
  }, [filters, selectedRunId]);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['cross-domain-optimization-summary', queryString],
    queryFn: () => apiRequest<OptimizationSummary>(`/decision-intelligence/cross-domain-optimization-summary?${queryString}`)
  });


  const replenishmentRunsQuery = useQuery({
    queryKey: ['cross-domain-replenishment-source-runs'],
    queryFn: () => apiRequest<ReplenishmentRunListItem[]>('/replenishment-planning?limit=100'),
    enabled: showCreate && canGovern,
    retry: false
  });

  const replenishmentRunDetailQuery = useQuery({
    queryKey: ['cross-domain-replenishment-source-run', sourceRunId],
    queryFn: () => apiRequest<ReplenishmentPlanningDetail>(`/replenishment-planning/${encodeURIComponent(sourceRunId)}`),
    enabled: showCreate && canGovern && Boolean(sourceRunId),
    retry: false
  });

  const replenishmentComparison = useMemo(
    () => buildReplenishmentComparison(replenishmentRunDetailQuery.data),
    [replenishmentRunDetailQuery.data]
  );


  const transferFirstPreviewOutcome = useMemo<Record<string, unknown> | null>(() => {
    const comparison = replenishmentComparison;
    if (!comparison) return null;
    return {
      data_source: 'replenishment_planning',
      strategy: 'transfer_first_then_purchase',
      source_run_id: comparison.run.id,
      shortage_line_count: comparison.shortage_line_count,
      lines_with_transfer_cover: comparison.lines_with_transfer_cover,
      supplier_purchase_line_count: comparison.transfer_first_purchase_line_count,
      lines_missing_supplier: comparison.lines_missing_supplier,
      estimated_purchase_cost_by_currency: comparison.transfer_first_cost_totals,
      comparison_lines: comparison.lines.map((line) => ({
        item_id: line.item_id,
        product_name: line.product_name,
        storage_location_name: line.storage_location_name,
        unit: line.unit,
        supplier_name: line.supplier_name,
        shortage_quantity: line.shortage_quantity,
        internal_transfer_quantity: line.internal_transfer_quantity,
        supplier_purchase_quantity: line.transfer_first_purchase_quantity,
        estimated_supplier_purchase_cost: line.transfer_first_estimated_cost,
        currency: line.currency
      }))
    };
  }, [replenishmentComparison]);

  const supplierOnlyPreviewOutcome = useMemo<Record<string, unknown> | null>(() => {
    const comparison = replenishmentComparison;
    if (!comparison) return null;
    return {
      data_source: 'replenishment_planning',
      strategy: 'supplier_purchase_without_recommended_transfers',
      source_run_id: comparison.run.id,
      shortage_line_count: comparison.shortage_line_count,
      lines_with_transfer_cover: 0,
      supplier_purchase_line_count: comparison.supplier_only_purchase_line_count,
      lines_missing_supplier: comparison.lines_missing_supplier,
      estimated_purchase_cost_by_currency: comparison.supplier_only_cost_totals,
      comparison_lines: comparison.lines.map((line) => ({
        item_id: line.item_id,
        product_name: line.product_name,
        storage_location_name: line.storage_location_name,
        unit: line.unit,
        supplier_name: line.supplier_name,
        shortage_quantity: line.shortage_quantity,
        internal_transfer_quantity: 0,
        supplier_purchase_quantity: line.supplier_only_purchase_quantity,
        estimated_supplier_purchase_cost: line.supplier_only_estimated_cost,
        currency: line.currency
      }))
    };
  }, [replenishmentComparison]);

  const ownerCandidates = useMemo(() => {
    const unique = new Map<string, { id: string; name?: string | null; email?: string | null }>();
    for (const candidate of data?.owner_candidates || []) {
      if (!candidate?.id || unique.has(candidate.id)) continue;
      unique.set(candidate.id, candidate);
    }
    return Array.from(unique.values());
  }, [data?.owner_candidates]);

  const ownerCandidateLabels = useMemo(() => {
    const nameCounts = new Map<string, number>();
    for (const user of ownerCandidates) {
      const name = String(user.name || '').trim().toLocaleLowerCase();
      if (name) nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
    const labels = new Map<string, string>();
    for (const user of ownerCandidates) {
      const name = String(user.name || '').trim();
      const email = String(user.email || '').trim();
      const duplicateName = Boolean(name && (nameCounts.get(name.toLocaleLowerCase()) || 0) > 1);
      if (duplicateName && email) labels.set(user.id, `${name} — ${email}`);
      else if (duplicateName) labels.set(user.id, `${name} — ID ${user.id.slice(0, 8)}`);
      else labels.set(user.id, ownerCandidateBaseLabel(user));
    }
    return labels;
  }, [ownerCandidates]);

  const ownerCandidateLabel = (user: { id: string; name?: string | null; email?: string | null }) => ownerCandidateLabels.get(user.id) || ownerCandidateBaseLabel(user);

  const selectedRunDetail = data?.run_detail?.run;

  useEffect(() => {
    if (!showCreate || sourceRunId || !replenishmentRunsQuery.data?.length) return;
    const firstRun = replenishmentRunsQuery.data.find((run) => Boolean(run?.id));
    if (firstRun?.id) setSourceRunId(firstRun.id);
  }, [showCreate, sourceRunId, replenishmentRunsQuery.data]);

  useEffect(() => {
    if (!selectedRunDetail) return;
    setOwnershipDraft({
      owner_user_id: selectedRunDetail.owner_user_id || '',
      due_at: selectedRunDetail.due_at ? String(selectedRunDetail.due_at).slice(0, 10) : '',
      next_action: selectedRunDetail.next_action || ''
    });
  }, [selectedRunDetail]);

  useEffect(() => {
    const settings = data?.governance_settings;
    if (!settings) return;
    setSettingsDraft({
      high_impact_tradeoff_threshold: String(settings.high_impact_tradeoff_threshold ?? 0.5),
      reusable_pattern_value_threshold: String(settings.reusable_pattern_value_threshold ?? 0.75),
      scaling_value_threshold: String(settings.scaling_value_threshold ?? 0.8),
      weak_value_threshold: String(settings.weak_value_threshold ?? 0.5),
      minimum_objective_count: String(settings.minimum_objective_count ?? 2),
      minimum_business_domain_count: String(settings.minimum_business_domain_count ?? 2),
      monitoring_cadence: settings.monitoring_cadence || 'weekly_first_30_days_then_monthly'
    });
  }, [data?.governance_settings]);

  const createDataBackedReview = useMutation({
    mutationFn: async () => {
      const comparison = replenishmentComparison;
      if (!comparison || comparison.shortage_line_count < 1) throw new Error('No actionable replenishment evidence is available for this comparison.');
      const sourceReference = {
        source_type: 'replenishment_planning_run',
        replenishment_run_id: comparison.run.id,
        formula_version: comparison.run.formula_version || null,
        target_coverage_days: numeric(comparison.run.target_coverage_days),
        generated_at: comparison.run.created_at || null,
        user_text_used_for_analysis: false
      };
      const baseOutcome = {
        data_source: 'replenishment_planning',
        source_run_id: comparison.run.id,
        formula_version: comparison.run.formula_version || null,
        target_coverage_days: numeric(comparison.run.target_coverage_days),
        shortage_line_count: comparison.shortage_line_count,
        lines_missing_supplier: comparison.lines_missing_supplier,
        user_text_used_for_analysis: false
      };
      const transferFirstLines = comparison.lines.map((line) => ({
        item_id: line.item_id,
        product_name: line.product_name,
        storage_location_name: line.storage_location_name,
        unit: line.unit,
        supplier_name: line.supplier_name,
        shortage_quantity: line.shortage_quantity,
        internal_transfer_quantity: line.internal_transfer_quantity,
        supplier_purchase_quantity: line.transfer_first_purchase_quantity,
        estimated_supplier_purchase_cost: line.transfer_first_estimated_cost,
        currency: line.currency
      }));
      const supplierOnlyLines = comparison.lines.map((line) => ({
        item_id: line.item_id,
        product_name: line.product_name,
        storage_location_name: line.storage_location_name,
        unit: line.unit,
        supplier_name: line.supplier_name,
        shortage_quantity: line.shortage_quantity,
        internal_transfer_quantity: 0,
        supplier_purchase_quantity: line.supplier_only_purchase_quantity,
        estimated_supplier_purchase_cost: line.supplier_only_estimated_cost,
        currency: line.currency
      }));
      return apiRequest<{ optimization_run_id: string }>('/decision-intelligence/cross-domain-optimization/reviews', {
        method: 'POST',
        skipMutationFeedback: true,
        body: JSON.stringify({
          title: reviewDraft.title.trim(),
          summary: reviewDraft.summary.trim() || null,
          optimization_domain: 'multi_domain',
          owner_user_id: reviewDraft.owner_user_id || null,
          due_at: reviewDraft.due_at || null,
          next_action: reviewDraft.next_action.trim() || 'Review the source figures and select one option before formal human governance review.',
          source_reference: sourceReference,
          objective_profile: {
            generated_from: 'replenishment_planning',
            evidence_run_id: comparison.run.id,
            user_text_used_for_analysis: false
          },
          decision_reference: {
            comparison_basis: 'structured_replenishment_evidence',
            user_text_used_for_analysis: false,
            choices_generated_from_source_data: true
          },
          objectives: [
            {
              objective_type: 'sla_risk',
              objective_domain: 'inventory',
              weight: 1,
              target_direction: 'minimize',
              target_reference: {
                metric: 'shortage_lines_needing_action',
                baseline_count: comparison.shortage_line_count,
                source_run_id: comparison.run.id
              },
              constraint_reference: { facts_only: true, user_text_used_for_analysis: false },
              confidence_score: null
            },
            {
              objective_type: 'working_capital',
              objective_domain: 'procurement',
              weight: 1,
              target_direction: 'minimize',
              target_reference: {
                metric: 'supplier_purchase_exposure',
                source_run_id: comparison.run.id
              },
              constraint_reference: {
                transfer_first_cost_known_lines: comparison.transfer_first_cost_known_line_count,
                supplier_only_cost_known_lines: comparison.supplier_only_cost_known_line_count,
                total_shortage_lines: comparison.shortage_line_count,
                facts_only: true
              },
              confidence_score: null
            }
          ],
          options: [
            {
              title: 'Use internal transfers first, then buy the remainder',
              summary: 'Uses the internal-transfer and supplier-purchase quantities already calculated by Replenishment Planning.',
              option_reference: { strategy: 'transfer_first_then_purchase', source_run_id: comparison.run.id, generated_from_source_data: true },
              projected_outcome: {
                ...baseOutcome,
                strategy: 'transfer_first_then_purchase',
                transfer_recommendation_count: comparison.transfer_recommendation_count,
                lines_with_transfer_cover: comparison.lines_with_transfer_cover,
                lines_fully_covered_by_transfer: comparison.lines_fully_covered_by_transfer,
                supplier_purchase_line_count: comparison.transfer_first_purchase_line_count,
                cost_known_line_count: comparison.transfer_first_cost_known_line_count,
                estimated_purchase_cost_by_currency: comparison.transfer_first_cost_totals,
                comparison_lines: transferFirstLines
              },
              tradeoff_summary: { facts_only: true, unmeasured_effects_not_scored: true },
              governance_reference: { human_selection_required: true, autonomous_execution: false },
              aggregate_score: null,
              confidence_score: null,
              tradeoffs: []
            },
            {
              title: 'Buy the shortage from suppliers without the recommended transfers',
              summary: 'Uses the same shortage evidence, but assumes the recommended internal transfers are not used and the shortage is covered through supplier purchasing.',
              option_reference: { strategy: 'supplier_purchase_without_recommended_transfers', source_run_id: comparison.run.id, generated_from_source_data: true },
              projected_outcome: {
                ...baseOutcome,
                strategy: 'supplier_purchase_without_recommended_transfers',
                transfer_recommendation_count: 0,
                lines_with_transfer_cover: 0,
                lines_fully_covered_by_transfer: 0,
                supplier_purchase_line_count: comparison.supplier_only_purchase_line_count,
                cost_known_line_count: comparison.supplier_only_cost_known_line_count,
                estimated_purchase_cost_by_currency: comparison.supplier_only_cost_totals,
                comparison_lines: supplierOnlyLines
              },
              tradeoff_summary: { facts_only: true, unmeasured_effects_not_scored: true },
              governance_reference: { human_selection_required: true, autonomous_execution: false },
              aggregate_score: null,
              confidence_score: null,
              tradeoffs: []
            }
          ]
        })
      });
    },
    onSuccess: async (result) => {
      setShowCreate(false);
      setCreateStep(1);
      setSourceRunId('');
      setReviewDraft(emptyReview());
      setSelectedRunId(result.optimization_run_id);
      setView('plan');
      await refetch();
    }
  });

  const createReview = useMutation({
    mutationFn: () => apiRequest<{ optimization_run_id: string }>('/decision-intelligence/cross-domain-optimization/reviews', {
      method: 'POST',
      body: JSON.stringify({
        title: reviewDraft.title.trim(),
        summary: reviewDraft.summary.trim() || null,
        optimization_domain: reviewDraft.optimization_domain,
        owner_user_id: reviewDraft.owner_user_id || null,
        due_at: reviewDraft.due_at || null,
        next_action: reviewDraft.next_action.trim() || null,
        objectives: reviewDraft.objectives.map((objective) => ({
          objective_type: objective.objective_type,
          objective_domain: objective.objective_domain,
          weight: Number(objective.weight || 1),
          target_direction: objective.target_direction,
          target_reference: objective.target_statement.trim() ? { statement: objective.target_statement.trim() } : {},
          constraint_reference: objective.constraint_statement.trim() ? { statement: objective.constraint_statement.trim() } : {},
          confidence_score: objective.confidence_score === '' ? null : Number(objective.confidence_score)
        })),
        options: reviewDraft.options.map((option) => ({
          title: option.title.trim(),
          summary: option.summary.trim() || null,
          aggregate_score: option.aggregate_score === '' ? null : Number(option.aggregate_score),
          confidence_score: option.confidence_score === '' ? null : Number(option.confidence_score),
          projected_outcome: option.projected_outcome.trim() ? { summary: option.projected_outcome.trim() } : {},
          tradeoffs: option.tradeoffs.map((tradeoff) => ({
            objective_type: tradeoff.objective_type,
            tradeoff_domain: tradeoff.tradeoff_domain,
            impact_direction: tradeoff.impact_direction,
            impact_score: tradeoff.impact_score === '' ? null : Number(tradeoff.impact_score),
            confidence_score: tradeoff.confidence_score === '' ? null : Number(tradeoff.confidence_score),
            explanation_reference: tradeoff.explanation.trim() ? { summary: tradeoff.explanation.trim() } : {}
          }))
        }))
      })
    }),
    onSuccess: async (result) => {
      setShowCreate(false);
      setCreateStep(1);
      setReviewDraft(emptyReview());
      setSelectedRunId(result.optimization_run_id);
      setView('plan');
      await refetch();
    }
  });

  const runAction = useMutation({
    mutationFn: ({ runId, body }: { runId: string; body: Record<string, unknown> }) => apiRequest(`/decision-intelligence/cross-domain-optimization/runs/${encodeURIComponent(runId)}/action`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => { await refetch(); }
  });

  const governTradeoff = useMutation({
    mutationFn: ({ tradeoffId, draft }: { tradeoffId: string; draft: { status: string; reason: string; conditions: string } }) => apiRequest(`/decision-intelligence/cross-domain-optimization/tradeoffs/${encodeURIComponent(tradeoffId)}/governance`, { method: 'POST', body: JSON.stringify({ governance_status: draft.status, reason: draft.reason.trim() || null, conditions: draft.conditions.trim() || null }) }),
    onSuccess: async (_, variables) => { setTradeoffDrafts((current) => { const next = { ...current }; delete next[variables.tradeoffId]; return next; }); await refetch(); }
  });

  const updateSettings = useMutation({
    mutationFn: () => apiRequest('/decision-intelligence/cross-domain-optimization/settings', {
      method: 'PUT', body: JSON.stringify({
        high_impact_tradeoff_threshold: Number(settingsDraft.high_impact_tradeoff_threshold),
        reusable_pattern_value_threshold: Number(settingsDraft.reusable_pattern_value_threshold),
        scaling_value_threshold: Number(settingsDraft.scaling_value_threshold),
        weak_value_threshold: Number(settingsDraft.weak_value_threshold),
        minimum_objective_count: Number(settingsDraft.minimum_objective_count),
        minimum_business_domain_count: Number(settingsDraft.minimum_business_domain_count),
        monitoring_cadence: settingsDraft.monitoring_cadence
      })
    }),
    onSuccess: async () => { await refetch(); }
  });

  const updateFilter = (key: keyof OptimizationFilterState, value: string) => {
    setSelectedRunId('');
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const runCount = Number(data?.governance?.optimization_run_count ?? data?.optimization_runs?.length ?? 0);
  const objectiveCount = Number(data?.governance?.objective_count ?? data?.objectives?.length ?? 0);
  const optionCount = Number(data?.governance?.option_count ?? data?.options?.length ?? 0);
  const tradeoffCount = Number(data?.governance?.tradeoff_count ?? data?.tradeoffs?.length ?? 0);
  const resultCount = Number(data?.governance?.optimization_result_count ?? data?.optimization_results?.length ?? 0);
  const hasEvidence = runCount + objectiveCount + optionCount + tradeoffCount + resultCount > 0;
  const selectedRun = data?.run_detail?.run;
  const lastRefreshed = dataUpdatedAt ? formatLocalizedDateTime(dataUpdatedAt, locale) : ui('Not refreshed yet');

  if (isLoading) return <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized"><section className="card cross-domain-state"><TenantNavIcon path="/cross-domain-optimization" size={18} /><p>{ui('Loading cross-area optimization evidence…')}</p></section></main>;
  if (error) return <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized"><section className="card card--danger cross-domain-state"><TenantNavIcon path="/alerts" size={18} /><div><h2>{ui('Cross-area optimization evidence could not be loaded')}</h2><p>{ui('Check your Decision Intelligence access and try again.')}</p><button className="button" type="button" onClick={() => void refetch()}>{ui('Retry')}</button></div></section></main>;

  const openRun = (run: OptimizationRun) => {
    if (!run.id) return;
    setSelectedRunId(run.id);
    setView('plan');
  };

  const setTradeoffDraft = (tradeoff: OptimizationTradeoff, patch: Partial<{ status: string; reason: string; conditions: string }>) => {
    if (!tradeoff.id) return;
    setTradeoffDrafts((current) => ({ ...current, [tradeoff.id as string]: { status: current[tradeoff.id as string]?.status || tradeoff.governance_status || 'open', reason: current[tradeoff.id as string]?.reason ?? tradeoff.governance_reason ?? '', conditions: current[tradeoff.id as string]?.conditions ?? tradeoff.governance_conditions ?? '', ...patch } }));
  };

  return (
    <main className="decision-intelligence-page cross-domain-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-cross-domain-optimization-refined="true">
      {/* Legacy safety-contract wording retained for the standing v3.49.170 guard: People remain responsible for every approval and real business action. */}
      <OperationalWorkspaceHero
        iconPath="/cross-domain-optimization"
        eyebrow={ui('Decision intelligence & planning')}
        title={ui('Cross-Domain Optimization')}
        description={ui('Compare different operational actions using structured evidence already stored in the application. Human notes stay human notes; they are never treated as analysis. Nothing on this page changes stock or places orders by itself.')}
        aside={<><OperationalWorkspaceStatus value={label(data?.governance?.cross_domain_optimization_posture, ui)} label={ui('Planning review posture · refreshed {time}').replace('{time}', lastRefreshed)} /><button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? ui('Refreshing…') : ui('Refresh evidence')}</button>{canGovern && hasEvidence && !showCreate ? <button className="button" type="button" onClick={() => { setCreateStep(1); setShowCreate(true); }}>{ui('Create decision comparison')}</button> : null}</>}
      />

      <OperationalWorkspaceStats ariaLabel={ui('Cross-domain optimization evidence summary')}>
        <OperationalWorkspaceStatCard label={ui('Decision comparisons')} value={formatLocalizedNumber(runCount, locale)} iconPath="/cross-domain-optimization" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Priorities')} value={formatLocalizedNumber(objectiveCount, locale)} iconPath="/system-context" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Choices')} value={formatLocalizedNumber(optionCount, locale)} iconPath="/workflow-composer" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Downsides')} value={formatLocalizedNumber(tradeoffCount, locale)} iconPath="/alerts" tone="amber" />
        <OperationalWorkspaceStatCard label={ui('Recorded results')} value={formatLocalizedNumber(resultCount, locale)} iconPath="/decision-learning-feedback" tone="slate" />
        <OperationalWorkspaceStatCard label={ui('Open serious downsides')} value={formatLocalizedNumber(Number(data?.run_detail?.unresolved_high_impact_tradeoff_count ?? data?.governance?.high_impact_tradeoff_count ?? 0), locale)} iconPath="/alerts" tone="amber" />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui('Cross-domain optimization page views')}>
        <OperationalWorkspaceTab active={view === 'evidence'} iconPath="/cross-domain-optimization" label={ui('Comparisons')} onClick={() => setView('evidence')} />
        <OperationalWorkspaceTab active={view === 'plan'} iconPath="/workflow-composer" label={ui('Chosen choice')} disabled={!hasEvidence} title={!hasEvidence ? ui('Create a decision comparison first.') : undefined} onClick={() => setView('plan')} />
        <OperationalWorkspaceTab active={view === 'readiness'} iconPath="/reliability-command" label={ui('Is it ready?')} disabled={!hasEvidence} title={!hasEvidence ? ui('Create a decision comparison first.') : undefined} onClick={() => setView('readiness')} />
      </OperationalWorkspaceTabs>

      {showCreate && canGovern ? (
        <section className="card cross-domain-section cross-domain-create cross-domain-create--wizard cross-domain-create--data-backed">
          <div className="card__header cross-domain-create-header">
            <div>
              <span className="cross-domain-eyebrow">{ui('Data-backed comparison')}</span>
              <h2>{ui('Compare actions using facts already in the application')}</h2>
              <p className="card__subtext">{ui('This workflow starts from a real Replenishment Planning run. Your notes are saved for people to read, but the app does not use your wording to calculate the comparison.')}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => { setShowCreate(false); setCreateStep(1); setSourceRunId(''); }}>{ui('Close')}</button>
          </div>

          <div className="cross-domain-wizard-progress" aria-label={ui('Decision comparison steps')}>
            {[
              [1, ui('Choose real data')],
              [2, ui('Your notes')],
              [3, ui('Compare the numbers')],
              [4, ui('Save comparison')]
            ].map(([step, text]) => (
              <div className={`cross-domain-wizard-progress__step${createStep === step ? ' is-current' : ''}${createStep > Number(step) ? ' is-done' : ''}`} key={String(step)}>
                <span>{step}</span><strong>{text}</strong>
              </div>
            ))}
          </div>

          {createStep === 1 ? <section className="cross-domain-wizard-step">
            <div className="cross-domain-wizard-step__intro"><span className="cross-domain-step-number">1</span><div><h3>{ui('Choose the real planning data to compare')}</h3><p>{ui('Cross-Domain Optimization no longer starts from a blank text form. Select a Replenishment Planning run that already contains shortage, transfer, supplier, and cost evidence.')}</p></div></div>
            <div className="cross-domain-human-text-note"><strong>{ui('What the app analyzes')}</strong><span>{ui('Only the structured quantities, transfer recommendations, supplier links, and available supplier-cost evidence from the selected planning run. It does not analyze any sentence you type.')}</span></div>
            {replenishmentRunsQuery.isLoading ? <p className="cross-domain-muted">{ui('Loading Replenishment Planning runs…')}</p> : null}
            {replenishmentRunsQuery.isError ? <div className="cross-domain-source-error"><strong>{ui('Replenishment Planning data is not available to this page.')}</strong><span>{ui('Open Replenishment Planning and make sure your role can read planning runs. A data-backed comparison cannot be created without a readable source run.')}</span><button className="button button--secondary" type="button" onClick={() => navigate('/replenishment-planning')}>{ui('Open Replenishment Planning')}</button></div> : null}
            {!replenishmentRunsQuery.isLoading && !replenishmentRunsQuery.isError ? <label className="cross-domain-source-select"><span className="form-label">{ui('Replenishment Planning run')}</span><span className="cross-domain-field-help">{ui('Choose the saved calculation whose real shortage and replenishment facts should be compared.')}</span><select className="input" value={sourceRunId} onChange={(event) => setSourceRunId(event.target.value)}><option value="">{ui('Select a planning run')}</option>{(replenishmentRunsQuery.data || []).map((run) => <option key={run.id} value={run.id}>{`${run.created_at ? formatDate(run.created_at, locale) : run.id} · ${ui('Coverage')} ${formatLocalizedNumber(numeric(run.target_coverage_days) ?? 0, locale, { maximumFractionDigits: 1 })} ${ui('days')} · ${label(run.status, ui)}`}</option>)}</select></label> : null}
            {sourceRunId && replenishmentRunDetailQuery.isLoading ? <p className="cross-domain-muted">{ui('Loading the selected planning evidence…')}</p> : null}
            {sourceRunId && replenishmentRunDetailQuery.isError ? <p className="cross-domain-error">{ui('The selected planning run could not be loaded. Choose another run or open Replenishment Planning to inspect it.')}</p> : null}
            {replenishmentComparison ? <div className="cross-domain-source-summary"><div><span>{ui('Shortage lines')}</span><strong>{formatLocalizedNumber(replenishmentComparison.shortage_line_count, locale)}</strong></div><div><span>{ui('Transfer recommendations')}</span><strong>{formatLocalizedNumber(replenishmentComparison.transfer_recommendation_count, locale)}</strong></div><div><span>{ui('Lines fully covered by transfer')}</span><strong>{formatLocalizedNumber(replenishmentComparison.lines_fully_covered_by_transfer, locale)}</strong></div><div><span>{ui('Lines missing a configured supplier')}</span><strong>{formatLocalizedNumber(replenishmentComparison.lines_missing_supplier, locale)}</strong></div></div> : null}
            {replenishmentComparison && replenishmentComparison.shortage_line_count === 0 ? <div className="cross-domain-source-error"><strong>{ui('This run has no shortage lines to compare.')}</strong><span>{ui('Choose a planning run with an actual shortage. Cross-Domain Optimization will not create an empty or invented comparison.')}</span></div> : null}
            <div className="cross-domain-wizard-actions cross-domain-wizard-actions--end"><button className="button" type="button" disabled={!replenishmentComparison || replenishmentComparison.shortage_line_count < 1} onClick={() => setCreateStep(2)}>{ui('Continue')}</button></div>
          </section> : null}

          {createStep === 2 ? <section className="cross-domain-wizard-step">
            <div className="cross-domain-wizard-step__intro"><span className="cross-domain-step-number">2</span><div><h3>{ui('Add notes for people')}</h3><p>{ui('These fields help managers understand why the comparison exists and who owns it. They are not inputs to the calculation.')}</p></div></div>
            <div className="cross-domain-human-text-note cross-domain-human-text-note--strong"><strong>{ui('Your text is not analyzed')}</strong><span>{ui('The title, note, and next step are saved with the record for you and your colleagues. Changing the wording does not change the numbers, the choices, or the comparison.')}</span></div>
            <div className="cross-domain-form-grid cross-domain-form-grid--guided">
              <label className="cross-domain-span-2"><span className="form-label">{ui('Comparison title')}</span><span className="cross-domain-field-help">{ui('A name for people to recognize later. This is not analyzed.')}</span><input className="input" value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} placeholder={ui('Example: Replenishment choice for current shortages')} /></label>
              <label className="cross-domain-span-2"><span className="form-label">{ui('Manager note')}</span><span className="cross-domain-field-help">{ui('Optional context for people reading the decision later. The app does not interpret this text.')}</span><textarea className="input" rows={3} value={reviewDraft.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, summary: event.target.value }))} placeholder={ui('Example: We want to decide whether to use available internal stock before buying the shortage from suppliers.')} /></label>
              <label><span className="form-label">{ui('Responsible person')}</span><select className="input" value={reviewDraft.owner_user_id} onChange={(event) => setReviewDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner yet')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select></label>
              <label><span className="form-label">{ui('Decision due date')}</span><input className="input" type="date" value={reviewDraft.due_at} onChange={(event) => setReviewDraft((current) => ({ ...current, due_at: event.target.value }))} /></label>
              <label className="cross-domain-span-2"><span className="form-label">{ui('Next step for people')}</span><span className="cross-domain-field-help">{ui('Optional reminder of what the team should do after reviewing the comparison. This is not analyzed.')}</span><input className="input" value={reviewDraft.next_action} onChange={(event) => setReviewDraft((current) => ({ ...current, next_action: event.target.value }))} placeholder={ui('Example: Review the two data-backed choices with Purchasing and Operations.')} /></label>
            </div>
            <div className="cross-domain-wizard-actions"><button className="button button--secondary" type="button" onClick={() => setCreateStep(1)}>{ui('Back')}</button><button className="button" type="button" disabled={reviewDraft.title.trim().length < 3 || !replenishmentComparison} onClick={() => setCreateStep(3)}>{ui('Compare the numbers')}</button></div>
          </section> : null}

          {createStep === 3 ? <section className="cross-domain-wizard-step">
            <div className="cross-domain-wizard-step__intro"><span className="cross-domain-step-number">3</span><div><h3>{ui('Compare two actions calculated from the same source data')}</h3><p>{ui('The app is not grading your prose and it is not inventing a winner. It is showing how the same shortage changes when recommended internal transfers are used or not used.')}</p></div></div>
            <div className="cross-domain-comparison-basis"><strong>{ui('Same evidence on both sides')}</strong><span>{ui('Both choices use the selected Replenishment Planning run. Only the treatment of the recommended internal transfers changes.')}</span></div>
            {transferFirstPreviewOutcome ? <article className="cross-domain-data-choice"><div className="cross-domain-data-choice__heading"><div><span>{ui('Choice A')}</span><h4>{ui('Use internal transfers first, then buy the remainder')}</h4><p>{ui('Uses the transfer and purchase quantities already calculated by Replenishment Planning.')}</p></div><span className="cross-domain-badge cross-domain-badge--ok">{ui('Source data')}</span></div><DataBackedOptionEvidence outcome={transferFirstPreviewOutcome} locale={locale} ui={ui} /></article> : null}
            {supplierOnlyPreviewOutcome ? <article className="cross-domain-data-choice"><div className="cross-domain-data-choice__heading"><div><span>{ui('Choice B')}</span><h4>{ui('Buy the shortage from suppliers without the recommended transfers')}</h4><p>{ui('Uses the same shortage lines but sets internal transfer coverage to zero, so supplier purchasing must cover the shortage instead.')}</p></div><span className="cross-domain-badge cross-domain-badge--ok">{ui('Source data')}</span></div><DataBackedOptionEvidence outcome={supplierOnlyPreviewOutcome} locale={locale} ui={ui} /></article> : null}
            <div className="cross-domain-comparison-limit"><strong>{ui('What is not calculated')}</strong><span>{ui('The app does not invent transfer labor cost, handling inconvenience, supplier reliability, or any other value that is missing from the selected source. Missing evidence stays visibly missing instead of being guessed.')}</span></div>
            <div className="cross-domain-wizard-actions"><button className="button button--secondary" type="button" onClick={() => setCreateStep(2)}>{ui('Back')}</button><button className="button" type="button" disabled={!replenishmentComparison} onClick={() => setCreateStep(4)}>{ui('Continue to save')}</button></div>
          </section> : null}

          {createStep === 4 ? <section className="cross-domain-wizard-step">
            <div className="cross-domain-wizard-step__intro"><span className="cross-domain-step-number">4</span><div><h3>{ui('Save the data-backed comparison')}</h3><p>{ui('Saving records the source run, the two calculated choices, and your human notes. It does not move stock, create a purchase order, or select a winner.')}</p></div></div>
            <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('Source')}</span><strong>{ui('Replenishment Planning run')}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(1)}>{ui('Change')}</button></div><p>{replenishmentComparison?.run.created_at ? formatDate(replenishmentComparison.run.created_at, locale) : sourceRunId}</p><p className="cross-domain-review-meta">{ui('{count} shortage line(s) are being compared.').replace('{count}', formatLocalizedNumber(replenishmentComparison?.shortage_line_count || 0, locale))}</p></div>
            <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('Human notes')}</span><strong>{reviewDraft.title || '—'}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(2)}>{ui('Edit')}</button></div>{reviewDraft.summary ? <p>{reviewDraft.summary}</p> : <p className="cross-domain-muted">{ui('No manager note was added.')}</p>}<p className="cross-domain-review-meta"><b>{ui('Responsible person')}:</b> {reviewDraft.owner_user_id ? ownerCandidateLabel(ownerCandidates.find((user) => user.id === reviewDraft.owner_user_id) || { id: reviewDraft.owner_user_id }) : ui('Not assigned')} · <b>{ui('Due')}:</b> {reviewDraft.due_at || ui('No deadline')}</p></div>
            <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('Calculated choices')}</span><strong>{ui('2 choices from the same planning run')}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(3)}>{ui('View numbers')}</button></div><div className="cross-domain-review-list"><div><strong>{ui('Use internal transfers first, then buy the remainder')}</strong><span>{ui('Uses the existing transfer recommendations before supplier purchasing.')}</span></div><div><strong>{ui('Buy the shortage from suppliers without the recommended transfers')}</strong><span>{ui('Uses the same shortage evidence with no internal-transfer coverage.')}</span></div></div></div>
            {createDataBackedReview.isError ? <p className="cross-domain-error">{ui('The data-backed comparison could not be saved. Refresh the source data and try again.')}</p> : null}
            <div className="cross-domain-create-footer"><div><strong>{ui('What happens next?')}</strong><p>{ui('Open the saved comparison, inspect the actual figures, and let management choose which action to take forward. The application does not choose or execute an option automatically.')}</p></div><button className="button" type="button" disabled={createDataBackedReview.isPending || !replenishmentComparison || reviewDraft.title.trim().length < 3} onClick={() => createDataBackedReview.mutate()}>{createDataBackedReview.isPending ? ui('Saving…') : ui('Save data-backed comparison')}</button></div>
            <div className="cross-domain-wizard-actions cross-domain-wizard-actions--start"><button className="button button--secondary" type="button" onClick={() => setCreateStep(3)}>{ui('Back')}</button></div>
          </section> : null}
        </section>
      ) : null}

      {SHOW_V349218_TEXT_DRIVEN_CREATE_UI && showCreate && canGovern ? (
        <section className="card cross-domain-section cross-domain-create cross-domain-create--wizard">
          <div className="card__header cross-domain-create-header">
            <div>
              <span className="cross-domain-eyebrow">{ui('Decision comparison')}</span>
              <h2>{ui('Compare different actions before management decides')}</h2>
              <p className="card__subtext">{ui('Use this only when the company has at least two real actions it could take. You are recording those alternatives for management review. Saving the comparison does not change stock, create a purchase order, move inventory, or carry out any choice.')}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => { setShowCreate(false); setCreateStep(1); }}>{ui('Close')}</button>
          </div>

          <div className="cross-domain-wizard-progress" aria-label={ui('Decision comparison steps')}>
            {[
              [1, ui('The problem')],
              [2, ui('What matters')],
              [3, ui('Choices to compare')],
              [4, ui('Check before saving')]
            ].map(([step, text]) => (
              <div className={`cross-domain-wizard-progress__step${createStep === step ? ' is-current' : ''}${createStep > Number(step) ? ' is-done' : ''}`} key={String(step)}>
                <span>{step}</span><strong>{text}</strong>
              </div>
            ))}
          </div>

          {createStep === 1 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro">
                <span className="cross-domain-step-number">1</span>
                <div><h3>{ui('Start with the problem')}</h3><p>{ui('Tell the app what decision the company needs to make. Do not describe the solution yet.')}</p></div>
              </div>
              <div className="cross-domain-wizard-callout"><strong>{ui('Example')}</strong><span>{ui('We keep running out of important products, but we do not want to keep much more stock than necessary.')}</span></div>
              <div className="cross-domain-form-grid cross-domain-form-grid--guided">
                <label className="cross-domain-span-2"><span className="form-label">{ui('What decision are you trying to make?')}</span><span className="cross-domain-field-help">{ui('Give the problem a short name. This becomes the name of the comparison.')}</span><input className="input" value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} placeholder={ui('Example: How should we reduce recurring stock shortages?')} /></label>
                <label className="cross-domain-span-2"><span className="form-label">{ui('What is happening now?')}</span><span className="cross-domain-field-help">{ui('Explain the business problem in ordinary words.')}</span><textarea className="input" rows={4} value={reviewDraft.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, summary: event.target.value }))} placeholder={ui('Example: Several products run out too often, but we do not want to hold unnecessary extra stock.')} /></label>
                <label><span className="form-label">{ui('Who is responsible for getting this decision finished?')}</span><span className="cross-domain-field-help">{ui('Choose the person who will make sure the comparison is reviewed and completed.')}</span><select className="input" value={reviewDraft.owner_user_id} onChange={(event) => setReviewDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner yet')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select></label>
                <label><span className="form-label">{ui('When do you want the decision made?')}</span><span className="cross-domain-field-help">{ui('Optional. Leave it blank if there is no deadline.')}</span><input className="input" type="date" value={reviewDraft.due_at} onChange={(event) => setReviewDraft((current) => ({ ...current, due_at: event.target.value }))} /></label>
              </div>
              {SHOW_CROSS_DOMAIN_TECHNICAL_CLASSIFICATION ? <details className="cross-domain-advanced cross-domain-wizard-optional"><summary>{ui('Optional planning details')}</summary><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('Main business area')}</span><select className="input" value={reviewDraft.optimization_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, optimization_domain: event.target.value }))}>{OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('What should happen next?')}</span><input className="input" value={reviewDraft.next_action} onChange={(event) => setReviewDraft((current) => ({ ...current, next_action: event.target.value }))} placeholder={ui('Example: Review the options with the people responsible for stock and purchasing.')} /></label></div></details> : null}
              <div className="cross-domain-wizard-actions cross-domain-wizard-actions--end"><button className="button" type="button" disabled={!reviewDraft.title.trim()} onClick={() => setCreateStep(2)}>{ui('Continue')}</button></div>
            </section>
          ) : null}

          {createStep === 2 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro">
                <span className="cross-domain-step-number">2</span>
                <div><h3>{ui('What matters when you decide?')}</h3><p>{ui('Write the business results that matter. You do not need to choose technical categories, business areas, directions, or scores here.')}</p></div>
              </div>
              <div className="cross-domain-wizard-callout"><strong>{ui('Example')}</strong><span>{ui('For example: reduce shortages; avoid tying up too much money in extra stock.')}</span></div>
              <div className="cross-domain-plain-note"><strong>{ui('You do not need to classify these priorities.')}</strong><span>{ui('Only write what matters to the business. The app keeps its internal classification defaults automatically, so you are not leaving required fields blank.')}</span></div>
              <div className="cross-domain-builder-list cross-domain-builder-list--guided">
                {reviewDraft.objectives.map((objective, index) => <article className="cross-domain-builder-card cross-domain-builder-card--guided cross-domain-priority-card" key={`wizard-objective-${index}`}>
                  <div className="cross-domain-builder-card__heading"><div><span className="cross-domain-card-kicker">{ui('Priority {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</span><strong>{objective.target_statement.trim() || ui('What matters for this decision?')}</strong></div>{reviewDraft.objectives.length > 1 ? <button className="button button--secondary cross-domain-remove-button" type="button" onClick={() => setReviewDraft((current) => ({ ...current, objectives: current.objectives.filter((_, itemIndex) => itemIndex !== index) }))}>{ui('Remove')}</button> : null}</div>
                  <label><span className="form-label">{ui('What do you want to improve or protect?')}</span><span className="cross-domain-field-help">{ui('Write the business result you care about. Do not use a score or technical term.')}</span><input className="input" value={objective.target_statement} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, target_statement: event.target.value } : item) }))} placeholder={ui('Example: Reduce recurring stock shortages.')} /></label>
                  <label><span className="form-label">{ui('What must not happen while improving it?')}</span><span className="cross-domain-field-help">{ui('Optional. State a limit or downside management does not want to accept.')}</span><input className="input" value={objective.constraint_statement} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, constraint_statement: event.target.value } : item) }))} placeholder={ui('Example: Do not create excessive stock or unnecessary purchasing cost.')} /></label>
                  {SHOW_CROSS_DOMAIN_TECHNICAL_CLASSIFICATION ? <details className="cross-domain-advanced"><summary>{ui('How the app classifies this priority')}</summary><p className="cross-domain-field-help">{ui('These settings are kept for the existing comparison engine. Most users can leave the defaults unless the priority was classified incorrectly.')}</p><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('Priority category')}</span><select className="input" value={objective.objective_type} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, objective_type: event.target.value } : item) }))}>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Business area')}</span><select className="input" value={objective.objective_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, objective_domain: event.target.value } : item) }))}>{OBJECTIVE_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('How should the target move?')}</span><select className="input" value={objective.target_direction} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, target_direction: event.target.value } : item) }))}>{TARGET_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Importance weight')}</span><input className="input" type="number" min="0" step="0.1" value={objective.weight} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, weight: event.target.value } : item) }))} /></label></div></details> : null}
                </article>)}
              </div>
              <button className="button button--secondary cross-domain-add-wide" type="button" onClick={() => setReviewDraft((current) => ({ ...current, objectives: [...current.objectives, emptyObjective()] }))}>{ui('Add another priority')}</button>
              <div className="cross-domain-wizard-actions"><button className="button button--secondary" type="button" onClick={() => setCreateStep(1)}>{ui('Back')}</button><button className="button" type="button" onClick={() => setCreateStep(3)}>{ui('Continue')}</button></div>
            </section>
          ) : null}

          {createStep === 3 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro">
                <span className="cross-domain-step-number">3</span>
                <div><h3>{ui('What choices do you want management to compare?')}</h3><p>{ui('This page does not invent the choices for you. Enter two or more real actions the company is already considering. If there is only one obvious action, you do not need this page.')}</p></div>
              </div>
              <div className="cross-domain-wizard-callout"><strong>{ui('Example')}</strong><span>{ui('Example choices: keep more stock; order more often; move stock between locations before buying more.')}</span></div>
              <div className="cross-domain-plain-note cross-domain-plain-note--choice"><strong>{ui('What is a choice here?')}</strong><span>{ui('It is one real course of action management could take. You are not telling the app what to execute; you are putting alternatives side by side so people can compare them.')}</span></div>
              <div className="cross-domain-builder-list cross-domain-builder-list--guided">
                {reviewDraft.options.map((option, optionIndex) => <article className="cross-domain-builder-card cross-domain-builder-card--guided cross-domain-builder-card--solution" key={`wizard-option-${optionIndex}`}>
                  <div className="cross-domain-builder-card__heading"><div><span className="cross-domain-card-kicker">{ui('Choice {number}').replace('{number}', formatLocalizedNumber(optionIndex + 1, locale))}</span><strong>{option.title.trim() || ui('Unnamed choice')}</strong></div>{reviewDraft.options.length > 2 ? <button className="button button--secondary cross-domain-remove-button" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.filter((_, itemIndex) => itemIndex !== optionIndex) }))}>{ui('Remove')}</button> : null}</div>
                  <div className="cross-domain-form-grid cross-domain-form-grid--guided">
                    <label className="cross-domain-span-2"><span className="form-label">{ui('What could the company do?')}</span><input className="input" value={option.title} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, title: event.target.value } : item) }))} placeholder={ui('Example: Increase minimum stock for frequently short products.')} /></label>
                    <label className="cross-domain-span-2"><span className="form-label">{ui('What would this mean in practice?')}</span><span className="cross-domain-field-help">{ui('Explain what staff or managers would actually change or do if this choice is used.')}</span><textarea className="input" rows={2} value={option.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, summary: event.target.value } : item) }))} placeholder={ui('Example: Raise minimum stock only for products that repeatedly run short.')} /></label>
                    <label className="cross-domain-span-2"><span className="form-label">{ui('What result do you expect from this choice?')}</span><span className="cross-domain-field-help">{ui('Say what you expect to improve if the company chooses this.')}</span><input className="input" value={option.projected_outcome} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, projected_outcome: event.target.value } : item) }))} placeholder={ui('Example: Fewer emergency purchases, with somewhat more stock held.')} /></label>
                  </div>
                  <div className="cross-domain-builder-heading cross-domain-builder-heading--small cross-domain-downside-heading"><div><strong>{ui('Possible drawback')}</strong><p>{ui('A drawback is the cost, risk, or inconvenience the company accepts with this choice.')}</p></div><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: [...item.tradeoffs, emptyTradeoff()] } : item) }))}>{ui('Add a drawback')}</button></div>
                  {!option.tradeoffs.length ? <p className="cross-domain-empty-note">{ui('No drawback has been recorded for this choice.')}</p> : null}
                  {option.tradeoffs.map((tradeoff, tradeoffIndex) => <div className="cross-domain-tradeoff-draft cross-domain-tradeoff-draft--guided" key={`wizard-tradeoff-${tradeoffIndex}`}>
                    <div className="cross-domain-tradeoff-draft__heading"><strong>{ui('Drawback {number}').replace('{number}', formatLocalizedNumber(tradeoffIndex + 1, locale))}</strong><button className="button button--secondary cross-domain-remove-button" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.filter((_, partIndex) => partIndex !== tradeoffIndex) } : item) }))}>{ui('Remove')}</button></div>
                    <label><span className="form-label">{ui('What is the drawback?')}</span><input className="input" value={tradeoff.explanation} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, explanation: event.target.value } : part) } : item) }))} placeholder={ui('Example: More money will be tied up in inventory.')} /></label>
                    {SHOW_CROSS_DOMAIN_TECHNICAL_CLASSIFICATION ? <details className="cross-domain-advanced"><summary>{ui('How the app classifies this downside')}</summary><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('Priority affected')}</span><select className="input" value={tradeoff.objective_type} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, objective_type: event.target.value } : part) } : item) }))}>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Business area')}</span><select className="input" value={tradeoff.tradeoff_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, tradeoff_domain: event.target.value } : part) } : item) }))}>{OBJECTIVE_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Overall effect')}</span><select className="input" value={tradeoff.impact_direction} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, impact_direction: event.target.value } : part) } : item) }))}>{IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Impact score')}</span><input className="input" type="number" min="-1" max="1" step="0.01" value={tradeoff.impact_score} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, impact_score: event.target.value } : part) } : item) }))} /></label></div></details> : null}
                  </div>)}
                  {SHOW_CROSS_DOMAIN_TECHNICAL_CLASSIFICATION ? <details className="cross-domain-advanced"><summary>{ui('Optional scoring')}</summary><p className="cross-domain-field-help">{ui('Leave this blank unless the company already has a justified score for this solution.')}</p><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('Projected score')}</span><input className="input" type="number" min="-1" max="1" step="0.01" value={option.aggregate_score} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, aggregate_score: event.target.value } : item) }))} /></label></div></details> : null}
                </article>)}
              </div>
              <button className="button button--secondary cross-domain-add-wide" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: [...current.options, emptyOption()] }))}>{ui('Add another choice')}</button>
              <div className="cross-domain-wizard-actions"><button className="button button--secondary" type="button" onClick={() => setCreateStep(2)}>{ui('Back')}</button><button className="button" type="button" disabled={reviewDraft.options.length < 2 || reviewDraft.options.some((option) => !option.title.trim())} onClick={() => setCreateStep(4)}>{ui('Review')}</button></div>
            </section>
          ) : null}

          {createStep === 4 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro"><span className="cross-domain-step-number">4</span><div><h3>{ui('Check what you are about to save')}</h3><p>{ui('This screen is only a summary. Creating the comparison saves these choices for review; it does not carry out any solution.')}</p></div></div>
              <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('The problem')}</span><strong>{reviewDraft.title || '—'}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(1)}>{ui('Edit')}</button></div>{reviewDraft.summary ? <p>{reviewDraft.summary}</p> : null}<p className="cross-domain-review-meta"><b>{ui('Responsible person')}:</b> {reviewDraft.owner_user_id ? ownerCandidateLabel(ownerCandidates.find((user) => user.id === reviewDraft.owner_user_id) || { id: reviewDraft.owner_user_id }) : ui('Not assigned')} · <b>{ui('Due')}:</b> {reviewDraft.due_at || ui('No deadline')}</p></div>
              <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('What matters')}</span><strong>{ui('{count} priorities').replace('{count}', formatLocalizedNumber(reviewDraft.objectives.length, locale))}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(2)}>{ui('Edit')}</button></div><div className="cross-domain-review-list">{reviewDraft.objectives.map((objective, index) => <div key={`review-objective-${index}`}><strong>{objective.target_statement || `${ui('Priority')} ${formatLocalizedNumber(index + 1, locale)}`}</strong>{objective.constraint_statement ? <span>{ui('Must not')}: {objective.constraint_statement}</span> : null}</div>)}</div></div>
              <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('Choices to compare')}</span><strong>{ui('{count} choices').replace('{count}', formatLocalizedNumber(reviewDraft.options.length, locale))}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(3)}>{ui('Edit')}</button></div><div className="cross-domain-review-list">{reviewDraft.options.map((option, index) => <div key={`review-option-${index}`}><strong>{option.title || `${ui('Choice')} ${formatLocalizedNumber(index + 1, locale)}`}</strong>{option.summary ? <span>{option.summary}</span> : null}{option.projected_outcome ? <span><b>{ui('Expected result')}:</b> {option.projected_outcome}</span> : null}{option.tradeoffs.filter((tradeoff) => tradeoff.explanation.trim()).map((tradeoff, tradeoffIndex) => <span key={`review-downside-${tradeoffIndex}`}><b>{ui('Possible drawback')}:</b> {tradeoff.explanation}</span>)}</div>)}</div></div>
              {createReview.isError ? <p className="cross-domain-error">{ui('The decision comparison could not be created. Check the required fields and try again.')}</p> : null}
              <div className="cross-domain-create-footer"><div><strong>{ui('What happens next?')}</strong><p>{ui('The comparison will be saved. You can then open it, compare the choices, and record which one management wants to take forward. Nothing is carried out automatically.')}</p></div><button className="button" type="button" disabled={createReview.isPending || !reviewDraft.title.trim() || reviewDraft.options.length < 2 || reviewDraft.options.some((option) => !option.title.trim())} onClick={() => createReview.mutate()}>{createReview.isPending ? ui('Creating…') : ui('Save decision comparison')}</button></div>
              <div className="cross-domain-wizard-actions cross-domain-wizard-actions--start"><button className="button button--secondary" type="button" onClick={() => setCreateStep(3)}>{ui('Back')}</button></div>
            </section>
          ) : null}
        </section>
      ) : null}

      {SHOW_V349215_LEGACY_CREATE_UI && showCreate && canGovern ? (
        <section className="card cross-domain-section cross-domain-create">
          <div className="card__header cross-domain-create-header">
            <div>
              <h2>{ui('Create a decision comparison')}</h2>
              <p className="card__subtext">{ui('Use this when one business problem has more than one possible solution. Describe the decision, what matters, and the solutions you want to compare. Nothing here changes stock, purchasing, reservations, finances, or integrations.')}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => setShowCreate(false)}>{ui('Close')}</button>
          </div>

          <div className="cross-domain-create-guide">
            <div className="cross-domain-create-guide__item"><span>1</span><div><strong>{ui('Describe the decision')}</strong><p>{ui('Say what problem needs a management decision and who is responsible for finishing the review.')}</p></div></div>
            <div className="cross-domain-create-guide__item"><span>2</span><div><strong>{ui('Say what matters')}</strong><p>{ui('Add the results you want to improve and anything that must not get worse.')}</p></div></div>
            <div className="cross-domain-create-guide__item"><span>3</span><div><strong>{ui('Add the possible solutions')}</strong><p>{ui('Describe each solution, what you expect from it, and any downside or compromise.')}</p></div></div>
          </div>

          <section className="cross-domain-create-step">
            <div className="cross-domain-create-step__heading"><span className="cross-domain-step-number">1</span><div><h3>{ui('What decision do you need to make?')}</h3><p>{ui('Start with the business problem. You do not need to know any optimization terminology.')}</p></div></div>
            <div className="cross-domain-form-grid cross-domain-form-grid--guided">
              <label className="cross-domain-span-2"><span className="form-label">{ui('Decision title')}</span><span className="cross-domain-field-help">{ui('A short name for the decision you need to make.')}</span><input className="input" value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} placeholder={ui('Example: How should we reduce recurring stock shortages?')} /></label>
              <label className="cross-domain-span-2"><span className="form-label">{ui('What is the problem?')}</span><span className="cross-domain-field-help">{ui('Describe what is happening and why a decision is needed.')}</span><textarea className="input" rows={3} value={reviewDraft.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, summary: event.target.value }))} placeholder={ui('Example: Several products run out too often, but we do not want to hold unnecessary extra stock.')} /></label>
              <label><span className="form-label">{ui('Main business area')}</span><span className="cross-domain-field-help">{ui('Choose the area most affected by this decision. Use Multi-domain when several areas are involved.')}</span><select className="input" value={reviewDraft.optimization_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, optimization_domain: event.target.value }))}>{OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label>
              <label><span className="form-label">{ui('Who is responsible for finishing this review?')}</span><span className="cross-domain-field-help">{ui('Only active users who are allowed to govern Decision Intelligence are listed.')}</span><select className="input" value={reviewDraft.owner_user_id} onChange={(event) => setReviewDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner yet')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select></label>
              <label><span className="form-label">{ui('When should this decision be made?')}</span><span className="cross-domain-field-help">{ui('Optional deadline for completing the review.')}</span><input className="input" type="date" value={reviewDraft.due_at} onChange={(event) => setReviewDraft((current) => ({ ...current, due_at: event.target.value }))} /></label>
              <label><span className="form-label">{ui('What should happen next?')}</span><span className="cross-domain-field-help">{ui('Optional next step after this comparison is created.')}</span><input className="input" value={reviewDraft.next_action} onChange={(event) => setReviewDraft((current) => ({ ...current, next_action: event.target.value }))} placeholder={ui('Example: Review the options with the people responsible for stock and purchasing.')} /></label>
            </div>
          </section>

          <section className="cross-domain-create-step">
            <div className="cross-domain-builder-heading cross-domain-create-step__heading"><div className="cross-domain-create-step__title"><span className="cross-domain-step-number">2</span><div><h3>{ui('What matters when making this decision?')}</h3><p>{ui('Add the business results or limits that should guide the choice. One card equals one thing that matters.')}</p></div></div><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, objectives: [...current.objectives, emptyObjective()] }))}>{ui('Add another priority')}</button></div>
            <div className="cross-domain-builder-list cross-domain-builder-list--guided">{reviewDraft.objectives.map((objective, index) => <article className="cross-domain-builder-card cross-domain-builder-card--guided" key={`objective-${index}`}>
              <div className="cross-domain-builder-card__heading"><div><span className="cross-domain-card-kicker">{ui('Priority {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</span><strong>{ui('What should this decision protect or improve?')}</strong></div>{reviewDraft.objectives.length > 1 ? <button className="button button--secondary cross-domain-remove-button" type="button" onClick={() => setReviewDraft((current) => ({ ...current, objectives: current.objectives.filter((_, itemIndex) => itemIndex !== index) }))}>{ui('Remove')}</button> : null}</div>
              <div className="cross-domain-form-grid cross-domain-form-grid--guided">
                <label><span className="form-label">{ui('What matters?')}</span><span className="cross-domain-field-help">{ui('Choose the business result this priority represents.')}</span><select className="input" value={objective.objective_type} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, objective_type: event.target.value } : item) }))}>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label>
                <label><span className="form-label">{ui('Where does this matter?')}</span><span className="cross-domain-field-help">{ui('Choose the business area affected by this priority.')}</span><select className="input" value={objective.objective_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, objective_domain: event.target.value } : item) }))}>{OBJECTIVE_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label>
                <label className="cross-domain-span-2"><span className="form-label">{ui('What result do you want?')}</span><span className="cross-domain-field-help">{ui('Write the result you want this decision to achieve.')}</span><input className="input" value={objective.target_statement} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, target_statement: event.target.value } : item) }))} placeholder={ui('Example: Reduce recurring stock shortages.')} /></label>
                <label className="cross-domain-span-2"><span className="form-label">{ui('What must not get worse?')}</span><span className="cross-domain-field-help">{ui('Optional limit or condition that the chosen solution should respect.')}</span><input className="input" value={objective.constraint_statement} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, constraint_statement: event.target.value } : item) }))} placeholder={ui('Example: Do not create excessive stock or unnecessary purchasing cost.')} /></label>
              </div>
              <details className="cross-domain-advanced"><summary>{ui('Advanced comparison settings')}</summary><p className="cross-domain-field-help">{ui('These fields are optional technical controls. Leave the defaults unless you specifically need to tune how this priority is compared.')}</p><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('How should the target move?')}</span><select className="input" value={objective.target_direction} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, target_direction: event.target.value } : item) }))}>{TARGET_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Importance weight')}</span><input className="input" type="number" min="0" step="0.1" value={objective.weight} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, weight: event.target.value } : item) }))} /></label></div></details>
            </article>)}</div>
          </section>

          <section className="cross-domain-create-step">
            <div className="cross-domain-builder-heading cross-domain-create-step__heading"><div className="cross-domain-create-step__title"><span className="cross-domain-step-number">3</span><div><h3>{ui('What solutions are you considering?')}</h3><p>{ui('Add each realistic solution the company may choose. Describe the action, the expected benefit, and any downside.')}</p></div></div><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: [...current.options, emptyOption()] }))}>{ui('Add another solution')}</button></div>
            <div className="cross-domain-builder-list cross-domain-builder-list--guided">{reviewDraft.options.map((option, optionIndex) => <article className="cross-domain-builder-card cross-domain-builder-card--guided cross-domain-builder-card--solution" key={`option-${optionIndex}`}>
              <div className="cross-domain-builder-card__heading"><div><span className="cross-domain-card-kicker">{ui('Choice {number}').replace('{number}', formatLocalizedNumber(optionIndex + 1, locale))}</span><strong>{option.title.trim() || ui('Unnamed choice')}</strong></div>{reviewDraft.options.length > 1 ? <button className="button button--secondary cross-domain-remove-button" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.filter((_, itemIndex) => itemIndex !== optionIndex) }))}>{ui('Remove')}</button> : null}</div>
              <div className="cross-domain-form-grid cross-domain-form-grid--guided">
                <label><span className="form-label">{ui('Solution name')}</span><span className="cross-domain-field-help">{ui('Give this possible solution a short, clear name.')}</span><input className="input" value={option.title} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, title: event.target.value } : item) }))} placeholder={ui('Example: Transfer stock before buying more.')} /></label>
                <label className="cross-domain-span-2"><span className="form-label">{ui('What would we actually do?')}</span><span className="cross-domain-field-help">{ui('Describe the action people would take if the company chooses this solution.')}</span><textarea className="input" rows={2} value={option.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, summary: event.target.value } : item) }))} placeholder={ui('Example: Check other storage locations for spare stock and transfer it before creating a supplier order.')} /></label>
                <label className="cross-domain-span-2"><span className="form-label">{ui('What do you expect to happen?')}</span><span className="cross-domain-field-help">{ui('Describe the result you expect if this solution is used.')}</span><input className="input" value={option.projected_outcome} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, projected_outcome: event.target.value } : item) }))} placeholder={ui('Example: Fewer emergency purchases while using stock the company already owns.')} /></label>
              </div>

              <div className="cross-domain-builder-heading cross-domain-builder-heading--small cross-domain-downside-heading"><div><strong>{ui('Possible downsides or compromises')}</strong><p>{ui('Add these only when choosing this solution could make something else harder, more expensive, slower, or riskier.')}</p></div><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: [...item.tradeoffs, emptyTradeoff()] } : item) }))}>{ui('Add a downside')}</button></div>
              {!option.tradeoffs.length ? <p className="cross-domain-empty-note">{ui('No downside has been added for this solution.')}</p> : null}
              {option.tradeoffs.map((tradeoff, tradeoffIndex) => <div className="cross-domain-tradeoff-draft cross-domain-tradeoff-draft--guided" key={`tradeoff-${tradeoffIndex}`}>
                <div className="cross-domain-tradeoff-draft__heading"><strong>{ui('Drawback {number}').replace('{number}', formatLocalizedNumber(tradeoffIndex + 1, locale))}</strong><button className="button button--secondary cross-domain-remove-button" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.filter((_, partIndex) => partIndex !== tradeoffIndex) } : item) }))}>{ui('Remove')}</button></div>
                <div className="cross-domain-form-grid cross-domain-form-grid--guided"><label className="cross-domain-span-2"><span className="form-label">{ui('What could get better or worse?')}</span><input className="input" value={tradeoff.explanation} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, explanation: event.target.value } : part) } : item) }))} placeholder={ui('Example: Staff will need to make more internal stock transfers.')} /></label><label><span className="form-label">{ui('What business priority does this affect?')}</span><select className="input" value={tradeoff.objective_type} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, objective_type: event.target.value } : part) } : item) }))}>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Where is the effect?')}</span><select className="input" value={tradeoff.tradeoff_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, tradeoff_domain: event.target.value } : part) } : item) }))}>{OBJECTIVE_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Overall effect')}</span><select className="input" value={tradeoff.impact_direction} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, impact_direction: event.target.value } : part) } : item) }))}>{IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label></div>
                <details className="cross-domain-advanced"><summary>{ui('Advanced comparison settings')}</summary><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('Impact score')}</span><input className="input" type="number" min="-1" max="1" step="0.01" value={tradeoff.impact_score} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, impact_score: event.target.value } : part) } : item) }))} /></label></div></details>
              </div>)}
              <details className="cross-domain-advanced"><summary>{ui('Advanced comparison settings')}</summary><p className="cross-domain-field-help">{ui('Projected score is an optional estimate from -1 to 1. Leave it blank if you do not have a justified score.')}</p><div className="cross-domain-form-grid cross-domain-advanced-grid"><label><span className="form-label">{ui('Projected score')}</span><input className="input" type="number" min="-1" max="1" step="0.01" value={option.aggregate_score} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, aggregate_score: event.target.value } : item) }))} /></label></div></details>
            </article>)}</div>
          </section>

          {createReview.isError ? <p className="cross-domain-error">{ui('The decision comparison could not be created. Check the required fields and try again.')}</p> : null}
          <div className="cross-domain-create-footer"><div><strong>{ui('What happens when you create it?')}</strong><p>{ui('The app saves the problem, priorities, possible solutions, and downsides as a planning review. It does not carry out any solution.')}</p></div><button className="button" type="button" disabled={createReview.isPending || !reviewDraft.title.trim() || reviewDraft.options.some((option) => !option.title.trim())} onClick={() => createReview.mutate()}>{createReview.isPending ? ui('Creating…') : ui('Create decision comparison')}</button></div>

          {/*
            v3.49.214 legacy technical creation form retained intentionally.
            It is not rendered because the same underlying fields are presented above in a guided business-user layout.
            The old labels/controls remain here for source history and can be restored without reconstructing them.

            Planning review title -> reviewDraft.title
            Business area -> reviewDraft.optimization_domain
            Owner -> reviewDraft.owner_user_id
            Due date -> reviewDraft.due_at
            Summary -> reviewDraft.summary
            Next required action -> reviewDraft.next_action
            Business objectives -> objective_type, objective_domain, target_direction, weight, target_statement, constraint_statement
            Planning options -> title, aggregate_score, summary, projected_outcome
            Tradeoffs for this option -> objective_type, tradeoff_domain, impact_direction, impact_score, explanation
            Create planning review -> createReview.mutate()
          */}
        </section>
      ) : null}

      {hasEvidence ? <>
      <section className="card cross-domain-section">
        <div className="card__header"><div><h2>{ui('Choose the planning run to review')}</h2><p className="card__subtext">{ui('Review checks are always calculated from one selected run. Evidence from different runs is never pooled into one readiness result.')}</p></div>{selectedRunId ? <span className="cross-domain-badge cross-domain-badge--ok">{ui('Run-scoped checks')}</span> : <span className="cross-domain-badge cross-domain-badge--neutral">{ui('No run selected')}</span>}</div>
        <select className="input" value={selectedRunId} onChange={(event) => setSelectedRunId(event.target.value)}><option value="">{ui('Select a planning run')}</option>{(data?.optimization_runs || []).map((run) => <option key={run.id || run.optimization_key} value={run.id || ''}>{run.title || run.optimization_label || run.optimization_key}</option>)}</select>
      </section>

      <section className="card cross-domain-filters" aria-label={ui('Cross-domain optimization filters')}>
        <div className="card__header"><div><h2>{ui('Filter the evidence')}</h2><p className="card__subtext">{ui('Filters change the overview lists. Selecting a run separately controls every readiness calculation.')}</p></div><button className="button button--secondary" type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setSelectedRunId(''); }}>{ui('Clear filters')}</button></div>
        <div className="cross-domain-filter-grid"><label><span className="form-label">{ui('Business area')}</span><select className="input" value={filters.optimization_domain} onChange={(event) => updateFilter('optimization_domain', event.target.value)}><option value="">{ui('All areas')}</option>{OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Run status')}</span><select className="input" value={filters.optimization_status} onChange={(event) => updateFilter('optimization_status', event.target.value)}><option value="">{ui('All run statuses')}</option>{OPTIMIZATION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Objective type')}</span><select className="input" value={filters.objective_type} onChange={(event) => updateFilter('objective_type', event.target.value)}><option value="">{ui('All objective types')}</option>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Option status')}</span><select className="input" value={filters.option_status} onChange={(event) => updateFilter('option_status', event.target.value)}><option value="">{ui('All option statuses')}</option>{OPTION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Tradeoff direction')}</span><select className="input" value={filters.impact_direction} onChange={(event) => updateFilter('impact_direction', event.target.value)}><option value="">{ui('All directions')}</option>{IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Recorded outcome status')}</span><select className="input" value={filters.result_status} onChange={(event) => updateFilter('result_status', event.target.value)}><option value="">{ui('All outcome statuses')}</option>{RESULT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Maximum records per evidence list')}</span><select className="input" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>{['25', '50', '100', '200'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      </section>

      </> : null}
      {!hasEvidence && !showCreate ? <section className="card cross-domain-section cross-domain-first-use"><div><span className="cross-domain-eyebrow">{ui('Start here')}</span><h2>{ui('No decision comparisons yet')}</h2><p>{canGovern ? ui('Create a comparison from a real Replenishment Planning run. The app will compare structured shortage, transfer, supplier, and available cost evidence; your written notes are only for people reading the decision record.') : ui('No decision comparisons are available for this tenant and filter set.')}</p></div>{canGovern ? <button className="button" type="button" onClick={() => { setCreateStep(1); setShowCreate(true); }}>{ui('Create decision comparison')}</button> : null}</section> : null}

      {view === 'evidence' && hasEvidence ? <>
        <EvidenceSection title={ui('Optimization runs')} description={ui('Stored planning exercises. Open one to see its complete decision story.')} rows={(data?.optimization_runs || []) as Array<Record<string, unknown>>} headers={['Run', 'Business area', 'Status', 'Owner', 'Due', 'Updated', 'Action']} renderRow={(row, index) => { const run = row as OptimizationRun; return <tr key={run.id || index}><td><strong>{run.title || run.optimization_label || ui('Planning run {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{run.summary ? <span className="cross-domain-subtext">{run.summary}</span> : null}</td><td>{label(run.optimization_domain, ui)}</td><td><StatusBadge value={run.optimization_status} /></td><td>{run.owner_name || run.owner_email || '—'}</td><td>{formatDate(run.due_at, locale)}</td><td>{formatDate(run.updated_at || run.created_at, locale)}</td><td><button className="button button--secondary" type="button" onClick={() => openRun(run)}>{ui('Open plan')}</button></td></tr>; }} />
        <EvidenceSection title={ui('Business objectives')} description={ui('The goals, targets, limits, and weights used to compare options.')} rows={(data?.objectives || []) as Array<Record<string, unknown>>} headers={['Run', 'Objective', 'Business area', 'Target', 'Constraint', 'Weight']} renderRow={(row, index) => { const objective = row as OptimizationObjective; return <tr key={objective.id || index}><td>{objective.optimization_label || ui('Linked planning run')}</td><td><strong>{label(objective.objective_type, ui)}</strong><span className="cross-domain-subtext">{label(objective.target_direction, ui)}</span></td><td>{label(objective.objective_domain, ui)}</td><td>{referenceText(objective.target_reference, locale, ui)}</td><td>{referenceText(objective.constraint_reference, locale, ui)}</td><td>{numeric(objective.weight) === null ? '—' : formatLocalizedNumber(Number(objective.weight), locale, { maximumFractionDigits: 2 })}</td></tr>; }} />
        <EvidenceSection title={ui('Planning options')} description={ui('Alternative actions. New data-backed comparisons show their source basis instead of a fabricated score; older historical records keep any score that was originally recorded.')} rows={(data?.options || []) as Array<Record<string, unknown>>} headers={['Run', 'Option', 'Status', 'Comparison basis', 'Confidence']} renderRow={(row, index) => { const option = row as OptimizationOption; const dataBacked = isReplenishmentProjectedOutcome(option.projected_outcome); return <tr key={option.id || index}><td>{option.optimization_label || ui('Linked planning run')}</td><td><strong>{option.title || option.option_label || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{option.summary ? <span className="cross-domain-subtext">{option.summary}</span> : null}</td><td><StatusBadge value={option.option_status} /></td><td>{dataBacked ? ui('Replenishment Planning data') : formatPercentage(option.aggregate_score, locale)}</td><td>{dataBacked ? ui('Not automatically scored') : formatPercentage(option.confidence_score, locale)}</td></tr>; }} />
        <EvidenceSection title={ui('Tradeoffs')} description={ui('Expected benefits and downsides. A formally accepted or mitigated high-impact tradeoff is distinguished from an unresolved one.')} rows={(data?.tradeoffs || []) as Array<Record<string, unknown>>} headers={['Option', 'Objective', 'Business area', 'Direction', 'Impact', 'Governance']} renderRow={(row, index) => { const tradeoff = row as OptimizationTradeoff; return <tr key={tradeoff.id || index}><td>{tradeoff.option_label || ui('Linked planning option')}</td><td>{label(tradeoff.objective_type, ui)}</td><td>{label(tradeoff.tradeoff_domain, ui)}</td><td><StatusBadge value={tradeoff.impact_direction} /></td><td>{formatPercentage(tradeoff.impact_score, locale)}</td><td><StatusBadge value={tradeoff.governance_status} /></td></tr>; }} />
        <EvidenceSection title={ui('Actual optimization outcomes')} description={ui('Results recorded through Learning Feedback after a plan was tried manually.')} rows={(data?.optimization_results || []) as Array<Record<string, unknown>>} headers={['Run', 'Option', 'Outcome', 'Business area', 'Realized value', 'Observed']} renderRow={(row, index) => { const result = row as OptimizationResult; return <tr key={result.id || index}><td>{result.optimization_label || ui('Linked planning run')}</td><td>{result.option_label || ui('No option reference')}</td><td><StatusBadge value={result.result_status} /></td><td>{label(result.result_domain, ui)}</td><td>{formatPercentage(result.realized_value_score, locale)}</td><td>{formatDate(result.observed_at, locale)}</td></tr>; }} />
      </> : null}

      {view === 'plan' ? selectedRun ? <>
        <section className="card cross-domain-section cross-domain-plan-header"><div><span className="cross-domain-eyebrow">{ui('Selected planning run')}</span><h2>{selectedRun.title || selectedRun.optimization_label}</h2><p>{selectedRun.summary || ui('No summary was recorded.')}</p></div><div className="cross-domain-plan-meta"><StatusBadge value={selectedRun.optimization_status} /><span>{ui('Owner')}: {selectedRun.owner_name || selectedRun.owner_email || ui('Not assigned')}</span><span>{ui('Due')}: {formatDate(selectedRun.due_at, locale)}</span><span>{ui('Next action')}: {selectedRun.next_action || ui('Not recorded')}</span>{selectedRun.intelligence_review_decision ? <span>{ui('Intelligence Review')}: {label(selectedRun.intelligence_review_decision, ui)}</span> : null}</div></section>

        {canGovern ? <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Ownership and next action')}</h2><p className="card__subtext">{ui('Keep responsibility, deadline, and the next human step visible. Use the existing Tasks or Execution Requests pages for actual follow-up work instead of duplicating task management here.')}</p></div></div><div className="cross-domain-form-grid"><label><span className="form-label">{ui('Owner')}</span><select className="input" value={ownershipDraft.owner_user_id} onChange={(event) => setOwnershipDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select></label><label><span className="form-label">{ui('Due date')}</span><input className="input" type="date" value={ownershipDraft.due_at} onChange={(event) => setOwnershipDraft((current) => ({ ...current, due_at: event.target.value }))} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Next required action')}</span><input className="input" value={ownershipDraft.next_action} onChange={(event) => setOwnershipDraft((current) => ({ ...current, next_action: event.target.value }))} /></label></div><button className="button" type="button" disabled={runAction.isPending || !selectedRun.id} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'update_ownership', owner_user_id: ownershipDraft.owner_user_id || null, due_at: ownershipDraft.due_at || null, next_action: ownershipDraft.next_action || null } })}>{ui('Save ownership and next action')}</button></section> : null}

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('What this plan is trying to achieve')}</h2><p className="card__subtext">{ui('Targets and constraints are shown directly so a score is not separated from the business goal it is supposed to serve.')}</p></div></div><div className="cross-domain-objective-grid">{(data?.run_detail?.objectives || []).map((objective, index) => <article className="cross-domain-objective-card" key={objective.id || index}><strong>{label(objective.objective_type, ui)}</strong><span>{label(objective.objective_domain, ui)} · {label(objective.target_direction, ui)}</span><p><b>{ui('Target')}:</b> {referenceText(objective.target_reference, locale, ui)}</p><p><b>{ui('Constraint')}:</b> {referenceText(objective.constraint_reference, locale, ui)}</p><p><b>{ui('Weight')}:</b> {numeric(objective.weight) === null ? '—' : formatLocalizedNumber(Number(objective.weight), locale, { maximumFractionDigits: 2 })}</p></article>)}</div></section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Compare the options')}</h2><p className="card__subtext">{ui('Data-backed comparisons show the real source figures used for each action. The application does not invent a winner or score. Older historical records keep their original recorded scoring view.')}</p></div></div><div className="cross-domain-option-grid">{(data?.run_detail?.options || []).map((option, index) => { const explanation = option.score_explanation || {}; const isSelected = selectedRun.selected_option_id === option.id; const dataBacked = isReplenishmentProjectedOutcome(option.projected_outcome); return <article className={`cross-domain-option-card${isSelected ? ' cross-domain-option-card--selected' : ''}`} key={option.id || index}><div className="cross-domain-option-title"><div><strong>{option.title || option.option_label || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong><p>{option.summary || ui('No option summary was recorded.')}</p></div><StatusBadge value={option.option_status} /></div>{dataBacked && option.projected_outcome ? <><div className="cross-domain-comparison-basis"><strong>{ui('Data-backed comparison')}</strong><span>{ui('No automatic winner or score is generated. Compare the source figures and let a person decide which action to take forward.')}</span></div><DataBackedOptionEvidence outcome={option.projected_outcome} locale={locale} ui={ui} /></> : <><div className="cross-domain-score-row"><div><span>{ui('Projected score')}</span><strong>{formatPercentage(option.aggregate_score, locale)}</strong></div><div><span>{ui('Confidence')}</span><strong>{formatPercentage(option.confidence_score, locale)}</strong></div></div><div className="cross-domain-explanation"><h3>{ui('Why this option scored this way')}</h3><p><b>{ui('Expected result')}:</b> {referenceText(explanation.projected_outcome || option.projected_outcome, locale, ui)}</p><div className="cross-domain-driver-grid"><div><strong>{ui('Helps')}</strong>{(explanation.positive_drivers || []).length ? <ul>{(explanation.positive_drivers || []).map((driver, driverIndex) => <li key={driverIndex}>{label(driver.objective_type, ui)} · {label(driver.tradeoff_domain, ui)} · {formatPercentage(driver.impact_score, locale)}</li>)}</ul> : <p>{ui('No positive driver is recorded.')}</p>}</div><div><strong>{ui('Hurts or needs attention')}</strong>{(explanation.downside_drivers || []).length ? <ul>{(explanation.downside_drivers || []).map((driver, driverIndex) => <li key={driverIndex}>{label(driver.objective_type, ui)} · {label(driver.tradeoff_domain, ui)} · {formatPercentage(driver.impact_score, locale)} · {label(driver.governance_status, ui)}</li>)}</ul> : <p>{ui('No negative or mixed driver is recorded.')}</p>}</div></div></div></>}{canGovern && option.id ? <button className="button button--secondary" type="button" disabled={runAction.isPending || isSelected} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'select_option', option_id: option.id } })}>{isSelected ? ui('Selected for review') : ui('Select this option')}</button> : null}</article>; })}</div></section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Govern the important tradeoffs')}</h2><p className="card__subtext">{ui('A high-impact downside can be accepted, accepted with conditions, mitigated, or rejected by a person. Accepted or mitigated tradeoffs no longer incorrectly block later review stages.')}</p></div></div>{!(data?.run_detail?.tradeoffs || []).length ? <p className="cross-domain-muted">{ui('No tradeoffs are recorded for this run.')}</p> : <div className="cross-domain-tradeoff-list">{(data?.run_detail?.tradeoffs || []).map((tradeoff, index) => { const draft = tradeoff.id ? tradeoffDrafts[tradeoff.id] : undefined; return <article className="cross-domain-tradeoff-card" key={tradeoff.id || index}><div className="cross-domain-tradeoff-summary"><div><strong>{tradeoff.option_label || ui('Linked planning option')}</strong><p>{label(tradeoff.objective_type, ui)} · {label(tradeoff.tradeoff_domain, ui)} · {label(tradeoff.impact_direction, ui)} · {formatPercentage(tradeoff.impact_score, locale)}</p></div><StatusBadge value={tradeoff.governance_status} /></div>{tradeoff.governance_reason ? <p><b>{ui('Recorded reason')}:</b> {tradeoff.governance_reason}</p> : null}{tradeoff.governance_conditions ? <p><b>{ui('Conditions')}:</b> {tradeoff.governance_conditions}</p> : null}{canGovern && tradeoff.id ? <div className="cross-domain-tradeoff-govern"><select className="input" value={draft?.status || tradeoff.governance_status || 'open'} onChange={(event) => setTradeoffDraft(tradeoff, { status: event.target.value })}>{TRADEOFF_GOVERNANCE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select><input className="input" value={draft?.reason ?? tradeoff.governance_reason ?? ''} onChange={(event) => setTradeoffDraft(tradeoff, { reason: event.target.value })} placeholder={ui('Reason for the decision')} /><input className="input" value={draft?.conditions ?? tradeoff.governance_conditions ?? ''} onChange={(event) => setTradeoffDraft(tradeoff, { conditions: event.target.value })} placeholder={ui('Conditions, if any')} /><button className="button" type="button" disabled={governTradeoff.isPending} onClick={() => governTradeoff.mutate({ tradeoffId: tradeoff.id as string, draft: draft || { status: tradeoff.governance_status || 'open', reason: tradeoff.governance_reason || '', conditions: tradeoff.governance_conditions || '' } })}>{ui('Record tradeoff decision')}</button></div> : null}</article>; })}</div>}</section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Expected result compared with actual result')}</h2><p className="card__subtext">{ui('Learning Feedback closes the loop by showing what was expected beside the measured result that actually happened.')}</p></div><button className="button button--secondary" type="button" onClick={() => navigate('/decision-learning-feedback')}>{ui('Open Learning Feedback')}</button></div>{!(data?.run_detail?.optimization_results || []).length ? <p className="cross-domain-muted">{ui('No actual outcome has been recorded for this run yet.')}</p> : <div className="cross-domain-outcome-grid">{(data?.run_detail?.optimization_results || []).map((result, index) => <article className="cross-domain-outcome-card" key={result.id || index}><div className="cross-domain-outcome-heading"><strong>{result.option_label || ui('Linked planning option')}</strong><StatusBadge value={result.result_status} /></div><div className="cross-domain-expected-actual"><div><span>{ui('Expected')}</span><p>{referenceText(result.expected_tradeoff, locale, ui)}</p></div><div><span>{ui('Actual')}</span><p>{referenceText(result.observed_tradeoff, locale, ui)}</p><strong>{formatPercentage(result.realized_value_score, locale)}</strong></div></div>{result.comparison_summary ? <p className="cross-domain-muted">{comparisonSummaryText(result.comparison_summary, locale, ui)}</p> : null}</article>)}</div>}</section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Formal human decision')}</h2><p className="card__subtext">{ui('Intelligence Review remains the authoritative place for approval, rejection, escalation, or reopening. Its decision is reflected back into this planning run and selected option.')}</p></div>{canOpenIntelligenceReview ? <button className="button button--secondary" type="button" onClick={() => navigate('/intelligence-review')}>{ui('Open Intelligence Review')}</button> : null}</div>{canGovern ? <button className="button" type="button" disabled={runAction.isPending || !selectedRun.id || !selectedRun.selected_option_id} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'request_intelligence_review' } })}>{selectedRun.selected_option_id ? ui('Send selected option to Intelligence Review') : ui('Select an option before requesting review')}</button> : null}{canOpenTasks || canOpenExecutionRequests ? <div className="cross-domain-handoffs">{canOpenTasks ? <button className="button button--secondary" type="button" onClick={() => navigate('/execution-tasks')}>{ui('Open Tasks')}</button> : null}{canOpenExecutionRequests ? <button className="button button--secondary" type="button" onClick={() => navigate('/execution-requests')}>{ui('Open Execution Requests')}</button> : null}</div> : null}</section>

        {canGovern ? <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Optimization governance settings')}</h2><p className="card__subtext">{ui('These thresholds are tenant-controlled business rules. They replace hidden fixed numbers while keeping safe defaults.')}</p></div></div><div className="cross-domain-form-grid"><label><span className="form-label">{ui('High-impact tradeoff threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.high_impact_tradeoff_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, high_impact_tradeoff_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Reusable-pattern value threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.reusable_pattern_value_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, reusable_pattern_value_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Scaling value threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.scaling_value_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, scaling_value_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Weak-value threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.weak_value_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, weak_value_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Minimum objectives')}</span><input className="input" type="number" min="1" max="20" value={settingsDraft.minimum_objective_count} onChange={(event) => setSettingsDraft((current) => ({ ...current, minimum_objective_count: event.target.value }))} /></label><label><span className="form-label">{ui('Minimum business areas')}</span><input className="input" type="number" min="1" max="10" value={settingsDraft.minimum_business_domain_count} onChange={(event) => setSettingsDraft((current) => ({ ...current, minimum_business_domain_count: event.target.value }))} /></label><label><span className="form-label">{ui('Monitoring cadence')}</span><select className="input" value={settingsDraft.monitoring_cadence} onChange={(event) => setSettingsDraft((current) => ({ ...current, monitoring_cadence: event.target.value }))}>{MONITORING_CADENCE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label></div><button className="button" type="button" disabled={updateSettings.isPending} onClick={() => updateSettings.mutate()}>{ui('Save governance settings')}</button></section> : null}
      </> : <section className="card cross-domain-section"><h2>{ui('Choose a planning run')}</h2><p>{ui('Select one planning run above to open its objectives, options, tradeoffs, ownership, Intelligence Review status, and actual outcomes.')}</p></section> : null}

      {view === 'readiness' ? selectedRunId ? <><section className="card cross-domain-section"><h2>{ui('These checks use only the selected planning run')}</h2><p>{ui('Evidence from another run cannot satisfy an objective, business-area, option, tradeoff, or outcome requirement for this run. Passing checks are still advisory and never execute a plan.')}</p></section>{REVIEW_SECTIONS.map((config) => <ReviewCard key={String(config.key)} config={config} section={data?.[config.key] as OptimizationReviewSection | undefined} />)}</> : <section className="card cross-domain-section"><h2>{ui('Select a planning run before reviewing readiness')}</h2><p>{ui('The application deliberately refuses to calculate a combined readiness result across unrelated planning runs.')}</p></section> : null}
    </main>
  );
}

/* v3.49.214 LEGACY CREATE-FORM JSX — intentionally retained, commented out in v3.49.215.
      {showCreate && canGovern ? (
        <section className="card cross-domain-section cross-domain-create">
          <div className="card__header"><div><h2>{ui('Create a planning review')}</h2><p className="card__subtext">{ui('Prepare human-confirmed planning evidence here. This creates objectives, options, and tradeoffs for review; it does not execute a plan or change inventory, purchasing, reservations, finances, or integrations.')}</p></div><button className="button button--secondary" type="button" onClick={() => setShowCreate(false)}>{ui('Close')}</button></div>
          <div className="cross-domain-form-grid">
            <label><span className="form-label">{ui('Planning review title')}</span><input className="input" value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label><span className="form-label">{ui('Business area')}</span><select className="input" value={reviewDraft.optimization_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, optimization_domain: event.target.value }))}>{OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label>
            <label><span className="form-label">{ui('Owner')}</span><select className="input" value={reviewDraft.owner_user_id} onChange={(event) => setReviewDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner yet')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select></label>
            <label><span className="form-label">{ui('Due date')}</span><input className="input" type="date" value={reviewDraft.due_at} onChange={(event) => setReviewDraft((current) => ({ ...current, due_at: event.target.value }))} /></label>
            <label className="cross-domain-span-2"><span className="form-label">{ui('Summary')}</span><textarea className="input" rows={3} value={reviewDraft.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, summary: event.target.value }))} /></label>
            <label className="cross-domain-span-2"><span className="form-label">{ui('Next required action')}</span><input className="input" value={reviewDraft.next_action} onChange={(event) => setReviewDraft((current) => ({ ...current, next_action: event.target.value }))} placeholder={ui('Example: Review the two options with Finance and Procurement.')} /></label>
          </div>

          <div className="cross-domain-builder-heading"><div><h3>{ui('Business objectives')}</h3><p>{ui('State what the plan is trying to improve and the target or limit that matters.')}</p></div><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, objectives: [...current.objectives, emptyObjective()] }))}>{ui('Add objective')}</button></div>
          <div className="cross-domain-builder-list">{reviewDraft.objectives.map((objective, index) => <article className="cross-domain-builder-card" key={`objective-${index}`}><div className="cross-domain-form-grid"><label><span className="form-label">{ui('Objective type')}</span><select className="input" value={objective.objective_type} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, objective_type: event.target.value } : item) }))}>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Business area')}</span><select className="input" value={objective.objective_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, objective_domain: event.target.value } : item) }))}>{OBJECTIVE_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Direction')}</span><select className="input" value={objective.target_direction} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, target_direction: event.target.value } : item) }))}>{TARGET_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Weight')}</span><input className="input" type="number" min="0" step="0.1" value={objective.weight} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, weight: event.target.value } : item) }))} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Target')}</span><input className="input" value={objective.target_statement} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, target_statement: event.target.value } : item) }))} placeholder={ui('Example: Keep additional stock investment below €20,000.')} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Constraint')}</span><input className="input" value={objective.constraint_statement} onChange={(event) => setReviewDraft((current) => ({ ...current, objectives: current.objectives.map((item, itemIndex) => itemIndex === index ? { ...item, constraint_statement: event.target.value } : item) }))} placeholder={ui('Example: Do not reduce the agreed service level.')} /></label></div>{reviewDraft.objectives.length > 1 ? <button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, objectives: current.objectives.filter((_, itemIndex) => itemIndex !== index) }))}>{ui('Remove objective')}</button> : null}</article>)}</div>

          <div className="cross-domain-builder-heading"><div><h3>{ui('Planning options')}</h3><p>{ui('Add the alternatives people want to compare. Scores and confidence are estimates, not proof.')}</p></div><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: [...current.options, emptyOption()] }))}>{ui('Add option')}</button></div>
          <div className="cross-domain-builder-list">{reviewDraft.options.map((option, optionIndex) => <article className="cross-domain-builder-card" key={`option-${optionIndex}`}><div className="cross-domain-form-grid"><label><span className="form-label">{ui('Option title')}</span><input className="input" value={option.title} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, title: event.target.value } : item) }))} /></label><label><span className="form-label">{ui('Projected score')}</span><input className="input" type="number" min="-1" max="1" step="0.01" value={option.aggregate_score} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, aggregate_score: event.target.value } : item) }))} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Option summary')}</span><textarea className="input" rows={2} value={option.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, summary: event.target.value } : item) }))} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Expected result')}</span><input className="input" value={option.projected_outcome} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, projected_outcome: event.target.value } : item) }))} placeholder={ui('Example: Fewer emergency purchases with a moderate increase in stock value.')} /></label></div><div className="cross-domain-builder-heading cross-domain-builder-heading--small"><strong>{ui('Tradeoffs for this option')}</strong><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: [...item.tradeoffs, emptyTradeoff()] } : item) }))}>{ui('Add tradeoff')}</button></div>{option.tradeoffs.map((tradeoff, tradeoffIndex) => <div className="cross-domain-tradeoff-draft" key={`tradeoff-${tradeoffIndex}`}><select className="input" value={tradeoff.objective_type} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, objective_type: event.target.value } : part) } : item) }))}>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select><select className="input" value={tradeoff.tradeoff_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, tradeoff_domain: event.target.value } : part) } : item) }))}>{OBJECTIVE_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select><select className="input" value={tradeoff.impact_direction} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, impact_direction: event.target.value } : part) } : item) }))}>{IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select><input className="input" type="number" min="-1" max="1" step="0.01" value={tradeoff.impact_score} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, impact_score: event.target.value } : part) } : item) }))} /><input className="input" value={tradeoff.explanation} onChange={(event) => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.map((part, partIndex) => partIndex === tradeoffIndex ? { ...part, explanation: event.target.value } : part) } : item) }))} placeholder={ui('What gets better or worse?')} /><button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, tradeoffs: item.tradeoffs.filter((_, partIndex) => partIndex !== tradeoffIndex) } : item) }))}>{ui('Remove')}</button></div>)}{reviewDraft.options.length > 1 ? <button className="button button--secondary" type="button" onClick={() => setReviewDraft((current) => ({ ...current, options: current.options.filter((_, itemIndex) => itemIndex !== optionIndex) }))}>{ui('Remove option')}</button> : null}</article>)}</div>
          {createReview.isError ? <p className="cross-domain-error">{ui('The planning review could not be created. Check the required fields and try again.')}</p> : null}
          <button className="button" type="button" disabled={createReview.isPending || !reviewDraft.title.trim() || reviewDraft.options.some((option) => !option.title.trim())} onClick={() => createReview.mutate()}>{createReview.isPending ? ui('Creating…') : ui('Create planning review')}</button>
        </section>
      ) : null}

*/
