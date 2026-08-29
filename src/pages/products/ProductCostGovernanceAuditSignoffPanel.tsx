import type {
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceSignoffSummaryResponse
} from '../../types/inventory';
import { toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard, StatusBadge } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

type CostGovernanceQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostGovernanceAuditSignoffPanelProps = {
  costGovernanceAuditQuery: CostGovernanceQueryState;
  costGovernanceSignoffQuery: CostGovernanceQueryState;
  costGovernanceAuditPack?: ProductCostGovernanceAuditPackResponse;
  costGovernanceSignoff?: ProductCostGovernanceSignoffSummaryResponse;
  handleExportCostGovernanceAuditCsv: () => void;
  handlePrintCostGovernanceAudit: () => void;
};

export function ProductCostGovernanceAuditSignoffPanel({
  costGovernanceAuditQuery,
  costGovernanceSignoffQuery,
  costGovernanceAuditPack,
  costGovernanceSignoff,
  handleExportCostGovernanceAuditCsv,
  handlePrintCostGovernanceAudit
}: ProductCostGovernanceAuditSignoffPanelProps) {
  const { ui } = useAppTranslation();
  return (
    <>
            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>{ui("Governance audit pack")}</h4>
                  <div style={styles.rowSubtle}>{ui("Exportable read-only evidence for finance review and costing sign-off.")}</div>
                </div>
                <div style={styles.actionRow}>
                  <button type="button" style={styles.secondaryButton} onClick={handleExportCostGovernanceAuditCsv} disabled={!costGovernanceAuditPack?.audit_rows?.length}>
                    {ui("Export Audit CSV")}
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={handlePrintCostGovernanceAudit} disabled={!costGovernanceAuditPack}>
                    {ui("Print Audit Pack")}
                  </button>
                </div>
              </div>

              {costGovernanceAuditQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading governance audit pack...")}</div>
              ) : costGovernanceAuditQuery.isError ? (
                <div style={styles.errorBox}>{ui("Unable to load governance audit pack.")}</div>
              ) : (
                <>
                  <div style={styles.costReadinessGrid}>
                    <StatCard
                      title={ui("Checklist Evidence")}
                      value={toNumber(costGovernanceAuditPack?.evidence_summary.checklist_items)}
                      subtitle={ui("Governance controls")}
                    />
                    <StatCard
                      title={ui("Remediation Items")}
                      value={toNumber(costGovernanceAuditPack?.evidence_summary.remediation_items)}
                      subtitle={ui("Open action trail")}
                      tone={toNumber(costGovernanceAuditPack?.evidence_summary.remediation_items) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title={ui("Hardening Issues")}
                      value={toNumber(costGovernanceAuditPack?.evidence_summary.hardening_issue_count)}
                      subtitle={ui("Final review signals")}
                      tone={toNumber(costGovernanceAuditPack?.evidence_summary.hardening_issue_count) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title={ui("Audit Rows")}
                      value={toNumber(costGovernanceAuditPack?.audit_rows.length)}
                      subtitle={ui("CSV-ready rows")}
                    />
                  </div>

                  {(costGovernanceAuditPack?.approval_notes ?? []).map((note) => (
                    <div key={note} style={styles.rowSubtle}>• {note}</div>
                  ))}
                </>
              )}
            </div>



            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>{ui("Governance sign-off readiness")}</h4>
                  <div style={styles.rowSubtle}>{ui("Derived human-review readiness layer; no approvals or records are created automatically.")}</div>
                </div>
                <StatusBadge status={costGovernanceSignoff?.signoff_status} />
              </div>

              {costGovernanceSignoffQuery.isLoading ? (
                <div style={styles.rowSubtle}>{ui("Loading sign-off readiness...")}</div>
              ) : costGovernanceSignoffQuery.isError ? (
                <div style={styles.errorBox}>{ui("Unable to load governance sign-off readiness.")}</div>
              ) : (
                <>
                  <div style={styles.costReadinessGrid}>
                    <StatCard
                      title={ui("Can Sign Off")}
                      value={costGovernanceSignoff?.can_sign_off ? ui('Yes') : ui('No')}
                      subtitle={costGovernanceSignoff?.approval_recommendation ? ui(formatStatusLabel(costGovernanceSignoff.approval_recommendation)) : ui('Pending review')}
                      tone={costGovernanceSignoff?.can_sign_off ? 'good' : 'warn'}
                    />
                    <StatCard
                      title={ui("Blockers")}
                      value={toNumber(costGovernanceSignoff?.blockers.length)}
                      subtitle={ui("Must resolve before sign-off")}
                      tone={toNumber(costGovernanceSignoff?.blockers.length) > 0 ? 'bad' : 'good'}
                    />
                    <StatCard
                      title={ui("Warnings")}
                      value={toNumber(costGovernanceSignoff?.warnings.length)}
                      subtitle={ui("Conditional review items")}
                      tone={toNumber(costGovernanceSignoff?.warnings.length) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title={ui("Evidence Rows")}
                      value={toNumber(costGovernanceSignoff?.evidence_summary.checklist_items)}
                      subtitle={ui("Audit support available")}
                    />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskListCard}>
                      <h4 style={styles.sectionTitle}>{ui("Sign-off checklist")}</h4>
                      {(costGovernanceSignoff?.signoff_checklist ?? []).map((item) => (
                        <div key={item.key} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.label}</div>
                            <div style={styles.rowSubtle}>{item.detail}</div>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>
                      ))}
                    </div>

                    <div style={styles.riskListCard}>
                      <h4 style={styles.sectionTitle}>{ui("Blockers & warnings")}</h4>
                      {[...(costGovernanceSignoff?.blockers ?? []), ...(costGovernanceSignoff?.warnings ?? [])].length === 0 ? (
                        <div style={styles.rowSubtle}>{ui("No sign-off blockers or warnings found.")}</div>
                      ) : (
                        [...(costGovernanceSignoff?.blockers ?? []), ...(costGovernanceSignoff?.warnings ?? [])].map((item) => (
                          <div key={`${item.severity}-${item.key}`} style={styles.riskListItem}>
                            <div>
                              <div style={styles.rowTitle}>{item.label}</div>
                              <div style={styles.rowSubtle}>{item.detail}</div>
                            </div>
                            <StatusBadge status={item.severity} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>





    </>
  );
}
