import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';


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

const LIMIT_OPTIONS = ['25', '50', '100', '200'];

type ForecastFilterState = {
  forecast_domain: string;
  forecast_type: string;
  model_status: string;
  uncertainty_method: string;
  risk_type: string;
  calibration_type: string;
  limit: string;
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

const FILTER_LABELS: Record<keyof ForecastFilterState, string> = {
  forecast_domain: 'Forecast domain',
  forecast_type: 'Forecast type',
  model_status: 'Model status',
  uncertainty_method: 'Uncertainty method',
  risk_type: 'Risk type',
  calibration_type: 'Calibration type',
  limit: 'Result limit'
};

const formatOptionLabel = (value: string) => value.replaceAll('_', ' ');

const formatDateTime = (timestamp: number) => {
  if (!timestamp) return 'Not loaded yet';
  return new Date(timestamp).toLocaleString();
};

function FilterSelect({
  name,
  value,
  options,
  onChange,
  allowAll = true
}: {
  name: keyof ForecastFilterState;
  value: string;
  options: string[];
  onChange: (name: keyof ForecastFilterState, value: string) => void;
  allowAll?: boolean;
}) {
  return (
    <label className="space-y-1 text-sm text-slate-700">
      <span className="font-medium text-slate-800">{FILTER_LABELS[name]}</span>
      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      >
        {allowAll ? <option value="">All</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

type ForecastCalibrationFeedbackLoop = {
  feedback_loop_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  calibration_feedback_decision?: string;
  calibration_feedback_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  model_count?: number;
  interval_count?: number;
  risk_probability_count?: number;
  calibration_observation_count?: number;
  interval_capture_count?: number;
  missed_interval_count?: number;
  high_error_count?: number;
  low_calibration_score_count?: number;
  high_risk_forecast_count?: number;
  calibration_capture_rate?: number | null;
  average_absolute_error?: number | null;
  average_calibration_score?: number | null;
  feedback_contract?: Record<string, unknown>;
  feedback_blockers?: Array<Record<string, unknown>>;
  feedback_checks?: Array<Record<string, unknown>>;
};

type ForecastOutcomeReconciliation = {
  status?: string;
  reconciliation_score?: number | null;
  outcome_coverage_score?: number | null;
  reconciled_outcome_count?: number;
  missed_outcome_count?: number;
  pending_outcome_count?: number;
  checks?: Array<Record<string, unknown>>;
  blockers?: Array<Record<string, unknown>>;
  manual_review_contract?: {
    required_before_confidence_increase?: boolean;
    allowed_decisions?: string[];
    required_evidence?: string[];
  };
};


type ForecastConfidenceDriftGuard = {
  guard_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  drift_decision?: string;
  confidence_drift_score?: number | null;
  recalibration_pressure_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  observed_outcome_count?: number;
  high_error_observation_count?: number;
  low_calibration_score_count?: number;
  missed_interval_count?: number;
  high_confidence_model_count?: number;
  high_risk_forecast_count?: number;
  drift_signal_count?: number;
  confidence_drift_checks?: Array<Record<string, unknown>>;
  confidence_drift_blockers?: Array<Record<string, unknown>>;
  drift_guard_contract?: Record<string, unknown>;
};


type ForecastPatternRetirementGuard = {
  guard_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  retirement_recommendation?: string;
  retirement_readiness_score?: number | null;
  ready_check_count?: number;
  monitor_check_count?: number;
  blocked_check_count?: number;
  retirement_signal_count?: number;
  observed_outcome_count?: number;
  missed_outcome_count?: number;
  high_error_observation_count?: number;
  low_calibration_score_count?: number;
  missed_interval_count?: number;
  high_risk_forecast_count?: number;
  retired_model_count?: number;
  approved_replacement_model_count?: number;
  review_replacement_model_count?: number;
  retirement_checks?: Array<Record<string, unknown>>;
  retirement_blockers?: Array<Record<string, unknown>>;
  retirement_contract?: {
    requires_observed_outcome_history?: boolean;
    requires_drift_history?: boolean;
    requires_replacement_candidate_before_retirement?: boolean;
    requires_manual_reviewer_signoff?: boolean;
    allowed_decisions?: string[];
    required_evidence?: string[];
    allows_autonomous_forecast_retirement?: boolean;
    allows_operational_state_mutation?: boolean;
  };
};


type ForecastReplacementReadinessGate = {
  gate_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  replacement_decision?: string;
  replacement_readiness_score?: number | null;
  replacement_needed?: boolean;
  ready_check_count?: number;
  monitor_check_count?: number;
  blocked_check_count?: number;
  replacement_candidate_count?: number;
  approved_replacement_model_count?: number;
  review_replacement_model_count?: number;
  weak_replacement_model_count?: number;
  observed_calibration_count?: number;
  retirement_signal_count?: number;
  drift_signal_count?: number;
  missed_outcome_count?: number;
  replacement_checks?: Array<Record<string, unknown>>;
  replacement_blockers?: Array<Record<string, unknown>>;
  replacement_contract?: {
    requires_candidate_before_retirement?: boolean;
    requires_observed_calibration_history?: boolean;
    requires_manual_cutover_approval?: boolean;
    requires_fallback_to_previous_pattern?: boolean;
    allowed_decisions?: string[];
    required_evidence?: string[];
    allows_autonomous_replacement_cutover?: boolean;
    allows_operational_state_mutation?: boolean;
  };
};



type ForecastMonitoringSlaContract = {
  contract_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  sla_decision?: string;
  monitoring_sla_score?: number | null;
  incident_pressure_score?: number | null;
  active_model_count?: number;
  approved_model_count?: number;
  observed_outcome_count?: number;
  high_risk_forecast_count?: number;
  drift_signal_count?: number;
  drift_blocker_count?: number;
  retirement_signal_count?: number;
  replacement_blocker_count?: number;
  ready_check_count?: number;
  monitor_check_count?: number;
  blocked_check_count?: number;
  monitoring_sla_checks?: Array<Record<string, unknown>>;
  monitoring_sla_blockers?: Array<Record<string, unknown>>;
  monitoring_sla_contract?: {
    requires_active_forecast_scope?: boolean;
    requires_observed_outcome_feed?: boolean;
    requires_drift_review_sla?: boolean;
    requires_high_risk_escalation_window?: boolean;
    requires_retirement_replacement_cutover_sla?: boolean;
    recommended_review_cadence?: Record<string, unknown>;
    allowed_decisions?: string[];
    required_evidence?: string[];
    allows_autonomous_forecast_application?: boolean;
    allows_operational_state_mutation?: boolean;
  };
};

type ForecastDegradationIncidentWorkflow = {
  workflow_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  incident_decision?: string;
  degradation_workflow_score?: number | null;
  incident_pressure_score?: number | null;
  ready_check_count?: number;
  monitor_check_count?: number;
  blocked_check_count?: number;
  incident_signal_count?: number;
  open_blocker_count?: number;
  high_error_observation_count?: number;
  missed_interval_count?: number;
  low_calibration_score_count?: number;
  high_risk_forecast_count?: number;
  drift_blocker_count?: number;
  monitoring_sla_blocker_count?: number;
  retirement_blocker_count?: number;
  replacement_blocker_count?: number;
  degradation_incident_checks?: Array<Record<string, unknown>>;
  degradation_incident_blockers?: Array<Record<string, unknown>>;
  degradation_incident_contract?: {
    requires_forecast_scope?: boolean;
    requires_observed_failure_signal?: boolean;
    requires_monitoring_sla_owner?: boolean;
    requires_manual_triage?: boolean;
    requires_containment_decision_before_confidence_increase?: boolean;
    allowed_decisions?: string[];
    required_evidence?: string[];
    allows_autonomous_incident_creation?: boolean;
    allows_autonomous_forecast_application?: boolean;
    allows_operational_state_mutation?: boolean;
  };
};

type ForecastLifecycleControlBoard = {
  board_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  lifecycle_decision?: string;
  lifecycle_control_score?: number | null;
  average_component_score?: number | null;
  lifecycle_component_count?: number;
  available_component_count?: number;
  weak_component_count?: number;
  open_blocker_count?: number;
  ready_check_count?: number;
  monitor_check_count?: number;
  blocked_check_count?: number;
  lifecycle_components?: Array<Record<string, unknown>>;
  lifecycle_control_checks?: Array<Record<string, unknown>>;
  lifecycle_control_blockers?: Array<Record<string, unknown>>;
  lifecycle_control_contract?: {
    requires_all_lifecycle_components?: boolean;
    requires_no_open_blockers_for_commercial_ready_status?: boolean;
    requires_manual_stabilization_review_before_operational_trust?: boolean;
    allowed_decisions?: string[];
    required_evidence?: string[];
    allows_autonomous_forecast_application?: boolean;
    allows_operational_state_mutation?: boolean;
  };
};

type ForecastResponseContractAudit = {
  audit_type?: string;
  execution_mode?: string;
  forecast_application_mode?: string;
  contract_decision?: string;
  contract_score?: number | null;
  expected_response_keys?: string[];
  frontend_rendered_panels?: string[];
  backend_returned_keys?: string[];
  missing_expected_response_keys?: string[];
  missing_frontend_panel_keys?: string[];
  unexpected_frontend_only_panels?: string[];
  response_coverage_score?: number | null;
  contract_checks?: Array<Record<string, unknown>>;
  contract_blockers?: Array<Record<string, unknown>>;
  contract_guardrails?: Record<string, unknown>;
};

type ProbabilisticForecastingSummary = {
  feature?: string;
  step?: number;
  governance?: Record<string, unknown>;
  models?: Array<Record<string, unknown>>;
  intervals?: Array<Record<string, unknown>>;
  risk_probabilities?: Array<Record<string, unknown>>;
  calibration?: Array<Record<string, unknown>>;
  calibration_feedback_loop?: ForecastCalibrationFeedbackLoop;
  forecast_outcome_reconciliation?: ForecastOutcomeReconciliation;
  forecast_confidence_drift_guard?: ForecastConfidenceDriftGuard;
  forecast_pattern_retirement_guard?: ForecastPatternRetirementGuard;
  forecast_replacement_readiness_gate?: ForecastReplacementReadinessGate;
  forecast_monitoring_sla_contract?: ForecastMonitoringSlaContract;
  forecast_degradation_incident_workflow?: ForecastDegradationIncidentWorkflow;
  forecast_lifecycle_control_board?: ForecastLifecycleControlBoard;
  forecast_response_contract_audit?: ForecastResponseContractAudit;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(4);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value).replaceAll('_', ' ');
};

function MetricCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{formatValue(value)}</div>
    </div>
  );
}

function CheckList({ title, items }: { title: string; items?: Array<Record<string, unknown>> }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-3">
        {(items || []).length === 0 ? (
          <p className="text-sm text-slate-500">No items reported for the current filters.</p>
        ) : (
          (items || []).map((item, index) => (
            <div key={`${String(item.key || item.label || index)}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900">{formatValue(item.label || item.key || `Item ${index + 1}`)}</div>
                  {item.required_resolution ? <div className="mt-1 text-sm text-slate-600">{formatValue(item.required_resolution)}</div> : null}
                  {item.message ? <div className="mt-1 text-sm text-slate-600">{formatValue(item.message)}</div> : null}
                </div>
                {item.status ? <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{formatValue(item.status)}</span> : null}
                {typeof item.passed === 'boolean' ? <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{item.passed ? 'Passed' : 'Blocked'}</span> : null}
                {item.severity ? <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">{formatValue(item.severity)}</span> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function ProbabilisticForecastingPage() {
  const [filters, setFilters] = useState<ForecastFilterState>(DEFAULT_FILTERS);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    (Object.entries(filters) as Array<[keyof ForecastFilterState, string]>).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    if (!params.has('limit')) {
      params.set('limit', DEFAULT_FILTERS.limit);
    }
    return params.toString();
  }, [filters]);

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['probabilistic-forecasting-summary', filters],
    queryFn: () => apiRequest<ProbabilisticForecastingSummary>(`/decision-intelligence/probabilistic-forecasting-summary?${queryString}`)
  });

  const updateFilter = (name: keyof ForecastFilterState, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'limit' && Boolean(value)) || filters.limit !== DEFAULT_FILTERS.limit;

  const feedback = data?.calibration_feedback_loop;
  const reconciliation = data?.forecast_outcome_reconciliation;
  const confidenceDriftGuard = data?.forecast_confidence_drift_guard;
  const retirementGuard = data?.forecast_pattern_retirement_guard;
  const replacementGate = data?.forecast_replacement_readiness_gate;
  const monitoringSla = data?.forecast_monitoring_sla_contract;
  const degradationWorkflow = data?.forecast_degradation_incident_workflow;
  const lifecycleBoard = data?.forecast_lifecycle_control_board;
  const contractAudit = data?.forecast_response_contract_audit;
  const totalForecastRecords = (data?.models?.length || 0) + (data?.intervals?.length || 0) + (data?.risk_probabilities?.length || 0) + (data?.calibration?.length || 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Decision Intelligence</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">Probabilistic Forecasting</h1>
          <p className="mt-2 max-w-4xl text-slate-600">
            Uncertainty-aware forecast visibility, calibration observations, and manual forecast feedback-loop readiness.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <div className="font-medium text-slate-900">Last refreshed</div>
          <div className="mt-1">{formatDateTime(dataUpdatedAt)}</div>
          <button
            type="button"
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching && !isLoading ? 'Refreshing...' : 'Refresh summary'}
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Forecast filters</h2>
            <p className="mt-1 text-sm text-slate-600">
              These controls use the existing validated backend query contract and only change the read-only summary view.
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect name="forecast_domain" value={filters.forecast_domain} options={FORECAST_DOMAIN_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="forecast_type" value={filters.forecast_type} options={FORECAST_TYPE_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="model_status" value={filters.model_status} options={MODEL_STATUS_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="uncertainty_method" value={filters.uncertainty_method} options={UNCERTAINTY_METHOD_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="risk_type" value={filters.risk_type} options={RISK_TYPE_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="calibration_type" value={filters.calibration_type} options={CALIBRATION_TYPE_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="limit" value={filters.limit} options={LIMIT_OPTIONS} onChange={updateFilter} allowAll={false} />
        </div>
      </section>

      {isLoading ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">Loading forecasting summary...</div> : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          <div className="font-semibold">Unable to load probabilistic forecasting summary.</div>
          <p className="mt-1 text-sm">Check Decision Intelligence access, tenant context, and whether the selected filters are valid for the backend contract.</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Retry
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Models" value={data.models?.length || 0} />
            <MetricCard label="Intervals" value={data.intervals?.length || 0} />
            <MetricCard label="Risk probabilities" value={data.risk_probabilities?.length || 0} />
            <MetricCard label="Calibration observations" value={data.calibration?.length || 0} />
          </div>

          {totalForecastRecords === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              No probabilistic forecast models, intervals, risk probabilities, or calibration observations match the current filters yet.
              Clear filters or confirm that tenant forecasting evidence has been loaded.
            </div>
          ) : null}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast calibration feedback loop</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Checks whether forecasts have actual outcomes, interval-capture evidence, error tolerance review, and high-risk manual review before advisory expansion.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(feedback?.calibration_feedback_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Feedback score" value={feedback?.calibration_feedback_score} />
              <MetricCard label="Ready checks" value={feedback?.ready_check_count || 0} />
              <MetricCard label="Blocked checks" value={feedback?.blocked_check_count || 0} />
              <MetricCard label="Capture rate" value={feedback?.calibration_capture_rate} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Average error" value={feedback?.average_absolute_error} />
              <MetricCard label="Missed intervals" value={feedback?.missed_interval_count || 0} />
              <MetricCard label="High-error observations" value={feedback?.high_error_count || 0} />
              <MetricCard label="High-risk forecasts" value={feedback?.high_risk_forecast_count || 0} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Calibration feedback checks" items={feedback?.feedback_checks} />
            <CheckList title="Calibration feedback blockers" items={feedback?.feedback_blockers} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast outcome reconciliation</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Reviews observed forecast outcomes against probabilistic confidence signals before confidence is increased, reduced, recalibrated, or retired.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Status</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(reconciliation?.status)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Reconciliation score" value={reconciliation?.reconciliation_score} />
              <MetricCard label="Outcome coverage" value={reconciliation?.outcome_coverage_score} />
              <MetricCard label="Reconciled outcomes" value={reconciliation?.reconciled_outcome_count || 0} />
              <MetricCard label="Missed outcomes" value={reconciliation?.missed_outcome_count || 0} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Manual recalibration / retirement decision contract</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>Required before confidence increase: {formatValue(reconciliation?.manual_review_contract?.required_before_confidence_increase)}</div>
                <div>Allowed decisions: {(reconciliation?.manual_review_contract?.allowed_decisions || []).map(formatValue).join(', ') || '—'}</div>
                <div>Required evidence: {(reconciliation?.manual_review_contract?.required_evidence || []).map(formatValue).join(', ') || '—'}</div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Outcome reconciliation checks" items={reconciliation?.checks} />
            <CheckList title="Outcome reconciliation blockers" items={reconciliation?.blockers} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast confidence drift guard</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Detects whether observed forecast errors, missed confidence intervals, low calibration scores, and high-risk forecasts require manual recalibration, confidence reduction, or pattern retirement.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(confidenceDriftGuard?.drift_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Drift score" value={confidenceDriftGuard?.confidence_drift_score} />
              <MetricCard label="Recalibration pressure" value={confidenceDriftGuard?.recalibration_pressure_score} />
              <MetricCard label="Drift signals" value={confidenceDriftGuard?.drift_signal_count || 0} />
              <MetricCard label="Blocked checks" value={confidenceDriftGuard?.blocked_check_count || 0} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Observed outcomes" value={confidenceDriftGuard?.observed_outcome_count || 0} />
              <MetricCard label="High-error observations" value={confidenceDriftGuard?.high_error_observation_count || 0} />
              <MetricCard label="Low calibration scores" value={confidenceDriftGuard?.low_calibration_score_count || 0} />
              <MetricCard label="High-risk forecasts" value={confidenceDriftGuard?.high_risk_forecast_count || 0} />
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Confidence drift checks" items={confidenceDriftGuard?.confidence_drift_checks} />
            <CheckList title="Confidence drift blockers" items={confidenceDriftGuard?.confidence_drift_blockers} />
          </div>


          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast pattern retirement guard</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Determines whether repeated misses, high error drift, low calibration scores, and missing replacement candidates allow a forecast pattern to be retired safely.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Recommendation</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(retirementGuard?.retirement_recommendation)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Retirement readiness" value={retirementGuard?.retirement_readiness_score} />
              <MetricCard label="Retirement signals" value={retirementGuard?.retirement_signal_count || 0} />
              <MetricCard label="Monitor checks" value={retirementGuard?.monitor_check_count || 0} />
              <MetricCard label="Blocked checks" value={retirementGuard?.blocked_check_count || 0} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Observed outcomes" value={retirementGuard?.observed_outcome_count || 0} />
              <MetricCard label="Missed outcomes" value={retirementGuard?.missed_outcome_count || 0} />
              <MetricCard label="Approved replacements" value={retirementGuard?.approved_replacement_model_count || 0} />
              <MetricCard label="Review replacements" value={retirementGuard?.review_replacement_model_count || 0} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Retirement evidence contract</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>Observed history required: {formatValue(retirementGuard?.retirement_contract?.requires_observed_outcome_history)}</div>
                <div>Replacement required: {formatValue(retirementGuard?.retirement_contract?.requires_replacement_candidate_before_retirement)}</div>
                <div>Manual signoff required: {formatValue(retirementGuard?.retirement_contract?.requires_manual_reviewer_signoff)}</div>
                <div>Allowed decisions: {(retirementGuard?.retirement_contract?.allowed_decisions || []).map(formatValue).join(', ') || '—'}</div>
                <div>Required evidence: {(retirementGuard?.retirement_contract?.required_evidence || []).map(formatValue).join(', ') || '—'}</div>
                <div>Autonomous retirement: {formatValue(retirementGuard?.retirement_contract?.allows_autonomous_forecast_retirement)}</div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Retirement guard checks" items={retirementGuard?.retirement_checks} />
            <CheckList title="Retirement guard blockers" items={retirementGuard?.retirement_blockers} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast replacement readiness gate</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Confirms a qualified replacement candidate, calibration evidence, manual cutover approval, and fallback path exist before a weak forecast pattern is replaced.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(replacementGate?.replacement_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Replacement readiness" value={replacementGate?.replacement_readiness_score} />
              <MetricCard label="Replacement needed" value={replacementGate?.replacement_needed} />
              <MetricCard label="Candidate count" value={replacementGate?.replacement_candidate_count || 0} />
              <MetricCard label="Blocked checks" value={replacementGate?.blocked_check_count || 0} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Approved replacements" value={replacementGate?.approved_replacement_model_count || 0} />
              <MetricCard label="Review replacements" value={replacementGate?.review_replacement_model_count || 0} />
              <MetricCard label="Weak replacements" value={replacementGate?.weak_replacement_model_count || 0} />
              <MetricCard label="Observed calibration" value={replacementGate?.observed_calibration_count || 0} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Replacement cutover contract</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>Candidate before retirement: {formatValue(replacementGate?.replacement_contract?.requires_candidate_before_retirement)}</div>
                <div>Calibration history required: {formatValue(replacementGate?.replacement_contract?.requires_observed_calibration_history)}</div>
                <div>Manual cutover approval: {formatValue(replacementGate?.replacement_contract?.requires_manual_cutover_approval)}</div>
                <div>Fallback required: {formatValue(replacementGate?.replacement_contract?.requires_fallback_to_previous_pattern)}</div>
                <div>Allowed decisions: {(replacementGate?.replacement_contract?.allowed_decisions || []).map(formatValue).join(', ') || '—'}</div>
                <div>Required evidence: {(replacementGate?.replacement_contract?.required_evidence || []).map(formatValue).join(', ') || '—'}</div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Replacement readiness checks" items={replacementGate?.replacement_checks} />
            <CheckList title="Replacement readiness blockers" items={replacementGate?.replacement_blockers} />
          </div>


          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast monitoring SLA contract</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Confirms active forecast scope, observed outcome feed, drift review cadence, high-risk escalation windows, and manual cutover SLA coverage before forecasts are trusted operationally.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(monitoringSla?.sla_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="SLA score" value={monitoringSla?.monitoring_sla_score} />
              <MetricCard label="Incident pressure" value={monitoringSla?.incident_pressure_score} />
              <MetricCard label="Active models" value={monitoringSla?.active_model_count || 0} />
              <MetricCard label="Observed outcomes" value={monitoringSla?.observed_outcome_count || 0} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="High-risk forecasts" value={monitoringSla?.high_risk_forecast_count || 0} />
              <MetricCard label="Drift signals" value={monitoringSla?.drift_signal_count || 0} />
              <MetricCard label="Retirement signals" value={monitoringSla?.retirement_signal_count || 0} />
              <MetricCard label="Blocked checks" value={monitoringSla?.blocked_check_count || 0} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Monitoring SLA evidence contract</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>Active scope required: {formatValue(monitoringSla?.monitoring_sla_contract?.requires_active_forecast_scope)}</div>
                <div>Outcome feed required: {formatValue(monitoringSla?.monitoring_sla_contract?.requires_observed_outcome_feed)}</div>
                <div>Drift review SLA: {formatValue(monitoringSla?.monitoring_sla_contract?.requires_drift_review_sla)}</div>
                <div>High-risk escalation: {formatValue(monitoringSla?.monitoring_sla_contract?.requires_high_risk_escalation_window)}</div>
                <div>Cutover SLA: {formatValue(monitoringSla?.monitoring_sla_contract?.requires_retirement_replacement_cutover_sla)}</div>
                <div>Autonomous application: {formatValue(monitoringSla?.monitoring_sla_contract?.allows_autonomous_forecast_application)}</div>
                <div>Allowed decisions: {(monitoringSla?.monitoring_sla_contract?.allowed_decisions || []).map(formatValue).join(', ') || '—'}</div>
                <div>Required evidence: {(monitoringSla?.monitoring_sla_contract?.required_evidence || []).map(formatValue).join(', ') || '—'}</div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Monitoring SLA checks" items={monitoringSla?.monitoring_sla_checks} />
            <CheckList title="Monitoring SLA blockers" items={monitoringSla?.monitoring_sla_blockers} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast degradation incident workflow</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Escalates forecast degradation when drift, SLA blockers, high-risk forecasts, repeated misses, or replacement blockers require manual triage and containment.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(degradationWorkflow?.incident_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Workflow score" value={degradationWorkflow?.degradation_workflow_score} />
              <MetricCard label="Incident pressure" value={degradationWorkflow?.incident_pressure_score} />
              <MetricCard label="Incident signals" value={degradationWorkflow?.incident_signal_count || 0} />
              <MetricCard label="Open blockers" value={degradationWorkflow?.open_blocker_count || 0} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="High-error observations" value={degradationWorkflow?.high_error_observation_count || 0} />
              <MetricCard label="Missed intervals" value={degradationWorkflow?.missed_interval_count || 0} />
              <MetricCard label="High-risk forecasts" value={degradationWorkflow?.high_risk_forecast_count || 0} />
              <MetricCard label="Blocked checks" value={degradationWorkflow?.blocked_check_count || 0} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Degradation incident contract</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>Forecast scope required: {formatValue(degradationWorkflow?.degradation_incident_contract?.requires_forecast_scope)}</div>
                <div>Failure signal required: {formatValue(degradationWorkflow?.degradation_incident_contract?.requires_observed_failure_signal)}</div>
                <div>SLA owner required: {formatValue(degradationWorkflow?.degradation_incident_contract?.requires_monitoring_sla_owner)}</div>
                <div>Manual triage required: {formatValue(degradationWorkflow?.degradation_incident_contract?.requires_manual_triage)}</div>
                <div>Autonomous incident creation: {formatValue(degradationWorkflow?.degradation_incident_contract?.allows_autonomous_incident_creation)}</div>
                <div>Autonomous application: {formatValue(degradationWorkflow?.degradation_incident_contract?.allows_autonomous_forecast_application)}</div>
                <div>Allowed decisions: {(degradationWorkflow?.degradation_incident_contract?.allowed_decisions || []).map(formatValue).join(', ') || '—'}</div>
                <div>Required evidence: {(degradationWorkflow?.degradation_incident_contract?.required_evidence || []).map(formatValue).join(', ') || '—'}</div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CheckList title="Degradation incident checks" items={degradationWorkflow?.degradation_incident_checks} />
            <CheckList title="Degradation incident blockers" items={degradationWorkflow?.degradation_incident_blockers} />
          </div>


          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast lifecycle control board</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Consolidates calibration, outcome reconciliation, drift, retirement, replacement, SLA, and degradation workflow readiness into one commercial advisory control decision.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(lifecycleBoard?.lifecycle_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Control score" value={lifecycleBoard?.lifecycle_control_score} />
              <MetricCard label="Average component score" value={lifecycleBoard?.average_component_score} />
              <MetricCard label="Available components" value={`${lifecycleBoard?.available_component_count || 0}/${lifecycleBoard?.lifecycle_component_count || 0}`} />
              <MetricCard label="Open blockers" value={lifecycleBoard?.open_blocker_count || 0} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Weak components" value={lifecycleBoard?.weak_component_count || 0} />
              <MetricCard label="Ready checks" value={lifecycleBoard?.ready_check_count || 0} />
              <MetricCard label="Monitor checks" value={lifecycleBoard?.monitor_check_count || 0} />
              <MetricCard label="Blocked checks" value={lifecycleBoard?.blocked_check_count || 0} />
            </div>

            <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900">Lifecycle control contract</h3>
              <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>All components required: {formatValue(lifecycleBoard?.lifecycle_control_contract?.requires_all_lifecycle_components)}</div>
                <div>No blockers for commercial ready: {formatValue(lifecycleBoard?.lifecycle_control_contract?.requires_no_open_blockers_for_commercial_ready_status)}</div>
                <div>Manual stabilization review: {formatValue(lifecycleBoard?.lifecycle_control_contract?.requires_manual_stabilization_review_before_operational_trust)}</div>
                <div>Autonomous application: {formatValue(lifecycleBoard?.lifecycle_control_contract?.allows_autonomous_forecast_application)}</div>
                <div>Operational mutation: {formatValue(lifecycleBoard?.lifecycle_control_contract?.allows_operational_state_mutation)}</div>
                <div>Allowed decisions: {(lifecycleBoard?.lifecycle_control_contract?.allowed_decisions || []).map(formatValue).join(', ') || '—'}</div>
                <div>Required evidence: {(lifecycleBoard?.lifecycle_control_contract?.required_evidence || []).map(formatValue).join(', ') || '—'}</div>
              </div>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <CheckList title="Lifecycle components" items={lifecycleBoard?.lifecycle_components} />
            <CheckList title="Lifecycle control checks" items={lifecycleBoard?.lifecycle_control_checks} />
            <CheckList title="Lifecycle control blockers" items={lifecycleBoard?.lifecycle_control_blockers} />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Forecast response contract audit</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Confirms every rendered forecasting panel has a backend summary object before more forecasting UI is added.
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3 text-right">
                <div className="text-xs font-semibold uppercase text-slate-500">Decision</div>
                <div className="mt-1 font-bold text-slate-900">{formatValue(contractAudit?.contract_decision)}</div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <MetricCard label="Contract score" value={contractAudit?.contract_score} />
              <MetricCard label="Coverage score" value={contractAudit?.response_coverage_score} />
              <MetricCard label="Expected keys" value={contractAudit?.expected_response_keys?.length || 0} />
              <MetricCard label="Missing keys" value={(contractAudit?.missing_expected_response_keys?.length || 0) + (contractAudit?.missing_frontend_panel_keys?.length || 0)} />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <CheckList title="Forecast contract checks" items={contractAudit?.contract_checks} />
              <CheckList title="Forecast contract blockers" items={contractAudit?.contract_blockers} />
            </div>
          </section>

        </>
      ) : null}
    </div>
  );
}
