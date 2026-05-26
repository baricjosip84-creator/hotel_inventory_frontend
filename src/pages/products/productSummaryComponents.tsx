import type { ProductCostRiskItem, ProductCostValuationItem } from '../../types/inventory';
import { formatMoney, formatValuationBasis, toNumber } from './productFormatting';
import { styles } from './productStyles';

export function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'bad'
          ? styles.statValueBad
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}


type CostRiskListProps = {
  title: string;
  emptyText: string;
  rows: ProductCostRiskItem[];
  renderDetail: (row: ProductCostRiskItem) => string;
  onOpenHistory: (product: ProductCostRiskItem) => void;
};

export function CostRiskList(props: CostRiskListProps) {
  return (
    <div style={styles.riskCard}>
      <h4 style={styles.sectionTitle}>{props.title}</h4>
      {props.rows.length === 0 ? (
        <div style={styles.rowSubtle}>{props.emptyText}</div>
      ) : (
        <div style={styles.riskList}>
          {props.rows.map((row) => (
            <div key={row.id} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{row.name}</div>
                <div style={styles.rowSubtle}>{props.renderDetail(row)}</div>
              </div>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => props.onOpenHistory(row)}
              >
                Cost History
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


type CostValuationListProps = {
  title: string;
  emptyText: string;
  rows: ProductCostValuationItem[];
  onOpenHistory: (product: ProductCostValuationItem) => void;
};

export function CostValuationList(props: CostValuationListProps) {
  return (
    <div style={styles.riskCard}>
      <h4 style={styles.sectionTitle}>{props.title}</h4>
      {props.rows.length === 0 ? (
        <div style={styles.rowSubtle}>{props.emptyText}</div>
      ) : (
        <div style={styles.riskList}>
          {props.rows.map((row) => (
            <div key={row.id} style={styles.riskListItem}>
              <div>
                <div style={styles.rowTitle}>{row.name}</div>
                <div style={styles.rowSubtle}>
                  {formatMoney(row.estimated_inventory_value)} • {toNumber(row.current_stock_quantity).toLocaleString()} {row.unit} • {formatValuationBasis(row.valuation_basis)}
                </div>
              </div>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => props.onOpenHistory(row)}
              >
                Cost History
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
