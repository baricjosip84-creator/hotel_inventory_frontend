import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformCommercialReadinessVerificationProgramPage.css';

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
  const normalized = value.replaceAll('_', ' ').trim();
  return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : 'Not set';
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

function formatTimestamp(value: string | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString();
}

type StatusTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

function statusTone(value: string): StatusTone {
  const normalized = value.toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('not_ready') || normalized.includes('failed')) {
    return 'danger';
  }
  if (normalized.includes('certified') && !normalized.includes('uncertified') && !normalized.includes('not_certified')) {
    return 'good';
  }
  if (normalized.includes('required') || normalized.includes('ready_for_operator') || normalized.includes('ready_for_execution')) {
    return 'warn';
  }
  if (normalized.includes('present') || normalized.includes('ready')) {
    return 'accent';
  }
  return 'neutral';
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="platform-readiness-verification__status-badge" data-tone={statusTone(value)}>
      {humanize(value)}
    </span>
  );
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
    <details key={id} id={id} className="app-panel platform-readiness-verification__gate-card">
      <summary className="platform-readiness-verification__gate-summary">
        <span className="platform-readiness-verification__gate-summary-copy">
          <strong className="platform-readiness-verification__gate-title">{title}</strong>
          <span className="platform-readiness-verification__help">{gate.step}</span>
        </span>
        <span className="platform-readiness-verification__gate-summary-meta">
          <span className="platform-readiness-verification__count-badge">{gate.summary.controls_total} controls</span>
          <span className="platform-readiness-verification__count-badge">{gate.summary.operator_evidence_required} evidence required</span>
          <span className="platform-readiness-verification__gate-state" data-tone={certified ? 'good' : 'neutral'}>
            Certified: {certified ? 'Yes' : 'No'}
          </span>
          <span className="platform-readiness-verification__gate-state" data-tone={runnable ? 'warn' : 'neutral'}>
            Runnable: {runnable ? 'Yes' : 'No'}
          </span>
          <StatusBadge value={gate.posture} />
        </span>
      </summary>

      <div className="platform-readiness-verification__gate-body">
        <div className="platform-readiness-verification__gate-metrics" aria-label={`${title} summary`}>
          <div className="platform-readiness-verification__mini-card">
            <strong>Controls</strong>
            <span>{gate.summary.controls_total}</span>
          </div>
          <div className="platform-readiness-verification__mini-card">
            <strong>Evidence required</strong>
            <span>{gate.summary.operator_evidence_required}</span>
          </div>
          <div className="platform-readiness-verification__mini-card">
            <strong>Certified</strong>
            <span>{certified ? 'Yes' : 'No'}</span>
          </div>
          <div className="platform-readiness-verification__mini-card">
            <strong>Verification runnable</strong>
            <span>{runnable ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <div className="platform-readiness-verification__evidence-block platform-readiness-verification__evidence-block--accent">
          <strong>Closure rule</strong>
          <span>{gate.closure_rule}</span>
        </div>

        <div className="platform-readiness-verification__evidence-block">
          <strong>Execution order</strong>
          <ol className="platform-readiness-verification__list">
            {gate.execution_order.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>

        <section className="platform-readiness-verification__control-grid">
          {gate.controls.map((control) => (
            <article key={control.code} className="platform-readiness-verification__control-card">
              <div className="platform-readiness-verification__control-header">
                <div className="platform-readiness-verification__control-heading-copy">
                  <h3>{control.order}. {control.label}</h3>
                  <span className="platform-readiness-verification__help">{humanize(control.automation_level)}</span>
                </div>
                <StatusBadge value={control.status} />
              </div>
              <div className="platform-readiness-verification__evidence-block">
                <strong>Evidence surface</strong>
                <span className="platform-readiness-verification__surface">{control.evidence_surface}</span>
              </div>
              <div className="platform-readiness-verification__evidence-block">
                <strong>Required evidence</strong>
                <span>{control.required_evidence}</span>
              </div>
              <div className="platform-readiness-verification__evidence-block">
                <strong>Failure mode prevented</strong>
                <span>{control.failure_mode}</span>
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
  const initialLoadError = query.isError && !data;
  const refreshError = query.isError && Boolean(data);

  return (
    <div className="io-operational-page io-workspace-page platform-readiness-verification">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-readiness-verification-program"
        eyebrow="Platform commercial operations"
        title="Commercial readiness verification program"
        description="Read-only operator checklist for the platform's commercial-readiness evidence chain. It shows which verification surfaces and evidence requirements exist; it does not mean the runtime/manual checks have passed or that a commercial launch is certified."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only operator checklist</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Runtime/manual evidence required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-readiness-verification__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? gateEntries.length : '—'}
              label="verification gates in this program"
            />
            {data ? <StatusBadge value={data.posture} /> : null}
            <div className="platform-readiness-verification__refresh-block">
              <span>Last refreshed: {formatTimestamp(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void query.refetch()}
                disabled={query.isFetching}
              >
                {query.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      {query.isLoading ? (
        <section className="app-panel app-panel--padded">Loading verification program…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-readiness-verification__feedback" role="alert">
          <strong>Unable to load verification program.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-readiness-verification__retry"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {query.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-warning-state platform-readiness-verification__feedback" role="status">
          <strong>Latest verification refresh failed.</strong>
          <span>Showing the last successful verification program from {formatTimestamp(data?.generated_at)}.</span>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial readiness verification key metrics">
            <OperationalWorkspaceStatCard
              label="Total controls"
              value={data.summary.controls_total}
              helper="Program-level readiness controls"
              iconPath="/platform/commercial-readiness-verification-program"
              tone="neutral"
            />
            <OperationalWorkspaceStatCard
              label="Verification surfaces present"
              value={data.summary.verification_surfaces_present}
              helper="Evidence surfaces represented by the program"
              iconPath="/platform/commercial-readiness-verification-program"
              tone="blue"
            />
            <OperationalWorkspaceStatCard
              label="Runtime/manual checks required"
              value={data.summary.runtime_or_manual_runs_required}
              helper="Operator evidence still required before certification"
              iconPath="/platform/commercial-readiness-verification-program"
              tone={data.summary.runtime_or_manual_runs_required > 0 ? 'warn' : 'good'}
            />
            <OperationalWorkspaceStatCard
              label="Program ready to run"
              value={data.summary.ready_for_execution ? 'Yes' : 'No'}
              helper="Runnable means executable, not commercially certified"
              iconPath="/platform/commercial-readiness-verification-program"
              tone={data.summary.ready_for_execution ? 'warn' : 'danger'}
            />
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-readiness-verification__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-readiness-verification-program"
              title="Verification program context"
              description="Program identity, current operator posture, and the validation note attached to this generated package."
              actions={<span className="platform-readiness-verification__count-badge">{gateEntries.length} gates</span>}
            />
            <div className="platform-readiness-verification__program-grid">
              <div>
                <strong>Phase</strong>
                <span>{data.phase}</span>
              </div>
              <div>
                <strong>Current step</strong>
                <span>{data.step}</span>
              </div>
              <div>
                <strong>Gate posture</strong>
                <span>{runnableGateCount} runnable · {certifiedGateCount} certified · {gateEntries.length - certifiedGateCount} uncertified</span>
              </div>
              <details className="platform-readiness-verification__validation-note">
                <summary>Read full validation note</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-readiness-verification__reading-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-readiness-verification-program"
              title="How to read this page"
              description="Surfaces present and Program ready to run describe checklist coverage only. Runtime/manual checks still need operator evidence, and certification is reported separately for each gate."
            />
            <div className="platform-readiness-verification__gate-overview" aria-label="Verification gate summary">
              <div><strong>Verification gates</strong><span>{gateEntries.length}</span></div>
              <div><strong>Runnable gates</strong><span>{runnableGateCount}</span></div>
              <div><strong>Certified gates</strong><span>{certifiedGateCount}</span></div>
              <div><strong>Uncertified gates</strong><span>{gateEntries.length - certifiedGateCount}</span></div>
            </div>
          </section>

          <details className="app-panel app-panel--padded platform-readiness-verification__details-panel">
            <summary className="platform-readiness-verification__details-summary-row">
              <span>
                <strong>Verification gate index</strong>
                <small>Jump to a specific gate. Gates remain read-only.</small>
              </span>
              <span className="platform-readiness-verification__count-badge">{gateEntries.length} gates</span>
            </summary>
            <div className="platform-readiness-verification__details-body">
              <div className="platform-readiness-verification__link-grid">
                {gateEntries.map((entry) => (
                  <a key={entry.key} href={entry.href} className="platform-readiness-verification__link-card">
                    <span>{entry.title}</span>
                    <small>{entry.gate.summary.controls_total} controls</small>
                  </a>
                ))}
              </div>
            </div>
          </details>

          <section className="platform-readiness-verification__section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-readiness-verification-program"
              title="Verification gates"
              description="Gates are collapsed so the page remains usable. Open a gate to review its closure rule, execution order, evidence surfaces, and failure modes."
              actions={<span className="platform-readiness-verification__count-badge">{gateEntries.length} gates</span>}
            />
            <div className="platform-readiness-verification__gate-list">
              {gateEntries.map((entry) => renderGate(entry.title, entry.gate))}
            </div>
          </section>

          <details className="app-panel app-panel--padded platform-readiness-verification__details-panel">
            <summary className="platform-readiness-verification__details-summary-row">
              <span>
                <strong>Program execution sequence</strong>
                <small>Program-level order across all readiness domains.</small>
              </span>
              <span className="platform-readiness-verification__count-badge">{data.execution_sequence.length} steps</span>
            </summary>
            <div className="platform-readiness-verification__details-body">
              <ol className="platform-readiness-verification__list">
                {data.execution_sequence.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </div>
          </details>

          <details className="app-panel app-panel--padded platform-readiness-verification__details-panel">
            <summary className="platform-readiness-verification__details-summary-row">
              <span>
                <strong>Domain coverage</strong>
                <small>Control and runtime/manual-run counts by verification domain.</small>
              </span>
              <span className="platform-readiness-verification__count-badge">{domainEntries.length} domains</span>
            </summary>
            <div className="platform-readiness-verification__details-body">
              <section className="platform-readiness-verification__domain-grid">
                {domainEntries.map(([domain, summary]) => (
                  <article key={domain} className="platform-readiness-verification__domain-card">
                    <strong>{humanize(domain)}</strong>
                    <span>{summary.verification_surfaces_present}/{summary.controls_total} surfaces present</span>
                    <span>{summary.runtime_or_manual_runs_required} runtime/manual runs required</span>
                  </article>
                ))}
              </section>
            </div>
          </details>

          <details className="app-panel app-panel--padded platform-readiness-verification__details-panel">
            <summary className="platform-readiness-verification__details-summary-row">
              <span>
                <strong>Program-level controls</strong>
                <small>Top-level verification surfaces and required operator actions.</small>
              </span>
              <span className="platform-readiness-verification__count-badge">{data.controls.length} controls</span>
            </summary>
            <div className="platform-readiness-verification__details-body">
              <section className="platform-readiness-verification__control-grid">
                {data.controls.map((control) => (
                  <article key={control.code} className="platform-readiness-verification__control-card">
                    <div className="platform-readiness-verification__control-header">
                      <div className="platform-readiness-verification__control-heading-copy">
                        <h3>{control.order}. {control.label}</h3>
                        <span className="platform-readiness-verification__help">{humanize(control.domain)} · {humanize(control.automation_level)}</span>
                      </div>
                      <StatusBadge value={control.status} />
                    </div>
                    <div className="platform-readiness-verification__evidence-block">
                      <strong>Evidence surface</strong>
                      <span className="platform-readiness-verification__surface">{control.evidence_surface}</span>
                    </div>
                    <div className="platform-readiness-verification__evidence-block">
                      <strong>Required action</strong>
                      <span>{control.required_action}</span>
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
