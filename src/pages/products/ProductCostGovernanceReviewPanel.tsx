import type {
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceClosureSummaryResponse,
  ProductCostGovernanceReviewPackResponse,
  ProductCostGovernanceReviewQueueResponse,
  ProductCostGovernanceSignoffSummaryResponse
} from '../../types/inventory';
import { ProductCostGovernanceAuditSignoffPanel } from './ProductCostGovernanceAuditSignoffPanel';
import { toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostGovernanceQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostGovernanceReviewPanelProps = {
  costGovernanceAuditQuery: CostGovernanceQueryState;
  costGovernanceSignoffQuery: CostGovernanceQueryState;
  costGovernanceReviewQueueQuery: CostGovernanceQueryState;
  costGovernanceReviewPackQuery: CostGovernanceQueryState;
  costGovernanceClosureQuery: CostGovernanceQueryState;
  costGovernanceAuditPack?: ProductCostGovernanceAuditPackResponse;
  costGovernanceSignoff?: ProductCostGovernanceSignoffSummaryResponse;
  costGovernanceReviewQueue?: ProductCostGovernanceReviewQueueResponse;
  costGovernanceReviewPack?: ProductCostGovernanceReviewPackResponse;
  costGovernanceClosureSummary?: ProductCostGovernanceClosureSummaryResponse;
  handleExportCostGovernanceAuditCsv: () => void;
  handleExportCostGovernanceReviewPackCsv: () => void;
  handleExportCostGovernanceClosureCsv: () => void;
  handlePrintCostGovernanceAudit: () => void;
};

export function ProductCostGovernanceReviewPanel({
  costGovernanceAuditQuery,
  costGovernanceSignoffQuery,
  costGovernanceReviewQueueQuery,
  costGovernanceReviewPackQuery,
  costGovernanceClosureQuery,
  costGovernanceAuditPack,
  costGovernanceSignoff,
  costGovernanceReviewQueue,
  costGovernanceReviewPack,
  costGovernanceClosureSummary,
  handleExportCostGovernanceAuditCsv,
  handleExportCostGovernanceReviewPackCsv,
  handleExportCostGovernanceClosureCsv,
  handlePrintCostGovernanceAudit
}: ProductCostGovernanceReviewPanelProps) {
  return (
    <>
            <ProductCostGovernanceAuditSignoffPanel
              costGovernanceAuditQuery={costGovernanceAuditQuery}
              costGovernanceSignoffQuery={costGovernanceSignoffQuery}
              costGovernanceAuditPack={costGovernanceAuditPack}
              costGovernanceSignoff={costGovernanceSignoff}
              handleExportCostGovernanceAuditCsv={handleExportCostGovernanceAuditCsv}
              handlePrintCostGovernanceAudit={handlePrintCostGovernanceAudit}
            />

            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Governance review queue</h4>
                  <div style={styles.rowSubtle}>Human-review work queue composed from blockers, warnings, remediation items, and priority products. Read-only only.</div>
                </div>
                <span style={styles.badge}>{costGovernanceReviewQueue?.review_status || 'unknown'}</span>
              </div>

              {costGovernanceReviewQueueQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading governance review queue...</div>
              ) : costGovernanceReviewQueueQuery.isError ? (
                <div style={styles.errorBox}>Unable to load governance review queue.</div>
              ) : (
                <>
                  <div style={styles.costReadinessGrid}>
                    <StatCard title="Queue Items" value={toNumber(costGovernanceReviewQueue?.totals.queue_items)} subtitle="Review work items" tone={toNumber(costGovernanceReviewQueue?.totals.queue_items) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Blockers" value={toNumber(costGovernanceReviewQueue?.totals.blockers)} subtitle="Before sign-off" tone={toNumber(costGovernanceReviewQueue?.totals.blockers) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Warnings" value={toNumber(costGovernanceReviewQueue?.totals.warnings)} subtitle="Conditional review" tone={toNumber(costGovernanceReviewQueue?.totals.warnings) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Priority Products" value={toNumber(costGovernanceReviewQueue?.totals.priority_products)} subtitle="Product-level review" />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskListCard}>
                      <h4 style={styles.sectionTitle}>Review queue items</h4>
                      {(costGovernanceReviewQueue?.queue_items ?? []).length === 0 ? (
                        <div style={styles.rowSubtle}>No governance review queue items found.</div>
                      ) : (
                        (costGovernanceReviewQueue?.queue_items ?? []).slice(0, 8).map((item, index) => (
                          <div key={`${item.queue_type}-${item.key}-${index}`} style={styles.riskListItem}>
                            <div>
                              <div style={styles.rowTitle}>{item.label}</div>
                              <div style={styles.rowSubtle}>{item.detail}</div>
                              <div style={styles.rowSubtle}>Owner: {item.owner_hint} • Evidence: {item.evidence}</div>
                            </div>
                            <span style={styles.badge}>{item.priority}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={styles.riskListCard}>
                      <h4 style={styles.sectionTitle}>Reviewer guidance</h4>
                      {(costGovernanceReviewQueue?.reviewer_guidance ?? []).length === 0 ? (
                        <div style={styles.rowSubtle}>No reviewer guidance needed.</div>
                      ) : (
                        (costGovernanceReviewQueue?.reviewer_guidance ?? []).map((item) => (
                          <div key={item} style={styles.riskListItem}>
                            <div>
                              <div style={styles.rowTitle}>{item}</div>
                              <div style={styles.rowSubtle}>Use existing audited product and receiving workflows.</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Governance review pack</h4>
                  <div style={styles.rowSubtle}>Closure-ready bundle combining sign-off, review queue, priority products, and audit evidence. Read-only export only.</div>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={handleExportCostGovernanceReviewPackCsv} disabled={!costGovernanceReviewPack?.review_export_rows?.length}>
                  Export Review Pack CSV
                </button>
              </div>

              {costGovernanceReviewPackQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading governance review pack...</div>
              ) : costGovernanceReviewPackQuery.isError ? (
                <div style={styles.errorBox}>Unable to load governance review pack.</div>
              ) : (
                <>
                  <div style={styles.costReadinessGrid}>
                    <StatCard title="Closure Status" value={costGovernanceReviewPack?.closure_status || 'unknown'} subtitle={costGovernanceReviewPack?.can_close_review ? 'Ready to close' : 'Keep review open'} tone={costGovernanceReviewPack?.can_close_review ? 'good' : 'warn'} />
                    <StatCard title="Review Rows" value={toNumber(costGovernanceReviewPack?.totals.review_export_rows)} subtitle="CSV evidence rows" />
                    <StatCard title="Queue Items" value={toNumber(costGovernanceReviewPack?.totals.queue_items)} subtitle="Included in pack" tone={toNumber(costGovernanceReviewPack?.totals.queue_items) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Product Rows" value={toNumber(costGovernanceReviewPack?.product_review_rows.length)} subtitle="Priority products" />
                  </div>

                  <div style={styles.riskGrid}>
                    {(costGovernanceReviewPack?.closure_cards ?? []).map((card) => (
                      <div key={card.key} style={styles.riskListCard}>
                        <div style={styles.rowTitle}>{card.label}</div>
                        <div style={styles.rowSubtle}>{card.detail}</div>
                        <span style={styles.badge}>{card.status}</span>
                      </div>
                    ))}
                  </div>

                  {(costGovernanceReviewPack?.closure_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costGovernanceReviewPack?.closure_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Governance closure summary</h4>
                  <p style={styles.panelSubtitle}>Final archive-readiness layer for costing governance. Derived and read-only.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={handleExportCostGovernanceClosureCsv} disabled={!costGovernanceClosureSummary?.archive_rows?.length}>
                  Export Closure CSV
                </button>
              </div>
              {costGovernanceClosureQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading closure summary...</div>
              ) : costGovernanceClosureQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost governance closure summary.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Closure Status" value={costGovernanceClosureSummary?.closure_status || 'unknown'} subtitle={costGovernanceClosureSummary?.can_archive ? 'Ready to archive' : 'Keep open'} tone={costGovernanceClosureSummary?.can_archive ? 'good' : 'warn'} />
                    <StatCard title="Blockers" value={toNumber(costGovernanceClosureSummary?.totals.blockers)} subtitle="Must be zero" tone={toNumber(costGovernanceClosureSummary?.totals.blockers) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Archive Rows" value={toNumber(costGovernanceClosureSummary?.totals.archive_rows)} subtitle="Closure evidence rows" />
                    <StatCard title="Warnings" value={toNumber(costGovernanceClosureSummary?.totals.warnings)} subtitle="Follow-up visibility" tone={toNumber(costGovernanceClosureSummary?.totals.warnings) > 0 ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costGovernanceClosureSummary?.closure_checklist ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <span style={styles.badge}>{item.status}</span>
                      </div>
                    ))}
                  </div>

                  {(costGovernanceClosureSummary?.closure_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costGovernanceClosureSummary?.closure_guidance ?? []).map((item) => (
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
