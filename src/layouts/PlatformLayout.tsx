import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { clearPlatformAuthTokens } from '../lib/platformAuth';

export default function PlatformLayout() {
  const navigate = useNavigate();

  const logout = () => {
    clearPlatformAuthTokens();
    navigate('/platform/login', { replace: true });
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Platform</div>
        <nav style={styles.nav}>
          <NavLink to="/platform/tenants" style={styles.link}>
            Tenants
          </NavLink>
          <NavLink to="/platform/system-health" style={styles.link}>
            System Health
          </NavLink>
          <NavLink to="/platform/audit" style={styles.link}>
            Audit
          </NavLink>
          <NavLink to="/platform/support-sessions" style={styles.link}>
            Support Sessions
          </NavLink>
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
