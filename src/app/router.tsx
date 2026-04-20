/*
  src/app/router.tsx

  WHAT CHANGED
  ------------
  Added the reports route to surface the backend reporting and forecast module
  that already exists in your API.

  WHY IT CHANGED
  --------------
  The backend already ships management-grade reporting endpoints, but the
  frontend router did not expose them.

  WHAT PROBLEM IT SOLVES
  ----------------------
  This makes the reports module reachable through the authenticated app shell
  without changing your existing route architecture.
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
import { ProtectedRoute } from '../components/ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
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