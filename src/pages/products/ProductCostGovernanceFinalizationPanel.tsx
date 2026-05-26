import type {
  ProductCostGovernanceFinalSummaryResponse,
  ProductCostPerformanceSummaryResponse,
  ProductCostSecurityAuditSummaryResponse
} from '../../types/inventory';
import { toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostGovernanceQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostGovernanceFinalizationPanelProps = {
  costGovernanceFinalQuery: CostGovernanceQueryState;
  costPerformanceQuery: CostGovernanceQueryState;
  costSecurityAuditQuery: CostGovernanceQueryState;
  costGovernanceFinalSummary?: ProductCostGovernanceFinalSummaryResponse;
  costPerformanceSummary?: ProductCostPerformanceSummaryResponse;
  costSecurityAuditSummary?: ProductCostSecurityAuditSummaryResponse;
};

export function ProductCostGovernanceFinalizationPanel({
  costGovernanceFinalQuery,
  costPerformanceQuery,
  costSecurityAuditQuery,
  costGovernanceFinalSummary,
  costPerformanceSummary,
  costSecurityAuditSummary
}: ProductCostGovernanceFinalizationPanelProps) {
  return (
    <>
<div style={styles.riskListCard}>
  <div style={styles.packageHeader}>
    <div>
      <h4 style={styles.sectionTitle}>Governance finalization</h4>
      <p style={styles.panelSubtitle}>Final go/no-go snapshot for closing the costing governance module. Derived and read-only.</p>
    </div>
    <button type="button" style={styles.secondaryButton} onClick={() => costGovernanceFinalQuery.refetch()}>
      Refresh Finalization
    </button>
  </div>
  {costGovernanceFinalQuery.isLoading ? (
    <div style={styles.rowSubtle}>Loading governance finalization...</div>
  ) : costGovernanceFinalQuery.isError ? (
    <div style={styles.errorText}>Unable to load cost governance finalization.</div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <StatCard title="Final Status" value={costGovernanceFinalSummary?.final_status || 'unknown'} subtitle={costGovernanceFinalSummary?.can_finalize ? 'Ready to close module' : 'Review required'} tone={costGovernanceFinalSummary?.can_finalize ? 'good' : costGovernanceFinalSummary?.final_status === 'final_watch' ? 'warn' : 'bad'} />
        <StatCard title="Final Score" value={`${toNumber(costGovernanceFinalSummary?.final_score).toFixed(0)}%`} subtitle="Governance + operations" tone={toNumber(costGovernanceFinalSummary?.final_score) >= 90 ? 'good' : toNumber(costGovernanceFinalSummary?.final_score) >= 70 ? 'warn' : 'bad'} />
        <StatCard title="Blockers" value={toNumber(costGovernanceFinalSummary?.totals.blockers)} subtitle="Must be zero" tone={toNumber(costGovernanceFinalSummary?.totals.blockers) > 0 ? 'bad' : 'good'} />
        <StatCard title="Evidence Rows" value={toNumber(costGovernanceFinalSummary?.totals.evidence_rows)} subtitle="Audit-ready support" tone={toNumber(costGovernanceFinalSummary?.totals.evidence_rows) > 0 ? 'good' : 'warn'} />
      </div>

      <div style={styles.riskGrid}>
        <div style={styles.riskList}>
          {(costGovernanceFinalSummary?.final_checklist ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <span style={styles.badge}>{item.status}</span>
            </div>
          ))}
        </div>
        <div style={styles.riskList}>
          {(costGovernanceFinalSummary?.final_rows ?? []).slice(0, 6).map((row) => (
            <div key={`${row.section}-${row.key}`} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{row.label}</div>
                <div style={styles.rowSubtle}>{row.section}</div>
              </div>
              <span style={styles.badge}>{String(row.value ?? row.status)}</span>
            </div>
          ))}
        </div>
      </div>

      {(costGovernanceFinalSummary?.final_guidance ?? []).length > 0 ? (
        <ul style={styles.noteList}>
          {(costGovernanceFinalSummary?.final_guidance ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  )}
</div>

<div style={styles.riskListCard}>
  <div style={styles.packageHeader}>
    <div>
      <h4 style={styles.sectionTitle}>Cost performance readiness</h4>
      <p style={styles.panelSubtitle}>Query-readiness and payload guardrails for high-volume costing intelligence. Derived and read-only.</p>
    </div>
    <button type="button" style={styles.secondaryButton} onClick={() => costPerformanceQuery.refetch()}>
      Refresh Performance
    </button>
  </div>
  {costPerformanceQuery.isLoading ? (
    <div style={styles.rowSubtle}>Loading cost performance readiness...</div>
  ) : costPerformanceQuery.isError ? (
    <div style={styles.errorText}>Unable to load cost performance readiness.</div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <StatCard title="Performance Status" value={costPerformanceSummary?.performance_status || 'unknown'} subtitle={costPerformanceSummary?.query_optimization_status || 'query status'} tone={costPerformanceSummary?.performance_status === 'performance_ready' ? 'good' : costPerformanceSummary?.performance_status === 'performance_watch' ? 'warn' : 'bad'} />
        <StatCard title="Performance Score" value={`${toNumber(costPerformanceSummary?.performance_score).toFixed(0)}%`} subtitle="Indexes + payloads" tone={toNumber(costPerformanceSummary?.performance_score) >= 90 ? 'good' : toNumber(costPerformanceSummary?.performance_score) >= 70 ? 'warn' : 'bad'} />
        <StatCard title="Indexes Present" value={`${toNumber(costPerformanceSummary?.totals.present_indexes)} / ${toNumber(costPerformanceSummary?.totals.expected_indexes)}`} subtitle="Migration 019 checks" tone={toNumber(costPerformanceSummary?.totals.missing_indexes) > 0 ? 'bad' : 'good'} />
        <StatCard title="Review Checks" value={toNumber(costPerformanceSummary?.totals.review_checks)} subtitle="Must be cleared" tone={toNumber(costPerformanceSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
      </div>

      <div style={styles.riskGrid}>
        <div style={styles.riskList}>
          {(costPerformanceSummary?.index_checks ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <span style={styles.badge}>{item.status}</span>
            </div>
          ))}
        </div>
        <div style={styles.riskList}>
          {(costPerformanceSummary?.payload_checks ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <span style={styles.badge}>{String(item.value ?? item.status)}</span>
            </div>
          ))}
        </div>
      </div>

      {(costPerformanceSummary?.performance_guidance ?? []).length > 0 ? (
        <ul style={styles.noteList}>
          {(costPerformanceSummary?.performance_guidance ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  )}
</div>

<div style={styles.riskListCard}>
  <div style={styles.packageHeader}>
    <div>
      <h4 style={styles.sectionTitle}>Cost security audit</h4>
      <p style={styles.panelSubtitle}>Final permission, tenant-boundary, support/platform visibility, and read-only closeout checks for Step 165.</p>
    </div>
    <button type="button" style={styles.secondaryButton} onClick={() => costSecurityAuditQuery.refetch()}>
      Refresh Security
    </button>
  </div>
  {costSecurityAuditQuery.isLoading ? (
    <div style={styles.rowSubtle}>Loading cost security audit...</div>
  ) : costSecurityAuditQuery.isError ? (
    <div style={styles.errorText}>Unable to load cost security audit.</div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <StatCard title="Security Status" value={costSecurityAuditSummary?.security_status || 'unknown'} subtitle={costSecurityAuditSummary?.tenant_scope_status || 'tenant scope'} tone={costSecurityAuditSummary?.security_status === 'security_ready' ? 'good' : costSecurityAuditSummary?.security_status === 'security_watch' ? 'warn' : 'bad'} />
        <StatCard title="Security Score" value={`${toNumber(costSecurityAuditSummary?.security_score).toFixed(0)}%`} subtitle="Permissions + boundaries" tone={toNumber(costSecurityAuditSummary?.security_score) >= 90 ? 'good' : toNumber(costSecurityAuditSummary?.security_score) >= 70 ? 'warn' : 'bad'} />
        <StatCard title="Review Checks" value={toNumber(costSecurityAuditSummary?.totals.review_checks)} subtitle="Must be cleared" tone={toNumber(costSecurityAuditSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
        <StatCard title="Support Session" value={costSecurityAuditSummary?.access_context.support_session_present ? 'present' : 'none'} subtitle={costSecurityAuditSummary?.access_context.actor_type || 'actor context'} tone={costSecurityAuditSummary?.access_context.support_session_present ? 'warn' : 'good'} />
      </div>

      <div style={styles.riskGrid}>
        <div style={styles.riskList}>
          {(costSecurityAuditSummary?.permission_checks ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <span style={styles.badge}>{item.status}</span>
            </div>
          ))}
        </div>
        <div style={styles.riskList}>
          {(costSecurityAuditSummary?.boundary_checks ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <span style={styles.badge}>{String(item.value ?? item.status)}</span>
            </div>
          ))}
        </div>
      </div>

      {(costSecurityAuditSummary?.security_guidance ?? []).length > 0 ? (
        <ul style={styles.noteList}>
          {(costSecurityAuditSummary?.security_guidance ?? []).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </>
  )}
</div>
    </>
  );
}
