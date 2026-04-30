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
import ScannerPage from '../pages/ScannerPage';
import SessionsPage from '../pages/SessionsPage';
import ReportsPage from '../pages/ReportsPage';
import UsersPage from '../pages/UsersPage';
import AdminSystemPage from '../pages/AdminSystemPage';
import InsightsPage from '../pages/InsightsPage';
import TenantAuditPage from '../pages/TenantAuditPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PlatformProtectedRoute } from '../components/PlatformProtectedRoute';
import PlatformLayout from '../layouts/PlatformLayout';
import PlatformLoginPage from '../pages/PlatformLoginPage';
import PlatformTenantsPage from '../pages/PlatformTenantsPage';
import PlatformSystemHealthPage from '../pages/PlatformSystemHealthPage';
import PlatformAuditPage from '../pages/PlatformAuditPage';
import PlatformSupportSessionsPage from '../pages/PlatformSupportSessionsPage';

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
        element: <Navigate to="/platform/tenants" replace />
      },
      {
        path: 'tenants',
        element: <PlatformTenantsPage />
      },
      {
        path: 'system-health',
        element: <PlatformSystemHealthPage />
      },
      {
        path: 'audit',
        element: <PlatformAuditPage />
      },
      {
        path: 'support-sessions',
        element: <PlatformSupportSessionsPage />
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
        element: <DashboardPage />
      },
      {
        path: 'products',
        element: <ProductsPage />
      },
      {
        path: 'suppliers',
        element: <SuppliersPage />
      },
      {
        path: 'alerts',
        element: <AlertsPage />
      },
      {
        path: 'stock',
        element: <StockPage />
      },
      {
        path: 'stock-movements',
        element: <StockMovementsPage />
      },
      {
        path: 'storage-locations',
        element: <StorageLocationsPage />
      },
      {
        path: 'shipments',
        element: <ShipmentsPage />
      },
      {
        path: 'scanner',
        element: <ScannerPage />
      },
      {
        path: 'sessions',
        element: <SessionsPage />
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <ReportsPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <UsersPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'admin-system',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <AdminSystemPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'audit',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <TenantAuditPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'insights',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <InsightsPage />
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
