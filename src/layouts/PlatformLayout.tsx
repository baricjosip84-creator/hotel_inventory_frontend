import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import type { CSSProperties } from 'react';
import { logoutPlatformSession } from '../lib/platformAuth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission, PLATFORM_PERMISSION_SNAPSHOT_EVENT } from '../lib/platformPermissions';
import CopyrightNotice from '../components/CopyrightNotice';
import { InventoryMark } from '../components/brand/InventoryBrand';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { refreshPlatformPermissionSnapshot } from '../lib/permissionPolicies';
import './PlatformTheme.css';

export default function PlatformLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [, setPermissionRevision] = useState(0);

  useEffect(() => {
    const onPermissionsChanged = () => setPermissionRevision((value) => value + 1);
    window.addEventListener(PLATFORM_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
    return () => window.removeEventListener(PLATFORM_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
  }, []);


  useEffect(() => {
    const refreshPermissions = () => {
      void refreshPlatformPermissionSnapshot();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPermissions();
    };
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === 'inventory_platform_effective_permissions' ||
        event.key === 'inventory_platform_access_token'
      ) {
        refreshPermissions();
      }
    };

    window.addEventListener('focus', refreshPermissions);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', refreshPermissions);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
    navigate('/platform/login', {
      replace: true,
      state: { skipSessionRecovery: true }
    });
  };

  const getPlatformLinkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
    ...styles.link,
    ...(isActive ? styles.linkActive : {})
  });

  return (
    <div className="platform-theme" style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <InventoryMark size={36} tone="dark" accent="red" />
          <div style={styles.brandTextWrap}>
            <div style={styles.brandTitle}>Inventory Operations</div>
            <div style={styles.brandCaption}>PLATFORM ADMINISTRATION</div>
          </div>
        </div>
        <nav style={styles.nav}>

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/dashboard" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/dashboard" />
              <span>Dashboard</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-readiness" />
              <span>Launch readiness</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-readiness-verification-program" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-readiness-verification-program" />
              <span>Readiness verification</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-onboarding-checklist" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/customer-onboarding-checklist" />
              <span>Onboarding checklist</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-provisioning-hardening" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-provisioning-hardening" />
              <span>Provisioning hardening</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/billing-subscription-activation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/billing-subscription-activation" />
              <span>Billing activation</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? (
            <NavLink to="/platform/support-operations-cockpit" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/support-operations-cockpit" />
              <span>Support cockpit</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/production-monitoring-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/production-monitoring-readiness" />
              <span>Monitoring readiness</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/backup-restore-validation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/backup-restore-validation" />
              <span>Backup restore</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/deployment-validation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/deployment-validation" />
              <span>Deployment validation</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/documentation-completeness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/documentation-completeness" />
              <span>Documentation completeness</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? (
            <NavLink to="/platform/pilot-customer-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/pilot-customer-readiness" />
              <span>Pilot readiness</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-certificate" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-certificate" />
              <span>Launch certificate</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-acceptance-packet" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-acceptance-packet" />
              <span>Launch acceptance</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-go-no-go-register" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-go-no-go-register" />
              <span>Launch go/no-go</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-smoke-test-checklist" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-smoke-test-checklist" />
              <span>Launch smoke test</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-day-command-center" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-day-command-center" />
              <span>Launch command center</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-post-launch-observation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-post-launch-observation" />
              <span>Post-launch observation</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-incident-triage" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-incident-triage" />
              <span>Incident triage</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-incident-closure" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-incident-closure" />
              <span>Incident closure</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-prevention-verification" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-prevention-verification" />
              <span>Prevention verification</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-rollout-expansion-authorization" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-rollout-expansion-authorization" />
              <span>Rollout expansion</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-expansion-health-observation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-expansion-health-observation" />
              <span>Expansion health</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-additional-growth-authorization" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-additional-growth-authorization" />
              <span>Additional growth</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/commercial-launch-additional-growth-observation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-additional-growth-observation" />
              <span>Growth observation</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <>
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-transition" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-transition" />
                  <span>Steady-state transition</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-operations-cadence" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-operations-cadence" />
                  <span>Operations cadence</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-exception-review" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-exception-review" />
                  <span>Exception review</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-exception-closure" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-exception-closure" />
                  <span>Exception closure</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-recurrence-audit" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-recurrence-audit" />
                  <span>Recurrence audit</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-recurrence-resolution" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-recurrence-resolution" />
                  <span>Recurrence resolution</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-steady-state-resolution-verification" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-steady-state-resolution-verification" />
                  <span>Resolution verification</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-durable-closure-certification" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-durable-closure-certification" />
                  <span>Durable closure</span>
                </NavLink>
              ) : null}
              {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
                && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
                <NavLink to="/platform/commercial-launch-final-evidence-archive" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-final-evidence-archive" />
                  <span>Final evidence archive</span>
                </NavLink>
              ) : null}
              <NavLink to="/platform/commercial-launch-evidence-retention-seal" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-evidence-retention-seal" />
              <span>Evidence retention seal</span>
            </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-review" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-retention-renewal-review" />
              <span>Retention renewal</span>
            </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-acceptance-docket" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-retention-renewal-acceptance-docket" />
              <span>Renewal acceptance</span>
            </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-certification" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-retention-renewal-certification" />
              <span>Renewal certification</span>
            </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-final-seal" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-retention-renewal-final-seal" />
              <span>Renewal final seal</span>
            </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-archive-seal" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-retention-renewal-archive-seal" />
              <span>Renewal archive seal</span>
            </NavLink>
              <NavLink to="/platform/commercial-launch-retention-renewal-cycle-reset" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-retention-renewal-cycle-reset" />
              <span>Renewal cycle reset</span>
            </NavLink>
            </>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenants" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenants" />
              <span>Tenants</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-contacts" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-contacts" />
              <span>Tenant contacts</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-notes" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-notes" />
              <span>Tenant notes</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-communications" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-communications" />
              <span>Communications</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-tasks" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-tasks" />
              <span>Tenant tasks</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-timeline" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-timeline" />
              <span>Tenant timeline</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-health" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-health" />
              <span>Tenant health</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-lifecycle" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-lifecycle" />
              <span>Tenant lifecycle</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ) ? (
            <NavLink to="/platform/tenant-sla" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-sla" />
              <span>Tenant SLA</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/runbooks" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/runbooks" />
              <span>Runbooks</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ) ? (
            <NavLink to="/platform/change-management" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/change-management" />
              <span>Change management</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-keys" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/api-keys" />
              <span>API keys</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-client-governance" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/api-client-governance" />
              <span>API client governance</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/integration-monitoring" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/integration-monitoring" />
              <span>Integration monitoring</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ) ? (
            <NavLink to="/platform/webhooks" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/webhooks" />
              <span>Webhooks</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ) ? (
            <NavLink to="/platform/vendors" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/vendors" />
              <span>Vendors</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/service-dependencies" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/service-dependencies" />
              <span>Service dependencies</span>
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ) ? (
            <NavLink to="/platform/risk-register" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/risk-register" />
              <span>Risk register</span>
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_READ) ? (
            <NavLink to="/platform/capacity-planning" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/capacity-planning" />
              <span>Capacity planning</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ) ? (
            <NavLink to="/platform/operational-jobs" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/operational-jobs" />
              <span>Operational jobs</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ) ? (
            <NavLink to="/platform/releases" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/releases" />
              <span>Releases</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/access-reviews" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/access-reviews" />
              <span>Access reviews</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/permission-audit" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/permission-audit" />
              <span>Permission audit</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-documents" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/compliance-documents" />
              <span>Compliance docs</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-export" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/compliance-export" />
              <span>Compliance export</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/legal-compliance-reporting" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/legal-compliance-reporting" />
              <span>Legal & compliance reporting</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ) ? (
            <NavLink to="/platform/privacy-requests" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/privacy-requests" />
              <span>Privacy requests</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-offboarding" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-offboarding" />
              <span>Tenant offboarding</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/provisioning" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/provisioning" />
              <span>Provisioning</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ) ? (
            <NavLink to="/platform/provisioning-presets" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/provisioning-presets" />
              <span>Provisioning presets</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? (
            <NavLink to="/platform/tenant-exports" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-exports" />
              <span>Tenant Exports</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ) ? (
            <NavLink to="/platform/data-retention" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/data-retention" />
              <span>Data retention</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? (
            <NavLink to="/platform/incidents" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/incidents" />
              <span>Incidents</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ) ? (
            <NavLink to="/platform/maintenance" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/maintenance" />
              <span>Maintenance</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ) ? (
            <NavLink to="/platform/announcements" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/announcements" />
              <span>Announcements</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/system-health" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/system-health" />
              <span>System Health</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/audit" />
              <span>Audit</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit-retention" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/audit-retention" />
              <span>Audit retention</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? (
            <NavLink to="/platform/support-sessions" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/support-sessions" />
              <span>Support Sessions</span>
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ) ? (
            <NavLink to="/platform/users" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/users" />
              <span>Platform Users</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ROLE_PERMISSIONS_READ) ? (
            <NavLink to="/platform/permissions" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/permissions" />
              <span>Platform Permissions</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ) ? (
            <NavLink to="/platform/sessions" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/sessions" />
              <span>Platform Sessions</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/billing" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/billing" />
              <span>Billing</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/subscription-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/subscription-readiness" />
              <span>Subscription readiness</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? (
            <NavLink to="/platform/license-plan-enforcement" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/license-plan-enforcement" />
              <span>License enforcement</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-success-admin" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/customer-success-admin" />
              <span>Customer success</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/enterprise-identity" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/enterprise-identity" />
              <span>Enterprise identity</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? (
            <NavLink to="/platform/notifications" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/notifications" />
              <span>Notifications</span>
            </NavLink>
          ) : null}
          <NavLink to="/platform/security" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/security" />
              <span>My Security</span>
            </NavLink>
        </nav>
        <button type="button" onClick={logout} style={styles.logoutButton}>
          <TenantNavIcon path="/logout" />
          <span>Logout</span>
        </button>
      </aside>
      <main key={location.pathname} ref={mainRef} style={styles.main} data-route-scroll-container>
        <Outlet />
        <CopyrightNotice />
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    height: '100dvh',
    display: 'grid',
    gridTemplateColumns: '272px 1fr',
    background: '#f8fafc',
    overflow: 'hidden'
  },
  sidebar: {
    background: 'linear-gradient(180deg,#081220 0%,#0b1b32 100%)',
    color: '#fff',
    padding: '20px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    height: '100dvh',
    minHeight: 0,
    boxSizing: 'border-box',
    position: 'sticky',
    top: 0,
    zIndex: 5
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '4px 7px 13px',
    borderBottom: '1px solid rgba(148,163,184,.16)'
  },
  brandTextWrap: { minWidth: 0 },
  brandTitle: { fontWeight: 800, fontSize: 15, lineHeight: 1.1, letterSpacing: '-.02em', whiteSpace: 'nowrap' },
  brandCaption: { color: 'rgba(var(--io-primary-border-rgb),.62)', fontSize: 9, marginTop: 4, fontWeight: 800, letterSpacing: '.08em', whiteSpace: 'nowrap' },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    paddingRight: '3px'
  },
  link: {
    color: 'rgba(226,232,240,.76)',
    textDecoration: 'none',
    padding: '8px 10px',
    borderRadius: '9px',
    background: 'transparent',
    border: '1px solid transparent',
    fontWeight: 650,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease, box-shadow 120ms ease'
  },
  linkActive: {
    color: '#ffffff',
    background: 'rgba(var(--io-primary-rgb),.23)',
    borderColor: 'rgba(var(--io-primary-light-rgb),.28)',
    boxShadow: 'inset 3px 0 0 var(--io-primary-light)'
  },
  logoutButton: {
    marginTop: 'auto',
    padding: '9px 10px',
    borderRadius: '9px',
    border: '1px solid rgba(148,163,184,.18)',
    background: 'rgba(255,255,255,.06)',
    color: 'rgba(226,232,240,.86)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontWeight: 700
  },
  main: {
    height: '100dvh',
    overflowY: 'auto',
    padding: '28px 32px 36px',
    boxSizing: 'border-box'
  }
};
