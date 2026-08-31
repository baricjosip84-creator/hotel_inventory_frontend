import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { TENANT_PERMISSIONS, hasPermission } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // intentionally hidden: technical hero badges add no tenant-facing value
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './decisionIntelligencePages.css';
import './ProbabilisticForecastingPage.css';

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

type ForecastPagination = {
  total?: number;
  offset?: number;
  limit?: number;
  has_previous?: boolean;
  has_next?: boolean;
};

type ForecastOffsets = { model_offset: number; interval_offset: number; risk_offset: number; calibration_offset: number };

type ForecastModelRecord = {
  model_key?: string;
  model_domain?: string;
  forecast_type?: string;
  model_status?: string;
  title?: string;
  summary?: string;
  uncertainty_method?: string;
  confidence_score?: number | string | null;
  version?: number | string | null;
  source_reference?: { version?: number | string | null; [key: string]: unknown };
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type ForecastIntervalRecord = {
  model_key?: string;
  model_title?: string;
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
  model_title?: string;
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
  model_title?: string;
  calibration_key?: string;
  observation_source?: string;
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
  pagination?: { models?: ForecastPagination; intervals?: ForecastPagination; risk_probabilities?: ForecastPagination; calibration?: ForecastPagination };
  governance?: {
    model_count?: number;
    interval_count?: number;
    risk_probability_count?: number;
    calibration_observation_count?: number;
    current_model_count?: number;
    last_analysis_refreshed_at?: string | null;
    approved_advisory_model_count?: number;
    ready_for_review_model_count?: number;
    calibrating_model_count?: number;
    high_probability_risk_count?: number;
    high_severity_risk_count?: number;
    calibration_capture_rate?: number | null;
    observed_domains?: string[];
    evidence_available?: boolean;
    historical_evidence_available?: boolean;
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
  'retired',
  'stale'
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


const CANONICAL_LABELS: Record<string, string> = {
  inventory: 'Inventory',
  procurement: 'Procurement',
  reservation: 'Reservation',
  execution: 'Execution',
  optimization: 'Optimization',
  control_tower: 'Control tower',
  financial: 'Financial',
  integration: 'Integration',
  system: 'System',
  depletion_probability: 'Depletion probability',
  demand_distribution: 'Demand distribution',
  supplier_reliability_probability: 'Supplier reliability probability',
  service_risk_probability: 'Service risk probability',
  cost_exposure_distribution: 'Cost exposure distribution',
  labor_capacity_probability: 'Labour capacity probability',
  logistics_delay_probability: 'Logistics delay probability',
  multi_domain_uncertainty: 'Multi-domain uncertainty',
  general: 'General',
  draft: 'Draft',
  observing: 'Observing',
  calibrating: 'Calibrating',
  ready_for_review: 'Ready for review',
  approved_for_advisory_use: 'Approved for advisory use',
  retired: 'Retired',
  stale: 'Stale',
  confidence_interval: 'Confidence interval',
  quantile_band: 'Quantile band',
  scenario_distribution: 'Scenario distribution',
  probability_curve: 'Probability curve',
  calibration_observation: 'Calibration observation',
  depletion_risk: 'Depletion risk',
  stockout_risk: 'Stockout risk',
  supplier_failure_risk: 'Supplier failure risk',
  service_level_risk: 'Service level risk',
  budget_overrun_risk: 'Budget overrun risk',
  labor_shortfall_risk: 'Labour shortfall risk',
  logistics_delay_risk: 'Logistics delay risk',
  multi_domain_cascade_risk: 'Multi-domain cascade risk',
  interval_capture: 'Interval capture',
  probability_accuracy: 'Probability accuracy',
  quantile_accuracy: 'Quantile accuracy',
  bias_measurement: 'Bias measurement',
  forecast_error: 'Forecast error',
  passed: 'Passed',
  reconciled: 'Reconciled',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  monitor: 'Monitor'
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
      { label: 'Average normalized error', key: 'average_normalized_error' },
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
  if (raw.includes(' ') || /[.!?]/.test(raw)) return raw;
  return raw.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCanonicalLabel(value: unknown, ui: (englishText: string) => string): string {
  if (value === null || value === undefined || value === '') return ui('Not reported');
  const raw = String(value);
  const canonical = DECISION_LABELS[raw] ?? CANONICAL_LABELS[raw];
  return canonical ? ui(canonical) : formatLabel(value);
}

function formatNumber(value: unknown, locale: Parameters<typeof formatLocalizedNumber>[1], maximumFractionDigits = 4): string {
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

function formatMetric(value: unknown, format: LifecycleConfig['metrics'][number]['format'], locale: Parameters<typeof formatLocalizedNumber>[1], ui: (englishText: string) => string): string {
  if (format === 'percent') return formatPercentage(value, locale);
  if (format === 'boolean') return formatBoolean(value, ui);
  const numeric = Number(value);
  if (Number.isFinite(numeric) && !Number.isInteger(numeric) && Math.abs(numeric) < 1) return formatNumber(value, locale, 4);
  return formatNumber(value, locale, 1);
}

function formatIntervalRange(row: ForecastIntervalRecord, locale: Parameters<typeof formatLocalizedNumber>[1]): string {
  const lower = row.lower_bound ?? row.p10_value;
  const expected = row.expected_value ?? row.p50_value;
  const upper = row.upper_bound ?? row.p90_value;
  if (lower === null || lower === undefined || upper === null || upper === undefined) {
    return expected === null || expected === undefined ? '—' : formatNumber(expected, locale);
  }
  return `${formatNumber(lower, locale)} – ${formatNumber(expected, locale)} – ${formatNumber(upper, locale)}`;
}

function badgeTone(value: unknown): 'neutral' | 'good' | 'warning' | 'danger' {
  const normalized = String(value || '').toLowerCase();
  if (['ready', 'passed', 'approved_for_advisory_use', 'reconciled'].includes(normalized)) return 'good';
  if (['blocked', 'critical', 'high', 'missed', 'retired'].includes(normalized)) return 'danger';
  if (['monitor', 'review_required', 'ready_for_review', 'calibrating', 'medium'].includes(normalized)) return 'warning';
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
  format?: LifecycleConfig['metrics'][number]['format'];
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
  renderRow,
  pagination,
  onPrevious,
  onNext
}: {
  title: string;
  iconPath: string;
  description: string;
  rows: Array<Record<string, unknown>>;
  headers: string[];
  renderRow: (row: Record<string, unknown>, index: number) => ReactNode;
  pagination?: ForecastPagination;
  onPrevious?: () => void;
  onNext?: () => void;
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
        <StatusBadge value={ui('{shown} shown · {total} total').replace('{shown}', formatLocalizedNumber(rows.length, locale)).replace('{total}', formatLocalizedNumber(pagination?.total ?? rows.length, locale))} />
      </div>
      {!rows.length ? (
        <p className="forecast-muted">{ui('No matching records were returned.')}</p>
      ) : (
        <>
        <div className="table-wrap">
          <table className="data-table forecast-table">
            <thead>
              <tr>{headers.map((header) => <th key={header}>{ui(header)}</th>)}</tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
        {(pagination?.has_previous || pagination?.has_next) ? <div className="forecast-pagination"><button className="button button--secondary" type="button" onClick={onPrevious} disabled={!pagination?.has_previous}>{ui('Newer')}</button><span>{ui('Showing {start}–{end} of {total}').replace('{start}', formatLocalizedNumber((pagination?.offset || 0) + 1, locale)).replace('{end}', formatLocalizedNumber((pagination?.offset || 0) + rows.length, locale)).replace('{total}', formatLocalizedNumber(pagination?.total || rows.length, locale))}</span><button className="button button--secondary" type="button" onClick={onNext} disabled={!pagination?.has_next}>{ui('Older')}</button></div> : null}
        </>
      )}
    </section>
  );
}

function CheckColumn({ title, items, diagnostics }: { title: string; items: Array<Record<string, unknown>>; diagnostics: boolean }) {
  const { locale, ui } = useAppTranslation();
  return (
    <section className="forecast-check-card">
      <h3><span className={`forecast-heading-icon forecast-heading-icon--small ${title === 'Items needing attention' ? 'forecast-heading-icon--warning' : ''}`}><TenantNavIcon path={title === 'Items needing attention' ? '/alerts' : '/permissions'} size={15} /></span>{ui(title)}</h3>
      {!items.length ? (
        <p className="forecast-muted">{ui('No items were returned for this section.')}</p>
      ) : (
        <div className="forecast-check-list">
          {items.map((item, index) => {
            const status = item.status ?? (typeof item.passed === 'boolean' ? (item.passed ? 'passed' : 'blocked') : item.severity);
            const rawHeading = item.label ?? item.message ?? item.required_resolution;
            const rawSupporting = item.label ? (item.required_resolution ?? item.message) : item.required_resolution;
            const observed = item.evidence_count ?? item.observed_count ?? item.value ?? item.observed_score;
            const genericHeading = ui('Review check {number}').replace('{number}', formatLocalizedNumber(index + 1, locale));
            const genericSupporting = status === 'blocked' || status === 'high' || status === 'critical'
              ? ui('This check needs human attention.')
              : status === 'monitor' || status === 'medium'
                ? ui('This check should continue to be monitored.')
                : ui('This check currently passes.');
            return (
              <article className="forecast-check-item" key={`${String(item.key || rawHeading || index)}-${index}`}>
                <div className="forecast-check-item__heading">
                  <strong>{diagnostics && rawHeading ? String(rawHeading) : genericHeading}</strong>
                  {status !== undefined ? <StatusBadge value={status} /> : null}
                </div>
                {diagnostics && rawSupporting && rawSupporting !== rawHeading ? <p>{String(rawSupporting)}</p> : <p>{genericSupporting}</p>}
                {observed !== undefined && observed !== null ? <span className="forecast-observed">{ui('Observed: {value}').replace('{value}', formatNumber(observed, locale))}</span> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function LifecycleCard({ config, section, diagnostics }: { config: LifecycleConfig; section?: ForecastLifecycleSection; diagnostics: boolean }) {
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
            <CheckColumn title={ui('Checks')} items={checks} diagnostics={diagnostics} />
            <CheckColumn title={ui('Items needing attention')} items={blockers} diagnostics={diagnostics} />
          </div>
        </>
      ) : (
        <div className="forecast-not-assessed">
          {ui('This review is not calculated until at least one matching model, interval, risk probability, or outcome observation exists.')}
        </div>
      )}
    </section>
  );
}

export default function ProbabilisticForecastingPage() {
  const { locale, ui } = useAppTranslation();
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);
  const canReadInsights = hasPermission(TENANT_PERMISSIONS.INSIGHTS_READ);
  const canGovern = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_GOVERN) && canReadInsights;
  const canOpenIntelligenceReview = hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)
    && hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);
  const [view, setView] = useState<ForecastView>('evidence');
  const [filters, setFilters] = useState<ForecastFilterState>(DEFAULT_FILTERS);
  const [offsets, setOffsets] = useState<ForecastOffsets>({ model_offset: 0, interval_offset: 0, risk_offset: 0, calibration_offset: 0 });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    Object.entries(offsets).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
    return params.toString();
  }, [filters, offsets]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['probabilistic-forecasting-summary', queryString],
    queryFn: () => apiRequest<ProbabilisticForecastingSummary>(`/decision-intelligence/probabilistic-forecasting-summary?${queryString}`)
  });

  const updateFilter = (key: keyof ForecastFilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffsets({ model_offset: 0, interval_offset: 0, risk_offset: 0, calibration_offset: 0 });
  };

  const refreshAnalysis = useMutation({
    mutationFn: () => apiRequest('/decision-intelligence/probabilistic-forecasting-refresh', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: async () => { setOffsets({ model_offset: 0, interval_offset: 0, risk_offset: 0, calibration_offset: 0 }); await refetch(); }
  });

  const movePage = (key: keyof ForecastOffsets, direction: -1 | 1) => {
    const pageSize = Number(filters.limit) || 25;
    setOffsets((current) => ({ ...current, [key]: Math.max(0, current[key] + direction * pageSize) }));
  };

  const modelCount = data?.governance?.model_count ?? data?.models?.length ?? 0;
  const intervalCount = data?.governance?.interval_count ?? data?.intervals?.length ?? 0;
  const riskCount = data?.governance?.risk_probability_count ?? data?.risk_probabilities?.length ?? 0;
  const calibrationCount = data?.governance?.calibration_observation_count ?? data?.calibration?.length ?? 0;
  const evidenceCount = modelCount + intervalCount + riskCount + calibrationCount;
  const hasCurrentEvidence = data?.governance?.evidence_available ?? evidenceCount > 0;
  const hasHistoricalEvidence = data?.governance?.historical_evidence_available ?? evidenceCount > 0;
  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const lastAnalysisRefreshedAt = data?.governance?.last_analysis_refreshed_at;
  const lastRefreshed = lastAnalysisRefreshedAt ? formatLocalizedDateTime(lastAnalysisRefreshedAt, locale) : ui('Not refreshed yet');

  if (isLoading) {
    return (
      <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-probabilistic-forecasting-refined="true">
        <section className="card forecast-state-card"><span className="forecast-state-icon"><TenantNavIcon path="/probabilistic-forecasting" size={18} /></span><p>{ui('Loading probabilistic forecast evidence…')}</p></section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-probabilistic-forecasting-refined="true">
        <section className="card card--danger forecast-state-card forecast-state-card--error">
          <span className="forecast-state-icon forecast-state-icon--danger"><TenantNavIcon path="/alerts" size={18} /></span>
          <div>
            <h2>{ui('Probabilistic forecast evidence could not be loaded')}</h2>
            <p>{ui('Check your Decision Intelligence and Insights access, then try again.')}</p>
            <button className="button" type="button" onClick={() => void refetch()} disabled={isFetching}><TenantNavIcon path="/probabilistic-forecasting" size={14} />{ui('Retry')}</button>
          </div>
        </section>
      </main>
    );
  }

  // Hidden by design: the former Tenant-scoped / Human-reviewed evidence / No automatic business action hero badges remain conceptually preserved but are not rendered.
  return (
    <main className="decision-intelligence-page io-operational-page io-workspace-page io-workspace-legacy-normalized" data-probabilistic-forecasting-refined="true">
      <OperationalWorkspaceHero
        iconPath="/probabilistic-forecasting"
        eyebrow={ui('Decision intelligence & forecasting')}
        title={ui('Probabilistic Forecasting')}
        description={ui('Build and review advisory demand ranges, stockout risk, and forecast accuracy from the app’s real operating data. Forecasts never change inventory or other business records automatically.')}
        aside={<><OperationalWorkspaceStatus value={formatCanonicalLabel(data?.governance?.probabilistic_forecasting_posture, ui)} label={ui('Forecast analysis last refreshed · {time}').replace('{time}', lastRefreshed)} />{canGovern ? <button className="button button--secondary" type="button" onClick={() => refreshAnalysis.mutate()} disabled={refreshAnalysis.isPending || isFetching}><TenantNavIcon path="/probabilistic-forecasting" size={14} />{ui(refreshAnalysis.isPending ? 'Refreshing forecast analysis…' : 'Refresh forecast analysis')}</button> : <button className="button button--secondary" type="button" onClick={() => void refetch()} disabled={isFetching}><TenantNavIcon path="/probabilistic-forecasting" size={14} />{ui(isFetching ? 'Refreshing…' : 'Refresh page')}</button>}</>}
      />
      {refreshAnalysis.isError ? (
        <section className="card card--danger forecast-refresh-error" role="alert">
          <strong>{ui('Forecast analysis could not be refreshed.')}</strong>
          <span>{ui('Your existing forecast snapshots were not changed. Check your access or source forecast data and try again.')}</span>
        </section>
      ) : null}

<OperationalWorkspaceStats ariaLabel={ui('Probabilistic forecast evidence summary')}>
        <MetricCard label="Models" value={modelCount} iconPath="/probabilistic-forecasting" tone="blue" />
        <MetricCard label="Uncertainty ranges" value={intervalCount} iconPath="/insights" tone="violet" />
        <MetricCard label="Risk probabilities" value={riskCount} iconPath="/alerts" tone="amber" />
        <MetricCard label="Outcome observations" value={calibrationCount} iconPath="/decision-learning-feedback" tone="green" />
        <OperationalWorkspaceStatCard label={ui('Current posture')} value={formatCanonicalLabel(data?.governance?.probabilistic_forecasting_posture, ui)} helper={ui('Current evidence and governance posture')} iconPath="/reliability-command" tone="slate" />
      </OperationalWorkspaceStats>

<OperationalWorkspaceTabs ariaLabel={ui('Probabilistic forecasting page views')}>
        <OperationalWorkspaceTab active={view === 'evidence'} iconPath="/probabilistic-forecasting" label={ui('Forecast evidence')} onClick={() => setView('evidence')} />
        <OperationalWorkspaceTab active={view === 'readiness'} iconPath="/reliability-command" label={ui('Review checks')} onClick={() => setView('readiness')} />
        {canViewDiagnostics ? <OperationalWorkspaceTab active={view === 'diagnostics'} iconPath="/admin-system" label={ui('Diagnostics')} onClick={() => setView('diagnostics')} /> : null}
      </OperationalWorkspaceTabs>

      <section className="card forecast-filters" aria-label={ui('Probabilistic forecast filters')}>
        <div className="card__header">
          <div className="forecast-section-heading">
            <span className="forecast-heading-icon"><TenantNavIcon path="/system-context" size={17} /></span>
            <div>
              <h2>{ui('Filter the evidence')}</h2>
              <p className="card__subtext">{ui('Filters apply to models and their related ranges, risk probabilities, and outcome observations.')}</p>
            </div>
          </div>
          <button className="button button--secondary" type="button" onClick={() => { setFilters(DEFAULT_FILTERS); setOffsets({ model_offset: 0, interval_offset: 0, risk_offset: 0, calibration_offset: 0 }); }} disabled={!hasActiveFilters}>
            <TenantNavIcon path="/system-context" size={14} />{ui('Clear filters')}
          </button>
        </div>
        <div className="forecast-filter-grid">
          <label>
            <span className="form-label">{ui('Business area')}</span>
            <select className="input" value={filters.forecast_domain} onChange={(event) => updateFilter('forecast_domain', event.target.value)}>
              <option value="">{ui('All areas')}</option>
              {FORECAST_DOMAIN_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Forecast type')}</span>
            <select className="input" value={filters.forecast_type} onChange={(event) => updateFilter('forecast_type', event.target.value)}>
              <option value="">{ui('All forecast types')}</option>
              {FORECAST_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Model status')}</span>
            <select className="input" value={filters.model_status} onChange={(event) => updateFilter('model_status', event.target.value)}>
              <option value="">{ui('All model statuses')}</option>
              {MODEL_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Uncertainty method')}</span>
            <select className="input" value={filters.uncertainty_method} onChange={(event) => updateFilter('uncertainty_method', event.target.value)}>
              <option value="">{ui('All methods')}</option>
              {UNCERTAINTY_METHOD_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Risk type')}</span>
            <select className="input" value={filters.risk_type} onChange={(event) => updateFilter('risk_type', event.target.value)}>
              <option value="">{ui('All risk types')}</option>
              {RISK_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">{ui('Outcome measurement type')}</span>
            <select className="input" value={filters.calibration_type} onChange={(event) => updateFilter('calibration_type', event.target.value)}>
              <option value="">{ui('All measurement types')}</option>
              {CALIBRATION_TYPE_OPTIONS.map((value) => <option key={value} value={value}>{formatCanonicalLabel(value, ui)}</option>)}
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

      

      

      {!hasHistoricalEvidence ? (
        <section className="card forecast-empty-state">
          <div className="forecast-section-heading">
            <span className="forecast-heading-icon forecast-heading-icon--slate"><TenantNavIcon path="/probabilistic-forecasting" size={17} /></span>
            <div>
              <h2>{ui('No probabilistic forecast evidence is available for this tenant and filter set')}</h2>
              <p>{ui('Review scores are not assessed when no model, uncertainty range, risk probability, or actual-outcome observation exists. Zero records do not mean that forecasting is accurate, safe, approved, or ready for business use.')}</p>
              <p>{ui('Use Refresh forecast analysis to rebuild advisory forecast evidence from current operating data. Actual outcome observations can also come from Learning Feedback.')}</p>
            </div>
          </div>
        </section>
      ) : null}

      {view === 'evidence' ? (
        <>
          <p className="forecast-limit-note"><TenantNavIcon path="/system-context" size={14} />{ui('Each list is paged for readability. Totals use the full matching history; review checks focus on the current version of each forecast.')}</p>
          <EvidenceSection
            title={ui('Forecast models')}
            iconPath="/probabilistic-forecasting"
            description="Stored forecast definitions and their current human-review status."
            rows={(data?.models || []) as Array<Record<string, unknown>>}
            pagination={data?.pagination?.models}
            onPrevious={() => movePage('model_offset', -1)} onNext={() => movePage('model_offset', 1)}
            headers={['Model', 'Area', 'Forecast type', 'Status', 'Method', 'Confidence', 'Updated']}
            renderRow={(row, index) => {
              const model = row as ForecastModelRecord;
              return (
                <tr key={`${model.model_key || 'model'}-${index}`}>
                  <td>
                    <strong>{model.title || formatLabel(model.model_key)}</strong>
                    {(model.version ?? model.source_reference?.version) ? <span className="forecast-table__subtext">{ui('Version')} {formatLocalizedNumber(Number(model.version ?? model.source_reference?.version), locale)}</span> : null}
                    {model.summary ? <span className="forecast-table__subtext">{model.summary}</span> : null}
                  </td>
                  <td>{formatCanonicalLabel(model.model_domain, ui)}</td>
                  <td>{formatCanonicalLabel(model.forecast_type, ui)}</td>
                  <td><StatusBadge value={model.model_status} /></td>
                  <td>{formatCanonicalLabel(model.uncertainty_method, ui)}</td>
                  <td>{formatPercentage(model.confidence_score, locale)}</td>
                  <td>{formatDate(model.updated_at || model.created_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Uncertainty ranges')}
            iconPath="/insights"
            description={ui('Expected values and empirical lower-to-upper error bands produced from historical forecast error. These are advisory error bands, not statistical confidence intervals or p10/p90 quantiles.')} 
            rows={(data?.intervals || []) as Array<Record<string, unknown>>}
            pagination={data?.pagination?.intervals}
            onPrevious={() => movePage('interval_offset', -1)} onNext={() => movePage('interval_offset', 1)}
            headers={['Model', 'Range', 'Unit', 'Period starts', 'Period ends', 'Evidence confidence', 'Generated']}
            renderRow={(row, index) => {
              const interval = row as ForecastIntervalRecord;
              return (
                <tr key={`${interval.interval_key || 'interval'}-${index}`}>
                  <td><strong>{interval.model_title || formatLabel(interval.model_key || interval.interval_key)}</strong></td>
                  <td>{formatIntervalRange(interval, locale)}</td>
                  <td>{interval.unit || '—'}</td>
                  <td>{formatDate(interval.forecast_period_start, locale)}</td>
                  <td>{formatDate(interval.forecast_period_end, locale)}</td>
                  <td>{formatPercentage(interval.confidence_score, locale)}</td>
                  <td>{formatDate(interval.generated_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Risk probabilities')}
            iconPath="/alerts"
            description="Stored estimates of how likely a specific business risk is, together with its possible severity."
            rows={(data?.risk_probabilities || []) as Array<Record<string, unknown>>}
            pagination={data?.pagination?.risk_probabilities}
            onPrevious={() => movePage('risk_offset', -1)} onNext={() => movePage('risk_offset', 1)}
            headers={['Model', 'Area', 'Risk', 'Probability', 'Severity', 'Explanation', 'Observed']}
            renderRow={(row, index) => {
              const risk = row as ForecastRiskRecord;
              return (
                <tr key={`${risk.probability_key || 'risk'}-${index}`}>
                  <td><strong>{risk.model_title || formatLabel(risk.model_key || risk.probability_key)}</strong></td>
                  <td>{formatCanonicalLabel(risk.risk_domain, ui)}</td>
                  <td>{formatCanonicalLabel(risk.risk_type, ui)}</td>
                  <td>{formatPercentage(risk.probability_score, locale)}</td>
                  <td>{formatPercentage(risk.severity_score, locale)}</td>
                  <td>{canViewDiagnostics ? (risk.explanation_summary || '—') : ui('Risk is calculated from the current forecast range and available evidence.')}</td>
                  <td>{formatDate(risk.observed_at, locale)}</td>
                </tr>
              );
            }}
          />
          <EvidenceSection
            title={ui('Actual-outcome observations')}
            iconPath="/decision-learning-feedback"
            description="Comparisons between predicted and actual values used to understand forecast error and whether an uncertainty range captured the result."
            rows={(data?.calibration || []) as Array<Record<string, unknown>>}
            pagination={data?.pagination?.calibration}
            onPrevious={() => movePage('calibration_offset', -1)} onNext={() => movePage('calibration_offset', 1)}
            headers={['Model', 'Observation', 'Type', 'Predicted', 'Actual', 'Error', 'Inside range', 'Calibration', 'Measured']}
            renderRow={(row, index) => {
              const observation = row as ForecastCalibrationRecord;
              return (
                <tr key={`${observation.calibration_key || observation.model_key || observation.measured_at || 'calibration'}-${index}`}>
                  <td>{observation.model_title || formatLabel(observation.model_key)}</td>
                  <td>
                    <strong>{ui(observation.observation_source === 'learning_feedback' ? 'Learning Feedback outcome' : observation.observation_source === 'rolling_backtest' ? '30-day usage backtest' : 'Calibration observation')}</strong>
                    {canViewDiagnostics && observation.calibration_key ? <span className="forecast-table__subtext">{observation.calibration_key}</span> : null}
                  </td>
                  <td>{formatCanonicalLabel(observation.calibration_type, ui)}</td>
                  <td>{formatNumber(observation.predicted_value, locale)}</td>
                  <td>{formatNumber(observation.actual_value, locale)}</td>
                  <td>{formatNumber(observation.absolute_error, locale)}</td>
                  <td>{formatBoolean(observation.interval_captured_actual, ui)}</td>
                  <td>{formatPercentage(observation.calibration_score, locale)}</td>
                  <td>{formatDate(observation.measured_at, locale)}</td>
                </tr>
              );
            }}
          />
        </>
      ) : null}

      {view === 'readiness' ? (
        hasCurrentEvidence ? (
          <>
            <section className="card forecast-readiness-note">
              <div className="forecast-section-heading">
                <span className="forecast-heading-icon forecast-heading-icon--amber"><TenantNavIcon path="/reliability-command" size={17} /></span>
                <div>
                  <h2>{ui('These are advisory checks, not approvals or automated actions')}</h2>
                  <p className="card__subtext">{ui('A passing check only means the evidence satisfies that calculation. Models that need a human decision are reviewed in Intelligence Review; approval still does not change inventory or execute business work.')}</p>{canOpenIntelligenceReview ? <Link className="button button--secondary" to="/intelligence-review"><TenantNavIcon path="/intelligence-review" size={14} />{ui('Open Intelligence Review')}</Link> : null}
                </div>
              </div>
            </section>
            {LIFECYCLE_SECTIONS.map((config) => (
              <LifecycleCard key={String(config.key)} config={config} section={data?.[config.key] as ForecastLifecycleSection | undefined} diagnostics={canViewDiagnostics} />
            ))}
          </>
        ) : (
          <section className="card forecast-not-assessed-card">
            <div className="forecast-section-heading">
              <span className="forecast-heading-icon forecast-heading-icon--slate"><TenantNavIcon path="/reliability-command" size={17} /></span>
              <div>
                <h2>{ui('Review checks are not assessed')}</h2>
                <p>{ui('At least one matching forecast evidence record is required before these calculations can produce a meaningful result.')}</p>
              </div>
            </div>
          </section>
        )
      ) : null}

      {view === 'diagnostics' && canViewDiagnostics ? (
        <section className="card forecast-diagnostics">
          <div className="card__header">
            <div className="forecast-section-heading">
              <span className="forecast-heading-icon forecast-heading-icon--slate"><TenantNavIcon path="/admin-system" size={17} /></span>
              <div>
                <h2>{ui('Technical response diagnostics')}</h2>
                <p className="card__subtext">{ui('Restricted implementation information for users with tenant diagnostics permission.')}</p>
              </div>
            </div>
          </div>
          <div className="forecast-metrics">
            <MetricCard label="Contract score" value={data?.forecast_response_contract_audit?.contract_score} iconPath="/admin-system" tone="blue" />
            <MetricCard label="Coverage score" value={data?.forecast_response_contract_audit?.response_coverage_score} iconPath="/reports" tone="green" />
            <MetricCard label="Expected response sections" value={data?.forecast_response_contract_audit?.expected_response_keys?.length || 0} iconPath="/system-context" tone="violet" />
            <MetricCard label="Missing response sections" value={(data?.forecast_response_contract_audit?.missing_expected_response_keys?.length || 0) + (data?.forecast_response_contract_audit?.missing_frontend_panel_keys?.length || 0)} iconPath="/alerts" tone="amber" />
          </div>
          <details className="forecast-technical-details">
            <summary>{ui('View restricted response details')}</summary>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </details>
        </section>
      ) : null}
    </main>
  );
}
