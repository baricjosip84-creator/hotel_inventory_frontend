import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type VerificationControl = {
  order: number;
  code: string;
  domain: string;
  label: string;
  evidence_surface: string;
  required_action: string;
  automation_level: string;
  status: string;
};

type GateControl = {
  order: number;
  code: string;
  label: string;
  evidence_surface: string;
  required_evidence: string;
  failure_mode: string;
  status: string;
  automation_level: string;
};

type ReadinessGate = {
  step: string;
  posture: string;
  summary: {
    controls_total: number;
    operator_evidence_required: number;
    production_smoke_runs_required?: number;
    migration_review_steps_required?: number;
    permission_test_runs_required?: number;
    tenant_isolation_test_runs_required?: number;
    customer_journey_runs_required?: number;
    restore_drills_required?: number;
    deployment_ready_for_live_execution?: number;
    migration_ready_for_live_execution?: number;
    security_ready_for_live_execution?: number;
    tenant_isolation_ready_for_live_execution?: number;
    workflow_ready_for_live_execution?: number;
    backup_restore_ready_for_live_execution?: number;
    performance_ready_for_live_execution?: number;
    production_monitoring_ready_for_live_execution?: number;
    automated_testing_ready_for_live_execution?: number;
    data_integrity_ready_for_live_execution?: number;
    deployment_certified?: number;
    migration_certified?: number;
    security_certified?: number;
    tenant_isolation_certified?: number;
    workflow_certified?: number;
    backup_restore_certified?: number;
    performance_certified?: number;
    production_monitoring_certified?: number;
    automated_testing_certified?: number;
    data_integrity_certified?: number;
    load_test_runs_required?: number;
    monitoring_reviews_required?: number;
    test_evidence_runs_required?: number;
    data_reconciliation_runs_required?: number;
    billing_reviews_required?: number;
    billing_subscription_ready_for_live_execution?: number;
    billing_subscription_certified?: number;
    onboarding_reviews_required?: number;
    onboarding_ready_for_live_execution?: number;
    onboarding_certified?: number;
    support_incident_reviews_required?: number;
    support_incident_response_ready_for_live_execution?: number;
    support_incident_response_certified?: number;
    commercial_launch_reviews_required?: number;
    commercial_launch_go_no_go_ready_for_live_execution?: number;
    commercial_launch_go_no_go_certified?: number;
    closure_reviews_required?: number;
    commercial_readiness_closure_ready_for_live_execution?: number;
    commercial_readiness_closure_certified?: number;
    stabilization_reviews_required?: number;
    post_launch_stabilization_ready_for_live_execution?: number;
    post_launch_stabilization_certified?: number;
    customer_success_reviews_required?: number;
    customer_success_handoff_ready_for_live_execution?: number;
    customer_success_handoff_certified?: number;
    renewal_reviews_required?: number;
    retention_renewal_ready_for_live_execution?: number;
    retention_renewal_certified?: number;
    revenue_operations_reviews_required?: number;
    revenue_operations_ready_for_live_execution?: number;
    revenue_operations_certified?: number;
    legal_compliance_reviews_required?: number;
    legal_compliance_ready_for_live_execution?: number;
    legal_compliance_certified?: number;
    enterprise_procurement_reviews_required?: number;
    enterprise_procurement_ready_for_live_execution?: number;
    enterprise_procurement_certified?: number;
    enterprise_implementation_reviews_required?: number;
    enterprise_implementation_ready_for_live_execution?: number;
    enterprise_implementation_certified?: number;
    customer_data_migration_reviews_required?: number;
    customer_data_migration_ready_for_live_execution?: number;
    customer_data_migration_certified?: number;
    enterprise_security_assurance_reviews_required?: number;
    enterprise_security_assurance_ready_for_live_execution?: number;
    enterprise_security_assurance_certified?: number;
    enterprise_privacy_assurance_reviews_required?: number;
    enterprise_privacy_assurance_ready_for_live_execution?: number;
    enterprise_privacy_assurance_certified?: number;
    enterprise_data_residency_reviews_required?: number;
    enterprise_data_residency_ready_for_live_execution?: number;
    enterprise_data_residency_certified?: number;
    enterprise_audit_assurance_reviews_required?: number;
    enterprise_audit_assurance_ready_for_live_execution?: number;
    enterprise_audit_assurance_certified?: number;
    enterprise_business_continuity_reviews_required?: number;
    enterprise_business_continuity_ready_for_live_execution?: number;
    enterprise_business_continuity_certified?: number;
    enterprise_reliability_assurance_reviews_required?: number;
    enterprise_reliability_assurance_ready_for_live_execution?: number;
    enterprise_reliability_assurance_certified?: number;
    enterprise_scalability_assurance_reviews_required?: number;
    enterprise_scalability_assurance_ready_for_live_execution?: number;
    enterprise_scalability_assurance_certified?: number;
    enterprise_cost_governance_reviews_required?: number;
    enterprise_cost_governance_ready_for_live_execution?: number;
    enterprise_cost_governance_certified?: number;
    enterprise_vendor_risk_reviews_required?: number;
    enterprise_vendor_risk_ready_for_live_execution?: number;
    enterprise_vendor_risk_certified?: number;
    enterprise_change_management_reviews_required?: number;
    enterprise_change_management_ready_for_live_execution?: number;
    enterprise_change_management_certified?: number;
    enterprise_training_enablement_reviews_required?: number;
    enterprise_training_enablement_ready_for_live_execution?: number;
    enterprise_training_enablement_certified?: number;
    enterprise_adoption_measurement_reviews_required?: number;
    enterprise_adoption_measurement_ready_for_live_execution?: number;
    enterprise_adoption_measurement_certified?: number;
    enterprise_executive_reporting_reviews_required?: number;
    enterprise_executive_reporting_ready_for_live_execution?: number;
    enterprise_executive_reporting_certified?: number;
    enterprise_board_governance_reviews_required?: number;
    enterprise_board_governance_ready_for_live_execution?: number;
    enterprise_board_governance_certified?: number;
    enterprise_strategic_planning_reviews_required?: number;
    enterprise_strategic_planning_ready_for_live_execution?: number;
    enterprise_strategic_planning_certified?: number;
    enterprise_portfolio_governance_reviews_required?: number;
    enterprise_portfolio_governance_ready_for_live_execution?: number;
    enterprise_portfolio_governance_certified?: number;
    enterprise_customer_reference_reviews_required?: number;
    enterprise_customer_reference_ready_for_live_execution?: number;
    enterprise_customer_reference_certified?: number;
    enterprise_partner_ecosystem_reviews_required?: number;
    enterprise_partner_ecosystem_ready_for_live_execution?: number;
    enterprise_partner_ecosystem_certified?: number;
    enterprise_marketplace_listing_reviews_required?: number;
    enterprise_marketplace_listing_ready_for_live_execution?: number;
    enterprise_marketplace_listing_certified?: number;
    enterprise_sales_enablement_reviews_required?: number;
    enterprise_sales_enablement_ready_for_live_execution?: number;
    enterprise_sales_enablement_certified?: number;
    enterprise_contracting_reviews_required?: number;
    enterprise_contracting_ready_for_live_execution?: number;
    enterprise_contracting_certified?: number;
    enterprise_order_management_reviews_required?: number;
    enterprise_order_management_ready_for_live_execution?: number;
    enterprise_order_management_certified?: number;
    enterprise_fulfillment_assurance_reviews_required?: number;
    enterprise_fulfillment_assurance_ready_for_live_execution?: number;
    enterprise_fulfillment_assurance_certified?: number;
    enterprise_service_delivery_reviews_required?: number;
    enterprise_service_delivery_ready_for_live_execution?: number;
    enterprise_service_delivery_certified?: number;
    enterprise_customer_health_reviews_required?: number;
    enterprise_customer_health_ready_for_live_execution?: number;
    enterprise_customer_health_certified?: number;
    enterprise_expansion_readiness_reviews_required?: number;
    enterprise_expansion_readiness_ready_for_live_execution?: number;
    enterprise_expansion_readiness_certified?: number;
    enterprise_expansion_execution_reviews_required?: number;
    enterprise_expansion_execution_ready_for_live_execution?: number;
    enterprise_expansion_execution_certified?: number;
    enterprise_account_governance_reviews_required?: number;
    enterprise_account_governance_ready_for_live_execution?: number;
    enterprise_account_governance_certified?: number;
    enterprise_value_realization_reviews_required?: number;
    enterprise_value_realization_ready_for_live_execution?: number;
    enterprise_value_realization_certified?: number;
    enterprise_renewal_execution_reviews_required?: number;
    enterprise_renewal_execution_ready_for_live_execution?: number;
    enterprise_renewal_execution_certified?: number;
    enterprise_churn_prevention_reviews_required?: number;
    enterprise_churn_prevention_ready_for_live_execution?: number;
    enterprise_churn_prevention_certified?: number;
    enterprise_customer_advocacy_reviews_required?: number;
    enterprise_customer_advocacy_ready_for_live_execution?: number;
    enterprise_customer_advocacy_certified?: number;
    enterprise_product_feedback_reviews_required?: number;
    enterprise_product_feedback_ready_for_live_execution?: number;
    enterprise_product_feedback_certified?: number;
    enterprise_roadmap_governance_reviews_required?: number;
    enterprise_roadmap_governance_ready_for_live_execution?: number;
    enterprise_roadmap_governance_certified?: number;
    enterprise_release_governance_reviews_required?: number;
    enterprise_release_governance_ready_for_live_execution?: number;
    enterprise_release_governance_certified?: number;
    enterprise_deployment_governance_reviews_required?: number;
    enterprise_deployment_governance_ready_for_live_execution?: number;
    enterprise_deployment_governance_certified?: number;
    enterprise_observability_governance_reviews_required?: number;
    enterprise_observability_governance_ready_for_live_execution?: number;
    enterprise_observability_governance_certified?: number;
    enterprise_incident_governance_reviews_required?: number;
    enterprise_incident_governance_ready_for_live_execution?: number;
    enterprise_incident_governance_certified?: number;
    enterprise_problem_management_reviews_required?: number;
    enterprise_problem_management_ready_for_live_execution?: number;
    enterprise_problem_management_certified?: number;
    enterprise_knowledge_management_reviews_required?: number;
    enterprise_knowledge_management_ready_for_live_execution?: number;
    enterprise_knowledge_management_certified?: number;
    enterprise_support_operations_reviews_required?: number;
    enterprise_support_operations_ready_for_live_execution?: number;
    enterprise_support_operations_certified?: number;
    enterprise_customer_operations_reviews_required?: number;
    enterprise_customer_operations_ready_for_live_execution?: number;
    enterprise_customer_operations_certified?: number;
    enterprise_customer_experience_reviews_required?: number;
    enterprise_customer_experience_ready_for_live_execution?: number;
    enterprise_customer_experience_certified?: number;
    enterprise_customer_satisfaction_reviews_required?: number;
    enterprise_customer_satisfaction_ready_for_live_execution?: number;
    enterprise_customer_satisfaction_certified?: number;
    enterprise_customer_loyalty_reviews_required?: number;
    enterprise_customer_loyalty_ready_for_live_execution?: number;
    enterprise_customer_loyalty_certified?: number;
    enterprise_customer_success_maturity_reviews_required?: number;
    enterprise_customer_success_maturity_ready_for_live_execution?: number;
    enterprise_customer_success_maturity_certified?: number;
    enterprise_customer_success_scale_reviews_required?: number;
    enterprise_customer_success_scale_ready_for_live_execution?: number;
    enterprise_customer_success_scale_certified?: number;
    enterprise_customer_success_optimization_reviews_required?: number;
    enterprise_customer_success_optimization_ready_for_live_execution?: number;
    enterprise_customer_success_optimization_certified?: number;
    enterprise_customer_success_intelligence_reviews_required?: number;
    enterprise_customer_success_intelligence_ready_for_live_execution?: number;
    enterprise_customer_success_intelligence_certified?: number;
    enterprise_customer_success_governance_reviews_required?: number;
    enterprise_customer_success_governance_ready_for_live_execution?: number;
    enterprise_customer_success_governance_certified?: number;
    enterprise_customer_success_risk_reviews_required?: number;
    enterprise_customer_success_risk_ready_for_live_execution?: number;
    enterprise_customer_success_risk_certified?: number;
    enterprise_customer_success_compliance_reviews_required?: number;
    enterprise_customer_success_compliance_ready_for_live_execution?: number;
    enterprise_customer_success_compliance_certified?: number;
    enterprise_customer_success_lifecycle_reviews_required?: number;
    enterprise_customer_success_lifecycle_ready_for_live_execution?: number;
    enterprise_customer_success_lifecycle_certified?: number;
    enterprise_customer_success_automation_reviews_required?: number;
    enterprise_customer_success_automation_ready_for_live_execution?: number;
    enterprise_customer_success_automation_certified?: number;
    enterprise_customer_success_escalation_reviews_required?: number;
    enterprise_customer_success_escalation_ready_for_live_execution?: number;
    enterprise_customer_success_escalation_certified?: number;
    enterprise_customer_success_retention_reviews_required?: number;
    enterprise_customer_success_retention_ready_for_live_execution?: number;
    enterprise_customer_success_retention_certified?: number;
    enterprise_customer_success_reporting_reviews_required?: number;
    enterprise_customer_success_reporting_ready_for_live_execution?: number;
    enterprise_customer_success_reporting_certified?: number;
    enterprise_customer_success_closure_reviews_required?: number;
    enterprise_customer_success_closure_ready_for_live_execution?: number;
    enterprise_customer_success_closure_certified?: number;
    enterprise_customer_success_certification_reviews_required?: number;
    enterprise_customer_success_certification_ready_for_live_execution?: number;
    enterprise_customer_success_certification_certified?: number;
    enterprise_customer_success_attestation_reviews_required?: number;
    enterprise_customer_success_attestation_ready_for_live_execution?: number;
    enterprise_customer_success_attestation_certified?: number;
    enterprise_customer_success_final_audit_reviews_required?: number;
    enterprise_customer_success_final_audit_ready_for_live_execution?: number;
    enterprise_customer_success_final_audit_certified?: number;
    enterprise_customer_success_chapter_closure_reviews_required?: number;
    enterprise_customer_success_chapter_closure_ready_for_live_execution?: number;
    enterprise_customer_success_chapter_closure_certified?: number;
    enterprise_customer_success_post_closure_monitoring_reviews_required?: number;
    enterprise_customer_success_post_closure_monitoring_ready_for_live_execution?: number;
    enterprise_customer_success_post_closure_monitoring_certified?: number;
    enterprise_customer_success_continuous_improvement_reviews_required?: number;
    enterprise_customer_success_continuous_improvement_ready_for_live_execution?: number;
    enterprise_customer_success_continuous_improvement_certified?: number;
    enterprise_customer_success_operating_model_reviews_required?: number;
    enterprise_customer_success_operating_model_ready_for_live_execution?: number;
    enterprise_customer_success_operating_model_certified?: number;
    enterprise_customer_success_quality_reviews_required?: number;
    enterprise_customer_success_quality_ready_for_live_execution?: number;
    enterprise_customer_success_quality_certified?: number;
    enterprise_customer_success_performance_reviews_required?: number;
    enterprise_customer_success_performance_ready_for_live_execution?: number;
    enterprise_customer_success_performance_certified?: number;
    enterprise_customer_success_sustainability_reviews_required?: number;
    enterprise_customer_success_sustainability_ready_for_live_execution?: number;
    enterprise_customer_success_sustainability_certified?: number;
    enterprise_customer_success_resilience_reviews_required?: number;
    enterprise_customer_success_resilience_ready_for_live_execution?: number;
    enterprise_customer_success_resilience_certified?: number;
    enterprise_customer_success_benchmarking_reviews_required?: number;
    enterprise_customer_success_benchmarking_ready_for_live_execution?: number;
    enterprise_customer_success_benchmarking_certified?: number;
    enterprise_customer_success_differentiation_reviews_required?: number;
    enterprise_customer_success_differentiation_ready_for_live_execution?: number;
    enterprise_customer_success_differentiation_certified?: number;
    enterprise_customer_success_market_validation_reviews_required?: number;
    enterprise_customer_success_market_validation_ready_for_live_execution?: number;
    enterprise_customer_success_market_validation_certified?: number;
    enterprise_customer_success_commercialization_reviews_required?: number;
    enterprise_customer_success_commercialization_ready_for_live_execution?: number;
    enterprise_customer_success_commercialization_certified?: number;
    enterprise_customer_success_scale_out_reviews_required?: number;
    enterprise_customer_success_scale_out_ready_for_live_execution?: number;
    enterprise_customer_success_scale_out_certified?: number;
    enterprise_customer_success_rollout_reviews_required?: number;
    enterprise_customer_success_rollout_ready_for_live_execution?: number;
    enterprise_customer_success_rollout_certified?: number;
    enterprise_customer_success_go_live_reviews_required?: number;
    enterprise_customer_success_go_live_ready_for_live_execution?: number;
    enterprise_customer_success_go_live_certified?: number;
    enterprise_customer_success_hypercare_reviews_required?: number;
    enterprise_customer_success_hypercare_ready_for_live_execution?: number;
    enterprise_customer_success_hypercare_certified?: number;
    enterprise_customer_success_transition_reviews_required?: number;
    enterprise_customer_success_transition_ready_for_live_execution?: number;
    enterprise_customer_success_transition_certified?: number;
    enterprise_customer_success_steady_state_reviews_required?: number;
    enterprise_customer_success_steady_state_ready_for_live_execution?: number;
    enterprise_customer_success_steady_state_certified?: number;
    enterprise_customer_success_terminal_closure_reviews_required?: number;
    enterprise_customer_success_terminal_closure_ready_for_live_execution?: number;
    enterprise_customer_success_terminal_closure_certified?: number;
    customer_success_chapter_terminally_closed?: number;
    additional_customer_success_gates_planned?: number;
  };
  controls: GateControl[];
  execution_order: string[];
  closure_rule: string;
};

type VerificationProgram = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: {
    controls_total: number;
    verification_surfaces_present: number;
    runtime_or_manual_runs_required: number;
    ready_for_execution: number;
    by_domain: Record<string, { controls_total: number; verification_surfaces_present: number; runtime_or_manual_runs_required: number }>;
  };
  controls: VerificationControl[];
  execution_sequence: string[];
  deployment_verification_gate?: ReadinessGate;
  migration_verification_gate?: ReadinessGate;
  security_permission_verification_gate?: ReadinessGate;
  tenant_isolation_verification_gate?: ReadinessGate;
  end_to_end_workflow_verification_gate?: ReadinessGate;
  backup_restore_verification_gate?: ReadinessGate;
  performance_load_verification_gate?: ReadinessGate;
  production_monitoring_verification_gate?: ReadinessGate;
  automated_testing_evidence_verification_gate?: ReadinessGate;
  data_integrity_verification_gate?: ReadinessGate;
  billing_subscription_verification_gate?: ReadinessGate;
  onboarding_verification_gate?: ReadinessGate;
  support_incident_response_verification_gate?: ReadinessGate;
  commercial_launch_go_no_go_verification_gate?: ReadinessGate;
  commercial_readiness_closure_evidence_gate?: ReadinessGate;
  post_launch_stabilization_verification_gate?: ReadinessGate;
  customer_success_handoff_verification_gate?: ReadinessGate;
  retention_renewal_verification_gate?: ReadinessGate;
  revenue_operations_verification_gate?: ReadinessGate;
  legal_compliance_verification_gate?: ReadinessGate;
  enterprise_procurement_verification_gate?: ReadinessGate;
  enterprise_implementation_verification_gate?: ReadinessGate;
  customer_data_migration_verification_gate?: ReadinessGate;
  enterprise_security_assurance_verification_gate?: ReadinessGate;
  enterprise_privacy_assurance_verification_gate?: ReadinessGate;
  enterprise_data_residency_verification_gate?: ReadinessGate;
  enterprise_audit_assurance_verification_gate?: ReadinessGate;
  enterprise_business_continuity_verification_gate?: ReadinessGate;
  enterprise_reliability_assurance_verification_gate?: ReadinessGate;
  enterprise_scalability_assurance_verification_gate?: ReadinessGate;
  enterprise_cost_governance_verification_gate?: ReadinessGate;
  enterprise_vendor_risk_verification_gate?: ReadinessGate;
  enterprise_change_management_verification_gate?: ReadinessGate;
  enterprise_training_enablement_verification_gate?: ReadinessGate;
  enterprise_adoption_measurement_verification_gate?: ReadinessGate;
  enterprise_executive_reporting_verification_gate?: ReadinessGate;
  enterprise_board_governance_verification_gate?: ReadinessGate;
  enterprise_strategic_planning_verification_gate?: ReadinessGate;
  enterprise_portfolio_governance_verification_gate?: ReadinessGate;
  enterprise_customer_reference_verification_gate?: ReadinessGate;
  enterprise_partner_ecosystem_verification_gate?: ReadinessGate;
  enterprise_marketplace_listing_verification_gate?: ReadinessGate;
  enterprise_sales_enablement_verification_gate?: ReadinessGate;
  enterprise_contracting_verification_gate?: ReadinessGate;
  enterprise_order_management_verification_gate?: ReadinessGate;
  enterprise_fulfillment_assurance_verification_gate?: ReadinessGate;
  enterprise_service_delivery_verification_gate?: ReadinessGate;
  enterprise_customer_health_verification_gate?: ReadinessGate;
  enterprise_expansion_readiness_verification_gate?: ReadinessGate;
  enterprise_expansion_execution_verification_gate?: ReadinessGate;
  enterprise_account_governance_verification_gate?: ReadinessGate;
  enterprise_value_realization_verification_gate?: ReadinessGate;
  enterprise_renewal_execution_verification_gate?: ReadinessGate;
  enterprise_churn_prevention_verification_gate?: ReadinessGate;
  enterprise_customer_advocacy_verification_gate?: ReadinessGate;
  enterprise_product_feedback_verification_gate?: ReadinessGate;
  enterprise_roadmap_governance_verification_gate?: ReadinessGate;
  enterprise_release_governance_verification_gate?: ReadinessGate;
  enterprise_deployment_governance_verification_gate?: ReadinessGate;
  enterprise_observability_governance_verification_gate?: ReadinessGate;
  enterprise_incident_governance_verification_gate?: ReadinessGate;
  enterprise_problem_management_verification_gate?: ReadinessGate;
  enterprise_knowledge_management_verification_gate?: ReadinessGate;
  enterprise_support_operations_verification_gate?: ReadinessGate;
  enterprise_customer_operations_verification_gate?: ReadinessGate;
  enterprise_customer_experience_verification_gate?: ReadinessGate;
  enterprise_customer_satisfaction_verification_gate?: ReadinessGate;
  enterprise_customer_loyalty_verification_gate?: ReadinessGate;
  enterprise_customer_success_maturity_verification_gate?: ReadinessGate;
  enterprise_customer_success_scale_verification_gate?: ReadinessGate;
  enterprise_customer_success_optimization_verification_gate?: ReadinessGate;
  enterprise_customer_success_intelligence_verification_gate?: ReadinessGate;
  enterprise_customer_success_governance_verification_gate?: ReadinessGate;
  enterprise_customer_success_risk_verification_gate?: ReadinessGate;
  enterprise_customer_success_compliance_verification_gate?: ReadinessGate;
  enterprise_customer_success_lifecycle_verification_gate?: ReadinessGate;
  enterprise_customer_success_automation_verification_gate?: ReadinessGate;
  enterprise_customer_success_escalation_verification_gate?: ReadinessGate;
  enterprise_customer_success_retention_verification_gate?: ReadinessGate;
  enterprise_customer_success_reporting_verification_gate?: ReadinessGate;
  enterprise_customer_success_closure_verification_gate?: ReadinessGate;
  enterprise_customer_success_certification_verification_gate?: ReadinessGate;
  enterprise_customer_success_attestation_verification_gate?: ReadinessGate;
  enterprise_customer_success_final_audit_verification_gate?: ReadinessGate;
  enterprise_customer_success_chapter_closure_verification_gate?: ReadinessGate;
  enterprise_customer_success_post_closure_monitoring_verification_gate?: ReadinessGate;
  enterprise_customer_success_continuous_improvement_verification_gate?: ReadinessGate;
  enterprise_customer_success_operating_model_verification_gate?: ReadinessGate;
  enterprise_customer_success_quality_verification_gate?: ReadinessGate;
  enterprise_customer_success_performance_verification_gate?: ReadinessGate;
  enterprise_customer_success_sustainability_verification_gate?: ReadinessGate;
  enterprise_customer_success_resilience_verification_gate?: ReadinessGate;
  enterprise_customer_success_benchmarking_verification_gate?: ReadinessGate;
  enterprise_customer_success_differentiation_verification_gate?: ReadinessGate;
  enterprise_customer_success_market_validation_verification_gate?: ReadinessGate;
  enterprise_customer_success_commercialization_verification_gate?: ReadinessGate;
  enterprise_customer_success_scale_out_verification_gate?: ReadinessGate;
  enterprise_customer_success_rollout_verification_gate?: ReadinessGate;
  enterprise_customer_success_go_live_verification_gate?: ReadinessGate;
  enterprise_customer_success_hypercare_verification_gate?: ReadinessGate;
  enterprise_customer_success_transition_verification_gate?: ReadinessGate;
  enterprise_customer_success_steady_state_verification_gate?: ReadinessGate;
  enterprise_customer_success_terminal_closure_verification_gate?: ReadinessGate;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('required') || value.includes('ready_for_operator')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}


function isGateCertified(gate: ReadinessGate) {
  return Boolean(
    gate.summary.deployment_certified ||
    gate.summary.migration_certified ||
    gate.summary.security_certified ||
    gate.summary.tenant_isolation_certified ||
    gate.summary.workflow_certified ||
    gate.summary.backup_restore_certified ||
    gate.summary.performance_certified ||
    gate.summary.production_monitoring_certified ||
    gate.summary.automated_testing_certified ||
    gate.summary.data_integrity_certified ||
    gate.summary.billing_subscription_certified ||
    gate.summary.onboarding_certified ||
    gate.summary.support_incident_response_certified ||
    gate.summary.commercial_launch_go_no_go_certified ||
    gate.summary.commercial_readiness_closure_certified ||
    gate.summary.post_launch_stabilization_certified ||
    gate.summary.customer_success_handoff_certified ||
    gate.summary.retention_renewal_certified ||
    gate.summary.revenue_operations_certified ||
    gate.summary.legal_compliance_certified ||
    gate.summary.enterprise_procurement_certified ||
    gate.summary.enterprise_implementation_certified ||
    gate.summary.customer_data_migration_certified ||
    gate.summary.enterprise_security_assurance_certified ||
    gate.summary.enterprise_privacy_assurance_certified ||
    gate.summary.enterprise_data_residency_certified ||
    gate.summary.enterprise_audit_assurance_certified ||
    gate.summary.enterprise_business_continuity_certified ||
    gate.summary.enterprise_reliability_assurance_certified ||
    gate.summary.enterprise_scalability_assurance_certified ||
    gate.summary.enterprise_cost_governance_certified ||
    gate.summary.enterprise_vendor_risk_certified ||
    gate.summary.enterprise_change_management_certified ||
    gate.summary.enterprise_training_enablement_certified ||
    gate.summary.enterprise_adoption_measurement_certified ||
    gate.summary.enterprise_executive_reporting_certified ||
    gate.summary.enterprise_board_governance_certified ||
    gate.summary.enterprise_strategic_planning_certified ||
    gate.summary.enterprise_portfolio_governance_certified ||
    gate.summary.enterprise_customer_reference_certified ||
    gate.summary.enterprise_partner_ecosystem_certified ||
    gate.summary.enterprise_marketplace_listing_certified ||
    gate.summary.enterprise_sales_enablement_certified ||
    gate.summary.enterprise_contracting_certified ||
    gate.summary.enterprise_order_management_certified ||
    gate.summary.enterprise_fulfillment_assurance_certified ||
    gate.summary.enterprise_service_delivery_certified ||
    gate.summary.enterprise_customer_health_certified ||
    gate.summary.enterprise_expansion_readiness_certified ||
    gate.summary.enterprise_expansion_execution_certified ||
    gate.summary.enterprise_account_governance_certified ||
    gate.summary.enterprise_value_realization_certified ||
    gate.summary.enterprise_renewal_execution_certified ||
    gate.summary.enterprise_churn_prevention_certified ||
    gate.summary.enterprise_customer_advocacy_certified ||
    gate.summary.enterprise_product_feedback_certified ||
    gate.summary.enterprise_roadmap_governance_certified ||
    gate.summary.enterprise_release_governance_certified ||
    gate.summary.enterprise_deployment_governance_certified ||
    gate.summary.enterprise_observability_governance_certified ||
    gate.summary.enterprise_incident_governance_certified ||
    gate.summary.enterprise_problem_management_certified ||
    gate.summary.enterprise_knowledge_management_certified ||
    gate.summary.enterprise_support_operations_certified ||
    gate.summary.enterprise_customer_operations_certified ||
    gate.summary.enterprise_customer_experience_certified ||
    gate.summary.enterprise_customer_satisfaction_certified ||
    gate.summary.enterprise_customer_loyalty_certified ||
    gate.summary.enterprise_customer_success_maturity_certified ||
    gate.summary.enterprise_customer_success_scale_certified ||
    gate.summary.enterprise_customer_success_optimization_certified ||
    gate.summary.enterprise_customer_success_intelligence_certified ||
    gate.summary.enterprise_customer_success_governance_certified ||
    gate.summary.enterprise_customer_success_risk_certified ||
    gate.summary.enterprise_customer_success_compliance_certified ||
    gate.summary.enterprise_customer_success_lifecycle_certified ||
    gate.summary.enterprise_customer_success_automation_certified ||
    gate.summary.enterprise_customer_success_escalation_certified ||
    gate.summary.enterprise_customer_success_retention_certified ||
    gate.summary.enterprise_customer_success_reporting_certified ||
    gate.summary.enterprise_customer_success_closure_certified ||
    gate.summary.enterprise_customer_success_certification_certified ||
    gate.summary.enterprise_customer_success_attestation_certified ||
    gate.summary.enterprise_customer_success_final_audit_certified ||
    gate.summary.enterprise_customer_success_chapter_closure_certified ||
    gate.summary.enterprise_customer_success_post_closure_monitoring_certified ||
    gate.summary.enterprise_customer_success_continuous_improvement_certified ||
    gate.summary.enterprise_customer_success_operating_model_certified ||
    gate.summary.enterprise_customer_success_quality_certified ||
    gate.summary.enterprise_customer_success_performance_certified ||
    gate.summary.enterprise_customer_success_sustainability_certified ||
    gate.summary.enterprise_customer_success_resilience_certified ||
    gate.summary.enterprise_customer_success_benchmarking_certified ||
    gate.summary.enterprise_customer_success_differentiation_certified ||
    gate.summary.enterprise_customer_success_market_validation_certified ||
    gate.summary.enterprise_customer_success_commercialization_certified ||
    gate.summary.enterprise_customer_success_scale_out_certified ||
    gate.summary.enterprise_customer_success_rollout_certified ||
    gate.summary.enterprise_customer_success_go_live_certified ||
    gate.summary.enterprise_customer_success_hypercare_certified ||
    gate.summary.enterprise_customer_success_transition_certified ||
    gate.summary.enterprise_customer_success_steady_state_certified ||
    gate.summary.enterprise_customer_success_terminal_closure_certified
  );
}

function isGateReadyForLiveExecution(gate: ReadinessGate) {
  return Boolean(
    gate.summary.deployment_ready_for_live_execution ||
    gate.summary.migration_ready_for_live_execution ||
    gate.summary.security_ready_for_live_execution ||
    gate.summary.tenant_isolation_ready_for_live_execution ||
    gate.summary.workflow_ready_for_live_execution ||
    gate.summary.backup_restore_ready_for_live_execution ||
    gate.summary.performance_ready_for_live_execution ||
    gate.summary.production_monitoring_ready_for_live_execution ||
    gate.summary.automated_testing_ready_for_live_execution ||
    gate.summary.data_integrity_ready_for_live_execution ||
    gate.summary.billing_subscription_ready_for_live_execution ||
    gate.summary.onboarding_ready_for_live_execution ||
    gate.summary.support_incident_response_ready_for_live_execution ||
    gate.summary.commercial_launch_go_no_go_ready_for_live_execution ||
    gate.summary.commercial_readiness_closure_ready_for_live_execution ||
    gate.summary.post_launch_stabilization_ready_for_live_execution ||
    gate.summary.customer_success_handoff_ready_for_live_execution ||
    gate.summary.retention_renewal_ready_for_live_execution ||
    gate.summary.revenue_operations_ready_for_live_execution ||
    gate.summary.legal_compliance_ready_for_live_execution ||
    gate.summary.enterprise_procurement_ready_for_live_execution ||
    gate.summary.enterprise_implementation_ready_for_live_execution ||
    gate.summary.customer_data_migration_ready_for_live_execution ||
    gate.summary.enterprise_security_assurance_ready_for_live_execution ||
    gate.summary.enterprise_privacy_assurance_ready_for_live_execution ||
    gate.summary.enterprise_data_residency_ready_for_live_execution ||
    gate.summary.enterprise_audit_assurance_ready_for_live_execution ||
    gate.summary.enterprise_business_continuity_ready_for_live_execution ||
    gate.summary.enterprise_reliability_assurance_ready_for_live_execution ||
    gate.summary.enterprise_scalability_assurance_ready_for_live_execution ||
    gate.summary.enterprise_cost_governance_ready_for_live_execution ||
    gate.summary.enterprise_vendor_risk_ready_for_live_execution ||
    gate.summary.enterprise_change_management_ready_for_live_execution ||
    gate.summary.enterprise_training_enablement_ready_for_live_execution ||
    gate.summary.enterprise_adoption_measurement_ready_for_live_execution ||
    gate.summary.enterprise_executive_reporting_ready_for_live_execution ||
    gate.summary.enterprise_board_governance_ready_for_live_execution ||
    gate.summary.enterprise_strategic_planning_ready_for_live_execution ||
    gate.summary.enterprise_portfolio_governance_ready_for_live_execution ||
    gate.summary.enterprise_customer_reference_ready_for_live_execution ||
    gate.summary.enterprise_partner_ecosystem_ready_for_live_execution ||
    gate.summary.enterprise_marketplace_listing_ready_for_live_execution ||
    gate.summary.enterprise_sales_enablement_ready_for_live_execution ||
    gate.summary.enterprise_contracting_ready_for_live_execution ||
    gate.summary.enterprise_order_management_ready_for_live_execution ||
    gate.summary.enterprise_fulfillment_assurance_ready_for_live_execution ||
    gate.summary.enterprise_service_delivery_ready_for_live_execution ||
    gate.summary.enterprise_customer_health_ready_for_live_execution ||
    gate.summary.enterprise_expansion_readiness_ready_for_live_execution ||
    gate.summary.enterprise_expansion_execution_ready_for_live_execution ||
    gate.summary.enterprise_account_governance_ready_for_live_execution ||
    gate.summary.enterprise_value_realization_ready_for_live_execution ||
    gate.summary.enterprise_renewal_execution_ready_for_live_execution ||
    gate.summary.enterprise_churn_prevention_ready_for_live_execution ||
    gate.summary.enterprise_customer_advocacy_ready_for_live_execution ||
    gate.summary.enterprise_product_feedback_ready_for_live_execution ||
    gate.summary.enterprise_roadmap_governance_ready_for_live_execution ||
    gate.summary.enterprise_release_governance_ready_for_live_execution ||
    gate.summary.enterprise_deployment_governance_ready_for_live_execution ||
    gate.summary.enterprise_observability_governance_ready_for_live_execution ||
    gate.summary.enterprise_incident_governance_ready_for_live_execution ||
    gate.summary.enterprise_problem_management_ready_for_live_execution ||
    gate.summary.enterprise_knowledge_management_ready_for_live_execution ||
    gate.summary.enterprise_support_operations_ready_for_live_execution ||
    gate.summary.enterprise_customer_operations_ready_for_live_execution ||
    gate.summary.enterprise_customer_experience_ready_for_live_execution ||
    gate.summary.enterprise_customer_satisfaction_ready_for_live_execution ||
    gate.summary.enterprise_customer_loyalty_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_maturity_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_scale_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_optimization_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_intelligence_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_governance_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_risk_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_compliance_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_lifecycle_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_automation_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_escalation_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_retention_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_reporting_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_closure_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_certification_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_attestation_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_final_audit_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_chapter_closure_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_post_closure_monitoring_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_continuous_improvement_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_operating_model_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_quality_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_performance_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_sustainability_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_resilience_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_benchmarking_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_differentiation_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_market_validation_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_commercialization_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_scale_out_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_rollout_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_go_live_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_hypercare_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_transition_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_steady_state_ready_for_live_execution ||
    gate.summary.enterprise_customer_success_terminal_closure_ready_for_live_execution
  );
}

function renderGate(title: string, gate: ReadinessGate) {
  return (
    <section style={styles.card}>
      <div style={styles.controlHeader}>
        <div>
          <h2 style={styles.sectionTitle}>{title}</h2>
          <div style={styles.help}>{gate.step}</div>
        </div>
        <span style={badgeStyle(gate.posture)}>{humanize(gate.posture)}</span>
      </div>

      <section style={styles.summaryGrid}>
        <div style={styles.miniCard}><strong>Controls</strong><div style={styles.metric}>{gate.summary.controls_total}</div></div>
        <div style={styles.miniCard}><strong>Evidence required</strong><div style={styles.metric}>{gate.summary.operator_evidence_required}</div></div>
        <div style={styles.miniCard}><strong>Certified</strong><div style={styles.metric}>{isGateCertified(gate) ? 'Yes' : 'No'}</div></div>
        <div style={styles.miniCard}><strong>Ready for live execution</strong><div style={styles.metric}>{isGateReadyForLiveExecution(gate) ? 'Yes' : 'No'}</div></div>
      </section>

      <div style={styles.block}>
        <strong>Closure rule</strong>
        <div style={styles.action}>{gate.closure_rule}</div>
      </div>

      <h3 style={styles.subsectionTitle}>Execution order</h3>
      <ol style={styles.list}>
        {gate.execution_order.map((item) => <li key={item}>{item}</li>)}
      </ol>

      <section style={styles.controlGrid}>
        {gate.controls.map((control) => (
          <article key={control.code} style={styles.controlCard}>
            <div style={styles.controlHeader}>
              <div>
                <h2 style={styles.controlTitle}>{control.order}. {control.label}</h2>
                <div style={styles.help}>{humanize(control.automation_level)}</div>
              </div>
              <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
            </div>
            <div style={styles.block}>
              <strong>Evidence surface</strong>
              <div style={styles.surface}>{control.evidence_surface}</div>
            </div>
            <div style={styles.block}>
              <strong>Required evidence</strong>
              <div style={styles.action}>{control.required_evidence}</div>
            </div>
            <div style={styles.block}>
              <strong>Failure mode prevented</strong>
              <div style={styles.action}>{control.failure_mode}</div>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

export default function PlatformCommercialReadinessVerificationProgramPage() {
  const query = useQuery({
    queryKey: ['platform', 'commercial-readiness-verification-program'],
    queryFn: () => platformApiRequest<VerificationProgram>('/platform/commercial-readiness-verification-program')
  });

  const data = query.data;
  const domainEntries = data ? Object.entries(data.summary.by_domain) : [];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Commercial readiness verification program</h1>
          <p style={styles.subtitle}>Final operator checklist for deployment, migrations, security, tenant isolation, workflows, monitoring, backup, load testing, automated testing evidence, data integrity, billing/subscription readiness, onboarding readiness, support/incident-response readiness, commercial launch go/no-go readiness, commercial readiness closure evidence, post-launch stabilization verification, customer-success handoff verification, retention/renewal verification, revenue operations verification, legal/compliance verification, enterprise procurement verification, enterprise implementation verification, customer data migration verification, enterprise security assurance verification, enterprise privacy assurance verification, enterprise data residency verification, enterprise audit assurance verification, enterprise business continuity verification, and enterprise vendor risk verification, enterprise change management verification, enterprise board governance verification, enterprise strategic planning verification, enterprise portfolio governance verification, enterprise customer reference verification, enterprise partner ecosystem verification, enterprise marketplace listing verification, enterprise sales enablement verification, and launch governance.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{humanize(data.posture)}</span> : null}
      </header>

      {query.isLoading ? <section style={styles.card}>Loading verification program…</section> : null}
      {query.error ? <section style={styles.card}>Unable to load verification program.</section> : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          <section style={styles.summaryGrid}>
            <div style={styles.card}><strong>Total controls</strong><div style={styles.metric}>{data.summary.controls_total}</div></div>
            <div style={styles.card}><strong>Surfaces present</strong><div style={styles.metric}>{data.summary.verification_surfaces_present}</div></div>
            <div style={styles.card}><strong>Runtime/manual runs required</strong><div style={styles.metric}>{data.summary.runtime_or_manual_runs_required}</div></div>
            <div style={styles.card}><strong>Ready for execution</strong><div style={styles.metric}>{data.summary.ready_for_execution ? 'Yes' : 'No'}</div></div>
          </section>

          {data.deployment_verification_gate ? renderGate('Deployment verification gate', data.deployment_verification_gate) : null}

          {data.migration_verification_gate ? renderGate('Migration verification gate', data.migration_verification_gate) : null}

          {data.security_permission_verification_gate ? renderGate('Security permission verification gate', data.security_permission_verification_gate) : null}

          {data.tenant_isolation_verification_gate ? renderGate('Tenant isolation verification gate', data.tenant_isolation_verification_gate) : null}

          {data.end_to_end_workflow_verification_gate ? renderGate('End-to-end workflow verification gate', data.end_to_end_workflow_verification_gate) : null}

          {data.backup_restore_verification_gate ? renderGate('Backup / restore verification gate', data.backup_restore_verification_gate) : null}

          {data.performance_load_verification_gate ? renderGate('Performance / load verification gate', data.performance_load_verification_gate) : null}

          {data.production_monitoring_verification_gate ? renderGate('Production monitoring verification gate', data.production_monitoring_verification_gate) : null}

          {data.automated_testing_evidence_verification_gate ? renderGate('Automated testing evidence verification gate', data.automated_testing_evidence_verification_gate) : null}

          {data.data_integrity_verification_gate ? renderGate('Data integrity verification gate', data.data_integrity_verification_gate) : null}

          {data.billing_subscription_verification_gate ? renderGate('Billing / subscription verification gate', data.billing_subscription_verification_gate) : null}

          {data.onboarding_verification_gate ? renderGate('Onboarding verification gate', data.onboarding_verification_gate) : null}

          {data.support_incident_response_verification_gate ? renderGate('Support / incident response verification gate', data.support_incident_response_verification_gate) : null}

          {data.commercial_launch_go_no_go_verification_gate ? renderGate('Commercial launch go/no-go verification gate', data.commercial_launch_go_no_go_verification_gate) : null}

          {data.commercial_readiness_closure_evidence_gate ? renderGate('Commercial readiness closure evidence gate', data.commercial_readiness_closure_evidence_gate) : null}

          {data.post_launch_stabilization_verification_gate ? renderGate('Post-launch stabilization verification gate', data.post_launch_stabilization_verification_gate) : null}

          {data.customer_success_handoff_verification_gate ? renderGate('Customer success handoff verification gate', data.customer_success_handoff_verification_gate) : null}

          {data.retention_renewal_verification_gate ? renderGate('Retention / renewal verification gate', data.retention_renewal_verification_gate) : null}

          {data.revenue_operations_verification_gate ? renderGate('Revenue operations verification gate', data.revenue_operations_verification_gate) : null}

          {data.legal_compliance_verification_gate ? renderGate('Legal / compliance verification gate', data.legal_compliance_verification_gate) : null}

          {data.enterprise_procurement_verification_gate ? renderGate('Enterprise procurement verification gate', data.enterprise_procurement_verification_gate) : null}

          {data.enterprise_implementation_verification_gate ? renderGate('Enterprise implementation verification gate', data.enterprise_implementation_verification_gate) : null}

          {data.customer_data_migration_verification_gate ? renderGate('Customer data migration verification gate', data.customer_data_migration_verification_gate) : null}

          {data.enterprise_security_assurance_verification_gate ? renderGate('Enterprise security assurance verification gate', data.enterprise_security_assurance_verification_gate) : null}

          {data.enterprise_privacy_assurance_verification_gate ? renderGate('Enterprise privacy assurance verification gate', data.enterprise_privacy_assurance_verification_gate) : null}

          {data.enterprise_data_residency_verification_gate ? renderGate('Enterprise data residency verification gate', data.enterprise_data_residency_verification_gate) : null}

          {data.enterprise_audit_assurance_verification_gate ? renderGate('Enterprise audit assurance verification gate', data.enterprise_audit_assurance_verification_gate) : null}

          {data.enterprise_business_continuity_verification_gate ? renderGate('Enterprise business continuity verification gate', data.enterprise_business_continuity_verification_gate) : null}

          {data.enterprise_reliability_assurance_verification_gate ? renderGate('Enterprise reliability assurance verification gate', data.enterprise_reliability_assurance_verification_gate) : null}

          {data.enterprise_scalability_assurance_verification_gate ? renderGate('Enterprise scalability assurance verification gate', data.enterprise_scalability_assurance_verification_gate) : null}

          {data.enterprise_cost_governance_verification_gate ? renderGate('Enterprise cost governance verification gate', data.enterprise_cost_governance_verification_gate) : null}

          {data.enterprise_vendor_risk_verification_gate ? renderGate('Enterprise vendor risk verification gate', data.enterprise_vendor_risk_verification_gate) : null}

          {data.enterprise_change_management_verification_gate ? renderGate('Enterprise change management verification gate', data.enterprise_change_management_verification_gate) : null}

          {data.enterprise_training_enablement_verification_gate ? renderGate('Enterprise training enablement verification gate', data.enterprise_training_enablement_verification_gate) : null}

          {data.enterprise_adoption_measurement_verification_gate ? renderGate('Enterprise adoption measurement verification gate', data.enterprise_adoption_measurement_verification_gate) : null}

          {data.enterprise_executive_reporting_verification_gate ? renderGate('Enterprise executive reporting verification gate', data.enterprise_executive_reporting_verification_gate) : null}

          {data.enterprise_board_governance_verification_gate ? renderGate('Enterprise board governance verification gate', data.enterprise_board_governance_verification_gate) : null}

          {data.enterprise_strategic_planning_verification_gate ? renderGate('Enterprise strategic planning verification gate', data.enterprise_strategic_planning_verification_gate) : null}
          {data.enterprise_portfolio_governance_verification_gate ? renderGate('Enterprise portfolio governance verification gate', data.enterprise_portfolio_governance_verification_gate) : null}

          {data.enterprise_customer_reference_verification_gate ? renderGate('Enterprise customer reference verification gate', data.enterprise_customer_reference_verification_gate) : null}

          {data.enterprise_partner_ecosystem_verification_gate ? renderGate('Enterprise partner ecosystem verification gate', data.enterprise_partner_ecosystem_verification_gate) : null}

          {data.enterprise_marketplace_listing_verification_gate ? renderGate('Enterprise marketplace listing verification gate', data.enterprise_marketplace_listing_verification_gate) : null}

          {data.enterprise_sales_enablement_verification_gate ? renderGate('Enterprise sales enablement verification gate', data.enterprise_sales_enablement_verification_gate) : null}

          {data.enterprise_contracting_verification_gate ? renderGate('Enterprise contracting verification gate', data.enterprise_contracting_verification_gate) : null}

          {data.enterprise_order_management_verification_gate ? renderGate('Enterprise order management verification gate', data.enterprise_order_management_verification_gate) : null}

          {data.enterprise_fulfillment_assurance_verification_gate ? renderGate('Enterprise fulfillment assurance verification gate', data.enterprise_fulfillment_assurance_verification_gate) : null}

          {data.enterprise_service_delivery_verification_gate ? renderGate('Enterprise service delivery verification gate', data.enterprise_service_delivery_verification_gate) : null}

          {data.enterprise_customer_health_verification_gate ? renderGate('Enterprise customer health verification gate', data.enterprise_customer_health_verification_gate) : null}

          {data.enterprise_expansion_readiness_verification_gate ? renderGate('Enterprise expansion readiness verification gate', data.enterprise_expansion_readiness_verification_gate) : null}

          {data.enterprise_expansion_execution_verification_gate ? renderGate('Enterprise expansion execution verification gate', data.enterprise_expansion_execution_verification_gate) : null}

          {data.enterprise_account_governance_verification_gate ? renderGate('Enterprise account governance verification gate', data.enterprise_account_governance_verification_gate) : null}

          {data.enterprise_value_realization_verification_gate ? renderGate('Enterprise value realization verification gate', data.enterprise_value_realization_verification_gate) : null}

          {data.enterprise_renewal_execution_verification_gate ? renderGate('Enterprise renewal execution verification gate', data.enterprise_renewal_execution_verification_gate) : null}

          {data.enterprise_churn_prevention_verification_gate ? renderGate('Enterprise churn prevention verification gate', data.enterprise_churn_prevention_verification_gate) : null}

          {data.enterprise_customer_advocacy_verification_gate ? renderGate('Enterprise customer advocacy verification gate', data.enterprise_customer_advocacy_verification_gate) : null}

          {data.enterprise_product_feedback_verification_gate ? renderGate('Enterprise product feedback verification gate', data.enterprise_product_feedback_verification_gate) : null}

          {data.enterprise_roadmap_governance_verification_gate ? renderGate('Enterprise roadmap governance verification gate', data.enterprise_roadmap_governance_verification_gate) : null}

          {data.enterprise_release_governance_verification_gate ? renderGate('Enterprise release governance verification gate', data.enterprise_release_governance_verification_gate) : null}

          {data.enterprise_deployment_governance_verification_gate ? renderGate('Enterprise deployment governance verification gate', data.enterprise_deployment_governance_verification_gate) : null}

          {data.enterprise_observability_governance_verification_gate ? renderGate('Enterprise observability governance verification gate', data.enterprise_observability_governance_verification_gate) : null}

          {data.enterprise_incident_governance_verification_gate ? renderGate('Enterprise incident governance verification gate', data.enterprise_incident_governance_verification_gate) : null}

          {data.enterprise_problem_management_verification_gate ? renderGate('Enterprise problem management verification gate', data.enterprise_problem_management_verification_gate) : null}

          {data.enterprise_knowledge_management_verification_gate ? renderGate('Enterprise knowledge management verification gate', data.enterprise_knowledge_management_verification_gate) : null}

          {data.enterprise_support_operations_verification_gate ? renderGate('Enterprise support operations verification gate', data.enterprise_support_operations_verification_gate) : null}

          {data.enterprise_customer_operations_verification_gate ? renderGate('Enterprise customer operations verification gate', data.enterprise_customer_operations_verification_gate) : null}

          {data.enterprise_customer_experience_verification_gate ? renderGate('Enterprise customer experience verification gate', data.enterprise_customer_experience_verification_gate) : null}

          {data.enterprise_customer_satisfaction_verification_gate ? renderGate('Enterprise customer satisfaction verification gate', data.enterprise_customer_satisfaction_verification_gate) : null}

          {data.enterprise_customer_loyalty_verification_gate ? renderGate('Enterprise customer loyalty verification gate', data.enterprise_customer_loyalty_verification_gate) : null}

          {data.enterprise_customer_success_maturity_verification_gate ? renderGate('Enterprise customer success maturity verification gate', data.enterprise_customer_success_maturity_verification_gate) : null}

          {data.enterprise_customer_success_scale_verification_gate ? renderGate('Enterprise customer success scale verification gate', data.enterprise_customer_success_scale_verification_gate) : null}

          {data.enterprise_customer_success_optimization_verification_gate ? renderGate('Enterprise customer success optimization verification gate', data.enterprise_customer_success_optimization_verification_gate) : null}

          {data.enterprise_customer_success_intelligence_verification_gate ? renderGate('Enterprise customer success intelligence verification gate', data.enterprise_customer_success_intelligence_verification_gate) : null}

          {data.enterprise_customer_success_governance_verification_gate ? renderGate('Enterprise customer success governance verification gate', data.enterprise_customer_success_governance_verification_gate) : null}

          {data.enterprise_customer_success_risk_verification_gate ? renderGate('Enterprise customer success risk verification gate', data.enterprise_customer_success_risk_verification_gate) : null}

          {data.enterprise_customer_success_compliance_verification_gate ? renderGate('Enterprise customer success compliance verification gate', data.enterprise_customer_success_compliance_verification_gate) : null}
          {data.enterprise_customer_success_lifecycle_verification_gate ? renderGate('Enterprise customer success lifecycle verification gate', data.enterprise_customer_success_lifecycle_verification_gate) : null}
          {data.enterprise_customer_success_automation_verification_gate ? renderGate('Enterprise customer success automation verification gate', data.enterprise_customer_success_automation_verification_gate) : null}
          {data.enterprise_customer_success_escalation_verification_gate ? renderGate('Enterprise customer success escalation verification gate', data.enterprise_customer_success_escalation_verification_gate) : null}
          {data.enterprise_customer_success_retention_verification_gate ? renderGate('Enterprise customer success retention verification gate', data.enterprise_customer_success_retention_verification_gate) : null}
          {data.enterprise_customer_success_reporting_verification_gate ? renderGate('Enterprise customer success reporting verification gate', data.enterprise_customer_success_reporting_verification_gate) : null}
          {data.enterprise_customer_success_closure_verification_gate ? renderGate('Enterprise customer success closure verification gate', data.enterprise_customer_success_closure_verification_gate) : null}
          {data.enterprise_customer_success_certification_verification_gate ? renderGate('Enterprise customer success certification verification gate', data.enterprise_customer_success_certification_verification_gate) : null}
          {data.enterprise_customer_success_attestation_verification_gate ? renderGate('Enterprise customer success attestation verification gate', data.enterprise_customer_success_attestation_verification_gate) : null}
          {data.enterprise_customer_success_final_audit_verification_gate ? renderGate('Enterprise customer success final audit verification gate', data.enterprise_customer_success_final_audit_verification_gate) : null}
          {data.enterprise_customer_success_chapter_closure_verification_gate ? renderGate('Enterprise customer success chapter closure verification gate', data.enterprise_customer_success_chapter_closure_verification_gate) : null}
          {data.enterprise_customer_success_post_closure_monitoring_verification_gate ? renderGate('Enterprise customer success post-closure monitoring verification gate', data.enterprise_customer_success_post_closure_monitoring_verification_gate) : null}
          {data.enterprise_customer_success_continuous_improvement_verification_gate ? renderGate('Enterprise customer success continuous improvement verification gate', data.enterprise_customer_success_continuous_improvement_verification_gate) : null}
          {data.enterprise_customer_success_operating_model_verification_gate ? renderGate('Enterprise customer success operating model verification gate', data.enterprise_customer_success_operating_model_verification_gate) : null}
          {data.enterprise_customer_success_quality_verification_gate ? renderGate('Enterprise customer success quality verification gate', data.enterprise_customer_success_quality_verification_gate) : null}
          {data.enterprise_customer_success_performance_verification_gate ? renderGate('Enterprise customer success performance verification gate', data.enterprise_customer_success_performance_verification_gate) : null}
          {data.enterprise_customer_success_sustainability_verification_gate ? renderGate('Enterprise customer success sustainability verification gate', data.enterprise_customer_success_sustainability_verification_gate) : null}
          {data.enterprise_customer_success_resilience_verification_gate ? renderGate('Enterprise customer success resilience verification gate', data.enterprise_customer_success_resilience_verification_gate) : null}
          {data.enterprise_customer_success_benchmarking_verification_gate ? renderGate('Enterprise customer success benchmarking verification gate', data.enterprise_customer_success_benchmarking_verification_gate) : null}
          {data.enterprise_customer_success_differentiation_verification_gate ? renderGate('Enterprise customer success differentiation verification gate', data.enterprise_customer_success_differentiation_verification_gate) : null}
          {data.enterprise_customer_success_market_validation_verification_gate ? renderGate('Enterprise customer success market validation verification gate', data.enterprise_customer_success_market_validation_verification_gate) : null}
          {data.enterprise_customer_success_commercialization_verification_gate ? renderGate('Enterprise customer success commercialization verification gate', data.enterprise_customer_success_commercialization_verification_gate) : null}
          {data.enterprise_customer_success_scale_out_verification_gate ? renderGate('Enterprise customer success scale-out verification gate', data.enterprise_customer_success_scale_out_verification_gate) : null}
          {data.enterprise_customer_success_rollout_verification_gate ? renderGate('Enterprise customer success rollout verification gate', data.enterprise_customer_success_rollout_verification_gate) : null}
          {data.enterprise_customer_success_go_live_verification_gate ? renderGate('Enterprise customer success go-live verification gate', data.enterprise_customer_success_go_live_verification_gate) : null}
          {data.enterprise_customer_success_hypercare_verification_gate ? renderGate('Enterprise customer success hypercare verification gate', data.enterprise_customer_success_hypercare_verification_gate) : null}
          {data.enterprise_customer_success_transition_verification_gate ? renderGate('Enterprise customer success transition verification gate', data.enterprise_customer_success_transition_verification_gate) : null}
          {data.enterprise_customer_success_steady_state_verification_gate ? renderGate('Enterprise customer success steady-state verification gate', data.enterprise_customer_success_steady_state_verification_gate) : null}
          {data.enterprise_customer_success_terminal_closure_verification_gate ? renderGate('Enterprise customer success terminal closure verification gate', data.enterprise_customer_success_terminal_closure_verification_gate) : null}

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Execution sequence</h2>
            <ol style={styles.list}>
              {data.execution_sequence.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </section>

          <section style={styles.domainGrid}>
            {domainEntries.map(([domain, summary]) => (
              <article key={domain} style={styles.card}>
                <strong>{humanize(domain)}</strong>
                <div style={styles.help}>{summary.verification_surfaces_present}/{summary.controls_total} surfaces present</div>
                <div style={styles.help}>{summary.runtime_or_manual_runs_required} runtime/manual runs required</div>
              </article>
            ))}
          </section>

          <section style={styles.controlGrid}>
            {data.controls.map((control) => (
              <article key={control.code} style={styles.controlCard}>
                <div style={styles.controlHeader}>
                  <div>
                    <h2 style={styles.controlTitle}>{control.order}. {control.label}</h2>
                    <div style={styles.help}>{humanize(control.domain)} · {humanize(control.automation_level)}</div>
                  </div>
                  <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
                </div>
                <div style={styles.block}>
                  <strong>Evidence surface</strong>
                  <div style={styles.surface}>{control.evidence_surface}</div>
                </div>
                <div style={styles.block}>
                  <strong>Required action</strong>
                  <div style={styles.action}>{control.required_action}</div>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280', maxWidth: 940, lineHeight: 1.5 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12, textTransform: 'capitalize' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  note: { color: '#374151', lineHeight: 1.5 },
  help: { color: '#6b7280', fontSize: 12, lineHeight: 1.5 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  domainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 },
  metric: { fontSize: 28, fontWeight: 900, marginTop: 8 },
  sectionTitle: { margin: '0 0 10px', fontSize: 20 },
  subsectionTitle: { margin: '18px 0 10px', fontSize: 16 },
  miniCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 },
  list: { margin: 0, paddingLeft: 24, color: '#374151', lineHeight: 1.7 },
  controlCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  controlTitle: { margin: 0, fontSize: 19 },
  block: { display: 'grid', gap: 6 },
  surface: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, color: '#111827', lineHeight: 1.5 },
  action: { color: '#374151', lineHeight: 1.5 }
};
