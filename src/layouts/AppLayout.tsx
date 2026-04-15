import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { clearAuthTokens, getRefreshToken } from '../lib/auth';
import { apiRequest } from '../lib/api';

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

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/products', label: 'Products' },
    { to: '/suppliers', label: 'Suppliers' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/stock', label: 'Stock' },
    { to: '/stock-movements', label: 'Stock Movements' },
    { to: '/storage-locations', label: 'Storage Locations' },
    { to: '/shipments', label: 'Shipments' },
    { to: '/scanner', label: 'Scanner' },
    { to: '/sessions', label: 'Sessions' }
  ];

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
      /*
        Revoke the current backend session when possible so the stored refresh
        token cannot continue to be used after logout.
      */
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch {
      /*
        Even if the backend call fails, we still clear local auth state so the
        user is logged out on this device.
      */
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
          <div style={styles.headerLeft}>
            {isMobile ? (
              <button type="button" style={styles.menuButton} onClick={toggleMobileNav}>
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
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.10)'
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '6px'
  },
  brandSubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.72)'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  navItem: {
    display: 'block',
    padding: '11px 12px',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.84)',
    textDecoration: 'none',
    fontWeight: 600,
    transition: 'background 0.18s ease, color 0.18s ease'
  },
  navItemActive: {
    background: 'rgba(59,130,246,0.22)',
    color: '#ffffff'
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '20px'
  },
  logoutButton: {
    width: '100%',
    border: 'none',
    borderRadius: '10px',
    padding: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    background: '#ef4444',
    color: '#ffffff'
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '28px 32px 16px',
    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.96) 100%)',
    borderBottom: '1px solid rgba(15,23,42,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 20
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  menuButton: {
    border: '1px solid rgba(15,23,42,0.1)',
    background: '#ffffff',
    borderRadius: '10px',
    width: '42px',
    height: '42px',
    cursor: 'pointer',
    fontSize: '20px'
  },
  headerTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  breadcrumb: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b'
  },
  headerTitle: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.1,
    fontWeight: 800,
    color: '#0f172a'
  },
  headerText: {
    margin: 0,
    color: '#475569',
    fontSize: '14px'
  },
  content: {
    width: '100%',
    boxSizing: 'border-box'
  },
  contentDesktop: {
    padding: '24px 32px 40px'
  },
  contentMobile: {
    padding: '16px 16px 28px'
  }
};