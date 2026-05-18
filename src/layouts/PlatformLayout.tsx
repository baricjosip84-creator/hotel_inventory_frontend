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

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/dashboard" style={styles.link}>
              Dashboard
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenants" style={styles.link}>
              Tenants
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-contacts" style={styles.link}>
              Tenant contacts
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-notes" style={styles.link}>
              Tenant notes
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-communications" style={styles.link}>
              Communications
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-tasks" style={styles.link}>
              Tenant tasks
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-timeline" style={styles.link}>
              Tenant timeline
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-health" style={styles.link}>
              Tenant health
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ) ? (
            <NavLink to="/platform/tenant-sla" style={styles.link}>
              Tenant SLA
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/runbooks" style={styles.link}>
              Runbooks
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ) ? (
            <NavLink to="/platform/change-management" style={styles.link}>
              Change management
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-keys" style={styles.link}>
              API keys
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ) ? (
            <NavLink to="/platform/webhooks" style={styles.link}>
              Webhooks
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ) ? (
            <NavLink to="/platform/vendors" style={styles.link}>
              Vendors
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/service-dependencies" style={styles.link}>
              Service dependencies
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ) ? (
            <NavLink to="/platform/risk-register" style={styles.link}>
              Risk register
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_READ) ? (
            <NavLink to="/platform/capacity-planning" style={styles.link}>
              Capacity planning
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ) ? (
            <NavLink to="/platform/operational-jobs" style={styles.link}>
              Operational jobs
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ) ? (
            <NavLink to="/platform/releases" style={styles.link}>
              Releases
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/access-reviews" style={styles.link}>
              Access reviews
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-documents" style={styles.link}>
              Compliance docs
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ) ? (
            <NavLink to="/platform/privacy-requests" style={styles.link}>
              Privacy requests
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-offboarding" style={styles.link}>
              Tenant offboarding
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/provisioning" style={styles.link}>
              Provisioning
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? (
            <NavLink to="/platform/tenant-exports" style={styles.link}>
              Tenant Exports
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ) ? (
            <NavLink to="/platform/data-retention" style={styles.link}>
              Data retention
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? (
            <NavLink to="/platform/incidents" style={styles.link}>
              Incidents
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ) ? (
            <NavLink to="/platform/maintenance" style={styles.link}>
              Maintenance
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ) ? (
            <NavLink to="/platform/announcements" style={styles.link}>
              Announcements
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

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ) ? (
            <NavLink to="/platform/users" style={styles.link}>
              Platform Users
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ) ? (
            <NavLink to="/platform/sessions" style={styles.link}>
              Platform Sessions
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/billing" style={styles.link}>
              Billing
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? (
            <NavLink to="/platform/notifications" style={styles.link}>
              Notifications
            </NavLink>
          ) : null}
          <NavLink to="/platform/security" style={styles.link}>
            My Security
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
