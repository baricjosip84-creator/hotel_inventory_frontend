import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { useAppTranslation } from '../i18n/I18nContext';
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
  filters?: Partial<OptimizationFilterState> & { review_run_id?: string; limit?: number };
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

const CANONICAL_LABELS: Record<string, string> = {
  inventory: 'Inventory', procurement: 'Procurement', reservation: 'Reservation', execution: 'Execution', optimization: 'Optimization', control_tower: 'Control tower', financial: 'Financial', integration: 'Integration', multi_domain: 'Multi-domain', system: 'System',
  draft: 'Draft', candidate_generated: 'Candidate generated', tradeoff_review: 'Tradeoff review', governance_review_required: 'Governance review required', approved_for_manual_planning: 'Approved for manual planning', rejected: 'Rejected', archived: 'Archived',
  sla_risk: 'SLA risk', profitability: 'Profitability', labor_cost: 'Labor cost', carrying_cost: 'Carrying cost', supplier_reliability: 'Supplier reliability', working_capital: 'Working capital', facility_load: 'Facility load', integration_resilience: 'Integration resilience', general: 'General',
  minimize: 'Minimize', maximize: 'Maximize', balance: 'Balance', stabilize: 'Stabilize', generated: 'Generated', ranked: 'Ranked', superseded: 'Superseded', positive: 'Positive', negative: 'Negative', neutral: 'Neutral', mixed: 'Mixed', observed: 'Observed', value_confirmed: 'Value confirmed', value_missed: 'Value missed', tradeoff_drift_detected: 'Tradeoff drift detected',
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

function formatPercentage(value: unknown, locale: string): string {
  const parsed = numeric(value);
  if (parsed === null) return '—';
  return `${formatLocalizedNumber(parsed * 100, locale, { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: unknown, locale: string): string {
  return typeof value === 'string' && value ? formatLocalizedDateTime(value, locale) : '—';
}

function label(value: unknown, ui: (key: string) => string): string {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value);
  return ui(CANONICAL_LABELS[raw] || raw.replaceAll('_', ' '));
}

function referenceText(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '—';
  const record = value as Record<string, unknown>;
  for (const key of ['statement', 'summary', 'target', 'value', 'description']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (typeof candidate === 'number') return String(candidate);
  }
  const entries = Object.entries(record).filter(([, item]) => item !== null && item !== undefined && item !== '');
  if (!entries.length) return '—';
  return entries.slice(0, 4).map(([key, item]) => `${key.replaceAll('_', ' ')}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`).join(' · ');
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
  const [reviewDraft, setReviewDraft] = useState<DraftReview>(emptyReview());
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

  useEffect(() => {
    const run = data?.run_detail?.run;
    if (!run) return;
    setOwnershipDraft({
      owner_user_id: run.owner_user_id || '',
      due_at: run.due_at ? String(run.due_at).slice(0, 10) : '',
      next_action: run.next_action || ''
    });
  }, [data?.run_detail?.run?.id, data?.run_detail?.run?.owner_user_id, data?.run_detail?.run?.due_at, data?.run_detail?.run?.next_action]);

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
      <OperationalWorkspaceHero
        iconPath="/cross-domain-optimization"
        eyebrow={ui('Decision intelligence & planning')}
        title={ui('Cross-Domain Optimization')}
        description={ui('Compare possible plans across business areas, understand why one option scores better, govern important tradeoffs, and compare expected results with what actually happened. People remain responsible for every approval and real business action.')}
        aside={<><OperationalWorkspaceStatus value={label(data?.governance?.cross_domain_optimization_posture, ui)} label={ui('Planning review posture · refreshed {time}').replace('{time}', lastRefreshed)} /><button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>{isFetching ? ui('Refreshing…') : ui('Refresh evidence')}</button>{canGovern ? <button className="button" type="button" onClick={() => setShowCreate((value) => !value)}>{ui('Create planning review')}</button> : null}</>}
      />

      <OperationalWorkspaceStats ariaLabel={ui('Cross-domain optimization evidence summary')}>
        <OperationalWorkspaceStatCard label={ui('Runs')} value={formatLocalizedNumber(runCount, locale)} iconPath="/cross-domain-optimization" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Objectives')} value={formatLocalizedNumber(objectiveCount, locale)} iconPath="/system-context" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Options')} value={formatLocalizedNumber(optionCount, locale)} iconPath="/workflow-composer" tone="blue" />
        <OperationalWorkspaceStatCard label={ui('Tradeoffs')} value={formatLocalizedNumber(tradeoffCount, locale)} iconPath="/alerts" tone="amber" />
        <OperationalWorkspaceStatCard label={ui('Recorded outcomes')} value={formatLocalizedNumber(resultCount, locale)} iconPath="/decision-learning-feedback" tone="slate" />
        <OperationalWorkspaceStatCard label={ui('Unresolved high-impact tradeoffs')} value={formatLocalizedNumber(Number(data?.run_detail?.unresolved_high_impact_tradeoff_count ?? data?.governance?.high_impact_tradeoff_count ?? 0), locale)} iconPath="/alerts" tone="amber" />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui('Cross-domain optimization page views')}>
        <OperationalWorkspaceTab active={view === 'evidence'} iconPath="/cross-domain-optimization" label={ui('Optimization evidence')} onClick={() => setView('evidence')} />
        <OperationalWorkspaceTab active={view === 'plan'} iconPath="/workflow-composer" label={ui('Selected plan')} onClick={() => setView('plan')} />
        <OperationalWorkspaceTab active={view === 'readiness'} iconPath="/reliability-command" label={ui('Review checks')} onClick={() => setView('readiness')} />
      </OperationalWorkspaceTabs>

      {showCreate && canGovern ? (
        <section className="card cross-domain-section cross-domain-create">
          <div className="card__header"><div><h2>{ui('Create a planning review')}</h2><p className="card__subtext">{ui('Prepare human-confirmed planning evidence here. This creates objectives, options, and tradeoffs for review; it does not execute a plan or change inventory, purchasing, reservations, finances, or integrations.')}</p></div><button className="button button--secondary" type="button" onClick={() => setShowCreate(false)}>{ui('Close')}</button></div>
          <div className="cross-domain-form-grid">
            <label><span className="form-label">{ui('Planning review title')}</span><input className="input" value={reviewDraft.title} onChange={(event) => setReviewDraft((current) => ({ ...current, title: event.target.value }))} /></label>
            <label><span className="form-label">{ui('Business area')}</span><select className="input" value={reviewDraft.optimization_domain} onChange={(event) => setReviewDraft((current) => ({ ...current, optimization_domain: event.target.value }))}>{OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label>
            <label><span className="form-label">{ui('Owner')}</span><select className="input" value={reviewDraft.owner_user_id} onChange={(event) => setReviewDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner yet')}</option>{(data?.owner_candidates || []).map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}</select></label>
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

      <section className="card cross-domain-section">
        <div className="card__header"><div><h2>{ui('Choose the planning run to review')}</h2><p className="card__subtext">{ui('Review checks are always calculated from one selected run. Evidence from different runs is never pooled into one readiness result.')}</p></div>{selectedRunId ? <span className="cross-domain-badge cross-domain-badge--ok">{ui('Run-scoped checks')}</span> : <span className="cross-domain-badge cross-domain-badge--neutral">{ui('No run selected')}</span>}</div>
        <select className="input" value={selectedRunId} onChange={(event) => setSelectedRunId(event.target.value)}><option value="">{ui('Select a planning run')}</option>{(data?.optimization_runs || []).map((run) => <option key={run.id || run.optimization_key} value={run.id || ''}>{run.title || run.optimization_label || run.optimization_key}</option>)}</select>
      </section>

      <section className="card cross-domain-filters" aria-label={ui('Cross-domain optimization filters')}>
        <div className="card__header"><div><h2>{ui('Filter the evidence')}</h2><p className="card__subtext">{ui('Filters change the overview lists. Selecting a run separately controls every readiness calculation.')}</p></div><button className="button button--secondary" type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setSelectedRunId(''); }}>{ui('Clear filters')}</button></div>
        <div className="cross-domain-filter-grid"><label><span className="form-label">{ui('Business area')}</span><select className="input" value={filters.optimization_domain} onChange={(event) => updateFilter('optimization_domain', event.target.value)}><option value="">{ui('All areas')}</option>{OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Run status')}</span><select className="input" value={filters.optimization_status} onChange={(event) => updateFilter('optimization_status', event.target.value)}><option value="">{ui('All run statuses')}</option>{OPTIMIZATION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Objective type')}</span><select className="input" value={filters.objective_type} onChange={(event) => updateFilter('objective_type', event.target.value)}><option value="">{ui('All objective types')}</option>{OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Option status')}</span><select className="input" value={filters.option_status} onChange={(event) => updateFilter('option_status', event.target.value)}><option value="">{ui('All option statuses')}</option>{OPTION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Tradeoff direction')}</span><select className="input" value={filters.impact_direction} onChange={(event) => updateFilter('impact_direction', event.target.value)}><option value="">{ui('All directions')}</option>{IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Recorded outcome status')}</span><select className="input" value={filters.result_status} onChange={(event) => updateFilter('result_status', event.target.value)}><option value="">{ui('All outcome statuses')}</option>{RESULT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label><label><span className="form-label">{ui('Maximum records per evidence list')}</span><select className="input" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>{['25', '50', '100', '200'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
      </section>

      {!hasEvidence ? <section className="card cross-domain-section"><h2>{ui('No cross-area optimization evidence is available')}</h2><p>{canGovern ? ui('Create a planning review to record the business goals, options, and tradeoffs that people want to compare.') : ui('No planning evidence is available for this tenant and filter set.')}</p></section> : null}

      {view === 'evidence' ? <>
        <EvidenceSection title={ui('Optimization runs')} description={ui('Stored planning exercises. Open one to see its complete decision story.')} rows={(data?.optimization_runs || []) as Array<Record<string, unknown>>} headers={['Run', 'Business area', 'Status', 'Owner', 'Due', 'Updated', 'Action']} renderRow={(row, index) => { const run = row as OptimizationRun; return <tr key={run.id || index}><td><strong>{run.title || run.optimization_label || ui('Planning run {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{run.summary ? <span className="cross-domain-subtext">{run.summary}</span> : null}</td><td>{label(run.optimization_domain, ui)}</td><td><StatusBadge value={run.optimization_status} /></td><td>{run.owner_name || run.owner_email || '—'}</td><td>{formatDate(run.due_at, locale)}</td><td>{formatDate(run.updated_at || run.created_at, locale)}</td><td><button className="button button--secondary" type="button" onClick={() => openRun(run)}>{ui('Open plan')}</button></td></tr>; }} />
        <EvidenceSection title={ui('Business objectives')} description={ui('The goals, targets, limits, and weights used to compare options.')} rows={(data?.objectives || []) as Array<Record<string, unknown>>} headers={['Run', 'Objective', 'Business area', 'Target', 'Constraint', 'Weight']} renderRow={(row, index) => { const objective = row as OptimizationObjective; return <tr key={objective.id || index}><td>{objective.optimization_label || ui('Linked planning run')}</td><td><strong>{label(objective.objective_type, ui)}</strong><span className="cross-domain-subtext">{label(objective.target_direction, ui)}</span></td><td>{label(objective.objective_domain, ui)}</td><td>{referenceText(objective.target_reference)}</td><td>{referenceText(objective.constraint_reference)}</td><td>{numeric(objective.weight) === null ? '—' : formatLocalizedNumber(Number(objective.weight), locale, { maximumFractionDigits: 2 })}</td></tr>; }} />
        <EvidenceSection title={ui('Planning options')} description={ui('Alternative plans. Projected scores are estimates; open the plan to see why each score looks the way it does.')} rows={(data?.options || []) as Array<Record<string, unknown>>} headers={['Run', 'Option', 'Status', 'Projected score', 'Confidence']} renderRow={(row, index) => { const option = row as OptimizationOption; return <tr key={option.id || index}><td>{option.optimization_label || ui('Linked planning run')}</td><td><strong>{option.title || option.option_label || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{option.summary ? <span className="cross-domain-subtext">{option.summary}</span> : null}</td><td><StatusBadge value={option.option_status} /></td><td>{formatPercentage(option.aggregate_score, locale)}</td><td>{formatPercentage(option.confidence_score, locale)}</td></tr>; }} />
        <EvidenceSection title={ui('Tradeoffs')} description={ui('Expected benefits and downsides. A formally accepted or mitigated high-impact tradeoff is distinguished from an unresolved one.')} rows={(data?.tradeoffs || []) as Array<Record<string, unknown>>} headers={['Option', 'Objective', 'Business area', 'Direction', 'Impact', 'Governance']} renderRow={(row, index) => { const tradeoff = row as OptimizationTradeoff; return <tr key={tradeoff.id || index}><td>{tradeoff.option_label || ui('Linked planning option')}</td><td>{label(tradeoff.objective_type, ui)}</td><td>{label(tradeoff.tradeoff_domain, ui)}</td><td><StatusBadge value={tradeoff.impact_direction} /></td><td>{formatPercentage(tradeoff.impact_score, locale)}</td><td><StatusBadge value={tradeoff.governance_status} /></td></tr>; }} />
        <EvidenceSection title={ui('Actual optimization outcomes')} description={ui('Results recorded through Learning Feedback after a plan was tried manually.')} rows={(data?.optimization_results || []) as Array<Record<string, unknown>>} headers={['Run', 'Option', 'Outcome', 'Business area', 'Realized value', 'Observed']} renderRow={(row, index) => { const result = row as OptimizationResult; return <tr key={result.id || index}><td>{result.optimization_label || ui('Linked planning run')}</td><td>{result.option_label || ui('No option reference')}</td><td><StatusBadge value={result.result_status} /></td><td>{label(result.result_domain, ui)}</td><td>{formatPercentage(result.realized_value_score, locale)}</td><td>{formatDate(result.observed_at, locale)}</td></tr>; }} />
      </> : null}

      {view === 'plan' ? selectedRun ? <>
        <section className="card cross-domain-section cross-domain-plan-header"><div><span className="cross-domain-eyebrow">{ui('Selected planning run')}</span><h2>{selectedRun.title || selectedRun.optimization_label}</h2><p>{selectedRun.summary || ui('No summary was recorded.')}</p></div><div className="cross-domain-plan-meta"><StatusBadge value={selectedRun.optimization_status} /><span>{ui('Owner')}: {selectedRun.owner_name || selectedRun.owner_email || ui('Not assigned')}</span><span>{ui('Due')}: {formatDate(selectedRun.due_at, locale)}</span><span>{ui('Next action')}: {selectedRun.next_action || ui('Not recorded')}</span>{selectedRun.intelligence_review_decision ? <span>{ui('Intelligence Review')}: {label(selectedRun.intelligence_review_decision, ui)}</span> : null}</div></section>

        {canGovern ? <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Ownership and next action')}</h2><p className="card__subtext">{ui('Keep responsibility, deadline, and the next human step visible. Use the existing Tasks or Execution Requests pages for actual follow-up work instead of duplicating task management here.')}</p></div></div><div className="cross-domain-form-grid"><label><span className="form-label">{ui('Owner')}</span><select className="input" value={ownershipDraft.owner_user_id} onChange={(event) => setOwnershipDraft((current) => ({ ...current, owner_user_id: event.target.value }))}><option value="">{ui('No owner')}</option>{(data?.owner_candidates || []).map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}</select></label><label><span className="form-label">{ui('Due date')}</span><input className="input" type="date" value={ownershipDraft.due_at} onChange={(event) => setOwnershipDraft((current) => ({ ...current, due_at: event.target.value }))} /></label><label className="cross-domain-span-2"><span className="form-label">{ui('Next required action')}</span><input className="input" value={ownershipDraft.next_action} onChange={(event) => setOwnershipDraft((current) => ({ ...current, next_action: event.target.value }))} /></label></div><button className="button" type="button" disabled={runAction.isPending || !selectedRun.id} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'update_ownership', owner_user_id: ownershipDraft.owner_user_id || null, due_at: ownershipDraft.due_at || null, next_action: ownershipDraft.next_action || null } })}>{ui('Save ownership and next action')}</button></section> : null}

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('What this plan is trying to achieve')}</h2><p className="card__subtext">{ui('Targets and constraints are shown directly so a score is not separated from the business goal it is supposed to serve.')}</p></div></div><div className="cross-domain-objective-grid">{(data?.run_detail?.objectives || []).map((objective, index) => <article className="cross-domain-objective-card" key={objective.id || index}><strong>{label(objective.objective_type, ui)}</strong><span>{label(objective.objective_domain, ui)} · {label(objective.target_direction, ui)}</span><p><b>{ui('Target')}:</b> {referenceText(objective.target_reference)}</p><p><b>{ui('Constraint')}:</b> {referenceText(objective.constraint_reference)}</p><p><b>{ui('Weight')}:</b> {numeric(objective.weight) === null ? '—' : formatLocalizedNumber(Number(objective.weight), locale, { maximumFractionDigits: 2 })}</p></article>)}</div></section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Compare the options')}</h2><p className="card__subtext">{ui('Each option shows its estimated score, what helps it, what hurts it, and any actual outcomes already recorded.')}</p></div></div><div className="cross-domain-option-grid">{(data?.run_detail?.options || []).map((option, index) => { const explanation = option.score_explanation || {}; const isSelected = selectedRun.selected_option_id === option.id; return <article className={`cross-domain-option-card${isSelected ? ' cross-domain-option-card--selected' : ''}`} key={option.id || index}><div className="cross-domain-option-title"><div><strong>{option.title || option.option_label || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong><p>{option.summary || ui('No option summary was recorded.')}</p></div><StatusBadge value={option.option_status} /></div><div className="cross-domain-score-row"><div><span>{ui('Projected score')}</span><strong>{formatPercentage(option.aggregate_score, locale)}</strong></div><div><span>{ui('Confidence')}</span><strong>{formatPercentage(option.confidence_score, locale)}</strong></div></div><div className="cross-domain-explanation"><h3>{ui('Why this option scored this way')}</h3><p><b>{ui('Expected result')}:</b> {referenceText(explanation.projected_outcome || option.projected_outcome)}</p><div className="cross-domain-driver-grid"><div><strong>{ui('Helps')}</strong>{(explanation.positive_drivers || []).length ? <ul>{(explanation.positive_drivers || []).map((driver, driverIndex) => <li key={driverIndex}>{label(driver.objective_type, ui)} · {label(driver.tradeoff_domain, ui)} · {formatPercentage(driver.impact_score, locale)}</li>)}</ul> : <p>{ui('No positive driver is recorded.')}</p>}</div><div><strong>{ui('Hurts or needs attention')}</strong>{(explanation.downside_drivers || []).length ? <ul>{(explanation.downside_drivers || []).map((driver, driverIndex) => <li key={driverIndex}>{label(driver.objective_type, ui)} · {label(driver.tradeoff_domain, ui)} · {formatPercentage(driver.impact_score, locale)} · {label(driver.governance_status, ui)}</li>)}</ul> : <p>{ui('No negative or mixed driver is recorded.')}</p>}</div></div></div>{canGovern && option.id ? <button className="button button--secondary" type="button" disabled={runAction.isPending || isSelected} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'select_option', option_id: option.id } })}>{isSelected ? ui('Selected for review') : ui('Select this option')}</button> : null}</article>; })}</div></section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Govern the important tradeoffs')}</h2><p className="card__subtext">{ui('A high-impact downside can be accepted, accepted with conditions, mitigated, or rejected by a person. Accepted or mitigated tradeoffs no longer incorrectly block later review stages.')}</p></div></div>{!(data?.run_detail?.tradeoffs || []).length ? <p className="cross-domain-muted">{ui('No tradeoffs are recorded for this run.')}</p> : <div className="cross-domain-tradeoff-list">{(data?.run_detail?.tradeoffs || []).map((tradeoff, index) => { const draft = tradeoff.id ? tradeoffDrafts[tradeoff.id] : undefined; return <article className="cross-domain-tradeoff-card" key={tradeoff.id || index}><div className="cross-domain-tradeoff-summary"><div><strong>{tradeoff.option_label || ui('Linked planning option')}</strong><p>{label(tradeoff.objective_type, ui)} · {label(tradeoff.tradeoff_domain, ui)} · {label(tradeoff.impact_direction, ui)} · {formatPercentage(tradeoff.impact_score, locale)}</p></div><StatusBadge value={tradeoff.governance_status} /></div>{tradeoff.governance_reason ? <p><b>{ui('Recorded reason')}:</b> {tradeoff.governance_reason}</p> : null}{tradeoff.governance_conditions ? <p><b>{ui('Conditions')}:</b> {tradeoff.governance_conditions}</p> : null}{canGovern && tradeoff.id ? <div className="cross-domain-tradeoff-govern"><select className="input" value={draft?.status || tradeoff.governance_status || 'open'} onChange={(event) => setTradeoffDraft(tradeoff, { status: event.target.value })}>{TRADEOFF_GOVERNANCE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select><input className="input" value={draft?.reason ?? tradeoff.governance_reason ?? ''} onChange={(event) => setTradeoffDraft(tradeoff, { reason: event.target.value })} placeholder={ui('Reason for the decision')} /><input className="input" value={draft?.conditions ?? tradeoff.governance_conditions ?? ''} onChange={(event) => setTradeoffDraft(tradeoff, { conditions: event.target.value })} placeholder={ui('Conditions, if any')} /><button className="button" type="button" disabled={governTradeoff.isPending} onClick={() => governTradeoff.mutate({ tradeoffId: tradeoff.id as string, draft: draft || { status: tradeoff.governance_status || 'open', reason: tradeoff.governance_reason || '', conditions: tradeoff.governance_conditions || '' } })}>{ui('Record tradeoff decision')}</button></div> : null}</article>; })}</div>}</section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Expected result compared with actual result')}</h2><p className="card__subtext">{ui('Learning Feedback closes the loop by showing what was expected beside the measured result that actually happened.')}</p></div><button className="button button--secondary" type="button" onClick={() => navigate('/decision-learning-feedback')}>{ui('Open Learning Feedback')}</button></div>{!(data?.run_detail?.optimization_results || []).length ? <p className="cross-domain-muted">{ui('No actual outcome has been recorded for this run yet.')}</p> : <div className="cross-domain-outcome-grid">{(data?.run_detail?.optimization_results || []).map((result, index) => <article className="cross-domain-outcome-card" key={result.id || index}><div className="cross-domain-outcome-heading"><strong>{result.option_label || ui('Linked planning option')}</strong><StatusBadge value={result.result_status} /></div><div className="cross-domain-expected-actual"><div><span>{ui('Expected')}</span><p>{referenceText(result.expected_tradeoff)}</p></div><div><span>{ui('Actual')}</span><p>{referenceText(result.observed_tradeoff)}</p><strong>{formatPercentage(result.realized_value_score, locale)}</strong></div></div>{result.comparison_summary ? <p className="cross-domain-muted">{comparisonSummaryText(result.comparison_summary, locale, ui)}</p> : null}</article>)}</div>}</section>

        <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Formal human decision')}</h2><p className="card__subtext">{ui('Intelligence Review remains the authoritative place for approval, rejection, escalation, or reopening. Its decision is reflected back into this planning run and selected option.')}</p></div>{canOpenIntelligenceReview ? <button className="button button--secondary" type="button" onClick={() => navigate('/intelligence-review')}>{ui('Open Intelligence Review')}</button> : null}</div>{canGovern ? <button className="button" type="button" disabled={runAction.isPending || !selectedRun.id || !selectedRun.selected_option_id} onClick={() => selectedRun.id && runAction.mutate({ runId: selectedRun.id, body: { action: 'request_intelligence_review' } })}>{selectedRun.selected_option_id ? ui('Send selected option to Intelligence Review') : ui('Select an option before requesting review')}</button> : null}{canOpenTasks || canOpenExecutionRequests ? <div className="cross-domain-handoffs">{canOpenTasks ? <button className="button button--secondary" type="button" onClick={() => navigate('/execution-tasks')}>{ui('Open Tasks')}</button> : null}{canOpenExecutionRequests ? <button className="button button--secondary" type="button" onClick={() => navigate('/execution-requests')}>{ui('Open Execution Requests')}</button> : null}</div> : null}</section>

        {canGovern ? <section className="card cross-domain-section"><div className="card__header"><div><h2>{ui('Optimization governance settings')}</h2><p className="card__subtext">{ui('These thresholds are tenant-controlled business rules. They replace hidden fixed numbers while keeping safe defaults.')}</p></div></div><div className="cross-domain-form-grid"><label><span className="form-label">{ui('High-impact tradeoff threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.high_impact_tradeoff_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, high_impact_tradeoff_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Reusable-pattern value threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.reusable_pattern_value_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, reusable_pattern_value_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Scaling value threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.scaling_value_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, scaling_value_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Weak-value threshold')}</span><input className="input" type="number" min="0" max="1" step="0.05" value={settingsDraft.weak_value_threshold} onChange={(event) => setSettingsDraft((current) => ({ ...current, weak_value_threshold: event.target.value }))} /></label><label><span className="form-label">{ui('Minimum objectives')}</span><input className="input" type="number" min="1" max="20" value={settingsDraft.minimum_objective_count} onChange={(event) => setSettingsDraft((current) => ({ ...current, minimum_objective_count: event.target.value }))} /></label><label><span className="form-label">{ui('Minimum business areas')}</span><input className="input" type="number" min="1" max="10" value={settingsDraft.minimum_business_domain_count} onChange={(event) => setSettingsDraft((current) => ({ ...current, minimum_business_domain_count: event.target.value }))} /></label><label><span className="form-label">{ui('Monitoring cadence')}</span><select className="input" value={settingsDraft.monitoring_cadence} onChange={(event) => setSettingsDraft((current) => ({ ...current, monitoring_cadence: event.target.value }))}>{MONITORING_CADENCE_OPTIONS.map((value) => <option key={value} value={value}>{label(value, ui)}</option>)}</select></label></div><button className="button" type="button" disabled={updateSettings.isPending} onClick={() => updateSettings.mutate()}>{ui('Save governance settings')}</button></section> : null}
      </> : <section className="card cross-domain-section"><h2>{ui('Choose a planning run')}</h2><p>{ui('Select one planning run above to open its objectives, options, tradeoffs, ownership, Intelligence Review status, and actual outcomes.')}</p></section> : null}

      {view === 'readiness' ? selectedRunId ? <><section className="card cross-domain-section"><h2>{ui('These checks use only the selected planning run')}</h2><p>{ui('Evidence from another run cannot satisfy an objective, business-area, option, tradeoff, or outcome requirement for this run. Passing checks are still advisory and never execute a plan.')}</p></section>{REVIEW_SECTIONS.map((config) => <ReviewCard key={String(config.key)} config={config} section={data?.[config.key] as OptimizationReviewSection | undefined} />)}</> : <section className="card cross-domain-section"><h2>{ui('Select a planning run before reviewing readiness')}</h2><p>{ui('The application deliberately refuses to calculate a combined readiness result across unrelated planning runs.')}</p></section> : null}
    </main>
  );
}
