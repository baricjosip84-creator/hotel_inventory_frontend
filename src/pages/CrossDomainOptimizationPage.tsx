import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './decisionIntelligencePages.css';

type OptimizationView = 'evidence' | 'readiness' | 'diagnostics';

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
  optimization_label?: string;
  optimization_domain?: string;
  optimization_status?: string;
  title?: string;
  summary?: string;
  confidence_score?: number | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type OptimizationObjective = {
  optimization_label?: string;
  objective_type?: string;
  objective_domain?: string;
  weight?: number | string | null;
  target_direction?: string;
  confidence_score?: number | string | null;
  created_at?: string;
  [key: string]: unknown;
};

type OptimizationOption = {
  optimization_label?: string;
  option_label?: string;
  option_status?: string;
  title?: string;
  summary?: string;
  aggregate_score?: number | string | null;
  confidence_score?: number | string | null;
  created_at?: string;
  [key: string]: unknown;
};

type OptimizationTradeoff = {
  option_label?: string;
  objective_type?: string;
  tradeoff_domain?: string;
  impact_direction?: string;
  impact_score?: number | string | null;
  confidence_score?: number | string | null;
  created_at?: string;
  [key: string]: unknown;
};

type OptimizationResult = {
  optimization_label?: string;
  option_label?: string;
  result_domain?: string;
  result_status?: string;
  realized_value_score?: number | string | null;
  observed_at?: string;
  [key: string]: unknown;
};

type OptimizationReviewSection = {
  assessment_available?: boolean;
  [key: string]: unknown;
};

type OptimizationSummary = {
  filters?: Partial<OptimizationFilterState> & { limit?: number };
  governance?: {
    optimization_run_count?: number;
    objective_count?: number;
    option_count?: number;
    tradeoff_count?: number;
    optimization_result_count?: number;
    confirmed_result_count?: number;
    adverse_result_count?: number;
    high_impact_tradeoff_count?: number;
    average_option_score?: number | string | null;
    average_realized_value_score?: number | string | null;
    observed_domains?: string[];
    observed_objective_types?: string[];
    evidence_available?: boolean;
    cross_domain_optimization_posture?: string;
    [key: string]: unknown;
  };
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
  [key: string]: unknown;
};

type ReviewConfig = {
  key: keyof OptimizationSummary;
  title: string;
  description: string;
  decisionKey: string;
  scoreKey: string;
  checksKey: string;
  blockersKey: string;
  metrics: Array<{ label: string; key: string; format?: 'number' | 'percent' | 'boolean' }>;
};

const DEFAULT_FILTERS: OptimizationFilterState = {
  optimization_domain: '',
  optimization_status: '',
  objective_type: '',
  option_status: '',
  impact_direction: '',
  result_status: '',
  limit: '25'
};

const OPTIMIZATION_DOMAIN_OPTIONS = [
  'inventory',
  'procurement',
  'reservation',
  'execution',
  'optimization',
  'control_tower',
  'financial',
  'integration',
  'multi_domain',
  'system'
];

const OPTIMIZATION_STATUS_OPTIONS = [
  'draft',
  'candidate_generated',
  'tradeoff_review',
  'governance_review_required',
  'approved_for_manual_planning',
  'rejected',
  'archived'
];

const OBJECTIVE_TYPE_OPTIONS = [
  'sla_risk',
  'profitability',
  'labor_cost',
  'carrying_cost',
  'supplier_reliability',
  'working_capital',
  'facility_load',
  'integration_resilience',
  'general'
];

const OPTION_STATUS_OPTIONS = [
  'generated',
  'ranked',
  'tradeoff_review',
  'governance_review_required',
  'approved_for_manual_planning',
  'rejected',
  'superseded'
];

const IMPACT_DIRECTION_OPTIONS = ['positive', 'negative', 'neutral', 'mixed'];
const RESULT_STATUS_OPTIONS = ['observed', 'value_confirmed', 'value_missed', 'tradeoff_drift_detected', 'governance_review_required', 'archived'];

const DECISION_LABELS: Record<string, string> = {
  not_assessed_no_optimization_evidence: 'Not assessed — no optimization evidence',
  no_optimization_evidence_available: 'No optimization evidence available',
  optimization_governance_review_required: 'Governance review is required',
  controlled_multi_objective_advisory_posture: 'Controlled advisory review',
  ready_for_controlled_manual_trial_feedback: 'Ready to collect feedback from a controlled manual trial',
  blocked_until_manual_optimization_review: 'Blocked until the option and tradeoffs are reviewed',
  ready_for_manual_trial_outcome_reconciliation: 'Actual trial outcome is ready for human review',
  blocked_until_trial_evidence_is_complete: 'Blocked until actual trial evidence is complete',
  ready_for_manual_pattern_promotion_review: 'Ready for human review as a reusable pattern',
  blocked_until_promotion_guard_is_clear: 'Blocked until promotion evidence gaps are resolved',
  ready_for_manual_pattern_monitoring: 'Ready for manual pattern monitoring',
  blocked_until_monitoring_scope_is_clear: 'Blocked until the monitoring scope is complete',
  ready_for_manual_drift_response_review: 'Ready for a human drift-response review',
  blocked_until_drift_response_scope_is_clear: 'Blocked until drift-response evidence is complete',
  ready_for_manual_continue_recalibrate_or_retire_review: 'Ready for a human continue, recalibrate, or retire review',
  blocked_until_lifecycle_evidence_is_complete: 'Blocked until lifecycle evidence is complete',
  ready_for_manual_portfolio_scaling_review: 'Ready for a human scaling review',
  blocked_until_scaling_evidence_is_complete: 'Blocked until scaling evidence is complete'
};

const REVIEW_SECTIONS: ReviewConfig[] = [
  {
    key: 'execution_feedback_loop',
    title: 'Manual trial readiness',
    description: 'Checks whether an approved option, multiple objectives, visible tradeoffs, and at least two affected business areas exist before people collect trial feedback.',
    decisionKey: 'execution_feedback_decision',
    scoreKey: 'execution_feedback_score',
    checksKey: 'feedback_checks',
    blockersKey: 'feedback_blockers',
    metrics: [
      { label: 'Approved options', key: 'approved_manual_plan_option_count' },
      { label: 'Ranked options', key: 'ranked_option_count' },
      { label: 'Recorded outcomes', key: 'observed_result_count' },
      { label: 'High-impact tradeoffs', key: 'high_impact_tradeoff_count' },
      { label: 'Average projected score', key: 'average_option_score', format: 'percent' }
    ]
  },
  {
    key: 'trial_reconciliation',
    title: 'Actual trial outcome review',
    description: 'Checks whether a Learning Feedback outcome is linked to the approved option and contains a measured realized-value result.',
    decisionKey: 'reconciliation_decision',
    scoreKey: 'reconciliation_score',
    checksKey: 'reconciliation_checks',
    blockersKey: 'reconciliation_blockers',
    metrics: [
      { label: 'Approved options', key: 'approved_manual_plan_option_count' },
      { label: 'Linked outcomes', key: 'linked_outcome_count' },
      { label: 'Measured outcomes', key: 'measured_outcome_count' },
      { label: 'High-impact tradeoffs', key: 'high_impact_tradeoff_count' }
    ]
  },
  {
    key: 'promotion_guard',
    title: 'Reusable-pattern review',
    description: 'Checks whether actual confirmed value supports considering the option as a reusable planning pattern. It does not promote anything automatically.',
    decisionKey: 'promotion_decision',
    scoreKey: 'promotion_guard_score',
    checksKey: 'promotion_checks',
    blockersKey: 'promotion_blockers',
    metrics: [
      { label: 'Confirmed outcomes', key: 'confirmed_outcome_count' },
      { label: 'Adverse outcomes', key: 'adverse_outcome_count' },
      { label: 'Average realized value', key: 'average_realized_value_score', format: 'percent' },
      { label: 'High-risk tradeoffs', key: 'high_risk_tradeoff_count' }
    ]
  },
  {
    key: 'pattern_monitoring_plan',
    title: 'Pattern monitoring readiness',
    description: 'Checks whether confirmed actual outcomes and a complete cross-area scope exist before a reusable pattern is monitored over time.',
    decisionKey: 'monitoring_decision',
    scoreKey: 'monitoring_score',
    checksKey: 'monitoring_checks',
    blockersKey: 'monitoring_blockers',
    metrics: [
      { label: 'Confirmed outcomes', key: 'confirmed_outcome_count' },
      { label: 'Adverse outcomes', key: 'adverse_outcome_count' },
      { label: 'Average realized value', key: 'average_realized_value_score', format: 'percent' },
      { label: 'High-risk tradeoffs', key: 'high_risk_tradeoff_count' }
    ]
  },
  {
    key: 'drift_response_plan',
    title: 'Outcome drift response',
    description: 'Checks whether actual outcome history, active run scope, and governance paths exist for a person to review worsening results.',
    decisionKey: 'drift_response_decision',
    scoreKey: 'drift_response_score',
    checksKey: 'drift_response_checks',
    blockersKey: 'drift_response_blockers',
    metrics: [
      { label: 'Observed outcomes', key: 'observed_outcome_count' },
      { label: 'Adverse outcomes', key: 'adverse_outcome_count' },
      { label: 'Low-value outcomes', key: 'low_score_outcome_count' },
      { label: 'Active runs', key: 'active_manual_run_count' }
    ]
  },
  {
    key: 'pattern_lifecycle_review',
    title: 'Pattern lifecycle review',
    description: 'Combines monitoring, drift, actual outcomes, and cross-area evidence before a person decides whether to continue, recalibrate, or retire a pattern.',
    decisionKey: 'lifecycle_decision',
    scoreKey: 'lifecycle_score',
    checksKey: 'lifecycle_checks',
    blockersKey: 'lifecycle_blockers',
    metrics: [
      { label: 'Confirmed outcomes', key: 'confirmed_outcome_count' },
      { label: 'Strong outcomes', key: 'strong_pattern_candidate_count' },
      { label: 'Weak or adverse outcomes', key: 'weak_pattern_candidate_count' },
      { label: 'Active reviewed runs', key: 'active_manual_run_count' }
    ]
  },
  {
    key: 'portfolio_scaling_guard',
    title: 'Cross-area scaling review',
    description: 'Checks whether strong confirmed results, a clear governance queue, resolved tradeoffs, and a ready monitoring plan exist before people consider wider use.',
    decisionKey: 'portfolio_scaling_decision',
    scoreKey: 'portfolio_scaling_score',
    checksKey: 'portfolio_scaling_checks',
    blockersKey: 'portfolio_scaling_blockers',
    metrics: [
      { label: 'Confirmed outcomes', key: 'confirmed_outcome_count' },
      { label: 'Strong outcomes', key: 'strong_pattern_candidate_count' },
      { label: 'Scalable candidates', key: 'scalable_pattern_candidate_count' },
      { label: 'Governance queue', key: 'governance_queue_count' },
      { label: 'High-risk tradeoffs', key: 'high_risk_tradeoff_count' }
    ]
  }
];

function formatLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value);
  if (DECISION_LABELS[raw]) return DECISION_LABELS[raw];
  if (raw.includes(' ') || /[.!?]/.test(raw)) return raw;
  return raw.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatNumber(value: unknown, maximumFractionDigits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(numeric);
}

function formatPercentage(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const percentage = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(percentage)}%`;
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatBoolean(value: unknown): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

function formatMetric(value: unknown, format: ReviewConfig['metrics'][number]['format'] = 'number'): string {
  if (format === 'percent') return formatPercentage(value);
  if (format === 'boolean') return formatBoolean(value);
  return formatNumber(value, 2);
}

function badgeTone(value: unknown): 'neutral' | 'good' | 'warning' | 'danger' {
  const normalized = String(value || '').toLowerCase();
  if (['ready', 'passed', 'value_confirmed', 'approved_for_manual_planning'].includes(normalized)) return 'good';
  if (['blocked', 'critical', 'high', 'value_missed', 'tradeoff_drift_detected', 'rejected'].includes(normalized)) return 'danger';
  if (['monitor', 'review_required', 'governance_review_required', 'tradeoff_review', 'mixed', 'medium'].includes(normalized)) return 'warning';
  return 'neutral';
}

function StatusBadge({ value, tone }: { value: unknown; tone?: ReturnType<typeof badgeTone> }) {
  const resolvedTone = tone || badgeTone(value);
  return <span className={`forecast-badge forecast-badge--${resolvedTone}`}>{formatLabel(value)}</span>;
}

function MetricCard({ label, value, format = 'number' }: { label: string; value: unknown; format?: ReviewConfig['metrics'][number]['format'] }) {
  return (
    <div className="forecast-metric">
      <span className="forecast-metric__label">{label}</span>
      <strong className="forecast-metric__value">{formatMetric(value, format)}</strong>
    </div>
  );
}

function EvidenceSection({
  title,
  description,
  rows,
  headers,
  renderRow
}: {
  title: string;
  description: string;
  rows: Array<Record<string, unknown>>;
  headers: string[];
  renderRow: (row: Record<string, unknown>, index: number) => ReactNode;
}) {
  return (
    <section className="card forecast-evidence-section">
      <div className="card__header">
        <div>
          <h2>{title}</h2>
          <p className="card__subtext">{description}</p>
        </div>
        <StatusBadge value={`${rows.length} returned`} />
      </div>
      {!rows.length ? (
        <p className="forecast-muted">No matching records were returned.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table forecast-table">
            <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CheckColumn({ title, items }: { title: string; items: Array<Record<string, unknown>> }) {
  return (
    <section className="forecast-check-card">
      <h3>{title}</h3>
      {!items.length ? (
        <p className="forecast-muted">No items were returned for this section.</p>
      ) : (
        <div className="forecast-check-list">
          {items.map((item, index) => {
            const status = item.check_status ?? item.severity;
            const heading = item.check_label ?? item.blocker_label ?? `Item ${index + 1}`;
            const resolution = item.manual_resolution;
            const observed = item.current_value;
            const required = item.required_value;
            return (
              <article className="forecast-check-item" key={`${String(heading)}-${index}`}>
                <div className="forecast-check-item__heading">
                  <strong>{formatLabel(heading)}</strong>
                  {status !== undefined ? <StatusBadge value={status} /> : null}
                </div>
                {resolution ? <p>{formatLabel(resolution)}</p> : null}
                {observed !== undefined && observed !== null ? (
                  <span className="forecast-observed">Observed: {formatLabel(observed)}{required !== undefined && required !== null ? ` · Needed: ${formatLabel(required)}` : ''}</span>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewCard({ config, section }: { config: ReviewConfig; section?: OptimizationReviewSection }) {
  const available = section?.assessment_available !== false;
  const checks = (section?.[config.checksKey] || []) as Array<Record<string, unknown>>;
  const blockers = (section?.[config.blockersKey] || []) as Array<Record<string, unknown>>;

  return (
    <section className="card forecast-lifecycle">
      <div className="forecast-lifecycle__header">
        <div>
          <h2>{config.title}</h2>
          <p className="card__subtext">{config.description}</p>
        </div>
        <div className="forecast-decision">
          <span>Current result</span>
          <strong>{available ? formatLabel(section?.[config.decisionKey]) : 'Not assessed — no matching evidence'}</strong>
        </div>
      </div>

      {available ? (
        <>
          <div className="forecast-metrics">
            <MetricCard label="Review score" value={section?.[config.scoreKey]} />
            {config.metrics.map((metric) => (
              <MetricCard key={metric.key} label={metric.label} value={section?.[metric.key]} format={metric.format} />
            ))}
          </div>
          <div className="forecast-check-grid">
            <CheckColumn title="Checks" items={checks} />
            <CheckColumn title="Items needing attention" items={blockers} />
          </div>
        </>
      ) : (
        <div className="forecast-not-assessed">
          This review is not calculated until matching optimization planning evidence or an actual optimization outcome exists.
        </div>
      )}
    </section>
  );
}

export default function CrossDomainOptimizationPage() {
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const [view, setView] = useState<OptimizationView>('evidence');
  const [filters, setFilters] = useState<OptimizationFilterState>(DEFAULT_FILTERS);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['cross-domain-optimization-summary', queryString],
    queryFn: () => apiRequest<OptimizationSummary>(`/decision-intelligence/cross-domain-optimization-summary?${queryString}`)
  });

  const updateFilter = (key: keyof OptimizationFilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const runCount = data?.governance?.optimization_run_count ?? data?.optimization_runs?.length ?? 0;
  const objectiveCount = data?.governance?.objective_count ?? data?.objectives?.length ?? 0;
  const optionCount = data?.governance?.option_count ?? data?.options?.length ?? 0;
  const tradeoffCount = data?.governance?.tradeoff_count ?? data?.tradeoffs?.length ?? 0;
  const resultCount = data?.governance?.optimization_result_count ?? data?.optimization_results?.length ?? 0;
  const evidenceCount = runCount + objectiveCount + optionCount + tradeoffCount + resultCount;
  const hasEvidence = data?.governance?.evidence_available ?? evidenceCount > 0;
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Not refreshed yet';

  if (isLoading) {
    return (
      <main className="decision-intelligence-page">
        <section className="card"><p>Loading cross-area optimization evidence…</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page">
        <section className="card card--danger">
          <h2>Cross-area optimization evidence could not be loaded</h2>
          <p>Check your Decision Intelligence access and try the read-only request again.</p>
          <button className="button" type="button" onClick={() => void refetch()} disabled={isFetching}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="decision-intelligence-page">
      <section className="card forecast-intro">
        <div>
          <span className="eyebrow">Read-only cross-area planning review</span>
          <h2>Compare planning options, tradeoffs, and actual trial outcomes across business areas</h2>
          <p className="card__subtext">
            This page shows stored optimization runs, business objectives, proposed options, tradeoffs, and outcomes recorded through Learning Feedback. It helps people decide whether a manual trial has enough evidence for further review. It does not create options, approve plans, change objective weights, apply a plan, or scale a pattern automatically.
          </p>
        </div>
        <div className="forecast-refresh">
          <button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh evidence'}
          </button>
          <span>Last refreshed: {lastRefreshed}</span>
        </div>
      </section>

      <section className="card forecast-filters" aria-label="Cross-domain optimization filters">
        <div className="card__header">
          <div>
            <h2>Filter the evidence</h2>
            <p className="card__subtext">Planning filters apply consistently to runs and their related objectives, options, and tradeoffs. Outcome status filters the recorded Learning Feedback results.</p>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={!hasActiveFilters}>Clear filters</button>
        </div>
        <div className="forecast-filter-grid">
          <label>
            <span className="form-label">Business area</span>
            <select className="input" value={filters.optimization_domain} onChange={(event) => updateFilter('optimization_domain', event.target.value)}>
              <option value="">All areas</option>
              {OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Run status</span>
            <select className="input" value={filters.optimization_status} onChange={(event) => updateFilter('optimization_status', event.target.value)}>
              <option value="">All run statuses</option>
              {OPTIMIZATION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Objective type</span>
            <select className="input" value={filters.objective_type} onChange={(event) => updateFilter('objective_type', event.target.value)}>
              <option value="">All objective types</option>
              {OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Option status</span>
            <select className="input" value={filters.option_status} onChange={(event) => updateFilter('option_status', event.target.value)}>
              <option value="">All option statuses</option>
              {OPTION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Tradeoff direction</span>
            <select className="input" value={filters.impact_direction} onChange={(event) => updateFilter('impact_direction', event.target.value)}>
              <option value="">All directions</option>
              {IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Recorded outcome status</span>
            <select className="input" value={filters.result_status} onChange={(event) => updateFilter('result_status', event.target.value)}>
              <option value="">All outcome statuses</option>
              {RESULT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Maximum records per evidence list</span>
            <select className="input" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>
              {['25', '50', '100', '200'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="forecast-view-switch" role="tablist" aria-label="Cross-domain optimization page views">
        <button className={`forecast-view-switch__button ${view === 'evidence' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'evidence'} onClick={() => setView('evidence')}>Optimization evidence</button>
        <button className={`forecast-view-switch__button ${view === 'readiness' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'readiness'} onClick={() => setView('readiness')}>Review checks</button>
        {canViewDiagnostics ? (
          <button className={`forecast-view-switch__button ${view === 'diagnostics' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'diagnostics'} onClick={() => setView('diagnostics')}>Diagnostics</button>
        ) : null}
      </div>

      <section className="forecast-summary-grid" aria-label="Cross-domain optimization evidence summary">
        <MetricCard label="Runs" value={runCount} />
        <MetricCard label="Objectives" value={objectiveCount} />
        <MetricCard label="Options" value={optionCount} />
        <MetricCard label="Tradeoffs" value={tradeoffCount} />
        <MetricCard label="Recorded outcomes" value={resultCount} />
        <MetricCard label="Confirmed outcomes" value={data?.governance?.confirmed_result_count} />
        <MetricCard label="Adverse outcomes" value={data?.governance?.adverse_result_count} />
        <div className="forecast-metric forecast-metric--wide">
          <span className="forecast-metric__label">Current posture</span>
          <strong className="forecast-metric__value forecast-metric__value--text">{formatLabel(data?.governance?.cross_domain_optimization_posture)}</strong>
        </div>
      </section>

      {!hasEvidence ? (
        <section className="card forecast-empty-state">
          <h2>No cross-area optimization evidence is available for this tenant and filter set</h2>
          <p>Review scores are not assessed when no run, objective, option, tradeoff, or recorded outcome exists. Zero records do not mean that a plan is safe, valuable, approved, ready to scale, or free from tradeoffs.</p>
          <p>This page has no plan-creation or outcome-recording action. Planning evidence must come from the supported optimization data process, and actual outcomes must be recorded through Learning Feedback.</p>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="forecast-limit-note">Each list shows up to {filters.limit} matching records. Review checks use the same filtered evidence.</p>
          <EvidenceSection
            title="Optimization runs"
            description="Stored cross-area planning exercises and their current human-review status."
            rows={(data?.optimization_runs || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Business area', 'Status', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const run = row as OptimizationRun;
              return (
                <tr key={`run-${index}`}>
                  <td><strong>{run.optimization_label || run.title || `Planning run ${index + 1}`}</strong>{run.summary ? <span className="forecast-table__subtext">{run.summary}</span> : null}</td>
                  <td>{formatLabel(run.optimization_domain)}</td>
                  <td><StatusBadge value={run.optimization_status} /></td>
                  <td>{formatPercentage(run.confidence_score)}</td>
                  <td>{formatDate(run.updated_at || run.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Business objectives"
            description="The goals and relative weights used to compare options, such as service risk, working capital, labor cost, or supplier reliability."
            rows={(data?.objectives || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Objective', 'Business area', 'Direction', 'Weight', 'Confidence', 'Recorded']}
            renderRow={(row, index) => {
              const objective = row as OptimizationObjective;
              return (
                <tr key={`objective-${index}`}>
                  <td>{objective.optimization_label || 'Linked planning run'}</td>
                  <td><strong>{formatLabel(objective.objective_type)}</strong></td>
                  <td>{formatLabel(objective.objective_domain)}</td>
                  <td>{formatLabel(objective.target_direction)}</td>
                  <td>{formatNumber(objective.weight, 4)}</td>
                  <td>{formatPercentage(objective.confidence_score)}</td>
                  <td>{formatDate(objective.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Planning options"
            description="Proposed choices created for comparison. Projected scores are planning estimates, not proof of actual business value."
            rows={(data?.options || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Option', 'Status', 'Projected score', 'Confidence', 'Recorded']}
            renderRow={(row, index) => {
              const option = row as OptimizationOption;
              return (
                <tr key={`option-${index}`}>
                  <td>{option.optimization_label || 'Linked planning run'}</td>
                  <td><strong>{option.option_label || option.title || `Planning option ${index + 1}`}</strong>{option.summary ? <span className="forecast-table__subtext">{option.summary}</span> : null}</td>
                  <td><StatusBadge value={option.option_status} /></td>
                  <td>{formatPercentage(option.aggregate_score)}</td>
                  <td>{formatPercentage(option.confidence_score)}</td>
                  <td>{formatDate(option.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Tradeoffs"
            description="Expected positive, negative, neutral, or mixed effects attached to a planning option."
            rows={(data?.tradeoffs || []) as Array<Record<string, unknown>>}
            headers={['Option', 'Objective', 'Business area', 'Direction', 'Impact', 'Confidence', 'Recorded']}
            renderRow={(row, index) => {
              const tradeoff = row as OptimizationTradeoff;
              return (
                <tr key={`tradeoff-${index}`}>
                  <td>{tradeoff.option_label || 'Linked planning option'}</td>
                  <td><strong>{formatLabel(tradeoff.objective_type)}</strong></td>
                  <td>{formatLabel(tradeoff.tradeoff_domain)}</td>
                  <td><StatusBadge value={tradeoff.impact_direction} /></td>
                  <td>{formatPercentage(tradeoff.impact_score)}</td>
                  <td>{formatPercentage(tradeoff.confidence_score)}</td>
                  <td>{formatDate(tradeoff.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Actual optimization outcomes"
            description="Observed results recorded through Learning Feedback. These records provide the actual evidence used for trial reconciliation, drift, lifecycle, and scaling checks."
            rows={(data?.optimization_results || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Option', 'Outcome', 'Business area', 'Realized value', 'Observed']}
            renderRow={(row, index) => {
              const result = row as OptimizationResult;
              return (
                <tr key={`result-${index}`}>
                  <td>{result.optimization_label || 'Linked planning run'}</td>
                  <td>{result.option_label || 'No option reference'}</td>
                  <td><StatusBadge value={result.result_status} /></td>
                  <td>{formatLabel(result.result_domain)}</td>
                  <td>{formatPercentage(result.realized_value_score)}</td>
                  <td>{formatDate(result.observed_at)}</td>
                </tr>
              );
            }}
          />
        </>
      ) : null}

      {view === 'readiness' ? (
        hasEvidence ? (
          <>
            <section className="card forecast-readiness-note">
              <h2>These are advisory checks, not approvals or automated actions</h2>
              <p className="card__subtext">A passing check only means that the returned records satisfy that specific calculation. It does not approve a plan, apply an option, change objective weights, promote a pattern, start monitoring, retire anything, or scale a plan to another business area.</p>
            </section>
            {REVIEW_SECTIONS.map((config) => (
              <ReviewCard key={String(config.key)} config={config} section={data?.[config.key] as OptimizationReviewSection | undefined} />
            ))}
          </>
        ) : (
          <section className="card forecast-not-assessed-card">
            <h2>Review checks are not assessed</h2>
            <p>At least one matching optimization planning record or actual outcome is required before these calculations can produce a meaningful result.</p>
          </section>
        )
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card forecast-diagnostics">
          <div className="card__header">
            <div>
              <h2>Technical response diagnostics</h2>
              <p className="card__subtext">Restricted implementation information for users with tenant diagnostics permission.</p>
            </div>
          </div>
          <details className="forecast-technical-details">
            <summary>View restricted response details</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
