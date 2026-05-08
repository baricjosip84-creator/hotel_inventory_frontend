import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductCostActionAgeSummaryResponse, ProductCostActionCategorySummaryResponse, ProductCostActionCoverageSummaryResponse, ProductCostAlertSummaryResponse, ProductCostDashboardSummaryResponse, ProductCostGovernanceSummaryResponse, ProductCostGovernanceDetailsResponse, ProductCostGovernanceAuditPackResponse, ProductCostGovernanceClosureSummaryResponse, ProductCostGovernanceHandoffSummaryResponse, ProductCostGovernanceFinalSummaryResponse, ProductCostPerformanceSummaryResponse, ProductCostSecurityAuditSummaryResponse, ProductCostGovernanceSignoffSummaryResponse, ProductCostGovernanceReviewQueueResponse, ProductCostGovernanceReviewPackResponse, ProductCostHardeningSummaryResponse, ProductCostOperationsRunbookSummaryResponse, ProductCostOperationsControlSummaryResponse, ProductCostOperationsEvidenceSummaryResponse, ProductCostOperationsReadinessSummaryResponse, ProductCostRecommendationSummaryResponse, ProductCostReportSummaryResponse, ProductCostActionDetailsResponse, ProductCostActionImpactSummaryResponse, ProductCostActionPlanSummaryResponse, ProductCostActionSourceSummaryResponse, ProductCostActionSupplierSummaryResponse, ProductCostActionSummaryResponse, ProductCostHistoryItem, ProductCostHistoryResponse, ProductCostRiskDetailsResponse, ProductCostRiskItem, ProductCostRiskSummaryResponse, ProductCostValuationDetailsResponse, ProductCostValuationItem, ProductCostValuationSummaryResponse, ProductItem, ProductPackageItem, ProductStandardCostHistoryItem, ProductStandardCostHistoryResponse, SupplierItem } from '../types/inventory';

type ProductFormState = {
  name: string;
  category: string;
  unit: string;
  min_stock: string;
  standard_unit_cost: string;
  supplier_id: string;
  barcode: string;
};

type PackageFormState = {
  package_name: string;
  barcode: string;
  units_per_package: string;
  is_default: boolean;
};

type CostHistoryFilterState = {
  costSource: string;
  costFrom: string;
  costTo: string;
};

type CostValuationDetailFilterState = {
  valuationBasis: string;
  search: string;
  sort: string;
  direction: string;
};

type CostRiskDetailFilterState = {
  riskType: string;
  search: string;
  sort: string;
  direction: string;
};

type CostActionDetailFilterState = {
  actionType: string;
  search: string;
  sort: string;
  direction: string;
};

async function fetchProducts(filters: {
  search: string;
  category: string;
  supplierId: string;
  costStatus: string;
  costBasis: string;
  costVarianceStatus: string;
}): Promise<ProductItem[]> {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.category.trim()) {
    params.set('category', filters.category.trim());
  }

  if (filters.supplierId.trim()) {
    params.set('supplier_id', filters.supplierId.trim());
  }

  if (filters.costStatus.trim()) {
    params.set('cost_status', filters.costStatus.trim());
  }

  if (filters.costBasis.trim()) {
    params.set('cost_basis', filters.costBasis.trim());
  }

  if (filters.costVarianceStatus.trim()) {
    params.set('cost_variance_status', filters.costVarianceStatus.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ProductItem[]>(`/products${suffix}`);
}


async function fetchProductCostValuationSummary(): Promise<ProductCostValuationSummaryResponse> {
  return apiRequest<ProductCostValuationSummaryResponse>(
    '/products/cost-valuation-summary?limit=8'
  );
}

async function fetchProductCostValuationDetails(
  filters: CostValuationDetailFilterState
): Promise<ProductCostValuationDetailsResponse> {
  const params = new URLSearchParams({
    limit: '20',
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.valuationBasis.trim()) {
    params.set('valuation_basis', filters.valuationBasis.trim());
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return apiRequest<ProductCostValuationDetailsResponse>(`/products/cost-valuation-details?${params.toString()}`);
}


async function fetchProductCostActionSummary(): Promise<ProductCostActionSummaryResponse> {
  return apiRequest<ProductCostActionSummaryResponse>(
    '/products/cost-action-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

async function fetchProductCostActionPlanSummary(): Promise<ProductCostActionPlanSummaryResponse> {
  return apiRequest<ProductCostActionPlanSummaryResponse>(
    '/products/cost-action-plan-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}


async function fetchProductCostActionCategorySummary(): Promise<ProductCostActionCategorySummaryResponse> {
  return apiRequest<ProductCostActionCategorySummaryResponse>(
    '/products/cost-action-category-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

async function fetchProductCostActionImpactSummary(): Promise<ProductCostActionImpactSummaryResponse> {
  return apiRequest<ProductCostActionImpactSummaryResponse>(
    '/products/cost-action-impact-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}


async function fetchProductCostActionSupplierSummary(): Promise<ProductCostActionSupplierSummaryResponse> {
  return apiRequest<ProductCostActionSupplierSummaryResponse>(
    '/products/cost-action-supplier-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

async function fetchProductCostActionSourceSummary(): Promise<ProductCostActionSourceSummaryResponse> {
  return apiRequest<ProductCostActionSourceSummaryResponse>(
    '/products/cost-action-source-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

async function fetchProductCostActionAgeSummary(): Promise<ProductCostActionAgeSummaryResponse> {
  return apiRequest<ProductCostActionAgeSummaryResponse>(
    '/products/cost-action-age-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&limit=8'
  );
}

async function fetchProductCostActionCoverageSummary(): Promise<ProductCostActionCoverageSummaryResponse> {
  return apiRequest<ProductCostActionCoverageSummaryResponse>(
    '/products/cost-action-coverage-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}


async function fetchProductCostAlertSummary(): Promise<ProductCostAlertSummaryResponse> {
  return apiRequest<ProductCostAlertSummaryResponse>(
    '/products/cost-alert-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostRecommendationSummary(): Promise<ProductCostRecommendationSummaryResponse> {
  return apiRequest<ProductCostRecommendationSummaryResponse>(
    '/products/cost-recommendation-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostDashboardSummary(): Promise<ProductCostDashboardSummaryResponse> {
  return apiRequest<ProductCostDashboardSummaryResponse>(
    '/products/cost-dashboard-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=6'
  );
}



async function fetchProductCostGovernanceSummary(): Promise<ProductCostGovernanceSummaryResponse> {
  return apiRequest<ProductCostGovernanceSummaryResponse>(
    '/products/cost-governance-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostGovernanceDetails(): Promise<ProductCostGovernanceDetailsResponse> {
  return apiRequest<ProductCostGovernanceDetailsResponse>(
    '/products/cost-governance-details?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostGovernanceAuditPack(): Promise<ProductCostGovernanceAuditPackResponse> {
  return apiRequest<ProductCostGovernanceAuditPackResponse>(
    '/products/cost-governance-audit-pack?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostGovernanceSignoffSummary(): Promise<ProductCostGovernanceSignoffSummaryResponse> {
  return apiRequest<ProductCostGovernanceSignoffSummaryResponse>(
    '/products/cost-governance-signoff-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostGovernanceReviewQueue(): Promise<ProductCostGovernanceReviewQueueResponse> {
  return apiRequest<ProductCostGovernanceReviewQueueResponse>(
    '/products/cost-governance-review-queue?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostGovernanceReviewPack(): Promise<ProductCostGovernanceReviewPackResponse> {
  return apiRequest<ProductCostGovernanceReviewPackResponse>(
    '/products/cost-governance-review-pack?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostGovernanceClosureSummary(): Promise<ProductCostGovernanceClosureSummaryResponse> {
  return apiRequest<ProductCostGovernanceClosureSummaryResponse>(
    '/products/cost-governance-closure-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostGovernanceHandoffSummary(): Promise<ProductCostGovernanceHandoffSummaryResponse> {
  return apiRequest<ProductCostGovernanceHandoffSummaryResponse>(
    '/products/cost-governance-handoff-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostOperationsRunbookSummary(): Promise<ProductCostOperationsRunbookSummaryResponse> {
  return apiRequest<ProductCostOperationsRunbookSummaryResponse>(
    '/products/cost-operations-runbook-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostOperationsControlSummary(): Promise<ProductCostOperationsControlSummaryResponse> {
  return apiRequest<ProductCostOperationsControlSummaryResponse>(
    '/products/cost-operations-control-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}



async function fetchProductCostOperationsEvidenceSummary(): Promise<ProductCostOperationsEvidenceSummaryResponse> {
  return apiRequest<ProductCostOperationsEvidenceSummaryResponse>(
    '/products/cost-operations-evidence-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostOperationsReadinessSummary(): Promise<ProductCostOperationsReadinessSummaryResponse> {
  return apiRequest<ProductCostOperationsReadinessSummaryResponse>(
    '/products/cost-operations-readiness-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


async function fetchProductCostGovernanceFinalSummary(): Promise<ProductCostGovernanceFinalSummaryResponse> {
  return apiRequest<ProductCostGovernanceFinalSummaryResponse>(
    '/products/cost-governance-final-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostPerformanceSummary(): Promise<ProductCostPerformanceSummaryResponse> {
  return apiRequest<ProductCostPerformanceSummaryResponse>(
    '/products/cost-performance-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostSecurityAuditSummary(): Promise<ProductCostSecurityAuditSummaryResponse> {
  return apiRequest<ProductCostSecurityAuditSummaryResponse>(
    '/products/cost-security-audit-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostHardeningSummary(): Promise<ProductCostHardeningSummaryResponse> {
  return apiRequest<ProductCostHardeningSummaryResponse>(
    '/products/cost-hardening-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&limit=8'
  );
}

async function fetchProductCostReportSummary(): Promise<ProductCostReportSummaryResponse> {
  return apiRequest<ProductCostReportSummaryResponse>(
    '/products/cost-report-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

async function fetchProductCostActionDetails(
  filters: CostActionDetailFilterState
): Promise<ProductCostActionDetailsResponse> {
  const params = new URLSearchParams({
    variance_threshold_percent: '20',
    history_spread_threshold_percent: '25',
    limit: '20',
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.actionType.trim()) {
    params.set('action_type', filters.actionType.trim());
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return apiRequest<ProductCostActionDetailsResponse>(`/products/cost-action-details?${params.toString()}`);
}

async function fetchProductCostRiskSummary(): Promise<ProductCostRiskSummaryResponse> {
  return apiRequest<ProductCostRiskSummaryResponse>(
    '/products/cost-risk-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

async function fetchProductCostRiskDetails(
  filters: CostRiskDetailFilterState
): Promise<ProductCostRiskDetailsResponse> {
  const params = new URLSearchParams({
    variance_threshold_percent: '20',
    history_spread_threshold_percent: '25',
    limit: '20',
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.riskType.trim()) {
    params.set('risk_type', filters.riskType.trim());
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return apiRequest<ProductCostRiskDetailsResponse>(`/products/cost-risk-details?${params.toString()}`);
}

async function fetchSuppliers(): Promise<SupplierItem[]> {
  return apiRequest<SupplierItem[]>('/suppliers');
}

async function fetchProductPackages(productId: string): Promise<ProductPackageItem[]> {
  return apiRequest<ProductPackageItem[]>(`/products/${productId}/packages`);
}

async function fetchProductCostHistory(
  productId: string,
  filters: CostHistoryFilterState
): Promise<ProductCostHistoryResponse> {
  const params = new URLSearchParams({ limit: '50' });

  if (filters.costSource.trim()) {
    params.set('cost_source', filters.costSource.trim());
  }

  if (filters.costFrom) {
    params.set('cost_from', filters.costFrom);
  }

  if (filters.costTo) {
    params.set('cost_to', filters.costTo);
  }

  return apiRequest<ProductCostHistoryResponse>(`/products/${productId}/cost-history?${params.toString()}`);
}

async function fetchProductStandardCostHistory(productId: string): Promise<ProductStandardCostHistoryResponse> {
  return apiRequest<ProductStandardCostHistoryResponse>(`/products/${productId}/standard-cost-history?limit=50`);
}

async function createProduct(input: ProductFormState): Promise<ProductItem> {
  return apiRequest<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      category: input.category.trim() || null,
      unit: input.unit.trim(),
      min_stock: Number(input.min_stock),
      standard_unit_cost: input.standard_unit_cost.trim() === '' ? null : Number(input.standard_unit_cost),
      supplier_id: input.supplier_id || null,
      barcode: input.barcode.trim() || null
    })
  });
}

async function updateProduct(input: {
  product: ProductItem;
  values: ProductFormState;
}): Promise<ProductItem> {
  return apiRequest<ProductItem>(`/products/${input.product.id}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.product.version)
    },
    body: JSON.stringify({
      name: input.values.name.trim(),
      category: input.values.category.trim() || null,
      unit: input.values.unit.trim(),
      min_stock: Number(input.values.min_stock),
      standard_unit_cost: input.values.standard_unit_cost.trim() === '' ? null : Number(input.values.standard_unit_cost),
      supplier_id: input.values.supplier_id || null,
      barcode: input.values.barcode.trim() || null
    })
  });
}

async function deleteProduct(product: ProductItem): Promise<void> {
  await apiRequest(`/products/${product.id}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(product.version)
    }
  });
}

async function createProductPackage(input: {
  productId: string;
  values: PackageFormState;
}): Promise<ProductPackageItem> {
  return apiRequest<ProductPackageItem>(`/products/${input.productId}/packages`, {
    method: 'POST',
    body: JSON.stringify({
      package_name: input.values.package_name.trim(),
      barcode: input.values.barcode.trim(),
      units_per_package: Number(input.values.units_per_package),
      is_default: input.values.is_default
    })
  });
}

async function updateProductPackage(input: {
  productId: string;
  packageItem: ProductPackageItem;
  values: PackageFormState;
}): Promise<ProductPackageItem> {
  return apiRequest<ProductPackageItem>(
    `/products/${input.productId}/packages/${input.packageItem.id}`,
    {
      method: 'PATCH',
      headers: {
        /*
          Safe to send. If the backend route does not require optimistic locking
          for package rows yet, this header is ignored by Express.
        */
        'If-Match-Version': String(input.packageItem.version)
      },
      body: JSON.stringify({
        package_name: input.values.package_name.trim(),
        barcode: input.values.barcode.trim(),
        units_per_package: Number(input.values.units_per_package),
        is_default: input.values.is_default
      })
    }
  );
}

async function deleteProductPackage(input: {
  productId: string;
  packageItem: ProductPackageItem;
}): Promise<void> {
  await apiRequest(`/products/${input.productId}/packages/${input.packageItem.id}`, {
    method: 'DELETE',
    headers: {
      /*
        Safe to send. If the backend route does not require optimistic locking
        for package rows yet, this header is ignored by Express.
      */
      'If-Match-Version': String(input.packageItem.version)
    }
  });
}

function emptyForm(): ProductFormState {
  return {
    name: '',
    category: '',
    unit: '',
    min_stock: '0',
    standard_unit_cost: '',
    supplier_id: '',
    barcode: ''
  };
}

function emptyPackageForm(): PackageFormState {
  return {
    package_name: '',
    barcode: '',
    units_per_package: '1',
    is_default: false
  };
}

function emptyCostHistoryFilters(): CostHistoryFilterState {
  return {
    costSource: '',
    costFrom: '',
    costTo: ''
  };
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });
}


function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return `${amount.toFixed(1)}%`;
}

function formatPriorityBand(priorityBand?: string | null): string {
  if (priorityBand === 'critical') {
    return 'Critical';
  }

  if (priorityBand === 'high') {
    return 'High';
  }

  if (priorityBand === 'watch') {
    return 'Watch';
  }

  return 'Unclassified';
}

function formatImpactType(impactType?: string | null): string {
  if (impactType === 'valued_inventory_review') return 'Valued inventory review';
  if (impactType === 'unvalued_stock_review') return 'Unvalued stock review';
  if (impactType === 'master_data_review') return 'Master data review';
  return impactType ? impactType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatCostSource(costSource?: string | null): string {
  if (costSource === 'no_cost') return 'No cost basis';
  if (costSource === 'product_standard') return 'Standard fallback';
  if (costSource === 'movement') return 'Received movement cost';
  return costSource ? costSource.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatActionType(actionType?: string | null): string {
  if (actionType === 'capture_missing_cost') return 'Capture missing cost';
  if (actionType === 'review_standard_cost') return 'Review standard cost';
  if (actionType === 'investigate_cost_history') return 'Investigate cost history';
  return actionType ? actionType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatCostAgeBand(costAgeBand?: string | null): string {
  if (costAgeBand === 'no_cost_date') return 'No cost date';
  if (costAgeBand === 'standard_fallback_only') return 'Standard fallback only';
  if (costAgeBand === 'stale_received_cost') return 'Stale received cost';
  if (costAgeBand === 'recent_received_cost') return 'Recent received cost';
  return costAgeBand ? costAgeBand.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}


function formatCostAlertType(alertType?: string | null): string {
  if (alertType === 'missing_cost') return 'Missing cost';
  if (alertType === 'high_variance') return 'High variance';
  if (alertType === 'cost_spike') return 'Cost spike';
  if (alertType === 'inconsistent_history') return 'Inconsistent history';
  if (alertType === 'stale_cost') return 'Stale cost';
  return alertType ? alertType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatCostAlertSeverity(severity?: string | null): string {
  if (severity === 'critical') return 'Critical';
  if (severity === 'warning') return 'Warning';
  if (severity === 'watch') return 'Watch';
  return severity ? severity.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}


function formatCostRecommendationType(recommendationType?: string | null): string {
  if (recommendationType === 'capture_missing_cost') return 'Capture missing cost';
  if (recommendationType === 'investigate_cost_spike') return 'Investigate cost spike';
  if (recommendationType === 'investigate_cost_history') return 'Investigate cost history';
  if (recommendationType === 'review_standard_cost') return 'Review standard cost';
  if (recommendationType === 'refresh_cost_evidence') return 'Refresh cost evidence';
  return recommendationType ? recommendationType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatCostRecommendationPriority(priority?: string | null): string {
  if (priority === 'critical') return 'Critical';
  if (priority === 'high') return 'High';
  if (priority === 'medium') return 'Medium';
  if (priority === 'low') return 'Low';
  return priority ? priority.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatRiskType(riskType?: string | null): string {
  if (riskType === 'high_variance') return 'High variance';
  if (riskType === 'missing_cost') return 'Missing cost';
  if (riskType === 'inconsistent_history') return 'Inconsistent history';
  return riskType ? riskType.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '-';
}

function formatValuationBasis(basis?: string | null) {
  if (basis === 'received') {
    return 'Received cost';
  }

  if (basis === 'standard') {
    return 'Standard fallback';
  }

  if (basis === 'none') {
    return 'No cost';
  }

  return 'Unknown basis';
}

function formatCostVarianceStatus(value: string | null | undefined): string {
  if (!value) return '-';

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatCard(props: {
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

function CostRiskList(props: CostRiskListProps) {
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

function CostValuationList(props: CostValuationListProps) {
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

export default function ProductsPage() {
  /*
    WHAT CHANGED
    ------------
    Products now support package barcode management directly on this page.

    WHY IT CHANGED
    --------------
    Backend Phase 1 added product_packages and backend Phase 2/3 made scanner
    lookup and receiving package-aware. The frontend now needs a way for users
    to create, edit, delete, and review package barcodes per product.

    WHAT PROBLEM IT SOLVES
    ----------------------
    A product is the base inventory item, while product packages represent
    scannable real-world formats such as bottle, 6-pack, case, or crate.
  */

  const queryClient = useQueryClient();
  const { role, canManageProducts } = getRoleCapabilities();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [costStatusFilter, setCostStatusFilter] = useState('');
  const [costBasisFilter, setCostBasisFilter] = useState('');
  const [costVarianceStatusFilter, setCostVarianceStatusFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedPackageProduct, setSelectedPackageProduct] = useState<ProductItem | null>(null);
  const [selectedCostProduct, setSelectedCostProduct] = useState<ProductItem | ProductCostRiskItem | null>(null);
  const [costHistoryFilters, setCostHistoryFilters] = useState<CostHistoryFilterState>(emptyCostHistoryFilters());
  const [costValuationDetailFilters, setCostValuationDetailFilters] = useState<CostValuationDetailFilterState>({
    valuationBasis: '',
    search: '',
    sort: 'estimated_value',
    direction: 'desc'
  });
  const [costRiskDetailFilters, setCostRiskDetailFilters] = useState<CostRiskDetailFilterState>({
    riskType: '',
    search: '',
    sort: 'risk_priority',
    direction: 'desc'
  });
  const [costActionDetailFilters, setCostActionDetailFilters] = useState<CostActionDetailFilterState>({
    actionType: '',
    search: '',
    sort: 'action_priority',
    direction: 'desc'
  });
  const [editingPackage, setEditingPackage] = useState<ProductPackageItem | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm());
  const [packageMessage, setPackageMessage] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', search, categoryFilter, supplierFilter, costStatusFilter, costBasisFilter, costVarianceStatusFilter],
    queryFn: () =>
      fetchProducts({
        search,
        category: categoryFilter,
        supplierId: supplierFilter,
        costStatus: costStatusFilter,
        costBasis: costBasisFilter,
        costVarianceStatus: costVarianceStatusFilter
      })
  });


  const costValuationQuery = useQuery({
    queryKey: ['product-cost-valuation-summary'],
    queryFn: fetchProductCostValuationSummary
  });


  const costValuationDetailsQuery = useQuery({
    queryKey: [
      'product-cost-valuation-details',
      costValuationDetailFilters.valuationBasis,
      costValuationDetailFilters.search,
      costValuationDetailFilters.sort,
      costValuationDetailFilters.direction
    ],
    queryFn: () => fetchProductCostValuationDetails(costValuationDetailFilters)
  });


  const costActionQuery = useQuery({
    queryKey: ['product-cost-action-summary'],
    queryFn: fetchProductCostActionSummary
  });

  const costActionPlanQuery = useQuery({
    queryKey: ['product-cost-action-plan-summary'],
    queryFn: fetchProductCostActionPlanSummary
  });


  const costActionCategoryQuery = useQuery({
    queryKey: ['product-cost-action-category-summary'],
    queryFn: fetchProductCostActionCategorySummary
  });

  const costActionImpactQuery = useQuery({
    queryKey: ['product-cost-action-impact-summary'],
    queryFn: fetchProductCostActionImpactSummary
  });


  const costActionSupplierQuery = useQuery({
    queryKey: ['product-cost-action-supplier-summary'],
    queryFn: fetchProductCostActionSupplierSummary
  });

  const costActionSourceQuery = useQuery({
    queryKey: ['product-cost-action-source-summary'],
    queryFn: fetchProductCostActionSourceSummary
  });

  const costActionAgeQuery = useQuery({
    queryKey: ['product-cost-action-age-summary'],
    queryFn: fetchProductCostActionAgeSummary
  });

  const costActionCoverageQuery = useQuery({
    queryKey: ['product-cost-action-coverage-summary'],
    queryFn: fetchProductCostActionCoverageSummary
  });


  const costAlertQuery = useQuery({
    queryKey: ['product-cost-alert-summary'],
    queryFn: fetchProductCostAlertSummary
  });


  const costRecommendationQuery = useQuery({
    queryKey: ['product-cost-recommendation-summary'],
    queryFn: fetchProductCostRecommendationSummary
  });


  const costDashboardQuery = useQuery({
    queryKey: ['product-cost-dashboard-summary'],
    queryFn: fetchProductCostDashboardSummary
  });



  const costGovernanceQuery = useQuery({
    queryKey: ['product-cost-governance-summary'],
    queryFn: fetchProductCostGovernanceSummary
  });

  const costGovernanceDetailsQuery = useQuery({
    queryKey: ['product-cost-governance-details'],
    queryFn: fetchProductCostGovernanceDetails
  });

  const costGovernanceAuditQuery = useQuery({
    queryKey: ['product-cost-governance-audit-pack'],
    queryFn: fetchProductCostGovernanceAuditPack
  });


  const costGovernanceSignoffQuery = useQuery({
    queryKey: ['product-cost-governance-signoff-summary'],
    queryFn: fetchProductCostGovernanceSignoffSummary
  });



  const costGovernanceReviewQueueQuery = useQuery({
    queryKey: ['product-cost-governance-review-queue'],
    queryFn: fetchProductCostGovernanceReviewQueue
  });

  const costGovernanceReviewPackQuery = useQuery({
    queryKey: ['product-cost-governance-review-pack'],
    queryFn: fetchProductCostGovernanceReviewPack
  });


  const costGovernanceClosureQuery = useQuery({
    queryKey: ['product-cost-governance-closure-summary'],
    queryFn: fetchProductCostGovernanceClosureSummary
  });


  const costGovernanceHandoffQuery = useQuery({
    queryKey: ['product-cost-governance-handoff-summary'],
    queryFn: fetchProductCostGovernanceHandoffSummary
  });


  const costOperationsRunbookQuery = useQuery({
    queryKey: ['product-cost-operations-runbook-summary'],
    queryFn: fetchProductCostOperationsRunbookSummary
  });

  const costOperationsControlQuery = useQuery({
    queryKey: ['product-cost-operations-control-summary'],
    queryFn: fetchProductCostOperationsControlSummary
  });



  const costOperationsEvidenceQuery = useQuery({
    queryKey: ['product-cost-operations-evidence-summary'],
    queryFn: fetchProductCostOperationsEvidenceSummary
  });

  const costOperationsReadinessQuery = useQuery({
    queryKey: ['product-cost-operations-readiness-summary'],
    queryFn: fetchProductCostOperationsReadinessSummary
  });


  const costGovernanceFinalQuery = useQuery({
    queryKey: ['product-cost-governance-final-summary'],
    queryFn: fetchProductCostGovernanceFinalSummary
  });

  const costPerformanceQuery = useQuery({
    queryKey: ['product-cost-performance-summary'],
    queryFn: fetchProductCostPerformanceSummary
  });

  const costSecurityAuditQuery = useQuery({
    queryKey: ['product-cost-security-audit-summary'],
    queryFn: fetchProductCostSecurityAuditSummary
  });

  const costHardeningQuery = useQuery({
    queryKey: ['product-cost-hardening-summary'],
    queryFn: fetchProductCostHardeningSummary
  });

  const costReportQuery = useQuery({
    queryKey: ['product-cost-report-summary'],
    queryFn: fetchProductCostReportSummary
  });

  const costActionDetailsQuery = useQuery({
    queryKey: [
      'product-cost-action-details',
      costActionDetailFilters.actionType,
      costActionDetailFilters.search,
      costActionDetailFilters.sort,
      costActionDetailFilters.direction
    ],
    queryFn: () => fetchProductCostActionDetails(costActionDetailFilters)
  });

  const costRiskQuery = useQuery({
    queryKey: ['product-cost-risk-summary'],
    queryFn: fetchProductCostRiskSummary
  });

  const costRiskDetailsQuery = useQuery({
    queryKey: [
      'product-cost-risk-details',
      costRiskDetailFilters.riskType,
      costRiskDetailFilters.search,
      costRiskDetailFilters.sort,
      costRiskDetailFilters.direction
    ],
    queryFn: () => fetchProductCostRiskDetails(costRiskDetailFilters)
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-available-products-page'],
    queryFn: fetchSuppliers
  });

  const packagesQuery = useQuery({
    queryKey: ['product-packages', selectedPackageProduct?.id],
    queryFn: () => fetchProductPackages(selectedPackageProduct!.id),
    enabled: Boolean(selectedPackageProduct?.id)
  });

  const costHistoryQuery = useQuery({
    queryKey: [
      'product-cost-history',
      selectedCostProduct?.id,
      costHistoryFilters.costSource,
      costHistoryFilters.costFrom,
      costHistoryFilters.costTo
    ],
    queryFn: () => fetchProductCostHistory(selectedCostProduct!.id, costHistoryFilters),
    enabled: Boolean(selectedCostProduct?.id)
  });


  const standardCostHistoryQuery = useQuery({
    queryKey: ['product-standard-cost-history', selectedCostProduct?.id],
    queryFn: () => fetchProductStandardCostHistory(selectedCostProduct!.id),
    enabled: Boolean(selectedCostProduct?.id)
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Product created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['product-cost-risk-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['product-cost-valuation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to create product.');
      }
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Product updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['product-cost-risk-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['product-cost-valuation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to update product.');
      }
      setFormMessage(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setSelectedPackageProduct(null);
      setSelectedCostProduct(null);
      setEditingPackage(null);
      setForm(emptyForm());
      setPackageForm(emptyPackageForm());
      setFormError(null);
      setPackageError(null);
      setFormMessage('Product deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['product-cost-risk-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['product-cost-valuation-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to delete product.');
      }
      setFormMessage(null);
    }
  });

  const createPackageMutation = useMutation({
    mutationFn: createProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage('Package created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to create package.');
      }
      setPackageMessage(null);
    }
  });

  const updatePackageMutation = useMutation({
    mutationFn: updateProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage('Package updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to update package.');
      }
      setPackageMessage(null);
    }
  });

  const deletePackageMutation = useMutation({
    mutationFn: deleteProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage('Package deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to delete package.');
      }
      setPackageMessage(null);
    }
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const costActionSummary = costActionQuery.data;
  const costActionPlan = costActionPlanQuery.data;
  const costActionCategorySummary = costActionCategoryQuery.data;
  const costActionImpactSummary = costActionImpactQuery.data;
  const costActionSupplierSummary = costActionSupplierQuery.data;
  const costActionSourceSummary = costActionSourceQuery.data;
  const costActionAgeSummary = costActionAgeQuery.data;
  const costActionCoverageSummary = costActionCoverageQuery.data;
  const costAlertSummary = costAlertQuery.data;
  const costRecommendationSummary = costRecommendationQuery.data;
  const costDashboardSummary = costDashboardQuery.data;
  const costReportSummary = costReportQuery.data;
  const costGovernanceSummary = costGovernanceQuery.data;
  const costGovernanceDetails = costGovernanceDetailsQuery.data;
  const costGovernanceAuditPack = costGovernanceAuditQuery.data;
  const costGovernanceSignoff = costGovernanceSignoffQuery.data;
  const costGovernanceReviewQueue = costGovernanceReviewQueueQuery.data;
  const costGovernanceReviewPack = costGovernanceReviewPackQuery.data;
  const costGovernanceClosureSummary = costGovernanceClosureQuery.data;
  const costGovernanceHandoffSummary = costGovernanceHandoffQuery.data;
  const costOperationsRunbookSummary = costOperationsRunbookQuery.data;
  const costOperationsControlSummary = costOperationsControlQuery.data;
  const costOperationsEvidenceSummary = costOperationsEvidenceQuery.data;
  const costOperationsReadinessSummary = costOperationsReadinessQuery.data;
  const costGovernanceFinalSummary = costGovernanceFinalQuery.data;
  const costPerformanceSummary = costPerformanceQuery.data;
  const costSecurityAuditSummary = costSecurityAuditQuery.data;
  const costHardeningSummary = costHardeningQuery.data;
  const costActionDetails = costActionDetailsQuery.data;
  const costRiskSummary = costRiskQuery.data;
  const costRiskDetails = costRiskDetailsQuery.data;
  const costValuationSummary = costValuationQuery.data;
  const costValuationDetails = costValuationDetailsQuery.data;
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);
  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data]);
  const costHistory = useMemo(
    () => costHistoryQuery.data?.cost_history ?? [],
    [costHistoryQuery.data]
  );

  const standardCostHistory = useMemo(
    () => standardCostHistoryQuery.data?.standard_cost_history ?? [],
    [standardCostHistoryQuery.data]
  );

  const costSummary = costHistoryQuery.data?.cost_summary;

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => (product.category || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const summary = useMemo(() => {
    const linkedSupplierCount = products.filter((product) => Boolean(product.supplier_id)).length;
    const thresholdConfiguredCount = products.filter((product) => toNumber(product.min_stock) > 0).length;
    const categorizedCount = products.filter((product) => Boolean(product.category && product.category.trim())).length;
    const barcodeCount = products.filter((product) => Boolean(product.barcode && product.barcode.trim())).length;
    const productsWithCostCount = products.filter((product) => product.effective_unit_cost !== null && product.effective_unit_cost !== undefined).length;
    const productsWithReceivedCostCount = products.filter((product) => product.latest_unit_cost !== null && product.latest_unit_cost !== undefined).length;
    const productsWithStandardFallbackCount = products.filter((product) =>
      (product.latest_unit_cost === null || product.latest_unit_cost === undefined) &&
      product.standard_unit_cost !== null &&
      product.standard_unit_cost !== undefined
    ).length;
    const estimatedInventoryValue = products.reduce(
      (sum, product) => sum + toNumber(product.estimated_inventory_value),
      0
    );

    return {
      total: products.length,
      linkedSupplierCount,
      thresholdConfiguredCount,
      categorizedCount,
      barcodeCount,
      productsWithCostCount,
      productsWithReceivedCostCount,
      productsWithStandardFallbackCount,
      estimatedInventoryValue
    };
  }, [products]);

  const costingReadiness = useMemo(() => {
    const stockedProducts = products.filter((product) => toNumber(product.current_stock_quantity) > 0);
    const costedStockedProducts = stockedProducts.filter(
      (product) => product.effective_unit_cost !== null && product.effective_unit_cost !== undefined
    );
    const standardFallbackStockedProducts = stockedProducts.filter((product) =>
      (product.latest_unit_cost === null || product.latest_unit_cost === undefined) &&
      product.standard_unit_cost !== null &&
      product.standard_unit_cost !== undefined
    );
    const uncostedStockedProducts = stockedProducts.filter(
      (product) => product.effective_unit_cost === null || product.effective_unit_cost === undefined
    );
    const uncostedStockQuantity = uncostedStockedProducts.reduce(
      (sum, product) => sum + toNumber(product.current_stock_quantity),
      0
    );
    const costedStockQuantity = costedStockedProducts.reduce(
      (sum, product) => sum + toNumber(product.current_stock_quantity),
      0
    );

    const categoryMap = new Map<
      string,
      {
        category: string;
        productCount: number;
        costedCount: number;
        uncostedStockedCount: number;
        stockQuantity: number;
        estimatedValue: number;
      }
    >();

    products.forEach((product) => {
      const category = (product.category || 'Uncategorized').trim() || 'Uncategorized';
      const current = categoryMap.get(category) || {
        category,
        productCount: 0,
        costedCount: 0,
        uncostedStockedCount: 0,
        stockQuantity: 0,
        estimatedValue: 0
      };

      current.productCount += 1;
      current.stockQuantity += toNumber(product.current_stock_quantity);
      current.estimatedValue += toNumber(product.estimated_inventory_value);

      if (product.effective_unit_cost !== null && product.effective_unit_cost !== undefined) {
        current.costedCount += 1;
      } else if (toNumber(product.current_stock_quantity) > 0) {
        current.uncostedStockedCount += 1;
      }

      categoryMap.set(category, current);
    });

    const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => {
      if (b.estimatedValue !== a.estimatedValue) return b.estimatedValue - a.estimatedValue;
      return a.category.localeCompare(b.category);
    });

    return {
      stockedProductCount: stockedProducts.length,
      costedStockedProductCount: costedStockedProducts.length,
      uncostedStockedProductCount: uncostedStockedProducts.length,
      costedStockQuantity,
      standardFallbackStockedProductCount: standardFallbackStockedProducts.length,
      uncostedStockQuantity,
      categoryBreakdown
    };
  }, [products]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageProducts) {
      setFormError(
        'Your current role is read-only for product master data. Product writes are restricted to manager and admin roles by the existing backend.'
      );
      return;
    }

    if (!form.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    if (!form.unit.trim()) {
      setFormError('Unit is required.');
      return;
    }

    const parsedMinStock = Number(form.min_stock);
    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      setFormError('Minimum stock must be a valid number greater than or equal to zero.');
      return;
    }

    if (form.standard_unit_cost.trim() !== '') {
      const parsedStandardCost = Number(form.standard_unit_cost);
      if (!Number.isFinite(parsedStandardCost) || parsedStandardCost < 0) {
        setFormError('Standard unit cost must be a valid number greater than or equal to zero.');
        return;
      }
    }

    if (editingProduct) {
      updateMutation.mutate({
        product: editingProduct,
        values: form
      });
      return;
    }

    createMutation.mutate(form);
  };

  const handlePackageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPackageError(null);
    setPackageMessage(null);

    if (!selectedPackageProduct) {
      setPackageError('Select a product before managing packages.');
      return;
    }

    if (!canManageProducts) {
      setPackageError('Your current role cannot manage product packages.');
      return;
    }

    if (!packageForm.package_name.trim()) {
      setPackageError('Package name is required.');
      return;
    }

    if (!packageForm.barcode.trim()) {
      setPackageError('Barcode is required.');
      return;
    }

    const parsedUnits = Number(packageForm.units_per_package);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setPackageError('Units per package must be a valid number greater than zero.');
      return;
    }

    if (editingPackage) {
      updatePackageMutation.mutate({
        productId: selectedPackageProduct.id,
        packageItem: editingPackage,
        values: packageForm
      });
      return;
    }

    createPackageMutation.mutate({
      productId: selectedPackageProduct.id,
      values: packageForm
    });
  };

  const handleStartEdit = (product: ProductItem) => {
    if (!canManageProducts) {
      setFormError('Your current role cannot edit products.');
      setFormMessage(null);
      return;
    }

    setEditingProduct(product);
    setFormMessage(null);
    setFormError(null);
    setForm({
      name: product.name,
      category: product.category || '',
      unit: product.unit,
      min_stock: String(product.min_stock ?? 0),
      standard_unit_cost: product.standard_unit_cost === null || product.standard_unit_cost === undefined ? '' : String(product.standard_unit_cost),
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setFormMessage(null);
    setFormError(null);
  };

  const handleDelete = (product: ProductItem) => {
    if (!canManageProducts) {
      setFormError('Your current role cannot delete products.');
      setFormMessage(null);
      return;
    }

    const confirmed = window.confirm(`Delete product "${product.name}"?`);
    if (!confirmed) {
      return;
    }

    setFormError(null);
    setFormMessage(null);
    deleteMutation.mutate(product);
  };

  const handleOpenPackages = (product: ProductItem) => {
    setSelectedPackageProduct(product);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
  };

  const handleClosePackages = () => {
    setSelectedPackageProduct(null);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
  };


  const handleOpenCostHistory = (product: ProductItem | ProductCostRiskItem) => {
    setSelectedCostProduct(product);
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleCloseCostHistory = () => {
    setSelectedCostProduct(null);
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleClearCostHistoryFilters = () => {
    setCostHistoryFilters(emptyCostHistoryFilters());
  };

  const handleExportCostHistoryCsv = () => {
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
  };


  const handleExportStandardCostHistoryCsv = () => {
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
  };

  const handleStartEditPackage = (packageItem: ProductPackageItem) => {
    if (!canManageProducts) {
      setPackageError('Your current role cannot edit product packages.');
      setPackageMessage(null);
      return;
    }

    setEditingPackage(packageItem);
    setPackageError(null);
    setPackageMessage(null);
    setPackageForm({
      package_name: packageItem.package_name,
      barcode: packageItem.barcode,
      units_per_package: String(packageItem.units_per_package),
      is_default: Boolean(packageItem.is_default)
    });
  };

  const handleCancelPackageEdit = () => {
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
  };

  const handleDeletePackage = (packageItem: ProductPackageItem) => {
    if (!selectedPackageProduct) {
      setPackageError('Select a product before deleting packages.');
      setPackageMessage(null);
      return;
    }

    if (!canManageProducts) {
      setPackageError('Your current role cannot delete product packages.');
      setPackageMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `Delete package "${packageItem.package_name}" for "${selectedPackageProduct.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setPackageError(null);
    setPackageMessage(null);
    deletePackageMutation.mutate({
      productId: selectedPackageProduct.id,
      packageItem
    });
  };

  const handleExportProductsCsv = () => {
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
  };


  const handleExportCostReportCsv = () => {
    const rows = costReportSummary?.export_rows ?? [];
    if (rows.length === 0) return;
    downloadCsv('product-cost-report-summary.csv', rows);
  };

  const handlePrintCostReport = () => {
    if (!costReportSummary) return;
    window.print();
  };


  const handleExportCostGovernanceAuditCsv = () => {
    const rows = costGovernanceAuditPack?.audit_rows ?? [];
    if (rows.length === 0) return;
    downloadCsv('product-cost-governance-audit-pack.csv', rows);
  };

  const handleExportCostGovernanceReviewPackCsv = () => {
    const rows = costGovernanceReviewPack?.review_export_rows ?? [];
    if (rows.length === 0) return;
    downloadCsv('product-cost-governance-review-pack.csv', rows);
  };


  const handleExportCostGovernanceClosureCsv = () => {
    const rows = costGovernanceClosureSummary?.archive_rows ?? [];
    if (rows.length === 0) return;
    downloadCsv('product-cost-governance-closure-summary.csv', rows);
  };


  const handleExportCostGovernanceHandoffCsv = () => {
    const rows = costGovernanceHandoffSummary?.handoff_rows ?? [];
    if (rows.length === 0) return;
    downloadCsv('product-cost-governance-handoff-summary.csv', rows);
  };

  const handlePrintCostGovernanceAudit = () => {
    if (!costGovernanceAuditPack) return;
    window.print();
  };

  const handleExportCostValuationDetailsCsv = () => {
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
  };

  const handleExportCostActionDetailsCsv = () => {
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
  };

  const handleExportCostRiskDetailsCsv = () => {
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
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isPackageSubmitting = createPackageMutation.isPending || updatePackageMutation.isPending;

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard
          title="Products"
          value={summary.total}
          subtitle="Visible product records"
        />
        <StatCard
          title="Supplier Linked"
          value={summary.linkedSupplierCount}
          subtitle="Products already linked to suppliers"
          tone="good"
        />
        <StatCard
          title="Min Stock Set"
          value={summary.thresholdConfiguredCount}
          subtitle="Products with a configured reorder threshold"
        />
        <StatCard
          title="Barcoded"
          value={summary.barcodeCount}
          subtitle="Products with a default barcode package"
          tone="good"
        />
        <StatCard
          title="Costed"
          value={summary.productsWithCostCount}
          subtitle={`Effective cost: ${summary.productsWithReceivedCostCount} received, ${summary.productsWithStandardFallbackCount} standard`}
          tone={summary.productsWithCostCount > 0 ? 'good' : 'warn'}
        />
        <StatCard
          title="Inventory Value"
          value={formatMoney(summary.estimatedInventoryValue)}
          subtitle="Estimated from received cost, then standard fallback"
        />
      </div>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Costing Readiness</h3>
            <p style={styles.panelSubtitle}>
              Highlights which stocked products already have cost audit coverage and where estimated inventory value is incomplete.
            </p>
          </div>
        </div>

        <div style={styles.costReadinessGrid}>
          <StatCard
            title="Stocked Products"
            value={costingReadiness.stockedProductCount}
            subtitle="Products with current stock above zero"
          />
          <StatCard
            title="Costed Stocked"
            value={costingReadiness.costedStockedProductCount}
            subtitle={`Effective cost coverage; ${costingReadiness.standardFallbackStockedProductCount} use standard fallback`}
            tone={costingReadiness.uncostedStockedProductCount === 0 ? 'good' : 'default'}
          />
          <StatCard
            title="Uncosted Stocked"
            value={costingReadiness.uncostedStockedProductCount}
            subtitle="Stocked products missing received and standard cost"
            tone={costingReadiness.uncostedStockedProductCount > 0 ? 'warn' : 'good'}
          />
          <StatCard
            title="Uncosted Stock Qty"
            value={costingReadiness.uncostedStockQuantity.toLocaleString()}
            subtitle="Quantity excluded from estimated value"
            tone={costingReadiness.uncostedStockQuantity > 0 ? 'warn' : 'good'}
          />
        </div>

        <div style={styles.tableWrapperCompact}>
          <table style={styles.compactTable}>
            <thead>
              <tr>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Products</th>
                <th style={styles.th}>Costed</th>
                <th style={styles.th}>Uncosted Stocked</th>
                <th style={styles.th}>Stock Qty</th>
                <th style={styles.th}>Estimated Value</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {costingReadiness.categoryBreakdown.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={7}>No product categories found.</td>
                </tr>
              ) : (
                costingReadiness.categoryBreakdown.slice(0, 8).map((row) => (
                  <tr key={row.category}>
                    <td style={styles.td}>{row.category}</td>
                    <td style={styles.td}>{row.productCount}</td>
                    <td style={styles.td}>{row.costedCount}</td>
                    <td style={styles.td}>{row.uncostedStockedCount}</td>
                    <td style={styles.td}>{row.stockQuantity.toLocaleString()}</td>
                    <td style={styles.td}>{formatMoney(row.estimatedValue)}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => setCategoryFilter(row.category === 'Uncategorized' ? '' : row.category)}
                      >
                        View Category
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Valuation Summary</h3>
            <p style={styles.panelSubtitle}>
              Read-only estimated inventory valuation by cost basis. This does not change stock quantities or receiving behavior.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costValuationQuery.refetch()}
          >
            Refresh Valuation
          </button>
        </div>

        {costValuationQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost valuation summary...</div>
        ) : costValuationQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost valuation summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Estimated Value"
                value={formatMoney(costValuationSummary?.totals.total_estimated_inventory_value)}
                subtitle="Latest received cost, then standard fallback"
              />
              <StatCard
                title="Received Cost Value"
                value={formatMoney(costValuationSummary?.totals.received_cost_value)}
                subtitle="Valued from movement cost audit"
                tone="good"
              />
              <StatCard
                title="Standard Fallback Value"
                value={formatMoney(costValuationSummary?.totals.standard_fallback_value)}
                subtitle="Valued from product standard cost"
              />
              <StatCard
                title="Unvalued Stock"
                value={toNumber(costValuationSummary?.totals.unvalued_stocked_products)}
                subtitle={`${toNumber(costValuationSummary?.totals.unvalued_stock_quantity).toLocaleString()} units excluded from value`}
                tone={toNumber(costValuationSummary?.totals.unvalued_stocked_products) > 0 ? 'warn' : 'good'}
              />
            </div>


            <div style={styles.riskGrid}>
              <CostValuationList
                title="Top value products"
                emptyText="No valued stocked products found."
                rows={costValuationSummary?.top_value_products ?? []}
                onOpenHistory={handleOpenCostHistory}
              />
              <div style={styles.riskCard}>
                <h4 style={styles.sectionTitle}>Value by basis</h4>
                {(costValuationSummary?.basis_breakdown ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No stocked product valuation basis found.</div>
                ) : (
                  <div style={styles.riskList}>
                    {(costValuationSummary?.basis_breakdown ?? []).map((row) => (
                      <div key={row.valuation_basis} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{formatValuationBasis(row.valuation_basis)}</div>
                          <div style={styles.rowSubtle}>
                            {toNumber(row.stocked_products)} products • {toNumber(row.stock_quantity).toLocaleString()} units
                          </div>
                        </div>
                        <div style={styles.rowTitle}>{formatMoney(row.estimated_value)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.tableWrapperCompact}>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Stocked Products</th>
                    <th style={styles.th}>Stock Qty</th>
                    <th style={styles.th}>Estimated Value</th>
                    <th style={styles.th}>Unvalued</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(costValuationSummary?.category_breakdown ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>No stocked category valuation found.</td>
                    </tr>
                  ) : (
                    (costValuationSummary?.category_breakdown ?? []).map((row) => (
                      <tr key={row.category}>
                        <td style={styles.td}>{row.category}</td>
                        <td style={styles.td}>{toNumber(row.stocked_products)}</td>
                        <td style={styles.td}>{toNumber(row.stock_quantity).toLocaleString()}</td>
                        <td style={styles.td}>{formatMoney(row.estimated_value)}</td>
                        <td style={styles.td}>{toNumber(row.unvalued_stocked_products)}</td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => setCategoryFilter(row.category === 'Uncategorized' ? '' : row.category)}
                          >
                            View Category
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>


            <div style={styles.packageHeader}>
              <div>
                <h4 style={styles.sectionTitle}>Valuation detail</h4>
                <p style={styles.panelSubtitle}>
                  Filtered stocked-product valuation rows for review and export. Read-only; uses the same cost basis as the summary above.
                </p>
              </div>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleExportCostValuationDetailsCsv}
                disabled={(costValuationDetails?.rows ?? []).length === 0}
              >
                Export Valuation CSV
              </button>
            </div>

            <div style={styles.filterGrid}>
              <div>
                <label style={styles.label}>Valuation basis</label>
                <select
                  style={styles.input}
                  value={costValuationDetailFilters.valuationBasis}
                  onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, valuationBasis: event.target.value }))}
                >
                  <option value="">All stocked</option>
                  <option value="received">Received cost</option>
                  <option value="standard">Standard fallback</option>
                  <option value="none">No cost</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Search detail</label>
                <input
                  style={styles.input}
                  value={costValuationDetailFilters.search}
                  onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search product or category"
                />
              </div>
              <div>
                <label style={styles.label}>Sort</label>
                <select
                  style={styles.input}
                  value={costValuationDetailFilters.sort}
                  onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, sort: event.target.value }))}
                >
                  <option value="estimated_value">Estimated value</option>
                  <option value="stock_quantity">Stock quantity</option>
                  <option value="name">Product name</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Direction</label>
                <select
                  style={styles.input}
                  value={costValuationDetailFilters.direction}
                  onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, direction: event.target.value }))}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {costValuationDetailsQuery.isLoading ? (
              <div style={styles.emptyCell}>Loading valuation detail...</div>
            ) : costValuationDetailsQuery.isError ? (
              <div style={styles.errorBox}>Unable to load valuation detail.</div>
            ) : (
              <div style={styles.tableWrapperCompact}>
                <div style={styles.rowSubtle}>
                  Showing {(costValuationDetails?.rows ?? []).length} of {toNumber(costValuationDetails?.total)} stocked products • Filtered value {formatMoney(costValuationDetails?.filtered_estimated_inventory_value)}
                </div>
                <table style={styles.compactTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Basis</th>
                      <th style={styles.th}>Stock</th>
                      <th style={styles.th}>Effective Cost</th>
                      <th style={styles.th}>Estimated Value</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(costValuationDetails?.rows ?? []).length === 0 ? (
                      <tr>
                        <td style={styles.emptyCell} colSpan={6}>No valuation detail rows match the current filters.</td>
                      </tr>
                    ) : (
                      (costValuationDetails?.rows ?? []).map((row) => (
                        <tr key={row.id}>
                          <td style={styles.td}>
                            <strong>{row.name}</strong>
                            <div style={styles.rowSubtle}>{row.category || 'Uncategorized'}</div>
                          </td>
                          <td style={styles.td}>{formatValuationBasis(row.valuation_basis)}</td>
                          <td style={styles.td}>{toNumber(row.current_stock_quantity).toLocaleString()} {row.unit}</td>
                          <td style={styles.td}>{formatMoney(row.effective_unit_cost)}</td>
                          <td style={styles.td}>{formatMoney(row.estimated_inventory_value)}</td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.secondaryButton}
                              onClick={() => handleOpenCostHistory(row)}
                            >
                              Cost History
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>



      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Summary</h3>
            <p style={styles.panelSubtitle}>
              Prioritized costing worklist generated from missing costs, high variance, and inconsistent cost history. Read-only and audit-safe.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionQuery.refetch()}
          >
            Refresh Actions
          </button>
        </div>

        {costActionQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action summary...</div>
        ) : costActionQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Actionable Products"
                value={toNumber(costActionSummary?.totals.total_actionable_products)}
                subtitle="Highest-priority cost action per product"
                tone={toNumber(costActionSummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Actionable Stock"
                value={toNumber(costActionSummary?.totals.actionable_stock_quantity).toLocaleString()}
                subtitle="Units affected by costing actions"
                tone={toNumber(costActionSummary?.totals.actionable_stock_quantity) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Actionable Value"
                value={formatMoney(costActionSummary?.totals.actionable_estimated_inventory_value)}
                subtitle="Estimated value under review"
                tone={toNumber(costActionSummary?.totals.actionable_estimated_inventory_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Action breakdown</h4>
                {(costActionSummary?.action_breakdown ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No cost actions are currently required.</div>
                ) : (
                  (costActionSummary?.action_breakdown ?? []).map((row) => (
                    <div key={row.action_type} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatActionType(row.action_type)}</div>
                        <div style={styles.rowSubtle}>{row.recommended_action}</div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Category hotspots</h4>
                {(costActionSummary?.category_hotspots ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No category hotspots found.</div>
                ) : (
                  (costActionSummary?.category_hotspots ?? []).map((row) => (
                    <div key={row.category} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.category}</div>
                        <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)}</div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Priority products</h4>
                {(costActionSummary?.priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No priority cost products found.</div>
                ) : (
                  (costActionSummary?.priority_products ?? []).map((row) => (
                    <div key={`${row.id}-${row.action_type || 'action'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{formatActionType(row.action_type)} • {row.recommended_action}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Plan</h3>
            <p style={styles.panelSubtitle}>
              Priority-band planning view for costing follow-up. Read-only grouping from the action worklist; no stock or cost records are changed.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionPlanQuery.refetch()}
          >
            Refresh Plan
          </button>
        </div>

        {costActionPlanQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action plan...</div>
        ) : costActionPlanQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action plan.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Critical Actions"
                value={toNumber(costActionPlan?.totals.critical_products)}
                subtitle="Priority score 75+"
                tone={toNumber(costActionPlan?.totals.critical_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="High Actions"
                value={toNumber(costActionPlan?.totals.high_products)}
                subtitle="Priority score 35+"
                tone={toNumber(costActionPlan?.totals.high_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Watch Actions"
                value={toNumber(costActionPlan?.totals.watch_products)}
                subtitle="Lower-priority follow-up"
                tone={toNumber(costActionPlan?.totals.watch_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Urgent Value"
                value={formatMoney(costActionPlan?.totals.urgent_estimated_inventory_value)}
                subtitle="Critical + high estimated value"
                tone={toNumber(costActionPlan?.totals.urgent_estimated_inventory_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Priority bands</h4>
                {(costActionPlan?.priority_bands ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No action-plan priority bands found.</div>
                ) : (
                  (costActionPlan?.priority_bands ?? []).map((row) => (
                    <div key={row.priority_band} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatPriorityBand(row.priority_band)}</div>
                        <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)}</div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Next actions</h4>
                {(costActionPlan?.next_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No next cost actions found.</div>
                ) : (
                  (costActionPlan?.next_actions ?? []).map((row) => (
                    <div key={`${row.id}-${row.priority_band || 'plan'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{formatPriorityBand(row.priority_band)} • {formatActionType(row.action_type)}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Categories</h3>
            <p style={styles.panelSubtitle}>
              Category-level focus view for costing follow-up. Read-only grouping from the action plan, with no stock or movement changes.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionCategoryQuery.refetch()}
          >
            Refresh Categories
          </button>
        </div>

        {costActionCategoryQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action categories...</div>
        ) : costActionCategoryQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action categories.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Action Categories"
                value={toNumber(costActionCategorySummary?.totals.actionable_categories)}
                subtitle="Categories with costing actions"
                tone={toNumber(costActionCategorySummary?.totals.actionable_categories) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Category Products"
                value={toNumber(costActionCategorySummary?.totals.total_actionable_products)}
                subtitle="Actionable products included"
                tone={toNumber(costActionCategorySummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Category Value"
                value={formatMoney(costActionCategorySummary?.totals.total_actionable_estimated_value)}
                subtitle="Estimated value under category review"
                tone={toNumber(costActionCategorySummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.tableWrapperCompact}>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Focus</th>
                    <th style={styles.th}>Products</th>
                    <th style={styles.th}>Priority Mix</th>
                    <th style={styles.th}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(costActionCategorySummary?.categories ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={5}>No actionable cost categories found.</td>
                    </tr>
                  ) : (
                    (costActionCategorySummary?.categories ?? []).map((row) => (
                      <tr key={row.category}>
                        <td style={styles.td}>
                          <strong>{row.category}</strong>
                          <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units</div>
                        </td>
                        <td style={styles.td}>{row.recommended_focus}</td>
                        <td style={styles.td}>{toNumber(row.product_count)}</td>
                        <td style={styles.td}>
                          C {toNumber(row.critical_products)} • H {toNumber(row.high_products)} • W {toNumber(row.watch_products)}
                        </td>
                        <td style={styles.td}>{formatMoney(row.estimated_inventory_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Impact</h3>
            <p style={styles.panelSubtitle}>
              Impact-focused view of costing actions, separating valued inventory review from unvalued stock follow-up. Read-only and audit-safe.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionImpactQuery.refetch()}
          >
            Refresh Impact
          </button>
        </div>

        {costActionImpactQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action impact...</div>
        ) : costActionImpactQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action impact.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Valued Reviews"
                value={toNumber(costActionImpactSummary?.totals.valued_inventory_review_products)}
                subtitle="Actions with estimated inventory value"
                tone={toNumber(costActionImpactSummary?.totals.valued_inventory_review_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Unvalued Stock"
                value={toNumber(costActionImpactSummary?.totals.unvalued_stock_review_products)}
                subtitle={`${toNumber(costActionImpactSummary?.totals.unvalued_action_stock_quantity).toLocaleString()} units need cost basis`}
                tone={toNumber(costActionImpactSummary?.totals.unvalued_stock_review_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Impact Value"
                value={formatMoney(costActionImpactSummary?.totals.total_actionable_estimated_value)}
                subtitle="Estimated value under cost review"
                tone={toNumber(costActionImpactSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Impact breakdown</h4>
                {(costActionImpactSummary?.impact_breakdown ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No cost action impact found.</div>
                ) : (
                  (costActionImpactSummary?.impact_breakdown ?? []).map((row) => (
                    <div key={row.impact_type} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatImpactType(row.impact_type)}</div>
                        <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)} • avg priority {formatPercent(row.average_priority_score)}</div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Top impact products</h4>
                {(costActionImpactSummary?.top_impact_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No impact products found.</div>
                ) : (
                  (costActionImpactSummary?.top_impact_products ?? []).map((row) => (
                    <div key={`${row.id}-${row.impact_type || 'impact'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{formatImpactType(row.impact_type)} • {formatActionType(row.action_type)} • {formatMoney(row.estimated_inventory_value)}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Suppliers</h3>
            <p style={styles.panelSubtitle}>
              Supplier-level costing follow-up from the current product supplier relationship. Read-only and derived from existing costing action rules.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionSupplierQuery.refetch()}
          >
            Refresh Suppliers
          </button>
        </div>

        {costActionSupplierQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action suppliers...</div>
        ) : costActionSupplierQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action suppliers.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Action Suppliers"
                value={toNumber(costActionSupplierSummary?.totals.actionable_suppliers)}
                subtitle="Suppliers with costing follow-up"
                tone={toNumber(costActionSupplierSummary?.totals.actionable_suppliers) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Supplier Products"
                value={toNumber(costActionSupplierSummary?.totals.total_actionable_products)}
                subtitle="Actionable products grouped by supplier"
                tone={toNumber(costActionSupplierSummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Supplier Value"
                value={formatMoney(costActionSupplierSummary?.totals.total_actionable_estimated_value)}
                subtitle="Estimated value under supplier review"
                tone={toNumber(costActionSupplierSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.tableWrapperCompact}>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Recommended supplier action</th>
                    <th style={styles.th}>Products</th>
                    <th style={styles.th}>Action Mix</th>
                    <th style={styles.th}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(costActionSupplierSummary?.suppliers ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={5}>No supplier-level cost actions found.</td>
                    </tr>
                  ) : (
                    (costActionSupplierSummary?.suppliers ?? []).map((row) => (
                      <tr key={row.supplier_id || row.supplier_name}>
                        <td style={styles.td}>
                          <strong>{row.supplier_name}</strong>
                          <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units</div>
                        </td>
                        <td style={styles.td}>{row.recommended_supplier_action}</td>
                        <td style={styles.td}>{toNumber(row.product_count)}</td>
                        <td style={styles.td}>
                          Missing {toNumber(row.missing_cost_products)} • Standard {toNumber(row.standard_review_products)} • History {toNumber(row.history_review_products)}
                        </td>
                        <td style={styles.td}>{formatMoney(row.estimated_inventory_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Sources</h3>
            <p style={styles.panelSubtitle}>
              Cost-basis view of the action plan, separating missing cost, standard fallback, and received-cost evidence reviews.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionSourceQuery.refetch()}
          >
            Refresh Sources
          </button>
        </div>

        {costActionSourceQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action sources...</div>
        ) : costActionSourceQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action sources.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Missing Source"
                value={toNumber(costActionSourceSummary?.totals.missing_source_products)}
                subtitle="Actionable stock with no cost basis"
                tone={toNumber(costActionSourceSummary?.totals.missing_source_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Standard Fallback"
                value={toNumber(costActionSourceSummary?.totals.standard_source_products)}
                subtitle="Actions relying on standard cost"
                tone={toNumber(costActionSourceSummary?.totals.standard_source_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Received Evidence"
                value={toNumber(costActionSourceSummary?.totals.received_source_products)}
                subtitle="Actions backed by received costs"
                tone={toNumber(costActionSourceSummary?.totals.received_source_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Source Value"
                value={formatMoney(costActionSourceSummary?.totals.total_actionable_estimated_value)}
                subtitle="Estimated value under source review"
                tone={toNumber(costActionSourceSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Source breakdown</h4>
                {(costActionSourceSummary?.sources ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No cost action sources found.</div>
                ) : (
                  (costActionSourceSummary?.sources ?? []).map((row) => (
                    <div key={row.cost_source} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatCostSource(row.cost_source)}</div>
                        <div style={styles.rowSubtle}>{row.recommended_source_action}</div>
                        <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)}</div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Source priority products</h4>
                {(costActionSourceSummary?.source_priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No source priority products found.</div>
                ) : (
                  (costActionSourceSummary?.source_priority_products ?? []).map((row) => (
                    <div key={`${row.id}-${row.effective_cost_source || 'source'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{formatCostSource(row.effective_cost_source || 'no_cost')} • {formatActionType(row.action_type)}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Age</h3>
            <p style={styles.panelSubtitle}>
              Freshness view of actionable cost evidence, highlighting missing dates, standard-only fallback, and stale received costs.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionAgeQuery.refetch()}
          >
            Refresh Age
          </button>
        </div>

        {costActionAgeQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action age...</div>
        ) : costActionAgeQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action age.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="No Cost Date"
                value={toNumber(costActionAgeSummary?.totals.no_cost_date_products)}
                subtitle="Actions without cost evidence"
                tone={toNumber(costActionAgeSummary?.totals.no_cost_date_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Standard Only"
                value={toNumber(costActionAgeSummary?.totals.standard_fallback_only_products)}
                subtitle="Using standard cost fallback"
                tone={toNumber(costActionAgeSummary?.totals.standard_fallback_only_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Stale Received"
                value={toNumber(costActionAgeSummary?.totals.stale_received_cost_products)}
                subtitle={`Older than ${toNumber(costActionAgeSummary?.thresholds.stale_cost_days || 90)} days`}
                tone={toNumber(costActionAgeSummary?.totals.stale_received_cost_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Age Value"
                value={formatMoney(costActionAgeSummary?.totals.total_actionable_estimated_value)}
                subtitle="Estimated value under age review"
                tone={toNumber(costActionAgeSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Age breakdown</h4>
                {(costActionAgeSummary?.age_bands ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No cost action age bands found.</div>
                ) : (
                  (costActionAgeSummary?.age_bands ?? []).map((row) => (
                    <div key={row.cost_age_band} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatCostAgeBand(row.cost_age_band)}</div>
                        <div style={styles.rowSubtle}>{row.recommended_age_action}</div>
                        <div style={styles.rowSubtle}>
                          {toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)} • max age {row.max_latest_cost_age_days ?? '-'} days
                        </div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Age priority products</h4>
                {(costActionAgeSummary?.age_priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No age priority products found.</div>
                ) : (
                  (costActionAgeSummary?.age_priority_products ?? []).map((row) => (
                    <div key={`${row.id}-${row.cost_age_band || 'age'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{formatCostAgeBand(row.cost_age_band)} • {formatActionType(row.action_type)}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Coverage</h3>
            <p style={styles.panelSubtitle}>
              Coverage view for stocked products with usable cost basis, showing where action gaps remain before valuation decisions.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionCoverageQuery.refetch()}
          >
            Refresh Coverage
          </button>
        </div>

        {costActionCoverageQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action coverage...</div>
        ) : costActionCoverageQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action coverage.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Stocked Coverage"
                value={`${toNumber(costActionCoverageSummary?.totals.stocked_cost_coverage_percent).toFixed(1)}%`}
                subtitle="Stocked products with cost basis"
                tone={toNumber(costActionCoverageSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title="Uncosted Stocked"
                value={toNumber(costActionCoverageSummary?.totals.uncosted_stocked_products)}
                subtitle="Stocked products with no cost basis"
                tone={toNumber(costActionCoverageSummary?.totals.uncosted_stocked_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Action Rate"
                value={`${toNumber(costActionCoverageSummary?.totals.action_rate_percent).toFixed(1)}%`}
                subtitle="Products needing cost action"
                tone={toNumber(costActionCoverageSummary?.totals.action_rate_percent) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Action Value"
                value={formatMoney(costActionCoverageSummary?.totals.actionable_estimated_value)}
                subtitle="Estimated value under action"
                tone={toNumber(costActionCoverageSummary?.totals.actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Category coverage</h4>
                {(costActionCoverageSummary?.category_coverage ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No category coverage gaps found.</div>
                ) : (
                  (costActionCoverageSummary?.category_coverage ?? []).map((row) => (
                    <div key={row.category} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.category}</div>
                        <div style={styles.rowSubtle}>
                          {toNumber(row.stocked_cost_coverage_percent).toFixed(1)}% stocked coverage • {toNumber(row.uncosted_stocked_products)} uncosted stocked
                        </div>
                        <div style={styles.rowSubtle}>{formatMoney(row.actionable_estimated_value)} actionable value</div>
                      </div>
                      <strong>{toNumber(row.actionable_products)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Coverage gaps</h4>
                {(costActionCoverageSummary?.coverage_gaps ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No coverage gaps found.</div>
                ) : (
                  (costActionCoverageSummary?.coverage_gaps ?? []).map((row) => (
                    <div key={`${row.id}-${row.action_type || 'coverage'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{row.category || 'Uncategorized'} • {formatActionType(row.action_type)}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>



      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Dashboard Summary</h3>
            <p style={styles.panelSubtitle}>
              Executive costing overview combining valuation, coverage, alerts, and recommendations. Read-only summary for prioritizing costing work.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costDashboardQuery.refetch()}
          >
            Refresh Dashboard
          </button>
        </div>

        {costDashboardQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost dashboard...</div>
        ) : costDashboardQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost dashboard summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Inventory Value"
                value={formatMoney(costDashboardSummary?.totals.total_estimated_inventory_value)}
                subtitle="Estimated stocked value"
                tone="good"
              />
              <StatCard
                title="Review Value"
                value={formatMoney(costDashboardSummary?.totals.review_estimated_value)}
                subtitle="Value under recommendation"
                tone={toNumber(costDashboardSummary?.totals.review_estimated_value) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Coverage"
                value={`${toNumber(costDashboardSummary?.totals.stocked_cost_coverage_percent).toFixed(1)}%`}
                subtitle="Stocked products with cost basis"
                tone={toNumber(costDashboardSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title="Critical + High"
                value={toNumber(costDashboardSummary?.totals.critical_recommendations) + toNumber(costDashboardSummary?.totals.high_recommendations)}
                subtitle="Priority cost actions"
                tone={(toNumber(costDashboardSummary?.totals.critical_recommendations) + toNumber(costDashboardSummary?.totals.high_recommendations)) > 0 ? 'bad' : 'good'}
              />
            </div>

            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Missing Cost"
                value={toNumber(costDashboardSummary?.totals.missing_cost_products)}
                subtitle="Stocked products without cost"
                tone={toNumber(costDashboardSummary?.totals.missing_cost_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Standard Review"
                value={toNumber(costDashboardSummary?.totals.standard_review_products)}
                subtitle="Latest cost vs standard"
                tone={toNumber(costDashboardSummary?.totals.standard_review_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Cost Spikes"
                value={toNumber(costDashboardSummary?.totals.spike_review_products)}
                subtitle="Latest cost change alerts"
                tone={toNumber(costDashboardSummary?.totals.spike_review_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Stale Evidence"
                value={toNumber(costDashboardSummary?.totals.stale_cost_products)}
                subtitle="Old received cost basis"
                tone={toNumber(costDashboardSummary?.totals.stale_cost_products) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Executive actions</h4>
                {(costDashboardSummary?.executive_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No executive cost actions needed.</div>
                ) : (
                  (costDashboardSummary?.executive_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>Use existing audited product, receiving, and standard-cost workflows.</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Top review categories</h4>
                {(costDashboardSummary?.top_review_categories ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No category review hotspots.</div>
                ) : (
                  (costDashboardSummary?.top_review_categories ?? []).map((row) => (
                    <div key={row.category} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.category}</div>
                        <div style={styles.rowSubtle}>{formatMoney(row.review_estimated_value)} review value</div>
                      </div>
                      <strong>{toNumber(row.recommendation_count)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ ...styles.riskListCard, marginTop: '1rem' }}>
              <h4 style={styles.sectionTitle}>Dashboard priority products</h4>
              {(costDashboardSummary?.priority_products ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No priority products found.</div>
              ) : (
                (costDashboardSummary?.priority_products ?? []).map((row) => (
                  <div key={`${row.id}-${row.recommendation_type || 'dashboard'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>
                        {formatCostRecommendationPriority(row.recommendation_priority)} • {formatCostRecommendationType(row.recommendation_type)} • {formatMoney(row.estimated_inventory_value)}
                      </div>
                    </div>
                    <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                      History
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Hardening Summary</h3>
            <p style={styles.panelSubtitle}>
              Final costing health checklist for edge cases before finance close. Derived read-only from products, stock, and stock movement costs.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => costHardeningQuery.refetch()}>
            Refresh Hardening
          </button>
        </div>

        {costHardeningQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost hardening summary...</div>
        ) : costHardeningQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost hardening summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Hardening Issues"
                value={toNumber(costHardeningSummary?.totals.issue_count)}
                subtitle="Total checklist findings"
                tone={toNumber(costHardeningSummary?.totals.issue_count) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Review Value"
                value={formatMoney(costHardeningSummary?.totals.hardening_review_value)}
                subtitle="Estimated value in findings"
                tone={toNumber(costHardeningSummary?.totals.hardening_review_value) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Missing Costs"
                value={toNumber(costHardeningSummary?.totals.missing_stock_cost_products)}
                subtitle="Stocked products without cost"
                tone={toNumber(costHardeningSummary?.totals.missing_stock_cost_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Integrity Gaps"
                value={toNumber(costHardeningSummary?.totals.movement_cost_integrity_products)}
                subtitle="Movement cost rows to review"
                tone={toNumber(costHardeningSummary?.totals.movement_cost_integrity_products) > 0 ? 'bad' : 'good'}
              />
            </div>

            <div style={styles.costReadinessGrid}>
              <StatCard title="Fallback Stock" value={toNumber(costHardeningSummary?.totals.standard_fallback_stocked_products)} subtitle="Using standard cost basis" tone={toNumber(costHardeningSummary?.totals.standard_fallback_stocked_products) > 0 ? 'warn' : 'good'} />
              <StatCard title="High Variance" value={toNumber(costHardeningSummary?.totals.high_variance_products)} subtitle="Latest vs standard" tone={toNumber(costHardeningSummary?.totals.high_variance_products) > 0 ? 'warn' : 'good'} />
              <StatCard title="Stale Evidence" value={toNumber(costHardeningSummary?.totals.stale_received_cost_products)} subtitle="Old received cost basis" tone={toNumber(costHardeningSummary?.totals.stale_received_cost_products) > 0 ? 'warn' : 'good'} />
              <StatCard title="Mixed Sources" value={toNumber(costHardeningSummary?.totals.mixed_cost_source_products)} subtitle="Multiple movement cost sources" tone={toNumber(costHardeningSummary?.totals.mixed_cost_source_products) > 0 ? 'warn' : 'good'} />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Hardening actions</h4>
                {(costHardeningSummary?.hardening_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No hardening actions needed.</div>
                ) : (
                  (costHardeningSummary?.hardening_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>Use existing audited receiving and standard-cost workflows.</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Priority hardening products</h4>
                {(costHardeningSummary?.priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No priority hardening products found.</div>
                ) : (
                  (costHardeningSummary?.priority_products ?? []).map((row) => (
                    <div key={`${row.id}-hardening`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>
                          Score {toNumber(row.hardening_score).toFixed(0)} • {formatMoney(row.estimated_inventory_value)} • {row.valuation_basis || 'none'}
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
          </>
        )}
      </section>


      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Governance Summary</h3>
            <p style={styles.panelSubtitle}>
              Final read-only readiness check for the costing intelligence module, built from dashboard, report, and hardening outputs.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => { costGovernanceQuery.refetch(); costGovernanceDetailsQuery.refetch(); costGovernanceAuditQuery.refetch(); costGovernanceSignoffQuery.refetch(); costGovernanceReviewQueueQuery.refetch(); costGovernanceReviewPackQuery.refetch(); costGovernanceFinalQuery.refetch(); costPerformanceQuery.refetch(); costSecurityAuditQuery.refetch(); }}>
            Refresh Governance
          </button>
        </div>

        {costGovernanceQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost governance...</div>
        ) : costGovernanceQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost governance summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Readiness Score"
                value={`${toNumber(costGovernanceSummary?.readiness_score).toFixed(0)}%`}
                subtitle={costGovernanceSummary?.governance_status || 'unknown'}
                tone={toNumber(costGovernanceSummary?.readiness_score) >= 90 ? 'good' : toNumber(costGovernanceSummary?.readiness_score) >= 70 ? 'warn' : 'bad'}
              />
              <StatCard
                title="Coverage"
                value={`${toNumber(costGovernanceSummary?.totals.stocked_cost_coverage_percent).toFixed(1)}%`}
                subtitle="Stocked products with cost basis"
                tone={toNumber(costGovernanceSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title="Alerts"
                value={toNumber(costGovernanceSummary?.totals.total_alerts)}
                subtitle="Open derived signals"
                tone={toNumber(costGovernanceSummary?.totals.total_alerts) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Review Exposure"
                value={formatMoney(costGovernanceSummary?.totals.review_estimated_value)}
                subtitle="Value needing review"
                tone={toNumber(costGovernanceSummary?.totals.review_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Governance checklist</h4>
                {(costGovernanceSummary?.checklist ?? []).map((item) => (
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
                <h4 style={styles.sectionTitle}>Next actions</h4>
                {(costGovernanceSummary?.next_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No governance actions required.</div>
                ) : (
                  (costGovernanceSummary?.next_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>Use existing costing review workflows; no automatic changes are made.</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>



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



            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Cost operations runbook</h4>
                  <p style={styles.panelSubtitle}>Daily, weekly, and monthly operating guidance after costing governance handoff. Derived and read-only.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsRunbookQuery.refetch()}>
                  Refresh Runbook
                </button>
              </div>
              {costOperationsRunbookQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations runbook...</div>
              ) : costOperationsRunbookQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations runbook.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Runbook Status" value={costOperationsRunbookSummary?.runbook_status || 'unknown'} subtitle={costOperationsRunbookSummary?.can_handoff ? 'Handoff-capable' : 'Review required'} tone={costOperationsRunbookSummary?.runbook_status === 'steady_state' ? 'good' : 'warn'} />
                    <StatCard title="Hardening Issues" value={toNumber(costOperationsRunbookSummary?.totals.hardening_issues)} subtitle="Must stay visible" tone={toNumber(costOperationsRunbookSummary?.totals.hardening_issues) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Flagged Products" value={toNumber(costOperationsRunbookSummary?.totals.flagged_products)} subtitle="Dashboard follow-up" tone={toNumber(costOperationsRunbookSummary?.totals.flagged_products) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Runbook Rows" value={toNumber(costOperationsRunbookSummary?.totals.runbook_rows)} subtitle="Export-ready evidence" />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costOperationsRunbookSummary?.operating_rhythm ?? []).map((item) => (
                        <div key={`${item.cadence}-${item.owner}`} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.cadence} · {item.owner}</div>
                            <div style={styles.rowSubtle}>{item.action}</div>
                            <div style={styles.rowMeta}>{item.source}</div>
                          </div>
                          <span style={styles.badge}>{item.status}</span>
                        </div>
                      ))}
                    </div>
                    <div style={styles.riskList}>
                      {(costOperationsRunbookSummary?.escalation_rules ?? []).map((item) => (
                        <div key={item.key} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.condition}</div>
                            <div style={styles.rowSubtle}>{item.escalation}</div>
                          </div>
                          <span style={styles.badge}>{toNumber(item.current_value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(costOperationsRunbookSummary?.runbook_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsRunbookSummary?.runbook_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost operations controls</h4>
                  <p style={styles.panelSubtitle}>Compact operating-control panel for completed costing governance. Derived from runbook, governance, dashboard, and hardening outputs.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsControlQuery.refetch()}>
                  Refresh Controls
                </button>
              </div>
              {costOperationsControlQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations controls...</div>
              ) : costOperationsControlQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations controls.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Control Status" value={costOperationsControlSummary?.control_status || 'unknown'} subtitle={costOperationsControlSummary?.runbook_status || 'runbook'} tone={costOperationsControlSummary?.control_status === 'controlled' ? 'good' : costOperationsControlSummary?.control_status === 'control_review' ? 'bad' : 'warn'} />
                    <StatCard title="Passed Checks" value={toNumber(costOperationsControlSummary?.totals.passed_checks)} subtitle={`${toNumber(costOperationsControlSummary?.totals.checks)} total checks`} tone="good" />
                    <StatCard title="Watch Checks" value={toNumber(costOperationsControlSummary?.totals.watch_checks)} subtitle="Keep visible" tone={toNumber(costOperationsControlSummary?.totals.watch_checks) > 0 ? 'warn' : 'good'} />
                    <StatCard title="Review Checks" value={toNumber(costOperationsControlSummary?.totals.review_checks)} subtitle="Requires follow-up" tone={toNumber(costOperationsControlSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsControlSummary?.control_checks ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label} · {item.owner}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <span style={styles.badge}>{item.status}: {toNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  {(costOperationsControlSummary?.operating_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsControlSummary?.operating_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost operations evidence</h4>
                  <p style={styles.panelSubtitle}>One derived evidence pack across audit rows, report rows, runbook rows, and control checks.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsEvidenceQuery.refetch()}>
                  Refresh Evidence
                </button>
              </div>
              {costOperationsEvidenceQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations evidence...</div>
              ) : costOperationsEvidenceQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations evidence.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Evidence Status" value={costOperationsEvidenceSummary?.evidence_status || 'unknown'} subtitle={costOperationsEvidenceSummary?.control_status || 'control'} tone={costOperationsEvidenceSummary?.evidence_status === 'evidence_ready' ? 'good' : costOperationsEvidenceSummary?.evidence_status === 'evidence_review' ? 'bad' : 'warn'} />
                    <StatCard title="Ready Sections" value={toNumber(costOperationsEvidenceSummary?.totals.ready_sections)} subtitle={`${toNumber(costOperationsEvidenceSummary?.totals.evidence_sections)} sections`} tone="good" />
                    <StatCard title="Review Sections" value={toNumber(costOperationsEvidenceSummary?.totals.review_sections)} subtitle="Needs follow-up" tone={toNumber(costOperationsEvidenceSummary?.totals.review_sections) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Evidence Rows" value={toNumber(costOperationsEvidenceSummary?.totals.evidence_rows)} subtitle="Pack rows" />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsEvidenceSummary?.evidence_sections ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label} · {item.source}</div>
                          <div style={styles.rowSubtle}>{item.purpose}</div>
                        </div>
                        <span style={styles.badge}>{item.status}: {toNumber(item.rows)}</span>
                      </div>
                    ))}
                  </div>

                  {(costOperationsEvidenceSummary?.evidence_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsEvidenceSummary?.evidence_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost operations readiness</h4>
                  <p style={styles.panelSubtitle}>Final read-only readiness check over evidence, controls, runbook, and governance handoff.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costOperationsReadinessQuery.refetch()}>
                  Refresh Readiness
                </button>
              </div>
              {costOperationsReadinessQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost operations readiness...</div>
              ) : costOperationsReadinessQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost operations readiness.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Readiness Status" value={costOperationsReadinessSummary?.readiness_status || 'unknown'} subtitle={costOperationsReadinessSummary?.can_handoff ? 'Handoff capable' : 'Review required'} tone={costOperationsReadinessSummary?.readiness_status === 'operationally_ready' ? 'good' : costOperationsReadinessSummary?.readiness_status === 'readiness_review' ? 'bad' : 'warn'} />
                    <StatCard title="Readiness Score" value={`${toNumber(costOperationsReadinessSummary?.readiness_score).toFixed(0)}%`} subtitle="Derived go/no-go score" tone={toNumber(costOperationsReadinessSummary?.readiness_score) >= 90 ? 'good' : toNumber(costOperationsReadinessSummary?.readiness_score) >= 70 ? 'warn' : 'bad'} />
                    <StatCard title="Review Checks" value={toNumber(costOperationsReadinessSummary?.totals.review_checks)} subtitle={`${toNumber(costOperationsReadinessSummary?.totals.checks)} checks`} tone={toNumber(costOperationsReadinessSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Watch Checks" value={toNumber(costOperationsReadinessSummary?.totals.watch_checks)} subtitle="Carry forward" tone={toNumber(costOperationsReadinessSummary?.totals.watch_checks) > 0 ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskList}>
                    {(costOperationsReadinessSummary?.readiness_checklist ?? []).map((item) => (
                      <div key={item.key} style={styles.riskListItem}>
                        <div>
                          <div style={styles.rowTitle}>{item.label}</div>
                          <div style={styles.rowSubtle}>{item.detail}</div>
                        </div>
                        <span style={styles.badge}>{item.status}: {toNumber(item.value)}</span>
                      </div>
                    ))}
                  </div>

                  {(costOperationsReadinessSummary?.readiness_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costOperationsReadinessSummary?.readiness_guidance ?? []).map((item) => (
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


            <div style={styles.riskListCard}>
              <div style={styles.packageHeader}>
                <div>
                  <h4 style={styles.sectionTitle}>Governance finalization</h4>
                  <p style={styles.panelSubtitle}>Final go/no-go snapshot for closing the costing governance module. Derived and read-only.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costGovernanceFinalQuery.refetch()}>
                  Refresh Finalization
                </button>
              </div>
              {costGovernanceFinalQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading governance finalization...</div>
              ) : costGovernanceFinalQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost governance finalization.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Final Status" value={costGovernanceFinalSummary?.final_status || 'unknown'} subtitle={costGovernanceFinalSummary?.can_finalize ? 'Ready to close module' : 'Review required'} tone={costGovernanceFinalSummary?.can_finalize ? 'good' : costGovernanceFinalSummary?.final_status === 'final_watch' ? 'warn' : 'bad'} />
                    <StatCard title="Final Score" value={`${toNumber(costGovernanceFinalSummary?.final_score).toFixed(0)}%`} subtitle="Governance + operations" tone={toNumber(costGovernanceFinalSummary?.final_score) >= 90 ? 'good' : toNumber(costGovernanceFinalSummary?.final_score) >= 70 ? 'warn' : 'bad'} />
                    <StatCard title="Blockers" value={toNumber(costGovernanceFinalSummary?.totals.blockers)} subtitle="Must be zero" tone={toNumber(costGovernanceFinalSummary?.totals.blockers) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Evidence Rows" value={toNumber(costGovernanceFinalSummary?.totals.evidence_rows)} subtitle="Audit-ready support" tone={toNumber(costGovernanceFinalSummary?.totals.evidence_rows) > 0 ? 'good' : 'warn'} />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costGovernanceFinalSummary?.final_checklist ?? []).map((item) => (
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
                      {(costGovernanceFinalSummary?.final_rows ?? []).slice(0, 6).map((row) => (
                        <div key={`${row.section}-${row.key}`} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{row.label}</div>
                            <div style={styles.rowSubtle}>{row.section}</div>
                          </div>
                          <span style={styles.badge}>{String(row.value ?? row.status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(costGovernanceFinalSummary?.final_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costGovernanceFinalSummary?.final_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost performance readiness</h4>
                  <p style={styles.panelSubtitle}>Query-readiness and payload guardrails for high-volume costing intelligence. Derived and read-only.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costPerformanceQuery.refetch()}>
                  Refresh Performance
                </button>
              </div>
              {costPerformanceQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost performance readiness...</div>
              ) : costPerformanceQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost performance readiness.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Performance Status" value={costPerformanceSummary?.performance_status || 'unknown'} subtitle={costPerformanceSummary?.query_optimization_status || 'query status'} tone={costPerformanceSummary?.performance_status === 'performance_ready' ? 'good' : costPerformanceSummary?.performance_status === 'performance_watch' ? 'warn' : 'bad'} />
                    <StatCard title="Performance Score" value={`${toNumber(costPerformanceSummary?.performance_score).toFixed(0)}%`} subtitle="Indexes + payloads" tone={toNumber(costPerformanceSummary?.performance_score) >= 90 ? 'good' : toNumber(costPerformanceSummary?.performance_score) >= 70 ? 'warn' : 'bad'} />
                    <StatCard title="Indexes Present" value={`${toNumber(costPerformanceSummary?.totals.present_indexes)} / ${toNumber(costPerformanceSummary?.totals.expected_indexes)}`} subtitle="Migration 019 checks" tone={toNumber(costPerformanceSummary?.totals.missing_indexes) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Review Checks" value={toNumber(costPerformanceSummary?.totals.review_checks)} subtitle="Must be cleared" tone={toNumber(costPerformanceSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costPerformanceSummary?.index_checks ?? []).map((item) => (
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
                      {(costPerformanceSummary?.payload_checks ?? []).map((item) => (
                        <div key={item.key} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.label}</div>
                            <div style={styles.rowSubtle}>{item.detail}</div>
                          </div>
                          <span style={styles.badge}>{String(item.value ?? item.status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(costPerformanceSummary?.performance_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costPerformanceSummary?.performance_guidance ?? []).map((item) => (
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
                  <h4 style={styles.sectionTitle}>Cost security audit</h4>
                  <p style={styles.panelSubtitle}>Final permission, tenant-boundary, support/platform visibility, and read-only closeout checks for Step 165.</p>
                </div>
                <button type="button" style={styles.secondaryButton} onClick={() => costSecurityAuditQuery.refetch()}>
                  Refresh Security
                </button>
              </div>
              {costSecurityAuditQuery.isLoading ? (
                <div style={styles.rowSubtle}>Loading cost security audit...</div>
              ) : costSecurityAuditQuery.isError ? (
                <div style={styles.errorText}>Unable to load cost security audit.</div>
              ) : (
                <>
                  <div style={styles.summaryGrid}>
                    <StatCard title="Security Status" value={costSecurityAuditSummary?.security_status || 'unknown'} subtitle={costSecurityAuditSummary?.tenant_scope_status || 'tenant scope'} tone={costSecurityAuditSummary?.security_status === 'security_ready' ? 'good' : costSecurityAuditSummary?.security_status === 'security_watch' ? 'warn' : 'bad'} />
                    <StatCard title="Security Score" value={`${toNumber(costSecurityAuditSummary?.security_score).toFixed(0)}%`} subtitle="Permissions + boundaries" tone={toNumber(costSecurityAuditSummary?.security_score) >= 90 ? 'good' : toNumber(costSecurityAuditSummary?.security_score) >= 70 ? 'warn' : 'bad'} />
                    <StatCard title="Review Checks" value={toNumber(costSecurityAuditSummary?.totals.review_checks)} subtitle="Must be cleared" tone={toNumber(costSecurityAuditSummary?.totals.review_checks) > 0 ? 'bad' : 'good'} />
                    <StatCard title="Support Session" value={costSecurityAuditSummary?.access_context.support_session_present ? 'present' : 'none'} subtitle={costSecurityAuditSummary?.access_context.actor_type || 'actor context'} tone={costSecurityAuditSummary?.access_context.support_session_present ? 'warn' : 'good'} />
                  </div>

                  <div style={styles.riskGrid}>
                    <div style={styles.riskList}>
                      {(costSecurityAuditSummary?.permission_checks ?? []).map((item) => (
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
                      {(costSecurityAuditSummary?.boundary_checks ?? []).map((item) => (
                        <div key={item.key} style={styles.riskListItem}>
                          <div>
                            <div style={styles.rowTitle}>{item.label}</div>
                            <div style={styles.rowSubtle}>{item.detail}</div>
                          </div>
                          <span style={styles.badge}>{String(item.value ?? item.status)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(costSecurityAuditSummary?.security_guidance ?? []).length > 0 ? (
                    <ul style={styles.noteList}>
                      {(costSecurityAuditSummary?.security_guidance ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>

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
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Report Summary</h3>
            <p style={styles.panelSubtitle}>
              Export-ready costing snapshot combining dashboard totals, valuation, risk, alerts, and recommendations for finance review. Read-only reporting only.
            </p>
          </div>
          <div style={styles.actionRow}>
            <button type="button" style={styles.secondaryButton} onClick={() => costReportQuery.refetch()}>
              Refresh Report
            </button>
            <button type="button" style={styles.secondaryButton} onClick={handleExportCostReportCsv} disabled={!costReportSummary?.export_rows?.length}>
              Export Report CSV
            </button>
            <button type="button" style={styles.secondaryButton} onClick={handlePrintCostReport} disabled={!costReportSummary}>
              Print Report
            </button>
          </div>
        </div>

        {costReportQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost report...</div>
        ) : costReportQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost report summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Report Value"
                value={formatMoney(costReportSummary?.dashboard_totals.total_estimated_inventory_value)}
                subtitle="Estimated stocked value"
                tone="good"
              />
              <StatCard
                title="Review Exposure"
                value={formatMoney(costReportSummary?.dashboard_totals.review_estimated_value)}
                subtitle="Value needing costing review"
                tone={toNumber(costReportSummary?.dashboard_totals.review_estimated_value) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Alerts"
                value={toNumber(costReportSummary?.alert_totals.total_alerts)}
                subtitle="Derived alert signals"
                tone={toNumber(costReportSummary?.alert_totals.total_alerts) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Recommendations"
                value={toNumber(costReportSummary?.recommendation_totals.total_recommendations)}
                subtitle="Review actions in report"
                tone={toNumber(costReportSummary?.recommendation_totals.total_recommendations) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Report metrics</h4>
                {(costReportSummary?.export_rows ?? []).map((row) => (
                  <div key={`${row.section}-${row.metric}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.metric.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}</div>
                      <div style={styles.rowSubtle}>{row.section}</div>
                    </div>
                    <strong>{String(row.value)}</strong>
                  </div>
                ))}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Report actions</h4>
                {(costReportSummary?.executive_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No report actions found.</div>
                ) : (
                  (costReportSummary?.executive_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>Included in CSV and print reporting snapshot.</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Alerts</h3>
            <p style={styles.panelSubtitle}>
              Trigger-style costing signals for missing costs, high variance, sudden cost spikes, stale evidence, and inconsistent cost history. Read-only and derived from existing cost data.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costAlertQuery.refetch()}
          >
            Refresh Alerts
          </button>
        </div>

        {costAlertQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost alerts...</div>
        ) : costAlertQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost alerts.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Total Alerts"
                value={toNumber(costAlertSummary?.totals.total_alerts)}
                subtitle="Active derived cost signals"
                tone={toNumber(costAlertSummary?.totals.total_alerts) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Critical"
                value={toNumber(costAlertSummary?.totals.critical_alerts)}
                subtitle="Immediate cost follow-up"
                tone={toNumber(costAlertSummary?.totals.critical_alerts) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Warnings"
                value={toNumber(costAlertSummary?.totals.warning_alerts)}
                subtitle="Review recommended"
                tone={toNumber(costAlertSummary?.totals.warning_alerts) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Alerted Value"
                value={formatMoney(costAlertSummary?.totals.alerted_estimated_value)}
                subtitle="Estimated value under alert"
                tone={toNumber(costAlertSummary?.totals.alerted_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Alert groups</h4>
                {(costAlertSummary?.alert_groups ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No active cost alerts.</div>
                ) : (
                  (costAlertSummary?.alert_groups ?? []).map((row) => (
                    <div key={`${row.alert_type}-${row.alert_severity}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatCostAlertType(row.alert_type)}</div>
                        <div style={styles.rowSubtle}>
                          {formatCostAlertSeverity(row.alert_severity)} • {formatMoney(row.estimated_inventory_value)} alerted value
                        </div>
                        <div style={styles.rowSubtle}>{row.recommended_alert_action}</div>
                      </div>
                      <strong>{toNumber(row.alert_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Top alert products</h4>
                {(costAlertSummary?.top_alerts ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No alert products found.</div>
                ) : (
                  (costAlertSummary?.top_alerts ?? []).map((row) => (
                    <div key={`${row.id}-${row.alert_type || 'alert'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>
                          {formatCostAlertSeverity(row.alert_severity)} • {formatCostAlertType(row.alert_type)} • {formatMoney(row.estimated_inventory_value)}
                        </div>
                        <div style={styles.rowSubtle}>{row.recommended_alert_action}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Recommendations</h3>
            <p style={styles.panelSubtitle}>
              Review-ready costing recommendations derived from alerts, variance, cost spikes, stale cost evidence, and inconsistent history. Read-only guidance only.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costRecommendationQuery.refetch()}
          >
            Refresh Recommendations
          </button>
        </div>

        {costRecommendationQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost recommendations...</div>
        ) : costRecommendationQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost recommendations.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Recommendations"
                value={toNumber(costRecommendationSummary?.totals.total_recommendations)}
                subtitle="Products needing review"
                tone={toNumber(costRecommendationSummary?.totals.total_recommendations) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Critical / High"
                value={toNumber(costRecommendationSummary?.totals.critical_recommendations) + toNumber(costRecommendationSummary?.totals.high_recommendations)}
                subtitle="Prioritize first"
                tone={(toNumber(costRecommendationSummary?.totals.critical_recommendations) + toNumber(costRecommendationSummary?.totals.high_recommendations)) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Recommended Units"
                value={toNumber(costRecommendationSummary?.totals.recommended_stock_quantity).toLocaleString()}
                subtitle="Stock under recommendation"
                tone={toNumber(costRecommendationSummary?.totals.recommended_stock_quantity) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Recommended Value"
                value={formatMoney(costRecommendationSummary?.totals.recommended_estimated_value)}
                subtitle="Estimated value to review"
                tone={toNumber(costRecommendationSummary?.totals.recommended_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Recommendation groups</h4>
                {(costRecommendationSummary?.recommendation_groups ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No cost recommendations.</div>
                ) : (
                  (costRecommendationSummary?.recommendation_groups ?? []).map((row) => (
                    <div key={`${row.recommendation_type}-${row.recommendation_priority}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatCostRecommendationType(row.recommendation_type)}</div>
                        <div style={styles.rowSubtle}>
                          {formatCostRecommendationPriority(row.recommendation_priority)} • {formatMoney(row.estimated_inventory_value)} review value
                        </div>
                        <div style={styles.rowSubtle}>{row.recommendation}</div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Top recommended products</h4>
                {(costRecommendationSummary?.top_recommendations ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No recommended products found.</div>
                ) : (
                  (costRecommendationSummary?.top_recommendations ?? []).map((row) => (
                    <div key={`${row.id}-${row.recommendation_type || 'recommendation'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>
                          {formatCostRecommendationPriority(row.recommendation_priority)} • {formatCostRecommendationType(row.recommendation_type)} • {formatMoney(row.estimated_inventory_value)}
                        </div>
                        <div style={styles.rowSubtle}>{row.recommendation}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => handleOpenCostHistory(row)}>
                        History
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Detail</h3>
            <p style={styles.panelSubtitle}>
              Filtered costing worklist for operational follow-up and CSV export. Read-only; does not modify products, stock, shipments, or movements.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleExportCostActionDetailsCsv}
            disabled={(costActionDetails?.rows ?? []).length === 0}
          >
            Export Action CSV
          </button>
        </div>

        <div style={styles.filterGrid}>
          <div>
            <label style={styles.label}>Action type</label>
            <select
              style={styles.input}
              value={costActionDetailFilters.actionType}
              onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, actionType: event.target.value }))}
            >
              <option value="">All actions</option>
              <option value="capture_missing_cost">Capture missing cost</option>
              <option value="review_standard_cost">Review standard cost</option>
              <option value="investigate_cost_history">Investigate cost history</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Search actions</label>
            <input
              style={styles.input}
              value={costActionDetailFilters.search}
              onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search product or category"
            />
          </div>
          <div>
            <label style={styles.label}>Sort</label>
            <select
              style={styles.input}
              value={costActionDetailFilters.sort}
              onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, sort: event.target.value }))}
            >
              <option value="action_priority">Action priority</option>
              <option value="estimated_value">Estimated value</option>
              <option value="stock_quantity">Stock quantity</option>
              <option value="name">Product name</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Direction</label>
            <select
              style={styles.input}
              value={costActionDetailFilters.direction}
              onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, direction: event.target.value }))}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>

        {costActionDetailsQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading action detail...</div>
        ) : costActionDetailsQuery.isError ? (
          <div style={styles.errorBox}>Unable to load action detail.</div>
        ) : (
          <div style={styles.tableWrapperCompact}>
            <div style={styles.rowSubtle}>
              Showing {(costActionDetails?.rows ?? []).length} of {toNumber(costActionDetails?.total)} action rows • Filtered value {formatMoney(costActionDetails?.filtered_estimated_inventory_value)}
            </div>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Variance</th>
                  <th style={styles.th}>History Spread</th>
                  <th style={styles.th}>Review</th>
                </tr>
              </thead>
              <tbody>
                {(costActionDetails?.rows ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={6}>No cost action rows match the current filters.</td>
                  </tr>
                ) : (
                  (costActionDetails?.rows ?? []).map((row) => (
                    <tr key={`${row.id}-${row.action_type || 'action'}`}>
                      <td style={styles.td}>
                        <strong>{row.name}</strong>
                        <div style={styles.rowSubtle}>{row.category || 'Uncategorized'}</div>
                      </td>
                      <td style={styles.td}>
                        <strong>{formatActionType(row.action_type)}</strong>
                        <div style={styles.rowSubtle}>{row.recommended_action || ''}</div>
                      </td>
                      <td style={styles.td}>{toNumber(row.current_stock_quantity).toLocaleString()} {row.unit}</td>
                      <td style={styles.td}>{row.cost_variance_percent == null ? '—' : formatPercent(row.cost_variance_percent)}</td>
                      <td style={styles.td}>{row.cost_history_spread_percent == null ? '—' : formatPercent(row.cost_history_spread_percent)}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => handleOpenCostHistory(row)}
                        >
                          Cost History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Risk Summary</h3>
            <p style={styles.panelSubtitle}>
              Actionable costing exceptions from received costs, standard cost fallback, and movement cost history.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costRiskQuery.refetch()}
          >
            Refresh Risk
          </button>
        </div>

        {costRiskQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost risk summary...</div>
        ) : costRiskQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost risk summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="High Variance"
                value={toNumber(costRiskSummary?.totals.high_variance_products)}
                subtitle={`≥ ${formatPercent(costRiskSummary?.thresholds.variance_threshold_percent)} from standard cost`}
                tone={toNumber(costRiskSummary?.totals.high_variance_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Missing Cost"
                value={toNumber(costRiskSummary?.totals.missing_cost_products)}
                subtitle="Stocked products with no received or standard cost"
                tone={toNumber(costRiskSummary?.totals.missing_cost_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Inconsistent History"
                value={toNumber(costRiskSummary?.totals.inconsistent_cost_history_products)}
                subtitle={`Cost range spread ≥ ${formatPercent(costRiskSummary?.thresholds.history_spread_threshold_percent)}`}
                tone={toNumber(costRiskSummary?.totals.inconsistent_cost_history_products) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <CostRiskList
                title="High variance products"
                emptyText="No products exceed the variance threshold."
                rows={costRiskSummary?.high_variance ?? []}
                renderDetail={(row) => `Variance ${formatPercent(row.cost_variance_percent)} • Standard ${formatMoney(row.standard_unit_cost)} • Latest ${formatMoney(row.latest_unit_cost)}`}
                onOpenHistory={handleOpenCostHistory}
              />
              <CostRiskList
                title="Missing cost products"
                emptyText="No stocked products are missing cost."
                rows={costRiskSummary?.missing_cost ?? []}
                renderDetail={(row) => `Stock ${toNumber(row.current_stock_quantity).toLocaleString()} ${row.unit} • Add standard cost or receive costed stock`}
                onOpenHistory={handleOpenCostHistory}
              />
              <CostRiskList
                title="Inconsistent cost history"
                emptyText="No products exceed the history spread threshold."
                rows={costRiskSummary?.inconsistent_cost_history ?? []}
                renderDetail={(row) => `Spread ${formatPercent(row.cost_history_spread_percent)} • Range ${formatMoney(row.min_unit_cost)} to ${formatMoney(row.max_unit_cost)}`}
                onOpenHistory={handleOpenCostHistory}
              />
            </div>

            <div style={styles.packageHeader}>
              <div>
                <h4 style={styles.sectionTitle}>Risk detail</h4>
                <p style={styles.panelSubtitle}>
                  Filtered actionable costing exceptions for review and CSV export. Read-only; does not modify stock or cost records.
                </p>
              </div>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleExportCostRiskDetailsCsv}
                disabled={(costRiskDetails?.rows ?? []).length === 0}
              >
                Export Risk CSV
              </button>
            </div>

            <div style={styles.filterGrid}>
              <div>
                <label style={styles.label}>Risk type</label>
                <select
                  style={styles.input}
                  value={costRiskDetailFilters.riskType}
                  onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, riskType: event.target.value }))}
                >
                  <option value="">All risks</option>
                  <option value="high_variance">High variance</option>
                  <option value="missing_cost">Missing cost</option>
                  <option value="inconsistent_history">Inconsistent history</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Search risk</label>
                <input
                  style={styles.input}
                  value={costRiskDetailFilters.search}
                  onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search product or category"
                />
              </div>
              <div>
                <label style={styles.label}>Sort</label>
                <select
                  style={styles.input}
                  value={costRiskDetailFilters.sort}
                  onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, sort: event.target.value }))}
                >
                  <option value="risk_priority">Risk priority</option>
                  <option value="estimated_value">Estimated value</option>
                  <option value="stock_quantity">Stock quantity</option>
                  <option value="name">Product name</option>
                </select>
              </div>
              <div>
                <label style={styles.label}>Direction</label>
                <select
                  style={styles.input}
                  value={costRiskDetailFilters.direction}
                  onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, direction: event.target.value }))}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {costRiskDetailsQuery.isLoading ? (
              <div style={styles.emptyCell}>Loading risk detail...</div>
            ) : costRiskDetailsQuery.isError ? (
              <div style={styles.errorBox}>Unable to load risk detail.</div>
            ) : (
              <div style={styles.tableWrapperCompact}>
                <div style={styles.rowSubtle}>
                  Showing {(costRiskDetails?.rows ?? []).length} of {toNumber(costRiskDetails?.total)} risk rows • Filtered value {formatMoney(costRiskDetails?.filtered_estimated_inventory_value)}
                </div>
                <table style={styles.compactTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Risk</th>
                      <th style={styles.th}>Stock</th>
                      <th style={styles.th}>Variance</th>
                      <th style={styles.th}>History Spread</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(costRiskDetails?.rows ?? []).length === 0 ? (
                      <tr>
                        <td style={styles.emptyCell} colSpan={6}>No cost risk rows match the current filters.</td>
                      </tr>
                    ) : (
                      (costRiskDetails?.rows ?? []).map((row) => (
                        <tr key={`${row.id}-${row.risk_type || 'risk'}`}>
                          <td style={styles.td}>
                            <strong>{row.name}</strong>
                            <div style={styles.rowSubtle}>{row.category || 'Uncategorized'}</div>
                          </td>
                          <td style={styles.td}>{formatRiskType(row.risk_type)}</td>
                          <td style={styles.td}>{toNumber(row.current_stock_quantity).toLocaleString()} {row.unit}</td>
                          <td style={styles.td}>{row.cost_variance_percent == null ? '—' : formatPercent(row.cost_variance_percent)}</td>
                          <td style={styles.td}>{row.cost_history_spread_percent == null ? '—' : formatPercent(row.cost_history_spread_percent)}</td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              style={styles.secondaryButton}
                              onClick={() => handleOpenCostHistory(row)}
                            >
                              Cost History
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {!canManageProducts ? (
        <div style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Products are read-only in the frontend because your backend only allows manager and admin users to create, edit, or delete products.
        </div>
      ) : null}

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</h3>
        <p style={styles.panelSubtitle}>
          {canManageProducts
            ? 'Maintain product master records used across stock, shipments, receiving, alerts, and reporting.'
            : 'This form stays visible for context, but product writes are blocked for your current role.'}
        </p>
        <p style={styles.panelSubtitle}>
          Barcode here is the backward-compatible default package barcode. Additional package barcodes are managed from the Product List.
        </p>

        {formError ? <div style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div>
            <label style={styles.label}>Product Name</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Coffee Beans Premium"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Category</label>
            <input
              style={styles.input}
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              placeholder="Example: Beverages"
            />
          </div>

          <div>
            <label style={styles.label}>Unit</label>
            <input
              style={styles.input}
              value={form.unit}
              onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
              placeholder="Example: bottle"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Minimum Stock</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              value={form.min_stock}
              onChange={(event) =>
                setForm((current) => ({ ...current, min_stock: event.target.value }))
              }
              placeholder="0"
            />
          </div>

          <div>
            <label style={styles.label}>Standard Unit Cost</label>
            <input
              style={styles.input}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.0001"
              value={form.standard_unit_cost}
              onChange={(event) =>
                setForm((current) => ({ ...current, standard_unit_cost: event.target.value }))
              }
              placeholder="Optional fallback cost"
            />
            <div style={styles.fieldHint}>Used only when no received movement cost exists yet.</div>
          </div>

          <div>
            <label style={styles.label}>Supplier</label>
            <select
              style={styles.input}
              value={form.supplier_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, supplier_id: event.target.value }))
              }
            >
              <option value="">No supplier assigned</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Default Barcode</label>
            <input
              style={styles.input}
              value={form.barcode}
              onChange={(event) =>
                setForm((current) => ({ ...current, barcode: event.target.value }))
              }
              placeholder="Scan or enter default package barcode"
            />
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryButton} disabled={isSubmitting || !canManageProducts}>
              {isSubmitting
                ? editingProduct
                  ? 'Updating...'
                  : 'Creating...'
                : editingProduct
                  ? 'Update Product'
                  : 'Create Product'}
            </button>

            {editingProduct ? (
              <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {selectedPackageProduct ? (
        <section style={styles.panel}>
          <div style={styles.packageHeader}>
            <div>
              <h3 style={styles.panelTitle}>Packages for {selectedPackageProduct.name}</h3>
              <p style={styles.panelSubtitle}>
                Add scannable package formats such as bottle, 6-pack, case, or crate. Receiving converts package counts into base stock units.
              </p>
            </div>

            <button type="button" style={styles.secondaryButton} onClick={handleClosePackages}>
              Close Packages
            </button>
          </div>

          {packageError ? <div style={styles.errorBox}>{packageError}</div> : null}
          {packageMessage ? <div style={styles.successBox}>{packageMessage}</div> : null}

          <form onSubmit={handlePackageSubmit} style={styles.formGrid}>
            <div>
              <label style={styles.label}>Package Name</label>
              <input
                style={styles.input}
                value={packageForm.package_name}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, package_name: event.target.value }))
                }
                placeholder="Example: 6-pack"
                required
              />
            </div>

            <div>
              <label style={styles.label}>Package Barcode</label>
              <input
                style={styles.input}
                value={packageForm.barcode}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, barcode: event.target.value }))
                }
                placeholder="Scan or enter package barcode"
                required
              />
            </div>

            <div>
              <label style={styles.label}>Units Per Package</label>
              <input
                style={styles.input}
                type="number"
                inputMode="decimal"
                min="0.000001"
                step="any"
                value={packageForm.units_per_package}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, units_per_package: event.target.value }))
                }
                placeholder="1"
                required
              />
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={packageForm.is_default}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, is_default: event.target.checked }))
                }
              />
              Default package
            </label>

            <div style={styles.formActions}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={isPackageSubmitting || !canManageProducts}
              >
                {isPackageSubmitting
                  ? editingPackage
                    ? 'Updating...'
                    : 'Creating...'
                  : editingPackage
                    ? 'Update Package'
                    : 'Create Package'}
              </button>

              {editingPackage ? (
                <button type="button" style={styles.secondaryButton} onClick={handleCancelPackageEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div style={styles.packageTableBlock}>
            {packagesQuery.isLoading ? <p>Loading packages...</p> : null}

            {packagesQuery.isError ? (
              <p>Failed to load packages: {(packagesQuery.error as Error).message || 'Unknown error'}</p>
            ) : null}

            {!packagesQuery.isLoading && !packagesQuery.isError ? (
              <div style={styles.tableWrapper}>
                <table style={styles.packageTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Package</th>
                      <th style={styles.th}>Barcode</th>
                      <th style={styles.th}>Units</th>
                      <th style={styles.th}>Default</th>
                      <th style={styles.th}>Version</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.length === 0 ? (
                      <tr>
                        <td style={styles.emptyCell} colSpan={6}>
                          No packages found for this product.
                        </td>
                      </tr>
                    ) : (
                      packages.map((packageItem) => (
                        <tr key={packageItem.id}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{packageItem.package_name}</div>
                            <div style={styles.rowSubtle}>Package ID: {packageItem.id}</div>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.barcodeValue}>{packageItem.barcode}</span>
                          </td>
                          <td style={styles.td}>{String(packageItem.units_per_package)}</td>
                          <td style={styles.td}>
                            {packageItem.is_default ? (
                              <span style={styles.defaultBadge}>Default</span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.badgeVersion}>v{packageItem.version}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={styles.actionGroup}>
                              <button
                                type="button"
                                style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                                onClick={() => handleStartEditPackage(packageItem)}
                                disabled={!canManageProducts}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                                onClick={() => handleDeletePackage(packageItem)}
                                disabled={deletePackageMutation.isPending || !canManageProducts}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {selectedCostProduct ? (
        <section style={styles.panel}>
          <div style={styles.packageHeader}>
            <div>
              <h3 style={styles.panelTitle}>Cost History for {selectedCostProduct.name}</h3>
              <p style={styles.panelSubtitle}>
                Read-only cost audit from stock movements. This does not change inventory value or stock quantities.
              </p>
            </div>
            <div style={styles.actionGroup}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleExportCostHistoryCsv}
                disabled={costHistory.length === 0}
              >
                Export Cost History CSV
              </button>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={handleExportStandardCostHistoryCsv}
                disabled={standardCostHistory.length === 0}
              >
                Export Standard Cost CSV
              </button>
              <button type="button" style={styles.secondaryButton} onClick={handleCloseCostHistory}>
                Close Cost History
              </button>
            </div>
          </div>

          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Cost source</label>
              <input
                style={styles.input}
                value={costHistoryFilters.costSource}
                onChange={(event) =>
                  setCostHistoryFilters((current) => ({ ...current, costSource: event.target.value }))
                }
                placeholder="Example: shipment_item_unit_cost"
              />
            </div>

            <div>
              <label style={styles.label}>Cost from</label>
              <input
                style={styles.input}
                type="date"
                value={costHistoryFilters.costFrom}
                onChange={(event) =>
                  setCostHistoryFilters((current) => ({ ...current, costFrom: event.target.value }))
                }
              />
            </div>

            <div>
              <label style={styles.label}>Cost to</label>
              <input
                style={styles.input}
                type="date"
                value={costHistoryFilters.costTo}
                onChange={(event) =>
                  setCostHistoryFilters((current) => ({ ...current, costTo: event.target.value }))
                }
              />
            </div>

            <div style={styles.formActions}>
              <button type="button" style={styles.secondaryButton} onClick={handleClearCostHistoryFilters}>
                Clear Cost Filters
              </button>
            </div>
          </div>

          {costHistoryQuery.isLoading ? <p>Loading cost history...</p> : null}

          {costHistoryQuery.isError ? (
            <p>Failed to load cost history: {(costHistoryQuery.error as Error).message || 'Unknown error'}</p>
          ) : null}

          {!costHistoryQuery.isLoading && !costHistoryQuery.isError ? (
            <>
              <div style={styles.statsGrid}>
                <StatCard
                  title="Costed Movements"
                  value={String(costSummary?.costed_movement_count ?? 0)}
                  subtitle="Movements with unit cost"
                />
                <StatCard
                  title="Received Qty"
                  value={String(costSummary?.received_quantity ?? 0)}
                  subtitle={selectedCostProduct.unit}
                />
                <StatCard
                  title="Weighted Avg Cost"
                  value={formatMoney(costSummary?.weighted_average_unit_cost)}
                  subtitle="Received total / received qty"
                />
                <StatCard
                  title="Received Cost"
                  value={formatMoney(costSummary?.received_total_cost)}
                  subtitle="Costed receipt value"
                />
                <StatCard
                  title="Cost Range"
                  value={`${formatMoney(costSummary?.min_unit_cost)} – ${formatMoney(costSummary?.max_unit_cost)}`}
                  subtitle="Min / max unit cost"
                />
                <StatCard
                  title="Latest Cost Audit"
                  value={formatDateTime(costSummary?.latest_cost_at)}
                  subtitle="Most recent costed movement"
                />
              </div>

              <div style={styles.tableWrapper}>
                <h4 style={styles.sectionTitle}>Standard Cost Changes</h4>
                <table style={styles.packageTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Changed At</th>
                      <th style={styles.th}>Previous</th>
                      <th style={styles.th}>New</th>
                      <th style={styles.th}>Changed By</th>
                      <th style={styles.th}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standardCostHistoryQuery.isLoading ? (
                      <tr>
                        <td style={styles.emptyCell} colSpan={5}>
                          Loading standard cost changes...
                        </td>
                      </tr>
                    ) : standardCostHistory.length === 0 ? (
                      <tr>
                        <td style={styles.emptyCell} colSpan={5}>
                          No standard cost changes recorded for this product.
                        </td>
                      </tr>
                    ) : (
                      standardCostHistory.map((entry: ProductStandardCostHistoryItem) => (
                        <tr key={entry.id}>
                          <td style={styles.td}>{formatDateTime(entry.changed_at)}</td>
                          <td style={styles.td}>{formatMoney(entry.previous_standard_unit_cost)}</td>
                          <td style={styles.td}>{formatMoney(entry.new_standard_unit_cost)}</td>
                          <td style={styles.td}>{entry.changed_by_user_name || entry.changed_by_user_id || '-'}</td>
                          <td style={styles.td}>{entry.change_source}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={styles.tableWrapper}>
                <h4 style={styles.sectionTitle}>Received Movement Costs</h4>
              <table style={styles.packageTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Quantity</th>
                    <th style={styles.th}>Unit Cost</th>
                    <th style={styles.th}>Total Cost</th>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Shipment</th>
                    <th style={styles.th}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {costHistory.length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={7}>
                        No costed stock movements found for this product.
                      </td>
                    </tr>
                  ) : (
                    costHistory.map((movement: ProductCostHistoryItem) => (
                      <tr key={movement.id}>
                        <td style={styles.td}>{formatDateTime(movement.created_at)}</td>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{String(movement.change)}</div>
                          <div style={styles.rowSubtle}>{movement.reason}</div>
                        </td>
                        <td style={styles.td}>{formatMoney(movement.unit_cost)}</td>
                        <td style={styles.td}>{formatMoney(movement.total_cost)}</td>
                        <td style={styles.td}>{movement.cost_source || '-'}</td>
                        <td style={styles.td}>
                          {movement.shipment_id ? (
                            <div>
                              <div style={styles.rowTitle}>{movement.shipment_po_number || 'Shipment'}</div>
                              <div style={styles.rowSubtle}>{movement.shipment_id}</div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={styles.td}>{movement.receiving_note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Product List</h3>
        <p style={styles.panelSubtitle}>
          Search and review products available to stock, shipment, receiving, and reporting workflows.
        </p>

        <div style={styles.toolbarGrid}>
          <input
            type="text"
            placeholder="Search by product name, category, unit, or barcode..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.searchInput}
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>


          <select
            value={costStatusFilter}
            onChange={(event) => setCostStatusFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All cost statuses</option>
            <option value="costed">Costed products</option>
            <option value="uncosted">Uncosted products</option>
          </select>

          <select
            value={costBasisFilter}
            onChange={(event) => setCostBasisFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All cost bases</option>
            <option value="received">Received movement cost</option>
            <option value="standard">Standard cost fallback</option>
            <option value="none">No cost</option>
          </select>


          <select
            value={costVarianceStatusFilter}
            onChange={(event) => setCostVarianceStatusFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All standard variances</option>
            <option value="matched">Matches standard</option>
            <option value="above_standard">Above standard</option>
            <option value="below_standard">Below standard</option>
            <option value="no_standard">No standard cost</option>
            <option value="no_received">No received cost</option>
          </select>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleExportProductsCsv}
            disabled={products.length === 0}
          >
            Export Products CSV
          </button>
        </div>

        {productsQuery.isLoading ? <p>Loading products...</p> : null}

        {productsQuery.isError ? (
          <p>Failed to load products: {(productsQuery.error as Error).message || 'Unknown error'}</p>
        ) : null}

        {!productsQuery.isLoading && !productsQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Min Stock</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Default Barcode</th>
                  <th style={styles.th}>Costing</th>
                  <th style={styles.th}>Est. Value</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Version</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={11}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{product.name}</div>
                        <div style={styles.rowSubtle}>Product ID: {product.id}</div>
                      </td>
                      <td style={styles.td}>{product.category || '-'}</td>
                      <td style={styles.td}>{product.unit}</td>
                      <td style={styles.td}>{String(product.min_stock)}</td>
                      <td style={styles.td}>{product.supplier_name || 'Not linked'}</td>
                      <td style={styles.td}>
                        {product.barcode ? (
                          <span style={styles.barcodeValue}>{product.barcode}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>
                        {product.effective_unit_cost !== null && product.effective_unit_cost !== undefined ? (
                          <div>
                            <div style={styles.rowTitle}>{formatMoney(product.effective_unit_cost)}</div>
                            <div style={styles.rowSubtle}>
                              Source: {product.effective_cost_source === 'product_standard' ? 'standard cost' : product.effective_cost_source || 'movement'}
                            </div>
                            <div style={styles.rowSubtle}>
                              Effective at: {formatDateTime(product.effective_cost_at)}
                            </div>
                            {product.latest_unit_cost !== null && product.latest_unit_cost !== undefined ? (
                              <div style={styles.rowSubtle}>Movement cost: {formatMoney(product.latest_unit_cost)}</div>
                            ) : product.standard_unit_cost !== null && product.standard_unit_cost !== undefined ? (
                              <div style={styles.rowSubtle}>Fallback standard cost</div>
                            ) : null}
                            <div style={styles.rowSubtle}>
                              Standard variance: {formatCostVarianceStatus(product.cost_variance_status)}
                            </div>
                            {product.cost_variance_amount !== null && product.cost_variance_amount !== undefined ? (
                              <div style={styles.rowSubtle}>
                                Δ {formatMoney(product.cost_variance_amount)} ({formatPercent(product.cost_variance_percent)})
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span style={styles.rowSubtle}>No cost configured</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{formatMoney(product.estimated_inventory_value)}</div>
                        <div style={styles.rowSubtle}>
                          Stock: {String(product.current_stock_quantity ?? 0)} {product.unit}
                        </div>
                      </td>
                      <td style={styles.td}>{formatDateTime(product.created_at)}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeVersion}>v{product.version}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => handleOpenCostHistory(product)}
                          >
                            Cost History
                          </button>

                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => handleOpenPackages(product)}
                          >
                            Packages
                          </button>

                          <button
                            type="button"
                            style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                            onClick={() => handleStartEdit(product)}
                            disabled={!canManageProducts}
                            title={!canManageProducts ? 'Manager or admin role required' : undefined}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                            onClick={() => handleDelete(product)}
                            disabled={deleteMutation.isPending || !canManageProducts}
                            title={!canManageProducts ? 'Manager or admin role required' : undefined}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  costReadinessGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
    marginBottom: '16px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e'
  },
  statValueBad: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#b91c1c'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#6b7280',
    lineHeight: 1.5
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 700
  },
  packageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: '10px'
  },
  actionRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  packageTableBlock: {
    marginTop: '18px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    alignItems: 'end'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  checkboxLabel: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    minHeight: '44px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none'
  },
  formActions: {
    display: 'flex',
    alignItems: 'end',
    gap: '10px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  disabledButton: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#e5e7eb',
    color: '#6b7280',
    cursor: 'not-allowed'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 600,
    cursor: 'pointer'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#fef2f2',
    color: '#b91c1c',
    fontWeight: 600,
    cursor: 'pointer'
  },
  toolbarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '14px',
    background: '#ffffff'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  riskGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '14px',
    marginTop: '14px'
  },
  riskCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px'
  },
  riskList: {
    display: 'grid',
    gap: '10px'
  },
  riskListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    padding: '10px 0',
    borderTop: '1px solid #f3f4f6'
  },
  tableWrapperCompact: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  compactTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '760px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1160px'
  },
  packageTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '860px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-all'
  },
  fieldHint: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  barcodeValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
    wordBreak: 'break-all'
  },
  badgeVersion: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '12px'
  },
  defaultBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  errorBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c'
  },
  warningBox: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412'
  },
  successBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  }
};