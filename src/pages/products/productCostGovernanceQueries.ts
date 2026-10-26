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
  // FT184: these are the two primary operator-facing summaries. Load them before
  // starting recursive governance/audit compositions that re-read the same costs.
  // Manual Refresh, tenant isolation and mutation invalidation remain unchanged.
  const costHardeningQuery = useQuery({
    queryKey: ['product-cost-hardening-summary'],
    queryFn: fetchProductCostHardeningSummary,
    enabled,
    staleTime: 15_000
  });
  const costReportQuery = useQuery({
    queryKey: ['product-cost-report-summary'],
    queryFn: fetchProductCostReportSummary,
    enabled,
    staleTime: 15_000
  });
  // On success OR failure, allow independent governance panels to proceed.
  const supportingEnabled = enabled && !costHardeningQuery.isPending && !costReportQuery.isPending;
  // Keep the hidden FT183 derived reports in source but do not request them
  // automatically when no matching panel is mounted.
  const hiddenDerivedEnabled = false;
  const costGovernanceQuery = useQuery({
    queryKey: ['product-cost-governance-summary'],
    queryFn: fetchProductCostGovernanceSummary,
    enabled: supportingEnabled
  });

  const costGovernanceDetailsQuery = useQuery({
    queryKey: ['product-cost-governance-details'],
    queryFn: fetchProductCostGovernanceDetails,
    enabled: supportingEnabled
  });

  const costGovernanceAuditQuery = useQuery({
    queryKey: ['product-cost-governance-audit-pack'],
    queryFn: fetchProductCostGovernanceAuditPack,
    enabled: supportingEnabled
  });

  const costGovernanceSignoffQuery = useQuery({
    queryKey: ['product-cost-governance-signoff-summary'],
    queryFn: fetchProductCostGovernanceSignoffSummary,
    enabled: supportingEnabled
  });

  const costGovernanceReviewQueueQuery = useQuery({
    queryKey: ['product-cost-governance-review-queue'],
    queryFn: fetchProductCostGovernanceReviewQueue,
    enabled: supportingEnabled
  });

  const costGovernanceReviewPackQuery = useQuery({
    queryKey: ['product-cost-governance-review-pack'],
    queryFn: fetchProductCostGovernanceReviewPack,
    enabled: supportingEnabled
  });

  const costGovernanceClosureQuery = useQuery({
    queryKey: ['product-cost-governance-closure-summary'],
    queryFn: fetchProductCostGovernanceClosureSummary,
    enabled: supportingEnabled
  });

  const costGovernanceHandoffQuery = useQuery({
    queryKey: ['product-cost-governance-handoff-summary'],
    queryFn: fetchProductCostGovernanceHandoffSummary,
    enabled: supportingEnabled
  });

  const costOperationsRunbookQuery = useQuery({
    queryKey: ['product-cost-operations-runbook-summary'],
    queryFn: fetchProductCostOperationsRunbookSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  const costOperationsControlQuery = useQuery({
    queryKey: ['product-cost-operations-control-summary'],
    queryFn: fetchProductCostOperationsControlSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  const costOperationsEvidenceQuery = useQuery({
    queryKey: ['product-cost-operations-evidence-summary'],
    queryFn: fetchProductCostOperationsEvidenceSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  const costOperationsReadinessQuery = useQuery({
    queryKey: ['product-cost-operations-readiness-summary'],
    queryFn: fetchProductCostOperationsReadinessSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  const costGovernanceFinalQuery = useQuery({
    queryKey: ['product-cost-governance-final-summary'],
    queryFn: fetchProductCostGovernanceFinalSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  const costPerformanceQuery = useQuery({
    queryKey: ['product-cost-performance-summary'],
    queryFn: fetchProductCostPerformanceSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  const costSecurityAuditQuery = useQuery({
    queryKey: ['product-cost-security-audit-summary'],
    queryFn: fetchProductCostSecurityAuditSummary,
    // Original `enabled` is retained below for reversal if the panel is restored.
    // enabled,
    enabled: hiddenDerivedEnabled
  });

  /* FT184: original eager versions preserved for reference.
  const costHardeningQuery = useQuery({ queryKey: ['product-cost-hardening-summary'], queryFn: fetchProductCostHardeningSummary, enabled });
  const costReportQuery = useQuery({ queryKey: ['product-cost-report-summary'], queryFn: fetchProductCostReportSummary, enabled });
  */

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
