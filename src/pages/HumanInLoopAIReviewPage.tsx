import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type AIOperationDomain = 'decision_intelligence' | 'ai_governance' | 'remediation' | 'simulation' | 'optimization' | 'multi_domain';
type ReviewState = 'pending_review' | 'approval_required' | 'escalated' | 'ready_for_human_decision';
type Urgency = 'critical' | 'high' | 'medium' | 'low';


type IntelligenceProductionBacklogItem = {
  feature_key?: string;
  feature_label?: string;
  production_priority?: string;
  production_status?: string;
  readiness_score?: number;
  gap?: string;
  sequence?: number;
};

type IntelligenceProductionAuditPack = {
  certification_status?: string;
  certification_scope?: string;
  audit_totals?: {
    tracked_features?: number;
    expected_evidence_tables?: number;
    existing_evidence_tables?: number;
    tenant_scoped_evidence_tables?: number;
    missing_evidence_tables?: number;
    tenant_evidence_rows?: number;
    critical_or_high_blockers?: number;
    features_without_tenant_data?: number;
  };
  coverage?: {
    evidence_table_coverage_percent?: number;
    tenant_scoped_table_coverage_percent?: number;
    tenant_data_feature_coverage_percent?: number;
  };
  blockers?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    blocker_reason?: string;
  }>;
  missing_evidence_tables?: string[];
  registry_integrity?: {
    all_registered_features_have_endpoint?: boolean;
    all_registered_features_have_frontend_surface?: boolean;
    features_without_frontend_surface?: string[];
    features_without_endpoint?: string[];
  };
};





type IntelligenceProductionReleaseDecisionBoardResponse = {
  generated_at?: string;
  scope?: string;
  release_decision_board?: {
    board_status?: string;
    board_scope?: string;
    release_decision_inputs?: {
      certification_status?: string;
      checklist_status?: string;
      matrix_status?: string;
      hardening_plan_status?: string;
      blocker_count?: number;
      watch_item_count?: number;
      critical_high_hardening_item_count?: number;
    };
    decision_summary?: {
      recommendation?: string;
      production_allowed_without_waiver?: boolean;
      governance_waiver_required?: boolean;
      final_test_required?: boolean;
      non_mutation_attestation?: Record<string, boolean>;
    };
    release_blockers?: Array<{
      blocker_type?: string;
      feature_key?: string;
      feature_label?: string;
      severity?: string;
      detail?: string;
      required_resolution?: string;
    }>;
    critical_high_hardening_items?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      gap?: string;
      workstream?: string;
    }>;
    watch_items?: Array<{
      key?: string;
      label?: string;
      feature_key?: string;
      feature_label?: string;
      verification?: string;
    }>;
    required_final_test_evidence?: string[];
  };
};

type IntelligenceProductionEvidenceMatrixResponse = {
  generated_at?: string;
  scope?: string;
  evidence_matrix?: {
    matrix_status?: string;
    matrix_scope?: string;
    totals?: {
      total_rows?: number;
      existing_tables?: number;
      tenant_scoped_tables?: number;
      tables_with_tenant_rows?: number;
      missing_schema?: number;
      global_unscoped_review_required?: number;
      no_tenant_rows?: number;
      required_gaps?: number;
    };
    by_risk?: Record<string, number>;
    required_gaps?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      table_name?: string;
      table_exists?: boolean;
      tenant_scoped?: boolean;
      row_count?: number;
      evidence_scope?: string;
      evidence_risk?: string;
      required_before_production?: boolean;
    }>;
    rows?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      table_name?: string;
      table_exists?: boolean;
      tenant_scoped?: boolean;
      row_count?: number;
      evidence_scope?: string;
      evidence_risk?: string;
      required_before_production?: boolean;
    }>;
  };
};

type IntelligenceProductionSignoffChecklistResponse = {
  generated_at?: string;
  scope?: string;
  signoff_checklist?: {
    checklist_status?: string;
    release_rule?: string;
    totals?: {
      feature_count?: number;
      item_count?: number;
      pass_count?: number;
      watch_count?: number;
      fail_count?: number;
      blocked_feature_count?: number;
      watch_feature_count?: number;
      ready_feature_count?: number;
    };
    feature_checklists?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      signoff_status?: string;
      failed_item_count?: number;
      watch_item_count?: number;
      items?: Array<{
        key?: string;
        label?: string;
        required_for_production?: boolean;
        verification?: string;
        status?: string;
        feature_key?: string;
        feature_label?: string;
      }>;
    }>;
    failed_items?: Array<{
      key?: string;
      label?: string;
      status?: string;
      feature_key?: string;
      feature_label?: string;
      verification?: string;
    }>;
    watch_items?: Array<{
      key?: string;
      label?: string;
      status?: string;
      feature_key?: string;
      feature_label?: string;
      verification?: string;
    }>;
  };
};

type IntelligenceHardeningPlanResponse = {
  generated_at?: string;
  scope?: string;
  hardening_plan?: {
    plan_status?: string;
    total_backlog_items?: number;
    scheduled_items?: number;
    unscheduled_items?: number;
    workstream_counts?: Record<string, number>;
    release_gate?: {
      current_status?: string;
      required_before_production?: string[];
    };
    phases?: Array<{
      phase?: number;
      key?: string;
      label?: string;
      description?: string;
      item_count?: number;
      items?: Array<{
        feature_key?: string;
        feature_label?: string;
        production_priority?: string;
        production_status?: string;
        readiness_score?: number;
        gap?: string;
        sequence?: number;
        workstream?: string;
        acceptance_criteria?: Array<{
          key?: string;
          label?: string;
          required?: boolean;
          verification?: string;
        }>;
      }>;
    }>;
  };
};

type IntelligenceProductionFeature = {
  key: string;
  label: string;
  category: string;
  maturity: string;
  production_priority: string;
  production_status: string;
  readiness_score?: number;
  completion_band?: string;
  endpoints?: string[];
  frontend_surfaces?: string[];
  implemented_capabilities?: string[];
  completion_gaps?: string[];
  evidence?: {
    existing_table_count?: number;
    expected_table_count?: number;
    tenant_data_rows?: number;
    evidence_state?: string;
  };
};

type IntelligenceProductionReadinessResponse = {
  generated_at?: string;
  scope?: string;
  safety_contract?: Record<string, boolean>;
  summary?: {
    total_features?: number;
    production_candidates?: number;
    not_production_ready?: number;
    tenant_data_backed_features?: number;
    average_readiness_score?: number;
    by_status?: Record<string, number>;
    by_priority?: Record<string, number>;
  };
  next_steps?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_status?: string;
    next_actions?: string[];
  }>;
  production_backlog?: IntelligenceProductionBacklogItem[];
  audit_pack?: IntelligenceProductionAuditPack;
  features?: IntelligenceProductionFeature[];
};

type IntelligenceProductionFeatureDetailResponse = {
  generated_at?: string;
  scope?: string;
  operator_summary?: {
    headline?: string;
    production_meaning?: string;
    evidence_meaning?: string;
    next_required_completion?: string;
    safety_position?: string;
  };
  evidence_summary?: {
    evidence_state?: string;
    tenant_data_rows?: number;
    expected_table_count?: number;
    existing_table_count?: number;
    tenant_scoped_table_count?: number;
    missing_tables?: string[];
    global_unscoped_tables?: string[];
    tenant_scoped_tables?: string[];
  };
  feature?: IntelligenceProductionFeature & {
    evidence?: IntelligenceProductionFeature['evidence'] & {
      tables?: Array<{
        table_name?: string;
        table_exists?: boolean;
        tenant_scoped?: boolean;
        row_count?: number;
        evidence_scope?: string;
      }>;
    };
  };
  hardening_items?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    gap?: string;
    sequence?: number;
    workstream?: string;
    acceptance_criteria?: Array<{
      key?: string;
      label?: string;
      required?: boolean;
      verification?: string;
    }>;
  }>;
};


type IntelligenceProductionRemediationWorkbenchResponse = {
  generated_at?: string;
  scope?: string;
  remediation_workbench?: {
    workbench_status?: string;
    workbench_scope?: string;
    totals?: {
      open_actions?: number;
      critical_actions?: number;
      high_actions?: number;
      medium_actions?: number;
      actions_with_evidence_gaps?: number;
    };
    workstream_summary?: Record<string, number>;
    next_actions?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      sequence?: number;
      gap?: string;
      workstream?: string;
      target_endpoints?: string[];
      target_frontend_surfaces?: string[];
      evidence_gaps?: Array<{
        table_name?: string;
        table_exists?: boolean;
        tenant_scoped?: boolean;
        row_count?: number;
        evidence_risk?: string;
      }>;
      safe_completion_rule?: string;
      suggested_validation?: string[];
      acceptance_criteria?: Array<{
        key?: string;
        label?: string;
        required?: boolean;
        verification?: string;
      }>;
    }>;
    actions?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      sequence?: number;
      gap?: string;
      workstream?: string;
      target_endpoints?: string[];
      target_frontend_surfaces?: string[];
      evidence_gaps?: Array<{
        table_name?: string;
        table_exists?: boolean;
        tenant_scoped?: boolean;
        row_count?: number;
        evidence_risk?: string;
      }>;
      safe_completion_rule?: string;
      suggested_validation?: string[];
      acceptance_criteria?: Array<{
        key?: string;
        label?: string;
        required?: boolean;
        verification?: string;
      }>;
    }>;
  };
};


type IntelligenceProductionOperationalRunbookResponse = {
  generated_at?: string;
  scope?: string;
  operational_runbook?: {
    runbook_status?: string;
    runbook_scope?: string;
    operator_warning?: string;
    release_decision?: {
      recommendation?: string;
      production_allowed_without_waiver?: boolean;
      governance_waiver_required?: boolean;
      final_test_required?: boolean;
    };
    daily_operator_sequence?: string[];
    emergency_stop_conditions?: string[];
    final_validation_sequence?: string[];
    next_operator_actions?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      runbook_status?: string;
      operator_sequence?: string[];
      required_evidence_gaps?: Array<{
        table_name?: string;
        evidence_risk?: string;
        row_count?: number;
      }>;
      signoff_status?: string;
      failed_signoff_item_count?: number;
      watch_signoff_item_count?: number;
    }>;
    feature_runbook?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      runbook_status?: string;
      operator_sequence?: string[];
      required_evidence_gaps?: Array<{
        table_name?: string;
        evidence_risk?: string;
        row_count?: number;
      }>;
      signoff_status?: string;
      failed_signoff_item_count?: number;
      watch_signoff_item_count?: number;
    }>;
  };
};


type IntelligenceProductionValidationSuiteResponse = {
  generated_at?: string;
  scope?: string;
  validation_suite?: {
    validation_status?: string;
    validation_scope?: string;
    safety_rule?: string;
    totals?: {
      validation_case_count?: number;
      ready_case_count?: number;
      blocked_case_count?: number;
      tenant_isolation_review_case_count?: number;
      critical_high_blocked_case_count?: number;
    };
    required_global_assertions?: string[];
    suggested_validation_commands?: string[];
    blocked_cases?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      validation_status?: string;
      required_assertions?: string[];
      evidence_preconditions?: {
        missing_tables?: string[];
        unscoped_tables?: string[];
        empty_tenant_tables?: string[];
      };
    }>;
    tenant_isolation_review_cases?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      validation_status?: string;
      evidence_preconditions?: {
        unscoped_tables?: string[];
      };
    }>;
    ready_cases?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      validation_status?: string;
    }>;
    validation_cases?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      validation_criticality?: string;
      validation_status?: string;
      required_assertions?: string[];
      backend_endpoint_targets?: string[];
      frontend_surface_targets?: string[];
      recommended_test_files?: string[];
      manual_validation_steps?: string[];
    }>;
  };
};



type IntelligenceProductionMonitoringContractResponse = {
  generated_at?: string;
  scope?: string;
  monitoring_contract?: {
    contract_status?: string;
    contract_scope?: string;
    safety_rule?: string;
    totals?: {
      monitored_feature_count?: number;
      monitor_after_controlled_enablement?: number;
      monitor_blockers_before_enablement?: number;
      monitor_hardening_progress?: number;
      critical_high_monitors?: number;
      total_release_blockers?: number;
      total_required_evidence_gaps?: number;
    };
    global_monitoring_checks?: string[];
    escalation_rules?: string[];
    blocked_features?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_criticality?: string;
      production_status?: string;
      readiness_score?: number;
      monitoring_state?: string;
      tenant_evidence_rows?: number;
      release_blocker_count?: number;
      required_evidence_gap_count?: number;
      validation_status?: string;
      enablement_state?: string;
      monitoring_cadence?: string;
      operator_response?: string;
      alert_conditions?: string[];
      rollback_conditions?: string[];
    }>;
    controlled_enablement_features?: Array<{
      feature_key?: string;
      feature_label?: string;
      monitoring_state?: string;
      monitoring_cadence?: string;
      tenant_evidence_rows?: number;
      operator_response?: string;
    }>;
    hardening_features?: Array<{
      feature_key?: string;
      feature_label?: string;
      monitoring_state?: string;
      monitoring_cadence?: string;
      operator_response?: string;
    }>;
  };
};

type IntelligenceProductionEnablementManifestResponse = {
  generated_at?: string;
  scope?: string;
  enablement_manifest?: {
    manifest_status?: string;
    manifest_scope?: string;
    release_recommendation?: string;
    global_enablement_rule?: string;
    totals?: {
      feature_count?: number;
      eligible_for_controlled_enablement?: number;
      blocked_or_requires_governance_waiver?: number;
      not_enabled_pending_hardening?: number;
      critical_high_blocker_count?: number;
      required_evidence_gap_count?: number;
      failed_signoff_count?: number;
      blocked_validation_case_count?: number;
    };
    enablement_sequence?: string[];
    blocked_features?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      enablement_state?: string;
      production_enabled?: boolean;
      operator_enablement_note?: string;
      release_blocker_count?: number;
      required_evidence_gap_count?: number;
      signoff_status?: string;
      validation_status?: string;
    }>;
    eligible_features?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      enablement_state?: string;
      production_enabled?: boolean;
      operator_enablement_note?: string;
    }>;
    pending_features?: Array<{
      feature_key?: string;
      feature_label?: string;
      production_priority?: string;
      enablement_state?: string;
      production_enabled?: boolean;
      operator_enablement_note?: string;
    }>;
    features?: Array<{
      feature_key?: string;
      feature_label?: string;
      category?: string;
      production_priority?: string;
      production_status?: string;
      readiness_score?: number;
      enablement_state?: string;
      production_enabled?: boolean;
      governance_required?: boolean;
      final_test_required?: boolean;
      tenant_evidence_rows?: number;
      required_evidence_gap_count?: number;
      release_blocker_count?: number;
      signoff_status?: string;
      validation_status?: string;
      operator_enablement_note?: string;
      allowed_operator_actions?: string[];
      prohibited_operator_actions?: string[];
    }>;
  };
};

type HumanAIReview = {
  review_id: string;
  source_action_id?: string;
  ai_operation_domain?: string;
  review_state?: string;
  urgency?: string;
  title?: string;
  summary?: string | null;
  confidence_visualization?: {
    confidence_score?: number;
    confidence_band?: string;
    visualization_type?: string;
    advisory_only?: boolean;
  };
  explainability_review?: {
    primary_factors?: string[];
    source_surface?: string;
    reasoning_visible_to_human?: boolean;
    human_action_only?: boolean;
  };
  simulation_preview?: {
    preview_available?: boolean;
    preview_execution_mode?: string;
    mutation_allowed_from_preview?: boolean;
  };
  override_capture_guidance?: {
    override_reason_required?: boolean;
    suggested_reason_categories?: string[];
    capture_only_in_source_governance_flow?: boolean;
  };
  governance_approval_guidance?: {
    approval_required?: boolean;
    approval_route?: string;
    endpoint_executes_approval?: boolean;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type HumanAIReviewResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundations?: string[];
    supported_ai_operation_domains?: string[];
    supported_review_states?: string[];
    human_in_loop_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    ai_operation_domain?: string | null;
    review_state?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: {
    total_reviews?: number;
    approval_required_reviews?: number;
    escalated_reviews?: number;
    by_domain?: Record<string, number>;
    by_review_state?: Record<string, number>;
    by_urgency?: Record<string, number>;
  };
  guidance?: {
    next_review_id?: string | null;
    next_source_action_id?: string | null;
    next_review_state?: string | null;
    review_queue_guidance?: string;
    confidence_guidance?: string;
    override_guidance?: string;
    approval_guidance?: string;
    safety_contract?: Record<string, boolean>;
  };
  reviews?: HumanAIReview[];
  source_workspace_summary?: Record<string, unknown>;
  source_action_center_summary?: Record<string, unknown>;
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const DOMAIN_FILTERS: Array<{ value: 'all' | AIOperationDomain; label: string }> = [
  { value: 'all', label: 'All AI domains' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'remediation', label: 'Remediation' },
  { value: 'simulation', label: 'Simulation' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const REVIEW_STATE_FILTERS: Array<{ value: 'all' | ReviewState; label: string }> = [
  { value: 'all', label: 'All review states' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approval_required', label: 'Approval required' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'ready_for_human_decision', label: 'Ready for human decision' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16
};

const selectStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'white',
  minWidth: 190
};

const reviewListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: 14
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatPercent(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not scored';
  }

  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/action-center',
    '/workspace',
    '/workflow-composer',
    '/system-context',
    '/insights',
    '/procurement-recommendations',
    '/execution-tasks',
    '/automation-schedules',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}


async function fetchIntelligenceProductionReadiness(): Promise<IntelligenceProductionReadinessResponse> {
  return apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary');
}

async function fetchIntelligenceHardeningPlan(): Promise<IntelligenceHardeningPlanResponse> {
  return apiRequest<IntelligenceHardeningPlanResponse>('/intelligence-readiness/production-hardening-plan');
}


async function fetchIntelligenceReleaseDecisionBoard(): Promise<IntelligenceProductionReleaseDecisionBoardResponse> {
  return apiRequest<IntelligenceProductionReleaseDecisionBoardResponse>('/intelligence-readiness/production-release-decision-board');
}

async function fetchIntelligenceOperationalRunbook(): Promise<IntelligenceProductionOperationalRunbookResponse> {
  return apiRequest<IntelligenceProductionOperationalRunbookResponse>('/intelligence-readiness/production-operational-runbook');
}


async function fetchIntelligenceValidationSuite(): Promise<IntelligenceProductionValidationSuiteResponse> {
  return apiRequest<IntelligenceProductionValidationSuiteResponse>('/intelligence-readiness/production-validation-suite');
}


async function fetchIntelligenceMonitoringContract(): Promise<IntelligenceProductionMonitoringContractResponse> {
  return apiRequest<IntelligenceProductionMonitoringContractResponse>('/intelligence-readiness/production-monitoring-contract');
}

async function fetchIntelligenceEnablementManifest(): Promise<IntelligenceProductionEnablementManifestResponse> {
  return apiRequest<IntelligenceProductionEnablementManifestResponse>('/intelligence-readiness/production-enablement-manifest');
}

async function fetchIntelligenceRemediationWorkbench(): Promise<IntelligenceProductionRemediationWorkbenchResponse> {
  return apiRequest<IntelligenceProductionRemediationWorkbenchResponse>('/intelligence-readiness/production-remediation-workbench');
}

async function fetchIntelligenceSignoffChecklist(): Promise<IntelligenceProductionSignoffChecklistResponse> {
  return apiRequest<IntelligenceProductionSignoffChecklistResponse>('/intelligence-readiness/production-signoff-checklist');
}

async function fetchIntelligenceEvidenceMatrix(): Promise<IntelligenceProductionEvidenceMatrixResponse> {
  return apiRequest<IntelligenceProductionEvidenceMatrixResponse>('/intelligence-readiness/production-evidence-matrix');
}

async function fetchIntelligenceFeatureDetail(featureKey: string): Promise<IntelligenceProductionFeatureDetailResponse> {
  return apiRequest<IntelligenceProductionFeatureDetailResponse>(`/intelligence-readiness/production-readiness-summary/${encodeURIComponent(featureKey)}`);
}

async function fetchHumanAIReviewSummary(
  aiOperationDomain: 'all' | AIOperationDomain,
  reviewState: 'all' | ReviewState,
  urgency: 'all' | Urgency
): Promise<HumanAIReviewResponse> {
  const params = new URLSearchParams({ limit: '75' });

  if (aiOperationDomain !== 'all') {
    params.set('ai_operation_domain', aiOperationDomain);
  }

  if (reviewState !== 'all') {
    params.set('review_state', reviewState);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<HumanAIReviewResponse>(`/operational-action-center/human-in-loop-ai-operations-summary?${params.toString()}`);
}

export default function HumanInLoopAIReviewPage() {
  const [aiOperationDomain, setAiOperationDomain] = useState<'all' | AIOperationDomain>('all');
  const [reviewState, setReviewState] = useState<'all' | ReviewState>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');
  const [selectedReadinessFeatureKey, setSelectedReadinessFeatureKey] = useState<string>('reorder_recommendations');

  const reviewQuery = useQuery({
    queryKey: ['human-in-loop-ai-review', aiOperationDomain, reviewState, urgency],
    queryFn: () => fetchHumanAIReviewSummary(aiOperationDomain, reviewState, urgency)
  });

  const readinessQuery = useQuery({
    queryKey: ['intelligence-production-readiness-summary'],
    queryFn: fetchIntelligenceProductionReadiness
  });

  const hardeningPlanQuery = useQuery({
    queryKey: ['intelligence-production-hardening-plan'],
    queryFn: fetchIntelligenceHardeningPlan
  });

  const signoffChecklistQuery = useQuery({
    queryKey: ['intelligence-production-signoff-checklist'],
    queryFn: fetchIntelligenceSignoffChecklist
  });


  const releaseDecisionBoardQuery = useQuery({
    queryKey: ['intelligence-production-release-decision-board'],
    queryFn: fetchIntelligenceReleaseDecisionBoard
  });

  const operationalRunbookQuery = useQuery({
    queryKey: ['intelligence-production-operational-runbook'],
    queryFn: fetchIntelligenceOperationalRunbook
  });


  const validationSuiteQuery = useQuery({
    queryKey: ['intelligence-production-validation-suite'],
    queryFn: fetchIntelligenceValidationSuite
  });


  const enablementManifestQuery = useQuery({
    queryKey: ['intelligence-production-enablement-manifest'],
    queryFn: fetchIntelligenceEnablementManifest
  });


  const monitoringContractQuery = useQuery({
    queryKey: ['intelligence-production-monitoring-contract'],
    queryFn: fetchIntelligenceMonitoringContract
  });

  const remediationWorkbenchQuery = useQuery({
    queryKey: ['intelligence-production-remediation-workbench'],
    queryFn: fetchIntelligenceRemediationWorkbench
  });


  const evidenceMatrixQuery = useQuery({
    queryKey: ['intelligence-production-evidence-matrix'],
    queryFn: fetchIntelligenceEvidenceMatrix
  });


  const featureDetailQuery = useQuery({
    queryKey: ['intelligence-production-feature-detail', selectedReadinessFeatureKey],
    queryFn: () => fetchIntelligenceFeatureDetail(selectedReadinessFeatureKey),
    enabled: Boolean(selectedReadinessFeatureKey)
  });

  const response = reviewQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const reviews = response?.reviews || [];
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  const readiness = readinessQuery.data;
  const readinessSummary = readiness?.summary || {};
  const readinessFeatures = readiness?.features || [];
  const productionBacklog = readiness?.production_backlog || [];
  const auditPack = readiness?.audit_pack;
  const hardeningPlan = hardeningPlanQuery.data?.hardening_plan;
  const hardeningPhases = hardeningPlan?.phases || [];
  const signoffChecklist = signoffChecklistQuery.data?.signoff_checklist;

  const releaseDecisionBoard = releaseDecisionBoardQuery.data?.release_decision_board;
  const releaseBlockers = releaseDecisionBoard?.release_blockers || [];
  const releaseFinalEvidence = releaseDecisionBoard?.required_final_test_evidence || [];
  const operationalRunbook = operationalRunbookQuery.data?.operational_runbook;
  const dailyOperatorSequence = operationalRunbook?.daily_operator_sequence || [];
  const emergencyStopConditions = operationalRunbook?.emergency_stop_conditions || [];
  const nextOperatorActions = operationalRunbook?.next_operator_actions || [];

  const validationSuite = validationSuiteQuery.data?.validation_suite;
  const validationBlockedCases = validationSuite?.blocked_cases || [];
  const validationReadyCases = validationSuite?.ready_cases || [];
  const validationReviewCases = validationSuite?.tenant_isolation_review_cases || [];
  const validationGlobalAssertions = validationSuite?.required_global_assertions || [];
  const validationCommands = validationSuite?.suggested_validation_commands || [];
  const enablementManifest = enablementManifestQuery.data?.enablement_manifest;
  const enablementBlockedFeatures = enablementManifest?.blocked_features || [];
  const enablementEligibleFeatures = enablementManifest?.eligible_features || [];
  const enablementSequence = enablementManifest?.enablement_sequence || [];
  const monitoringContract = monitoringContractQuery.data?.monitoring_contract;
  const monitoringBlockedFeatures = monitoringContract?.blocked_features || [];
  const monitoringControlledFeatures = monitoringContract?.controlled_enablement_features || [];
  const monitoringChecks = monitoringContract?.global_monitoring_checks || [];
  const monitoringEscalationRules = monitoringContract?.escalation_rules || [];
  const remediationWorkbench = remediationWorkbenchQuery.data?.remediation_workbench;
  const remediationNextActions = remediationWorkbench?.next_actions || [];
  const remediationWorkstreams = Object.entries(remediationWorkbench?.workstream_summary || {});
  const signoffFeatureChecklists = signoffChecklist?.feature_checklists || [];
  const evidenceMatrix = evidenceMatrixQuery.data?.evidence_matrix;
  const requiredEvidenceGaps = evidenceMatrix?.required_gaps || [];
  const evidenceRiskEntries = Object.entries(evidenceMatrix?.by_risk || {});
  const blockedSignoffFeatures = signoffFeatureChecklists.filter((feature) => feature.signoff_status === 'blocked').slice(0, 6);
  const watchSignoffFeatures = signoffFeatureChecklists.filter((feature) => feature.signoff_status === 'watch').slice(0, 6);
  const criticalReadinessFeatures = readinessFeatures
    .filter((feature) => ['critical', 'high'].includes(feature.production_priority))
    .sort((a, b) => numberValue(b.readiness_score) - numberValue(a.readiness_score))
    .slice(0, 6);
  const allReadinessFeatures = [...readinessFeatures].sort((a, b) => {
    const priorityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (priorityRank[a.production_priority] ?? 9) - (priorityRank[b.production_priority] ?? 9)
      || numberValue(a.readiness_score) - numberValue(b.readiness_score)
      || a.label.localeCompare(b.label);
  });

  const featureDetail = featureDetailQuery.data;
  const selectedFeature = featureDetail?.feature;
  const selectedFeatureTables = selectedFeature?.evidence?.tables || [];
  const selectedHardeningItems = featureDetail?.hardening_items || [];

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">AI review queue</div>
          <div className="card__value">{numberValue(summary.total_reviews ?? reviews.length)}</div>
          <div className="card__subtext">Human-in-the-loop recommendation reviews from decision intelligence and AI governance surfaces.</div>
        </div>
        <div className="card">
          <div className="card__label">Approval required</div>
          <div className="card__value">{numberValue(summary.approval_required_reviews)}</div>
          <div className="card__subtext">Reviews that must stay inside existing governed approval workflows.</div>
        </div>
        <div className="card">
          <div className="card__label">Escalated</div>
          <div className="card__value">{numberValue(summary.escalated_reviews)}</div>
          <div className="card__subtext">High-attention review items requiring management or governance follow-up.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">This page does not execute recommendations, approvals, overrides, or source-system actions.</div>
        </div>
      </div>


      <section className="section">
        <div className="section__title">AI / intelligence production readiness</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">Tracked intelligence features</div>
            <div className="card__value">{numberValue(readinessSummary.total_features)}</div>
            <div className="card__subtext">Existing AI/intelligence modules registered from the current backend surfaces.</div>
          </div>
          <div className="card">
            <div className="card__label">Production candidates</div>
            <div className="card__value">{numberValue(readinessSummary.production_candidates)}</div>
            <div className="card__subtext">Features that have implementation and tenant data, but still need test/hardening evidence.</div>
          </div>
          <div className="card">
            <div className="card__label">Tenant-data backed</div>
            <div className="card__value">{numberValue(readinessSummary.tenant_data_backed_features)}</div>
            <div className="card__subtext">Features whose evidence tables currently contain rows for this tenant.</div>
          </div>
          <div className="card">
            <div className="card__label">Average readiness score</div>
            <div className="card__value">{numberValue(readinessSummary.average_readiness_score)}%</div>
            <div className="card__subtext">Current production-readiness score across tracked AI/intelligence features.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          {readinessQuery.isLoading ? (
            <p className="card__subtext">Loading AI/intelligence production readiness…</p>
          ) : readinessQuery.error ? (
            <p className="form-error">
              {readinessQuery.error instanceof ApiError
                ? readinessQuery.error.message
                : 'Unable to load AI/intelligence production readiness.'}
            </p>
          ) : (
            <>
              <p className="card__subtext">
                This readiness view is read-only. It does not execute recommendations, mutate inventory, approve decisions, call external AI, or train models.
              </p>
              <div style={reviewListStyle}>
                {criticalReadinessFeatures.map((feature) => (
                  <article className="card" key={feature.key}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span style={badgeStyle}>{formatLabel(feature.production_priority)}</span>
                      <span style={badgeStyle}>{formatLabel(feature.production_status)}</span>
                      <span style={badgeStyle}>{formatLabel(feature.completion_band)}</span>
                      <span style={badgeStyle}>{numberValue(feature.readiness_score)}% ready</span>
                    </div>
                    <h3 style={{ marginTop: 0 }}>{feature.label}</h3>
                    <p className="card__subtext">
                      {numberValue(feature.evidence?.tenant_data_rows)} tenant evidence rows across {numberValue(feature.evidence?.existing_table_count)} / {numberValue(feature.evidence?.expected_table_count)} expected evidence tables.
                    </p>
                    {feature.implemented_capabilities?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div className="card__label">Implemented</div>
                        <p className="card__subtext">{feature.implemented_capabilities.slice(0, 3).join(' · ')}</p>
                      </div>
                    ) : null}
                    {feature.completion_gaps?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div className="card__label">Next gaps</div>
                        <p className="card__subtext">{feature.completion_gaps.slice(0, 3).join(' · ')}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production audit pack</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <span style={badgeStyle}>Certification: {formatLabel(auditPack?.certification_status)}</span>
                  <span style={badgeStyle}>Evidence tables: {numberValue(auditPack?.audit_totals?.existing_evidence_tables)} / {numberValue(auditPack?.audit_totals?.expected_evidence_tables)}</span>
                  <span style={badgeStyle}>Tenant scoped: {numberValue(auditPack?.audit_totals?.tenant_scoped_evidence_tables)}</span>
                  <span style={badgeStyle}>Tenant rows: {numberValue(auditPack?.audit_totals?.tenant_evidence_rows)}</span>
                  <span style={badgeStyle}>Blockers: {numberValue(auditPack?.audit_totals?.critical_or_high_blockers)}</span>
                </div>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 14 }}>
                  <div className="card">
                    <div className="card__label">Evidence-table coverage</div>
                    <div className="card__value">{numberValue(auditPack?.coverage?.evidence_table_coverage_percent)}%</div>
                    <div className="card__subtext">Registered AI/intelligence evidence tables that exist in the current database schema.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Tenant-scope coverage</div>
                    <div className="card__value">{numberValue(auditPack?.coverage?.tenant_scoped_table_coverage_percent)}%</div>
                    <div className="card__subtext">Evidence tables that support tenant isolation with tenant_id.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Tenant-data coverage</div>
                    <div className="card__value">{numberValue(auditPack?.coverage?.tenant_data_feature_coverage_percent)}%</div>
                    <div className="card__subtext">Tracked intelligence features with tenant evidence rows available.</div>
                  </div>
                </div>
                {auditPack?.blockers?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">Critical/high blockers</div>
                    <ol style={{ marginBottom: 0 }}>
                      {auditPack.blockers.slice(0, 8).map((blocker) => (
                        <li key={blocker.feature_key || blocker.feature_label}>
                          <strong>{blocker.feature_label}</strong>: {formatLabel(blocker.blocker_reason)}
                          <div className="card__subtext">
                            {formatLabel(blocker.production_priority)} · {formatLabel(blocker.production_status)} · {numberValue(blocker.readiness_score)}% ready
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 14 }}>No critical/high readiness blockers reported by the audit pack.</p>
                )}
                {auditPack?.missing_evidence_tables?.length ? (
                  <p className="card__subtext" style={{ marginTop: 14 }}>
                    Missing evidence tables: {auditPack.missing_evidence_tables.slice(0, 10).join(', ')}{auditPack.missing_evidence_tables.length > 10 ? '…' : ''}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production hardening plan</div>
                {hardeningPlanQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence production hardening plan…</p>
                ) : hardeningPlanQuery.error ? (
                  <p className="form-error">
                    {hardeningPlanQuery.error instanceof ApiError
                      ? hardeningPlanQuery.error.message
                      : 'Unable to load AI/intelligence production hardening plan.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Plan: {formatLabel(hardeningPlan?.plan_status)}</span>
                      <span style={badgeStyle}>Backlog: {numberValue(hardeningPlan?.total_backlog_items)}</span>
                      <span style={badgeStyle}>Scheduled: {numberValue(hardeningPlan?.scheduled_items)}</span>
                      <span style={badgeStyle}>Release gate: {formatLabel(hardeningPlan?.release_gate?.current_status)}</span>
                    </div>
                    {hardeningPlan?.release_gate?.required_before_production?.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Required before production</div>
                        <ol style={{ marginBottom: 0 }}>
                          {hardeningPlan.release_gate.required_before_production.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    <div style={reviewListStyle}>
                      {hardeningPhases.map((phase) => (
                        <article className="card" key={phase.key || phase.phase}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            <span style={badgeStyle}>Phase {numberValue(phase.phase)}</span>
                            <span style={badgeStyle}>{numberValue(phase.item_count)} items</span>
                          </div>
                          <h3 style={{ marginTop: 0 }}>{phase.label}</h3>
                          <p className="card__subtext">{phase.description}</p>
                          {phase.items?.length ? (
                            <ol style={{ marginBottom: 0 }}>
                              {phase.items.slice(0, 5).map((item) => (
                                <li key={`${phase.key}-${item.feature_key}-${item.sequence}`}>
                                  <strong>{item.feature_label}</strong>: {item.gap}
                                  <div className="card__subtext">
                                    {formatLabel(item.workstream)} · {formatLabel(item.production_priority)} · {numberValue(item.readiness_score)}% ready
                                  </div>
                                  {item.acceptance_criteria?.[0]?.label ? (
                                    <div className="card__subtext">Acceptance: {item.acceptance_criteria[0].label}</div>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="card__subtext">No hardening items scheduled for this phase.</p>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production evidence matrix</div>
                {evidenceMatrixQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence evidence matrix…</p>
                ) : evidenceMatrixQuery.error ? (
                  <p className="form-error">
                    {evidenceMatrixQuery.error instanceof ApiError
                      ? evidenceMatrixQuery.error.message
                      : 'Unable to load AI/intelligence production evidence matrix.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Matrix: {formatLabel(evidenceMatrix?.matrix_status)}</span>
                      <span style={badgeStyle}>Evidence rows: {numberValue(evidenceMatrix?.totals?.total_rows)}</span>
                      <span style={badgeStyle}>Existing tables: {numberValue(evidenceMatrix?.totals?.existing_tables)}</span>
                      <span style={badgeStyle}>Tenant scoped: {numberValue(evidenceMatrix?.totals?.tenant_scoped_tables)}</span>
                      <span style={badgeStyle}>Required gaps: {numberValue(evidenceMatrix?.totals?.required_gaps)}</span>
                    </div>
                    {evidenceRiskEntries.length ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {evidenceRiskEntries.map(([risk, count]) => (
                          <span style={badgeStyle} key={risk}>{formatLabel(risk)}: {numberValue(count)}</span>
                        ))}
                      </div>
                    ) : null}
                    {requiredEvidenceGaps.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Required evidence gaps before production</div>
                        <ol style={{ marginBottom: 0 }}>
                          {requiredEvidenceGaps.slice(0, 10).map((gap) => (
                            <li key={`${gap.feature_key}-${gap.table_name}`}>
                              <strong>{gap.feature_label}</strong>: {gap.table_name} — {formatLabel(gap.evidence_risk)}
                              <div className="card__subtext">
                                {formatLabel(gap.production_priority)} · {formatLabel(gap.evidence_scope)} · {numberValue(gap.row_count)} rows
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>No required critical/high evidence gaps reported by the matrix.</p>
                    )}
                  </>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production release decision board</div>
                {releaseDecisionBoardQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence production release decision board…</p>
                ) : releaseDecisionBoardQuery.error ? (
                  <p className="form-error">
                    {releaseDecisionBoardQuery.error instanceof ApiError
                      ? releaseDecisionBoardQuery.error.message
                      : 'Unable to load AI/intelligence production release decision board.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Decision: {formatLabel(releaseDecisionBoard?.board_status)}</span>
                      <span style={badgeStyle}>Blockers: {numberValue(releaseDecisionBoard?.release_decision_inputs?.blocker_count)}</span>
                      <span style={badgeStyle}>Watch: {numberValue(releaseDecisionBoard?.release_decision_inputs?.watch_item_count)}</span>
                      <span style={badgeStyle}>Critical/high hardening: {numberValue(releaseDecisionBoard?.release_decision_inputs?.critical_high_hardening_item_count)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      Recommendation: {formatLabel(releaseDecisionBoard?.decision_summary?.recommendation)}. Production without waiver: {releaseDecisionBoard?.decision_summary?.production_allowed_without_waiver ? 'yes' : 'no'}.
                    </p>
                    {releaseBlockers.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Release blockers</div>
                        <ol style={{ marginBottom: 0 }}>
                          {releaseBlockers.slice(0, 10).map((blocker, index) => (
                            <li key={`${blocker.blocker_type}-${blocker.feature_key}-${index}`}>
                              <strong>{blocker.feature_label || formatLabel(blocker.feature_key)}</strong>: {formatLabel(blocker.blocker_type)} — {blocker.detail}
                              <div className="card__subtext">
                                {formatLabel(blocker.severity)} · Resolution: {blocker.required_resolution}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>No release blockers reported by the decision board.</p>
                    )}
                    {releaseFinalEvidence.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Required final test evidence</div>
                        <ol style={{ marginBottom: 0 }}>
                          {releaseFinalEvidence.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production operational runbook</div>
                {operationalRunbookQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence production operational runbook…</p>
                ) : operationalRunbookQuery.error ? (
                  <p className="form-error">
                    {operationalRunbookQuery.error instanceof ApiError
                      ? operationalRunbookQuery.error.message
                      : 'Unable to load AI/intelligence production operational runbook.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Runbook: {formatLabel(operationalRunbook?.runbook_status)}</span>
                      <span style={badgeStyle}>Release: {formatLabel(operationalRunbook?.release_decision?.recommendation)}</span>
                      <span style={badgeStyle}>Next actions: {numberValue(nextOperatorActions.length)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {operationalRunbook?.operator_warning || 'Runbook guidance is read-only and does not execute AI/intelligence actions.'}
                    </p>
                    {dailyOperatorSequence.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Daily operator sequence</div>
                        <ol style={{ marginBottom: 0 }}>
                          {dailyOperatorSequence.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {nextOperatorActions.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Next operator actions</div>
                        <ol style={{ marginBottom: 0 }}>
                          {nextOperatorActions.slice(0, 8).map((action) => (
                            <li key={action.feature_key || action.feature_label}>
                              <strong>{action.feature_label}</strong>: {formatLabel(action.runbook_status)}
                              <div className="card__subtext">
                                {formatLabel(action.production_priority)} · {numberValue(action.readiness_score)}% ready · Signoff: {formatLabel(action.signoff_status)}
                              </div>
                              {action.operator_sequence?.[0] ? (
                                <div className="card__subtext">First step: {action.operator_sequence[0]}</div>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>No blocked or watch operator actions reported by the runbook.</p>
                    )}
                    {emergencyStopConditions.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Emergency stop conditions</div>
                        <ol style={{ marginBottom: 0 }}>
                          {emergencyStopConditions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </>
                )}
              </div>



              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production validation suite</div>
                {validationSuiteQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence production validation suite…</p>
                ) : validationSuiteQuery.error ? (
                  <p className="form-error">
                    {validationSuiteQuery.error instanceof ApiError
                      ? validationSuiteQuery.error.message
                      : 'Unable to load AI/intelligence production validation suite.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Validation: {formatLabel(validationSuite?.validation_status)}</span>
                      <span style={badgeStyle}>Cases: {numberValue(validationSuite?.totals?.validation_case_count)}</span>
                      <span style={badgeStyle}>Ready: {numberValue(validationSuite?.totals?.ready_case_count)}</span>
                      <span style={badgeStyle}>Blocked: {numberValue(validationSuite?.totals?.blocked_case_count)}</span>
                      <span style={badgeStyle}>Tenant review: {numberValue(validationSuite?.totals?.tenant_isolation_review_case_count)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {validationSuite?.safety_rule || 'Validation proves readiness only; it does not execute AI/intelligence actions.'}
                    </p>
                    {validationBlockedCases.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Blocked validation cases</div>
                        <ol style={{ marginBottom: 0 }}>
                          {validationBlockedCases.slice(0, 8).map((item) => (
                            <li key={item.feature_key || item.feature_label}>
                              <strong>{item.feature_label}</strong>: {formatLabel(item.validation_status)}
                              <div className="card__subtext">
                                {formatLabel(item.production_priority)} · Missing tables: {numberValue(item.evidence_preconditions?.missing_tables?.length)} · Empty tenant tables: {numberValue(item.evidence_preconditions?.empty_tenant_tables?.length)}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>No blocked AI/intelligence validation cases reported.</p>
                    )}
                    {validationReviewCases.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Tenant isolation review cases</div>
                        <ol style={{ marginBottom: 0 }}>
                          {validationReviewCases.slice(0, 6).map((item) => (
                            <li key={item.feature_key || item.feature_label}>
                              <strong>{item.feature_label}</strong>: {numberValue(item.evidence_preconditions?.unscoped_tables?.length)} unscoped evidence table(s)
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {validationGlobalAssertions.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Required global assertions</div>
                        <ol style={{ marginBottom: 0 }}>
                          {validationGlobalAssertions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {validationCommands.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Suggested validation commands</div>
                        <ul style={{ marginBottom: 0 }}>
                          {validationCommands.map((item) => (
                            <li key={item}><code>{item}</code></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="card__subtext" style={{ marginTop: 14 }}>
                      Ready validation cases: {numberValue(validationReadyCases.length)}
                    </p>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production signoff checklist</div>
                {signoffChecklistQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence production signoff checklist…</p>
                ) : signoffChecklistQuery.error ? (
                  <p className="form-error">
                    {signoffChecklistQuery.error instanceof ApiError
                      ? signoffChecklistQuery.error.message
                      : 'Unable to load AI/intelligence production signoff checklist.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Checklist: {formatLabel(signoffChecklist?.checklist_status)}</span>
                      <span style={badgeStyle}>Features: {numberValue(signoffChecklist?.totals?.feature_count)}</span>
                      <span style={badgeStyle}>Passed: {numberValue(signoffChecklist?.totals?.pass_count)}</span>
                      <span style={badgeStyle}>Watch: {numberValue(signoffChecklist?.totals?.watch_count)}</span>
                      <span style={badgeStyle}>Failed: {numberValue(signoffChecklist?.totals?.fail_count)}</span>
                      <span style={badgeStyle}>Blocked features: {numberValue(signoffChecklist?.totals?.blocked_feature_count)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {signoffChecklist?.release_rule || 'Production signoff requires passing or governance-accepting every AI/intelligence checklist item.'}
                    </p>
                    {blockedSignoffFeatures.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Blocked signoff features</div>
                        <ol style={{ marginBottom: 0 }}>
                          {blockedSignoffFeatures.map((feature) => (
                            <li key={feature.feature_key || feature.feature_label}>
                              <strong>{feature.feature_label}</strong>: {numberValue(feature.failed_item_count)} failed checklist items
                              <div className="card__subtext">
                                {formatLabel(feature.production_priority)} · {formatLabel(feature.production_status)} · {numberValue(feature.readiness_score)}% ready
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>No blocked AI/intelligence signoff features reported.</p>
                    )}
                    {watchSignoffFeatures.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Watch-before-final-test features</div>
                        <ol style={{ marginBottom: 0 }}>
                          {watchSignoffFeatures.map((feature) => (
                            <li key={feature.feature_key || feature.feature_label}>
                              <strong>{feature.feature_label}</strong>: {numberValue(feature.watch_item_count)} watch checklist items
                              <div className="card__subtext">
                                {formatLabel(feature.production_priority)} · {formatLabel(feature.signoff_status)} · {numberValue(feature.readiness_score)}% ready
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Selected AI/intelligence feature drilldown</div>
                <div style={{ ...toolbarStyle, marginTop: 10 }}>
                  <select
                    style={selectStyle}
                    value={selectedReadinessFeatureKey}
                    onChange={(event) => setSelectedReadinessFeatureKey(event.target.value)}
                  >
                    {allReadinessFeatures.map((feature) => (
                      <option key={feature.key} value={feature.key}>{feature.label}</option>
                    ))}
                  </select>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => featureDetailQuery.refetch()}
                    disabled={featureDetailQuery.isFetching}
                  >
                    {featureDetailQuery.isFetching ? 'Refreshing…' : 'Refresh feature detail'}
                  </button>
                </div>
                {featureDetailQuery.isLoading ? (
                  <p className="card__subtext">Loading selected AI/intelligence feature detail…</p>
                ) : featureDetailQuery.error ? (
                  <p className="form-error">
                    {featureDetailQuery.error instanceof ApiError
                      ? featureDetailQuery.error.message
                      : 'Unable to load selected AI/intelligence feature detail.'}
                  </p>
                ) : (
                  <>
                    <h3 style={{ marginTop: 0 }}>{selectedFeature?.label || 'Selected feature'}</h3>
                    <p className="card__subtext">{featureDetail?.operator_summary?.headline}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Priority: {formatLabel(selectedFeature?.production_priority)}</span>
                      <span style={badgeStyle}>Status: {formatLabel(selectedFeature?.production_status)}</span>
                      <span style={badgeStyle}>Score: {numberValue(selectedFeature?.readiness_score)}%</span>
                      <span style={badgeStyle}>Evidence: {formatLabel(featureDetail?.evidence_summary?.evidence_state)}</span>
                    </div>
                    <div className="card-grid" style={{ ...gridStyle, marginTop: 14 }}>
                      <div className="card">
                        <div className="card__label">Production meaning</div>
                        <p className="card__subtext">{formatLabel(featureDetail?.operator_summary?.production_meaning)}</p>
                      </div>
                      <div className="card">
                        <div className="card__label">Evidence meaning</div>
                        <p className="card__subtext">{featureDetail?.operator_summary?.evidence_meaning}</p>
                      </div>
                      <div className="card">
                        <div className="card__label">Next required completion</div>
                        <p className="card__subtext">{featureDetail?.operator_summary?.next_required_completion}</p>
                      </div>
                    </div>
                    {selectedFeature?.implemented_capabilities?.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Implemented capabilities in current code</div>
                        <ul style={{ marginBottom: 0 }}>
                          {selectedFeature.implemented_capabilities.map((capability) => (
                            <li key={capability}>{capability}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {selectedHardeningItems.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">Open hardening items with acceptance criteria</div>
                        <ol style={{ marginBottom: 0 }}>
                          {selectedHardeningItems.map((item) => (
                            <li key={`${item.feature_key}-${item.sequence}`}>
                              <strong>{item.gap}</strong>
                              <div className="card__subtext">{formatLabel(item.workstream)} · {formatLabel(item.production_priority)} · {numberValue(item.readiness_score)}% ready</div>
                              {item.acceptance_criteria?.length ? (
                                <ul>
                                  {item.acceptance_criteria.map((criterion) => (
                                    <li key={criterion.key}>
                                      {criterion.label}
                                      <div className="card__subtext">{criterion.verification}</div>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {selectedFeatureTables.length ? (
                      <div style={{ overflowX: 'auto', marginTop: 14 }}>
                        <div className="card__label">Evidence tables checked</div>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Table</th>
                              <th>Exists</th>
                              <th>Tenant scoped</th>
                              <th>Rows</th>
                              <th>Scope</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedFeatureTables.map((table) => (
                              <tr key={table.table_name}>
                                <td>{table.table_name}</td>
                                <td>{table.table_exists ? 'Yes' : 'No'}</td>
                                <td>{table.tenant_scoped ? 'Yes' : 'No'}</td>
                                <td>{numberValue(table.row_count)}</td>
                                <td>{formatLabel(table.evidence_scope)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    <p className="card__subtext" style={{ marginTop: 14 }}>{featureDetail?.operator_summary?.safety_position}</p>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Full AI/intelligence feature breakdown</div>
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Feature</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Evidence</th>
                        <th>Main gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReadinessFeatures.map((feature) => (
                        <tr key={feature.key}>
                          <td>
                            <strong>{feature.label}</strong>
                            <div className="card__subtext">{formatLabel(feature.category)}</div>
                          </td>
                          <td>{formatLabel(feature.production_priority)}</td>
                          <td>{formatLabel(feature.production_status)}</td>
                          <td>{numberValue(feature.readiness_score)}%</td>
                          <td>
                            {numberValue(feature.evidence?.tenant_data_rows)} rows · {numberValue(feature.evidence?.existing_table_count)} / {numberValue(feature.evidence?.expected_table_count)} tables
                          </td>
                          <td>{feature.completion_gaps?.[0] || 'No gap reported'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production remediation workbench</div>
                {remediationWorkbenchQuery.isLoading ? (
                  <p className="card__subtext">Loading AI/intelligence production remediation workbench…</p>
                ) : remediationWorkbenchQuery.error ? (
                  <p className="form-error">
                    {remediationWorkbenchQuery.error instanceof ApiError
                      ? remediationWorkbenchQuery.error.message
                      : 'Unable to load AI/intelligence production remediation workbench.'}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>Workbench: {formatLabel(remediationWorkbench?.workbench_status)}</span>
                      <span style={badgeStyle}>Open: {numberValue(remediationWorkbench?.totals?.open_actions)}</span>
                      <span style={badgeStyle}>Critical: {numberValue(remediationWorkbench?.totals?.critical_actions)}</span>
                      <span style={badgeStyle}>High: {numberValue(remediationWorkbench?.totals?.high_actions)}</span>
                      <span style={badgeStyle}>Evidence gaps: {numberValue(remediationWorkbench?.totals?.actions_with_evidence_gaps)}</span>
                    </div>
                    {remediationWorkstreams.length ? (
                      <p className="card__subtext" style={{ marginTop: 10 }}>
                        Workstreams: {remediationWorkstreams.map(([key, value]) => `${formatLabel(key)}: ${value}`).join(' · ')}
                      </p>
                    ) : null}
                    {remediationNextActions.length ? (
                      <ol style={{ marginBottom: 0, marginTop: 14 }}>
                        {remediationNextActions.slice(0, 10).map((action) => (
                          <li key={`${action.feature_key}-${action.sequence}-${action.gap}`}>
                            <strong>{action.feature_label}</strong>: {action.gap}
                            <div className="card__subtext">
                              {formatLabel(action.production_priority)} · {formatLabel(action.workstream)} · {numberValue(action.readiness_score)}% ready
                            </div>
                            {action.target_endpoints?.length ? (
                              <div className="card__subtext">Endpoints: {action.target_endpoints.slice(0, 3).join(', ')}{action.target_endpoints.length > 3 ? '…' : ''}</div>
                            ) : null}
                            {action.evidence_gaps?.length ? (
                              <div className="card__subtext">
                                Evidence gaps: {action.evidence_gaps.slice(0, 3).map((gap) => `${gap.table_name} (${formatLabel(gap.evidence_risk)})`).join(', ')}{action.evidence_gaps.length > 3 ? '…' : ''}
                              </div>
                            ) : null}
                            {action.acceptance_criteria?.[0]?.label ? (
                              <div className="card__subtext">Acceptance: {action.acceptance_criteria[0].label}</div>
                            ) : null}
                            {action.suggested_validation?.length ? (
                              <div className="card__subtext">Validation: {action.suggested_validation.slice(0, 2).join(' · ')}</div>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>No remediation actions reported.</p>
                    )}
                    <p className="card__subtext" style={{ marginTop: 14 }}>
                      This workbench is still read-only. It turns the existing AI/intelligence gaps into actionable production tasks, but it does not execute recommendations or mutate inventory, procurement, financial, approval, or external AI state.
                    </p>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">Production backlog from existing AI/intelligence features</div>
                {productionBacklog.length ? (
                  <ol style={{ marginBottom: 0 }}>
                    {productionBacklog.slice(0, 12).map((item) => (
                      <li key={`${item.feature_key}-${item.sequence}`}>
                        <strong>{item.feature_label}</strong>: {item.gap}
                        <div className="card__subtext">
                          {formatLabel(item.production_priority)} · {formatLabel(item.production_status)} · {numberValue(item.readiness_score)}% ready
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="card__subtext">No production backlog reported.</p>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Human-in-the-loop AI controls</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={aiOperationDomain} onChange={(event) => setAiOperationDomain(event.target.value as 'all' | AIOperationDomain)}>
              {DOMAIN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={reviewState} onChange={(event) => setReviewState(event.target.value as 'all' | ReviewState)}>
              {REVIEW_STATE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | Urgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => reviewQuery.refetch()} disabled={reviewQuery.isFetching}>
              {reviewQuery.isFetching ? 'Refreshing…' : 'Refresh review queue'}
            </button>
            <Link className="button button--secondary" to="/workflow-composer">Open workflow composer</Link>
            <Link className="button button--secondary" to="/system-context">Open system context</Link>
          </div>

          {reviewQuery.isLoading ? (
            <p className="card__subtext">Loading human-in-the-loop AI review queue…</p>
          ) : reviewQuery.error ? (
            <p className="form-error">
              {reviewQuery.error instanceof ApiError
                ? reviewQuery.error.message
                : 'Unable to load human-in-the-loop AI review queue.'}
            </p>
          ) : (
            <p className="card__subtext">
              {guidance.review_queue_guidance || 'Review recommendations, confidence, explainability, simulation context, and approval requirements before acting elsewhere.'}
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Review queue</div>
        {reviews.length === 0 && !reviewQuery.isLoading ? (
          <div className="empty-state">No AI review items match the selected filters.</div>
        ) : (
          <div style={reviewListStyle}>
            {reviews.map((review) => {
              const sourcePath = sourceSurfaceToAppPath(review.explainability_review?.source_surface || review.governance_approval_guidance?.approval_route);
              const confidence = review.confidence_visualization;
              return (
                <article className="card" key={review.review_id}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={badgeStyle}>{formatLabel(review.urgency)}</span>
                    <span style={badgeStyle}>{formatLabel(review.review_state)}</span>
                    <span style={badgeStyle}>{formatLabel(review.ai_operation_domain)}</span>
                    {review.governance_approval_guidance?.approval_required ? <span style={badgeStyle}>Approval required</span> : null}
                  </div>
                  <h3 style={{ marginTop: 0 }}>{review.title || review.review_id}</h3>
                  <p className="card__subtext">{review.summary || 'No review summary was provided.'}</p>
                  <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', marginTop: 12 }}>
                    <div>
                      <div className="card__label">Confidence</div>
                      <strong>{formatPercent(confidence?.confidence_score)}</strong>
                      <div className="card__subtext">{formatLabel(confidence?.confidence_band)} · advisory only</div>
                    </div>
                    <div>
                      <div className="card__label">Simulation</div>
                      <strong>{review.simulation_preview?.preview_available ? 'Available' : 'Not available'}</strong>
                      <div className="card__subtext">{formatLabel(review.simulation_preview?.preview_execution_mode)}</div>
                    </div>
                    <div>
                      <div className="card__label">Updated</div>
                      <strong>{formatDateTime(review.updated_at || review.created_at)}</strong>
                    </div>
                  </div>

                  {review.explainability_review?.primary_factors?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Explainability factors</div>
                      <p className="card__subtext">{review.explainability_review.primary_factors.map(formatLabel).join(' · ')}</p>
                    </div>
                  ) : null}

                  {review.override_capture_guidance?.suggested_reason_categories?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Override reason guidance</div>
                      <p className="card__subtext">
                        {review.override_capture_guidance.override_reason_required ? 'Reason required: ' : 'Reason optional: '}
                        {review.override_capture_guidance.suggested_reason_categories.map(formatLabel).join(', ')}
                      </p>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    {sourcePath ? <Link className="button button--secondary" to={sourcePath}>Open source surface</Link> : null}
                    <Link className="button button--secondary" to="/action-center">Open action center</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>


      <section className="section">
        <div className="section__title">Production enablement manifest</div>
        <div className="card">
          {enablementManifestQuery.isLoading ? (
            <p className="card__subtext">Loading AI/intelligence production enablement manifest…</p>
          ) : enablementManifestQuery.error ? (
            <p className="form-error">
              {enablementManifestQuery.error instanceof ApiError
                ? enablementManifestQuery.error.message
                : 'Unable to load AI/intelligence production enablement manifest.'}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>Manifest: {formatLabel(enablementManifest?.manifest_status)}</span>
                <span style={badgeStyle}>Eligible: {numberValue(enablementManifest?.totals?.eligible_for_controlled_enablement)}</span>
                <span style={badgeStyle}>Blocked/waiver: {numberValue(enablementManifest?.totals?.blocked_or_requires_governance_waiver)}</span>
                <span style={badgeStyle}>Pending: {numberValue(enablementManifest?.totals?.not_enabled_pending_hardening)}</span>
              </div>
              <p className="card__subtext" style={{ marginTop: 12 }}>
                {enablementManifest?.global_enablement_rule || 'Production enablement is blocked until evidence, signoff, validation, and governance rules are satisfied.'}
              </p>
              {enablementSequence.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Enablement sequence</div>
                  <ol style={{ marginBottom: 0 }}>
                    {enablementSequence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {enablementBlockedFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Blocked or waiver-required features</div>
                  <ol style={{ marginBottom: 0 }}>
                    {enablementBlockedFeatures.slice(0, 10).map((feature) => (
                      <li key={feature.feature_key}>
                        <strong>{feature.feature_label || formatLabel(feature.feature_key)}</strong>: {formatLabel(feature.enablement_state)}
                        <div className="card__subtext">
                          {formatLabel(feature.production_priority)} · release blockers {numberValue(feature.release_blocker_count)} · evidence gaps {numberValue(feature.required_evidence_gap_count)} · signoff {formatLabel(feature.signoff_status)} · validation {formatLabel(feature.validation_status)}
                        </div>
                        <div className="card__subtext">{feature.operator_enablement_note}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {enablementEligibleFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Eligible for controlled final testing</div>
                  <ul style={{ marginBottom: 0 }}>
                    {enablementEligibleFeatures.slice(0, 10).map((feature) => (
                      <li key={feature.feature_key}>{feature.feature_label || formatLabel(feature.feature_key)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Production monitoring contract</div>
        <div className="card">
          {monitoringContractQuery.isLoading ? (
            <p className="card__subtext">Loading AI/intelligence production monitoring contract…</p>
          ) : monitoringContractQuery.error ? (
            <p className="form-error">
              {monitoringContractQuery.error instanceof ApiError
                ? monitoringContractQuery.error.message
                : 'Unable to load AI/intelligence production monitoring contract.'}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>Contract: {formatLabel(monitoringContract?.contract_status)}</span>
                <span style={badgeStyle}>Monitored: {numberValue(monitoringContract?.totals?.monitored_feature_count)}</span>
                <span style={badgeStyle}>Blocked: {numberValue(monitoringContract?.totals?.monitor_blockers_before_enablement)}</span>
                <span style={badgeStyle}>Controlled: {numberValue(monitoringContract?.totals?.monitor_after_controlled_enablement)}</span>
              </div>
              <p className="card__subtext" style={{ marginTop: 12 }}>
                {monitoringContract?.safety_rule || 'Monitoring is read-only and does not execute AI/intelligence actions.'}
              </p>
              {monitoringChecks.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Global monitoring checks</div>
                  <ul style={{ marginBottom: 0 }}>
                    {monitoringChecks.slice(0, 6).map((check) => (
                      <li key={check}>{check}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {monitoringBlockedFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Blocked monitoring items</div>
                  <ol style={{ marginBottom: 0 }}>
                    {monitoringBlockedFeatures.slice(0, 8).map((feature) => (
                      <li key={feature.feature_key}>
                        <strong>{feature.feature_label || formatLabel(feature.feature_key)}</strong>: {formatLabel(feature.monitoring_state)}
                        <div className="card__subtext">
                          Cadence {formatLabel(feature.monitoring_cadence)} · blockers {numberValue(feature.release_blocker_count)} · evidence gaps {numberValue(feature.required_evidence_gap_count)} · validation {formatLabel(feature.validation_status)}
                        </div>
                        <div className="card__subtext">{feature.operator_response}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {monitoringControlledFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Controlled enablement monitoring</div>
                  <ul style={{ marginBottom: 0 }}>
                    {monitoringControlledFeatures.slice(0, 8).map((feature) => (
                      <li key={feature.feature_key}>{feature.feature_label || formatLabel(feature.feature_key)} · {formatLabel(feature.monitoring_cadence)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {monitoringEscalationRules.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">Escalation rules</div>
                  <ul style={{ marginBottom: 0 }}>
                    {monitoringEscalationRules.slice(0, 4).map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Governance and safety</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">Confidence guidance</div>
            <p className="card__subtext">{guidance.confidence_guidance || 'Confidence is advisory only and never authorizes automatic execution.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Override guidance</div>
            <p className="card__subtext">{guidance.override_guidance || 'Overrides must be captured in governed source workflows.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Approval guidance</div>
            <p className="card__subtext">{guidance.approval_guidance || 'Approvals must be completed in existing governed workflows.'}</p>
          </div>
          <div className="card">
            <div className="card__label">Safety contract</div>
            <p className="card__subtext">
              {safetyEntries.length
                ? safetyEntries.map(([key]) => formatLabel(key)).join(' · ')
                : 'No mutation, execution, approval, or override is performed by this endpoint.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
