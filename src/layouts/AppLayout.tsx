import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { CSSProperties, MouseEvent } from 'react';
import {
  clearAuthTokens,
  clearSupportSessionAccessToken,
  getAccessToken,
  getRefreshToken,
  getSupportSessionInfo
} from '../lib/auth';
import { apiRequest } from '../lib/api';
import { fetchCurrentSupportContext, type CurrentSupportContext } from '../lib/supportContext';
import { fetchMaintenanceContext, type MaintenanceContext } from '../lib/maintenanceContext';
import { fetchAnnouncementContext, type AnnouncementContext } from '../lib/announcementContext';
import { fetchIncidentContext, type IncidentContext } from '../lib/incidentContext';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement, type TenantSubscriptionAccess } from '../lib/tenantSubscriptionAccess';
import { getTenantPermissionSnapshot, hasPermission, TENANT_PERMISSION_SNAPSHOT_EVENT } from '../lib/permissions';
import { getTenantAccessSnapshot } from '../lib/tenantAccess';
import { getTenantModuleForPathname, getTenantPageMeta, tenantNavigationSections } from '../app/navigationRegistry';
import type { TenantNavigationItem } from '../app/navigationRegistry';

type UserRole = 'admin' | 'manager' | 'staff' | null;

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getCurrentUserRole(): UserRole {
  const payload = decodeJwtPayload(getAccessToken());
  const role = payload?.role;

  if (role === 'admin' || role === 'manager' || role === 'staff') {
    return role;
  }

  return null;
}

function getCurrentAccessRoleLabel(): string | null {
  const payload = decodeJwtPayload(getAccessToken());
  if (typeof payload?.custom_role_name === 'string' && payload.custom_role_name.trim()) {
    return payload.custom_role_name.trim();
  }
  const role = payload?.role;
  return typeof role === 'string' && role ? role : null;
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
  const role = useMemo(() => getCurrentUserRole(), []);
  const [permissionRevision, setPermissionRevision] = useState(0);
  const permissionSnapshot = getTenantPermissionSnapshot();
  const accessRoleLabel = permissionSnapshot?.access_role_label || permissionSnapshot?.custom_role_name || getCurrentAccessRoleLabel();
  const tenantAccess = useMemo(() => getTenantAccessSnapshot(), [location.pathname, permissionRevision]);
  const supportSession = useMemo(() => getSupportSessionInfo(), [location.pathname]);

  const [supportContext, setSupportContext] = useState<CurrentSupportContext | null>(null);
  const [maintenanceContext, setMaintenanceContext] = useState<MaintenanceContext | null>(null);
  const [announcementContext, setAnnouncementContext] = useState<AnnouncementContext | null>(null);
  const [incidentContext, setIncidentContext] = useState<IncidentContext | null>(null);
  const [tenantSubscriptionAccess, setTenantSubscriptionAccess] = useState<TenantSubscriptionAccess | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mainAreaRef = useRef<HTMLDivElement | null>(null);

  const currentModule = useMemo(() => getTenantModuleForPathname(location.pathname), [location.pathname]);
  const pageMeta = useMemo(() => getTenantPageMeta(location.pathname), [location.pathname]);

  const isVisibleNavigationItem = (item: TenantNavigationItem): boolean => {
    const featureByPath: Record<string, string> = {
      '/automation-schedules': 'automation',
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
    window.addEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
    return () => window.removeEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
  }, []);

  const visibleNavSections = useMemo(() => {
    return tenantNavigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter(isVisibleNavigationItem)
      }))
      .filter((section) => section.items.length > 0);
  }, [role, tenantSubscriptionAccess, permissionRevision]);

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

    const refreshToken = getRefreshToken();
    const supportSessionInfo = getSupportSessionInfo();

    if (supportSessionInfo.isSupportSession) {
      clearSupportSessionAccessToken();
      navigate('/platform/support-sessions', { replace: true });
      setIsLoggingOut(false);
      return;
    }

    try {
      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch {
      // Clear local auth state even when backend logout is unavailable.
    } finally {
      clearAuthTokens();
      navigate('/login', { replace: true });
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
          <div style={styles.brandTitle}>Inventory Platform</div>
          <div style={styles.brandSubtitle}>Multi-tenant control center</div>
          {accessRoleLabel ? <div style={styles.rolePill}>ROLE: {accessRoleLabel.toUpperCase()}</div> : null}

        {supportSession.isSupportSession ? (
            <div style={styles.supportPill}>SUPPORT MODE</div>
          ) : null}
          <div style={styles.accessSummaryCard}>
            <div style={styles.accessSummaryLabel}>Tenant access</div>
            <div style={styles.accessSummaryValue}>
              {tenantAccess.permittedModuleCount}/{tenantAccess.totalModuleCount} modules visible
            </div>
            <div style={styles.accessSummaryMeta}>
              Tenant: {tenantAccess.tenantId || 'unavailable'}
            </div>
          </div>
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
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <button
            type="button"
            style={styles.logoutButton}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out…' : supportSession.isSupportSession ? 'Exit support mode' : 'Log out'}
          </button>
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
              {currentModule ? (
                <div style={styles.moduleMetaRow}>
                  <span style={styles.moduleMetaPill}>{currentModule.moduleGroupLabel}</span>
                  <span style={styles.moduleMetaPill}>Priority: {currentModule.priority}</span>
                  <span style={styles.moduleMetaPill}>Route: {currentModule.to}</span>
                  <span style={styles.moduleMetaPill}>Access: {currentModule.permission ? 'permission-gated' : 'role-gated'}</span>
                </div>
              ) : null}
            </div>
          </div>
        </header>


        {!tenantAccess.hasTenantContext ? (
          <div style={styles.tenantAccessBanner}>
            <strong>Tenant context unavailable.</strong> The session token did not expose a tenant identifier, so tenant-safe API requests may fail until the user signs in again.
          </div>
        ) : tenantAccess.hiddenModuleCount > 0 ? (
          <div style={styles.tenantAccessNotice}>
            <strong>Permission-aware workspace.</strong> This role can access {tenantAccess.permittedModuleCount} of {tenantAccess.totalModuleCount} registered tenant modules. Hidden modules remain unavailable in navigation and protected routes.
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
    minHeight: '100dvh',
    height: '100dvh',
    display: 'flex',
    background: '#f5f7fb',
    color: '#1f2937',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    minWidth: 0
  },
  sidebar: {
    background: '#0f172a',
    color: '#ffffff',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 40,
    overflow: 'hidden',
    minWidth: 0
  },
  sidebarDesktop: {
    width: '272px',
    minWidth: '272px',
    height: '100dvh',
    position: 'sticky',
    top: 0,
    borderRight: '1px solid rgba(255,255,255,0.06)'
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
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
    minWidth: 0
  },
  brandTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  brandSubtitle: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: '12px',
    lineHeight: 1.45,
    wordBreak: 'break-word'
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
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    paddingRight: '4px'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    minWidth: 0
  },
  navSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: 0
  },
  navSectionTitle: {
    color: 'rgba(255,255,255,0.46)',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '4px 12px 2px'
  },
  navItem: {
    color: 'rgba(255,255,255,0.82)',
    textDecoration: 'none',
    padding: '12px 14px',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '15px',
    wordBreak: 'break-word'
  },
  navItemActive: {
    background: 'rgba(59,130,246,0.34)',
    color: '#ffffff',
    boxShadow: 'inset 4px 0 0 #60a5fa, 0 0 0 1px rgba(96,165,250,0.18)'
  },
  sidebarFooter: {
    paddingTop: '16px',
    marginTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.10)',
    flexShrink: 0,
    background: '#0f172a'
  },
  logoutButton: {
    width: '100%',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 14px',
    background: '#ef4444',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  mainArea: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100dvh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '24px 24px 16px 24px',
    flexShrink: 0,
    minWidth: 0
  },
  headerMobile: {
    padding: '18px 14px 12px 14px'
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
    border: '1px solid #dbe3f0',
    background: '#ffffff',
    borderRadius: '12px',
    width: '44px',
    height: '44px',
    fontSize: '20px',
    cursor: 'pointer',
    flexShrink: 0
  },
  headerTextBlock: {
    minWidth: 0
  },
  breadcrumb: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  breadcrumbMobile: {
    marginBottom: '6px'
  },
  headerTitle: {
    margin: 0,
    fontSize: '32px',
    lineHeight: 1.1,
    wordBreak: 'break-word'
  },
  headerTitleMobile: {
    fontSize: '28px'
  },
  headerText: {
    margin: '10px 0 0 0',
    color: '#475569',
    maxWidth: '760px',
    lineHeight: 1.5,
    wordBreak: 'break-word'
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
    padding: '24px'
  },
  contentMobile: {
    padding: '14px 12px 22px 12px'
  }
};
