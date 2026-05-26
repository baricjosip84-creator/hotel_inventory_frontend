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

export function useProductCostGovernanceQueries() {
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
