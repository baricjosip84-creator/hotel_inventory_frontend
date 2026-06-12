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

import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { TENANT_PERMISSIONS } from '../lib/permissions';
import { PlatformProtectedRoute } from '../components/PlatformProtectedRoute';
import PlatformLayout from '../layouts/PlatformLayout';
import { PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

const routeFallback = <div style={{ padding: 24 }}>Loading…</div>;


const pageModules = import.meta.glob('../pages/*.tsx');

function lazyPage(path: keyof typeof pageModules) {
  return lazy(async () => {
    const module = (await pageModules[path]()) as Record<string, unknown>;
    const component = (module.default ?? Object.values(module).find((value) => typeof value === 'function')) as
      | ComponentType
      | undefined;

    if (!component) {
      throw new Error(`Route page module ${path} does not export a React component.`);
    }

    return { default: component };
  });
}

const LoginPage = lazyPage('../pages/LoginPage.tsx');
const DashboardPage = lazyPage('../pages/DashboardPage.tsx');
const ProductsPage = lazyPage('../pages/ProductsPage.tsx');
const SuppliersPage = lazyPage('../pages/SuppliersPage.tsx');
const AlertsPage = lazyPage('../pages/AlertsPage.tsx');
const ShipmentsPage = lazyPage('../pages/ShipmentsPage.tsx');
const StockPage = lazyPage('../pages/StockPage.tsx');
const InventoryUsagePage = lazyPage('../pages/InventoryUsagePage.tsx');
const InventoryRequisitionsPage = lazyPage('../pages/InventoryRequisitionsPage.tsx');
const InventoryReservationsPage = lazyPage('../pages/InventoryReservationsPage.tsx');
const StorageLocationsPage = lazyPage('../pages/StorageLocationsPage.tsx');
const StockMovementsPage = lazyPage('../pages/StockMovementsPage.tsx');
const StockTransfersPage = lazyPage('../pages/StockTransfersPage.tsx');
const PurchaseOrdersPage = lazyPage('../pages/PurchaseOrdersPage.tsx');
const ProcurementRecommendationsPage = lazyPage('../pages/ProcurementRecommendationsPage.tsx');
const ScannerPage = lazyPage('../pages/ScannerPage.tsx');
const SessionsPage = lazyPage('../pages/SessionsPage.tsx');
const ReportsPage = lazyPage('../pages/ReportsPage.tsx');
const UsersPage = lazyPage('../pages/UsersPage.tsx');
const AdminSystemPage = lazyPage('../pages/AdminSystemPage.tsx');
const InsightsPage = lazyPage('../pages/InsightsPage.tsx');
const OperationalActionCenterPage = lazyPage('../pages/OperationalActionCenterPage.tsx');
const RoleAwareWorkspacePage = lazyPage('../pages/RoleAwareWorkspacePage.tsx');
const MobileExecutionPage = lazyPage('../pages/MobileExecutionPage.tsx');
const RealTimeOperationsFeedPage = lazyPage('../pages/RealTimeOperationsFeedPage.tsx');
const WorkflowAutomationComposerPage = lazyPage('../pages/WorkflowAutomationComposerPage.tsx');
const HumanInLoopAIReviewPage = lazyPage('../pages/HumanInLoopAIReviewPage.tsx');
const EnterpriseCollaborationPage = lazyPage('../pages/EnterpriseCollaborationPage.tsx');
const DigitalTwinVisualizationPage = lazyPage('../pages/DigitalTwinVisualizationPage.tsx');
const ReliabilityCommandPage = lazyPage('../pages/ReliabilityCommandPage.tsx');
const TenantAuditPage = lazyPage('../pages/TenantAuditPage.tsx');
const TenantSettingsPage = lazyPage('../pages/TenantSettingsPage.tsx');
const SystemContextPage = lazyPage('../pages/SystemContextPage.tsx');
const ExecutionRequestsPage = lazyPage('../pages/ExecutionRequestsPage.tsx');
const ExecutionTasksPage = lazyPage('../pages/ExecutionTasksPage.tsx');
const AutomationSchedulesPage = lazyPage('../pages/AutomationSchedulesPage.tsx');
const EnterpriseInventoryPage = lazyPage('../pages/EnterpriseInventoryPage.tsx');
const PlatformLoginPage = lazyPage('../pages/PlatformLoginPage.tsx');
const PlatformDashboardPage = lazyPage('../pages/PlatformDashboardPage.tsx');
const PlatformTenantsPage = lazyPage('../pages/PlatformTenantsPage.tsx');
const PlatformSystemHealthPage = lazyPage('../pages/PlatformSystemHealthPage.tsx');
const PlatformAuditPage = lazyPage('../pages/PlatformAuditPage.tsx');
const PlatformAuditRetentionPage = lazyPage('../pages/PlatformAuditRetentionPage.tsx');
const PlatformSupportSessionsPage = lazyPage('../pages/PlatformSupportSessionsPage.tsx');
const PlatformUsersPage = lazyPage('../pages/PlatformUsersPage.tsx');
const PlatformSessionsPage = lazyPage('../pages/PlatformSessionsPage.tsx');
const PlatformNotificationsPage = lazyPage('../pages/PlatformNotificationsPage.tsx');
const PlatformSecurityPage = lazyPage('../pages/PlatformSecurityPage.tsx');
const PlatformBillingPage = lazyPage('../pages/PlatformBillingPage.tsx');
const PlatformProvisioningPage = lazyPage('../pages/PlatformProvisioningPage.tsx');
const PlatformTenantExportsPage = lazyPage('../pages/PlatformTenantExportsPage.tsx');
const PlatformMaintenancePage = lazyPage('../pages/PlatformMaintenancePage.tsx');
const PlatformAnnouncementsPage = lazyPage('../pages/PlatformAnnouncementsPage.tsx');
const PlatformTenantContactsPage = lazyPage('../pages/PlatformTenantContactsPage.tsx');
const PlatformTenantNotesPage = lazyPage('../pages/PlatformTenantNotesPage.tsx');
const PlatformTenantCommunicationsPage = lazyPage('../pages/PlatformTenantCommunicationsPage.tsx');
const PlatformTenantTasksPage = lazyPage('../pages/PlatformTenantTasksPage.tsx');
const PlatformTenantOffboardingPage = lazyPage('../pages/PlatformTenantOffboardingPage.tsx');
const PlatformIncidentsPage = lazyPage('../pages/PlatformIncidentsPage.tsx');
const PlatformDataRetentionPage = lazyPage('../pages/PlatformDataRetentionPage.tsx');
const PlatformTenantTimelinePage = lazyPage('../pages/PlatformTenantTimelinePage.tsx');
const PlatformTenantHealthPage = lazyPage('../pages/PlatformTenantHealthPage.tsx');
const PlatformTenantLifecyclePage = lazyPage('../pages/PlatformTenantLifecyclePage.tsx');
const PlatformTenantSlaPage = lazyPage('../pages/PlatformTenantSlaPage.tsx');
const PlatformRunbooksPage = lazyPage('../pages/PlatformRunbooksPage.tsx');
const PlatformChangeManagementPage = lazyPage('../pages/PlatformChangeManagementPage.tsx');
const PlatformApiKeysPage = lazyPage('../pages/PlatformApiKeysPage.tsx');
const PlatformApiClientGovernancePage = lazyPage('../pages/PlatformApiClientGovernancePage.tsx');
const PlatformIntegrationMonitoringPage = lazyPage('../pages/PlatformIntegrationMonitoringPage.tsx');
const PlatformLegalComplianceReportingPage = lazyPage('../pages/PlatformLegalComplianceReportingPage.tsx');
const PlatformEnterpriseIdentityGovernancePage = lazyPage('../pages/PlatformEnterpriseIdentityGovernancePage.tsx');
const PlatformSubscriptionReadinessPage = lazyPage('../pages/PlatformSubscriptionReadinessPage.tsx');
const PlatformLicensePlanEnforcementPage = lazyPage('../pages/PlatformLicensePlanEnforcementPage.tsx');
const PlatformCustomerSuccessAdminPage = lazyPage('../pages/PlatformCustomerSuccessAdminPage.tsx');
const PlatformWebhooksPage = lazyPage('../pages/PlatformWebhooksPage.tsx');
const PlatformAccessReviewsPage = lazyPage('../pages/PlatformAccessReviewsPage.tsx');
const PlatformPermissionAuditPage = lazyPage('../pages/PlatformPermissionAuditPage.tsx');
const PlatformComplianceDocumentsPage = lazyPage('../pages/PlatformComplianceDocumentsPage.tsx');
const PlatformComplianceExportPage = lazyPage('../pages/PlatformComplianceExportPage.tsx');
const PlatformPrivacyRequestsPage = lazyPage('../pages/PlatformPrivacyRequestsPage.tsx');
const PlatformVendorsPage = lazyPage('../pages/PlatformVendorsPage.tsx');
const PlatformServiceDependenciesPage = lazyPage('../pages/PlatformServiceDependenciesPage.tsx');
const PlatformReleasesPage = lazyPage('../pages/PlatformReleasesPage.tsx');
const PlatformRiskRegisterPage = lazyPage('../pages/PlatformRiskRegisterPage.tsx');
const PlatformCapacityPlanningPage = lazyPage('../pages/PlatformCapacityPlanningPage.tsx');
const PlatformOperationalJobsPage = lazyPage('../pages/PlatformOperationalJobsPage.tsx');

const routes: RouteObject[] = [
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
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ]}>
            <HumanInLoopAIReviewPage />
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
];

const router = createBrowserRouter(routes);

export function AppRouter() {
  return (
    <Suspense fallback={routeFallback}>
      <RouterProvider router={router} />
    </Suspense>
  );
}

export { router };
