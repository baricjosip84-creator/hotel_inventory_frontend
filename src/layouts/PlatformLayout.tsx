import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { fetchCurrentPlatformIdentity, logoutPlatformSession } from '../lib/platformAuth';
import { PLATFORM_PERMISSIONS, hasPlatformPermission, PLATFORM_PERMISSION_SNAPSHOT_EVENT } from '../lib/platformPermissions';
import CopyrightNotice from '../components/CopyrightNotice';
import { InventoryMark } from '../components/brand/InventoryBrand';
import { LanguageSelector } from '../components/i18n/LanguageSelector';
import { useAppTranslation } from '../i18n/I18nContext';
import { DEFAULT_LOCALE, normalizeAppLocale } from '../i18n/config';
import { formatLocalizedDateTime } from '../i18n/formatters';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { refreshPlatformPermissionSnapshot } from '../lib/permissionPolicies';
import { fetchPlatformAnnouncementContext, type PlatformAnnouncementContext } from '../lib/platformAnnouncementContext';
import './PlatformTheme.css';

export default function PlatformLayout() {
  const { locale, setLocale, t, nav } = useAppTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [, setPermissionRevision] = useState(0);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<Set<string>>(() => new Set());
  const announcementContextQuery = useQuery({
    queryKey: ['platform', 'announcements', 'current-context'],
    queryFn: fetchPlatformAnnouncementContext,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  const announcementContext: PlatformAnnouncementContext | null = announcementContextQuery.data ?? null;
  const visibleAnnouncements = useMemo(() => (announcementContext?.announcements || []).filter((announcement) => !dismissedAnnouncementIds.has(announcement.id)), [announcementContext, dismissedAnnouncementIds]);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentPlatformIdentity()
      .then((identity) => {
        if (cancelled || !identity) return;
        setLocale(normalizeAppLocale(identity.locale) ?? DEFAULT_LOCALE);
      })
      .catch(() => {
        // Keep the locally selected/browser locale when identity lookup is unavailable.
      });
    return () => { cancelled = true; };
  }, [setLocale]);

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
            <div style={styles.brandCaption}>{t('platformLogin.brandCaption')}</div>
          </div>
        </div>
        <nav style={styles.nav}>

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/dashboard" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/dashboard" />
              <span>{nav('Dashboard')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-launch-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-launch-readiness" />
              <span>{nav('Launch readiness')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ) ? (
            <NavLink to="/platform/commercial-readiness-verification-program" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/commercial-readiness-verification-program" />
              <span>{nav('Readiness verification')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-onboarding-checklist" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/customer-onboarding-checklist" />
              <span>{nav('Onboarding checklist')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ) ? (
            <NavLink to="/platform/tenant-provisioning-hardening" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-provisioning-hardening" />
              <span>{nav('Provisioning hardening')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/billing-subscription-activation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/billing-subscription-activation" />
              <span>{nav('Billing activation')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? (
            <NavLink to="/platform/support-operations-cockpit" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/support-operations-cockpit" />
              <span>{nav('Support cockpit')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/production-monitoring-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/production-monitoring-readiness" />
              <span>{nav('Monitoring readiness')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/backup-restore-validation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/backup-restore-validation" />
              <span>{nav('Backup restore')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ) ? (
            <NavLink to="/platform/deployment-validation" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/deployment-validation" />
              <span>{nav('Deployment validation')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/documentation-completeness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/documentation-completeness" />
              <span>{nav('Documentation completeness')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? (
            <NavLink to="/platform/pilot-customer-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/pilot-customer-readiness" />
              <span>{nav('Pilot readiness')}</span>
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
              <span>{nav('Launch certificate')}</span>
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
              <span>{nav('Launch acceptance')}</span>
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
              <span>{nav('Launch go/no-go')}</span>
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
              <span>{nav('Launch smoke test')}</span>
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
              <span>{nav('Launch command center')}</span>
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
              <span>{nav('Post-launch observation')}</span>
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
              <span>{nav('Incident triage')}</span>
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
              <span>{nav('Incident closure')}</span>
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
              <span>{nav('Prevention verification')}</span>
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
              <span>{nav('Rollout expansion')}</span>
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
              <span>{nav('Expansion health')}</span>
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
              <span>{nav('Additional growth')}</span>
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
              <span>{nav('Growth observation')}</span>
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
                  <span>{nav('Steady-state transition')}</span>
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
                  <span>{nav('Operations cadence')}</span>
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
                  <span>{nav('Exception review')}</span>
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
                  <span>{nav('Exception closure')}</span>
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
                  <span>{nav('Recurrence audit')}</span>
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
                  <span>{nav('Recurrence resolution')}</span>
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
                  <span>{nav('Resolution verification')}</span>
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
                  <span>{nav('Durable closure')}</span>
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
                  <span>{nav('Final evidence archive')}</span>
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
                <NavLink to="/platform/commercial-launch-evidence-retention-seal" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-evidence-retention-seal" />
                  <span>{nav('Evidence retention seal')}</span>
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
                <NavLink to="/platform/commercial-launch-retention-renewal-review" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-retention-renewal-review" />
                  <span>{nav('Retention renewal')}</span>
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
                <NavLink to="/platform/commercial-launch-retention-renewal-acceptance-docket" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-retention-renewal-acceptance-docket" />
                  <span>{nav('Renewal acceptance')}</span>
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
                <NavLink to="/platform/commercial-launch-retention-renewal-certification" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-retention-renewal-certification" />
                  <span>{nav('Renewal certification')}</span>
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
                <NavLink to="/platform/commercial-launch-retention-renewal-final-seal" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-retention-renewal-final-seal" />
                  <span>{nav('Renewal final seal')}</span>
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
                <NavLink to="/platform/commercial-launch-retention-renewal-archive-seal" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-retention-renewal-archive-seal" />
                  <span>{nav('Renewal archive seal')}</span>
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
                <NavLink to="/platform/commercial-launch-retention-renewal-cycle-reset" style={getPlatformLinkStyle}>
                  <TenantNavIcon path="/platform/commercial-launch-retention-renewal-cycle-reset" />
                  <span>{nav('Renewal cycle reset')}</span>
                </NavLink>
              ) : null}
            </>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenants" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenants" />
              <span>{nav('Tenants')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-contacts" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-contacts" />
              <span>{nav('Tenant contacts')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-notes" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-notes" />
              <span>{nav('Tenant notes')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-communications" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-communications" />
              <span>{nav('Communications')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-tasks" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-tasks" />
              <span>{nav('Tenant tasks')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-timeline" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-timeline" />
              <span>{nav('Tenant timeline')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-health" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-health" />
              <span>{nav('Tenant health')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-lifecycle" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-lifecycle" />
              <span>{nav('Tenant lifecycle')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ) ? (
            <NavLink to="/platform/tenant-sla" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-sla" />
              <span>{nav('Tenant SLA')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ) ? (
            <NavLink to="/platform/runbooks" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/runbooks" />
              <span>{nav('Runbooks')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ) ? (
            <NavLink to="/platform/change-management" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/change-management" />
              <span>{nav('Change management')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-keys" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/api-keys" />
              <span>{nav('API keys')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ) ? (
            <NavLink to="/platform/api-client-governance" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/api-client-governance" />
              <span>{nav('API client governance')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/integration-monitoring" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/integration-monitoring" />
              <span>{nav('Integration monitoring')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ) ? (
            <NavLink to="/platform/webhooks" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/webhooks" />
              <span>{nav('Webhooks')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ) ? (
            <NavLink to="/platform/vendors" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/vendors" />
              <span>{nav('Vendors')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ) ? (
            <NavLink to="/platform/service-dependencies" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/service-dependencies" />
              <span>{nav('Service dependencies')}</span>
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ) ? (
            <NavLink to="/platform/risk-register" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/risk-register" />
              <span>{nav('Risk register')}</span>
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_READ) ? (
            <NavLink to="/platform/capacity-planning" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/capacity-planning" />
              <span>{nav('Capacity planning')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ) ? (
            <NavLink to="/platform/operational-jobs" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/operational-jobs" />
              <span>{nav('Operational jobs')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ) ? (
            <NavLink to="/platform/releases" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/releases" />
              <span>{nav('Releases')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/access-reviews" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/access-reviews" />
              <span>{nav('Access reviews')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ) ? (
            <NavLink to="/platform/permission-audit" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/permission-audit" />
              <span>{nav('Permission audit')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-documents" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/compliance-documents" />
              <span>{nav('Compliance docs')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/compliance-export" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/compliance-export" />
              <span>{nav('Compliance export')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ) ? (
            <NavLink to="/platform/legal-compliance-reporting" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/legal-compliance-reporting" />
              <span>{nav('Legal & compliance reporting')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ) ? (
            <NavLink to="/platform/privacy-requests" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/privacy-requests" />
              <span>{nav('Privacy requests')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/tenant-offboarding" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-offboarding" />
              <span>{nav('Tenant offboarding')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ) ? (
            <NavLink to="/platform/provisioning" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/provisioning" />
              <span>{nav('Provisioning')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ) ? (
            <NavLink to="/platform/provisioning-presets" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/provisioning-presets" />
              <span>{nav('Provisioning presets')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? (
            <NavLink to="/platform/tenant-exports" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/tenant-exports" />
              <span>{nav('Tenant Exports')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ) ? (
            <NavLink to="/platform/data-retention" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/data-retention" />
              <span>{nav('Data retention')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? (
            <NavLink to="/platform/incidents" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/incidents" />
              <span>{nav('Incidents')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ) ? (
            <NavLink to="/platform/maintenance" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/maintenance" />
              <span>{nav('Maintenance')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ) ? (
            <NavLink to="/platform/announcements" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/announcements" />
              <span>{nav('Announcements')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/system-health" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/system-health" />
              <span>{nav('System Health')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? (
            <NavLink to="/platform/audit" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/audit" />
              <span>{nav('Audit')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ)
            && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/audit-retention" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/audit-retention" />
              <span>{nav('Audit retention')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? (
            <NavLink to="/platform/support-sessions" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/support-sessions" />
              <span>{nav('Support Sessions')}</span>
            </NavLink>
          ) : null}

          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ) ? (
            <NavLink to="/platform/users" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/users" />
              <span>{nav('Platform Users')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ROLE_PERMISSIONS_READ) ? (
            <NavLink to="/platform/permissions" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/permissions" />
              <span>{nav('Platform Permissions')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ) ? (
            <NavLink to="/platform/sessions" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/sessions" />
              <span>{nav('Platform Sessions')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/billing" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/billing" />
              <span>{nav('Billing')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/subscription-readiness" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/subscription-readiness" />
              <span>{nav('Subscription readiness')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/license-plan-enforcement" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/license-plan-enforcement" />
              <span>{nav('License enforcement')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? (
            <NavLink to="/platform/customer-success-admin" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/customer-success-admin" />
              <span>{nav('Customer success')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ) ? (
            <NavLink to="/platform/enterprise-identity" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/enterprise-identity" />
              <span>{nav('Enterprise identity')}</span>
            </NavLink>
          ) : null}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? (
            <NavLink to="/platform/notifications" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/notifications" />
              <span>{nav('Notifications')}</span>
            </NavLink>
          ) : null}
          <NavLink to="/platform/security" style={getPlatformLinkStyle}>
              <TenantNavIcon path="/platform/security" />
              <span>{nav('My Security')}</span>
            </NavLink>
        </nav>
        <div style={styles.languageSelector}><LanguageSelector scope="platform" compact /></div>
        <button type="button" onClick={logout} style={styles.logoutButton}>
          <TenantNavIcon path="/logout" />
          <span>{t('common.logout')}</span>
        </button>
      </aside>
      <main key={location.pathname} ref={mainRef} style={styles.main} data-route-scroll-container>
        {visibleAnnouncements.length ? <div style={styles.announcementStack}>
          {visibleAnnouncements.map((announcement) => <div key={announcement.id} style={{ ...styles.announcementBanner, ...(announcement.severity === 'critical' ? styles.announcementCritical : {}), ...(announcement.severity === 'warning' ? styles.announcementWarning : {}) }}>
            <div style={styles.announcementHeader}><strong>{announcement.title}</strong>{announcement.dismissible ? <button type="button" style={styles.announcementDismiss} onClick={() => setDismissedAnnouncementIds((current) => new Set([...current, announcement.id]))}>{t('common.dismiss')}</button> : null}</div>
            <div>{announcement.message}</div>
            <div style={styles.announcementMeta}>{t('common.severity')}: {announcement.severity}{announcement.ends_at ? ` · ${t('common.visibleUntil')}: ${formatLocalizedDateTime(announcement.ends_at, locale)}` : ''}{!announcement.dismissible ? ` · ${t('common.requiredNotice')}` : ''}</div>
          </div>)}
          {announcementContext?.truncated ? <div style={styles.announcementTruncated}>{t('common.platformAnnouncementsTruncated')}</div> : null}
        </div> : null}
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
  languageSelector: { marginTop: 'auto', marginBottom: 10 },
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
  announcementStack: { display: 'grid', gap: '8px', marginBottom: '14px' },
  announcementBanner: { background: '#eff6ff', color: '#1e3a8a', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '10px 12px', lineHeight: 1.45 },
  announcementWarning: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  announcementCritical: { background: '#7f1d1d', color: '#fff', border: '1px solid #fecaca' },
  announcementHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  announcementMeta: { marginTop: '4px', fontSize: '12px', opacity: 0.85 },
  announcementDismiss: { border: '1px solid currentColor', borderRadius: '8px', background: 'transparent', color: 'inherit', padding: '4px 8px', font: 'inherit', fontWeight: 800, cursor: 'pointer' },
  announcementTruncated: { color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '8px 12px', fontSize: '12px' },
  main: {
    height: '100dvh',
    overflowY: 'auto',
    padding: '28px 32px 36px',
    boxSizing: 'border-box'
  }
};
