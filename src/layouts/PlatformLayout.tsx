import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { logoutPlatformSession } from '../lib/platformAuth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

export default function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

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
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-readiness" style={styles.link}>
              Launch readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-readiness-verification-program" style={styles.link}>
              Readiness verification
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-onboarding-checklist" style={styles.link}>
              Onboarding checklist
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-provisioning-hardening" style={styles.link}>
              Provisioning hardening
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/billing-subscription-activation" style={styles.link}>
              Billing activation
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/support-operations-cockpit" style={styles.link}>
              Support cockpit
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/production-monitoring-readiness" style={styles.link}>
              Monitoring readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? (
            <NavLink to="/platform/backup-restore-validation" style={styles.link}>
              Backup restore
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/deployment-validation" style={styles.link}>
              Deployment validation
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/documentation-completeness" style={styles.link}>
              Documentation completeness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/pilot-customer-readiness" style={styles.link}>
              Pilot readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-certificate" style={styles.link}>
              Launch certificate
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-acceptance-packet" style={styles.link}>
              Launch acceptance
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-go-no-go-register" style={styles.link}>
              Launch go/no-go
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <>
              <NavLink to="/platform/commercial-launch-smoke-test-checklist" style={styles.link}>
                Launch smoke test
              </NavLink>
              <NavLink to="/platform/commercial-launch-day-command-center" style={styles.link}>
                Launch command center
              </NavLink>
              <NavLink to="/platform/commercial-launch-post-launch-observation" style={styles.link}>
                Post-launch observation
              </NavLink>
              <NavLink to="/platform/commercial-launch-incident-triage" style={styles.link}>
                Incident triage
              </NavLink>
              <NavLink to="/platform/commercial-launch-incident-closure" style={styles.link}>
                Incident closure
              </NavLink>
              <NavLink to="/platform/commercial-launch-prevention-verification" style={styles.link}>
                Prevention verification
              </NavLink>
              <NavLink to="/platform/commercial-launch-rollout-expansion-authorization" style={styles.link}>
                Rollout expansion
              </NavLink>
              <NavLink to="/platform/commercial-launch-expansion-health-observation" style={styles.link}>
                Expansion health
              </NavLink>
              <NavLink to="/platform/commercial-launch-additional-growth-authorization" style={styles.link}>
                Additional growth
              </NavLink>
              <NavLink to="/platform/commercial-launch-additional-growth-observation" style={styles.link}>
                Growth observation
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-transition" style={styles.link}>
                Steady-state transition
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-operations-cadence" style={styles.link}>
                Operations cadence
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-exception-review" style={styles.link}>
                Exception review
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-exception-closure" style={styles.link}>
                Exception closure
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-recurrence-audit" style={styles.link}>
                Recurrence audit
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-recurrence-resolution" style={styles.link}>
                Recurrence resolution
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-resolution-verification" style={styles.link}>
                Resolution verification
              </NavLink>
              <NavLink to="/platform/commercial-launch-durable-closure-certification" style={styles.link}>
                Durable closure
              </NavLink>
              <NavLink to="/platform/commercial-launch-final-evidence-archive" style={styles.link}>
                Final evidence archive
              </NavLink>
              <NavLink to="/platform/commercial-launch-evidence-retention-seal" style={styles.link}>
                Evidence retention seal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-review" style={styles.link}>
                Retention renewal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-acceptance-docket" style={styles.link}>
                Renewal acceptance
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-certification" style={styles.link}>
                Renewal certification
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-final-seal" style={styles.link}>
                Renewal final seal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-archive-seal" style={styles.link}>
                Renewal archive seal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-cycle-reset" style={styles.link}>
                Renewal cycle reset
              </NavLink>
            </>
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
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-lifecycle" style={styles.link}>
              Tenant lifecycle
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
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-client-governance" style={styles.link}>
              API client governance
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/integration-monitoring" style={styles.link}>
              Integration monitoring
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
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/permission-audit" style={styles.link}>
              Permission audit
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-documents" style={styles.link}>
              Compliance docs
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-export" style={styles.link}>
              Compliance export
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/legal-compliance-reporting" style={styles.link}>
              Legal & compliance reporting
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
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit-retention" style={styles.link}>
              Audit retention
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
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/subscription-readiness" style={styles.link}>
              Subscription readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/license-plan-enforcement" style={styles.link}>
              License enforcement
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-success-admin" style={styles.link}>
              Customer success
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/enterprise-identity" style={styles.link}>
              Enterprise identity
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
      <main ref={mainRef} style={styles.main}>
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
