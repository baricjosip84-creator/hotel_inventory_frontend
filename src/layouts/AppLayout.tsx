import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { clearAuthTokens, getAccessToken, getRefreshToken } from '../lib/auth';
import { apiRequest } from '../lib/api';

type UserRole = 'admin' | 'manager' | 'staff' | null;

type NavItem = {
  to: string;
  label: string;
  roles?: Array<Exclude<UserRole, null>>;
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
  if (pathname.startsWith('/stock')) return 'Stock';
  if (pathname.startsWith('/storage-locations')) return 'Storage Locations';
  if (pathname.startsWith('/shipments')) return 'Shipments';
  if (pathname.startsWith('/scanner')) return 'Scanner';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/insights')) return 'Insights';
  if (pathname.startsWith('/users')) return 'Users';
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
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const role = useMemo(() => getCurrentUserRole(), []);

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
      { to: '/storage-locations', label: 'Storage Locations' },
      { to: '/shipments', label: 'Shipments' },
      { to: '/scanner', label: 'Scanner' },
      { to: '/reports', label: 'Reports', roles: ['admin', 'manager'] },
      { to: '/insights', label: 'Insights', roles: ['admin', 'manager'] },
      { to: '/users', label: 'Users', roles: ['admin', 'manager'] },
      { to: '/admin-system', label: 'Admin System', roles: ['admin'] },
      { to: '/sessions', label: 'Sessions' }
    ],
    []
  );

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
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
    /*
      What changed:
      - Lock body scrolling while the mobile navigation drawer is open.
      - Restore the prior overflow value when the drawer closes or the component unmounts.

      Why:
      - The user reported that the page could still scroll behind the opened mobile menu.
      - That behavior makes the drawer feel unstable and can hide menu items.

      What problem this solves:
      - Prevents background page scrolling while the mobile menu is active.
      - Keeps the navigation focus on the drawer itself.
    */
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
        <div aria-hidden="true" style={styles.mobileOverlay} onClick={() => setMobileNavOpen(false)} />
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
          <button type="button" style={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <div style={styles.mainArea}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {isMobile ? (
              <button type="button" aria-label="Open navigation menu" style={styles.menuButton} onClick={() => setMobileNavOpen((current) => !current)}>
                ☰
              </button>
            ) : null}

            <div style={styles.headerTextBlock}>
              <div style={styles.breadcrumb}>Operations / {getPageTitle(location.pathname)}</div>
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
    /*
      What changed:
      - Added an explicit viewport height anchor while preserving the existing flex shell.
      - Kept overflow hidden at the shell level so the layout still clips off-canvas mobile drawer transitions cleanly.

      Why:
      - The existing shell already had the right structure, but height propagation was not strict enough for consistent scrolling.
      - This layout is intended to let the main content pane own vertical scrolling.

      What problem this solves:
      - Reduces layout instability and inconsistent scroll behavior across pages and device sizes.
    */
    minHeight: '100vh',
    height: '100vh',
    display: 'flex',
    background: '#f5f7fb',
    color: '#1f2937',
    position: 'relative',
    overflow: 'hidden'
  },
  sidebar: {
    background: '#0f172a',
    color: '#ffffff',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    overflow: 'hidden'
  },
  sidebarDesktop: {
    width: '272px',
    minWidth: '272px',
    height: '100vh',
    position: 'sticky',
    top: 0,
    borderRight: '1px solid rgba(255,255,255,0.06)'
  },
  sidebarMobile: {
    /*
      What changed:
      - Slightly normalized the drawer width while preserving the same mobile drawer approach.

      Why:
      - The prior values were close, but slightly inconsistent across narrower devices.

      What problem this solves:
      - Makes the drawer feel a bit more stable on small screens without changing behavior or structure.
    */
    width: '280px',
    maxWidth: '85vw',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
    transition: 'transform 0.22s ease'
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
    flexShrink: 0
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '6px'
  },
  brandSubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: '12px'
  },
  rolePill: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(96, 165, 250, 0.16)',
    color: '#bfdbfe',
    fontSize: '11px',
    fontWeight: 700,
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
    gap: '8px'
  },
  navItem: {
    color: 'rgba(255,255,255,0.82)',
    textDecoration: 'none',
    padding: '12px 14px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '15px'
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
    /*
      What changed:
      - Made the main pane the explicit vertical scroll container.
      - Added minHeight: 0 so flex children can shrink correctly inside the fixed-height shell.

      Why:
      - The shell already clips global overflow, so the main area needs to own scrolling.
      - Without this, large pages can produce clipped content or inconsistent scroll behavior.

      What problem this solves:
      - Fixes page-level scroll handling without rewriting the existing layout structure.
    */
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    /*
      What changed:
      - Added a small bottom padding to balance the spacing between the header block and the page content.

      Why:
      - The previous header/content padding combination could look uneven across pages.

      What problem this solves:
      - Improves visual rhythm without changing the header structure.
    */
    padding: '24px 24px 16px 24px',
    flexShrink: 0
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px'
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
    marginBottom: '8px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.1
  },
  headerText: {
    margin: '10px 0 0 0',
    color: '#475569',
    maxWidth: '760px',
    lineHeight: 1.5
  },
  content: {
    /*
      What changed:
      - Added a shared max width and centering while preserving the existing mobile/desktop padding split.

      Why:
      - Several pages are very wide and currently inherit full available width.
      - Products/Suppliers-style pages benefit from a more controlled content measure.

      What problem this solves:
      - Reduces over-wide layouts and improves consistency across pages without changing page internals.
    */
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    overflowX: 'hidden'
  },
  contentDesktop: {
    padding: '24px'
  },
  contentMobile: {
    padding: '18px 14px 24px 14px'
  }
};