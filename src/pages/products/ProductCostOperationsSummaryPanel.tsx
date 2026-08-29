import type {
  ProductCostOperationsControlSummaryResponse,
  ProductCostOperationsEvidenceSummaryResponse,
  ProductCostOperationsReadinessSummaryResponse,
  ProductCostOperationsRunbookSummaryResponse
} from '../../types/inventory';
import { formatPercent, formatStatusLabel, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard, StatusBadge } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  const { ui } = useAppTranslation();
  return (
    <>
            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>{ui("Cost operations runbook")}</h4>
                  <p style={styles.panelSubtitle}>{ui("Daily, weekly, and monthly operating guidance after costing governance handoff. Derived and read-only.")}</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsRunbookQuery.refetch()}>
                  {ui("Refresh Runbook")}
                </button>
              </div>
              {costOperationsRunbookQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading cost operations runbook...")}</div>
              ) : costOperationsRunbookQuery.isError ? (
                <div style={styles.errorText}>{ui("Unable to load cost operations runbook.")}</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title={ui("Runbook Status")} value={ui(formatStatusLabel(costOperationsRunbookSummary?.runbook_status))} subtitle={costOperationsRunbookSummary?.can_handoff ? ui('Handoff-capable') : ui('Review required')} tone={costOperationsRunbookSummary?.runbook_status === 'steady_state' ? 'good' : 'warn'} />
                    <StatCard title={ui("Hardening Issues")} value={toNumber(costOperationsRunbookSummary?.totals.hardening_issues)} subtitle={ui("Must stay visible")} tone={toNumber(costOperationsRunbookSummary?.totals.hardening_issues) > 0 ? 'bad' : 'good'} />
                    <StatCard title={ui("Flagged Products")} value={toNumber(costOperationsRunbookSummary?.totals.flagged_products)} subtitle={ui("Dashboard follow-up")} tone={toNumber(costOperationsRunbookSummary?.totals.flagged_products) > 0 ? 'warn' : 'good'} />
                    <StatCard title={ui("Runbook Rows")} value={toNumber(costOperationsRunbookSummary?.totals.runbook_rows)} subtitle={ui("Export-ready evidence")} />
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
                          <StatusBadge status={item.status} />
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
                  <h4 style={styles.sectionTitle}>{ui("Cost operations controls")}</h4>
                  <p style={styles.panelSubtitle}>{ui("Compact operating-control panel for completed costing governance. Derived from runbook, governance, dashboard, and hardening outputs.")}</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsControlQuery.refetch()}>
                  {ui("Refresh Controls")}
                </button>
              </div>
              {costOperationsControlQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading cost operations controls...")}</div>
              ) : costOperationsControlQuery.isError ? (
                <div style={styles.errorText}>{ui("Unable to load cost operations controls.")}</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title={ui("Control Status")} value={ui(formatStatusLabel(costOperationsControlSummary?.control_status))} subtitle={ui(formatStatusLabel(costOperationsControlSummary?.runbook_status))} tone={costOperationsControlSummary?.control_status === 'controlled' ? 'good' : costOperationsControlSummary?.control_status === 'control_review' ? 'bad' : 'warn'} />
                    <StatCard title={ui("Passed Checks")} value={toNumber(costOperationsControlSummary?.totals.passed_checks)} subtitle={`${formatLocalizedNumber(Number(toNumber(costOperationsControlSummary?.totals.checks)), locale)} ${ui('total checks')}`} tone="good" />
                    <StatCard title={ui("Watch Checks")} value={toNumber(costOperationsControlSummary?.totals.watch_checks)} subtitle={ui("Keep visible")} tone={toNumber(costOperationsControlSummary?.totals.watch_checks) > 0 ? 'warn' : 'good'} />
                    <StatCard title={ui("Review Checks")} value={toNumber(costOperationsControlSummary?.totals.review_checks)} subtitle={ui("Requires follow-up")} tone={toNumber(costOperationsControlSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsControlSummary?.control_checks ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label} · {item.owner}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <StatusBadge status={item.status} detail={toNumber(item.value)} />
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
                  <h4 style={styles.sectionTitle}>{ui("Cost operations evidence")}</h4>
                  <p style={styles.panelSubtitle}>{ui("One derived evidence pack across audit rows, report rows, runbook rows, and control checks.")}</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsEvidenceQuery.refetch()}>
                  {ui("Refresh Evidence")}
                </button>
              </div>
              {costOperationsEvidenceQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading cost operations evidence...")}</div>
              ) : costOperationsEvidenceQuery.isError ? (
                <div style={styles.errorText}>{ui("Unable to load cost operations evidence.")}</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title={ui("Evidence Status")} value={ui(formatStatusLabel(costOperationsEvidenceSummary?.evidence_status))} subtitle={ui(formatStatusLabel(costOperationsEvidenceSummary?.control_status))} tone={costOperationsEvidenceSummary?.evidence_status === 'evidence_ready' ? 'good' : costOperationsEvidenceSummary?.evidence_status === 'evidence_review' ? 'bad' : 'warn'} />
                    <StatCard title={ui("Ready Sections")} value={toNumber(costOperationsEvidenceSummary?.totals.ready_sections)} subtitle={`${formatLocalizedNumber(Number(toNumber(costOperationsEvidenceSummary?.totals.evidence_sections)), locale)} ${ui('sections')}`} tone="good" />
                    <StatCard title={ui("Review Sections")} value={toNumber(costOperationsEvidenceSummary?.totals.review_sections)} subtitle={ui("Needs follow-up")} tone={toNumber(costOperationsEvidenceSummary?.totals.review_sections) > 0 ? 'bad' : 'good'} />
                    <StatCard title={ui("Evidence Rows")} value={toNumber(costOperationsEvidenceSummary?.totals.evidence_rows)} subtitle={ui("Pack rows")} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsEvidenceSummary?.evidence_sections ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label} · {item.source}</div>
                          <div style={styles.rowSubtle}>{item.purpose}</div>
                        </div>
                        <StatusBadge status={item.status} detail={toNumber(item.rows)} />
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
                  <h4 style={styles.sectionTitle}>{ui("Cost operations readiness")}</h4>
                  <p style={styles.panelSubtitle}>{ui("Final read-only readiness check over evidence, controls, runbook, and governance handoff.")}</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsReadinessQuery.refetch()}>
                  {ui("Refresh Readiness")}
                </button>
              </div>
              {costOperationsReadinessQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading cost operations readiness...")}</div>
              ) : costOperationsReadinessQuery.isError ? (
                <div style={styles.errorText}>{ui("Unable to load cost operations readiness.")}</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title={ui("Readiness Status")} value={ui(formatStatusLabel(costOperationsReadinessSummary?.readiness_status))} subtitle={costOperationsReadinessSummary?.can_handoff ? ui('Handoff capable') : ui('Review required')} tone={costOperationsReadinessSummary?.readiness_status === 'operationally_ready' ? 'good' : costOperationsReadinessSummary?.readiness_status === 'readiness_review' ? 'bad' : 'warn'} />
                    <StatCard title={ui("Readiness Score")} value={formatPercent(costOperationsReadinessSummary?.readiness_score, locale, 0)} subtitle={ui("Derived go/no-go score")} tone={toNumber(costOperationsReadinessSummary?.readiness_score) >= 90 ? 'good' : toNumber(costOperationsReadinessSummary?.readiness_score) >= 70 ? 'warn' : 'bad'} />
                    <StatCard title={ui("Review Checks")} value={toNumber(costOperationsReadinessSummary?.totals.review_checks)} subtitle={`${formatLocalizedNumber(Number(toNumber(costOperationsReadinessSummary?.totals.checks)), locale)} ${ui('checks')}`} tone={toNumber(costOperationsReadinessSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                    <StatCard title={ui("Watch Checks")} value={toNumber(costOperationsReadinessSummary?.totals.watch_checks)} subtitle={ui("Carry forward")} tone={toNumber(costOperationsReadinessSummary?.totals.watch_checks) > 0 ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsReadinessSummary?.readiness_checklist ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <StatusBadge status={item.status} detail={toNumber(item.value)} />
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
