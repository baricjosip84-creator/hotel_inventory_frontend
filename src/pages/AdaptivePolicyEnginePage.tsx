import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';

type AdaptivePolicyLearningFeedbackLoop = {
  feedback_loop_type?: string;
  execution_mode?: string;
  policy_application_mode?: string;
  learning_feedback_decision?: string;
  learning_feedback_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  policy_count?: number;
  signal_count?: number;
  recommendation_count?: number;
  effectiveness_measurement_count?: number;
  recommendation_ready_policy_count?: number;
  review_required_policy_count?: number;
  manual_application_approved_policy_count?: number;
  review_required_recommendation_count?: number;
  high_risk_recommendation_count?: number;
  average_confidence_score?: number | null;
  average_effectiveness_delta?: number | null;
  observed_domains?: string[];
  feedback_contract?: Record<string, unknown>;
  feedback_blockers?: Array<Record<string, unknown>>;
  feedback_checks?: Array<Record<string, unknown>>;
};


type AdaptivePolicyOutcomeReconciliation = {
  reconciliation_type?: string;
  execution_mode?: string;
  policy_application_mode?: string;
  outcome_reconciliation_decision?: string;
  outcome_reconciliation_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  approved_policy_count?: number;
  effectiveness_measurement_count?: number;
  positive_outcome_count?: number;
  neutral_outcome_count?: number;
  negative_outcome_count?: number;
  low_confidence_outcome_count?: number;
  high_risk_recommendation_count?: number;
  reconciled_policy_count?: number;
  recommendation_outcome_coverage_count?: number;
  average_effectiveness_delta?: number | null;
  average_outcome_confidence?: number | null;
  reconciliation_contract?: Record<string, unknown>;
  reconciliation_blockers?: Array<Record<string, unknown>>;
  reconciliation_checks?: Array<Record<string, unknown>>;
};

type AdaptivePolicyPromotionGuard = {
  promotion_guard_type?: string;
  execution_mode?: string;
  policy_application_mode?: string;
  promotion_decision?: string;
  promotion_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  approved_policy_count?: number;
  promotion_candidate_count?: number;
  high_risk_promotion_candidate_count?: number;
  promotion_evidence_policy_count?: number;
  positive_outcome_count?: number;
  negative_outcome_count?: number;
  low_confidence_outcome_count?: number;
  average_promotion_confidence?: number | null;
  average_outcome_confidence?: number | null;
  promotion_contract?: Record<string, unknown>;
  promotion_blockers?: Array<Record<string, unknown>>;
  promotion_checks?: Array<Record<string, unknown>>;
};


type AdaptivePolicyPostPromotionMonitoring = {
  monitoring_type?: string;
  execution_mode?: string;
  policy_application_mode?: string;
  monitoring_decision?: string;
  monitoring_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  approved_policy_count?: number;
  retired_policy_count?: number;
  approved_policy_measurement_count?: number;
  approved_policy_signal_count?: number;
  stale_or_unmeasured_approved_policy_count?: number;
  negative_outcome_count?: number;
  severe_negative_outcome_count?: number;
  low_confidence_outcome_count?: number;
  high_risk_recommendation_count?: number;
  average_effectiveness_delta?: number | null;
  average_outcome_confidence?: number | null;
  monitoring_contract?: Record<string, unknown>;
  monitoring_blockers?: Array<Record<string, unknown>>;
  monitoring_checks?: Array<Record<string, unknown>>;
};

type AdaptivePolicyRollbackRetirementGate = {
  gate_type?: string;
  execution_mode?: string;
  policy_application_mode?: string;
  rollback_retirement_decision?: string;
  rollback_retirement_score?: number | null;
  ready_check_count?: number;
  blocked_check_count?: number;
  approved_policy_count?: number;
  retired_policy_count?: number;
  approved_policy_with_negative_evidence_count?: number;
  approved_policy_with_severe_negative_evidence_count?: number;
  retired_policy_with_evidence_count?: number;
  negative_outcome_count?: number;
  severe_negative_outcome_count?: number;
  low_confidence_outcome_count?: number;
  high_risk_recommendation_count?: number;
  average_effectiveness_delta?: number | null;
  average_outcome_confidence?: number | null;
  rollback_retirement_contract?: Record<string, unknown>;
  rollback_retirement_blockers?: Array<Record<string, unknown>>;
  rollback_retirement_checks?: Array<Record<string, unknown>>;
};

type AdaptivePolicyResponseContractAudit = {
  audit_type?: string;
  execution_mode?: string;
  policy_application_mode?: string;
  contract_decision?: string;
  contract_score?: number | null;
  rendered_panel_count?: number;
  expected_response_key_count?: number;
  missing_response_key_count?: number;
  missing_response_keys?: string[];
  contract_checks?: Array<Record<string, unknown>>;
  contract_blockers?: Array<Record<string, unknown>>;
};

type AdaptivePolicySummary = {
  feature?: string;
  step?: number;
  governance?: Record<string, unknown>;
  policies?: Array<Record<string, unknown>>;
  signals?: Array<Record<string, unknown>>;
  recommendations?: Array<Record<string, unknown>>;
  effectiveness?: Array<Record<string, unknown>>;
  learning_feedback_loop?: AdaptivePolicyLearningFeedbackLoop;
  outcome_reconciliation?: AdaptivePolicyOutcomeReconciliation;
  promotion_guard?: AdaptivePolicyPromotionGuard;
  post_promotion_monitoring?: AdaptivePolicyPostPromotionMonitoring;
  rollback_retirement_gate?: AdaptivePolicyRollbackRetirementGate;
  response_contract_audit?: AdaptivePolicyResponseContractAudit;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function MetricCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
      <div style={{ color: '#62748a', fontSize: 13 }}>{label}</div>
      <strong style={{ display: 'block', marginTop: 6, fontSize: 22 }}>{formatValue(value)}</strong>
    </div>
  );
}

function CheckList({
  title,
  items,
  emptyMessage = 'No blockers or checks were returned for this section.'
}: {
  title: string;
  items?: Array<Record<string, unknown>>;
  emptyMessage?: string;
}) {
  return (
    <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {!items?.length ? (
        <p style={{ color: '#62748a' }}>{emptyMessage}</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item, index) => (
            <div key={`${title}-${index}`} style={{ borderTop: index ? '1px solid #eef2f6' : 0, paddingTop: index ? 10 : 0 }}>
              <strong>{formatValue(item.label || item.blocker_id || item.check_id || item.summary)}</strong>
              <div style={{ color: '#62748a', marginTop: 4 }}>{formatValue(item.required_next_step || item.summary || item.severity)}</div>
              {'passed' in item ? <div>Passed: {formatValue(item.passed)}</div> : null}
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', color: '#0f5b8f' }}>View read-only evidence details</summary>
                <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', background: '#f8fafc', borderRadius: 8, padding: 10 }}>
                  {JSON.stringify(item, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdaptivePolicyEnginePage() {
  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['adaptive-policy-engine-summary'],
    queryFn: () => apiRequest<AdaptivePolicySummary>('/decision-intelligence/adaptive-policy-engine-summary?limit=25')
  });

  const loop = data?.learning_feedback_loop;
  const reconciliation = data?.outcome_reconciliation;
  const promotionGuard = data?.promotion_guard;
  const postPromotionMonitoring = data?.post_promotion_monitoring;
  const rollbackRetirementGate = data?.rollback_retirement_gate;
  const responseContractAudit = data?.response_contract_audit;
  const policyCount = loop?.policy_count ?? data?.policies?.length ?? 0;
  const lastRefreshed = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Not refreshed yet';

  if (isLoading) {
    return <main style={{ padding: 24 }}>Loading adaptive policy engine…</main>;
  }

  if (error) {
    return (
      <main style={{ padding: 24, display: 'grid', gap: 16 }}>
        <h1>Adaptive Policy Engine</h1>
        <section style={{ border: '1px solid #f5c2c7', borderRadius: 12, padding: 16, background: '#fff5f5' }}>
          <h2 style={{ marginTop: 0 }}>Unable to load adaptive policy summary.</h2>
          <p style={{ color: '#7a271a' }}>Check Decision Intelligence access, tenant context, and the summary endpoint, then retry the read-only query.</p>
          <button type="button" onClick={() => void refetch()}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: 'grid', gap: 20 }}>
      <header style={{ display: 'grid', gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Adaptive Policy Engine</h1>
          <p style={{ color: '#62748a', marginTop: 0 }}>
            Governed policy observation, recommendation review, effectiveness evidence, and manual learning feedback readiness.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh summary'}
          </button>
          <span style={{ color: '#62748a' }}>Last refreshed: {lastRefreshed}</span>
        </div>
        <p style={{ color: '#62748a', margin: 0 }}>
          Deployment note: Command decision-intelligence pages require the frontend role-permission map that grants
          decision_intelligence.read to tenant admins and managers. Staff users remain excluded.
        </p>
      </header>

      {policyCount === 0 ? (
        <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
          <h2 style={{ marginTop: 0 }}>No adaptive policies returned</h2>
          <p style={{ color: '#62748a', marginBottom: 0 }}>
            The backend returned no adaptive policy records for this tenant and filter set. The page remains read-only; capture
            policy, signal, recommendation, or effectiveness evidence through the supported Decision Intelligence data paths before
            expecting readiness, promotion, or rollback blockers to appear here.
          </p>
        </section>
      ) : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <MetricCard label="Learning score" value={loop?.learning_feedback_score} />
        <MetricCard label="Decision" value={loop?.learning_feedback_decision} />
        <MetricCard label="Policies" value={loop?.policy_count ?? data?.policies?.length} />
        <MetricCard label="Signals" value={loop?.signal_count ?? data?.signals?.length} />
        <MetricCard label="Effectiveness measurements" value={loop?.effectiveness_measurement_count ?? data?.effectiveness?.length} />
        <MetricCard label="High-risk recommendations" value={loop?.high_risk_recommendation_count} />
      </section>

      <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Learning feedback loop</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <MetricCard label="Execution mode" value={loop?.execution_mode} />
          <MetricCard label="Policy application" value={loop?.policy_application_mode} />
          <MetricCard label="Ready checks" value={loop?.ready_check_count} />
          <MetricCard label="Blocked checks" value={loop?.blocked_check_count} />
          <MetricCard label="Average confidence" value={loop?.average_confidence_score} />
          <MetricCard label="Observed domains" value={loop?.observed_domains} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <CheckList title="Feedback blockers" items={loop?.feedback_blockers} />
        <CheckList title="Feedback checks" items={loop?.feedback_checks} />
      </div>


      <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Policy outcome reconciliation</h2>
        <p style={{ color: '#62748a', marginTop: 0 }}>
          Verifies manually applied policy outcomes before any policy pattern is promoted or reused.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <MetricCard label="Reconciliation score" value={reconciliation?.outcome_reconciliation_score} />
          <MetricCard label="Decision" value={reconciliation?.outcome_reconciliation_decision} />
          <MetricCard label="Positive outcomes" value={reconciliation?.positive_outcome_count} />
          <MetricCard label="Negative outcomes" value={reconciliation?.negative_outcome_count} />
          <MetricCard label="Low-confidence outcomes" value={reconciliation?.low_confidence_outcome_count} />
          <MetricCard label="Reconciled policies" value={reconciliation?.reconciled_policy_count} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <CheckList title="Outcome reconciliation blockers" items={reconciliation?.reconciliation_blockers} />
        <CheckList title="Outcome reconciliation checks" items={reconciliation?.reconciliation_checks} />
      </div>


      <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Policy promotion guard</h2>
        <p style={{ color: '#62748a', marginTop: 0 }}>
          Blocks manual policy promotion when signal lineage, measured outcomes, rollback ownership, or high-risk governance evidence is missing.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <MetricCard label="Promotion score" value={promotionGuard?.promotion_score} />
          <MetricCard label="Decision" value={promotionGuard?.promotion_decision} />
          <MetricCard label="Promotion candidates" value={promotionGuard?.promotion_candidate_count} />
          <MetricCard label="High-risk candidates" value={promotionGuard?.high_risk_promotion_candidate_count} />
          <MetricCard label="Evidence-covered policies" value={promotionGuard?.promotion_evidence_policy_count} />
          <MetricCard label="Blocked checks" value={promotionGuard?.blocked_check_count} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <CheckList title="Promotion blockers" items={promotionGuard?.promotion_blockers} />
        <CheckList title="Promotion checks" items={promotionGuard?.promotion_checks} />
      </div>


      <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Post-promotion monitoring</h2>
        <p style={{ color: '#62748a', marginTop: 0 }}>
          Monitors manually approved policies after promotion and flags drift, low-confidence outcomes, or rollback review requirements.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <MetricCard label="Monitoring score" value={postPromotionMonitoring?.monitoring_score} />
          <MetricCard label="Decision" value={postPromotionMonitoring?.monitoring_decision} />
          <MetricCard label="Approved policies" value={postPromotionMonitoring?.approved_policy_count} />
          <MetricCard label="Measured approved policies" value={postPromotionMonitoring?.approved_policy_measurement_count} />
          <MetricCard label="Severe negative outcomes" value={postPromotionMonitoring?.severe_negative_outcome_count} />
          <MetricCard label="Blocked checks" value={postPromotionMonitoring?.blocked_check_count} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <CheckList title="Post-promotion blockers" items={postPromotionMonitoring?.monitoring_blockers} />
        <CheckList title="Post-promotion checks" items={postPromotionMonitoring?.monitoring_checks} />
      </div>


      <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Rollback and retirement gate</h2>
        <p style={{ color: '#62748a', marginTop: 0 }}>
          Converts negative post-promotion outcomes into manual rollback, recalibration, or policy-retirement governance before high-risk recommendations can continue.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <MetricCard label="Rollback / retirement score" value={rollbackRetirementGate?.rollback_retirement_score} />
          <MetricCard label="Decision" value={rollbackRetirementGate?.rollback_retirement_decision} />
          <MetricCard label="Approved negative policies" value={rollbackRetirementGate?.approved_policy_with_negative_evidence_count} />
          <MetricCard label="Approved severe negative policies" value={rollbackRetirementGate?.approved_policy_with_severe_negative_evidence_count} />
          <MetricCard label="Retired policies with evidence" value={rollbackRetirementGate?.retired_policy_with_evidence_count} />
          <MetricCard label="Blocked checks" value={rollbackRetirementGate?.blocked_check_count} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <CheckList title="Rollback / retirement blockers" items={rollbackRetirementGate?.rollback_retirement_blockers} />
        <CheckList title="Rollback / retirement checks" items={rollbackRetirementGate?.rollback_retirement_checks} />
      </div>

      <section style={{ border: '1px solid #d9e2ec', borderRadius: 12, padding: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Adaptive policy response contract audit</h2>
        <p style={{ color: '#62748a', marginTop: 0 }}>
          Verifies that every rendered adaptive-policy panel has a matching backend response object before more policy-governance UI is added.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <MetricCard label="Contract score" value={responseContractAudit?.contract_score} />
          <MetricCard label="Decision" value={responseContractAudit?.contract_decision} />
          <MetricCard label="Rendered panels" value={responseContractAudit?.rendered_panel_count} />
          <MetricCard label="Expected response keys" value={responseContractAudit?.expected_response_key_count} />
          <MetricCard label="Missing response keys" value={responseContractAudit?.missing_response_key_count} />
          <MetricCard label="Missing keys" value={responseContractAudit?.missing_response_keys} />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <CheckList title="Response contract blockers" items={responseContractAudit?.contract_blockers} />
        <CheckList title="Response contract checks" items={responseContractAudit?.contract_checks} />
      </div>

    </main>
  );
}
