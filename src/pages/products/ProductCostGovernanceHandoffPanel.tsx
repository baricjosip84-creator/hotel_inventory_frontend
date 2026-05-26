import type { ProductCostGovernanceHandoffSummaryResponse } from '../../types/inventory';
import { toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostGovernanceQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostGovernanceHandoffPanelProps = {
  costGovernanceHandoffQuery: CostGovernanceQueryState;
  costGovernanceHandoffSummary?: ProductCostGovernanceHandoffSummaryResponse;
  handleExportCostGovernanceHandoffCsv: () => void;
};

export function ProductCostGovernanceHandoffPanel({
  costGovernanceHandoffQuery,
  costGovernanceHandoffSummary,
  handleExportCostGovernanceHandoffCsv
}: ProductCostGovernanceHandoffPanelProps) {
  return (
    <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Governance handoff summary</h4>
                  <p style={styles.panelSubtitle}>Operational ownership handoff for completed costing governance. Derived and read-only.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={handleExportCostGovernanceHandoffCsv} disabled={!costGovernanceHandoffSummary?.handoff_rows?.length}>
                  Export Handoff CSV
                </button>
              </div>
              {costGovernanceHandoffQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading handoff summary...</div>
              ) : costGovernanceHandoffQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost governance handoff summary.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Handoff Status" value={costGovernanceHandoffSummary?.handoff_status || 'unknown'} subtitle={costGovernanceHandoffSummary?.can_handoff ? 'Ready for ownership' : 'Review required'} tone={costGovernanceHandoffSummary?.can_handoff ? 'good' : 'warn'} />
                    <StatCard title="Evidence Rows" value={toNumber(costGovernanceHandoffSummary?.totals.evidence_rows)} subtitle="Archive + review + audit" />
                    <StatCard title="Blockers" value={toNumber(costGovernanceHandoffSummary?.totals.blockers)} subtitle="Must be zero" tone={toNumber(costGovernanceHandoffSummary?.totals.blockers) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Follow-ups" value={toNumber(costGovernanceHandoffSummary?.totals.warnings) + toNumber(costGovernanceHandoffSummary?.totals.remediation_items)} subtitle="Warnings + remediation" tone={toNumber(costGovernanceHandoffSummary?.totals.warnings) + toNumber(costGovernanceHandoffSummary?.totals.remediation_items) > 0 ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costGovernanceHandoffSummary?.handoff_checklist ?? []).map((item) => (
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
                      {(costGovernanceHandoffSummary?.owner_summary ?? []).map((item) => (
                        <div key={item.owner} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.owner}</div>
                            <div style={styles.rowSubtle}>{item.responsibility}</div>
                          </div>
                          <span style={styles.badge}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(costGovernanceHandoffSummary?.handoff_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costGovernanceHandoffSummary?.handoff_guidance ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
  );
}
