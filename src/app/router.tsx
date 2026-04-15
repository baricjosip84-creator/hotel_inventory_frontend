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