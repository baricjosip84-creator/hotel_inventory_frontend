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
import { getActiveTenantCurrency } from '../../lib/tenantCurrency';
import { downloadCsv } from './productFormatting';

type UiTranslator = (englishText: string) => string;
const identityUi: UiTranslator = (englishText) => englishText;

const HEADER_LABELS: Record<string, string> = {
  product_name: 'Product name', change: 'Change', reason: 'Reason',
  unit_cost: 'Unit cost', total_cost: 'Total cost', cost_source: 'Cost source', shipment_po_number: 'Shipment PO number',
  receiving_note: 'Receiving note', user: 'User', created_at: 'Created at', currency_code: 'Currency',
  previous_standard_unit_cost: 'Previous standard unit cost', new_standard_unit_cost: 'New standard unit cost', changed_by: 'Changed by',
  changed_at: 'Changed at', change_source: 'Change source', sku: 'SKU', name: 'Product name', category: 'Category',
  unit: 'Unit', min_stock: 'Minimum stock', supplier: 'Supplier', default_barcode: 'Default barcode', current_stock_quantity: 'Current stock quantity',
  latest_unit_cost: 'Latest unit cost', standard_unit_cost: 'Standard unit cost', effective_unit_cost: 'Effective unit cost',
  effective_cost_source: 'Effective cost source', effective_cost_at: 'Effective cost at', latest_cost_source: 'Latest cost source', latest_cost_at: 'Latest cost at',
  estimated_inventory_value: 'Estimated inventory value', cost_variance_status: 'Cost variance status', cost_variance_amount: 'Cost variance amount',
  cost_variance_percent: 'Cost variance percent', valuation_basis: 'Valuation basis', stock_quantity: 'Stock quantity',
  action_type: 'Action type', recommended_action: 'Recommended action', action_priority_score: 'Action priority score',
  cost_history_spread_percent: 'Cost history spread percent', risk_type: 'Risk type', risk_priority_score: 'Risk priority score',
  min_unit_cost: 'Minimum unit cost', max_unit_cost: 'Maximum unit cost'
};

function humanizeHeader(key: string): string {
  return HEADER_LABELS[key] || key.split('_').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function withLocalizedHeaders(row: Record<string, unknown>, ui: UiTranslator): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [ui(humanizeHeader(key)), value]));
}


function withTenantCurrency<T extends Record<string, unknown>>(row: T): T & { currency_code: string } {
  return { ...row, currency_code: getActiveTenantCurrency() };
}

function withoutTechnicalIdentifiers(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !/(^id$|_id$|^version$|_version$)/i.test(key))
  );
}

function safeFileToken(value: string): string {
  const token = value.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
  return token || 'product';
}

function productExportToken(product: ProductItem | ProductCostRiskItem): string {
  return safeFileToken('sku' in product && product.sku ? product.sku : product.name);
}

export function exportCostHistoryCsv(
  selectedCostProduct: ProductItem | ProductCostRiskItem | null,
  costHistory: ProductCostHistoryItem[],
  ui: UiTranslator = identityUi
) {
  if (!selectedCostProduct || costHistory.length === 0) return;

  const rows = costHistory.map((movement) => withTenantCurrency({
    product_name: movement.product_name,
    change: movement.change,
    reason: movement.reason,
    unit_cost: movement.unit_cost ?? '',
    total_cost: movement.total_cost ?? '',
    cost_source: movement.cost_source || '',
    shipment_po_number: movement.shipment_po_number || '',
    receiving_note: movement.receiving_note || '',
    user: movement.user_name || ui('User unavailable'),
    created_at: movement.created_at
  }));

  downloadCsv(`product-cost-history-${productExportToken(selectedCostProduct)}.csv`, rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportStandardCostHistoryCsv(
  selectedCostProduct: ProductItem | ProductCostRiskItem | null,
  standardCostHistory: ProductStandardCostHistoryItem[],
  ui: UiTranslator = identityUi
) {
  if (!selectedCostProduct || standardCostHistory.length === 0) return;

  const rows = standardCostHistory.map((entry) => withTenantCurrency({
    product_name: entry.product_name,
    previous_standard_unit_cost: entry.previous_standard_unit_cost ?? '',
    new_standard_unit_cost: entry.new_standard_unit_cost ?? '',
    changed_by: entry.changed_by_user_name || ui('User unavailable'),
    changed_at: entry.changed_at,
    change_source: entry.change_source
  }));

  downloadCsv(`product-standard-cost-history-${productExportToken(selectedCostProduct)}.csv`, rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportProductsCsv(products: ProductItem[], ui: UiTranslator = identityUi) {
  const rows = products.map((product) => withTenantCurrency({
    sku: product.sku,
    name: product.name,
    category: product.category || '',
    unit: product.unit,
    min_stock: product.min_stock,
    supplier: Object.prototype.hasOwnProperty.call(product, 'supplier_name')
      ? product.supplier_name || ''
      : ui('Unavailable'),
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
    created_at: product.created_at
  }));

  downloadCsv('products-costing.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportCostReportCsv(costReportSummary: ProductCostReportSummaryResponse | undefined, ui: UiTranslator = identityUi) {
  const rows = (costReportSummary?.export_rows ?? []).map((row) => withTenantCurrency(withoutTechnicalIdentifiers(row)));
  if (rows.length === 0) return;
  downloadCsv('product-cost-report-summary.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function printCostReport(costReportSummary: ProductCostReportSummaryResponse | undefined) {
  if (!costReportSummary) return;
  window.print();
}

export function exportCostGovernanceAuditCsv(
  costGovernanceAuditPack: ProductCostGovernanceAuditPackResponse | undefined,
  ui: UiTranslator = identityUi
) {
  const rows = (costGovernanceAuditPack?.audit_rows ?? []).map((row) => withTenantCurrency(withoutTechnicalIdentifiers(row)));
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-audit-pack.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportCostGovernanceReviewPackCsv(
  costGovernanceReviewPack: ProductCostGovernanceReviewPackResponse | undefined,
  ui: UiTranslator = identityUi
) {
  const rows = (costGovernanceReviewPack?.review_export_rows ?? []).map((row) => withTenantCurrency(withoutTechnicalIdentifiers(row)));
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-review-pack.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportCostGovernanceClosureCsv(
  costGovernanceClosureSummary: ProductCostGovernanceClosureSummaryResponse | undefined,
  ui: UiTranslator = identityUi
) {
  const rows = (costGovernanceClosureSummary?.archive_rows ?? []).map((row) => withTenantCurrency(withoutTechnicalIdentifiers(row)));
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-closure-summary.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportCostGovernanceHandoffCsv(
  costGovernanceHandoffSummary: ProductCostGovernanceHandoffSummaryResponse | undefined,
  ui: UiTranslator = identityUi
) {
  const rows = (costGovernanceHandoffSummary?.handoff_rows ?? []).map((row) => withTenantCurrency(withoutTechnicalIdentifiers(row)));
  if (rows.length === 0) return;
  downloadCsv('product-cost-governance-handoff-summary.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function printCostGovernanceAudit(
  costGovernanceAuditPack: ProductCostGovernanceAuditPackResponse | undefined
) {
  if (!costGovernanceAuditPack) return;
  window.print();
}

export function exportCostValuationDetailsCsv(
  costValuationDetails: ProductCostValuationDetailsResponse | undefined,
  ui: UiTranslator = identityUi
) {
  const rows = (costValuationDetails?.rows ?? []).map((row) => withTenantCurrency({
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
  downloadCsv('product-cost-valuation-details.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportCostActionDetailsCsv(
  costActionDetails: ProductCostActionDetailsResponse | undefined,
  ui: UiTranslator = identityUi
) {
  const rows = (costActionDetails?.rows ?? []).map((row) => withTenantCurrency({
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
  downloadCsv('product-cost-action-details.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}

export function exportCostRiskDetailsCsv(costRiskDetails: ProductCostRiskDetailsResponse | undefined, ui: UiTranslator = identityUi) {
  const rows = (costRiskDetails?.rows ?? []).map((row) => withTenantCurrency({
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
  downloadCsv('product-cost-risk-details.csv', rows.map((row) => withLocalizedHeaders(row, ui)));
}
