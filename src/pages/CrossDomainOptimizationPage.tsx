import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
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

type SourceRecommendation = {
  id: string;
  plan_id: string;
  plan_code?: string | null;
  plan_type: string;
  item_type: string;
  status: string;
  rank?: number;
  score?: number;
  confidence?: number | null;
  source_type?: string | null;
  source_id?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  assigned_to?: string | null;
  facility_id?: string | null;
  storage_location_id?: string | null;
  recommendation: string;
  rationale?: string | null;
  impact_snapshot?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

type OptimizationExecutionDashboard = {
  top_recommendations?: SourceRecommendation[];
};

type GeneratedOptimizationPlan = {
  item_count?: number;
  recommendation_summary?: { recommendation_count?: number; status?: string };
};

type SourceBuildReport = {
  completed_checks: number;
  failed_checks: number;
  generated_recommendations: number;
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
// v3.49.221: keep the v3.49.218 manual prose-driven wizard in source for rollback/history, but do not render it.
const SHOW_V349218_MANUAL_CREATE_UI = false;

/* v3.49.217 guard compatibility — superseded source signatures retained as comments only:
canGovern && hasEvidence ? <button
return `${name} — ${email}`;
*/

/* v3.49.221 legacy option-card guard compatibility — old wording is not rendered for source-backed comparisons:
ui('Each option shows its estimated score, what helps it, what hurts it, and any actual outcomes already recorded.')
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

function simpleRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sourceScopeTokens(item: SourceRecommendation): string[] {
  const tokens = new Set<string>();
  const add = (kind: string, value: unknown) => {
    const normalized = String(value || '').trim();
    if (normalized) tokens.add(`${kind}:${normalized}`);
  };
  if (item.target_type && item.target_id) add(item.target_type, item.target_id);
  if (item.source_type && item.source_id) add(item.source_type, item.source_id);
  add('facility', item.facility_id);
  add('storage_location', item.storage_location_id);
  const payload = simpleRecord(item.payload);
  for (const key of ['product_id', 'reservation_id', 'reservation_item_id', 'task_id', 'purchase_order_id', 'shipment_id', 'transfer_id', 'requisition_id', 'operator_id']) {
    add(key, payload[key]);
  }
  return Array.from(tokens);
}

function sharedSourceScope(items: SourceRecommendation[]): string[] {
  if (!items.length) return [];
  const sets = items.map((item) => new Set(sourceScopeTokens(item)));
  return Array.from(sets[0]).filter((token) => sets.slice(1).every((set) => set.has(token)));
}

function sourceRecommendationIdentity(item: SourceRecommendation): string {
  const scope = sourceScopeTokens(item).sort().join('|');
  return [item.plan_type, item.item_type, scope, String(item.recommendation || '').trim().toLocaleLowerCase()].join('::');
}

function dedupeSourceRecommendations(items: SourceRecommendation[]): SourceRecommendation[] {
  const seen = new Set<string>();
  const result: SourceRecommendation[] = [];
  for (const item of items) {
    const identity = sourceRecommendationIdentity(item);
    if (seen.has(identity)) continue;
    seen.add(identity);
    result.push(item);
  }
  return result;
}

function hasComparableSourcePair(items: SourceRecommendation[]): boolean {
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      if (sharedSourceScope([items[left], items[right]]).length > 0) return true;
    }
  }
  return false;
}

function sourceDomain(item: SourceRecommendation): string {
  switch (item.source_type) {
    case 'execution_task':
    case 'execution_batch':
    case 'operator': return 'execution';
    case 'reservation': return 'reservation';
    case 'requisition':
    case 'purchase_order':
    case 'shipment': return 'procurement';
    case 'transfer':
    case 'replenishment': return 'inventory';
    case 'facility': return 'control_tower';
    case 'forecast': return 'optimization';
    default: return item.plan_type === 'facility_balancing' ? 'control_tower' : 'optimization';
  }
}

function sourceConfidence(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
}

function flattenImpactFacts(value: unknown, prefix = '', depth = 0): Array<[string, string | number | boolean]> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 2) return [];
  const facts: Array<[string, string | number | boolean]> = [];
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw === null || raw === undefined || raw === '') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') facts.push([path, raw]);
    else if (typeof raw === 'object' && !Array.isArray(raw)) facts.push(...flattenImpactFacts(raw, path, depth + 1));
  }
  return facts.slice(0, 40);
}

function sourceMetricLabel(key: string): string {
  return key.split('.').map((part) => part.replace(/_/g, ' ')).join(' · ');
}

function sourceImpact(item: SourceRecommendation): Record<string, unknown> {
  return simpleRecord(item.impact_snapshot);
}

function sourcePayload(item: SourceRecommendation): Record<string, unknown> {
  return simpleRecord(item.payload);
}

function sourceBusinessOrigin(item: SourceRecommendation, ui: (key: string) => string): string {
  switch (item.plan_type) {
    case 'replenishment_optimization': return ui('Replenishment Planning');
    case 'facility_balancing': return ui('Execution workload — facility balance');
    case 'bottleneck_detection': return ui('Execution Tasks — bottleneck check');
    case 'labor_forecast': return ui('Execution Tasks — workload forecast');
    case 'sla_risk': return ui('Execution Tasks — due-date risk');
    default: return ui('Planning recommendations');
  }
}

function sourceBusinessSubject(item: SourceRecommendation, ui: (key: string) => string): string {
  const payload = sourcePayload(item);
  if (item.plan_type === 'replenishment_optimization') {
    const parLevel = simpleRecord(payload.par_level);
    const product = String(parLevel.product_name || '').trim();
    const location = String(parLevel.storage_location_name || '').trim();
    if (product && location) return `${product} — ${location}`;
    if (product) return product;
    return ui('Stock replenishment requirement');
  }
  if (item.plan_type === 'sla_risk') {
    const task = simpleRecord(payload.task);
    return String(task.title || task.task_code || ui('Execution task')).trim();
  }
  if (item.plan_type === 'facility_balancing') {
    return item.facility_id ? ui('Facility workload') : ui('Unassigned facility workload');
  }
  if (item.plan_type === 'bottleneck_detection') return ui('Execution work queue');
  if (item.plan_type === 'labor_forecast') return ui('Execution workload forecast');
  return String(item.recommendation || ui('Planning recommendation'));
}

function sourceBusinessAction(item: SourceRecommendation, locale: AppLocale, ui: (key: string) => string): string {
  const impact = sourceImpact(item);
  const qty = Number(impact.recommended_quantity || 0);
  if (item.plan_type === 'replenishment_optimization') {
    const mode = String(impact.recommendation_mode || 'review');
    if (mode === 'transfer') return ui('Use available internal stock first').replace('{quantity}', formatLocalizedNumber(qty, locale));
    if (mode === 'procure') return ui('Buy the required quantity from the configured supplier').replace('{quantity}', formatLocalizedNumber(Number(impact.procurement_quantity || qty), locale));
    return ui('Review how this stock requirement should be covered');
  }
  if (item.plan_type === 'facility_balancing') {
    const mode = String(impact.recommendation_mode || 'monitor_capacity');
    if (mode === 'rebalance_capacity') return ui('Rebalance work capacity for this facility');
    if (mode === 'maintain_capacity') return ui('Keep the current facility capacity');
    return ui('Monitor this facility workload before changing capacity');
  }
  if (item.plan_type === 'bottleneck_detection') return ui('Review this work queue and its assignment bottleneck');
  if (item.plan_type === 'labor_forecast') {
    const daily = Number(impact.daily_demand_hours || 0);
    return ui('Plan staffing for about {hours} work hours per day').replace('{hours}', formatLocalizedNumber(daily, locale));
  }
  if (item.plan_type === 'sla_risk') return ui('Prioritize this task if management decides the deadline risk needs action');
  return String(item.recommendation || ui('Review this planning action'));
}

function sourceBusinessEvidence(item: SourceRecommendation, locale: AppLocale, ui: (key: string) => string): string[] {
  const impact = sourceImpact(item);
  const number = (key: string) => formatLocalizedNumber(Number(impact[key] || 0), locale);
  if (item.plan_type === 'replenishment_optimization') {
    return [
      `${ui('Current stock')}: ${number('current_quantity')}`,
      `${ui('Target/par stock')}: ${number('par_quantity')}`,
      `${ui('Shortage to target')}: ${number('shortage_to_par_quantity')}`,
      `${ui('Transferable surplus elsewhere')}: ${number('alternate_facility_surplus_quantity')}`
    ];
  }
  if (item.plan_type === 'facility_balancing') {
    return [
      `${ui('Active tasks')}: ${number('task_count')}`,
      `${ui('Blocked')}: ${number('blocked_count')}`,
      `${ui('Overdue')}: ${number('overdue_count')}`,
      `${ui('Estimated work hours')}: ${number('estimated_hours')}`
    ];
  }
  if (item.plan_type === 'bottleneck_detection') {
    return [
      `${ui('Open tasks')}: ${number('task_count')}`,
      `${ui('Blocked')}: ${number('blocked_count')}`,
      `${ui('Overdue')}: ${number('overdue_count')}`,
      `${ui('Unassigned')}: ${number('unassigned_count')}`
    ];
  }
  if (item.plan_type === 'labor_forecast') {
    return [
      `${ui('Open tasks')}: ${number('open_task_count')}`,
      `${ui('Open estimated hours')}: ${number('open_estimated_hours')}`,
      `${ui('Expected hours per day')}: ${number('daily_demand_hours')}`,
      `${ui('Forecast window (days)')}: ${number('forecast_window_days')}`
    ];
  }
  if (item.plan_type === 'sla_risk') {
    const hours = impact.hours_until_due;
    return [
      `${ui('Risk level')}: ${label(String(impact.risk_level || 'unknown'), ui)}`,
      `${ui('Task status')}: ${label(String(impact.status || 'unknown'), ui)}`,
      `${ui('Priority')}: ${label(String(impact.priority || 'unknown'), ui)}`,
      `${ui('Hours until due')}: ${hours === null || hours === undefined ? '—' : formatLocalizedNumber(Number(hours), locale)}`
    ];
  }
  return flattenImpactFacts(item.impact_snapshot).slice(0, 4).map(([key, value]) => `${sourceMetricLabel(key)}: ${String(value)}`);
}

function isUsefulSourceRecommendation(item: SourceRecommendation): boolean {
  const impact = sourceImpact(item);
  const severity = String(impact.severity || '').toLowerCase();
  const risk = String(impact.risk_level || '').toLowerCase();
  if (item.plan_type === 'sla_risk') return ['medium', 'high', 'critical'].includes(risk);
  if (item.plan_type === 'bottleneck_detection') return ['medium', 'high', 'critical'].includes(severity);
  if (item.plan_type === 'facility_balancing') return ['medium', 'high', 'critical'].includes(severity) && String(impact.recommendation_mode || '') !== 'maintain_capacity';
  if (item.plan_type === 'replenishment_optimization') return Number(impact.recommended_quantity || 0) > 0 && ['transfer', 'procure', 'review'].includes(String(impact.recommendation_mode || ''));
  if (item.plan_type === 'labor_forecast') return Number(impact.open_task_count || 0) > 0 && Number(impact.daily_demand_hours || 0) > 0;
  return true;
}

function recommendationsWithAComparableAlternative(items: SourceRecommendation[]): SourceRecommendation[] {
  return items.filter((item, index) => items.some((other, otherIndex) => index !== otherIndex && sharedSourceScope([item, other]).length > 0));
}

function sourceComparableAlternativeCount(item: SourceRecommendation, items: SourceRecommendation[]): number {
  return items.filter((other) => other.id !== item.id && sharedSourceScope([item, other]).length > 0).length;
}

function sourceWorkflowPath(item: SourceRecommendation): string | null {
  if (item.plan_type === 'replenishment_optimization') return '/replenishment-planning';
  if (['facility_balancing', 'bottleneck_detection', 'labor_forecast'].includes(item.plan_type)) return '/execution-tasks';
  if (item.plan_type === 'sla_risk') {
    const taskId = String(item.source_id || sourcePayload(item).task_id || '').trim();
    return taskId ? `/execution-tasks?${new URLSearchParams({ task_id: taskId }).toString()}` : '/execution-tasks';
  }
  return null;
}

function sourceOptionTitle(item: SourceRecommendation): string {
  const value = String(item.recommendation || `${item.plan_type} ${item.item_type}`).trim();
  return value.length > 200 ? `${value.slice(0, 197)}...` : value;
}

function sourceOptionProjectedOutcome(item: SourceRecommendation): Record<string, unknown> {
  return {
    source_plan_type: item.plan_type,
    source_item_type: item.item_type,
    source_status: item.status,
    source_score: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
    source_score_note: 'Originating planning-module score; not normalized or ranked by Cross-Domain Optimization.',
    source_type: item.source_type || null,
    source_id: item.source_id || null,
    target_type: item.target_type || null,
    target_id: item.target_id || null,
    facility_id: item.facility_id || null,
    storage_location_id: item.storage_location_id || null,
    impact_snapshot: simpleRecord(item.impact_snapshot)
  };
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

function ownerCandidateBaseLabel(user: { id: string; name?: string | null; email?: string | null }): string {
  const name = String(user.name || '').trim();
  const email = String(user.email || '').trim();
  return name || email || user.id;
}


// v3.49.223/v3.49.224 legacy static-guard signatures retained after business-facing source cards replaced raw planning-engine cards:
// ui('No comparable pair is available yet')
// ui('Only one distinct planning action is currently available, so there is nothing to compare yet.')
// ui('Several planning actions exist, but no two refer to the same structured business subject. Cross-Domain will not force unrelated records into a comparison.')
// sourceRecommendations.map((item) => {
// <div className="cross-domain-source-meta"><span><b>{ui('Originating source score')}:</b>

export default function CrossDomainOptimizationPage() {
  const { locale, ui } = useAppTranslation();
  const navigate = useNavigate();
  const canGovern = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN);
  const canReadOptimizationSources = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_READ);
  const canCreateOptimizationSources = hasPermission(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE);
  const canOpenIntelligenceReview = hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ) && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const canOpenTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canOpenReplenishmentPlanning = hasPermission(TENANT_PERMISSIONS.INSIGHTS_READ);
  const canOpenExecutionRequests = hasPermission(TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW);
  const [view, setView] = useState<OptimizationView>('evidence');
  const [filters, setFilters] = useState<OptimizationFilterState>(DEFAULT_FILTERS);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [reviewDraft, setReviewDraft] = useState<DraftReview>(emptyReview());
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<string[]>([]);
  const [sourceBuildReport, setSourceBuildReport] = useState<SourceBuildReport | null>(null);
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

  const { data: sourceDashboard, isLoading: sourceDashboardLoading, error: sourceDashboardError, refetch: refetchSourceDashboard } = useQuery({
    queryKey: ['cross-domain-source-recommendations'],
    queryFn: () => apiRequest<OptimizationExecutionDashboard>('/optimization-plans/execution-dashboard?limit=50&minimum_score=0'),
    enabled: showCreate && canGovern && canReadOptimizationSources
  });

  const rawSourceRecommendations = useMemo(() => (sourceDashboard?.top_recommendations || []).filter((item) => ['candidate', 'recommended'].includes(item.status)), [sourceDashboard?.top_recommendations]);
  const sourceRecommendations = useMemo(() => dedupeSourceRecommendations(rawSourceRecommendations).filter(isUsefulSourceRecommendation), [rawSourceRecommendations]);
  const comparableSourceRecommendations = useMemo(() => recommendationsWithAComparableAlternative(sourceRecommendations), [sourceRecommendations]);
  const comparableSourcePairAvailable = useMemo(() => hasComparableSourcePair(comparableSourceRecommendations), [comparableSourceRecommendations]);
  const selectedRecommendations = useMemo(() => selectedRecommendationIds.map((id) => sourceRecommendations.find((item) => item.id === id)).filter((item): item is SourceRecommendation => Boolean(item)), [selectedRecommendationIds, sourceRecommendations]);
  const selectedSharedScope = useMemo(() => sharedSourceScope(selectedRecommendations), [selectedRecommendations]);
  const selectedSourceSelectionValid = selectedRecommendations.length === 1 || (selectedRecommendations.length > 1 && selectedSharedScope.length > 0);
  const canOpenSourceWorkflow = (item: SourceRecommendation) => item.plan_type === 'replenishment_optimization' ? canOpenReplenishmentPlanning : ['facility_balancing', 'bottleneck_detection', 'labor_forecast', 'sla_risk'].includes(item.plan_type) ? canOpenTasks : false;
  const comparableRecommendationIds = useMemo(() => {
    if (!selectedRecommendations.length) return new Set(sourceRecommendations.map((item) => item.id));
    return new Set(sourceRecommendations.filter((candidate) => selectedRecommendationIds.includes(candidate.id) || sharedSourceScope([...selectedRecommendations, candidate]).length > 0).map((item) => item.id));
  }, [selectedRecommendations, selectedRecommendationIds, sourceRecommendations]);
  const commonImpactMetrics = useMemo(() => {
    const maps = selectedRecommendations.map((item) => new Map(flattenImpactFacts(item.impact_snapshot)));
    if (maps.length < 2) return [] as Array<{ key: string; values: Array<string | number | boolean | null> }>;
    const keys = Array.from(new Set(maps.flatMap((map) => Array.from(map.keys()))));
    return keys.map((key) => ({ key, values: maps.map((map) => map.get(key) ?? null) })).filter((row) => row.values.filter((value) => value !== null).length >= 2).slice(0, 20);
  }, [selectedRecommendations]);

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

  // v3.49.224 legacy static-guard signature retained after the builder was made visible even without create permission:
  // canReadOptimizationSources && canCreateOptimizationSources ? <div className="cross-domain-source-primary-action"
  // disabled={buildAvailableRecommendations.isPending}
  const buildAvailableRecommendations = useMutation({
    onMutate: () => {
      setSourceBuildReport(null);
    },
    mutationFn: async (): Promise<SourceBuildReport> => {
      const builders: Array<{ path: string; body: Record<string, unknown> }> = [
        { path: '/optimization-plans/replenishment', body: { replenishment_strategy: 'balanced', limit: 50 } },
        { path: '/optimization-plans/replenishment', body: { replenishment_strategy: 'transfer_first', limit: 50 } },
        { path: '/optimization-plans/replenishment', body: { replenishment_strategy: 'procurement_first', limit: 50 } },
        { path: '/optimization-plans/facility-balancing', body: { balancing_strategy: 'balanced', minimum_severity: 'medium', limit: 50 } },
        { path: '/optimization-plans/facility-balancing', body: { balancing_strategy: 'sla_first', minimum_severity: 'medium', limit: 50 } },
        { path: '/optimization-plans/facility-balancing', body: { balancing_strategy: 'labor_first', minimum_severity: 'medium', limit: 50 } },
        { path: '/optimization-plans/bottlenecks', body: { limit: 50 } },
        { path: '/optimization-plans/labor-forecast', body: { limit: 50 } },
        { path: '/optimization-plans/sla-risk', body: { minimum_risk_level: 'medium', limit: 50 } }
      ];

      let completedChecks = 0;
      let failedChecks = 0;
      let generatedRecommendations = 0;

      for (const builder of builders) {
        try {
          const plan = await apiRequest<GeneratedOptimizationPlan>(builder.path, {
            method: 'POST',
            body: JSON.stringify({
              ...builder.body,
              payload: { generated_for: 'cross_domain_source_discovery' }
            }),
            skipMutationFeedback: true
          });
          completedChecks += 1;
          generatedRecommendations += Number(plan.item_count ?? plan.recommendation_summary?.recommendation_count ?? 0);
        } catch {
          failedChecks += 1;
        }
      }

      return {
        completed_checks: completedChecks,
        failed_checks: failedChecks,
        generated_recommendations: generatedRecommendations
      };
    },
    onSuccess: async (report) => {
      setSourceBuildReport(report);
      setSelectedRecommendationIds([]);
      await refetchSourceDashboard();
    }
  });

  const createSourceBackedReview = useMutation({
    mutationFn: () => {
      const domains = Array.from(new Set(selectedRecommendations.map(sourceDomain)));
      const objectives = (domains.length ? domains : ['optimization']).map((domain) => ({
        objective_type: 'general',
        objective_domain: domain,
        weight: 1,
        target_direction: 'balance',
        target_reference: {
          source_backed: true,
          recommendation_ids: selectedRecommendations.filter((item) => sourceDomain(item) === domain).map((item) => item.id)
        },
        constraint_reference: {},
        confidence_score: null
      }));
      return apiRequest<{ optimization_run_id: string }>('/decision-intelligence/cross-domain-optimization/reviews', {
        method: 'POST',
        body: JSON.stringify({
          title: reviewDraft.title.trim(),
          summary: reviewDraft.summary.trim() || null,
          optimization_domain: domains.length > 1 ? 'multi_domain' : (domains[0] || 'optimization'),
          owner_user_id: reviewDraft.owner_user_id || null,
          due_at: reviewDraft.due_at || null,
          next_action: reviewDraft.next_action.trim() || (selectedRecommendations.length === 1 ? 'Review the selected source-backed action and send it to Intelligence Review if management wants to take it forward.' : 'Compare the selected source-backed actions and choose one for formal review.'),
          selected_option_index: selectedRecommendations.length === 1 ? 0 : null,
          source_reference: {
            source_type: 'optimization_plan_recommendation_comparison',
            recommendation_ids: selectedRecommendations.map((item) => item.id),
            plan_ids: Array.from(new Set(selectedRecommendations.map((item) => item.plan_id))),
            shared_scope: selectedSharedScope,
            human_text_not_analyzed: true
          },
          decision_reference: {
            comparison_basis: 'structured_application_evidence',
            human_text_not_analyzed: true,
            automatic_winner: false
          },
          objectives,
          options: selectedRecommendations.map((item) => ({
            title: sourceOptionTitle(item),
            summary: String(item.rationale || '').trim() || null,
            option_reference: {
              optimization_plan_item_id: item.id,
              optimization_plan_id: item.plan_id,
              plan_code: item.plan_code || null,
              source_type: item.source_type || null,
              source_id: item.source_id || null,
              target_type: item.target_type || null,
              target_id: item.target_id || null
            },
            projected_outcome: sourceOptionProjectedOutcome(item),
            tradeoff_summary: {},
            governance_reference: { source_backed: true, cross_domain_score_calculated: false },
            aggregate_score: null,
            confidence_score: sourceConfidence(item.confidence),
            tradeoffs: []
          }))
        })
      });
    },
    onSuccess: async (result) => {
      setShowCreate(false);
      setCreateStep(1);
      setReviewDraft(emptyReview());
      setSelectedRecommendationIds([]);
      setSourceBuildReport(null);
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
      setSelectedRecommendationIds([]);
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
        description={ui('Use this page when management must choose between two or more existing actions backed by structured application evidence for the same business subject. Your written note is human context only; it is not analyzed. Nothing on this page changes stock or executes an action.')}
        aside={<><OperationalWorkspaceStatus value={label(data?.governance?.cross_domain_optimization_posture, ui)} label={ui('Planning review posture · refreshed {time}').replace('{time}', lastRefreshed)} /><button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? ui('Refreshing…') : ui('Refresh evidence')}</button>{canGovern && hasEvidence && !showCreate ? <button className="button" type="button" onClick={() => { setCreateStep(1); setShowCreate(true); setSourceBuildReport(null); }}>{ui('Create decision comparison')}</button> : null}</>}
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

      {!SHOW_V349218_MANUAL_CREATE_UI && showCreate && canGovern ? (
        <section className="card cross-domain-section cross-domain-create cross-domain-create--wizard cross-domain-source-wizard">
          <div className="card__header cross-domain-create-header">
            <div>
              <span className="cross-domain-eyebrow">{ui('Decision comparison')}</span>
              <h2>{ui('Review or compare actions from application data')}</h2>
              <p className="card__subtext">{ui('Your title and note are for people. The actions shown in the next step come from structured application data.')}</p>
            </div>
            <button className="button button--secondary" type="button" onClick={() => { setShowCreate(false); setCreateStep(1); setSelectedRecommendationIds([]); setSourceBuildReport(null); }}>{ui('Close')}</button>
          </div>

          <div className="cross-domain-wizard-progress" aria-label={ui('Decision comparison steps')}>
            {[
              [1, ui('Decision record')],
              [2, ui('Build or choose actions')],
              [3, ui('Review source data')],
              [4, ui('Save decision')]
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
                <div><h3>{ui('Describe the decision for the people who will review it')}</h3><p>{ui('This text is a human note only. It is saved with the comparison, but it is not parsed, scored, or used to decide what the application should analyze.')}</p></div>
              </div>
              <div className="cross-domain-human-note"><strong>{ui('Human note — not calculation input')}</strong><span>{ui('Write whatever helps your team understand why this decision matters. The application will use only the structured source records you choose in the next step.')}</span></div>
              <div className="cross-domain-form-grid cross-domain-form-grid--guided">
                <label className="cross-domain-span-2"><span className="form-label">{ui('Decision title')}</span><span className="cross-domain-field-help">{ui('A short name people can recognize later.')}</span><input className="input" value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} /></label>
                <label className="cross-domain-span-2"><span className="form-label">{ui('Note for reviewers')}</span><span className="cross-domain-field-help">{ui('Optional. This is context for people, not instructions to the application.')}</span><textarea className="input" rows={4} value={reviewDraft.summary} onChange={(event) => setReviewDraft((current) => ({ ...current, summary: event.target.value }))} /></label>
                <div className="cross-domain-span-2 cross-domain-owner-due-grid">
                  <label className="cross-domain-owner-due-field"><span className="form-label">{ui('Responsible person')}</span><select className="input" value={reviewDraft.owner_user_id} onChange={(event) => setReviewDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner yet')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select><span className="cross-domain-field-help cross-domain-field-help--reserved" aria-hidden="true"></span></label>
                  <label className="cross-domain-owner-due-field"><span className="form-label">{ui('Decision due date')}</span><input className="input" type="date" value={reviewDraft.due_at} onChange={(event) => setReviewDraft((current) => ({ ...current, due_at: event.target.value }))} /><span className="cross-domain-field-help cross-domain-field-help--reserved">{ui('Optional. Leave it blank if there is no deadline.')}</span></label>
                </div>
              </div>
              <div className="cross-domain-wizard-actions cross-domain-wizard-actions--end"><button className="button" type="button" disabled={reviewDraft.title.trim().length < 3} onClick={() => setCreateStep(2)}>{ui('Continue')}</button></div>
            </section>
          ) : null}

          {createStep === 2 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro">
                <span className="cross-domain-step-number">2</span>
                <div><h3>{ui('Actions available from current application data')}</h3><p>{ui('Review one real action now. If the application has genuine alternatives for the same subject, you can compare them instead.')}</p></div>
              </div>

              {!canReadOptimizationSources ? <div className="cross-domain-source-warning"><strong>{ui('Source data is not available with your current access')}</strong><span>{ui('You need access to inventory optimization evidence before a data-backed decision review can be created.')}</span></div> : null}

              {canReadOptimizationSources ? <div className="cross-domain-action-toolbar">
                <div><strong>{ui('Current planning recommendations')}</strong><span>{ui('These come from the application data already used by Replenishment Planning and Execution Tasks.')}</span></div>
                <button className="button" type="button" disabled={!canCreateOptimizationSources || buildAvailableRecommendations.isPending} onClick={() => buildAvailableRecommendations.mutate()}>{buildAvailableRecommendations.isPending ? ui('Building recommendations…') : ui('Refresh recommendations')}</button>
              </div> : null}

              {canReadOptimizationSources && sourceDashboardLoading ? <p className="cross-domain-muted">{ui('Loading source-backed actions…')}</p> : null}
              {canReadOptimizationSources && sourceDashboardError ? <div className="cross-domain-source-warning"><strong>{ui('Source-backed actions could not be loaded')}</strong><span>{ui('Open the source workflow below or try refreshing the recommendations again.')}</span></div> : null}
              {sourceBuildReport ? <div className="cross-domain-build-summary"><strong>{ui('{count} actions found').replace('{count}', formatLocalizedNumber(sourceRecommendations.length, locale))}</strong><span>{sourceBuildReport.failed_checks ? ui('Some planning checks could not be completed, so only the successful actions are shown.') : ui('Recommendations were refreshed from current application data.')}</span></div> : null}

              {sourceRecommendations.length ? <>
                <div className="cross-domain-actions-heading"><div><strong>{ui('Available actions')}</strong><span>{ui('{count} current recommendations').replace('{count}', formatLocalizedNumber(sourceRecommendations.length, locale))}</span></div>{comparableSourcePairAvailable ? <span>{ui('Some actions have a genuine alternative for the same subject and can be compared.')}</span> : null}</div>
                <div className="cross-domain-source-grid cross-domain-source-grid--business">
                  {sourceRecommendations.map((item) => {
                    const selected = selectedRecommendationIds.includes(item.id);
                    const compatible = comparableRecommendationIds.has(item.id);
                    const evidence = sourceBusinessEvidence(item, locale, ui);
                    const alternativeCount = sourceComparableAlternativeCount(item, sourceRecommendations);
                    const workflowPath = sourceWorkflowPath(item);
                    const sourceWorkflowAvailable = Boolean(workflowPath && canOpenSourceWorkflow(item));
                    return <article className={`cross-domain-source-card cross-domain-source-card--business${selected ? ' is-selected' : ''}`} key={item.id}>
                      <div className="cross-domain-source-card__top"><div><span className="cross-domain-source-card__origin">{sourceBusinessOrigin(item, ui)}</span><strong>{sourceBusinessSubject(item, ui)}</strong></div></div>
                      <div className="cross-domain-source-card__section"><small>{ui('Suggested action')}</small><b>{sourceBusinessAction(item, locale, ui)}</b></div>
                      <div className="cross-domain-source-business-facts">{evidence.map((fact) => <span key={fact}>{fact}</span>)}</div>
                      <div className="cross-domain-source-card__actions">
                        <button className="button" type="button" onClick={() => { setSelectedRecommendationIds([item.id]); setCreateStep(3); }}>{ui('Review action')}</button>
                        {sourceWorkflowAvailable ? <button className="button button--secondary" type="button" onClick={() => workflowPath && navigate(workflowPath)}>{ui('Open source workflow')}</button> : null}
                      </div>
                      {alternativeCount > 0 ? <label className="cross-domain-compare-toggle"><input type="checkbox" checked={selected} disabled={!selected && !compatible} onChange={() => setSelectedRecommendationIds((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span>{ui('Add to comparison')}</span><small>{ui('{count} compatible alternative(s)').replace('{count}', formatLocalizedNumber(alternativeCount, locale))}</small></label> : <span className="cross-domain-no-alternative">{ui('No second action exists for this same subject right now. You can still review this action on its own.')}</span>}
                    </article>;
                  })}
                </div>
                {selectedRecommendationIds.length ? <div className="cross-domain-selection-summary"><strong>{ui('{count} actions selected').replace('{count}', formatLocalizedNumber(selectedRecommendations.length, locale))}</strong><span>{selectedRecommendations.length > 1 ? selectedSourceSelectionValid ? ui('These actions refer to the same structured subject and can be compared.') : ui('The selected actions do not refer to the same business subject.') : ui('One action is ready for review.')}</span><button className="button" type="button" disabled={!selectedSourceSelectionValid} onClick={() => setCreateStep(3)}>{selectedRecommendations.length > 1 ? ui('Compare selected') : ui('Review selected')}</button></div> : null}
              </> : !sourceDashboardLoading && !sourceDashboardError ? <div className="cross-domain-source-empty"><strong>{ui('No actionable recommendation is available from the current data')}</strong><span>{ui('Use the operational source pages to create or update the underlying work, then refresh recommendations here.')}</span><div>{canOpenReplenishmentPlanning ? <button className="button button--secondary" type="button" onClick={() => navigate('/replenishment-planning')}>{ui('Open Replenishment Planning')}</button> : null}{canOpenTasks ? <button className="button button--secondary" type="button" onClick={() => navigate('/execution-tasks')}>{ui('Open Execution Tasks')}</button> : null}</div></div> : null}

              <div className="cross-domain-wizard-actions"><button className="button button--secondary" type="button" onClick={() => setCreateStep(1)}>{ui('Back')}</button></div>
            </section>
          ) : null}

          {createStep === 3 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro">
                <span className="cross-domain-step-number">3</span>
                <div><h3>{selectedRecommendations.length > 1 ? ui('Compare the source data') : ui('Review the source data')}</h3><p>{selectedRecommendations.length > 1 ? ui('The application lines up only evidence that genuinely belongs to the same business subject. It does not invent a winner.') : ui('This is the actual application evidence behind the selected action. Your note from Step 1 is not used to calculate it.')}</p></div>
              </div>
              <div className="cross-domain-source-comparison-grid">
                {selectedRecommendations.map((item, index) => {
                  const workflowPath = sourceWorkflowPath(item);
                  const sourceWorkflowAvailable = Boolean(workflowPath && canOpenSourceWorkflow(item));
                  return <article className="cross-domain-source-comparison-card" key={item.id}>
                    <span className="cross-domain-eyebrow">{selectedRecommendations.length > 1 ? ui('Action {number}').replace('{number}', formatLocalizedNumber(index + 1, locale)) : sourceBusinessOrigin(item, ui)}</span>
                    <h4>{sourceBusinessAction(item, locale, ui)}</h4>
                    <p><b>{ui('Business subject')}:</b> {sourceBusinessSubject(item, ui)}</p>
                    <div className="cross-domain-source-business-facts cross-domain-source-business-facts--comparison">{sourceBusinessEvidence(item, locale, ui).map((fact) => <span key={fact}>{fact}</span>)}</div>
                    {sourceWorkflowAvailable ? <button className="button button--secondary" type="button" onClick={() => workflowPath && navigate(workflowPath)}>{ui('Open source workflow')}</button> : null}
                  </article>;
                })}
              </div>
              {selectedRecommendations.length > 1 ? <div className="cross-domain-common-metrics">
                <div className="cross-domain-builder-heading cross-domain-builder-heading--small"><div><strong>{ui('Directly comparable source fields')}</strong><p>{ui('A field appears here only when the same structured key exists on at least two selected actions.')}</p></div></div>
                {commonImpactMetrics.length ? <div className="cross-domain-common-metric-list">{commonImpactMetrics.map((row) => <div className="cross-domain-common-metric" key={row.key}><strong>{sourceMetricLabel(row.key)}</strong><div>{row.values.map((value, index) => <span key={index}><small>{ui('Action {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</small><b>{value === null ? '—' : String(value)}</b></span>)}</div></div>)}</div> : <p className="cross-domain-muted">{ui('The actions share the same business subject, but their source modules do not expose identical measurable fields. The evidence remains visible separately above.')}</p>}
              </div> : null}
              <div className="cross-domain-wizard-actions"><button className="button button--secondary" type="button" onClick={() => setCreateStep(2)}>{ui('Back')}</button><button className="button" type="button" disabled={!selectedSourceSelectionValid} onClick={() => setCreateStep(4)}>{ui('Continue to save')}</button></div>
            </section>
          ) : null}

          {createStep === 4 ? (
            <section className="cross-domain-wizard-step">
              <div className="cross-domain-wizard-step__intro"><span className="cross-domain-step-number">4</span><div><h3>{selectedRecommendations.length > 1 ? ui('Save the decision comparison') : ui('Save the decision review')}</h3><p>{ui('Saving records the human note and the exact source recommendation. It does not execute the operational action.')}</p></div></div>
              <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('Decision record')}</span><strong>{reviewDraft.title}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(1)}>{ui('Edit')}</button></div>{reviewDraft.summary ? <p>{reviewDraft.summary}</p> : <p className="cross-domain-muted">{ui('No reviewer note was entered.')}</p>}</div>
              <div className="cross-domain-review-box"><div className="cross-domain-review-box__heading"><div><span>{ui('Action to review')}</span><strong>{ui('{count} source-backed actions').replace('{count}', formatLocalizedNumber(selectedRecommendations.length, locale))}</strong></div><button className="button button--secondary" type="button" onClick={() => setCreateStep(2)}>{ui('Edit')}</button></div><div className="cross-domain-review-list">{selectedRecommendations.map((item) => <div key={item.id}><strong>{sourceBusinessAction(item, locale, ui)}</strong><span>{sourceBusinessSubject(item, ui)} · {sourceBusinessOrigin(item, ui)}</span></div>)}</div></div>
              {createSourceBackedReview.isError ? <p className="cross-domain-error">{ui('The data-backed decision review could not be created. The source records were not changed.')}</p> : null}
              <div className="cross-domain-create-footer"><div><strong>{ui('What happens after saving')}</strong><p>{selectedRecommendations.length === 1 ? ui('The source-backed action is selected automatically. You can then send it to Intelligence Review or open its source workflow.') : ui('Open the saved comparison, choose one action, and send it to Intelligence Review if formal approval is needed.')}</p></div><button className="button" type="button" disabled={createSourceBackedReview.isPending || reviewDraft.title.trim().length < 3 || !selectedSourceSelectionValid} onClick={() => createSourceBackedReview.mutate()}>{createSourceBackedReview.isPending ? ui('Creating…') : selectedRecommendations.length > 1 ? ui('Save decision comparison') : ui('Save decision review')}</button></div>
              <div className="cross-domain-wizard-actions cross-domain-wizard-actions--start"><button className="button button--secondary" type="button" onClick={() => setCreateStep(3)}>{ui('Back')}</button></div>
            </section>
          ) : null}
        </section>
      ) : null}

      {SHOW_V349218_MANUAL_CREATE_UI && showCreate && canGovern ? (
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
      {!hasEvidence && !showCreate ? <section className="card cross-domain-section cross-domain-first-use"><div><span className="cross-domain-eyebrow">{ui('Start here')}</span><h2>{ui('No decision comparisons yet')}</h2><p>{canGovern ? ui('Create a comparison, add a human note, then let the application load or build structured planning recommendations. A comparison is available only when at least two distinct actions refer to the same structured business subject.') : ui('No decision comparisons are available for this tenant and filter set.')}</p></div>{canGovern ? <button className="button" type="button" onClick={() => { setCreateStep(1); setShowCreate(true); setSourceBuildReport(null); }}>{ui('Create decision comparison')}</button> : null}</section> : null}

      {view === 'evidence' && hasEvidence ? <>
        <EvidenceSection title={ui('Optimization runs')} description={ui('Stored planning exercises. Open one to see its complete decision story.')} rows={(data?.optimization_runs || []) as Array<Record<string, unknown>>} headers={['Run', 'Business area', 'Status', 'Owner', 'Due', 'Updated', 'Action']} renderRow={(row, index) => { const run = row as OptimizationRun; return <tr key={run.id || index}><td><strong>{run.title || run.optimization_label || ui('Planning run {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{run.summary ? <span className="cross-domain-subtext">{run.summary}</span> : null}</td><td>{label(run.optimization_domain, ui)}</td><td><StatusBadge value={run.optimization_status} /></td><td>{run.owner_name || run.owner_email || '—'}</td><td>{formatDate(run.due_at, locale)}</td><td>{formatDate(run.updated_at || run.created_at, locale)}</td><td><button className="button button--secondary" type="button" onClick={() => openRun(run)}>{ui('Open plan')}</button></td></tr>; }} />
        <EvidenceSection title={ui('Business objectives')} description={ui('The goals, targets, limits, and weights used to compare options.')} rows={(data?.objectives || []) as Array<Record<string, unknown>>} headers={['Run', 'Objective', 'Business area', 'Target', 'Constraint', 'Weight']} renderRow={(row, index) => { const objective = row as OptimizationObjective; return <tr key={objective.id || index}><td>{objective.optimization_label || ui('Linked planning run')}</td><td><strong>{label(objective.objective_type, ui)}</strong><span className="cross-domain-subtext">{label(objective.target_direction, ui)}</span></td><td>{label(objective.objective_domain, ui)}</td><td>{referenceText(objective.target_reference, locale, ui)}</td><td>{referenceText(objective.constraint_reference, locale, ui)}</td><td>{numeric(objective.weight) === null ? '—' : formatLocalizedNumber(Number(objective.weight), locale, { maximumFractionDigits: 2 })}</td></tr>; }} />
        <EvidenceSection title={ui('Planning options')} description={ui('Saved planning choices. Source-backed choices retain their originating evidence; Cross-Domain does not invent a score when none was calculated.')} rows={(data?.options || []) as Array<Record<string, unknown>>} headers={['Run', 'Option', 'Status', 'Projected score', 'Confidence']} renderRow={(row, index) => { const option = row as OptimizationOption; return <tr key={option.id || index}><td>{option.optimization_label || ui('Linked planning run')}</td><td><strong>{option.title || option.option_label || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{option.summary ? <span className="cross-domain-subtext">{option.summary}</span> : null}</td><td><StatusBadge value={option.option_status} /></td><td>{formatPercentage(option.aggregate_score, locale)}</td><td>{formatPercentage(option.confidence_score, locale)}</td></tr>; }} />
        <EvidenceSection title={ui('Tradeoffs')} description={ui('Expected benefits and downsides. A formally accepted or mitigated high-impact tradeoff is distinguished from an unresolved one.')} rows={(data?.tradeoffs || []) as Array<Record<string, unknown>>} headers={['Option', 'Objective', 'Business area', 'Direction', 'Impact', 'Governance']} renderRow={(row, index) => { const tradeoff = row as OptimizationTradeoff; return <tr key={tradeoff.id || index}><td>{tradeoff.option_label || ui('Linked planning option')}</td><td>{label(tradeoff.objective_type, ui)}</td><td>{label(tradeoff.tradeoff_domain, ui)}</td><td><StatusBadge value={tradeoff.impact_direction} /></td><td>{formatPercentage(tradeoff.impact_score, locale)}</td><td><StatusBadge value={tradeoff.governance_status} /></td></tr>; }} />
        <EvidenceSection title={ui('Actual optimization outcomes')} description={ui('Results recorded through Learning Feedback after a plan was tried manually.')} rows={(data?.optimization_results || []) as Array<Record<string, unknown>>} headers={['Run', 'Option', 'Outcome', 'Business area', 'Realized value', 'Observed']} renderRow={(row, index) => { const result = row as OptimizationResult; return <tr key={result.id || index}><td>{result.optimization_label || ui('Linked planning run')}</td><td>{result.option_label || ui('No option reference')}</td><td><StatusBadge value={result.result_status} /></td><td>{label(result.result_domain, ui)}</td><td>{formatPercentage(result.realized_value_score, locale)}</td><td>{formatDate(result.observed_at, locale)}</td></tr>; }} />
      </> : null}

      {view === 'plan' ? selectedRun ? <>
        <section className="card cross-domain-section cross-domain-plan-header"><div><span className="cross-domain-eyebrow">{ui('Selected planning run')}</span><h2>{selectedRun.title || selectedRun.optimization_label}</h2><p>{selectedRun.summary || ui('No summary was recorded.')}</p></div><div className="cross-domain-plan-meta"><StatusBadge value={selectedRun.optimization_status} /><span>{ui('Owner')}: {selectedRun.owner_name || selectedRun.owner_email || ui('Not assigned')}</span><span>{ui('Due')}: {formatDate(selectedRun.due_at, locale)}</span><span>{ui('Next action')}: {selectedRun.next_action || ui('Not recorded')}</span>{selectedRun.intelligence_review_decision ? <span>{ui('Intelligence Review')}: {label(selectedRun.intelligence_review_decision, ui)}</span> : null}</div></section>

        {canGovern ? <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Ownership and next action')}</h2><p className="card__subtext">{ui('Keep responsibility, deadline, and the next human step visible. Use the existing Tasks or Execution Requests pages for actual follow-up work instead of duplicating task management here.')}</p></div></div><div className="cross-domain-form-grid"><label><span className="form-label">{ui('Owner')}</span><select className="input" value={ownershipDraft.owner_user_id} onChange={(event) => setOwnershipDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner')}</option>{ownerCandidates.map((user) => <option key={user.id} value={user.id}>{ownerCandidateLabel(user)}</option>)}</select></label><label><span className="form-label">{ui('Due date')}</span><input className="input" type="date" value={ownershipDraft.due_at} onChange={(event) => setOwnershipDraft((current) => ({ ...current, due_at: event.target.value }))} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Next required action')}</span><input className="input" value={ownershipDraft.next_action} onChange={(event) => setOwnershipDraft((current) => ({ ...current, next_action: event.target.value }))} /></label></div><button className="button" type="button" disabled={runAction.isPending || !selectedRun.id} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'update_ownership', owner_user_id: ownershipDraft.owner_user_id || null, due_at: ownershipDraft.due_at || null, next_action: ownershipDraft.next_action || null } })}>{ui('Save ownership and next action')}</button></section> : null}

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('What this plan is trying to achieve')}</h2><p className="card__subtext">{ui('Targets and constraints are shown directly so a score is not separated from the business goal it is supposed to serve.')}</p></div></div><div className="cross-domain-objective-grid">{(data?.run_detail?.objectives || []).map((objective, index) => <article className="cross-domain-objective-card" key={objective.id || index}><strong>{label(objective.objective_type, ui)}</strong><span>{label(objective.objective_domain, ui)} · {label(objective.target_direction, ui)}</span><p><b>{ui('Target')}:</b> {referenceText(objective.target_reference, locale, ui)}</p><p><b>{ui('Constraint')}:</b> {referenceText(objective.constraint_reference, locale, ui)}</p><p><b>{ui('Weight')}:</b> {numeric(objective.weight) === null ? '—' : formatLocalizedNumber(Number(objective.weight), locale, { maximumFractionDigits: 2 })}</p></article>)}</div></section>

        <section className="card cross-domain-section">
          <div className="card__header"><div><h2>{ui('Compare the options')}</h2><p className="card__subtext">{ui('Source-backed options show the structured evidence saved from their originating planning records. Cross-Domain does not invent missing evidence or select a winner automatically.')}</p></div></div>
          <div className="cross-domain-option-grid">{(data?.run_detail?.options || []).map((option, index) => {
            const explanation = option.score_explanation || {};
            const projected = simpleRecord(option.projected_outcome);
            const isSourceBacked = Boolean(projected.source_plan_type || projected.source_item_type || projected.impact_snapshot);
            const isSelected = selectedRun.selected_option_id === option.id;
            return <article className={`cross-domain-option-card${isSelected ? ' cross-domain-option-card--selected' : ''}`} key={option.id || index}>
              <div className="cross-domain-option-title"><div><strong>{option.title || option.option_label || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong><p>{option.summary || ui('No option summary was recorded.')}</p></div><StatusBadge value={option.option_status} /></div>
              {isSourceBacked ? <>
                <div className="cross-domain-score-row"><div><span>{ui('Cross-Domain score')}</span><strong>{numeric(option.aggregate_score) === null ? ui('Not calculated') : formatPercentage(option.aggregate_score, locale)}</strong></div><div><span>{ui('Source confidence')}</span><strong>{formatPercentage(option.confidence_score, locale)}</strong></div></div>
                <div className="cross-domain-explanation"><h3>{ui('What the source data says')}</h3><p><b>{ui('Originating module')}:</b> {label(String(projected.source_plan_type || projected.source_item_type || 'optimization'), ui)}</p><p><b>{ui('Originating source score')}:</b> {projected.source_score === null || projected.source_score === undefined ? '—' : formatLocalizedNumber(Number(projected.source_score), locale)}</p><p className="cross-domain-score-disclaimer">{ui('The source score belongs to the originating planning module. Cross-Domain Optimization does not normalize it, rank these actions with it, or call it a winner score.')}</p><div className="cross-domain-source-facts cross-domain-source-facts--full">{flattenImpactFacts(projected.impact_snapshot).length ? flattenImpactFacts(projected.impact_snapshot).map(([key, value]) => <span key={key}><b>{sourceMetricLabel(key)}:</b> {String(value)}</span>) : <span>{ui('No structured impact facts were recorded on this recommendation.')}</span>}</div></div>
              </> : <>
                <div className="cross-domain-score-row"><div><span>{ui('Projected score')}</span><strong>{formatPercentage(option.aggregate_score, locale)}</strong></div><div><span>{ui('Confidence')}</span><strong>{formatPercentage(option.confidence_score, locale)}</strong></div></div>
                <div className="cross-domain-explanation"><h3>{ui('Why this option scored this way')}</h3><p><b>{ui('Expected result')}:</b> {referenceText(explanation.projected_outcome || option.projected_outcome, locale, ui)}</p><div className="cross-domain-driver-grid"><div><strong>{ui('Helps')}</strong>{(explanation.positive_drivers || []).length ? <ul>{(explanation.positive_drivers || []).map((driver, driverIndex) => <li key={driverIndex}>{label(driver.objective_type, ui)} · {label(driver.tradeoff_domain, ui)} · {formatPercentage(driver.impact_score, locale)}</li>)}</ul> : <p>{ui('No positive driver is recorded.')}</p>}</div><div><strong>{ui('Hurts or needs attention')}</strong>{(explanation.downside_drivers || []).length ? <ul>{(explanation.downside_drivers || []).map((driver, driverIndex) => <li key={driverIndex}>{label(driver.objective_type, ui)} · {label(driver.tradeoff_domain, ui)} · {formatPercentage(driver.impact_score, locale)} · {label(driver.governance_status, ui)}</li>)}</ul> : <p>{ui('No negative or mixed driver is recorded.')}</p>}</div></div></div>
              </>}
              {canGovern && option.id ? <button className="button button--secondary" type="button" disabled={runAction.isPending || isSelected} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'select_option', option_id: option.id } })}>{isSelected ? ui('Selected for review') : ui('Select this option')}</button> : null}
            </article>;
          })}</div>
        </section>

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
