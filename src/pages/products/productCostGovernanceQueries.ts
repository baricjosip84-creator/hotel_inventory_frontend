import { useQuery } from '@tanstack/react-query';
import {
  fetchProductCostGovernanceSummary,
  fetchProductCostGovernanceDetails,
  fetchProductCostGovernanceAuditPack,
  fetchProductCostGovernanceSignoffSummary,
  fetchProductCostGovernanceReviewQueue,
  fetchProductCostGovernanceReviewPack,
  fetchProductCostGovernanceClosureSummary,
  fetchProductCostGovernanceHandoffSummary,
  fetchProductCostOperationsRunbookSummary,
  fetchProductCostOperationsControlSummary,
  fetchProductCostOperationsEvidenceSummary,
  fetchProductCostOperationsReadinessSummary,
  fetchProductCostGovernanceFinalSummary,
  fetchProductCostPerformanceSummary,
  fetchProductCostSecurityAuditSummary,
  fetchProductCostHardeningSummary,
  fetchProductCostReportSummary
} from './productCostGovernanceApi';

export function useProductCostGovernanceQueries(enabled = true) {
  const costGovernanceQuery = useQuery({
    queryKey: ['product-cost-governance-summary'],
    queryFn: fetchProductCostGovernanceSummary,
    enabled
  });

  const costGovernanceDetailsQuery = useQuery({
    queryKey: ['product-cost-governance-details'],
    queryFn: fetchProductCostGovernanceDetails,
    enabled
  });

  const costGovernanceAuditQuery = useQuery({
    queryKey: ['product-cost-governance-audit-pack'],
    queryFn: fetchProductCostGovernanceAuditPack,
    enabled
  });

  const costGovernanceSignoffQuery = useQuery({
    queryKey: ['product-cost-governance-signoff-summary'],
    queryFn: fetchProductCostGovernanceSignoffSummary,
    enabled
  });

  const costGovernanceReviewQueueQuery = useQuery({
    queryKey: ['product-cost-governance-review-queue'],
    queryFn: fetchProductCostGovernanceReviewQueue,
    enabled
  });

  const costGovernanceReviewPackQuery = useQuery({
    queryKey: ['product-cost-governance-review-pack'],
    queryFn: fetchProductCostGovernanceReviewPack,
    enabled
  });

  const costGovernanceClosureQuery = useQuery({
    queryKey: ['product-cost-governance-closure-summary'],
    queryFn: fetchProductCostGovernanceClosureSummary,
    enabled
  });

  const costGovernanceHandoffQuery = useQuery({
    queryKey: ['product-cost-governance-handoff-summary'],
    queryFn: fetchProductCostGovernanceHandoffSummary,
    enabled
  });

  const costOperationsRunbookQuery = useQuery({
    queryKey: ['product-cost-operations-runbook-summary'],
    queryFn: fetchProductCostOperationsRunbookSummary,
    enabled
  });

  const costOperationsControlQuery = useQuery({
    queryKey: ['product-cost-operations-control-summary'],
    queryFn: fetchProductCostOperationsControlSummary,
    enabled
  });

  const costOperationsEvidenceQuery = useQuery({
    queryKey: ['product-cost-operations-evidence-summary'],
    queryFn: fetchProductCostOperationsEvidenceSummary,
    enabled
  });

  const costOperationsReadinessQuery = useQuery({
    queryKey: ['product-cost-operations-readiness-summary'],
    queryFn: fetchProductCostOperationsReadinessSummary,
    enabled
  });

  const costGovernanceFinalQuery = useQuery({
    queryKey: ['product-cost-governance-final-summary'],
    queryFn: fetchProductCostGovernanceFinalSummary,
    enabled
  });

  const costPerformanceQuery = useQuery({
    queryKey: ['product-cost-performance-summary'],
    queryFn: fetchProductCostPerformanceSummary,
    enabled
  });

  const costSecurityAuditQuery = useQuery({
    queryKey: ['product-cost-security-audit-summary'],
    queryFn: fetchProductCostSecurityAuditSummary,
    enabled
  });

  const costHardeningQuery = useQuery({
    queryKey: ['product-cost-hardening-summary'],
    queryFn: fetchProductCostHardeningSummary,
    enabled
  });

  const costReportQuery = useQuery({
    queryKey: ['product-cost-report-summary'],
    queryFn: fetchProductCostReportSummary,
    enabled
  });

  return {
    costGovernanceQuery,
    costGovernanceDetailsQuery,
    costGovernanceAuditQuery,
    costGovernanceSignoffQuery,
    costGovernanceReviewQueueQuery,
    costGovernanceReviewPackQuery,
    costGovernanceClosureQuery,
    costGovernanceHandoffQuery,
    costOperationsRunbookQuery,
    costOperationsControlQuery,
    costOperationsEvidenceQuery,
    costOperationsReadinessQuery,
    costGovernanceFinalQuery,
    costPerformanceQuery,
    costSecurityAuditQuery,
    costHardeningQuery,
    costReportQuery
  };
}
