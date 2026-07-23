import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import './decisionIntelligencePages.css';

type ForecastView = 'evidence' | 'readiness' | 'diagnostics';

type ForecastFilterState = {
  forecast_domain: string;
  forecast_type: string;
  model_status: string;
  uncertainty_method: string;
  risk_type: string;
  calibration_type: string;
  limit: string;
};

type ForecastModelRecord = {
  model_key?: string;
  model_domain?: string;
  forecast_type?: string;
  model_status?: string;
  title?: string;
  summary?: string;
  uncertainty_method?: string;
  confidence_score?: number | string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type ForecastIntervalRecord = {
  model_key?: string;
  interval_key?: string;
  forecast_period_start?: string;
  forecast_period_end?: string;
  p10_value?: number | string | null;
  p50_value?: number | string | null;
  p90_value?: number | string | null;
  lower_bound?: number | string | null;
  expected_value?: number | string | null;
  upper_bound?: number | string | null;
  unit?: string;
  confidence_level?: number | string | null;
  confidence_score?: number | string | null;
  generated_at?: string;
  [key: string]: unknown;
};

type ForecastRiskRecord = {
  model_key?: string;
  probability_key?: string;
  risk_domain?: string;
  risk_type?: string;
  probability_score?: number | string | null;
  severity_score?: number | string | null;
  explanation_summary?: string;
  observed_at?: string;
  [key: string]: unknown;
};

type ForecastCalibrationRecord = {
  model_key?: string;
  calibration_key?: string;
  calibration_type?: string;
  predicted_value?: number | string | null;
  actual_value?: number | string | null;
  absolute_error?: number | string | null;
  interval_captured_actual?: boolean | null;
  calibration_score?: number | string | null;
  measured_at?: string;
  [key: string]: unknown;
};

type ForecastLifecycleSection = {
  assessment_available?: boolean;
  [key: string]: unknown;
};

type ForecastResponseContractAudit = {
  contract_decision?: string;
  contract_score?: number | null;
  response_coverage_score?: number | null;
  expected_response_keys?: string[];
  missing_expected_response_keys?: string[];
  missing_frontend_panel_keys?: string[];
  contract_checks?: Array<Record<string, unknown>>;
  contract_blockers?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

type ProbabilisticForecastingSummary = {
  filters?: Partial<ForecastFilterState> & { limit?: number };
  governance?: {
    model_count?: number;
    interval_count?: number;
    risk_probability_count?: number;
    calibration_observation_count?: number;
    approved_advisory_model_count?: number;
    ready_for_review_model_count?: number;
    calibrating_model_count?: number;
    high_probability_risk_count?: number;
    high_severity_risk_count?: number;
    calibration_capture_rate?: number | null;
    observed_domains?: string[];
    evidence_available?: boolean;
    probabilistic_forecasting_posture?: string;
    [key: string]: unknown;
  };
  models?: ForecastModelRecord[];
  intervals?: ForecastIntervalRecord[];
  risk_probabilities?: ForecastRiskRecord[];
  calibration?: ForecastCalibrationRecord[];
  calibration_feedback_loop?: ForecastLifecycleSection;
  forecast_outcome_reconciliation?: ForecastLifecycleSection;
  forecast_confidence_drift_guard?: ForecastLifecycleSection;
  forecast_pattern_retirement_guard?: ForecastLifecycleSection;
  forecast_replacement_readiness_gate?: ForecastLifecycleSection;
  forecast_monitoring_sla_contract?: ForecastLifecycleSection;
  forecast_degradation_incident_workflow?: ForecastLifecycleSection;
  forecast_lifecycle_control_board?: ForecastLifecycleSection;
  forecast_response_contract_audit?: ForecastResponseContractAudit;
  [key: string]: unknown;
};

type LifecycleConfig = {
  key: keyof ProbabilisticForecastingSummary;
  title: string;
  description: string;
  decisionKey: string;
  scoreKey: string;
  checksKey: string;
  blockersKey: string;
  metrics: Array<{ label: string; key: string; format?: 'number' | 'percent' | 'boolean' }>;
};

const DEFAULT_FILTERS: ForecastFilterState = {
  forecast_domain: '',
  forecast_type: '',
  model_status: '',
  uncertainty_method: '',
  risk_type: '',
  calibration_type: '',
  limit: '25'
};

const FORECAST_DOMAIN_OPTIONS = [
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

const FORECAST_TYPE_OPTIONS = [
  'depletion_probability',
  'demand_distribution',
  'supplier_reliability_probability',
  'service_risk_probability',
  'cost_exposure_distribution',
  'labor_capacity_probability',
  'logistics_delay_probability',
  'multi_domain_uncertainty',
  'general'
];

const MODEL_STATUS_OPTIONS = [
  'draft',
  'observing',
  'calibrating',
  'ready_for_review',
  'approved_for_advisory_use',
  'retired'
];

const UNCERTAINTY_METHOD_OPTIONS = [
  'confidence_interval',
  'quantile_band',
  'scenario_distribution',
  'probability_curve',
  'calibration_observation',
  'general'
];

const RISK_TYPE_OPTIONS = [
  'depletion_risk',
  'stockout_risk',
  'supplier_failure_risk',
  'service_level_risk',
  'budget_overrun_risk',
  'labor_shortfall_risk',
  'logistics_delay_risk',
  'multi_domain_cascade_risk',
  'general'
];

const CALIBRATION_TYPE_OPTIONS = [
  'interval_capture',
  'probability_accuracy',
  'quantile_accuracy',
  'bias_measurement',
  'forecast_error',
  'general'
];

const DECISION_LABELS: Record<string, string> = {
  not_assessed_no_forecast_evidence: 'Not assessed — no forecast evidence',
  manual_recalibration_review_required: 'Manual recalibration review required',
  manual_high_risk_forecast_review_ready: 'High-risk forecast review is ready for a person',
  calibration_feedback_ready_for_advisory_review: 'Calibration evidence is ready for advisory review',
  blocked: 'Blocked',
  review_required: 'Manual review required',
  ready: 'Ready for human review',
  manual_recalibration_or_confidence_reduction_required: 'Recalibration or lower confidence required',
  confidence_drift_monitoring_required: 'Confidence drift needs monitoring',
  forecast_confidence_stable_for_advisory_review: 'Confidence appears stable for advisory review',
  retirement_blocked_until_evidence_and_replacement_ready: 'Retirement blocked until evidence and a replacement are ready',
  manual_retirement_review_ready: 'Manual retirement review is ready',
  continue_monitoring_before_retirement: 'Continue monitoring before retirement',
  no_retirement_action_recommended: 'No retirement action recommended',
  replacement_blocked_until_candidate_and_evidence_ready: 'Replacement blocked until a candidate and evidence are ready',
  manual_replacement_cutover_ready: 'Manual replacement review is ready',
  replacement_candidate_review_required: 'Replacement candidate needs review',
  replacement_candidate_required_before_retirement: 'A replacement candidate is required before retirement',
  replacement_monitoring_only: 'Replacement is not currently required',
  forecast_monitoring_sla_blocked_until_scope_and_outcome_feed_ready: 'Monitoring review blocked until a model and outcome evidence exist',
  forecast_monitoring_sla_escalation_required: 'Monitoring escalation review required',
  forecast_monitoring_sla_cadence_review_required: 'Monitoring cadence review required',
  forecast_monitoring_sla_ready_for_advisory_operations: 'Monitoring evidence is ready for advisory review',
  degradation_incident_workflow_blocked_until_scope_and_sla_ready: 'Degradation review blocked until forecast scope exists',
  open_high_priority_forecast_degradation_incident: 'High-priority degradation review recommended',
  open_standard_forecast_degradation_review: 'Forecast degradation review recommended',
  monitor_degradation_signals_under_sla: 'Continue monitoring degradation signals',
  no_degradation_incident_required: 'No degradation review is currently required',
  forecast_lifecycle_control_blocked_until_open_gaps_are_resolved: 'Lifecycle review blocked until evidence gaps are resolved',
  forecast_lifecycle_requires_manual_stabilization_review: 'Lifecycle needs manual stabilization review',
  forecast_lifecycle_commercial_advisory_control_ready: 'Lifecycle evidence is ready for advisory review',
  no_forecast_evidence_available: 'No forecast evidence available',
  uncertainty_governance_review_required: 'Forecast governance review required',
  controlled_uncertainty_observation: 'Controlled forecast observation'
};

const LIFECYCLE_SECTIONS: LifecycleConfig[] = [
  {
    key: 'calibration_feedback_loop',
    title: 'Calibration readiness',
    description: 'Checks whether forecast results can be compared with actual outcomes before confidence is increased.',
    decisionKey: 'calibration_feedback_decision',
    scoreKey: 'calibration_feedback_score',
    checksKey: 'feedback_checks',
    blockersKey: 'feedback_blockers',
    metrics: [
      { label: 'Models', key: 'model_count' },
      { label: 'Intervals', key: 'interval_count' },
      { label: 'Outcome observations', key: 'calibration_observation_count' },
      { label: 'Capture rate', key: 'calibration_capture_rate', format: 'percent' },
      { label: 'Average error', key: 'average_absolute_error' },
      { label: 'High-risk forecasts', key: 'high_risk_forecast_count' }
    ]
  },
  {
    key: 'forecast_outcome_reconciliation',
    title: 'Outcome reconciliation',
    description: 'Checks whether predictions have been matched to actual results and whether missing or incorrect forecasts are visible.',
    decisionKey: 'status',
    scoreKey: 'reconciliation_score',
    checksKey: 'checks',
    blockersKey: 'blockers',
    metrics: [
      { label: 'Outcome coverage', key: 'outcome_coverage_score' },
      { label: 'Matched outcomes', key: 'reconciled_outcome_count' },
      { label: 'Missed outcomes', key: 'missed_outcome_count' },
      { label: 'Pending outcomes', key: 'pending_outcome_count' }
    ]
  },
  {
    key: 'forecast_confidence_drift_guard',
    title: 'Confidence drift review',
    description: 'Highlights worsening errors, missed ranges, or weak calibration before people continue trusting a forecast.',
    decisionKey: 'drift_decision',
    scoreKey: 'confidence_drift_score',
    checksKey: 'confidence_drift_checks',
    blockersKey: 'confidence_drift_blockers',
    metrics: [
      { label: 'Recalibration pressure', key: 'recalibration_pressure_score' },
      { label: 'Observed outcomes', key: 'observed_outcome_count' },
      { label: 'High-error observations', key: 'high_error_observation_count' },
      { label: 'Missed ranges', key: 'missed_interval_count' },
      { label: 'Low calibration scores', key: 'low_calibration_score_count' },
      { label: 'High-risk forecasts', key: 'high_risk_forecast_count' }
    ]
  },
  {
    key: 'forecast_pattern_retirement_guard',
    title: 'Forecast retirement review',
    description: 'Checks whether enough poor-result evidence and a replacement option exist before a forecast pattern is retired.',
    decisionKey: 'retirement_recommendation',
    scoreKey: 'retirement_readiness_score',
    checksKey: 'retirement_checks',
    blockersKey: 'retirement_blockers',
    metrics: [
      { label: 'Retirement signals', key: 'retirement_signal_count' },
      { label: 'Observed outcomes', key: 'observed_outcome_count' },
      { label: 'Missed outcomes', key: 'missed_outcome_count' },
      { label: 'Approved replacements', key: 'approved_replacement_model_count' },
      { label: 'Review replacements', key: 'review_replacement_model_count' },
      { label: 'High-risk forecasts', key: 'high_risk_forecast_count' }
    ]
  },
  {
    key: 'forecast_replacement_readiness_gate',
    title: 'Replacement readiness',
    description: 'Checks whether a replacement model, observed calibration history, human approval, and fallback path are available.',
    decisionKey: 'replacement_decision',
    scoreKey: 'replacement_readiness_score',
    checksKey: 'replacement_checks',
    blockersKey: 'replacement_blockers',
    metrics: [
      { label: 'Replacement needed', key: 'replacement_needed', format: 'boolean' },
      { label: 'Candidates', key: 'replacement_candidate_count' },
      { label: 'Approved candidates', key: 'approved_replacement_model_count' },
      { label: 'Candidates in review', key: 'review_replacement_model_count' },
      { label: 'Weak candidates', key: 'weak_replacement_model_count' },
      { label: 'Observed calibration', key: 'observed_calibration_count' }
    ]
  },
  {
    key: 'forecast_monitoring_sla_contract',
    title: 'Monitoring readiness',
    description: 'Checks whether active models, actual outcomes, drift review, and manual escalation are available for ongoing oversight.',
    decisionKey: 'sla_decision',
    scoreKey: 'monitoring_sla_score',
    checksKey: 'monitoring_sla_checks',
    blockersKey: 'monitoring_sla_blockers',
    metrics: [
      { label: 'Active models', key: 'active_model_count' },
      { label: 'Observed outcomes', key: 'observed_outcome_count' },
      { label: 'High-risk forecasts', key: 'high_risk_forecast_count' },
      { label: 'Drift signals', key: 'drift_signal_count' },
      { label: 'Retirement signals', key: 'retirement_signal_count' },
      { label: 'Incident pressure', key: 'incident_pressure_score' }
    ]
  },
  {
    key: 'forecast_degradation_incident_workflow',
    title: 'Degradation review',
    description: 'Shows whether forecast deterioration has enough evidence for a person to open a review and choose containment steps.',
    decisionKey: 'incident_decision',
    scoreKey: 'degradation_workflow_score',
    checksKey: 'degradation_incident_checks',
    blockersKey: 'degradation_incident_blockers',
    metrics: [
      { label: 'Incident signals', key: 'incident_signal_count' },
      { label: 'Open blockers', key: 'open_blocker_count' },
      { label: 'High-error observations', key: 'high_error_observation_count' },
      { label: 'Missed ranges', key: 'missed_interval_count' },
      { label: 'High-risk forecasts', key: 'high_risk_forecast_count' },
      { label: 'Incident pressure', key: 'incident_pressure_score' }
    ]
  },
  {
    key: 'forecast_lifecycle_control_board',
    title: 'Overall forecast lifecycle review',
    description: 'Combines the returned calibration, outcome, drift, retirement, replacement, monitoring, and degradation evidence into one human-review summary.',
    decisionKey: 'lifecycle_decision',
    scoreKey: 'lifecycle_control_score',
    checksKey: 'lifecycle_control_checks',
    blockersKey: 'lifecycle_control_blockers',
    metrics: [
      { label: 'Average component score', key: 'average_component_score' },
      { label: 'Available components', key: 'available_component_count' },
      { label: 'Weak components', key: 'weak_component_count' },
      { label: 'Open blockers', key: 'open_blocker_count' },
      { label: 'Ready checks', key: 'ready_check_count' },
      { label: 'Blocked checks', key: 'blocked_check_count' }
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

function formatNumber(value: unknown, maximumFractionDigits = 4): string {
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

function formatMetric(value: unknown, format: LifecycleConfig['metrics'][number]['format'] = 'number'): string {
  if (format === 'percent') return formatPercentage(value);
  if (format === 'boolean') return formatBoolean(value);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && !Number.isInteger(numeric) && Math.abs(numeric) < 1) return formatNumber(value, 4);
  return formatNumber(value, 1);
}

function formatIntervalRange(row: ForecastIntervalRecord): string {
  const lower = row.lower_bound ?? row.p10_value;
  const expected = row.expected_value ?? row.p50_value;
  const upper = row.upper_bound ?? row.p90_value;
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return expected === null || expected === undefined ? '—' : formatNumber(expected);
  }
  return `${formatNumber(lower)} – ${formatNumber(expected)} – ${formatNumber(upper)}`;
}

function badgeTone(value: unknown): 'neutral' | 'good' | 'warning' | 'danger' {
  const normalized = String(value || '').toLowerCase();
  if (['ready', 'passed', 'approved_for_advisory_use', 'reconciled'].includes(normalized)) return 'good';
  if (['blocked', 'critical', 'high', 'missed', 'retired'].includes(normalized)) return 'danger';
  if (['monitor', 'review_required', 'ready_for_review', 'calibrating', 'medium'].includes(normalized)) return 'warning';
  return 'neutral';
}

function StatusBadge({ value, tone }: { value: unknown; tone?: ReturnType<typeof badgeTone> }) {
  const resolvedTone = tone || badgeTone(value);
  return <span className={`forecast-badge forecast-badge--${resolvedTone}`}>{formatLabel(value)}</span>;
}

function MetricCard({ label, value, format = 'number' }: { label: string; value: unknown; format?: LifecycleConfig['metrics'][number]['format'] }) {
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

function CheckColumn({ title, items }: { title: string; items: Array<Record<string, unknown>> }) {
  return (
    <section className="forecast-check-card">
      <h3>{title}</h3>
      {!items.length ? (
        <p className="forecast-muted">No items were returned for this section.</p>
      ) : (
        <div className="forecast-check-list">
          {items.map((item, index) => {
            const status = item.status ?? (typeof item.passed === 'boolean' ? (item.passed ? 'passed' : 'blocked') : item.severity);
            const heading = item.label ?? item.message ?? item.required_resolution ?? `Item ${index + 1}`;
            const supportingText = item.label ? (item.required_resolution ?? item.message) : item.required_resolution;
            const observed = item.evidence_count ?? item.observed_count ?? item.value ?? item.observed_score;
            return (
              <article className="forecast-check-item" key={`${String(heading)}-${index}`}>
                <div className="forecast-check-item__heading">
                  <strong>{formatLabel(heading)}</strong>
                  {status !== undefined ? <StatusBadge value={status} /> : null}
                </div>
                {supportingText && supportingText !== heading ? <p>{formatLabel(supportingText)}</p> : null}
                {observed !== undefined && observed !== null ? <span className="forecast-observed">Observed: {formatNumber(observed)}</span> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LifecycleCard({ config, section }: { config: LifecycleConfig; section?: ForecastLifecycleSection }) {
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
          This review is not calculated until at least one matching model, interval, risk probability, or outcome observation exists.
        </div>
      )}
    </section>
  );
}

export default function ProbabilisticForecastingPage() {
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const [view, setView] = useState<ForecastView>('evidence');
  const [filters, setFilters] = useState<ForecastFilterState>(DEFAULT_FILTERS);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['probabilistic-forecasting-summary', queryString],
    queryFn: () => apiRequest<ProbabilisticForecastingSummary>(`/decision-intelligence/probabilistic-forecasting-summary?${queryString}`)
  });

  const updateFilter = (key: keyof ForecastFilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const modelCount = data?.governance?.model_count ?? data?.models?.length ?? 0;
  const intervalCount = data?.governance?.interval_count ?? data?.intervals?.length ?? 0;
  const riskCount = data?.governance?.risk_probability_count ?? data?.risk_probabilities?.length ?? 0;
  const calibrationCount = data?.governance?.calibration_observation_count ?? data?.calibration?.length ?? 0;
  const evidenceCount = modelCount + intervalCount + riskCount + calibrationCount;
  const hasEvidence = data?.governance?.evidence_available ?? evidenceCount > 0;
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Not refreshed yet';

  if (isLoading) {
    return (
      <main className="decision-intelligence-page">
        <section className="card"><p>Loading probabilistic forecast evidence…</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page">
        <section className="card card--danger">
          <h2>Probabilistic forecast evidence could not be loaded</h2>
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
          <span className="eyebrow">Read-only forecast review</span>
          <h2>Compare forecast ranges and probabilities with what actually happened</h2>
          <p className="card__subtext">
            This page shows stored forecast models, uncertainty ranges, risk probabilities, and outcome measurements. It helps people judge whether a forecast deserves more or less trust. It does not create forecasts, change confidence, retire models, or apply predictions to business operations.
          </p>
        </div>
        <div className="forecast-refresh">
          <button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh evidence'}
          </button>
          <span>Last refreshed: {lastRefreshed}</span>
        </div>
      </section>

      <section className="card forecast-filters" aria-label="Probabilistic forecast filters">
        <div className="card__header">
          <div>
            <h2>Filter the evidence</h2>
            <p className="card__subtext">Filters apply to models and their related ranges, risk probabilities, and outcome observations.</p>
          </div>
          <button className="button button--secondary" type="button" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={!hasActiveFilters}>
            Clear filters
          </button>
        </div>
        <div className="forecast-filter-grid">
          <label>
            <span className="form-label">Business area</span>
            <select className="input" value={filters.forecast_domain} onChange={(event) => updateFilter('forecast_domain', event.target.value)}>
              <option value="">All areas</option>
              {FORECAST_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Forecast type</span>
            <select className="input" value={filters.forecast_type} onChange={(event) => updateFilter('forecast_type', event.target.value)}>
              <option value="">All forecast types</option>
              {FORECAST_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Model status</span>
            <select className="input" value={filters.model_status} onChange={(event) => updateFilter('model_status', event.target.value)}>
              <option value="">All model statuses</option>
              {MODEL_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Uncertainty method</span>
            <select className="input" value={filters.uncertainty_method} onChange={(event) => updateFilter('uncertainty_method', event.target.value)}>
              <option value="">All methods</option>
              {UNCERTAINTY_METHOD_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Risk type</span>
            <select className="input" value={filters.risk_type} onChange={(event) => updateFilter('risk_type', event.target.value)}>
              <option value="">All risk types</option>
              {RISK_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Outcome measurement type</span>
            <select className="input" value={filters.calibration_type} onChange={(event) => updateFilter('calibration_type', event.target.value)}>
              <option value="">All measurement types</option>
              {CALIBRATION_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
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

      <div className="forecast-view-switch" role="tablist" aria-label="Probabilistic forecasting page views">
        <button className={`forecast-view-switch__button ${view === 'evidence' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'evidence'} onClick={() => setView('evidence')}>
          Forecast evidence
        </button>
        <button className={`forecast-view-switch__button ${view === 'readiness' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'readiness'} onClick={() => setView('readiness')}>
          Review checks
        </button>
        {canViewDiagnostics ? (
          <button className={`forecast-view-switch__button ${view === 'diagnostics' ? 'is-active' : ''}`} type="button" role="tab" aria-selected={view === 'diagnostics'} onClick={() => setView('diagnostics')}>
            Diagnostics
          </button>
        ) : null}
      </div>

      <section className="forecast-summary-grid" aria-label="Probabilistic forecast evidence summary">
        <MetricCard label="Models" value={modelCount} />
        <MetricCard label="Uncertainty ranges" value={intervalCount} />
        <MetricCard label="Risk probabilities" value={riskCount} />
        <MetricCard label="Outcome observations" value={calibrationCount} />
        <div className="forecast-metric forecast-metric--wide">
          <span className="forecast-metric__label">Current posture</span>
          <strong className="forecast-metric__value forecast-metric__value--text">{formatLabel(data?.governance?.probabilistic_forecasting_posture)}</strong>
        </div>
      </section>

      {!hasEvidence ? (
        <section className="card forecast-empty-state">
          <h2>No probabilistic forecast evidence is available for this tenant and filter set</h2>
          <p>Review scores are not assessed when no model, uncertainty range, risk probability, or actual-outcome observation exists. Zero records do not mean that forecasting is accurate, safe, approved, or ready for business use.</p>
          <p>This page has no model-creation or outcome-recording action. Evidence must first be produced through the supported forecasting and Learning Feedback data process.</p>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="forecast-limit-note">Each list shows up to {filters.limit} matching records. Review checks use the same filtered record set.</p>
          <EvidenceSection
            title="Forecast models"
            description="Stored forecast definitions and their current human-review status."
            rows={(data?.models || []) as Array<Record<string, unknown>>}
            headers={['Model', 'Area', 'Forecast type', 'Status', 'Method', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const model = row as ForecastModelRecord;
              return (
                <tr key={`${model.model_key || 'model'}-${index}`}>
                  <td><strong>{model.title || formatLabel(model.model_key)}</strong>{model.summary ? <span className="forecast-table__subtext">{model.summary}</span> : null}</td>
                  <td>{formatLabel(model.model_domain)}</td>
                  <td>{formatLabel(model.forecast_type)}</td>
                  <td><StatusBadge value={model.model_status} /></td>
                  <td>{formatLabel(model.uncertainty_method)}</td>
                  <td>{formatPercentage(model.confidence_score)}</td>
                  <td>{formatDate(model.updated_at || model.created_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Uncertainty ranges"
            description="Expected values and lower-to-upper ranges produced for a forecast period. The three displayed values are lower, expected, and upper."
            rows={(data?.intervals || []) as Array<Record<string, unknown>>}
            headers={['Model', 'Range', 'Unit', 'Period starts', 'Period ends', 'Confidence level', 'Generated']}
            renderRow={(row, index) => {
              const interval = row as ForecastIntervalRecord;
              return (
                <tr key={`${interval.interval_key || 'interval'}-${index}`}>
                  <td><strong>{formatLabel(interval.model_key || interval.interval_key)}</strong></td>
                  <td>{formatIntervalRange(interval)}</td>
                  <td>{interval.unit || '—'}</td>
                  <td>{formatDate(interval.forecast_period_start)}</td>
                  <td>{formatDate(interval.forecast_period_end)}</td>
                  <td>{formatPercentage(interval.confidence_level ?? interval.confidence_score)}</td>
                  <td>{formatDate(interval.generated_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Risk probabilities"
            description="Stored estimates of how likely a specific business risk is, together with its possible severity."
            rows={(data?.risk_probabilities || []) as Array<Record<string, unknown>>}
            headers={['Model', 'Area', 'Risk', 'Probability', 'Severity', 'Explanation', 'Observed']}
            renderRow={(row, index) => {
              const risk = row as ForecastRiskRecord;
              return (
                <tr key={`${risk.probability_key || 'risk'}-${index}`}>
                  <td><strong>{formatLabel(risk.model_key || risk.probability_key)}</strong></td>
                  <td>{formatLabel(risk.risk_domain)}</td>
                  <td>{formatLabel(risk.risk_type)}</td>
                  <td>{formatPercentage(risk.probability_score)}</td>
                  <td>{formatPercentage(risk.severity_score)}</td>
                  <td>{risk.explanation_summary || '—'}</td>
                  <td>{formatDate(risk.observed_at)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title="Actual-outcome observations"
            description="Comparisons between predicted and actual values used to understand forecast error and whether an uncertainty range captured the result."
            rows={(data?.calibration || []) as Array<Record<string, unknown>>}
            headers={['Model', 'Observation', 'Type', 'Predicted', 'Actual', 'Error', 'Inside range', 'Calibration', 'Measured']}
            renderRow={(row, index) => {
              const observation = row as ForecastCalibrationRecord;
              return (
                <tr key={`${observation.calibration_key || 'calibration'}-${index}`}>
                  <td>{formatLabel(observation.model_key)}</td>
                  <td><strong>{formatLabel(observation.calibration_key)}</strong></td>
                  <td>{formatLabel(observation.calibration_type)}</td>
                  <td>{formatNumber(observation.predicted_value)}</td>
                  <td>{formatNumber(observation.actual_value)}</td>
                  <td>{formatNumber(observation.absolute_error)}</td>
                  <td>{formatBoolean(observation.interval_captured_actual)}</td>
                  <td>{formatPercentage(observation.calibration_score)}</td>
                  <td>{formatDate(observation.measured_at)}</td>
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
              <p className="card__subtext">A passing check only means that the returned records satisfy that specific calculation. It does not create a forecast, increase confidence, approve business use, open an incident, replace a model, or retire anything.</p>
            </section>
            {LIFECYCLE_SECTIONS.map((config) => (
              <LifecycleCard key={String(config.key)} config={config} section={data?.[config.key] as ForecastLifecycleSection | undefined} />
            ))}
          </>
        ) : (
          <section className="card forecast-not-assessed-card">
            <h2>Review checks are not assessed</h2>
            <p>At least one matching forecast evidence record is required before these calculations can produce a meaningful result.</p>
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
          <div className="forecast-metrics">
            <MetricCard label="Contract score" value={data?.forecast_response_contract_audit?.contract_score} />
            <MetricCard label="Coverage score" value={data?.forecast_response_contract_audit?.response_coverage_score} />
            <MetricCard label="Expected response sections" value={data?.forecast_response_contract_audit?.expected_response_keys?.length || 0} />
            <MetricCard label="Missing response sections" value={(data?.forecast_response_contract_audit?.missing_expected_response_keys?.length || 0) + (data?.forecast_response_contract_audit?.missing_frontend_panel_keys?.length || 0)} />
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
