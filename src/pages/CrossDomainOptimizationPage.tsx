import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './decisionIntelligencePages.css';
import './CrossDomainOptimizationPage.css';

type OptimizationView = 'evidence' | 'readiness';

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


const CANONICAL_LABELS: Record<string, string> = {
  inventory: 'Inventory',
  procurement: 'Procurement',
  reservation: 'Reservation',
  execution: 'Execution',
  optimization: 'Optimization',
  control_tower: 'Control tower',
  financial: 'Financial',
  integration: 'Integration',
  multi_domain: 'Multi-domain',
  system: 'System',
  draft: 'Draft',
  candidate_generated: 'Candidate generated',
  tradeoff_review: 'Tradeoff review',
  governance_review_required: 'Governance review required',
  approved_for_manual_planning: 'Approved for manual planning',
  rejected: 'Rejected',
  archived: 'Archived',
  sla_risk: 'SLA risk',
  profitability: 'Profitability',
  labor_cost: 'Labor cost',
  carrying_cost: 'Carrying cost',
  supplier_reliability: 'Supplier reliability',
  working_capital: 'Working capital',
  facility_load: 'Facility load',
  integration_resilience: 'Integration resilience',
  general: 'General',
  minimize: 'Minimize',
  maximize: 'Maximize',
  balance: 'Balance',
  stabilize: 'Stabilize',
  generated: 'Generated',
  ranked: 'Ranked',
  superseded: 'Superseded',
  positive: 'Positive',
  negative: 'Negative',
  neutral: 'Neutral',
  mixed: 'Mixed',
  observed: 'Observed',
  value_confirmed: 'Value confirmed',
  value_missed: 'Value missed',
  tradeoff_drift_detected: 'Tradeoff drift detected',
  passed: 'Passed',
  blocked: 'Blocked',
  ready: 'Ready',
  monitor: 'Monitor',
  review_required: 'Review required',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low'
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
  if (raw.includes(' ') || /[.!?]/.test(raw)) return raw;
  return raw.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCanonicalLabel(value: unknown, ui: (englishText: string) => string): string {
  if (value === null || value === undefined || value === '') return ui('Not reported');
  const raw = String(value);
  const canonical = DECISION_LABELS[raw] ?? CANONICAL_LABELS[raw];
  return canonical ? ui(canonical) : formatLabel(value);
}

function formatNumber(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1], maximumFractionDigits = 2): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatLocalizedNumber(numeric, locale, { maximumFractionDigits }) : String(value);
}

function formatPercentage(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const percentage = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return `${formatLocalizedNumber(percentage, locale, { maximumFractionDigits: 1 })}%`;
}

function formatDate(value: unknown, locale: Parameters<typeof formatLocalizedDateTime>[1]): string {
  if (!value) return '—';
  return formatLocalizedDateTime(String(value), locale);
}

function formatBoolean(value: unknown, ui: (englishText: string) => string): string {
  if (value === true) return ui('Yes');
  if (value === false) return ui('No');
  return '—';
}

function formatMetric(value: unknown, format: ReviewConfig['metrics'][number]['format'], locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  if (format === 'percent') return formatPercentage(value, locale);
  if (format === 'boolean') return formatBoolean(value, ui);
  return formatNumber(value, locale, 2);
}

function formatObservedValue(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return formatLocalizedNumber(value, locale, { maximumFractionDigits: 4 });
  const numeric = typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? formatLocalizedNumber(numeric, locale, { maximumFractionDigits: 4 }) : String(value);
}

function badgeTone(value: unknown): 'neutral' | 'good' | 'warning' | 'danger' {
  const normalized = String(value || '').toLowerCase();
  if (['ready', 'passed', 'value_confirmed', 'approved_for_manual_planning'].includes(normalized)) return 'good';
  if (['blocked', 'critical', 'high', 'value_missed', 'tradeoff_drift_detected', 'rejected'].includes(normalized)) return 'danger';
  if (['monitor', 'review_required', 'governance_review_required', 'tradeoff_review', 'mixed', 'medium'].includes(normalized)) return 'warning';
  return 'neutral';
}

function StatusBadge({ value, tone }: { value: unknown; tone?: ReturnType<typeof badgeTone> }) {
  const { ui } = useAppTranslation();
  const resolvedTone = tone || badgeTone(value);
  return <span className={`forecast-badge forecast-badge--${resolvedTone}`}>{formatCanonicalLabel(value, ui)}</span>;
}

function MetricCard({
  label,
  value,
  format = 'number',
  iconPath,
  tone = 'blue'
}: {
  label: string;
  value: unknown;
  format?: ReviewConfig['metrics'][number]['format'];
  iconPath?: string;
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'slate';
}) {
  const { locale, ui } = useAppTranslation();
  return <OperationalWorkspaceStatCard label={ui(label)} value={formatMetric(value, format, locale, ui)} iconPath={iconPath} tone={tone === 'violet' ? 'blue' : tone} />;
}

function EvidenceSection({
  title,
  iconPath,
  description,
  rows,
  headers,
  renderRow
}: {
  title: string;
  iconPath: string;
  description: string;
  rows: Array<Record<string, unknown>>;
  headers: string[];
  renderRow: (row: Record<string, unknown>, index: number) => ReactNode;
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="card forecast-evidence-section">
      <div className="card__header">
        <div className="forecast-section-heading">
          <span className="forecast-heading-icon"><TenantNavIcon path={iconPath} size={17} /></span>
          <div>
            <h2>{ui(title)}</h2>
            <p className="card__subtext">{ui(description)}</p>
          </div>
        </div>
        <StatusBadge value={ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))} />
      </div>
      {!rows.length ? (
        <p className="forecast-muted">{ui('No matching records were returned.')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table forecast-table">
            <thead><tr>{headers.map((header) => <th key={header}>{ui(header)}</th>)}</tr></thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CheckColumn({ title, items }: { title: string; items: Array<Record<string, unknown>> }) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="forecast-check-card">
      <h3><span className={`forecast-heading-icon forecast-heading-icon--small ${title === 'Items needing attention' ? 'forecast-heading-icon--warning' : ''}`}><TenantNavIcon path={title === 'Items needing attention' ? '/alerts' : '/permissions'} size={15} /></span>{ui(title)}</h3>
      {!items.length ? (
        <p className="forecast-muted">{ui('No items were returned for this section.')}</p>
      ) : (
        <div className="forecast-check-list">
          {items.map((item, index) => {
            const status = item.check_status ?? item.severity;
            const heading = item.check_label ?? item.blocker_label ?? ui('Item {number}').replace('{number}', formatLocalizedNumber(index + 1, locale));
            const resolution = item.manual_resolution;
            const observed = item.current_value;
            const required = item.required_value;
            return (
              <article className="forecast-check-item" key={`${String(heading)}-${index}`}>
                <div className="forecast-check-item__heading">
                  <strong>{String(heading)}</strong>
                  {status !== undefined ? <StatusBadge value={status} /> : null}
                </div>
                {resolution ? <p>{String(resolution)}</p> : null}
                {observed !== undefined && observed !== null ? (
                  <span className="forecast-observed">{ui('Observed: {value}').replace('{value}', formatObservedValue(observed, locale))}{required !== undefined && required !== null ? ` · ${ui('Needed: {value}').replace('{value}', formatObservedValue(required, locale))}` : ''}</span>
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
  const { ui } = useAppTranslation();
  const available = section?.assessment_available !== false;
  const checks = (section?.[config.checksKey] || []) as Array<Record<string, unknown>>;
  const blockers = (section?.[config.blockersKey] || []) as Array<Record<string, unknown>>;

  return (
    <section className="card forecast-lifecycle">
      <div className="forecast-lifecycle__header">
        <div className="forecast-section-heading">
          <span className="forecast-heading-icon"><TenantNavIcon path="/reliability-command" size={17} /></span>
          <div>
            <h2>{ui(config.title)}</h2>
            <p className="card__subtext">{ui(config.description)}</p>
          </div>
        </div>
        <div className="forecast-decision">
          <span>{ui('Current result')}</span>
          <strong>{available ? formatCanonicalLabel(section?.[config.decisionKey], ui) : ui('Not assessed — no matching evidence')}</strong>
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
            <CheckColumn title={ui('Checks')} items={checks} />
            <CheckColumn title={ui('Items needing attention')} items={blockers} />
          </div>
        </>
      ) : (
        <div className="forecast-not-assessed">
          {ui('This review is not calculated until matching optimization planning evidence or an actual optimization outcome exists.')}
        </div>
      )}
    </section>
  );
}

export default function CrossDomainOptimizationPage() {
  const { locale, ui } = useAppTranslation();
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
  const lastRefreshed = dataUpdatedAt ? formatLocalizedDateTime(dataUpdatedAt, locale) : ui('Not refreshed yet');

  if (isLoading) {
    return (
      <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-cross-domain-optimization-refined="true">
        <section className="card forecast-state-card"><span className="forecast-state-icon"><TenantNavIcon path="/cross-domain-optimization" size={18} /></span><p>{ui('Loading cross-area optimization evidence…')}</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-cross-domain-optimization-refined="true">
        <section className="card card--danger forecast-state-card forecast-state-card--error">
          <span className="forecast-state-icon forecast-state-icon--danger"><TenantNavIcon path="/alerts" size={18} /></span>
          <div>
            <h2>{ui('Cross-area optimization evidence could not be loaded')}</h2>
            <p>{ui('Check your Decision Intelligence access and try the read-only request again.')}</p>
            <button className="button" type="button" onClick={() => void refetch()} disabled={isFetching}><TenantNavIcon path="/cross-domain-optimization" size={14} />{ui('Retry')}</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-cross-domain-optimization-refined="true">
      <OperationalWorkspaceHero
        iconPath="/cross-domain-optimization"
        eyebrow={ui('Decision intelligence & planning')}
        title={ui('Cross-Domain Optimization')}
        description={ui('Compare stored planning runs, business objectives, proposed options, tradeoffs, and recorded outcomes across business areas. This workspace supports human planning review only and cannot approve, apply, or scale a plan automatically.')}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
            <><OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{ui('Human-governed planning')}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{ui('No automatic plan execution')}</OperationalWorkspaceMetaPill></>
          */
        }
        aside={<><OperationalWorkspaceStatus value={formatCanonicalLabel(data?.governance?.cross_domain_optimization_posture, ui)} label={ui('Planning review posture · refreshed {time}').replace('{time}', lastRefreshed)} /><button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}><TenantNavIcon path="/cross-domain-optimization" size={14} />{isFetching ? ui('Refreshing…') : ui('Refresh evidence')}</button></>}
      />

<OperationalWorkspaceStats ariaLabel={ui('Cross-domain optimization evidence summary')}>
        <MetricCard label="Runs" value={runCount} iconPath="/cross-domain-optimization" tone="blue" />
        <MetricCard label="Objectives" value={objectiveCount} iconPath="/system-context" tone="violet" />
        <MetricCard label="Options" value={optionCount} iconPath="/workflow-composer" tone="blue" />
        <MetricCard label="Tradeoffs" value={tradeoffCount} iconPath="/alerts" tone="amber" />
        <MetricCard label="Recorded outcomes" value={resultCount} iconPath="/decision-learning-feedback" tone="slate" />
        <MetricCard label="Confirmed outcomes" value={data?.governance?.confirmed_result_count} iconPath="/reliability-command" tone="green" />
        <MetricCard label="Adverse outcomes" value={data?.governance?.adverse_result_count} iconPath="/alerts" tone="amber" />
        <OperationalWorkspaceStatCard label={ui('Current posture')} value={formatCanonicalLabel(data?.governance?.cross_domain_optimization_posture, ui)} helper={ui('Current evidence and governance posture')} iconPath="/reliability-command" tone="slate" />
      </OperationalWorkspaceStats>

<OperationalWorkspaceTabs ariaLabel={ui('Cross-domain optimization page views')}>
        <OperationalWorkspaceTab active={view === 'evidence'} iconPath="/cross-domain-optimization" label={ui('Optimization evidence')} onClick={() => setView('evidence')} />
        <OperationalWorkspaceTab active={view === 'readiness'} iconPath="/reliability-command" label={ui('Review checks')} onClick={() => setView('readiness')} />
      </OperationalWorkspaceTabs>

      <section className="card forecast-filters" aria-label={ui('Cross-domain optimization filters')}>
        <div className="card__header">
          <div className="forecast-section-heading">
            <span className="forecast-heading-icon"><TenantNavIcon path="/system-context" size={17} /></span>
            <div>
              <h2>{ui('Filter the evidence')}</h2>
              <p className="card__subtext">{ui('Planning filters apply consistently to runs and their related objectives, options, and tradeoffs. Outcome status filters the recorded Learning Feedback results.')}</p>
            </div>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={!hasActiveFilters}><TenantNavIcon path="/system-context" size={14} />{ui('Clear filters')}</button>
        </div>
        <div className="forecast-filter-grid">
          <label>
            <span className="form-label">{ui('Business area')}</span>
            <select className="input" value={filters.optimization_domain} onChange={(event) => updateFilter('optimization_domain', event.target.value)}>
              <option value="">{ui('All areas')}</option>
              {OPTIMIZATION_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Run status')}</span>
            <select className="input" value={filters.optimization_status} onChange={(event) => updateFilter('optimization_status', event.target.value)}>
              <option value="">{ui('All run statuses')}</option>
              {OPTIMIZATION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Objective type')}</span>
            <select className="input" value={filters.objective_type} onChange={(event) => updateFilter('objective_type', event.target.value)}>
              <option value="">{ui('All objective types')}</option>
              {OBJECTIVE_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Option status')}</span>
            <select className="input" value={filters.option_status} onChange={(event) => updateFilter('option_status', event.target.value)}>
              <option value="">{ui('All option statuses')}</option>
              {OPTION_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Tradeoff direction')}</span>
            <select className="input" value={filters.impact_direction} onChange={(event) => updateFilter('impact_direction', event.target.value)}>
              <option value="">{ui('All directions')}</option>
              {IMPACT_DIRECTION_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Recorded outcome status')}</span>
            <select className="input" value={filters.result_status} onChange={(event) => updateFilter('result_status', event.target.value)}>
              <option value="">{ui('All outcome statuses')}</option>
              {RESULT_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Maximum records per evidence list')}</span>
            <select className="input" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>
              {['25', '50', '100', '200'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </section>

      

      

      {!hasEvidence ? (
        <section className="card forecast-empty-state">
          <div className="forecast-section-heading">
            <span className="forecast-heading-icon forecast-heading-icon--slate"><TenantNavIcon path="/cross-domain-optimization" size={17} /></span>
            <div>
              <h2>{ui('No cross-area optimization evidence is available for this tenant and filter set')}</h2>
              <p>{ui('Review scores are not assessed when no run, objective, option, tradeoff, or recorded outcome exists. Zero records do not mean that a plan is safe, valuable, approved, ready to scale, or free from tradeoffs.')}</p>
              <p>{ui('This page has no plan-creation or outcome-recording action. Planning evidence must come from the supported optimization data process, and actual outcomes must be recorded through Learning Feedback.')}</p>
            </div>
          </div>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="forecast-limit-note"><TenantNavIcon path="/system-context" size={14} />{ui('Each list shows up to {limit} matching records. Review checks use the same filtered evidence.').replace('{limit}', formatLocalizedNumber(Number(filters.limit), locale))}</p>
          <EvidenceSection
            title={ui('Optimization runs')}
            iconPath="/cross-domain-optimization"
            description="Stored cross-area planning exercises and their current human-review status."
            rows={(data?.optimization_runs || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Business area', 'Status', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const run = row as OptimizationRun;
              return (
                <tr key={`run-${index}`}>
                  <td><strong>{run.optimization_label || run.title || ui('Planning run {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{run.summary ? <span className="forecast-table__subtext">{run.summary}</span> : null}</td>
                  <td>{formatCanonicalLabel(run.optimization_domain, ui)}</td>
                  <td><StatusBadge value={run.optimization_status} /></td>
                  <td>{formatPercentage(run.confidence_score, locale)}</td>
                  <td>{formatDate(run.updated_at || run.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Business objectives')}
            iconPath="/system-context"
            description="The goals and relative weights used to compare options, such as service risk, working capital, labor cost, or supplier reliability."
            rows={(data?.objectives || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Objective', 'Business area', 'Direction', 'Weight', 'Confidence', 'Recorded']}
            renderRow={(row, index) => {
              const objective = row as OptimizationObjective;
              return (
                <tr key={`objective-${index}`}>
                  <td>{objective.optimization_label || ui('Linked planning run')}</td>
                  <td><strong>{formatCanonicalLabel(objective.objective_type, ui)}</strong></td>
                  <td>{formatCanonicalLabel(objective.objective_domain, ui)}</td>
                  <td>{formatCanonicalLabel(objective.target_direction, ui)}</td>
                  <td>{formatNumber(objective.weight, locale, 4)}</td>
                  <td>{formatPercentage(objective.confidence_score, locale)}</td>
                  <td>{formatDate(objective.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Planning options')}
            iconPath="/workflow-composer"
            description="Proposed choices created for comparison. Projected scores are planning estimates, not proof of actual business value."
            rows={(data?.options || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Option', 'Status', 'Projected score', 'Confidence', 'Recorded']}
            renderRow={(row, index) => {
              const option = row as OptimizationOption;
              return (
                <tr key={`option-${index}`}>
                  <td>{option.optimization_label || ui('Linked planning run')}</td>
                  <td><strong>{option.option_label || option.title || ui('Planning option {number}').replace('{number}', formatLocalizedNumber(index + 1, locale))}</strong>{option.summary ? <span className="forecast-table__subtext">{option.summary}</span> : null}</td>
                  <td><StatusBadge value={option.option_status} /></td>
                  <td>{formatPercentage(option.aggregate_score, locale)}</td>
                  <td>{formatPercentage(option.confidence_score, locale)}</td>
                  <td>{formatDate(option.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Tradeoffs')}
            iconPath="/alerts"
            description="Expected positive, negative, neutral, or mixed effects attached to a planning option."
            rows={(data?.tradeoffs || []) as Array<Record<string, unknown>>}
            headers={['Option', 'Objective', 'Business area', 'Direction', 'Impact', 'Confidence', 'Recorded']}
            renderRow={(row, index) => {
              const tradeoff = row as OptimizationTradeoff;
              return (
                <tr key={`tradeoff-${index}`}>
                  <td>{tradeoff.option_label || ui('Linked planning option')}</td>
                  <td><strong>{formatCanonicalLabel(tradeoff.objective_type, ui)}</strong></td>
                  <td>{formatCanonicalLabel(tradeoff.tradeoff_domain, ui)}</td>
                  <td><StatusBadge value={tradeoff.impact_direction} /></td>
                  <td>{formatPercentage(tradeoff.impact_score, locale)}</td>
                  <td>{formatPercentage(tradeoff.confidence_score, locale)}</td>
                  <td>{formatDate(tradeoff.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Actual optimization outcomes')}
            iconPath="/decision-learning-feedback"
            description="Observed results recorded through Learning Feedback. These records provide the actual evidence used for trial reconciliation, drift, lifecycle, and scaling checks."
            rows={(data?.optimization_results || []) as Array<Record<string, unknown>>}
            headers={['Run', 'Option', 'Outcome', 'Business area', 'Realized value', 'Observed']}
            renderRow={(row, index) => {
              const result = row as OptimizationResult;
              return (
                <tr key={`result-${index}`}>
                  <td>{result.optimization_label || ui('Linked planning run')}</td>
                  <td>{result.option_label || ui('No option reference')}</td>
                  <td><StatusBadge value={result.result_status} /></td>
                  <td>{formatCanonicalLabel(result.result_domain, ui)}</td>
                  <td>{formatPercentage(result.realized_value_score, locale)}</td>
                  <td>{formatDate(result.observed_at, locale)}</td>
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
              <div className="forecast-section-heading">
                <span className="forecast-heading-icon forecast-heading-icon--amber"><TenantNavIcon path="/reliability-command" size={17} /></span>
                <div>
                  <h2>{ui('These are advisory checks, not approvals or automated actions')}</h2>
                  <p className="card__subtext">{ui('A passing check only means that the returned records satisfy that specific calculation. It does not approve a plan, apply an option, change objective weights, promote a pattern, start monitoring, retire anything, or scale a plan to another business area.')}</p>
                </div>
              </div>
            </section>
            {REVIEW_SECTIONS.map((config) => (
              <ReviewCard key={String(config.key)} config={config} section={data?.[config.key] as OptimizationReviewSection | undefined} />
            ))}
          </>
        ) : (
          <section className="card forecast-not-assessed-card">
            <div className="forecast-section-heading">
              <span className="forecast-heading-icon forecast-heading-icon--slate"><TenantNavIcon path="/reliability-command" size={17} /></span>
              <div>
                <h2>{ui('Review checks are not assessed')}</h2>
                <p>{ui('At least one matching optimization planning record or actual outcome is required before these calculations can produce a meaningful result.')}</p>
              </div>
            </div>
          </section>
        )
      ) : null}

    </main>
  );
}
