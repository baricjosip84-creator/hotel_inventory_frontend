import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
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
    preview_summary?: string;
    preview_metrics?: Record<string, number | string | null>;
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
    execution_request_id?: string | null;
    created_at?: string | null;
  }>;
  execution_request?: { id?: string; status?: string; request_type?: string };
};

type ReviewDecisionDraft = {
  decision: ReviewDecision;
  reason_category: string;
  reviewer_notes: string;
  override_reason: string;
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

const defaultReviewDecisionDraft: ReviewDecisionDraft = {
  decision: 'acknowledged',
  reason_category: '',
  reviewer_notes: '',
  override_reason: ''
};

const HUMAN_AI_REVIEW_QUERY_KEY = 'human-in-loop-ai-review';
const HUMAN_AI_REVIEW_HISTORY_QUERY_KEY = 'human-in-loop-ai-review-history';

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

function formatPercent(value?: number | null): string {
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

function reviewDecisionValidationMessage(decision: ReviewDecision | undefined, draft: ReviewDecisionDraft): string | null {
  if (!decision) {
    return 'No review decision is currently available for this lifecycle state.';
  }

  const reasonRequired = !['acknowledged', 'reopened'].includes(decision);
  if (reasonRequired && !draft.reason_category) {
    return 'Select a reason category before recording this decision.';
  }

  if (draft.reason_category === 'other' && !draft.reviewer_notes.trim()) {
    return 'Add reviewer notes when the reason category is Other.';
  }

  if (decision === 'approved_for_manual_action'
    && draft.reason_category === 'business_policy_exception'
    && !draft.override_reason.trim()) {
    return 'Add an override reason for a business policy exception.';
  }

  return null;
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

  const query = params.toString();
  return query ? `${sourceSurface}?${query}` : sourceSurface;
}


async function fetchIntelligenceProductionReadiness(): Promise<IntelligenceProductionReadinessResponse> {
  return apiRequest<IntelligenceProductionReadinessResponse>('/intelligence-readiness/production-readiness-summary');
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
  const queryClient = useQueryClient();
  const capabilities = getRoleCapabilities();
  const [searchParams] = useSearchParams();
  const requestedSourceActionId = searchParams.get('source_action_id');
  const [aiOperationDomain, setAiOperationDomain] = useState<'all' | AIOperationDomain>('all');
  const [reviewState, setReviewState] = useState<'all' | ReviewState>('all');
  const [urgency, setUrgency] = useState<'all' | Urgency>('all');
  const [selectedReadinessFeatureKey, setSelectedReadinessFeatureKey] = useState<string>('reorder_recommendations');
  const [selectedHistorySourceActionId, setSelectedHistorySourceActionId] = useState<string | null>(requestedSourceActionId);
  const [reviewDecisionDrafts, setReviewDecisionDrafts] = useState<Record<string, ReviewDecisionDraft>>({});
  const [reviewActionMessage, setReviewActionMessage] = useState<string | null>(null);
  const lastAutoScrolledSourceActionId = useRef<string | null>(null);

  const reviewQuery = useQuery({
    queryKey: ['human-in-loop-ai-review', aiOperationDomain, reviewState, urgency],
    queryFn: () => fetchHumanAIReviewSummary(aiOperationDomain, reviewState, urgency)
  });

  const reviewHistoryQuery = useQuery({
    queryKey: ['human-in-loop-ai-review-history', selectedHistorySourceActionId],
    queryFn: () => fetchAIReviewHistory(selectedHistorySourceActionId || ''),
    enabled: Boolean(selectedHistorySourceActionId)
  });

  const reviewDecisionMutation = useMutation({
    mutationFn: ({ sourceActionId, body }: { sourceActionId: string; body: Record<string, unknown> }) => recordAIReviewDecision(sourceActionId, body),
    onSuccess: async (result) => {
      setReviewActionMessage('AI review decision recorded and audit history updated.');
      const sourceActionId = result.source?.source_action_id || selectedHistorySourceActionId;
      if (sourceActionId) setSelectedHistorySourceActionId(sourceActionId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_HISTORY_QUERY_KEY] })
      ]);
    },
    onError: (error) => setReviewActionMessage(error instanceof Error ? error.message : 'Unable to record AI review decision.')
  });

  const executionRequestDraftMutation = useMutation({
    mutationFn: (sourceActionId: string) => createAIReviewExecutionRequestDraft(sourceActionId),
    onSuccess: async (result) => {
      setReviewActionMessage('Draft Execution Request created from the approved AI review. No operational action was executed.');
      const sourceActionId = result.source?.source_action_id || selectedHistorySourceActionId;
      if (sourceActionId) setSelectedHistorySourceActionId(sourceActionId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: [HUMAN_AI_REVIEW_HISTORY_QUERY_KEY] }),
        queryClient.invalidateQueries({ queryKey: ['execution-requests'] })
      ]);
    },
    onError: (error) => setReviewActionMessage(error instanceof Error ? error.message : 'Unable to create the Execution Request draft.')
  });

  const readinessQuery = useQuery({
    queryKey: ['intelligence-production-readiness-summary'],
    queryFn: fetchIntelligenceProductionReadiness
  });

  const readinessAuditPackQuery = useQuery({
    queryKey: ['intelligence-production-readiness-audit-pack'],
    queryFn: fetchIntelligenceProductionReadinessAuditPack
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

  const allReviewAndReadinessQueries = [
    reviewQuery,
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
    featureDetailQuery,
    ...(selectedHistorySourceActionId ? [reviewHistoryQuery] : [])
  ];

  const isRefreshingAnyAIReviewData = allReviewAndReadinessQueries.some((query) => query.isFetching);

  const refreshAllAIReviewData = () => {
    void Promise.all(allReviewAndReadinessQueries.map((query) => query.refetch()));
  };


  const response = reviewQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const reviews = useMemo(() => response?.reviews || [], [response?.reviews]);

  useEffect(() => {
    if (!requestedSourceActionId || reviewQuery.isLoading || lastAutoScrolledSourceActionId.current === requestedSourceActionId) {
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
  }, [requestedSourceActionId, reviewQuery.isLoading, reviews]);
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  const readiness = readinessQuery.data;
  const readinessSummary = readiness?.summary || {};
  const readinessFeatures = readiness?.features || [];
  const productionBacklog = readiness?.production_backlog || [];
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
        expected_version: review.lifecycle?.version || undefined
      }
    });
  };

  return (
    <div className="ai-review-page">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={toolbarStyle}>
          <a className="button button--primary" href="#ai-review-queue" data-skip-global-action-feedback="true">Go to review queue</a>
          <button
            className="button button--secondary"
            type="button"
            onClick={refreshAllAIReviewData}
            disabled={isRefreshingAnyAIReviewData}
          >
            {isRefreshingAnyAIReviewData ? 'Refreshing AI review…' : 'Refresh AI review'}
          </button>
          <Link className="button button--secondary" to="/action-center">Open action center</Link>
          <Link className="button button--secondary" to="/workflow-composer">Open workflow composer</Link>
        </div>
        <p className="card__subtext" style={{ marginTop: 10 }}>
          Refreshes the human review queue and all AI/intelligence readiness panels without executing recommendations, approvals, overrides, inventory mutations, model training, or external AI calls.
        </p>
      </div>

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


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="capability_inventory">
                <div className="card__label">Unified AI capability inventory</div>
                <p className="card__subtext">
                  Platform-wide inventory of the implemented AI/intelligence capabilities registered by the backend readiness service. This is read-only and does not execute, train, or call external AI.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Tracked capabilities</div>
                    <div className="card__value">{numberValue(capabilityInventory?.total_capabilities)}</div>
                    <div className="card__subtext">Implemented capabilities across registered AI/intelligence features.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Commercial candidates</div>
                    <div className="card__value">{numberValue(capabilityInventory?.commercial_candidate_capabilities)}</div>
                    <div className="card__subtext">Capabilities with enough readiness and tenant evidence to be treated as candidate commercial controls.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Need evidence/hardening</div>
                    <div className="card__value">{numberValue(capabilityInventory?.capabilities_needing_evidence_or_hardening)}</div>
                    <div className="card__subtext">Capabilities still blocked by evidence, regression, monitoring, or acceptance gaps.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Execution mode</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(capabilityInventory?.execution_mode)}</div>
                    <div className="card__subtext">Inventory-only control surface; no autonomous AI execution.</div>
                  </div>
                </div>
                {capabilityInventory?.high_priority_capability_gaps?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {capabilityInventory.high_priority_capability_gaps.slice(0, 6).map((gap) => (
                      <article className="card" key={gap.capability_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{formatLabel(gap.production_priority)}</span>
                          <span style={badgeStyle}>{formatLabel(gap.gap_type)}</span>
                          <span style={badgeStyle}>{numberValue(gap.readiness_score)}% ready</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{gap.capability_label}</h3>
                        <p className="card__subtext">{gap.feature_label}</p>
                        <p className="card__subtext">{gap.required_resolution}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No high-priority capability inventory gaps reported.</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="risk_scoring">
                <div className="card__label">Unified AI risk scoring</div>
                <p className="card__subtext">
                  Cross-module risk scoring for registered AI/intelligence features using existing readiness, tenant evidence, priority, production status, and open hardening gaps. This is read-only and does not execute, train, or call external AI.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Average AI risk</div>
                    <div className="card__value">{numberValue(aiRiskScoring?.average_ai_risk_score)}</div>
                    <div className="card__subtext">Average risk score across registered AI/intelligence features.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Highest AI risk</div>
                    <div className="card__value">{numberValue(aiRiskScoring?.highest_ai_risk_score)}</div>
                    <div className="card__subtext">Highest single feature risk score currently reported by the backend.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Critical/high risk</div>
                    <div className="card__value">{numberValue(aiRiskScoring?.critical_or_high_risk_feature_count)}</div>
                    <div className="card__subtext">Features requiring governance review before customer-facing enablement.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Risk mode</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRiskScoring?.execution_mode)}</div>
                    <div className="card__subtext">Risk scoring only; no autonomous AI action or model training.</div>
                  </div>
                </div>
                {aiRiskScoring?.highest_risk_features?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiRiskScoring.highest_risk_features.slice(0, 6).map((feature) => (
                      <article className="card" key={feature.feature_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{formatLabel(feature.ai_risk_level)}</span>
                          <span style={badgeStyle}>{numberValue(feature.ai_risk_score)} risk</span>
                          <span style={badgeStyle}>{formatLabel(feature.primary_risk_driver)}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{feature.feature_label}</h3>
                        <p className="card__subtext">{formatLabel(feature.production_priority)} · {numberValue(feature.readiness_score)}% ready · {numberValue(feature.tenant_evidence_rows)} tenant evidence rows</p>
                        <p className="card__subtext">{feature.required_control}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No AI risk-scoring rows reported.</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="decision_lineage">
                <div className="card__label">Unified AI decision lineage</div>
                <p className="card__subtext">
                  Cross-module lineage trace showing whether each registered AI/intelligence feature has a path from tenant evidence tables through backend endpoints, frontend operator surfaces, and governance review. This is read-only and does not execute, train, or call external AI.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Average lineage</div>
                    <div className="card__value">{numberValue(aiDecisionLineage?.average_lineage_completeness_score)}%</div>
                    <div className="card__subtext">Average completeness of evidence → endpoint → operator-surface traceability.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Lineage ready</div>
                    <div className="card__value">{numberValue(aiDecisionLineage?.lineage_ready_feature_count)}</div>
                    <div className="card__subtext">Features with enough lineage to enter commercial governance review.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Lineage blocked</div>
                    <div className="card__value">{numberValue(aiDecisionLineage?.lineage_blocked_feature_count)}</div>
                    <div className="card__subtext">Features missing required traceability links before enablement.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Lineage mode</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiDecisionLineage?.execution_mode)}</div>
                    <div className="card__subtext">Traceability only; no autonomous AI action or model training.</div>
                  </div>
                </div>
                {aiDecisionLineage?.critical_lineage_gaps?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiDecisionLineage.critical_lineage_gaps.slice(0, 6).map((feature) => (
                      <article className="card" key={feature.feature_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{formatLabel(feature.production_priority)}</span>
                          <span style={badgeStyle}>{formatLabel(feature.lineage_state)}</span>
                          <span style={badgeStyle}>{numberValue(feature.lineage_completeness_score)}% lineage</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{feature.feature_label}</h3>
                        <p className="card__subtext">
                          {numberValue(feature.evidence_table_count)} evidence tables · {numberValue(feature.endpoint_count)} endpoints · {numberValue(feature.frontend_surface_count)} frontend surfaces · {numberValue(feature.tenant_evidence_rows)} tenant rows
                        </p>
                        {feature.missing_lineage_links?.length ? (
                          <p className="card__subtext">Missing: {feature.missing_lineage_links.map(formatLabel).join(' · ')}</p>
                        ) : null}
                        <p className="card__subtext">{feature.required_lineage_control}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No critical/high AI lineage gaps reported.</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="rollback_orchestration">
                <div className="card__label">Unified AI rollback orchestration</div>
                <p className="card__subtext">
                  Cross-module rollback planning for registered AI/intelligence features. It combines risk scoring and decision lineage to show whether each AI surface has a safe manual rollback path. This is read-only and does not perform rollback, mutate state, train models, or call external AI.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Average rollback score</div>
                    <div className="card__value">{numberValue(aiRollbackOrchestration?.average_rollback_score)}%</div>
                    <div className="card__subtext">Average readiness of rollback controls across registered AI/intelligence features.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Rollback ready</div>
                    <div className="card__value">{numberValue(aiRollbackOrchestration?.rollback_ready_feature_count)}</div>
                    <div className="card__subtext">Features whose rollback path is ready for commercial governance review.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Rollback blocked</div>
                    <div className="card__value">{numberValue(aiRollbackOrchestration?.rollback_blocked_feature_count)}</div>
                    <div className="card__subtext">Features missing rollback controls before customer-facing enablement.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Rollback mode</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRollbackOrchestration?.execution_mode)}</div>
                    <div className="card__subtext">Planning only; no autonomous rollback or source-system mutation.</div>
                  </div>
                </div>
                {aiRollbackOrchestration?.critical_rollback_blockers?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiRollbackOrchestration.critical_rollback_blockers.slice(0, 6).map((feature) => (
                      <article className="card" key={feature.feature_key}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>{formatLabel(feature.production_priority)}</span>
                          <span style={badgeStyle}>{formatLabel(feature.rollback_state)}</span>
                          <span style={badgeStyle}>{numberValue(feature.rollback_score)}% rollback</span>
                          <span style={badgeStyle}>{numberValue(feature.ai_risk_score)} risk</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{feature.feature_label}</h3>
                        <p className="card__subtext">
                          {numberValue(feature.lineage_completeness_score)}% lineage · {numberValue(feature.readiness_score)}% ready · {formatLabel(feature.ai_risk_level)}
                        </p>
                        {feature.rollback_blockers?.length ? (
                          <p className="card__subtext">Blockers: {feature.rollback_blockers.map(formatLabel).join(' · ')}</p>
                        ) : null}
                        <p className="card__subtext">{formatLabel(feature.rollback_decision)}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No critical/high AI rollback blockers reported.</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="maturity_self_audit">
                <div className="card__label">Unified AI maturity self-audit</div>
                <p className="card__subtext">
                  Platform-wide commercial-grade AI readiness audit across the existing registered intelligence surfaces. It combines capability inventory, risk scoring, decision lineage, rollback orchestration, production signoff, monitoring, and release controls. This is read-only and does not train, execute, mutate, or call external AI.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Maturity score</div>
                    <div className="card__value">{numberValue(aiMaturitySelfAudit?.maturity_score)}%</div>
                    <div className="card__subtext">Weighted maturity score from backend governance evidence.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Maturity level</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiMaturitySelfAudit?.maturity_level)}</div>
                    <div className="card__subtext">Backend classification for commercial AI readiness.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blockers / watch</div>
                    <div className="card__value">{numberValue(aiMaturitySelfAudit?.blocker_check_count)} / {numberValue(aiMaturitySelfAudit?.watch_check_count)}</div>
                    <div className="card__subtext">Open maturity checks requiring closure or governance review.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Commercial-grade state</div>
                    <div className="card__value" style={{ fontSize: 18 }}>
                      {aiMaturitySelfAudit?.commercial_grade_without_waiver ? 'Ready' : aiMaturitySelfAudit?.commercial_grade_with_governance_waiver ? 'Waiver review' : 'Not yet'}
                    </div>
                    <div className="card__subtext">Self-audit status only; it does not automatically certify production release.</div>
                  </div>
                </div>
                {aiMaturitySelfAudit?.next_commercial_grade_actions?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiMaturitySelfAudit.next_commercial_grade_actions.slice(0, 6).map((action) => (
                      <article className="card" key={`${action.sequence}-${action.check_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{numberValue(action.sequence)}</span>
                          <span style={badgeStyle}>{formatLabel(action.current_status)}</span>
                          <span style={badgeStyle}>{numberValue(action.current_score)} score</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{action.check_label}</h3>
                        <p className="card__subtext">{action.required_resolution}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No maturity self-audit blockers or watch actions reported.</p>
                )}
              </div>




              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="governance_dashboard">
                <div className="card__label">Unified AI governance dashboard</div>
                <p className="card__subtext">
                  Final read-only governance rollup for commercial AI enablement. It consolidates maturity self-audit, risk scoring, decision lineage, rollback orchestration, monitoring, signoff, and release-board status without executing AI actions or certifying release automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Governance readiness</div>
                    <div className="card__value">{numberValue(aiGovernanceDashboard?.governance_readiness_score)}%</div>
                    <div className="card__subtext">Weighted readiness score across the unified AI governance controls.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Governance state</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiGovernanceDashboard?.governance_state)}</div>
                    <div className="card__subtext">Backend decision posture for commercial AI enablement review.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocker / watch sources</div>
                    <div className="card__value">{numberValue(aiGovernanceDashboard?.blocker_source_count)} / {numberValue(aiGovernanceDashboard?.watch_source_count)}</div>
                    <div className="card__subtext">Governance source groups still blocking or requiring waiver/final review.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Commercial enablement</div>
                    <div className="card__value" style={{ fontSize: 18 }}>
                      {aiGovernanceDashboard?.commercial_enablement_allowed_without_waiver ? 'Allowed' : aiGovernanceDashboard?.commercial_enablement_requires_waiver ? 'Waiver review' : 'Blocked'}
                    </div>
                    <div className="card__subtext">Read-only governance recommendation; it does not perform release or certify commercial grade automatically.</div>
                  </div>
                </div>
                {aiGovernanceDashboard?.next_governance_actions?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiGovernanceDashboard.next_governance_actions.slice(0, 6).map((action) => (
                      <article className="card" key={`${action.sequence}-${action.source_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{numberValue(action.sequence)}</span>
                          <span style={badgeStyle}>{formatLabel(action.current_severity)}</span>
                          <span style={badgeStyle}>{numberValue(action.blocker_count)} blockers</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{action.source_label}</h3>
                        <p className="card__subtext">{action.required_resolution}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No unified AI governance dashboard actions reported.</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="commercial_release_gate">
                <div className="card__label">Unified AI commercial release gate</div>
                <p className="card__subtext">
                  Final read-only gate before any commercial AI enablement decision. It does not release, execute, train, or mutate anything; it consolidates governance, maturity, risk, release-board, monitoring, and signoff controls into an operator-controlled release decision.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Release gate state</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiCommercialReleaseGate?.release_gate_state)}</div>
                    <div className="card__subtext">Final commercial AI gate state from backend governance controls.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Release gate score</div>
                    <div className="card__value">{numberValue(aiCommercialReleaseGate?.release_gate_score)}%</div>
                    <div className="card__subtext">Weighted readiness across release-critical AI controls.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocker / watch checks</div>
                    <div className="card__value">{numberValue(aiCommercialReleaseGate?.blocker_check_count)} / {numberValue(aiCommercialReleaseGate?.watch_check_count)}</div>
                    <div className="card__subtext">Open gate checks before commercial AI enablement.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Automated release allowed</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiCommercialReleaseGate?.final_release_policy?.automated_release_allowed ? 'Yes' : 'No'}</div>
                    <div className="card__subtext">Must remain no; release is human/operator controlled.</div>
                  </div>
                </div>
                {aiCommercialReleaseGate?.operator_release_actions?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiCommercialReleaseGate.operator_release_actions.slice(0, 6).map((action) => (
                      <article className="card" key={`${action.sequence}-${action.check_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{numberValue(action.sequence)}</span>
                          <span style={badgeStyle}>{formatLabel(action.current_status)}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{action.check_label}</h3>
                        <p className="card__subtext">{action.required_resolution}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No commercial AI release-gate actions reported.</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="commercial_release_evidence_dossier">
                <div className="card__label">Unified AI commercial release evidence dossier</div>
                <p className="card__subtext">
                  Read-only release evidence dossier that gathers the existing AI governance controls into one operator review packet. It does not perform release, mutate data, train models, or call external AI.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Dossier state</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiCommercialReleaseEvidenceDossier?.dossier_state)}</div>
                    <div className="card__subtext">Current release-evidence state from backend governance controls.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Evidence score</div>
                    <div className="card__value">{numberValue(aiCommercialReleaseEvidenceDossier?.evidence_score)}%</div>
                    <div className="card__subtext">Evidence completeness across release-critical AI controls.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocker / watch checks</div>
                    <div className="card__value">{numberValue(aiCommercialReleaseEvidenceDossier?.blocker_check_count)} / {numberValue(aiCommercialReleaseEvidenceDossier?.watch_check_count)}</div>
                    <div className="card__subtext">Open evidence checks before operator release review.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Automated release allowed</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiCommercialReleaseEvidenceDossier?.operator_dossier_policy?.automated_release_allowed ? 'Yes' : 'No'}</div>
                    <div className="card__subtext">Must remain no; the dossier is evidence-only and human-controlled.</div>
                  </div>
                </div>
                {aiCommercialReleaseEvidenceDossier?.required_release_artifacts?.length ? (
                  <div style={{ ...reviewListStyle, marginTop: 14 }}>
                    {aiCommercialReleaseEvidenceDossier.required_release_artifacts.slice(0, 8).map((artifact) => (
                      <article className="card" key={`${artifact.sequence}-${artifact.artifact_key}`}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                          <span style={badgeStyle}>#{numberValue(artifact.sequence)}</span>
                          <span style={badgeStyle}>{formatLabel(artifact.current_status)}</span>
                          <span style={badgeStyle}>{formatLabel(artifact.evidence_source)}</span>
                        </div>
                        <h3 style={{ marginTop: 0 }}>{artifact.artifact_label}</h3>
                        <p className="card__subtext">{artifact.required_artifact}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No release evidence artifacts reported.</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="route_exposure_audit">
                <div className="card__label">Unified AI route exposure audit</div>
                <p className="card__subtext">
                  Read-only route/controller/frontend-query exposure audit for AI readiness governance endpoints. It verifies the operator surface is backed by registered backend routes, controller exports, frontend query keys, and permission expectations before more AI governance keys are added.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Route contract status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRouteExposureAudit?.route_contract_status)}</div>
                    <div className="card__subtext">Backend route exposure audit status.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Expected routes</div>
                    <div className="card__value">{numberValue(aiRouteExposureAudit?.expected_route_count)}</div>
                    <div className="card__subtext">Registered AI readiness routes that require controller/frontend alignment.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Frontend query status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRouteExposureAudit?.frontend_query_contract_status)}</div>
                    <div className="card__subtext">Registered frontend query-key uniqueness and alignment status.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Query keys</div>
                    <div className="card__value">{numberValue(aiRouteExposureAudit?.unique_frontend_query_key_count)} / {numberValue(aiRouteExposureAudit?.expected_frontend_query_key_count)}</div>
                    <div className="card__subtext">Unique frontend query keys registered in the route exposure contract.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Frontend API path status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRouteExposureAudit?.frontend_api_path_contract_status)}</div>
                    <div className="card__subtext">Frontend fetch paths must stay aligned to {aiRouteExposureAudit?.frontend_api_base_path || '/intelligence-readiness'}.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Required permission</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRouteExposureAudit?.protected_by_permission)}</div>
                    <div className="card__subtext">All AI readiness governance routes remain read-gated.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Unpermissioned routes allowed</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiRouteExposureAudit?.route_change_control_policy?.unpermissioned_ai_readiness_routes_allowed ? 'Yes' : 'No'}</div>
                    <div className="card__subtext">Must remain no for commercial AI governance surfaces.</div>
                  </div>
                </div>
                {aiRouteExposureAudit?.route_rows?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">Registered route exposure rows</div>
                    <ul style={{ marginBottom: 0 }}>
                      {aiRouteExposureAudit.route_rows.slice(0, 10).map((row) => (
                        <li key={`${row.sequence}-${row.route_path}`}>
                          <strong>{row.route_path}</strong>: {row.controller_export} · {row.frontend_query_key} · {row.frontend_api_path || '—'} · {row.frontend_api_path_aligned ? 'API path aligned' : 'API path drift'} · {formatLabel(row.required_permission)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiRouteExposureAudit?.misaligned_frontend_api_paths?.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    Misaligned frontend API paths: {aiRouteExposureAudit.misaligned_frontend_api_paths.join(', ')}
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_coverage_audit">
                <div className="card__label">Unified AI runtime coverage audit</div>
                <p className="card__subtext">
                  Runtime coverage matrix for registered AI/intelligence features. It checks whether each feature has backend endpoints, frontend consumers, evidence schema, and tenant evidence rows before treating it as commercially proven.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Backend endpoints</div>
                    <div className="card__value">{numberValue(aiRuntimeCoverageAudit?.registered_backend_endpoint_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Frontend consumers</div>
                    <div className="card__value">{numberValue(aiRuntimeCoverageAudit?.registered_frontend_consumer_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Runtime coverage score</div>
                    <div className="card__value">{numberValue(aiRuntimeCoverageAudit?.average_runtime_coverage_score)}%</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Features with runtime gaps</div>
                    <div className="card__value">{numberValue(aiRuntimeCoverageAudit?.features_with_runtime_gaps_count)}</div>
                  </div>
                </div>
                <div className="card__subtext" style={{ marginTop: 10 }}>
                  Status: {formatLabel(aiRuntimeCoverageAudit?.runtime_coverage_status || 'not_reported')} · static contracts do not replace real runtime testing.
                </div>
                {aiHighPriorityRuntimeGaps.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">High-priority runtime gaps</div>
                    <ul style={{ margin: '8px 0 0 18px' }}>
                      {aiHighPriorityRuntimeGaps.slice(0, 5).map((row) => (
                        <li key={row.feature_key} className="card__subtext">
                          {row.feature_label}: {row.open_runtime_gaps?.join(', ') || 'runtime gap'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiRuntimeCoverageRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Runtime coverage rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeCoverageRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{numberValue(row.runtime_coverage_score)}% coverage</span>
                            <span style={badgeStyle}>{formatLabel(row.runtime_coverage_status || 'not_reported')}</span>
                          </div>
                          <strong>{row.feature_label}</strong>
                          <p className="card__subtext">
                            {numberValue(row.backend_endpoint_count)} endpoints · {numberValue(row.frontend_consumer_count)} frontend consumers · {numberValue(row.tenant_runtime_evidence_rows)} tenant evidence rows.
                          </p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">Gaps: {row.open_runtime_gaps.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>



              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_remediation_worklist">
                <div className="card__label">Unified AI runtime remediation worklist</div>
                <p className="card__subtext">
                  Prioritized remediation list generated from the runtime coverage audit. It turns endpoint, frontend consumer, schema, and tenant evidence gaps into owner/action rows before commercial signoff.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Remediation items</div>
                    <div className="card__value">{numberValue(aiRuntimeRemediationWorklist?.total_runtime_remediation_items)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocking items</div>
                    <div className="card__value">{numberValue(aiRuntimeRemediationWorklist?.blocking_runtime_remediation_items)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Highest urgency</div>
                    <div className="card__value">{numberValue(aiRuntimeRemediationWorklist?.highest_urgency_score)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeRemediationWorklist?.commercial_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeRemediationItems.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Prioritized runtime remediation items</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeRemediationItems.slice(0, 6).map((item) => (
                        <article className="card" key={item.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(item.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{numberValue(item.urgency_score)} urgency</span>
                            <span style={badgeStyle}>{formatLabel(item.owner_hint || 'owner')}</span>
                          </div>
                          <strong>{item.feature_label}</strong>
                          <p className="card__subtext">
                            Impact: {formatLabel(item.commercial_release_impact || 'not_reported')} · coverage {numberValue(item.runtime_coverage_score)}%.
                          </p>
                          {item.recommended_next_actions?.length ? (
                            <p className="card__subtext">Actions: {item.recommended_next_actions.join(', ')}</p>
                          ) : null}
                          {item.open_runtime_gaps?.length ? (
                            <p className="card__subtext">Runtime gaps: {item.open_runtime_gaps.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No runtime remediation items reported.</p>
                )}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_validation_drill">
                <div className="card__label">Unified AI runtime validation drill</div>
                <p className="card__subtext">
                  Operator-executable validation drill generated from the runtime remediation worklist. It defines real tenant evidence, pass criteria, and abort rules before any unwaived commercial AI signoff.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Drill items</div>
                    <div className="card__value">{numberValue(aiRuntimeValidationDrill?.total_drill_items)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocking drill items</div>
                    <div className="card__value">{numberValue(aiRuntimeValidationDrill?.blocking_drill_items)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Drill release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeValidationDrill?.drill_release_status || 'not_reported')}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Runtime coverage status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeValidationDrill?.runtime_coverage_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeValidationDrillRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Runtime validation drill rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeValidationDrillRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{numberValue(row.urgency_score)} urgency</span>
                            <span style={badgeStyle}>{formatLabel(row.drill_status || 'not_reported')}</span>
                          </div>
                          <strong>{row.feature_label}</strong>
                          <p className="card__subtext">
                            Current evidence: {numberValue(row.current_backend_endpoint_count)} endpoints · {numberValue(row.current_frontend_consumer_count)} frontend consumers · {numberValue(row.current_tenant_runtime_evidence_rows)} tenant rows.
                          </p>
                          {row.required_evidence_artifacts?.length ? (
                            <p className="card__subtext">Evidence: {row.required_evidence_artifacts.join(', ')}</p>
                          ) : null}
                          {row.pass_criteria?.length ? (
                            <p className="card__subtext">Pass criteria: {row.pass_criteria.join(', ')}</p>
                          ) : null}
                          {row.operator_drill_steps?.length ? (
                            <p className="card__subtext">Drill steps: {row.operator_drill_steps.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No runtime validation drill items reported.</p>
                )}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_signoff_evidence_ledger">
                <div className="card__label">Unified AI runtime signoff evidence ledger</div>
                <p className="card__subtext">
                  Read-only signoff ledger that converts runtime coverage and validation drill evidence into feature-level operator signoff readiness. It does not record approval or release anything automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Evidence-ready features</div>
                    <div className="card__value">{numberValue(aiRuntimeSignoffEvidenceLedger?.evidence_ready_feature_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocking / waiver required</div>
                    <div className="card__value">{numberValue(aiRuntimeSignoffEvidenceLedger?.blocking_or_waiver_required_feature_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Manual waiver packets</div>
                    <div className="card__value">{numberValue(aiRuntimeSignoffEvidenceLedger?.manual_waiver_packet_required_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Signoff readiness</div>
                    <div className="card__value">{numberValue(aiRuntimeSignoffEvidenceLedger?.signoff_readiness_percent)}%</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Signoff release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeSignoffEvidenceLedger?.signoff_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeSignoffEvidenceRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Runtime signoff evidence rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeSignoffEvidenceRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{numberValue(row.runtime_coverage_score)}% coverage</span>
                            <span style={badgeStyle}>{formatLabel(row.signoff_status || 'not_reported')}</span>
                          </div>
                          <strong>{row.feature_label}</strong>
                          <p className="card__subtext">
                            Evidence: {numberValue(row.backend_endpoint_count)} endpoints · {numberValue(row.frontend_consumer_count)} frontend consumers · {numberValue(row.tenant_runtime_evidence_rows)} tenant rows · schema {numberValue(row.existing_evidence_table_count)}/{numberValue(row.expected_evidence_table_count)}.
                          </p>
                          <p className="card__subtext">{row.signoff_evidence_statement}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">Open gaps: {row.open_runtime_gaps.join(', ')}</p>
                          ) : null}
                          {row.pass_criteria?.length ? (
                            <p className="card__subtext">Pass criteria: {row.pass_criteria.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No runtime signoff evidence rows reported.</p>
                )}

                {aiRuntimeSignoffWaiverPacketRows.length ? (
                  <div className="stack" style={{ marginTop: 16 }}>
                    <div className="card__label">Manual waiver packet queue</div>
                    {aiRuntimeSignoffWaiverPacketRows.slice(0, 5).map((row) => (
                      <div key={row.feature_key || row.sequence} className="panel panel--muted">
                        <div className="card__row">
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <span style={badgeStyle}>{formatLabel(row.waiver_packet_status || 'waiver_packet_required')}</span>
                        </div>
                        <p className="card__subtext">Open gaps: {row.open_runtime_gaps?.join(', ') || 'none reported'}</p>
                        <p className="card__subtext">Required waiver fields: {row.minimum_manual_waiver_fields?.join(', ') || 'not reported'}</p>
                        <p className="card__subtext">{row.release_rule}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_waiver_review_register">
                <div className="card__label">Unified AI runtime waiver review register</div>
                <p className="card__subtext">
                  Read-only register for manual runtime waiver review, expiration control, renewal rules, and closure evidence. It does not create, renew, close, or approve waivers.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Waiver review rows</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverReviewRegister?.waiver_review_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Critical/high reviews</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverReviewRegister?.critical_high_waiver_review_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Review release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeWaiverReviewRegister?.waiver_review_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeWaiverReviewRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Waiver review register rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeWaiverReviewRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.review_status || 'review_status')}</span>
                            <span style={badgeStyle}>{formatLabel(row.waiver_review_cadence || 'cadence')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.review_owner_hint || 'not_reported')} · Expiration: {row.expiration_control || 'not reported'}</p>
                          <p className="card__subtext">Renewal rule: {row.renewal_rule || 'not reported'}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">Open gaps: {row.open_runtime_gaps.join(', ')}</p>
                          ) : null}
                          {row.closure_evidence_required?.length ? (
                            <p className="card__subtext">Closure evidence: {row.closure_evidence_required.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No runtime waiver review rows reported.</p>
                )}
                {aiCriticalHighWaiverReviewRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Critical/high waiver reviews require explicit owner, expiration, renewal review, and closure evidence before commercial AI enablement.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_waiver_escalation_matrix">
                <div className="card__label">Unified AI runtime waiver escalation matrix</div>
                <p className="card__subtext">
                  Read-only escalation matrix for runtime AI waiver reviews. It separates executive, product/operations, and owner follow-up escalation before commercial AI enablement.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Escalation rows</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverEscalationMatrix?.escalation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive escalations</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverEscalationMatrix?.tier_1_executive_escalation_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Product/ops escalations</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverEscalationMatrix?.tier_2_product_operations_escalation_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Escalation release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeWaiverEscalationMatrix?.escalation_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeWaiverEscalationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Waiver escalation rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeWaiverEscalationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_status || 'status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.escalation_owner_hint || 'not_reported')} · Due: {row.escalation_due_policy || 'not reported'}</p>
                          <p className="card__subtext">Release condition: {row.executive_release_condition || 'not reported'}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">Open gaps: {row.open_runtime_gaps.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No runtime waiver escalations reported.</p>
                )}
                {aiTier1RuntimeWaiverEscalationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Executive escalation rows must be reviewed before any time-boxed critical runtime AI waiver is used for enablement.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_waiver_closure_board">
                <div className="card__label">Unified AI runtime waiver closure board</div>
                <p className="card__subtext">
                  Read-only closure board for runtime AI waiver escalations. It keeps closure blockers, owners, due policy, and release conditions visible before commercial AI enablement.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Closure rows</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverClosureBoard?.closure_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked closures</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverClosureBoard?.blocked_closure_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive blocked closures</div>
                    <div className="card__value">{numberValue(aiRuntimeWaiverClosureBoard?.executive_blocked_closure_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Closure release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeWaiverClosureBoard?.closure_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeWaiverClosureRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Waiver closure rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeWaiverClosureRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.closure_readiness_status || 'closure_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.closure_owner_hint || 'not_reported')} · Due: {row.closure_due_policy || 'not reported'}</p>
                          <p className="card__subtext">Release condition: {row.closure_release_condition || 'not reported'}</p>
                          {row.open_runtime_gaps?.length ? (
                            <p className="card__subtext">Open gaps: {row.open_runtime_gaps.join(', ')}</p>
                          ) : null}
                          {row.closure_evidence_required?.length ? (
                            <p className="card__subtext">Closure evidence: {row.closure_evidence_required.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No runtime waiver closure rows reported.</p>
                )}
                {aiExecutiveBlockedWaiverClosureRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Executive blocked closure rows require explicit closure, disablement, or time-boxed waiver evidence before critical runtime AI enablement.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_closure_monitoring_plan">
                <div className="card__label">Unified AI runtime post-closure monitoring plan</div>
                <p className="card__subtext">
                  Read-only post-closure monitoring plan for runtime AI waivers. It keeps monitoring cadence, owner hints, evidence packets, and broad-release conditions visible after closure review.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Monitoring rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostClosureMonitoringPlan?.monitoring_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked monitoring</div>
                    <div className="card__value">{numberValue(aiRuntimePostClosureMonitoringPlan?.blocked_monitoring_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive monitoring</div>
                    <div className="card__value">{numberValue(aiRuntimePostClosureMonitoringPlan?.executive_monitoring_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Monitoring release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostClosureMonitoringPlan?.monitoring_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostClosureMonitoringRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-closure monitoring rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostClosureMonitoringRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.monitoring_status || 'monitoring_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.monitoring_owner_hint || 'not_reported')} · Cadence: {row.monitoring_cadence || 'not reported'}</p>
                          <p className="card__subtext">Release monitoring condition: {row.release_monitoring_condition || 'not reported'}</p>
                          {row.required_monitoring_evidence?.length ? (
                            <p className="card__subtext">Monitoring evidence: {row.required_monitoring_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-closure runtime monitoring rows reported.</p>
                )}
                {aiBlockedPostClosureMonitoringRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked monitoring rows still require closure evidence, disablement, or a time-boxed waiver before broad commercial AI release.
                  </p>
                ) : null}
              </div>




              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_closure_evidence_acceptance_gate">
                <div className="card__label">Unified AI runtime post-closure evidence acceptance gate</div>
                <p className="card__subtext">
                  Read-only acceptance gate for post-closure runtime AI monitoring evidence. It keeps manual evidence acceptance, owner hints, due policy, and broad-release conditions visible without approving release or recording signoff.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Acceptance rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.acceptance_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked acceptance</div>
                    <div className="card__value">{numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.blocked_acceptance_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive acceptance</div>
                    <div className="card__value">{numberValue(aiRuntimePostClosureEvidenceAcceptanceGate?.executive_acceptance_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Acceptance release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostClosureEvidenceAcceptanceGate?.evidence_acceptance_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostClosureEvidenceAcceptanceRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Evidence acceptance rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostClosureEvidenceAcceptanceRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.evidence_acceptance_status || 'acceptance_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.acceptance_owner_hint || 'not_reported')} · Due: {row.acceptance_due_policy || 'not reported'}</p>
                          <p className="card__subtext">Release condition: {row.acceptance_release_condition || 'not reported'}</p>
                          {row.required_acceptance_evidence?.length ? (
                            <p className="card__subtext">Acceptance evidence: {row.required_acceptance_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-closure evidence acceptance rows reported.</p>
                )}
                {aiBlockedPostClosureEvidenceAcceptanceRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked evidence acceptance rows still require monitoring evidence, closure evidence, disablement, or a time-boxed waiver before broad commercial AI release.
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_broad_release_readiness_board">
                <div className="card__label">Unified AI runtime broad release readiness board</div>
                <p className="card__subtext">
                  Read-only board that carries accepted post-closure runtime evidence into manual broad-release review conditions. It keeps release-owner approval, tenant validation sample, and rollback acknowledgement requirements visible without enabling any tenant feature flag or release mutation.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Readiness rows</div>
                    <div className="card__value">{numberValue(aiRuntimeBroadReleaseReadinessBoard?.readiness_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked release rows</div>
                    <div className="card__value">{numberValue(aiRuntimeBroadReleaseReadinessBoard?.blocked_readiness_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive release rows</div>
                    <div className="card__value">{numberValue(aiRuntimeBroadReleaseReadinessBoard?.executive_readiness_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Broad release status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeBroadReleaseReadinessBoard?.broad_release_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeBroadReleaseReadinessRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Broad-release readiness rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeBroadReleaseReadinessRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.broad_release_readiness_status || 'release_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.release_owner_hint || 'not_reported')} · Due: {row.release_due_policy || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.release_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Rollback condition: {row.rollback_condition || 'not reported'}</p>
                          {row.required_broad_release_evidence?.length ? (
                            <p className="card__subtext">Release evidence: {row.required_broad_release_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No broad-release readiness rows reported.</p>
                )}
                {aiBlockedRuntimeBroadReleaseReadinessRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked broad-release rows still require accepted post-closure evidence, release-owner approval, tenant runtime validation sample, rollback acknowledgement, or a time-boxed waiver before broad tenant enablement.
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_tenant_enablement_control_queue">
                <div className="card__label">Unified AI runtime tenant enablement control queue</div>
                <p className="card__subtext">
                  Read-only queue that converts broad-release readiness into manual tenant enablement controls. It keeps feature-flag rollout plan, support/customer-success acknowledgement, and post-enablement monitoring owner requirements visible without mutating tenant flags.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Control rows</div>
                    <div className="card__value">{numberValue(aiRuntimeTenantEnablementControlQueue?.control_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked enablement rows</div>
                    <div className="card__value">{numberValue(aiRuntimeTenantEnablementControlQueue?.blocked_control_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive enablement rows</div>
                    <div className="card__value">{numberValue(aiRuntimeTenantEnablementControlQueue?.executive_control_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Tenant enablement status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeTenantEnablementControlQueue?.tenant_enablement_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimeTenantEnablementControlRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Tenant enablement control rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimeTenantEnablementControlRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.tenant_enablement_control_status || 'enablement_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.enablement_owner_hint || 'not_reported')} · Due: {row.enablement_due_policy || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.enablement_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Feature flag condition: {row.feature_flag_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success condition: {row.customer_success_condition || 'not reported'}</p>
                          {row.required_tenant_enablement_evidence?.length ? (
                            <p className="card__subtext">Enablement evidence: {row.required_tenant_enablement_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No tenant enablement control rows reported.</p>
                )}
                {aiBlockedRuntimeTenantEnablementControlRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked tenant enablement rows still require broad-release evidence, waiver closure, feature-flag rollout plan, support/customer-success acknowledgement, and post-enablement monitoring ownership before tenant rollout.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_health_watchlist">
                <div className="card__label">Unified AI runtime post-enablement health watchlist</div>
                <p className="card__subtext">
                  Read-only watchlist that converts tenant enablement controls into post-enablement runtime health monitoring requirements. It keeps health metrics, incident review, rollback reconfirmation, and customer-success feedback evidence visible without scheduling monitoring jobs or changing rollout scope.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Watch rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementHealthWatchlist?.watch_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked watch rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementHealthWatchlist?.blocked_watch_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive watch rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementHealthWatchlist?.executive_watch_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Health watch status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementHealthWatchlist?.post_enablement_health_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementHealthWatchRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-enablement health watch rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementHealthWatchRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.post_enablement_health_status || 'health_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.health_watch_owner_hint || 'not_reported')} · Cadence: {row.health_watch_cadence || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.health_watch_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Rollout freeze: {row.rollout_freeze_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback reconfirmation: {row.rollback_reconfirmation_condition || 'not reported'}</p>
                          {row.required_post_enablement_health_evidence?.length ? (
                            <p className="card__subtext">Health evidence: {row.required_post_enablement_health_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-enablement health watch rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementHealthWatchRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked post-enablement health rows still require tenant enablement controls, waiver closure, monitoring ownership, incident-review evidence, rollback reconfirmation, and customer-success feedback before rollout scope expands.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_incident_response_queue">
                <div className="card__label">Unified AI runtime post-enablement incident response queue</div>
                <p className="card__subtext">
                  Read-only incident response queue that converts post-enablement health watch rows into manual incident triage, tenant-impact review, support escalation, rollback decision logging, and customer communication controls. It does not create tickets, notify customers, pause rollout, or trigger rollback automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Incident rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementIncidentResponseQueue?.incident_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked incident rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementIncidentResponseQueue?.blocked_incident_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive incident rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementIncidentResponseQueue?.executive_incident_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Incident status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementIncidentResponseQueue?.incident_response_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementIncidentResponseRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-enablement incident response rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementIncidentResponseRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.incident_response_status || 'incident_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.incident_owner_hint || 'not_reported')} · Cadence: {row.incident_review_cadence || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.incident_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Rollout pause: {row.rollout_pause_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback decision: {row.rollback_decision_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer communication: {row.customer_communication_condition || 'not reported'}</p>
                          {row.required_incident_response_evidence?.length ? (
                            <p className="card__subtext">Incident evidence: {row.required_incident_response_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-enablement incident response rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementIncidentResponseRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked incident-response rows still require post-enablement health controls, incident triage evidence, tenant-impact assessment, support escalation, rollback decision logging, and customer communication decision before rollout scope expands.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_incident_closure_board">
                <div className="card__label">Unified AI runtime post-enablement incident closure board</div>
                <p className="card__subtext">
                  Read-only incident closure board that converts post-enablement incident response rows into manual root-cause analysis, tenant-impact resolution, customer follow-up, prevention action, and rollout-resume conditions. It does not update tickets, notify customers, resume rollout, or trigger rollback automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Closure rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementIncidentClosureBoard?.closure_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked closure rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementIncidentClosureBoard?.blocked_closure_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive closure rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementIncidentClosureBoard?.executive_closure_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Closure status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementIncidentClosureBoard?.incident_closure_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementIncidentClosureRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-enablement incident closure rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementIncidentClosureRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.incident_closure_status || 'closure_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.closure_owner_hint || 'not_reported')} · Cadence: {row.closure_review_cadence || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.closure_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Rollout resume: {row.rollout_resume_condition || 'not reported'}</p>
                          <p className="card__subtext">Prevention action: {row.prevention_action_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer follow-up: {row.customer_follow_up_condition || 'not reported'}</p>
                          {row.required_incident_closure_evidence?.length ? (
                            <p className="card__subtext">Closure evidence: {row.required_incident_closure_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-enablement incident closure rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementIncidentClosureRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked incident-closure rows still require runtime-gap closure, root-cause analysis, tenant-impact resolution, customer follow-up, prevention action, and manual rollout-resume decision before rollout can expand again.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_prevention_verification_backlog">
                <div className="card__label">Unified AI runtime post-enablement prevention verification backlog</div>
                <p className="card__subtext">
                  Read-only prevention verification backlog that converts incident-closure rows into manual prevention-action implementation, effectiveness review, rollout-resume authorization, customer-success follow-up, and monitoring re-entry conditions. It does not update tickets, notify customers, resume rollout, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Prevention rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.prevention_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked prevention rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.blocked_prevention_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive prevention rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementPreventionVerificationBacklog?.executive_prevention_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Prevention status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementPreventionVerificationBacklog?.prevention_verification_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementPreventionVerificationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-enablement prevention verification rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementPreventionVerificationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.prevention_verification_status || 'prevention_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.prevention_owner_hint || 'not_reported')} · Cadence: {row.prevention_review_cadence || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.prevention_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Rollout resume guardrail: {row.rollout_resume_guardrail || 'not reported'}</p>
                          <p className="card__subtext">Monitoring re-entry: {row.monitoring_reentry_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer-success follow-up: {row.customer_success_follow_up_condition || 'not reported'}</p>
                          {row.required_prevention_verification_evidence?.length ? (
                            <p className="card__subtext">Prevention evidence: {row.required_prevention_verification_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-enablement prevention verification rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementPreventionVerificationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked prevention-verification rows still require incident-closure controls, runtime-gap closure, prevention-action implementation evidence, effectiveness review, manual rollout-resume authorization, and post-resume monitoring checkpoint evidence.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_resume_authorization_ledger">
                <div className="card__label">Unified AI runtime post-enablement rollout resume authorization ledger</div>
                <p className="card__subtext">
                  Read-only rollout-resume authorization ledger that converts prevention-verification rows into manual rollout-resume authorization, limited tenant-scope planning, rollback reconfirmation, customer-success acknowledgement, and post-resume health-owner controls. It does not change feature flags, notify customers, resume rollout, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Authorization rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked authorization rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.blocked_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive authorization rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.executive_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Authorization status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementRolloutResumeAuthorizationLedger?.rollout_resume_authorization_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutResumeAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-enablement rollout resume authorization rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutResumeAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.rollout_resume_authorization_status || 'authorization_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.authorization_owner_hint || 'not_reported')} · Cadence: {row.authorization_review_cadence || 'not reported'}</p>
                          <p className="card__subtext">Decision rule: {row.authorization_decision_rule || 'not reported'}</p>
                          <p className="card__subtext">Tenant scope: {row.tenant_scope_resume_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback reconfirmation: {row.rollback_reconfirmation_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer-success resume condition: {row.customer_success_resume_condition || 'not reported'}</p>
                          <p className="card__subtext">Post-resume monitoring: {row.post_resume_monitoring_condition || 'not reported'}</p>
                          {row.required_rollout_resume_authorization_evidence?.length ? (
                            <p className="card__subtext">Authorization evidence: {row.required_rollout_resume_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-enablement rollout-resume authorization rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutResumeAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked rollout-resume authorization rows still require prevention-verification controls, runtime-gap closure, limited tenant-scope plan, rollback reconfirmation, customer-success acknowledgement, and post-resume health-owner evidence.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_resume_observation_board">
                <div className="card__label">Unified AI runtime post-enablement rollout resume observation board</div>
                <p className="card__subtext">
                  Read-only post-resume observation board that converts rollout-resume authorization rows into limited-scope observation, runtime health metric review, customer-success feedback, rollback readiness, and manual rollout-scope expansion controls. It does not expand rollout scope, change feature flags, notify customers, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.blocked_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutResumeObservationBoard?.executive_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Observation status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementRolloutResumeObservationBoard?.post_resume_observation_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutResumeObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Post-resume observation rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutResumeObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.post_resume_observation_status || 'observation_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.observation_owner_hint || 'not_reported')} · Window: {row.observation_window_policy || 'not reported'}</p>
                          <p className="card__subtext">Tenant scope observation: {row.tenant_scope_observation_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime metrics: {row.runtime_health_metric_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer-success feedback: {row.customer_success_feedback_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback readiness: {row.rollback_readiness_condition || 'not reported'}</p>
                          <p className="card__subtext">Scope expansion: {row.rollout_scope_expansion_condition || 'not reported'}</p>
                          {row.required_post_resume_observation_evidence?.length ? (
                            <p className="card__subtext">Observation evidence: {row.required_post_resume_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No post-resume observation rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutResumeObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked post-resume observation rows still require rollout-resume authorization, closed runtime-gap controls, limited tenant-scope observation, runtime metric review, customer-success feedback, and rollback readiness evidence before rollout-scope expansion.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_scope_expansion_authorization_board">
                <div className="card__label">Unified AI runtime post-enablement rollout scope expansion authorization board</div>
                <p className="card__subtext">
                  Read-only scope-expansion authorization board that converts post-resume observation rows into manual expanded tenant-scope controls, limited-scope health acceptance, customer-success acknowledgement, rollback reconfirmation, and expanded-scope monitoring ownership. It does not change feature flags, expand rollout scope, notify customers, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Expansion rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.expansion_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked expansion rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.blocked_expansion_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive expansion rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.executive_expansion_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Expansion status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementRolloutScopeExpansionAuthorizationBoard?.rollout_scope_expansion_authorization_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutScopeExpansionAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Rollout scope-expansion authorization rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutScopeExpansionAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.rollout_scope_expansion_authorization_status || 'expansion_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.expansion_authorization_owner_hint || 'not_reported')} · Cadence: {row.expansion_authorization_cadence || 'not reported'}</p>
                          <p className="card__subtext">Limited-scope health: {row.limited_scope_health_condition || 'not reported'}</p>
                          <p className="card__subtext">Tenant scope expansion: {row.tenant_scope_expansion_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_expansion_condition || 'not reported'}</p>
                          <p className="card__subtext">Expanded-scope rollback: {row.rollback_expanded_scope_condition || 'not reported'}</p>
                          <p className="card__subtext">Expanded-scope monitoring: {row.expanded_scope_monitoring_condition || 'not reported'}</p>
                          {row.required_rollout_scope_expansion_authorization_evidence?.length ? (
                            <p className="card__subtext">Expansion evidence: {row.required_rollout_scope_expansion_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No rollout scope-expansion authorization rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutScopeExpansionAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked rollout scope-expansion rows still require post-resume observation acceptance, closed runtime-gap controls, limited-scope runtime health evidence, customer-success acknowledgement, expanded-scope rollback reconfirmation, and expanded-scope monitoring ownership.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_expanded_scope_health_board">
                <div className="card__label">Unified AI runtime post-enablement expanded scope health board</div>
                <p className="card__subtext">
                  Read-only expanded-scope health board that converts rollout scope-expansion authorization rows into manual tenant-sample, runtime metric, customer-success, incident, rollback, and further rollout-growth controls. It does not change feature flags, notify customers, create support tickets, trigger rollback, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Health rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.expanded_scope_health_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked health rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.blocked_expanded_scope_health_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive health rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementExpandedScopeHealthBoard?.executive_expanded_scope_health_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Expanded-scope health status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementExpandedScopeHealthBoard?.expanded_scope_health_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementExpandedScopeHealthRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Expanded-scope health rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementExpandedScopeHealthRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.expanded_scope_health_status || 'health_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.expanded_scope_health_owner_hint || 'not_reported')} · Cadence: {row.expanded_scope_health_cadence || 'not reported'}</p>
                          <p className="card__subtext">Tenant sample: {row.expanded_scope_tenant_sample_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health: {row.expanded_scope_runtime_health_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.expanded_scope_customer_success_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident review: {row.expanded_scope_incident_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback readiness: {row.expanded_scope_rollback_condition || 'not reported'}</p>
                          <p className="card__subtext">Further rollout growth: {row.further_rollout_growth_condition || 'not reported'}</p>
                          {row.required_expanded_scope_health_evidence?.length ? (
                            <p className="card__subtext">Expanded-scope health evidence: {row.required_expanded_scope_health_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No expanded-scope health rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementExpandedScopeHealthRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked expanded-scope health rows still require rollout scope-expansion authorization, closed runtime-gap controls, expanded tenant-sample evidence, runtime health metrics, incident review, customer-success feedback, and rollback readiness evidence before further rollout growth.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_growth_authorization_board">
                <div className="card__label">Unified AI runtime post-enablement rollout growth authorization board</div>
                <p className="card__subtext">
                  Read-only rollout-growth authorization board that converts expanded-scope health rows into manual business justification, customer-success, support-capacity, rollback, and growth-scope monitoring controls. It does not grow tenant scope, change feature flags, notify customers, create support tickets, trigger rollback, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Growth rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.rollout_growth_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked growth rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.blocked_rollout_growth_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive growth rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.executive_rollout_growth_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Growth authorization status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementRolloutGrowthAuthorizationBoard?.rollout_growth_authorization_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutGrowthAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Rollout growth authorization rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutGrowthAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.rollout_growth_authorization_status || 'growth_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.rollout_growth_owner_hint || 'not_reported')} · Cadence: {row.rollout_growth_review_cadence || 'not reported'}</p>
                          <p className="card__subtext">Expanded-scope health acceptance: {row.expanded_scope_health_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Business justification: {row.rollout_growth_business_justification_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_growth_condition || 'not reported'}</p>
                          <p className="card__subtext">Support capacity: {row.support_capacity_growth_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback scope: {row.rollback_growth_scope_condition || 'not reported'}</p>
                          <p className="card__subtext">Growth monitoring: {row.growth_scope_monitoring_condition || 'not reported'}</p>
                          {row.required_rollout_growth_authorization_evidence?.length ? (
                            <p className="card__subtext">Growth authorization evidence: {row.required_rollout_growth_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No rollout growth authorization rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutGrowthAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked rollout-growth authorization rows still require expanded-scope health acceptance, closed runtime-gap controls, business justification, customer-success and support-capacity acknowledgements, rollback reconfirmation, and growth-scope monitoring ownership before further rollout growth.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_growth_observation_board">
                <div className="card__label">Unified AI runtime post-enablement rollout growth observation board</div>
                <p className="card__subtext">
                  Read-only rollout-growth observation board that converts manual growth authorization into growth-scope tenant sample, runtime health, incident review, customer-success, support-capacity, rollback-readiness, and next-growth-step controls. It does not grow tenant scope, change feature flags, notify customers, create support tickets, trigger rollback, or schedule monitoring jobs automatically.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.rollout_growth_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.blocked_rollout_growth_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthObservationBoard?.executive_rollout_growth_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Growth observation status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementRolloutGrowthObservationBoard?.rollout_growth_observation_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutGrowthObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Rollout growth observation rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutGrowthObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.rollout_growth_observation_status || 'observation_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.rollout_growth_observation_owner_hint || 'not_reported')} · Cadence: {row.rollout_growth_observation_cadence || 'not reported'}</p>
                          <p className="card__subtext">Growth authorization: {row.growth_authorization_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Tenant sample: {row.growth_scope_tenant_sample_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health: {row.growth_scope_runtime_health_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident review: {row.growth_scope_incident_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_growth_feedback_condition || 'not reported'}</p>
                          <p className="card__subtext">Support capacity: {row.support_growth_capacity_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback readiness: {row.rollback_growth_readiness_condition || 'not reported'}</p>
                          <p className="card__subtext">Next growth step: {row.next_growth_step_condition || 'not reported'}</p>
                          {row.required_rollout_growth_observation_evidence?.length ? (
                            <p className="card__subtext">Growth observation evidence: {row.required_rollout_growth_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No rollout growth observation rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutGrowthObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked rollout-growth observation rows still require growth authorization acceptance, closed runtime-gap controls, growth-scope tenant sample evidence, runtime health metrics, incident review, customer-success feedback, support-capacity review, rollback readiness, and observation ownership before any next rollout-growth step.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_rollout_growth_next_step_gate">
                <div className="card__label">Unified AI runtime post-enablement rollout growth next-step gate</div>
                <p className="card__subtext">
                  Read-only next-growth-step gate that converts rollout growth observation into manual next-wave scope authorization controls. It requires observation acceptance, business justification, tenant-scope limits, customer-success/support capacity, runtime monitoring ownership, and rollback reconfirmation before any further tenant growth.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Gate rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.next_growth_step_gate_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked gate rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.blocked_next_growth_step_gate_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive gate rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementRolloutGrowthNextStepGate?.executive_next_growth_step_gate_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Next-step gate status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementRolloutGrowthNextStepGate?.next_growth_step_gate_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementRolloutGrowthNextStepGateRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Rollout growth next-step gate rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementRolloutGrowthNextStepGateRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.next_growth_step_gate_status || 'gate_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.next_growth_step_gate_owner_hint || 'not_reported')} · Due: {row.next_growth_step_gate_due_policy || 'not reported'}</p>
                          <p className="card__subtext">Observation acceptance: {row.growth_observation_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Business and scope: {row.next_growth_business_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success capacity: {row.customer_success_capacity_condition || 'not reported'}</p>
                          <p className="card__subtext">Support capacity: {row.support_capacity_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime monitoring: {row.runtime_monitoring_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback owner: {row.rollback_owner_condition || 'not reported'}</p>
                          <p className="card__subtext">Release condition: {row.next_growth_step_release_condition || 'not reported'}</p>
                          {row.required_next_growth_step_gate_evidence?.length ? (
                            <p className="card__subtext">Next-step gate evidence: {row.required_next_growth_step_gate_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No rollout growth next-step gate rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementRolloutGrowthNextStepGateRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked next-growth-step rows still require accepted growth observation, closed runtime-gap controls, business justification, tenant-scope limits, customer-success and support-capacity confirmation, runtime monitoring ownership, and rollback reconfirmation before any additional rollout wave.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_next_wave_observation_board">
                <div className="card__label">Unified AI runtime post-enablement next-wave observation board</div>
                <p className="card__subtext">
                  Read-only next-wave observation board that converts accepted next-growth-step gates into runtime observation controls for the newly enabled tenant wave. It requires tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership before any additional growth.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.next_wave_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.blocked_next_wave_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementNextWaveObservationBoard?.executive_next_wave_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Next-wave status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementNextWaveObservationBoard?.next_wave_observation_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementNextWaveObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Next-wave observation rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementNextWaveObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.next_wave_observation_status || 'observation_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.next_wave_observation_owner_hint || 'not_reported')} · Cadence: {row.next_wave_observation_cadence || 'not reported'}</p>
                          <p className="card__subtext">Gate acceptance: {row.next_growth_step_gate_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Tenant scope: {row.next_wave_tenant_scope_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health: {row.next_wave_runtime_health_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident review: {row.next_wave_incident_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_next_wave_feedback_condition || 'not reported'}</p>
                          <p className="card__subtext">Support capacity: {row.support_next_wave_capacity_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback readiness: {row.rollback_next_wave_readiness_condition || 'not reported'}</p>
                          <p className="card__subtext">Additional growth: {row.additional_growth_condition || 'not reported'}</p>
                          {row.required_next_wave_observation_evidence?.length ? (
                            <p className="card__subtext">Next-wave evidence: {row.required_next_wave_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No next-wave observation rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementNextWaveObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked next-wave observation rows still require accepted next-growth-step gate evidence, closed runtime-gap controls, enabled tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership before any additional rollout growth.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_additional_growth_authorization_board">
                <div className="card__label">Unified AI runtime post-enablement additional growth authorization board</div>
                <p className="card__subtext">
                  Read-only authorization board that converts accepted next-wave runtime observation into controlled additional rollout growth. It requires business justification, limited tenant-scope planning, customer-success/support capacity, runtime monitoring ownership, and rollback reconfirmation before another growth wave.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Authorization rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.additional_growth_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.blocked_additional_growth_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.executive_additional_growth_authorization_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Authorization status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementAdditionalGrowthAuthorizationBoard?.additional_growth_authorization_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementAdditionalGrowthAuthorizationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Additional growth authorization rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementAdditionalGrowthAuthorizationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.additional_growth_authorization_status || 'authorization_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.additional_growth_authorization_owner_hint || 'not_reported')}</p>
                          <p className="card__subtext">Next-wave acceptance: {row.next_wave_observation_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Business justification: {row.additional_growth_business_condition || 'not reported'}</p>
                          <p className="card__subtext">Tenant scope: {row.additional_growth_scope_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_additional_growth_condition || 'not reported'}</p>
                          <p className="card__subtext">Support capacity: {row.support_additional_growth_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime monitoring: {row.runtime_monitoring_additional_growth_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback: {row.rollback_additional_growth_condition || 'not reported'}</p>
                          {row.required_additional_growth_authorization_evidence?.length ? (
                            <p className="card__subtext">Authorization evidence: {row.required_additional_growth_authorization_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No additional growth authorization rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementAdditionalGrowthAuthorizationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked additional-growth rows still require accepted next-wave observation evidence, closed runtime-gap controls, business justification, limited tenant-scope planning, customer-success/support capacity, runtime monitoring ownership, and rollback reconfirmation before another rollout growth wave.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_additional_growth_observation_board">
                <div className="card__label">Unified AI runtime post-enablement additional growth observation board</div>
                <p className="card__subtext">
                  Read-only observation board that converts accepted additional-growth authorization into controlled runtime observation before any further rollout growth. It requires tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Observation rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.additional_growth_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.blocked_additional_growth_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.executive_additional_growth_observation_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Observation status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementAdditionalGrowthObservationBoard?.additional_growth_observation_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementAdditionalGrowthObservationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Additional growth observation rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementAdditionalGrowthObservationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.additional_growth_observation_status || 'observation_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.additional_growth_observation_owner_hint || 'not_reported')}</p>
                          <p className="card__subtext">Cadence: {formatLabel(row.additional_growth_observation_cadence || 'not_reported')}</p>
                          <p className="card__subtext">Authorization acceptance: {row.additional_growth_authorization_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Tenant scope: {row.additional_growth_tenant_scope_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health: {row.additional_growth_runtime_health_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident review: {row.additional_growth_incident_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_additional_growth_feedback_condition || 'not reported'}</p>
                          <p className="card__subtext">Support capacity: {row.support_additional_growth_capacity_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback: {row.rollback_additional_growth_readiness_condition || 'not reported'}</p>
                          <p className="card__subtext">Further growth: {row.further_growth_condition || 'not reported'}</p>
                          {row.required_additional_growth_observation_evidence?.length ? (
                            <p className="card__subtext">Observation evidence: {row.required_additional_growth_observation_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No additional growth observation rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementAdditionalGrowthObservationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked additional-growth observation rows still require accepted authorization evidence, closed runtime-gap controls, enabled tenant-scope evidence, runtime health metrics, incident review, customer-success/support feedback, rollback readiness, and observation ownership before any further rollout growth.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_further_growth_exit_criteria_board">
                <div className="card__label">Unified AI runtime post-enablement further growth exit criteria board</div>
                <p className="card__subtext">
                  Read-only exit-criteria board that converts accepted additional-growth observation into controlled further-growth exit review. It requires runtime health stability, incident-free or resolved-exception evidence, customer-success/support acceptance, rollback rehearsal, and explicit owner evidence before the next rollout growth cycle exits observation.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Exit rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.further_growth_exit_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.blocked_further_growth_exit_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.executive_further_growth_exit_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Exit status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementFurtherGrowthExitCriteriaBoard?.further_growth_exit_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementFurtherGrowthExitRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Further growth exit rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementFurtherGrowthExitRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.further_growth_exit_status || 'exit_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.further_growth_exit_owner_hint || 'not_reported')}</p>
                          <p className="card__subtext">Observation acceptance: {row.additional_growth_observation_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health stability: {row.runtime_health_stability_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident-free window: {row.incident_free_window_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_exit_condition || 'not reported'}</p>
                          <p className="card__subtext">Support: {row.support_exit_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback: {row.rollback_exit_condition || 'not reported'}</p>
                          <p className="card__subtext">Exit condition: {row.further_growth_exit_condition || 'not reported'}</p>
                          {row.required_further_growth_exit_evidence?.length ? (
                            <p className="card__subtext">Exit evidence: {row.required_further_growth_exit_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No further growth exit rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementFurtherGrowthExitRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked further-growth exit rows still require accepted additional-growth observation evidence, closed runtime-gap controls, health-stability evidence, incident-free or resolved-exception evidence, customer-success/support acceptance, rollback rehearsal, and exit-owner evidence.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_certification_board">
                <div className="card__label">Unified AI runtime post-enablement steady-state certification board</div>
                <p className="card__subtext">
                  Read-only steady-state certification board that converts accepted further-growth exit criteria into controlled runtime AI steady-state certification. It requires runtime health baseline evidence, incident-review acceptance, customer-success/support readiness, rollback reconfirmation, and explicit owner evidence before the AI feature is treated as steady-state operational.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Certification rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.steady_state_certification_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.blocked_steady_state_certification_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationBoard?.executive_steady_state_certification_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Certification status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementSteadyStateCertificationBoard?.steady_state_certification_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementSteadyStateCertificationRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Steady-state certification rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementSteadyStateCertificationRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.steady_state_certification_status || 'certification_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.steady_state_certification_owner_hint || 'not_reported')}</p>
                          <p className="card__subtext">Further-growth exit: {row.further_growth_exit_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health baseline: {row.runtime_health_baseline_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident review: {row.incident_review_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success: {row.customer_success_certification_condition || 'not reported'}</p>
                          <p className="card__subtext">Support: {row.support_certification_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback: {row.rollback_certification_condition || 'not reported'}</p>
                          <p className="card__subtext">Certification condition: {row.steady_state_certification_condition || 'not reported'}</p>
                          {row.required_steady_state_certification_evidence?.length ? (
                            <p className="card__subtext">Certification evidence: {row.required_steady_state_certification_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No steady-state certification rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementSteadyStateCertificationRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked steady-state certification rows still require accepted further-growth exit evidence, closed runtime-gap controls, health-baseline evidence, incident-review acceptance, customer-success/support readiness, rollback reconfirmation, and certification-owner evidence.
                  </p>
                ) : null}
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_monitoring_cadence_board">
                <div className="card__label">Unified AI runtime post-enablement steady-state monitoring cadence board</div>
                <p className="card__subtext">
                  Read-only steady-state monitoring cadence board that converts manual steady-state certification into recurring runtime AI review controls. It requires recurring runtime health review, incident review, customer-success feedback, support escalation capacity review, rollback reconfirmation, and explicit cadence-owner evidence.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Cadence rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.steady_state_monitoring_cadence_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.blocked_steady_state_monitoring_cadence_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.executive_steady_state_monitoring_cadence_row_count)}</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Cadence status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimePostEnablementSteadyStateMonitoringCadenceBoard?.steady_state_monitoring_cadence_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiRuntimePostEnablementSteadyStateMonitoringCadenceRows.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div className="card__label">Steady-state monitoring cadence rows</div>
                    <div style={reviewListStyle}>
                      {aiRuntimePostEnablementSteadyStateMonitoringCadenceRows.slice(0, 6).map((row) => (
                        <article className="card" key={row.feature_key || row.sequence}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={badgeStyle}>{formatLabel(row.production_priority || 'priority')}</span>
                            <span style={badgeStyle}>{formatLabel(row.escalation_tier || 'tier')}</span>
                            <span style={badgeStyle}>{formatLabel(row.steady_state_monitoring_cadence_status || 'cadence_status')}</span>
                          </div>
                          <strong>{row.feature_label || row.feature_key}</strong>
                          <p className="card__subtext">Owner: {formatLabel(row.steady_state_monitoring_cadence_owner_hint || 'not_reported')}</p>
                          <p className="card__subtext">Certification acceptance: {row.steady_state_certification_acceptance_condition || 'not reported'}</p>
                          <p className="card__subtext">Runtime health cadence: {row.recurring_runtime_health_review_condition || 'not reported'}</p>
                          <p className="card__subtext">Incident cadence: {row.recurring_incident_review_condition || 'not reported'}</p>
                          <p className="card__subtext">Customer success cadence: {row.customer_success_feedback_cadence_condition || 'not reported'}</p>
                          <p className="card__subtext">Support cadence: {row.support_escalation_cadence_condition || 'not reported'}</p>
                          <p className="card__subtext">Rollback cadence: {row.rollback_reconfirmation_cadence_condition || 'not reported'}</p>
                          <p className="card__subtext">Cadence condition: {row.steady_state_monitoring_cadence_condition || 'not reported'}</p>
                          {row.required_steady_state_monitoring_cadence_evidence?.length ? (
                            <p className="card__subtext">Cadence evidence: {row.required_steady_state_monitoring_cadence_evidence.join(', ')}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="card__subtext" style={{ marginTop: 12 }}>No steady-state monitoring cadence rows reported.</p>
                )}
                {aiBlockedRuntimePostEnablementSteadyStateMonitoringCadenceRows.length ? (
                  <p className="card__subtext" style={{ marginTop: 12 }}>
                    Blocked steady-state monitoring cadence rows still require certification acceptance, closed runtime-gap controls, recurring health and incident review cadence, customer-success/support cadence, rollback reconfirmation, and cadence-owner evidence.
                  </p>
                ) : null}
              </div>




              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_monitoring_exception_review_queue">
                <div className="card__header">
                  <div>
                    <h3>Unified AI runtime steady-state exception review queue</h3>
                    <p className="card__subtext">Recurring exception-review controls after steady-state monitoring cadence acceptance.</p>
                  </div>
                  <span style={badgeStyle}>{formatLabel(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.steady_state_exception_review_status || 'not_reported')}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">Exception rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.steady_state_exception_review_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.blocked_steady_state_exception_review_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.executive_steady_state_exception_review_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Product/Ops rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateMonitoringExceptionReviewQueue?.product_operations_steady_state_exception_review_row_count)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateMonitoringExceptionRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimePostEnablementSteadyStateMonitoringExceptionRows.length} steady-state exception review row(s) are blocked by open runtime gaps.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateMonitoringExceptionRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.steady_state_exception_review_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.steady_state_exception_review_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Condition: {row.steady_state_exception_review_condition || 'not reported'}</p>
                        {row.required_steady_state_exception_review_evidence?.length ? (
                          <p className="card__subtext">Required evidence: {row.required_steady_state_exception_review_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateMonitoringExceptionRows.length ? (
                    <p className="empty-state">No steady-state exception review rows reported.</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_closure_board">
                <div className="card__header">
                  <div>
                    <h3>Unified AI runtime steady-state exception closure board</h3>
                    <p className="card__subtext">Manual closure controls after steady-state exception review acceptance.</p>
                  </div>
                  <span style={badgeStyle}>{formatLabel(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.steady_state_exception_closure_status || 'not_reported')}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">Closure rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.steady_state_exception_closure_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.blocked_steady_state_exception_closure_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.executive_steady_state_exception_closure_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Product/Ops rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionClosureBoard?.product_operations_steady_state_exception_closure_row_count)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionClosureRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimePostEnablementSteadyStateExceptionClosureRows.length} steady-state exception closure row(s) are blocked by open runtime gaps or missing exception-review acceptance.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionClosureRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-closure'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.steady_state_exception_closure_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.steady_state_exception_closure_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Condition: {row.steady_state_exception_closure_condition || 'not reported'}</p>
                        <p className="card__subtext">Root cause: {row.root_cause_closure_condition || 'not reported'}</p>
                        <p className="card__subtext">Customer success: {row.customer_success_followup_condition || 'not reported'}</p>
                        <p className="card__subtext">Support: {row.support_followup_condition || 'not reported'}</p>
                        <p className="card__subtext">Rollback: {row.rollback_reconfirmation_condition || 'not reported'}</p>
                        {row.required_steady_state_exception_closure_evidence?.length ? (
                          <p className="card__subtext">Closure evidence: {row.required_steady_state_exception_closure_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionClosureRows.length ? (
                    <p className="empty-state">No steady-state exception closure rows reported.</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_recurrence_audit_board">
                <div className="card__header">
                  <div>
                    <h3>Unified AI runtime steady-state exception recurrence audit board</h3>
                    <p className="card__subtext">Manual recurrence audit controls after steady-state exception closure acceptance.</p>
                  </div>
                  <span style={badgeStyle}>{formatLabel(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.steady_state_exception_recurrence_audit_status || 'not_reported')}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">Recurrence rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.steady_state_exception_recurrence_audit_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.blocked_steady_state_exception_recurrence_audit_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.executive_steady_state_exception_recurrence_audit_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Product/Ops rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditBoard?.product_operations_steady_state_exception_recurrence_audit_row_count)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.length} steady-state exception recurrence audit row(s) are blocked by open runtime gaps or missing closure acceptance.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-recurrence-audit'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.steady_state_exception_recurrence_audit_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.steady_state_exception_recurrence_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Condition: {row.steady_state_exception_recurrence_audit_condition || 'not reported'}</p>
                        <p className="card__subtext">Window: {row.recurrence_window_condition || 'not reported'}</p>
                        <p className="card__subtext">Metrics: {row.recurrence_metric_condition || 'not reported'}</p>
                        <p className="card__subtext">Reopen rule: {row.reopen_rule_condition || 'not reported'}</p>
                        {row.required_steady_state_exception_recurrence_audit_evidence?.length ? (
                          <p className="card__subtext">Recurrence evidence: {row.required_steady_state_exception_recurrence_audit_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionRecurrenceAuditRows.length ? (
                    <p className="empty-state">No steady-state exception recurrence audit rows reported.</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_recurrence_resolution_board">
                <div className="card__header">
                  <div>
                    <h3>Unified AI runtime steady-state exception recurrence resolution board</h3>
                    <p className="card__subtext">Manual repeat-exception resolution controls after recurrence audit acceptance.</p>
                  </div>
                  <span style={badgeStyle}>{formatLabel(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.steady_state_exception_recurrence_resolution_status || 'not_reported')}</span>
                </div>
                <div className="metrics-grid metrics-grid--compact">
                  <div className="metric-card">
                    <div className="metric-card__label">Resolution rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.steady_state_exception_recurrence_resolution_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.blocked_steady_state_exception_recurrence_resolution_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.executive_steady_state_exception_recurrence_resolution_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Product/Ops rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionBoard?.product_operations_steady_state_exception_recurrence_resolution_row_count)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length} steady-state exception recurrence resolution row(s) are blocked by open runtime gaps or incomplete recurrence audit acceptance.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-recurrence-resolution'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.steady_state_exception_recurrence_resolution_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.steady_state_exception_recurrence_resolution_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Condition: {row.steady_state_exception_recurrence_resolution_condition || 'not reported'}</p>
                        <p className="card__subtext">Root cause: {row.recurrence_root_cause_condition || 'not reported'}</p>
                        <p className="card__subtext">Prevention: {row.recurrence_prevention_condition || 'not reported'}</p>
                        <p className="card__subtext">Monitoring re-entry: {row.monitoring_reentry_condition || 'not reported'}</p>
                        {row.required_steady_state_exception_recurrence_resolution_evidence?.length ? (
                          <p className="card__subtext">Resolution evidence: {row.required_steady_state_exception_recurrence_resolution_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionRecurrenceResolutionRows.length ? (
                    <p className="empty-state">No steady-state exception recurrence resolution rows reported.</p>
                  ) : null}
                </div>
              </div>



              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_exception_resolution_verification_board">
                <div className="card__label">Unified AI runtime steady-state exception resolution verification board</div>
                <p className="card__subtext">
                  Read-only verification board that checks recurrence-resolution effectiveness, monitoring samples, customer-success confirmation, support confirmation, and manual recertification conditions after repeat steady-state AI exceptions are resolved.
                </p>
                <span style={badgeStyle}>{formatLabel(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.steady_state_exception_resolution_verification_status || 'not_reported')}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">Verification rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.steady_state_exception_resolution_verification_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.blocked_steady_state_exception_resolution_verification_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.executive_steady_state_exception_resolution_verification_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Product/Ops rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationBoard?.product_operations_steady_state_exception_resolution_verification_row_count)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length} steady-state exception resolution verification row(s) are blocked by open runtime gaps or incomplete recurrence-resolution acceptance.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-exception-resolution-verification'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.steady_state_exception_resolution_verification_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.steady_state_exception_resolution_verification_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Effectiveness: {row.resolution_effectiveness_condition || 'not reported'}</p>
                        <p className="card__subtext">Monitoring sample: {row.resolution_monitoring_sample_condition || 'not reported'}</p>
                        <p className="card__subtext">Recertification: {row.recertification_decision_condition || 'not reported'}</p>
                        {row.required_steady_state_exception_resolution_verification_evidence?.length ? (
                          <p className="card__subtext">Verification evidence: {row.required_steady_state_exception_resolution_verification_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateExceptionResolutionVerificationRows.length ? (
                    <p className="empty-state">No steady-state exception resolution verification rows reported.</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_post_enablement_steady_state_certification_renewal_board">
                <div className="card__label">Unified AI runtime steady-state certification renewal board</div>
                <p className="card__subtext">
                  Read-only renewal board that forces steady-state AI certification to be refreshed with current monitoring history, exception-resolution verification, customer-success health, support health, and AI governance owner signoff.
                </p>
                <span style={badgeStyle}>{formatLabel(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.steady_state_certification_renewal_status || 'not_reported')}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">Renewal rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.steady_state_certification_renewal_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.blocked_steady_state_certification_renewal_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Executive rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.executive_steady_state_certification_renewal_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Product/Ops rows</div>
                    <div className="card__value">{numberValue(aiRuntimePostEnablementSteadyStateCertificationRenewalBoard?.product_operations_steady_state_certification_renewal_row_count)}</div>
                  </div>
                </div>
                {aiBlockedRuntimePostEnablementSteadyStateCertificationRenewalRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimePostEnablementSteadyStateCertificationRenewalRows.length} steady-state certification renewal row(s) are blocked by unresolved runtime gaps or incomplete resolution verification.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimePostEnablementSteadyStateCertificationRenewalRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'steady-state-certification-renewal'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.steady_state_certification_renewal_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.steady_state_certification_renewal_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Cadence: {row.certification_renewal_cadence || 'not reported'}</p>
                        <p className="card__subtext">Expiration: {row.certification_expiration_condition || 'not reported'}</p>
                        <p className="card__subtext">Monitoring history: {row.monitoring_history_review_condition || 'not reported'}</p>
                        <p className="card__subtext">Output: {row.recertification_output_condition || 'not reported'}</p>
                        {row.required_steady_state_certification_renewal_evidence?.length ? (
                          <p className="card__subtext">Renewal evidence: {row.required_steady_state_certification_renewal_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimePostEnablementSteadyStateCertificationRenewalRows.length ? (
                    <p className="empty-state">No steady-state certification renewal rows reported.</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="runtime_final_governance_audit_pack">
                <div className="card__label">Unified AI runtime final governance audit pack</div>
                <p className="card__subtext">
                  Read-only final audit pack that verifies AI contract freeze, runtime evidence, rollout history, monitoring history, exception resolution, certification renewal, and governance owner signoff before the AI track is considered complete.
                </p>
                <span style={badgeStyle}>{formatLabel(aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_status || 'not_reported')}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">Audit rows</div>
                    <div className="card__value">{numberValue(aiRuntimeFinalGovernanceAuditPack?.final_governance_audit_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiRuntimeFinalGovernanceAuditPack?.blocked_final_governance_audit_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Ready rows</div>
                    <div className="card__value">{numberValue(aiRuntimeFinalGovernanceAuditPack?.ready_final_governance_audit_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Renewal status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiRuntimeFinalGovernanceAuditPack?.steady_state_certification_renewal_status || 'not_reported')}</div>
                  </div>
                </div>
                {aiBlockedRuntimeFinalGovernanceAuditRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedRuntimeFinalGovernanceAuditRows.length} final governance audit row(s) are blocked by certification renewal or runtime evidence gaps.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiRuntimeFinalGovernanceAuditRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'final-governance-audit'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.final_governance_audit_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.final_governance_audit_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Release rule: {row.final_governance_audit_release_rule || 'not reported'}</p>
                        <p className="card__subtext">Contract freeze: {row.contract_freeze_review_condition || 'not reported'}</p>
                        <p className="card__subtext">Runtime evidence: {row.runtime_evidence_review_condition || 'not reported'}</p>
                        <p className="card__subtext">Output: {row.completion_output_condition || 'not reported'}</p>
                        {row.required_final_governance_audit_evidence?.length ? (
                          <p className="card__subtext">Final audit evidence: {row.required_final_governance_audit_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiRuntimeFinalGovernanceAuditRows.length ? (
                    <p className="empty-state">No final governance audit rows reported.</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="final_completion_freeze_manifest">
                <div className="card__label">Unified AI final completion freeze manifest</div>
                <p className="card__subtext">
                  Read-only final completion freeze manifest that carries final governance audit evidence into manual AI-track completion acceptance without certifying commercial grade, enabling tenants, sending notices, or mutating runtime systems.
                </p>
                <span style={badgeStyle}>{formatLabel(aiFinalCompletionFreezeManifest?.final_completion_freeze_status || 'not_reported')}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">Freeze rows</div>
                    <div className="card__value">{numberValue(aiFinalCompletionFreezeManifest?.final_completion_freeze_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiFinalCompletionFreezeManifest?.blocked_final_completion_freeze_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Ready rows</div>
                    <div className="card__value">{numberValue(aiFinalCompletionFreezeManifest?.ready_final_completion_freeze_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Contract version</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiFinalCompletionFreezeManifest?.contract_version || 'not_reported')}</div>
                  </div>
                </div>
                {aiBlockedFinalCompletionFreezeRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedFinalCompletionFreezeRows.length} final completion freeze row(s) are blocked by final governance audit readiness or runtime evidence gaps.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiFinalCompletionFreezeRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'final-completion-freeze'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.final_completion_freeze_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.final_completion_freeze_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Release rule: {row.final_completion_freeze_release_rule || 'not reported'}</p>
                        <p className="card__subtext">Contract condition: {row.final_completion_contract_condition || 'not reported'}</p>
                        <p className="card__subtext">Runtime condition: {row.final_completion_runtime_condition || 'not reported'}</p>
                        <p className="card__subtext">Business condition: {row.final_completion_business_condition || 'not reported'}</p>
                        {row.required_final_completion_freeze_evidence?.length ? (
                          <p className="card__subtext">Completion evidence: {row.required_final_completion_freeze_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiFinalCompletionFreezeRows.length ? (
                    <p className="empty-state">No final completion freeze rows reported.</p>
                  ) : null}
                </div>
              </div>


              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="commercial_completion_certificate">
                <div className="card__label">Unified AI commercial completion certificate</div>
                <p className="card__subtext">
                  Final read-only AI governance code-track completion certificate. It closes the governance-board expansion track, lists the remaining external runtime proof requirements, and hands the platform to the commercial launch readiness track without making customer claims or mutating runtime systems.
                </p>
                <span style={badgeStyle}>{formatLabel(aiCommercialCompletionCertificate?.commercial_completion_certificate_status || 'not_reported')}</span>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="metric-card">
                    <div className="metric-card__label">Certificate rows</div>
                    <div className="card__value">{numberValue(aiCommercialCompletionCertificate?.commercial_completion_certificate_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Blocked rows</div>
                    <div className="card__value">{numberValue(aiCommercialCompletionCertificate?.blocked_commercial_completion_certificate_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Ready rows</div>
                    <div className="card__value">{numberValue(aiCommercialCompletionCertificate?.ready_commercial_completion_certificate_row_count)}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-card__label">Code-track status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiCommercialCompletionCertificate?.ai_governance_code_track_status || 'not_reported')}</div>
                  </div>
                </div>
                <p className="card__subtext" style={{ marginTop: 12 }}>
                  Next best move: {formatLabel(aiCommercialCompletionCertificate?.ai_governance_next_best_move || 'not_reported')}
                </p>
                {aiCommercialCompletionCertificate?.remaining_external_proof_requirements?.length ? (
                  <p className="card__subtext">External proof still required: {aiCommercialCompletionCertificate.remaining_external_proof_requirements.join(', ')}</p>
                ) : null}
                {aiCommercialCompletionCertificate?.next_non_ai_track_recommendation?.recommended_scope?.length ? (
                  <p className="card__subtext">Next track scope: {aiCommercialCompletionCertificate.next_non_ai_track_recommendation.recommended_scope.join(', ')}</p>
                ) : null}
                {aiBlockedCommercialCompletionCertificateRows.length > 0 ? (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    {aiBlockedCommercialCompletionCertificateRows.length} commercial completion certificate row(s) are blocked by final freeze readiness or runtime evidence gaps.
                  </div>
                ) : null}
                <div className="list-stack" style={{ marginTop: 12 }}>
                  {aiCommercialCompletionCertificateRows.slice(0, 6).map((row, index) => (
                    <div className="list-row" key={`${row.feature_key || 'commercial-completion-certificate'}-${index}`}>
                      <div>
                        <strong>{row.feature_label || row.feature_key || 'AI feature'}</strong>
                        <p className="card__subtext">Status: {formatLabel(row.commercial_completion_certificate_status || 'not_reported')}</p>
                        <p className="card__subtext">Owner: {formatLabel(row.commercial_completion_certificate_owner_hint || 'not_reported')}</p>
                        <p className="card__subtext">Certificate rule: {row.commercial_completion_certificate_rule || 'not reported'}</p>
                        <p className="card__subtext">Commercial claim rule: {row.commercial_claim_rule || 'not reported'}</p>
                        <p className="card__subtext">Runtime proof: {row.runtime_proof_condition || 'not reported'}</p>
                        <p className="card__subtext">External launch: {row.external_launch_condition || 'not reported'}</p>
                        {row.required_certificate_evidence?.length ? (
                          <p className="card__subtext">Certificate evidence: {row.required_certificate_evidence.join(', ')}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!aiCommercialCompletionCertificateRows.length ? (
                    <p className="empty-state">No commercial completion certificate rows reported.</p>
                  ) : null}
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="contract_freeze_manifest">
                <div className="card__label">Unified AI contract freeze manifest</div>
                <p className="card__subtext">
                  Frozen platform-wide AI response contract manifest. It records which unified AI backend keys and frontend panels must stay aligned before any new AI governance surface is added or renamed.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Freeze status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiContractFreezeManifest?.freeze_status)}</div>
                    <div className="card__subtext">Current backend freeze-manifest status.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Contract version</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiContractFreezeManifest?.contract_version || '—'}</div>
                    <div className="card__subtext">Version label for this frozen unified AI governance contract.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Registered key alignment</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiContractFreezeManifest?.expected_key_count_matches_registered_contract ? 'Aligned' : 'Drift'}</div>
                    <div className="card__subtext">Frozen keys must match the backend registered contract key count: {numberValue(aiContractFreezeManifest?.registered_contract_key_count)}.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Frozen / returned keys</div>
                    <div className="card__value">{numberValue(aiContractFreezeManifest?.frozen_key_count)} / {numberValue(aiContractFreezeManifest?.returned_key_count)}</div>
                    <div className="card__subtext">Frozen response keys compared with actual unified AI response keys.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Placeholder panels allowed</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiContractFreezeManifest?.change_control_policy?.static_placeholder_panels_allowed ? 'Yes' : 'No'}</div>
                    <div className="card__subtext">Prevents static frontend-only AI panels without a backend response contract.</div>
                  </div>
                </div>
                {aiContractFreezeManifest?.contract_version_alignment_policy ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">Contract version alignment policy</div>
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
                    <div className="card__label">Frozen panel manifest</div>
                    <ul style={{ marginBottom: 0 }}>
                      {aiContractFreezeManifest.required_frontend_panel_manifest.slice(0, 8).map((panel) => (
                        <li key={panel.response_key}>
                          <strong>{formatLabel(panel.response_key)}</strong>: {panel.required_frontend_panel_key} · {panel.required_frontend_panel_dom_attribute || 'DOM anchor not registered'} — {panel.breaking_change_rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiContractFreezeManifest?.missing_response_keys?.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    Freeze manifest missing response keys: {aiContractFreezeManifest.missing_response_keys.map(formatLabel).join(', ')}
                  </p>
                ) : null}
              </div>

              <div className="card" style={{ marginTop: 16 }} data-ai-contract-panel="response_contract_audit">
                <div className="card__label">Unified AI response contract audit</div>
                <p className="card__subtext">
                  Contract-freeze audit for the unified AI summary response. It verifies that every platform-wide AI governance panel is backed by a real backend response key and that those keys preserve the read-only safety contract.
                </p>
                <div className="card-grid" style={{ ...gridStyle, marginTop: 12 }}>
                  <div className="card">
                    <div className="card__label">Contract status</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiResponseContractAudit?.contract_status)}</div>
                    <div className="card__subtext">Backend contract-audit result for unified AI response keys.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Expected / returned keys</div>
                    <div className="card__value">{numberValue(aiResponseContractAudit?.expected_key_count)} / {numberValue(aiResponseContractAudit?.returned_key_count)}</div>
                    <div className="card__subtext">Expected unified AI summary keys compared with actual returned keys.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Missing / unexpected</div>
                    <div className="card__value">{numberValue(aiResponseContractAudit?.missing_response_keys?.length)} / {numberValue(aiResponseContractAudit?.unexpected_response_keys?.length)}</div>
                    <div className="card__subtext">Contract drift that must be fixed before adding more AI panels.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Safety-contract gaps</div>
                    <div className="card__value">{numberValue(aiResponseContractAudit?.missing_or_unsafe_safety_contract_keys?.length)}</div>
                    <div className="card__subtext">Unified AI response objects missing a safe read-only contract.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Safety coverage</div>
                    <div className="card__value">{numberValue(aiResponseContractAudit?.safety_contract_coverage_percent)}%</div>
                    <div className="card__subtext">Expected unified AI objects covered by read-only safety contracts, including the audit object itself.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Self-audit included</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{aiResponseContractAudit?.response_contract_self_included ? 'Yes' : 'No'}</div>
                    <div className="card__subtext">Confirms the response contract audit panel is itself part of the frozen backend/frontend contract.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Frontend panel contract</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(aiResponseContractAudit?.frontend_panel_contract_status)}</div>
                    <div className="card__subtext">Required panels: {numberValue(aiResponseContractAudit?.required_frontend_panel_count)} · static placeholders allowed: {aiResponseContractAudit?.frontend_panel_coverage_policy?.static_placeholder_panels_allowed ? 'yes' : 'no'} · DOM anchors required: {aiResponseContractAudit?.frontend_panel_coverage_policy?.frontend_panels_must_have_stable_dom_contract_anchors ? 'yes' : 'no'}.</div>
                  </div>
                  <div className="card">
                    <div className="card__label">Runtime anchor self-check</div>
                    <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(frontendRuntimeAnchorSelfCheck.status)}</div>
                    <div className="card__subtext">Order status: {formatLabel(frontendRuntimeAnchorSelfCheck.order_status)}.</div>
                    <div className="card__subtext">Backend required anchors: {numberValue(frontendRuntimeAnchorSelfCheck.backend_required_panel_count)} · frontend declared anchors: {numberValue(frontendRuntimeAnchorSelfCheck.frontend_declared_anchor_count)} · order mismatches: {numberValue(frontendRuntimeAnchorSelfCheck.order_mismatches.length)}.</div>
                  </div>
                </div>
                {aiResponseContractAudit?.frontend_required_panels?.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">Required frontend-backed panels</div>
                    <ul style={{ marginBottom: 0 }}>
                      {aiResponseContractAudit.frontend_required_panels.slice(0, 8).map((panel) => (
                        <li key={panel.response_key}>
                          <strong>{panel.required_panel_label || formatLabel(panel.response_key)}</strong>: {panel.required_rendering} · {panel.required_panel_dom_attribute || 'DOM anchor not registered'} · Placeholder allowed: {panel.static_placeholder_allowed ? 'yes' : 'no'}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {aiResponseContractAudit?.frontend_runtime_anchor_self_check_contract ? (
                  <div style={{ marginTop: 14 }}>
                    <div className="card__label">Frontend runtime anchor self-check contract</div>
                    <p className="card__subtext">{aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.failure_policy}</p>
                    <div className="card__subtext">Order sensitive: {aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.order_sensitive ? 'yes' : 'no'} · aligned value: {aiResponseContractAudit.frontend_runtime_anchor_self_check_contract.ordered_status_value || 'not registered'}.</div>
                  </div>
                ) : null}
                {frontendRuntimeAnchorSelfCheck.missing_frontend_anchors.length || frontendRuntimeAnchorSelfCheck.unexpected_frontend_anchors.length || frontendRuntimeAnchorSelfCheck.order_mismatches.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    Frontend DOM-anchor drift: missing {frontendRuntimeAnchorSelfCheck.missing_frontend_anchors.map(formatLabel).join(', ') || 'none'}; unexpected {frontendRuntimeAnchorSelfCheck.unexpected_frontend_anchors.map(formatLabel).join(', ') || 'none'}; order mismatches {frontendRuntimeAnchorSelfCheck.order_mismatches.map((row) => `${row.index + 1}: ${formatLabel(row.expected)} != ${formatLabel(row.actual || 'missing')}`).join(', ') || 'none'}.
                  </p>
                ) : null}
                {aiResponseContractAudit?.missing_response_keys?.length ? (
                  <p className="form-error" style={{ marginTop: 12 }}>
                    Missing unified AI response keys: {aiResponseContractAudit.missing_response_keys.map(formatLabel).join(', ')}
                  </p>
                ) : null}
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
        {reviewActionMessage ? (
          <div className="card ai-review-page__feedback" style={{ marginBottom: 12 }} role="status" aria-live="polite">
            <p className="card__subtext">{reviewActionMessage}</p>
          </div>
        ) : null}
        <div className="card">
          <div style={toolbarStyle}>
            <select aria-label="AI operation domain" style={selectStyle} value={aiOperationDomain} onChange={(event) => setAiOperationDomain(event.target.value as 'all' | AIOperationDomain)}>
              {DOMAIN_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select aria-label="AI review state" style={selectStyle} value={reviewState} onChange={(event) => setReviewState(event.target.value as 'all' | ReviewState)}>
              {REVIEW_STATE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select aria-label="AI review urgency" style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | Urgency)}>
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
              {guidance.review_queue_guidance || 'Review source confidence, explainability, structured evidence, and approval requirements before acting elsewhere.'}
            </p>
          )}
        </div>
      </section>

      <section className="section" id="ai-review-queue" style={{ scrollMarginTop: 16 }}>
        <div className="section__title">Review queue</div>
        {reviews.length === 0 && !reviewQuery.isLoading ? (
          <div className="empty-state">No AI review items match the selected filters.</div>
        ) : (
          <div style={reviewListStyle}>
            {reviews.map((review) => {
              const sourcePath = sourceReviewToAppPath(review);
              const confidence = review.confidence_visualization;
              const evidencePreview = review.simulation_preview;
              const lifecycle = review.lifecycle;
              const sourceActionId = review.source_action_id || '';
              const decisionDraft = reviewDecisionDrafts[sourceActionId] || defaultReviewDecisionDraft;
              const allowedDecisions = lifecycle?.allowed_decisions || [];
              const visibleDecisionOptions = REVIEW_DECISION_OPTIONS.filter((option) => allowedDecisions.includes(option.value));
              const selectedDecision = visibleDecisionOptions.some((option) => option.value === decisionDraft.decision)
                ? decisionDraft.decision
                : visibleDecisionOptions[0]?.value;
              const decisionValidationMessage = reviewDecisionValidationMessage(selectedDecision, decisionDraft);
              const historyIsSelected = selectedHistorySourceActionId === sourceActionId;
              return (
                <article className="card" key={review.review_id} id={sourceActionId ? `ai-review-${sourceActionId}` : undefined} tabIndex={-1} style={{ scrollMarginTop: 16 }}>
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
                      <div className="card__label">Source confidence</div>
                      <strong>{formatPercent(confidence?.confidence_score)}</strong>
                      <div className="card__subtext">{formatLabel(confidence?.confidence_band)} · {formatLabel(confidence?.score_source)} · advisory only</div>
                    </div>
                    <div>
                      <div className="card__label">Evidence preview</div>
                      <strong>{evidencePreview?.preview_available ? 'Structured evidence available' : 'Metadata only'}</strong>
                      <div className="card__subtext">{formatLabel(evidencePreview?.preview_kind)}</div>
                    </div>
                    <div>
                      <div className="card__label">Updated</div>
                      <strong>{formatDateTime(review.updated_at || review.created_at)}</strong>
                    </div>
                  </div>

                  {evidencePreview?.preview_summary ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Evidence summary</div>
                      <p className="card__subtext">{evidencePreview.preview_summary}</p>
                    </div>
                  ) : null}

                  {review.source_reference?.source_id ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="card__label">Source record</div>
                      <p className="card__subtext">{formatLabel(review.source_reference.source_type)} · {review.source_reference.source_id}</p>
                    </div>
                  ) : null}

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

                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color, #d9dde5)' }}>
                    <div className="card__label">Persisted review lifecycle</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <span style={badgeStyle}>Status: {formatLabel(lifecycle?.current_status || review.review_state)}</span>
                      <span style={badgeStyle}>{lifecycle?.persisted ? `Version ${lifecycle.version || 1}` : 'Not yet reviewed'}</span>
                      {lifecycle?.reviewer_role ? <span style={badgeStyle}>Reviewer: {formatLabel(lifecycle.reviewer_role)}</span> : null}
                    </div>
                    {lifecycle?.reviewer_notes ? <p className="card__subtext" style={{ marginTop: 8 }}>Latest notes: {lifecycle.reviewer_notes}</p> : null}
                    {lifecycle?.override_reason ? <p className="card__subtext">Override reason: {lifecycle.override_reason}</p> : null}
                    {lifecycle?.execution_request_id ? (
                      <p className="card__subtext">Execution Request draft: {lifecycle.execution_request_id}</p>
                    ) : null}
                  </div>

                  {capabilities.canGovernDecisionIntelligence && sourceActionId && visibleDecisionOptions.length ? (
                    <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--border-color, #d9dde5)', borderRadius: 8 }}>
                      <div className="card__label">Record human decision</div>
                      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginTop: 10 }}>
                        <label>
                          <span className="card__subtext">Decision</span>
                          <select
                            style={{ ...selectStyle, width: '100%', marginTop: 4 }}
                            value={selectedDecision}
                            onChange={(event) => updateReviewDecisionDraft(sourceActionId, { decision: event.target.value as ReviewDecision })}
                          >
                            {visibleDecisionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="card__subtext">Reason category</span>
                          <select
                            style={{ ...selectStyle, width: '100%', marginTop: 4 }}
                            value={decisionDraft.reason_category}
                            onChange={(event) => updateReviewDecisionDraft(sourceActionId, { reason_category: event.target.value })}
                          >
                            <option value="">Select when required</option>
                            {REVIEW_REASON_OPTIONS.map((reason) => <option key={reason} value={reason}>{formatLabel(reason)}</option>)}
                          </select>
                        </label>
                      </div>
                      <label style={{ display: 'block', marginTop: 10 }}>
                        <span className="card__subtext">Reviewer notes</span>
                        <textarea
                          style={{ width: '100%', minHeight: 74, marginTop: 4, padding: 8 }}
                          value={decisionDraft.reviewer_notes}
                          maxLength={2000}
                          onChange={(event) => updateReviewDecisionDraft(sourceActionId, { reviewer_notes: event.target.value })}
                          placeholder="Record the evidence considered and why this decision is appropriate."
                        />
                      </label>
                      {decisionDraft.reason_category === 'business_policy_exception' ? (
                        <label style={{ display: 'block', marginTop: 10 }}>
                          <span className="card__subtext">Override reason</span>
                          <textarea
                            style={{ width: '100%', minHeight: 64, marginTop: 4, padding: 8 }}
                            value={decisionDraft.override_reason}
                            maxLength={2000}
                            onChange={(event) => updateReviewDecisionDraft(sourceActionId, { override_reason: event.target.value })}
                            placeholder="Required for a business policy exception."
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
                        {reviewDecisionMutation.isPending ? 'Recording…' : 'Record review decision'}
                      </button>
                    </div>
                  ) : null}

                  {historyIsSelected ? (
                    <div style={{ marginTop: 14, padding: 12, border: '1px solid var(--border-color, #d9dde5)', borderRadius: 8 }}>
                      <div className="card__label">Review history</div>
                      {reviewHistoryQuery.isLoading ? <p className="card__subtext">Loading review history…</p> : null}
                      {reviewHistoryQuery.error ? <p className="form-error">{reviewHistoryQuery.error instanceof Error ? reviewHistoryQuery.error.message : 'Unable to load review history.'}</p> : null}
                      {!reviewHistoryQuery.isLoading && !(reviewHistoryQuery.data?.events?.length) ? <p className="card__subtext">No persisted review events yet.</p> : null}
                      {(reviewHistoryQuery.data?.events || []).map((event) => (
                        <div key={event.id || `${event.event_type}-${event.created_at}`} style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color, #d9dde5)' }}>
                          <strong>{formatLabel(event.event_type)}</strong>
                          <div className="card__subtext">{formatLabel(event.from_status)} → {formatLabel(event.to_status)} · {formatDateTime(event.created_at)}</div>
                          {event.reason_category ? <div className="card__subtext">Reason: {formatLabel(event.reason_category)}</div> : null}
                          {event.reviewer_notes ? <div className="card__subtext">Notes: {event.reviewer_notes}</div> : null}
                          {event.execution_request_id ? <div className="card__subtext">Execution Request: {event.execution_request_id}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    {sourcePath ? <Link className="button button--secondary" to={sourcePath}>Open source surface</Link> : null}
                    <Link className="button button--secondary" to="/action-center">Open action center</Link>
                    {sourceActionId ? (
                      <button
                        className="button button--secondary"
                        type="button"
                        onClick={() => setSelectedHistorySourceActionId(historyIsSelected ? null : sourceActionId)}
                      >
                        {historyIsSelected ? 'Hide review history' : 'View review history'}
                      </button>
                    ) : null}
                    {capabilities.canGovernDecisionIntelligence
                      && capabilities.canCreateExecutionRequests
                      && lifecycle?.current_status === 'approved_for_manual_action'
                      && sourceActionId ? (
                        <button
                          className="button button--primary"
                          type="button"
                          disabled={executionRequestDraftMutation.isPending}
                          data-skip-global-action-feedback="true"
                          onClick={() => executionRequestDraftMutation.mutate(sourceActionId)}
                        >
                          {executionRequestDraftMutation.isPending ? 'Creating draft…' : 'Create Execution Request draft'}
                        </button>
                      ) : null}
                    {lifecycle?.execution_request_id ? <Link className="button button--secondary" to={`/execution-requests?request_id=${encodeURIComponent(lifecycle.execution_request_id)}`} data-skip-global-action-feedback="true">Open linked Execution Request</Link> : null}
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
