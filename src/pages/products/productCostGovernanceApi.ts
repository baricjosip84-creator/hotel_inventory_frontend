import { apiRequest } from '../../lib/api';
import type {
  ProductCostGovernanceSummaryResponse,
  ProductCostGovernanceDetailsResponse,
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceClosureSummaryResponse,
  ProductCostGovernanceHandoffSummaryResponse,
  ProductCostGovernanceFinalSummaryResponse,
  ProductCostPerformanceSummaryResponse,
  ProductCostSecurityAuditSummaryResponse,
  ProductCostGovernanceSignoffSummaryResponse,
  ProductCostGovernanceReviewQueueResponse,
  ProductCostGovernanceReviewPackResponse,
  ProductCostHardeningSummaryResponse,
  ProductCostOperationsRunbookSummaryResponse,
  ProductCostOperationsControlSummaryResponse,
  ProductCostOperationsEvidenceSummaryResponse,
  ProductCostOperationsReadinessSummaryResponse,
  ProductCostReportSummaryResponse
} from '../../types/inventory';

export async function fetchProductCostGovernanceSummary(): Promise<ProductCostGovernanceSummaryResponse> {
  return apiRequest<ProductCostGovernanceSummaryResponse>(
    '/products/cost-governance-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostGovernanceDetails(): Promise<ProductCostGovernanceDetailsResponse> {
  return apiRequest<ProductCostGovernanceDetailsResponse>(
    '/products/cost-governance-details?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostGovernanceAuditPack(): Promise<ProductCostGovernanceAuditPackResponse> {
  return apiRequest<ProductCostGovernanceAuditPackResponse>(
    '/products/cost-governance-audit-pack?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostGovernanceSignoffSummary(): Promise<ProductCostGovernanceSignoffSummaryResponse> {
  return apiRequest<ProductCostGovernanceSignoffSummaryResponse>(
    '/products/cost-governance-signoff-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostGovernanceReviewQueue(): Promise<ProductCostGovernanceReviewQueueResponse> {
  return apiRequest<ProductCostGovernanceReviewQueueResponse>(
    '/products/cost-governance-review-queue?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostGovernanceReviewPack(): Promise<ProductCostGovernanceReviewPackResponse> {
  return apiRequest<ProductCostGovernanceReviewPackResponse>(
    '/products/cost-governance-review-pack?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostGovernanceClosureSummary(): Promise<ProductCostGovernanceClosureSummaryResponse> {
  return apiRequest<ProductCostGovernanceClosureSummaryResponse>(
    '/products/cost-governance-closure-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostGovernanceHandoffSummary(): Promise<ProductCostGovernanceHandoffSummaryResponse> {
  return apiRequest<ProductCostGovernanceHandoffSummaryResponse>(
    '/products/cost-governance-handoff-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostOperationsRunbookSummary(): Promise<ProductCostOperationsRunbookSummaryResponse> {
  return apiRequest<ProductCostOperationsRunbookSummaryResponse>(
    '/products/cost-operations-runbook-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostOperationsControlSummary(): Promise<ProductCostOperationsControlSummaryResponse> {
  return apiRequest<ProductCostOperationsControlSummaryResponse>(
    '/products/cost-operations-control-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}



export async function fetchProductCostOperationsEvidenceSummary(): Promise<ProductCostOperationsEvidenceSummaryResponse> {
  return apiRequest<ProductCostOperationsEvidenceSummaryResponse>(
    '/products/cost-operations-evidence-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostOperationsReadinessSummary(): Promise<ProductCostOperationsReadinessSummaryResponse> {
  return apiRequest<ProductCostOperationsReadinessSummaryResponse>(
    '/products/cost-operations-readiness-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostGovernanceFinalSummary(): Promise<ProductCostGovernanceFinalSummaryResponse> {
  return apiRequest<ProductCostGovernanceFinalSummaryResponse>(
    '/products/cost-governance-final-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostPerformanceSummary(): Promise<ProductCostPerformanceSummaryResponse> {
  return apiRequest<ProductCostPerformanceSummaryResponse>(
    '/products/cost-performance-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostSecurityAuditSummary(): Promise<ProductCostSecurityAuditSummaryResponse> {
  return apiRequest<ProductCostSecurityAuditSummaryResponse>(
    '/products/cost-security-audit-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

export async function fetchProductCostHardeningSummary(): Promise<ProductCostHardeningSummaryResponse> {
  return apiRequest<ProductCostHardeningSummaryResponse>(
    '/products/cost-hardening-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&limit=8'
  );
}

export async function fetchProductCostReportSummary(): Promise<ProductCostReportSummaryResponse> {
  return apiRequest<ProductCostReportSummaryResponse>(
    '/products/cost-report-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}

