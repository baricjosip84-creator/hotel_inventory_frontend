import type {
  ProductCostOperationsControlSummaryResponse,
  ProductCostOperationsEvidenceSummaryResponse,
  ProductCostOperationsReadinessSummaryResponse,
  ProductCostOperationsRunbookSummaryResponse
} from '../../types/inventory';
import { toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostOperationsQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostOperationsSummaryPanelProps = {
  costOperationsRunbookQuery: CostOperationsQueryState;
  costOperationsControlQuery: CostOperationsQueryState;
  costOperationsEvidenceQuery: CostOperationsQueryState;
  costOperationsReadinessQuery: CostOperationsQueryState;
  costOperationsRunbookSummary?: ProductCostOperationsRunbookSummaryResponse;
  costOperationsControlSummary?: ProductCostOperationsControlSummaryResponse;
  costOperationsEvidenceSummary?: ProductCostOperationsEvidenceSummaryResponse;
  costOperationsReadinessSummary?: ProductCostOperationsReadinessSummaryResponse;
};

export function ProductCostOperationsSummaryPanel({
  costOperationsRunbookQuery,
  costOperationsControlQuery,
  costOperationsEvidenceQuery,
  costOperationsReadinessQuery,
  costOperationsRunbookSummary,
  costOperationsControlSummary,
  costOperationsEvidenceSummary,
  costOperationsReadinessSummary
}: ProductCostOperationsSummaryPanelProps) {
  return (
    <>
            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Cost operations runbook</h4>
                  <p style={styles.panelSubtitle}>Daily, weekly, and monthly operating guidance after costing governance handoff. Derived and read-only.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsRunbookQuery.refetch()}>
                  Refresh Runbook
                </button>
              </div>
              {costOperationsRunbookQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations runbook...</div>
              ) : costOperationsRunbookQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations runbook.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Runbook Status" value={costOperationsRunbookSummary?.runbook_status || 'unknown'} subtitle={costOperationsRunbookSummary?.can_handoff ? 'Handoff-capable' : 'Review required'} tone={costOperationsRunbookSummary?.runbook_status === 'steady_state' ? 'good' : 'warn'} />
                    <StatCard title="Hardening Issues" value={toNumber(costOperationsRunbookSummary?.totals.hardening_issues)} subtitle="Must stay visible" tone={toNumber(costOperationsRunbookSummary?.totals.hardening_issues) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Flagged Products" value={toNumber(costOperationsRunbookSummary?.totals.flagged_products)} subtitle="Dashboard follow-up" tone={toNumber(costOperationsRunbookSummary?.totals.flagged_products) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Runbook Rows" value={toNumber(costOperationsRunbookSummary?.totals.runbook_rows)} subtitle="Export-ready evidence" />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costOperationsRunbookSummary?.operating_rhythm ?? []).map((item) => (
                        <div key={`${item.cadence}-${item.owner}`} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.cadence} · {item.owner}</div>
                            <div style={styles.rowSubtle}>{item.action}</div>
                            <div style={styles.rowMeta}>{item.source}</div>
                          </div>
                          <span style={styles.badge}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                    <div style={styles.riskList}>
                      {(costOperationsRunbookSummary?.escalation_rules ?? []).map((item) => (
                        <div key={item.key} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.condition}</div>
                            <div style={styles.rowSubtle}>{item.escalation}</div>
                          </div>
                          <span style={styles.badge}>{toNumber(item.current_value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(costOperationsRunbookSummary?.runbook_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsRunbookSummary?.runbook_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost operations controls</h4>
                  <p style={styles.panelSubtitle}>Compact operating-control panel for completed costing governance. Derived from runbook, governance, dashboard, and hardening outputs.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsControlQuery.refetch()}>
                  Refresh Controls
                </button>
              </div>
              {costOperationsControlQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations controls...</div>
              ) : costOperationsControlQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations controls.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Control Status" value={costOperationsControlSummary?.control_status || 'unknown'} subtitle={costOperationsControlSummary?.runbook_status || 'runbook'} tone={costOperationsControlSummary?.control_status === 'controlled' ? 'good' : costOperationsControlSummary?.control_status === 'control_review' ? 'bad' : 'warn'} />
                    <StatCard title="Passed Checks" value={toNumber(costOperationsControlSummary?.totals.passed_checks)} subtitle={`${toNumber(costOperationsControlSummary?.totals.checks)} total checks`} tone="good" />
                    <StatCard title="Watch Checks" value={toNumber(costOperationsControlSummary?.totals.watch_checks)} subtitle="Keep visible" tone={toNumber(costOperationsControlSummary?.totals.watch_checks) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Review Checks" value={toNumber(costOperationsControlSummary?.totals.review_checks)} subtitle="Requires follow-up" tone={toNumber(costOperationsControlSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsControlSummary?.control_checks ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label} · {item.owner}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <span style={styles.badge}>{item.status}: {toNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  {(costOperationsControlSummary?.operating_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsControlSummary?.operating_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost operations evidence</h4>
                  <p style={styles.panelSubtitle}>One derived evidence pack across audit rows, report rows, runbook rows, and control checks.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsEvidenceQuery.refetch()}>
                  Refresh Evidence
                </button>
              </div>
              {costOperationsEvidenceQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations evidence...</div>
              ) : costOperationsEvidenceQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations evidence.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Evidence Status" value={costOperationsEvidenceSummary?.evidence_status || 'unknown'} subtitle={costOperationsEvidenceSummary?.control_status || 'control'} tone={costOperationsEvidenceSummary?.evidence_status === 'evidence_ready' ? 'good' : costOperationsEvidenceSummary?.evidence_status === 'evidence_review' ? 'bad' : 'warn'} />
                    <StatCard title="Ready Sections" value={toNumber(costOperationsEvidenceSummary?.totals.ready_sections)} subtitle={`${toNumber(costOperationsEvidenceSummary?.totals.evidence_sections)} sections`} tone="good" />
                    <StatCard title="Review Sections" value={toNumber(costOperationsEvidenceSummary?.totals.review_sections)} subtitle="Needs follow-up" tone={toNumber(costOperationsEvidenceSummary?.totals.review_sections) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Evidence Rows" value={toNumber(costOperationsEvidenceSummary?.totals.evidence_rows)} subtitle="Pack rows" />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsEvidenceSummary?.evidence_sections ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label} · {item.source}</div>
                          <div style={styles.rowSubtle}>{item.purpose}</div>
                        </div>
                        <span style={styles.badge}>{item.status}: {toNumber(item.rows)}</span>
                      </div>
                    ))}
                  </div>

                  {(costOperationsEvidenceSummary?.evidence_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsEvidenceSummary?.evidence_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost operations readiness</h4>
                  <p style={styles.panelSubtitle}>Final read-only readiness check over evidence, controls, runbook, and governance handoff.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsReadinessQuery.refetch()}>
                  Refresh Readiness
                </button>
              </div>
              {costOperationsReadinessQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations readiness...</div>
              ) : costOperationsReadinessQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations readiness.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Readiness Status" value={costOperationsReadinessSummary?.readiness_status || 'unknown'} subtitle={costOperationsReadinessSummary?.can_handoff ? 'Handoff capable' : 'Review required'} tone={costOperationsReadinessSummary?.readiness_status === 'operationally_ready' ? 'good' : costOperationsReadinessSummary?.readiness_status === 'readiness_review' ? 'bad' : 'warn'} />
                    <StatCard title="Readiness Score" value={`${toNumber(costOperationsReadinessSummary?.readiness_score).toFixed(0)}%`} subtitle="Derived go/no-go score" tone={toNumber(costOperationsReadinessSummary?.readiness_score) >= 90 ? 'good' : toNumber(costOperationsReadinessSummary?.readiness_score) >= 70 ? 'warn' : 'bad'} />
                    <StatCard title="Review Checks" value={toNumber(costOperationsReadinessSummary?.totals.review_checks)} subtitle={`${toNumber(costOperationsReadinessSummary?.totals.checks)} checks`} tone={toNumber(costOperationsReadinessSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Watch Checks" value={toNumber(costOperationsReadinessSummary?.totals.watch_checks)} subtitle="Carry forward" tone={toNumber(costOperationsReadinessSummary?.totals.watch_checks) > 0 ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsReadinessSummary?.readiness_checklist ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <span style={styles.badge}>{item.status}: {toNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  {(costOperationsReadinessSummary?.readiness_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsReadinessSummary?.readiness_guidance ?? []).map((item) => (
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
