import type {
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceSignoffSummaryResponse
} from '../../types/inventory';
import { toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

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
  return (
    <>
            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Governance audit pack</h4>
                  <div style={styles.rowSubtle}>Exportable read-only evidence for finance review and costing sign-off.</div>
                </div>
                <div style={styles.actionRow}>
                  <button type="button" style={styles.secondaryButton} onClick={handleExportCostGovernanceAuditCsv} disabled={!costGovernanceAuditPack?.audit_rows?.length}>
                    Export Audit CSV
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={handlePrintCostGovernanceAudit} disabled={!costGovernanceAuditPack}>
                    Print Audit Pack
                  </button>
                </div>
              </div>

              {costGovernanceAuditQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading governance audit pack...</div>
              ) : costGovernanceAuditQuery.isError ? (
                <div style={styles.errorBox}>Unable to load governance audit pack.</div>
              ) : (
                <>
                  <div style={styles.costReadinessGrid}>
                    <StatCard
                      title="Checklist Evidence"
                      value={toNumber(costGovernanceAuditPack?.evidence_summary.checklist_items)}
                      subtitle="Governance controls"
                    />
                    <StatCard
                      title="Remediation Items"
                      value={toNumber(costGovernanceAuditPack?.evidence_summary.remediation_items)}
                      subtitle="Open action trail"
                      tone={toNumber(costGovernanceAuditPack?.evidence_summary.remediation_items) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title="Hardening Issues"
                      value={toNumber(costGovernanceAuditPack?.evidence_summary.hardening_issue_count)}
                      subtitle="Final review signals"
                      tone={toNumber(costGovernanceAuditPack?.evidence_summary.hardening_issue_count) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title="Audit Rows"
                      value={toNumber(costGovernanceAuditPack?.audit_rows.length)}
                      subtitle="CSV-ready rows"
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
                  <h4 style={styles.sectionTitle}>Governance sign-off readiness</h4>
                  <div style={styles.rowSubtle}>Derived human-review readiness layer; no approvals or records are created automatically.</div>
                </div>
                <span style={styles.badge}>{costGovernanceSignoff?.signoff_status || 'unknown'}</span>
              </div>

              {costGovernanceSignoffQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading sign-off readiness...</div>
              ) : costGovernanceSignoffQuery.isError ? (
                <div style={styles.errorBox}>Unable to load governance sign-off readiness.</div>
              ) : (
                <>
                  <div style={styles.costReadinessGrid}>
                    <StatCard
                      title="Can Sign Off"
                      value={costGovernanceSignoff?.can_sign_off ? 'Yes' : 'No'}
                      subtitle={costGovernanceSignoff?.approval_recommendation || 'Pending review'}
                      tone={costGovernanceSignoff?.can_sign_off ? 'good' : 'warn'}
                    />
                    <StatCard
                      title="Blockers"
                      value={toNumber(costGovernanceSignoff?.blockers.length)}
                      subtitle="Must resolve before sign-off"
                      tone={toNumber(costGovernanceSignoff?.blockers.length) > 0 ? 'bad' : 'good'}
                    />
                    <StatCard
                      title="Warnings"
                      value={toNumber(costGovernanceSignoff?.warnings.length)}
                      subtitle="Conditional review items"
                      tone={toNumber(costGovernanceSignoff?.warnings.length) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title="Evidence Rows"
                      value={toNumber(costGovernanceSignoff?.evidence_summary.checklist_items)}
                      subtitle="Audit support available"
                    />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskListCard}>
                      <h4 style={styles.sectionTitle}>Sign-off checklist</h4>
                      {(costGovernanceSignoff?.signoff_checklist ?? []).map((item) => (
                        <div key={item.key} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.label}</div>
                            <div style={styles.rowSubtle}>{item.detail}</div>
                          </div>
                          <span style={styles.badge}>{item.status}</span>
                        </div>
                      ))}
                    </div>

                    <div style={styles.riskListCard}>
                      <h4 style={styles.sectionTitle}>Blockers & warnings</h4>
                      {[...(costGovernanceSignoff?.blockers ?? []), ...(costGovernanceSignoff?.warnings ?? [])].length === 0 ? (
                        <div style={styles.rowSubtle}>No sign-off blockers or warnings found.</div>
                      ) : (
                        [...(costGovernanceSignoff?.blockers ?? []), ...(costGovernanceSignoff?.warnings ?? [])].map((item) => (
                          <div key={`${item.severity}-${item.key}`} style={styles.riskListItem}>
                            <div>
                              <div style={styles.rowTitle}>{item.label}</div>
                              <div style={styles.rowSubtle}>{item.detail}</div>
                            </div>
                            <span style={styles.badge}>{item.severity}</span>
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
