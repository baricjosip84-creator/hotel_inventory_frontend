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
import StorageLocationsPage from '../pages/StorageLocationsPage';
import StockMovementsPage from '../pages/StockMovementsPage';
import StockTransfersPage from '../pages/StockTransfersPage';
import PurchaseOrdersPage from '../pages/PurchaseOrdersPage';
import ScannerPage from '../pages/ScannerPage';
import SessionsPage from '../pages/SessionsPage';
import ReportsPage from '../pages/ReportsPage';
import UsersPage from '../pages/UsersPage';
import AdminSystemPage from '../pages/AdminSystemPage';
import InsightsPage from '../pages/InsightsPage';
import TenantAuditPage from '../pages/TenantAuditPage';
import TenantSettingsPage from '../pages/TenantSettingsPage';
import SystemContextPage from '../pages/SystemContextPage';
import ExecutionRequestsPage from '../pages/ExecutionRequestsPage';
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
import PlatformSupportSessionsPage from '../pages/PlatformSupportSessionsPage';
import PlatformUsersPage from '../pages/PlatformUsersPage';
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
import PlatformTenantSlaPage from '../pages/PlatformTenantSlaPage';
import PlatformRunbooksPage from '../pages/PlatformRunbooksPage';
import PlatformChangeManagementPage from '../pages/PlatformChangeManagementPage';
import PlatformApiKeysPage from '../pages/PlatformApiKeysPage';
import PlatformWebhooksPage from '../pages/PlatformWebhooksPage';
import PlatformAccessReviewsPage from '../pages/PlatformAccessReviewsPage';
import PlatformComplianceDocumentsPage from '../pages/PlatformComplianceDocumentsPage';
import PlatformPrivacyRequestsPage from '../pages/PlatformPrivacyRequestsPage';
import PlatformVendorsPage from '../pages/PlatformVendorsPage';
import PlatformServiceDependenciesPage from '../pages/PlatformServiceDependenciesPage';
import PlatformReleasesPage from '../pages/PlatformReleasesPage';
import PlatformRiskRegisterPage from '../pages/PlatformRiskRegisterPage';
import PlatformCapacityPlanningPage from '../pages/PlatformCapacityPlanningPage';
import PlatformOperationalJobsPage from '../pages/PlatformOperationalJobsPage';
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
        path: 'compliance-documents',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ]}>
            <PlatformComplianceDocumentsPage />
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
        path: 'notifications',
        element: (
          <PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ]}>
            <PlatformNotificationsPage />
          </PlatformProtectedRoute>
        )
      },
      {
        path: 'security',
        element: <PlatformSecurityPage />
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
        path: 'stock',
        element: (
          <ProtectedRoute requiredPermissions={[TENANT_PERMISSIONS.STOCK_READ]}>
            <StockPage />
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
        element: <SessionsPage />
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
