import type { ProductCostGovernanceDetailsResponse } from '../../types/inventory';
import { formatMoney } from './productFormatting';
import { styles } from './productStyles';

type CostGovernanceQueryState = {
  isLoading: boolean;
};

type GovernancePriorityProduct = ProductCostGovernanceDetailsResponse['priority_products'][number];

type ProductCostGovernanceDetailsPanelProps = {
  costGovernanceDetailsQuery: CostGovernanceQueryState;
  costGovernanceDetails?: ProductCostGovernanceDetailsResponse;
  handleOpenCostHistory: (product: GovernancePriorityProduct) => void;
};

export function ProductCostGovernanceDetailsPanel({
  costGovernanceDetailsQuery,
  costGovernanceDetails,
  handleOpenCostHistory
}: ProductCostGovernanceDetailsPanelProps) {
  return (
    <div style={styles.riskGrid}>
      <div style={styles.riskListCard}>
        <h4 style={styles.sectionTitle}>Governance remediation plan</h4>
        {costGovernanceDetailsQuery.isLoading ? (
          <div style={styles.rowSubtle}>Loading governance details...</div>
        ) : (costGovernanceDetails?.remediation_plan ?? []).length === 0 ? (
          <div style={styles.rowSubtle}>No detailed remediation steps required.</div>
        ) : (
          (costGovernanceDetails?.remediation_plan ?? []).map((item, index) => (
            <div key={`${item.key}-${index}`} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{item.action}</div>
                <div style={styles.rowSubtle}>{item.source}</div>
              </div>
              <span style={styles.badge}>{item.priority}</span>
            </div>
          ))
        )}
      </div>

      <div style={styles.riskListCard}>
        <h4 style={styles.sectionTitle}>Governance priority products</h4>
        {(costGovernanceDetails?.priority_products ?? []).length === 0 ? (
          <div style={styles.rowSubtle}>No priority governance products found.</div>
        ) : (
          (costGovernanceDetails?.priority_products ?? []).slice(0, 6).map((row) => (
            <div key={`${row.id}-governance`} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{row.name}</div>
                <div style={styles.rowSubtle}>
                  {formatMoney(row.estimated_inventory_value)} • {row.category || 'Uncategorized'}
                </div>
              </div>
              <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                History
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
