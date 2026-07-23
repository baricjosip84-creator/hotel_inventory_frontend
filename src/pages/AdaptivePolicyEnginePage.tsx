import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './decisionIntelligencePages.css';

type AdaptivePolicyView = 'evidence' | 'readiness' | 'diagnostics';

type AdaptivePolicyFilters = {
  policy_domain: string;
  policy_type: string;
  policy_status: string;
  recommendation_type: string;
  limit: string;
};

type CheckItem = {
  check_id?: string;
  label?: string;
  passed?: boolean;
  observed_count?: number;
  required_next_step?: string;
  [key: string]: unknown;
};

type BlockerItem = {
  blocker_id?: string;
  severity?: string;
  summary?: string;
  [key: string]: unknown;
};

type LifecycleSection = {
  ready_check_count?: number;
  blocked_check_count?: number;
  [key: string]: unknown;
};

type AdaptivePolicyRecord = {
  policy_key?: string;
  title?: string;
  summary?: string;
  policy_domain?: string;
  policy_type?: string;
  policy_status?: string;
  confidence_score?: number | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type PolicySignalRecord = {
  policy_key?: string;
  signal_domain?: string;
  signal_type?: string;
  variance_score?: number | string | null;
  weight?: number | string | null;
  confidence_score?: number | string | null;
  observed_at?: string;
  [key: string]: unknown;
};

type PolicyRecommendationRecord = {
  policy_key?: string;
  recommendation_key?: string;
  recommendation_status?: string;
  recommendation_type?: string;
  explanation_summary?: string;
  confidence_score?: number | string | null;
  risk_level?: string;
  approval_requirement?: string;
  created_at?: string;
  [key: string]: unknown;
};

type PolicyEffectivenessRecord = {
  policy_key?: string;
  measurement_key?: string;
  measurement_type?: string;
  baseline_score?: number | string | null;
  observed_score?: number | string | null;
  delta_score?: number | string | null;
  confidence_score?: number | string | null;
  measured_at?: string;
  [key: string]: unknown;
};

type AdaptivePolicySummary = {
  filters?: Partial<AdaptivePolicyFilters> & { limit?: number };
  governance?: {
    policy_count?: number;
    signal_count?: number;
    recommendation_count?: number;
    effectiveness_measurement_count?: number;
    recommendation_ready_policy_count?: number;
    review_required_policy_count?: number;
    manual_application_approved_policy_count?: number;
    review_required_recommendation_count?: number;
    high_risk_recommendation_count?: number;
    observed_domains?: string[];
    adaptive_policy_posture?: string;
    [key: string]: unknown;
  };
  policies?: AdaptivePolicyRecord[];
  signals?: PolicySignalRecord[];
  recommendations?: PolicyRecommendationRecord[];
  effectiveness?: PolicyEffectivenessRecord[];
  learning_feedback_loop?: LifecycleSection;
  outcome_reconciliation?: LifecycleSection;
  promotion_guard?: LifecycleSection;
  post_promotion_monitoring?: LifecycleSection;
  rollback_retirement_gate?: LifecycleSection;
  response_contract_audit?: LifecycleSection;
  supported_definitions?: unknown;
  [key: string]: unknown;
};

type LifecycleConfig = {
  key: keyof AdaptivePolicySummary;
  title: string;
  description: string;
  decisionKey: string;
  scoreKey: string;
  blockersKey: string;
  checksKey: string;
  metrics: Array<{ label: string; key: string; format?: 'number' | 'percent' | 'delta' }>;
};

const DEFAULT_FILTERS: AdaptivePolicyFilters = {
  policy_domain: '',
  policy_type: '',
  policy_status: '',
  recommendation_type: '',
  limit: '25'
};

const POLICY_DOMAINS = [
  'inventory',
  'procurement',
  'reservation',
  'execution',
  'optimization',
  'control_tower',
  'financial',
  'integration',
  'system'
];

const POLICY_TYPES = [
  'dynamic_replenishment',
  'adaptive_reservation',
  'sla_cost_balance',
  'labor_allocation',
  'supplier_selection',
  'facility_balancing',
  'working_capital_control',
  'integration_throttle',
  'general'
];

const POLICY_STATUSES = [
  'draft',
  'observing',
  'recommendation_ready',
  'review_required',
  'approved_for_manual_application',
  'rejected',
  'retired'
];

const RECOMMENDATION_TYPES = [
  'tuning_adjustment',
  'threshold_adjustment',
  'objective_reweighting',
  'guardrail_tightening',
  'guardrail_relaxation',
  'policy_retirement',
  'general'
];

const DECISION_LABELS: Record<string, string> = {
  not_assessed_no_policy_evidence: 'Not assessed — no policy evidence',
  learning_review_required_before_policy_tuning: 'Learning review required before tuning',
  ready_for_governed_manual_policy_tuning_review: 'Ready for governed manual tuning review',
  outcome_reconciliation_required_before_policy_promotion: 'Outcome evidence must be reconciled before promotion',
  ready_for_governed_policy_promotion_review: 'Ready for governed promotion review',
  promotion_blocked_pending_governance_and_evidence: 'Promotion blocked pending evidence or approval',
  ready_for_manual_policy_promotion_review: 'Ready for manual promotion review',
  monitoring_or_drift_review_required: 'Monitoring or drift review required',
  ready_for_manual_policy_stability_review: 'Ready for manual stability review',
  rollback_or_retirement_review_required: 'Rollback or retirement review required',
  ready_for_manual_policy_lifecycle_clearance: 'Ready for manual lifecycle clearance',
  no_policy_evidence_available: 'No policy evidence available',
  policy_governance_review_required: 'Governance review required',
  controlled_policy_observation: 'Controlled policy observation'
};

const LIFECYCLE_SECTIONS: LifecycleConfig[] = [
  {
    key: 'learning_feedback_loop',
    title: 'Learning readiness',
    description: 'Checks whether policies have enough signals, measured results, and human review evidence to support a tuning discussion.',
    decisionKey: 'learning_feedback_decision',
    scoreKey: 'learning_feedback_score',
    blockersKey: 'feedback_blockers',
    checksKey: 'feedback_checks',
    metrics: [
      { label: 'Policies', key: 'policy_count' },
      { label: 'Signals', key: 'signal_count' },
      { label: 'Recommendations', key: 'recommendation_count' },
      { label: 'Measurements', key: 'effectiveness_measurement_count' },
      { label: 'Average confidence', key: 'average_confidence_score', format: 'percent' },
      { label: 'Average measured change', key: 'average_effectiveness_delta', format: 'delta' }
    ]
  },
  {
    key: 'outcome_reconciliation',
    title: 'Outcome reconciliation',
    description: 'Checks whether approved or recommended policy changes can be traced to measured business outcomes.',
    decisionKey: 'outcome_reconciliation_decision',
    scoreKey: 'outcome_reconciliation_score',
    blockersKey: 'reconciliation_blockers',
    checksKey: 'reconciliation_checks',
    metrics: [
      { label: 'Reconciled policies', key: 'reconciled_policy_count' },
      { label: 'Positive outcomes', key: 'positive_outcome_count' },
      { label: 'Neutral outcomes', key: 'neutral_outcome_count' },
      { label: 'Negative outcomes', key: 'negative_outcome_count' },
      { label: 'Low-confidence outcomes', key: 'low_confidence_outcome_count' },
      { label: 'Average outcome confidence', key: 'average_outcome_confidence', format: 'percent' }
    ]
  },
  {
    key: 'promotion_guard',
    title: 'Promotion safety review',
    description: 'Checks whether a policy pattern has enough signal, outcome, approval, and rollback evidence before wider manual reuse.',
    decisionKey: 'promotion_decision',
    scoreKey: 'promotion_score',
    blockersKey: 'promotion_blockers',
    checksKey: 'promotion_checks',
    metrics: [
      { label: 'Promotion candidates', key: 'promotion_candidate_count' },
      { label: 'High-risk candidates', key: 'high_risk_promotion_candidate_count' },
      { label: 'Evidence-covered policies', key: 'promotion_evidence_policy_count' },
      { label: 'Positive outcomes', key: 'positive_outcome_count' },
      { label: 'Negative outcomes', key: 'negative_outcome_count' },
      { label: 'Average candidate confidence', key: 'average_promotion_confidence', format: 'percent' }
    ]
  },
  {
    key: 'post_promotion_monitoring',
    title: 'Post-promotion monitoring',
    description: 'Checks whether manually approved policies remain measured and connected to monitoring signals after approval.',
    decisionKey: 'monitoring_decision',
    scoreKey: 'monitoring_score',
    blockersKey: 'monitoring_blockers',
    checksKey: 'monitoring_checks',
    metrics: [
      { label: 'Approved policies', key: 'approved_policy_count' },
      { label: 'Measured approved policies', key: 'approved_policy_measurement_count' },
      { label: 'Signal-monitored policies', key: 'approved_policy_signal_count' },
      { label: 'Unmeasured approved policies', key: 'stale_or_unmeasured_approved_policy_count' },
      { label: 'Severe negative outcomes', key: 'severe_negative_outcome_count' },
      { label: 'Average outcome confidence', key: 'average_outcome_confidence', format: 'percent' }
    ]
  },
  {
    key: 'rollback_retirement_gate',
    title: 'Rollback and retirement review',
    description: 'Checks whether negative results, retired policies, and high-risk recommendations have enough evidence for a manual lifecycle decision.',
    decisionKey: 'rollback_retirement_decision',
    scoreKey: 'rollback_retirement_score',
    blockersKey: 'rollback_retirement_blockers',
    checksKey: 'rollback_retirement_checks',
    metrics: [
      { label: 'Approved negative policies', key: 'approved_policy_with_negative_evidence_count' },
      { label: 'Severe negative policies', key: 'approved_policy_with_severe_negative_evidence_count' },
      { label: 'Retired policies with evidence', key: 'retired_policy_with_evidence_count' },
      { label: 'Low-confidence outcomes', key: 'low_confidence_outcome_count' },
      { label: 'High-risk recommendations', key: 'high_risk_recommendation_count' },
      { label: 'Average measured change', key: 'average_effectiveness_delta', format: 'delta' }
    ]
  }
];

function formatLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not reported';
  const text = String(value);
  if (DECISION_LABELS[text]) return DECISION_LABELS[text];
  if (!/[_-]/.test(text)) {
    return text.includes(' ') ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Intl.NumberFormat().format(numeric) : String(value);
}

function formatPercentage(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : String(value);
}

function formatStoredConfidence(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const percentage = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
  return `${Math.round(percentage)}%`;
}

function formatDelta(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toLocaleString()}`;
}

function formatDate(value: unknown): string {
  if (!value) return '—';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

function metricValue(value: unknown, format?: 'number' | 'percent' | 'delta'): string {
  if (format === 'percent') return formatPercentage(value);
  if (format === 'delta') return formatDelta(value);
  return formatNumber(value);
}

function StatusBadge({ value, tone }: { value: unknown; tone?: 'good' | 'warning' | 'danger' | 'neutral' }) {
  return <span className={`adaptive-policy-badge adaptive-policy-badge--${tone || 'neutral'}`}>{formatLabel(value)}</span>;
}

function MetricCard({ label, value, format }: { label: string; value: unknown; format?: 'number' | 'percent' | 'delta' }) {
  return (
    <div className="adaptive-policy-metric">
      <span className="adaptive-policy-metric__label">{label}</span>
      <strong className="adaptive-policy-metric__value">{metricValue(value, format)}</strong>
    </div>
  );
}

function CheckList({ title, items, kind }: { title: string; items: CheckItem[] | BlockerItem[]; kind: 'checks' | 'blockers' }) {
  return (
    <section className="adaptive-policy-check-card">
      <h3>{title}</h3>
      {!items.length ? (
        <p className="adaptive-policy-muted">No items require attention in this section.</p>
      ) : (
        <div className="adaptive-policy-check-list">
          {items.map((item, index) => {
            const check = item as CheckItem;
            const blocker = item as BlockerItem;
            const passed = check.passed;
            return (
              <article className="adaptive-policy-check-item" key={`${title}-${check.check_id || blocker.blocker_id || index}`}>
                <div className="adaptive-policy-check-item__heading">
                  <strong>{check.label ? formatLabel(check.label) : blocker.summary || 'Review item'}</strong>
                  {kind === 'checks' ? (
                    <StatusBadge value={passed ? 'Passed' : 'Needs attention'} tone={passed ? 'good' : 'warning'} />
                  ) : (
                    <StatusBadge value={blocker.severity || 'Review'} tone={blocker.severity === 'high' ? 'danger' : 'warning'} />
                  )}
                </div>
                {kind === 'checks' && check.required_next_step ? <p>{check.required_next_step}</p> : null}
                {kind === 'blockers' && blocker.summary ? <p>{blocker.summary}</p> : null}
                {kind === 'checks' && check.observed_count !== undefined ? (
                  <span className="adaptive-policy-observed">Evidence records counted: {formatNumber(check.observed_count)}</span>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LifecycleCard({ config, section }: { config: LifecycleConfig; section?: LifecycleSection }) {
  const score = section?.[config.scoreKey];
  const decision = section?.[config.decisionKey];
  const blockers = (section?.[config.blockersKey] as BlockerItem[] | undefined) || [];
  const checks = (section?.[config.checksKey] as CheckItem[] | undefined) || [];

  return (
    <section className="card adaptive-policy-lifecycle">
      <div className="adaptive-policy-lifecycle__header">
        <div>
          <h2>{config.title}</h2>
          <p className="card__subtext">{config.description}</p>
        </div>
        <div className="adaptive-policy-decision">
          <span>Current assessment</span>
          <strong>{formatLabel(decision)}</strong>
        </div>
      </div>

      <div className="adaptive-policy-metrics">
        <MetricCard label="Readiness score" value={score === null ? null : score} format={score === null ? undefined : 'number'} />
        <MetricCard label="Passed checks" value={section?.ready_check_count} />
        <MetricCard label="Checks needing attention" value={section?.blocked_check_count} />
        {config.metrics.map((metric) => (
          <MetricCard key={metric.key} label={metric.label} value={section?.[metric.key]} format={metric.format} />
        ))}
      </div>

      <div className="adaptive-policy-check-grid">
        <CheckList title="What needs attention" items={blockers} kind="blockers" />
        <CheckList title="Evidence checks" items={checks} kind="checks" />
      </div>
    </section>
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
    <section className="card adaptive-policy-evidence-section">
      <div className="card__header">
        <div>
          <h2>{title}</h2>
          <p className="card__subtext">{description}</p>
        </div>
        <StatusBadge value={`${rows.length} returned`} />
      </div>
      {!rows.length ? (
        <p className="adaptive-policy-muted">No matching records were returned.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table adaptive-policy-table">
            <thead>
              <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdaptivePolicyEnginePage() {
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const [view, setView] = useState<AdaptivePolicyView>('evidence');
  const [filters, setFilters] = useState<AdaptivePolicyFilters>(DEFAULT_FILTERS);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['adaptive-policy-engine-summary', queryString],
    queryFn: () => apiRequest<AdaptivePolicySummary>(`/decision-intelligence/adaptive-policy-engine-summary?${queryString}`)
  });

  const policyCount = data?.governance?.policy_count ?? data?.policies?.length ?? 0;
  const signalCount = data?.governance?.signal_count ?? data?.signals?.length ?? 0;
  const recommendationCount = data?.governance?.recommendation_count ?? data?.recommendations?.length ?? 0;
  const measurementCount = data?.governance?.effectiveness_measurement_count ?? data?.effectiveness?.length ?? 0;
  const evidenceCount = policyCount + signalCount + recommendationCount + measurementCount;
  const hasEvidence = evidenceCount > 0;
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Not refreshed yet';

  const updateFilter = (key: keyof AdaptivePolicyFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (isLoading) {
    return (
      <main className="decision-intelligence-page adaptive-policy-page">
        <section className="card"><p>Loading adaptive policy evidence…</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page adaptive-policy-page">
        <section className="card card--danger">
          <h2>Adaptive policy evidence could not be loaded</h2>
          <p>Check your Decision Intelligence access and try the read-only request again.</p>
          <button className="button" type="button" onClick={() => void refetch()}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="decision-intelligence-page adaptive-policy-page">
      <section className="card adaptive-policy-intro">
        <div>
          <span className="eyebrow">Read-only policy review</span>
          <h2>Understand how policy ideas are performing before people reuse or change them</h2>
          <p className="card__subtext">
            This page brings together policy records, observed signals, recommendations, and measured outcomes. It does not create,
            approve, apply, promote, roll back, or retire policies.
          </p>
        </div>
        <div className="adaptive-policy-refresh">
          <button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh evidence'}
          </button>
          <span>Last refreshed: {lastRefreshed}</span>
        </div>
      </section>

      <section className="card adaptive-policy-filters" aria-label="Adaptive policy filters">
        <div className="card__header">
          <div>
            <h2>Filter the evidence</h2>
            <p className="card__subtext">Filters apply consistently to policies and their related signals, recommendations, and measurements.</p>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)}>
            Clear filters
          </button>
        </div>
        <div className="adaptive-policy-filter-grid">
          <label>
            <span className="form-label">Business area</span>
            <select className="input" value={filters.policy_domain} onChange={(event) => updateFilter('policy_domain', event.target.value)}>
              <option value="">All areas</option>
              {POLICY_DOMAINS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Policy type</span>
            <select className="input" value={filters.policy_type} onChange={(event) => updateFilter('policy_type', event.target.value)}>
              <option value="">All policy types</option>
              {POLICY_TYPES.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Policy status</span>
            <select className="input" value={filters.policy_status} onChange={(event) => updateFilter('policy_status', event.target.value)}>
              <option value="">All policy statuses</option>
              {POLICY_STATUSES.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Recommendation type</span>
            <select className="input" value={filters.recommendation_type} onChange={(event) => updateFilter('recommendation_type', event.target.value)}>
              <option value="">All recommendation types</option>
              {RECOMMENDATION_TYPES.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
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

      <div className="adaptive-policy-view-switch" role="tablist" aria-label="Adaptive policy page views">
        <button className={`adaptive-policy-view-switch__button ${view === 'evidence' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'evidence'} onClick={() => setView('evidence')}>
          Policy evidence
        </button>
        <button className={`adaptive-policy-view-switch__button ${view === 'readiness' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'readiness'} onClick={() => setView('readiness')}>
          Readiness checks
        </button>
        {canViewDiagnostics ? (
          <button className={`adaptive-policy-view-switch__button ${view === 'diagnostics' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'diagnostics'} onClick={() => setView('diagnostics')}>
            Diagnostics
          </button>
        ) : null}
      </div>

      <section className="adaptive-policy-summary-grid" aria-label="Adaptive policy evidence summary">
        <MetricCard label="Policies" value={policyCount} />
        <MetricCard label="Signals" value={signalCount} />
        <MetricCard label="Recommendations" value={recommendationCount} />
        <MetricCard label="Measurements" value={measurementCount} />
        <div className="adaptive-policy-metric adaptive-policy-metric--wide">
          <span className="adaptive-policy-metric__label">Current posture</span>
          <strong className="adaptive-policy-metric__value adaptive-policy-metric__value--text">
            {formatLabel(data?.governance?.adaptive_policy_posture)}
          </strong>
        </div>
      </section>

      {!hasEvidence ? (
        <section className="card adaptive-policy-empty-state">
          <h2>No adaptive policy evidence is available for this tenant and filter set</h2>
          <p>
            Readiness is not assessed when there are no policy, signal, recommendation, or effectiveness records. Zero records do
            not mean that policies are safe, approved, or ready for promotion.
          </p>
          <p>
            This page has no policy-creation action. Evidence must first be produced through the supported Decision Intelligence
            data process before it can be reviewed here.
          </p>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="adaptive-policy-limit-note">
            Lists show up to {filters.limit} matching records in each evidence category. Readiness checks use the same filtered record set.
          </p>
          <EvidenceSection
            title="Policies"
            description="The policy ideas currently being observed or manually reviewed."
            rows={(data?.policies || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Area', 'Type', 'Status', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const policy = row as AdaptivePolicyRecord;
              return (
                <tr key={`${policy.policy_key || 'policy'}-${index}`}>
                  <td><strong>{policy.title || formatLabel(policy.policy_key)}</strong>{policy.summary ? <span className="adaptive-policy-table__subtext">{policy.summary}</span> : null}</td>
                  <td>{formatLabel(policy.policy_domain)}</td>
                  <td>{formatLabel(policy.policy_type)}</td>
                  <td><StatusBadge value={policy.policy_status} /></td>
                  <td>{formatStoredConfidence(policy.confidence_score)}</td>
                  <td>{formatDate(policy.updated_at || policy.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Observed signals"
            description="Measurements or indicators connected to the returned policies."
            rows={(data?.signals || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Area', 'Signal', 'Variance', 'Weight', 'Confidence', 'Observed']}
            renderRow={(row, index) => {
              const signal = row as PolicySignalRecord;
              return (
                <tr key={`${signal.policy_key || 'signal'}-${index}`}>
                  <td><strong>{formatLabel(signal.policy_key)}</strong></td>
                  <td>{formatLabel(signal.signal_domain)}</td>
                  <td>{formatLabel(signal.signal_type)}</td>
                  <td>{formatDelta(signal.variance_score)}</td>
                  <td>{formatNumber(signal.weight)}</td>
                  <td>{formatStoredConfidence(signal.confidence_score)}</td>
                  <td>{formatDate(signal.observed_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Policy recommendations"
            description="Advisory policy changes that still require human review and manual application."
            rows={(data?.recommendations || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Recommendation', 'Type', 'Status', 'Risk', 'Confidence', 'Created']}
            renderRow={(row, index) => {
              const recommendation = row as PolicyRecommendationRecord;
              return (
                <tr key={`${recommendation.recommendation_key || 'recommendation'}-${index}`}>
                  <td>{formatLabel(recommendation.policy_key)}</td>
                  <td><strong>{formatLabel(recommendation.recommendation_key)}</strong>{recommendation.explanation_summary ? <span className="adaptive-policy-table__subtext">{recommendation.explanation_summary}</span> : null}</td>
                  <td>{formatLabel(recommendation.recommendation_type)}</td>
                  <td><StatusBadge value={recommendation.recommendation_status} /></td>
                  <td><StatusBadge value={recommendation.risk_level} tone={['high', 'critical'].includes(String(recommendation.risk_level)) ? 'danger' : 'neutral'} /></td>
                  <td>{formatStoredConfidence(recommendation.confidence_score)}</td>
                  <td>{formatDate(recommendation.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Effectiveness measurements"
            description="Baseline and observed results used to understand whether a policy helped, harmed, or had no measured change."
            rows={(data?.effectiveness || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Measurement', 'Type', 'Baseline', 'Observed', 'Change', 'Confidence', 'Measured']}
            renderRow={(row, index) => {
              const measurement = row as PolicyEffectivenessRecord;
              return (
                <tr key={`${measurement.measurement_key || 'measurement'}-${index}`}>
                  <td>{formatLabel(measurement.policy_key)}</td>
                  <td><strong>{formatLabel(measurement.measurement_key)}</strong></td>
                  <td>{formatLabel(measurement.measurement_type)}</td>
                  <td>{formatNumber(measurement.baseline_score)}</td>
                  <td>{formatNumber(measurement.observed_score)}</td>
                  <td>{formatDelta(measurement.delta_score)}</td>
                  <td>{formatStoredConfidence(measurement.confidence_score)}</td>
                  <td>{formatDate(measurement.measured_at)}</td>
                </tr>
              );
            }}
          />
        </>
      ) : null}

      {view === 'readiness' ? (
        hasEvidence ? (
          <>
            <section className="card adaptive-policy-readiness-note">
              <h2>These checks support a human review; they are not approvals</h2>
              <p className="card__subtext">
                A passing check means the returned evidence satisfies that specific rule. It does not automatically approve,
                apply, promote, roll back, or retire a policy.
              </p>
            </section>
            {LIFECYCLE_SECTIONS.map((config) => (
              <LifecycleCard key={config.key} config={config} section={data?.[config.key] as LifecycleSection | undefined} />
            ))}
          </>
        ) : (
          <section className="card adaptive-policy-not-assessed">
            <h2>Readiness checks are not assessed</h2>
            <p>At least one adaptive policy evidence record is required before these checks can produce a meaningful result.</p>
          </section>
        )
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card adaptive-policy-diagnostics">
          <div className="card__header">
            <div>
              <h2>Technical response diagnostics</h2>
              <p className="card__subtext">Restricted implementation information for users with tenant diagnostics permission.</p>
            </div>
          </div>
          <div className="adaptive-policy-metrics">
            <MetricCard label="Contract score" value={data?.response_contract_audit?.contract_score} />
            <MetricCard label="Rendered panels" value={data?.response_contract_audit?.rendered_panel_count} />
            <MetricCard label="Expected response keys" value={data?.response_contract_audit?.expected_response_key_count} />
            <MetricCard label="Missing response keys" value={data?.response_contract_audit?.missing_response_key_count} />
          </div>
          <details className="adaptive-policy-technical-details">
            <summary>View restricted response details</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
