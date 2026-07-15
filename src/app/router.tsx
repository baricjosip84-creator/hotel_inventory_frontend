/*
  src/app/router.tsx

  WHAT CHANGED
  ------------
  Added route surfaces for users, admin/system operations, and insights on top
  of the already-existing reports and role-aware routing.

  WHY IT CHANGED
  --------------
  Your backend already exposes these capabilities, but the frontend snapshot in
  the zip did not surface them. These routes make that existing backend value
  reachable without changing the routing architecture.

  WHAT PROBLEM IT SOLVES
  ----------------------
  This closes the biggest frontend-to-backend product gaps: user management,
  system/admin visibility, and management insights.
*/

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProductsPage from '../pages/ProductsPage';
import SuppliersPage from '../pages/SuppliersPage';
import AlertsPage from '../pages/AlertsPage';
import ShipmentsPage from '../pages/ShipmentsPage';
import StockPage from '../pages/StockPage';
import InventoryUsagePage from '../pages/InventoryUsagePage';
import InventoryRequisitionsPage from '../pages/InventoryRequisitionsPage';
import InventoryReservationsPage from '../pages/InventoryReservationsPage';
import StorageLocationsPage from '../pages/StorageLocationsPage';
import StockMovementsPage from '../pages/StockMovementsPage';
import StockTransfersPage from '../pages/StockTransfersPage';
import PurchaseOrdersPage from '../pages/PurchaseOrdersPage';
import ProcurementRecommendationsPage from '../pages/ProcurementRecommendationsPage';
import ReplenishmentPlanningPage from '../pages/ReplenishmentPlanningPage';
import ScannerPage from '../pages/ScannerPage';
import SessionsPage from '../pages/SessionsPage';
import ReportsPage from '../pages/ReportsPage';
import UsersPage from '../pages/UsersPage';
import TenantPermissionsPage from '../pages/TenantPermissionsPage';
import AdminSystemPage from '../pages/AdminSystemPage';
import InsightsPage from '../pages/InsightsPage';
import OperationalActionCenterPage from '../pages/OperationalActionCenterPage';
import RoleAwareWorkspacePage from '../pages/RoleAwareWorkspacePage';
import MobileExecutionPage from '../pages/MobileExecutionPage';
import RealTimeOperationsFeedPage from '../pages/RealTimeOperationsFeedPage';
import WorkflowAutomationComposerPage from '../pages/WorkflowAutomationComposerPage';
import HumanInLoopAIReviewPage from '../pages/HumanInLoopAIReviewPage';
import AIOperationsCopilotPage from '../pages/AIOperationsCopilotPage';
import DecisionLearningFeedbackPage from '../pages/DecisionLearningFeedbackPage';
import CrossDomainOptimizationPage from '../pages/CrossDomainOptimizationPage';
import AdaptivePolicyEnginePage from '../pages/AdaptivePolicyEnginePage';
import ProbabilisticForecastingPage from '../pages/ProbabilisticForecastingPage';
import EnterpriseCollaborationPage from '../pages/EnterpriseCollaborationPage';
import DigitalTwinVisualizationPage from '../pages/DigitalTwinVisualizationPage';
import ReliabilityCommandPage from '../pages/ReliabilityCommandPage';
import TenantAuditPage from '../pages/TenantAuditPage';
import TenantSettingsPage from '../pages/TenantSettingsPage';
import SystemContextPage from '../pages/SystemContextPage';
import ExecutionRequestsPage from '../pages/ExecutionRequestsPage';
import ExecutionTasksPage from '../pages/ExecutionTasksPage';
import AutomationSchedulesPage from '../pages/AutomationSchedulesPage';
import EnterpriseInventoryPage from '../pages/EnterpriseInventoryPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TENANT_PERMISSIONS } from '../lib/permissions';
import { PlatformProtectedRoute } from '../components/PlatformProtectedRoute';
import PlatformLayout from '../layouts/PlatformLayout';
import PlatformLoginPage from '../pages/PlatformLoginPage';
import PlatformDashboardPage from '../pages/PlatformDashboardPage';
import PlatformTenantsPage from '../pages/PlatformTenantsPage';
import PlatformSystemHealthPage from '../pages/PlatformSystemHealthPage';
import PlatformAuditPage from '../pages/PlatformAuditPage';
import PlatformAuditRetentionPage from '../pages/PlatformAuditRetentionPage';
import PlatformSupportSessionsPage from '../pages/PlatformSupportSessionsPage';
import PlatformUsersPage from '../pages/PlatformUsersPage';
import PlatformPermissionsPage from '../pages/PlatformPermissionsPage';
import PlatformSessionsPage from '../pages/PlatformSessionsPage';
import PlatformNotificationsPage from '../pages/PlatformNotificationsPage';
import PlatformSecurityPage from '../pages/PlatformSecurityPage';
import PlatformBillingPage from '../pages/PlatformBillingPage';
import PlatformProvisioningPage from '../pages/PlatformProvisioningPage';
import PlatformTenantExportsPage from '../pages/PlatformTenantExportsPage';
import PlatformMaintenancePage from '../pages/PlatformMaintenancePage';
import PlatformAnnouncementsPage from '../pages/PlatformAnnouncementsPage';
import PlatformTenantContactsPage from '../pages/PlatformTenantContactsPage';
import PlatformTenantNotesPage from '../pages/PlatformTenantNotesPage';
import PlatformTenantCommunicationsPage from '../pages/PlatformTenantCommunicationsPage';
import PlatformTenantTasksPage from '../pages/PlatformTenantTasksPage';
import PlatformTenantOffboardingPage from '../pages/PlatformTenantOffboardingPage';
import PlatformIncidentsPage from '../pages/PlatformIncidentsPage';
import PlatformDataRetentionPage from '../pages/PlatformDataRetentionPage';
import PlatformTenantTimelinePage from '../pages/PlatformTenantTimelinePage';
import PlatformTenantHealthPage from '../pages/PlatformTenantHealthPage';
import PlatformTenantLifecyclePage from '../pages/PlatformTenantLifecyclePage';
import PlatformTenantSlaPage from '../pages/PlatformTenantSlaPage';
import PlatformRunbooksPage from '../pages/PlatformRunbooksPage';
import PlatformChangeManagementPage from '../pages/PlatformChangeManagementPage';
import PlatformApiKeysPage from '../pages/PlatformApiKeysPage';
import PlatformApiClientGovernancePage from '../pages/PlatformApiClientGovernancePage';
import PlatformIntegrationMonitoringPage from '../pages/PlatformIntegrationMonitoringPage';
import PlatformLegalComplianceReportingPage from '../pages/PlatformLegalComplianceReportingPage';
import PlatformEnterpriseIdentityGovernancePage from '../pages/PlatformEnterpriseIdentityGovernancePage';
import PlatformSubscriptionReadinessPage from '../pages/PlatformSubscriptionReadinessPage';
import PlatformLicensePlanEnforcementPage from '../pages/PlatformLicensePlanEnforcementPage';
import PlatformCustomerSuccessAdminPage from '../pages/PlatformCustomerSuccessAdminPage';
import PlatformWebhooksPage from '../pages/PlatformWebhooksPage';
import PlatformAccessReviewsPage from '../pages/PlatformAccessReviewsPage';
import PlatformPermissionAuditPage from '../pages/PlatformPermissionAuditPage';
import PlatformComplianceDocumentsPage from '../pages/PlatformComplianceDocumentsPage';
import PlatformComplianceExportPage from '../pages/PlatformComplianceExportPage';
import PlatformPrivacyRequestsPage from '../pages/PlatformPrivacyRequestsPage';
import PlatformVendorsPage from '../pages/PlatformVendorsPage';
import PlatformServiceDependenciesPage from '../pages/PlatformServiceDependenciesPage';
import PlatformReleasesPage from '../pages/PlatformReleasesPage';
import PlatformRiskRegisterPage from '../pages/PlatformRiskRegisterPage';
import PlatformCapacityPlanningPage from '../pages/PlatformCapacityPlanningPage';
import PlatformOperationalJobsPage from '../pages/PlatformOperationalJobsPage';
import PlatformCommercialLaunchReadinessPage from '../pages/PlatformCommercialLaunchReadinessPage';
import PlatformCommercialReadinessVerificationProgramPage from '../pages/PlatformCommercialReadinessVerificationProgramPage';
import PlatformCustomerOnboardingChecklistPage from '../pages/PlatformCustomerOnboardingChecklistPage';
import PlatformTenantProvisioningHardeningPage from '../pages/PlatformTenantProvisioningHardeningPage';
import PlatformBillingSubscriptionActivationPage from '../pages/PlatformBillingSubscriptionActivationPage';
import PlatformSupportOperationsCockpitPage from '../pages/PlatformSupportOperationsCockpitPage';
import PlatformProductionMonitoringReadinessPage from '../pages/PlatformProductionMonitoringReadinessPage';
import PlatformBackupRestoreValidationPage from '../pages/PlatformBackupRestoreValidationPage';
import PlatformDeploymentValidationPage from '../pages/PlatformDeploymentValidationPage';
import PlatformDocumentationCompletenessPage from '../pages/PlatformDocumentationCompletenessPage';
import PlatformPilotCustomerReadinessPage from '../pages/PlatformPilotCustomerReadinessPage';
import PlatformCommercialLaunchCertificatePage from '../pages/PlatformCommercialLaunchCertificatePage';
import PlatformCommercialLaunchAcceptancePacketPage from '../pages/PlatformCommercialLaunchAcceptancePacketPage';
import PlatformCommercialLaunchGoNoGoRegisterPage from '../pages/PlatformCommercialLaunchGoNoGoRegisterPage';
import PlatformCommercialLaunchSmokeTestChecklistPage from '../pages/PlatformCommercialLaunchSmokeTestChecklistPage';
import PlatformCommercialLaunchDayCommandCenterPage from '../pages/PlatformCommercialLaunchDayCommandCenterPage';
import PlatformCommercialLaunchPostLaunchObservationPage from '../pages/PlatformCommercialLaunchPostLaunchObservationPage';
import PlatformCommercialLaunchIncidentTriagePage from '../pages/PlatformCommercialLaunchIncidentTriagePage';
import PlatformCommercialLaunchIncidentClosurePage from '../pages/PlatformCommercialLaunchIncidentClosurePage';
import PlatformCommercialLaunchPreventionVerificationPage from '../pages/PlatformCommercialLaunchPreventionVerificationPage';
import PlatformCommercialLaunchRolloutExpansionAuthorizationPage from '../pages/PlatformCommercialLaunchRolloutExpansionAuthorizationPage';
import PlatformCommercialLaunchExpansionHealthObservationPage from '../pages/PlatformCommercialLaunchExpansionHealthObservationPage';
import PlatformCommercialLaunchAdditionalGrowthAuthorizationPage from '../pages/PlatformCommercialLaunchAdditionalGrowthAuthorizationPage';
import PlatformCommercialLaunchAdditionalGrowthObservationPage from '../pages/PlatformCommercialLaunchAdditionalGrowthObservationPage';
import PlatformCommercialLaunchSteadyStateTransitionPage from '../pages/PlatformCommercialLaunchSteadyStateTransitionPage';
import PlatformCommercialLaunchSteadyStateOperationsCadencePage from '../pages/PlatformCommercialLaunchSteadyStateOperationsCadencePage';
import PlatformCommercialLaunchSteadyStateExceptionReviewPage from '../pages/PlatformCommercialLaunchSteadyStateExceptionReviewPage';
import PlatformCommercialLaunchSteadyStateExceptionClosurePage from '../pages/PlatformCommercialLaunchSteadyStateExceptionClosurePage';
import PlatformCommercialLaunchSteadyStateRecurrenceAuditPage from '../pages/PlatformCommercialLaunchSteadyStateRecurrenceAuditPage';
import PlatformCommercialLaunchSteadyStateRecurrenceResolutionPage from '../pages/PlatformCommercialLaunchSteadyStateRecurrenceResolutionPage';
import PlatformCommercialLaunchSteadyStateResolutionVerificationPage from '../pages/PlatformCommercialLaunchSteadyStateResolutionVerificationPage';
import PlatformCommercialLaunchDurableClosureCertificationPage from '../pages/PlatformCommercialLaunchDurableClosureCertificationPage';
import PlatformCommercialLaunchFinalEvidenceArchivePage from '../pages/PlatformCommercialLaunchFinalEvidenceArchivePage';
import PlatformCommercialLaunchEvidenceRetentionSealPage from '../pages/PlatformCommercialLaunchEvidenceRetentionSealPage';
import PlatformCommercialLaunchRetentionRenewalReviewPage from '../pages/PlatformCommercialLaunchRetentionRenewalReviewPage';
import PlatformCommercialLaunchRetentionRenewalAcceptanceDocketPage from '../pages/PlatformCommercialLaunchRetentionRenewalAcceptanceDocketPage';
import PlatformCommercialLaunchRetentionRenewalCertificationPage from '../pages/PlatformCommercialLaunchRetentionRenewalCertificationPage';
import PlatformCommercialLaunchRetentionRenewalFinalSealPage from '../pages/PlatformCommercialLaunchRetentionRenewalFinalSealPage';
import PlatformCommercialLaunchRetentionRenewalArchiveSealPage from '../pages/PlatformCommercialLaunchRetentionRenewalArchiveSealPage';
import PlatformCommercialLaunchRetentionRenewalCycleResetPage from '../pages/PlatformCommercialLaunchRetentionRenewalCycleResetPage';
import { PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/platform/login',
    element: <PlatformLoginPage />
  },
  {
    path: '/platform',
    element: (
      <PlatformProtectedRoute>
        <PlatformLayout />
      </PlatformProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/platform/dashboard" replace />
      },

      {
        path: 'dashboard',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformDashboardPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-readiness',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchReadinessPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-readiness-verification-program',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialReadinessVerificationProgramPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'customer-onboarding-checklist',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformCustomerOnboardingChecklistPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-provisioning-hardening',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantProvisioningHardeningPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'billing-subscription-activation',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ]}>
            <PlatformBillingSubscriptionActivationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'support-operations-cockpit',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformSupportOperationsCockpitPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'production-monitoring-readiness',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ]}>
            <PlatformProductionMonitoringReadinessPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'backup-restore-validation',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_EXPORT]}>
            <PlatformBackupRestoreValidationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'deployment-validation',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ]}>
            <PlatformDeploymentValidationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'documentation-completeness',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ]}>
            <PlatformDocumentationCompletenessPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'pilot-customer-readiness',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformPilotCustomerReadinessPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-certificate',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchCertificatePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-acceptance-packet',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchAcceptancePacketPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-go-no-go-register',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchGoNoGoRegisterPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-smoke-test-checklist',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSmokeTestChecklistPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-day-command-center',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchDayCommandCenterPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-post-launch-observation',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchPostLaunchObservationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-incident-triage',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchIncidentTriagePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-incident-closure',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchIncidentClosurePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-prevention-verification',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchPreventionVerificationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-rollout-expansion-authorization',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRolloutExpansionAuthorizationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-expansion-health-observation',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchExpansionHealthObservationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-additional-growth-authorization',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchAdditionalGrowthAuthorizationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-additional-growth-observation',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchAdditionalGrowthObservationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-transition',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateTransitionPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-operations-cadence',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateOperationsCadencePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-exception-review',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateExceptionReviewPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-exception-closure',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateExceptionClosurePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-recurrence-audit',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateRecurrenceAuditPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-recurrence-resolution',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateRecurrenceResolutionPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-steady-state-resolution-verification',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchSteadyStateResolutionVerificationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-durable-closure-certification',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchDurableClosureCertificationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-final-evidence-archive',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchFinalEvidenceArchivePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-evidence-retention-seal',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchEvidenceRetentionSealPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-retention-renewal-review',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRetentionRenewalReviewPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-retention-renewal-acceptance-docket',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRetentionRenewalAcceptanceDocketPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-retention-renewal-certification',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRetentionRenewalCertificationPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-retention-renewal-final-seal',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRetentionRenewalFinalSealPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-retention-renewal-archive-seal',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRetentionRenewalArchiveSealPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'commercial-launch-retention-renewal-cycle-reset',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ]}>
            <PlatformCommercialLaunchRetentionRenewalCycleResetPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenants',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'provisioning',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformProvisioningPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-exports',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_EXPORT]}>
            <PlatformTenantExportsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-contacts',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantContactsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-notes',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantNotesPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-communications',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantCommunicationsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-tasks',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantTasksPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-timeline',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantTimelinePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-health',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantHealthPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-lifecycle',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantLifecyclePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-sla',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SLA_READ]}>
            <PlatformTenantSlaPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'runbooks',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ]}>
            <PlatformRunbooksPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'change-management',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ]}>
            <PlatformChangeManagementPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'api-keys',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ]}>
            <PlatformApiKeysPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'api-client-governance',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ]}>
            <PlatformApiClientGovernancePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'integration-monitoring',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ]}>
            <PlatformIntegrationMonitoringPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'legal-compliance-reporting',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ]}>
            <PlatformLegalComplianceReportingPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'webhooks',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ]}>
            <PlatformWebhooksPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'vendors',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ]}>
            <PlatformVendorsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'service-dependencies',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ]}>
            <PlatformServiceDependenciesPage />
          </PlatformProtectedRoute>
        )
      },

      {
        path: 'risk-register',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ]}>
            <PlatformRiskRegisterPage />
          </PlatformProtectedRoute>
        )
      },

      {
        path: 'capacity-planning',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_READ]}>
            <PlatformCapacityPlanningPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'operational-jobs',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ]}>
            <PlatformOperationalJobsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'releases',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ]}>
            <PlatformReleasesPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'access-reviews',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ]}>
            <PlatformAccessReviewsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'permission-audit',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ]}>
            <PlatformPermissionAuditPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'compliance-documents',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ]}>
            <PlatformComplianceDocumentsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'compliance-export',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ]}>
            <PlatformComplianceExportPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'privacy-requests',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ]}>
            <PlatformPrivacyRequestsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'data-retention',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ]}>
            <PlatformDataRetentionPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'tenant-offboarding',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformTenantOffboardingPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'incidents',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ]}>
            <PlatformIncidentsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'maintenance',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ]}>
            <PlatformMaintenancePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'announcements',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ]}>
            <PlatformAnnouncementsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'system-health',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ]}>
            <PlatformSystemHealthPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'audit',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.AUDIT_READ]}>
            <PlatformAuditPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'audit-retention',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.AUDIT_READ]}>
            <PlatformAuditRetentionPage />
          </PlatformProtectedRoute>
        )
      },

      {
        path: 'users',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_USERS_READ]}>
            <PlatformUsersPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'permissions',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_ROLE_PERMISSIONS_READ]}>
            <PlatformPermissionsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'sessions',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ]}>
            <PlatformSessionsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'billing',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ]}>
            <PlatformBillingPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'subscription-readiness',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ]}>
            <PlatformSubscriptionReadinessPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'license-plan-enforcement',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ]}>
            <PlatformLicensePlanEnforcementPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'customer-success-admin',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>
            <PlatformCustomerSuccessAdminPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'enterprise-identity',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ]}>
            <PlatformEnterpriseIdentityGovernancePage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'notifications',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ]}>
            <PlatformNotificationsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'security',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ]}>
            <PlatformSecurityPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'support-sessions',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ]}>
            <PlatformSupportSessionsPage />
          </PlatformProtectedRoute>
        )
      }
    ]
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.DASHBOARD_READ]}>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'products',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.PRODUCTS_READ]}>
            <ProductsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'suppliers',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.SUPPLIERS_READ]}>
            <SuppliersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'alerts',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.ALERTS_READ]}>
            <AlertsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'action-center',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <OperationalActionCenterPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'workspace',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <RoleAwareWorkspacePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'mobile-execution',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <MobileExecutionPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'real-time-operations-feed',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <RealTimeOperationsFeedPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'workflow-composer',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <WorkflowAutomationComposerPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'ai-review',
        element: (
          <ProtectedRoute requiredPermissions={[
            TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ,
            TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ
          ]}>
            <HumanInLoopAIReviewPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'ai-copilot',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ]}>
            <AIOperationsCopilotPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'decision-learning-feedback',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ]}>
            <DecisionLearningFeedbackPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'adaptive-policy-engine',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ]}>
            <AdaptivePolicyEnginePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'probabilistic-forecasting',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ]}>
            <ProbabilisticForecastingPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'cross-domain-optimization',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ]}>
            <CrossDomainOptimizationPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'collaboration',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <EnterpriseCollaborationPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'digital-twin',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <DigitalTwinVisualizationPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'reliability-command',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.PLATFORM_RELIABILITY_READ]}>
            <ReliabilityCommandPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'stock',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.STOCK_READ]}>
            <StockPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'inventory-usage',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.INVENTORY_USAGE_READ]}>
            <InventoryUsagePage />
          </ProtectedRoute>
        )
      },
      {
        path: 'inventory-requisitions',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ]}>
            <InventoryRequisitionsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'inventory-reservations',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_READ]}>
            <InventoryReservationsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'stock-movements',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ]}>
            <StockMovementsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'stock-transfers',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.STOCK_TRANSFERS_READ]}>
            <StockTransfersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'purchase-orders',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.PURCHASE_ORDERS_READ]}>
            <PurchaseOrdersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'procurement-recommendations',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.INSIGHTS_READ]}>
            <ProcurementRecommendationsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'replenishment-planning',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.INSIGHTS_READ]}>
            <ReplenishmentPlanningPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'storage-locations',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ]}>
            <StorageLocationsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'shipments',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.SHIPMENTS_READ]}>
            <ShipmentsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'scanner',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.SHIPMENTS_READ]}>
            <ScannerPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'sessions',
        element: (
          <ProtectedRoute>
            <SessionsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.REPORTS_READ]}>
            <ReportsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.USERS_READ]}>
            <UsersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'permissions',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.ROLE_PERMISSIONS_READ]}>
            <TenantPermissionsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin-system',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.SYSTEM_STATUS_READ]}>
            <AdminSystemPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'audit',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.AUDIT_READ]}>
            <TenantAuditPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'tenant-settings',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.TENANT_READ]}>
            <TenantSettingsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'insights',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.INSIGHTS_READ]}>
            <InsightsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'system-context',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.SYSTEM_CONTEXT_READ]}>
            <SystemContextPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'execution-requests',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.EXECUTION_REQUESTS_VIEW]}>
            <ExecutionRequestsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'execution-tasks',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.EXECUTION_TASKS_READ]}>
            <ExecutionTasksPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'automation-schedules',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.AUTOMATION_SCHEDULES_VIEW]}>
            <AutomationSchedulesPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'enterprise-inventory',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.PAR_LEVELS_READ]}>
            <EnterpriseInventoryPage />
          </ProtectedRoute>
        )
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export { router };
