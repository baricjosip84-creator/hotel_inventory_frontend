import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import type { CSSProperties, MouseEvent } from 'react';
import {
  clearSupportSessionAccessToken,
  getSupportSessionInfo
} from '../lib/auth';
import { logoutTenantSession } from '../lib/api';
import { refreshTenantPermissionSnapshot } from '../lib/permissionPolicies';
import { fetchCurrentSupportContext, type CurrentSupportContext } from '../lib/supportContext';
import { fetchMaintenanceContext, type MaintenanceContext } from '../lib/maintenanceContext';
import { fetchAnnouncementContext, type AnnouncementContext } from '../lib/announcementContext';
import { fetchIncidentContext, type IncidentContext } from '../lib/incidentContext';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../lib/tenantSubscriptionAccess';
import { getCurrentAccessRoleLabel, getCurrentUserRole, hasAllPermissions, hasAnyPermission, hasPermission, TENANT_PERMISSION_SNAPSHOT_EVENT } from '../lib/permissions';
import { getTenantAccessSnapshot } from '../lib/tenantAccess';
import { getTenantModuleForPathname, getTenantPageMeta, tenantNavigationSections } from '../app/navigationRegistry';
import type { TenantNavigationItem } from '../app/navigationRegistry';
import CopyrightNotice from '../components/CopyrightNotice';
import { InventoryBrand } from '../components/brand/InventoryBrand';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { fetchTenantCurrencyContext, setActiveTenantCurrency, DEFAULT_INVENTORY_CURRENCY } from '../lib/tenantCurrency';

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
  const [, setPermissionRevision] = useState(0);
  const role = getCurrentUserRole();
  const accessRoleLabel = getCurrentAccessRoleLabel();
  const tenantAccess = getTenantAccessSnapshot();
  const supportSession = getSupportSessionInfo();

  const [supportContext, setSupportContext] = useState<CurrentSupportContext | null>(null);
  const [maintenanceContext, setMaintenanceContext] = useState<MaintenanceContext | null>(null);
  const [announcementContext, setAnnouncementContext] = useState<AnnouncementContext | null>(null);
  const [incidentContext, setIncidentContext] = useState<IncidentContext | null>(null);
  const [tenantSubscriptionAccess, setTenantSubscriptionAccess] = useState<TenantSubscriptionAccess | null>(null);
  const [, setTenantCurrencyRevision] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mainAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!tenantAccess.hasTenantContext) {
      setActiveTenantCurrency(DEFAULT_INVENTORY_CURRENCY);
      return () => { cancelled = true; };
    }
    fetchTenantCurrencyContext()
      .then(() => { if (!cancelled) setTenantCurrencyRevision((value) => value + 1); })
      .catch(() => {
        if (!cancelled) {
          setActiveTenantCurrency(DEFAULT_INVENTORY_CURRENCY);
          setTenantCurrencyRevision((value) => value + 1);
        }
      });
    return () => { cancelled = true; };
  }, [tenantAccess.tenantId, tenantAccess.hasTenantContext]);

  const currentModule = useMemo(() => getTenantModuleForPathname(location.pathname), [location.pathname]);
  const pageMeta = useMemo(() => getTenantPageMeta(location.pathname), [location.pathname]);

  const isVisibleNavigationItem = (item: TenantNavigationItem): boolean => {
    const featureByPath: Record<string, string> = {
      '/automation-schedules': 'automation',
      '/inventory-requisitions': 'requisitions',
      '/purchase-orders': 'purchase_orders',
      '/reports': 'reports'
    };
    const requiredFeature = featureByPath[item.to];

    if (requiredFeature) {
      const entitlement = getTenantFeatureEntitlement(tenantSubscriptionAccess, requiredFeature);
      if (entitlement && !entitlement.allowed) {
        return false;
      }
    }

    if (item.requiredPermissions?.length && !hasAllPermissions(item.requiredPermissions)) {
      return false;
    }

    if (item.requiredAnyPermissions?.length && !hasAnyPermission(item.requiredAnyPermissions)) {
      return false;
    }

    if (item.permission) {
      return hasPermission(item.permission);
    }

    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    if (!role) {
      return false;
    }

    return item.roles.includes(role);
  };

  useEffect(() => {
    const onPermissionsChanged = () => setPermissionRevision((value) => value + 1);
    const refreshPermissions = () => {
      if (document.visibilityState === 'hidden') return;
      void refreshTenantPermissionSnapshot();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshPermissions();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'inventory_tenant_effective_permissions' || event.key === 'inventory_access_token') {
        setPermissionRevision((value) => value + 1);
        refreshPermissions();
      }
    };

    window.addEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
    window.addEventListener('focus', refreshPermissions);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
      window.removeEventListener('focus', refreshPermissions);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const visibleNavSections = tenantNavigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(isVisibleNavigationItem)
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);


  const forcePageScrollTop = () => {
    const scrollTargets = new Set<HTMLElement>();

    scrollTargets.add(document.documentElement);
    scrollTargets.add(document.body);

    if (mainAreaRef.current) {
      scrollTargets.add(mainAreaRef.current);
    }

    document.querySelectorAll<HTMLElement>('[data-route-scroll-container]').forEach((element) => {
      scrollTargets.add(element);
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

  const handleNavigationClick = (event: MouseEvent<HTMLAnchorElement>, targetPath: string) => {
    event.preventDefault();

    if (targetPath === location.pathname) {
      forcePageScrollTop();
      setMobileNavOpen(false);
      return;
    }

    setMobileNavOpen(false);
    navigate(targetPath);

    window.requestAnimationFrame(forcePageScrollTop);
    window.setTimeout(forcePageScrollTop, 0);
    window.setTimeout(forcePageScrollTop, 75);
  };

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
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

  useEffect(() => {
    let cancelled = false;

    if (!supportSession.isSupportSession) {
      setSupportContext(null);
      return () => {
        cancelled = true;
      };
    }

    fetchCurrentSupportContext()
      .then((context) => {
        if (!cancelled) {
          setSupportContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSupportContext({ active: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [supportSession.isSupportSession, supportSession.supportSessionId, location.pathname]);


  useEffect(() => {
    let cancelled = false;

    fetchMaintenanceContext()
      .then((context) => {
        if (!cancelled) {
          setMaintenanceContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMaintenanceContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    fetchAnnouncementContext()
      .then((context) => {
        if (!cancelled) {
          setAnnouncementContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAnnouncementContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    fetchIncidentContext()
      .then((context) => {
        if (!cancelled) {
          setIncidentContext(context);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIncidentContext(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);


  useEffect(() => {
    let cancelled = false;

    if (!tenantAccess.hasTenantContext) {
      setTenantSubscriptionAccess(null);
      return () => {
        cancelled = true;
      };
    }

    fetchTenantSubscriptionAccess()
      .then((access) => {
        if (!cancelled) {
          setTenantSubscriptionAccess(access);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTenantSubscriptionAccess(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tenantAccess.hasTenantContext, location.pathname]);

  useEffect(() => {
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

    const supportSessionInfo = getSupportSessionInfo();

    if (supportSessionInfo.isSupportSession) {
      clearSupportSessionAccessToken();
      navigate('/platform/support-sessions', { replace: true });
      setIsLoggingOut(false);
      return;
    }

    try {
      await logoutTenantSession();
    } catch {
      // logoutTenantSession always clears local auth state in its finally block.
    } finally {
      navigate('/login', {
        replace: true,
        state: { skipSessionRecovery: true }
      });
      setIsLoggingOut(false);
    }
  };

  return (
    <div style={styles.shell}>
      {isMobile && mobileNavOpen ? (
        <div
          aria-hidden="true"
          style={styles.mobileOverlay}
          onClick={() => setMobileNavOpen(false)}
        />
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
          <InventoryBrand compact tone="dark" />
          <div style={styles.brandWorkspace}><div style={styles.brandWorkspaceLabel}>Workspace</div><div style={styles.brandSubtitle}>{tenantSubscriptionAccess?.tenant.name || 'Company workspace'}</div></div>
          {supportSession.isSupportSession ? <div style={styles.supportPill}>SUPPORT MODE</div> : null}
        </div>

        <div style={styles.navScrollArea}>
          <nav style={styles.nav}>
            {visibleNavSections.map((section) => (
              <div key={section.id} style={styles.navSection}>
                <div style={styles.navSectionTitle}>{section.label}</div>
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.description}
                    onClick={(event) => handleNavigationClick(event, item.to)}
                    style={({ isActive }) => ({
                      ...styles.navItem,
                      ...(isActive ? styles.navItemActive : {})
                    })}
                  >
                    <span style={styles.navItemIcon}><TenantNavIcon path={item.to} /></span><span style={styles.navItemLabel}>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.sidebarIdentity}><div style={styles.sidebarAvatar}>{(accessRoleLabel || 'U').trim().charAt(0).toUpperCase()}</div><div style={styles.sidebarIdentityText}><div style={styles.sidebarIdentityName}>{tenantSubscriptionAccess?.tenant.name || 'Tenant workspace'}</div><div style={styles.sidebarIdentityRole}>{accessRoleLabel || 'Tenant user'}</div></div></div>
          <button type="button" style={styles.logoutButton} onClick={handleLogout} disabled={isLoggingOut}><TenantNavIcon path="/logout" size={17}/><span>{isLoggingOut ? 'Logging out…' : supportSession.isSupportSession ? 'Exit support mode' : 'Log out'}</span></button>
        </div>
      </aside>

      <div ref={mainAreaRef} style={styles.mainArea} data-route-scroll-container>
        <header
          style={{
            ...styles.header,
            ...(isMobile ? styles.headerMobile : {})
          }}
        >
          <div
            style={{
              ...styles.headerLeft,
              ...(isMobile ? styles.headerLeftMobile : {})
            }}
          >
            {isMobile ? (
              <button
                type="button"
                aria-label="Open navigation menu"
                style={styles.menuButton}
                onClick={() => setMobileNavOpen((current) => !current)}
              >
                ☰
              </button>
            ) : null}

            <div style={styles.headerTextBlock}>
              <div
                style={{
                  ...styles.breadcrumb,
                  ...(isMobile ? styles.breadcrumbMobile : {})
                }}
              >
                Operations / {currentModule?.moduleGroupLabel || 'Workspace'} / {pageMeta.title}
              </div>
              <h1
                style={{
                  ...styles.headerTitle,
                  ...(isMobile ? styles.headerTitleMobile : {})
                }}
              >
                {pageMeta.title}
              </h1>
              <p
                style={{
                  ...styles.headerText,
                  ...(isMobile ? styles.headerTextMobile : {})
                }}
              >
                {pageMeta.subtitle}
              </p>
            </div>
          </div>
          {!isMobile ? <div style={styles.headerContext}><div style={styles.headerContextAvatar}>{(accessRoleLabel || 'U').trim().charAt(0).toUpperCase()}</div><div style={styles.headerContextText}><div style={styles.headerContextRole}>{accessRoleLabel || 'Tenant user'}</div><div style={styles.headerContextTenant}>{tenantSubscriptionAccess?.tenant.name || 'Tenant workspace'}</div></div></div> : null}
        </header>


        {!tenantAccess.hasTenantContext ? (
          <div style={styles.tenantAccessBanner}>
            <strong>Company context unavailable.</strong> Please sign in again before continuing inventory work.
          </div>
        ) : null}


        {tenantSubscriptionAccess && !tenantSubscriptionAccess.write_access.allowed ? (
          <div style={styles.subscriptionBlockedBanner}>
            <strong>Subscription writes blocked.</strong>{' '}
            {tenantSubscriptionAccess.write_access.blocker?.message || 'This tenant cannot perform operational changes until subscription access is restored.'}
            <div style={styles.subscriptionBlockedMeta}>
              Tenant status: {tenantSubscriptionAccess.tenant.status || '-'} · Billing: {tenantSubscriptionAccess.tenant.billing_status || '-'} · Plan: {tenantSubscriptionAccess.tenant.plan_code || '-'}
            </div>
          </div>
        ) : tenantSubscriptionAccess?.plan_limit_blocked_resources.length ? (
          <div style={styles.subscriptionLimitBanner}>
            <strong>Plan limit reached.</strong> New records are blocked for: {tenantSubscriptionAccess.plan_limit_blocked_resources.join(', ')}.
          </div>
        ) : tenantSubscriptionAccess?.feature_blocked_resources?.length ? (
          <div style={styles.subscriptionLimitBanner}>
            <strong>Plan feature locked.</strong> Disabled modules: {tenantSubscriptionAccess.feature_blocked_resources.join(', ')}.
          </div>
        ) : null}

        {supportSession.isSupportSession ? (
          <div style={styles.supportBanner}>
            <div style={styles.supportBannerText}>
              <strong>Support session active.</strong>{' '}
              {supportContext?.platform_user_name || supportContext?.platform_user_email
                ? `${supportContext.platform_user_name || supportContext.platform_user_email} is accessing this tenant through HLA support.`
                : 'You are accessing this tenant through HLA support.'}
              <div style={styles.supportBannerMeta}>
                Tenant: {supportContext?.tenant_name || supportSession.tenantId || '-'} · Role: {supportContext?.effective_role || supportSession.role || '-'} · Reason: {supportContext?.reason || '-'}
                {supportContext?.expires_at ? ` · Expires: ${new Date(supportContext.expires_at).toLocaleString()}` : ''}
              </div>
            </div>
            <button type="button" style={styles.supportExitButton} onClick={handleLogout} disabled={isLoggingOut}>
              Exit support mode
            </button>
          </div>
        ) : null}


        {incidentContext?.incidents?.length ? (
          <div style={{
            ...styles.incidentBanner,
            ...(incidentContext.incidents[0].severity === 'critical' ? styles.incidentCritical : {}),
            ...(incidentContext.incidents[0].severity === 'major' ? styles.incidentMajor : {})
          }}>
            <strong>Service incident:</strong> {incidentContext.incidents[0].title}
            {incidentContext.incidents[0].public_message ? ` — ${incidentContext.incidents[0].public_message}` : ''}
            <div style={styles.incidentMeta}>
              Status: {incidentContext.incidents[0].status} · Severity: {incidentContext.incidents[0].severity} · Impact: {incidentContext.incidents[0].impact}
            </div>
          </div>
        ) : null}

        {maintenanceContext?.active?.length ? (
          <div style={styles.maintenanceBanner}>
            <strong>Maintenance active:</strong> {maintenanceContext.active[0].title}
            {maintenanceContext.active[0].message ? ` — ${maintenanceContext.active[0].message}` : ''}
            <div style={styles.maintenanceBannerMeta}>
              Ends: {new Date(maintenanceContext.active[0].ends_at).toLocaleString()} · Scope: {maintenanceContext.active[0].scope} · Write lock: {maintenanceContext.active[0].lock_writes ? 'yes' : 'no'}
            </div>
          </div>
        ) : maintenanceContext?.upcoming?.length ? (
          <div style={styles.maintenanceNotice}>
            <strong>Upcoming maintenance:</strong> {maintenanceContext.upcoming[0].title} · Starts {new Date(maintenanceContext.upcoming[0].starts_at).toLocaleString()}
          </div>
        ) : null}

        {announcementContext?.announcements?.length ? (
          <div style={{
            ...styles.announcementBanner,
            ...(announcementContext.announcements[0].severity === 'critical' ? styles.announcementCritical : {}),
            ...(announcementContext.announcements[0].severity === 'warning' ? styles.announcementWarning : {})
          }}>
            <strong>{announcementContext.announcements[0].title}</strong>
            <div>{announcementContext.announcements[0].message}</div>
            <div style={styles.announcementMeta}>
              Severity: {announcementContext.announcements[0].severity}
              {announcementContext.announcements[0].ends_at ? ` · Visible until: ${new Date(announcementContext.announcements[0].ends_at).toLocaleString()}` : ''}
            </div>
          </div>
        ) : null}

        <main
          data-route-scroll-container
          style={{
            ...styles.content,
            ...(isMobile ? styles.contentMobile : styles.contentDesktop)
          }}
        >
          <Outlet />
        </main>
        <CopyrightNotice />
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {

  tenantAccessBanner: {
    margin: '0 24px 8px 24px',
    padding: '12px 16px',
    borderRadius: '14px',
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    lineHeight: 1.45
  },
  tenantAccessNotice: {
    margin: '0 24px 8px 24px',
    padding: '12px 16px',
    borderRadius: '14px',
    background: '#f8fafc',
    color: '#334155',
    border: '1px solid #dbe3f0',
    lineHeight: 1.45
  },

  incidentBanner: {
    margin: '12px 24px 0',
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    borderRadius: '14px',
    padding: '12px 16px',
    lineHeight: 1.45
  },
  incidentMajor: {
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  incidentCritical: {
    background: '#7f1d1d',
    color: '#fff',
    border: '1px solid #fecaca'
  },
  incidentMeta: {
    marginTop: '4px',
    fontSize: '12px',
    opacity: 0.85
  },

  announcementBanner: {
    margin: '12px 24px 0',
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    borderRadius: '14px',
    padding: '12px 16px',
    lineHeight: 1.45
  },
  announcementWarning: {
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a'
  },
  announcementCritical: {
    background: '#7f1d1d',
    color: '#fff',
    border: '1px solid #fecaca'
  },
  announcementMeta: {
    marginTop: '4px',
    fontSize: '12px',
    opacity: 0.85
  },

  maintenanceBanner: {
    margin: '16px 24px 0',
    background: '#7f1d1d',
    color: '#fff',
    borderRadius: '14px',
    padding: '14px 16px',
    boxShadow: '0 12px 30px rgba(127,29,29,0.18)'
  },
  maintenanceBannerMeta: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#fee2e2'
  },
  maintenanceNotice: {
    margin: '16px 24px 0',
    background: '#fffbeb',
    color: '#92400e',
    border: '1px solid #fde68a',
    borderRadius: '14px',
    padding: '12px 16px'
  },
  shell: {
    minHeight: '100dvh', height: '100dvh', display: 'flex', background: '#f8fafc', color: '#0f172a', position: 'relative', overflow: 'hidden', width: '100%', minWidth: 0
  },
  sidebar: {
    background: 'linear-gradient(180deg,#0f2749 0%,#0b1b32 48%,#081220 100%)', color: '#fff', padding: '18px 12px 14px', display: 'flex', flexDirection: 'column', zIndex: 40, overflow: 'hidden', minWidth: 0
  },
  sidebarDesktop: {
    width: '244px', minWidth: '244px', height: '100dvh', position: 'sticky', top: 0, borderRight: '1px solid rgba(148,163,184,.12)', boxShadow: '8px 0 24px rgba(15,23,42,.05)'
  },
  sidebarMobile: {
    width: '280px',
    maxWidth: '85vw',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
    transition: 'transform 0.22s ease',
    willChange: 'transform'
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
    marginBottom: '12px', padding: '5px 8px 16px', borderBottom: '1px solid rgba(255,255,255,.10)', flexShrink: 0, minWidth: 0
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  brandSubtitle: {
    fontSize: '12.5px', color: 'rgba(255,255,255,.78)', lineHeight: 1.4, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
  },
  rolePill: {
    display: 'inline-flex',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(96, 165, 250, 0.16)',
    color: '#bfdbfe',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    maxWidth: '100%',
    wordBreak: 'break-word'
  },
  brandWorkspace: { marginTop: '14px', padding: '10px 11px', borderRadius: '8px', background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' },
  brandWorkspaceLabel: { color: 'rgba(255,255,255,.38)', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: '3px' },
  navItemIcon: { width: '19px', height: '19px', flex: '0 0 19px', display: 'grid', placeItems: 'center' }, navItemLabel: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sidebarIdentity: { display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', alignItems: 'center', gap: '9px', marginBottom: '10px' }, sidebarAvatar: { width: '32px', height: '32px', borderRadius: '999px', display: 'grid', placeItems: 'center', background: '#2563eb', color: '#fff', fontSize: '12px', fontWeight: 800 }, sidebarIdentityText: { minWidth: 0 }, sidebarIdentityName: { color: '#fff', fontSize: '12.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, sidebarIdentityRole: { color: 'rgba(255,255,255,.5)', fontSize: '11px', marginTop: '2px' },
  headerContext: { display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0, paddingTop: '2px' }, headerContextAvatar: { width: '34px', height: '34px', borderRadius: '999px', display: 'grid', placeItems: 'center', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', fontSize: '12px', fontWeight: 800 }, headerContextText: { textAlign: 'right', minWidth: 0 }, headerContextRole: { color: '#0f172a', fontSize: '12.5px', fontWeight: 800 }, headerContextTenant: { color: '#64748b', fontSize: '11px', marginTop: '1px', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  supportPill: {
    display: 'inline-flex',
    marginTop: '8px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'rgba(251, 191, 36, 0.16)',
    color: '#fde68a',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.06em'
  },
  accessSummaryCard: {
    marginTop: '12px',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '14px',
    padding: '10px 12px',
    background: 'rgba(15, 23, 42, 0.72)'
  },
  accessSummaryLabel: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '6px'
  },
  accessSummaryValue: {
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800
  },
  accessSummaryMeta: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: '12px',
    marginTop: '4px',
    wordBreak: 'break-word'
  },
  navScrollArea: {
    flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingRight: '3px', paddingBottom: '6px'
  },
  nav: {
    display: 'flex', flexDirection: 'column', gap: '13px', minWidth: 0
  },
  navSection: {
    display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0
  },
  navSectionTitle: {
    color: 'rgba(255,255,255,.38)', fontSize: '10px', fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', padding: '5px 10px 4px'
  },
  navItem: {
    color: 'rgba(255,255,255,.78)', textDecoration: 'none', padding: '8px 10px', borderRadius: '8px', fontWeight: 650, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '36px', transition: 'background-color .16s ease,color .16s ease,box-shadow .16s ease'
  },
  navItemActive: {
    background: 'linear-gradient(90deg,rgba(37,99,235,.92),rgba(29,78,216,.82))', color: '#fff', boxShadow: '0 7px 18px rgba(37,99,235,.18)'
  },
  sidebarFooter: {
    padding: '13px 7px 0', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,.10)', flexShrink: 0
  },
  logoutButton: {
    width: '100%', border: '1px solid rgba(255,255,255,.10)', borderRadius: '8px', padding: '9px 10px', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.78)', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  },
  mainArea: {
    flex: 1, minWidth: 0, minHeight: 0, height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#f8fafc'
  },
  header: {
    padding: '18px 24px 15px', flexShrink: 0, minWidth: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', background: '#fff', borderBottom: '1px solid #e2e8f0'
  },
  headerMobile: {
    padding: '14px 12px', alignItems: 'flex-start'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    minWidth: 0
  },
  headerLeftMobile: {
    gap: '12px'
  },
  menuButton: {
    border: '1px solid #e2e8f0', background: '#fff', borderRadius: '8px', width: '40px', height: '40px', fontSize: '18px', color: '#0f172a', cursor: 'pointer', flexShrink: 0, boxShadow: '0 1px 2px rgba(15,23,42,.04)'
  },
  headerTextBlock: {
    minWidth: 0
  },
  breadcrumb: {
    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.09em', color: '#94a3b8', marginBottom: '6px', wordBreak: 'break-word'
  },
  breadcrumbMobile: {
    marginBottom: '6px'
  },
  headerTitle: {
    margin: 0, fontSize: '26px', lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a', wordBreak: 'break-word'
  },
  headerTitleMobile: {
    fontSize: '22px'
  },
  headerText: {
    margin: '6px 0 0', color: '#64748b', maxWidth: '760px', lineHeight: 1.45, fontSize: '13px', wordBreak: 'break-word'
  },
  headerTextMobile: {
    marginTop: '8px',
    fontSize: '14px',
    maxWidth: '100%'
  },
  moduleMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  moduleMetaPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    border: '1px solid #dbe3f0',
    background: '#ffffff',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 10px'
  },

  subscriptionBlockedBanner: {
    margin: '18px 24px 0',
    padding: '14px 16px',
    border: '1px solid #fecaca',
    borderRadius: 14,
    background: '#fef2f2',
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 1.5
  },
  subscriptionBlockedMeta: {
    marginTop: 6,
    color: '#991b1b',
    fontSize: 12
  },
  subscriptionLimitBanner: {
    margin: '18px 24px 0',
    padding: '14px 16px',
    border: '1px solid #fed7aa',
    borderRadius: 14,
    background: '#fff7ed',
    color: '#7c2d12',
    fontSize: 13,
    lineHeight: 1.5
  },
  supportBanner: {
    margin: '0 24px 8px 24px',
    padding: '14px 16px',
    borderRadius: '14px',
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    color: '#92400e',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  supportBannerText: {
    minWidth: 0,
    lineHeight: 1.45
  },
  supportBannerMeta: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#92400e',
    wordBreak: 'break-word'
  },
  supportExitButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '9px 12px',
    background: '#92400e',
    color: '#fff',
    fontWeight: 800,
    cursor: 'pointer'
  },
  content: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    maxWidth: '1400px',
    margin: '0 auto',
    overflowX: 'hidden',
    boxSizing: 'border-box'
  },
  contentDesktop: {
    padding: '20px 22px 26px'
  },
  contentMobile: {
    padding: '14px 12px 22px'
  }
};
