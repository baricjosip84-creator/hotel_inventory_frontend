import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { clearAuthTokens } from '../lib/auth';

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

  const navItems = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/products', label: 'Products' },
    { to: '/suppliers', label: 'Suppliers' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/stock', label: 'Stock' },
    { to: '/stock-movements', label: 'Stock Movements' },
    { to: '/storage-locations', label: 'Storage Locations' },
    { to: '/shipments', label: 'Shipments' },
    { to: '/scanner', label: 'Scanner' }
  ];

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    clearAuthTokens();
    navigate('/login', { replace: true });
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
          <button type="button" style={styles.logoutButton} onClick={handleLogout}>
            Log out
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
    opacity: 0.75,
    lineHeight: 1.4
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  navItem: {
    textDecoration: 'none',
    color: '#d1d5db',
    padding: '12px 14px',
    borderRadius: '10px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    background: 'transparent'
  },
  navItemActive: {
    background: '#2563eb',
    color: '#ffffff',
    boxShadow: '0 4px 10px rgba(37,99,235,0.25)'
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: '20px'
  },
  logoutButton: {
    width: '100%',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '12px 14px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  mainArea: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '20px 24px'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px'
  },
  headerTextBlock: {
    maxWidth: '900px',
    minWidth: 0
  },
  breadcrumb: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    lineHeight: 1.15
  },
  headerText: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5
  },
  menuButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '18px',
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1
  },
  content: {
    width: '100%'
  },
  contentDesktop: {
    padding: '24px 28px'
  },
  contentMobile: {
    padding: '16px'
  }
};