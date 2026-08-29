import type {
  ProductCostGovernanceFinalSummaryResponse,
  ProductCostPerformanceSummaryResponse,
  ProductCostSecurityAuditSummaryResponse
} from '../../types/inventory';
import { formatGovernanceValue, formatPercent, formatStatusLabel, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard, StatusBadge } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  const { ui, locale } = useAppTranslation();
  return (
    <>
<div style={styles.riskListCard}>
  <div style={styles.packageHeader}>
    <div>
      <h4 style={styles.sectionTitle}>{ui("Governance finalization")}</h4>
      <p style={styles.panelSubtitle}>{ui("Final go/no-go snapshot for closing the costing governance module. Derived and read-only.")}</p>
    </div>
    <button type="button" style={styles.secondaryButton} onClick={() => costGovernanceFinalQuery.refetch()}>
      {ui("Refresh Finalization")}
    </button>
  </div>
  {costGovernanceFinalQuery.isLoading ? (
    <div style={styles.rowSubtle}>{ui("Loading governance finalization...")}</div>
  ) : costGovernanceFinalQuery.isError ? (
    <div style={styles.errorText}>{ui("Unable to load cost governance finalization.")}</div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <StatCard title={ui("Final Status")} value={ui(formatStatusLabel(costGovernanceFinalSummary?.final_status))} subtitle={costGovernanceFinalSummary?.can_finalize ? ui('Ready to close module') : ui('Review required')} tone={costGovernanceFinalSummary?.can_finalize ? 'good' : costGovernanceFinalSummary?.final_status === 'final_watch' ? 'warn' : 'bad'} />
        <StatCard title={ui("Final Score")} value={formatPercent(costGovernanceFinalSummary?.final_score, locale, 0)} subtitle={ui("Governance + operations")} tone={toNumber(costGovernanceFinalSummary?.final_score) >= 90 ? 'good' : toNumber(costGovernanceFinalSummary?.final_score) >= 70 ? 'warn' : 'bad'} />
        <StatCard title={ui("Blockers")} value={toNumber(costGovernanceFinalSummary?.totals.blockers)} subtitle={ui("Must be zero")} tone={toNumber(costGovernanceFinalSummary?.totals.blockers) > 0 ? 'bad' : 'good'} />
        <StatCard title={ui("Evidence Rows")} value={toNumber(costGovernanceFinalSummary?.totals.evidence_rows)} subtitle={ui("Audit-ready support")} tone={toNumber(costGovernanceFinalSummary?.totals.evidence_rows) > 0 ? 'good' : 'warn'} />
      </div>

      <div style={styles.riskGrid}>
        <div style={styles.riskList}>
          {(costGovernanceFinalSummary?.final_checklist ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <StatusBadge status={item.status} />
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
              <span style={styles.badge}>{ui(formatGovernanceValue(row.value, row.status, locale))}</span>
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
      <h4 style={styles.sectionTitle}>{ui("Cost performance readiness")}</h4>
      <p style={styles.panelSubtitle}>{ui("Query-readiness and payload guardrails for high-volume costing intelligence. Derived and read-only.")}</p>
    </div>
    <button type="button" style={styles.secondaryButton} onClick={() => costPerformanceQuery.refetch()}>
      {ui("Refresh Performance")}
    </button>
  </div>
  {costPerformanceQuery.isLoading ? (
    <div style={styles.rowSubtle}>{ui("Loading cost performance readiness...")}</div>
  ) : costPerformanceQuery.isError ? (
    <div style={styles.errorText}>{ui("Unable to load cost performance readiness.")}</div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <StatCard title={ui("Performance Status")} value={ui(formatStatusLabel(costPerformanceSummary?.performance_status))} subtitle={ui(formatStatusLabel(costPerformanceSummary?.query_optimization_status))} tone={costPerformanceSummary?.performance_status === 'performance_ready' ? 'good' : costPerformanceSummary?.performance_status === 'performance_watch' ? 'warn' : 'bad'} />
        <StatCard title={ui("Performance Score")} value={formatPercent(costPerformanceSummary?.performance_score, locale, 0)} subtitle={ui("Indexes + payloads")} tone={toNumber(costPerformanceSummary?.performance_score) >= 90 ? 'good' : toNumber(costPerformanceSummary?.performance_score) >= 70 ? 'warn' : 'bad'} />
        <StatCard title={ui("Indexes Present")} value={`${toNumber(costPerformanceSummary?.totals.present_indexes)} / ${toNumber(costPerformanceSummary?.totals.expected_indexes)}`} subtitle={ui("Migration 019 checks")} tone={toNumber(costPerformanceSummary?.totals.missing_indexes) > 0 ? 'bad' : 'good'} />
        <StatCard title={ui("Review Checks")} value={toNumber(costPerformanceSummary?.totals.review_checks)} subtitle={ui("Must be cleared")} tone={toNumber(costPerformanceSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
      </div>

      <div style={styles.riskGrid}>
        <div style={styles.riskList}>
          {(costPerformanceSummary?.index_checks ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <StatusBadge status={item.status} />
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
              <span style={styles.badge}>{ui(formatGovernanceValue(item.value, item.status, locale))}</span>
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
      <h4 style={styles.sectionTitle}>{ui("Cost security audit")}</h4>
      <p style={styles.panelSubtitle}>{ui("Final permission, tenant-boundary, support/platform visibility, and read-only closeout checks for Step 165.")}</p>
    </div>
    <button type="button" style={styles.secondaryButton} onClick={() => costSecurityAuditQuery.refetch()}>
      {ui("Refresh Security")}
    </button>
  </div>
  {costSecurityAuditQuery.isLoading ? (
    <div style={styles.rowSubtle}>{ui("Loading cost security audit...")}</div>
  ) : costSecurityAuditQuery.isError ? (
    <div style={styles.errorText}>{ui("Unable to load cost security audit.")}</div>
  ) : (
    <>
      <div style={styles.summaryGrid}>
        <StatCard title={ui("Security Status")} value={ui(formatStatusLabel(costSecurityAuditSummary?.security_status))} subtitle={ui(formatStatusLabel(costSecurityAuditSummary?.tenant_scope_status))} tone={costSecurityAuditSummary?.security_status === 'security_ready' ? 'good' : costSecurityAuditSummary?.security_status === 'security_watch' ? 'warn' : 'bad'} />
        <StatCard title={ui("Security Score")} value={formatPercent(costSecurityAuditSummary?.security_score, locale, 0)} subtitle={ui("Permissions + boundaries")} tone={toNumber(costSecurityAuditSummary?.security_score) >= 90 ? 'good' : toNumber(costSecurityAuditSummary?.security_score) >= 70 ? 'warn' : 'bad'} />
        <StatCard title={ui("Review Checks")} value={toNumber(costSecurityAuditSummary?.totals.review_checks)} subtitle={ui("Must be cleared")} tone={toNumber(costSecurityAuditSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
        <StatCard title={ui("Support Session")} value={ui(formatStatusLabel(costSecurityAuditSummary?.access_context.support_session_present ? 'present' : 'none'))} subtitle={ui(formatStatusLabel(costSecurityAuditSummary?.access_context.actor_type || 'actor_context'))} tone={costSecurityAuditSummary?.access_context.support_session_present ? 'warn' : 'good'} />
      </div>

      <div style={styles.riskGrid}>
        <div style={styles.riskList}>
          {(costSecurityAuditSummary?.permission_checks ?? []).map((item) => (
            <div key={item.key} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.label}</div>
                <div style={styles.rowSubtle}>{item.detail}</div>
              </div>
              <StatusBadge status={item.status} />
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
              <span style={styles.badge}>{ui(formatGovernanceValue(item.value, item.status, locale))}</span>
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
