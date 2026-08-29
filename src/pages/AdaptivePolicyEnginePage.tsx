import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './decisionIntelligencePages.css';
import './AdaptivePolicyEnginePage.css';

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
  iconPath: string;
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
    iconPath: '/decision-learning-feedback',
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
    iconPath: '/reports',
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
    iconPath: '/permissions',
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
    iconPath: '/reliability-command',
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
    iconPath: '/alerts',
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
  if (!/[_-]/.test(text)) {
    return text.includes(' ') ? text : `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
  }
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const CANONICAL_LABELS: Record<string, string> = {
  ...DECISION_LABELS,
  inventory: 'Inventory',
  procurement: 'Procurement',
  reservation: 'Reservation',
  execution: 'Execution',
  optimization: 'Optimization',
  control_tower: 'Control tower',
  financial: 'Financial',
  integration: 'Integration',
  system: 'System',
  dynamic_replenishment: 'Dynamic replenishment',
  adaptive_reservation: 'Adaptive reservation',
  sla_cost_balance: 'SLA / cost balance',
  labor_allocation: 'Labour allocation',
  supplier_selection: 'Supplier selection',
  facility_balancing: 'Facility balancing',
  working_capital_control: 'Working capital control',
  integration_throttle: 'Integration throttle',
  general: 'General',
  draft: 'Draft',
  observing: 'Observing',
  recommendation_ready: 'Recommendation ready',
  review_required: 'Review required',
  approved_for_manual_application: 'Approved for manual application',
  rejected: 'Rejected',
  retired: 'Retired',
  tuning_adjustment: 'Tuning adjustment',
  threshold_adjustment: 'Threshold adjustment',
  objective_reweighting: 'Objective reweighting',
  guardrail_tightening: 'Guardrail tightening',
  guardrail_relaxation: 'Guardrail relaxation',
  policy_retirement: 'Policy retirement',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
};

function formatCanonicalLabel(value: unknown, ui: (englishText: string) => string): string {
  if (value === null || value === undefined || value === '') return ui('Not reported');
  const text = String(value);
  const canonical = CANONICAL_LABELS[text];
  return canonical ? ui(canonical) : formatLabel(value);
}

function formatNumber(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? formatLocalizedNumber(numeric, locale) : String(value);
}

function formatPercentage(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${formatLocalizedNumber(Math.round(numeric), locale)}%` : String(value);
}

function formatStoredConfidence(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  const percentage = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric;
  return `${formatLocalizedNumber(Math.round(percentage), locale)}%`;
}

function formatDelta(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${numeric > 0 ? '+' : ''}${formatLocalizedNumber(numeric, locale)}`;
}

function metricValue(value: unknown, format: 'number' | 'percent' | 'delta' | undefined, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  if (format === 'percent') return formatPercentage(value, locale);
  if (format === 'delta') return formatDelta(value, locale);
  return formatNumber(value, locale);
}

function StatusBadge({ value, tone }: { value: unknown; tone?: 'good' | 'warning' | 'danger' | 'neutral' }) {
  const { ui } = useAppTranslation();
  return <span className={`adaptive-policy-badge adaptive-policy-badge--${tone || 'neutral'}`}>{formatCanonicalLabel(value, ui)}</span>;
}

function MetricCard({
  label,
  value,
  format,
  iconPath,
  tone = 'blue'
}: {
  label: string;
  value: unknown;
  format?: 'number' | 'percent' | 'delta';
  iconPath?: string;
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'slate';
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <OperationalWorkspaceStatCard
      label={ui(label)}
      value={metricValue(value, format, locale)}
      iconPath={iconPath}
      tone={tone === 'violet' ? 'blue' : tone}
    />
  );
}

function CheckList({ title, items, kind }: { title: string; items: CheckItem[] | BlockerItem[]; kind: 'checks' | 'blockers' }) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="adaptive-policy-check-card">
      <h3><span className={`adaptive-policy-heading-icon ${kind === 'blockers' ? 'adaptive-policy-heading-icon--warning' : ''}`}><TenantNavIcon path={kind === 'blockers' ? '/alerts' : '/permissions'} size={15} /></span>{ui(title)}</h3>
      {!items.length ? (
        <p className="adaptive-policy-muted">{ui('No items require attention in this section.')}</p>
      ) : (
        <div className="adaptive-policy-check-list">
          {items.map((item, index) => {
            const check = item as CheckItem;
            const blocker = item as BlockerItem;
            const passed = check.passed;
            return (
              <article className="adaptive-policy-check-item" key={`${title}-${check.check_id || blocker.blocker_id || index}`}>
                <div className="adaptive-policy-check-item__heading">
                  <strong>{check.label ? formatLabel(check.label) : blocker.summary || ui('Review item')}</strong>
                  {kind === 'checks' ? (
                    <span className={`adaptive-policy-badge adaptive-policy-badge--${passed ? 'good' : 'warning'}`}>{ui(passed ? 'Passed' : 'Needs attention')}</span>
                  ) : (
                    <StatusBadge value={blocker.severity || 'Review'} tone={blocker.severity === 'high' ? 'danger' : 'warning'} />
                  )}
                </div>
                {kind === 'checks' && check.required_next_step ? <p>{check.required_next_step}</p> : null}
                {kind === 'blockers' && blocker.summary ? <p>{blocker.summary}</p> : null}
                {kind === 'checks' && check.observed_count !== undefined ? (
                  <span className="adaptive-policy-observed">{ui('Evidence records counted: {count}').replace('{count}', formatLocalizedNumber(check.observed_count, locale))}</span>
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
  const { ui } = useAppTranslation();
  const score = section?.[config.scoreKey];
  const decision = section?.[config.decisionKey];
  const blockers = (section?.[config.blockersKey] as BlockerItem[] | undefined) || [];
  const checks = (section?.[config.checksKey] as CheckItem[] | undefined) || [];

  return (
    <section className="card adaptive-policy-lifecycle">
      <div className="adaptive-policy-lifecycle__header">
        <div className="adaptive-policy-section-heading">
          <span className="adaptive-policy-heading-icon"><TenantNavIcon path={config.iconPath} size={17} /></span>
          <div>
            <h2>{ui(config.title)}</h2>
            <p className="card__subtext">{ui(config.description)}</p>
          </div>
        </div>
        <div className="adaptive-policy-decision">
          <span>{ui('Current assessment')}</span>
          <strong>{formatCanonicalLabel(decision, ui)}</strong>
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
        <CheckList title={ui('What needs attention')} items={blockers} kind="blockers" />
        <CheckList title={ui('Evidence checks')} items={checks} kind="checks" />
      </div>
    </section>
  );
}

function EvidenceSection({
  title,
  description,
  iconPath,
  rows,
  headers,
  renderRow
}: {
  title: string;
  description: string;
  iconPath: string;
  rows: Array<Record<string, unknown>>;
  headers: string[];
  renderRow: (row: Record<string, unknown>, index: number) => ReactNode;
}) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="card adaptive-policy-evidence-section">
      <div className="card__header">
        <div className="adaptive-policy-section-heading">
          <span className="adaptive-policy-heading-icon"><TenantNavIcon path={iconPath} size={17} /></span>
          <div>
            <h2>{ui(title)}</h2>
            <p className="card__subtext">{ui(description)}</p>
          </div>
        </div>
        <span className="adaptive-policy-badge adaptive-policy-badge--neutral">{ui('{count} returned').replace('{count}', formatLocalizedNumber(rows.length, locale))}</span>
      </div>
      {!rows.length ? (
        <p className="adaptive-policy-muted">{ui('No matching records were returned.')}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table adaptive-policy-table">
            <thead>
              <tr>{headers.map((header) => <th key={header}>{ui(header)}</th>)}</tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdaptivePolicyEnginePage() {
  const { locale, ui } = useAppTranslation();
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
  const lastRefreshed = dataUpdatedAt ? formatLocalizedDateTime(dataUpdatedAt, locale) : ui('Not refreshed yet');

  const updateFilter = (key: keyof AdaptivePolicyFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  if (isLoading) {
    return (
      <main className="decision-intelligence-page adaptive-policy-page adaptive-policy-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
        <section className="card adaptive-policy-state-card"><span className="adaptive-policy-state-icon"><TenantNavIcon path="/adaptive-policy-engine" size={18} /></span><p>{ui('Loading adaptive policy evidence…')}</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page adaptive-policy-page adaptive-policy-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
        <section className="card card--danger adaptive-policy-state-card adaptive-policy-state-card--danger">
          <span className="adaptive-policy-state-icon adaptive-policy-state-icon--danger"><TenantNavIcon path="/alerts" size={18} /></span><div><h2>{ui('Adaptive policy evidence could not be loaded')}</h2>
          <p>{ui('Check your Decision Intelligence access and try the read-only request again.')}</p>
          <button className="button" type="button" onClick={() => void refetch()}><TenantNavIcon path="/adaptive-policy-engine" size={14} />{ui('Retry')}</button></div>
        </section>
      </main>
    );
  }

  return (
    <main className="decision-intelligence-page adaptive-policy-page adaptive-policy-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      <OperationalWorkspaceHero
        iconPath="/adaptive-policy-engine"
        eyebrow={ui('Decision intelligence & policy review')}
        title={ui('Adaptive Policy Engine')}
        description={ui('Review stored policy records, observed signals, recommendations, and measured outcomes before people reuse or change a policy. This workspace does not create, approve, apply, promote, roll back, or retire policies.')}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Human-governed decisions')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Read-only evidence')}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={<><OperationalWorkspaceStatus value={formatCanonicalLabel(data?.governance?.adaptive_policy_posture, ui)} label={`${ui('Policy review posture')} · ${ui('Refreshed')} ${lastRefreshed}`} /><button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}><TenantNavIcon path="/adaptive-policy-engine" size={14} />{ui(isFetching ? 'Refreshing…' : 'Refresh evidence')}</button></>}
      />

<OperationalWorkspaceStats ariaLabel={ui('Adaptive policy evidence summary')}>
        <MetricCard label="Policies" value={policyCount} iconPath="/adaptive-policy-engine" tone="blue" />
        <MetricCard label="Signals" value={signalCount} iconPath="/insights" tone="violet" />
        <MetricCard label="Recommendations" value={recommendationCount} iconPath="/intelligence-review" tone="amber" />
        <MetricCard label="Measurements" value={measurementCount} iconPath="/reports" tone="green" />
        <OperationalWorkspaceStatCard
          label={ui('Current posture')}
          value={formatCanonicalLabel(data?.governance?.adaptive_policy_posture, ui)}
          helper={ui('Current evidence and governance posture')}
          iconPath="/permissions"
          tone="slate"
        />
      </OperationalWorkspaceStats>

<OperationalWorkspaceTabs ariaLabel={ui('Adaptive policy page views')}>
        <OperationalWorkspaceTab active={view === 'evidence'} iconPath="/adaptive-policy-engine" label={ui('Policy evidence')} onClick={() => setView('evidence')} />
        <OperationalWorkspaceTab active={view === 'readiness'} iconPath="/reliability-command" label={ui('Readiness checks')} onClick={() => setView('readiness')} />
        {canViewDiagnostics ? <OperationalWorkspaceTab active={view === 'diagnostics'} iconPath="/admin-system" label={ui('Diagnostics')} onClick={() => setView('diagnostics')} /> : null}
      </OperationalWorkspaceTabs>

      <section className="card adaptive-policy-filters" aria-label={ui('Adaptive policy filters')}>
        <div className="card__header">
          <div className="adaptive-policy-section-heading">
            <span className="adaptive-policy-heading-icon"><TenantNavIcon path="/system-context" size={17} /></span>
            <div>
              <h2>{ui('Filter the evidence')}</h2>
              <p className="card__subtext">{ui('Filters apply consistently to policies and their related signals, recommendations, and measurements.')}</p>
            </div>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)}>
            <TenantNavIcon path="/system-context" size={14} />{ui('Clear filters')}
          </button>
        </div>
        <div className="adaptive-policy-filter-grid">
          <label>
            <span className="form-label">{ui('Business area')}</span>
            <select className="input" value={filters.policy_domain} onChange={(event) => updateFilter('policy_domain', event.target.value)}>
              <option value="">{ui('All areas')}</option>
              {POLICY_DOMAINS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Policy type')}</span>
            <select className="input" value={filters.policy_type} onChange={(event) => updateFilter('policy_type', event.target.value)}>
              <option value="">{ui('All policy types')}</option>
              {POLICY_TYPES.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Policy status')}</span>
            <select className="input" value={filters.policy_status} onChange={(event) => updateFilter('policy_status', event.target.value)}>
              <option value="">{ui('All policy statuses')}</option>
              {POLICY_STATUSES.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Recommendation type')}</span>
            <select className="input" value={filters.recommendation_type} onChange={(event) => updateFilter('recommendation_type', event.target.value)}>
              <option value="">{ui('All recommendation types')}</option>
              {RECOMMENDATION_TYPES.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Maximum records per evidence list')}</span>
            <select className="input" value={filters.limit} onChange={(event) => updateFilter('limit', event.target.value)}>
              {['25', '50', '100', '200'].map((value) => <option key={value} value={value}>{formatLocalizedNumber(Number(value), locale)}</option>)}
            </select>
          </label>
        </div>
      </section>

      

      

      {!hasEvidence ? (
        <section className="card adaptive-policy-empty-state">
          <div className="adaptive-policy-section-heading"><span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--slate"><TenantNavIcon path="/adaptive-policy-engine" size={17} /></span><h2>{ui('No adaptive policy evidence is available for this tenant and filter set')}</h2></div>
          <p>{ui('Readiness is not assessed when there are no policy, signal, recommendation, or effectiveness records. Zero records do not mean that policies are safe, approved, or ready for promotion.')}</p>
          <p>{ui('This page has no policy-creation action. Evidence must first be produced through the supported Decision Intelligence data process before it can be reviewed here.')}</p>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="adaptive-policy-limit-note"><TenantNavIcon path="/system-context" size={14} />
            {ui('Lists show up to {limit} matching records in each evidence category. Readiness checks use the same filtered record set.').replace('{limit}', formatLocalizedNumber(Number(filters.limit), locale))}
          </p>
          <EvidenceSection
            title={ui('Policies')}
            iconPath="/adaptive-policy-engine"
            description="The policy ideas currently being observed or manually reviewed."
            rows={(data?.policies || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Area', 'Type', 'Status', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const policy = row as AdaptivePolicyRecord;
              return (
                <tr key={`${policy.policy_key || 'policy'}-${index}`}>
                  <td><strong>{policy.title || formatLabel(policy.policy_key)}</strong>{policy.summary ? <span className="adaptive-policy-table__subtext">{policy.summary}</span> : null}</td>
                  <td>{formatCanonicalLabel(policy.policy_domain, ui)}</td>
                  <td>{formatCanonicalLabel(policy.policy_type, ui)}</td>
                  <td><StatusBadge value={policy.policy_status} /></td>
                  <td>{formatStoredConfidence(policy.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(policy.updated_at || policy.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Observed signals')}
            iconPath="/insights"
            description="Measurements or indicators connected to the returned policies."
            rows={(data?.signals || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Area', 'Signal', 'Variance', 'Weight', 'Confidence', 'Observed']}
            renderRow={(row, index) => {
              const signal = row as PolicySignalRecord;
              return (
                <tr key={`${signal.policy_key || 'signal'}-${index}`}>
                  <td><strong>{formatLabel(signal.policy_key)}</strong></td>
                  <td>{formatCanonicalLabel(signal.signal_domain, ui)}</td>
                  <td>{formatLabel(signal.signal_type)}</td>
                  <td>{formatDelta(signal.variance_score, locale)}</td>
                  <td>{formatNumber(signal.weight, locale)}</td>
                  <td>{formatStoredConfidence(signal.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(signal.observed_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Policy recommendations')}
            iconPath="/intelligence-review"
            description="Advisory policy changes that still require human review and manual application."
            rows={(data?.recommendations || []) as Array<Record<string, unknown>>}
            headers={['Policy', 'Recommendation', 'Type', 'Status', 'Risk', 'Confidence', 'Created']}
            renderRow={(row, index) => {
              const recommendation = row as PolicyRecommendationRecord;
              return (
                <tr key={`${recommendation.recommendation_key || 'recommendation'}-${index}`}>
                  <td>{formatLabel(recommendation.policy_key)}</td>
                  <td><strong>{formatLabel(recommendation.recommendation_key)}</strong>{recommendation.explanation_summary ? <span className="adaptive-policy-table__subtext">{recommendation.explanation_summary}</span> : null}</td>
                  <td>{formatCanonicalLabel(recommendation.recommendation_type, ui)}</td>
                  <td><StatusBadge value={recommendation.recommendation_status} /></td>
                  <td><StatusBadge value={recommendation.risk_level} tone={['high', 'critical'].includes(String(recommendation.risk_level)) ? 'danger' : 'neutral'} /></td>
                  <td>{formatStoredConfidence(recommendation.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(recommendation.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Effectiveness measurements')}
            iconPath="/reports"
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
                  <td>{formatNumber(measurement.baseline_score, locale)}</td>
                  <td>{formatNumber(measurement.observed_score, locale)}</td>
                  <td>{formatDelta(measurement.delta_score, locale)}</td>
                  <td>{formatStoredConfidence(measurement.confidence_score, locale)}</td>
                  <td>{formatLocalizedDateTime(measurement.measured_at, locale)}</td>
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
              <div className="adaptive-policy-section-heading">
                <span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--amber"><TenantNavIcon path="/reliability-command" size={17} /></span>
                <div><h2>{ui('These checks support a human review; they are not approvals')}</h2>
              <p className="card__subtext">{ui('A passing check means the returned evidence satisfies that specific rule. It does not automatically approve, apply, promote, roll back, or retire a policy.')}</p></div>
              </div>
            </section>
            {LIFECYCLE_SECTIONS.map((config) => (
              <LifecycleCard key={config.key} config={config} section={data?.[config.key] as LifecycleSection | undefined} />
            ))}
          </>
        ) : (
          <section className="card adaptive-policy-not-assessed">
            <div className="adaptive-policy-section-heading"><span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--slate"><TenantNavIcon path="/reliability-command" size={17} /></span><div><h2>{ui('Readiness checks are not assessed')}</h2>
            <p>{ui('At least one adaptive policy evidence record is required before these checks can produce a meaningful result.')}</p></div></div>
          </section>
        )
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card adaptive-policy-diagnostics">
          <div className="card__header">
            <div className="adaptive-policy-section-heading">
              <span className="adaptive-policy-heading-icon adaptive-policy-heading-icon--slate"><TenantNavIcon path="/admin-system" size={17} /></span>
              <div>
                <h2>{ui('Technical response diagnostics')}</h2>
                <p className="card__subtext">{ui('Restricted implementation information for users with tenant diagnostics permission.')}</p>
              </div>
            </div>
          </div>
          <div className="adaptive-policy-metrics">
            <MetricCard label="Contract score" value={data?.response_contract_audit?.contract_score} />
            <MetricCard label="Rendered panels" value={data?.response_contract_audit?.rendered_panel_count} />
            <MetricCard label="Expected response keys" value={data?.response_contract_audit?.expected_response_key_count} />
            <MetricCard label="Missing response keys" value={data?.response_contract_audit?.missing_response_key_count} />
          </div>
          <details className="adaptive-policy-technical-details">
            <summary>{ui('View restricted response details')}</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
