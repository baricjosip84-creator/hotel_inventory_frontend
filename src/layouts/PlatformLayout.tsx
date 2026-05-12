import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { logoutPlatformSession } from '../lib/platformAuth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

export default function PlatformLayout() {
  const navigate = useNavigate();

  const logout = async () => {
    await logoutPlatformSession();
    navigate('/platform/login', { replace: true });
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Platform</div>
        <nav style={styles.nav}>
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenants" style={styles.link}>
              Tenants
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/system-health" style={styles.link}>
              System Health
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit" style={styles.link}>
              Audit
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? (
            <NavLink to="/platform/support-sessions" style={styles.link}>
              Support Sessions
            </NavLink>
          ) : null}
        </nav>
        <button type="button" onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: '100dvh',
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    background: '#f7f7f8'
  },
  sidebar: {
    background: '#111827',
    color: '#fff',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  brand: {
    fontWeight: 800,
    fontSize: '20px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  link: {
    color: '#fff',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)'
  },
  logoutButton: {
    marginTop: 'auto',
    padding: '10px 12px',
    borderRadius: '10px',
    border: 0,
    cursor: 'pointer'
  },
  main: {
    padding: '32px'
  }
};
