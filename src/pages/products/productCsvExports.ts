import type {
  ProductCostActionDetailsResponse,
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceClosureSummaryResponse,
  ProductCostGovernanceHandoffSummaryResponse,
  ProductCostGovernanceReviewPackResponse,
  ProductCostHistoryItem,
  ProductCostReportSummaryResponse,
  ProductCostRiskDetailsResponse,
  ProductCostRiskItem,
  ProductCostValuationDetailsResponse,
  ProductItem,
  ProductStandardCostHistoryItem
} from '../../types/inventory';
import { downloadCsv } from './productFormatting';

export function exportCostHistoryCsv(
  selectedCostProduct: ProductItem | ProductCostRiskItem | null,
  costHistory: ProductCostHistoryItem[]
) {
  if (!selectedCostProduct || costHistory.length === 0) return;

  const rows = costHistory.map((movement) => ({
    movement_id: movement.id,
    product_id: movement.product_id,
    product_name: movement.product_name,
    change: movement.change,
    reason: movement.reason,
    unit_cost: movement.unit_cost ?? '',
    total_cost: movement.total_cost ?? '',
    cost_source: movement.cost_source || '',
    shipment_id: movement.shipment_id || '',
    shipment_po_number: movement.shipment_po_number || '',
    receiving_note: movement.receiving_note || '',
    user: movement.user_name || movement.user_id || '',
    created_at: movement.created_at
  }));

  downloadCsv(`product-cost-history-${selectedCostProduct.id}.csv`, rows);
}

export function exportStandardCostHistoryCsv(
  selectedCostProduct: ProductItem | ProductCostRiskItem | null,
  standardCostHistory: ProductStandardCostHistoryItem[]
) {
  if (!selectedCostProduct || standardCostHistory.length === 0) return;

  const rows = standardCostHistory.map((entry) => ({
    history_id: entry.id,
    product_id: entry.product_id,
    product_name: entry.product_name,
    previous_standard_unit_cost: entry.previous_standard_unit_cost ?? '',
    new_standard_unit_cost: entry.new_standard_unit_cost ?? '',
    changed_by: entry.changed_by_user_name || entry.changed_by_user_id || '',
    changed_at: entry.changed_at,
    change_source: entry.change_source
  }));

  downloadCsv(`product-standard-cost-history-${selectedCostProduct.id}.csv`, rows);
}

export function exportProductsCsv(products: ProductItem[]) {
  const rows = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category || '',
    unit: product.unit,
    min_stock: product.min_stock,
    supplier: product.supplier_name || '',
    default_barcode: product.barcode || '',
    current_stock_quantity: product.current_stock_quantity ?? 0,
    latest_unit_cost: product.latest_unit_cost ?? '',
    standard_unit_cost: product.standard_unit_cost ?? '',
    effective_unit_cost: product.effective_unit_cost ?? '',
    effective_cost_source: product.effective_cost_source || '',
    effective_cost_at: product.effective_cost_at || '',
    latest_cost_source: product.latest_cost_source || '',
    latest_cost_at: product.latest_cost_at || '',
    estimated_inventory_value: product.estimated_inventory_value ?? '',
    cost_variance_status: product.cost_variance_status || '',
    cost_variance_amount: product.cost_variance_amount ?? '',
    cost_variance_percent: product.cost_variance_percent ?? '',
    created_at: product.created_at,
    version: product.version
  }));

  downloadCsv('products-costing.csv', rows);
}

export function exportCostReportCsv(costReportSummary: ProductCostReportSummaryResponse | undefined) {
  const rows = costReportSummary?.export_rows ?? [];
  if (rows.length === 0) return;
  downloadCsv('product-cost-report-summary.csv', rows);
}

export function printCostReport(costReportSummary: ProductCostReportSummaryResponse | undefined) {
  if (!costReportSummary) return;
  window.print();
}

export function exportCostGovernanceAuditCsv(
  costGovernanceAuditPack: ProductCostGovernanceAuditPackResponse | undefined
) {
  const rows = costGovernanceAuditPack?.audit_rows ?? [];
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-audit-pack.csv', rows);
}

export function exportCostGovernanceReviewPackCsv(
  costGovernanceReviewPack: ProductCostGovernanceReviewPackResponse | undefined
) {
  const rows = costGovernanceReviewPack?.review_export_rows ?? [];
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-review-pack.csv', rows);
}

export function exportCostGovernanceClosureCsv(
  costGovernanceClosureSummary: ProductCostGovernanceClosureSummaryResponse | undefined
) {
  const rows = costGovernanceClosureSummary?.archive_rows ?? [];
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-closure-summary.csv', rows);
}

export function exportCostGovernanceHandoffCsv(
  costGovernanceHandoffSummary: ProductCostGovernanceHandoffSummaryResponse | undefined
) {
  const rows = costGovernanceHandoffSummary?.handoff_rows ?? [];
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-handoff-summary.csv', rows);
}

export function printCostGovernanceAudit(
  costGovernanceAuditPack: ProductCostGovernanceAuditPackResponse | undefined
) {
  if (!costGovernanceAuditPack) return;
  window.print();
}

export function exportCostValuationDetailsCsv(
  costValuationDetails: ProductCostValuationDetailsResponse | undefined
) {
  const rows = (costValuationDetails?.rows ?? []).map((row) => ({
    product_id: row.id,
    product_name: row.name,
    category: row.category || '',
    valuation_basis: row.valuation_basis,
    stock_quantity: row.current_stock_quantity ?? 0,
    unit: row.unit,
    latest_unit_cost: row.latest_unit_cost ?? '',
    latest_cost_source: row.latest_cost_source || '',
    standard_unit_cost: row.standard_unit_cost ?? '',
    effective_unit_cost: row.effective_unit_cost ?? '',
    effective_cost_source: row.effective_cost_source || '',
    estimated_inventory_value: row.estimated_inventory_value ?? ''
  }));

  if (rows.length === 0) return;
  downloadCsv('product-cost-valuation-details.csv', rows);
}

export function exportCostActionDetailsCsv(
  costActionDetails: ProductCostActionDetailsResponse | undefined
) {
  const rows = (costActionDetails?.rows ?? []).map((row) => ({
    product_id: row.id,
    product_name: row.name,
    category: row.category || '',
    action_type: row.action_type || '',
    recommended_action: row.recommended_action || '',
    action_priority_score: row.action_priority_score ?? '',
    stock_quantity: row.current_stock_quantity ?? 0,
    unit: row.unit,
    estimated_inventory_value: row.estimated_inventory_value ?? '',
    standard_unit_cost: row.standard_unit_cost ?? '',
    latest_unit_cost: row.latest_unit_cost ?? '',
    cost_variance_percent: row.cost_variance_percent ?? '',
    cost_history_spread_percent: row.cost_history_spread_percent ?? ''
  }));

  if (rows.length === 0) return;
  downloadCsv('product-cost-action-details.csv', rows);
}

export function exportCostRiskDetailsCsv(costRiskDetails: ProductCostRiskDetailsResponse | undefined) {
  const rows = (costRiskDetails?.rows ?? []).map((row) => ({
    product_id: row.id,
    product_name: row.name,
    category: row.category || '',
    risk_type: row.risk_type || '',
    risk_priority_score: row.risk_priority_score ?? '',
    stock_quantity: row.current_stock_quantity ?? 0,
    unit: row.unit,
    estimated_inventory_value: row.estimated_inventory_value ?? '',
    standard_unit_cost: row.standard_unit_cost ?? '',
    latest_unit_cost: row.latest_unit_cost ?? '',
    cost_variance_percent: row.cost_variance_percent ?? '',
    cost_history_spread_percent: row.cost_history_spread_percent ?? '',
    min_unit_cost: row.min_unit_cost ?? '',
    max_unit_cost: row.max_unit_cost ?? ''
  }));

  if (rows.length === 0) return;
  downloadCsv('product-cost-risk-details.csv', rows);
}
