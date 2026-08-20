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

function capitalizeFirst(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function formatGateTitle(key: string) {
  const baseLabel = key
    .replace(/_gate$/, '')
    .replaceAll('_', ' ');
  return `${capitalizeFirst(baseLabel)} gate`;
}

function anchorId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('required') || value.includes('ready_for_operator')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function hasPositiveSummaryFlag(summary: ReadinessGate['summary'], suffix: string) {
  return Object.entries(summary).some(([key, value]) => (
    key.endsWith(suffix) && typeof value === 'number' && value > 0
  ));
}

function isGateCertified(gate: ReadinessGate) {
  return hasPositiveSummaryFlag(gate.summary, '_certified');
}

function isGateReadyForLiveExecution(gate: ReadinessGate) {
  return hasPositiveSummaryFlag(gate.summary, '_ready_for_live_execution');
}

function renderGate(title: string, gate: ReadinessGate) {
  const id = `gate-${anchorId(gate.step || title)}`;
  const certified = isGateCertified(gate);
  const runnable = isGateReadyForLiveExecution(gate);

  return (
    <details key={id} id={id} style={styles.gateCard}>
      <summary style={styles.gateSummary}>
        <div style={styles.gateSummaryInner}>
          <div style={styles.gateSummaryCopy}>
            <strong style={styles.gateTitle}>{title}</strong>
            <span style={styles.help}>{gate.step}</span>
          </div>
          <div style={styles.gateSummaryMeta}>
            <span style={styles.countBadge}>{gate.summary.controls_total} controls</span>
            <span style={styles.countBadge}>{gate.summary.operator_evidence_required} evidence required</span>
            <span style={styles.statusText}>Certified: {certified ? 'Yes' : 'No'}</span>
            <span style={styles.statusText}>Runnable: {runnable ? 'Yes' : 'No'}</span>
            <span style={badgeStyle(gate.posture)}>{humanize(gate.posture)}</span>
          </div>
        </div>
      </summary>

      <div style={styles.gateBody}>
        <section style={styles.summaryGrid} aria-label={`${title} summary`}>
          <div style={styles.miniCard}><strong>Controls</strong><div style={styles.metric}>{gate.summary.controls_total}</div></div>
          <div style={styles.miniCard}><strong>Evidence required</strong><div style={styles.metric}>{gate.summary.operator_evidence_required}</div></div>
          <div style={styles.miniCard}><strong>Certified</strong><div style={styles.metric}>{certified ? 'Yes' : 'No'}</div></div>
          <div style={styles.miniCard}><strong>Verification runnable</strong><div style={styles.metric}>{runnable ? 'Yes' : 'No'}</div></div>
        </section>

        <div style={styles.block}>
          <strong>Closure rule</strong>
          <div style={styles.action}>{gate.closure_rule}</div>
        </div>

        <div style={styles.block}>
          <strong>Execution order</strong>
          <ol style={styles.list}>
            {gate.execution_order.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>

        <section style={styles.controlGrid}>
          {gate.controls.map((control) => (
            <article key={control.code} style={styles.controlCard}>
              <div style={styles.controlHeader}>
                <div style={styles.controlHeadingCopy}>
                  <h3 style={styles.controlTitle}>{control.order}. {control.label}</h3>
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
      </div>
    </details>
  );
}

function collectGateEntries(data: VerificationProgram) {
  return Object.entries(data)
    .filter(([, value]) => {
      const maybeGate = value as Partial<ReadinessGate> | undefined;
      return Boolean(maybeGate?.summary && Array.isArray(maybeGate.controls) && Array.isArray(maybeGate.execution_order));
    })
    .map(([key, value]) => {
      const gate = value as ReadinessGate;
      const title = formatGateTitle(key);
      return { key, title, gate, href: `#gate-${anchorId(gate.step || title)}` };
    });
}

export default function PlatformCommercialReadinessVerificationProgramPage() {
  const query = useQuery({
    queryKey: ['platform', 'commercial-readiness-verification-program'],
    queryFn: () => platformApiRequest<VerificationProgram>('/platform/commercial-readiness-verification-program'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const data = query.data;
  const domainEntries = data ? Object.entries(data.summary.by_domain) : [];
  const gateEntries = data ? collectGateEntries(data) : [];
  const certifiedGateCount = gateEntries.filter((entry) => isGateCertified(entry.gate)).length;
  const runnableGateCount = gateEntries.filter((entry) => isGateReadyForLiveExecution(entry.gate)).length;
  const errorMessage = query.error instanceof Error
    ? query.error.message
    : 'The readiness verification program could not be retrieved.';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerCopy}>
          <h1 style={styles.title}>Commercial readiness verification program</h1>
          <p style={styles.subtitle}>
            Read-only operator checklist for the platform&apos;s commercial-readiness evidence chain. It shows which verification
            surfaces and evidence requirements exist; it does not mean the runtime/manual checks have passed or that a commercial launch is certified.
          </p>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={badgeStyle(data.posture)}>{humanize(data.posture)}</span> : null}
          <button
            type="button"
            style={styles.button}
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {query.isLoading ? <section style={styles.card}>Loading verification program…</section> : null}
      {query.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load verification program.</strong>
          <span style={styles.errorText}>{errorMessage}</span>
          <button type="button" style={styles.retryButton} onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Last refreshed</strong><br /><span style={styles.help}>{formatTimestamp(data.generated_at)}</span></div>
            <details style={styles.noteDetails}>
              <summary style={styles.noteSummary}>Read full validation note</summary>
              <div style={styles.note}>{data.validation_note}</div>
            </details>
          </section>

          <section style={styles.infoCard}>
            <strong>How to read this page</strong>
            <div style={styles.infoText}>
              “Surfaces present” and “Program ready to run” describe checklist coverage only. Runtime/manual checks still need operator evidence,
              and certification is reported separately for each gate.
            </div>
          </section>

          <section style={styles.summaryGrid} aria-label="Verification program summary">
            <div style={styles.summaryCard}><strong>Total controls</strong><div style={styles.metric}>{data.summary.controls_total}</div></div>
            <div style={styles.summaryCard}><strong>Verification surfaces present</strong><div style={styles.metric}>{data.summary.verification_surfaces_present}</div></div>
            <div style={styles.summaryCard}><strong>Runtime/manual checks required</strong><div style={styles.metric}>{data.summary.runtime_or_manual_runs_required}</div></div>
            <div style={styles.summaryCard}><strong>Program ready to run</strong><div style={styles.metric}>{data.summary.ready_for_execution ? 'Yes' : 'No'}</div></div>
          </section>

          <section style={styles.summaryGrid} aria-label="Verification gate summary">
            <div style={styles.summaryCard}><strong>Verification gates</strong><div style={styles.metric}>{gateEntries.length}</div></div>
            <div style={styles.summaryCard}><strong>Runnable gates</strong><div style={styles.metric}>{runnableGateCount}</div></div>
            <div style={styles.summaryCard}><strong>Certified gates</strong><div style={styles.metric}>{certifiedGateCount}</div></div>
            <div style={styles.summaryCard}><strong>Uncertified gates</strong><div style={styles.metric}>{gateEntries.length - certifiedGateCount}</div></div>
          </section>

          <details style={styles.card}>
            <summary style={styles.detailsSummaryRow}>
              <span>
                <strong>Verification gate index</strong>
                <span style={styles.summaryHint}>Jump to a specific gate. Gates remain read-only.</span>
              </span>
              <span style={styles.countBadge}>{gateEntries.length} gates</span>
            </summary>
            <div style={styles.detailsBody}>
              <div style={styles.linkGrid}>
                {gateEntries.map((entry) => (
                  <a key={entry.key} href={entry.href} style={styles.linkCard}>
                    {entry.gate.summary.controls_total} controls · {entry.title}
                  </a>
                ))}
              </div>
            </div>
          </details>

          <section style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Verification gates</h2>
              <p style={styles.sectionDescription}>
                Gates are collapsed so the page remains usable. Open a gate to review its closure rule, execution order, evidence surfaces, and failure modes.
              </p>
            </div>
            <span style={styles.countBadge}>{gateEntries.length} gates</span>
          </section>

          <section style={styles.gateList}>
            {gateEntries.map((entry) => renderGate(entry.title, entry.gate))}
          </section>

          <details style={styles.card}>
            <summary style={styles.detailsSummaryRow}>
              <span>
                <strong>Program execution sequence</strong>
                <span style={styles.summaryHint}>Program-level order across all readiness domains.</span>
              </span>
              <span style={styles.countBadge}>{data.execution_sequence.length} steps</span>
            </summary>
            <div style={styles.detailsBody}>
              <ol style={styles.list}>
                {data.execution_sequence.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          </details>

          <details style={styles.card}>
            <summary style={styles.detailsSummaryRow}>
              <span>
                <strong>Domain coverage</strong>
                <span style={styles.summaryHint}>Control and runtime/manual-run counts by verification domain.</span>
              </span>
              <span style={styles.countBadge}>{domainEntries.length} domains</span>
            </summary>
            <div style={styles.detailsBody}>
              <section style={styles.domainGrid}>
                {domainEntries.map(([domain, summary]) => (
                  <article key={domain} style={styles.miniCard}>
                    <strong>{humanize(domain)}</strong>
                    <div style={styles.help}>{summary.verification_surfaces_present}/{summary.controls_total} surfaces present</div>
                    <div style={styles.help}>{summary.runtime_or_manual_runs_required} runtime/manual runs required</div>
                  </article>
                ))}
              </section>
            </div>
          </details>

          <details style={styles.card}>
            <summary style={styles.detailsSummaryRow}>
              <span>
                <strong>Program-level controls</strong>
                <span style={styles.summaryHint}>Top-level verification surfaces and required operator actions.</span>
              </span>
              <span style={styles.countBadge}>{data.controls.length} controls</span>
            </summary>
            <div style={styles.detailsBody}>
              <section style={styles.controlGrid}>
                {data.controls.map((control) => (
                  <article key={control.code} style={styles.controlCard}>
                    <div style={styles.controlHeader}>
                      <div style={styles.controlHeadingCopy}>
                        <h3 style={styles.controlTitle}>{control.order}. {control.label}</h3>
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
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, overflowX: 'hidden', color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  headerCopy: { minWidth: 0, flex: '1 1 620px' },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 940, lineHeight: 1.5 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, whiteSpace: 'normal', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere', textAlign: 'center' },
  button: { border: '1px solid #cbd5e1', borderRadius: 999, background: '#fff', padding: '8px 12px', fontWeight: 800, color: '#0f172a', cursor: 'pointer' },
  retryButton: { border: '1px solid #fecaca', borderRadius: 999, background: '#fff', padding: '8px 12px', fontWeight: 800, color: '#991b1b', cursor: 'pointer', justifySelf: 'start' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  errorCard: { background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 14, padding: 18, display: 'grid', gap: 10, color: '#991b1b' },
  errorText: { color: '#7f1d1d', lineHeight: 1.5, overflowWrap: 'anywhere' },
  infoCard: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 16, display: 'grid', gap: 6, color: 'var(--io-primary-deep)' },
  infoText: { lineHeight: 1.55, color: 'var(--io-primary-dark)' },
  metaCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12, minWidth: 0 },
  noteDetails: { minWidth: 0 },
  noteSummary: { cursor: 'pointer', fontWeight: 800, color: '#334155' },
  note: { color: '#334155', lineHeight: 1.55, marginTop: 10, overflowWrap: 'anywhere' },
  help: { color: '#64748b', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  domainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 },
  linkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 10 },
  linkCard: { display: 'block', padding: 10, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', color: 'var(--io-primary-dark)', textDecoration: 'none', fontWeight: 700, lineHeight: 1.4, overflowWrap: 'anywhere' },
  gateList: { display: 'grid', gap: 12 },
  gateCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0, scrollMarginTop: 16 },
  gateSummary: { cursor: 'pointer', padding: 16 },
  gateSummaryInner: { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', minWidth: 0 },
  gateSummaryCopy: { display: 'grid', gap: 4, minWidth: 0, flex: '1 1 360px' },
  gateSummaryMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 },
  gateTitle: { fontSize: 17, color: '#0f172a', overflowWrap: 'anywhere' },
  gateBody: { borderTop: '1px solid #e2e8f0', padding: 18, display: 'grid', gap: 16, minWidth: 0 },
  countBadge: { display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', borderRadius: 999, padding: '5px 9px', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' },
  statusText: { fontSize: 12, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, minWidth: 0 },
  metric: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, marginTop: 8, color: '#0f172a' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  sectionTitle: { margin: 0, fontSize: 20, letterSpacing: '-.015em', color: '#0f172a' },
  sectionDescription: { margin: '5px 0 0', color: '#64748b', lineHeight: 1.5, maxWidth: 900 },
  miniCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, minWidth: 0 },
  list: { margin: 0, paddingLeft: 24, color: '#334155', lineHeight: 1.7, overflowWrap: 'anywhere' },
  controlCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, display: 'grid', gap: 14, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', minWidth: 0 },
  controlHeadingCopy: { minWidth: 0, flex: '1 1 240px' },
  controlTitle: { margin: 0, fontSize: 17, overflowWrap: 'anywhere' },
  block: { display: 'grid', gap: 6, minWidth: 0 },
  surface: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, color: '#0f172a', lineHeight: 1.5, overflowWrap: 'anywhere' },
  action: { color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere' },
  detailsSummaryRow: { cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  summaryHint: { display: 'block', color: '#64748b', fontSize: 12, fontWeight: 400, lineHeight: 1.45, marginTop: 4 },
  detailsBody: { marginTop: 16 }
};
