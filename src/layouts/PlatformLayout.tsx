import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { logoutPlatformSession } from '../lib/platformAuth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

export default function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  const forcePageScrollTop = () => {
    const scrollTargets = new Set<HTMLElement>();

    scrollTargets.add(document.documentElement);
    scrollTargets.add(document.body);

    if (mainRef.current) {
      scrollTargets.add(mainRef.current);
    }

    document
      .querySelectorAll<HTMLElement>('[data-route-scroll-container], main, section, article, div')
      .forEach((element) => {
        if (
          element.scrollTop > 0 ||
          element.scrollLeft > 0 ||
          element.scrollHeight > element.clientHeight ||
          element.scrollWidth > element.clientWidth
        ) {
          scrollTargets.add(element);
        }
      });

    scrollTargets.forEach((element) => {
      const previousScrollBehavior = element.style.scrollBehavior;
      element.style.scrollBehavior = 'auto';
      element.scrollTop = 0;
      element.scrollLeft = 0;
      element.style.scrollBehavior = previousScrollBehavior;
    });

    window.scrollTo(0, 0);
  };

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    forcePageScrollTop();

    const animationFrame = window.requestAnimationFrame(forcePageScrollTop);
    const shortTimer = window.setTimeout(forcePageScrollTop, 0);
    const renderTimer = window.setTimeout(forcePageScrollTop, 50);
    const settledTimer = window.setTimeout(forcePageScrollTop, 150);
    const lateTimer = window.setTimeout(forcePageScrollTop, 350);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(shortTimer);
      window.clearTimeout(renderTimer);
      window.clearTimeout(settledTimer);
      window.clearTimeout(lateTimer);
    };
  }, [location.pathname]);

  const logout = async () => {
    await logoutPlatformSession();
    navigate('/platform/login', { replace: true });
  };

  const getPlatformLinkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
    ...styles.link,
    ...(isActive ? styles.linkActive : {})
  });

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Platform</div>
        <nav style={styles.nav}>

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/dashboard" style={getPlatformLinkStyle}>
              Dashboard
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-readiness" style={getPlatformLinkStyle}>
              Launch readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-readiness-verification-program" style={getPlatformLinkStyle}>
              Readiness verification
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-onboarding-checklist" style={getPlatformLinkStyle}>
              Onboarding checklist
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-provisioning-hardening" style={getPlatformLinkStyle}>
              Provisioning hardening
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/billing-subscription-activation" style={getPlatformLinkStyle}>
              Billing activation
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/support-operations-cockpit" style={getPlatformLinkStyle}>
              Support cockpit
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/production-monitoring-readiness" style={getPlatformLinkStyle}>
              Monitoring readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? (
            <NavLink to="/platform/backup-restore-validation" style={getPlatformLinkStyle}>
              Backup restore
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/deployment-validation" style={getPlatformLinkStyle}>
              Deployment validation
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/documentation-completeness" style={getPlatformLinkStyle}>
              Documentation completeness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/pilot-customer-readiness" style={getPlatformLinkStyle}>
              Pilot readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-certificate" style={getPlatformLinkStyle}>
              Launch certificate
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-acceptance-packet" style={getPlatformLinkStyle}>
              Launch acceptance
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-go-no-go-register" style={getPlatformLinkStyle}>
              Launch go/no-go
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <>
              <NavLink to="/platform/commercial-launch-smoke-test-checklist" style={getPlatformLinkStyle}>
                Launch smoke test
              </NavLink>
              <NavLink to="/platform/commercial-launch-day-command-center" style={getPlatformLinkStyle}>
                Launch command center
              </NavLink>
              <NavLink to="/platform/commercial-launch-post-launch-observation" style={getPlatformLinkStyle}>
                Post-launch observation
              </NavLink>
              <NavLink to="/platform/commercial-launch-incident-triage" style={getPlatformLinkStyle}>
                Incident triage
              </NavLink>
              <NavLink to="/platform/commercial-launch-incident-closure" style={getPlatformLinkStyle}>
                Incident closure
              </NavLink>
              <NavLink to="/platform/commercial-launch-prevention-verification" style={getPlatformLinkStyle}>
                Prevention verification
              </NavLink>
              <NavLink to="/platform/commercial-launch-rollout-expansion-authorization" style={getPlatformLinkStyle}>
                Rollout expansion
              </NavLink>
              <NavLink to="/platform/commercial-launch-expansion-health-observation" style={getPlatformLinkStyle}>
                Expansion health
              </NavLink>
              <NavLink to="/platform/commercial-launch-additional-growth-authorization" style={getPlatformLinkStyle}>
                Additional growth
              </NavLink>
              <NavLink to="/platform/commercial-launch-additional-growth-observation" style={getPlatformLinkStyle}>
                Growth observation
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-transition" style={getPlatformLinkStyle}>
                Steady-state transition
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-operations-cadence" style={getPlatformLinkStyle}>
                Operations cadence
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-exception-review" style={getPlatformLinkStyle}>
                Exception review
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-exception-closure" style={getPlatformLinkStyle}>
                Exception closure
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-recurrence-audit" style={getPlatformLinkStyle}>
                Recurrence audit
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-recurrence-resolution" style={getPlatformLinkStyle}>
                Recurrence resolution
              </NavLink>
              <NavLink to="/platform/commercial-launch-steady-state-resolution-verification" style={getPlatformLinkStyle}>
                Resolution verification
              </NavLink>
              <NavLink to="/platform/commercial-launch-durable-closure-certification" style={getPlatformLinkStyle}>
                Durable closure
              </NavLink>
              <NavLink to="/platform/commercial-launch-final-evidence-archive" style={getPlatformLinkStyle}>
                Final evidence archive
              </NavLink>
              <NavLink to="/platform/commercial-launch-evidence-retention-seal" style={getPlatformLinkStyle}>
                Evidence retention seal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-review" style={getPlatformLinkStyle}>
                Retention renewal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-acceptance-docket" style={getPlatformLinkStyle}>
                Renewal acceptance
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-certification" style={getPlatformLinkStyle}>
                Renewal certification
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-final-seal" style={getPlatformLinkStyle}>
                Renewal final seal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-archive-seal" style={getPlatformLinkStyle}>
                Renewal archive seal
              </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-cycle-reset" style={getPlatformLinkStyle}>
                Renewal cycle reset
              </NavLink>
            </>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenants" style={getPlatformLinkStyle}>
              Tenants
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-contacts" style={getPlatformLinkStyle}>
              Tenant contacts
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-notes" style={getPlatformLinkStyle}>
              Tenant notes
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-communications" style={getPlatformLinkStyle}>
              Communications
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-tasks" style={getPlatformLinkStyle}>
              Tenant tasks
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-timeline" style={getPlatformLinkStyle}>
              Tenant timeline
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-health" style={getPlatformLinkStyle}>
              Tenant health
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-lifecycle" style={getPlatformLinkStyle}>
              Tenant lifecycle
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ) ? (
            <NavLink to="/platform/tenant-sla" style={getPlatformLinkStyle}>
              Tenant SLA
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/runbooks" style={getPlatformLinkStyle}>
              Runbooks
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ) ? (
            <NavLink to="/platform/change-management" style={getPlatformLinkStyle}>
              Change management
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-keys" style={getPlatformLinkStyle}>
              API keys
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-client-governance" style={getPlatformLinkStyle}>
              API client governance
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/integration-monitoring" style={getPlatformLinkStyle}>
              Integration monitoring
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ) ? (
            <NavLink to="/platform/webhooks" style={getPlatformLinkStyle}>
              Webhooks
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ) ? (
            <NavLink to="/platform/vendors" style={getPlatformLinkStyle}>
              Vendors
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/service-dependencies" style={getPlatformLinkStyle}>
              Service dependencies
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ) ? (
            <NavLink to="/platform/risk-register" style={getPlatformLinkStyle}>
              Risk register
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_READ) ? (
            <NavLink to="/platform/capacity-planning" style={getPlatformLinkStyle}>
              Capacity planning
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ) ? (
            <NavLink to="/platform/operational-jobs" style={getPlatformLinkStyle}>
              Operational jobs
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ) ? (
            <NavLink to="/platform/releases" style={getPlatformLinkStyle}>
              Releases
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/access-reviews" style={getPlatformLinkStyle}>
              Access reviews
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/permission-audit" style={getPlatformLinkStyle}>
              Permission audit
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-documents" style={getPlatformLinkStyle}>
              Compliance docs
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-export" style={getPlatformLinkStyle}>
              Compliance export
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/legal-compliance-reporting" style={getPlatformLinkStyle}>
              Legal & compliance reporting
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ) ? (
            <NavLink to="/platform/privacy-requests" style={getPlatformLinkStyle}>
              Privacy requests
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-offboarding" style={getPlatformLinkStyle}>
              Tenant offboarding
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/provisioning" style={getPlatformLinkStyle}>
              Provisioning
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? (
            <NavLink to="/platform/tenant-exports" style={getPlatformLinkStyle}>
              Tenant Exports
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ) ? (
            <NavLink to="/platform/data-retention" style={getPlatformLinkStyle}>
              Data retention
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? (
            <NavLink to="/platform/incidents" style={getPlatformLinkStyle}>
              Incidents
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ) ? (
            <NavLink to="/platform/maintenance" style={getPlatformLinkStyle}>
              Maintenance
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ) ? (
            <NavLink to="/platform/announcements" style={getPlatformLinkStyle}>
              Announcements
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/system-health" style={getPlatformLinkStyle}>
              System Health
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit" style={getPlatformLinkStyle}>
              Audit
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit-retention" style={getPlatformLinkStyle}>
              Audit retention
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? (
            <NavLink to="/platform/support-sessions" style={getPlatformLinkStyle}>
              Support Sessions
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ) ? (
            <NavLink to="/platform/users" style={getPlatformLinkStyle}>
              Platform Users
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ) ? (
            <NavLink to="/platform/sessions" style={getPlatformLinkStyle}>
              Platform Sessions
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/billing" style={getPlatformLinkStyle}>
              Billing
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/subscription-readiness" style={getPlatformLinkStyle}>
              Subscription readiness
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/license-plan-enforcement" style={getPlatformLinkStyle}>
              License enforcement
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-success-admin" style={getPlatformLinkStyle}>
              Customer success
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/enterprise-identity" style={getPlatformLinkStyle}>
              Enterprise identity
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? (
            <NavLink to="/platform/notifications" style={getPlatformLinkStyle}>
              Notifications
            </NavLink>
          ) : null}
          <NavLink to="/platform/security" style={getPlatformLinkStyle}>
            My Security
          </NavLink>
        </nav>
        <button type="button" onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>
      <main key={location.pathname} ref={mainRef} style={styles.main} data-route-scroll-container>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    height: '100dvh',
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    background: '#f7f7f8',
    overflow: 'hidden'
  },
  sidebar: {
    background: '#111827',
    color: '#fff',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    height: '100dvh',
    minHeight: 0,
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 5
  },
  brand: {
    fontWeight: 800,
    fontSize: '20px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: '4px'
  },
  link: {
    color: 'rgba(255,255,255,0.78)',
    textDecoration: 'none',
    padding: '10px 12px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid transparent',
    fontWeight: 600,
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease, box-shadow 120ms ease'
  },
  linkActive: {
    color: '#ffffff',
    background: 'rgba(59,130,246,0.34)',
    borderColor: 'rgba(147,197,253,0.78)',
    boxShadow: 'inset 4px 0 0 #60a5fa, 0 0 0 1px rgba(96,165,250,0.14)'
  },
  logoutButton: {
    marginTop: 'auto',
    padding: '10px 12px',
    borderRadius: '10px',
    border: 0,
    cursor: 'pointer'
  },
  main: {
    height: '100dvh',
    overflowY: 'auto',
    padding: '32px',
    boxSizing: 'border-box'
  }
};
