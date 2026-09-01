import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { getRoleCapabilities, hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // hidden tenant-facing redundancy; keep source for easy restoration
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './HumanInLoopAIReviewPage.css';


const UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS = [
  'capability_inventory',
  'risk_scoring',
  'decision_lineage',
  'rollback_orchestration',
  'maturity_self_audit',
  'governance_dashboard',
  'commercial_release_gate',
  'commercial_release_evidence_dossier',
  'route_exposure_audit',
  'runtime_coverage_audit',
  'runtime_remediation_worklist',
  'runtime_validation_drill',
  'runtime_signoff_evidence_ledger',
  'runtime_waiver_review_register',
  'runtime_waiver_escalation_matrix',
  'runtime_waiver_closure_board',
  'runtime_post_closure_monitoring_plan',
  'runtime_post_closure_evidence_acceptance_gate',
  'runtime_broad_release_readiness_board',
  'runtime_tenant_enablement_control_queue',
  'runtime_post_enablement_health_watchlist',
  'runtime_post_enablement_incident_response_queue',
  'runtime_post_enablement_incident_closure_board',
  'runtime_post_enablement_prevention_verification_backlog',
  'runtime_post_enablement_rollout_resume_authorization_ledger',
  'runtime_post_enablement_rollout_resume_observation_board',
  'runtime_post_enablement_rollout_scope_expansion_authorization_board',
  'runtime_post_enablement_expanded_scope_health_board',
  'runtime_post_enablement_rollout_growth_authorization_board',
  'runtime_post_enablement_rollout_growth_observation_board',
  'runtime_post_enablement_rollout_growth_next_step_gate',
  'runtime_post_enablement_next_wave_observation_board',
  'runtime_post_enablement_additional_growth_authorization_board',
  'runtime_post_enablement_additional_growth_observation_board',
  'runtime_post_enablement_further_growth_exit_criteria_board',
  'runtime_post_enablement_steady_state_certification_board',
  'runtime_post_enablement_steady_state_monitoring_cadence_board',
  'runtime_post_enablement_steady_state_monitoring_exception_review_queue',
  'runtime_post_enablement_steady_state_exception_closure_board',
  'runtime_post_enablement_steady_state_exception_recurrence_audit_board',
  'runtime_post_enablement_steady_state_exception_recurrence_resolution_board',
  'runtime_post_enablement_steady_state_exception_resolution_verification_board',
  'runtime_post_enablement_steady_state_certification_renewal_board',
  'runtime_final_governance_audit_pack',
  'final_completion_freeze_manifest',
  'commercial_completion_certificate',
  'contract_freeze_manifest',
  'response_contract_audit'
] as const;

type AIOperationDomain = 'decision_intelligence' | 'ai_governance' | 'remediation' | 'simulation' | 'optimization' | 'multi_domain';
type ReviewState = 'pending_review' | 'approval_required' | 'escalated' | 'ready_for_human_decision' | 'acknowledged' | 'approved_for_manual_action' | 'rejected' | 'suppressed' | 'execution_request_drafted';
type ReviewDecision = 'acknowledged' | 'approved_for_manual_action' | 'rejected' | 'suppressed' | 'escalated' | 'reopened';
type EscalationTargetRole = 'admin' | 'manager' | 'decision_intelligence_reviewer';
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

type UnifiedAICapabilityInventory = {
  inventory_type?: string;
  inventory_scope?: string;
  execution_mode?: string;
  total_capabilities?: number;
  commercial_candidate_capabilities?: number;
  capabilities_needing_evidence_or_hardening?: number;
  feature_count?: number;
  by_commercialization_state?: Record<string, number>;
  by_category?: Record<string, number>;
  high_priority_capability_gaps?: Array<{
    capability_key?: string;
    capability_label?: string;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    readiness_score?: number;
    gap_type?: string;
    required_resolution?: string;
  }>;
  capability_rows?: Array<{
    capability_key?: string;
    capability_label?: string;
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    tenant_evidence_rows?: number;
    evidence_table_coverage_percent?: number;
    commercialization_state?: string;
  }>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRiskScoring = {
  scoring_type?: string;
  scoring_scope?: string;
  execution_mode?: string;
  average_ai_risk_score?: number;
  highest_ai_risk_score?: number;
  feature_count?: number;
  critical_or_high_risk_feature_count?: number;
  by_risk_level?: Record<string, number>;
  highest_risk_features?: Array<{
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    tenant_evidence_rows?: number;
    open_gap_count?: number;
    ai_risk_score?: number;
    ai_risk_level?: string;
    primary_risk_driver?: string;
    required_control?: string;
  }>;
  feature_risk_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    tenant_evidence_rows?: number;
    open_gap_count?: number;
    ai_risk_score?: number;
    ai_risk_level?: string;
    primary_risk_driver?: string;
    required_control?: string;
  }>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIDecisionLineage = {
  lineage_type?: string;
  lineage_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  average_lineage_completeness_score?: number;
  lineage_ready_feature_count?: number;
  lineage_hardening_feature_count?: number;
  lineage_blocked_feature_count?: number;
  critical_lineage_gaps?: Array<{
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    lineage_completeness_score?: number;
    lineage_state?: string;
    tenant_evidence_rows?: number;
    endpoint_count?: number;
    frontend_surface_count?: number;
    evidence_table_count?: number;
    missing_lineage_links?: string[];
    required_lineage_control?: string;
  }>;
  lineage_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    lineage_completeness_score?: number;
    lineage_state?: string;
    tenant_evidence_rows?: number;
    endpoint_count?: number;
    frontend_surface_count?: number;
    evidence_table_count?: number;
    missing_lineage_links?: string[];
    required_lineage_control?: string;
  }>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRollbackOrchestration = {
  orchestration_type?: string;
  orchestration_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  average_rollback_score?: number;
  rollback_ready_feature_count?: number;
  rollback_review_feature_count?: number;
  rollback_blocked_feature_count?: number;
  critical_rollback_blockers?: Array<{
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    ai_risk_score?: number;
    ai_risk_level?: string;
    lineage_completeness_score?: number;
    rollback_score?: number;
    rollback_state?: string;
    rollback_blockers?: string[];
    rollback_decision?: string;
  }>;
  rollback_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    category?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    ai_risk_score?: number;
    ai_risk_level?: string;
    lineage_completeness_score?: number;
    rollback_score?: number;
    rollback_state?: string;
    rollback_blockers?: string[];
    trigger_conditions?: string[];
    rollback_decision?: string;
  }>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIMaturitySelfAudit = {
  audit_type?: string;
  audit_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  maturity_score?: number;
  maturity_level?: string;
  commercial_grade_without_waiver?: boolean;
  commercial_grade_with_governance_waiver?: boolean;
  blocker_check_count?: number;
  watch_check_count?: number;
  pass_check_count?: number;
  score_inputs?: Record<string, number>;
  blocker_checks?: Array<{
    key?: string;
    label?: string;
    score?: number;
    status?: string;
    required_resolution?: string;
  }>;
  watch_checks?: Array<{
    key?: string;
    label?: string;
    score?: number;
    status?: string;
    required_resolution?: string;
  }>;
  audit_checks?: Array<{
    key?: string;
    label?: string;
    score?: number;
    status?: string;
    required_resolution?: string;
  }>;
  next_commercial_grade_actions?: Array<{
    sequence?: number;
    check_key?: string;
    check_label?: string;
    current_status?: string;
    current_score?: number;
    required_resolution?: string;
  }>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIGovernanceDashboard = {
  dashboard_type?: string;
  dashboard_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  governance_readiness_score?: number;
  governance_state?: string;
  commercial_enablement_allowed_without_waiver?: boolean;
  commercial_enablement_requires_waiver?: boolean;
  blocker_source_count?: number;
  watch_source_count?: number;
  pass_source_count?: number;
  blocker_sources?: Array<{
    key?: string;
    label?: string;
    blocker_count?: number;
    severity?: string;
    required_resolution?: string;
  }>;
  watch_sources?: Array<{
    key?: string;
    label?: string;
    blocker_count?: number;
    severity?: string;
    required_resolution?: string;
  }>;
  governance_sources?: Array<{
    key?: string;
    label?: string;
    blocker_count?: number;
    severity?: string;
    required_resolution?: string;
  }>;
  next_governance_actions?: Array<{
    sequence?: number;
    source_key?: string;
    source_label?: string;
    current_severity?: string;
    blocker_count?: number;
    required_resolution?: string;
  }>;
  source_scores?: Record<string, number | boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAICommercialReleaseGate = {
  gate_type?: string;
  gate_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  release_gate_score?: number;
  release_gate_state?: string;
  commercial_release_allowed_without_waiver?: boolean;
  commercial_release_requires_waiver?: boolean;
  blocker_check_count?: number;
  watch_check_count?: number;
  pass_check_count?: number;
  gate_checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    score?: number;
    required_resolution?: string;
  }>;
  blocker_checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    score?: number;
    required_resolution?: string;
  }>;
  watch_checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    score?: number;
    required_resolution?: string;
  }>;
  operator_release_actions?: Array<{
    sequence?: number;
    check_key?: string;
    check_label?: string;
    current_status?: string;
    required_resolution?: string;
  }>;
  final_release_policy?: {
    final_decision_owner?: string;
    automated_release_allowed?: boolean;
    requires_signed_release_decision?: boolean;
    requires_monitoring_contract?: boolean;
    requires_rollback_plan?: boolean;
    requires_audit_evidence?: boolean;
  };
  safety_contract?: Record<string, boolean>;
};


type UnifiedAICommercialReleaseEvidenceDossier = {
  dossier_type?: string;
  dossier_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  evidence_score?: number;
  dossier_state?: string;
  commercial_release_evidence_complete_without_waiver?: boolean;
  commercial_release_evidence_waiver_required?: boolean;
  blocker_check_count?: number;
  watch_check_count?: number;
  pass_check_count?: number;
  evidence_checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    evidence_source?: string;
    required_artifact?: string;
  }>;
  blocker_checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    evidence_source?: string;
    required_artifact?: string;
  }>;
  watch_checks?: Array<{
    key?: string;
    label?: string;
    status?: string;
    evidence_source?: string;
    required_artifact?: string;
  }>;
  required_release_artifacts?: Array<{
    sequence?: number;
    artifact_key?: string;
    artifact_label?: string;
    evidence_source?: string;
    current_status?: string;
    required_artifact?: string;
  }>;
  operator_dossier_policy?: {
    final_decision_owner?: string;
    automated_release_allowed?: boolean;
    requires_signed_release_decision?: boolean;
    requires_exported_evidence_pack?: boolean;
    requires_monitoring_contract?: boolean;
    requires_rollback_plan?: boolean;
    requires_waiver_record_when_watch_items_exist?: boolean;
  };
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRouteExposureAudit = {
  audit_type?: string;
  audit_scope?: string;
  execution_mode?: string;
  expected_route_count?: number;
  route_contract_status?: string;
  frontend_query_contract_status?: string;
  frontend_api_base_path?: string;
  frontend_api_path_contract_status?: string;
  misaligned_frontend_api_paths?: string[];
  expected_frontend_query_key_count?: number;
  unique_frontend_query_key_count?: number;
  duplicate_frontend_query_keys?: string[];
  protected_by_permission?: string;
  route_rows?: Array<{
    sequence?: number;
    route_path?: string;
    frontend_api_path?: string;
    frontend_api_path_aligned?: boolean;
    controller_export?: string;
    frontend_query_key?: string;
    response_contract?: string;
    required_permission?: string;
    route_contract_status?: string;
    frontend_query_contract_status?: string;
    breaking_change_rule?: string;
  }>;
  route_change_control_policy?: {
    adding_route_requires?: string[];
    removing_or_renaming_route_requires?: string[];
    unpermissioned_ai_readiness_routes_allowed?: boolean;
  };
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeCoverageAudit = {
  audit_type?: string;
  audit_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  registered_backend_endpoint_count?: number;
  registered_frontend_consumer_count?: number;
  average_runtime_coverage_score?: number;
  runtime_coverage_status?: string;
  features_with_runtime_gaps_count?: number;
  features_with_runtime_contracts_present_count?: number;
  high_priority_runtime_gaps?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    backend_endpoint_count?: number;
    frontend_consumer_count?: number;
    tenant_runtime_evidence_rows?: number;
    runtime_coverage_score?: number;
    runtime_coverage_status?: string;
    open_runtime_gaps?: string[];
  }>;
  runtime_coverage_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    production_status?: string;
    readiness_score?: number;
    backend_endpoint_count?: number;
    frontend_consumer_count?: number;
    expected_evidence_table_count?: number;
    existing_evidence_table_count?: number;
    tenant_runtime_evidence_rows?: number;
    backend_endpoints?: string[];
    frontend_surfaces?: string[];
    runtime_coverage_score?: number;
    runtime_coverage_status?: string;
    open_runtime_gaps?: string[];
    commercial_validation_meaning?: string;
  }>;
  validation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIRuntimeRemediationWorklist = {
  worklist_type?: string;
  worklist_scope?: string;
  execution_mode?: string;
  runtime_coverage_status?: string;
  total_runtime_remediation_items?: number;
  blocking_runtime_remediation_items?: number;
  highest_urgency_score?: number;
  commercial_release_status?: string;
  prioritized_runtime_remediation_items?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    production_status?: string;
    runtime_coverage_score?: number;
    urgency_score?: number;
    open_runtime_gaps?: string[];
    recommended_next_actions?: string[];
    owner_hint?: string;
    commercial_release_impact?: string;
  }>;
  remediation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeValidationDrill = {
  drill_type?: string;
  drill_scope?: string;
  execution_mode?: string;
  total_drill_items?: number;
  blocking_drill_items?: number;
  runtime_coverage_status?: string;
  remediation_release_status?: string;
  drill_release_status?: string;
  runtime_validation_drill_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    drill_status?: string;
    runtime_coverage_score?: number;
    urgency_score?: number;
    open_runtime_gaps?: string[];
    required_evidence_artifacts?: string[];
    pass_criteria?: string[];
    operator_drill_steps?: string[];
    rollback_or_abort_rule?: string;
    current_backend_endpoint_count?: number;
    current_frontend_consumer_count?: number;
    current_tenant_runtime_evidence_rows?: number;
  }>;
  drill_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeSignoffEvidenceLedger = {
  ledger_type?: string;
  ledger_scope?: string;
  execution_mode?: string;
  feature_count?: number;
  evidence_ready_feature_count?: number;
  blocking_or_waiver_required_feature_count?: number;
  manual_waiver_packet_required_count?: number;
  signoff_readiness_percent?: number;
  runtime_coverage_status?: string;
  remediation_release_status?: string;
  validation_drill_release_status?: string;
  signoff_release_status?: string;
  runtime_signoff_evidence_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    production_status?: string;
    runtime_coverage_score?: number;
    evidence_ready_for_signoff?: boolean;
    waiver_required_for_commercial_ai_signoff?: boolean;
    signoff_status?: string;
    backend_endpoint_count?: number;
    frontend_consumer_count?: number;
    expected_evidence_table_count?: number;
    existing_evidence_table_count?: number;
    tenant_runtime_evidence_rows?: number;
    open_runtime_gaps?: string[];
    required_evidence_artifacts?: string[];
    pass_criteria?: string[];
    signoff_evidence_statement?: string;
  }>;
  manual_waiver_packet_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    signoff_status?: string;
    waiver_required_for_commercial_ai_signoff?: boolean;
    open_runtime_gaps?: string[];
    missing_waiver_evidence_artifacts?: string[];
    minimum_manual_waiver_fields?: string[];
    waiver_packet_status?: string;
    release_rule?: string;
  }>;
  waiver_packet_policy?: Record<string, boolean>;
  signoff_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeWaiverReviewRegister = {
  register_type?: string;
  register_scope?: string;
  execution_mode?: string;
  waiver_review_row_count?: number;
  critical_high_waiver_review_count?: number;
  waiver_review_release_status?: string;
  waiver_review_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    waiver_packet_status?: string;
    review_status?: string;
    waiver_review_cadence?: string;
    review_owner_hint?: string;
    expiration_control?: string;
    renewal_rule?: string;
    closure_evidence_required?: string[];
    open_runtime_gaps?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  critical_high_waiver_review_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    waiver_packet_status?: string;
    review_status?: string;
    waiver_review_cadence?: string;
    review_owner_hint?: string;
    expiration_control?: string;
    renewal_rule?: string;
    closure_evidence_required?: string[];
    open_runtime_gaps?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  register_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimeWaiverEscalationMatrix = {
  matrix_type?: string;
  matrix_scope?: string;
  execution_mode?: string;
  escalation_row_count?: number;
  tier_1_executive_escalation_count?: number;
  tier_2_product_operations_escalation_count?: number;
  waiver_review_release_status?: string;
  escalation_release_status?: string;
  waiver_escalation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    review_status?: string;
    waiver_review_cadence?: string;
    escalation_tier?: string;
    escalation_status?: string;
    escalation_owner_hint?: string;
    escalation_trigger?: string;
    escalation_due_policy?: string;
    executive_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  tier_1_executive_escalation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    review_status?: string;
    waiver_review_cadence?: string;
    escalation_tier?: string;
    escalation_status?: string;
    escalation_owner_hint?: string;
    escalation_trigger?: string;
    escalation_due_policy?: string;
    executive_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  tier_2_product_operations_escalation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    review_status?: string;
    waiver_review_cadence?: string;
    escalation_tier?: string;
    escalation_status?: string;
    escalation_owner_hint?: string;
    escalation_trigger?: string;
    escalation_due_policy?: string;
    executive_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  escalation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimeWaiverClosureBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  closure_row_count?: number;
  blocked_closure_row_count?: number;
  executive_blocked_closure_count?: number;
  product_operations_blocked_closure_count?: number;
  escalation_release_status?: string;
  closure_release_status?: string;
  waiver_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    escalation_status?: string;
    closure_readiness_status?: string;
    closure_owner_hint?: string;
    closure_due_policy?: string;
    closure_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  blocked_waiver_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    escalation_status?: string;
    closure_readiness_status?: string;
    closure_owner_hint?: string;
    closure_due_policy?: string;
    closure_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  executive_blocked_waiver_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    escalation_status?: string;
    closure_readiness_status?: string;
    closure_owner_hint?: string;
    closure_due_policy?: string;
    closure_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  product_operations_blocked_waiver_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    escalation_status?: string;
    closure_readiness_status?: string;
    closure_owner_hint?: string;
    closure_due_policy?: string;
    closure_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    closure_evidence_required?: string[];
    required_manual_waiver_fields?: string[];
    release_rule?: string;
  }>;
  closure_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostClosureMonitoringPlan = {
  plan_type?: string;
  plan_scope?: string;
  execution_mode?: string;
  monitoring_row_count?: number;
  blocked_monitoring_row_count?: number;
  executive_monitoring_row_count?: number;
  product_operations_monitoring_row_count?: number;
  closure_release_status?: string;
  monitoring_release_status?: string;
  post_closure_monitoring_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    closure_readiness_status?: string;
    monitoring_status?: string;
    monitoring_owner_hint?: string;
    monitoring_cadence?: string;
    release_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_monitoring_evidence?: string[];
    closure_evidence_required?: string[];
    release_rule?: string;
  }>;
  blocked_post_closure_monitoring_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    closure_readiness_status?: string;
    monitoring_status?: string;
    monitoring_owner_hint?: string;
    monitoring_cadence?: string;
    release_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_monitoring_evidence?: string[];
    closure_evidence_required?: string[];
    release_rule?: string;
  }>;
  executive_post_closure_monitoring_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    closure_readiness_status?: string;
    monitoring_status?: string;
    monitoring_owner_hint?: string;
    monitoring_cadence?: string;
    release_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_monitoring_evidence?: string[];
    closure_evidence_required?: string[];
    release_rule?: string;
  }>;
  product_operations_post_closure_monitoring_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    closure_readiness_status?: string;
    monitoring_status?: string;
    monitoring_owner_hint?: string;
    monitoring_cadence?: string;
    release_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_monitoring_evidence?: string[];
    closure_evidence_required?: string[];
    release_rule?: string;
  }>;
  monitoring_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIRuntimePostClosureEvidenceAcceptanceGate = {
  gate_type?: string;
  gate_scope?: string;
  execution_mode?: string;
  acceptance_row_count?: number;
  blocked_acceptance_row_count?: number;
  executive_acceptance_row_count?: number;
  product_operations_acceptance_row_count?: number;
  monitoring_release_status?: string;
  evidence_acceptance_release_status?: string;
  post_closure_evidence_acceptance_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    monitoring_status?: string;
    evidence_acceptance_status?: string;
    acceptance_owner_hint?: string;
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_acceptance_evidence?: string[];
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  blocked_post_closure_evidence_acceptance_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    monitoring_status?: string;
    evidence_acceptance_status?: string;
    acceptance_owner_hint?: string;
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_acceptance_evidence?: string[];
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  executive_post_closure_evidence_acceptance_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    monitoring_status?: string;
    evidence_acceptance_status?: string;
    acceptance_owner_hint?: string;
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_acceptance_evidence?: string[];
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  product_operations_post_closure_evidence_acceptance_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    monitoring_status?: string;
    evidence_acceptance_status?: string;
    acceptance_owner_hint?: string;
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_acceptance_evidence?: string[];
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  evidence_acceptance_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeBroadReleaseReadinessBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  readiness_row_count?: number;
  blocked_readiness_row_count?: number;
  executive_readiness_row_count?: number;
  product_operations_readiness_row_count?: number;
  evidence_acceptance_release_status?: string;
  broad_release_status?: string;
  broad_release_readiness_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    evidence_acceptance_status?: string;
    broad_release_readiness_status?: string;
    release_owner_hint?: string;
    release_due_policy?: string;
    release_decision_rule?: string;
    rollback_condition?: string;
    tenant_enablement_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_broad_release_evidence?: string[];
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  blocked_broad_release_readiness_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    evidence_acceptance_status?: string;
    broad_release_readiness_status?: string;
    release_owner_hint?: string;
    release_due_policy?: string;
    release_decision_rule?: string;
    rollback_condition?: string;
    tenant_enablement_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_broad_release_evidence?: string[];
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  executive_broad_release_readiness_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    evidence_acceptance_status?: string;
    broad_release_readiness_status?: string;
    release_owner_hint?: string;
    release_due_policy?: string;
    release_decision_rule?: string;
    rollback_condition?: string;
    tenant_enablement_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_broad_release_evidence?: string[];
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  product_operations_broad_release_readiness_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    evidence_acceptance_status?: string;
    broad_release_readiness_status?: string;
    release_owner_hint?: string;
    release_due_policy?: string;
    release_decision_rule?: string;
    rollback_condition?: string;
    tenant_enablement_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_broad_release_evidence?: string[];
    acceptance_due_policy?: string;
    acceptance_release_condition?: string;
    monitoring_cadence?: string;
    release_rule?: string;
  }>;
  broad_release_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeTenantEnablementControlQueue = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  control_row_count?: number;
  blocked_control_row_count?: number;
  executive_control_row_count?: number;
  product_operations_control_row_count?: number;
  broad_release_status?: string;
  tenant_enablement_status?: string;
  tenant_enablement_control_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    broad_release_readiness_status?: string;
    tenant_enablement_control_status?: string;
    enablement_owner_hint?: string;
    enablement_due_policy?: string;
    enablement_decision_rule?: string;
    feature_flag_condition?: string;
    customer_success_condition?: string;
    post_enablement_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_tenant_enablement_evidence?: string[];
    release_due_policy?: string;
    release_decision_rule?: string;
    rollback_condition?: string;
    tenant_enablement_condition?: string;
  }>;
  blocked_tenant_enablement_control_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    broad_release_readiness_status?: string;
    tenant_enablement_control_status?: string;
    enablement_owner_hint?: string;
    enablement_due_policy?: string;
    enablement_decision_rule?: string;
    feature_flag_condition?: string;
    customer_success_condition?: string;
    post_enablement_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_tenant_enablement_evidence?: string[];
    release_due_policy?: string;
    release_decision_rule?: string;
    rollback_condition?: string;
    tenant_enablement_condition?: string;
  }>;
  executive_tenant_enablement_control_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    tenant_enablement_control_status?: string;
    enablement_owner_hint?: string;
  }>;
  product_operations_tenant_enablement_control_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    tenant_enablement_control_status?: string;
    enablement_owner_hint?: string;
  }>;
  tenant_enablement_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimePostEnablementHealthWatchlist = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  watch_row_count?: number;
  blocked_watch_row_count?: number;
  executive_watch_row_count?: number;
  product_operations_watch_row_count?: number;
  tenant_enablement_status?: string;
  post_enablement_health_status?: string;
  post_enablement_health_watch_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    tenant_enablement_control_status?: string;
    post_enablement_health_status?: string;
    health_watch_owner_hint?: string;
    health_watch_cadence?: string;
    health_watch_decision_rule?: string;
    rollout_freeze_condition?: string;
    rollback_reconfirmation_condition?: string;
    customer_success_feedback_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_post_enablement_health_evidence?: string[];
    enablement_due_policy?: string;
    enablement_decision_rule?: string;
    feature_flag_condition?: string;
    post_enablement_monitoring_condition?: string;
  }>;
  blocked_post_enablement_health_watch_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    tenant_enablement_control_status?: string;
    post_enablement_health_status?: string;
    health_watch_owner_hint?: string;
    health_watch_cadence?: string;
    health_watch_decision_rule?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_post_enablement_health_evidence?: string[];
  }>;
  executive_post_enablement_health_watch_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_enablement_health_status?: string;
    health_watch_owner_hint?: string;
  }>;
  product_operations_post_enablement_health_watch_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_enablement_health_status?: string;
    health_watch_owner_hint?: string;
  }>;
  post_enablement_health_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementIncidentResponseQueue = {
  queue_type?: string;
  queue_scope?: string;
  execution_mode?: string;
  incident_row_count?: number;
  blocked_incident_row_count?: number;
  executive_incident_row_count?: number;
  product_operations_incident_row_count?: number;
  post_enablement_health_status?: string;
  incident_response_status?: string;
  post_enablement_incident_response_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_enablement_health_status?: string;
    incident_response_status?: string;
    incident_owner_hint?: string;
    incident_review_cadence?: string;
    incident_decision_rule?: string;
    rollout_pause_condition?: string;
    rollback_decision_condition?: string;
    customer_communication_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_incident_response_evidence?: string[];
    health_watch_cadence?: string;
    health_watch_decision_rule?: string;
    rollout_freeze_condition?: string;
    rollback_reconfirmation_condition?: string;
  }>;
  blocked_post_enablement_incident_response_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_response_status?: string;
    incident_owner_hint?: string;
    required_incident_response_evidence?: string[];
  }>;
  executive_post_enablement_incident_response_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_response_status?: string;
    incident_owner_hint?: string;
  }>;
  product_operations_post_enablement_incident_response_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_response_status?: string;
    incident_owner_hint?: string;
  }>;
  incident_response_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementIncidentClosureBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  closure_row_count?: number;
  blocked_closure_row_count?: number;
  executive_closure_row_count?: number;
  product_operations_closure_row_count?: number;
  incident_response_status?: string;
  incident_closure_status?: string;
  post_enablement_incident_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_response_status?: string;
    incident_closure_status?: string;
    closure_owner_hint?: string;
    closure_review_cadence?: string;
    closure_decision_rule?: string;
    rollout_resume_condition?: string;
    prevention_action_condition?: string;
    customer_follow_up_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_incident_closure_evidence?: string[];
    rollout_pause_condition?: string;
    rollback_decision_condition?: string;
    customer_communication_condition?: string;
  }>;
  blocked_post_enablement_incident_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_closure_status?: string;
    closure_owner_hint?: string;
    required_incident_closure_evidence?: string[];
  }>;
  executive_post_enablement_incident_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_closure_status?: string;
    closure_owner_hint?: string;
  }>;
  product_operations_post_enablement_incident_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_closure_status?: string;
    closure_owner_hint?: string;
  }>;
  incident_closure_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementPreventionVerificationBacklog = {
  backlog_type?: string;
  backlog_scope?: string;
  execution_mode?: string;
  prevention_row_count?: number;
  blocked_prevention_row_count?: number;
  executive_prevention_row_count?: number;
  product_operations_prevention_row_count?: number;
  incident_closure_status?: string;
  prevention_verification_status?: string;
  post_enablement_prevention_verification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    incident_closure_status?: string;
    prevention_verification_status?: string;
    prevention_owner_hint?: string;
    prevention_review_cadence?: string;
    prevention_decision_rule?: string;
    rollout_resume_guardrail?: string;
    monitoring_reentry_condition?: string;
    customer_success_follow_up_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_prevention_verification_evidence?: string[];
    rollout_resume_condition?: string;
    prevention_action_condition?: string;
    customer_follow_up_condition?: string;
  }>;
  blocked_post_enablement_prevention_verification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    prevention_verification_status?: string;
    prevention_owner_hint?: string;
    required_prevention_verification_evidence?: string[];
  }>;
  executive_post_enablement_prevention_verification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    prevention_verification_status?: string;
    prevention_owner_hint?: string;
  }>;
  product_operations_post_enablement_prevention_verification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    prevention_verification_status?: string;
    prevention_owner_hint?: string;
  }>;
  prevention_verification_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIRuntimePostEnablementRolloutResumeAuthorizationLedger = {
  ledger_type?: string;
  ledger_scope?: string;
  execution_mode?: string;
  authorization_row_count?: number;
  blocked_authorization_row_count?: number;
  executive_authorization_row_count?: number;
  product_operations_authorization_row_count?: number;
  prevention_verification_status?: string;
  rollout_resume_authorization_status?: string;
  post_enablement_rollout_resume_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    prevention_verification_status?: string;
    rollout_resume_authorization_status?: string;
    authorization_owner_hint?: string;
    authorization_review_cadence?: string;
    authorization_decision_rule?: string;
    tenant_scope_resume_condition?: string;
    rollback_reconfirmation_condition?: string;
    customer_success_resume_condition?: string;
    post_resume_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_rollout_resume_authorization_evidence?: string[];
    rollout_resume_guardrail?: string;
    monitoring_reentry_condition?: string;
    customer_success_follow_up_condition?: string;
  }>;
  blocked_post_enablement_rollout_resume_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_resume_authorization_status?: string;
    authorization_owner_hint?: string;
    required_rollout_resume_authorization_evidence?: string[];
  }>;
  executive_post_enablement_rollout_resume_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_resume_authorization_status?: string;
    authorization_owner_hint?: string;
  }>;
  product_operations_post_enablement_rollout_resume_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_resume_authorization_status?: string;
    authorization_owner_hint?: string;
  }>;
  rollout_resume_authorization_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementRolloutResumeObservationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  observation_row_count?: number;
  blocked_observation_row_count?: number;
  executive_observation_row_count?: number;
  product_operations_observation_row_count?: number;
  rollout_resume_authorization_status?: string;
  post_resume_observation_status?: string;
  post_enablement_rollout_resume_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_resume_authorization_status?: string;
    post_resume_observation_status?: string;
    observation_owner_hint?: string;
    observation_window_policy?: string;
    tenant_scope_observation_condition?: string;
    runtime_health_metric_condition?: string;
    customer_success_feedback_condition?: string;
    rollback_readiness_condition?: string;
    rollout_scope_expansion_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_post_resume_observation_evidence?: string[];
    rollout_resume_guardrail?: string;
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_rollout_resume_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_resume_observation_status?: string;
    observation_owner_hint?: string;
    required_post_resume_observation_evidence?: string[];
  }>;
  executive_post_enablement_rollout_resume_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_resume_observation_status?: string;
    observation_owner_hint?: string;
  }>;
  product_operations_post_enablement_rollout_resume_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_resume_observation_status?: string;
    observation_owner_hint?: string;
  }>;
  post_resume_observation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  expansion_authorization_row_count?: number;
  blocked_expansion_authorization_row_count?: number;
  executive_expansion_authorization_row_count?: number;
  product_operations_expansion_authorization_row_count?: number;
  post_resume_observation_status?: string;
  rollout_scope_expansion_authorization_status?: string;
  post_enablement_rollout_scope_expansion_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    post_resume_observation_status?: string;
    rollout_scope_expansion_authorization_status?: string;
    expansion_authorization_owner_hint?: string;
    expansion_authorization_cadence?: string;
    limited_scope_health_condition?: string;
    tenant_scope_expansion_condition?: string;
    customer_success_expansion_condition?: string;
    rollback_expanded_scope_condition?: string;
    expanded_scope_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_rollout_scope_expansion_authorization_evidence?: string[];
    rollout_scope_expansion_condition?: string;
    rollout_resume_guardrail?: string;
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_rollout_scope_expansion_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_scope_expansion_authorization_status?: string;
    expansion_authorization_owner_hint?: string;
    required_rollout_scope_expansion_authorization_evidence?: string[];
  }>;
  executive_post_enablement_rollout_scope_expansion_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_scope_expansion_authorization_status?: string;
    expansion_authorization_owner_hint?: string;
  }>;
  product_operations_post_enablement_rollout_scope_expansion_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_scope_expansion_authorization_status?: string;
    expansion_authorization_owner_hint?: string;
  }>;
  rollout_scope_expansion_authorization_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimePostEnablementExpandedScopeHealthBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  expanded_scope_health_row_count?: number;
  blocked_expanded_scope_health_row_count?: number;
  executive_expanded_scope_health_row_count?: number;
  product_operations_expanded_scope_health_row_count?: number;
  rollout_scope_expansion_authorization_status?: string;
  expanded_scope_health_status?: string;
  post_enablement_expanded_scope_health_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_scope_expansion_authorization_status?: string;
    expanded_scope_health_status?: string;
    expanded_scope_health_owner_hint?: string;
    expanded_scope_health_cadence?: string;
    expanded_scope_tenant_sample_condition?: string;
    expanded_scope_runtime_health_condition?: string;
    expanded_scope_customer_success_condition?: string;
    expanded_scope_incident_condition?: string;
    expanded_scope_rollback_condition?: string;
    further_rollout_growth_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_expanded_scope_health_evidence?: string[];
    rollout_resume_guardrail?: string;
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_expanded_scope_health_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    expanded_scope_health_status?: string;
    expanded_scope_health_owner_hint?: string;
    required_expanded_scope_health_evidence?: string[];
  }>;
  executive_post_enablement_expanded_scope_health_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    expanded_scope_health_status?: string;
    expanded_scope_health_owner_hint?: string;
  }>;
  product_operations_post_enablement_expanded_scope_health_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    expanded_scope_health_status?: string;
    expanded_scope_health_owner_hint?: string;
  }>;
  expanded_scope_health_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementRolloutGrowthAuthorizationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  rollout_growth_authorization_row_count?: number;
  blocked_rollout_growth_authorization_row_count?: number;
  executive_rollout_growth_authorization_row_count?: number;
  product_operations_rollout_growth_authorization_row_count?: number;
  expanded_scope_health_status?: string;
  rollout_growth_authorization_status?: string;
  post_enablement_rollout_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    expanded_scope_health_status?: string;
    rollout_growth_authorization_status?: string;
    rollout_growth_owner_hint?: string;
    rollout_growth_review_cadence?: string;
    expanded_scope_health_acceptance_condition?: string;
    rollout_growth_business_justification_condition?: string;
    customer_success_growth_condition?: string;
    support_capacity_growth_condition?: string;
    rollback_growth_scope_condition?: string;
    growth_scope_monitoring_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_rollout_growth_authorization_evidence?: string[];
    further_rollout_growth_condition?: string;
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_rollout_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_authorization_status?: string;
    rollout_growth_owner_hint?: string;
    required_rollout_growth_authorization_evidence?: string[];
  }>;
  executive_post_enablement_rollout_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_authorization_status?: string;
    rollout_growth_owner_hint?: string;
  }>;
  product_operations_post_enablement_rollout_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_authorization_status?: string;
    rollout_growth_owner_hint?: string;
  }>;
  rollout_growth_authorization_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementRolloutGrowthObservationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  rollout_growth_observation_row_count?: number;
  blocked_rollout_growth_observation_row_count?: number;
  executive_rollout_growth_observation_row_count?: number;
  product_operations_rollout_growth_observation_row_count?: number;
  rollout_growth_authorization_status?: string;
  rollout_growth_observation_status?: string;
  post_enablement_rollout_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_authorization_status?: string;
    rollout_growth_observation_status?: string;
    rollout_growth_observation_owner_hint?: string;
    rollout_growth_observation_cadence?: string;
    growth_authorization_acceptance_condition?: string;
    growth_scope_tenant_sample_condition?: string;
    growth_scope_runtime_health_condition?: string;
    growth_scope_incident_condition?: string;
    customer_success_growth_feedback_condition?: string;
    support_growth_capacity_condition?: string;
    rollback_growth_readiness_condition?: string;
    next_growth_step_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_rollout_growth_observation_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_rollout_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_observation_status?: string;
    rollout_growth_observation_owner_hint?: string;
    required_rollout_growth_observation_evidence?: string[];
  }>;
  executive_post_enablement_rollout_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_observation_status?: string;
    rollout_growth_observation_owner_hint?: string;
  }>;
  product_operations_post_enablement_rollout_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_observation_status?: string;
    rollout_growth_observation_owner_hint?: string;
  }>;
  rollout_growth_observation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementRolloutGrowthNextStepGate = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  next_growth_step_gate_row_count?: number;
  blocked_next_growth_step_gate_row_count?: number;
  executive_next_growth_step_gate_row_count?: number;
  product_operations_next_growth_step_gate_row_count?: number;
  rollout_growth_observation_status?: string;
  next_growth_step_gate_status?: string;
  post_enablement_rollout_growth_next_step_gate_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    rollout_growth_observation_status?: string;
    next_growth_step_gate_status?: string;
    next_growth_step_gate_owner_hint?: string;
    next_growth_step_gate_due_policy?: string;
    growth_observation_acceptance_condition?: string;
    next_growth_business_condition?: string;
    customer_success_capacity_condition?: string;
    support_capacity_condition?: string;
    runtime_monitoring_condition?: string;
    rollback_owner_condition?: string;
    next_growth_step_release_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_next_growth_step_gate_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_rollout_growth_next_step_gate_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_growth_step_gate_status?: string;
    next_growth_step_gate_owner_hint?: string;
    required_next_growth_step_gate_evidence?: string[];
  }>;
  executive_post_enablement_rollout_growth_next_step_gate_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_growth_step_gate_status?: string;
    next_growth_step_gate_owner_hint?: string;
  }>;
  product_operations_post_enablement_rollout_growth_next_step_gate_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_growth_step_gate_status?: string;
    next_growth_step_gate_owner_hint?: string;
  }>;
  next_growth_step_gate_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementNextWaveObservationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  next_wave_observation_row_count?: number;
  blocked_next_wave_observation_row_count?: number;
  executive_next_wave_observation_row_count?: number;
  product_operations_next_wave_observation_row_count?: number;
  next_growth_step_gate_status?: string;
  next_wave_observation_status?: string;
  post_enablement_next_wave_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_growth_step_gate_status?: string;
    next_wave_observation_status?: string;
    next_wave_observation_owner_hint?: string;
    next_wave_observation_cadence?: string;
    next_growth_step_gate_acceptance_condition?: string;
    next_wave_tenant_scope_condition?: string;
    next_wave_runtime_health_condition?: string;
    next_wave_incident_condition?: string;
    customer_success_next_wave_feedback_condition?: string;
    support_next_wave_capacity_condition?: string;
    rollback_next_wave_readiness_condition?: string;
    additional_growth_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_next_wave_observation_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_next_wave_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_wave_observation_status?: string;
    next_wave_observation_owner_hint?: string;
    required_next_wave_observation_evidence?: string[];
  }>;
  executive_post_enablement_next_wave_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_wave_observation_status?: string;
    next_wave_observation_owner_hint?: string;
  }>;
  product_operations_post_enablement_next_wave_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_wave_observation_status?: string;
    next_wave_observation_owner_hint?: string;
  }>;
  next_wave_observation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementAdditionalGrowthAuthorizationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  additional_growth_authorization_row_count?: number;
  blocked_additional_growth_authorization_row_count?: number;
  executive_additional_growth_authorization_row_count?: number;
  product_operations_additional_growth_authorization_row_count?: number;
  next_wave_observation_status?: string;
  additional_growth_authorization_status?: string;
  post_enablement_additional_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    next_wave_observation_status?: string;
    additional_growth_authorization_status?: string;
    additional_growth_authorization_owner_hint?: string;
    next_wave_observation_acceptance_condition?: string;
    additional_growth_business_condition?: string;
    additional_growth_scope_condition?: string;
    customer_success_additional_growth_condition?: string;
    support_additional_growth_condition?: string;
    runtime_monitoring_additional_growth_condition?: string;
    rollback_additional_growth_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_additional_growth_authorization_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_additional_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_authorization_status?: string;
    additional_growth_authorization_owner_hint?: string;
    required_additional_growth_authorization_evidence?: string[];
  }>;
  executive_post_enablement_additional_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_authorization_status?: string;
    additional_growth_authorization_owner_hint?: string;
  }>;
  product_operations_post_enablement_additional_growth_authorization_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_authorization_status?: string;
    additional_growth_authorization_owner_hint?: string;
  }>;
  additional_growth_authorization_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIRuntimePostEnablementAdditionalGrowthObservationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  additional_growth_observation_row_count?: number;
  blocked_additional_growth_observation_row_count?: number;
  executive_additional_growth_observation_row_count?: number;
  product_operations_additional_growth_observation_row_count?: number;
  additional_growth_authorization_status?: string;
  additional_growth_observation_status?: string;
  post_enablement_additional_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_authorization_status?: string;
    additional_growth_observation_status?: string;
    additional_growth_observation_owner_hint?: string;
    additional_growth_observation_cadence?: string;
    additional_growth_authorization_acceptance_condition?: string;
    additional_growth_tenant_scope_condition?: string;
    additional_growth_runtime_health_condition?: string;
    additional_growth_incident_condition?: string;
    customer_success_additional_growth_feedback_condition?: string;
    support_additional_growth_capacity_condition?: string;
    rollback_additional_growth_readiness_condition?: string;
    further_growth_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_additional_growth_observation_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_additional_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_observation_status?: string;
    additional_growth_observation_owner_hint?: string;
    required_additional_growth_observation_evidence?: string[];
  }>;
  executive_post_enablement_additional_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_observation_status?: string;
    additional_growth_observation_owner_hint?: string;
  }>;
  product_operations_post_enablement_additional_growth_observation_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_observation_status?: string;
    additional_growth_observation_owner_hint?: string;
  }>;
  additional_growth_observation_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};




type UnifiedAIRuntimePostEnablementFurtherGrowthExitCriteriaBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  further_growth_exit_row_count?: number;
  blocked_further_growth_exit_row_count?: number;
  executive_further_growth_exit_row_count?: number;
  product_operations_further_growth_exit_row_count?: number;
  additional_growth_observation_status?: string;
  further_growth_exit_status?: string;
  post_enablement_further_growth_exit_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    additional_growth_observation_status?: string;
    further_growth_exit_status?: string;
    further_growth_exit_owner_hint?: string;
    additional_growth_observation_acceptance_condition?: string;
    runtime_health_stability_condition?: string;
    incident_free_window_condition?: string;
    customer_success_exit_condition?: string;
    support_exit_condition?: string;
    rollback_exit_condition?: string;
    further_growth_exit_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_further_growth_exit_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_further_growth_exit_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    further_growth_exit_status?: string;
    further_growth_exit_owner_hint?: string;
    required_further_growth_exit_evidence?: string[];
  }>;
  executive_post_enablement_further_growth_exit_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    further_growth_exit_status?: string;
    further_growth_exit_owner_hint?: string;
  }>;
  product_operations_post_enablement_further_growth_exit_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    further_growth_exit_status?: string;
    further_growth_exit_owner_hint?: string;
  }>;
  further_growth_exit_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementSteadyStateCertificationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_certification_row_count?: number;
  blocked_steady_state_certification_row_count?: number;
  executive_steady_state_certification_row_count?: number;
  product_operations_steady_state_certification_row_count?: number;
  further_growth_exit_status?: string;
  steady_state_certification_status?: string;
  post_enablement_steady_state_certification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    further_growth_exit_status?: string;
    steady_state_certification_status?: string;
    steady_state_certification_owner_hint?: string;
    further_growth_exit_acceptance_condition?: string;
    runtime_health_baseline_condition?: string;
    incident_review_condition?: string;
    customer_success_certification_condition?: string;
    support_certification_condition?: string;
    rollback_certification_condition?: string;
    steady_state_certification_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_certification_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_steady_state_certification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_certification_status?: string;
    steady_state_certification_owner_hint?: string;
    required_steady_state_certification_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_certification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_certification_status?: string;
    steady_state_certification_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_certification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_certification_status?: string;
    steady_state_certification_owner_hint?: string;
  }>;
  steady_state_certification_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementSteadyStateMonitoringCadenceBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_monitoring_cadence_row_count?: number;
  blocked_steady_state_monitoring_cadence_row_count?: number;
  executive_steady_state_monitoring_cadence_row_count?: number;
  product_operations_steady_state_monitoring_cadence_row_count?: number;
  steady_state_certification_status?: string;
  steady_state_monitoring_cadence_status?: string;
  post_enablement_steady_state_monitoring_cadence_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_certification_status?: string;
    steady_state_monitoring_cadence_status?: string;
    steady_state_monitoring_cadence_owner_hint?: string;
    steady_state_certification_acceptance_condition?: string;
    recurring_runtime_health_review_condition?: string;
    recurring_incident_review_condition?: string;
    customer_success_feedback_cadence_condition?: string;
    support_escalation_cadence_condition?: string;
    rollback_reconfirmation_cadence_condition?: string;
    steady_state_monitoring_cadence_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_monitoring_cadence_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_steady_state_monitoring_cadence_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_monitoring_cadence_status?: string;
    steady_state_monitoring_cadence_owner_hint?: string;
    required_steady_state_monitoring_cadence_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_monitoring_cadence_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_monitoring_cadence_status?: string;
    steady_state_monitoring_cadence_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_monitoring_cadence_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_monitoring_cadence_status?: string;
    steady_state_monitoring_cadence_owner_hint?: string;
  }>;
  steady_state_monitoring_cadence_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_exception_review_row_count?: number;
  blocked_steady_state_exception_review_row_count?: number;
  executive_steady_state_exception_review_row_count?: number;
  product_operations_steady_state_exception_review_row_count?: number;
  steady_state_monitoring_cadence_status?: string;
  steady_state_exception_review_status?: string;
  post_enablement_steady_state_exception_review_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_monitoring_cadence_status?: string;
    steady_state_exception_review_status?: string;
    steady_state_exception_review_owner_hint?: string;
    monitoring_cadence_acceptance_condition?: string;
    runtime_exception_threshold_condition?: string;
    customer_success_exception_condition?: string;
    support_exception_condition?: string;
    rollback_exception_condition?: string;
    steady_state_exception_review_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_exception_review_evidence?: string[];
    monitoring_reentry_condition?: string;
  }>;
  blocked_post_enablement_steady_state_exception_review_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_review_status?: string;
    steady_state_exception_review_owner_hint?: string;
    required_steady_state_exception_review_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_exception_review_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_review_status?: string;
    steady_state_exception_review_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_exception_review_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_review_status?: string;
    steady_state_exception_review_owner_hint?: string;
  }>;
  steady_state_exception_review_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementSteadyStateExceptionClosureBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_exception_closure_row_count?: number;
  blocked_steady_state_exception_closure_row_count?: number;
  executive_steady_state_exception_closure_row_count?: number;
  product_operations_steady_state_exception_closure_row_count?: number;
  steady_state_exception_review_status?: string;
  steady_state_exception_closure_status?: string;
  post_enablement_steady_state_exception_closure_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_review_status?: string;
    steady_state_exception_closure_status?: string;
    steady_state_exception_closure_owner_hint?: string;
    exception_review_acceptance_condition?: string;
    root_cause_closure_condition?: string;
    customer_success_followup_condition?: string;
    support_followup_condition?: string;
    rollback_reconfirmation_condition?: string;
    monitoring_reentry_condition?: string;
    steady_state_exception_closure_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_exception_closure_evidence?: string[];
  }>;
  blocked_post_enablement_steady_state_exception_closure_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_closure_status?: string;
    steady_state_exception_closure_owner_hint?: string;
    required_steady_state_exception_closure_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_exception_closure_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_closure_status?: string;
    steady_state_exception_closure_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_exception_closure_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_closure_status?: string;
    steady_state_exception_closure_owner_hint?: string;
  }>;
  steady_state_exception_closure_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_exception_recurrence_audit_row_count?: number;
  blocked_steady_state_exception_recurrence_audit_row_count?: number;
  executive_steady_state_exception_recurrence_audit_row_count?: number;
  product_operations_steady_state_exception_recurrence_audit_row_count?: number;
  steady_state_exception_closure_status?: string;
  steady_state_exception_recurrence_audit_status?: string;
  post_enablement_steady_state_exception_recurrence_audit_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_closure_status?: string;
    steady_state_exception_recurrence_audit_status?: string;
    steady_state_exception_recurrence_owner_hint?: string;
    closure_acceptance_condition?: string;
    recurrence_window_condition?: string;
    recurrence_metric_condition?: string;
    customer_success_recurrence_condition?: string;
    support_recurrence_condition?: string;
    reopen_rule_condition?: string;
    steady_state_exception_recurrence_audit_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_exception_recurrence_audit_evidence?: string[];
  }>;
  blocked_post_enablement_steady_state_exception_recurrence_audit_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_audit_status?: string;
    steady_state_exception_recurrence_owner_hint?: string;
    required_steady_state_exception_recurrence_audit_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_exception_recurrence_audit_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_audit_status?: string;
    steady_state_exception_recurrence_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_exception_recurrence_audit_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_audit_status?: string;
    steady_state_exception_recurrence_owner_hint?: string;
  }>;
  steady_state_exception_recurrence_audit_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_exception_recurrence_resolution_row_count?: number;
  blocked_steady_state_exception_recurrence_resolution_row_count?: number;
  executive_steady_state_exception_recurrence_resolution_row_count?: number;
  product_operations_steady_state_exception_recurrence_resolution_row_count?: number;
  steady_state_exception_recurrence_audit_status?: string;
  steady_state_exception_recurrence_resolution_status?: string;
  post_enablement_steady_state_exception_recurrence_resolution_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_audit_status?: string;
    steady_state_exception_recurrence_resolution_status?: string;
    steady_state_exception_recurrence_resolution_owner_hint?: string;
    recurrence_audit_acceptance_condition?: string;
    recurrence_root_cause_condition?: string;
    recurrence_resolution_action_condition?: string;
    recurrence_prevention_condition?: string;
    customer_success_resolution_condition?: string;
    support_resolution_condition?: string;
    monitoring_reentry_condition?: string;
    steady_state_exception_recurrence_resolution_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_exception_recurrence_resolution_evidence?: string[];
  }>;
  blocked_post_enablement_steady_state_exception_recurrence_resolution_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_resolution_status?: string;
    steady_state_exception_recurrence_resolution_owner_hint?: string;
    required_steady_state_exception_recurrence_resolution_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_exception_recurrence_resolution_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_resolution_status?: string;
    steady_state_exception_recurrence_resolution_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_exception_recurrence_resolution_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_recurrence_resolution_status?: string;
    steady_state_exception_recurrence_resolution_owner_hint?: string;
  }>;
  steady_state_exception_recurrence_resolution_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};



type UnifiedAIRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_exception_resolution_verification_row_count?: number;
  blocked_steady_state_exception_resolution_verification_row_count?: number;
  executive_steady_state_exception_resolution_verification_row_count?: number;
  product_operations_steady_state_exception_resolution_verification_row_count?: number;
  steady_state_exception_recurrence_resolution_status?: string;
  steady_state_exception_resolution_verification_status?: string;
  post_enablement_steady_state_exception_resolution_verification_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_exception_resolution_verification_status?: string;
    steady_state_exception_resolution_verification_owner_hint?: string;
    recurrence_resolution_acceptance_condition?: string;
    resolution_effectiveness_condition?: string;
    resolution_monitoring_sample_condition?: string;
    customer_success_verification_condition?: string;
    support_verification_condition?: string;
    recertification_decision_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_exception_resolution_verification_evidence?: string[];
  }>;
  blocked_post_enablement_steady_state_exception_resolution_verification_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_resolution_verification_status?: string;
    steady_state_exception_resolution_verification_owner_hint?: string;
    required_steady_state_exception_resolution_verification_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_exception_resolution_verification_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_resolution_verification_status?: string;
    steady_state_exception_resolution_verification_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_exception_resolution_verification_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_exception_resolution_verification_status?: string;
    steady_state_exception_resolution_verification_owner_hint?: string;
  }>;
  steady_state_exception_resolution_verification_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimePostEnablementSteadyStateCertificationRenewalBoard = {
  board_type?: string;
  board_scope?: string;
  execution_mode?: string;
  steady_state_certification_renewal_row_count?: number;
  blocked_steady_state_certification_renewal_row_count?: number;
  executive_steady_state_certification_renewal_row_count?: number;
  product_operations_steady_state_certification_renewal_row_count?: number;
  steady_state_exception_resolution_verification_status?: string;
  steady_state_certification_renewal_status?: string;
  post_enablement_steady_state_certification_renewal_rows?: Array<{
    sequence?: number;
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_certification_renewal_status?: string;
    steady_state_certification_renewal_owner_hint?: string;
    certification_renewal_cadence?: string;
    certification_expiration_condition?: string;
    monitoring_history_review_condition?: string;
    unresolved_exception_review_condition?: string;
    customer_success_health_condition?: string;
    support_health_condition?: string;
    recertification_output_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_steady_state_certification_renewal_evidence?: string[];
  }>;
  blocked_post_enablement_steady_state_certification_renewal_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_certification_renewal_status?: string;
    steady_state_certification_renewal_owner_hint?: string;
    required_steady_state_certification_renewal_evidence?: string[];
  }>;
  executive_post_enablement_steady_state_certification_renewal_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_certification_renewal_status?: string;
    steady_state_certification_renewal_owner_hint?: string;
  }>;
  product_operations_post_enablement_steady_state_certification_renewal_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    escalation_tier?: string;
    steady_state_certification_renewal_status?: string;
    steady_state_certification_renewal_owner_hint?: string;
  }>;
  steady_state_certification_renewal_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIRuntimeFinalGovernanceAuditPack = {
  audit_pack_type?: string;
  audit_pack_scope?: string;
  execution_mode?: string;
  final_governance_audit_row_count?: number;
  blocked_final_governance_audit_row_count?: number;
  ready_final_governance_audit_row_count?: number;
  steady_state_certification_renewal_status?: string;
  final_governance_audit_status?: string;
  final_governance_audit_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    steady_state_certification_renewal_status?: string;
    final_governance_audit_status?: string;
    final_governance_audit_owner_hint?: string;
    final_governance_audit_scope?: string;
    final_governance_audit_release_rule?: string;
    contract_freeze_review_condition?: string;
    runtime_evidence_review_condition?: string;
    monitoring_history_review_condition?: string;
    unresolved_exception_review_condition?: string;
    completion_output_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_final_governance_audit_evidence?: string[];
  }>;
  blocked_final_governance_audit_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    final_governance_audit_status?: string;
    final_governance_audit_owner_hint?: string;
    required_final_governance_audit_evidence?: string[];
  }>;
  ready_final_governance_audit_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    final_governance_audit_status?: string;
    final_governance_audit_owner_hint?: string;
  }>;
  final_governance_audit_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAIFinalCompletionFreezeManifest = {
  manifest_type?: string;
  manifest_scope?: string;
  execution_mode?: string;
  contract_version?: string;
  final_governance_audit_status?: string;
  final_completion_freeze_row_count?: number;
  blocked_final_completion_freeze_row_count?: number;
  ready_final_completion_freeze_row_count?: number;
  final_completion_freeze_status?: string;
  final_completion_freeze_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    final_governance_audit_status?: string;
    final_completion_freeze_status?: string;
    final_completion_freeze_owner_hint?: string;
    final_completion_freeze_scope?: string;
    final_completion_freeze_release_rule?: string;
    final_completion_contract_condition?: string;
    final_completion_runtime_condition?: string;
    final_completion_business_condition?: string;
    final_completion_output_condition?: string;
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
    required_final_completion_freeze_evidence?: string[];
  }>;
  blocked_final_completion_freeze_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    final_completion_freeze_status?: string;
    final_completion_freeze_owner_hint?: string;
    required_final_completion_freeze_evidence?: string[];
  }>;
  ready_final_completion_freeze_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    final_completion_freeze_status?: string;
    final_completion_freeze_owner_hint?: string;
  }>;
  final_completion_freeze_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};


type UnifiedAICommercialCompletionCertificate = {
  manifest_type?: string;
  manifest_scope?: string;
  execution_mode?: string;
  contract_version?: string;
  final_completion_freeze_status?: string;
  commercial_completion_certificate_row_count?: number;
  blocked_commercial_completion_certificate_row_count?: number;
  ready_commercial_completion_certificate_row_count?: number;
  commercial_completion_certificate_status?: string;
  ai_governance_code_track_status?: string;
  ai_governance_next_best_move?: string;
  commercial_completion_certificate_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    production_priority?: string;
    escalation_tier?: string;
    final_completion_freeze_status?: string;
    commercial_completion_certificate_status?: string;
    commercial_completion_certificate_owner_hint?: string;
    commercial_completion_certificate_scope?: string;
    commercial_completion_certificate_rule?: string;
    commercial_claim_rule?: string;
    code_completion_condition?: string;
    runtime_proof_condition?: string;
    external_launch_condition?: string;
    required_certificate_evidence?: string[];
    open_runtime_gap_count?: number;
    open_runtime_gaps?: string[];
  }>;
  blocked_commercial_completion_certificate_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    commercial_completion_certificate_status?: string;
    commercial_completion_certificate_owner_hint?: string;
    required_certificate_evidence?: string[];
  }>;
  ready_commercial_completion_certificate_rows?: Array<{
    feature_key?: string;
    feature_label?: string;
    commercial_completion_certificate_status?: string;
    commercial_completion_certificate_owner_hint?: string;
  }>;
  remaining_external_proof_requirements?: string[];
  next_non_ai_track_recommendation?: {
    track_name?: string;
    recommended_scope?: string[];
  };
  commercial_completion_certificate_policy?: Record<string, boolean>;
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIContractFreezeManifest = {
  manifest_type?: string;
  manifest_scope?: string;
  execution_mode?: string;
  contract_version?: string;
  frozen_key_count?: number;
  expected_key_count_matches_registered_contract?: boolean;
  registered_contract_key_count?: number;
  returned_key_count?: number;
  freeze_status?: string;
  frozen_response_keys?: string[];
  returned_unified_ai_keys?: string[];
  missing_response_keys?: string[];
  unexpected_response_keys?: string[];
  required_frontend_panel_manifest?: Array<{
    sequence?: number;
    response_key?: string;
    required_frontend_panel_key?: string;
    required_backend_contract?: string;
    required_frontend_panel_dom_attribute?: string;
    breaking_change_rule?: string;
  }>;
  contract_version_alignment_policy?: {
    version_must_change_when?: string[];
    current_alignment_statement?: string;
    stale_version_labels_allowed?: boolean;
  };
  change_control_policy?: {
    adding_key_requires?: string[];
    removing_or_renaming_key_requires?: string[];
    static_placeholder_panels_allowed?: boolean;
  };
  safety_contract?: Record<string, boolean>;
};

type UnifiedAIResponseContractAudit = {
  audit_type?: string;
  audit_scope?: string;
  execution_mode?: string;
  expected_key_count?: number;
  returned_key_count?: number;
  response_contract_self_included?: boolean;
  safety_contract_coverage_percent?: number;
  contract_status?: string;
  expected_response_keys?: string[];
  returned_unified_ai_keys?: string[];
  missing_response_keys?: string[];
  unexpected_response_keys?: string[];
  missing_or_unsafe_safety_contract_keys?: string[];
  required_frontend_panel_count?: number;
  frontend_panel_contract_status?: string;
  frontend_required_panels?: Array<{
    sequence?: number;
    response_key?: string;
    panel_key?: string;
    required_panel_label?: string;
    required_panel_dom_attribute?: string;
    required_rendering?: string;
    static_placeholder_allowed?: boolean;
  }>;
  frontend_panel_coverage_policy?: {
    panel_count_must_match_frozen_response_key_count?: boolean;
    frontend_panels_must_render_real_backend_response_keys?: boolean;
    frontend_panels_must_have_stable_dom_contract_anchors?: boolean;
    static_placeholder_panels_allowed?: boolean;
    adding_or_renaming_panel_requires_contract_version_update?: boolean;
  };
  frontend_runtime_anchor_self_check_contract?: {
    required?: boolean;
    source_of_truth?: string;
    aligned_status_value?: string;
    drift_status_value?: string;
    failure_policy?: string;
    order_sensitive?: boolean;
    ordered_status_value?: string;
    order_drift_status_value?: string;
  };
  safety_contract?: Record<string, boolean>;
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
  unified_ai_capability_inventory?: UnifiedAICapabilityInventory;
  unified_ai_risk_scoring?: UnifiedAIRiskScoring;
  unified_ai_decision_lineage?: UnifiedAIDecisionLineage;
  unified_ai_rollback_orchestration?: UnifiedAIRollbackOrchestration;
  unified_ai_maturity_self_audit?: UnifiedAIMaturitySelfAudit;
  unified_ai_governance_dashboard?: UnifiedAIGovernanceDashboard;
  unified_ai_commercial_release_gate?: UnifiedAICommercialReleaseGate;
  unified_ai_commercial_release_evidence_dossier?: UnifiedAICommercialReleaseEvidenceDossier;
  unified_ai_route_exposure_audit?: UnifiedAIRouteExposureAudit;
  unified_ai_runtime_coverage_audit?: UnifiedAIRuntimeCoverageAudit;
  unified_ai_runtime_remediation_worklist?: UnifiedAIRuntimeRemediationWorklist;
  unified_ai_runtime_validation_drill?: UnifiedAIRuntimeValidationDrill;
  unified_ai_runtime_signoff_evidence_ledger?: UnifiedAIRuntimeSignoffEvidenceLedger;
  unified_ai_runtime_waiver_review_register?: UnifiedAIRuntimeWaiverReviewRegister;
  unified_ai_runtime_waiver_escalation_matrix?: UnifiedAIRuntimeWaiverEscalationMatrix;
  unified_ai_runtime_waiver_closure_board?: UnifiedAIRuntimeWaiverClosureBoard;
  unified_ai_runtime_post_closure_monitoring_plan?: UnifiedAIRuntimePostClosureMonitoringPlan;
  unified_ai_runtime_post_closure_evidence_acceptance_gate?: UnifiedAIRuntimePostClosureEvidenceAcceptanceGate;
  unified_ai_runtime_broad_release_readiness_board?: UnifiedAIRuntimeBroadReleaseReadinessBoard;
  unified_ai_runtime_tenant_enablement_control_queue?: UnifiedAIRuntimeTenantEnablementControlQueue;
  unified_ai_runtime_post_enablement_health_watchlist?: UnifiedAIRuntimePostEnablementHealthWatchlist;
  unified_ai_runtime_post_enablement_incident_response_queue?: UnifiedAIRuntimePostEnablementIncidentResponseQueue;
  unified_ai_runtime_post_enablement_incident_closure_board?: UnifiedAIRuntimePostEnablementIncidentClosureBoard;
  unified_ai_runtime_post_enablement_prevention_verification_backlog?: UnifiedAIRuntimePostEnablementPreventionVerificationBacklog;
  unified_ai_runtime_post_enablement_rollout_resume_authorization_ledger?: UnifiedAIRuntimePostEnablementRolloutResumeAuthorizationLedger;
  unified_ai_runtime_post_enablement_rollout_resume_observation_board?: UnifiedAIRuntimePostEnablementRolloutResumeObservationBoard;
  unified_ai_runtime_post_enablement_rollout_scope_expansion_authorization_board?: UnifiedAIRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard;
  unified_ai_runtime_post_enablement_expanded_scope_health_board?: UnifiedAIRuntimePostEnablementExpandedScopeHealthBoard;
  unified_ai_runtime_post_enablement_rollout_growth_authorization_board?: UnifiedAIRuntimePostEnablementRolloutGrowthAuthorizationBoard;
  unified_ai_runtime_post_enablement_rollout_growth_observation_board?: UnifiedAIRuntimePostEnablementRolloutGrowthObservationBoard;
  unified_ai_runtime_post_enablement_rollout_growth_next_step_gate?: UnifiedAIRuntimePostEnablementRolloutGrowthNextStepGate;
  unified_ai_runtime_post_enablement_next_wave_observation_board?: UnifiedAIRuntimePostEnablementNextWaveObservationBoard;
  unified_ai_runtime_post_enablement_additional_growth_authorization_board?: UnifiedAIRuntimePostEnablementAdditionalGrowthAuthorizationBoard;
  unified_ai_runtime_post_enablement_additional_growth_observation_board?: UnifiedAIRuntimePostEnablementAdditionalGrowthObservationBoard;
  unified_ai_runtime_post_enablement_further_growth_exit_criteria_board?: UnifiedAIRuntimePostEnablementFurtherGrowthExitCriteriaBoard;
  unified_ai_runtime_post_enablement_steady_state_certification_board?: UnifiedAIRuntimePostEnablementSteadyStateCertificationBoard;
  unified_ai_runtime_post_enablement_steady_state_monitoring_cadence_board?: UnifiedAIRuntimePostEnablementSteadyStateMonitoringCadenceBoard;
  unified_ai_runtime_post_enablement_steady_state_monitoring_exception_review_queue?: UnifiedAIRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue;
  unified_ai_runtime_post_enablement_steady_state_exception_closure_board?: UnifiedAIRuntimePostEnablementSteadyStateExceptionClosureBoard;
  unified_ai_runtime_post_enablement_steady_state_exception_recurrence_audit_board?: UnifiedAIRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard;
  unified_ai_runtime_post_enablement_steady_state_exception_recurrence_resolution_board?: UnifiedAIRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard;
  unified_ai_runtime_post_enablement_steady_state_exception_resolution_verification_board?: UnifiedAIRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard;
  unified_ai_runtime_post_enablement_steady_state_certification_renewal_board?: UnifiedAIRuntimePostEnablementSteadyStateCertificationRenewalBoard;
  unified_ai_runtime_final_governance_audit_pack?: UnifiedAIRuntimeFinalGovernanceAuditPack;
  unified_ai_final_completion_freeze_manifest?: UnifiedAIFinalCompletionFreezeManifest;
  unified_ai_commercial_completion_certificate?: UnifiedAICommercialCompletionCertificate;
  unified_ai_contract_freeze_manifest?: UnifiedAIContractFreezeManifest;
  unified_ai_response_contract_audit?: UnifiedAIResponseContractAudit;
  features?: IntelligenceProductionFeature[];
};

type IntelligenceProductionReadinessAuditPackResponse = {
  generated_at?: string;
  tenant_id?: string;
  scope?: string;
  safety_contract?: Record<string, boolean>;
  audit_pack?: IntelligenceProductionAuditPack;
  production_backlog?: IntelligenceProductionBacklogItem[];
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
  source_action_domain?: string;
  source_reference?: {
    source_type?: string | null;
    source_id?: string | null;
    frontend_route?: string | null;
    frontend_route_query?: string | null;
    api_surface?: string | null;
  };
  ai_operation_domain?: string;
  review_state?: string;
  urgency?: string;
  title?: string;
  summary?: string | null;
  confidence_visualization?: {
    confidence_score?: number | null;
    confidence_band?: string;
    visualization_type?: string;
    score_source?: string;
    advisory_only?: boolean;
  };
  explainability_review?: {
    primary_factors?: string[];
    source_surface?: string;
    source_api_surface?: string | null;
    reasoning_visible_to_human?: boolean;
    human_action_only?: boolean;
  };
  simulation_preview?: {
    preview_available?: boolean;
    preview_kind?: string;
    preview_summary_key?: string | null;
    preview_summary?: string;
    preview_metrics?: Record<string, number | string | boolean | null>;
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
  lifecycle?: {
    lifecycle_id?: string;
    persisted?: boolean;
    current_status?: string;
    decision?: string | null;
    reason_category?: string | null;
    reviewer_notes?: string | null;
    override_reason?: string | null;
    reviewer_user_id?: string | null;
    reviewer_role?: string | null;
    execution_request_id?: string | null;
    execution_request_status?: string | null;
    execution_request_execution_status?: string | null;
    escalation_target_role?: EscalationTargetRole | null;
    escalation_due_at?: string | null;
    escalation_assigned_at?: string | null;
    escalation_resolved_at?: string | null;
    first_reviewed_at?: string | null;
    last_reviewed_at?: string | null;
    version?: number | null;
    allowed_decisions?: ReviewDecision[];
    updated_at?: string | null;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type AIReviewHistoryResponse = {
  source?: {
    source_action_id?: string;
    source_type?: string;
    source_id?: string;
    ai_operation_domain?: string;
    source_status?: string;
    title?: string;
    summary?: string | null;
    confidence_score?: number | null;
    approval_required?: boolean;
    updated_at?: string | null;
  };
  lifecycle?: HumanAIReview['lifecycle'];
  events?: Array<{
    id?: string;
    event_type?: string;
    from_status?: string | null;
    to_status?: string;
    decision?: string | null;
    reason_category?: string | null;
    reviewer_notes?: string | null;
    override_reason?: string | null;
    actor_user_id?: string | null;
    actor_role?: string | null;
    actor_name?: string | null;
    actor_email?: string | null;
    execution_request_id?: string | null;
    metadata?: {
      escalation_target_role?: EscalationTargetRole | null;
      escalation_due_at?: string | null;
      previous_escalation?: { target_role?: EscalationTargetRole | null; due_at?: string | null } | null;
      resolved_escalation?: { target_role?: EscalationTargetRole | null; due_at?: string | null } | null;
      reopened_from_execution_request?: { id?: string; status?: string; execution_status?: string | null } | null;
    } | null;
    created_at?: string | null;
  }>;
  execution_request?: { id?: string; status?: string; request_type?: string };
};

type ReviewDecisionDraft = {
  decision: ReviewDecision;
  reason_category: string;
  reviewer_notes: string;
  override_reason: string;
  escalation_target_role: '' | EscalationTargetRole;
  escalation_due_at: string;
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
    active_reviews?: number;
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
    review_queue_guidance_key?: string | null;
    review_queue_guidance?: string;
    confidence_guidance_key?: string | null;
    confidence_guidance?: string;
    override_guidance_key?: string | null;
    override_guidance?: string;
    approval_guidance_key?: string | null;
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
  { value: 'all', label: 'All review categories' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'Governance findings' },
  { value: 'remediation', label: 'Remediation findings' },
  { value: 'simulation', label: 'Simulations' },
  { value: 'optimization', label: 'Optimisation' },
  { value: 'multi_domain', label: 'Cross-area reviews' }
];

const REVIEW_STATE_FILTERS: Array<{ value: 'all' | ReviewState; label: string }> = [
  { value: 'all', label: 'All review states' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'approval_required', label: 'Approval required' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'ready_for_human_decision', label: 'Ready for human decision' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'approved_for_manual_action', label: 'Approved for manual action' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suppressed', label: 'Suppressed' },
  { value: 'execution_request_drafted', label: 'Execution request drafted' }
];

const REVIEW_DECISION_OPTIONS: Array<{ value: ReviewDecision; label: string }> = [
  { value: 'acknowledged', label: 'Acknowledge' },
  { value: 'approved_for_manual_action', label: 'Approve for manual action' },
  { value: 'rejected', label: 'Reject' },
  { value: 'suppressed', label: 'Suppress' },
  { value: 'escalated', label: 'Escalate' },
  { value: 'reopened', label: 'Reopen review' }
];

const REVIEW_REASON_OPTIONS = [
  'risk_context_changed',
  'confidence_too_low',
  'insufficient_evidence',
  'business_policy_exception',
  'manual_execution_preferred',
  'policy_violation',
  'duplicate_or_stale',
  'other'
] as const;

const ESCALATION_TARGET_OPTIONS: Array<{ value: EscalationTargetRole; label: string }> = [
  { value: 'admin', label: 'Tenant Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'decision_intelligence_reviewer', label: 'Any Intelligence reviewer' }
];

const defaultReviewDecisionDraft: ReviewDecisionDraft = {
  decision: 'acknowledged',
  reason_category: '',
  reviewer_notes: '',
  override_reason: '',
  escalation_target_role: '',
  escalation_due_at: ''
};

type IntelligenceReviewView = 'recommendations' | 'readiness';

type ReviewOriginDescription = {
  label: string;
  detail: string;
};

function describeReviewOrigin(review: HumanAIReview, ui: (englishText: string) => string): ReviewOriginDescription {
  const metrics = review.simulation_preview?.preview_metrics || {};
  const provider = typeof metrics.provider === 'string' ? metrics.provider : null;
  const model = typeof metrics.model === 'string' ? metrics.model : null;
  const sharedExternally = metrics.data_shared_externally === true;

  if (provider === 'openai_responses') {
    return {
      label: ui('External AI-assisted explanation'),
      detail: `${model ? `${ui('Model:')} ${model}. ` : ''}${sharedExternally ? ui('Selected tenant evidence was sent to the configured AI provider.') : ui('No external data-sharing flag was reported.')} ${ui('Business values remain controlled by the application.')}`
    };
  }

  if (provider === 'local_rules_fallback') {
    return {
      label: ui('Rule-based fallback'),
      detail: ui('The external AI provider was unavailable or refused the request, so the application produced the explanation with fixed local rules.')
    };
  }

  if (provider === 'local_rules') {
    return {
      label: ui('Rule-based Copilot analysis'),
      detail: ui('The application produced this result with fixed backend rules. No external AI model generated it.')
    };
  }

  if (review.source_reference?.source_type === 'ai_copilot_run') {
    return {
      label: ui('Copilot proposal'),
      detail: ui('This item came from the governed Copilot. The provider information was not included in the returned review evidence.')
    };
  }

  return {
    label: ui('Rule-based intelligence or stored analysis'),
    detail: ui('No external AI model is reported for this item. It comes from calculations, thresholds, simulations, optimisation logic, or stored governance evidence.')
  };
}

const HUMAN_AI_REVIEW_QUERY_KEY = 'human-in-loop-ai-review';
const HUMAN_AI_REVIEW_HISTORY_QUERY_KEY = 'human-in-loop-ai-review-history';
const ACTION_CENTER_QUERY_KEY = 'operational-action-center';

const URGENCY_FILTERS: Array<{ value: 'all' | Urgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))'
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))',
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

const RECOMMENDATION_CANONICAL_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  decision_intelligence: 'Decision intelligence',
  ai_governance: 'Governance findings',
  remediation: 'Remediation findings',
  simulation: 'Simulations',
  optimization: 'Optimisation',
  multi_domain: 'Cross-area reviews',
  pending_review: 'Pending review',
  approval_required: 'Approval required',
  escalated: 'Escalated',
  ready_for_human_decision: 'Ready for human decision',
  acknowledged: 'Acknowledged',
  approved_for_manual_action: 'Approved for manual action',
  rejected: 'Rejected',
  suppressed: 'Suppressed',
  reopened: 'Reopened',
  execution_request_drafted: 'Execution request drafted',
  risk_context_changed: 'Risk context changed',
  confidence_too_low: 'Confidence too low',
  insufficient_evidence: 'Insufficient evidence',
  business_policy_exception: 'Business policy exception',
  manual_execution_preferred: 'Manual execution preferred',
  policy_violation: 'Policy violation',
  duplicate_or_stale: 'Duplicate or stale',
  other: 'Other',
  ai_copilot_run: 'AI Copilot run',
  local_rules: 'Local rules',
  local_rules_fallback: 'Local rules fallback',
  openai_responses: 'External AI response',
  structured_evidence: 'Structured evidence',
  metadata_only: 'Metadata only'
};

function recommendationLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  return ui(RECOMMENDATION_CANONICAL_LABELS[raw] || formatLabel(raw));
}


const READINESS_CORE_CANONICAL_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  production_candidate_needs_tests_and_hardening: 'Production candidate — tests and hardening required',
  implemented_needs_tenant_data_and_tests: 'Implemented — tenant data and tests required',
  architecture_present_needs_workflow_completion: 'Architecture present — workflow completion required',
  not_production_ready_yet: 'Not production ready yet',
  near_production_ready: 'Near production ready',
  production_hardening_required: 'Production hardening required',
  implementation_completion_required: 'Implementation completion required',
  foundation_only: 'Foundation only',
  read_only_inventory_no_ai_execution_or_training: 'Read-only inventory; no AI execution or training',
  read_only_risk_scoring_no_ai_execution_or_training: 'Read-only risk scoring; no AI execution or training',
  read_only_lineage_trace_no_ai_execution_or_training: 'Read-only lineage trace; no AI execution or training',
  read_only_rollback_planning_no_ai_execution_or_state_mutation: 'Read-only rollback planning; no AI execution or state mutation',
  read_only_maturity_audit_no_ai_execution_or_training: 'Read-only maturity audit; no AI execution or training',
  hardening_or_test_gap: 'Hardening or test gap',
  tenant_evidence_gap: 'Tenant evidence gap',
  critical_risk: 'Critical risk',
  high_risk: 'High risk',
  moderate_risk: 'Moderate risk',
  controlled_risk: 'Controlled risk',
  missing_tenant_evidence: 'Missing tenant evidence',
  low_readiness_score: 'Low readiness score',
  production_hardening_required: 'Production hardening required',
  operator_monitoring_required: 'Operator monitoring required',
  lineage_ready_for_commercial_review: 'Lineage ready for commercial review',
  lineage_needs_hardening: 'Lineage needs hardening',
  lineage_blocked: 'Lineage blocked',
  registered_endpoint: 'Registered endpoint',
  frontend_surface: 'Frontend surface',
  evidence_table_registry: 'Evidence table registry',
  tenant_evidence_rows: 'Tenant evidence rows',
  governance_or_review_endpoint: 'Governance or review endpoint',
  human_review_surface: 'Human review surface',
  rollback_ready: 'Rollback ready',
  rollback_needs_operator_confirmation: 'Rollback needs operator confirmation',
  rollback_blocked: 'Rollback blocked',
  missing_operator_surface: 'Missing operator surface',
  missing_governance_endpoint: 'Missing governance endpoint',
  missing_tenant_evidence_for_rollback_decision: 'Missing tenant evidence for rollback decision',
  insufficient_decision_lineage: 'Insufficient decision lineage',
  high_risk_low_readiness_feature: 'High-risk, low-readiness feature',
  rollback_path_blocked_until_controls_are_completed: 'Rollback path blocked until controls are completed',
  manual_rollback_review_required_before_enablement: 'Manual rollback review required before enablement',
  rollback_path_ready_for_commercial_governance_review: 'Rollback path ready for commercial governance review',
  commercial_grade_ready_for_controlled_customer_enablement: 'Commercial-grade — ready for controlled customer enablement',
  commercial_enablement_blocked: 'Commercial enablement blocked',
  governance_waiver_or_final_review_required: 'Governance waiver or final review required',
  ready_for_controlled_commercial_enablement: 'Ready for controlled commercial enablement',
  commercial_ai_release_blocked: 'Commercial AI release blocked',
  commercial_ai_release_requires_governance_waiver: 'Commercial AI release requires governance waiver',
  commercial_ai_release_ready_for_operator_approval: 'Commercial AI release ready for operator approval',
  release_evidence_incomplete: 'Release evidence incomplete',
  release_evidence_requires_governance_waiver: 'Release evidence requires governance waiver',
  release_evidence_ready_for_operator_review: 'Release evidence ready for operator review',
  unified_ai_capability_inventory: 'Unified AI capability inventory',
  unified_ai_risk_scoring: 'Unified AI risk scoring',
  unified_ai_decision_lineage: 'Unified AI decision lineage',
  unified_ai_rollback_orchestration: 'Unified AI rollback orchestration',
  unified_ai_maturity_self_audit: 'Unified AI maturity self-audit',
  unified_ai_governance_dashboard: 'Unified AI governance dashboard',
  unified_ai_commercial_release_gate: 'Unified AI commercial release gate',
  production_audit_pack: 'Production audit pack',
  production_signoff_checklist: 'Production signoff checklist',
  production_monitoring_contract: 'Production monitoring contract',
  production_release_decision_board: 'Production release decision board',
  commercial_candidate_needs_final_governance_evidence: 'Commercial candidate — final governance evidence required',
  pilot_ready_with_hardening_required: 'Pilot ready — hardening required',
  not_commercial_grade_yet: 'Not commercial grade yet',
  route_contract_missing: 'Route contract missing',
  route_contract_registered: 'Route contract registered',
  frontend_query_contract_drift_detected: 'Frontend query contract drift detected',
  frontend_query_contract_aligned: 'Frontend query contract aligned',
  frontend_api_path_contract_drift_detected: 'Frontend API path contract drift detected',
  frontend_api_path_contract_aligned: 'Frontend API path contract aligned',
  DECISION_INTELLIGENCE_READ: 'Decision Intelligence Read',
  runtime_coverage_gaps_detected: 'Runtime coverage gaps detected',
  runtime_coverage_contracts_present: 'Runtime coverage contracts present',
  runtime_coverage_gap_detected: 'Runtime coverage gap detected',
  runtime_coverage_contract_present: 'Runtime coverage contract present',
  no_backend_endpoint_registered_for_feature: 'No backend endpoint registered for feature',
  no_frontend_consumer_registered_for_feature: 'No frontend consumer registered for feature',
  no_tenant_runtime_evidence_rows: 'No tenant runtime evidence rows',
  registered_evidence_schema_not_fully_present: 'Registered evidence schema not fully present',
  backend_platform_owner: 'Backend platform owner',
  frontend_product_owner: 'Frontend product owner',
  blocks_or_requires_waiver_for_commercial_ai_release: 'Blocks or requires waiver for commercial AI release',
  watch_item_for_commercial_ai_release: 'Watch item for commercial AI release',
  runtime_remediation_required_before_unwaived_commercial_release: 'Runtime remediation required before unwaived commercial release',
  runtime_remediation_watch_items_present: 'Runtime remediation watch items present',
  runtime_remediation_worklist_clear: 'Runtime remediation worklist clear',
  blocking_runtime_validation_drill_required: 'Blocking runtime validation drill required',
  runtime_validation_drill_recommended: 'Runtime validation drill recommended',
  runtime_validation_drill_required_before_unwaived_commercial_release: 'Runtime validation drill required before unwaived commercial release',
  runtime_validation_drill_watch_items_present: 'Runtime validation drill watch items present',
  runtime_validation_drill_clear: 'Runtime validation drill clear',
  runtime_evidence_ready_for_operator_signoff: 'Runtime evidence ready for operator signoff',
  blocking_runtime_evidence_or_waiver_required: 'Blocking runtime evidence or waiver required',
  runtime_evidence_watch_item: 'Runtime evidence watch item',
  manual_runtime_signoff_waiver_packet_required: 'Manual runtime signoff waiver packet required',
  runtime_signoff_watch_item_no_critical_waiver_required: 'Runtime signoff watch item — no critical waiver required',
  runtime_signoff_evidence_or_waiver_required_before_unwaived_commercial_release: 'Runtime signoff evidence or waiver required before unwaived commercial release',
  runtime_signoff_evidence_ready_for_operator_review: 'Runtime signoff evidence ready for operator review',
  runtime_signoff_evidence_watch_items_present: 'Runtime signoff evidence watch items present',
  waiver_review_required_before_commercial_enablement: 'Waiver review required before commercial enablement',
  waiver_watch_review_required: 'Waiver watch review required',
  weekly_until_closed_or_disabled: 'Weekly until closed or disabled',
  twice_monthly_until_closed_or_disabled: 'Twice monthly until closed or disabled',
  monthly_until_closed_or_disabled: 'Monthly until closed or disabled',
  executive_product_owner_and_operations_owner: 'Executive product owner and operations owner',
  product_owner_and_operations_owner: 'Product owner and operations owner',
  critical_high_runtime_waiver_reviews_required_before_commercial_ai_enablement: 'Critical/high runtime waiver reviews required before commercial AI enablement',
  runtime_waiver_reviews_required_before_enablement: 'Runtime waiver reviews required before enablement',
  no_runtime_waiver_reviews_required: 'No runtime waiver reviews required',
  tier_1_executive_escalation: "Tier 1 — Executive escalation",
  tier_2_product_operations_escalation: "Tier 2 — Product/operations escalation",
  tier_3_owner_followup: "Tier 3 — Owner follow-up",
  escalation_required_before_commercial_ai_enablement: "Escalation required before commercial AI enablement",
  owner_followup_required_before_enablement: "Owner follow-up required before enablement",
  executive_sponsor_product_owner_operations_owner_and_security_owner: "Executive sponsor, product owner, operations owner and security owner",
  product_owner_operations_owner_and_support_owner: "Product owner, operations owner and support owner",
  feature_owner: "Feature owner",
  executive_runtime_ai_waiver_escalation_required_before_enablement: "Executive runtime AI waiver escalation required before enablement",
  product_operations_runtime_ai_waiver_escalation_required_before_enablement: "Product/operations runtime AI waiver escalation required before enablement",
  runtime_ai_waiver_owner_followup_required_before_enablement: "Runtime AI waiver owner follow-up required before enablement",
  no_runtime_waiver_escalations_required: "No runtime waiver escalations required",
  closure_blocked_by_open_runtime_gaps: "Closure blocked by open runtime gaps",
  closure_ready_for_manual_operator_review: "Closure ready for manual operator review",
  product_owner_operations_owner_support_owner_and_feature_owner: "Product owner, operations owner, support owner and feature owner",
  feature_owner_and_operations_owner: "Feature owner and operations owner",
  executive_runtime_ai_waiver_closure_required_before_enablement: "Executive runtime AI waiver closure required before enablement",
  product_operations_runtime_ai_waiver_closure_required_before_enablement: "Product/operations runtime AI waiver closure required before enablement",
  runtime_ai_waiver_closure_required_before_enablement: "Runtime AI waiver closure required before enablement",
  runtime_ai_waiver_closure_ready_for_operator_review: "Runtime AI waiver closure ready for operator review",
  no_runtime_waiver_closure_rows_required: "No runtime waiver closure rows required",
  monitoring_blocked_until_runtime_gaps_are_closed_or_time_boxed_waiver_is_recorded: 'Monitoring blocked until runtime gaps are closed or time-boxed waiver is recorded',
  post_closure_monitoring_ready_for_operator_execution: 'Post-closure monitoring ready for operator execution',
  post_closure_runtime_monitoring_blocked_until_closure_or_time_boxed_waiver_evidence_exists: 'Post-closure runtime monitoring blocked until closure or time-boxed waiver evidence exists',
  post_closure_runtime_monitoring_ready_for_operator_execution: 'Post-closure runtime monitoring ready for operator execution',
  no_post_closure_runtime_monitoring_rows_required: 'No post-closure runtime monitoring rows required',
  executive_sponsor_product_owner_operations_owner_security_owner_and_support_owner: 'Executive sponsor, product owner, operations owner, security owner and support owner',
  feature_owner_operations_owner_and_support_owner: 'Feature owner, operations owner and support owner',
  daily_for_first_7_days_after_closure_then_weekly_until_runtime_evidence_is_stable: 'Daily for first 7 days after closure, then weekly until runtime evidence is stable',
  twice_weekly_for_first_14_days_after_closure_then_weekly_until_runtime_evidence_is_stable: 'Twice weekly for first 14 days after closure, then weekly until runtime evidence is stable',
  weekly_until_runtime_evidence_is_stable: 'Weekly until runtime evidence is stable',
  evidence_acceptance_blocked_until_runtime_gaps_are_closed_or_time_boxed_waiver_exists: 'Evidence acceptance blocked until runtime gaps are closed or time-boxed waiver exists',
  post_closure_evidence_ready_for_manual_acceptance_review: 'Post-closure evidence ready for manual acceptance review',
  post_closure_runtime_evidence_acceptance_blocked_until_monitoring_evidence_or_time_boxed_waiver_exists: 'Post-closure runtime evidence acceptance blocked until monitoring evidence or time-boxed waiver exists',
  post_closure_runtime_evidence_ready_for_manual_acceptance_review: 'Post-closure evidence ready for manual acceptance review',
  no_post_closure_runtime_evidence_acceptance_rows_required: 'No post-closure runtime evidence acceptance rows required',
  broad_release_blocked_until_post_closure_evidence_is_accepted_or_waiver_is_time_boxed: 'Broad release blocked until post-closure evidence is accepted or waiver is time-boxed',
  manual_broad_release_review_ready_after_evidence_acceptance: 'Manual broad release review ready after evidence acceptance',
  broad_release_blocked_until_post_closure_acceptance_or_time_boxed_waiver_evidence_exists: 'Broad release blocked until post-closure acceptance or time-boxed waiver evidence exists',
  manual_broad_release_review_ready_after_post_closure_evidence_acceptance: 'Manual broad release review ready after post-closure evidence acceptance',
  no_runtime_ai_broad_release_readiness_rows_required: 'No runtime AI broad release readiness rows required',
  executive_sponsor_product_owner_operations_owner_security_owner_support_owner_and_release_manager: 'Executive sponsor, product owner, operations owner, security owner, support owner and release manager',
  product_owner_operations_owner_support_owner_feature_owner_and_release_manager: 'Product owner, operations owner, support owner, feature owner and release manager',
  feature_owner_operations_owner_support_owner_and_release_manager: 'Feature owner, operations owner, support owner and release manager',
  tenant_enablement_blocked_until_broad_release_evidence_and_waiver_controls_are_closed: 'Tenant enablement blocked until broad release evidence and waiver controls are closed',
  tenant_enablement_control_ready_for_manual_feature_flag_rollout_review: 'Tenant enablement control ready for manual feature flag rollout review',
  tenant_enablement_blocked_until_broad_release_and_waiver_controls_are_closed: 'Tenant enablement blocked until broad release and waiver controls are closed',
  manual_tenant_enablement_review_ready_after_broad_release_controls: 'Manual tenant enablement review ready after broad release controls',
  no_runtime_ai_tenant_enablement_control_rows_required: 'No runtime AI tenant enablement control rows required',
  executive_sponsor_release_manager_product_owner_operations_owner_support_owner_and_customer_success_owner: 'Executive sponsor, release manager, product owner, operations owner, support owner and customer success owner',
  release_manager_product_owner_operations_owner_support_owner_and_customer_success_owner: 'Release manager, product owner, operations owner, support owner and customer success owner',
  release_manager_feature_owner_support_owner_and_customer_success_owner: 'Release manager, feature owner, support owner and customer success owner',
  post_enablement_health_watch_blocked_until_tenant_enablement_controls_are_closed: "Post-enablement health watch blocked until tenant enablement controls are closed",
  post_enablement_health_watch_ready_after_manual_tenant_enablement: "Post-enablement health watch ready after manual tenant enablement",
  post_enablement_health_watch_blocked_until_tenant_enablement_and_waiver_controls_are_closed: "Post-enablement health watch blocked until tenant enablement and waiver controls are closed",
  manual_post_enablement_health_watch_ready_after_tenant_enablement_controls: "Manual post-enablement health watch ready after tenant enablement controls",
  no_runtime_ai_post_enablement_health_watch_rows_required: "No runtime AI post-enablement health watch rows required",
  executive_sponsor_release_manager_operations_owner_support_owner_customer_success_owner_and_monitoring_owner: "Executive sponsor, release manager, operations owner, support owner, customer success owner and monitoring owner",
  release_manager_operations_owner_support_owner_customer_success_owner_and_monitoring_owner: "Release manager, operations owner, support owner, customer success owner and monitoring owner",
  feature_owner_support_owner_customer_success_owner_and_monitoring_owner: "Feature owner, support owner, customer success owner and monitoring owner",
  daily_for_first_7_days_then_weekly_until_runtime_health_is_stable: "Daily for first 7 days, then weekly until runtime health is stable",
  twice_weekly_for_first_14_days_then_weekly_until_runtime_health_is_stable: "Twice weekly for first 14 days, then weekly until runtime health is stable",
  weekly_until_runtime_health_is_stable: "Weekly until runtime health is stable",
  incident_response_blocked_until_post_enablement_health_controls_are_closed: "Incident response blocked until post-enablement health controls are closed",
  manual_incident_response_queue_ready_after_post_enablement_health_watch: "Manual incident response queue ready after post-enablement health watch",
  incident_response_blocked_until_post_enablement_health_and_runtime_gap_controls_are_closed: "Incident response blocked until post-enablement health and runtime gap controls are closed",
  no_runtime_ai_post_enablement_incident_response_rows_required: "No runtime AI post-enablement incident response rows required",
  executive_sponsor_incident_commander_support_owner_customer_success_owner_and_rollback_owner: "Executive sponsor, incident commander, support owner, customer success owner and rollback owner",
  product_operations_incident_commander_support_owner_customer_success_owner_and_rollback_owner: "Product/operations incident commander, support owner, customer success owner and rollback owner",
  feature_owner_support_owner_customer_success_owner_and_rollback_owner: "Feature owner, support owner, customer success owner and rollback owner",
  same_business_day_for_critical_post_enablement_ai_incidents_until_stable: "Same business day for critical post-enablement AI incidents until stable",
  next_business_day_for_high_priority_post_enablement_ai_incidents_until_stable: "Next business day for high-priority post-enablement AI incidents until stable",
  weekly_review_for_watchlisted_post_enablement_ai_incident_signals: "Weekly review for watchlisted post-enablement AI incident signals",
  incident_closure_blocked_until_runtime_gaps_and_incident_response_controls_are_closed: "Incident closure blocked until runtime gaps and incident response controls are closed",
  manual_incident_closure_ready_after_triage_rollback_and_customer_communication_review: "Manual incident closure ready after triage, rollback and customer communication review",
  manual_incident_closure_ready_after_incident_response_queue: "Manual incident closure ready after incident response queue",
  no_runtime_ai_post_enablement_incident_closure_rows_required: "No runtime AI post-enablement incident closure rows required",
  executive_sponsor_incident_commander_customer_success_owner_support_owner_and_product_owner: "Executive sponsor, incident commander, customer success owner, support owner and product owner",
  product_operations_owner_incident_commander_customer_success_owner_support_owner_and_product_owner: "Product operations owner, incident commander, customer success owner, support owner and product owner",
  feature_owner_incident_commander_customer_success_owner_and_support_owner: "Feature owner, incident commander, customer success owner and support owner",
  same_business_day_until_critical_ai_incident_closure_is_approved: "Same business day until critical AI incident closure is approved",
  next_business_day_until_high_priority_ai_incident_closure_is_approved: "Next business day until high-priority AI incident closure is approved",
  weekly_until_watchlisted_ai_incident_closure_is_approved: "Weekly until watchlisted AI incident closure is approved",
  prevention_verification_blocked_until_incident_closure_and_runtime_gap_controls_are_closed: "Prevention verification blocked until incident closure and runtime gap controls are closed",
  manual_prevention_verification_ready_after_incident_closure_board: "Manual prevention verification ready after incident closure board",
  no_runtime_ai_post_enablement_prevention_verification_rows_required: "No runtime AI post-enablement prevention verification rows required",
  executive_sponsor_product_owner_incident_commander_customer_success_owner_and_runtime_monitoring_owner: "Executive sponsor, product owner, incident commander, customer success owner and runtime monitoring owner",
  product_operations_owner_product_owner_incident_commander_customer_success_owner_and_runtime_monitoring_owner: "Product operations owner, product owner, incident commander, customer success owner and runtime monitoring owner",
  feature_owner_incident_commander_customer_success_owner_and_runtime_monitoring_owner: "Feature owner, incident commander, customer success owner and runtime monitoring owner",
  same_business_day_until_critical_ai_prevention_effectiveness_is_accepted: "Same business day until critical AI prevention effectiveness is accepted",
  next_business_day_until_high_priority_ai_prevention_effectiveness_is_accepted: "Next business day until high-priority AI prevention effectiveness is accepted",
  weekly_until_post_incident_prevention_effectiveness_is_accepted: "Weekly until post-incident prevention effectiveness is accepted",
  rollout_resume_authorization_blocked_until_prevention_verification_and_runtime_gap_controls_are_closed: "Rollout resume authorization blocked until prevention verification and runtime gap controls are closed",
  manual_rollout_resume_authorization_ready_after_prevention_verification_backlog: "Manual rollout resume authorization ready after prevention verification backlog",
  no_runtime_ai_post_enablement_rollout_resume_authorization_rows_required: "No runtime AI post-enablement rollout resume authorization rows required",
  executive_sponsor_product_owner_customer_success_owner_support_owner_and_runtime_health_owner: "Executive sponsor, product owner, customer success owner, support owner and runtime health owner",
  product_operations_owner_product_owner_customer_success_owner_support_owner_and_runtime_health_owner: "Product operations owner, product owner, customer success owner, support owner and runtime health owner",
  feature_owner_customer_success_owner_support_owner_and_runtime_health_owner: "Feature owner, customer success owner, support owner and runtime health owner",
  same_business_day_until_executive_rollout_resume_authorization_is_recorded: "Same business day until executive rollout resume authorization is recorded",
  next_business_day_until_product_operations_rollout_resume_authorization_is_recorded: "Next business day until product operations rollout resume authorization is recorded",
  weekly_until_owner_rollout_resume_authorization_is_recorded: "Weekly until owner rollout resume authorization is recorded",
  post_resume_observation_blocked_until_rollout_resume_authorization_and_runtime_gap_controls_are_closed: "Post-resume observation blocked until rollout resume authorization and runtime gap controls are closed",
  manual_post_resume_observation_ready_after_rollout_resume_authorization: "Manual post-resume observation ready after rollout resume authorization",
  no_runtime_ai_post_enablement_rollout_resume_observation_rows_required: "No runtime AI post-enablement rollout resume observation rows required",
  executive_sponsor_runtime_health_owner_customer_success_owner_and_support_owner: "Executive sponsor, runtime health owner, customer success owner and support owner",
  product_operations_owner_runtime_health_owner_customer_success_owner_and_support_owner: "Product operations owner, runtime health owner, customer success owner and support owner",
  feature_owner_runtime_health_owner_customer_success_owner_and_support_owner: "Feature owner, runtime health owner, customer success owner and support owner",
  critical_ai_features_require_same_business_day_post_resume_observation_until_executive_acceptance: "Critical AI features require same business day post-resume observation until executive acceptance",
  high_priority_ai_features_require_next_business_day_post_resume_observation_until_product_operations_acceptance: "High-priority AI features require next business day post-resume observation until product operations acceptance",
  runtime_ai_features_require_weekly_post_resume_observation_until_owner_acceptance: "Runtime AI features require weekly post-resume observation until owner acceptance",
  scope_expansion_authorization_blocked_until_post_resume_observation_and_runtime_gap_controls_are_closed: "Scope expansion authorization blocked until post-resume observation and runtime gap controls are closed",
  manual_scope_expansion_authorization_ready_after_post_resume_observation_acceptance: "Manual scope expansion authorization ready after post-resume observation acceptance",
  no_runtime_ai_rollout_scope_expansion_authorization_rows_required: "No runtime AI rollout scope expansion authorization rows required",
  executive_sponsor_product_owner_runtime_health_owner_customer_success_owner_and_support_owner: "Executive sponsor, product owner, runtime health owner, customer success owner and support owner",
  product_operations_owner_product_owner_runtime_health_owner_customer_success_owner_and_support_owner: "Product operations owner, product owner, runtime health owner, customer success owner and support owner",
  feature_owner_runtime_health_owner_customer_success_owner_and_support_owner: "Feature owner, runtime health owner, customer success owner and support owner",
  same_business_day_until_executive_scope_expansion_authorization_is_recorded: "Same business day until executive scope expansion authorization is recorded",
  next_business_day_until_product_operations_scope_expansion_authorization_is_recorded: "Next business day until product operations scope expansion authorization is recorded",
  weekly_until_owner_scope_expansion_authorization_is_recorded: "Weekly until owner scope expansion authorization is recorded",
  expanded_scope_health_validation_blocked_until_scope_expansion_authorization_and_runtime_gap_controls_are_closed: "Expanded-scope health validation blocked until scope expansion authorization and runtime gap controls are closed",
  manual_expanded_scope_health_validation_ready_after_scope_expansion_authorization: "Manual expanded-scope health validation ready after scope expansion authorization",
  no_runtime_ai_expanded_scope_health_rows_required: "No runtime AI expanded-scope health rows required",
  executive_sponsor_runtime_health_owner_customer_success_owner_support_owner_and_rollback_owner: "Executive sponsor, runtime health owner, customer success owner, support owner and rollback owner",
  product_operations_owner_runtime_health_owner_customer_success_owner_support_owner_and_rollback_owner: "Product operations owner, runtime health owner, customer success owner, support owner and rollback owner",
  feature_owner_runtime_health_owner_customer_success_owner_support_owner_and_rollback_owner: "Feature owner, runtime health owner, customer success owner, support owner and rollback owner",
  same_business_day_until_executive_expanded_scope_health_acceptance_is_recorded: "Same business day until executive expanded-scope health acceptance is recorded",
  next_business_day_until_product_operations_expanded_scope_health_acceptance_is_recorded: "Next business day until product operations expanded-scope health acceptance is recorded",
  weekly_until_owner_expanded_scope_health_acceptance_is_recorded: "Weekly until owner expanded-scope health acceptance is recorded",
  rollout_growth_authorization_blocked_until_expanded_scope_health_and_runtime_gap_controls_are_closed: "Rollout growth authorization blocked until expanded-scope health and runtime gap controls are closed",
  manual_rollout_growth_authorization_ready_after_expanded_scope_health_acceptance: "Manual rollout growth authorization ready after expanded-scope health acceptance",
  no_runtime_ai_rollout_growth_authorization_rows_required: "No runtime AI rollout growth authorization rows required",
  executive_sponsor_product_owner_runtime_health_owner_customer_success_owner_support_owner_and_rollback_owner: "Executive sponsor, product owner, runtime health owner, customer success owner, support owner and rollback owner",
  product_operations_owner_product_owner_runtime_health_owner_customer_success_owner_support_owner_and_rollback_owner: "Product operations owner, product owner, runtime health owner, customer success owner, support owner and rollback owner",
  same_business_day_until_executive_rollout_growth_authorization_is_recorded: "Same business day until executive rollout growth authorization is recorded",
  next_business_day_until_product_operations_rollout_growth_authorization_is_recorded: "Next business day until product operations rollout growth authorization is recorded",
  weekly_until_owner_rollout_growth_authorization_is_recorded: "Weekly until owner rollout growth authorization is recorded",
  rollout_growth_observation_blocked_until_growth_authorization_and_runtime_gap_controls_are_closed: "Rollout growth observation blocked until growth authorization and runtime gap controls are closed",
  manual_rollout_growth_observation_ready_after_growth_authorization: "Manual rollout growth observation ready after growth authorization",
  no_runtime_ai_rollout_growth_observation_rows_required: "No runtime AI rollout growth observation rows required",
  daily_until_growth_scope_runtime_health_is_accepted: "Daily until growth-scope runtime health is accepted",
  twice_weekly_until_growth_scope_runtime_health_is_accepted: "Twice weekly until growth-scope runtime health is accepted",
  weekly_until_growth_scope_runtime_health_is_accepted: "Weekly until growth-scope runtime health is accepted",
  next_growth_step_blocked_until_growth_observation_and_runtime_gap_controls_are_closed: "Next growth step blocked until growth observation and runtime gap controls are closed",
  manual_next_growth_step_gate_ready_after_growth_observation_acceptance: "Manual next growth step gate ready after growth observation acceptance",
  no_runtime_ai_next_growth_step_gate_rows_required: "No runtime AI next growth step gate rows required",
  executive_sponsor_product_owner_customer_success_owner_support_owner_runtime_health_owner_and_rollback_owner: "Executive sponsor, product owner, customer success owner, support owner, runtime health owner and rollback owner",
  product_operations_owner_customer_success_owner_support_owner_runtime_health_owner_and_rollback_owner: "Product operations owner, customer success owner, support owner, runtime health owner and rollback owner",
  feature_owner_customer_success_owner_support_owner_runtime_health_owner_and_rollback_owner: "Feature owner, customer success owner, support owner, runtime health owner and rollback owner",
  next_wave_observation_blocked_until_next_growth_step_gate_and_runtime_gap_controls_are_closed: "Next-wave observation blocked until next growth step gate and runtime gap controls are closed",
  manual_next_wave_observation_ready_after_next_growth_step_gate_acceptance: "Manual next-wave observation ready after next growth step gate acceptance",
  no_runtime_ai_next_wave_observation_rows_required: "No runtime AI next-wave observation rows required",
  daily_until_next_wave_runtime_health_is_accepted: "Daily until next-wave runtime health is accepted",
  twice_weekly_until_next_wave_runtime_health_is_accepted: "Twice weekly until next-wave runtime health is accepted",
  weekly_until_next_wave_runtime_health_is_accepted: "Weekly until next-wave runtime health is accepted",
  additional_growth_authorization_blocked_until_next_wave_observation_and_runtime_gap_controls_are_closed: "Additional growth authorization blocked until next-wave observation and runtime gap controls are closed",
  manual_additional_growth_authorization_ready_after_next_wave_observation_acceptance: "Manual additional growth authorization ready after next-wave observation acceptance",
  no_runtime_ai_additional_growth_authorization_rows_required: "No runtime AI additional growth authorization rows required",
  product_operations_owner_product_owner_customer_success_owner_support_owner_runtime_health_owner_and_rollback_owner: "Product operations owner, product owner, customer success owner, support owner, runtime health owner and rollback owner",
  additional_growth_observation_blocked_until_authorization_and_runtime_gap_controls_are_closed: "Additional growth observation blocked until authorization and runtime gap controls are closed",
  manual_additional_growth_observation_ready_after_authorization_acceptance: "Manual additional growth observation ready after authorization acceptance",
  no_runtime_ai_additional_growth_observation_rows_required: "No runtime AI additional growth observation rows required",
  daily_until_additional_growth_runtime_health_is_accepted: "Daily until additional-growth runtime health is accepted",
  twice_weekly_until_additional_growth_runtime_health_is_accepted: "Twice weekly until additional-growth runtime health is accepted",
  weekly_until_additional_growth_runtime_health_is_accepted: "Weekly until additional-growth runtime health is accepted",
  further_growth_exit_blocked_until_additional_growth_observation_and_runtime_gap_controls_are_closed: "Further growth exit blocked until additional growth observation and runtime gap controls are closed",
  manual_further_growth_exit_ready_after_additional_growth_observation_acceptance: "Manual further growth exit ready after additional growth observation acceptance",
  no_runtime_ai_further_growth_exit_rows_required: "No runtime AI further growth exit rows required",
  steady_state_certification_blocked_until_further_growth_exit_and_runtime_gap_controls_are_closed: "Steady-state certification blocked until further growth exit and runtime gap controls are closed",
  manual_steady_state_certification_ready_after_further_growth_exit_acceptance: "Manual steady-state certification ready after further growth exit acceptance",
  no_runtime_ai_steady_state_certification_rows_required: "No runtime AI steady-state certification rows required",
  steady_state_monitoring_cadence_blocked_until_certification_and_runtime_gap_controls_are_closed: "Steady-state monitoring cadence blocked until certification and runtime gap controls are closed",
  manual_steady_state_monitoring_cadence_ready_after_certification_acceptance: "Manual steady-state monitoring cadence ready after certification acceptance",
  no_runtime_ai_steady_state_monitoring_cadence_rows_required: "No runtime AI steady-state monitoring cadence rows required",
  steady_state_exception_review_blocked_until_cadence_and_runtime_gap_controls_are_closed: "Steady-state exception review blocked until cadence and runtime gap controls are closed",
  manual_steady_state_exception_review_ready_after_monitoring_cadence_acceptance: "Manual steady-state exception review ready after monitoring cadence acceptance",
  no_runtime_ai_steady_state_exception_review_rows_required: "No runtime AI steady-state exception review rows required",
  steady_state_exception_closure_blocked_until_exception_review_and_runtime_gap_controls_are_closed: "Steady-state exception closure blocked until exception review and runtime gap controls are closed",
  manual_steady_state_exception_closure_ready_after_exception_review_acceptance: "Manual steady-state exception closure ready after exception review acceptance",
  no_runtime_ai_steady_state_exception_closure_rows_required: "No runtime AI steady-state exception closure rows required",
  steady_state_exception_recurrence_audit_blocked_until_exception_closure_and_runtime_gap_controls_are_closed: "Steady-state exception recurrence audit blocked until exception closure and runtime gap controls are closed",
  manual_steady_state_exception_recurrence_audit_ready_after_exception_closure_acceptance: "Manual steady-state exception recurrence audit ready after exception closure acceptance",
  no_runtime_ai_steady_state_exception_recurrence_audit_rows_required: "No runtime AI steady-state exception recurrence audit rows required",
  steady_state_exception_recurrence_resolution_blocked_until_recurrence_audit_and_runtime_gap_controls_are_closed: "Steady-state exception recurrence resolution blocked until recurrence audit and runtime gap controls are closed",
  manual_steady_state_exception_recurrence_resolution_ready_after_recurrence_audit_acceptance: "Manual steady-state exception recurrence resolution ready after recurrence audit acceptance",
  no_runtime_ai_steady_state_exception_recurrence_resolution_rows_required: "No runtime AI steady-state exception recurrence resolution rows required",
  steady_state_exception_resolution_verification_blocked_until_recurrence_resolution_and_runtime_gap_controls_are_closed: "Steady-state exception resolution verification blocked until recurrence resolution and runtime gap controls are closed",
  manual_steady_state_exception_resolution_verification_ready_after_resolution_acceptance: "Manual steady-state exception resolution verification ready after resolution acceptance",
  no_runtime_ai_steady_state_exception_resolution_verification_rows_required: "No runtime AI steady-state exception resolution verification rows required",
  executive_sponsor_product_operations_owner_runtime_health_owner_customer_success_owner_and_support_owner: "Executive sponsor, product operations owner, runtime health owner, customer success owner and support owner",
  executive_sponsor_runtime_health_owner_customer_success_owner_support_owner_and_product_operations_owner: "Executive sponsor, runtime health owner, customer success owner, support owner and product operations owner",
  steady_state_certification_renewal_blocked_until_resolution_verification_and_runtime_gap_controls_are_closed: "Steady-state certification renewal blocked until resolution verification and runtime gap controls are closed",
  manual_steady_state_certification_renewal_ready_after_evidence_refresh: "Manual steady-state certification renewal ready after evidence refresh",
  no_runtime_ai_steady_state_certification_renewal_rows_required: "No runtime AI steady-state certification renewal rows required",
  executive_sponsor_ai_governance_owner_product_operations_owner_customer_success_owner_and_support_owner: "Executive sponsor, AI governance owner, product operations owner, customer success owner and support owner",
  ai_governance_owner_product_operations_owner_customer_success_owner_and_support_owner: "AI governance owner, product operations owner, customer success owner and support owner",
  ai_governance_owner_feature_owner_customer_success_owner_and_support_owner: "AI governance owner, feature owner, customer success owner and support owner",
  quarterly_manual_renewal_or_immediate_renewal_after_recurrence_resolution_verification: "Quarterly manual renewal or immediate renewal after recurrence-resolution verification",
  final_governance_audit_blocked_until_certification_renewal_and_runtime_gaps_are_closed: "Final governance audit blocked until certification renewal and runtime gaps are closed",
  manual_final_governance_audit_ready_for_freeze_review: "Manual final governance audit ready for freeze review",
  no_runtime_ai_final_governance_audit_rows_required: "No runtime AI final governance audit rows required",
  final_completion_freeze_blocked_until_final_governance_audit_is_ready: "Final completion freeze blocked until final governance audit is ready",
  manual_final_completion_freeze_ready_for_owner_acceptance: "Manual final completion freeze ready for owner acceptance",
  no_runtime_ai_final_completion_freeze_rows_required: "No runtime AI final completion freeze rows required",
  ai_governance_owner_product_owner_operations_owner_customer_success_owner_and_support_owner: "AI governance owner, product owner, operations owner, customer success owner and support owner",
  commercial_completion_certificate_blocked_until_final_freeze_rows_are_ready: "Commercial completion certificate blocked until final freeze rows are ready",
  manual_commercial_completion_certificate_ready_for_owner_acceptance: "Manual commercial completion certificate ready for owner acceptance",
  no_runtime_ai_commercial_completion_certificate_rows_required: "No runtime AI commercial completion certificate rows required",
  not_code_complete_until_final_freeze_blockers_are_closed: "Not code complete until final freeze blockers are closed",
  code_track_complete_pending_manual_owner_acceptance_and_external_runtime_proof: "Code track complete pending manual owner acceptance and external runtime proof",
  ai_governance_owner_product_owner_customer_success_owner_support_owner_and_operations_owner: "AI governance owner, product owner, customer success owner, support owner and operations owner",
  freeze_drift_detected: "Freeze drift detected",
  freeze_manifest_aligned: "Freeze manifest aligned",
  contract_drift_detected: "Contract drift detected",
  contract_frozen_and_aligned: "Contract frozen and aligned",
  frontend_panel_contract_manifest_aligned: "Frontend panel contract manifest aligned",
  frontend_panel_contract_manifest_drift_detected: "Frontend panel contract manifest drift detected",
  frontend_runtime_dom_anchor_manifest_drift_detected: "Frontend runtime DOM-anchor manifest drift detected",
  frontend_runtime_dom_anchor_manifest_aligned: "Frontend runtime DOM-anchor manifest aligned",
  frontend_runtime_dom_anchor_manifest_order_drift_detected: "Frontend runtime DOM-anchor manifest order drift detected",
  frontend_runtime_dom_anchor_manifest_order_aligned: "Frontend runtime DOM-anchor manifest order aligned",
  tenant_data_present: 'Tenant data present',
  schema_or_source_present_but_no_tenant_rows_found: 'Schema/source present but no tenant rows found',
  forecasting: 'Forecasting',
  inventory_risk: 'Inventory risk',
  procurement: 'Procurement',
  operations: 'Operations',
  supplier_risk: 'Supplier risk',
  financial: 'Financial',
  optimization: 'Optimization',
  enterprise_operations: 'Enterprise operations',
  governance: 'Governance',
  safety: 'Safety',
  production_candidate_pending_final_tests: 'Production candidate — final tests pending',
  not_production_ready: 'Not production ready',
  hardening_required: 'Hardening required',
  no_open_hardening_items: 'No open hardening items',
  open_remediation_actions: 'Open remediation actions',
  no_open_remediation_actions: 'No open remediation actions',
  validation_tests: 'Validation tests',
  governance_safety: 'Governance & safety',
  operator_experience: 'Operator experience',
  data_evidence: 'Data evidence',
  workflow_completion: 'Workflow completion',
  no_tenant_evidence_rows_found: 'No tenant evidence rows found',
  workflow_or_hardening_incomplete: 'Workflow or hardening incomplete',
  evidence_gaps_require_hardening: 'Evidence gaps require hardening',
  required_evidence_ready_for_final_tests: 'Required evidence ready for final tests',
  missing_schema: 'Missing schema',
  global_unscoped_review_required: 'Global unscoped review required',
  no_tenant_rows: 'No tenant rows',
  tenant_evidence_present: 'Tenant evidence present',
  table_missing: 'Table missing',
  global_table_no_tenant_id: 'Global table — no tenant_id',
  tenant_scoped: 'Tenant scoped',
  no_go_production_blocked: 'No-go — production blocked',
  conditional_go_requires_governance_acceptance: 'Conditional go — governance acceptance required',
  go_ready_for_final_production_tests: 'Go — ready for final production tests',
  critical_high_feature_blocker: 'Critical/high feature blocker',
  required_evidence_gap: 'Required evidence gap',
  failed_signoff_item: 'Failed signoff item',
  final_test_runbook_ready: 'Final-test runbook ready',
  remediation_runbook_required: 'Remediation runbook required',
  blocked_follow_remediation_sequence: 'Blocked — follow remediation sequence',
  watch_follow_final_test_sequence: 'Watch — follow final-test sequence',
  ready_for_final_test_sequence: 'Ready for final-test sequence',
  not_reported: 'Not reported',
  unknown: 'Unknown',
  pass: 'Pass',
  watch: 'Watch',
  blocker: 'Blocker',
  blocked: 'Blocked',
  fail: 'Fail',
  blocked_by_critical_high_evidence_gaps: 'Blocked by critical/high evidence gaps',
  tenant_isolation_review_required: 'Tenant isolation review required',
  ready_for_targeted_regression_execution: 'Ready for targeted regression execution',
  blocked_until_evidence_is_available: 'Blocked until evidence is available',
  requires_tenant_isolation_review: 'Requires tenant isolation review',
  ready_for_targeted_regression_tests: 'Ready for targeted regression tests',
  watch_before_final_tests: 'Watch before final tests',
  ready_for_final_tests: 'Ready for final tests',
  ready_for_final_testing: 'Ready for final testing',
  production_enablement_blocked: 'Production enablement blocked',
  controlled_enablement_partially_available: 'Controlled enablement partially available',
  controlled_enablement_ready_for_final_tests: 'Controlled enablement ready for final tests',
  eligible_for_controlled_enablement: 'Eligible for controlled enablement',
  blocked_or_requires_governance_waiver: 'Blocked or requires governance waiver',
  not_enabled_pending_hardening: 'Not enabled pending hardening',
  monitoring_blocked_by_critical_high_readiness_gaps: 'Monitoring blocked by critical/high readiness gaps',
  controlled_enablement_monitoring_required: 'Controlled enablement monitoring required',
  pre_enablement_monitoring_required: 'Pre-enablement monitoring required',
  monitor_after_controlled_enablement: 'Monitor after controlled enablement',
  monitor_blockers_before_enablement: 'Monitor blockers before enablement',
  monitor_hardening_progress: 'Monitor hardening progress',
  daily_until_final_signoff_then_weekly: 'Daily until final signoff, then weekly',
  twice_weekly_until_final_signoff_then_weekly: 'Twice weekly until final signoff, then weekly',
  weekly_until_final_signoff_then_monthly: 'Weekly until final signoff, then monthly'
};

function readinessCoreLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  return READINESS_CORE_CANONICAL_LABELS[raw] ? ui(READINESS_CORE_CANONICAL_LABELS[raw]) : formatLabel(raw);
}

function formatPercent(value: number | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return ui('Not scored');
  }

  return `${formatLocalizedNumber(Math.round(value * 100), locale)}%`;
}

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) {
    return ui('Not reported');
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
}

function formatDateOnly(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDate(date, locale);
}

function dateInputValueFromIso(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateInputEndOfDayIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function reviewStateIsActive(status: string | null | undefined): boolean {
  return ['pending_review', 'approval_required', 'escalated', 'ready_for_human_decision'].includes(String(status || ''));
}

function currentRoleMatchesEscalationTarget(targetRole: EscalationTargetRole | null | undefined, currentRole: string): boolean {
  if (!targetRole || targetRole === 'decision_intelligence_reviewer') return true;
  return targetRole === currentRole;
}

function escalationTargetLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const option = ESCALATION_TARGET_OPTIONS.find((item) => item.value === value);
  return option ? ui(option.label) : ui('Not assigned');
}

function reviewDecisionMeaning(decision: ReviewDecision | undefined, ui: (englishText: string) => string, sourceType?: string): string {
  if (sourceType === 'probabilistic_forecast_model') {
    if (decision === 'approved_for_manual_action') return ui('Trust this forecast model for advisory forecasting. This does not create operational work or an Execution Request.');
    if (decision === 'reopened') return ui('Return this forecast model to review. This changes only the forecast review state and does not create operational work.');
  }
  const meanings: Record<ReviewDecision, string> = {
    acknowledged: 'Reviewed and noted. No follow-up work is created; the item can still be reconsidered later.',
    approved_for_manual_action: 'Accept this result for manual follow-up. If the result supports real work, you can create an Execution Request next.',
    rejected: 'Do not pursue this result. The review is closed unless somebody reopens it.',
    suppressed: 'Stop active follow-up on this result without saying the result is wrong. The review is closed unless reopened.',
    escalated: 'Send this to another reviewer. Choose who should review it and when it is due.',
    reopened: 'Return this review to Pending review. A linked active or executed Execution Request prevents reopening.'
  };
  return decision ? ui(meanings[decision]) : ui('No review decision is currently available for this lifecycle state.');
}

function reviewLifecycleMeaning(status: string | null | undefined, ui: (englishText: string) => string, sourceType?: string): string {
  if (sourceType === 'probabilistic_forecast_model' && status === 'approved_for_manual_action') {
    return ui('Trusted for advisory forecasting. This approval does not create operational work or an Execution Request.');
  }
  const meanings: Record<string, string> = {
    pending_review: 'Waiting for a human review decision.',
    approval_required: 'Waiting for a human decision because this source requires approval.',
    ready_for_human_decision: 'Ready for a human to record what should happen next.',
    acknowledged: 'Reviewed and noted. No follow-up work was created.',
    approved_for_manual_action: 'Accepted for possible manual follow-up. An Execution Request can be created when the result represents real work.',
    rejected: 'Rejected and closed unless reopened.',
    suppressed: 'Removed from active follow-up and closed unless reopened.',
    escalated: 'Waiting for the assigned reviewer. It also appears in Action Center until the review is resolved.',
    execution_request_drafted: 'Handed off to a linked Execution Request. The request now owns the operational follow-up.'
  };
  return ui(meanings[String(status || '')] || 'Current review state is recorded in the lifecycle history.');
}

function reviewDecisionValidationMessage(decision: ReviewDecision | undefined, draft: ReviewDecisionDraft, ui: (englishText: string) => string): string | null {
  if (!decision) {
    return ui('No review decision is currently available for this lifecycle state.');
  }

  const reasonRequired = !['acknowledged', 'reopened'].includes(decision);
  if (reasonRequired && !draft.reason_category) {
    return ui('Select a reason category before recording this decision.');
  }

  if (draft.reason_category === 'other' && !draft.reviewer_notes.trim()) {
    return ui('Add reviewer notes when the reason category is Other.');
  }

  if (decision === 'approved_for_manual_action'
    && draft.reason_category === 'business_policy_exception'
    && !draft.override_reason.trim()) {
    return ui('Add an override reason for a business policy exception.');
  }

  if (decision === 'escalated' && !draft.escalation_target_role) {
    return ui('Choose who should own the escalated review follow-up.');
  }

  if (decision === 'escalated' && !draft.escalation_due_at) {
    return ui('Choose a follow-up due date for the escalated review.');
  }

  return null;
}

const INTELLIGENCE_REVIEW_SYSTEM_TEXT: Record<string, string> = {
  intelligence_review_queue_review_context: 'Review recommendation context, explanation, source confidence, structured evidence, and governance requirements before taking any source-system action.',
  intelligence_review_queue_no_match: 'No recommendation review items currently match the requested filters.',
  intelligence_review_confidence_advisory: 'Source confidence is shown only when the originating record reports it; it is advisory and never authorizes automatic execution.',
  intelligence_review_override_persisted: 'Override reasons and reviewer notes are persisted in the governed Intelligence Review lifecycle when a permitted reviewer records a decision.',
  intelligence_review_approval_source_specific: 'Permitted reviewers can record governed review decisions here. Any permitted next step depends on the reviewed source type; no operational change occurs automatically.',
  intelligence_review_evidence_none: 'No structured outcome or comparison evidence is attached to this review item.',
  intelligence_review_evidence_workflow_metadata: 'The queue contains workflow metadata and confidence only; no simulated outcome payload is attached to this review item.',
  intelligence_review_evidence_governance_metadata: 'The queue contains governance metadata and confidence only; detailed policy evidence remains in the governed source data.',
  intelligence_review_evidence_forecast: 'Forecast range, current risk, and observed outcome evidence are available for human review.',
  intelligence_review_evidence_adaptive_policy: 'Policy evidence and the proposed tuning direction are available for human review.',
  intelligence_review_evidence_copilot: 'The governed Copilot proposal and its structured evidence are available for human review.',
  intelligence_review_evidence_persisted_history: 'Persisted review evidence from the governed decision is available for historical review.'
};

function localizedIntelligenceReviewSystemText(
  key: string | null | undefined,
  value: string | null | undefined,
  fallback: string,
  ui: (englishText: string) => string
): string {
  const canonical = key ? INTELLIGENCE_REVIEW_SYSTEM_TEXT[key] : null;
  if (canonical) return ui(canonical);
  const text = String(value || '').trim();
  return text || ui(fallback);
}


const READINESS_SYSTEM_TECHNICAL_TEXT: Readonly<Record<string, string>> = {
  block_release_if_backend_required_panel_anchor_is_not_declared_in_frontend_local_manifest:
    'Block release if the frontend does not declare the required backend panel anchor.',
  capture_runtime_evidence_rows_or_schema_probe_result:
    'Capture runtime evidence rows or the schema-probe result.',
  do_not_enable_unwaived_commercial_ai_for_this_feature_until_runtime_gaps_are_closed_or_a_manual_time_boxed_waiver_packet_is_recorded_outside_this_read_only_audit:
    'Do not enable unwaived commercial AI for this feature until runtime gaps are closed or a manual time-boxed waiver is recorded outside this read-only audit.',
  execute_or_observe_existing_non_mutating_feature_workflow:
    'Execute or observe the existing non-mutating feature workflow.',
  frontend_panel_must_render_backend_response_key_without_static_placeholder_only:
    'The frontend panel must render the backend response key rather than only a static placeholder.',
  open_live_frontend_surface_and_confirm_backend_response_is_rendered:
    'Open the live frontend surface and confirm the backend response is rendered.',
  post_enablement_monitoring_owner_must_be_assigned_before_rollout_scope_expands:
    'Assign a post-enablement monitoring owner before rollout scope expands.',
  read_only_advisory_only_no_autonomous_execution:
    'Read-only and advisory-only; no autonomous execution.',
  rerun_unified_ai_runtime_coverage_audit_and_confirm_gap_closure:
    'Rerun the unified AI runtime coverage audit and confirm the gaps are closed.',
  select_real_tenant_and_real_user_role_for_feature:
    'Select a real tenant and a real user role for the feature.',
  tenant_enablement_requires_runtime_validation_sample_and_release_owner_manual_approval:
    'Tenant enablement requires a runtime validation sample and manual approval from the release owner.',
};

function localizedReadinessSystemText(
  value: string | null | undefined,
  ui: (englishText: string) => string
): string {
  const text = String(value || '').trim();
  if (!text) return '';
  return ui(READINESS_SYSTEM_TECHNICAL_TEXT[text] || text);
}

function localizedReadinessSystemList(
  values: Array<string | null | undefined> | null | undefined,
  ui: (englishText: string) => string
): string[] {
  return (values || []).map((value) => localizedReadinessSystemText(value, ui)).filter(Boolean);
}

function localizedReadinessOperatorInstruction(
  value: string | null | undefined,
  locale: AppLocale,
  ui: (englishText: string) => string
): string {
  const text = String(value || '').trim();
  if (!text) return '';
  let match = text.match(/^Review (.+) evidence rows and tenant-scoped table coverage\.$/);
  if (match) {
    return ui('Review {feature} evidence rows and tenant-scoped table coverage.')
      .replace('{feature}', localizedReadinessSystemText(match[1], ui));
  }
  match = text.match(/^Close or explicitly waive (\d+) open hardening action\(s\)\.$/);
  if (match) {
    return ui('Close or explicitly waive {count} open hardening action(s).')
      .replace('{count}', formatLocalizedNumber(Number(match[1]), locale));
  }
  match = text.match(/^Resolve (\d+) required evidence gap\(s\) before production enablement\.$/);
  if (match) {
    return ui('Resolve {count} required evidence gap(s) before production enablement.')
      .replace('{count}', formatLocalizedNumber(Number(match[1]), locale));
  }
  match = text.match(/^Capture final signoff result for (.+) in the existing governance process\.$/);
  if (match) {
    return ui('Capture final signoff result for {feature} in the existing governance process.')
      .replace('{feature}', localizedReadinessSystemText(match[1], ui));
  }
  return localizedReadinessSystemText(text, ui);
}

function localizedReadinessLineageControl(
  row: { missing_lineage_links?: string[]; required_lineage_control?: string },
  ui: (englishText: string) => string
): string {
  const missing = row.missing_lineage_links || [];
  if (missing.length) {
    return ui('Complete missing lineage links before commercial enablement: {links}.')
      .replace('{links}', missing.map((item) => readinessCoreLabel(item, ui)).join(', '));
  }
  return ui('Lineage path is registered from evidence tables through backend endpoints and frontend operator surfaces.');
}

function localizedReviewEvidenceSummary(
  preview: HumanAIReview['simulation_preview'] | undefined,
  locale: AppLocale,
  ui: (englishText: string) => string
): string {
  if (!preview) return '';
  if (preview.preview_summary_key === 'intelligence_review_evidence_simulation_summary') {
    const metrics = preview.preview_metrics || {};
    return ui('{outcomes} projected outcome(s), {comparisons} comparison set(s), highest observed risk {risk}.')
      .replace('{outcomes}', formatLocalizedNumber(Number(metrics.outcome_count || 0), locale))
      .replace('{comparisons}', formatLocalizedNumber(Number(metrics.comparison_count || 0), locale))
      .replace('{risk}', recommendationLabel(String(metrics.highest_risk_level || 'low'), ui));
  }
  if (preview.preview_summary_key === 'intelligence_review_evidence_optimization_summary') {
    const metrics = preview.preview_metrics || {};
    return ui('{options} option(s), {tradeoffs} tradeoff record(s), {governance} governance-review option(s).')
      .replace('{options}', formatLocalizedNumber(Number(metrics.option_count || 0), locale))
      .replace('{tradeoffs}', formatLocalizedNumber(Number(metrics.tradeoff_count || 0), locale))
      .replace('{governance}', formatLocalizedNumber(Number(metrics.governance_review_option_count || 0), locale));
  }
  const canonical = preview.preview_summary_key ? INTELLIGENCE_REVIEW_SYSTEM_TEXT[preview.preview_summary_key] : null;
  return canonical ? ui(canonical) : String(preview.preview_summary || '');
}

function sourceReviewToAppPath(review: HumanAIReview): string | null {
  const sourceSurface = review.source_reference?.frontend_route
    || review.explainability_review?.source_surface
    || review.governance_approval_guidance?.approval_route;

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
    '/reports',
    '/cross-domain-optimization',
    '/probabilistic-forecasting',
    '/decision-learning-feedback',
    '/adaptive-policy-engine',
    '/ai-copilot'
  ]);

  if (!tenantRoutes.has(sourceSurface)) {
    return null;
  }

  const params = new URLSearchParams(review.source_reference?.frontend_route_query || '');
  if (sourceSurface === '/action-center') {
    if (review.source_action_id && !params.has('source_action_id')) {
      params.set('source_action_id', review.source_action_id);
    }
    if (review.source_action_domain && !params.has('domain')) {
      params.set('domain', review.source_action_domain);
    }
  }
  if (sourceSurface === '/probabilistic-forecasting' && review.source_action_id?.startsWith('probabilistic_forecast_model:') && !params.has('source_action_id')) {
    params.set('source_action_id', review.source_action_id);
  }

  const query = params.toString();
  return query ? `${sourceSurface}?${query}` : sourceSurface;
}


async function fetchIntelligenceProductionReadiness(forceRefresh = false): Promise<IntelligenceProductionReadinessResponse> {
  return apiRequest<IntelligenceProductionReadinessResponse>(`/intelligence-readiness/production-readiness-summary${forceRefresh ? '?refresh=true' : ''}`);
}

async function fetchIntelligenceProductionReadinessAuditPack(): Promise<IntelligenceProductionReadinessAuditPackResponse> {
  return apiRequest<IntelligenceProductionReadinessAuditPackResponse>('/intelligence-readiness/production-readiness-audit-pack');
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

async function fetchAIReviewHistory(sourceActionId: string): Promise<AIReviewHistoryResponse> {
  return apiRequest<AIReviewHistoryResponse>(`/operational-action-center/human-in-loop-ai-reviews/${encodeURIComponent(sourceActionId)}/history`);
}

async function recordAIReviewDecision(sourceActionId: string, body: Record<string, unknown>): Promise<AIReviewHistoryResponse> {
  return apiRequest<AIReviewHistoryResponse>(`/operational-action-center/human-in-loop-ai-reviews/${encodeURIComponent(sourceActionId)}/decision`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

async function createAIReviewExecutionRequestDraft(sourceActionId: string): Promise<AIReviewHistoryResponse> {
  return apiRequest<AIReviewHistoryResponse>(`/operational-action-center/human-in-loop-ai-reviews/${encodeURIComponent(sourceActionId)}/execution-request-draft`, {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function fetchHumanAIReviewSummary(
  aiOperationDomain: 'all' | AIOperationDomain,
  reviewState: 'all' | ReviewState,
  urgency: 'all' | Urgency,
  sourceActionId?: string | null
): Promise<HumanAIReviewResponse> {
  const params = new URLSearchParams({ limit: sourceActionId ? '1' : '75' });

  if (sourceActionId) {
    params.set('source_action_id', sourceActionId);
  } else {
    if (aiOperationDomain !== 'all') {
      params.set('ai_operation_domain', aiOperationDomain);
    }

    if (reviewState !== 'all') {
      params.set('review_state', reviewState);
    }

    if (urgency !== 'all') {
      params.set('urgency', urgency);
    }
  }

  return apiRequest<HumanAIReviewResponse>(`/operational-action-center/human-in-loop-ai-operations-summary?${params.toString()}`);
}

export default function HumanInLoopAIReviewPage() {
  const { locale, ui } = useAppTranslation();
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSourceActionId = searchParams.get('source_action_id');
  const activeView: IntelligenceReviewView = searchParams.get('view') === 'readiness' ? 'readiness' : 'recommendations';
  const [aiOperationDomain, setAiOperationDomain] = useState<'all' | AIOperationDomain>('all');
  const [reviewState, setReviewState] = useState<'all' | ReviewState>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');
  const [selectedReadinessFeatureKey, setSelectedReadinessFeatureKey] = useState<string>('');
  const [selectedHistorySourceActionId, setSelectedHistorySourceActionId] = useState<string | null>(requestedSourceActionId);
  const [reviewDecisionDrafts, setReviewDecisionDrafts] = useState<Record<string, ReviewDecisionDraft>>({});
  const [reviewActionMessage, setReviewActionMessage] = useState<string | null>(null);
  const [isForcingReadinessRefresh, setIsForcingReadinessRefresh] = useState(false);
  const lastAutoScrolledSourceActionId = useRef<string | null>(null);

  const reviewQuery = useQuery({
    queryKey: ['human-in-loop-ai-review', aiOperationDomain, reviewState, urgency, requestedSourceActionId],
    queryFn: () => fetchHumanAIReviewSummary(aiOperationDomain, reviewState, urgency, requestedSourceActionId),
    enabled: activeView === 'recommendations'
  });

  const reviewHistoryQuery = useQuery({
    queryKey: ['human-in-loop-ai-review-history', selectedHistorySourceActionId],
    queryFn: () => fetchAIReviewHistory(selectedHistorySourceActionId || ''),
    enabled: activeView === 'recommendations' && Boolean(selectedHistorySourceActionId)
  });

  const reviewDecisionMutation = useMutation({
    mutationFn: ({ sourceActionId, body }: { sourceActionId: string; body: Record<string, unknown> }) => recordAIReviewDecision(sourceActionId, body),
    onSuccess: async (result, variables) => {
      setReviewActionMessage(ui('Intelligence review decision recorded and audit history updated.'));
      const sourceActionId = result.source?.source_action_id || variables.sourceActionId || selectedHistorySourceActionId;
      if (sourceActionId) {
        setSelectedHistorySourceActionId(sourceActionId);
        setReviewDecisionDrafts((current) => {
          const next = { ...current };
          delete next[sourceActionId];
          return next;
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_HISTORY_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [ACTION_CENTER_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['intelligence-review', 'navigation-attention'] })
      ]);
    },
    onError: (error) => setReviewActionMessage(error instanceof Error ? error.message : ui('Unable to record the intelligence review decision.'))
  });

  const executionRequestDraftMutation = useMutation({
    mutationFn: (sourceActionId: string) => createAIReviewExecutionRequestDraft(sourceActionId),
    onSuccess: async (result) => {
      setReviewActionMessage(ui('Draft Execution Request created from the approved intelligence review. No operational action was executed.'));
      const sourceActionId = result.source?.source_action_id || selectedHistorySourceActionId;
      if (sourceActionId) setSelectedHistorySourceActionId(sourceActionId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_HISTORY_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['execution-requests'] }),
        queryClient.invalidateQueries({ queryKey: [ACTION_CENTER_QUERY_KEY] })
      ]);
    },
    onError: (error) => setReviewActionMessage(error instanceof Error ? error.message : ui('Unable to create the Execution Request draft.'))
  });

  const readinessQuery = useQuery({
    queryKey: ['intelligence-production-readiness-summary'],
    queryFn: fetchIntelligenceProductionReadiness,
    enabled: activeView === 'readiness'
  });

  const readinessAuditPackQuery = useQuery({
    queryKey: ['intelligence-production-readiness-audit-pack'],
    queryFn: fetchIntelligenceProductionReadinessAuditPack,
    enabled: activeView === 'readiness'
  });

  const hardeningPlanQuery = useQuery({
    queryKey: ['intelligence-production-hardening-plan'],
    queryFn: fetchIntelligenceHardeningPlan,
    enabled: activeView === 'readiness'
  });

  const signoffChecklistQuery = useQuery({
    queryKey: ['intelligence-production-signoff-checklist'],
    queryFn: fetchIntelligenceSignoffChecklist,
    enabled: activeView === 'readiness'
  });


  const releaseDecisionBoardQuery = useQuery({
    queryKey: ['intelligence-production-release-decision-board'],
    queryFn: fetchIntelligenceReleaseDecisionBoard,
    enabled: activeView === 'readiness'
  });

  const operationalRunbookQuery = useQuery({
    queryKey: ['intelligence-production-operational-runbook'],
    queryFn: fetchIntelligenceOperationalRunbook,
    enabled: activeView === 'readiness'
  });


  const validationSuiteQuery = useQuery({
    queryKey: ['intelligence-production-validation-suite'],
    queryFn: fetchIntelligenceValidationSuite,
    enabled: activeView === 'readiness'
  });


  const enablementManifestQuery = useQuery({
    queryKey: ['intelligence-production-enablement-manifest'],
    queryFn: fetchIntelligenceEnablementManifest,
    enabled: activeView === 'readiness'
  });


  const monitoringContractQuery = useQuery({
    queryKey: ['intelligence-production-monitoring-contract'],
    queryFn: fetchIntelligenceMonitoringContract,
    enabled: activeView === 'readiness'
  });

  const remediationWorkbenchQuery = useQuery({
    queryKey: ['intelligence-production-remediation-workbench'],
    queryFn: fetchIntelligenceRemediationWorkbench,
    enabled: activeView === 'readiness'
  });


  const evidenceMatrixQuery = useQuery({
    queryKey: ['intelligence-production-evidence-matrix'],
    queryFn: fetchIntelligenceEvidenceMatrix,
    enabled: activeView === 'readiness'
  });


  const featureDetailQuery = useQuery({
    queryKey: ['intelligence-production-feature-detail', selectedReadinessFeatureKey],
    queryFn: () => fetchIntelligenceFeatureDetail(selectedReadinessFeatureKey),
    enabled: activeView === 'readiness' && Boolean(selectedReadinessFeatureKey)
  });

  const recommendationQueries = [
    reviewQuery,
    ...(selectedHistorySourceActionId ? [reviewHistoryQuery] : [])
  ];

  const readinessQueries = [
    readinessQuery,
    readinessAuditPackQuery,
    hardeningPlanQuery,
    signoffChecklistQuery,
    releaseDecisionBoardQuery,
    operationalRunbookQuery,
    validationSuiteQuery,
    enablementManifestQuery,
    monitoringContractQuery,
    remediationWorkbenchQuery,
    evidenceMatrixQuery,
    featureDetailQuery
  ];

  const activeViewQueries = activeView === 'readiness' ? readinessQueries : recommendationQueries;
  const isRefreshingActiveView = isForcingReadinessRefresh || activeViewQueries.some((query) => query.isFetching);

  const refreshActiveView = async () => {
    if (activeView !== 'readiness') {
      await Promise.all(activeViewQueries.map((query) => query.refetch()));
      return;
    }

    setIsForcingReadinessRefresh(true);
    try {
      const freshReadiness = await fetchIntelligenceProductionReadiness(true);
      queryClient.setQueryData(['intelligence-production-readiness-summary'], freshReadiness);
      await Promise.all(readinessQueries.slice(1).map((query) => query.refetch()));
    } finally {
      setIsForcingReadinessRefresh(false);
    }
  };

  const selectView = (view: IntelligenceReviewView) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    if (view === 'readiness') {
      nextSearchParams.set('view', 'readiness');
    } else {
      nextSearchParams.delete('view');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };


  const response = reviewQuery.data;
  const hasReviewSnapshot = Boolean(response);
  const isFocusedReview = activeView === 'recommendations' && Boolean(requestedSourceActionId);
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const reviews = useMemo(() => response?.reviews || [], [response?.reviews]);
  const canViewDiagnostics = hasPermission(TENANT_PERMISSIONS.TENANT_DIAGNOSTICS_READ);

  useEffect(() => {
    if (activeView !== 'recommendations') return;
    setSelectedHistorySourceActionId(requestedSourceActionId);
  }, [activeView, requestedSourceActionId]);

  useEffect(() => {
    if (activeView !== 'recommendations' || !requestedSourceActionId || reviewQuery.isLoading || lastAutoScrolledSourceActionId.current === requestedSourceActionId) {
      return;
    }

    const requestedReviewExists = reviews.some((review) => review.source_action_id === requestedSourceActionId);
    if (!requestedReviewExists) {
      return;
    }

    lastAutoScrolledSourceActionId.current = requestedSourceActionId;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`ai-review-${requestedSourceActionId}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeView, requestedSourceActionId, reviewQuery.isLoading, reviews]);
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  const readiness = readinessQuery.data;
  const hasReadinessSnapshot = Boolean(readiness);
  const readinessSummary = readiness?.summary || {};
  const readinessFeatures = useMemo(() => readiness?.features || [], [readiness?.features]);
  const productionBacklog = readiness?.production_backlog || [];

  useEffect(() => {
    if (activeView !== 'readiness' || !hasReadinessSnapshot || readinessFeatures.length === 0) return;
    if (readinessFeatures.some((feature) => feature.key === selectedReadinessFeatureKey)) return;
    setSelectedReadinessFeatureKey(readinessFeatures[0].key);
  }, [activeView, hasReadinessSnapshot, readinessFeatures, selectedReadinessFeatureKey]);
  const auditPack = readinessAuditPackQuery.data?.audit_pack || readiness?.audit_pack;
  const capabilityInventory = readiness?.unified_ai_capability_inventory;
  const aiRiskScoring = readiness?.unified_ai_risk_scoring;
  const aiDecisionLineage = readiness?.unified_ai_decision_lineage;
  const aiRollbackOrchestration = readiness?.unified_ai_rollback_orchestration;
  const aiMaturitySelfAudit = readiness?.unified_ai_maturity_self_audit;
  const aiGovernanceDashboard = readiness?.unified_ai_governance_dashboard;
  const aiCommercialReleaseGate = readiness?.unified_ai_commercial_release_gate;
  const aiCommercialReleaseEvidenceDossier = readiness?.unified_ai_commercial_release_evidence_dossier;
  const aiRouteExposureAudit = readiness?.unified_ai_route_exposure_audit;
  const aiRuntimeCoverageAudit = readiness?.unified_ai_runtime_coverage_audit;
  const aiRuntimeCoverageRows = aiRuntimeCoverageAudit?.runtime_coverage_rows || [];
  const aiHighPriorityRuntimeGaps = aiRuntimeCoverageAudit?.high_priority_runtime_gaps || [];
  const aiRuntimeRemediationWorklist = readiness?.unified_ai_runtime_remediation_worklist;
  const aiRuntimeRemediationItems = aiRuntimeRemediationWorklist?.prioritized_runtime_remediation_items || [];
  const aiRuntimeValidationDrill = readiness?.unified_ai_runtime_validation_drill;
  const aiRuntimeValidationDrillRows = aiRuntimeValidationDrill?.runtime_validation_drill_rows || [];
  const aiRuntimeSignoffEvidenceLedger = readiness?.unified_ai_runtime_signoff_evidence_ledger;
  const aiRuntimeSignoffEvidenceRows = aiRuntimeSignoffEvidenceLedger?.runtime_signoff_evidence_rows || [];
  const aiRuntimeSignoffWaiverPacketRows = aiRuntimeSignoffEvidenceLedger?.manual_waiver_packet_rows || [];
  const aiRuntimeWaiverReviewRegister = readiness?.unified_ai_runtime_waiver_review_register;
  const aiRuntimeWaiverEscalationMatrix = readiness?.unified_ai_runtime_waiver_escalation_matrix;
  const aiRuntimeWaiverEscalationRows = aiRuntimeWaiverEscalationMatrix?.waiver_escalation_rows || [];
  const aiTier1RuntimeWaiverEscalationRows = aiRuntimeWaiverEscalationMatrix?.tier_1_executive_escalation_rows || [];
  const aiRuntimeWaiverClosureBoard = readiness?.unified_ai_runtime_waiver_closure_board;
  const aiRuntimeWaiverClosureRows = aiRuntimeWaiverClosureBoard?.waiver_closure_rows || [];
  const aiExecutiveBlockedWaiverClosureRows = aiRuntimeWaiverClosureBoard?.executive_blocked_waiver_closure_rows || [];
  const aiRuntimePostClosureMonitoringPlan = readiness?.unified_ai_runtime_post_closure_monitoring_plan;
  const aiRuntimePostClosureMonitoringRows = aiRuntimePostClosureMonitoringPlan?.post_closure_monitoring_rows || [];
  const aiBlockedPostClosureMonitoringRows = aiRuntimePostClosureMonitoringPlan?.blocked_post_closure_monitoring_rows || [];
  const aiRuntimePostClosureEvidenceAcceptanceGate = readiness?.unified_ai_runtime_post_closure_evidence_acceptance_gate;
  const aiRuntimePostClosureEvidenceAcceptanceRows = aiRuntimePostClosureEvidenceAcceptanceGate?.post_closure_evidence_acceptance_rows || [];
  const aiBlockedPostClosureEvidenceAcceptanceRows = aiRuntimePostClosureEvidenceAcceptanceGate?.blocked_post_closure_evidence_acceptance_rows || [];
  const aiRuntimeBroadReleaseReadinessBoard = readiness?.unified_ai_runtime_broad_release_readiness_board;
  const aiRuntimeBroadReleaseReadinessRows = aiRuntimeBroadReleaseReadinessBoard?.broad_release_readiness_rows || [];
  const aiBlockedRuntimeBroadReleaseReadinessRows = aiRuntimeBroadReleaseReadinessBoard?.blocked_broad_release_readiness_rows || [];
  const aiRuntimeTenantEnablementControlQueue = readiness?.unified_ai_runtime_tenant_enablement_control_queue;
  const aiRuntimeTenantEnablementControlRows = aiRuntimeTenantEnablementControlQueue?.tenant_enablement_control_rows || [];
  const aiBlockedRuntimeTenantEnablementControlRows = aiRuntimeTenantEnablementControlQueue?.blocked_tenant_enablement_control_rows || [];
  const aiRuntimePostEnablementHealthWatchlist = readiness?.unified_ai_runtime_post_enablement_health_watchlist;
  const aiRuntimePostEnablementHealthWatchRows = aiRuntimePostEnablementHealthWatchlist?.post_enablement_health_watch_rows || [];
  const aiBlockedRuntimePostEnablementHealthWatchRows = aiRuntimePostEnablementHealthWatchlist?.blocked_post_enablement_health_watch_rows || [];
  const aiRuntimePostEnablementIncidentResponseQueue = readiness?.unified_ai_runtime_post_enablement_incident_response_queue;
  const aiRuntimePostEnablementIncidentResponseRows = aiRuntimePostEnablementIncidentResponseQueue?.post_enablement_incident_response_rows || [];
  const aiBlockedRuntimePostEnablementIncidentResponseRows = aiRuntimePostEnablementIncidentResponseQueue?.blocked_post_enablement_incident_response_rows || [];
  const aiRuntimePostEnablementIncidentClosureBoard = readiness?.unified_ai_runtime_post_enablement_incident_closure_board;
  const aiRuntimePostEnablementIncidentClosureRows = aiRuntimePostEnablementIncidentClosureBoard?.post_enablement_incident_closure_rows || [];
  const aiBlockedRuntimePostEnablementIncidentClosureRows = aiRuntimePostEnablementIncidentClosureBoard?.blocked_post_enablement_incident_closure_rows || [];
  const aiRuntimePostEnablementPreventionVerificationBacklog = readiness?.unified_ai_runtime_post_enablement_prevention_verification_backlog;
  const aiRuntimePostEnablementPreventionVerificationRows = aiRuntimePostEnablementPreventionVerificationBacklog?.post_enablement_prevention_verification_rows || [];
  const aiBlockedRuntimePostEnablementPreventionVerificationRows = aiRuntimePostEnablementPreventionVerificationBacklog?.blocked_post_enablement_prevention_verification_rows || [];
  const aiRuntimePostEnablementRolloutResumeAuthorizationLedger = readiness?.unified_ai_runtime_post_enablement_rollout_resume_authorization_ledger;
  const aiRuntimePostEnablementRolloutResumeAuthorizationRows = aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.post_enablement_rollout_resume_authorization_rows || [];
  const aiBlockedRuntimePostEnablementRolloutResumeAuthorizationRows = aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.blocked_post_enablement_rollout_resume_authorization_rows || [];
  const aiRuntimePostEnablementRolloutResumeObservationBoard = readiness?.unified_ai_runtime_post_enablement_rollout_resume_observation_board;
  const aiRuntimePostEnablementRolloutResumeObservationRows = aiRuntimePostEnablementRolloutResumeObservationBoard?.post_enablement_rollout_resume_observation_rows || [];
  const aiBlockedRuntimePostEnablementRolloutResumeObservationRows = aiRuntimePostEnablementRolloutResumeObservationBoard?.blocked_post_enablement_rollout_resume_observation_rows || [];
  const aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard = readiness?.unified_ai_runtime_post_enablement_rollout_scope_expansion_authorization_board;
  const aiRuntimePostEnablementRolloutScopeExpansionAuthorizationRows = aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.post_enablement_rollout_scope_expansion_authorization_rows || [];
  const aiBlockedRuntimePostEnablementRolloutScopeExpansionAuthorizationRows = aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.blocked_post_enablement_rollout_scope_expansion_authorization_rows || [];
  const aiRuntimePostEnablementExpandedScopeHealthBoard = readiness?.unified_ai_runtime_post_enablement_expanded_scope_health_board;
  const aiRuntimePostEnablementExpandedScopeHealthRows = aiRuntimePostEnablementExpandedScopeHealthBoard?.post_enablement_expanded_scope_health_rows || [];
  const aiBlockedRuntimePostEnablementExpandedScopeHealthRows = aiRuntimePostEnablementExpandedScopeHealthBoard?.blocked_post_enablement_expanded_scope_health_rows || [];
  const aiRuntimePostEnablementRolloutGrowthAuthorizationBoard = readiness?.unified_ai_runtime_post_enablement_rollout_growth_authorization_board;
  const aiRuntimePostEnablementRolloutGrowthAuthorizationRows = aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.post_enablement_rollout_growth_authorization_rows || [];
  const aiBlockedRuntimePostEnablementRolloutGrowthAuthorizationRows = aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.blocked_post_enablement_rollout_growth_authorization_rows || [];
  const aiRuntimePostEnablementRolloutGrowthObservationBoard = readiness?.unified_ai_runtime_post_enablement_rollout_growth_observation_board;
  const aiRuntimePostEnablementRolloutGrowthObservationRows = aiRuntimePostEnablementRolloutGrowthObservationBoard?.post_enablement_rollout_growth_observation_rows || [];
  const aiBlockedRuntimePostEnablementRolloutGrowthObservationRows = aiRuntimePostEnablementRolloutGrowthObservationBoard?.blocked_post_enablement_rollout_growth_observation_rows || [];
  const aiRuntimePostEnablementRolloutGrowthNextStepGate = readiness?.unified_ai_runtime_post_enablement_rollout_growth_next_step_gate;
  const aiRuntimePostEnablementRolloutGrowthNextStepGateRows = aiRuntimePostEnablementRolloutGrowthNextStepGate?.post_enablement_rollout_growth_next_step_gate_rows || [];
  const aiBlockedRuntimePostEnablementRolloutGrowthNextStepGateRows = aiRuntimePostEnablementRolloutGrowthNextStepGate?.blocked_post_enablement_rollout_growth_next_step_gate_rows || [];
  const aiRuntimePostEnablementNextWaveObservationBoard = readiness?.unified_ai_runtime_post_enablement_next_wave_observation_board;
  const aiRuntimePostEnablementNextWaveObservationRows = aiRuntimePostEnablementNextWaveObservationBoard?.post_enablement_next_wave_observation_rows || [];
  const aiBlockedRuntimePostEnablementNextWaveObservationRows = aiRuntimePostEnablementNextWaveObservationBoard?.blocked_post_enablement_next_wave_observation_rows || [];
  const aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard = readiness?.unified_ai_runtime_post_enablement_additional_growth_authorization_board;
  const aiRuntimePostEnablementAdditionalGrowthAuthorizationRows = aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.post_enablement_additional_growth_authorization_rows || [];
  const aiBlockedRuntimePostEnablementAdditionalGrowthAuthorizationRows = aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.blocked_post_enablement_additional_growth_authorization_rows || [];
  const aiRuntimePostEnablementAdditionalGrowthObservationBoard = readiness?.unified_ai_runtime_post_enablement_additional_growth_observation_board;
  const aiRuntimePostEnablementAdditionalGrowthObservationRows = aiRuntimePostEnablementAdditionalGrowthObservationBoard?.post_enablement_additional_growth_observation_rows || [];
  const aiBlockedRuntimePostEnablementAdditionalGrowthObservationRows = aiRuntimePostEnablementAdditionalGrowthObservationBoard?.blocked_post_enablement_additional_growth_observation_rows || [];
  const aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard = readiness?.unified_ai_runtime_post_enablement_further_growth_exit_criteria_board;
  const aiRuntimePostEnablementFurtherGrowthExitRows = aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.post_enablement_further_growth_exit_rows || [];
  const aiBlockedRuntimePostEnablementFurtherGrowthExitRows = aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.blocked_post_enablement_further_growth_exit_rows || [];
  const aiRuntimePostEnablementSteadyStateCertificationBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_certification_board;
  const aiRuntimePostEnablementSteadyStateCertificationRows = aiRuntimePostEnablementSteadyStateCertificationBoard?.post_enablement_steady_state_certification_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateCertificationRows = aiRuntimePostEnablementSteadyStateCertificationBoard?.blocked_post_enablement_steady_state_certification_rows || [];
  const aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_monitoring_cadence_board;
  const aiRuntimePostEnablementSteadyStateMonitoringCadenceRows = aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.post_enablement_steady_state_monitoring_cadence_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateMonitoringCadenceRows = aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.blocked_post_enablement_steady_state_monitoring_cadence_rows || [];
  const aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue = readiness?.unified_ai_runtime_post_enablement_steady_state_monitoring_exception_review_queue;
  const aiRuntimePostEnablementSteadyStateMonitoringExceptionRows = aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.post_enablement_steady_state_exception_review_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateMonitoringExceptionRows = aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.blocked_post_enablement_steady_state_exception_review_rows || [];
  const aiRuntimePostEnablementSteadyStateExceptionClosureBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_exception_closure_board;
  const aiRuntimePostEnablementSteadyStateExceptionClosureRows = aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.post_enablement_steady_state_exception_closure_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateExceptionClosureRows = aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.blocked_post_enablement_steady_state_exception_closure_rows || [];
  const aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_exception_recurrence_audit_board;
  const aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows = aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.post_enablement_steady_state_exception_recurrence_audit_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows = aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.blocked_post_enablement_steady_state_exception_recurrence_audit_rows || [];

  const aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_exception_recurrence_resolution_board;
  const aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows = aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.post_enablement_steady_state_exception_recurrence_resolution_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows = aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.blocked_post_enablement_steady_state_exception_recurrence_resolution_rows || [];

  const aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_exception_resolution_verification_board;
  const aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows = aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.post_enablement_steady_state_exception_resolution_verification_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows = aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.blocked_post_enablement_steady_state_exception_resolution_verification_rows || [];
  const aiRuntimePostEnablementSteadyStateCertificationRenewalBoard = readiness?.unified_ai_runtime_post_enablement_steady_state_certification_renewal_board;
  const aiRuntimePostEnablementSteadyStateCertificationRenewalRows = aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.post_enablement_steady_state_certification_renewal_rows || [];
  const aiBlockedRuntimePostEnablementSteadyStateCertificationRenewalRows = aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.blocked_post_enablement_steady_state_certification_renewal_rows || [];
  const aiRuntimeFinalGovernanceAuditPack = readiness?.unified_ai_runtime_final_governance_audit_pack;
  const aiRuntimeFinalGovernanceAuditRows = aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_rows || [];
  const aiBlockedRuntimeFinalGovernanceAuditRows = aiRuntimeFinalGovernanceAuditPack?.blocked_final_governance_audit_rows || [];
  const aiFinalCompletionFreezeManifest = readiness?.unified_ai_final_completion_freeze_manifest;
  const aiFinalCompletionFreezeRows = aiFinalCompletionFreezeManifest?.final_completion_freeze_rows || [];
  const aiBlockedFinalCompletionFreezeRows = aiFinalCompletionFreezeManifest?.blocked_final_completion_freeze_rows || [];
  const aiCommercialCompletionCertificate = readiness?.unified_ai_commercial_completion_certificate;
  const aiCommercialCompletionCertificateRows = aiCommercialCompletionCertificate?.commercial_completion_certificate_rows || [];
  const aiBlockedCommercialCompletionCertificateRows = aiCommercialCompletionCertificate?.blocked_commercial_completion_certificate_rows || [];
  const aiRuntimeWaiverReviewRows = aiRuntimeWaiverReviewRegister?.waiver_review_rows || [];
  const aiCriticalHighWaiverReviewRows = aiRuntimeWaiverReviewRegister?.critical_high_waiver_review_rows || [];
  const aiContractFreezeManifest = readiness?.unified_ai_contract_freeze_manifest;
  const aiResponseContractAudit = readiness?.unified_ai_response_contract_audit;
  const frontendRuntimeAnchorSelfCheck = useMemo(() => {
    const backendRequiredPanelKeys = (aiResponseContractAudit?.frontend_required_panels || [])
      .map((panel) => panel.panel_key)
      .filter((panelKey): panelKey is string => Boolean(panelKey));
    const frontendAnchorKeys = [...UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS];
    const missingFrontendAnchors = backendRequiredPanelKeys.filter((panelKey) => !frontendAnchorKeys.includes(panelKey as typeof UNIFIED_AI_FRONTEND_PANEL_DOM_ANCHORS[number]));
    const unexpectedFrontendAnchors = frontendAnchorKeys.filter((panelKey) => !backendRequiredPanelKeys.includes(panelKey));
    const orderMismatches = backendRequiredPanelKeys
      .map((panelKey, index) => ({ expected: panelKey, actual: frontendAnchorKeys[index], index }))
      .filter((row) => row.expected !== row.actual);

    return {
      status: missingFrontendAnchors.length || unexpectedFrontendAnchors.length
        ? 'frontend_runtime_dom_anchor_manifest_drift_detected'
        : 'frontend_runtime_dom_anchor_manifest_aligned',
      order_status: orderMismatches.length
        ? 'frontend_runtime_dom_anchor_manifest_order_drift_detected'
        : 'frontend_runtime_dom_anchor_manifest_order_aligned',
      backend_required_panel_count: backendRequiredPanelKeys.length,
      frontend_declared_anchor_count: frontendAnchorKeys.length,
      missing_frontend_anchors: missingFrontendAnchors,
      unexpected_frontend_anchors: unexpectedFrontendAnchors,
      order_mismatches: orderMismatches
    };
  }, [aiResponseContractAudit?.frontend_required_panels]);
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

  const updateReviewDecisionDraft = (sourceActionId: string, patch: Partial<ReviewDecisionDraft>) => {
    setReviewDecisionDrafts((current) => ({
      ...current,
      [sourceActionId]: {
        ...(current[sourceActionId] || defaultReviewDecisionDraft),
        ...patch
      }
    }));
  };

  const submitReviewDecision = (review: HumanAIReview) => {
    const sourceActionId = review.source_action_id;
    if (!sourceActionId) return;
    const draft = reviewDecisionDrafts[sourceActionId] || defaultReviewDecisionDraft;
    const allowed = review.lifecycle?.allowed_decisions || [];
    const decision = allowed.includes(draft.decision) ? draft.decision : allowed[0];
    if (!decision) return;

    setReviewActionMessage(null);
    reviewDecisionMutation.mutate({
      sourceActionId,
      body: {
        decision,
        reason_category: draft.reason_category || null,
        reviewer_notes: draft.reviewer_notes || null,
        override_reason: draft.override_reason || null,
        escalation_target_role: decision === 'escalated' ? draft.escalation_target_role || null : null,
        escalation_due_at: decision === 'escalated' && draft.escalation_due_at
          ? dateInputEndOfDayIso(draft.escalation_due_at)
          : null,
        expected_version: review.lifecycle?.version || undefined
      }
    });
  };

  const reviewSummaryValue = (value: unknown): string => {
    if (hasReviewSnapshot) return formatLocalizedNumber(numberValue(value), locale);
    return reviewQuery.isLoading ? ui('Loading…') : ui('Unavailable');
  };

  const readinessSummaryValue = (value: unknown, percent = false): string => {
    if (!hasReadinessSnapshot) return readinessQuery.isLoading ? ui('Loading…') : ui('Unavailable');
    const formatted = formatLocalizedNumber(numberValue(value), locale);
    return percent ? `${formatted}%` : formatted;
  };

  return (
    <div className="ai-review-page ai-review-page--refined io-operational-page io-workspace-page io-workspace-legacy-normalized">
      {/* Tenant-facing hero pills intentionally hidden. Original rendering preserved here for restoration:
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Human decision required")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("No recommendation auto-execution")}</OperationalWorkspaceMetaPill>
      */}
      <OperationalWorkspaceHero
        iconPath="/intelligence-review"
        eyebrow={ui("Decision intelligence & governance")}
        title={ui("Intelligence Review")}
        description={ui("Review actionable recommendations separately from technical readiness and governance checks. Results may come from rules, simulations, optimization logic, governance findings, or optional AI-assisted analysis; human review remains authoritative.")}
        aside={<OperationalWorkspaceStatus value={activeView === 'readiness' ? ui('Readiness') : ui('Human review')} label={ui("current intelligence review view")} />}
      />

      {activeView === 'recommendations' ? (
        isFocusedReview ? null : (
          <OperationalWorkspaceStats ariaLabel={ui("Recommendation review summary")}>
            <OperationalWorkspaceStatCard label={ui("Open reviews")} value={reviewSummaryValue(summary.active_reviews)} helper={ui("Rule-based and optional AI-assisted proposals waiting for human review")} iconPath="/intelligence-review" tone="blue" />
            <OperationalWorkspaceStatCard label={ui("Approval required")} value={reviewSummaryValue(summary.approval_required_reviews)} helper={ui("Items that remain inside a governed approval workflow")} iconPath="/permissions" tone={hasReviewSnapshot && numberValue(summary.approval_required_reviews) > 0 ? 'warn' : hasReviewSnapshot ? 'good' : 'neutral'} />
            <OperationalWorkspaceStatCard label={ui("Escalated")} value={reviewSummaryValue(summary.escalated_reviews)} helper={ui("High-attention items requiring management or governance follow-up")} iconPath="/alerts" tone={hasReviewSnapshot && numberValue(summary.escalated_reviews) > 0 ? 'danger' : hasReviewSnapshot ? 'good' : 'neutral'} />
            <OperationalWorkspaceStatCard label={ui("Safety rule")} value={ui("Human decision only")} helper={ui("Review decisions never execute the underlying recommendation")} iconPath="/reliability-command" tone="good" />
          </OperationalWorkspaceStats>
        )
      ) : (
        <OperationalWorkspaceStats ariaLabel={ui("Intelligence readiness summary")}>
          <OperationalWorkspaceStatCard label={ui("Visible intelligence features")} value={readinessSummaryValue(readinessSummary.total_features)} helper={ui("Registered intelligence and AI-assisted modules available to your role")} iconPath="/intelligence-review" tone="blue" />
          <OperationalWorkspaceStatCard label={ui("Production candidates")} value={readinessSummaryValue(readinessSummary.production_candidates)} helper={ui("Implemented features still requiring hardening evidence")} iconPath="/reliability-command" tone={hasReadinessSnapshot ? 'warn' : 'neutral'} />
          <OperationalWorkspaceStatCard label={ui("Tenant-data backed")} value={readinessSummaryValue(readinessSummary.tenant_data_backed_features)} helper={ui("Features with current tenant evidence rows")} iconPath="/system-context" tone="blue" />
          <OperationalWorkspaceStatCard label={ui("Average readiness")} value={readinessSummaryValue(readinessSummary.average_readiness_score, true)} helper={ui("Production-readiness score across visible features")} iconPath="/reports" tone="neutral" />
        </OperationalWorkspaceStats>
      )}

      <OperationalWorkspaceTabs ariaLabel={ui("Intelligence review view")}>
        <OperationalWorkspaceTab active={activeView === 'recommendations'} iconPath="/intelligence-review" label={ui("Recommendation reviews")} onClick={() => selectView('recommendations')} />
        <OperationalWorkspaceTab active={activeView === 'readiness'} iconPath="/reliability-command" label={ui("Readiness & governance")} onClick={() => selectView('readiness')} />
      </OperationalWorkspaceTabs>

      <div className="card ai-review-page__mode-bar">
        <div style={toolbarStyle}>
          {activeView === 'readiness' ? (
            <button className="button button--secondary" type="button" onClick={() => { void refreshActiveView(); }} disabled={isRefreshingActiveView}>
              <TenantNavIcon path="/intelligence-review" size={16} />
              {isRefreshingActiveView ? ui('Refreshing readiness checks…') : ui('Refresh readiness checks')}
            </button>
          ) : null}
          <Link className="button button--secondary" to="/action-center"><TenantNavIcon path="/action-center" size={16} />{ui("Open action center")}</Link>
          {/* Duplicate Workflow Composer action intentionally hidden here; it remains in Recommendation review controls. */}
          {/* <Link className="button button--secondary" to="/workflow-composer"><TenantNavIcon path="/workflow-composer" size={16} />{ui("Open workflow composer")}</Link> */}
        </div>
        <p className="card__subtext ai-review-page__mode-explanation">
          {activeView === 'readiness'
            ? ui('This view checks evidence, testing, monitoring, rollback, release, and audit controls. It does not prove that an external AI model was used and it cannot enable or release a feature.')
            : ui('This view is the actionable human queue. A review decision never performs the underlying inventory, pricing, configuration, or release action.')}
        </p>
      </div>


      {activeView === 'readiness' ? (
      <section className="section">
        <div className="section__title">{ui("Intelligence feature readiness")}</div>
        <div className="card ai-review-page__readiness-note" style={{ marginBottom: 12 }}>
          <strong>{ui("What this means:")}</strong> {ui("These checks govern rule-based intelligence and optional AI-assisted capabilities. They measure evidence and operational safety, not whether every feature uses a machine-learning model.")}
        </div>
        <div className="card">
          {readinessQuery.isLoading ? (
            <p className="card__subtext">{ui("Loading intelligence and AI-assisted production readiness…")}</p>
          ) : readinessQuery.error ? (
            <p className="form-error">
              {readinessQuery.error instanceof ApiError
                ? readinessQuery.error.message
                : ui('Unable to load intelligence and AI-assisted production readiness.')}
            </p>
          ) : (
            <>
              <p className="card__subtext">
                {ui("This readiness view is read-only. It does not execute recommendations, mutate inventory, approve decisions, call external AI, or train models.")}
              </p>
              <div className="ai-review-page__review-list" style={reviewListStyle}>
                {criticalReadinessFeatures.map((feature) => (
                  <article className="card" key={feature.key}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span style={badgeStyle}>{readinessCoreLabel(feature.production_priority, ui)}</span>
                      <span style={badgeStyle}>{readinessCoreLabel(feature.production_status, ui)}</span>
                      <span style={badgeStyle}>{readinessCoreLabel(feature.completion_band, ui)}</span>
                      <span style={badgeStyle}>{formatLocalizedNumber(numberValue(feature.readiness_score), locale)}% {ui("ready")}</span>
                    </div>
                    <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(feature.label, ui)}</h3>
                    <p className="card__subtext">
                      {formatLocalizedNumber(numberValue(feature.evidence?.tenant_data_rows), locale)} {ui("tenant evidence rows across")} {formatLocalizedNumber(numberValue(feature.evidence?.existing_table_count), locale)} / {formatLocalizedNumber(numberValue(feature.evidence?.expected_table_count), locale)} {ui("expected evidence tables.")}
                    </p>
                    {feature.implemented_capabilities?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div className="card__label">{ui("Implemented")}</div>
                        <p className="card__subtext">{localizedReadinessSystemList(feature.implemented_capabilities?.slice(0, 3), ui).join(' · ')}</p>
                      </div>
                    ) : null}
                    {feature.completion_gaps?.length ? (
                      <div style={{ marginTop: 10 }}>
                        <div className="card__label">{ui("Next gaps")}</div>
                        <p className="card__subtext">{localizedReadinessSystemList(feature.completion_gaps?.slice(0, 3), ui).join(' · ')}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>


              <details className="card ai-review-page__readiness-details" style={{ marginTop: 16 }}>
                <summary>{ui('Governance readiness details')}</summary>
                <div className="ai-review-page__readiness-details-body">
              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="capability_inventory">
                <div className="card__label">{ui("Intelligence capability inventory")}</div>
                <p className="card__subtext">
                  {ui("Platform-wide inventory of the implemented intelligence and AI-assisted capabilities registered by the backend readiness service. This is read-only and does not execute, train, or call external AI.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Tracked capabilities")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(capabilityInventory?.total_capabilities), locale)}</div>
                    <div className="card__subtext">{ui("Implemented capabilities across registered intelligence and AI-assisted features.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Commercial candidates")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(capabilityInventory?.commercial_candidate_capabilities), locale)}</div>
                    <div className="card__subtext">{ui("Capabilities with enough readiness and tenant evidence to be treated as candidate commercial controls.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Need evidence/hardening")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(capabilityInventory?.capabilities_needing_evidence_or_hardening), locale)}</div>
                    <div className="card__subtext">{ui("Capabilities still blocked by evidence, regression, monitoring, or acceptance gaps.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Execution mode")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(capabilityInventory?.execution_mode, ui)}</div>
                    <div className="card__subtext">{ui("Inventory-only control surface; no autonomous AI execution.")}</div>
                  </div>
                </div>
                {capabilityInventory?.high_priority_capability_gaps?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {capabilityInventory.high_priority_capability_gaps.slice(0, 6).map((gap) => (
                      <article className="card" key={gap.capability_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{readinessCoreLabel(gap.production_priority, ui)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(gap.gap_type, ui)}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(gap.readiness_score), locale)}% {ui("ready")}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(gap.capability_label, ui)}</h3>
                        <p className="card__subtext">{localizedReadinessSystemText(gap.feature_label, ui)}</p>
                        <p className="card__subtext">{localizedReadinessSystemText(gap.required_resolution, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No high-priority capability inventory gaps reported.")}</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="risk_scoring">
                <div className="card__label">{ui("Intelligence risk scoring")}</div>
                <p className="card__subtext">
                  {ui("Cross-module risk scoring for registered intelligence and AI-assisted features using existing readiness, tenant evidence, priority, production status, and open hardening gaps. This is read-only and does not execute, train, or call external AI.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Average AI risk")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRiskScoring?.average_ai_risk_score), locale)}</div>
                    <div className="card__subtext">{ui("Average risk score across registered intelligence and AI-assisted features.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Highest AI risk")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRiskScoring?.highest_ai_risk_score), locale)}</div>
                    <div className="card__subtext">{ui("Highest single feature risk score currently reported by the backend.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Critical/high risk")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRiskScoring?.critical_or_high_risk_feature_count), locale)}</div>
                    <div className="card__subtext">{ui("Features requiring governance review before customer-facing enablement.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Risk mode")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRiskScoring?.execution_mode, ui)}</div>
                    <div className="card__subtext">{ui("Risk scoring only; no autonomous AI action or model training.")}</div>
                  </div>
                </div>
                {aiRiskScoring?.highest_risk_features?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiRiskScoring.highest_risk_features.slice(0, 6).map((feature) => (
                      <article className="card" key={feature.feature_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{readinessCoreLabel(feature.ai_risk_level, ui)}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(feature.ai_risk_score), locale)} {ui("risk")}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(feature.primary_risk_driver, ui)}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(feature.feature_label, ui)}</h3>
                        <p className="card__subtext">{readinessCoreLabel(feature.production_priority, ui)} · {formatLocalizedNumber(numberValue(feature.readiness_score), locale)}% {ui("ready")} · {formatLocalizedNumber(numberValue(feature.tenant_evidence_rows), locale)} {ui("tenant evidence rows")}</p>
                        <p className="card__subtext">{localizedReadinessSystemText(feature.required_control, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No AI risk-scoring rows reported.")}</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="decision_lineage">
                <div className="card__label">{ui("Intelligence decision lineage")}</div>
                <p className="card__subtext">
                  {ui("Cross-module lineage trace showing whether each registered intelligence and AI-assisted feature has a path from tenant evidence tables through backend endpoints, frontend operator surfaces, and governance review. This is read-only and does not execute, train, or call external AI.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Average lineage")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiDecisionLineage?.average_lineage_completeness_score), locale)}%</div>
                    <div className="card__subtext">{ui("Average completeness of evidence → endpoint → operator-surface traceability.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Lineage ready")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiDecisionLineage?.lineage_ready_feature_count), locale)}</div>
                    <div className="card__subtext">{ui("Features with enough lineage to enter commercial governance review.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Lineage blocked")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiDecisionLineage?.lineage_blocked_feature_count), locale)}</div>
                    <div className="card__subtext">{ui("Features missing required traceability links before enablement.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Lineage mode")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiDecisionLineage?.execution_mode, ui)}</div>
                    <div className="card__subtext">{ui("Traceability only; no autonomous AI action or model training.")}</div>
                  </div>
                </div>
                {aiDecisionLineage?.critical_lineage_gaps?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiDecisionLineage.critical_lineage_gaps.slice(0, 6).map((feature) => (
                      <article className="card" key={feature.feature_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{readinessCoreLabel(feature.production_priority, ui)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(feature.lineage_state, ui)}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(feature.lineage_completeness_score), locale)}% {ui("lineage")}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(feature.feature_label, ui)}</h3>
                        <p className="card__subtext">
                          {formatLocalizedNumber(numberValue(feature.evidence_table_count), locale)} {ui("evidence tables")} · {formatLocalizedNumber(numberValue(feature.endpoint_count), locale)} {ui("endpoints")} · {formatLocalizedNumber(numberValue(feature.frontend_surface_count), locale)} {ui("frontend surfaces")} · {formatLocalizedNumber(numberValue(feature.tenant_evidence_rows), locale)} {ui("tenant rows")}
                        </p>
                        {feature.missing_lineage_links?.length ? (
                          <p className="card__subtext">{ui("Missing:")} {feature.missing_lineage_links.map((value) => readinessCoreLabel(value, ui)).join(' · ')}</p>
                        ) : null}
                        <p className="card__subtext">{localizedReadinessLineageControl(feature, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No critical/high AI lineage gaps reported.")}</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="rollback_orchestration">
                <div className="card__label">{ui("Intelligence rollback orchestration")}</div>
                <p className="card__subtext">
                  {ui("Cross-module rollback planning for registered intelligence and AI-assisted features. It combines risk scoring and decision lineage to show whether each AI surface has a safe manual rollback path. This is read-only and does not perform rollback, mutate state, train models, or call external AI.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Average rollback score")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRollbackOrchestration?.average_rollback_score), locale)}%</div>
                    <div className="card__subtext">{ui("Average readiness of rollback controls across registered intelligence and AI-assisted features.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Rollback ready")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRollbackOrchestration?.rollback_ready_feature_count), locale)}</div>
                    <div className="card__subtext">{ui("Features whose rollback path is ready for commercial governance review.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Rollback blocked")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRollbackOrchestration?.rollback_blocked_feature_count), locale)}</div>
                    <div className="card__subtext">{ui("Features missing rollback controls before customer-facing enablement.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Rollback mode")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRollbackOrchestration?.execution_mode, ui)}</div>
                    <div className="card__subtext">{ui("Planning only; no autonomous rollback or source-system mutation.")}</div>
                  </div>
                </div>
                {aiRollbackOrchestration?.critical_rollback_blockers?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiRollbackOrchestration.critical_rollback_blockers.slice(0, 6).map((feature) => (
                      <article className="card" key={feature.feature_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{readinessCoreLabel(feature.production_priority, ui)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(feature.rollback_state, ui)}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(feature.rollback_score), locale)}% {ui("rollback")}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(feature.ai_risk_score), locale)} {ui("risk")}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(feature.feature_label, ui)}</h3>
                        <p className="card__subtext">
                          {formatLocalizedNumber(numberValue(feature.lineage_completeness_score), locale)}% {ui("lineage")} · {formatLocalizedNumber(numberValue(feature.readiness_score), locale)}% {ui("ready")} · {readinessCoreLabel(feature.ai_risk_level, ui)}
                        </p>
                        {feature.rollback_blockers?.length ? (
                          <p className="card__subtext">{ui("Blockers:")} {feature.rollback_blockers.map((value) => readinessCoreLabel(value, ui)).join(' · ')}</p>
                        ) : null}
                        <p className="card__subtext">{readinessCoreLabel(feature.rollback_decision, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No critical/high AI rollback blockers reported.")}</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="maturity_self_audit">
                <div className="card__label">{ui("Intelligence maturity self-audit")}</div>
                <p className="card__subtext">
                  {ui("Platform-wide commercial-grade AI readiness audit across the existing registered intelligence surfaces. It combines capability inventory, risk scoring, decision lineage, rollback orchestration, production signoff, monitoring, and release controls. This is read-only and does not train, execute, mutate, or call external AI.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Maturity score")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiMaturitySelfAudit?.maturity_score), locale)}%</div>
                    <div className="card__subtext">{ui("Weighted maturity score from backend governance evidence.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Maturity level")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiMaturitySelfAudit?.maturity_level, ui)}</div>
                    <div className="card__subtext">{ui("Backend classification for commercial AI readiness.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blockers / watch")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiMaturitySelfAudit?.blocker_check_count), locale)} / {formatLocalizedNumber(numberValue(aiMaturitySelfAudit?.watch_check_count), locale)}</div>
                    <div className="card__subtext">{ui("Open maturity checks requiring closure or governance review.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Commercial-grade state")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>
                      {aiMaturitySelfAudit?.commercial_grade_without_waiver ? ui('Ready') : aiMaturitySelfAudit?.commercial_grade_with_governance_waiver ? ui('Waiver review') : ui('Not yet')}
                    </div>
                    <div className="card__subtext">{ui("Self-audit status only; it does not automatically certify production release.")}</div>
                  </div>
                </div>
                {aiMaturitySelfAudit?.next_commercial_grade_actions?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiMaturitySelfAudit.next_commercial_grade_actions.slice(0, 6).map((action) => (
                      <article className="card" key={`${action.sequence}-${action.check_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{formatLocalizedNumber(numberValue(action.sequence), locale)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(action.current_status, ui)}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(action.current_score), locale)} {ui("score")}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(action.check_label, ui)}</h3>
                        <p className="card__subtext">{localizedReadinessSystemText(action.required_resolution, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No maturity self-audit blockers or watch actions reported.")}</p>
                )}
              </div>




              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="governance_dashboard">
                <div className="card__label">{ui("Intelligence governance dashboard")}</div>
                <p className="card__subtext">
                  {ui("Final read-only governance rollup for commercial AI enablement. It consolidates maturity self-audit, risk scoring, decision lineage, rollback orchestration, monitoring, signoff, and release-board status without executing AI actions or certifying release automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Governance readiness")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiGovernanceDashboard?.governance_readiness_score), locale)}%</div>
                    <div className="card__subtext">{ui("Weighted readiness score across the unified intelligence governance controls.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Governance state")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiGovernanceDashboard?.governance_state, ui)}</div>
                    <div className="card__subtext">{ui("Backend decision posture for commercial AI enablement review.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocker / watch sources")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiGovernanceDashboard?.blocker_source_count), locale)} / {formatLocalizedNumber(numberValue(aiGovernanceDashboard?.watch_source_count), locale)}</div>
                    <div className="card__subtext">{ui("Governance source groups still blocking or requiring waiver/final review.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Commercial enablement")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>
                      {aiGovernanceDashboard?.commercial_enablement_allowed_without_waiver ? ui('Allowed') : aiGovernanceDashboard?.commercial_enablement_requires_waiver ? ui('Waiver review') : ui('Blocked')}
                    </div>
                    <div className="card__subtext">{ui("Read-only governance recommendation; it does not perform release or certify commercial grade automatically.")}</div>
                  </div>
                </div>
                {aiGovernanceDashboard?.next_governance_actions?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiGovernanceDashboard.next_governance_actions.slice(0, 6).map((action) => (
                      <article className="card" key={`${action.sequence}-${action.source_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{formatLocalizedNumber(numberValue(action.sequence), locale)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(action.current_severity, ui)}</span>
                          <span style={badgeStyle}>{formatLocalizedNumber(numberValue(action.blocker_count), locale)} {ui("blockers")}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(action.source_label, ui)}</h3>
                        <p className="card__subtext">{localizedReadinessSystemText(action.required_resolution, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No unified intelligence governance dashboard actions reported.")}</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="commercial_release_gate">
                <div className="card__label">{ui("Intelligence commercial release gate")}</div>
                <p className="card__subtext">
                  {ui("Final read-only gate before any commercial AI enablement decision. It does not release, execute, train, or mutate anything; it consolidates governance, maturity, risk, release-board, monitoring, and signoff controls into an operator-controlled release decision.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Release gate state")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiCommercialReleaseGate?.release_gate_state, ui)}</div>
                    <div className="card__subtext">{ui("Final commercial AI gate state from backend governance controls.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Release gate score")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialReleaseGate?.release_gate_score), locale)}%</div>
                    <div className="card__subtext">{ui("Weighted readiness across release-critical AI controls.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocker / watch checks")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialReleaseGate?.blocker_check_count), locale)} / {formatLocalizedNumber(numberValue(aiCommercialReleaseGate?.watch_check_count), locale)}</div>
                    <div className="card__subtext">{ui("Open gate checks before commercial AI enablement.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Automated release allowed")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiCommercialReleaseGate?.final_release_policy?.automated_release_allowed ? ui('Yes') : ui('No')}</div>
                    <div className="card__subtext">{ui("Must remain no; release is human/operator controlled.")}</div>
                  </div>
                </div>
                {aiCommercialReleaseGate?.operator_release_actions?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiCommercialReleaseGate.operator_release_actions.slice(0, 6).map((action) => (
                      <article className="card" key={`${action.sequence}-${action.check_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{formatLocalizedNumber(numberValue(action.sequence), locale)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(action.current_status, ui)}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(action.check_label, ui)}</h3>
                        <p className="card__subtext">{localizedReadinessSystemText(action.required_resolution, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No commercial AI release-gate actions reported.")}</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="commercial_release_evidence_dossier">
                <div className="card__label">{ui("Intelligence commercial release evidence dossier")}</div>
                <p className="card__subtext">
                  {ui("Read-only release evidence dossier that gathers the existing AI governance controls into one operator review packet. It does not perform release, mutate data, train models, or call external AI.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Dossier state")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiCommercialReleaseEvidenceDossier?.dossier_state, ui)}</div>
                    <div className="card__subtext">{ui("Current release-evidence state from backend governance controls.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Evidence score")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialReleaseEvidenceDossier?.evidence_score), locale)}%</div>
                    <div className="card__subtext">{ui("Evidence completeness across release-critical AI controls.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocker / watch checks")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialReleaseEvidenceDossier?.blocker_check_count), locale)} / {formatLocalizedNumber(numberValue(aiCommercialReleaseEvidenceDossier?.watch_check_count), locale)}</div>
                    <div className="card__subtext">{ui("Open evidence checks before operator release review.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Automated release allowed")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiCommercialReleaseEvidenceDossier?.operator_dossier_policy?.automated_release_allowed ? ui('Yes') : ui('No')}</div>
                    <div className="card__subtext">{ui("Must remain no; the dossier is evidence-only and human-controlled.")}</div>
                  </div>
                </div>
                {aiCommercialReleaseEvidenceDossier?.required_release_artifacts?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiCommercialReleaseEvidenceDossier.required_release_artifacts.slice(0, 8).map((artifact) => (
                      <article className="card" key={`${artifact.sequence}-${artifact.artifact_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{formatLocalizedNumber(numberValue(artifact.sequence), locale)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(artifact.current_status, ui)}</span>
                          <span style={badgeStyle}>{readinessCoreLabel(artifact.evidence_source, ui)}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(artifact.artifact_label, ui)}</h3>
                        <p className="card__subtext">{localizedReadinessSystemText(artifact.required_artifact, ui)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No release evidence artifacts reported.")}</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="route_exposure_audit">
                <div className="card__label">{ui("Intelligence route exposure audit")}</div>
                <p className="card__subtext">
                  {ui("Read-only route/controller/frontend-query exposure audit for AI readiness governance endpoints. It verifies the operator surface is backed by registered backend routes, controller exports, frontend query keys, and permission expectations before more AI governance keys are added.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Route contract status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRouteExposureAudit?.route_contract_status, ui)}</div>
                    <div className="card__subtext">{ui("Backend route exposure audit status.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Expected routes")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRouteExposureAudit?.expected_route_count), locale)}</div>
                    <div className="card__subtext">{ui("Registered AI readiness routes that require controller/frontend alignment.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Frontend query status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRouteExposureAudit?.frontend_query_contract_status, ui)}</div>
                    <div className="card__subtext">{ui("Registered frontend query-key uniqueness and alignment status.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Query keys")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRouteExposureAudit?.unique_frontend_query_key_count), locale)} / {formatLocalizedNumber(numberValue(aiRouteExposureAudit?.expected_frontend_query_key_count), locale)}</div>
                    <div className="card__subtext">{ui("Unique frontend query keys registered in the route exposure contract.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Frontend API path status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRouteExposureAudit?.frontend_api_path_contract_status, ui)}</div>
                    <div className="card__subtext">{ui("Frontend fetch paths must stay aligned to the registered API base path.")} <code>{aiRouteExposureAudit?.frontend_api_base_path || '/intelligence-readiness'}</code></div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Required permission")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRouteExposureAudit?.protected_by_permission, ui)}</div>
                    <div className="card__subtext">{ui("All AI readiness governance routes remain read-gated.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Unpermissioned routes allowed")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiRouteExposureAudit?.route_change_control_policy?.unpermissioned_ai_readiness_routes_allowed ? ui('Yes') : ui('No')}</div>
                    <div className="card__subtext">{ui("Must remain no for commercial AI governance surfaces.")}</div>
                  </div>
                </div>
                {aiRouteExposureAudit?.route_rows?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">{ui("Registered route exposure rows")}</div>
                    <ul style={{ marginBottom: 0 }}>
                      {aiRouteExposureAudit.route_rows.slice(0, 10).map((row) => (
                        <li key={`${row.sequence}-${row.route_path}`}>
                          <strong>{row.route_path}</strong>: {row.controller_export} · {row.frontend_query_key} · {row.frontend_api_path || '—'} · {row.frontend_api_path_aligned ? ui('API path aligned') : ui('API path drift')} · {readinessCoreLabel(row.required_permission, ui)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiRouteExposureAudit?.misaligned_frontend_api_paths?.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    {ui("Misaligned frontend API paths")}: {aiRouteExposureAudit.misaligned_frontend_api_paths.join(', ')}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_coverage_audit">
                <div className="card__label">{ui("Intelligence runtime coverage audit")}</div>
                <p className="card__subtext">
                  {ui("Runtime coverage matrix for registered intelligence and AI-assisted features. It checks whether each feature has backend endpoints, frontend consumers, evidence schema, and tenant evidence rows before treating it as commercially proven.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Backend endpoints")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.registered_backend_endpoint_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Frontend consumers")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.registered_frontend_consumer_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Runtime coverage score")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.average_runtime_coverage_score), locale)}%</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Features with runtime gaps")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeCoverageAudit?.features_with_runtime_gaps_count), locale)}</div>
                  </div>
                </div>
                <div className="card__subtext" style={{ marginTop: 10 }}>
                  {ui("Status")}: {readinessCoreLabel(aiRuntimeCoverageAudit?.runtime_coverage_status || 'not_reported', ui)} · {ui("Static contracts do not replace real runtime testing.")}
                </div>
                {aiHighPriorityRuntimeGaps.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("High-priority runtime gaps")}</div>
                    <ul style={{ margin: '8px 0 0 18px' }}>
                      {aiHighPriorityRuntimeGaps.slice(0, 5).map((row) => (
                        <li key={row.feature_key} className="card__subtext">
                          {localizedReadinessSystemText(row.feature_label, ui)}: {row.open_runtime_gaps?.map((gap) => readinessCoreLabel(gap, ui)).join(', ') || ui('Runtime gap')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiRuntimeCoverageRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Runtime coverage rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeCoverageRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{formatLocalizedNumber(numberValue(row.runtime_coverage_score), locale)}% {ui("coverage")}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.runtime_coverage_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{localizedReadinessSystemText(row.feature_label, ui)}</strong>
                          <p className="card__subtext">
                            {formatLocalizedNumber(numberValue(row.backend_endpoint_count), locale)} {ui("endpoints")} · {formatLocalizedNumber(numberValue(row.frontend_consumer_count), locale)} {ui("frontend consumers")} · {formatLocalizedNumber(numberValue(row.tenant_runtime_evidence_rows), locale)} {ui("tenant evidence rows")}.
                          </p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">{ui("Gaps")}: {row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_remediation_worklist">
                <div className="card__label">{ui("Intelligence runtime remediation worklist")}</div>
                <p className="card__subtext">
                  {ui("Prioritized remediation list generated from the runtime coverage audit. It turns endpoint, frontend consumer, schema, and tenant evidence gaps into owner/action rows before commercial signoff.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Remediation items")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeRemediationWorklist?.total_runtime_remediation_items), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocking items")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeRemediationWorklist?.blocking_runtime_remediation_items), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Highest urgency")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeRemediationWorklist?.highest_urgency_score), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeRemediationWorklist?.commercial_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeRemediationItems.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Prioritized runtime remediation items")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeRemediationItems.slice(0, 6).map((item) => (
                        <article className="card" key={item.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(item.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{formatLocalizedNumber(numberValue(item.urgency_score), locale)} {ui("Urgency")}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(item.owner_hint || 'unknown', ui)}</span>
                          </div>
                          <strong>{localizedReadinessSystemText(item.feature_label, ui)}</strong>
                          <p className="card__subtext">
                            {ui("Impact")}: {readinessCoreLabel(item.commercial_release_impact || 'not_reported', ui)} · {ui("coverage")} {formatLocalizedNumber(numberValue(item.runtime_coverage_score), locale)}%.
                          </p>
                          {item.recommended_next_actions?.length ? (
                            <p className="card__subtext">{ui("Actions")}: {item.recommended_next_actions.join(', ')}</p>
                          ) : null}
                          {item.open_runtime_gaps?.length ? (
                            <p className="card__subtext">{ui("Runtime gaps")}: {item.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No runtime remediation items reported.")}</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_validation_drill">
                <div className="card__label">{ui("Intelligence runtime validation drill")}</div>
                <p className="card__subtext">
                  {ui("Operator-executable validation drill generated from the runtime remediation worklist. It defines real tenant evidence, pass criteria, and abort rules before any unwaived commercial AI signoff.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Drill items")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeValidationDrill?.total_drill_items), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocking drill items")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeValidationDrill?.blocking_drill_items), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Drill release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeValidationDrill?.drill_release_status || 'not_reported', ui)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Runtime coverage status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeValidationDrill?.runtime_coverage_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeValidationDrillRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Runtime validation drill rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeValidationDrillRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{formatLocalizedNumber(numberValue(row.urgency_score), locale)} {ui("Urgency")}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.drill_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{localizedReadinessSystemText(row.feature_label, ui)}</strong>
                          <p className="card__subtext">
                            {ui("Current evidence")}: {formatLocalizedNumber(numberValue(row.current_backend_endpoint_count), locale)} {ui("endpoints")} · {formatLocalizedNumber(numberValue(row.current_frontend_consumer_count), locale)} {ui("frontend consumers")} · {formatLocalizedNumber(numberValue(row.current_tenant_runtime_evidence_rows), locale)} {ui("tenant rows")}.
                          </p>
                          {row.required_evidence_artifacts?.length ? (
                            <p className="card__subtext">{ui("Evidence")}: {localizedReadinessSystemList(row.required_evidence_artifacts, ui).join(', ')}</p>
                          ) : null}
                          {row.pass_criteria?.length ? (
                            <p className="card__subtext">{ui("Pass criteria")}: {localizedReadinessSystemList(row.pass_criteria, ui).join(', ')}</p>
                          ) : null}
                          {row.operator_drill_steps?.length ? (
                            <p className="card__subtext">{ui("Drill steps")}: {localizedReadinessSystemList(row.operator_drill_steps, ui).join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No runtime validation drill items reported.")}</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_signoff_evidence_ledger">
                <div className="card__label">{ui("Intelligence runtime signoff evidence ledger")}</div>
                <p className="card__subtext">
                  {ui("Read-only signoff ledger that converts runtime coverage and validation drill evidence into feature-level operator signoff readiness. It does not record approval or release anything automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Evidence-ready features")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.evidence_ready_feature_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocking / waiver required")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.blocking_or_waiver_required_feature_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Manual waiver packets")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.manual_waiver_packet_required_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Signoff readiness")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeSignoffEvidenceLedger?.signoff_readiness_percent), locale)}%</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Signoff release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeSignoffEvidenceLedger?.signoff_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeSignoffEvidenceRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Runtime signoff evidence rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeSignoffEvidenceRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{formatLocalizedNumber(numberValue(row.runtime_coverage_score), locale)}% {ui("coverage")}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.signoff_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{localizedReadinessSystemText(row.feature_label, ui)}</strong>
                          <p className="card__subtext">
                            {ui("Evidence")}: {formatLocalizedNumber(numberValue(row.backend_endpoint_count), locale)} {ui("endpoints")} · {formatLocalizedNumber(numberValue(row.frontend_consumer_count), locale)} {ui("frontend consumers")} · {formatLocalizedNumber(numberValue(row.tenant_runtime_evidence_rows), locale)} {ui("tenant rows")} · {ui("schema")} {formatLocalizedNumber(numberValue(row.existing_evidence_table_count), locale)}/{formatLocalizedNumber(numberValue(row.expected_evidence_table_count), locale)}.
                          </p>
                          <p className="card__subtext">{localizedReadinessSystemText(row.signoff_evidence_statement, ui)}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">{ui("Open gaps")}: {row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ')}</p>
                          ) : null}
                          {row.pass_criteria?.length ? (
                            <p className="card__subtext">{ui("Pass criteria")}: {localizedReadinessSystemList(row.pass_criteria, ui).join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No runtime signoff evidence rows reported.")}</p>
                )}

                {aiRuntimeSignoffWaiverPacketRows.length ? (
                  <div className="stack" style={{ marginTop: 16 }}>
                    <div className="card__label">{ui("Manual waiver packet queue")}</div>
                    {aiRuntimeSignoffWaiverPacketRows.slice(0, 5).map((row) => (
                      <div key={row.feature_key || row.sequence} className="panel panel--muted">
                        <div className="card__row">
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <span style={badgeStyle}>{readinessCoreLabel(row.waiver_packet_status || 'not_reported', ui)}</span>
                        </div>
                        <p className="card__subtext">{ui("Open gaps")}: {row.open_runtime_gaps?.length ? row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ') : ui("None reported")}</p>
                        <p className="card__subtext">{ui("Required waiver fields")}: {row.minimum_manual_waiver_fields?.join(', ') || ui("Not reported")}</p>
                        <p className="card__subtext">{localizedReadinessSystemText(row.release_rule, ui)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_waiver_review_register">
                <div className="card__label">{ui("Intelligence runtime waiver review register")}</div>
                <p className="card__subtext">
                  {ui("Read-only register for manual runtime waiver review, expiration control, renewal rules, and closure evidence. It does not create, renew, close, or approve waivers.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Waiver review rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverReviewRegister?.waiver_review_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Critical/high reviews")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverReviewRegister?.critical_high_waiver_review_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Review release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeWaiverReviewRegister?.waiver_review_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeWaiverReviewRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Waiver review register rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeWaiverReviewRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.review_status || 'not_reported', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.waiver_review_cadence || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner")}: {readinessCoreLabel(row.review_owner_hint || 'not_reported', ui)} · {ui("Expiration")}: {row.expiration_control || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Renewal rule")}: {row.renewal_rule || ui("Not reported")}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">{ui("Open gaps")}: {row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ')}</p>
                          ) : null}
                          {row.closure_evidence_required?.length ? (
                            <p className="card__subtext">{ui("Closure evidence")}: {row.closure_evidence_required.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No runtime waiver review rows reported.")}</p>
                )}
                {aiCriticalHighWaiverReviewRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Critical/high waiver reviews require explicit owner, expiration, renewal review, and closure evidence before commercial AI enablement.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_waiver_escalation_matrix">
                <div className="card__label">{ui("Intelligence runtime waiver escalation matrix")}</div>
                <p className="card__subtext">
                  {ui("Read-only escalation matrix for runtime AI waiver reviews. It separates executive, product/operations, and owner follow-up escalation before commercial AI enablement.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Escalation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverEscalationMatrix?.escalation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive escalations")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverEscalationMatrix?.tier_1_executive_escalation_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Product/ops escalations")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverEscalationMatrix?.tier_2_product_operations_escalation_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Escalation release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeWaiverEscalationMatrix?.escalation_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeWaiverEscalationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Waiver escalation rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeWaiverEscalationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner")}: {readinessCoreLabel(row.escalation_owner_hint || 'not_reported', ui)} · {ui("Due")}: {row.escalation_due_policy || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Release condition")}: {row.executive_release_condition || ui("Not reported")}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">{ui("Open gaps")}: {row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No runtime waiver escalations reported.")}</p>
                )}
                {aiTier1RuntimeWaiverEscalationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Executive escalation rows must be reviewed before any time-boxed critical runtime AI waiver is used for enablement.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_waiver_closure_board">
                <div className="card__label">{ui("Intelligence runtime waiver closure board")}</div>
                <p className="card__subtext">
                  {ui("Read-only closure board for runtime AI waiver escalations. It keeps closure blockers, owners, due policy, and release conditions visible before commercial AI enablement.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Closure rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverClosureBoard?.closure_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked closures")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverClosureBoard?.blocked_closure_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive blocked closures")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeWaiverClosureBoard?.executive_blocked_closure_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Closure release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeWaiverClosureBoard?.closure_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeWaiverClosureRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Waiver closure rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeWaiverClosureRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.closure_readiness_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner")}: {readinessCoreLabel(row.closure_owner_hint || 'not_reported', ui)} · {ui("Due")}: {row.closure_due_policy || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Release condition")}: {row.closure_release_condition || ui("Not reported")}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">{ui("Open gaps")}: {row.open_runtime_gaps.map((gap) => readinessCoreLabel(gap, ui)).join(', ')}</p>
                          ) : null}
                          {row.closure_evidence_required?.length ? (
                            <p className="card__subtext">{ui("Closure evidence")}: {row.closure_evidence_required.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No runtime waiver closure rows reported.")}</p>
                )}
                {aiExecutiveBlockedWaiverClosureRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Executive blocked closure rows require explicit closure, disablement, or time-boxed waiver evidence before critical runtime AI enablement.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_closure_monitoring_plan">
                <div className="card__label">{ui("Intelligence runtime post-closure monitoring plan")}</div>
                <p className="card__subtext">
                  {ui("Read-only post-closure monitoring plan for runtime AI waivers. It keeps monitoring cadence, owner hints, evidence packets, and broad-release conditions visible after closure review.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Monitoring rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostClosureMonitoringPlan?.monitoring_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked monitoring")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostClosureMonitoringPlan?.blocked_monitoring_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive monitoring")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostClosureMonitoringPlan?.executive_monitoring_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Monitoring release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostClosureMonitoringPlan?.monitoring_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostClosureMonitoringRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-closure monitoring rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostClosureMonitoringRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.monitoring_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.monitoring_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.monitoring_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Release monitoring condition:")} {row.release_monitoring_condition || ui("Not reported")}</p>
                          {row.required_monitoring_evidence?.length ? (
                            <p className="card__subtext">{ui("Monitoring evidence:")} {row.required_monitoring_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-closure runtime monitoring rows reported.")}</p>
                )}
                {aiBlockedPostClosureMonitoringRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked monitoring rows still require closure evidence, disablement, or a time-boxed waiver before broad commercial AI release.")}
                  </p>
                ) : null}
              </div>




              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_closure_evidence_acceptance_gate">
                <div className="card__label">{ui("Intelligence runtime post-closure evidence acceptance gate")}</div>
                <p className="card__subtext">
                  {ui("Read-only acceptance gate for post-closure runtime AI monitoring evidence. It keeps manual evidence acceptance, owner hints, due policy, and broad-release conditions visible without approving release or recording signoff.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Acceptance rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.acceptance_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked acceptance")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.blocked_acceptance_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive acceptance")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.executive_acceptance_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Acceptance release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostClosureEvidenceAcceptanceGate?.evidence_acceptance_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostClosureEvidenceAcceptanceRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Evidence acceptance rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostClosureEvidenceAcceptanceRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.evidence_acceptance_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.acceptance_owner_hint || 'not_reported', ui)} · {ui("Due:")} {row.acceptance_due_policy || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Release condition:")} {row.acceptance_release_condition || ui("Not reported")}</p>
                          {row.required_acceptance_evidence?.length ? (
                            <p className="card__subtext">{ui("Acceptance evidence:")} {row.required_acceptance_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-closure evidence acceptance rows reported.")}</p>
                )}
                {aiBlockedPostClosureEvidenceAcceptanceRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked evidence acceptance rows still require monitoring evidence, closure evidence, disablement, or a time-boxed waiver before broad commercial AI release.")}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_broad_release_readiness_board">
                <div className="card__label">{ui("Intelligence runtime broad release readiness board")}</div>
                <p className="card__subtext">
                  {ui("Read-only board that carries accepted post-closure runtime evidence into manual broad-release review conditions. It keeps release-owner approval, tenant validation sample, and rollback acknowledgement requirements visible without enabling any tenant feature flag or release mutation.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Readiness rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeBroadReleaseReadinessBoard?.readiness_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked release rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeBroadReleaseReadinessBoard?.blocked_readiness_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive release rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeBroadReleaseReadinessBoard?.executive_readiness_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Broad release status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeBroadReleaseReadinessBoard?.broad_release_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeBroadReleaseReadinessRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Broad-release readiness rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeBroadReleaseReadinessRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.broad_release_readiness_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.release_owner_hint || 'not_reported', ui)} · {ui("Due:")} {row.release_due_policy || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.release_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback condition:")} {row.rollback_condition || ui("Not reported")}</p>
                          {row.required_broad_release_evidence?.length ? (
                            <p className="card__subtext">{ui("Release evidence:")} {row.required_broad_release_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No broad-release readiness rows reported.")}</p>
                )}
                {aiBlockedRuntimeBroadReleaseReadinessRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked broad-release rows still require accepted post-closure evidence, release-owner approval, tenant runtime validation sample, rollback acknowledgement, or a time-boxed waiver before broad tenant enablement.")}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_tenant_enablement_control_queue">
                <div className="card__label">{ui("Intelligence runtime tenant enablement control queue")}</div>
                <p className="card__subtext">
                  {ui("Read-only queue that converts broad-release readiness into manual tenant enablement controls. It keeps feature-flag rollout plan, support/customer-success acknowledgement, and post-enablement monitoring owner requirements visible without mutating tenant flags.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Control rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeTenantEnablementControlQueue?.control_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked enablement rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeTenantEnablementControlQueue?.blocked_control_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive enablement rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeTenantEnablementControlQueue?.executive_control_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Tenant enablement status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeTenantEnablementControlQueue?.tenant_enablement_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimeTenantEnablementControlRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Tenant enablement control rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeTenantEnablementControlRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.tenant_enablement_control_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.enablement_owner_hint || 'not_reported', ui)} · {ui("Due:")} {row.enablement_due_policy || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.enablement_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Feature flag condition:")} {row.feature_flag_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success condition:")} {row.customer_success_condition || ui("Not reported")}</p>
                          {row.required_tenant_enablement_evidence?.length ? (
                            <p className="card__subtext">{ui("Enablement evidence:")} {row.required_tenant_enablement_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No tenant enablement control rows reported.")}</p>
                )}
                {aiBlockedRuntimeTenantEnablementControlRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked tenant enablement rows still require broad-release evidence, waiver closure, feature-flag rollout plan, support/customer-success acknowledgement, and post-enablement monitoring ownership before tenant rollout.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_health_watchlist">
                <div className="card__label">{ui("Intelligence runtime post-enablement health watchlist")}</div>
                <p className="card__subtext">
                  {ui("Read-only watchlist that converts tenant enablement controls into post-enablement runtime health monitoring requirements. It keeps health metrics, incident review, rollback reconfirmation, and customer-success feedback evidence visible without scheduling monitoring jobs or changing rollout scope.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Watch rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementHealthWatchlist?.watch_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked watch rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementHealthWatchlist?.blocked_watch_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive watch rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementHealthWatchlist?.executive_watch_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Health watch status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementHealthWatchlist?.post_enablement_health_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementHealthWatchRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-enablement health watch rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementHealthWatchRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.post_enablement_health_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.health_watch_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.health_watch_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.health_watch_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollout freeze:")} {row.rollout_freeze_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback reconfirmation:")} {row.rollback_reconfirmation_condition || ui("Not reported")}</p>
                          {row.required_post_enablement_health_evidence?.length ? (
                            <p className="card__subtext">{ui("Health evidence:")} {row.required_post_enablement_health_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-enablement health watch rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementHealthWatchRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked post-enablement health rows still require tenant enablement controls, waiver closure, monitoring ownership, incident-review evidence, rollback reconfirmation, and customer-success feedback before rollout scope expands.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_incident_response_queue">
                <div className="card__label">{ui("Intelligence runtime post-enablement incident response queue")}</div>
                <p className="card__subtext">
                  {ui("Read-only incident response queue that converts post-enablement health watch rows into manual incident triage, tenant-impact review, support escalation, rollback decision logging, and customer communication controls. It does not create tickets, notify customers, pause rollout, or trigger rollback automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Incident rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentResponseQueue?.incident_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked incident rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentResponseQueue?.blocked_incident_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive incident rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentResponseQueue?.executive_incident_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Incident status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementIncidentResponseQueue?.incident_response_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementIncidentResponseRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-enablement incident response rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementIncidentResponseRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.incident_response_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.incident_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.incident_review_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.incident_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollout pause:")} {row.rollout_pause_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback decision:")} {row.rollback_decision_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer communication:")} {row.customer_communication_condition || ui("Not reported")}</p>
                          {row.required_incident_response_evidence?.length ? (
                            <p className="card__subtext">{ui("Incident evidence:")} {row.required_incident_response_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-enablement incident response rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementIncidentResponseRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked incident-response rows still require post-enablement health controls, incident triage evidence, tenant-impact assessment, support escalation, rollback decision logging, and customer communication decision before rollout scope expands.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_incident_closure_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement incident closure board")}</div>
                <p className="card__subtext">
                  {ui("Read-only incident closure board that converts post-enablement incident response rows into manual root-cause analysis, tenant-impact resolution, customer follow-up, prevention action, and rollout-resume conditions. It does not update tickets, notify customers, resume rollout, or trigger rollback automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Closure rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentClosureBoard?.closure_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked closure rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentClosureBoard?.blocked_closure_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive closure rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementIncidentClosureBoard?.executive_closure_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Closure status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementIncidentClosureBoard?.incident_closure_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementIncidentClosureRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-enablement incident closure rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementIncidentClosureRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.incident_closure_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.closure_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.closure_review_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.closure_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollout resume:")} {row.rollout_resume_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Prevention action:")} {row.prevention_action_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer follow-up:")} {row.customer_follow_up_condition || ui("Not reported")}</p>
                          {row.required_incident_closure_evidence?.length ? (
                            <p className="card__subtext">{ui("Closure evidence")}: {row.required_incident_closure_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-enablement incident closure rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementIncidentClosureRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked incident-closure rows still require runtime-gap closure, root-cause analysis, tenant-impact resolution, customer follow-up, prevention action, and manual rollout-resume decision before rollout can expand again.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_prevention_verification_backlog">
                <div className="card__label">{ui("Intelligence runtime post-enablement prevention verification backlog")}</div>
                <p className="card__subtext">
                  {ui("Read-only prevention verification backlog that converts incident-closure rows into manual prevention-action implementation, effectiveness review, rollout-resume authorization, customer-success follow-up, and monitoring re-entry conditions. It does not update tickets, notify customers, resume rollout, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Prevention rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.prevention_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked prevention rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.blocked_prevention_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive prevention rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.executive_prevention_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Prevention status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementPreventionVerificationBacklog?.prevention_verification_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementPreventionVerificationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-enablement prevention verification rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementPreventionVerificationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.prevention_verification_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.prevention_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.prevention_review_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.prevention_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollout resume guardrail:")} {row.rollout_resume_guardrail || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Monitoring re-entry:")} {row.monitoring_reentry_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer-success follow-up:")} {row.customer_success_follow_up_condition || ui("Not reported")}</p>
                          {row.required_prevention_verification_evidence?.length ? (
                            <p className="card__subtext">{ui("Prevention evidence:")} {row.required_prevention_verification_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-enablement prevention verification rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementPreventionVerificationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked prevention-verification rows still require incident-closure controls, runtime-gap closure, prevention-action implementation evidence, effectiveness review, manual rollout-resume authorization, and post-resume monitoring checkpoint evidence.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_resume_authorization_ledger">
                <div className="card__label">{ui("Intelligence runtime post-enablement rollout resume authorization ledger")}</div>
                <p className="card__subtext">
                  {ui("Read-only rollout-resume authorization ledger that converts prevention-verification rows into manual rollout-resume authorization, limited tenant-scope planning, rollback reconfirmation, customer-success acknowledgement, and post-resume health-owner controls. It does not change feature flags, notify customers, resume rollout, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Authorization rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked authorization rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.blocked_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive authorization rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.executive_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Authorization status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.rollout_resume_authorization_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutResumeAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-enablement rollout resume authorization rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutResumeAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.rollout_resume_authorization_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.authorization_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.authorization_review_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Decision rule:")} {row.authorization_decision_rule || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Tenant scope:")} {row.tenant_scope_resume_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback reconfirmation:")} {row.rollback_reconfirmation_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer-success resume condition:")} {row.customer_success_resume_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Post-resume monitoring:")} {row.post_resume_monitoring_condition || ui("Not reported")}</p>
                          {row.required_rollout_resume_authorization_evidence?.length ? (
                            <p className="card__subtext">{ui("Authorization evidence:")} {row.required_rollout_resume_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-enablement rollout-resume authorization rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutResumeAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked rollout-resume authorization rows still require prevention-verification controls, runtime-gap closure, limited tenant-scope plan, rollback reconfirmation, customer-success acknowledgement, and post-resume health-owner evidence.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_resume_observation_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement rollout resume observation board")}</div>
                <p className="card__subtext">
                  {ui("Read-only post-resume observation board that converts rollout-resume authorization rows into limited-scope observation, runtime health metric review, customer-success feedback, rollback readiness, and manual rollout-scope expansion controls. It does not expand rollout scope, change feature flags, notify customers, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.blocked_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.executive_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Observation status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementRolloutResumeObservationBoard?.post_resume_observation_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutResumeObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Post-resume observation rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutResumeObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.post_resume_observation_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.observation_owner_hint || 'not_reported', ui)} · {ui("Window:")} {readinessCoreLabel(row.observation_window_policy || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Tenant scope observation:")} {row.tenant_scope_observation_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime metrics:")} {row.runtime_health_metric_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer-success feedback:")} {row.customer_success_feedback_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback readiness:")} {row.rollback_readiness_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Scope expansion:")} {row.rollout_scope_expansion_condition || ui("Not reported")}</p>
                          {row.required_post_resume_observation_evidence?.length ? (
                            <p className="card__subtext">{ui("Observation evidence:")} {row.required_post_resume_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No post-resume observation rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutResumeObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked post-resume observation rows still require rollout-resume authorization, closed runtime-gap controls, limited tenant-scope observation, runtime metric review, customer-success feedback, and rollback readiness evidence before rollout-scope expansion.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_scope_expansion_authorization_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement rollout scope expansion authorization board")}</div>
                <p className="card__subtext">
                  {ui("Read-only scope-expansion authorization board that converts post-resume observation rows into manual expanded tenant-scope controls, limited-scope health acceptance, customer-success acknowledgement, rollback reconfirmation, and expanded-scope monitoring ownership. It does not change feature flags, expand rollout scope, notify customers, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Expansion rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.expansion_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked expansion rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.blocked_expansion_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive expansion rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.executive_expansion_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Expansion status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.rollout_scope_expansion_authorization_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutScopeExpansionAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Rollout scope-expansion authorization rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutScopeExpansionAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.rollout_scope_expansion_authorization_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.expansion_authorization_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.expansion_authorization_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Limited-scope health:")} {row.limited_scope_health_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Tenant scope expansion:")} {row.tenant_scope_expansion_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_expansion_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Expanded-scope rollback:")} {row.rollback_expanded_scope_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Expanded-scope monitoring:")} {row.expanded_scope_monitoring_condition || ui("Not reported")}</p>
                          {row.required_rollout_scope_expansion_authorization_evidence?.length ? (
                            <p className="card__subtext">{ui("Expansion evidence:")} {row.required_rollout_scope_expansion_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No rollout scope-expansion authorization rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutScopeExpansionAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked rollout scope-expansion rows still require post-resume observation acceptance, closed runtime-gap controls, limited-scope runtime health evidence, customer-success acknowledgement, expanded-scope rollback reconfirmation, and expanded-scope monitoring ownership.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_expanded_scope_health_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement expanded scope health board")}</div>
                <p className="card__subtext">
                  {ui("Read-only expanded-scope health board that converts rollout scope-expansion authorization rows into manual tenant-sample, runtime metric, customer-success, incident, rollback, and further rollout-growth controls. It does not change feature flags, notify customers, create support tickets, trigger rollback, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Health rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.expanded_scope_health_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked health rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.blocked_expanded_scope_health_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive health rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.executive_expanded_scope_health_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Expanded-scope health status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementExpandedScopeHealthBoard?.expanded_scope_health_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementExpandedScopeHealthRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Expanded-scope health rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementExpandedScopeHealthRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.expanded_scope_health_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.expanded_scope_health_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.expanded_scope_health_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Tenant sample:")} {row.expanded_scope_tenant_sample_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health:")} {row.expanded_scope_runtime_health_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.expanded_scope_customer_success_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident review:")} {row.expanded_scope_incident_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback readiness:")} {row.expanded_scope_rollback_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Further rollout growth:")} {row.further_rollout_growth_condition || ui("Not reported")}</p>
                          {row.required_expanded_scope_health_evidence?.length ? (
                            <p className="card__subtext">{ui("Expanded-scope health evidence:")} {row.required_expanded_scope_health_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No expanded-scope health rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementExpandedScopeHealthRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked expanded-scope health rows still require rollout scope-expansion authorization, closed runtime-gap controls, expanded tenant-sample evidence, runtime health metrics, incident review, customer-success feedback, and rollback readiness evidence before further rollout growth.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_growth_authorization_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement rollout growth authorization board")}</div>
                <p className="card__subtext">
                  {ui("Read-only rollout-growth authorization board that converts expanded-scope health rows into manual business justification, customer-success, support-capacity, rollback, and growth-scope monitoring controls. It does not grow tenant scope, change feature flags, notify customers, create support tickets, trigger rollback, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Growth rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.rollout_growth_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked growth rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.blocked_rollout_growth_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive growth rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.executive_rollout_growth_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Growth authorization status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.rollout_growth_authorization_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutGrowthAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Rollout growth authorization rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutGrowthAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.rollout_growth_authorization_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.rollout_growth_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.rollout_growth_review_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Expanded-scope health acceptance:")} {row.expanded_scope_health_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Business justification:")} {row.rollout_growth_business_justification_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_growth_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support capacity:")} {row.support_capacity_growth_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback scope:")} {row.rollback_growth_scope_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Growth monitoring:")} {row.growth_scope_monitoring_condition || ui("Not reported")}</p>
                          {row.required_rollout_growth_authorization_evidence?.length ? (
                            <p className="card__subtext">{ui("Growth authorization evidence:")} {row.required_rollout_growth_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No rollout growth authorization rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutGrowthAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked rollout-growth authorization rows still require expanded-scope health acceptance, closed runtime-gap controls, business justification, customer-success and support-capacity acknowledgements, rollback reconfirmation, and growth-scope monitoring ownership before further rollout growth.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_growth_observation_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement rollout growth observation board")}</div>
                <p className="card__subtext">
                  {ui("Read-only rollout-growth observation board that converts manual growth authorization into growth-scope tenant sample, runtime health, incident review, customer-success, support-capacity, rollback-readiness, and next-growth-step controls. It does not grow tenant scope, change feature flags, notify customers, create support tickets, trigger rollback, or schedule monitoring jobs automatically.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.rollout_growth_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.blocked_rollout_growth_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.executive_rollout_growth_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Growth observation status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementRolloutGrowthObservationBoard?.rollout_growth_observation_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutGrowthObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Rollout growth observation rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutGrowthObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.rollout_growth_observation_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.rollout_growth_observation_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.rollout_growth_observation_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Growth authorization:")} {row.growth_authorization_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Tenant sample:")} {row.growth_scope_tenant_sample_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health:")} {row.growth_scope_runtime_health_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident review:")} {row.growth_scope_incident_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_growth_feedback_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support capacity:")} {row.support_growth_capacity_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback readiness:")} {row.rollback_growth_readiness_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Next growth step:")} {row.next_growth_step_condition || ui("Not reported")}</p>
                          {row.required_rollout_growth_observation_evidence?.length ? (
                            <p className="card__subtext">{ui("Growth observation evidence:")} {row.required_rollout_growth_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No rollout growth observation rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutGrowthObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked rollout-growth observation rows still require growth authorization acceptance, closed runtime-gap controls, growth-scope tenant sample evidence, runtime health metrics, incident review, customer-success feedback, support-capacity review, rollback readiness, and observation ownership before any next rollout-growth step.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_growth_next_step_gate">
                <div className="card__label">{ui("Intelligence runtime post-enablement rollout growth next-step gate")}</div>
                <p className="card__subtext">
                  {ui("Read-only next-growth-step gate that converts rollout growth observation into manual next-wave scope authorization controls. It requires observation acceptance, business justification, tenant-scope limits, customer-success/support capacity, runtime monitoring ownership, and rollback reconfirmation before any further tenant growth.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Gate rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.next_growth_step_gate_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked gate rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.blocked_next_growth_step_gate_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive gate rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.executive_next_growth_step_gate_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Next-step gate status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementRolloutGrowthNextStepGate?.next_growth_step_gate_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutGrowthNextStepGateRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Rollout growth next-step gate rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutGrowthNextStepGateRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.next_growth_step_gate_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.next_growth_step_gate_owner_hint || 'not_reported', ui)} · {ui("Due:")} {row.next_growth_step_gate_due_policy || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Observation acceptance:")} {row.growth_observation_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Business and scope:")} {row.next_growth_business_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success capacity:")} {row.customer_success_capacity_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support capacity:")} {row.support_capacity_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime monitoring:")} {row.runtime_monitoring_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback owner:")} {row.rollback_owner_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Release condition:")} {row.next_growth_step_release_condition || ui("Not reported")}</p>
                          {row.required_next_growth_step_gate_evidence?.length ? (
                            <p className="card__subtext">{ui("Next-step gate evidence:")} {row.required_next_growth_step_gate_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No rollout growth next-step gate rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutGrowthNextStepGateRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked next-growth-step rows still require accepted growth observation, closed runtime-gap controls, business justification, tenant-scope limits, customer-success and support-capacity confirmation, runtime monitoring ownership, and rollback reconfirmation before any additional rollout wave.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_next_wave_observation_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement next-wave observation board")}</div>
                <p className="card__subtext">
                  {ui("Read-only next-wave observation board that converts accepted next-growth-step gates into runtime observation controls for the newly enabled tenant wave. It requires tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership before any additional growth.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.next_wave_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.blocked_next_wave_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.executive_next_wave_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Next-wave status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementNextWaveObservationBoard?.next_wave_observation_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementNextWaveObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Next-wave observation rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementNextWaveObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.next_wave_observation_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.next_wave_observation_owner_hint || 'not_reported', ui)} · {ui("Cadence:")} {readinessCoreLabel(row.next_wave_observation_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Gate acceptance:")} {row.next_growth_step_gate_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Tenant scope:")} {row.next_wave_tenant_scope_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health:")} {row.next_wave_runtime_health_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident review:")} {row.next_wave_incident_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_next_wave_feedback_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support capacity:")} {row.support_next_wave_capacity_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback readiness:")} {row.rollback_next_wave_readiness_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Additional growth:")} {row.additional_growth_condition || ui("Not reported")}</p>
                          {row.required_next_wave_observation_evidence?.length ? (
                            <p className="card__subtext">{ui("Next-wave evidence:")} {row.required_next_wave_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No next-wave observation rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementNextWaveObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked next-wave observation rows still require accepted next-growth-step gate evidence, closed runtime-gap controls, enabled tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership before any additional rollout growth.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_additional_growth_authorization_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement additional growth authorization board")}</div>
                <p className="card__subtext">
                  {ui("Read-only authorization board that converts accepted next-wave runtime observation into controlled additional rollout growth. It requires business justification, limited tenant-scope planning, customer-success/support capacity, runtime monitoring ownership, and rollback reconfirmation before another growth wave.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Authorization rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.additional_growth_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.blocked_additional_growth_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.executive_additional_growth_authorization_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Authorization status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.additional_growth_authorization_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementAdditionalGrowthAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Additional growth authorization rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementAdditionalGrowthAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.additional_growth_authorization_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.additional_growth_authorization_owner_hint || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Next-wave acceptance:")} {row.next_wave_observation_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Business justification:")} {row.additional_growth_business_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Tenant scope:")} {row.additional_growth_scope_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_additional_growth_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support capacity:")} {row.support_additional_growth_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime monitoring:")} {row.runtime_monitoring_additional_growth_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback:")} {row.rollback_additional_growth_condition || ui("Not reported")}</p>
                          {row.required_additional_growth_authorization_evidence?.length ? (
                            <p className="card__subtext">{ui("Authorization evidence:")} {row.required_additional_growth_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No additional growth authorization rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementAdditionalGrowthAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked additional-growth rows still require accepted next-wave observation evidence, closed runtime-gap controls, business justification, limited tenant-scope planning, customer-success/support capacity, runtime monitoring ownership, and rollback reconfirmation before another rollout growth wave.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_additional_growth_observation_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement additional growth observation board")}</div>
                <p className="card__subtext">
                  {ui("Read-only observation board that converts accepted additional-growth authorization into controlled runtime observation before any further rollout growth. It requires tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Observation rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.additional_growth_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.blocked_additional_growth_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.executive_additional_growth_observation_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Observation status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.additional_growth_observation_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementAdditionalGrowthObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Additional growth observation rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementAdditionalGrowthObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.additional_growth_observation_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.additional_growth_observation_owner_hint || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Cadence:")} {readinessCoreLabel(row.additional_growth_observation_cadence || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Authorization acceptance:")} {row.additional_growth_authorization_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Tenant scope:")} {row.additional_growth_tenant_scope_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health:")} {row.additional_growth_runtime_health_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident review:")} {row.additional_growth_incident_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_additional_growth_feedback_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support capacity:")} {row.support_additional_growth_capacity_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback:")} {row.rollback_additional_growth_readiness_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Further growth:")} {row.further_growth_condition || ui("Not reported")}</p>
                          {row.required_additional_growth_observation_evidence?.length ? (
                            <p className="card__subtext">{ui("Observation evidence:")} {row.required_additional_growth_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No additional growth observation rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementAdditionalGrowthObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked additional-growth observation rows still require accepted authorization evidence, closed runtime-gap controls, enabled tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership before any further rollout growth.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_further_growth_exit_criteria_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement further growth exit criteria board")}</div>
                <p className="card__subtext">
                  {ui("Read-only exit-criteria board that converts accepted additional-growth observation into controlled further-growth exit review. It requires runtime health stability, incident-free or resolved-exception evidence, customer-success/support acceptance, rollback rehearsal, and explicit owner evidence before the next rollout growth cycle exits observation.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Exit rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.further_growth_exit_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.blocked_further_growth_exit_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.executive_further_growth_exit_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Exit status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.further_growth_exit_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementFurtherGrowthExitRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Further growth exit rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementFurtherGrowthExitRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.further_growth_exit_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.further_growth_exit_owner_hint || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Observation acceptance:")} {row.additional_growth_observation_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health stability:")} {row.runtime_health_stability_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident-free window:")} {row.incident_free_window_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_exit_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support:")} {row.support_exit_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback:")} {row.rollback_exit_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Exit condition:")} {row.further_growth_exit_condition || ui("Not reported")}</p>
                          {row.required_further_growth_exit_evidence?.length ? (
                            <p className="card__subtext">{ui("Exit evidence:")} {row.required_further_growth_exit_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No further growth exit rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementFurtherGrowthExitRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked further-growth exit rows still require accepted additional-growth observation evidence, closed runtime-gap controls, health-stability evidence, incident-free or resolved-exception evidence, customer-success/support acceptance, rollback rehearsal, and exit-owner evidence.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_certification_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement steady-state certification board")}</div>
                <p className="card__subtext">
                  {ui("Read-only steady-state certification board that converts accepted further-growth exit criteria into controlled runtime AI steady-state certification. It requires runtime health baseline evidence, incident-review acceptance, customer-success/support readiness, rollback reconfirmation, and explicit owner evidence before the AI feature is treated as steady-state operational.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Certification rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.steady_state_certification_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.blocked_steady_state_certification_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.executive_steady_state_certification_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Certification status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateCertificationBoard?.steady_state_certification_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementSteadyStateCertificationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Steady-state certification rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementSteadyStateCertificationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'unknown', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.steady_state_certification_status || 'not_reported', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_certification_owner_hint || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Further-growth exit:")} {row.further_growth_exit_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health baseline:")} {row.runtime_health_baseline_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident review:")} {row.incident_review_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success:")} {row.customer_success_certification_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support:")} {row.support_certification_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback:")} {row.rollback_certification_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Certification condition:")} {row.steady_state_certification_condition || ui("Not reported")}</p>
                          {row.required_steady_state_certification_evidence?.length ? (
                            <p className="card__subtext">{ui("Certification evidence:")} {row.required_steady_state_certification_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No steady-state certification rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementSteadyStateCertificationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked steady-state certification rows still require accepted further-growth exit evidence, closed runtime-gap controls, health-baseline evidence, incident-review acceptance, customer-success/support readiness, rollback reconfirmation, and certification-owner evidence.")}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_monitoring_cadence_board">
                <div className="card__label">{ui("Intelligence runtime post-enablement steady-state monitoring cadence board")}</div>
                <p className="card__subtext">
                  {ui("Read-only steady-state monitoring cadence board that converts manual steady-state certification into recurring runtime intelligence review controls. It requires recurring runtime health review, incident review, customer-success feedback, support escalation capacity review, rollback reconfirmation, and explicit cadence-owner evidence.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Cadence rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.steady_state_monitoring_cadence_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.blocked_steady_state_monitoring_cadence_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.executive_steady_state_monitoring_cadence_row_count), locale)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Cadence status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.steady_state_monitoring_cadence_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementSteadyStateMonitoringCadenceRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">{ui("Steady-state monitoring cadence rows")}</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementSteadyStateMonitoringCadenceRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{readinessCoreLabel(row.production_priority || 'priority', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.escalation_tier || 'tier', ui)}</span>
                            <span style={badgeStyle}>{readinessCoreLabel(row.steady_state_monitoring_cadence_status || 'cadence_status', ui)}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_monitoring_cadence_owner_hint || 'not_reported', ui)}</p>
                          <p className="card__subtext">{ui("Certification acceptance:")} {row.steady_state_certification_acceptance_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Runtime health cadence:")} {row.recurring_runtime_health_review_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Incident cadence:")} {row.recurring_incident_review_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Customer success cadence:")} {row.customer_success_feedback_cadence_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Support cadence:")} {row.support_escalation_cadence_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Rollback cadence:")} {row.rollback_reconfirmation_cadence_condition || ui("Not reported")}</p>
                          <p className="card__subtext">{ui("Cadence condition:")} {row.steady_state_monitoring_cadence_condition || ui("Not reported")}</p>
                          {row.required_steady_state_monitoring_cadence_evidence?.length ? (
                            <p className="card__subtext">{ui("Cadence evidence:")} {row.required_steady_state_monitoring_cadence_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>{ui("No steady-state monitoring cadence rows reported.")}</p>
                )}
                {aiBlockedRuntimePostEnablementSteadyStateMonitoringCadenceRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    {ui("Blocked steady-state monitoring cadence rows still require certification acceptance, closed runtime-gap controls, recurring health and incident review cadence, customer-success/support cadence, rollback reconfirmation, and cadence-owner evidence.")}
                  </p>
                ) : null}
              </div>




              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_monitoring_exception_review_queue">
                <div className="card__header">
                  <div>
                    <h3>{ui("Intelligence runtime steady-state exception review queue")}</h3>
                    <p className="card__subtext">{ui("Recurring exception-review controls after steady-state monitoring cadence acceptance.")}</p>
                  </div>
                  <span style={badgeStyle}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.steady_state_exception_review_status || 'not_reported', ui)}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Exception rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.steady_state_exception_review_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.blocked_steady_state_exception_review_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.executive_steady_state_exception_review_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Product/Ops rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.product_operations_steady_state_exception_review_row_count), locale)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateMonitoringExceptionRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateMonitoringExceptionRows.length, locale)} {ui("steady-state exception review row(s) are blocked by open runtime gaps.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateMonitoringExceptionRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.steady_state_exception_review_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_exception_review_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Condition:")} {row.steady_state_exception_review_condition || ui("Not reported")}</p>
                        {row.required_steady_state_exception_review_evidence?.length ? (
                          <p className="card__subtext">{ui("Required evidence:")} {row.required_steady_state_exception_review_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateMonitoringExceptionRows.length ? (
                    <p className="empty-state">{ui("No steady-state exception review rows reported.")}</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_closure_board">
                <div className="card__header">
                  <div>
                    <h3>{ui("Intelligence runtime steady-state exception closure board")}</h3>
                    <p className="card__subtext">{ui("Manual closure controls after steady-state exception review acceptance.")}</p>
                  </div>
                  <span style={badgeStyle}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.steady_state_exception_closure_status || 'not_reported', ui)}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Closure rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.steady_state_exception_closure_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.blocked_steady_state_exception_closure_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.executive_steady_state_exception_closure_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Product/Ops rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.product_operations_steady_state_exception_closure_row_count), locale)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionClosureRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateExceptionClosureRows.length, locale)} {ui("steady-state exception closure row(s) are blocked by open runtime gaps or missing exception-review acceptance.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionClosureRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-closure'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.steady_state_exception_closure_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_exception_closure_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Condition:")} {row.steady_state_exception_closure_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Root cause:")} {row.root_cause_closure_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Customer success:")} {row.customer_success_followup_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Support:")} {row.support_followup_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Rollback:")} {row.rollback_reconfirmation_condition || ui("Not reported")}</p>
                        {row.required_steady_state_exception_closure_evidence?.length ? (
                          <p className="card__subtext">{ui("Closure evidence:")} {row.required_steady_state_exception_closure_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionClosureRows.length ? (
                    <p className="empty-state">{ui("No steady-state exception closure rows reported.")}</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_recurrence_audit_board">
                <div className="card__header">
                  <div>
                    <h3>{ui("Intelligence runtime steady-state exception recurrence audit board")}</h3>
                    <p className="card__subtext">{ui("Manual recurrence audit controls after steady-state exception closure acceptance.")}</p>
                  </div>
                  <span style={badgeStyle}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.steady_state_exception_recurrence_audit_status || 'not_reported', ui)}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Recurrence rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.steady_state_exception_recurrence_audit_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.blocked_steady_state_exception_recurrence_audit_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.executive_steady_state_exception_recurrence_audit_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Product/Ops rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.product_operations_steady_state_exception_recurrence_audit_row_count), locale)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.length, locale)} {ui("steady-state exception recurrence audit row(s) are blocked by open runtime gaps or missing closure acceptance.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-recurrence-audit'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.steady_state_exception_recurrence_audit_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_exception_recurrence_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Condition:")} {row.steady_state_exception_recurrence_audit_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Window:")} {row.recurrence_window_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Metrics:")} {row.recurrence_metric_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Reopen rule:")} {row.reopen_rule_condition || ui("Not reported")}</p>
                        {row.required_steady_state_exception_recurrence_audit_evidence?.length ? (
                          <p className="card__subtext">{ui("Recurrence evidence:")} {row.required_steady_state_exception_recurrence_audit_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.length ? (
                    <p className="empty-state">{ui("No steady-state exception recurrence audit rows reported.")}</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_recurrence_resolution_board">
                <div className="card__header">
                  <div>
                    <h3>{ui("Intelligence runtime steady-state exception recurrence resolution board")}</h3>
                    <p className="card__subtext">{ui("Manual repeat-exception resolution controls after recurrence audit acceptance.")}</p>
                  </div>
                  <span style={badgeStyle}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.steady_state_exception_recurrence_resolution_status || 'not_reported', ui)}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Resolution rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.steady_state_exception_recurrence_resolution_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.blocked_steady_state_exception_recurrence_resolution_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.executive_steady_state_exception_recurrence_resolution_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Product/Ops rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.product_operations_steady_state_exception_recurrence_resolution_row_count), locale)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length, locale)} {ui("steady-state exception recurrence resolution row(s) are blocked by open runtime gaps or incomplete recurrence audit acceptance.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-recurrence-resolution'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.steady_state_exception_recurrence_resolution_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_exception_recurrence_resolution_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Condition:")} {row.steady_state_exception_recurrence_resolution_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Root cause:")} {row.recurrence_root_cause_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Prevention:")} {row.recurrence_prevention_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Monitoring re-entry:")} {row.monitoring_reentry_condition || ui("Not reported")}</p>
                        {row.required_steady_state_exception_recurrence_resolution_evidence?.length ? (
                          <p className="card__subtext">{ui("Resolution evidence:")} {row.required_steady_state_exception_recurrence_resolution_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length ? (
                    <p className="empty-state">{ui("No steady-state exception recurrence resolution rows reported.")}</p>
                  ) : null}
                </div>
              </div>



              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_resolution_verification_board">
                <div className="card__label">{ui("Intelligence runtime steady-state exception resolution verification board")}</div>
                <p className="card__subtext">
                  {ui("Read-only verification board that checks recurrence-resolution effectiveness, monitoring samples, customer-success confirmation, support confirmation, and manual recertification conditions after repeat steady-state AI exceptions are resolved.")}
                </p>
                <span style={badgeStyle}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.steady_state_exception_resolution_verification_status || 'not_reported', ui)}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Verification rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.steady_state_exception_resolution_verification_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.blocked_steady_state_exception_resolution_verification_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.executive_steady_state_exception_resolution_verification_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Product/Ops rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.product_operations_steady_state_exception_resolution_verification_row_count), locale)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length, locale)} {ui("steady-state exception resolution verification row(s) are blocked by open runtime gaps or incomplete recurrence-resolution acceptance.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-resolution-verification'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.steady_state_exception_resolution_verification_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_exception_resolution_verification_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Effectiveness:")} {row.resolution_effectiveness_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Monitoring sample:")} {row.resolution_monitoring_sample_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Recertification:")} {row.recertification_decision_condition || ui("Not reported")}</p>
                        {row.required_steady_state_exception_resolution_verification_evidence?.length ? (
                          <p className="card__subtext">{ui("Verification evidence:")} {row.required_steady_state_exception_resolution_verification_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length ? (
                    <p className="empty-state">{ui("No steady-state exception resolution verification rows reported.")}</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_certification_renewal_board">
                <div className="card__label">{ui("Intelligence runtime steady-state certification renewal board")}</div>
                <p className="card__subtext">
                  {ui("Read-only renewal board that forces steady-state AI certification to be refreshed with current monitoring history, exception-resolution verification, customer-success health, support health, and AI governance owner signoff.")}
                </p>
                <span style={badgeStyle}>{readinessCoreLabel(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.steady_state_certification_renewal_status || 'not_reported', ui)}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Renewal rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.steady_state_certification_renewal_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.blocked_steady_state_certification_renewal_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Executive rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.executive_steady_state_certification_renewal_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Product/Ops rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.product_operations_steady_state_certification_renewal_row_count), locale)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateCertificationRenewalRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimePostEnablementSteadyStateCertificationRenewalRows.length, locale)} {ui("steady-state certification renewal row(s) are blocked by unresolved runtime gaps or incomplete resolution verification.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateCertificationRenewalRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-certification-renewal'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.steady_state_certification_renewal_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.steady_state_certification_renewal_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Cadence:")} {readinessCoreLabel(row.certification_renewal_cadence || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Expiration:")} {row.certification_expiration_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Monitoring history:")} {row.monitoring_history_review_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Output:")} {row.recertification_output_condition || ui("Not reported")}</p>
                        {row.required_steady_state_certification_renewal_evidence?.length ? (
                          <p className="card__subtext">{ui("Renewal evidence:")} {row.required_steady_state_certification_renewal_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateCertificationRenewalRows.length ? (
                    <p className="empty-state">{ui("No steady-state certification renewal rows reported.")}</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_final_governance_audit_pack">
                <div className="card__label">{ui("Intelligence runtime final governance audit pack")}</div>
                <p className="card__subtext">
                  {ui("Read-only final audit pack that verifies AI contract freeze, runtime evidence, rollout history, monitoring history, exception resolution, certification renewal, and governance owner signoff before the AI track is considered complete.")}
                </p>
                <span style={badgeStyle}>{readinessCoreLabel(aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_status || 'not_reported', ui)}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Audit rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeFinalGovernanceAuditPack?.blocked_final_governance_audit_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Ready rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiRuntimeFinalGovernanceAuditPack?.ready_final_governance_audit_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Renewal status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiRuntimeFinalGovernanceAuditPack?.steady_state_certification_renewal_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                {aiBlockedRuntimeFinalGovernanceAuditRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedRuntimeFinalGovernanceAuditRows.length, locale)} {ui("final governance audit row(s) are blocked by certification renewal or runtime evidence gaps.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimeFinalGovernanceAuditRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'final-governance-audit'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.final_governance_audit_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.final_governance_audit_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Release rule:")} {row.final_governance_audit_release_rule || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Contract freeze:")} {row.contract_freeze_review_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Runtime evidence:")} {row.runtime_evidence_review_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Output:")} {row.completion_output_condition || ui("Not reported")}</p>
                        {row.required_final_governance_audit_evidence?.length ? (
                          <p className="card__subtext">{ui("Final audit evidence:")} {row.required_final_governance_audit_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimeFinalGovernanceAuditRows.length ? (
                    <p className="empty-state">{ui("No final governance audit rows reported.")}</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="final_completion_freeze_manifest">
                <div className="card__label">{ui("Intelligence final completion freeze manifest")}</div>
                <p className="card__subtext">
                  {ui("Read-only final completion freeze manifest that carries final governance audit evidence into manual AI-track completion acceptance without certifying commercial grade, enabling tenants, sending notices, or mutating runtime systems.")}
                </p>
                <span style={badgeStyle}>{readinessCoreLabel(aiFinalCompletionFreezeManifest?.final_completion_freeze_status || 'not_reported', ui)}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Freeze rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiFinalCompletionFreezeManifest?.final_completion_freeze_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiFinalCompletionFreezeManifest?.blocked_final_completion_freeze_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Ready rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiFinalCompletionFreezeManifest?.ready_final_completion_freeze_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Contract version")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiFinalCompletionFreezeManifest?.contract_version || 'not_reported')}</div>
                  </div>
                </div>
                {aiBlockedFinalCompletionFreezeRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedFinalCompletionFreezeRows.length, locale)} {ui("final completion freeze row(s) are blocked by final governance audit readiness or runtime evidence gaps.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiFinalCompletionFreezeRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'final-completion-freeze'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.final_completion_freeze_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.final_completion_freeze_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Release rule:")} {row.final_completion_freeze_release_rule || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Contract condition:")} {row.final_completion_contract_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Runtime condition:")} {row.final_completion_runtime_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Business condition:")} {row.final_completion_business_condition || ui("Not reported")}</p>
                        {row.required_final_completion_freeze_evidence?.length ? (
                          <p className="card__subtext">{ui("Completion evidence:")} {row.required_final_completion_freeze_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiFinalCompletionFreezeRows.length ? (
                    <p className="empty-state">{ui("No final completion freeze rows reported.")}</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="commercial_completion_certificate">
                <div className="card__label">{ui("Intelligence commercial completion certificate")}</div>
                <p className="card__subtext">
                  {ui("Final read-only AI governance code-track completion certificate. It closes the governance-board expansion track, lists the remaining external runtime proof requirements, and hands the platform to the commercial launch readiness track without making customer claims or mutating runtime systems.")}
                </p>
                <span style={badgeStyle}>{readinessCoreLabel(aiCommercialCompletionCertificate?.commercial_completion_certificate_status || 'not_reported', ui)}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Certificate rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialCompletionCertificate?.commercial_completion_certificate_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Blocked rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialCompletionCertificate?.blocked_commercial_completion_certificate_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Ready rows")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiCommercialCompletionCertificate?.ready_commercial_completion_certificate_row_count), locale)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">{ui("Code-track status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiCommercialCompletionCertificate?.ai_governance_code_track_status || 'not_reported', ui)}</div>
                  </div>
                </div>
                <p className="card__subtext" style={{ marginTop: 12 }}>
                  {ui("Next best move:")} {formatLabel(aiCommercialCompletionCertificate?.ai_governance_next_best_move || 'not_reported')}
                </p>
                {aiCommercialCompletionCertificate?.remaining_external_proof_requirements?.length ? (
                  <p className="card__subtext">{ui("External proof still required:")} {aiCommercialCompletionCertificate.remaining_external_proof_requirements.join(', ')}</p>
                ) : null}
                {aiCommercialCompletionCertificate?.next_non_ai_track_recommendation?.recommended_scope?.length ? (
                  <p className="card__subtext">{ui("Next track scope:")} {aiCommercialCompletionCertificate.next_non_ai_track_recommendation.recommended_scope.join(', ')}</p>
                ) : null}
                {aiBlockedCommercialCompletionCertificateRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {formatLocalizedNumber(aiBlockedCommercialCompletionCertificateRows.length, locale)} {ui("commercial completion certificate row(s) are blocked by final freeze readiness or runtime evidence gaps.")}
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiCommercialCompletionCertificateRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'commercial-completion-certificate'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || ui("AI feature")}</strong>
                        <p className="card__subtext">{ui("Status:")} {readinessCoreLabel(row.commercial_completion_certificate_status || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Owner:")} {readinessCoreLabel(row.commercial_completion_certificate_owner_hint || 'not_reported', ui)}</p>
                        <p className="card__subtext">{ui("Certificate rule:")} {row.commercial_completion_certificate_rule || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Commercial claim rule:")} {row.commercial_claim_rule || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("Runtime proof:")} {row.runtime_proof_condition || ui("Not reported")}</p>
                        <p className="card__subtext">{ui("External launch:")} {row.external_launch_condition || ui("Not reported")}</p>
                        {row.required_certificate_evidence?.length ? (
                          <p className="card__subtext">{ui("Certificate evidence:")} {row.required_certificate_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiCommercialCompletionCertificateRows.length ? (
                    <p className="empty-state">{ui("No commercial completion certificate rows reported.")}</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="contract_freeze_manifest">
                <div className="card__label">{ui("Intelligence contract freeze manifest")}</div>
                <p className="card__subtext">
                  {ui("Frozen platform-wide AI response contract manifest. It records which unified intelligence backend keys and frontend panels must stay aligned before any new AI governance surface is added or renamed.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Freeze status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiContractFreezeManifest?.freeze_status || 'not_reported', ui)}</div>
                    <div className="card__subtext">{ui("Current backend freeze-manifest status.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Contract version")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiContractFreezeManifest?.contract_version || '—'}</div>
                    <div className="card__subtext">{ui("Version label for this frozen unified intelligence governance contract.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Registered key alignment")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiContractFreezeManifest?.expected_key_count_matches_registered_contract ? ui("Aligned") : ui("Drift")}</div>
                    <div className="card__subtext">{ui("Frozen keys must match the backend registered contract key count:")} {formatLocalizedNumber(numberValue(aiContractFreezeManifest?.registered_contract_key_count), locale)}.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Frozen / returned keys")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiContractFreezeManifest?.frozen_key_count), locale)} / {formatLocalizedNumber(numberValue(aiContractFreezeManifest?.returned_key_count), locale)}</div>
                    <div className="card__subtext">{ui("Frozen response keys compared with actual unified intelligence response keys.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Placeholder panels allowed")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiContractFreezeManifest?.change_control_policy?.static_placeholder_panels_allowed ? ui("Yes") : ui("No")}</div>
                    <div className="card__subtext">{ui("Prevents static frontend-only AI panels without a backend response contract.")}</div>
                  </div>
                </div>
                {aiContractFreezeManifest?.contract_version_alignment_policy ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">{ui("Contract version alignment policy")}</div>
                    <p className="card__subtext">{aiContractFreezeManifest.contract_version_alignment_policy.current_alignment_statement}</p>
                    {aiContractFreezeManifest.contract_version_alignment_policy.version_must_change_when?.length ? (
                      <ul style={{ marginBottom: 0 }}>
                        {aiContractFreezeManifest.contract_version_alignment_policy.version_must_change_when.slice(0, 5).map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
                {aiContractFreezeManifest?.required_frontend_panel_manifest?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">{ui("Frozen panel manifest")}</div>
                    <ul style={{ marginBottom: 0 }}>
                      {aiContractFreezeManifest.required_frontend_panel_manifest.slice(0, 8).map((panel) => (
                        <li key={panel.response_key}>
                          <strong>{formatLabel(panel.response_key)}</strong>: {panel.required_frontend_panel_key} · {panel.required_frontend_panel_dom_attribute || ui("DOM anchor not registered")} — {panel.breaking_change_rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiContractFreezeManifest?.missing_response_keys?.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    {ui("Freeze manifest missing response keys:")} {aiContractFreezeManifest.missing_response_keys.map(formatLabel).join(', ')}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="response_contract_audit">
                <div className="card__label">{ui("Intelligence response contract audit")}</div>
                <p className="card__subtext">
                  {ui("Contract-freeze audit for the unified intelligence summary response. It verifies that every platform-wide AI governance panel is backed by a real backend response key and that those keys preserve the read-only safety contract.")}
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">{ui("Contract status")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiResponseContractAudit?.contract_status || 'not_reported', ui)}</div>
                    <div className="card__subtext">{ui("Backend contract-audit result for unified intelligence response keys.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Expected / returned keys")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiResponseContractAudit?.expected_key_count), locale)} / {formatLocalizedNumber(numberValue(aiResponseContractAudit?.returned_key_count), locale)}</div>
                    <div className="card__subtext">{ui("Expected unified intelligence summary keys compared with actual returned keys.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Missing / unexpected")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiResponseContractAudit?.missing_response_keys?.length), locale)} / {formatLocalizedNumber(numberValue(aiResponseContractAudit?.unexpected_response_keys?.length), locale)}</div>
                    <div className="card__subtext">{ui("Contract drift that must be fixed before adding more AI panels.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Safety-contract gaps")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiResponseContractAudit?.missing_or_unsafe_safety_contract_keys?.length), locale)}</div>
                    <div className="card__subtext">{ui("Intelligence response objects missing a safe read-only contract.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Safety coverage")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(aiResponseContractAudit?.safety_contract_coverage_percent), locale)}%</div>
                    <div className="card__subtext">{ui("Expected unified intelligence objects covered by read-only safety contracts, including the audit object itself.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Self-audit included")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiResponseContractAudit?.response_contract_self_included ? ui("Yes") : ui("No")}</div>
                    <div className="card__subtext">{ui("Confirms the response contract audit panel is itself part of the frozen backend/frontend contract.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Frontend panel contract")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(aiResponseContractAudit?.frontend_panel_contract_status || 'not_reported', ui)}</div>
                    <div className="card__subtext">{ui("Required panels:")} {formatLocalizedNumber(numberValue(aiResponseContractAudit?.required_frontend_panel_count), locale)} · {ui("static placeholders allowed:")} {aiResponseContractAudit?.frontend_panel_coverage_policy?.static_placeholder_panels_allowed ? ui("yes") : ui("no")} · {ui("DOM anchors required:")} {aiResponseContractAudit?.frontend_panel_coverage_policy?.frontend_panels_must_have_stable_dom_contract_anchors ? ui("yes") : ui("no")}.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Runtime anchor self-check")}</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{readinessCoreLabel(frontendRuntimeAnchorSelfCheck.status || 'not_reported', ui)}</div>
                    <div className="card__subtext">{ui("Order status:")} {readinessCoreLabel(frontendRuntimeAnchorSelfCheck.order_status || 'not_reported', ui)}.</div>
                    <div className="card__subtext">{ui("Backend required anchors:")} {formatLocalizedNumber(numberValue(frontendRuntimeAnchorSelfCheck.backend_required_panel_count), locale)} · {ui("frontend declared anchors:")} {formatLocalizedNumber(numberValue(frontendRuntimeAnchorSelfCheck.frontend_declared_anchor_count), locale)} · {ui("order mismatches:")} {formatLocalizedNumber(numberValue(frontendRuntimeAnchorSelfCheck.order_mismatches.length), locale)}.</div>
                  </div>
                </div>
                {aiResponseContractAudit?.frontend_required_panels?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">{ui("Required frontend-backed panels")}</div>
                    <ul style={{ marginBottom: 0 }}>
                      {aiResponseContractAudit.frontend_required_panels.slice(0, 8).map((panel) => (
                        <li key={panel.response_key}>
                          <strong>{panel.required_panel_label || formatLabel(panel.response_key)}</strong>: {panel.required_rendering} · {panel.required_panel_dom_attribute || ui("DOM anchor not registered")} · {ui("Placeholder allowed:")} {panel.static_placeholder_allowed ? ui("yes") : ui("no")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiResponseContractAudit?.frontend_runtime_anchor_self_check_contract ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">{ui("Frontend runtime anchor self-check contract")}</div>
                    <p className="card__subtext">{aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.failure_policy}</p>
                    <div className="card__subtext">{ui("Order sensitive:")} {aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.order_sensitive ? ui("yes") : ui("no")} · {ui("aligned value:")} {aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.ordered_status_value || ui("not registered")}.</div>
                  </div>
                ) : null}
                {frontendRuntimeAnchorSelfCheck.missing_frontend_anchors.length || frontendRuntimeAnchorSelfCheck.unexpected_frontend_anchors.length || frontendRuntimeAnchorSelfCheck.order_mismatches.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    {ui("Frontend DOM-anchor drift: missing")} {frontendRuntimeAnchorSelfCheck.missing_frontend_anchors.map(formatLabel).join(', ') || ui("none")}; {ui("unexpected")} {frontendRuntimeAnchorSelfCheck.unexpected_frontend_anchors.map(formatLabel).join(', ') || ui("none")}; {ui("order mismatches")} {frontendRuntimeAnchorSelfCheck.order_mismatches.map((row) => `${formatLocalizedNumber(row.index + 1, locale)}: ${formatLabel(row.expected)} != ${formatLabel(row.actual || 'missing')}`).join(', ') || ui("none")}.
                  </p>
                ) : null}
                {aiResponseContractAudit?.missing_response_keys?.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    {ui("Missing unified intelligence response keys:")} {aiResponseContractAudit.missing_response_keys.map(formatLabel).join(', ')}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production audit pack")}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <span style={badgeStyle}>{ui("Certification:")} {readinessCoreLabel(auditPack?.certification_status || 'not_reported', ui)}</span>
                  <span style={badgeStyle}>{ui("Evidence tables:")} {formatLocalizedNumber(numberValue(auditPack?.audit_totals?.existing_evidence_tables), locale)} / {formatLocalizedNumber(numberValue(auditPack?.audit_totals?.expected_evidence_tables), locale)}</span>
                  <span style={badgeStyle}>{ui("Tenant scoped:")} {formatLocalizedNumber(numberValue(auditPack?.audit_totals?.tenant_scoped_evidence_tables), locale)}</span>
                  <span style={badgeStyle}>{ui("Tenant rows:")} {formatLocalizedNumber(numberValue(auditPack?.audit_totals?.tenant_evidence_rows), locale)}</span>
                  <span style={badgeStyle}>{ui("Blockers:")} {formatLocalizedNumber(numberValue(auditPack?.audit_totals?.critical_or_high_blockers), locale)}</span>
                </div>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 14 }}>
                  <div className="card">
                    <div className="card__label">{ui("Evidence-table coverage")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(auditPack?.coverage?.evidence_table_coverage_percent), locale)}%</div>
                    <div className="card__subtext">{ui("Registered intelligence and AI-assisted evidence tables that exist in the current database schema.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Tenant-scope coverage")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(auditPack?.coverage?.tenant_scoped_table_coverage_percent), locale)}%</div>
                    <div className="card__subtext">{ui("Evidence tables that support tenant isolation with tenant_id.")}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">{ui("Tenant-data coverage")}</div>
                    <div className="card__value">{formatLocalizedNumber(numberValue(auditPack?.coverage?.tenant_data_feature_coverage_percent), locale)}%</div>
                    <div className="card__subtext">{ui("Tracked intelligence features with tenant evidence rows available.")}</div>
                  </div>
                </div>
                {auditPack?.blockers?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">{ui("Critical/high blockers")}</div>
                    <ol style={{ marginBottom: 0 }}>
                      {auditPack.blockers.slice(0, 8).map((blocker) => (
                        <li key={blocker.feature_key || blocker.feature_label}>
                          <strong>{blocker.feature_label}</strong>: {readinessCoreLabel(blocker.blocker_reason || 'not_reported', ui)}
                          <div className="card__subtext">
                            {readinessCoreLabel(blocker.production_priority || 'not_reported', ui)} · {readinessCoreLabel(blocker.production_status || 'not_reported', ui)} · {formatLocalizedNumber(numberValue(blocker.readiness_score), locale)}% {ui("ready")}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No critical/high readiness blockers reported by the audit pack.")}</p>
                )}
                {auditPack?.missing_evidence_tables?.length ? (
                  <p className="card__subtext" style={{ marginTop: 14 }}>
                    {ui("Missing evidence tables:")} {auditPack.missing_evidence_tables.slice(0, 10).join(', ')}{auditPack.missing_evidence_tables.length > 10 ? '…' : ''}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production hardening plan")}</div>
                {hardeningPlanQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted production hardening plan…")}</p>
                ) : hardeningPlanQuery.error ? (
                  <p className="form-error">
                    {hardeningPlanQuery.error instanceof ApiError
                      ? hardeningPlanQuery.error.message
                      : ui('Unable to load intelligence and AI-assisted production hardening plan.')}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Plan:")} {readinessCoreLabel(hardeningPlan?.plan_status || 'not_reported', ui)}</span>
                      <span style={badgeStyle}>{ui("Backlog:")} {formatLocalizedNumber(numberValue(hardeningPlan?.total_backlog_items), locale)}</span>
                      <span style={badgeStyle}>{ui("Scheduled:")} {formatLocalizedNumber(numberValue(hardeningPlan?.scheduled_items), locale)}</span>
                      <span style={badgeStyle}>{ui("Release gate:")} {readinessCoreLabel(hardeningPlan?.release_gate?.current_status || 'not_reported', ui)}</span>
                    </div>
                    {hardeningPlan?.release_gate?.required_before_production?.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Required before production")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {hardeningPlan.release_gate.required_before_production.map((item) => (
                            <li key={item}>{localizedReadinessSystemText(item, ui)}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    <div style={reviewListStyle}>
                      {hardeningPhases.map((phase) => (
                        <article className="card" key={phase.key || phase.phase}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                            <span style={badgeStyle}>{ui("Phase")} {formatLocalizedNumber(numberValue(phase.phase), locale)}</span>
                            <span style={badgeStyle}>{formatLocalizedNumber(numberValue(phase.item_count), locale)} {ui("items")}</span>
                          </div>
                          <h3 style={{ marginTop: 0 }}>{localizedReadinessSystemText(phase.label, ui)}</h3>
                          <p className="card__subtext">{localizedReadinessSystemText(phase.description, ui)}</p>
                          {phase.items?.length ? (
                            <ol style={{ marginBottom: 0 }}>
                              {phase.items.slice(0, 5).map((item) => (
                                <li key={`${phase.key}-${item.feature_key}-${item.sequence}`}>
                                  <strong>{localizedReadinessSystemText(item.feature_label, ui)}</strong>: {localizedReadinessSystemText(item.gap, ui)}
                                  <div className="card__subtext">
                                    {readinessCoreLabel(item.workstream || 'not_reported', ui)} · {readinessCoreLabel(item.production_priority || 'not_reported', ui)} · {formatLocalizedNumber(numberValue(item.readiness_score), locale)}% {ui("ready")}
                                  </div>
                                  {item.acceptance_criteria?.[0]?.label ? (
                                    <div className="card__subtext">{ui("Acceptance:")} {localizedReadinessSystemText(item.acceptance_criteria[0].label, ui)}</div>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="card__subtext">{ui("No hardening items scheduled for this phase.")}</p>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production evidence matrix")}</div>
                {evidenceMatrixQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted evidence matrix…")}</p>
                ) : evidenceMatrixQuery.error ? (
                  <p className="form-error">
                    {evidenceMatrixQuery.error instanceof ApiError
                      ? evidenceMatrixQuery.error.message
                      : ui('Unable to load intelligence and AI-assisted production evidence matrix.')}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Matrix:")} {readinessCoreLabel(evidenceMatrix?.matrix_status || 'not_reported', ui)}</span>
                      <span style={badgeStyle}>{ui("Evidence rows:")} {formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.total_rows), locale)}</span>
                      <span style={badgeStyle}>{ui("Existing tables:")} {formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.existing_tables), locale)}</span>
                      <span style={badgeStyle}>{ui("Tenant scoped:")} {formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.tenant_scoped_tables), locale)}</span>
                      <span style={badgeStyle}>{ui("Required gaps:")} {formatLocalizedNumber(numberValue(evidenceMatrix?.totals?.required_gaps), locale)}</span>
                    </div>
                    {evidenceRiskEntries.length ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {evidenceRiskEntries.map(([risk, count]) => (
                          <span style={badgeStyle} key={risk}>{readinessCoreLabel(risk, ui)}: {formatLocalizedNumber(numberValue(count), locale)}</span>
                        ))}
                      </div>
                    ) : null}
                    {requiredEvidenceGaps.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Required evidence gaps before production")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {requiredEvidenceGaps.slice(0, 10).map((gap) => (
                            <li key={`${gap.feature_key}-${gap.table_name}`}>
                              <strong>{localizedReadinessSystemText(gap.feature_label, ui)}</strong>: {gap.table_name} — {readinessCoreLabel(gap.evidence_risk, ui)}
                              <div className="card__subtext">
                                {readinessCoreLabel(gap.production_priority, ui)} · {readinessCoreLabel(gap.evidence_scope, ui)} · {formatLocalizedNumber(numberValue(gap.row_count), locale)} {ui("rows")}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No required critical/high evidence gaps reported by the matrix.")}</p>
                    )}
                  </>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production release decision board")}</div>
                {releaseDecisionBoardQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted production release decision board…")}</p>
                ) : releaseDecisionBoardQuery.error ? (
                  <p className="form-error">
                    {releaseDecisionBoardQuery.error instanceof ApiError
                      ? releaseDecisionBoardQuery.error.message
                      : ui('Unable to load intelligence and AI-assisted production release decision board.')}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Decision:")} {readinessCoreLabel(releaseDecisionBoard?.board_status || 'not_reported', ui)}</span>
                      <span style={badgeStyle}>{ui("Blockers:")} {formatLocalizedNumber(numberValue(releaseDecisionBoard?.release_decision_inputs?.blocker_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Watch:")} {formatLocalizedNumber(numberValue(releaseDecisionBoard?.release_decision_inputs?.watch_item_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Critical/high hardening:")} {formatLocalizedNumber(numberValue(releaseDecisionBoard?.release_decision_inputs?.critical_high_hardening_item_count), locale)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {ui("Recommendation:")} {readinessCoreLabel(releaseDecisionBoard?.decision_summary?.recommendation || 'not_reported', ui)}. {ui("Production without waiver:")} {releaseDecisionBoard?.decision_summary?.production_allowed_without_waiver ? ui('Yes') : ui('No')}.
                    </p>
                    {releaseBlockers.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Release blockers")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {releaseBlockers.slice(0, 10).map((blocker, index) => (
                            <li key={`${blocker.blocker_type}-${blocker.feature_key}-${index}`}>
                              <strong>{blocker.feature_label ? localizedReadinessSystemText(blocker.feature_label, ui) : formatLabel(blocker.feature_key)}</strong>: {readinessCoreLabel(blocker.blocker_type, ui)} — {blocker.blocker_type === 'critical_high_feature_blocker' ? readinessCoreLabel(blocker.detail, ui) : blocker.blocker_type === 'failed_signoff_item' ? localizedReadinessSystemText(blocker.detail, ui) : blocker.detail}
                              <div className="card__subtext">
                                {readinessCoreLabel(blocker.severity, ui)} · {ui("Resolution:")} {localizedReadinessSystemText(blocker.required_resolution, ui)}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No release blockers reported by the decision board.")}</p>
                    )}
                    {releaseFinalEvidence.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Required final test evidence")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {releaseFinalEvidence.map((item) => (
                            <li key={item}>{localizedReadinessSystemText(item, ui)}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production operational runbook")}</div>
                {operationalRunbookQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted production operational runbook…")}</p>
                ) : operationalRunbookQuery.error ? (
                  <p className="form-error">
                    {operationalRunbookQuery.error instanceof ApiError
                      ? operationalRunbookQuery.error.message
                      : ui('Unable to load intelligence and AI-assisted production operational runbook.')}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Runbook:")} {readinessCoreLabel(operationalRunbook?.runbook_status, ui)}</span>
                      <span style={badgeStyle}>{ui("Release:")} {readinessCoreLabel(operationalRunbook?.release_decision?.recommendation, ui)}</span>
                      <span style={badgeStyle}>{ui("Next actions:")} {formatLocalizedNumber(nextOperatorActions.length, locale)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {operationalRunbook?.operator_warning ? localizedReadinessSystemText(operationalRunbook.operator_warning, ui) : ui('Runbook guidance is read-only and does not execute intelligence and AI-assisted actions.')}
                    </p>
                    {dailyOperatorSequence.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Daily operator sequence")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {dailyOperatorSequence.map((item) => (
                            <li key={item}>{localizedReadinessOperatorInstruction(item, locale, ui)}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {nextOperatorActions.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Next operator actions")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {nextOperatorActions.slice(0, 8).map((action) => (
                            <li key={action.feature_key || action.feature_label}>
                              <strong>{localizedReadinessSystemText(action.feature_label, ui)}</strong>: {readinessCoreLabel(action.runbook_status, ui)}
                              <div className="card__subtext">
                                {readinessCoreLabel(action.production_priority, ui)} · {formatLocalizedNumber(numberValue(action.readiness_score), locale)}% {ui("ready")} · {ui("Signoff:")} {readinessCoreLabel(action.signoff_status, ui)}
                              </div>
                              {action.operator_sequence?.[0] ? (
                                <div className="card__subtext">{ui("First step:")} {localizedReadinessOperatorInstruction(action.operator_sequence[0], locale, ui)}</div>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No blocked or watch operator actions reported by the runbook.")}</p>
                    )}
                    {emergencyStopConditions.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Emergency stop conditions")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {emergencyStopConditions.map((item) => (
                            <li key={item}>{localizedReadinessSystemText(item, ui)}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </>
                )}
              </div>



              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production validation suite")}</div>
                {validationSuiteQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted production validation suite…")}</p>
                ) : validationSuiteQuery.error ? (
                  <p className="form-error">
                    {validationSuiteQuery.error instanceof ApiError
                      ? validationSuiteQuery.error.message
                      : ui("Unable to load intelligence and AI-assisted production validation suite.")}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Validation:")} {readinessCoreLabel(validationSuite?.validation_status, ui)}</span>
                      <span style={badgeStyle}>{ui("Cases:")} {formatLocalizedNumber(numberValue(validationSuite?.totals?.validation_case_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Ready:")} {formatLocalizedNumber(numberValue(validationSuite?.totals?.ready_case_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Blocked:")} {formatLocalizedNumber(numberValue(validationSuite?.totals?.blocked_case_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Tenant review:")} {formatLocalizedNumber(numberValue(validationSuite?.totals?.tenant_isolation_review_case_count), locale)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {validationSuite?.safety_rule ? localizedReadinessSystemText(validationSuite.safety_rule, ui) : ui("Validation proves readiness only; it does not execute intelligence and AI-assisted actions.")}
                    </p>
                    {validationBlockedCases.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Blocked validation cases")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {validationBlockedCases.slice(0, 8).map((item) => (
                            <li key={item.feature_key || item.feature_label}>
                              <strong>{localizedReadinessSystemText(item.feature_label, ui)}</strong>: {readinessCoreLabel(item.validation_status, ui)}
                              <div className="card__subtext">
                                {readinessCoreLabel(item.production_priority, ui)} · {ui("Missing tables:")} {formatLocalizedNumber(numberValue(item.evidence_preconditions?.missing_tables?.length), locale)} · {ui("Empty tenant tables:")} {formatLocalizedNumber(numberValue(item.evidence_preconditions?.empty_tenant_tables?.length), locale)}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No blocked intelligence and AI-assisted validation cases reported.")}</p>
                    )}
                    {validationReviewCases.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Tenant isolation review cases")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {validationReviewCases.slice(0, 6).map((item) => (
                            <li key={item.feature_key || item.feature_label}>
                              <strong>{localizedReadinessSystemText(item.feature_label, ui)}</strong>: {formatLocalizedNumber(numberValue(item.evidence_preconditions?.unscoped_tables?.length), locale)} {ui("unscoped evidence table(s)")}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {validationGlobalAssertions.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Required global assertions")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {validationGlobalAssertions.map((item) => (
                            <li key={item}>{localizedReadinessSystemText(item, ui)}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                    {validationCommands.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Suggested validation commands")}</div>
                        <ul style={{ marginBottom: 0 }}>
                          {validationCommands.map((item) => (
                            <li key={item}><code>{item}</code></li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <p className="card__subtext" style={{ marginTop: 14 }}>
                      {ui("Ready validation cases:")} {formatLocalizedNumber(numberValue(validationReadyCases.length), locale)}
                    </p>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production signoff checklist")}</div>
                {signoffChecklistQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted production signoff checklist…")}</p>
                ) : signoffChecklistQuery.error ? (
                  <p className="form-error">
                    {signoffChecklistQuery.error instanceof ApiError
                      ? signoffChecklistQuery.error.message
                      : ui("Unable to load intelligence and AI-assisted production signoff checklist.")}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Checklist:")} {readinessCoreLabel(signoffChecklist?.checklist_status, ui)}</span>
                      <span style={badgeStyle}>{ui("Features:")} {formatLocalizedNumber(numberValue(signoffChecklist?.totals?.feature_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Passed:")} {formatLocalizedNumber(numberValue(signoffChecklist?.totals?.pass_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Watch:")} {formatLocalizedNumber(numberValue(signoffChecklist?.totals?.watch_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Failed:")} {formatLocalizedNumber(numberValue(signoffChecklist?.totals?.fail_count), locale)}</span>
                      <span style={badgeStyle}>{ui("Blocked features:")} {formatLocalizedNumber(numberValue(signoffChecklist?.totals?.blocked_feature_count), locale)}</span>
                    </div>
                    <p className="card__subtext" style={{ marginTop: 12 }}>
                      {signoffChecklist?.release_rule ? localizedReadinessSystemText(signoffChecklist.release_rule, ui) : ui("Production signoff requires passing or governance-accepting every intelligence and AI-assisted checklist item.")}
                    </p>
                    {blockedSignoffFeatures.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Blocked signoff features")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {blockedSignoffFeatures.map((feature) => (
                            <li key={feature.feature_key || feature.feature_label}>
                              <strong>{localizedReadinessSystemText(feature.feature_label, ui)}</strong>: {formatLocalizedNumber(numberValue(feature.failed_item_count), locale)} {ui("failed checklist items")}
                              <div className="card__subtext">
                                {readinessCoreLabel(feature.production_priority, ui)} · {readinessCoreLabel(feature.production_status, ui)} · {formatLocalizedNumber(numberValue(feature.readiness_score), locale)}% {ui("ready")}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No blocked intelligence and AI-assisted signoff features reported.")}</p>
                    )}
                    {watchSignoffFeatures.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Watch-before-final-test features")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {watchSignoffFeatures.map((feature) => (
                            <li key={feature.feature_key || feature.feature_label}>
                              <strong>{localizedReadinessSystemText(feature.feature_label, ui)}</strong>: {formatLocalizedNumber(numberValue(feature.watch_item_count), locale)} {ui("watch checklist items")}
                              <div className="card__subtext">
                                {readinessCoreLabel(feature.production_priority, ui)} · {readinessCoreLabel(feature.signoff_status, ui)} · {formatLocalizedNumber(numberValue(feature.readiness_score), locale)}% {ui("ready")}
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
                <div className="card__label">{ui("Selected intelligence and AI-assisted feature drilldown")}</div>
                <div style={{ ...toolbarStyle, marginTop: 10 }}>
                  <select
                    style={selectStyle}
                    value={selectedReadinessFeatureKey}
                    onChange={(event) => setSelectedReadinessFeatureKey(event.target.value)}
                  >
                    {allReadinessFeatures.map((feature) => (
                      <option key={feature.key} value={feature.key}>{localizedReadinessSystemText(feature.label, ui)}</option>
                    ))}
                  </select>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => featureDetailQuery.refetch()}
                    disabled={featureDetailQuery.isFetching}
                  >
                    {featureDetailQuery.isFetching ? ui('Refreshing…') : ui('Refresh feature detail')}
                  </button>
                </div>
                {featureDetailQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading selected intelligence and AI-assisted feature detail…")}</p>
                ) : featureDetailQuery.error ? (
                  <p className="form-error">
                    {featureDetailQuery.error instanceof ApiError
                      ? featureDetailQuery.error.message
                      : ui('Unable to load selected intelligence and AI-assisted feature detail.')}
                  </p>
                ) : (
                  <>
                    <h3 style={{ marginTop: 0 }}>{selectedFeature?.label || ui('Selected feature')}</h3>
                    <p className="card__subtext">{selectedFeature ? ui('{feature}: {status}; {count} tenant evidence rows.').replace('{feature}', localizedReadinessSystemText(selectedFeature.label, ui)).replace('{status}', readinessCoreLabel(selectedFeature.completion_band, ui)).replace('{count}', formatLocalizedNumber(numberValue(featureDetail?.evidence_summary?.tenant_data_rows), locale)) : ''}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Priority:")} {readinessCoreLabel(selectedFeature?.production_priority, ui)}</span>
                      <span style={badgeStyle}>{ui("Status:")} {readinessCoreLabel(selectedFeature?.production_status, ui)}</span>
                      <span style={badgeStyle}>{ui("Score:")} {formatLocalizedNumber(numberValue(selectedFeature?.readiness_score), locale)}%</span>
                      <span style={badgeStyle}>{ui("Evidence:")} {readinessCoreLabel(featureDetail?.evidence_summary?.evidence_state, ui)}</span>
                    </div>
                    <div className="card-grid" style={{ ...gridStyle, marginTop: 14 }}>
                      <div className="card">
                        <div className="card__label">{ui("Production meaning")}</div>
                        <p className="card__subtext">{readinessCoreLabel(featureDetail?.operator_summary?.production_meaning, ui)}</p>
                      </div>
                      <div className="card">
                        <div className="card__label">{ui("Evidence meaning")}</div>
                        <p className="card__subtext">{numberValue(featureDetail?.evidence_summary?.expected_table_count) > 0 ? ui('{existing} of {expected} registered evidence tables exist for this feature.').replace('{existing}', formatLocalizedNumber(numberValue(featureDetail?.evidence_summary?.existing_table_count), locale)).replace('{expected}', formatLocalizedNumber(numberValue(featureDetail?.evidence_summary?.expected_table_count), locale)) : ui('No evidence tables are registered for this feature.')}</p>
                      </div>
                      <div className="card">
                        <div className="card__label">{ui("Next required completion")}</div>
                        <p className="card__subtext">{localizedReadinessSystemText(featureDetail?.operator_summary?.next_required_completion, ui)}</p>
                      </div>
                    </div>
                    {selectedFeature?.implemented_capabilities?.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Implemented capabilities in current code")}</div>
                        <ul style={{ marginBottom: 0 }}>
                          {selectedFeature.implemented_capabilities.map((capability) => (
                            <li key={localizedReadinessSystemText(capability, ui)}>{localizedReadinessSystemText(capability, ui)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {selectedHardeningItems.length ? (
                      <div style={{ marginTop: 14 }}>
                        <div className="card__label">{ui("Open hardening items with acceptance criteria")}</div>
                        <ol style={{ marginBottom: 0 }}>
                          {selectedHardeningItems.map((item) => (
                            <li key={`${item.feature_key}-${item.sequence}`}>
                              <strong>{localizedReadinessSystemText(item.gap, ui)}</strong>
                              <div className="card__subtext">{readinessCoreLabel(item.workstream, ui)} · {readinessCoreLabel(item.production_priority, ui)} · {formatLocalizedNumber(numberValue(item.readiness_score), locale)}% {ui("ready")}</div>
                              {item.acceptance_criteria?.length ? (
                                <ul>
                                  {item.acceptance_criteria.map((criterion) => (
                                    <li key={criterion.key}>
                                      {localizedReadinessSystemText(criterion.label, ui)}
                                      <div className="card__subtext">{localizedReadinessSystemText(criterion.verification, ui)}</div>
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
                        <div className="card__label">{ui("Evidence tables checked")}</div>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>{ui("Table")}</th>
                              <th>{ui("Exists")}</th>
                              <th>{ui("Tenant scoped")}</th>
                              <th>{ui("Rows")}</th>
                              <th>{ui("Scope")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedFeatureTables.map((table) => (
                              <tr key={table.table_name}>
                                <td>{table.table_name}</td>
                                <td>{table.table_exists ? ui('Yes') : ui('No')}</td>
                                <td>{table.tenant_scoped ? ui('Yes') : ui('No')}</td>
                                <td>{formatLocalizedNumber(numberValue(table.row_count), locale)}</td>
                                <td>{readinessCoreLabel(table.evidence_scope, ui)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    <p className="card__subtext" style={{ marginTop: 14 }}>{localizedReadinessSystemText(featureDetail?.operator_summary?.safety_position, ui)}</p>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Full intelligence and AI-assisted feature breakdown")}</div>
                <div style={{ overflowX: 'auto', marginTop: 10 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{ui("Feature")}</th>
                        <th>{ui("Priority")}</th>
                        <th>{ui("Status")}</th>
                        <th>{ui("Score")}</th>
                        <th>{ui("Evidence")}</th>
                        <th>{ui("Main gap")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReadinessFeatures.map((feature) => (
                        <tr key={feature.key}>
                          <td>
                            <strong>{localizedReadinessSystemText(feature.label, ui)}</strong>
                            <div className="card__subtext">{readinessCoreLabel(feature.category, ui)}</div>
                          </td>
                          <td>{readinessCoreLabel(feature.production_priority, ui)}</td>
                          <td>{readinessCoreLabel(feature.production_status, ui)}</td>
                          <td>{formatLocalizedNumber(numberValue(feature.readiness_score), locale)}%</td>
                          <td>
                            {formatLocalizedNumber(numberValue(feature.evidence?.tenant_data_rows), locale)} {ui("rows")} · {formatLocalizedNumber(numberValue(feature.evidence?.existing_table_count), locale)} / {formatLocalizedNumber(numberValue(feature.evidence?.expected_table_count), locale)} {ui("tables")}
                          </td>
                          <td>{feature.completion_gaps?.[0] || ui('No gap reported')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production remediation workbench")}</div>
                {remediationWorkbenchQuery.isLoading ? (
                  <p className="card__subtext">{ui("Loading intelligence and AI-assisted production remediation workbench…")}</p>
                ) : remediationWorkbenchQuery.error ? (
                  <p className="form-error">
                    {remediationWorkbenchQuery.error instanceof ApiError
                      ? remediationWorkbenchQuery.error.message
                      : ui('Unable to load intelligence and AI-assisted production remediation workbench.')}
                  </p>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <span style={badgeStyle}>{ui("Workbench:")} {readinessCoreLabel(remediationWorkbench?.workbench_status, ui)}</span>
                      <span style={badgeStyle}>{ui("Open:")} {formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.open_actions), locale)}</span>
                      <span style={badgeStyle}>{ui("Critical:")} {formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.critical_actions), locale)}</span>
                      <span style={badgeStyle}>{ui("High:")} {formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.high_actions), locale)}</span>
                      <span style={badgeStyle}>{ui("Evidence gaps:")} {formatLocalizedNumber(numberValue(remediationWorkbench?.totals?.actions_with_evidence_gaps), locale)}</span>
                    </div>
                    {remediationWorkstreams.length ? (
                      <p className="card__subtext" style={{ marginTop: 10 }}>
                        {ui("Workstreams:")} {remediationWorkstreams.map(([key, value]) => `${readinessCoreLabel(key, ui)}: ${formatLocalizedNumber(numberValue(value), locale)}`).join(' · ')}
                      </p>
                    ) : null}
                    {remediationNextActions.length ? (
                      <ol style={{ marginBottom: 0, marginTop: 14 }}>
                        {remediationNextActions.slice(0, 10).map((action) => (
                          <li key={`${action.feature_key}-${action.sequence}-${localizedReadinessSystemText(action.gap, ui)}`}>
                            <strong>{localizedReadinessSystemText(action.feature_label, ui)}</strong>: {localizedReadinessSystemText(action.gap, ui)}
                            <div className="card__subtext">
                              {readinessCoreLabel(action.production_priority, ui)} · {readinessCoreLabel(action.workstream, ui)} · {formatLocalizedNumber(numberValue(action.readiness_score), locale)}{ui("% ready")}
                            </div>
                            {action.target_endpoints?.length ? (
                              <div className="card__subtext">{ui("Endpoints:")} {action.target_endpoints.slice(0, 3).join(', ')}{action.target_endpoints.length > 3 ? '…' : ''}</div>
                            ) : null}
                            {action.evidence_gaps?.length ? (
                              <div className="card__subtext">
                                {ui("Evidence gaps:")} {action.evidence_gaps.slice(0, 3).map((gap) => `${gap.table_name} (${readinessCoreLabel(gap.evidence_risk, ui)})`).join(', ')}{action.evidence_gaps.length > 3 ? '…' : ''}
                              </div>
                            ) : null}
                            {action.acceptance_criteria?.[0]?.label ? (
                              <div className="card__subtext">{ui("Acceptance:")} {localizedReadinessSystemText(action.acceptance_criteria[0].label, ui)}</div>
                            ) : null}
                            {action.suggested_validation?.length ? (
                              <div className="card__subtext">{ui("Validation:")} {action.suggested_validation.slice(0, 2).join(' · ')}</div>
                            ) : null}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="card__subtext" style={{ marginTop: 14 }}>{ui("No remediation actions reported.")}</p>
                    )}
                    <p className="card__subtext" style={{ marginTop: 14 }}>
                      {ui("This workbench is still read-only. It turns the existing intelligence and AI-assisted gaps into actionable production tasks, but it does not execute recommendations or mutate inventory, procurement, financial, approval, or external AI state.")}
                    </p>
                  </>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card__label">{ui("Production backlog from existing intelligence and AI-assisted features")}</div>
                {productionBacklog.length ? (
                  <ol style={{ marginBottom: 0 }}>
                    {productionBacklog.slice(0, 12).map((item) => (
                      <li key={`${item.feature_key}-${item.sequence}`}>
                        <strong>{localizedReadinessSystemText(item.feature_label, ui)}</strong>: {localizedReadinessSystemText(item.gap, ui)}
                        <div className="card__subtext">
                          {readinessCoreLabel(item.production_priority, ui)} · {readinessCoreLabel(item.production_status, ui)} · {formatLocalizedNumber(numberValue(item.readiness_score), locale)}{ui("% ready")}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="card__subtext">{ui("No production backlog reported.")}</p>
                )}
              </div>
                </div>
              </details>
            </>
          )}
        </div>
      </section>
      ) : null}

      {activeView === 'recommendations' ? (
        <>
      <section className="section">
        <div className="section__title ai-review-page__section-title"><span className="ai-review-page__section-icon"><TenantNavIcon path="/intelligence-review" size={16} /></span><span>{ui("Recommendation review controls")}</span></div>
        {reviewActionMessage ? (
          <div className="card ai-review-page__feedback" style={{ marginBottom: 12 }} role="status" aria-live="polite">
            <p className="card__subtext">{reviewActionMessage}</p>
          </div>
        ) : null}
        <div className="card ai-review-page__controls-card">
          <div className="ai-review-page__toolbar" style={toolbarStyle}>
            {!isFocusedReview ? (<>
              <label className="ai-review-page__field"><span>{ui("Review category")}</span><select aria-label={ui("Review category")} style={selectStyle} value={aiOperationDomain} onChange={(event) => setAiOperationDomain(event.target.value as 'all' | AIOperationDomain)}>
                {DOMAIN_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select></label>
              <label className="ai-review-page__field"><span>{ui("Review state")}</span><select aria-label={ui("Review state")} style={selectStyle} value={reviewState} onChange={(event) => setReviewState(event.target.value as 'all' | ReviewState)}>
                {REVIEW_STATE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select></label>
              <label className="ai-review-page__field"><span>{ui("Urgency")}</span><select aria-label={ui("Review urgency")} style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | Urgency)}>
                {URGENCY_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{ui(option.label)}</option>
                ))}
              </select></label>
            </>) : (
              <span className="card__subtext">{ui('Showing the exact requested Intelligence Review item. Queue filters do not apply in this focused view.')}</span>
            )}
            <button className="button button--secondary ai-review-page__toolbar-action" type="button" onClick={() => reviewQuery.refetch()} disabled={reviewQuery.isFetching}>
              <TenantNavIcon path="/intelligence-review" size={16} />{reviewQuery.isFetching ? ui('Refreshing…') : ui('Refresh review queue')}
            </button>
            <Link className="button button--secondary ai-review-page__toolbar-action" to="/workflow-composer"><TenantNavIcon path="/workflow-composer" size={16} />{ui("Open workflow composer")}</Link>
            {capabilities.canViewSystemContext ? <Link className="button button--secondary ai-review-page__toolbar-action" to="/system-context"><TenantNavIcon path="/system-context" size={16} />{ui("Open system context")}</Link> : null}
          </div>

          {reviewQuery.isLoading ? (
            <p className="card__subtext">{ui("Loading recommendation review queue…")}</p>
          ) : reviewQuery.error ? (
            <p className="form-error">
              {reviewQuery.error instanceof ApiError
                ? reviewQuery.error.message
                : ui('Unable to load the recommendation review queue.')}
            </p>
          ) : (
            <p className="card__subtext">
              {localizedIntelligenceReviewSystemText(guidance.review_queue_guidance_key, guidance.review_queue_guidance, 'Review source confidence, explainability, structured evidence, and approval requirements before acting elsewhere.', ui)}
            </p>
          )}
        </div>
      </section>

      <section className="section" id="ai-review-queue" style={{ scrollMarginTop: 16 }}>
        <div className="section__title ai-review-page__section-title"><span className="ai-review-page__section-icon ai-review-page__icon--violet"><TenantNavIcon path="/intelligence-review" size={16} /></span><span>{ui("Review queue")}</span></div>
        {reviews.length === 0 && !reviewQuery.isLoading && !reviewQuery.error ? (
          <div className="empty-state">{ui(requestedSourceActionId ? 'The requested review is not available to your role or is no longer available.' : 'No recommendation review items match the selected filters.')}</div>
        ) : (
          <div style={reviewListStyle}>
            {reviews.map((review) => {
              const sourcePath = sourceReviewToAppPath(review);
              const confidence = review.confidence_visualization;
              const evidencePreview = review.simulation_preview;
              const reviewOrigin = describeReviewOrigin(review, ui);
              const lifecycle = review.lifecycle;
              const sourceActionId = review.source_action_id || '';
              const isForecastReview = review.source_reference?.source_type === 'probabilistic_forecast_model';
              const isEscalatedReview = lifecycle?.current_status === 'escalated';
              const currentRoleOwnsEscalation = !isEscalatedReview
                || currentRoleMatchesEscalationTarget(lifecycle?.escalation_target_role, capabilities.role);
              const adminCanReassignEscalation = isEscalatedReview && capabilities.isAdmin && !currentRoleOwnsEscalation;
              const initialDecisionDraft: ReviewDecisionDraft = isEscalatedReview
                ? {
                    ...defaultReviewDecisionDraft,
                    decision: 'escalated',
                    escalation_target_role: lifecycle?.escalation_target_role || '',
                    escalation_due_at: dateInputValueFromIso(lifecycle?.escalation_due_at)
                  }
                : defaultReviewDecisionDraft;
              const decisionDraft = reviewDecisionDrafts[sourceActionId] || initialDecisionDraft;
              const allowedDecisions = lifecycle?.allowed_decisions || [];
              const visibleDecisionOptions = REVIEW_DECISION_OPTIONS.filter((option) => {
                if (!allowedDecisions.includes(option.value)) return false;
                if (!isEscalatedReview || currentRoleOwnsEscalation) return true;
                return adminCanReassignEscalation && option.value === 'escalated';
              });
              const selectedDecision = visibleDecisionOptions.some((option) => option.value === decisionDraft.decision)
                ? decisionDraft.decision
                : visibleDecisionOptions[0]?.value;
              const decisionValidationMessage = reviewDecisionValidationMessage(selectedDecision, decisionDraft, ui);
              const historyIsSelected = selectedHistorySourceActionId === sourceActionId;
              return (
                <article className={`card ai-review-page__review-card ai-review-page__review-card--${review.urgency || 'medium'}`} key={review.review_id} id={sourceActionId ? `ai-review-${sourceActionId}` : undefined} tabIndex={-1} style={{ scrollMarginTop: 16 }}>
                  <div className="ai-review-page__review-badges">
                    <span className={`ai-review-page__badge ai-review-page__badge--${review.urgency || 'medium'}`}>{recommendationLabel(review.urgency, ui)}</span>
                    <span className="ai-review-page__badge">{recommendationLabel(review.review_state, ui)}</span>
                    <span className="ai-review-page__badge ai-review-page__badge--violet">{recommendationLabel(review.ai_operation_domain, ui)}</span>
                    {review.governance_approval_guidance?.approval_required && reviewStateIsActive(lifecycle?.current_status || review.review_state) ? <span className="ai-review-page__badge ai-review-page__badge--amber">{ui("Approval required")}</span> : null}
                  </div>
                  <div className="ai-review-page__review-heading"><span className="ai-review-page__review-icon ai-review-page__icon--violet"><TenantNavIcon path="/intelligence-review" size={18} /></span><h3>{review.title || ui('Intelligence review')}</h3></div>
                  <p className="card__subtext">{review.summary || ui('No review summary was provided.')}</p>
                  <div className="card-grid ai-review-page__evidence-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 12 }}>
                    <div className="ai-review-page__evidence-card">
                      <div className="card__label">{ui("Source confidence")}</div>
                      <strong>{formatPercent(confidence?.confidence_score, locale, ui)}</strong>
                      <div className="card__subtext">{recommendationLabel(confidence?.confidence_band, ui)} · {recommendationLabel(confidence?.score_source, ui)} · {ui("advisory only")}</div>
                    </div>
                    <div className="ai-review-page__evidence-card">
                      <div className="card__label">{ui("Evidence preview")}</div>
                      <strong>{evidencePreview?.preview_available ? ui('Structured evidence available') : ui('Metadata only')}</strong>
                      <div className="card__subtext">{recommendationLabel(evidencePreview?.preview_kind, ui)}</div>
                    </div>
                    <div className="ai-review-page__evidence-card">
                      <div className="card__label">{ui("How this result was produced")}</div>
                      <strong>{reviewOrigin.label}</strong>
                      <div className="card__subtext">{reviewOrigin.detail}</div>
                    </div>
                    <div className="ai-review-page__evidence-card">
                      <div className="card__label">{ui("Updated")}</div>
                      <strong>{formatDateTime(review.updated_at || review.created_at, locale, ui)}</strong>
                    </div>
                  </div>

                  {evidencePreview?.preview_summary ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">{ui("Evidence summary")}</div>
                      <p className="card__subtext">{localizedReviewEvidenceSummary(evidencePreview, locale, ui)}</p>
                    </div>
                  ) : null}

                  {canViewDiagnostics && review.source_reference?.source_id ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">{ui("Source record")}</div>
                      <p className="card__subtext">{recommendationLabel(review.source_reference.source_type, ui)} · {review.source_reference.source_id}</p>
                    </div>
                  ) : null}

                  {review.explainability_review?.primary_factors?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">{ui("Explainability factors")}</div>
                      <p className="card__subtext">{review.explainability_review.primary_factors.map(formatLabel).join(' · ')}</p>
                    </div>
                  ) : null}

                  {review.override_capture_guidance?.suggested_reason_categories?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">{ui("Override reason guidance")}</div>
                      <p className="card__subtext">
                        {review.override_capture_guidance.override_reason_required ? ui('Reason required: ') : ui('Reason optional: ')}
                        {review.override_capture_guidance.suggested_reason_categories.map((reason) => recommendationLabel(reason, ui)).join(', ')}
                      </p>
                    </div>
                  ) : null}

                  <div className="ai-review-page__lifecycle-panel">
                    <div className="card__label">{ui("Review status")}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <span style={badgeStyle}>{ui("Status:")} {isForecastReview && (lifecycle?.current_status || review.review_state) === 'approved_for_manual_action' ? ui('Approved for advisory use') : recommendationLabel(lifecycle?.current_status || review.review_state, ui)}</span>
                      <span style={badgeStyle}>{lifecycle?.persisted ? `${ui('Version')} ${formatLocalizedNumber(lifecycle.version || 1, locale)}` : ui('Not yet reviewed')}</span>
                      {lifecycle?.reviewer_role ? <span style={badgeStyle}>{ui("Reviewer:")} {recommendationLabel(lifecycle.reviewer_role, ui)}</span> : null}
                    </div>
                    <p className="card__subtext" style={{ marginTop: 8 }}>
                      {reviewLifecycleMeaning(lifecycle?.current_status || review.review_state, ui, review.source_reference?.source_type)}
                    </p>
                    {lifecycle?.current_status === 'escalated' ? (
                      <p className="card__subtext">
                        <strong>{ui('Assigned to')}</strong>: {escalationTargetLabel(lifecycle.escalation_target_role, ui)}
                        {lifecycle.escalation_due_at ? ` · ${ui('Due date')}: ${formatDateOnly(lifecycle.escalation_due_at, locale, ui)}` : ''}
                      </p>
                    ) : null}
                    {lifecycle?.reviewer_notes ? <p className="card__subtext" style={{ marginTop: 8 }}>{ui("Latest notes:")} {lifecycle.reviewer_notes}</p> : null}
                    {lifecycle?.override_reason ? <p className="card__subtext">{ui("Override reason:")} {lifecycle.override_reason}</p> : null}
                    {lifecycle?.execution_request_id ? (
                      <p className="card__subtext">
                        {ui('A linked Execution Request exists.')}
                        {lifecycle.execution_request_status ? ` · ${ui('Status:')} ${recommendationLabel(lifecycle.execution_request_status, ui)}` : ''}
                        {lifecycle.execution_request_execution_status ? ` · ${ui('Execution:')} ${recommendationLabel(lifecycle.execution_request_execution_status, ui)}` : ''}
                      </p>
                    ) : null}
                  </div>

                  {capabilities.canGovernDecisionIntelligence && sourceActionId && visibleDecisionOptions.length ? (
                    <div className="ai-review-page__decision-panel">
                      <div className="card__label ai-review-page__panel-title"><span className="ai-review-page__panel-icon"><TenantNavIcon path="/permissions" size={15} /></span>{ui("Review decision")}</div>
                      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 10 }}>
                        <label>
                          <span className="card__subtext">{ui("Decision")}</span>
                          <select
                            style={{ ...selectStyle, width: '100%', marginTop: 4 }}
                            value={selectedDecision}
                            onChange={(event) => updateReviewDecisionDraft(sourceActionId, { decision: event.target.value as ReviewDecision })}
                          >
                            {visibleDecisionOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {ui(option.value === 'escalated' && isEscalatedReview ? 'Update escalation' : isForecastReview && option.value === 'approved_for_manual_action' ? 'Approve for advisory use' : option.label)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="card__subtext">{ui("Reason category")}</span>
                          <select
                            style={{ ...selectStyle, width: '100%', marginTop: 4 }}
                            value={decisionDraft.reason_category}
                            onChange={(event) => updateReviewDecisionDraft(sourceActionId, { reason_category: event.target.value })}
                          >
                            <option value="">{ui("Select when required")}</option>
                            {REVIEW_REASON_OPTIONS.map((reason) => <option key={reason} value={reason}>{recommendationLabel(reason, ui)}</option>)}
                          </select>
                        </label>
                      </div>
                      <p className="card__subtext ai-review-page__decision-help" role="note" style={{ marginTop: 10 }}>
                        <strong>{ui('What this decision means:')}</strong> {reviewDecisionMeaning(selectedDecision, ui, review.source_reference?.source_type)}
                      </p>
                      {selectedDecision === 'escalated' ? (
                        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 10 }}>
                          <label>
                            <span className="card__subtext">{ui('Assigned to')}</span>
                            <select
                              style={{ ...selectStyle, width: '100%', marginTop: 4 }}
                              value={decisionDraft.escalation_target_role}
                              onChange={(event) => updateReviewDecisionDraft(sourceActionId, { escalation_target_role: event.target.value as '' | EscalationTargetRole })}
                            >
                              <option value="">{ui('Choose reviewer')}</option>
                              {ESCALATION_TARGET_OPTIONS.map((option) => <option key={option.value} value={option.value}>{ui(option.label)}</option>)}
                            </select>
                          </label>
                          <label>
                            <span className="card__subtext">{ui('Due date')}</span>
                            <input
                              type="date"
                              min={todayDateInputValue()}
                              style={{ ...selectStyle, width: '100%', marginTop: 4 }}
                              value={decisionDraft.escalation_due_at}
                              onChange={(event) => updateReviewDecisionDraft(sourceActionId, { escalation_due_at: event.target.value })}
                            />
                          </label>
                        </div>
                      ) : null}
                      <label style={{ display: 'block', marginTop: 10 }}>
                        <span className="card__subtext">{ui("Reviewer notes")}</span>
                        <textarea
                          style={{ width: '100%', minHeight: 74, marginTop: 4, padding: 8 }}
                          value={decisionDraft.reviewer_notes}
                          maxLength={2000}
                          onChange={(event) => updateReviewDecisionDraft(sourceActionId, { reviewer_notes: event.target.value })}
                          placeholder={ui("Record the evidence considered and why this decision is appropriate.")}
                        />
                      </label>
                      {decisionDraft.reason_category === 'business_policy_exception' ? (
                        <label style={{ display: 'block', marginTop: 10 }}>
                          <span className="card__subtext">{ui("Override reason")}</span>
                          <textarea
                            style={{ width: '100%', minHeight: 64, marginTop: 4, padding: 8 }}
                            value={decisionDraft.override_reason}
                            maxLength={2000}
                            onChange={(event) => updateReviewDecisionDraft(sourceActionId, { override_reason: event.target.value })}
                            placeholder={ui("Required for a business policy exception.")}
                          />
                        </label>
                      ) : null}
                      {decisionValidationMessage ? (
                        <p className="card__subtext ai-review-page__decision-help" role="note">
                          {decisionValidationMessage}
                        </p>
                      ) : null}
                      <button
                        className="button button--primary"
                        type="button"
                        style={{ marginTop: 10 }}
                        disabled={reviewDecisionMutation.isPending || Boolean(decisionValidationMessage)}
                        data-skip-global-action-feedback="true"
                        onClick={() => submitReviewDecision(review)}
                      >
                        <TenantNavIcon path="/intelligence-review" size={16} />{reviewDecisionMutation.isPending ? ui('Recording…') : ui('Record review decision')}
                      </button>
                    </div>
                  ) : null}

                  {historyIsSelected ? (
                    <div className="ai-review-page__history-panel">
                      <div className="card__label ai-review-page__panel-title"><span className="ai-review-page__panel-icon"><TenantNavIcon path="/audit" size={15} /></span>{ui("Review history")}</div>
                      {reviewHistoryQuery.isLoading ? <p className="card__subtext">{ui("Loading review history…")}</p> : null}
                      {reviewHistoryQuery.error ? <p className="form-error">{reviewHistoryQuery.error instanceof Error ? reviewHistoryQuery.error.message : ui('Unable to load review history.')}</p> : null}
                      {!reviewHistoryQuery.isLoading && !reviewHistoryQuery.error && !(reviewHistoryQuery.data?.events?.length) ? <p className="card__subtext">{ui("No persisted review events yet.")}</p> : null}
                      {(reviewHistoryQuery.data?.events || []).map((event) => (
                        <div key={event.id || `${event.event_type}-${event.created_at}`} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color, #d9dde5)' }}>
                          <strong>{recommendationLabel(event.event_type, ui)}</strong>
                          <div className="card__subtext">{recommendationLabel(event.from_status, ui)} → {recommendationLabel(event.to_status, ui)} · {formatDateTime(event.created_at, locale, ui)}</div>
                          <div className="card__subtext">{ui('Reviewed by')} {event.actor_name || (event.actor_role ? recommendationLabel(event.actor_role, ui) : event.actor_email || ui('Tenant user'))}</div>
                          {event.reason_category ? <div className="card__subtext">{ui("Reason:")} {recommendationLabel(event.reason_category, ui)}</div> : null}
                          {event.reviewer_notes ? <div className="card__subtext">{ui("Notes:")} {event.reviewer_notes}</div> : null}
                          {event.metadata?.escalation_target_role ? (
                            <div className="card__subtext">
                              {ui('Escalated to:')} {escalationTargetLabel(event.metadata.escalation_target_role, ui)}
                              {event.metadata.escalation_due_at ? ` · ${ui('Due:')} ${formatDateOnly(event.metadata.escalation_due_at, locale, ui)}` : ''}
                            </div>
                          ) : null}
                          {event.metadata?.previous_escalation?.target_role ? (
                            <div className="card__subtext">{ui('Previous')} {ui('Assigned to')}: {escalationTargetLabel(event.metadata.previous_escalation.target_role, ui)}</div>
                          ) : null}
                          {event.metadata?.resolved_escalation?.target_role ? (
                            <div className="card__subtext">{ui('Escalation resolved for:')} {escalationTargetLabel(event.metadata.resolved_escalation.target_role, ui)}</div>
                          ) : null}
                          {event.execution_request_id ? (
                            <div className="card__subtext">
                              {capabilities.canViewExecutionRequests
                                ? <Link to={`/execution-requests?request_id=${encodeURIComponent(event.execution_request_id)}`}>{ui('Open linked Execution Request')}</Link>
                                : ui('A linked Execution Request exists.')}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="ai-review-page__review-actions">
                    {sourcePath ? <Link className="button button--secondary" to={sourcePath}><TenantNavIcon path={sourcePath} size={16} />{ui("Open source page")}</Link> : null}
                    <Link className="button button--secondary" to="/action-center"><TenantNavIcon path="/action-center" size={16} />{ui("Open action center")}</Link>
                    {sourceActionId ? (
                      <button
                        className="button button--secondary"
                        type="button"
                        onClick={() => setSelectedHistorySourceActionId(historyIsSelected ? null : sourceActionId)}
                      >
                        <TenantNavIcon path="/audit" size={16} />{historyIsSelected ? ui('Hide review history') : ui('View review history')}
                      </button>
                    ) : null}
                    {capabilities.canGovernDecisionIntelligence
                      && capabilities.canCreateExecutionRequests
                      && lifecycle?.current_status === 'approved_for_manual_action'
                      && review.source_reference?.source_type !== 'probabilistic_forecast_model'
                      && sourceActionId ? (
                        <button
                          className="button button--primary"
                          type="button"
                          disabled={executionRequestDraftMutation.isPending}
                          data-skip-global-action-feedback="true"
                          onClick={() => executionRequestDraftMutation.mutate(sourceActionId)}
                        >
                          <TenantNavIcon path="/execution-requests" size={16} />{executionRequestDraftMutation.isPending ? ui('Creating draft…') : ui('Create Execution Request draft')}
                        </button>
                      ) : null}
                    {capabilities.canViewExecutionRequests && lifecycle?.execution_request_id ? <Link className="button button--secondary" to={`/execution-requests?request_id=${encodeURIComponent(lifecycle.execution_request_id)}`} data-skip-global-action-feedback="true"><TenantNavIcon path="/execution-requests" size={16} />{ui("Open linked Execution Request")}</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
        </>
      ) : null}

      {activeView === 'readiness' ? (
        <>
      <section className="section">
        <div className="section__title">{ui("Production enablement manifest")}</div>
        <div className="card">
          {enablementManifestQuery.isLoading ? (
            <p className="card__subtext">{ui("Loading intelligence and AI-assisted production enablement manifest…")}</p>
          ) : enablementManifestQuery.error ? (
            <p className="form-error">
              {enablementManifestQuery.error instanceof ApiError
                ? enablementManifestQuery.error.message
                : ui("Unable to load intelligence and AI-assisted production enablement manifest.")}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>{ui("Manifest:")} {readinessCoreLabel(enablementManifest?.manifest_status, ui)}</span>
                <span style={badgeStyle}>{ui("Eligible:")} {formatLocalizedNumber(numberValue(enablementManifest?.totals?.eligible_for_controlled_enablement), locale)}</span>
                <span style={badgeStyle}>{ui("Blocked/waiver:")} {formatLocalizedNumber(numberValue(enablementManifest?.totals?.blocked_or_requires_governance_waiver), locale)}</span>
                <span style={badgeStyle}>{ui("Pending:")} {formatLocalizedNumber(numberValue(enablementManifest?.totals?.not_enabled_pending_hardening), locale)}</span>
              </div>
              <p className="card__subtext" style={{ marginTop: 12 }}>
                {enablementManifest?.global_enablement_rule ? localizedReadinessSystemText(enablementManifest.global_enablement_rule, ui) : ui("Production enablement is blocked until evidence, signoff, validation, and governance rules are satisfied.")}
              </p>
              {enablementSequence.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Enablement sequence")}</div>
                  <ol style={{ marginBottom: 0 }}>
                    {enablementSequence.map((item) => (
                      <li key={item}>{localizedReadinessSystemText(item, ui)}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {enablementBlockedFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Blocked or waiver-required features")}</div>
                  <ol style={{ marginBottom: 0 }}>
                    {enablementBlockedFeatures.slice(0, 10).map((feature) => (
                      <li key={feature.feature_key}>
                        <strong>{feature.feature_label ? localizedReadinessSystemText(feature.feature_label, ui) : formatLabel(feature.feature_key)}</strong>: {readinessCoreLabel(feature.enablement_state, ui)}
                        <div className="card__subtext">
                          {readinessCoreLabel(feature.production_priority, ui)} · {ui("Release blockers")} {formatLocalizedNumber(numberValue(feature.release_blocker_count), locale)} · {ui("Evidence gaps:")} {formatLocalizedNumber(numberValue(feature.required_evidence_gap_count), locale)} · {ui("Signoff:")} {readinessCoreLabel(feature.signoff_status, ui)} · {ui("Validation:")} {readinessCoreLabel(feature.validation_status, ui)}
                        </div>
                        <div className="card__subtext">{localizedReadinessSystemText(feature.operator_enablement_note, ui)}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {enablementEligibleFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Eligible for controlled final testing")}</div>
                  <ul style={{ marginBottom: 0 }}>
                    {enablementEligibleFeatures.slice(0, 10).map((feature) => (
                      <li key={feature.feature_key}>{feature.feature_label ? localizedReadinessSystemText(feature.feature_label, ui) : formatLabel(feature.feature_key)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">{ui("Production monitoring contract")}</div>
        <div className="card">
          {monitoringContractQuery.isLoading ? (
            <p className="card__subtext">{ui("Loading intelligence and AI-assisted production monitoring contract…")}</p>
          ) : monitoringContractQuery.error ? (
            <p className="form-error">
              {monitoringContractQuery.error instanceof ApiError
                ? monitoringContractQuery.error.message
                : ui("Unable to load intelligence and AI-assisted production monitoring contract.")}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>{ui("Contract:")} {readinessCoreLabel(monitoringContract?.contract_status, ui)}</span>
                <span style={badgeStyle}>{ui("Monitored:")} {formatLocalizedNumber(numberValue(monitoringContract?.totals?.monitored_feature_count), locale)}</span>
                <span style={badgeStyle}>{ui("Blocked:")} {formatLocalizedNumber(numberValue(monitoringContract?.totals?.monitor_blockers_before_enablement), locale)}</span>
                <span style={badgeStyle}>{ui("Controlled:")} {formatLocalizedNumber(numberValue(monitoringContract?.totals?.monitor_after_controlled_enablement), locale)}</span>
              </div>
              <p className="card__subtext" style={{ marginTop: 12 }}>
                {monitoringContract?.safety_rule ? localizedReadinessSystemText(monitoringContract.safety_rule, ui) : ui("Monitoring is read-only and does not execute intelligence and AI-assisted actions.")}
              </p>
              {monitoringChecks.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Global monitoring checks")}</div>
                  <ul style={{ marginBottom: 0 }}>
                    {monitoringChecks.slice(0, 6).map((check) => (
                      <li key={check}>{localizedReadinessSystemText(check, ui)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {monitoringBlockedFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Blocked monitoring items")}</div>
                  <ol style={{ marginBottom: 0 }}>
                    {monitoringBlockedFeatures.slice(0, 8).map((feature) => (
                      <li key={feature.feature_key}>
                        <strong>{feature.feature_label ? localizedReadinessSystemText(feature.feature_label, ui) : formatLabel(feature.feature_key)}</strong>: {readinessCoreLabel(feature.monitoring_state, ui)}
                        <div className="card__subtext">
                          {ui("Cadence")} {readinessCoreLabel(feature.monitoring_cadence, ui)} · {ui("Blockers:")} {formatLocalizedNumber(numberValue(feature.release_blocker_count), locale)} · {ui("Evidence gaps:")} {formatLocalizedNumber(numberValue(feature.required_evidence_gap_count), locale)} · {ui("Validation:")} {readinessCoreLabel(feature.validation_status, ui)}
                        </div>
                        <div className="card__subtext">{localizedReadinessSystemText(feature.operator_response, ui)}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              {monitoringControlledFeatures.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Controlled enablement monitoring")}</div>
                  <ul style={{ marginBottom: 0 }}>
                    {monitoringControlledFeatures.slice(0, 8).map((feature) => (
                      <li key={feature.feature_key}>{feature.feature_label ? localizedReadinessSystemText(feature.feature_label, ui) : formatLabel(feature.feature_key)} · {readinessCoreLabel(feature.monitoring_cadence, ui)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {monitoringEscalationRules.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="card__label">{ui("Escalation rules")}</div>
                  <ul style={{ marginBottom: 0 }}>
                    {monitoringEscalationRules.slice(0, 4).map((rule) => (
                      <li key={rule}>{localizedReadinessSystemText(rule, ui)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">{ui("Governance and safety")}</div>
        <div className="card-grid" style={gridStyle}>
          <div className="card">
            <div className="card__label">{ui("Confidence guidance")}</div>
            <p className="card__subtext">{localizedIntelligenceReviewSystemText(guidance.confidence_guidance_key, guidance.confidence_guidance, 'Confidence is advisory only and never authorizes automatic execution.', ui)}</p>
          </div>
          <div className="card">
            <div className="card__label">{ui("Override guidance")}</div>
            <p className="card__subtext">{localizedIntelligenceReviewSystemText(guidance.override_guidance_key, guidance.override_guidance, 'Overrides must be captured in governed source workflows.', ui)}</p>
          </div>
          <div className="card">
            <div className="card__label">{ui("Approval guidance")}</div>
            <p className="card__subtext">{localizedIntelligenceReviewSystemText(guidance.approval_guidance_key, guidance.approval_guidance, 'Approvals must be completed in existing governed workflows.', ui)}</p>
          </div>
          <div className="card">
            <div className="card__label">{ui("Safety contract")}</div>
            <p className="card__subtext">
              {safetyEntries.length
                ? safetyEntries.map(([key]) => ui(formatLabel(key))).join(' · ')
                : ui("No mutation, execution, approval, or override is performed by this endpoint.")}
            </p>
          </div>
        </div>
      </section>
        </>
      ) : null}
    </div>
  );
}
