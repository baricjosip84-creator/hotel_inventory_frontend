import type { ProductCostGovernanceHandoffSummaryResponse } from '../../types/inventory';
import { formatStatusLabel, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard, StatusBadge } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  const { ui } = useAppTranslation();
  return (
    <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>{ui("Governance handoff summary")}</h4>
                  <p style={styles.panelSubtitle}>{ui("Operational ownership handoff for completed costing governance. Derived and read-only.")}</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={handleExportCostGovernanceHandoffCsv} disabled={!costGovernanceHandoffSummary?.handoff_rows?.length}>
                  {ui("Export Handoff CSV")}
                </button>
              </div>
              {costGovernanceHandoffQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading handoff summary...")}</div>
              ) : costGovernanceHandoffQuery.isError ? (
                <div style={styles.errorText}>{ui("Unable to load cost governance handoff summary.")}</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title={ui("Handoff Status")} value={ui(formatStatusLabel(costGovernanceHandoffSummary?.handoff_status))} subtitle={costGovernanceHandoffSummary?.can_handoff ? ui('Ready for ownership') : ui('Review required')} tone={costGovernanceHandoffSummary?.can_handoff ? 'good' : 'warn'} />
                    <StatCard title={ui("Evidence Rows")} value={toNumber(costGovernanceHandoffSummary?.totals.evidence_rows)} subtitle={ui("Archive + review + audit")} />
                    <StatCard title={ui("Blockers")} value={toNumber(costGovernanceHandoffSummary?.totals.blockers)} subtitle={ui("Must be zero")} tone={toNumber(costGovernanceHandoffSummary?.totals.blockers) > 0 ? 'bad' : 'good'} />
                    <StatCard title={ui("Follow-ups")} value={toNumber(costGovernanceHandoffSummary?.totals.warnings) + toNumber(costGovernanceHandoffSummary?.totals.remediation_items)} subtitle={ui("Warnings + remediation")} tone={toNumber(costGovernanceHandoffSummary?.totals.warnings) + toNumber(costGovernanceHandoffSummary?.totals.remediation_items) > 0 ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costGovernanceHandoffSummary?.handoff_checklist ?? []).map((item) => (
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
                      {(costGovernanceHandoffSummary?.owner_summary ?? []).map((item) => (
                        <div key={item.owner} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.owner}</div>
                            <div style={styles.rowSubtle}>{item.responsibility}</div>
                          </div>
                          <StatusBadge status={item.status} />
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
