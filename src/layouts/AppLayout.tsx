/*
  src/layouts/AppLayout.tsx

  WHAT CHANGED
  ------------
  Added navigation, page titles, and subtitles for the new Users,
  Admin/System, and Insights surfaces.

  WHY IT CHANGED
  --------------
  The latest frontend snapshot already contains reports and role-aware routing.
  These additions extend the same app-shell pattern to the next product areas
  that already exist in the backend.

  WHAT PROBLEM IT SOLVES
  ----------------------
  This makes the newly surfaced management/admin modules discoverable on both
  desktop and mobile without introducing another layout pattern.
*/

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { clearAuthTokens, getRefreshToken } from '../lib/auth';
import { getCurrentUserRole, getRoleCapabilities } from '../lib/permissions';
import { apiRequest } from '../lib/api';

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/products')) return 'Products';
  if (pathname.startsWith('/suppliers')) return 'Suppliers';
  if (pathname.startsWith('/alerts')) return 'Alerts';
  if (pathname.startsWith('/stock-movements')) return 'Stock Movements';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/insights')) return 'Insights';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/admin-system')) return 'Admin / System';
  if (pathname.startsWith('/stock')) return 'Stock';
  if (pathname.startsWith('/storage-locations')) return 'Storage Locations';
  if (pathname.startsWith('/shipments')) return 'Shipments';
  if (pathname.startsWith('/scanner')) return 'Scanner';
  if (pathname.startsWith('/sessions')) return 'Sessions';
  return 'Inventory Management';
}

function getPageSubtitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) {
    return 'Operational overview, intelligence signals, and recent activity.';
  }
  if (pathname.startsWith('/products')) {
    return 'Manage inventory products, categories, and supplier relationships.';
  }
  if (pathname.startsWith('/suppliers')) {
    return 'Track suppliers and maintain master data used by shipments and products.';
  }
  if (pathname.startsWith('/alerts')) {
    return 'Review and resolve operational issues that require immediate attention.';
  }
  if (pathname.startsWith('/stock-movements')) {
    return 'Trace the full movement ledger behind current stock positions.';
  }
  if (pathname.startsWith('/reports')) {
    return 'Management reporting for valuation, location balances, movements, procurement, and forecast.';
  }
  if (pathname.startsWith('/insights')) {
    return 'Decision-support analytics for depletion risk, reorder priorities, anomalies, supplier trust, and health score.';
  }
  if (pathname.startsWith('/users')) {
    return 'Manage tenant users, roles, and account lifecycle from the same backend authorization model already in place.';
  }
  if (pathname.startsWith('/admin-system')) {
    return 'Operational visibility into system status, diagnostics, and tenant-wide health signals.';
  }
  if (pathname.startsWith('/stock')) {
    return 'View stock by product and location, with low-stock visibility.';
  }
  if (pathname.startsWith('/storage-locations')) {
    return 'Maintain storage areas used for inventory receiving and allocation.';
  }
  if (pathname.startsWith('/shipments')) {
    return 'Manage inbound shipment creation, receiving, and finalization.';
  }
  if (pathname.startsWith('/scanner')) {
    return 'Use the device camera to scan QR codes and barcodes.';
  }
  if (pathname.startsWith('/sessions')) {
    return 'Review active sessions and revoke stale account access.';
  }
  return 'Frontend connected to your production-ready backend';
}

function useIsMobile(breakpoint = 960): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const currentRole = getCurrentUserRole();
  const capabilities = getRoleCapabilities(currentRole);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', visible: true },
    { to: '/products', label: 'Products', visible: true },
    { to: '/suppliers', label: 'Suppliers', visible: true },
    { to: '/alerts', label: 'Alerts', visible: true },
    { to: '/stock', label: 'Stock', visible: true },
    { to: '/stock-movements', label: 'Stock Movements', visible: true },
    { to: '/storage-locations', label: 'Storage Locations', visible: true },
    { to: '/shipments', label: 'Shipments', visible: true },
    { to: '/scanner', label: 'Scanner', visible: true },
    { to: '/reports', label: 'Reports', visible: capabilities.canViewReports },
    { to: '/insights', label: 'Insights', visible: capabilities.canViewInsights },
    { to: '/users', label: 'Users', visible: capabilities.canViewUsers },
    { to: '/admin-system', label: 'Admin / System', visible: capabilities.canViewAdminSystem },
    { to: '/sessions', label: 'Sessions', visible: true }
  ].filter((item) => item.visible);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch {
      // Ignore backend logout errors and always clear local state.
    } finally {
      clearAuthTokens();
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }
  };

  const toggleMobileNav = () => {
    setMobileNavOpen((current) => !current);
  };

  return (
    <div style={styles.shell}>
      {isMobile && mobileNavOpen ? (
        <div style={styles.mobileOverlay} onClick={() => setMobileNavOpen(false)} />
      ) : null}

      <aside
        style={{
          ...styles.sidebar,
          ...(isMobile ? styles.sidebarMobile : styles.sidebarDesktop),
          ...(isMobile && mobileNavOpen ? styles.sidebarMobileOpen : {}),
          ...(isMobile && !mobileNavOpen ? styles.sidebarMobileClosed : {})
        }}
      >
        <div style={styles.brandBlock}>
          <div style={styles.brandTitle}>Inventory Platform</div>
          <div style={styles.brandSubtitle}>Multi-tenant control center</div>
          <div style={styles.roleChip}>ROLE: {currentRole.toUpperCase()}</div>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {})
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <button type="button" style={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div style={styles.mainArea}>
        <header style={styles.header}>
          <div style={styles.headerInner}>
            {isMobile ? (
              <button type="button" style={styles.mobileMenuButton} onClick={toggleMobileNav}>
                {mobileNavOpen ? 'Close' : 'Menu'}
              </button>
            ) : null}
            <div>
              <div style={styles.headerEyebrow}>Operations / {getPageTitle(location.pathname)}</div>
              <h1 style={styles.headerTitle}>{getPageTitle(location.pathname)}</h1>
              <p style={styles.headerText}>{getPageSubtitle(location.pathname)}</p>
            </div>
          </div>
        </header>

        <main
          style={{
            ...styles.content,
            ...(isMobile ? styles.contentMobile : styles.contentDesktop)
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f5f7fb',
    color: '#1f2937',
    position: 'relative'
  },
  sidebar: {
    background: '#0f172a',
    color: '#ffffff',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40
  },
  sidebarDesktop: {
    width: '260px',
    minWidth: '260px',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    position: 'relative'
  },
  sidebarMobile: {
    width: '280px',
    maxWidth: '82vw',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
    transition: 'transform 0.2s ease'
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)'
  },
  sidebarMobileClosed: {
    transform: 'translateX(-100%)'
  },
  mobileOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.4)',
    zIndex: 30
  },
  brandBlock: {
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  brandTitle: {
    fontSize: '1.15rem',
    fontWeight: 800,
    letterSpacing: '0.02em'
  },
  brandSubtitle: {
    marginTop: '6px',
    color: '#cbd5e1',
    fontSize: '0.92rem'
  },
  roleChip: {
    marginTop: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(96, 165, 250, 0.18)',
    color: '#bfdbfe',
    fontSize: '0.74rem',
    fontWeight: 700,
    letterSpacing: '0.06em'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '20px'
  },
  navItem: {
    color: '#cbd5e1',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '10px',
    fontWeight: 600,
    transition: 'background 0.15s ease, color 0.15s ease'
  },
  navItemActive: {
    background: 'rgba(148, 163, 184, 0.18)',
    color: '#ffffff'
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '20px'
  },
  logoutButton: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    background: 'rgba(245, 247, 251, 0.92)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #e5e7eb'
  },
  headerInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px 24px'
  },
  mobileMenuButton: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    borderRadius: '10px',
    padding: '10px 12px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  headerEyebrow: {
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    fontWeight: 700,
    marginBottom: '6px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  headerText: {
    margin: '8px 0 0 0',
    color: '#475569',
    maxWidth: '860px',
    lineHeight: 1.5
  },
  content: {
    width: '100%',
    boxSizing: 'border-box'
  },
  contentDesktop: {
    padding: '24px'
  },
  contentMobile: {
    padding: '16px'
  }
};
