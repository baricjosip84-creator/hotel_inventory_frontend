import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import {
  clearAuthTokens,
  clearSupportSessionAccessToken,
  getAccessToken,
  getRefreshToken,
  getSupportSessionInfo
} from '../lib/auth';
import { apiRequest } from '../lib/api';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import type { TenantPermission } from '../lib/permissions';

type UserRole = 'admin' | 'manager' | 'staff' | null;

type NavItem = {
  to: string;
  label: string;
  roles?: Array<Exclude<UserRole, null>>;
  permission?: TenantPermission;
};

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getCurrentUserRole(): UserRole {
  const payload = decodeJwtPayload(getAccessToken());
  const role = payload?.role;

  if (role === 'admin' || role === 'manager' || role === 'staff') {
    return role;
  }

  return null;
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/products')) return 'Products';
  if (pathname.startsWith('/suppliers')) return 'Suppliers';
  if (pathname.startsWith('/alerts')) return 'Alerts';
  if (pathname.startsWith('/stock-movements')) return 'Stock Movements';
  if (pathname.startsWith('/stock-transfers')) return 'Stock Transfers';
  if (pathname.startsWith('/stock')) return 'Stock';
  if (pathname.startsWith('/storage-locations')) return 'Storage Locations';
  if (pathname.startsWith('/shipments')) return 'Shipments';
  if (pathname.startsWith('/scanner')) return 'Scanner';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/insights')) return 'Insights';
  if (pathname.startsWith('/users')) return 'Users';
  if (pathname.startsWith('/audit')) return 'Tenant Audit';
  if (pathname.startsWith('/admin-system')) return 'Admin System';
  if (pathname.startsWith('/sessions')) return 'Sessions';
  return 'Inventory Management';
}

function getPageSubtitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) {
    return 'Operational overview, intelligence signals, and recent activity.';
  }
  if (pathname.startsWith('/products')) {
    return 'Manage inventory products, categories, barcodes, and supplier relationships.';
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
  if (pathname.startsWith('/stock-transfers')) {
    return 'Move stock between storage locations while preserving audit history.';
  }
  if (pathname.startsWith('/stock')) {
    return 'View stock by product and location, with operational mutation controls.';
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
  if (pathname.startsWith('/reports')) {
    return 'Management reporting for valuation, procurement, stock distribution, and forecast.';
  }
  if (pathname.startsWith('/insights')) {
    return 'Management intelligence for depletion risk, anomalies, supplier trust, and reorder actions.';
  }
  if (pathname.startsWith('/users')) {
    return 'Manage tenant users, their roles, and secure access lifecycle.';
  }
  if (pathname.startsWith('/audit')) {
    return 'Review tenant-scoped write history and audited support-session activity.';
  }
  if (pathname.startsWith('/admin-system')) {
    return 'Review system status, diagnostics, tenant control-plane data, and admin health signals.';
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
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the AppLayout.tsx you just pasted.

    The existing shell structure is preserved:
    - same sidebar
    - same mobile drawer
    - same auth/logout flow
    - same page title/subtitle mapping
    - same dvh-based layout behavior
    - same width guards and mobile polish

    The only contract-alignment change:
    - Admin System navigation is now visible to both admin and manager roles.

    WHY IT CHANGED
    --------------
    The uploaded backend exposes tenant-scoped /system-status for admin and manager.
    Your AdminSystemPage already safely limits admin-only diagnostics internally,
    while still allowing managers to view the system-status portion.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Removes the mismatch where managers can use the route-level/admin-system
    page safely, but could not see the navigation item in the sidebar.
  */
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const role = useMemo(() => getCurrentUserRole(), []);
  const supportSession = useMemo(() => getSupportSessionInfo(), [location.pathname]);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = useMemo<NavItem[]>(
    () => [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/products', label: 'Products' },
      { to: '/suppliers', label: 'Suppliers' },
      { to: '/alerts', label: 'Alerts' },
      { to: '/stock', label: 'Stock' },
      { to: '/stock-movements', label: 'Stock Movements' },
      { to: '/stock-transfers', label: 'Stock Transfers', permission: TENANT_PERMISSIONS.STOCK_TRANSFERS_READ },
      { to: '/storage-locations', label: 'Storage Locations' },
      { to: '/shipments', label: 'Shipments' },
      { to: '/scanner', label: 'Scanner' },
      { to: '/reports', label: 'Reports', permission: TENANT_PERMISSIONS.REPORTS_READ },
      { to: '/insights', label: 'Insights', permission: TENANT_PERMISSIONS.INSIGHTS_READ },
      { to: '/users', label: 'Users', permission: TENANT_PERMISSIONS.USERS_READ },
      { to: '/audit', label: 'Audit', permission: TENANT_PERMISSIONS.AUDIT_READ },

      /*
        Backend/router alignment:
        - /system-status is manager-visible.
        - Admin-only diagnostics remain protected inside AdminSystemPage and by
          the backend admin diagnostics/system-health routes.
      */
      { to: '/admin-system', label: 'Admin System', permission: TENANT_PERMISSIONS.SYSTEM_STATUS_READ },

      { to: '/sessions', label: 'Sessions' }
    ],
    []
  );

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.permission) {
        return hasPermission(item.permission);
      }

      if (!item.roles || item.roles.length === 0) {
        return true;
      }

      if (!role) {
        return false;
      }

      return item.roles.includes(role);
    });
  }, [navItems, role]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    if (isMobile && mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isMobile, mobileNavOpen]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    const refreshToken = getRefreshToken();
    const supportSessionInfo = getSupportSessionInfo();

    if (supportSessionInfo.isSupportSession) {
      clearSupportSessionAccessToken();
      navigate('/platform/support-sessions', { replace: true });
      setIsLoggingOut(false);
      return;
    }

    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch {
      // Clear local auth state even when backend logout is unavailable.
    } finally {
      clearAuthTokens();
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={styles.shell}>
      {isMobile && mobileNavOpen ? (
        <div
          aria-hidden="true"
          style={styles.mobileOverlay}
          onClick={() => setMobileNavOpen(false)}
        />
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
          {role ? <div style={styles.rolePill}>ROLE: {role.toUpperCase()}</div> : null}
          {supportSession.isSupportSession ? (
            <div style={styles.supportPill}>SUPPORT MODE</div>
          ) : null}
        </div>

        <div style={styles.navScrollArea}>
          <nav style={styles.nav}>
            {visibleNavItems.map((item) => (
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
        </div>

        <div style={styles.sidebarFooter}>
          <button
            type="button"
            style={styles.logoutButton}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : supportSession.isSupportSession ? 'Exit support mode' : 'Log out'}
          </button>
        </div>
      </aside>

      <div style={styles.mainArea}>
        <header
          style={{
            ...styles.header,
            ...(isMobile ? styles.headerMobile : {})
          }}
        >
          <div
            style={{
              ...styles.headerLeft,
              ...(isMobile ? styles.headerLeftMobile : {})
            }}
          >
            {isMobile ? (
              <button
                type="button"
                aria-label="Open navigation menu"
                style={styles.menuButton}
                onClick={() => setMobileNavOpen((current) => !current)}
              >
                ☰
              </button>
            ) : null}

            <div style={styles.headerTextBlock}>
              <div
                style={{
                  ...styles.breadcrumb,
                  ...(isMobile ? styles.breadcrumbMobile : {})
                }}
              >
                Operations / {getPageTitle(location.pathname)}
              </div>
              <h1
                style={{
                  ...styles.headerTitle,
                  ...(isMobile ? styles.headerTitleMobile : {})
                }}
              >
                {getPageTitle(location.pathname)}
              </h1>
              <p
                style={{
                  ...styles.headerText,
                  ...(isMobile ? styles.headerTextMobile : {})
                }}
              >
                {getPageSubtitle(location.pathname)}
              </p>
            </div>
          </div>
        </header>

        {supportSession.isSupportSession ? (
          <div style={styles.supportBanner}>
            <div>
              <strong>Support mode active.</strong> You are viewing tenant data through an audited platform support session.
              {supportSession.tenantId ? <span> Tenant: {supportSession.tenantId}</span> : null}
            </div>
            <button type="button" style={styles.supportExitButton} onClick={handleLogout} disabled={isLoggingOut}>
              Exit support mode
            </button>
          </div>
        ) : null}

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
    minHeight: '100dvh',
    height: '100dvh',
    display: 'flex',
    background: '#f5f7fb',
    color: '#1f2937',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    minWidth: 0
  },
  sidebar: {
    background: '#0f172a',
    color: '#ffffff',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    overflow: 'hidden',
    minWidth: 0
  },
  sidebarDesktop: {
    width: '272px',
    minWidth: '272px',
    height: '100dvh',
    position: 'sticky',
    top: 0,
    borderRight: '1px solid rgba(255,255,255,0.06)'
  },
  sidebarMobile: {
    width: '280px',
    maxWidth: '85vw',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
    transition: 'transform 0.22s ease',
    willChange: 'transform'
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
    background: 'rgba(15, 23, 42, 0.45)',
    zIndex: 30
  },
  brandBlock: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
    minWidth: 0
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  brandSubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: '12px',
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  rolePill: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(96, 165, 250, 0.16)',
    color: '#bfdbfe',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    maxWidth: '100%',
    wordBreak: 'break-word'
  },
  supportPill: {
    display: 'inline-flex',
    marginTop: '8px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(251, 191, 36, 0.16)',
    color: '#fde68a',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em'
  },
  navScrollArea: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: '4px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0
  },
  navItem: {
    color: 'rgba(255,255,255,0.82)',
    textDecoration: 'none',
    padding: '12px 14px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '15px',
    wordBreak: 'break-word'
  },
  navItemActive: {
    background: 'rgba(59,130,246,0.22)',
    color: '#ffffff'
  },
  sidebarFooter: {
    paddingTop: '16px',
    marginTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
    background: '#0f172a'
  },
  logoutButton: {
    width: '100%',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 14px',
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '24px 24px 16px 24px',
    flexShrink: 0,
    minWidth: 0
  },
  headerMobile: {
    padding: '18px 14px 12px 14px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    minWidth: 0
  },
  headerLeftMobile: {
    gap: '12px'
  },
  menuButton: {
    border: '1px solid #dbe3f0',
    background: '#ffffff',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    fontSize: '20px',
    cursor: 'pointer',
    flexShrink: 0
  },
  headerTextBlock: {
    minWidth: 0
  },
  breadcrumb: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  breadcrumbMobile: {
    marginBottom: '6px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.1,
    wordBreak: 'break-word'
  },
  headerTitleMobile: {
    fontSize: '28px'
  },
  headerText: {
    margin: '10px 0 0 0',
    color: '#475569',
    maxWidth: '760px',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  headerTextMobile: {
    marginTop: '8px',
    fontSize: '14px',
    maxWidth: '100%'
  },
  supportBanner: {
    margin: '0 24px 8px 24px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    color: '#92400e',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  supportExitButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '9px 12px',
    background: '#92400e',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  },
  content: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    overflowX: 'hidden',
    boxSizing: 'border-box'
  },
  contentDesktop: {
    padding: '24px'
  },
  contentMobile: {
    padding: '14px 12px 22px 12px'
  }
};
