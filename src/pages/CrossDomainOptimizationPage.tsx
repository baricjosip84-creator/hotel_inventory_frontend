import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import './decisionIntelligencePages.css';

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
const LIMIT_OPTIONS = ['25', '50', '100', '200'];

type OptimizationFilterState = {
  optimization_domain: string;
  optimization_status: string;
  objective_type: string;
  option_status: string;
  impact_direction: string;
  limit: string;
};

const DEFAULT_FILTERS: OptimizationFilterState = {
  optimization_domain: '',
  optimization_status: '',
  objective_type: '',
  option_status: '',
  impact_direction: '',
  limit: '25'
};

const FILTER_LABELS: Record<keyof OptimizationFilterState, string> = {
  optimization_domain: 'Optimization domain',
  optimization_status: 'Optimization status',
  objective_type: 'Objective type',
  option_status: 'Option status',
  impact_direction: 'Impact direction',
  limit: 'Result limit'
};

type OptimizationSummary = {
  feature?: string;
  governance?: Record<string, unknown>;
  execution_feedback_loop?: {
    feedback_loop_type?: string;
    execution_mode?: string;
    execution_feedback_decision?: string;
    execution_feedback_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    approved_manual_plan_option_count?: number;
    governance_review_option_count?: number;
    ranked_option_count?: number;
    negative_or_mixed_tradeoff_count?: number;
    high_impact_tradeoff_count?: number;
    average_option_score?: number | null;
    observed_domains?: string[];
    observed_objective_types?: string[];
    feedback_capture_contract?: Record<string, unknown>;
    feedback_blockers?: Array<Record<string, unknown>>;
    feedback_checks?: Array<Record<string, unknown>>;
  };
  promotion_guard?: {
    promotion_guard_type?: string;
    execution_mode?: string;
    promotion_decision?: string;
    promotion_guard_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    approved_manual_plan_option_count?: number;
    measured_option_count?: number;
    average_option_score?: number | null;
    high_risk_tradeoff_count?: number;
    observed_domains?: string[];
    promotion_contract?: Record<string, unknown>;
    promotion_blockers?: Array<Record<string, unknown>>;
    promotion_checks?: Array<Record<string, unknown>>;
  };

  drift_response_plan?: {
    drift_response_type?: string;
    execution_mode?: string;
    drift_response_decision?: string;
    drift_response_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    measured_option_count?: number;
    low_score_option_count?: number;
    negative_or_mixed_tradeoff_count?: number;
    high_risk_tradeoff_count?: number;
    active_manual_run_count?: number;
    observed_domains?: string[];
    response_contract?: Record<string, unknown>;
    drift_response_blockers?: Array<Record<string, unknown>>;
    drift_response_checks?: Array<Record<string, unknown>>;
  };
  pattern_lifecycle_review?: {
    lifecycle_review_type?: string;
    execution_mode?: string;
    lifecycle_decision?: string;
    lifecycle_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    measured_option_count?: number;
    strong_pattern_candidate_count?: number;
    weak_pattern_candidate_count?: number;
    high_risk_tradeoff_count?: number;
    active_manual_owner_count?: number;
    observed_domains?: string[];
    lifecycle_contract?: Record<string, unknown>;
    lifecycle_blockers?: Array<Record<string, unknown>>;
    lifecycle_checks?: Array<Record<string, unknown>>;
  };
  portfolio_scaling_guard?: {
    portfolio_scaling_guard_type?: string;
    execution_mode?: string;
    portfolio_scaling_decision?: string;
    portfolio_scaling_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    measured_option_count?: number;
    strong_pattern_candidate_count?: number;
    scalable_pattern_candidate_count?: number;
    high_risk_tradeoff_count?: number;
    governance_queue_count?: number;
    observed_domains?: string[];
    observed_objective_types?: string[];
    portfolio_scaling_contract?: Record<string, unknown>;
    portfolio_scaling_blockers?: Array<Record<string, unknown>>;
    portfolio_scaling_checks?: Array<Record<string, unknown>>;
  };
  pattern_monitoring_plan?: {
    monitoring_plan_type?: string;
    execution_mode?: string;
    monitoring_decision?: string;
    monitoring_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    approved_manual_plan_option_count?: number;
    measured_option_count?: number;
    average_option_score?: number | null;
    high_risk_tradeoff_count?: number;
    observed_domains?: string[];
    observed_objective_types?: string[];
    monitoring_contract?: Record<string, unknown>;
    monitoring_blockers?: Array<Record<string, unknown>>;
    monitoring_checks?: Array<Record<string, unknown>>;
  };
  trial_reconciliation?: {
    reconciliation_type?: string;
    execution_mode?: string;
    reconciliation_decision?: string;
    reconciliation_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    approved_manual_plan_option_count?: number;
    measured_option_count?: number;
    high_impact_tradeoff_count?: number;
    observed_domains?: string[];
    observed_objective_types?: string[];
    reconciliation_contract?: Record<string, unknown>;
    reconciliation_blockers?: Array<Record<string, unknown>>;
    reconciliation_checks?: Array<Record<string, unknown>>;
  };
  optimization_runs?: Array<Record<string, unknown>>;
  objectives?: Array<Record<string, unknown>>;
  options?: Array<Record<string, unknown>>;
  tradeoffs?: Array<Record<string, unknown>>;
};

const formatLabel = (value: unknown) => String(value ?? 'n/a').replace(/_/g, ' ');

const formatDateTime = (timestamp: number) => {
  if (!timestamp) return 'Not loaded yet';
  return new Date(timestamp).toLocaleString();
};

const formatOptionLabel = (value: string) => value.replaceAll('_', ' ');

function FilterSelect({
  name,
  value,
  options,
  onChange,
  allowAll = true
}: {
  name: keyof OptimizationFilterState;
  value: string;
  options: string[];
  onChange: (name: keyof OptimizationFilterState, value: string) => void;
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

function StatCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{String(value ?? 'n/a')}</strong>
    </div>
  );
}

function SimpleTable({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  const columns = rows.length ? Object.keys(rows[0]).slice(0, 5) : [];
  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>{title}</h2>
          <p className="card__subtext">{rows.length} records</p>
        </div>
      </div>
      {rows.length ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>{columns.map((column) => <th key={column}>{formatLabel(column)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((row, index) => (
                <tr key={`${title}-${index}`}>
                  {columns.map((column) => <td key={column}>{typeof row[column] === 'object' ? JSON.stringify(row[column]) : String(row[column] ?? '—')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No records returned for the current optimization summary.</p>}
    </section>
  );
}

export default function CrossDomainOptimizationPage() {
  const [filters, setFilters] = useState<OptimizationFilterState>(DEFAULT_FILTERS);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    (Object.entries(filters) as Array<[keyof OptimizationFilterState, string]>).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    if (!params.has('limit')) {
      params.set('limit', DEFAULT_FILTERS.limit);
    }
    return params.toString();
  }, [filters]);

  const summaryQuery = useQuery({
    queryKey: ['cross-domain-optimization-summary', filters],
    queryFn: () => apiRequest<OptimizationSummary>(`/decision-intelligence/cross-domain-optimization-summary?${queryString}`)
  });

  const updateFilter = (name: keyof OptimizationFilterState, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'limit' && Boolean(value)) || filters.limit !== DEFAULT_FILTERS.limit;

  const summary = summaryQuery.data;
  const loop = summary?.execution_feedback_loop;
  const reconciliation = summary?.trial_reconciliation;
  const promotionGuard = summary?.promotion_guard;
  const monitoringPlan = summary?.pattern_monitoring_plan;
  const driftResponsePlan = summary?.drift_response_plan;
  const lifecycleReview = summary?.pattern_lifecycle_review;
  const portfolioScalingGuard = summary?.portfolio_scaling_guard;
  const governance = summary?.governance || {};
  const totalOptimizationRecords = (summary?.optimization_runs?.length || 0) + (summary?.objectives?.length || 0) + (summary?.options?.length || 0) + (summary?.tradeoffs?.length || 0);

  return (
    <div className="decision-intelligence-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Decision Intelligence</p>
          <h1>Cross-Domain Optimization</h1>
          <p className="page-subtitle">
            Review optimization runs, objectives, options, tradeoffs, and the new manual execution feedback loop before any operational trial evidence is captured.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          <div className="font-medium text-slate-900">Last refreshed</div>
          <div className="mt-1">{formatDateTime(summaryQuery.dataUpdatedAt)}</div>
          <button
            type="button"
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={() => summaryQuery.refetch()}
            disabled={summaryQuery.isFetching}
          >
            {summaryQuery.isFetching && !summaryQuery.isLoading ? 'Refreshing...' : 'Refresh summary'}
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" style={{ marginBottom: 16 }}>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Optimization filters</h2>
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
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FilterSelect name="optimization_domain" value={filters.optimization_domain} options={OPTIMIZATION_DOMAIN_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="optimization_status" value={filters.optimization_status} options={OPTIMIZATION_STATUS_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="objective_type" value={filters.objective_type} options={OBJECTIVE_TYPE_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="option_status" value={filters.option_status} options={OPTION_STATUS_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="impact_direction" value={filters.impact_direction} options={IMPACT_DIRECTION_OPTIONS} onChange={updateFilter} />
          <FilterSelect name="limit" value={filters.limit} options={LIMIT_OPTIONS} onChange={updateFilter} allowAll={false} />
        </div>
      </section>

      {summaryQuery.isLoading ? <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600" style={{ marginBottom: 16 }}>Loading cross-domain optimization summary...</div> : null}

      {summaryQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700" style={{ marginBottom: 16 }}>
          <div className="font-semibold">Unable to load cross-domain optimization summary.</div>
          <p className="mt-1 text-sm">Check Decision Intelligence access, tenant context, and whether the selected filters are valid for the backend contract.</p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-red-300"
            onClick={() => summaryQuery.refetch()}
            disabled={summaryQuery.isFetching}
          >
            Retry
          </button>
        </div>
      ) : null}

      {summary && totalOptimizationRecords === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800" style={{ marginBottom: 16 }}>
          No cross-domain optimization runs, objectives, options, or tradeoffs match the current filters yet. Clear filters or confirm that tenant optimization evidence has been loaded.
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard label="Posture" value={governance.cross_domain_optimization_posture || (summaryQuery.isLoading ? 'loading' : 'unknown')} />
        <StatCard label="Runs" value={governance.optimization_run_count ?? 0} />
        <StatCard label="Options" value={governance.option_count ?? 0} />
        <StatCard label="Tradeoffs" value={governance.tradeoff_count ?? 0} />
        <StatCard label="Feedback score" value={loop?.execution_feedback_score ?? 0} />
        <StatCard label="Reconciliation score" value={reconciliation?.reconciliation_score ?? 0} />
        <StatCard label="Promotion guard" value={promotionGuard?.promotion_guard_score ?? 0} />
        <StatCard label="Monitoring score" value={monitoringPlan?.monitoring_score ?? 0} />
        <StatCard label="Drift response" value={driftResponsePlan?.drift_response_score ?? 0} />
        <StatCard label="Lifecycle review" value={lifecycleReview?.lifecycle_score ?? 0} />
        <StatCard label="Portfolio scaling" value={portfolioScalingGuard?.portfolio_scaling_score ?? 0} />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <h2>Optimization execution feedback loop</h2>
            <p className="card__subtext">Decision: {formatLabel(loop?.execution_feedback_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Ready checks" value={loop?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={loop?.blocked_check_count ?? 0} />
          <StatCard label="Approved options" value={loop?.approved_manual_plan_option_count ?? 0} />
          <StatCard label="High-impact tradeoffs" value={loop?.high_impact_tradeoff_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Feedback endpoint: {String(loop?.feedback_capture_contract?.required_feedback_endpoint || '/decision-intelligence-feedback/optimization-results')}
        </p>
        <p className="card__subtext">Observed domains: {(loop?.observed_domains || []).join(', ') || 'none'}</p>

        {(loop?.feedback_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Manual blockers</h3>
            <ul>
              {(loop?.feedback_blockers || []).map((blocker, index) => (
                <li key={`blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No feedback-loop blockers returned.</p>}
      </section>


      <section className="card">
        <div className="card__header">
          <div>
            <h2>Manual trial outcome reconciliation</h2>
            <p className="card__subtext">Decision: {formatLabel(reconciliation?.reconciliation_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Reconciliation score" value={reconciliation?.reconciliation_score ?? 0} />
          <StatCard label="Ready checks" value={reconciliation?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={reconciliation?.blocked_check_count ?? 0} />
          <StatCard label="Measured options" value={reconciliation?.measured_option_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Required feedback endpoint: {String(reconciliation?.reconciliation_contract?.required_feedback_endpoint || '/decision-intelligence-feedback/optimization-results')}
        </p>
        <p className="card__subtext">Observed domains: {(reconciliation?.observed_domains || []).join(', ') || 'none'}</p>

        {(reconciliation?.reconciliation_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Reconciliation blockers</h3>
            <ul>
              {(reconciliation?.reconciliation_blockers || []).map((blocker, index) => (
                <li key={`reconciliation-blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No trial reconciliation blockers returned.</p>}
      </section>


      <section className="card">
        <div className="card__header">
          <div>
            <h2>Manual pattern promotion guard</h2>
            <p className="card__subtext">Decision: {formatLabel(promotionGuard?.promotion_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Promotion score" value={promotionGuard?.promotion_guard_score ?? 0} />
          <StatCard label="Ready checks" value={promotionGuard?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={promotionGuard?.blocked_check_count ?? 0} />
          <StatCard label="High-risk tradeoffs" value={promotionGuard?.high_risk_tradeoff_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Promotion scope: {String(promotionGuard?.promotion_contract?.promotion_scope || 'manual_reusable_optimization_pattern_review')}
        </p>
        <p className="card__subtext">Observed domains: {(promotionGuard?.observed_domains || []).join(', ') || 'none'}</p>

        {(promotionGuard?.promotion_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Promotion blockers</h3>
            <ul>
              {(promotionGuard?.promotion_blockers || []).map((blocker, index) => (
                <li key={`promotion-blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No promotion guard blockers returned.</p>}
      </section>


      <section className="card">
        <div className="card__header">
          <div>
            <h2>Promoted pattern monitoring plan</h2>
            <p className="card__subtext">Decision: {formatLabel(monitoringPlan?.monitoring_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Monitoring score" value={monitoringPlan?.monitoring_score ?? 0} />
          <StatCard label="Ready checks" value={monitoringPlan?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={monitoringPlan?.blocked_check_count ?? 0} />
          <StatCard label="High-risk tradeoffs" value={monitoringPlan?.high_risk_tradeoff_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Cadence: {String(monitoringPlan?.monitoring_contract?.recommended_cadence || 'blocked_until_manual_scope_review')}
        </p>
        <p className="card__subtext">Observed domains: {(monitoringPlan?.observed_domains || []).join(', ') || 'none'}</p>

        {(monitoringPlan?.monitoring_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Monitoring blockers</h3>
            <ul>
              {(monitoringPlan?.monitoring_blockers || []).map((blocker, index) => (
                <li key={`monitoring-blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No monitoring blockers returned.</p>}
      </section>


      <section className="card">
        <div className="card__header">
          <div>
            <h2>Optimization drift response plan</h2>
            <p className="card__subtext">Decision: {formatLabel(driftResponsePlan?.drift_response_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Drift response score" value={driftResponsePlan?.drift_response_score ?? 0} />
          <StatCard label="Ready checks" value={driftResponsePlan?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={driftResponsePlan?.blocked_check_count ?? 0} />
          <StatCard label="Low-score options" value={driftResponsePlan?.low_score_option_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Response scope: {String(driftResponsePlan?.response_contract?.response_scope || 'manual_cross_domain_optimization_drift_response')}
        </p>
        <p className="card__subtext">Observed domains: {(driftResponsePlan?.observed_domains || []).join(', ') || 'none'}</p>

        {(driftResponsePlan?.drift_response_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Drift response blockers</h3>
            <ul>
              {(driftResponsePlan?.drift_response_blockers || []).map((blocker, index) => (
                <li key={`drift-response-blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No drift response blockers returned.</p>}
      </section>



      <section className="card">
        <div className="card__header">
          <div>
            <h2>Optimization pattern lifecycle review</h2>
            <p className="card__subtext">Decision: {formatLabel(lifecycleReview?.lifecycle_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Lifecycle score" value={lifecycleReview?.lifecycle_score ?? 0} />
          <StatCard label="Ready checks" value={lifecycleReview?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={lifecycleReview?.blocked_check_count ?? 0} />
          <StatCard label="Strong patterns" value={lifecycleReview?.strong_pattern_candidate_count ?? 0} />
          <StatCard label="Weak patterns" value={lifecycleReview?.weak_pattern_candidate_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Review scope: {String(lifecycleReview?.lifecycle_contract?.review_scope || 'manual_cross_domain_optimization_pattern_lifecycle_review')}
        </p>
        <p className="card__subtext">Observed domains: {(lifecycleReview?.observed_domains || []).join(', ') || 'none'}</p>

        {(lifecycleReview?.lifecycle_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Lifecycle blockers</h3>
            <ul>
              {(lifecycleReview?.lifecycle_blockers || []).map((blocker, index) => (
                <li key={`lifecycle-blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No lifecycle review blockers returned.</p>}
      </section>


      <section className="card">
        <div className="card__header">
          <div>
            <h2>Optimization portfolio scaling guard</h2>
            <p className="card__subtext">Decision: {formatLabel(portfolioScalingGuard?.portfolio_scaling_decision || 'not loaded')}</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <StatCard label="Scaling score" value={portfolioScalingGuard?.portfolio_scaling_score ?? 0} />
          <StatCard label="Ready checks" value={portfolioScalingGuard?.ready_check_count ?? 0} />
          <StatCard label="Blocked checks" value={portfolioScalingGuard?.blocked_check_count ?? 0} />
          <StatCard label="Scalable patterns" value={portfolioScalingGuard?.scalable_pattern_candidate_count ?? 0} />
          <StatCard label="Governance queue" value={portfolioScalingGuard?.governance_queue_count ?? 0} />
        </div>
        <p className="card__subtext" style={{ marginTop: 12 }}>
          Review scope: {String(portfolioScalingGuard?.portfolio_scaling_contract?.review_scope || 'manual_cross_domain_optimization_portfolio_scaling_review')}
        </p>
        <p className="card__subtext">Observed domains: {(portfolioScalingGuard?.observed_domains || []).join(', ') || 'none'}</p>

        {(portfolioScalingGuard?.portfolio_scaling_blockers || []).length ? (
          <div style={{ marginTop: 12 }}>
            <h3>Portfolio scaling blockers</h3>
            <ul>
              {(portfolioScalingGuard?.portfolio_scaling_blockers || []).map((blocker, index) => (
                <li key={`portfolio-scaling-blocker-${index}`}>
                  <strong>{formatLabel(blocker.blocker_key)}</strong>: {formatLabel(blocker.manual_resolution)}
                </li>
              ))}
            </ul>
          </div>
        ) : <p className="card__subtext" style={{ marginTop: 12 }}>No portfolio scaling blockers returned.</p>}
      </section>

      <SimpleTable title="Optimization runs" rows={summary?.optimization_runs || []} />
      <SimpleTable title="Objectives" rows={summary?.objectives || []} />
      <SimpleTable title="Options" rows={summary?.options || []} />
      <SimpleTable title="Tradeoffs" rows={summary?.tradeoffs || []} />
    </div>
  );
}
