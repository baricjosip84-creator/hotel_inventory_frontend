import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';

type FeedbackMode = 'learning-outcomes' | 'forecast-accuracy' | 'policy-effectiveness' | 'optimization-results';

type ContinuousLearningSummary = {
  tenant_id?: string;
  feature?: string;
  filters?: Record<string, unknown>;
  outcomes?: Array<Record<string, unknown>>;
  forecast_accuracy?: Array<Record<string, unknown>>;
  policy_effectiveness?: Array<Record<string, unknown>>;
  optimization_results?: Array<Record<string, unknown>>;
  recommendation_outcome_foundation?: {
    phase?: string;
    phase_name?: string;
    phase_step?: string;
    foundation_type?: string;
    completion_definition?: string;
    recommendation_outcome_count?: number;
    linked_recommendation_outcome_count?: number;
    measured_recommendation_outcome_count?: number;
    lifecycle_generated_count?: number;
    lifecycle_approved_count?: number;
    lifecycle_executed_count?: number;
    lifecycle_measured_count?: number;
    lifecycle_scored_count?: number;
    execution_linked_recommendation_outcome_count?: number;
    full_lifecycle_trace_count?: number;
    business_value_measured_count?: number;
    impact_measured_count?: number;
    measurement_window_count?: number;
    validated_recommendation_outcome_count?: number;
    negative_recommendation_outcome_count?: number;
    needs_review_recommendation_outcome_count?: number;
    successful_recommendation_outcome_count?: number;
    partially_successful_recommendation_outcome_count?: number;
    neutral_recommendation_outcome_count?: number;
    failed_recommendation_outcome_count?: number;
    inconclusive_recommendation_outcome_count?: number;
    unclassified_recommendation_outcome_count?: number;
    recommendation_outcome_review_required_count?: number;
    recommendation_outcome_classified_count?: number;
    financial_impact_measured_count?: number;
    positive_financial_impact_count?: number;
    negative_financial_impact_count?: number;
    stockout_prevented_count?: number;
    overstock_prevented_count?: number;
    waste_reduction_outcome_count?: number;
    service_level_improved_outcome_count?: number;
    business_impact_evidence_count?: number;
    total_financial_impact_amount?: number;
    total_waste_reduced_quantity?: number;
    average_service_level_delta_percent?: number | null;
    outcome_link_coverage_percent?: number;
    outcome_measurement_coverage_percent?: number;
    full_lifecycle_trace_coverage_percent?: number;
    impact_measurement_coverage_percent?: number;
    outcome_classification_coverage_percent?: number;
    business_impact_evidence_coverage_percent?: number;
    target_evidence_coverage_percent?: number;
    target_attainment_rate_percent?: number;
    financial_impact_coverage_percent?: number;
    target_evidence_count?: number;
    baseline_target_outcome_count?: number;
    actual_target_outcome_count?: number;
    target_met_count?: number;
    target_missed_count?: number;
    measurement_quality_evidence_count?: number;
    measurement_method_count?: number;
    measurement_source_count?: number;
    measurement_owner_count?: number;
    measurement_sample_count?: number;
    measurement_data_quality_count?: number;
    low_measurement_quality_count?: number;
    attribution_evidence_count?: number;
    attribution_method_count?: number;
    attribution_confidence_count?: number;
    low_attribution_confidence_count?: number;
    counterfactual_reference_count?: number;
    recommendation_review_open_count?: number;
    recommendation_review_resolved_count?: number;
    recommendation_review_rejected_count?: number;
    recommendation_review_deferred_count?: number;
    recommendation_review_evidence_count?: number;
    recommendation_reviewed_count?: number;
    recommendation_evaluation_scheduled_count?: number;
    recommendation_evaluation_completed_count?: number;
    recommendation_evaluation_overdue_count?: number;
    recommendation_evaluation_waived_count?: number;
    recommendation_evaluation_owner_count?: number;
    recommendation_evaluation_evidence_count?: number;
    recommendation_outcome_audit_packet_count?: number;
    recommendation_outcome_fingerprinted_count?: number;
    recommendation_outcome_duplicate_fingerprint_count?: number;
    recommendation_outcome_acceptance_accepted_count?: number;
    recommendation_outcome_acceptance_rejected_count?: number;
    recommendation_outcome_acceptance_deferred_count?: number;
    recommendation_outcome_acceptance_pending_count?: number;
    recommendation_outcome_acceptance_owner_count?: number;
    recommendation_outcome_acceptance_timestamp_count?: number;
    recommendation_outcome_acceptance_evidence_count?: number;
    recommendation_outcome_acceptance_integrity_ready_count?: number;
    recommendation_outcome_acceptance_integrity_blocked_count?: number;
    recommendation_outcome_acceptance_integrity_pending_count?: number;
    recommendation_outcome_acceptance_integrity_evidence_count?: number;
    recommendation_outcome_corrective_action_required_count?: number;
    recommendation_outcome_corrective_action_resolved_count?: number;
    recommendation_outcome_corrective_action_open_count?: number;
    recommendation_outcome_corrective_action_overdue_count?: number;
    recommendation_outcome_corrective_action_owner_count?: number;
    recommendation_outcome_corrective_action_evidence_count?: number;
    recommendation_outcome_corrective_action_blocked_count?: number;
    recommendation_outcome_portfolio_count?: number;
    recommendation_outcome_commercially_supported_portfolio_count?: number;
    recommendation_outcome_portfolio_review_required_count?: number;
    recommendation_outcome_learning_signal_count?: number;
    recommendation_outcome_learning_signal_evidence_count?: number;
    recommendation_outcome_learning_signal_next_action_count?: number;
    recommendation_outcome_reinforce_signal_count?: number;
    recommendation_outcome_tune_signal_count?: number;
    recommendation_outcome_suppress_signal_count?: number;
    recommendation_outcome_review_signal_count?: number;
    recommendation_outcome_learning_action_assigned_count?: number;
    recommendation_outcome_learning_action_completed_count?: number;
    recommendation_outcome_learning_action_owner_count?: number;
    recommendation_outcome_learning_action_evidence_count?: number;
    recommendation_outcome_learning_action_overdue_count?: number;
    recommendation_outcome_learning_action_blocked_count?: number;
    recommendation_outcome_learning_action_escalation_required_count?: number;
    recommendation_outcome_learning_action_escalation_clear_percent?: number;
    recommendation_outcome_learning_action_escalation_evidence?: {
      escalation_posture?: string;
      learning_action_count?: number;
      blocked_learning_action_count?: number;
      overdue_learning_action_count?: number;
      escalation_required_count?: number;
      escalation_items?: Array<{
        outcome_key?: string;
        recommendation_id?: string | null;
        recommendation_key?: string | null;
        learning_signal?: string;
        learning_action_status?: string;
        learning_action_owner?: string | null;
        learning_action_due_at?: string | null;
        escalation_reason?: string;
      }>;
    };
    recommendation_outcome_portfolio_commercial_support_coverage_percent?: number;
    recommendation_outcome_portfolio_evidence?: {
      portfolio_count?: number;
      commercially_supported_portfolio_count?: number;
      portfolio_review_required_count?: number;
      portfolio_commercial_support_coverage_percent?: number;
      portfolio_posture?: string;
      portfolio_evidence_items?: Array<{
        recommendation_portfolio_key?: string;
        learning_domain?: string;
        outcome_count?: number;
        successful_count?: number;
        partially_successful_count?: number;
        failed_count?: number;
        accepted_count?: number;
        corrective_action_required_count?: number;
        corrective_action_resolved_count?: number;
        total_financial_impact_amount?: number;
        financial_impact_currency?: string | null;
        success_rate_percent?: number;
        failure_rate_percent?: number;
        acceptance_rate_percent?: number;
        corrective_action_closure_rate_percent?: number;
        average_measurement_quality_score?: number | null;
        average_attribution_confidence_score?: number | null;
        portfolio_posture?: string;
      }>;
    };
    commercially_ready_recommendation_outcome_count?: number;
    commercially_blocked_recommendation_outcome_count?: number;
    recommendation_outcome_commercial_readiness_score_percent?: number;
    recommendation_outcome_commercial_readiness_gate_status?: string;
    recommendation_outcome_commercial_readiness_blocker_count?: number;
    recommendation_outcome_commercial_readiness_blockers?: Array<{
      blocker_key?: string;
      blocker_label?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      manual_resolution_task?: string;
    }>;
    recommendation_outcome_phase_a_closure_status?: string;
    recommendation_outcome_phase_a_capability_status?: string;
    recommendation_outcome_phase_a_closure_evidence?: {
      closure_status?: string;
      implemented_capability_status?: string;
      runtime_data_status?: string;
      closure_definition?: string;
      implemented_capabilities?: string[];
      outcome_count?: number;
      commercially_ready_outcome_count?: number;
      blocker_count?: number;
      readiness_score_percent?: number;
      next_phase?: string;
    };
    measurement_quality_evidence_coverage_percent?: number;
    measurement_method_coverage_percent?: number;
    measurement_source_coverage_percent?: number;
    measurement_owner_coverage_percent?: number;
    attribution_evidence_coverage_percent?: number;
    attribution_method_coverage_percent?: number;
    counterfactual_reference_coverage_percent?: number;
    recommendation_review_resolution_coverage_percent?: number;
    recommendation_review_evidence_coverage_percent?: number;
    recommendation_evaluation_schedule_coverage_percent?: number;
    recommendation_evaluation_completion_coverage_percent?: number;
    recommendation_evaluation_evidence_coverage_percent?: number;
    recommendation_outcome_audit_packet_coverage_percent?: number;
    recommendation_outcome_fingerprint_coverage_percent?: number;
    recommendation_outcome_acceptance_coverage_percent?: number;
    recommendation_outcome_acceptance_evidence_coverage_percent?: number;
    recommendation_outcome_acceptance_integrity_coverage_percent?: number;
    recommendation_outcome_acceptance_integrity_evidence_coverage_percent?: number;
    recommendation_outcome_corrective_action_resolution_coverage_percent?: number;
    recommendation_outcome_corrective_action_evidence_coverage_percent?: number;
    recommendation_outcome_learning_signal_coverage_percent?: number;
    recommendation_outcome_learning_signal_evidence_coverage_percent?: number;
    recommendation_outcome_learning_action_completion_percent?: number;
    recommendation_outcome_learning_action_evidence_coverage_percent?: number;
    recommendation_outcome_commercial_readiness_coverage_percent?: number;
    average_measurement_data_quality_score?: number | null;
    average_attribution_confidence_score?: number | null;
    recommendation_outcome_success_rate_percent?: number;
    recommendation_outcome_failure_rate_percent?: number;
    average_outcome_score?: number | null;
    average_business_value_score?: number | null;
    average_stock_impact_score?: number | null;
    average_financial_impact_score?: number | null;
    average_waste_impact_score?: number | null;
    average_service_level_impact_score?: number | null;
    average_outcome_confidence_score?: number | null;
    posture?: string;
    safety_contract?: Record<string, boolean>;
  };

  feedback_action_plan?: {
    plan_type?: string;
    execution_mode?: string;
    action_count?: number;
    high_priority_action_count?: number;
    medium_priority_action_count?: number;
    next_review_focus?: string;
    recommended_actions?: Array<{
      action_key?: string;
      action_type?: string;
      priority?: string;
      evidence_count?: number;
      affected_domains?: string[];
      rationale?: string;
      recommended_owner?: string;
      execution_mode?: string;
      autonomous_execution?: boolean;
      model_training_triggered?: boolean;
      autonomous_policy_update?: boolean;
      operational_state_mutation?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_rollout_readiness?: {
    rollout_readiness_type?: string;
    execution_mode?: string;
    rollout_decision?: string;
    rollout_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    validated_outcome_count?: number;
    covered_domain_count?: number;
    open_review_pressure_count?: number;
    recommended_rollout_owner?: string;
    next_rollout_focus?: string;
    rollout_blockers?: string[];
    rollout_decision_options?: string[];
    rollout_readiness_note?: string;
    linked_rollout_baselines?: Record<string, unknown>;
    rollout_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      rollout_evidence?: string;
      manual_rollout_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_rollout_governance?: {
    rollout_governance_type?: string;
    execution_mode?: string;
    governance_decision?: string;
    rollout_governance_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    open_review_pressure_count?: number;
    recommended_governance_owner?: string;
    next_governance_focus?: string;
    governance_blockers?: string[];
    governance_decision_options?: string[];
    governance_note?: string;
    linked_governance_baselines?: Record<string, unknown>;
    governance_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      governance_evidence?: string;
      manual_governance_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_multi_tenant_rollout_controls?: {
    rollout_control_type?: string;
    execution_mode?: string;
    rollout_control_decision?: string;
    rollout_control_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    open_review_pressure_count?: number;
    recommended_rollout_control_owner?: string;
    next_rollout_control_focus?: string;
    tenant_wave_policy?: Record<string, string>;
    rollout_control_blockers?: string[];
    rollout_control_decision_options?: string[];
    rollout_control_note?: string;
    linked_control_baselines?: Record<string, unknown>;
    rollout_control_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      control_evidence?: string;
      manual_control_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_adoption_readiness?: {
    adoption_readiness_type?: string;
    execution_mode?: string;
    adoption_decision?: string;
    adoption_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    validated_pilot_outcome_count?: number;
    covered_domain_count?: number;
    coverage_gap_count?: number;
    recommended_adoption_owner?: string;
    next_adoption_focus?: string;
    adoption_policy?: Record<string, string>;
    adoption_blockers?: string[];
    adoption_decision_options?: string[];
    adoption_note?: string;
    linked_adoption_baselines?: Record<string, unknown>;
    adoption_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      adoption_evidence?: string;
      manual_adoption_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };




  closed_loop_enterprise_activation_plan?: {
    activation_plan_type?: string;
    execution_mode?: string;
    activation_decision?: string;
    activation_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    learning_signal_score?: number;
    drift_pressure_score?: number;
    covered_domain_count?: number;
    recommended_activation_owner?: string;
    next_activation_focus?: string;
    activation_policy?: Record<string, string>;
    activation_blockers?: string[];
    activation_decision_options?: string[];
    activation_note?: string;
    linked_activation_baselines?: Record<string, unknown>;
    activation_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      activation_evidence?: string;
      manual_activation_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };





  closed_loop_enterprise_activation_stabilization_plan?: {
    activation_stabilization_plan_type?: string;
    execution_mode?: string;
    stabilization_decision?: string;
    stabilization_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_stabilization_owner?: string;
    next_stabilization_focus?: string;
    stabilization_policy?: Record<string, string>;
    stabilization_blockers?: string[];
    stabilization_decision_options?: string[];
    stabilization_note?: string;
    linked_stabilization_baselines?: Record<string, unknown>;
    stabilization_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      stabilization_evidence?: string;
      manual_stabilization_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_enterprise_activation_support_readiness?: {
    activation_support_readiness_type?: string;
    execution_mode?: string;
    support_readiness_decision?: string;
    support_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_support_owner?: string;
    next_support_focus?: string;
    support_readiness_policy?: Record<string, string>;
    support_readiness_blockers?: string[];
    support_readiness_decision_options?: string[];
    support_readiness_note?: string;
    linked_support_baselines?: Record<string, unknown>;
    support_readiness_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      support_evidence?: string;
      manual_support_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };



  closed_loop_enterprise_activation_value_assurance?: {
    activation_value_assurance_type?: string;
    execution_mode?: string;
    value_assurance_decision?: string;
    value_assurance_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    positive_outcome_count?: number;
    negative_outcome_count?: number;
    recommended_value_assurance_owner?: string;
    next_value_assurance_focus?: string;
    value_assurance_policy?: Record<string, string>;
    value_assurance_blockers?: string[];
    value_assurance_decision_options?: string[];
    value_assurance_note?: string;
    linked_value_assurance_baselines?: Record<string, unknown>;
    value_assurance_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      value_assurance_evidence?: string;
      manual_value_assurance_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_activation_value_realization_review?: {
    activation_value_realization_review_type?: string;
    execution_mode?: string;
    value_realization_decision?: string;
    value_realization_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    validated_outcome_count?: number;
    open_or_rejected_outcome_count?: number;
    positive_outcome_score_total?: number;
    negative_outcome_score_total?: number;
    recommended_value_realization_owner?: string;
    next_value_realization_focus?: string;
    value_realization_policy?: Record<string, string>;
    value_realization_blockers?: string[];
    value_realization_decision_options?: string[];
    value_realization_note?: string;
    linked_value_realization_baselines?: Record<string, unknown>;
    value_realization_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      realization_evidence?: string;
      manual_realization_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_value_expansion_decision?: {
    enterprise_value_expansion_decision_type?: string;
    execution_mode?: string;
    expansion_decision?: string;
    expansion_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    validated_outcome_count?: number;
    negative_outcome_count?: number;
    recommended_expansion_owner?: string;
    next_expansion_focus?: string;
    expansion_policy?: Record<string, string>;
    expansion_blockers?: string[];
    expansion_decision_options?: string[];
    expansion_note?: string;
    linked_expansion_baselines?: Record<string, unknown>;
    expansion_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      expansion_evidence?: string;
      manual_expansion_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };



  closed_loop_enterprise_value_expansion_operating_model?: {
    enterprise_value_expansion_operating_model_type?: string;
    execution_mode?: string;
    operating_model_decision?: string;
    operating_model_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    unresolved_review_pressure_count?: number;
    covered_domain_count?: number;
    recommended_operating_model_owner?: string;
    next_operating_model_focus?: string;
    operating_model_policy?: Record<string, string>;
    operating_model_blockers?: string[];
    operating_model_decision_options?: string[];
    operating_model_note?: string;
    linked_operating_model_baselines?: Record<string, unknown>;
    operating_model_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      operating_model_evidence?: string;
      manual_operating_model_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_enterprise_expansion_governance_cadence?: {
    enterprise_expansion_governance_cadence_type?: string;
    execution_mode?: string;
    cadence_decision?: string;
    cadence_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    unresolved_review_pressure_count?: number;
    recommended_cadence_owner?: string;
    next_cadence_focus?: string;
    cadence_policy?: Record<string, string>;
    cadence_blockers?: string[];
    cadence_decision_options?: string[];
    cadence_note?: string;
    linked_cadence_baselines?: Record<string, unknown>;
    cadence_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      cadence_evidence?: string;
      manual_cadence_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_activation_cutover_readiness?: {
    activation_cutover_readiness_type?: string;
    execution_mode?: string;
    cutover_decision?: string;
    cutover_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_cutover_owner?: string;
    next_cutover_focus?: string;
    cutover_policy?: Record<string, string>;
    cutover_blockers?: string[];
    cutover_decision_options?: string[];
    cutover_note?: string;
    linked_cutover_baselines?: Record<string, unknown>;
    cutover_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      cutover_evidence?: string;
      manual_cutover_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_activation_rollback_plan?: {
    activation_rollback_plan_type?: string;
    execution_mode?: string;
    rollback_decision?: string;
    rollback_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_rollback_owner?: string;
    next_rollback_focus?: string;
    rollback_policy?: Record<string, string>;
    rollback_blockers?: string[];
    rollback_decision_options?: string[];
    rollback_note?: string;
    linked_rollback_baselines?: Record<string, unknown>;
    rollback_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      rollback_evidence?: string;
      manual_rollback_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_enterprise_activation_runbook?: {
    activation_runbook_type?: string;
    execution_mode?: string;
    runbook_decision?: string;
    runbook_score?: number;
    ready_step_count?: number;
    blocked_step_count?: number;
    recommended_runbook_owner?: string;
    next_runbook_focus?: string;
    runbook_policy?: Record<string, string>;
    runbook_blockers?: string[];
    runbook_decision_options?: string[];
    runbook_note?: string;
    linked_runbook_baselines?: Record<string, unknown>;
    runbook_steps?: Array<{
      step_key?: string;
      step_label?: string;
      step_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      runbook_evidence?: string;
      manual_runbook_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  feedback_review_board?: {
    board_type?: string;
    execution_mode?: string;
    review_item_count?: number;
    domain_count?: number;
    high_priority_domain_count?: number;
    review_readiness_score?: number;
    review_posture?: string;
    domain_review_summary?: Array<{
      domain?: string;
      review_item_count?: number;
      evidence_types?: string[];
      statuses?: string[];
      priority?: string;
    }>;
    review_items?: Array<{
      evidence_type?: string;
      evidence_key?: string;
      domain?: string;
      status?: string;
      score?: number | string | null;
      observed_at?: string;
      review_reason?: string;
      recommended_resolution?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  learning_impact_assessment?: {
    assessment_type?: string;
    execution_mode?: string;
    total_evidence_count?: number;
    positive_evidence_count?: number;
    negative_evidence_count?: number;
    open_review_evidence_count?: number;
    learning_signal_score?: number;
    drift_pressure_score?: number;
    average_outcome_score?: number | null;
    average_forecast_percentage_error?: number | null;
    average_policy_effectiveness_score?: number | null;
    average_optimization_value_score?: number | null;
    impact_posture?: string;
    domain_impact_summary?: Array<{
      domain?: string;
      evidence_count?: number;
      review_pressure?: number;
      impact_posture?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };
  learning_coverage_matrix?: {
    matrix_type?: string;
    execution_mode?: string;
    tracked_domain_count?: number;
    covered_domain_count?: number;
    full_coverage_domain_count?: number;
    review_pressure_domain_count?: number;
    average_coverage_score?: number;
    coverage_posture?: string;
    coverage_rows?: Array<{
      domain?: string;
      learning_outcome_count?: number;
      forecast_accuracy_count?: number;
      policy_effectiveness_count?: number;
      optimization_result_count?: number;
      total_evidence_count?: number;
      missing_evidence_types?: string[];
      review_pressure_count?: number;
      coverage_score?: number;
      coverage_posture?: string;
      recommended_next_capture?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };
  learning_maturity_roadmap?: {
    roadmap_type?: string;
    execution_mode?: string;
    roadmap_readiness_score?: number;
    roadmap_posture?: string;
    blocker_count?: number;
    blockers?: string[];
    next_maturity_focus?: string;
    phases?: Array<{
      phase_key?: string;
      maturity_layer?: string;
      readiness_score?: number;
      status?: string;
      recommended_next_step?: string;
      autonomous_execution?: boolean;
      autonomous_model_update?: boolean;
      autonomous_policy_update?: boolean;
      model_training_triggered?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_signoff_packet?: {
    packet_type?: string;
    execution_mode?: string;
    signoff_decision?: string;
    signoff_score?: number;
    required_signoff_count?: number;
    unresolved_section_count?: number;
    manual_signoff_required?: boolean;
    recommended_signoff_owner?: string;
    next_signoff_focus?: string;
    release_note?: string;
    linked_readiness?: Record<string, unknown>;
    signoff_sections?: Array<{
      section_key?: string;
      section_label?: string;
      readiness_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      evidence_count?: number;
      manual_signoff_required?: boolean;
      signoff_instruction?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_release_readiness_snapshot?: {
    snapshot_type?: string;
    execution_mode?: string;
    release_decision?: string;
    release_readiness_score?: number;
    ready_lane_count?: number;
    blocked_lane_count?: number;
    total_evidence_count?: number;
    recommended_release_owner?: string;
    next_release_focus?: string;
    release_blockers?: string[];
    release_note?: string;
    linked_governance?: Record<string, unknown>;
    release_lane_checks?: Array<{
      lane_key?: string;
      lane_label?: string;
      lane_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      blocking_reason?: string | null;
      manual_action?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_operational_handoff?: {
    handoff_type?: string;
    execution_mode?: string;
    handoff_decision?: string;
    handoff_score?: number;
    ready_handoff_count?: number;
    blocked_handoff_count?: number;
    recommended_handoff_owner?: string;
    next_handoff_focus?: string;
    handoff_note?: string;
    linked_release?: Record<string, unknown>;
    handoff_items?: Array<{
      handoff_key?: string;
      source_lane?: string;
      owner_role?: string;
      handoff_status?: string;
      manual_task?: string;
      blocking_reason?: string | null;
      evidence_reference?: Record<string, unknown>;
      autonomous_execution?: boolean;
      operational_state_mutation?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };



  closed_loop_operational_acceptance?: {
    acceptance_type?: string;
    execution_mode?: string;
    acceptance_decision?: string;
    acceptance_score?: number;
    accepted_criteria_count?: number;
    blocked_criteria_count?: number;
    recommended_acceptance_owner?: string;
    next_acceptance_focus?: string;
    acceptance_note?: string;
    acceptance_blockers?: string[];
    linked_handoff?: Record<string, unknown>;
    acceptance_criteria?: Array<{
      criterion_key?: string;
      criterion_label?: string;
      criterion_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      manual_acceptance_task?: string;
      blocking_reason?: string | null;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_monitoring_readiness?: {
    readiness_type?: string;
    execution_mode?: string;
    monitoring_decision?: string;
    monitoring_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_monitoring_owner?: string;
    next_monitoring_focus?: string;
    monitoring_blockers?: string[];
    suggested_monitoring_cadence?: string;
    linked_acceptance?: Record<string, unknown>;
    monitoring_note?: string;
    monitoring_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      recommended_monitoring_control?: string;
      blocking_reason?: string | null;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_production_surveillance?: {
    surveillance_type?: string;
    execution_mode?: string;
    surveillance_decision?: string;
    surveillance_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_surveillance_owner?: string;
    next_surveillance_focus?: string;
    surveillance_blockers?: string[];
    suggested_surveillance_cadence?: string;
    linked_monitoring?: Record<string, unknown>;
    surveillance_note?: string;
    surveillance_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      recommended_surveillance_control?: string;
      blocking_reason?: string | null;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_exception_register?: {
    register_type?: string;
    execution_mode?: string;
    register_decision?: string;
    exception_count?: number;
    high_severity_count?: number;
    medium_severity_count?: number;
    recommended_exception_owner?: string;
    next_exception_focus?: string;
    exception_note?: string;
    linked_surveillance?: Record<string, unknown>;
    exceptions?: Array<{
      exception_key?: string;
      exception_source?: string;
      exception_status?: string;
      severity?: string;
      owner_role?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      exception_reason?: string | null;
      manual_resolution?: string;
      autonomous_execution?: boolean;
      model_training_triggered?: boolean;
      operational_state_mutation?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_resolution_plan?: {
    plan_type?: string;
    execution_mode?: string;
    resolution_decision?: string;
    resolution_plan_score?: number;
    resolution_step_count?: number;
    unresolved_high_severity_count?: number;
    unresolved_medium_severity_count?: number;
    recommended_resolution_owner?: string;
    next_resolution_focus?: string;
    resolution_note?: string;
    linked_exception_register?: Record<string, unknown>;
    resolution_steps?: Array<{
      step_number?: number;
      resolution_key?: string;
      exception_key?: string;
      severity?: string;
      owner_role?: string;
      resolution_status?: string;
      manual_resolution_task?: string;
      evidence_to_capture?: string;
      readiness_dependency?: string;
      expected_resolution_result?: string;
      autonomous_execution?: boolean;
      model_training_triggered?: boolean;
      autonomous_policy_update?: boolean;
      operational_state_mutation?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };



  closed_loop_closure_report?: {
    report_type?: string;
    execution_mode?: string;
    closure_decision?: string;
    closure_score?: number;
    closure_item_count?: number;
    unresolved_closure_count?: number;
    high_severity_closure_count?: number;
    recommended_closure_owner?: string;
    next_closure_focus?: string;
    closure_note?: string;
    linked_resolution?: Record<string, unknown>;
    closure_items?: Array<{
      closure_key?: string;
      source_resolution_key?: string | null;
      exception_key?: string | null;
      severity?: string;
      owner_role?: string;
      closure_status?: string;
      closure_evidence_required?: string;
      closure_validation_task?: string;
      autonomous_execution?: boolean;
      model_training_triggered?: boolean;
      autonomous_policy_update?: boolean;
      operational_state_mutation?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_certification_dossier?: {
    dossier_type?: string;
    execution_mode?: string;
    certification_decision?: string;
    certification_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_certification_owner?: string;
    next_certification_focus?: string;
    certification_blockers?: string[];
    certification_note?: string;
    linked_closure?: Record<string, unknown>;
    certification_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      certification_evidence?: string;
      manual_certification_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_audit_ledger?: {
    ledger_type?: string;
    execution_mode?: string;
    audit_ledger_decision?: string;
    audit_ledger_score?: number;
    ledger_entry_count?: number;
    blocked_entry_count?: number;
    ready_entry_count?: number;
    recommended_audit_owner?: string;
    next_audit_focus?: string;
    audit_blockers?: string[];
    audit_ledger_note?: string;
    linked_certification?: Record<string, unknown>;
    ledger_entries?: Array<{
      ledger_key?: string;
      ledger_stage?: string;
      ledger_status?: string;
      evidence_reference?: string;
      evidence_count?: number;
      retention_requirement?: string;
      manual_audit_task?: string;
      autonomous_execution?: boolean;
      model_training_triggered?: boolean;
      operational_state_mutation?: boolean;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_compliance_attestation?: {
    attestation_type?: string;
    execution_mode?: string;
    attestation_decision?: string;
    attestation_score?: number;
    attestable_check_count?: number;
    blocked_check_count?: number;
    recommended_attestation_owner?: string;
    next_attestation_focus?: string;
    attestation_blockers?: string[];
    attestation_note?: string;
    linked_audit?: Record<string, unknown>;
    attestation_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      attestation_evidence?: string;
      manual_attestation_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_commercial_readiness_packet?: {
    packet_type?: string;
    execution_mode?: string;
    commercial_readiness_decision?: string;
    commercial_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_executive_owner?: string;
    next_commercial_readiness_focus?: string;
    commercial_readiness_blockers?: string[];
    commercial_readiness_note?: string;
    linked_readiness?: Record<string, unknown>;
    readiness_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      packet_evidence?: string;
      manual_readiness_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_customer_pilot_readiness?: {
    pilot_type?: string;
    execution_mode?: string;
    pilot_decision?: string;
    pilot_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_pilot_owner?: string;
    next_pilot_focus?: string;
    pilot_blockers?: string[];
    pilot_readiness_note?: string;
    linked_pilot_readiness?: Record<string, unknown>;
    pilot_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      pilot_evidence?: string;
      manual_pilot_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };



  closed_loop_customer_pilot_launch_control?: {
    launch_control_type?: string;
    execution_mode?: string;
    launch_decision?: string;
    launch_control_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    recommended_launch_owner?: string;
    next_launch_focus?: string;
    launch_blockers?: string[];
    launch_control_note?: string;
    linked_launch_readiness?: Record<string, unknown>;
    launch_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      launch_evidence?: string;
      manual_launch_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_customer_pilot_success_criteria?: {
    success_criteria_type?: string;
    execution_mode?: string;
    success_tracking_decision?: string;
    success_criteria_score?: number;
    ready_criterion_count?: number;
    blocked_criterion_count?: number;
    recommended_success_owner?: string;
    next_success_focus?: string;
    pilot_success_blockers?: string[];
    success_exit_requirements?: string[];
    success_criteria_note?: string;
    linked_success_baselines?: Record<string, unknown>;
    success_criteria?: Array<{
      criterion_key?: string;
      criterion_label?: string;
      criterion_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      pilot_success_evidence?: string;
      manual_success_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };

  closed_loop_customer_pilot_outcome_review?: {
    outcome_review_type?: string;
    execution_mode?: string;
    outcome_review_decision?: string;
    pilot_outcome_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    validated_outcome_count?: number;
    positive_outcome_count?: number;
    negative_outcome_count?: number;
    open_review_pressure_count?: number;
    recommended_outcome_review_owner?: string;
    next_outcome_review_focus?: string;
    outcome_review_blockers?: string[];
    review_exit_decision_options?: string[];
    outcome_review_note?: string;
    linked_outcome_baselines?: Record<string, unknown>;
    outcome_review_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      review_evidence?: string;
      manual_review_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_customer_pilot_expansion_readiness?: {
    expansion_readiness_type?: string;
    execution_mode?: string;
    expansion_decision?: string;
    expansion_readiness_score?: number;
    ready_check_count?: number;
    blocked_check_count?: number;
    positive_validated_outcome_count?: number;
    negative_validated_outcome_count?: number;
    expansion_drift_pressure_count?: number;
    recommended_expansion_owner?: string;
    next_expansion_focus?: string;
    expansion_blockers?: string[];
    expansion_decision_options?: string[];
    expansion_readiness_note?: string;
    linked_expansion_baselines?: Record<string, unknown>;
    expansion_checks?: Array<{
      check_key?: string;
      check_label?: string;
      check_status?: string;
      current_value?: number | string | null;
      required_value?: number | string | null;
      expansion_evidence?: string;
      manual_expansion_task?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };


  closed_loop_governance_gate?: {
    gate_type?: string;
    execution_mode?: string;
    gate_decision?: string;
    gate_score?: number;
    passed_check_count?: number;
    blocked_check_count?: number;
    next_gate_focus?: string;
    required_manual_resolution?: string[];
    gate_checks?: Array<{
      check_key?: string;
      check_label?: string;
      status?: string;
      current_value?: number | string | null;
      threshold?: number | string | null;
      remediation?: string;
    }>;
    safety_contract?: Record<string, boolean>;
  };
  governance?: {
    continuous_learning_posture?: string;
    outcome_count?: number;
    forecast_accuracy_count?: number;
    policy_effectiveness_count?: number;
    optimization_result_count?: number;
    review_outcome_count?: number;
    recalibration_review_count?: number;
    ineffective_policy_count?: number;
    optimization_drift_count?: number;
    external_model_training?: boolean;
    autonomous_model_update?: boolean;
    autonomous_policy_update?: boolean;
    autonomous_recommendation_execution?: boolean;
    operational_state_mutation?: boolean;
    observed_domains?: string[];
  };
};

type FeedbackFormState = {
  domain: string;
  status: string;
  score: string;
  reference: string;
  expected: string;
  observed: string;
  recommendationKey: string;
  businessValueScore: string;
  stockImpactScore: string;
  financialImpactScore: string;
  wasteImpactScore: string;
  serviceLevelImpactScore: string;
  outcomeConfidenceScore: string;
  lifecycleStatus: string;
  generatedAt: string;
  approvedAt: string;
  executedAt: string;
  measuredAt: string;
  scoredAt: string;
  executionReference: string;
  lifecycleEvidence: string;
  outcomeClassification: string;
  outcomeReviewRequired: boolean;
  outcomeReviewReason: string;
  financialImpactAmount: string;
  financialImpactCurrency: string;
  stockoutPrevented: boolean;
  overstockPrevented: boolean;
  wasteReducedQuantity: string;
  serviceLevelDeltaPercent: string;
  businessImpactEvidence: string;
  baselineMetricValue: string;
  targetMetricValue: string;
  actualMetricValue: string;
  metricUnit: string;
  targetDirection: string;
  targetTolerancePercent: string;
  targetMet: string;
  targetEvidence: string;
  attributionMethod: string;
  attributionConfidenceScore: string;
  counterfactualReference: string;
  attributionEvidence: string;
  measurementMethod: string;
  measurementSource: string;
  measurementOwner: string;
  measurementSampleSize: string;
  measurementDataQualityScore: string;
  measurementQualityEvidence: string;
  reviewStatus: string;
  reviewOwner: string;
  reviewedAt: string;
  reviewResolution: string;
  reviewEvidence: string;
  evaluationDueAt: string;
  evaluationStatus: string;
  evaluationOwner: string;
  evaluationEvidence: string;
  acceptanceStatus: string;
  acceptanceOwner: string;
  acceptedAt: string;
  acceptanceEvidence: string;
  correctiveActionStatus: string;
  correctiveActionOwner: string;
  correctiveActionDueAt: string;
  correctiveActionResolvedAt: string;
  correctiveActionEvidence: string;
  learningSignal: string;
  learningSignalReason: string;
  learningSignalNextAction: string;
  learningSignalEvidence: string;
  learningActionStatus: string;
  learningActionOwner: string;
  learningActionDueAt: string;
  learningActionCompletedAt: string;
  learningActionEvidence: string;
};

const modeLabels: Record<FeedbackMode, string> = {
  'learning-outcomes': 'Learning outcome',
  'forecast-accuracy': 'Forecast accuracy',
  'policy-effectiveness': 'Policy effectiveness',
  'optimization-results': 'Optimization result'
};

const statusOptions: Record<FeedbackMode, string[]> = {
  'learning-outcomes': ['observed', 'needs_review', 'validated', 'dismissed', 'archived'],
  'forecast-accuracy': ['observed', 'within_tolerance', 'outside_tolerance', 'needs_recalibration_review', 'archived'],
  'policy-effectiveness': ['observed', 'effective', 'needs_tuning_review', 'ineffective'],
  'optimization-results': ['observed', 'value_confirmed', 'value_missed', 'tradeoff_drift_detected', 'governance_review_required', 'archived']
};

const defaultForm: FeedbackFormState = {
  domain: 'multi_domain',
  status: 'observed',
  score: '0',
  reference: '',
  expected: '',
  observed: '',
  recommendationKey: '',
  businessValueScore: '',
  stockImpactScore: '',
  financialImpactScore: '',
  wasteImpactScore: '',
  serviceLevelImpactScore: '',
  outcomeConfidenceScore: '',
  lifecycleStatus: 'measured',
  generatedAt: '',
  approvedAt: '',
  executedAt: '',
  measuredAt: '',
  scoredAt: '',
  executionReference: '',
  lifecycleEvidence: '',
  outcomeClassification: 'unclassified',
  outcomeReviewRequired: false,
  outcomeReviewReason: '',
  financialImpactAmount: '',
  financialImpactCurrency: 'EUR',
  stockoutPrevented: false,
  overstockPrevented: false,
  wasteReducedQuantity: '',
  serviceLevelDeltaPercent: '',
  businessImpactEvidence: '',
  baselineMetricValue: '',
  targetMetricValue: '',
  actualMetricValue: '',
  metricUnit: 'units',
  targetDirection: 'increase',
  targetTolerancePercent: '',
  targetMet: '',
  targetEvidence: '',
  attributionMethod: 'before_after',
  attributionConfidenceScore: '',
  counterfactualReference: '',
  attributionEvidence: '',
  measurementMethod: '',
  measurementSource: '',
  measurementOwner: '',
  measurementSampleSize: '',
  measurementDataQualityScore: '',
  measurementQualityEvidence: '',
  reviewStatus: 'not_required',
  reviewOwner: '',
  reviewedAt: '',
  reviewResolution: '',
  reviewEvidence: '',
  evaluationDueAt: '',
  evaluationStatus: 'not_scheduled',
  evaluationOwner: '',
  evaluationEvidence: '',
  acceptanceStatus: 'pending',
  acceptanceOwner: '',
  acceptedAt: '',
  acceptanceEvidence: '',
  correctiveActionStatus: 'not_required',
  correctiveActionOwner: '',
  correctiveActionDueAt: '',
  correctiveActionResolvedAt: '',
  correctiveActionEvidence: '',
  learningSignal: 'unclassified',
  learningSignalReason: '',
  learningSignalNextAction: '',
  learningSignalEvidence: '',
  learningActionStatus: 'assigned',
  learningActionOwner: '',
  learningActionDueAt: '',
  learningActionCompletedAt: '',
  learningActionEvidence: ''
};

function safeJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { value: parsed };
  } catch {
    return { note: trimmed };
  }
}

function scoreOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(-1, Math.min(1, numeric));
}

function numberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatLabel(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  return String(value).replace(/_/g, ' ');
}

function buildPayload(mode: FeedbackMode, form: FeedbackFormState): Record<string, unknown> {
  const reference = safeJsonObject(form.reference);
  const expected = safeJsonObject(form.expected);
  const observed = safeJsonObject(form.observed);
  const score = scoreOrNull(form.score);

  if (mode === 'forecast-accuracy') {
    return {
      forecast_domain: form.domain,
      calibration_status: form.status,
      accuracy_type: 'forecast_error',
      forecast_reference: reference,
      confidence_reference: expected,
      observed_value: Number.isFinite(Number(form.observed)) ? Number(form.observed) : undefined,
      predicted_value: Number.isFinite(Number(form.expected)) ? Number(form.expected) : undefined,
      absolute_error: score === null ? undefined : Math.abs(score)
    };
  }

  if (mode === 'policy-effectiveness') {
    return {
      policy_domain: form.domain,
      effectiveness_status: form.status,
      effectiveness_type: 'policy_effectiveness',
      policy_reference: reference,
      baseline_reference: expected,
      measured_result: observed,
      effectiveness_score: score,
      improvement_score: score
    };
  }

  if (mode === 'optimization-results') {
    return {
      result_domain: form.domain,
      result_status: form.status,
      optimization_reference: reference,
      expected_tradeoff: expected,
      observed_tradeoff: observed,
      realized_value_score: score
    };
  }

  return {
    learning_domain: form.domain,
    outcome_status: form.status,
    outcome_type: 'recommendation_outcome',
    source_reference: reference,
    recommendation_reference: form.recommendationKey ? { recommendation_key: form.recommendationKey } : reference,
    recommendation_key: form.recommendationKey || undefined,
    expected_result: expected,
    observed_result: observed,
    outcome_score: score,
    business_value_score: scoreOrNull(form.businessValueScore),
    stock_impact_score: scoreOrNull(form.stockImpactScore),
    financial_impact_score: scoreOrNull(form.financialImpactScore),
    waste_impact_score: scoreOrNull(form.wasteImpactScore),
    service_level_impact_score: scoreOrNull(form.serviceLevelImpactScore),
    outcome_confidence_score: scoreOrNull(form.outcomeConfidenceScore),
    recommendation_lifecycle_status: form.lifecycleStatus || 'measured',
    recommendation_generated_at: form.generatedAt || undefined,
    recommendation_approved_at: form.approvedAt || undefined,
    recommendation_executed_at: form.executedAt || undefined,
    recommendation_measured_at: form.measuredAt || undefined,
    recommendation_scored_at: form.scoredAt || undefined,
    execution_reference: safeJsonObject(form.executionReference),
    lifecycle_evidence: safeJsonObject(form.lifecycleEvidence),
    recommendation_outcome_classification: form.outcomeClassification || 'unclassified',
    recommendation_outcome_review_required: form.outcomeReviewRequired,
    recommendation_outcome_review_reason: safeJsonObject(form.outcomeReviewReason),
    financial_impact_amount: numberOrNull(form.financialImpactAmount),
    financial_impact_currency: form.financialImpactCurrency.trim().toUpperCase() || undefined,
    stockout_prevented: form.stockoutPrevented,
    overstock_prevented: form.overstockPrevented,
    waste_reduced_quantity: numberOrNull(form.wasteReducedQuantity),
    service_level_delta_percent: numberOrNull(form.serviceLevelDeltaPercent),
    recommendation_business_impact_evidence: safeJsonObject(form.businessImpactEvidence),
    baseline_metric_value: numberOrNull(form.baselineMetricValue),
    target_metric_value: numberOrNull(form.targetMetricValue),
    actual_metric_value: numberOrNull(form.actualMetricValue),
    metric_unit: form.metricUnit.trim() || undefined,
    target_direction: form.targetDirection || undefined,
    target_tolerance_percent: numberOrNull(form.targetTolerancePercent),
    target_met: form.targetMet === '' ? undefined : form.targetMet === 'true',
    recommendation_target_evidence: safeJsonObject(form.targetEvidence),
    recommendation_attribution_method: form.attributionMethod || undefined,
    recommendation_attribution_confidence_score: scoreOrNull(form.attributionConfidenceScore) === null ? null : Math.max(0, Math.min(1, Number(form.attributionConfidenceScore))),
    recommendation_counterfactual_reference: safeJsonObject(form.counterfactualReference),
    recommendation_attribution_evidence: safeJsonObject(form.attributionEvidence),
    recommendation_measurement_method: form.measurementMethod.trim() || undefined,
    recommendation_measurement_source: form.measurementSource.trim() || undefined,
    recommendation_measurement_owner: form.measurementOwner.trim() || undefined,
    recommendation_measurement_sample_size: numberOrNull(form.measurementSampleSize),
    recommendation_measurement_data_quality_score: scoreOrNull(form.measurementDataQualityScore) === null ? null : Math.max(0, Math.min(1, Number(form.measurementDataQualityScore))),
    recommendation_measurement_quality_evidence: safeJsonObject(form.measurementQualityEvidence),
    recommendation_outcome_review_status: form.reviewStatus || undefined,
    recommendation_outcome_review_owner: form.reviewOwner.trim() || undefined,
    recommendation_outcome_reviewed_at: form.reviewedAt || undefined,
    recommendation_outcome_review_resolution: form.reviewResolution || undefined,
    recommendation_outcome_review_evidence: safeJsonObject(form.reviewEvidence),
    recommendation_outcome_evaluation_due_at: form.evaluationDueAt || undefined,
    recommendation_outcome_evaluation_status: form.evaluationStatus || undefined,
    recommendation_outcome_evaluation_owner: form.evaluationOwner.trim() || undefined,
    recommendation_outcome_evaluation_evidence: safeJsonObject(form.evaluationEvidence),
    recommendation_outcome_acceptance_status: form.acceptanceStatus || 'pending',
    recommendation_outcome_acceptance_owner: form.acceptanceOwner.trim() || undefined,
    recommendation_outcome_accepted_at: form.acceptedAt || undefined,
    recommendation_outcome_acceptance_evidence: safeJsonObject(form.acceptanceEvidence),
    recommendation_outcome_corrective_action_status: form.correctiveActionStatus || 'not_required',
    recommendation_outcome_corrective_action_owner: form.correctiveActionOwner.trim() || undefined,
    recommendation_outcome_corrective_action_due_at: form.correctiveActionDueAt || undefined,
    recommendation_outcome_corrective_action_resolved_at: form.correctiveActionResolvedAt || undefined,
    recommendation_outcome_corrective_action_evidence: safeJsonObject(form.correctiveActionEvidence),
    recommendation_outcome_learning_signal: form.learningSignal || 'unclassified',
    recommendation_outcome_learning_signal_reason: form.learningSignalReason.trim() || undefined,
    recommendation_outcome_recommended_next_action: form.learningSignalNextAction.trim() || undefined,
    recommendation_outcome_learning_signal_evidence: safeJsonObject(form.learningSignalEvidence),
    recommendation_outcome_learning_action_status: form.learningActionStatus || 'assigned',
    recommendation_outcome_learning_action_owner: form.learningActionOwner.trim() || undefined,
    recommendation_outcome_learning_action_due_at: form.learningActionDueAt || undefined,
    recommendation_outcome_learning_action_completed_at: form.learningActionCompletedAt || undefined,
    recommendation_outcome_learning_action_evidence: safeJsonObject(form.learningActionEvidence)
  };
}

function StatCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="card" style={{ minWidth: 170, flex: '1 1 170px' }}>
      <div className="card__label">{label}</div>
      <div className="card__value">{formatLabel(value)}</div>
    </div>
  );
}


function FeedbackActionPlan({ plan }: { plan: ContinuousLearningSummary['feedback_action_plan'] }) {
  const actions = plan?.recommended_actions || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Feedback action plan</h2>
          <p className="card__subtext">
            Backend-generated manual review plan from observed learning evidence. It does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Actions" value={plan?.action_count ?? 0} />
        <StatCard label="High priority" value={plan?.high_priority_action_count ?? 0} />
        <StatCard label="Medium priority" value={plan?.medium_priority_action_count ?? 0} />
        <StatCard label="Next review focus" value={plan?.next_review_focus || 'routine_learning_monitoring'} />
      </div>
      {!actions.length ? (
        <p className="card__subtext">No recommended learning actions available yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Priority</th>
                <th>Evidence</th>
                <th>Owner</th>
                <th>Mode</th>
                <th>Rationale</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((action, index) => (
                <tr key={action.action_key || index}>
                  <td>{formatLabel(action.action_key)}</td>
                  <td>{formatLabel(action.priority)}</td>
                  <td>{formatLabel(action.evidence_count)}</td>
                  <td>{formatLabel(action.recommended_owner)}</td>
                  <td>{formatLabel(action.execution_mode)}</td>
                  <td>{action.rationale || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}



function LearningImpactAssessment({ assessment }: { assessment: ContinuousLearningSummary['learning_impact_assessment'] }) {
  const domains = assessment?.domain_impact_summary || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Learning impact assessment</h2>
          <p className="card__subtext">
            Backend-generated impact view that compares positive evidence, drift pressure, and open review pressure. It is read-only visibility; it does not train models or update policies.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Impact posture" value={assessment?.impact_posture || 'no_learning_evidence_yet'} />
        <StatCard label="Learning signal" value={assessment?.learning_signal_score ?? 100} />
        <StatCard label="Drift pressure" value={assessment?.drift_pressure_score ?? 0} />
        <StatCard label="Total evidence" value={assessment?.total_evidence_count ?? 0} />
        <StatCard label="Open review" value={assessment?.open_review_evidence_count ?? 0} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Avg outcome score" value={assessment?.average_outcome_score ?? '—'} />
        <StatCard label="Avg forecast error" value={assessment?.average_forecast_percentage_error ?? '—'} />
        <StatCard label="Avg policy score" value={assessment?.average_policy_effectiveness_score ?? '—'} />
        <StatCard label="Avg optimization value" value={assessment?.average_optimization_value_score ?? '—'} />
      </div>
      {domains.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Evidence</th>
                <th>Review pressure</th>
                <th>Impact posture</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain, index) => (
                <tr key={domain.domain || index}>
                  <td>{formatLabel(domain.domain)}</td>
                  <td>{formatLabel(domain.evidence_count)}</td>
                  <td>{formatLabel(domain.review_pressure)}</td>
                  <td>{formatLabel(domain.impact_posture)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No domain impact evidence available yet.</p>}
    </section>
  );
}


function LearningCoverageMatrix({ matrix }: { matrix: ContinuousLearningSummary['learning_coverage_matrix'] }) {
  const rows = matrix?.coverage_rows || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Learning coverage matrix</h2>
          <p className="card__subtext">
            Backend-generated domain coverage view showing where feedback evidence exists and which evidence types are still missing. This is gap visibility only; it does not train models or update policies.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Coverage posture" value={matrix?.coverage_posture || 'no_feedback_coverage_yet'} />
        <StatCard label="Average coverage" value={matrix?.average_coverage_score ?? 0} />
        <StatCard label="Covered domains" value={matrix?.covered_domain_count ?? 0} />
        <StatCard label="Full coverage" value={matrix?.full_coverage_domain_count ?? 0} />
        <StatCard label="Review pressure" value={matrix?.review_pressure_domain_count ?? 0} />
      </div>
      {rows.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Coverage</th>
                <th>Total evidence</th>
                <th>Outcome</th>
                <th>Forecast</th>
                <th>Policy</th>
                <th>Optimization</th>
                <th>Review pressure</th>
                <th>Next capture</th>
                <th>Missing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.domain || index}>
                  <td>{formatLabel(row.domain)}</td>
                  <td>{formatLabel(row.coverage_score)}</td>
                  <td>{formatLabel(row.total_evidence_count)}</td>
                  <td>{formatLabel(row.learning_outcome_count)}</td>
                  <td>{formatLabel(row.forecast_accuracy_count)}</td>
                  <td>{formatLabel(row.policy_effectiveness_count)}</td>
                  <td>{formatLabel(row.optimization_result_count)}</td>
                  <td>{formatLabel(row.review_pressure_count)}</td>
                  <td>{formatLabel(row.recommended_next_capture)}</td>
                  <td>{(row.missing_evidence_types || []).map(formatLabel).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No coverage rows available yet.</p>}
    </section>
  );
}


function LearningMaturityRoadmap({ roadmap }: { roadmap: ContinuousLearningSummary['learning_maturity_roadmap'] }) {
  const phases = roadmap?.phases || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Learning maturity roadmap</h2>
          <p className="card__subtext">
            Manual closed-loop readiness view generated by the backend. It shows what must mature before learning evidence can safely inform future tuning; it does not train models, update policies, or execute changes.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Roadmap posture" value={roadmap?.roadmap_posture || 'no_roadmap_loaded'} />
        <StatCard label="Readiness score" value={roadmap?.roadmap_readiness_score ?? 0} />
        <StatCard label="Blockers" value={roadmap?.blocker_count ?? 0} />
        <StatCard label="Next maturity focus" value={roadmap?.next_maturity_focus || 'maintain_manual_closed_loop_readiness_review'} />
      </div>
      {(roadmap?.blockers || []).length > 0 ? (
        <p className="card__subtext">Blockers: {(roadmap?.blockers || []).map(formatLabel).join(', ')}</p>
      ) : (
        <p className="card__subtext">No roadmap blockers reported by the backend.</p>
      )}
      {phases.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Layer</th>
                <th>Readiness</th>
                <th>Status</th>
                <th>Recommended next step</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase, index) => (
                <tr key={phase.phase_key || index}>
                  <td>{formatLabel(phase.phase_key)}</td>
                  <td>{formatLabel(phase.maturity_layer)}</td>
                  <td>{formatLabel(phase.readiness_score)}</td>
                  <td>{formatLabel(phase.status)}</td>
                  <td>{formatLabel(phase.recommended_next_step)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No maturity phases available yet.</p>}
    </section>
  );
}



function ClosedLoopExceptionRegister({ register }: { register: ContinuousLearningSummary['closed_loop_exception_register'] }) {
  const exceptions = register?.exceptions || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop exception register</h2>
          <p className="card__subtext">
            Backend-generated manual exception register for production surveillance and monitoring blockers. It does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Register decision" value={register?.register_decision || 'manual_exception_resolution_required'} />
        <StatCard label="Open exceptions" value={register?.exception_count ?? 0} />
        <StatCard label="High severity" value={register?.high_severity_count ?? 0} />
        <StatCard label="Medium severity" value={register?.medium_severity_count ?? 0} />
        <StatCard label="Owner" value={register?.recommended_exception_owner || 'decision_governance_owner'} />
      </div>
      {register?.exception_note ? <p className="card__subtext">{register.exception_note}</p> : null}
      {exceptions.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Exception</th>
                <th>Source</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Manual resolution</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((item, index) => (
                <tr key={item.exception_key || index}>
                  <td>{formatLabel(item.exception_key)}</td>
                  <td>{formatLabel(item.exception_source)}</td>
                  <td>{formatLabel(item.severity)}</td>
                  <td>{formatLabel(item.exception_status)}</td>
                  <td>{formatLabel(item.current_value)}</td>
                  <td>{formatLabel(item.required_value)}</td>
                  <td>{formatLabel(item.manual_resolution || item.exception_reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No closed-loop exceptions are currently open.</p>}
    </section>
  );
}


function ClosedLoopResolutionPlan({ plan }: { plan: ContinuousLearningSummary['closed_loop_resolution_plan'] }) {
  const steps = plan?.resolution_steps || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop resolution plan</h2>
          <p className="card__subtext">
            Backend-generated manual sequencing plan for resolving closed-loop exceptions. It is planning-only and does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Resolution decision" value={plan?.resolution_decision || 'no_manual_resolution_plan_required'} />
        <StatCard label="Plan score" value={plan?.resolution_plan_score ?? 100} />
        <StatCard label="Steps" value={plan?.resolution_step_count ?? 0} />
        <StatCard label="High severity" value={plan?.unresolved_high_severity_count ?? 0} />
        <StatCard label="Owner" value={plan?.recommended_resolution_owner || 'platform_admin_or_authorized_business_owner'} />
      </div>
      {plan?.resolution_note ? <p className="card__subtext">{plan.resolution_note}</p> : null}
      {steps.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Exception</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Manual task</th>
                <th>Evidence to capture</th>
                <th>Expected result</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((item, index) => (
                <tr key={item.resolution_key || index}>
                  <td>{formatLabel(item.step_number ?? index + 1)}</td>
                  <td>{formatLabel(item.exception_key)}</td>
                  <td>{formatLabel(item.severity)}</td>
                  <td>{formatLabel(item.resolution_status)}</td>
                  <td>{formatLabel(item.manual_resolution_task)}</td>
                  <td>{formatLabel(item.evidence_to_capture)}</td>
                  <td>{formatLabel(item.expected_resolution_result)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No closed-loop resolution steps are currently required.</p>}
    </section>
  );
}


function ClosedLoopClosureReport({ report }: { report: ContinuousLearningSummary['closed_loop_closure_report'] }) {
  const items = report?.closure_items || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop closure report</h2>
          <p className="card__subtext">
            Backend-generated manual closure report for confirming exception resolution evidence. It is reporting-only and does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Closure decision" value={report?.closure_decision || 'manual_closure_evidence_required'} />
        <StatCard label="Closure score" value={report?.closure_score ?? 0} />
        <StatCard label="Closure items" value={report?.closure_item_count ?? 0} />
        <StatCard label="Unresolved" value={report?.unresolved_closure_count ?? 0} />
        <StatCard label="Owner" value={report?.recommended_closure_owner || 'platform_admin_or_authorized_business_owner'} />
      </div>
      {report?.closure_note ? <p className="card__subtext">{report.closure_note}</p> : null}
      {items.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Closure item</th>
                <th>Exception</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Evidence required</th>
                <th>Validation task</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.closure_key || index}>
                  <td>{formatLabel(item.closure_key)}</td>
                  <td>{formatLabel(item.exception_key)}</td>
                  <td>{formatLabel(item.severity)}</td>
                  <td>{formatLabel(item.closure_status)}</td>
                  <td>{formatLabel(item.closure_evidence_required)}</td>
                  <td>{formatLabel(item.closure_validation_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No closure items are currently reported.</p>}
    </section>
  );
}

function ClosedLoopAuditLedger({ ledger }: { ledger: ContinuousLearningSummary['closed_loop_audit_ledger'] }) {
  const entries = ledger?.ledger_entries || [];
  const blockers = ledger?.audit_blockers || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop audit ledger</h2>
          <p className="card__subtext">Manual audit-retention ledger for feedback evidence, coverage, impact, exceptions, and certification traceability.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Audit decision" value={ledger?.audit_ledger_decision || 'manual_audit_evidence_required'} />
        <StatCard label="Audit score" value={ledger?.audit_ledger_score ?? 0} />
        <StatCard label="Ready entries" value={ledger?.ready_entry_count ?? 0} />
        <StatCard label="Blocked entries" value={ledger?.blocked_entry_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Owner: {ledger?.recommended_audit_owner || 'decision_governance_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(ledger?.next_audit_focus || 'retain_closed_loop_certification_audit_record')}</p>
      <p className="card__subtext">{ledger?.audit_ledger_note || 'Manual audit ledger remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {entries.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Count</th>
                <th>Retention</th>
                <th>Manual audit task</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.ledger_key || index}>
                  <td>{formatLabel(entry.ledger_stage || entry.ledger_key)}</td>
                  <td>{formatLabel(entry.ledger_status)}</td>
                  <td>{formatLabel(entry.evidence_reference)}</td>
                  <td>{entry.evidence_count ?? 0}</td>
                  <td>{formatLabel(entry.retention_requirement)}</td>
                  <td>{formatLabel(entry.manual_audit_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No audit ledger entries are available yet.</p>}
    </section>
  );
}


function ClosedLoopComplianceAttestation({ attestation }: { attestation: ContinuousLearningSummary['closed_loop_compliance_attestation'] }) {
  const checks = attestation?.attestation_checks || [];
  const blockers = attestation?.attestation_blockers || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop compliance attestation</h2>
          <p className="card__subtext">Manual compliance attestation for audit retention, certification, release/monitoring controls, and the non-autonomous safety contract.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Attestation decision" value={attestation?.attestation_decision || 'manual_compliance_attestation_blocked'} />
        <StatCard label="Attestation score" value={attestation?.attestation_score ?? 0} />
        <StatCard label="Attestable checks" value={attestation?.attestable_check_count ?? 0} />
        <StatCard label="Blocked checks" value={attestation?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Owner: {attestation?.recommended_attestation_owner || 'platform_governance_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(attestation?.next_attestation_focus || 'record_manual_closed_loop_compliance_attestation')}</p>
      <p className="card__subtext">{attestation?.attestation_note || 'Manual compliance attestation remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.attestation_evidence)}</td>
                  <td>{formatLabel(check.manual_attestation_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No compliance attestation checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopCommercialReadinessPacket({ packet }: { packet: ContinuousLearningSummary['closed_loop_commercial_readiness_packet'] }) {
  const checks = packet?.readiness_checks || [];
  const blockers = packet?.commercial_readiness_blockers || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop commercial readiness packet</h2>
          <p className="card__subtext">Final manual commercial-readiness packet tying together compliance attestation, audit ledger, certification, governance gate, and production surveillance. It stays advisory and non-autonomous.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Commercial decision" value={packet?.commercial_readiness_decision || 'manual_commercial_readiness_blocked'} />
        <StatCard label="Readiness score" value={packet?.commercial_readiness_score ?? 0} />
        <StatCard label="Ready checks" value={packet?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={packet?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Executive owner: {packet?.recommended_executive_owner || 'platform_governance_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(packet?.next_commercial_readiness_focus || 'record_manual_commercial_readiness_decision')}</p>
      <p className="card__subtext">{packet?.commercial_readiness_note || 'Manual commercial readiness remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.packet_evidence)}</td>
                  <td>{formatLabel(check.manual_readiness_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No commercial readiness checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopGovernanceGate({ gate }: { gate: ContinuousLearningSummary['closed_loop_governance_gate'] }) {
  const checks = gate?.gate_checks || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop governance gate</h2>
          <p className="card__subtext">
            Backend-generated go/no-go gate for manual closed-loop escalation. It blocks escalation when evidence coverage, review pressure, drift pressure, high-priority actions, or roadmap readiness are not acceptable. It does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Gate decision" value={gate?.gate_decision || 'not_loaded'} />
        <StatCard label="Gate score" value={gate?.gate_score ?? 0} />
        <StatCard label="Passed checks" value={gate?.passed_check_count ?? 0} />
        <StatCard label="Blocked checks" value={gate?.blocked_check_count ?? 0} />
        <StatCard label="Next gate focus" value={gate?.next_gate_focus || 'prepare_manual_governance_signoff'} />
      </div>
      {(gate?.required_manual_resolution || []).length > 0 ? (
        <p className="card__subtext">Manual resolution required: {(gate?.required_manual_resolution || []).map(formatLabel).join(', ')}</p>
      ) : (
        <p className="card__subtext">No manual gate blockers reported by the backend.</p>
      )}
      {checks.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Threshold</th>
                <th>Manual remediation</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.threshold)}</td>
                  <td>{formatLabel(check.remediation)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No governance gate checks available yet.</p>}
    </section>
  );
}


function ClosedLoopSignoffPacket({ packet }: { packet: ContinuousLearningSummary['closed_loop_signoff_packet'] }) {
  const sections = packet?.signoff_sections || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop signoff packet</h2>
          <p className="card__subtext">
            Backend-generated manual signoff packet for evidence-based release review. It packages coverage, review, drift, and gate readiness into a human go/no-go surface. It does not approve, train, execute, update policies, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Signoff decision" value={packet?.signoff_decision || 'not_loaded'} />
        <StatCard label="Signoff score" value={packet?.signoff_score ?? 0} />
        <StatCard label="Required signoffs" value={packet?.required_signoff_count ?? 0} />
        <StatCard label="Unresolved sections" value={packet?.unresolved_section_count ?? 0} />
        <StatCard label="Recommended owner" value={packet?.recommended_signoff_owner || 'decision_governance_owner'} />
      </div>
      <p className="card__subtext">Next signoff focus: {formatLabel(packet?.next_signoff_focus || 'complete_manual_governance_go_no_go_signoff')}</p>
      <p className="card__subtext">{packet?.release_note || 'No signoff packet release note available yet.'}</p>
      {sections.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Readiness</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual signoff</th>
                <th>Instruction</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => (
                <tr key={section.section_key || index}>
                  <td>{formatLabel(section.section_label || section.section_key)}</td>
                  <td>{formatLabel(section.readiness_status)}</td>
                  <td>{formatLabel(section.current_value)}</td>
                  <td>{formatLabel(section.required_value)}</td>
                  <td>{formatLabel(section.evidence_count)}</td>
                  <td>{section.manual_signoff_required ? 'yes' : 'no'}</td>
                  <td>{formatLabel(section.signoff_instruction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No signoff sections available yet.</p>}
    </section>
  );
}


function ClosedLoopReleaseReadinessSnapshot({ snapshot }: { snapshot: ContinuousLearningSummary['closed_loop_release_readiness_snapshot'] }) {
  const lanes = snapshot?.release_lane_checks || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop release readiness</h2>
          <p className="card__subtext">
            Backend-generated release readiness snapshot for the manual go/no-go decision. It packages evidence, review, drift, governance, and action lanes without approving, training, executing, updating policies, or mutating operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Release decision" value={snapshot?.release_decision || 'not_loaded'} />
        <StatCard label="Readiness score" value={snapshot?.release_readiness_score ?? 0} />
        <StatCard label="Ready lanes" value={snapshot?.ready_lane_count ?? 0} />
        <StatCard label="Blocked lanes" value={snapshot?.blocked_lane_count ?? 0} />
        <StatCard label="Evidence" value={snapshot?.total_evidence_count ?? 0} />
        <StatCard label="Owner" value={snapshot?.recommended_release_owner || 'decision_governance_owner'} />
      </div>
      <p className="card__subtext">Next release focus: {formatLabel(snapshot?.next_release_focus || 'complete_manual_release_go_no_go_decision')}</p>
      <p className="card__subtext">{snapshot?.release_note || 'No release readiness note available yet.'}</p>
      {(snapshot?.release_blockers || []).length > 0 ? (
        <p className="card__subtext">Release blockers: {(snapshot?.release_blockers || []).map(formatLabel).join(', ')}</p>
      ) : (
        <p className="card__subtext">No release blockers reported by the backend.</p>
      )}
      {lanes.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Lane</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Blocker</th>
                <th>Manual action</th>
              </tr>
            </thead>
            <tbody>
              {lanes.map((lane, index) => (
                <tr key={lane.lane_key || index}>
                  <td>{formatLabel(lane.lane_label || lane.lane_key)}</td>
                  <td>{formatLabel(lane.lane_status)}</td>
                  <td>{formatLabel(lane.current_value)}</td>
                  <td>{formatLabel(lane.required_value)}</td>
                  <td>{formatLabel(lane.blocking_reason)}</td>
                  <td>{formatLabel(lane.manual_action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No release readiness lanes available yet.</p>}
    </section>
  );
}


function ClosedLoopOperationalHandoff({ handoff }: { handoff: ContinuousLearningSummary['closed_loop_operational_handoff'] }) {
  const items = handoff?.handoff_items || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop operational handoff</h2>
          <p className="card__subtext">
            Backend-generated owner handoff for the manual operational acceptance step after release readiness. It assigns manual owners and next tasks without training, approving, executing, updating policies, or mutating operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Handoff decision" value={handoff?.handoff_decision || 'not_loaded'} />
        <StatCard label="Handoff score" value={handoff?.handoff_score ?? 0} />
        <StatCard label="Ready items" value={handoff?.ready_handoff_count ?? 0} />
        <StatCard label="Blocked items" value={handoff?.blocked_handoff_count ?? 0} />
        <StatCard label="Owner" value={handoff?.recommended_handoff_owner || 'decision_governance_owner'} />
      </div>
      <p className="card__subtext">Next handoff focus: {formatLabel(handoff?.next_handoff_focus || 'complete_manual_operational_acceptance')}</p>
      <p className="card__subtext">{handoff?.handoff_note || 'No operational handoff note available yet.'}</p>
      {items.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Source lane</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Manual task</th>
                <th>Blocker</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.handoff_key || index}>
                  <td>{formatLabel(item.source_lane)}</td>
                  <td>{formatLabel(item.owner_role)}</td>
                  <td>{formatLabel(item.handoff_status)}</td>
                  <td>{formatLabel(item.manual_task)}</td>
                  <td>{formatLabel(item.blocking_reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No operational handoff items available yet.</p>}
    </section>
  );
}


function ClosedLoopOperationalAcceptance({ acceptance }: { acceptance: ContinuousLearningSummary['closed_loop_operational_acceptance'] }) {
  const criteria = acceptance?.acceptance_criteria || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop operational acceptance</h2>
          <p className="card__subtext">
            Backend-generated manual acceptance criteria after operational handoff. This gives the business owner a clear accept/block decision surface without training models, updating policies, executing recommendations, or mutating operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Acceptance decision" value={acceptance?.acceptance_decision || 'not_loaded'} />
        <StatCard label="Acceptance score" value={acceptance?.acceptance_score ?? 0} />
        <StatCard label="Accepted criteria" value={acceptance?.accepted_criteria_count ?? 0} />
        <StatCard label="Blocked criteria" value={acceptance?.blocked_criteria_count ?? 0} />
        <StatCard label="Owner" value={acceptance?.recommended_acceptance_owner || 'decision_governance_owner'} />
      </div>
      <p className="card__subtext">Next acceptance focus: {formatLabel(acceptance?.next_acceptance_focus || 'record_manual_operational_acceptance')}</p>
      <p className="card__subtext">{acceptance?.acceptance_note || 'No operational acceptance note available yet.'}</p>
      {criteria.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Manual acceptance task</th>
                <th>Blocker</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, index) => (
                <tr key={criterion.criterion_key || index}>
                  <td>{formatLabel(criterion.criterion_label || criterion.criterion_key)}</td>
                  <td>{formatLabel(criterion.criterion_status)}</td>
                  <td>{formatLabel(criterion.current_value)}</td>
                  <td>{formatLabel(criterion.required_value)}</td>
                  <td>{formatLabel(criterion.manual_acceptance_task)}</td>
                  <td>{formatLabel(criterion.blocking_reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No operational acceptance criteria available yet.</p>}
    </section>
  );
}


function ClosedLoopMonitoringReadiness({ readiness }: { readiness: ContinuousLearningSummary['closed_loop_monitoring_readiness'] }) {
  const checks = readiness?.monitoring_checks || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop monitoring readiness</h2>
          <p className="card__subtext">
            Manual post-acceptance monitoring controls generated from acceptance, review-board, drift, and coverage evidence. This is visibility only; it does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Monitoring decision" value={readiness?.monitoring_decision || 'monitoring_readiness_not_loaded'} />
        <StatCard label="Readiness score" value={readiness?.monitoring_readiness_score ?? 0} />
        <StatCard label="Ready checks" value={readiness?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={readiness?.blocked_check_count ?? 0} />
        <StatCard label="Cadence" value={readiness?.suggested_monitoring_cadence || 'manual_review_required'} />
      </div>
      <p className="card__subtext">Owner: {formatLabel(readiness?.recommended_monitoring_owner || 'decision_governance_owner')}</p>
      <p className="card__subtext">Next monitoring focus: {formatLabel(readiness?.next_monitoring_focus || 'complete_manual_monitoring_readiness_review')}</p>
      {(readiness?.monitoring_blockers || []).length > 0 ? (
        <p className="card__subtext">Blockers: {(readiness?.monitoring_blockers || []).map(formatLabel).join(', ')}</p>
      ) : (
        <p className="card__subtext">No monitoring blockers reported by the backend.</p>
      )}
      {readiness?.monitoring_note ? <p className="card__subtext">{readiness.monitoring_note}</p> : null}
      {checks.length > 0 ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Manual control</th>
                <th>Blocking reason</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.recommended_monitoring_control)}</td>
                  <td>{formatLabel(check.blocking_reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No monitoring checks available yet.</p>}
    </section>
  );
}


function ClosedLoopProductionSurveillance({ surveillance }: { surveillance: ContinuousLearningSummary['closed_loop_production_surveillance'] }) {
  const checks = surveillance?.surveillance_checks || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop production surveillance</h2>
          <p className="card__subtext">
            Backend-generated manual production watch layer after monitoring readiness. It does not train models, update policies, execute recommendations, or mutate operational state.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Surveillance decision" value={surveillance?.surveillance_decision || 'production_surveillance_blocked'} />
        <StatCard label="Surveillance score" value={surveillance?.surveillance_score ?? 0} />
        <StatCard label="Ready checks" value={surveillance?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={surveillance?.blocked_check_count ?? 0} />
        <StatCard label="Cadence" value={surveillance?.suggested_surveillance_cadence || 'daily_manual_blocker_resolution_until_surveillance_ready'} />
      </div>
      {surveillance?.surveillance_note ? <p className="card__subtext">{surveillance.surveillance_note}</p> : null}
      {checks.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Control</th>
                <th>Blocker</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.recommended_surveillance_control)}</td>
                  <td>{formatLabel(check.blocking_reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No production surveillance checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopCertificationDossier({ dossier }: { dossier: ContinuousLearningSummary['closed_loop_certification_dossier'] }) {
  const checks = dossier?.certification_checks || [];
  const blockers = dossier?.certification_blockers || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop certification dossier</h2>
          <p className="card__subtext">Manual certification packet for closure, signoff, release, monitoring, coverage, and exception evidence.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Certification decision" value={dossier?.certification_decision || 'manual_certification_blocked'} />
        <StatCard label="Certification score" value={dossier?.certification_score ?? 0} />
        <StatCard label="Ready checks" value={dossier?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={dossier?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Owner: {dossier?.recommended_certification_owner || 'decision_governance_owner'}</p>
      <p className="card__subtext">Next focus: {dossier?.next_certification_focus || 'prepare_manual_closed_loop_certification_record'}</p>
      <p className="card__subtext">{dossier?.certification_note || 'Manual certification dossier remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key || check.check_label}>
                  <td>{formatLabel(check.check_label || check.check_key || 'check')}</td>
                  <td>{formatLabel(check.check_status || 'blocked')}</td>
                  <td>{String(check.current_value ?? '-')}</td>
                  <td>{String(check.required_value ?? '-')}</td>
                  <td>{formatLabel(check.manual_certification_task || 'manual_certification_review_required')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}


function ClosedLoopCustomerPilotReadiness({ pilot }: { pilot: ContinuousLearningSummary['closed_loop_customer_pilot_readiness'] }) {
  const checks = pilot?.pilot_checks || [];
  const blockers = pilot?.pilot_blockers || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop customer pilot readiness</h2>
          <p className="card__subtext">Manual customer pilot readiness layer that connects commercial readiness, operational handoff, acceptance, monitoring, and exception control. It remains advisory and non-autonomous.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Pilot decision" value={pilot?.pilot_decision || 'manual_customer_pilot_blocked'} />
        <StatCard label="Pilot score" value={pilot?.pilot_readiness_score ?? 0} />
        <StatCard label="Ready checks" value={pilot?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={pilot?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Pilot owner: {pilot?.recommended_pilot_owner || 'customer_success_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(pilot?.next_pilot_focus || 'record_manual_customer_pilot_go_no_go_decision')}</p>
      <p className="card__subtext">{pilot?.pilot_readiness_note || 'Manual customer pilot readiness remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.pilot_evidence)}</td>
                  <td>{formatLabel(check.manual_pilot_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No customer pilot readiness checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopCustomerPilotLaunchControl({ launch }: { launch: ContinuousLearningSummary['closed_loop_customer_pilot_launch_control'] }) {
  const checks = launch?.launch_checks || [];
  const blockers = launch?.launch_blockers || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop customer pilot launch control</h2>
          <p className="card__subtext">Manual launch-control layer for customer pilots. It joins pilot readiness, surveillance, resolution, closure, and audit traceability before a human go/no-go decision. It does not launch pilots or execute changes automatically.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Launch decision" value={launch?.launch_decision || 'manual_customer_pilot_launch_blocked'} />
        <StatCard label="Launch score" value={launch?.launch_control_score ?? 0} />
        <StatCard label="Ready checks" value={launch?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={launch?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Launch owner: {launch?.recommended_launch_owner || 'customer_success_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(launch?.next_launch_focus || 'record_manual_customer_pilot_launch_go_no_go_decision')}</p>
      <p className="card__subtext">{launch?.launch_control_note || 'Manual customer pilot launch control remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.launch_evidence)}</td>
                  <td>{formatLabel(check.manual_launch_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No customer pilot launch-control checks are available yet.</p>}
    </section>
  );
}



function ClosedLoopCustomerPilotSuccessCriteria({ success }: { success: ContinuousLearningSummary['closed_loop_customer_pilot_success_criteria'] }) {
  const criteria = success?.success_criteria || [];
  const blockers = success?.pilot_success_blockers || [];
  const exitRequirements = success?.success_exit_requirements || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop customer pilot success criteria</h2>
          <p className="card__subtext">Manual success-tracking layer for customer pilots. It defines pilot baselines, exit requirements, and owner focus without launching pilots, training models, or mutating operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Tracking decision" value={success?.success_tracking_decision || 'manual_customer_pilot_success_tracking_blocked'} />
        <StatCard label="Criteria score" value={success?.success_criteria_score ?? 0} />
        <StatCard label="Ready criteria" value={success?.ready_criterion_count ?? 0} />
        <StatCard label="Blocked criteria" value={success?.blocked_criterion_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Success owner: {success?.recommended_success_owner || 'customer_success_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(success?.next_success_focus || 'track_customer_pilot_outcomes_against_manual_success_criteria')}</p>
      <p className="card__subtext">{success?.success_criteria_note || 'Manual customer pilot success criteria remain advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {exitRequirements.length > 0 ? (
        <p className="card__subtext">Exit requirements: {exitRequirements.map(formatLabel).join(' · ')}</p>
      ) : null}
      {criteria.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion, index) => (
                <tr key={criterion.criterion_key || index}>
                  <td>{formatLabel(criterion.criterion_label || criterion.criterion_key)}</td>
                  <td>{formatLabel(criterion.criterion_status)}</td>
                  <td>{formatLabel(criterion.current_value)}</td>
                  <td>{formatLabel(criterion.required_value)}</td>
                  <td>{formatLabel(criterion.pilot_success_evidence)}</td>
                  <td>{formatLabel(criterion.manual_success_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No customer pilot success criteria are available yet.</p>}
    </section>
  );
}


function ClosedLoopCustomerPilotOutcomeReview({ review }: { review: ContinuousLearningSummary['closed_loop_customer_pilot_outcome_review'] }) {
  const checks = review?.outcome_review_checks || [];
  const blockers = review?.outcome_review_blockers || [];
  const exitOptions = review?.review_exit_decision_options || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop customer pilot outcome review</h2>
          <p className="card__subtext">Manual pilot outcome-review layer. It compares captured pilot evidence against baselines and prepares an exit recommendation without expanding customers, training models, updating policies, or mutating operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Review decision" value={review?.outcome_review_decision || 'manual_customer_pilot_outcome_review_blocked'} />
        <StatCard label="Outcome score" value={review?.pilot_outcome_score ?? 0} />
        <StatCard label="Validated outcomes" value={review?.validated_outcome_count ?? 0} />
        <StatCard label="Open pressure" value={review?.open_review_pressure_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Outcome review owner: {review?.recommended_outcome_review_owner || 'customer_success_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(review?.next_outcome_review_focus || 'conduct_manual_customer_pilot_outcome_review_and_exit_recommendation')}</p>
      <p className="card__subtext">{review?.outcome_review_note || 'Manual customer pilot outcome review remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {exitOptions.length > 0 ? (
        <p className="card__subtext">Manual exit options: {exitOptions.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.review_evidence)}</td>
                  <td>{formatLabel(check.manual_review_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No customer pilot outcome-review checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopCustomerPilotExpansionReadiness({ expansion }: { expansion: ContinuousLearningSummary['closed_loop_customer_pilot_expansion_readiness'] }) {
  const checks = expansion?.expansion_checks || [];
  const blockers = expansion?.expansion_blockers || [];
  const options = expansion?.expansion_decision_options || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop customer pilot expansion readiness</h2>
          <p className="card__subtext">Manual controlled-expansion readiness layer. It checks pilot outcome review, commercial readiness, validated positive outcomes, and drift pressure without expanding customers, training models, updating policies, or mutating operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Expansion decision" value={expansion?.expansion_decision || 'manual_controlled_customer_expansion_blocked'} />
        <StatCard label="Expansion score" value={expansion?.expansion_readiness_score ?? 0} />
        <StatCard label="Positive validated" value={expansion?.positive_validated_outcome_count ?? 0} />
        <StatCard label="Drift pressure" value={expansion?.expansion_drift_pressure_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Expansion owner: {expansion?.recommended_expansion_owner || 'customer_success_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(expansion?.next_expansion_focus || 'prepare_manual_controlled_customer_expansion_review')}</p>
      <p className="card__subtext">{expansion?.expansion_readiness_note || 'Manual customer pilot expansion readiness remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <ul className="card__subtext">
          {blockers.slice(0, 6).map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}
        </ul>
      ) : null}
      {options.length > 0 ? (
        <p className="card__subtext">Manual expansion options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check, index) => (
                <tr key={check.check_key || index}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.expansion_evidence)}</td>
                  <td>{formatLabel(check.manual_expansion_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No customer pilot expansion-readiness checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseRolloutReadiness({ rollout }: { rollout: ContinuousLearningSummary['closed_loop_enterprise_rollout_readiness'] }) {
  const checks = rollout?.rollout_checks || [];
  const blockers = rollout?.rollout_blockers || [];
  const options = rollout?.rollout_decision_options || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise rollout readiness</h2>
          <p className="card__subtext">Manual enterprise rollout layer. It checks pilot expansion readiness, multi-domain learning coverage, audit traceability, compliance attestation, and open review pressure without provisioning tenants, training models, updating policies, executing recommendations, or mutating operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Rollout decision" value={rollout?.rollout_decision || 'manual_enterprise_rollout_blocked'} />
        <StatCard label="Rollout score" value={rollout?.rollout_readiness_score ?? 0} />
        <StatCard label="Covered domains" value={rollout?.covered_domain_count ?? 0} />
        <StatCard label="Open review pressure" value={rollout?.open_review_pressure_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Rollout owner: {rollout?.recommended_rollout_owner || 'enterprise_rollout_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(rollout?.next_rollout_focus || 'prepare_manual_enterprise_rollout_review')}</p>
      <p className="card__subtext">{rollout?.rollout_readiness_note || 'Manual enterprise rollout readiness remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise rollout blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual rollout options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.rollout_evidence)}</td>
                  <td>{formatLabel(check.manual_rollout_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise rollout checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseRolloutGovernance({ governance }: { governance: ContinuousLearningSummary['closed_loop_enterprise_rollout_governance'] }) {
  const checks = governance?.governance_checks || [];
  const blockers = governance?.governance_blockers || [];
  const options = governance?.governance_decision_options || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise rollout governance</h2>
          <p className="card__subtext">Manual governance approval layer for enterprise rollout. It combines rollout readiness, the closed-loop governance gate, release readiness, production surveillance, and learning review pressure without provisioning tenants, training models, changing policies, executing recommendations, or mutating operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Governance decision" value={governance?.governance_decision || 'manual_enterprise_rollout_governance_blocked'} />
        <StatCard label="Governance score" value={governance?.rollout_governance_score ?? 0} />
        <StatCard label="Blocked checks" value={governance?.blocked_check_count ?? 0} />
        <StatCard label="Open review pressure" value={governance?.open_review_pressure_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Governance owner: {governance?.recommended_governance_owner || 'enterprise_rollout_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(governance?.next_governance_focus || 'prepare_manual_enterprise_rollout_governance_approval')}</p>
      <p className="card__subtext">{governance?.governance_note || 'Manual enterprise rollout governance remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise rollout governance blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual governance options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.governance_evidence)}</td>
                  <td>{formatLabel(check.manual_governance_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise rollout governance checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopMultiTenantRolloutControls({ controls }: { controls: ContinuousLearningSummary['closed_loop_multi_tenant_rollout_controls'] }) {
  const checks = controls?.rollout_control_checks || [];
  const blockers = controls?.rollout_control_blockers || [];
  const options = controls?.rollout_control_decision_options || [];
  const policy = controls?.tenant_wave_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop multi-tenant rollout controls</h2>
          <p className="card__subtext">Manual control layer for tenant rollout waves. It checks enterprise governance, rollout readiness, audit traceability, monitoring, compliance attestation, and learning review pressure before any controlled tenant wave is manually approved. It does not provision tenants, enable tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Control decision" value={controls?.rollout_control_decision || 'manual_multi_tenant_rollout_controls_blocked'} />
        <StatCard label="Control score" value={controls?.rollout_control_score ?? 0} />
        <StatCard label="Blocked checks" value={controls?.blocked_check_count ?? 0} />
        <StatCard label="Open review pressure" value={controls?.open_review_pressure_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Control owner: {controls?.recommended_rollout_control_owner || 'enterprise_rollout_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(controls?.next_rollout_control_focus || 'prepare_manual_controlled_tenant_wave_approval')}</p>
      <p className="card__subtext">Recommended wave mode: {formatLabel(policy.recommended_wave_mode || 'pause_multi_tenant_rollout_for_manual_remediation')}</p>
      <p className="card__subtext">Default wave size: {formatLabel(policy.default_wave_size || 'no_new_tenant_wave_until_manual_resolution')}</p>
      <p className="card__subtext">{controls?.rollout_control_note || 'Manual multi-tenant rollout controls remain advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No multi-tenant rollout control blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual control options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.control_evidence)}</td>
                  <td>{formatLabel(check.manual_control_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No multi-tenant rollout control checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseAdoptionReadiness({ readiness }: { readiness: ContinuousLearningSummary['closed_loop_enterprise_adoption_readiness'] }) {
  const checks = readiness?.adoption_checks || [];
  const blockers = readiness?.adoption_blockers || [];
  const options = readiness?.adoption_decision_options || [];
  const policy = readiness?.adoption_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise adoption readiness</h2>
          <p className="card__subtext">Manual executive adoption-readiness layer for enterprise expansion. It checks tenant rollout controls, enterprise governance, commercial readiness, pilot outcomes, and learning coverage before adoption review. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Adoption decision" value={readiness?.adoption_decision || 'enterprise_adoption_readiness_blocked'} />
        <StatCard label="Adoption score" value={readiness?.adoption_readiness_score ?? 0} />
        <StatCard label="Blocked checks" value={readiness?.blocked_check_count ?? 0} />
        <StatCard label="Coverage gaps" value={readiness?.coverage_gap_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Adoption owner: {readiness?.recommended_adoption_owner || 'enterprise_adoption_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(readiness?.next_adoption_focus || 'prepare_manual_enterprise_adoption_signoff')}</p>
      <p className="card__subtext">Recommended adoption mode: {formatLabel(policy.recommended_adoption_mode || 'pause_enterprise_adoption_until_manual_remediation')}</p>
      <p className="card__subtext">Validated pilot outcomes: {readiness?.validated_pilot_outcome_count ?? 0} · Covered domains: {readiness?.covered_domain_count ?? 0}</p>
      <p className="card__subtext">{readiness?.adoption_note || 'Manual enterprise adoption readiness remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise adoption blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual adoption options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.adoption_evidence)}</td>
                  <td>{formatLabel(check.manual_adoption_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise adoption readiness checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationPlan({ plan }: { plan: ContinuousLearningSummary['closed_loop_enterprise_activation_plan'] }) {
  const checks = plan?.activation_checks || [];
  const blockers = plan?.activation_blockers || [];
  const options = plan?.activation_decision_options || [];
  const policy = plan?.activation_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation plan</h2>
          <p className="card__subtext">Manual activation planning layer for enterprise adoption. It checks adoption readiness, monitoring readiness, resolution status, learning signal stability, and domain coverage before customer activation planning. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Activation decision" value={plan?.activation_decision || 'enterprise_activation_plan_blocked'} />
        <StatCard label="Activation score" value={plan?.activation_score ?? 0} />
        <StatCard label="Blocked checks" value={plan?.blocked_check_count ?? 0} />
        <StatCard label="Learning signal" value={plan?.learning_signal_score ?? 0} />
        <StatCard label="Drift pressure" value={plan?.drift_pressure_score ?? 0} />
        <StatCard label="Covered domains" value={plan?.covered_domain_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Activation owner: {plan?.recommended_activation_owner || 'enterprise_activation_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(plan?.next_activation_focus || 'prepare_manual_enterprise_activation_runbook')}</p>
      <p className="card__subtext">Recommended activation mode: {formatLabel(policy.recommended_activation_mode || 'pause_enterprise_activation_until_manual_remediation')}</p>
      <p className="card__subtext">Monitoring owner: {formatLabel(policy.monitoring_owner || 'operations_owner')} · Rollback owner: {formatLabel(policy.rollback_owner || 'enterprise_rollout_owner')}</p>
      <p className="card__subtext">{plan?.activation_note || 'Manual enterprise activation planning remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise activation blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual activation options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.activation_evidence)}</td>
                  <td>{formatLabel(check.manual_activation_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationRunbook({ runbook }: { runbook: ContinuousLearningSummary['closed_loop_enterprise_activation_runbook'] }) {
  const steps = runbook?.runbook_steps || [];
  const blockers = runbook?.runbook_blockers || [];
  const options = runbook?.runbook_decision_options || [];
  const policy = runbook?.runbook_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation runbook</h2>
          <p className="card__subtext">Manual activation runbook layer for final enterprise activation readiness. It ties activation planning, tenant wave controls, surveillance, audit traceability, and compliance attestation into one human signoff surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Runbook decision" value={runbook?.runbook_decision || 'enterprise_activation_runbook_blocked'} />
        <StatCard label="Runbook score" value={runbook?.runbook_score ?? 0} />
        <StatCard label="Ready steps" value={runbook?.ready_step_count ?? 0} />
        <StatCard label="Blocked steps" value={runbook?.blocked_step_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Runbook owner: {runbook?.recommended_runbook_owner || 'enterprise_activation_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(runbook?.next_runbook_focus || 'perform_manual_activation_runbook_signoff')}</p>
      <p className="card__subtext">Recommended runbook mode: {formatLabel(policy.recommended_runbook_mode || 'pause_activation_runbook_until_manual_remediation')}</p>
      <p className="card__subtext">Operations owner: {formatLabel(policy.operations_owner || 'operations_owner')} · Compliance owner: {formatLabel(policy.compliance_owner || 'compliance_owner')} · Rollback owner: {formatLabel(policy.rollback_owner || 'enterprise_rollout_owner')}</p>
      <p className="card__subtext">{runbook?.runbook_note || 'Manual enterprise activation runbook remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise activation runbook blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual runbook options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {steps.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.step_key}>
                  <td>{step.step_label || formatLabel(step.step_key)}</td>
                  <td>{formatLabel(step.step_status)}</td>
                  <td>{formatLabel(step.current_value)}</td>
                  <td>{formatLabel(step.required_value)}</td>
                  <td>{formatLabel(step.runbook_evidence)}</td>
                  <td>{formatLabel(step.manual_runbook_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation runbook steps are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationRollbackPlan({ plan }: { plan: ContinuousLearningSummary['closed_loop_enterprise_activation_rollback_plan'] }) {
  const checks = plan?.rollback_checks || [];
  const blockers = plan?.rollback_blockers || [];
  const options = plan?.rollback_decision_options || [];
  const policy = plan?.rollback_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation rollback plan</h2>
          <p className="card__subtext">Manual rollback readiness layer for enterprise activation. It confirms activation runbook clearance, tenant wave rollback ownership, exception closure, resolution readiness, and surveillance triggers before any activation signoff. It does not disable customers, roll back tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Rollback decision" value={plan?.rollback_decision || 'enterprise_activation_rollback_plan_blocked'} />
        <StatCard label="Rollback score" value={plan?.rollback_score ?? 0} />
        <StatCard label="Ready checks" value={plan?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={plan?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Rollback owner: {plan?.recommended_rollback_owner || 'enterprise_rollout_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(plan?.next_rollback_focus || 'perform_manual_activation_rollback_signoff')}</p>
      <p className="card__subtext">Recommended rollback mode: {formatLabel(policy.recommended_rollback_mode || 'pause_activation_until_manual_rollback_path_is_ready')}</p>
      <p className="card__subtext">Activation owner: {formatLabel(policy.activation_owner || 'enterprise_activation_owner')} · Operations owner: {formatLabel(policy.operations_owner || 'operations_owner')} · Governance owner: {formatLabel(policy.governance_owner || 'governance_owner')}</p>
      <p className="card__subtext">{plan?.rollback_note || 'Manual activation rollback plan remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise activation rollback blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual rollback options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.rollback_evidence)}</td>
                  <td>{formatLabel(check.manual_rollback_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation rollback checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationCutoverReadiness({ readiness }: { readiness: ContinuousLearningSummary['closed_loop_enterprise_activation_cutover_readiness'] }) {
  const checks = readiness?.cutover_checks || [];
  const blockers = readiness?.cutover_blockers || [];
  const options = readiness?.cutover_decision_options || [];
  const policy = readiness?.cutover_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation cutover readiness</h2>
          <p className="card__subtext">Manual cutover readiness layer for enterprise activation. It ties activation plan, runbook, rollback path, monitoring readiness, audit traceability, and compliance attestation into one cutover signoff surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Cutover decision" value={readiness?.cutover_decision || 'enterprise_activation_cutover_blocked'} />
        <StatCard label="Cutover score" value={readiness?.cutover_score ?? 0} />
        <StatCard label="Ready checks" value={readiness?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={readiness?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Cutover owner: {readiness?.recommended_cutover_owner || 'enterprise_activation_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(readiness?.next_cutover_focus || 'perform_manual_enterprise_activation_cutover_signoff')}</p>
      <p className="card__subtext">Recommended cutover mode: {formatLabel(policy.recommended_cutover_mode || 'pause_cutover_until_manual_readiness_blockers_are_resolved')}</p>
      <p className="card__subtext">Activation owner: {formatLabel(policy.activation_owner || 'enterprise_activation_owner')} · Operations owner: {formatLabel(policy.operations_owner || 'operations_owner')} · Governance owner: {formatLabel(policy.governance_owner || 'governance_owner')}</p>
      <p className="card__subtext">{readiness?.cutover_note || 'Manual enterprise activation cutover readiness remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise activation cutover blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual cutover options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.cutover_evidence)}</td>
                  <td>{formatLabel(check.manual_cutover_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation cutover checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationStabilizationPlan({ plan }: { plan: ContinuousLearningSummary['closed_loop_enterprise_activation_stabilization_plan'] }) {
  const checks = plan?.stabilization_checks || [];
  const blockers = plan?.stabilization_blockers || [];
  const options = plan?.stabilization_decision_options || [];
  const policy = plan?.stabilization_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation stabilization plan</h2>
          <p className="card__subtext">Manual post-cutover stabilization layer for enterprise activation. It ties cutover readiness, monitoring, surveillance, exception handling, and closure evidence into one stabilization signoff surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <StatCard label="Stabilization decision" value={plan?.stabilization_decision || 'enterprise_activation_stabilization_blocked'} />
        <StatCard label="Stabilization score" value={plan?.stabilization_score ?? 0} />
        <StatCard label="Ready checks" value={plan?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={plan?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Stabilization owner: {plan?.recommended_stabilization_owner || 'enterprise_activation_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(plan?.next_stabilization_focus || 'perform_manual_post_cutover_stabilization_signoff')}</p>
      <p className="card__subtext">Recommended stabilization mode: {formatLabel(policy.recommended_stabilization_mode || 'pause_stabilization_acceptance_until_manual_blockers_are_resolved')}</p>
      <p className="card__subtext">Cadence: {formatLabel(policy.recommended_review_cadence || 'daily_until_blockers_are_resolved')}</p>
      <p className="card__subtext">Operations owner: {formatLabel(policy.operations_owner || 'operations_owner')} · Governance owner: {formatLabel(policy.governance_owner || 'governance_owner')} · Customer success owner: {formatLabel(policy.customer_success_owner || 'customer_success_owner')}</p>
      <p className="card__subtext">{plan?.stabilization_note || 'Manual enterprise activation stabilization remains advisory only.'}</p>
      {blockers.length > 0 ? (
        <p className="card__subtext">Blockers: {blockers.map(formatLabel).join(' · ')}</p>
      ) : <p className="card__subtext">No enterprise activation stabilization blockers are currently reported.</p>}
      {options.length > 0 ? (
        <p className="card__subtext">Manual stabilization options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length > 0 ? (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{check.check_label || formatLabel(check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.stabilization_evidence)}</td>
                  <td>{formatLabel(check.manual_stabilization_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation stabilization checks are available yet.</p>}
    </section>
  );
}

function FeedbackReviewBoard({ board }: { board: ContinuousLearningSummary['feedback_review_board'] }) {
  const domains = board?.domain_review_summary || [];
  const items = board?.review_items || [];

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Feedback review board</h2>
          <p className="card__subtext">
            Backend-generated governance queue for learning evidence that needs human resolution. This is visibility and review guidance only; it does not execute recommendations or update models.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Review posture" value={board?.review_posture || 'no_review_items_open'} />
        <StatCard label="Open review items" value={board?.review_item_count ?? 0} />
        <StatCard label="Domains" value={board?.domain_count ?? 0} />
        <StatCard label="Readiness score" value={board?.review_readiness_score ?? 100} />
      </div>
      {domains.length > 0 ? (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Priority</th>
                <th>Items</th>
                <th>Evidence types</th>
                <th>Statuses</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain, index) => (
                <tr key={domain.domain || index}>
                  <td>{formatLabel(domain.domain)}</td>
                  <td>{formatLabel(domain.priority)}</td>
                  <td>{formatLabel(domain.review_item_count)}</td>
                  <td>{(domain.evidence_types || []).map(formatLabel).join(', ') || '—'}</td>
                  <td>{(domain.statuses || []).map(formatLabel).join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No domains currently have open learning review items.</p>}

      {items.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Evidence</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Recommended resolution</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 12).map((item, index) => (
                <tr key={`${item.evidence_type || 'evidence'}-${item.evidence_key || index}`}>
                  <td>{formatLabel(item.evidence_type)} / {formatLabel(item.evidence_key)}</td>
                  <td>{formatLabel(item.domain)}</td>
                  <td>{formatLabel(item.status)}</td>
                  <td>{formatLabel(item.recommended_resolution)}</td>
                  <td>{item.review_reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}


function ClosedLoopEnterpriseActivationSupportReadiness({ readiness }: { readiness: ContinuousLearningSummary['closed_loop_enterprise_activation_support_readiness'] }) {
  const checks = readiness?.support_readiness_checks || [];
  const blockers = readiness?.support_readiness_blockers || [];
  const options = readiness?.support_readiness_decision_options || [];
  const policy = readiness?.support_readiness_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation support readiness</h2>
          <p className="card__subtext">Manual support-transition layer for enterprise activation. It ties stabilization, monitoring, surveillance, exception handling, resolution planning, and operational handoff into one support readiness surface. It does not enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Support decision" value={readiness?.support_readiness_decision || 'enterprise_activation_support_transition_blocked'} />
        <StatCard label="Support score" value={readiness?.support_readiness_score ?? 0} />
        <StatCard label="Ready checks" value={readiness?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={readiness?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Support owner: {readiness?.recommended_support_owner || 'support_operations_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(readiness?.next_support_focus || 'perform_manual_support_transition_signoff')}</p>
      <p className="card__subtext">Recommended support mode: {formatLabel(policy.recommended_support_mode || 'pause_support_transition_until_manual_blockers_are_resolved')}</p>
      <p className="card__subtext">Review cadence: {formatLabel(policy.recommended_support_cadence || 'daily_support_blocker_review_until_transition_ready')}</p>
      <p className="card__subtext">{readiness?.support_readiness_note || 'Manual enterprise activation support readiness remains advisory only.'}</p>
      {blockers.length ? (
        <ul>{blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}</ul>
      ) : <p className="card__subtext">No enterprise activation support transition blockers are currently reported.</p>}
      {options.length ? (
        <p className="card__subtext">Manual support transition options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.support_evidence)}</td>
                  <td>{formatLabel(check.manual_support_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation support readiness checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationValueAssurance({ assurance }: { assurance: ContinuousLearningSummary['closed_loop_enterprise_activation_value_assurance'] }) {
  const checks = assurance?.value_assurance_checks || [];
  const blockers = assurance?.value_assurance_blockers || [];
  const options = assurance?.value_assurance_decision_options || [];
  const policy = assurance?.value_assurance_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation value assurance</h2>
          <p className="card__subtext">Manual value-assurance layer for enterprise activation. It checks support transition, evidence coverage, outcome quality, forecast calibration, policy effectiveness, and optimization value before any enterprise value claims are made. It does not publish claims, enable customers, provision tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Value decision" value={assurance?.value_assurance_decision || 'enterprise_activation_value_assurance_blocked'} />
        <StatCard label="Value score" value={assurance?.value_assurance_score ?? 0} />
        <StatCard label="Positive outcomes" value={assurance?.positive_outcome_count ?? 0} />
        <StatCard label="Negative outcomes" value={assurance?.negative_outcome_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Value assurance owner: {assurance?.recommended_value_assurance_owner || 'enterprise_activation_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(assurance?.next_value_assurance_focus || 'perform_manual_enterprise_value_assurance_signoff')}</p>
      <p className="card__subtext">Recommended value claim mode: {formatLabel(policy.recommended_value_claim_mode || 'pause_enterprise_value_claims_until_manual_assurance_blockers_are_resolved')}</p>
      <p className="card__subtext">Review cadence: {formatLabel(policy.recommended_value_review_cadence || 'daily_value_assurance_blocker_review_until_ready')}</p>
      <p className="card__subtext">{assurance?.value_assurance_note || 'Manual enterprise activation value assurance remains advisory only.'}</p>
      {blockers.length ? (
        <ul>{blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}</ul>
      ) : <p className="card__subtext">No enterprise activation value assurance blockers are currently reported.</p>}
      {options.length ? (
        <p className="card__subtext">Manual value assurance options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.value_assurance_evidence)}</td>
                  <td>{formatLabel(check.manual_value_assurance_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation value assurance checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseActivationValueRealizationReview({ review }: { review: ContinuousLearningSummary['closed_loop_enterprise_activation_value_realization_review'] }) {
  const checks = review?.value_realization_checks || [];
  const blockers = review?.value_realization_blockers || [];
  const options = review?.value_realization_decision_options || [];
  const policy = review?.value_realization_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise activation value realization review</h2>
          <p className="card__subtext">Manual value-realization review for enterprise activation. It verifies value assurance, validated outcomes, closure status, cross-domain evidence, and coverage before any value realization signoff. It does not publish value claims, trigger billing, enable tenants, train models, change policies, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Realization decision" value={review?.value_realization_decision || 'enterprise_value_realization_review_blocked'} />
        <StatCard label="Realization score" value={review?.value_realization_score ?? 0} />
        <StatCard label="Validated outcomes" value={review?.validated_outcome_count ?? 0} />
        <StatCard label="Open/rejected outcomes" value={review?.open_or_rejected_outcome_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Realization owner: {review?.recommended_value_realization_owner || 'enterprise_value_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(review?.next_value_realization_focus || 'perform_manual_enterprise_value_realization_signoff')}</p>
      <p className="card__subtext">Recommended realization mode: {formatLabel(policy.recommended_value_realization_mode || 'pause_value_realization_claims_until_manual_blockers_are_resolved')}</p>
      <p className="card__subtext">Review cadence: {formatLabel(policy.recommended_realization_review_cadence || 'daily_value_realization_blocker_review_until_ready')}</p>
      <p className="card__subtext">Positive score total: {review?.positive_outcome_score_total ?? 0} · Negative score total: {review?.negative_outcome_score_total ?? 0}</p>
      <p className="card__subtext">{review?.value_realization_note || 'Manual enterprise activation value realization review remains advisory only.'}</p>
      {blockers.length ? (
        <ul>{blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}</ul>
      ) : <p className="card__subtext">No enterprise activation value realization blockers are currently reported.</p>}
      {options.length ? (
        <p className="card__subtext">Manual realization options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.realization_evidence)}</td>
                  <td>{formatLabel(check.manual_realization_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise activation value realization checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseValueExpansionDecision({ decision }: { decision: ContinuousLearningSummary['closed_loop_enterprise_value_expansion_decision'] }) {
  const checks = decision?.expansion_checks || [];
  const blockers = decision?.expansion_blockers || [];
  const options = decision?.expansion_decision_options || [];
  const policy = decision?.expansion_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise value expansion decision</h2>
          <p className="card__subtext">Manual enterprise expansion decision control. It combines value realization, rollout governance, tenant-wave controls, adoption readiness, and cross-domain learning evidence before expanding to additional tenants or teams. It does not enable tenants, trigger billing, publish claims, train models, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Expansion decision" value={decision?.expansion_decision || 'enterprise_value_expansion_blocked'} />
        <StatCard label="Expansion score" value={decision?.expansion_score ?? 0} />
        <StatCard label="Ready checks" value={decision?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={decision?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Expansion owner: {decision?.recommended_expansion_owner || 'enterprise_value_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(decision?.next_expansion_focus || 'perform_manual_enterprise_value_expansion_approval')}</p>
      <p className="card__subtext">Recommended expansion mode: {formatLabel(policy.recommended_expansion_mode || 'pause_enterprise_expansion_until_manual_blockers_are_resolved')}</p>
      <p className="card__subtext">Tenant-wave policy: {formatLabel(policy.tenant_wave_policy || 'expand_only_by_named_manual_wave_after_rollout_control_review')}</p>
      <p className="card__subtext">Validated outcomes: {decision?.validated_outcome_count ?? 0} · Negative outcomes: {decision?.negative_outcome_count ?? 0}</p>
      <p className="card__subtext">{decision?.expansion_note || 'Manual enterprise value expansion decision remains advisory only.'}</p>
      {blockers.length ? (
        <ul>{blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}</ul>
      ) : <p className="card__subtext">No enterprise value expansion blockers are currently reported.</p>}
      {options.length ? (
        <p className="card__subtext">Manual expansion options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.expansion_evidence)}</td>
                  <td>{formatLabel(check.manual_expansion_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise value expansion checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseValueExpansionOperatingModel({ model }: { model: ContinuousLearningSummary['closed_loop_enterprise_value_expansion_operating_model'] }) {
  const checks = model?.operating_model_checks || [];
  const blockers = model?.operating_model_blockers || [];
  const options = model?.operating_model_decision_options || [];
  const policy = model?.operating_model_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise value expansion operating model</h2>
          <p className="card__subtext">Manual operating-model handoff control for enterprise expansion. It combines expansion approval, tenant-wave controls, support readiness, production surveillance, cross-domain coverage, and unresolved review pressure before scaling the operating model. It does not enable tenants, trigger billing, publish claims, train models, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Operating model decision" value={model?.operating_model_decision || 'enterprise_operating_model_handoff_blocked'} />
        <StatCard label="Operating model score" value={model?.operating_model_score ?? 0} />
        <StatCard label="Ready checks" value={model?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={model?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Operating-model owner: {model?.recommended_operating_model_owner || 'enterprise_value_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(model?.next_operating_model_focus || 'perform_manual_enterprise_operating_model_handoff')}</p>
      <p className="card__subtext">Recommended mode: {formatLabel(policy.recommended_operating_model_mode || 'pause_operating_model_handoff_until_manual_blockers_are_resolved')}</p>
      <p className="card__subtext">Ownership policy: {formatLabel(policy.ownership_policy || 'assign_named_rollout_support_operations_and_value_owners_before_scaled_enterprise_expansion')}</p>
      <p className="card__subtext">Covered domains: {model?.covered_domain_count ?? 0} · Unresolved review pressure: {model?.unresolved_review_pressure_count ?? 0}</p>
      <p className="card__subtext">{model?.operating_model_note || 'Manual enterprise operating-model handoff remains advisory only.'}</p>
      {blockers.length ? (
        <ul>{blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}</ul>
      ) : <p className="card__subtext">No enterprise operating-model blockers are currently reported.</p>}
      {options.length ? (
        <p className="card__subtext">Manual operating-model options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.operating_model_evidence)}</td>
                  <td>{formatLabel(check.manual_operating_model_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise operating-model checks are available yet.</p>}
    </section>
  );
}


function ClosedLoopEnterpriseExpansionGovernanceCadence({ cadence }: { cadence: ContinuousLearningSummary['closed_loop_enterprise_expansion_governance_cadence'] }) {
  const checks = cadence?.cadence_checks || [];
  const blockers = cadence?.cadence_blockers || [];
  const options = cadence?.cadence_decision_options || [];
  const policy = cadence?.cadence_policy || {};

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>Closed-loop enterprise expansion governance cadence</h2>
          <p className="card__subtext">Manual recurring governance cadence for enterprise expansion. It combines operating-model readiness, rollout governance, audit traceability, compliance attestation, and unresolved review pressure. It does not enable tenants, trigger billing, publish value claims, train models, execute recommendations, or mutate operational state.</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Cadence decision" value={cadence?.cadence_decision || 'enterprise_expansion_governance_cadence_blocked'} />
        <StatCard label="Cadence score" value={cadence?.cadence_score ?? 0} />
        <StatCard label="Ready checks" value={cadence?.ready_check_count ?? 0} />
        <StatCard label="Blocked checks" value={cadence?.blocked_check_count ?? 0} />
      </div>
      <p className="card__subtext" style={{ marginTop: 12 }}>Cadence owner: {cadence?.recommended_cadence_owner || 'enterprise_governance_owner'}</p>
      <p className="card__subtext">Next focus: {formatLabel(cadence?.next_cadence_focus || 'start_manual_enterprise_expansion_governance_cadence')}</p>
      <p className="card__subtext">Recommended cadence mode: {formatLabel(policy.recommended_cadence_mode || 'pause_expansion_governance_cadence_until_manual_blockers_are_resolved')}</p>
      <p className="card__subtext">Minimum review cadence: {formatLabel(policy.minimum_review_cadence || 'daily_until_ready')}</p>
      <p className="card__subtext">Unresolved review pressure: {cadence?.unresolved_review_pressure_count ?? 0}</p>
      <p className="card__subtext">{cadence?.cadence_note || 'Manual enterprise expansion governance cadence remains advisory only.'}</p>
      {blockers.length ? (
        <ul>{blockers.map((blocker) => <li key={blocker}>{formatLabel(blocker)}</li>)}</ul>
      ) : <p className="card__subtext">No enterprise expansion governance cadence blockers are currently reported.</p>}
      {options.length ? (
        <p className="card__subtext">Manual cadence options: {options.map(formatLabel).join(' · ')}</p>
      ) : null}
      {checks.length ? (
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
                <th>Current</th>
                <th>Required</th>
                <th>Evidence</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((check) => (
                <tr key={check.check_key}>
                  <td>{formatLabel(check.check_label || check.check_key)}</td>
                  <td>{formatLabel(check.check_status)}</td>
                  <td>{formatLabel(check.current_value)}</td>
                  <td>{formatLabel(check.required_value)}</td>
                  <td>{formatLabel(check.cadence_evidence)}</td>
                  <td>{formatLabel(check.manual_cadence_task)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="card__subtext">No enterprise expansion governance cadence checks are available yet.</p>}
    </section>
  );
}


function RecommendationOutcomeFoundation({ foundation }: { foundation?: ContinuousLearningSummary['recommendation_outcome_foundation'] }) {
  if (!foundation) return null;

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <p className="eyebrow">Phase A · Step A18</p>
          <h2>Recommendation Outcome Foundation</h2>
          <p className="card__subtext">{foundation.completion_definition || 'Trace recommendations to measured business outcomes.'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <StatCard label="Posture" value={foundation.posture || 'unknown'} />
        <StatCard label="Recommendation outcomes" value={foundation.recommendation_outcome_count ?? 0} />
        <StatCard label="Linked outcomes" value={foundation.linked_recommendation_outcome_count ?? 0} />
        <StatCard label="Measured outcomes" value={foundation.measured_recommendation_outcome_count ?? 0} />
        <StatCard label="Full lifecycle traces" value={foundation.full_lifecycle_trace_count ?? 0} />
        <StatCard label="Execution linked" value={foundation.execution_linked_recommendation_outcome_count ?? 0} />
        <StatCard label="Business value measured" value={foundation.business_value_measured_count ?? 0} />
        <StatCard label="Impact measured" value={foundation.impact_measured_count ?? 0} />
        <StatCard label="Classified outcomes" value={foundation.recommendation_outcome_classified_count ?? 0} />
        <StatCard label="Review required" value={foundation.recommendation_outcome_review_required_count ?? 0} />
        <StatCard label="Financial impact measured" value={foundation.financial_impact_measured_count ?? 0} />
        <StatCard label="Business impact evidence" value={foundation.business_impact_evidence_count ?? 0} />
        <StatCard label="Target evidence" value={foundation.target_evidence_count ?? 0} />
        <StatCard label="Target met" value={foundation.target_met_count ?? 0} />
        <StatCard label="Target missed" value={foundation.target_missed_count ?? 0} />
        <StatCard label="Measurement quality evidence" value={foundation.measurement_quality_evidence_count ?? 0} />
        <StatCard label="Low measurement quality" value={foundation.low_measurement_quality_count ?? 0} />
        <StatCard label="Attribution evidence" value={foundation.attribution_evidence_count ?? 0} />
        <StatCard label="Low attribution confidence" value={foundation.low_attribution_confidence_count ?? 0} />
        <StatCard label="Counterfactual references" value={foundation.counterfactual_reference_count ?? 0} />
        <StatCard label="Open reviews" value={foundation.recommendation_review_open_count ?? 0} />
        <StatCard label="Resolved reviews" value={foundation.recommendation_review_resolved_count ?? 0} />
        <StatCard label="Review evidence" value={foundation.recommendation_review_evidence_count ?? 0} />
        <StatCard label="Evaluation scheduled" value={foundation.recommendation_evaluation_scheduled_count ?? 0} />
        <StatCard label="Evaluation overdue" value={foundation.recommendation_evaluation_overdue_count ?? 0} />
        <StatCard label="Evaluation completed" value={foundation.recommendation_evaluation_completed_count ?? 0} />
        <StatCard label="Audit packets" value={foundation.recommendation_outcome_audit_packet_count ?? 0} />
        <StatCard label="Fingerprinted outcomes" value={foundation.recommendation_outcome_fingerprinted_count ?? 0} />
        <StatCard label="Duplicate fingerprints" value={foundation.recommendation_outcome_duplicate_fingerprint_count ?? 0} />
        <StatCard label="Commercial gate" value={foundation.recommendation_outcome_commercial_readiness_gate_status || 'phase_a_closure_blocked'} />
        <StatCard label="Commercially ready" value={foundation.commercially_ready_recommendation_outcome_count ?? 0} />
        <StatCard label="Acceptance integrity ready" value={foundation.recommendation_outcome_acceptance_integrity_ready_count ?? 0} />
        <StatCard label="Acceptance integrity blocked" value={foundation.recommendation_outcome_acceptance_integrity_blocked_count ?? 0} />
        <StatCard label="Corrective actions required" value={foundation.recommendation_outcome_corrective_action_required_count ?? 0} />
        <StatCard label="Corrective actions resolved" value={foundation.recommendation_outcome_corrective_action_resolved_count ?? 0} />
        <StatCard label="Corrective actions open" value={foundation.recommendation_outcome_corrective_action_open_count ?? 0} />
        <StatCard label="Corrective actions overdue" value={foundation.recommendation_outcome_corrective_action_overdue_count ?? 0} />
        <StatCard label="Corrective evidence" value={foundation.recommendation_outcome_corrective_action_evidence_count ?? 0} />
        <StatCard label="Recommendation portfolios" value={foundation.recommendation_outcome_portfolio_count ?? 0} />
        <StatCard label="Supported portfolios" value={foundation.recommendation_outcome_commercially_supported_portfolio_count ?? 0} />
        <StatCard label="Portfolios needing review" value={foundation.recommendation_outcome_portfolio_review_required_count ?? 0} />
        <StatCard label="Learning actions assigned" value={foundation.recommendation_outcome_learning_action_assigned_count ?? 0} />
        <StatCard label="Learning actions complete" value={foundation.recommendation_outcome_learning_action_completed_count ?? 0} />
        <StatCard label="Learning actions overdue" value={foundation.recommendation_outcome_learning_action_overdue_count ?? 0} />
        <StatCard label="Learning actions blocked" value={foundation.recommendation_outcome_learning_action_blocked_count ?? 0} />
        <StatCard label="Learning action escalations" value={foundation.recommendation_outcome_learning_action_escalation_required_count ?? 0} />
        <StatCard label="Commercially blocked" value={foundation.commercially_blocked_recommendation_outcome_count ?? 0} />
        <StatCard label="Readiness blockers" value={foundation.recommendation_outcome_commercial_readiness_blocker_count ?? 0} />
        <StatCard label="Stockouts prevented" value={foundation.stockout_prevented_count ?? 0} />
        <StatCard label="Overstock prevented" value={foundation.overstock_prevented_count ?? 0} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <p className="card__subtext">Link coverage: {formatLabel(foundation.outcome_link_coverage_percent)}%</p>
        <p className="card__subtext">Measurement coverage: {formatLabel(foundation.outcome_measurement_coverage_percent)}%</p>
        <p className="card__subtext">Full lifecycle coverage: {formatLabel(foundation.full_lifecycle_trace_coverage_percent)}%</p>
        <p className="card__subtext">Impact coverage: {formatLabel(foundation.impact_measurement_coverage_percent)}%</p>
        <p className="card__subtext">Classification coverage: {formatLabel(foundation.outcome_classification_coverage_percent)}%</p>
        <p className="card__subtext">Business impact coverage: {formatLabel(foundation.business_impact_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Financial impact coverage: {formatLabel(foundation.financial_impact_coverage_percent)}%</p>
        <p className="card__subtext">Target evidence coverage: {formatLabel(foundation.target_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Target attainment rate: {formatLabel(foundation.target_attainment_rate_percent)}%</p>
        <p className="card__subtext">Baseline/target outcomes: {formatLabel(foundation.baseline_target_outcome_count)}</p>
        <p className="card__subtext">Actual measured targets: {formatLabel(foundation.actual_target_outcome_count)}</p>
        <p className="card__subtext">Measurement quality coverage: {formatLabel(foundation.measurement_quality_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Measurement method coverage: {formatLabel(foundation.measurement_method_coverage_percent)}%</p>
        <p className="card__subtext">Measurement source coverage: {formatLabel(foundation.measurement_source_coverage_percent)}%</p>
        <p className="card__subtext">Measurement owner coverage: {formatLabel(foundation.measurement_owner_coverage_percent)}%</p>
        <p className="card__subtext">Avg measurement data quality: {formatLabel(foundation.average_measurement_data_quality_score)}</p>
        <p className="card__subtext">Attribution evidence coverage: {formatLabel(foundation.attribution_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Attribution method coverage: {formatLabel(foundation.attribution_method_coverage_percent)}%</p>
        <p className="card__subtext">Counterfactual coverage: {formatLabel(foundation.counterfactual_reference_coverage_percent)}%</p>
        <p className="card__subtext">Review resolution coverage: {formatLabel(foundation.recommendation_review_resolution_coverage_percent)}%</p>
        <p className="card__subtext">Review evidence coverage: {formatLabel(foundation.recommendation_review_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Evaluation schedule coverage: {formatLabel(foundation.recommendation_evaluation_schedule_coverage_percent)}%</p>
        <p className="card__subtext">Evaluation completion coverage: {formatLabel(foundation.recommendation_evaluation_completion_coverage_percent)}%</p>
        <p className="card__subtext">Evaluation evidence coverage: {formatLabel(foundation.recommendation_evaluation_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Audit packet coverage: {formatLabel(foundation.recommendation_outcome_audit_packet_coverage_percent)}%</p>
        <p className="card__subtext">Fingerprint coverage: {formatLabel(foundation.recommendation_outcome_fingerprint_coverage_percent)}%</p>
        <p className="card__subtext">Commercial readiness score: {formatLabel(foundation.recommendation_outcome_commercial_readiness_score_percent)}%</p>
        <p className="card__subtext">Commercial readiness coverage: {formatLabel(foundation.recommendation_outcome_commercial_readiness_coverage_percent)}%</p>
        <p className="card__subtext">Acceptance coverage: {formatLabel(foundation.recommendation_outcome_acceptance_coverage_percent)}%</p>
        <p className="card__subtext">Acceptance evidence coverage: {formatLabel(foundation.recommendation_outcome_acceptance_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Acceptance integrity coverage: {formatLabel(foundation.recommendation_outcome_acceptance_integrity_coverage_percent)}%</p>
        <p className="card__subtext">Acceptance integrity evidence coverage: {formatLabel(foundation.recommendation_outcome_acceptance_integrity_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Corrective action resolution coverage: {formatLabel(foundation.recommendation_outcome_corrective_action_resolution_coverage_percent)}%</p>
        <p className="card__subtext">Corrective action evidence coverage: {formatLabel(foundation.recommendation_outcome_corrective_action_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Corrective action owners: {formatLabel(foundation.recommendation_outcome_corrective_action_owner_count)}</p>
        <p className="card__subtext">Corrective action blockers: {formatLabel(foundation.recommendation_outcome_corrective_action_blocked_count)}</p>
        <p className="card__subtext">Portfolio support coverage: {formatLabel(foundation.recommendation_outcome_portfolio_commercial_support_coverage_percent)}%</p>
        <p className="card__subtext">Portfolio posture: {formatLabel(foundation.recommendation_outcome_portfolio_evidence?.portfolio_posture)}</p>
        <p className="card__subtext">Learning action completion: {formatLabel(foundation.recommendation_outcome_learning_action_completion_percent)}%</p>
        <p className="card__subtext">Learning action evidence coverage: {formatLabel(foundation.recommendation_outcome_learning_action_evidence_coverage_percent)}%</p>
        <p className="card__subtext">Learning action escalation clear: {formatLabel(foundation.recommendation_outcome_learning_action_escalation_clear_percent)}%</p>
        <p className="card__subtext">Learning action escalation posture: {formatLabel(foundation.recommendation_outcome_learning_action_escalation_evidence?.escalation_posture)}</p>
        <p className="card__subtext">Learning action owners: {formatLabel(foundation.recommendation_outcome_learning_action_owner_count)}</p>
        <p className="card__subtext">Accepted outcomes: {formatLabel(foundation.recommendation_outcome_acceptance_accepted_count)}</p>
        <p className="card__subtext">Pending acceptance: {formatLabel(foundation.recommendation_outcome_acceptance_pending_count)}</p>
        <p className="card__subtext">Rejected acceptance: {formatLabel(foundation.recommendation_outcome_acceptance_rejected_count)}</p>
        <p className="card__subtext">Deferred acceptance: {formatLabel(foundation.recommendation_outcome_acceptance_deferred_count)}</p>
        <p className="card__subtext">Acceptance owners: {formatLabel(foundation.recommendation_outcome_acceptance_owner_count)}</p>
        <p className="card__subtext">Acceptance timestamps: {formatLabel(foundation.recommendation_outcome_acceptance_timestamp_count)}</p>
        <p className="card__subtext">Rejected reviews: {formatLabel(foundation.recommendation_review_rejected_count)}</p>
        <p className="card__subtext">Deferred reviews: {formatLabel(foundation.recommendation_review_deferred_count)}</p>
        <p className="card__subtext">Reviewed outcomes: {formatLabel(foundation.recommendation_reviewed_count)}</p>
        <p className="card__subtext">Avg attribution confidence: {formatLabel(foundation.average_attribution_confidence_score)}</p>
        <p className="card__subtext">Success rate: {formatLabel(foundation.recommendation_outcome_success_rate_percent)}%</p>
        <p className="card__subtext">Failure rate: {formatLabel(foundation.recommendation_outcome_failure_rate_percent)}%</p>
        <p className="card__subtext">Successful: {formatLabel(foundation.successful_recommendation_outcome_count)}</p>
        <p className="card__subtext">Partially successful: {formatLabel(foundation.partially_successful_recommendation_outcome_count)}</p>
        <p className="card__subtext">Neutral: {formatLabel(foundation.neutral_recommendation_outcome_count)}</p>
        <p className="card__subtext">Failed: {formatLabel(foundation.failed_recommendation_outcome_count)}</p>
        <p className="card__subtext">Inconclusive: {formatLabel(foundation.inconclusive_recommendation_outcome_count)}</p>
        <p className="card__subtext">Unclassified: {formatLabel(foundation.unclassified_recommendation_outcome_count)}</p>
        <p className="card__subtext">Positive financial impact: {formatLabel(foundation.positive_financial_impact_count)}</p>
        <p className="card__subtext">Negative financial impact: {formatLabel(foundation.negative_financial_impact_count)}</p>
        <p className="card__subtext">Waste reduction outcomes: {formatLabel(foundation.waste_reduction_outcome_count)}</p>
        <p className="card__subtext">Service level improved: {formatLabel(foundation.service_level_improved_outcome_count)}</p>
        <p className="card__subtext">Total financial impact: {formatLabel(foundation.total_financial_impact_amount)}</p>
        <p className="card__subtext">Total waste reduced: {formatLabel(foundation.total_waste_reduced_quantity)}</p>
        <p className="card__subtext">Avg service delta %: {formatLabel(foundation.average_service_level_delta_percent)}</p>
        <p className="card__subtext">Generated: {formatLabel(foundation.lifecycle_generated_count)}</p>
        <p className="card__subtext">Approved: {formatLabel(foundation.lifecycle_approved_count)}</p>
        <p className="card__subtext">Executed: {formatLabel(foundation.lifecycle_executed_count)}</p>
        <p className="card__subtext">Measured: {formatLabel(foundation.lifecycle_measured_count)}</p>
        <p className="card__subtext">Scored: {formatLabel(foundation.lifecycle_scored_count)}</p>
        <p className="card__subtext">Validated outcomes: {formatLabel(foundation.validated_recommendation_outcome_count)}</p>
        <p className="card__subtext">Negative outcomes: {formatLabel(foundation.negative_recommendation_outcome_count)}</p>
        <p className="card__subtext">Needs review: {formatLabel(foundation.needs_review_recommendation_outcome_count)}</p>
        <p className="card__subtext">Avg outcome score: {formatLabel(foundation.average_outcome_score)}</p>
        <p className="card__subtext">Avg business value score: {formatLabel(foundation.average_business_value_score)}</p>
        <p className="card__subtext">Avg stock impact: {formatLabel(foundation.average_stock_impact_score)}</p>
        <p className="card__subtext">Avg financial impact: {formatLabel(foundation.average_financial_impact_score)}</p>
        <p className="card__subtext">Avg waste impact: {formatLabel(foundation.average_waste_impact_score)}</p>
        <p className="card__subtext">Avg service impact: {formatLabel(foundation.average_service_level_impact_score)}</p>
      </div>

      {(foundation.recommendation_outcome_portfolio_evidence?.portfolio_evidence_items || []).length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <h3>Recommendation portfolio commercial value evidence</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Portfolio</th>
                <th>Domain</th>
                <th>Outcomes</th>
                <th>Success %</th>
                <th>Accepted %</th>
                <th>Financial impact</th>
                <th>Corrective closure %</th>
                <th>Posture</th>
              </tr>
            </thead>
            <tbody>
              {(foundation.recommendation_outcome_portfolio_evidence?.portfolio_evidence_items || []).map((item) => (
                <tr key={item.recommendation_portfolio_key || item.learning_domain || 'portfolio'}>
                  <td>{formatLabel(item.recommendation_portfolio_key)}</td>
                  <td>{formatLabel(item.learning_domain)}</td>
                  <td>{formatLabel(item.outcome_count)}</td>
                  <td>{formatLabel(item.success_rate_percent)}</td>
                  <td>{formatLabel(item.acceptance_rate_percent)}</td>
                  <td>{formatLabel(item.total_financial_impact_amount)} {item.financial_impact_currency || ''}</td>
                  <td>{formatLabel(item.corrective_action_closure_rate_percent)}</td>
                  <td>{formatLabel(item.portfolio_posture)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card__subtext" style={{ marginTop: 12 }}>No recommendation portfolio evidence has been recorded yet.</p>
      )}

      {(foundation.recommendation_outcome_learning_action_escalation_evidence?.escalation_items || []).length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <h3>Learning action escalation evidence</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Outcome</th>
                <th>Recommendation</th>
                <th>Signal</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {(foundation.recommendation_outcome_learning_action_escalation_evidence?.escalation_items || []).map((item, index) => (
                <tr key={item.outcome_key || index}>
                  <td>{formatLabel(item.outcome_key)}</td>
                  <td>{formatLabel(item.recommendation_key || item.recommendation_id)}</td>
                  <td>{formatLabel(item.learning_signal)}</td>
                  <td>{formatLabel(item.learning_action_status)}</td>
                  <td>{formatLabel(item.learning_action_owner)}</td>
                  <td>{formatLabel(item.learning_action_due_at)}</td>
                  <td>{formatLabel(item.escalation_reason)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card__subtext" style={{ marginTop: 12 }}>No blocked or overdue learning actions require escalation.</p>
      )}

      {foundation.recommendation_outcome_phase_a_closure_evidence ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h4>Phase A closure evidence</h4>
          <p className="card__subtext">Closure status: {formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.closure_status)}</p>
          <p className="card__subtext">Capability status: {formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.implemented_capability_status)}</p>
          <p className="card__subtext">Runtime data status: {formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.runtime_data_status)}</p>
          <p className="card__subtext">Readiness: {formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.readiness_score_percent)}%</p>
          <p className="card__subtext">Next phase: {formatLabel(foundation.recommendation_outcome_phase_a_closure_evidence.next_phase)}</p>
          <p className="card__subtext">Implemented capabilities: {(foundation.recommendation_outcome_phase_a_closure_evidence.implemented_capabilities || []).map(formatLabel).join(', ')}</p>
        </div>
      ) : null}

      {(foundation.recommendation_outcome_commercial_readiness_blockers || []).length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <h3>Phase A commercial-readiness blockers</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Blocker</th>
                <th>Current</th>
                <th>Required</th>
                <th>Manual task</th>
              </tr>
            </thead>
            <tbody>
              {(foundation.recommendation_outcome_commercial_readiness_blockers || []).map((blocker) => (
                <tr key={blocker.blocker_key || blocker.blocker_label}>
                  <td>{formatLabel(blocker.blocker_label || blocker.blocker_key || 'blocker')}</td>
                  <td>{formatLabel(blocker.current_value)}</td>
                  <td>{formatLabel(blocker.required_value)}</td>
                  <td>{blocker.manual_resolution_task || 'Resolve evidence gap before Phase A closure.'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="card__subtext" style={{ marginTop: 12 }}>Phase A commercial-readiness gate has no blockers for the currently loaded outcome evidence.</p>
      )}
      <p className="card__subtext" style={{ marginTop: 12 }}>
        Safety: evidence-only learning, tamper-evident outcome fingerprinting, no autonomous model update, no autonomous recommendation execution, no operational mutation.
      </p>
    </section>
  );
}

function EvidenceTable({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  const previewRows = rows.slice(0, 8);

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2>{title}</h2>
          <p className="card__subtext">Latest governed learning evidence from the backend continuous-learning summary.</p>
        </div>
      </div>
      {!previewRows.length ? (
        <p className="card__subtext">No evidence captured yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Domain</th>
                <th>Status</th>
                <th>Score / Error</th>
                <th>Observed</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={String(row.id || row.outcome_key || row.accuracy_key || row.effectiveness_key || row.result_key || index)}>
                  <td>{formatLabel(row.outcome_key || row.accuracy_key || row.effectiveness_key || row.result_key || row.id)}</td>
                  <td>{formatLabel(row.learning_domain || row.forecast_domain || row.policy_domain || row.result_domain)}</td>
                  <td>{formatLabel(row.outcome_status || row.calibration_status || row.effectiveness_status || row.result_status)}</td>
                  <td>{formatLabel(row.outcome_score || row.absolute_error || row.effectiveness_score || row.realized_value_score)}</td>
                  <td>{formatLabel(row.observed_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function DecisionLearningFeedbackPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<FeedbackMode>('learning-outcomes');
  const [form, setForm] = useState<FeedbackFormState>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['decision-learning-summary'],
    queryFn: () => apiRequest<ContinuousLearningSummary>('/decision-intelligence/continuous-learning-summary?limit=25')
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiRequest<Record<string, unknown>>(`/decision-intelligence-feedback/${mode}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    onSuccess: async () => {
      setMessage(`${modeLabels[mode]} recorded. The backend stores this as learning evidence only.`);
      setForm(defaultForm);
      await queryClient.invalidateQueries({ queryKey: ['decision-learning-summary'] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : 'Unable to record feedback evidence.');
    }
  });

  const governance = summaryQuery.data?.governance;
  const activeStatusOptions = useMemo(() => statusOptions[mode], [mode]);

  const updateForm = (field: keyof FeedbackFormState, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleModeChange = (nextMode: FeedbackMode) => {
    setMode(nextMode);
    setForm((current) => ({ ...current, status: statusOptions[nextMode][0] || 'observed' }));
    setMessage(null);
  };

  const submitFeedback = () => {
    setMessage(null);
    mutation.mutate(buildPayload(mode, form));
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Decision Intelligence</p>
          <h1>Continuous Learning Feedback</h1>
          <p className="page-subtitle">
            Capture observed outcomes, forecast accuracy, policy effectiveness, and optimization results without training models, auto-updating policies, or mutating operational state.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <StatCard label="Posture" value={governance?.continuous_learning_posture || (summaryQuery.isLoading ? 'loading' : 'unknown')} />
        <StatCard label="Outcomes" value={governance?.outcome_count ?? 0} />
        <StatCard label="Forecast evidence" value={governance?.forecast_accuracy_count ?? 0} />
        <StatCard label="Policy evidence" value={governance?.policy_effectiveness_count ?? 0} />
        <StatCard label="Optimization evidence" value={governance?.optimization_result_count ?? 0} />
      </div>

      <section className="card">
        <div className="card__header">
          <div>
            <h2>Record governed feedback</h2>
            <p className="card__subtext">This writes audit-backed evidence to the new feedback endpoints and then refreshes the existing continuous-learning summary.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label>
            <span className="form-label">Feedback type</span>
            <select className="input" value={mode} onChange={(event) => handleModeChange(event.target.value as FeedbackMode)}>
              {(Object.keys(modeLabels) as FeedbackMode[]).map((item) => <option key={item} value={item}>{modeLabels[item]}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Domain</span>
            <input className="input" value={form.domain} onChange={(event) => updateForm('domain', event.target.value)} placeholder="multi_domain" />
          </label>
          <label>
            <span className="form-label">Status</span>
            <select className="input" value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
              {activeStatusOptions.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Score (-1 to 1)</span>
            <input className="input" value={form.score} onChange={(event) => updateForm('score', event.target.value)} placeholder="0" />
          </label>
          {mode === 'learning-outcomes' ? (
            <label>
              <span className="form-label">Recommendation key</span>
              <input className="input" value={form.recommendationKey} onChange={(event) => updateForm('recommendationKey', event.target.value)} placeholder="recommendation-key" />
            </label>
          ) : null}
        </div>

        {mode === 'learning-outcomes' ? (
          <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Business value</span>
              <input className="input" value={form.businessValueScore} onChange={(event) => updateForm('businessValueScore', event.target.value)} placeholder="-1 to 1" />
            </label>
            <label>
              <span className="form-label">Stock impact</span>
              <input className="input" value={form.stockImpactScore} onChange={(event) => updateForm('stockImpactScore', event.target.value)} placeholder="-1 to 1" />
            </label>
            <label>
              <span className="form-label">Financial impact</span>
              <input className="input" value={form.financialImpactScore} onChange={(event) => updateForm('financialImpactScore', event.target.value)} placeholder="-1 to 1" />
            </label>
            <label>
              <span className="form-label">Waste impact</span>
              <input className="input" value={form.wasteImpactScore} onChange={(event) => updateForm('wasteImpactScore', event.target.value)} placeholder="-1 to 1" />
            </label>
            <label>
              <span className="form-label">Service impact</span>
              <input className="input" value={form.serviceLevelImpactScore} onChange={(event) => updateForm('serviceLevelImpactScore', event.target.value)} placeholder="-1 to 1" />
            </label>
            <label>
              <span className="form-label">Outcome confidence</span>
              <input className="input" value={form.outcomeConfidenceScore} onChange={(event) => updateForm('outcomeConfidenceScore', event.target.value)} placeholder="0 to 1" />
            </label>
            <label>
              <span className="form-label">Outcome classification</span>
              <select className="input" value={form.outcomeClassification} onChange={(event) => updateForm('outcomeClassification', event.target.value)}>
                {['successful', 'partially_successful', 'neutral', 'failed', 'inconclusive', 'unclassified'].map((classification) => <option key={classification} value={classification}>{formatLabel(classification)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Review required</span>
              <select className="input" value={String(form.outcomeReviewRequired)} onChange={(event) => updateForm('outcomeReviewRequired', event.target.value === 'true')}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Outcome review reason JSON</span>
              <textarea className="input" value={form.outcomeReviewReason} onChange={(event) => updateForm('outcomeReviewReason', event.target.value)} placeholder='{"reason":"negative stock impact"}' rows={2} />
            </label>
          </div>


          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Financial impact amount</span>
              <input className="input" value={form.financialImpactAmount} onChange={(event) => updateForm('financialImpactAmount', event.target.value)} placeholder="1250.00" />
            </label>
            <label>
              <span className="form-label">Currency</span>
              <input className="input" value={form.financialImpactCurrency} onChange={(event) => updateForm('financialImpactCurrency', event.target.value)} placeholder="EUR" maxLength={3} />
            </label>
            <label>
              <span className="form-label">Stockout prevented</span>
              <select className="input" value={String(form.stockoutPrevented)} onChange={(event) => updateForm('stockoutPrevented', event.target.value === 'true')}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <label>
              <span className="form-label">Overstock prevented</span>
              <select className="input" value={String(form.overstockPrevented)} onChange={(event) => updateForm('overstockPrevented', event.target.value === 'true')}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
            <label>
              <span className="form-label">Waste reduced quantity</span>
              <input className="input" value={form.wasteReducedQuantity} onChange={(event) => updateForm('wasteReducedQuantity', event.target.value)} placeholder="12" />
            </label>
            <label>
              <span className="form-label">Service delta %</span>
              <input className="input" value={form.serviceLevelDeltaPercent} onChange={(event) => updateForm('serviceLevelDeltaPercent', event.target.value)} placeholder="3.5" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Business impact evidence JSON</span>
              <textarea className="input" value={form.businessImpactEvidence} onChange={(event) => updateForm('businessImpactEvidence', event.target.value)} placeholder='{"evidence":"stockout avoided after reorder recommendation"}' rows={2} />
            </label>
          </div>


          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Baseline metric value</span>
              <input className="input" value={form.baselineMetricValue} onChange={(event) => updateForm('baselineMetricValue', event.target.value)} placeholder="10" />
            </label>
            <label>
              <span className="form-label">Target metric value</span>
              <input className="input" value={form.targetMetricValue} onChange={(event) => updateForm('targetMetricValue', event.target.value)} placeholder="15" />
            </label>
            <label>
              <span className="form-label">Actual metric value</span>
              <input className="input" value={form.actualMetricValue} onChange={(event) => updateForm('actualMetricValue', event.target.value)} placeholder="16" />
            </label>
            <label>
              <span className="form-label">Metric unit</span>
              <input className="input" value={form.metricUnit} onChange={(event) => updateForm('metricUnit', event.target.value)} placeholder="units" />
            </label>
            <label>
              <span className="form-label">Target direction</span>
              <select className="input" value={form.targetDirection} onChange={(event) => updateForm('targetDirection', event.target.value)}>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
                <option value="maintain">Maintain</option>
              </select>
            </label>
            <label>
              <span className="form-label">Target tolerance %</span>
              <input className="input" value={form.targetTolerancePercent} onChange={(event) => updateForm('targetTolerancePercent', event.target.value)} placeholder="5" />
            </label>
            <label>
              <span className="form-label">Target met</span>
              <select className="input" value={form.targetMet} onChange={(event) => updateForm('targetMet', event.target.value)}>
                <option value="">Infer from values</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Target evidence JSON</span>
              <textarea className="input" value={form.targetEvidence} onChange={(event) => updateForm('targetEvidence', event.target.value)} placeholder='{"metric":"stockout days","baseline":3,"target":0,"actual":0}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Attribution method</span>
              <select className="input" value={form.attributionMethod} onChange={(event) => updateForm('attributionMethod', event.target.value)}>
                {['direct_measurement', 'before_after', 'control_group', 'counterfactual', 'manual_assessment', 'inferred'].map((method) => <option key={method} value={method}>{formatLabel(method)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Attribution confidence</span>
              <input className="input" value={form.attributionConfidenceScore} onChange={(event) => updateForm('attributionConfidenceScore', event.target.value)} placeholder="0 to 1" />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Counterfactual reference JSON</span>
              <textarea className="input" value={form.counterfactualReference} onChange={(event) => updateForm('counterfactualReference', event.target.value)} placeholder='{"baseline_period":"previous 30 days","comparison":"similar item"}' rows={2} />
            </label>
            <label>
              <span className="form-label">Attribution evidence JSON</span>
              <textarea className="input" value={form.attributionEvidence} onChange={(event) => updateForm('attributionEvidence', event.target.value)} placeholder='{"why_attributed":"stockout rate dropped after approved min-stock change"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Measurement method</span>
              <input className="input" value={form.measurementMethod} onChange={(event) => updateForm('measurementMethod', event.target.value)} placeholder="manual review / report / sensor" />
            </label>
            <label>
              <span className="form-label">Measurement source</span>
              <input className="input" value={form.measurementSource} onChange={(event) => updateForm('measurementSource', event.target.value)} placeholder="stock report / supplier KPI" />
            </label>
            <label>
              <span className="form-label">Measurement owner</span>
              <input className="input" value={form.measurementOwner} onChange={(event) => updateForm('measurementOwner', event.target.value)} placeholder="operations manager" />
            </label>
            <label>
              <span className="form-label">Measurement sample size</span>
              <input className="input" value={form.measurementSampleSize} onChange={(event) => updateForm('measurementSampleSize', event.target.value)} placeholder="30" />
            </label>
            <label>
              <span className="form-label">Data quality score</span>
              <input className="input" value={form.measurementDataQualityScore} onChange={(event) => updateForm('measurementDataQualityScore', event.target.value)} placeholder="0 to 1" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Measurement quality evidence JSON</span>
              <textarea className="input" value={form.measurementQualityEvidence} onChange={(event) => updateForm('measurementQualityEvidence', event.target.value)} placeholder='{"source":"stock movement report","reviewed_by":"manager"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Review status</span>
              <select className="input" value={form.reviewStatus} onChange={(event) => updateForm('reviewStatus', event.target.value)}>
                {['not_required', 'open', 'in_review', 'resolved', 'rejected', 'deferred'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Review owner</span>
              <input className="input" value={form.reviewOwner} onChange={(event) => updateForm('reviewOwner', event.target.value)} placeholder="decision governance reviewer" />
            </label>
            <label>
              <span className="form-label">Reviewed at</span>
              <input className="input" value={form.reviewedAt} onChange={(event) => updateForm('reviewedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Review resolution</span>
              <select className="input" value={form.reviewResolution} onChange={(event) => updateForm('reviewResolution', event.target.value)}>
                <option value="">No resolution yet</option>
                {['accepted', 'corrected', 'overridden', 'invalidated', 'deferred', 'not_actionable'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Review resolution evidence JSON</span>
              <textarea className="input" value={form.reviewEvidence} onChange={(event) => updateForm('reviewEvidence', event.target.value)} placeholder='{"resolution_reason":"reviewed against stockout and cost evidence"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Evaluation due at</span>
              <input className="input" value={form.evaluationDueAt} onChange={(event) => updateForm('evaluationDueAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Evaluation status</span>
              <select className="input" value={form.evaluationStatus} onChange={(event) => updateForm('evaluationStatus', event.target.value)}>
                {['not_scheduled', 'scheduled', 'due', 'overdue', 'completed', 'waived'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Evaluation owner</span>
              <input className="input" value={form.evaluationOwner} onChange={(event) => updateForm('evaluationOwner', event.target.value)} placeholder="outcome evaluator" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Evaluation SLA evidence JSON</span>
              <textarea className="input" value={form.evaluationEvidence} onChange={(event) => updateForm('evaluationEvidence', event.target.value)} placeholder='{"measurement_due_policy":"30 days after execution"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Outcome acceptance status</span>
              <select className="input" value={form.acceptanceStatus} onChange={(event) => updateForm('acceptanceStatus', event.target.value)}>
                {['pending', 'accepted', 'rejected', 'deferred'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Acceptance owner</span>
              <input className="input" value={form.acceptanceOwner} onChange={(event) => updateForm('acceptanceOwner', event.target.value)} placeholder="commercial outcome approver" />
            </label>
            <label>
              <span className="form-label">Accepted at</span>
              <input className="input" value={form.acceptedAt} onChange={(event) => updateForm('acceptedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Outcome acceptance evidence JSON</span>
              <textarea className="input" value={form.acceptanceEvidence} onChange={(event) => updateForm('acceptanceEvidence', event.target.value)} placeholder='{"accepted_by":"commercial owner","reason":"complete lifecycle and measured impact evidence reviewed"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Corrective action status</span>
              <select className="input" value={form.correctiveActionStatus} onChange={(event) => updateForm('correctiveActionStatus', event.target.value)}>
                {['not_required', 'open', 'in_progress', 'resolved', 'waived'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Corrective action owner</span>
              <input className="input" value={form.correctiveActionOwner} onChange={(event) => updateForm('correctiveActionOwner', event.target.value)} placeholder="remediation owner" />
            </label>
            <label>
              <span className="form-label">Corrective due at</span>
              <input className="input" value={form.correctiveActionDueAt} onChange={(event) => updateForm('correctiveActionDueAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Corrective resolved at</span>
              <input className="input" value={form.correctiveActionResolvedAt} onChange={(event) => updateForm('correctiveActionResolvedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Corrective action evidence JSON</span>
              <textarea className="input" value={form.correctiveActionEvidence} onChange={(event) => updateForm('correctiveActionEvidence', event.target.value)} placeholder='{"corrective_action":"supplier threshold adjusted after missed target","resolution":"reviewed and waived/resolved"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Learning signal</span>
              <select className="input" value={form.learningSignal} onChange={(event) => updateForm('learningSignal', event.target.value)}>
                {['reinforce', 'tune', 'suppress', 'review', 'unclassified'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Learning signal reason</span>
              <input className="input" value={form.learningSignalReason} onChange={(event) => updateForm('learningSignalReason', event.target.value)} placeholder="why this outcome should reinforce/tune/suppress/review future guidance" />
            </label>
            <label>
              <span className="form-label">Recommended next action</span>
              <input className="input" value={form.learningSignalNextAction} onChange={(event) => updateForm('learningSignalNextAction', event.target.value)} placeholder="manual next governance action for this recommendation pattern" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Learning signal evidence JSON</span>
              <textarea className="input" value={form.learningSignalEvidence} onChange={(event) => updateForm('learningSignalEvidence', event.target.value)} placeholder='{"signal_basis":"measured outcome converted into future manual recommendation guidance"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Learning action status</span>
              <select className="input" value={form.learningActionStatus} onChange={(event) => updateForm('learningActionStatus', event.target.value)}>
                {['pending', 'assigned', 'completed', 'blocked', 'waived'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Learning action owner</span>
              <input className="input" value={form.learningActionOwner} onChange={(event) => updateForm('learningActionOwner', event.target.value)} placeholder="manual follow-up owner" />
            </label>
            <label>
              <span className="form-label">Learning action due at</span>
              <input className="input" value={form.learningActionDueAt} onChange={(event) => updateForm('learningActionDueAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Learning action completed at</span>
              <input className="input" value={form.learningActionCompletedAt} onChange={(event) => updateForm('learningActionCompletedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>
              <span className="form-label">Learning action evidence JSON</span>
              <textarea className="input" value={form.learningActionEvidence} onChange={(event) => updateForm('learningActionEvidence', event.target.value)} placeholder='{"manual_follow_up":"threshold review completed or waived with owner evidence"}' rows={2} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Lifecycle status</span>
              <select className="input" value={form.lifecycleStatus} onChange={(event) => updateForm('lifecycleStatus', event.target.value)}>
                {['generated', 'approved', 'executed', 'measured', 'scored', 'validated', 'needs_review', 'dismissed'].map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
              </select>
            </label>
            <label>
              <span className="form-label">Generated at</span>
              <input className="input" value={form.generatedAt} onChange={(event) => updateForm('generatedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Approved at</span>
              <input className="input" value={form.approvedAt} onChange={(event) => updateForm('approvedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Executed at</span>
              <input className="input" value={form.executedAt} onChange={(event) => updateForm('executedAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Measured at</span>
              <input className="input" value={form.measuredAt} onChange={(event) => updateForm('measuredAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
            <label>
              <span className="form-label">Scored at</span>
              <input className="input" value={form.scoredAt} onChange={(event) => updateForm('scoredAt', event.target.value)} placeholder="ISO timestamp" />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
            <label>
              <span className="form-label">Execution reference JSON or note</span>
              <textarea className="input" rows={3} value={form.executionReference} onChange={(event) => updateForm('executionReference', event.target.value)} placeholder='{"execution_request_id":"..."}' />
            </label>
            <label>
              <span className="form-label">Lifecycle evidence JSON or note</span>
              <textarea className="input" rows={3} value={form.lifecycleEvidence} onChange={(event) => updateForm('lifecycleEvidence', event.target.value)} placeholder='{"reviewer":"manager","evidence":"approved and executed"}' />
            </label>
          </div>
          </>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 12 }}>
          <label>
            <span className="form-label">Reference JSON or note</span>
            <textarea className="input" rows={4} value={form.reference} onChange={(event) => updateForm('reference', event.target.value)} placeholder='{"source":"recommendation-review"}' />
          </label>
          <label>
            <span className="form-label">Expected result / predicted value</span>
            <textarea className="input" rows={4} value={form.expected} onChange={(event) => updateForm('expected', event.target.value)} placeholder='{"expected":"lower stockout risk"}' />
          </label>
          <label>
            <span className="form-label">Observed result / observed value</span>
            <textarea className="input" rows={4} value={form.observed} onChange={(event) => updateForm('observed', event.target.value)} placeholder='{"observed":"risk reduced after review"}' />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
          <button className="button" type="button" disabled={mutation.isPending} onClick={submitFeedback}>
            {mutation.isPending ? 'Recording…' : 'Record feedback evidence'}
          </button>
          {message ? <span className="card__subtext">{message}</span> : null}
        </div>
      </section>

      <RecommendationOutcomeFoundation foundation={summaryQuery.data?.recommendation_outcome_foundation} />
      <FeedbackActionPlan plan={summaryQuery.data?.feedback_action_plan} />
      <LearningImpactAssessment assessment={summaryQuery.data?.learning_impact_assessment} />
      <LearningCoverageMatrix matrix={summaryQuery.data?.learning_coverage_matrix} />
      <LearningMaturityRoadmap roadmap={summaryQuery.data?.learning_maturity_roadmap} />
      <ClosedLoopGovernanceGate gate={summaryQuery.data?.closed_loop_governance_gate} />
      <ClosedLoopSignoffPacket packet={summaryQuery.data?.closed_loop_signoff_packet} />
      <ClosedLoopReleaseReadinessSnapshot snapshot={summaryQuery.data?.closed_loop_release_readiness_snapshot} />
      <ClosedLoopOperationalHandoff handoff={summaryQuery.data?.closed_loop_operational_handoff} />
      <ClosedLoopOperationalAcceptance acceptance={summaryQuery.data?.closed_loop_operational_acceptance} />
      <ClosedLoopMonitoringReadiness readiness={summaryQuery.data?.closed_loop_monitoring_readiness} />
      <ClosedLoopProductionSurveillance surveillance={summaryQuery.data?.closed_loop_production_surveillance} />
      <ClosedLoopExceptionRegister register={summaryQuery.data?.closed_loop_exception_register} />
      <ClosedLoopResolutionPlan plan={summaryQuery.data?.closed_loop_resolution_plan} />
      <ClosedLoopClosureReport report={summaryQuery.data?.closed_loop_closure_report} />
      <ClosedLoopCertificationDossier dossier={summaryQuery.data?.closed_loop_certification_dossier} />
      <ClosedLoopAuditLedger ledger={summaryQuery.data?.closed_loop_audit_ledger} />
      <ClosedLoopComplianceAttestation attestation={summaryQuery.data?.closed_loop_compliance_attestation} />
      <ClosedLoopCommercialReadinessPacket packet={summaryQuery.data?.closed_loop_commercial_readiness_packet} />
      <ClosedLoopCustomerPilotReadiness pilot={summaryQuery.data?.closed_loop_customer_pilot_readiness} />
      <ClosedLoopCustomerPilotLaunchControl launch={summaryQuery.data?.closed_loop_customer_pilot_launch_control} />
      <ClosedLoopCustomerPilotSuccessCriteria success={summaryQuery.data?.closed_loop_customer_pilot_success_criteria} />
      <ClosedLoopCustomerPilotOutcomeReview review={summaryQuery.data?.closed_loop_customer_pilot_outcome_review} />
      <ClosedLoopCustomerPilotExpansionReadiness expansion={summaryQuery.data?.closed_loop_customer_pilot_expansion_readiness} />
      <ClosedLoopEnterpriseRolloutReadiness rollout={summaryQuery.data?.closed_loop_enterprise_rollout_readiness} />
      <ClosedLoopEnterpriseRolloutGovernance governance={summaryQuery.data?.closed_loop_enterprise_rollout_governance} />
      <ClosedLoopMultiTenantRolloutControls controls={summaryQuery.data?.closed_loop_multi_tenant_rollout_controls} />
      <ClosedLoopEnterpriseAdoptionReadiness readiness={summaryQuery.data?.closed_loop_enterprise_adoption_readiness} />
      <ClosedLoopEnterpriseActivationPlan plan={summaryQuery.data?.closed_loop_enterprise_activation_plan} />
      <ClosedLoopEnterpriseActivationRunbook runbook={summaryQuery.data?.closed_loop_enterprise_activation_runbook} />
      <ClosedLoopEnterpriseActivationRollbackPlan plan={summaryQuery.data?.closed_loop_enterprise_activation_rollback_plan} />
      <ClosedLoopEnterpriseActivationCutoverReadiness readiness={summaryQuery.data?.closed_loop_enterprise_activation_cutover_readiness} />
      <ClosedLoopEnterpriseActivationStabilizationPlan plan={summaryQuery.data?.closed_loop_enterprise_activation_stabilization_plan} />
      <ClosedLoopEnterpriseActivationSupportReadiness readiness={summaryQuery.data?.closed_loop_enterprise_activation_support_readiness} />
      <ClosedLoopEnterpriseActivationValueAssurance assurance={summaryQuery.data?.closed_loop_enterprise_activation_value_assurance} />
      <ClosedLoopEnterpriseActivationValueRealizationReview review={summaryQuery.data?.closed_loop_enterprise_activation_value_realization_review} />
      <ClosedLoopEnterpriseValueExpansionDecision decision={summaryQuery.data?.closed_loop_enterprise_value_expansion_decision} />
      <ClosedLoopEnterpriseValueExpansionOperatingModel model={summaryQuery.data?.closed_loop_enterprise_value_expansion_operating_model} />
      <ClosedLoopEnterpriseExpansionGovernanceCadence cadence={summaryQuery.data?.closed_loop_enterprise_expansion_governance_cadence} />
      <FeedbackReviewBoard board={summaryQuery.data?.feedback_review_board} />

      <section className="card">
        <h2>Safety contract</h2>
        <p className="card__subtext">
          External model training: {governance?.external_model_training ? 'yes' : 'no'} · Autonomous model update: {governance?.autonomous_model_update ? 'yes' : 'no'} · Autonomous policy update: {governance?.autonomous_policy_update ? 'yes' : 'no'} · Operational mutation: {governance?.operational_state_mutation ? 'yes' : 'no'}
        </p>
        <p className="card__subtext">Observed domains: {(governance?.observed_domains || []).join(', ') || 'none yet'}</p>
      </section>

      {summaryQuery.isError ? <section className="card"><p className="card__subtext">Unable to load continuous-learning summary.</p></section> : null}

      <EvidenceTable title="Learning outcomes" rows={summaryQuery.data?.outcomes || []} />
      <EvidenceTable title="Forecast accuracy" rows={summaryQuery.data?.forecast_accuracy || []} />
      <EvidenceTable title="Policy effectiveness" rows={summaryQuery.data?.policy_effectiveness || []} />
      <EvidenceTable title="Optimization results" rows={summaryQuery.data?.optimization_results || []} />
    </div>
  );
}
