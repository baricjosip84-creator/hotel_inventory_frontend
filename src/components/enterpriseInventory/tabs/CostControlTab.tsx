import { DataTable, MetricCard, styles } from '../EnterpriseInventoryShared';
import { formatCurrency, formatDateTime, formatNumber, formatRecordValue } from '../EnterpriseInventoryFormat';

type CostControlTabProps = {
  highVarianceCostRows: any;
  inconsistentCostRows: any;
  missingCostRows: any;
  productCostActionAgeBands: any;
  productCostActionAgeSummaryQuery: any;
  productCostActionCategories: any;
  productCostActionCategorySummaryQuery: any;
  productCostActionCoverageRows: any;
  productCostActionCoverageSummaryQuery: any;
  productCostActionImpactSummaryQuery: any;
  productCostActionPlanSummaryQuery: any;
  productCostActionRows: any;
  productCostActionSourceSummaryQuery: any;
  productCostActionSources: any;
  productCostActionSummaryQuery: any;
  productCostActionSupplierSummaryQuery: any;
  productCostActionSuppliers: any;
  productCostAlertGroups: any;
  productCostAlertSummaryQuery: any;
  productCostBasisRows: any;
  productCostCategoryRows: any;
  productCostCoverageGaps: any;
  productCostDashboardCategories: any;
  productCostDashboardPriorityProducts: any;
  productCostDashboardSummaryQuery: any;
  productCostGovernanceAuditPackQuery: any;
  productCostGovernanceAuditRows: any;
  productCostGovernanceBlockers: any;
  productCostGovernanceChecklist: any;
  productCostGovernanceClosureChecklist: any;
  productCostGovernanceClosureSummaryQuery: any;
  productCostGovernanceDetailsQuery: any;
  productCostGovernanceFailedChecklist: any;
  productCostGovernanceHandoffChecklist: any;
  productCostGovernanceHandoffSummaryQuery: any;
  productCostGovernanceOwnerSummary: any;
  productCostGovernancePriorityProducts: any;
  productCostGovernanceQueueItems: any;
  productCostGovernanceRemediationPlan: any;
  productCostGovernanceReviewExportRows: any;
  productCostGovernanceReviewPackQuery: any;
  productCostGovernanceReviewQueueQuery: any;
  productCostGovernanceSignoffChecklist: any;
  productCostGovernanceSignoffSummaryQuery: any;
  productCostGovernanceSummaryQuery: any;
  productCostGovernanceWarnings: any;
  productCostGovernanceWatchChecklist: any;
  productCostHardeningFailedChecklist: any;
  productCostHardeningSummaryQuery: any;
  productCostImpactRows: any;
  productCostNextActions: any;
  productCostOperationsControlChecks: any;
  productCostOperationsControlSummaryQuery: any;
  productCostOperationsEscalationRules: any;
  productCostOperationsEvidenceSections: any;
  productCostOperationsEvidenceSummaryQuery: any;
  productCostOperationsReadinessChecklist: any;
  productCostOperationsReadinessSummaryQuery: any;
  productCostOperationsRhythm: any;
  productCostOperationsRunbookSummaryQuery: any;
  productCostPriorityBands: any;
  productCostRecommendationGroups: any;
  productCostRecommendationSummaryQuery: any;
  productCostReportSummaryQuery: any;
  productCostRiskSummary: any;
  productCostRiskSummaryQuery: any;
  productCostTopAlerts: any;
  productCostTopImpactProducts: any;
  productCostTopRecommendations: any;
  productCostTopValueRows: any;
  productCostValuationDetailRows: any;
  productCostValuationDetailsQuery: any;
  productCostValuationSummary: any;
  productCostValuationSummaryQuery: any;
  carryingCostProductionReview: any;
  carryingCostProductionReviewRows: any;
  carryingCostProductionControls: any;
  carryingCostProductionReviewQuery: any;
  deadStockProductionReview: any;
  deadStockProductionReviewRows: any;
  deadStockProductionControls: any;
  deadStockProductionReviewQuery: any;
  marginAwareProductionReview: any;
  marginAwareProductionReviewRows: any;
  marginAwareProductionControls: any;
  marginAwareProductionReviewQuery: any;
  procurementSpendProductionReview: any;
  procurementSpendProductionReviewRows: any;
  procurementSpendProductionControls: any;
  procurementSpendProductionReviewQuery: any;
};

const formatCodeLabel = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCodeRecordValue = (record: Record<string, unknown> | null | undefined, key: string): string => {
  if (!record) return '-';
  return formatCodeLabel(record[key]);
};

const CODE_VALUE_KEYS = /(status|state|severity|priority|readiness|owner|source|section|key|type|basis|decision|action)$/i;
const CODE_VALUE_WORDS = new Set([
  'active_review',
  'blocker',
  'clear',
  'control_review',
  'critical',
  'evidence_review',
  'fail',
  'followup_required',
  'high',
  'info',
  'low',
  'medium',
  'no',
  'no_mutation',
  'not_ready',
  'pass',
  'review',
  'review_required',
  'warning',
  'watch',
  'yes'
]);

const formatCostDetailValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value !== 'string') return formatRecordValue({ value }, 'value');

  return value.replace(
    /(^|\s)(\d+(?:\.\d+)?)\s+(estimated value|estimated inventory value|inventory value|review value|alerted value|actionable value|capital|spend|cost)\b/gi,
    (_match, prefix: string, amount: string, label: string) => `${prefix}${formatCurrency(amount)} ${label}`
  );
};

const formatPercentValue = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${formatNumber(parsed)}%` : String(value);
};

const shouldFormatCostValueAsCurrency = (key: string): boolean => {
  if (/(_percent|count|score|products?|rows?|status|source|date|age|current_value)$/i.test(key)) {
    return false;
  }
  return /(estimated|inventory|review|received|standard|fallback|alerted|recommended|committed|overdue|spend|capital|cost|value)/i.test(key);
};

const formatCostTableValue = (key: unknown, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';

  const normalizedKey = String(key ?? '');
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (/(_at|date)$/i.test(normalizedKey)) {
    return formatDateTime(String(value));
  }
  if (/_percent$/i.test(normalizedKey)) {
    return formatPercentValue(value as number | string | null | undefined);
  }
  if (shouldFormatCostValueAsCurrency(normalizedKey)) {
    return formatCurrency(value as number | string | null | undefined);
  }
  if (CODE_VALUE_KEYS.test(normalizedKey) || CODE_VALUE_WORDS.has(normalizedValue.toLowerCase())) {
    return formatCodeLabel(value);
  }
  if (typeof value === 'number') {
    return formatNumber(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string') {
    if (value.includes('_') && !value.includes(' ')) return formatCodeLabel(value);
    return formatCostDetailValue(value);
  }

  return formatRecordValue({ value }, 'value');
};

const toHardeningReviewRows = (queryData: any, fallbackRows: any[]): string[][] => {
  if (Array.isArray(fallbackRows) && fallbackRows.length) {
    return fallbackRows.map((item: any) => [
      formatRecordValue(item, 'label'),
      formatCodeLabel(item.status),
      formatCostDetailValue(item.detail)
    ]);
  }

  const actions = Array.isArray(queryData?.hardening_actions) ? queryData.hardening_actions : [];
  return actions.map((action: string) => ['Hardening action', 'Review', action]);
};

export function CostControlTab({
  highVarianceCostRows,
  inconsistentCostRows,
  missingCostRows,
  productCostActionAgeBands,
  productCostActionAgeSummaryQuery,
  productCostActionCategories,
  productCostActionCategorySummaryQuery,
  productCostActionCoverageRows,
  productCostActionCoverageSummaryQuery,
  productCostActionImpactSummaryQuery,
  productCostActionPlanSummaryQuery,
  productCostActionRows,
  productCostActionSourceSummaryQuery,
  productCostActionSources,
  productCostActionSummaryQuery,
  productCostActionSupplierSummaryQuery,
  productCostActionSuppliers,
  productCostAlertGroups,
  productCostAlertSummaryQuery,
  productCostBasisRows,
  productCostCategoryRows,
  productCostCoverageGaps,
  productCostDashboardCategories,
  productCostDashboardPriorityProducts,
  productCostDashboardSummaryQuery,
  productCostGovernanceAuditPackQuery,
  productCostGovernanceAuditRows,
  productCostGovernanceBlockers,
  productCostGovernanceChecklist,
  productCostGovernanceClosureChecklist,
  productCostGovernanceClosureSummaryQuery,
  productCostGovernanceDetailsQuery,
  productCostGovernanceFailedChecklist,
  productCostGovernanceHandoffChecklist,
  productCostGovernanceHandoffSummaryQuery,
  productCostGovernanceOwnerSummary,
  productCostGovernancePriorityProducts,
  productCostGovernanceQueueItems,
  productCostGovernanceRemediationPlan,
  productCostGovernanceReviewExportRows,
  productCostGovernanceReviewPackQuery,
  productCostGovernanceReviewQueueQuery,
  productCostGovernanceSignoffChecklist,
  productCostGovernanceSignoffSummaryQuery,
  productCostGovernanceSummaryQuery,
  productCostGovernanceWarnings,
  productCostGovernanceWatchChecklist,
  productCostHardeningFailedChecklist,
  productCostHardeningSummaryQuery,
  productCostImpactRows,
  productCostNextActions,
  productCostOperationsControlChecks,
  productCostOperationsControlSummaryQuery,
  productCostOperationsEscalationRules,
  productCostOperationsEvidenceSections,
  productCostOperationsEvidenceSummaryQuery,
  productCostOperationsReadinessChecklist,
  productCostOperationsReadinessSummaryQuery,
  productCostOperationsRhythm,
  productCostOperationsRunbookSummaryQuery,
  productCostPriorityBands,
  productCostRecommendationGroups,
  productCostRecommendationSummaryQuery,
  productCostReportSummaryQuery,
  productCostRiskSummary,
  productCostRiskSummaryQuery,
  productCostTopAlerts,
  productCostTopImpactProducts,
  productCostTopRecommendations,
  productCostTopValueRows,
  productCostValuationDetailRows,
  productCostValuationDetailsQuery,
  productCostValuationSummary,
  productCostValuationSummaryQuery,
  carryingCostProductionReview,
  carryingCostProductionReviewRows,
  carryingCostProductionControls,
  carryingCostProductionReviewQuery,
  deadStockProductionReview,
  deadStockProductionReviewRows,
  deadStockProductionControls,
  deadStockProductionReviewQuery,
  marginAwareProductionReview,
  marginAwareProductionReviewRows,
  marginAwareProductionControls,
  marginAwareProductionReviewQuery,
  procurementSpendProductionReview,
  procurementSpendProductionReviewRows,
  procurementSpendProductionControls,
  procurementSpendProductionReviewQuery,
}: CostControlTabProps) {
  const productCostHardeningReviewRows = toHardeningReviewRows(
    productCostHardeningSummaryQuery.data,
    productCostHardeningFailedChecklist
  );

  const governanceEvidenceSummaryRows = [
    ['Audit evidence', formatNumber(productCostGovernanceAuditRows.length), productCostGovernanceAuditPackQuery.isLoading ? '-' : 'Available'],
    ['Review export evidence', formatNumber(productCostGovernanceReviewExportRows.length), productCostGovernanceReviewPackQuery.isLoading ? '-' : 'Available'],
    ['Follow-up queue items', formatNumber(productCostGovernanceQueueItems.length), productCostGovernanceReviewQueueQuery.isLoading ? '-' : 'Available'],
    ['Sign-off checks', formatNumber(productCostGovernanceSignoffChecklist.length), productCostGovernanceSignoffSummaryQuery.isLoading ? '-' : 'Available'],
    ['Closure checks', formatNumber(productCostGovernanceClosureChecklist.length), productCostGovernanceClosureSummaryQuery.isLoading ? '-' : 'Available'],
    ['Handoff checks', formatNumber(productCostGovernanceHandoffChecklist.length), productCostGovernanceHandoffSummaryQuery.isLoading ? '-' : 'Available']
  ];

  return (
    <section style={styles.stack}>


      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Carrying-cost production review</h2>
        <p style={styles.helper}>Reads GET /financial-intelligence/carrying-cost/production-review. This is a read-only financial intelligence control: it reviews high-value stock, monthly carrying-cost exposure, aged stock pressure, and finance-review requirements before procurement, transfer, liquidation, or accounting follow-up.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={formatCodeLabel(carryingCostProductionReview?.summary?.production_status)} />
          <MetricCard label="Reviewed profiles" value={formatNumber(carryingCostProductionReview?.summary?.reviewed_profile_count)} />
          <MetricCard label="Blocked profiles" value={formatNumber(carryingCostProductionReview?.summary?.blocked_profile_count)} />
          <MetricCard label="Watch profiles" value={formatNumber(carryingCostProductionReview?.summary?.watch_profile_count)} />
          <MetricCard label="Inventory value reviewed" value={formatCurrency(carryingCostProductionReview?.summary?.total_inventory_value_at_review)} />
          <MetricCard label="Monthly carrying cost" value={formatCurrency(carryingCostProductionReview?.summary?.total_monthly_carrying_cost_at_review)} />
        </div>
        <DataTable
          loading={carryingCostProductionReviewQuery.isLoading}
          empty="No carrying-cost production review rows returned."
          headers={['Product', 'Location', 'Readiness', 'Score', 'Monthly cost', 'Factors']}
          rows={carryingCostProductionReviewRows.map((item: any) => [
            item.product_name || item.product_id || '-',
            item.storage_location_name || item.storage_location_id || '-',
            formatCodeLabel(item.readiness_state),
            formatNumber(item.carrying_cost_score),
            formatCurrency(item.monthly_carrying_cost),
            Array.isArray(item.factors) ? item.factors.map((factor: any) => factor.label || factor.code).join(', ') : '-'
          ])}
        />
        {carryingCostProductionControls.length ? (
          <ul style={styles.list}>
            {carryingCostProductionControls.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Dead-stock production review</h2>
        <p style={styles.helper}>Reads GET /financial-intelligence/dead-stock-risk/production-review. This is a read-only financial intelligence control: it reviews stale stock, capital lockup, carrying-cost exposure, and human-review requirements before any transfer, liquidation, accounting, or procurement action.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={formatCodeLabel(deadStockProductionReview?.summary?.production_status)} />
          <MetricCard label="Reviewed profiles" value={formatNumber(deadStockProductionReview?.summary?.reviewed_profile_count)} />
          <MetricCard label="Blocked profiles" value={formatNumber(deadStockProductionReview?.summary?.blocked_profile_count)} />
          <MetricCard label="Watch profiles" value={formatNumber(deadStockProductionReview?.summary?.watch_profile_count)} />
          <MetricCard label="Capital at review" value={formatCurrency(deadStockProductionReview?.summary?.total_capital_at_review)} />
          <MetricCard label="Blocked capital" value={formatCurrency(deadStockProductionReview?.summary?.blocked_capital_at_review)} />
        </div>
        <DataTable
          loading={deadStockProductionReviewQuery.isLoading}
          empty="No dead-stock production review rows returned."
          headers={['Product', 'Location', 'Readiness', 'Score', 'Capital', 'Factors']}
          rows={deadStockProductionReviewRows.map((item: any) => [
            item.product_name || item.product_id || '-',
            item.storage_location_name || item.storage_location_id || '-',
            formatCodeLabel(item.readiness_state),
            formatNumber(item.dead_stock_score),
            formatCurrency(item.capital_locked_value),
            Array.isArray(item.factors) ? item.factors.map((factor: any) => factor.label || factor.code).join(', ') : '-'
          ])}
        />
        {deadStockProductionControls.length ? (
          <ul style={styles.list}>
            {deadStockProductionControls.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </section>




      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Procurement spend production review</h2>
        <p style={styles.helper}>Reads GET /financial-intelligence/procurement-spend-intelligence/production-review. This is a read-only procurement/finance control: it reviews category spend pressure, open commitments, overdue spend, supplier concentration, and human-review requirements before approving more purchase-order spend or supplier changes.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={formatCodeLabel(procurementSpendProductionReview?.summary?.production_status)} />
          <MetricCard label="Reviewed categories" value={formatNumber(procurementSpendProductionReview?.summary?.reviewed_category_count)} />
          <MetricCard label="Blocked categories" value={formatNumber(procurementSpendProductionReview?.summary?.blocked_category_count)} />
          <MetricCard label="Human-review categories" value={formatNumber(procurementSpendProductionReview?.summary?.human_review_category_count)} />
          <MetricCard label="Committed spend" value={formatCurrency(procurementSpendProductionReview?.summary?.committed_spend_at_review)} />
          <MetricCard label="Overdue spend" value={formatCurrency(procurementSpendProductionReview?.summary?.overdue_spend_at_review)} />
        </div>
        <DataTable
          loading={procurementSpendProductionReviewQuery.isLoading}
          empty="No procurement spend production review rows returned."
          headers={['Category', 'Readiness', 'Pressure', 'Committed', 'Open', 'Factors']}
          rows={procurementSpendProductionReviewRows.map((item: any) => [
            item.category || '-',
            formatCodeLabel(item.readiness_state),
            formatCodeLabel(item.spend_pressure_tier || item.risk_level),
            formatCurrency(item.committed_spend_value),
            formatCurrency(item.open_spend_value),
            Array.isArray(item.factors) ? item.factors.map((factor: any) => factor.label || factor.code).join(', ') : '-'
          ])}
        />
        {procurementSpendProductionControls.length ? (
          <ul style={styles.list}>
            {procurementSpendProductionControls.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Margin-aware replenishment production review</h2>
        <p style={styles.helper}>Reads GET /financial-intelligence/margin-aware-replenishment/production-review. This is a read-only commercial control: it reviews replenishment spend, expected margin proxy, inbound overlap, carrying-cost drag, and human-review requirements before purchase-order creation or submission.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={formatCodeLabel(marginAwareProductionReview?.summary?.production_status)} />
          <MetricCard label="Reviewed profiles" value={formatNumber(marginAwareProductionReview?.summary?.reviewed_profile_count)} />
          <MetricCard label="Blocked profiles" value={formatNumber(marginAwareProductionReview?.summary?.blocked_profile_count)} />
          <MetricCard label="Watch profiles" value={formatNumber(marginAwareProductionReview?.summary?.watch_profile_count)} />
          <MetricCard label="Spend reviewed" value={formatCurrency(marginAwareProductionReview?.summary?.total_replenishment_spend_at_review)} />
          <MetricCard label="Expected margin value" value={formatCurrency(marginAwareProductionReview?.summary?.expected_margin_value_at_review)} />
        </div>
        <DataTable
          loading={marginAwareProductionReviewQuery.isLoading}
          empty="No margin-aware production review rows returned."
          headers={['Product', 'Location', 'Readiness', 'Decision', 'Spend', 'Factors']}
          rows={marginAwareProductionReviewRows.map((item: any) => [
            item.product_name || item.product_id || '-',
            item.storage_location_name || item.storage_location_id || '-',
            formatCodeLabel(item.readiness_state),
            formatCodeLabel(item.commercial_decision),
            formatCurrency(item.estimated_replenishment_cost),
            Array.isArray(item.factors) ? item.factors.map((factor: any) => factor.label || factor.code).join(', ') : '-'
          ])}
        />
        {marginAwareProductionControls.length ? (
          <ul style={styles.list}>
            {marginAwareProductionControls.map((item: string) => <li key={item}>{item}</li>)}
          </ul>
        ) : null}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Product cost control</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-risk-summary endpoint. Backend compares standard costs, latest received costs, inventory value, and historical cost spread.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Total products" value={formatNumber(productCostRiskSummary?.totals?.total_products)} />
          <MetricCard label="Stocked products" value={formatNumber(productCostRiskSummary?.totals?.stocked_products)} />
          <MetricCard label="Missing cost" value={formatNumber(productCostRiskSummary?.totals?.missing_cost_products)} />
          <MetricCard label="High variance" value={formatNumber(productCostRiskSummary?.totals?.high_variance_products)} />
          <MetricCard label="Inconsistent history" value={formatNumber(productCostRiskSummary?.totals?.inconsistent_cost_history_products)} />
          <MetricCard label="Variance threshold" value={`${formatNumber(productCostRiskSummary?.thresholds?.variance_threshold_percent)}%`} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost valuation summary</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-valuation-summary endpoint for inventory value by costing basis and category.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Estimated inventory value" value={formatCurrency(productCostValuationSummary?.totals?.total_estimated_inventory_value)} />
          <MetricCard label="Received-cost value" value={formatCurrency(productCostValuationSummary?.totals?.received_cost_value)} />
          <MetricCard label="Standard fallback value" value={formatCurrency(productCostValuationSummary?.totals?.standard_fallback_value)} />
          <MetricCard label="Unvalued stocked products" value={formatNumber(productCostValuationSummary?.totals?.unvalued_stocked_products)} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Valuation basis breakdown</h2>
        <DataTable
          loading={productCostValuationSummaryQuery.isLoading}
          empty="No valuation basis breakdown returned."
          headers={['Basis', 'Stocked products', 'Quantity', 'Estimated value']}
          rows={productCostBasisRows.map((item: any) => [
            formatCodeLabel(item.valuation_basis),
            formatRecordValue(item, 'stocked_products'),
            formatRecordValue(item, 'stock_quantity'),
            formatCurrency(item.estimated_value as number | string | null | undefined)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Top value categories</h2>
        <DataTable
          loading={productCostValuationSummaryQuery.isLoading}
          empty="No cost category breakdown returned."
          headers={['Category', 'Stocked products', 'Quantity', 'Estimated value', 'Unvalued products']}
          rows={productCostCategoryRows.map((item: any) => [
            formatRecordValue(item, 'category'),
            formatRecordValue(item, 'stocked_products'),
            formatRecordValue(item, 'stock_quantity'),
            formatCurrency(item.estimated_value as number | string | null | undefined),
            formatRecordValue(item, 'unvalued_stocked_products')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Top value products</h2>
        <DataTable
          loading={productCostValuationSummaryQuery.isLoading}
          empty="No top value products returned."
          headers={['Product', 'Category', 'Stock', 'Basis', 'Effective cost', 'Estimated value']}
          rows={productCostTopValueRows.map((item: any) => [
            item.name || item.product_name || item.product_id || item.id || '-',
            item.category || '-',
            `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
            formatCodeLabel(item.valuation_basis),
            formatCurrency(item.effective_unit_cost),
            formatCurrency(item.estimated_inventory_value)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Detailed valuation rows</h2>
        <DataTable
          loading={productCostValuationDetailsQuery.isLoading}
          empty="No valuation detail rows returned."
          headers={['Product', 'Category', 'Stock', 'Latest cost', 'Standard cost', 'Basis', 'Value']}
          rows={productCostValuationDetailRows.map((item: any) => [
            item.name || item.product_name || item.product_id || item.id || '-',
            item.category || '-',
            `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
            formatCurrency(item.latest_unit_cost),
            formatCurrency(item.standard_unit_cost),
            formatCodeLabel(item.valuation_basis),
            formatCurrency(item.estimated_inventory_value)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost action summary</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-action-summary endpoint for prioritized cost remediation signals.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Total actions" value={formatNumber(productCostActionSummaryQuery.data?.totals?.total_actions)} />
          <MetricCard label="Critical actions" value={formatNumber(productCostActionSummaryQuery.data?.totals?.critical_actions)} />
          <MetricCard label="High priority" value={formatNumber(productCostActionSummaryQuery.data?.totals?.high_priority_actions)} />
          <MetricCard label="Generated" value={formatDateTime(productCostActionSummaryQuery.data?.generated_at)} />
        </div>
        <DataTable
          loading={productCostActionSummaryQuery.isLoading}
          empty="No cost action summary rows returned."
          headers={['Action', 'Priority', 'Products', 'Estimated value', 'Reason']}
          rows={productCostActionRows.map((item: any) => [
            formatCodeRecordValue(item, 'action'),
            formatCodeRecordValue(item, 'priority'),
            formatRecordValue(item, 'product_count'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'reason')
          ])}
        />
      </section>



      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost action plan</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-action-plan-summary endpoint for prioritized costing follow-up bands and next actions.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Actionable products" value={formatNumber(productCostActionPlanSummaryQuery.data?.totals?.total_actionable_products)} />
          <MetricCard label="Critical products" value={formatNumber(productCostActionPlanSummaryQuery.data?.totals?.critical_products)} />
          <MetricCard label="High products" value={formatNumber(productCostActionPlanSummaryQuery.data?.totals?.high_products)} />
          <MetricCard label="Urgent value" value={formatCurrency(productCostActionPlanSummaryQuery.data?.totals?.urgent_estimated_inventory_value)} />
        </div>
        <DataTable
          loading={productCostActionPlanSummaryQuery.isLoading}
          empty="No cost action priority bands returned."
          headers={['Priority band', 'Products', 'Stock quantity', 'Estimated value', 'Max score']}
          rows={productCostPriorityBands.map((item: any) => [
            formatCodeLabel(item.priority_band),
            formatRecordValue(item, 'product_count'),
            formatRecordValue(item, 'stock_quantity'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'max_priority_score')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Next cost actions</h2>
        <DataTable
          loading={productCostActionPlanSummaryQuery.isLoading}
          empty="No next cost actions returned."
          headers={['Product', 'Category', 'Action', 'Priority', 'Score', 'Recommended action']}
          rows={productCostNextActions.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatRecordValue(item, 'category'),
            formatCodeLabel(item.action_type),
            formatCodeLabel(item.priority_band),
            formatRecordValue(item, 'action_priority_score'),
            formatCodeLabel(item.recommended_action)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost action category pressure</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-action-category-summary endpoint.</p>
        <DataTable
          loading={productCostActionCategorySummaryQuery.isLoading}
          empty="No cost action categories returned."
          headers={['Category', 'Products', 'Critical', 'High', 'Estimated value', 'Recommended focus']}
          rows={productCostActionCategories.map((item: any) => [
            formatRecordValue(item, 'category'),
            formatRecordValue(item, 'product_count'),
            formatRecordValue(item, 'critical_products'),
            formatRecordValue(item, 'high_products'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeRecordValue(item, 'recommended_focus')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost action impact</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-action-impact-summary endpoint.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Valued review" value={formatNumber(productCostActionImpactSummaryQuery.data?.totals?.valued_inventory_review_products)} />
          <MetricCard label="Unvalued stock" value={formatNumber(productCostActionImpactSummaryQuery.data?.totals?.unvalued_stock_review_products)} />
          <MetricCard label="Master data review" value={formatNumber(productCostActionImpactSummaryQuery.data?.totals?.master_data_review_products)} />
          <MetricCard label="Actionable value" value={formatCurrency(productCostActionImpactSummaryQuery.data?.totals?.total_actionable_estimated_value)} />
        </div>
        <DataTable
          loading={productCostActionImpactSummaryQuery.isLoading}
          empty="No cost impact rows returned."
          headers={['Impact type', 'Products', 'Stock quantity', 'Estimated value', 'Max score']}
          rows={productCostImpactRows.map((item: any) => [
            formatCodeLabel(item.impact_type),
            formatRecordValue(item, 'product_count'),
            formatRecordValue(item, 'stock_quantity'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'max_priority_score')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Top cost impact products</h2>
        <DataTable
          loading={productCostActionImpactSummaryQuery.isLoading}
          empty="No top impact products returned."
          headers={['Product', 'Impact type', 'Action', 'Stock', 'Value', 'Score']}
          rows={productCostTopImpactProducts.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatCodeLabel(item.impact_type),
            formatCodeLabel(item.action_type),
            formatRecordValue(item, 'current_stock_quantity'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'action_priority_score')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Supplier and source cost action split</h2>
        <p style={styles.helper}>Reads the existing supplier/source cost action summary endpoints.</p>
        <DataTable
          loading={productCostActionSupplierSummaryQuery.isLoading}
          empty="No supplier action rows returned."
          headers={['Supplier', 'Products', 'Critical', 'High', 'Estimated value', 'Recommended action']}
          rows={productCostActionSuppliers.map((item: any) => [
            formatRecordValue(item, 'supplier_name'),
            formatRecordValue(item, 'product_count'),
            formatRecordValue(item, 'critical_products'),
            formatRecordValue(item, 'high_products'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeLabel(item.recommended_supplier_action)
          ])}
        />
        <DataTable
          loading={productCostActionSourceSummaryQuery.isLoading}
          empty="No cost source rows returned."
          headers={['Cost source', 'Products', 'Missing source', 'Estimated value', 'Recommended source action']}
          rows={productCostActionSources.map((item: any) => [
            formatCodeRecordValue(item, 'cost_source'),
            formatRecordValue(item, 'product_count'),
            formatRecordValue(item, 'missing_source_products'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeLabel(item.recommended_source_action)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost evidence age and coverage</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-action-age-summary and GET /products/cost-action-coverage-summary endpoints.</p>
        <div style={styles.statGrid}>
          <MetricCard label="No cost date" value={formatNumber(productCostActionAgeSummaryQuery.data?.totals?.no_cost_date_products)} />
          <MetricCard label="Stale received cost" value={formatNumber(productCostActionAgeSummaryQuery.data?.totals?.stale_received_cost_products)} />
          <MetricCard label="Stocked cost coverage" value={`${formatNumber(productCostActionCoverageSummaryQuery.data?.totals?.stocked_cost_coverage_percent)}%`} />
          <MetricCard label="Uncosted stocked" value={formatNumber(productCostActionCoverageSummaryQuery.data?.totals?.uncosted_stocked_products)} />
        </div>
        <DataTable
          loading={productCostActionAgeSummaryQuery.isLoading}
          empty="No cost age bands returned."
          headers={['Age band', 'Products', 'Missing cost', 'Estimated value', 'Recommended age action']}
          rows={productCostActionAgeBands.map((item: any) => [
            formatCodeLabel(item.cost_age_band),
            formatRecordValue(item, 'product_count'),
            formatRecordValue(item, 'missing_cost_products'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeLabel(item.recommended_age_action)
          ])}
        />
        <DataTable
          loading={productCostActionCoverageSummaryQuery.isLoading}
          empty="No category coverage rows returned."
          headers={['Category', 'Stocked products', 'With cost basis', 'Uncosted', 'Coverage %', 'Actionable value']}
          rows={productCostActionCoverageRows.map((item: any) => [
            formatRecordValue(item, 'category'),
            formatRecordValue(item, 'stocked_products'),
            formatRecordValue(item, 'stocked_products_with_cost_basis'),
            formatRecordValue(item, 'uncosted_stocked_products'),
            `${formatRecordValue(item, 'stocked_cost_coverage_percent')}%`,
            formatCurrency(item.actionable_estimated_value as number | string | null | undefined)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost coverage action review</h2>
        <DataTable
          loading={productCostActionCoverageSummaryQuery.isLoading}
          empty="No cost coverage action review rows returned."
          headers={['Product', 'Category', 'Stock', 'Cost source', 'Review action', 'Score']}
          rows={productCostCoverageGaps.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatRecordValue(item, 'category'),
            formatRecordValue(item, 'current_stock_quantity'),
            formatCodeLabel(item.effective_cost_source),
            formatCodeLabel(item.action_type),
            formatRecordValue(item, 'action_priority_score')
          ])}
        />
      </section>


      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost alert summary</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-alert-summary endpoint.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Total alerts" value={formatNumber(productCostAlertSummaryQuery.data?.totals?.total_alerts)} />
          <MetricCard label="Critical alerts" value={formatNumber(productCostAlertSummaryQuery.data?.totals?.critical_alerts)} />
          <MetricCard label="Warning alerts" value={formatNumber(productCostAlertSummaryQuery.data?.totals?.warning_alerts)} />
          <MetricCard label="Alerted value" value={formatCurrency(productCostAlertSummaryQuery.data?.totals?.alerted_estimated_value)} />
        </div>
        <DataTable
          loading={productCostAlertSummaryQuery.isLoading}
          empty="No alert groups returned."
          headers={['Type', 'Severity', 'Count', 'Stock quantity', 'Value', 'Recommended action']}
          rows={productCostAlertGroups.map((item: any) => [
            formatCodeLabel(item.alert_type),
            formatCodeLabel(item.alert_severity),
            formatRecordValue(item, 'alert_count'),
            formatRecordValue(item, 'stock_quantity'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeLabel(item.recommended_alert_action)
          ])}
        />
        <DataTable
          loading={productCostAlertSummaryQuery.isLoading}
          empty="No top alert products returned."
          headers={['Product', 'Alert', 'Severity', 'Value', 'Variance %', 'Score']}
          rows={productCostTopAlerts.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatCodeLabel(item.alert_type),
            formatCodeLabel(item.alert_severity),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'cost_variance_percent'),
            formatRecordValue(item, 'alert_priority_score')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost recommendation summary</h2>
        <p style={styles.helper}>Reads the existing GET /products/cost-recommendation-summary endpoint.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Recommendations" value={formatNumber(productCostRecommendationSummaryQuery.data?.totals?.total_recommendations)} />
          <MetricCard label="Critical" value={formatNumber(productCostRecommendationSummaryQuery.data?.totals?.critical_recommendations)} />
          <MetricCard label="High" value={formatNumber(productCostRecommendationSummaryQuery.data?.totals?.high_recommendations)} />
          <MetricCard label="Recommended value" value={formatCurrency(productCostRecommendationSummaryQuery.data?.totals?.recommended_estimated_value)} />
        </div>
        <DataTable
          loading={productCostRecommendationSummaryQuery.isLoading}
          empty="No recommendation groups returned."
          headers={['Type', 'Priority', 'Count', 'Stock quantity', 'Value', 'Recommended action']}
          rows={productCostRecommendationGroups.map((item: any) => [
            formatCodeLabel(item.recommendation_type),
            formatCodeLabel(item.recommendation_priority),
            formatRecordValue(item, 'recommendation_count'),
            formatRecordValue(item, 'stock_quantity'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeLabel(item.recommended_action)
          ])}
        />
        <DataTable
          loading={productCostRecommendationSummaryQuery.isLoading}
          empty="No top recommendation products returned."
          headers={['Product', 'Recommendation', 'Priority', 'Value', 'Score']}
          rows={productCostTopRecommendations.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatCodeLabel(item.recommendation_type),
            formatCodeLabel(item.recommendation_priority),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'recommendation_score')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost executive dashboard and governance</h2>
        <p style={styles.helper}>Reads existing dashboard, report, and governance cost endpoints without mutating product or stock data.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Dashboard value" value={formatCurrency(productCostDashboardSummaryQuery.data?.totals?.total_estimated_inventory_value)} />
          <MetricCard label="Review value" value={formatCurrency(productCostDashboardSummaryQuery.data?.totals?.review_estimated_value)} />
          <MetricCard label="Governance score" value={formatNumber(productCostGovernanceSummaryQuery.data?.readiness_score)} />
          <MetricCard label="Governance status" value={formatCodeLabel(productCostGovernanceSummaryQuery.data?.governance_status)} />
        </div>
        <DataTable
          loading={productCostDashboardSummaryQuery.isLoading}
          empty="No dashboard review categories returned."
          headers={['Category', 'Products', 'Review value', 'Critical', 'High']}
          rows={productCostDashboardCategories.map((item: any) => [
            formatRecordValue(item, 'category'),
            formatRecordValue(item, 'product_count'),
            formatCurrency(item.review_estimated_value as number | string | null | undefined),
            formatRecordValue(item, 'critical_recommendations'),
            formatRecordValue(item, 'high_recommendations')
          ])}
        />
        <DataTable
          loading={productCostDashboardSummaryQuery.isLoading}
          empty="No dashboard priority products returned."
          headers={['Product', 'Recommendation', 'Priority', 'Value', 'Dashboard score']}
          rows={productCostDashboardPriorityProducts.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatCodeLabel(item.recommendation_type),
            formatCodeLabel(item.recommendation_priority),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatRecordValue(item, 'dashboard_priority_score')
          ])}
        />
        <DataTable
          loading={productCostGovernanceSummaryQuery.isLoading}
          empty="No governance checklist returned."
          headers={['Check', 'Status', 'Detail']}
          rows={productCostGovernanceChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostReportSummaryQuery.isLoading}
          empty="No report export rows returned."
          headers={['Section', 'Metric', 'Value']}
          rows={(productCostReportSummaryQuery.data?.export_rows ?? []).map((item: any) => [
            formatCodeRecordValue(item, 'section'),
            formatCodeRecordValue(item, 'metric'),
            formatCostTableValue(item.metric, item.value)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost governance audit and handoff</h2>
        <p style={styles.helper}>Reads the existing cost governance detail, audit-pack, sign-off, review, closure, and handoff endpoints without mutating costing or stock records.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Detail readiness" value={formatNumber(productCostGovernanceDetailsQuery.data?.readiness_score)} />
          <MetricCard label="Sign-off status" value={formatCodeLabel(productCostGovernanceSignoffSummaryQuery.data?.signoff_status)} />
          <MetricCard label="Review status" value={formatCodeLabel(productCostGovernanceReviewQueueQuery.data?.review_status)} />
          <MetricCard label="Handoff status" value={formatCodeLabel(productCostGovernanceHandoffSummaryQuery.data?.handoff_status)} />
        </div>
        <DataTable
          loading={productCostGovernanceDetailsQuery.isLoading}
          empty="No failed governance detail checklist rows returned; sign-off and handoff checks are listed below."
          headers={['Failed check', 'Status', 'Detail']}
          rows={productCostGovernanceFailedChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostGovernanceDetailsQuery.isLoading}
          empty="No watch governance checklist rows returned."
          headers={['Watch check', 'Status', 'Detail']}
          rows={productCostGovernanceWatchChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostGovernanceDetailsQuery.isLoading}
          empty="No remediation plan rows returned."
          headers={['Key', 'Priority', 'Action', 'Source']}
          rows={productCostGovernanceRemediationPlan.map((item: any) => [
            formatCodeRecordValue(item, 'key'),
            formatCodeRecordValue(item, 'priority'),
            formatCostDetailValue(item.action),
            formatCodeRecordValue(item, 'source')
          ])}
        />
        <DataTable
          loading={productCostGovernanceDetailsQuery.isLoading}
          empty="No priority products returned."
          headers={['Product', 'Category', 'Value', 'Recommendation']}
          rows={productCostGovernancePriorityProducts.map((item: any) => [
            formatRecordValue(item, 'name'),
            formatRecordValue(item, 'category'),
            formatCurrency(item.estimated_inventory_value as number | string | null | undefined),
            formatCodeLabel(item.recommendation || item.action)
          ])}
        />
        <DataTable
          loading={productCostGovernanceAuditPackQuery.isLoading || productCostGovernanceReviewPackQuery.isLoading}
          empty="No governance evidence summary returned."
          headers={['Evidence', 'Rows', 'Status']}
          rows={governanceEvidenceSummaryRows}
        />
        <DataTable
          loading={productCostGovernanceSignoffSummaryQuery.isLoading}
          empty="No sign-off checklist rows returned."
          headers={['Check', 'Status', 'Detail']}
          rows={productCostGovernanceSignoffChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostGovernanceSignoffSummaryQuery.isLoading}
          empty="No blockers or warnings returned."
          headers={['Type', 'Key', 'Severity', 'Detail']}
          rows={[...productCostGovernanceBlockers.map((item: any) => ({ ...item, issue_type: 'blocker' })), ...productCostGovernanceWarnings.map((item: any) => ({ ...item, issue_type: 'warning' }))].map((item: any) => [
            formatCodeRecordValue(item, 'issue_type'),
            formatCodeRecordValue(item, 'key'),
            formatCodeRecordValue(item, 'severity'),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostGovernanceClosureSummaryQuery.isLoading}
          empty="No closure checklist rows returned."
          headers={['Check', 'Status', 'Detail']}
          rows={productCostGovernanceClosureChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostGovernanceHandoffSummaryQuery.isLoading}
          empty="No handoff checklist rows returned."
          headers={['Check', 'Status', 'Detail']}
          rows={productCostGovernanceHandoffChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostGovernanceHandoffSummaryQuery.isLoading}
          empty="No owner handoff rows returned."
          headers={['Owner', 'Responsibility', 'Status']}
          rows={productCostGovernanceOwnerSummary.map((item: any) => [
            formatCodeRecordValue(item, 'owner'),
            formatRecordValue(item, 'responsibility'),
            formatCodeLabel(item.status)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Cost operations readiness</h2>
        <div style={styles.metricsGrid}>
          <MetricCard label="Hardening issues" value={formatNumber(productCostHardeningSummaryQuery.data?.totals?.issue_count)} />
          <MetricCard label="Runbook status" value={formatCodeLabel(productCostOperationsRunbookSummaryQuery.data?.runbook_status)} />
          <MetricCard label="Control status" value={formatCodeLabel(productCostOperationsControlSummaryQuery.data?.control_status)} />
          <MetricCard label="Readiness score" value={formatNumber(productCostOperationsReadinessSummaryQuery.data?.readiness_score)} />
        </div>
        <DataTable
          loading={productCostHardeningSummaryQuery.isLoading}
          empty="No cost hardening review actions returned."
          headers={['Check', 'Status', 'Detail']}
          rows={productCostHardeningReviewRows}
        />
        <DataTable
          loading={productCostOperationsRunbookSummaryQuery.isLoading}
          empty="No operating rhythm rows returned."
          headers={['Cadence', 'Owner', 'Status', 'Action']}
          rows={productCostOperationsRhythm.map((item: any) => [
            formatCodeRecordValue(item, 'cadence'),
            formatCodeRecordValue(item, 'owner'),
            formatCodeLabel(item.status),
            formatCostDetailValue(item.action)
          ])}
        />
        <DataTable
          loading={productCostOperationsRunbookSummaryQuery.isLoading}
          empty="No escalation rules returned."
          headers={['Key', 'Current value', 'Condition', 'Escalation']}
          rows={productCostOperationsEscalationRules.map((item: any) => [
            formatCodeRecordValue(item, 'key'),
            formatCostTableValue(item.key, item.current_value),
            formatCostDetailValue(item.condition),
            formatCostDetailValue(item.escalation)
          ])}
        />
        <DataTable
          loading={productCostOperationsControlSummaryQuery.isLoading}
          empty="No control checks returned."
          headers={['Check', 'Owner', 'Status', 'Value', 'Detail']}
          rows={productCostOperationsControlChecks.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeRecordValue(item, 'owner'),
            formatCodeLabel(item.status),
            formatCostTableValue(item.label, item.value),
            formatCostDetailValue(item.detail)
          ])}
        />
        <DataTable
          loading={productCostOperationsEvidenceSummaryQuery.isLoading}
          empty="No evidence sections returned."
          headers={['Evidence', 'Source', 'Rows', 'Status', 'Purpose']}
          rows={productCostOperationsEvidenceSections.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeRecordValue(item, 'source'),
            formatRecordValue(item, 'rows'),
            formatCodeLabel(item.status),
            formatRecordValue(item, 'purpose')
          ])}
        />
        <DataTable
          loading={productCostOperationsReadinessSummaryQuery.isLoading}
          empty="No readiness checklist rows returned."
          headers={['Check', 'Status', 'Value', 'Detail']}
          rows={productCostOperationsReadinessChecklist.map((item: any) => [
            formatRecordValue(item, 'label'),
            formatCodeLabel(item.status),
            formatCostTableValue(item.label, item.value),
            formatCostDetailValue(item.detail)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>High cost variance</h2>
        <DataTable
          loading={productCostRiskSummaryQuery.isLoading}
          empty="No high variance products returned."
          headers={['Product', 'Category', 'Stock', 'Standard cost', 'Latest cost', 'Variance %', 'Inventory value']}
          rows={highVarianceCostRows.map((item: any) => [
            item.name || item.product_name || item.product_id || item.id || '-',
            item.category || '-',
            `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
            formatCurrency(item.standard_unit_cost),
            formatCurrency(item.latest_unit_cost),
            formatPercentValue(item.cost_variance_percent),
            formatCurrency(item.estimated_inventory_value)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Missing product cost</h2>
        <DataTable
          loading={productCostRiskSummaryQuery.isLoading}
          empty="No stocked products are missing cost."
          headers={['Product', 'Category', 'Stock', 'Effective cost', 'Cost source', 'Variance status']}
          rows={missingCostRows.map((item: any) => [
            item.name || item.product_name || item.product_id || item.id || '-',
            item.category || '-',
            `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
            formatCurrency(item.effective_unit_cost),
            formatCodeLabel(item.effective_cost_source),
            formatCodeLabel(item.cost_variance_status)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Inconsistent cost history</h2>
        <DataTable
          loading={productCostRiskSummaryQuery.isLoading}
          empty="No inconsistent cost history rows returned."
          headers={['Product', 'Category', 'Stock', 'Latest cost', 'History spread %', 'Inventory value']}
          rows={inconsistentCostRows.map((item: any) => [
            item.name || item.product_name || item.product_id || item.id || '-',
            item.category || '-',
            `${formatNumber(item.current_stock_quantity)} ${item.unit || ''}`.trim(),
            formatCurrency(item.latest_unit_cost),
            formatPercentValue(item.cost_history_spread_percent),
            formatCurrency(item.estimated_inventory_value)
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Recommended actions</h2>
        <DataTable
          loading={productCostRiskSummaryQuery.isLoading}
          empty="No recommended cost actions returned."
          headers={['Action']}
          rows={(productCostRiskSummary?.recommended_actions ?? []).map((action: any) => [action])}
        />
      </section>
    </section>
          
  );
}
