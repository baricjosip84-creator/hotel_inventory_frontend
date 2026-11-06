import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';

// Batch 50: offline/synthetic request fixtures. Do not confuse injected JWT claims
// and mocked permission responses with real server authentication or ACL testing.
export const SYNTHETIC_PLATFORM_USER_ID = '99999999-9999-4999-8999-999999999999';
export const dashboardPermission = 'platform.dashboard.read';

export async function isolatePlatformLogin(page: Page) {
  targetBaseURL();
  await page.addInitScript(() => {
    localStorage.removeItem('inventory_platform_access_token');
    localStorage.removeItem('inventory_platform_csrf_token');
    localStorage.setItem('inventory_locale', 'en-GB');
  });
  await page.route('**/platform/auth/refresh', route => fulfillJson(route, { message: 'Fixture unauthenticated' }, 401));
  await page.goto('/platform/login');
  await expect(page.locator('form[data-auth-form="true"]')).toBeVisible();
}
export function syntheticJwt(role = 'superadmin', seconds = 3600): string {
  // Browser-compatible base64url for ASCII-only synthetic fixture claims.
  const payload = JSON.stringify({ typ: 'platform', id: SYNTHETIC_PLATFORM_USER_ID,
    role, exp: Math.floor(Date.now() / 1000) + seconds });
  return `e30.${btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.fixture_signature_not_real`;
}
export type PlatformDashboardVisibility = {
  tenants: boolean; platform_sessions: boolean; notifications: boolean;
  audit: boolean; billing_attention: boolean; support_sessions: boolean;
};
export const fullVisibility: PlatformDashboardVisibility = {
  tenants: true, platform_sessions: true, notifications: true,
  audit: true, billing_attention: true, support_sessions: true
};
export const platformDashboard = {
  generated_at: '2026-10-30T09:30:00.000Z', visibility: fullVisibility,
  tenants_by_status: [{ status: 'active', count: 7 }, { status: 'trial', count: 2 }],
  support_sessions_by_status: [{ status: 'active', count: 3 }],
  active_platform_sessions: 5,
  notifications: [{ status: 'open', severity: 'critical', count: 4 }],
  platform_audit_events_last_24h: 11,
  attention: {
    billing_or_lifecycle: [{ id: 'bill-50-tenant', name: 'Billing Fixture Tenant', status: 'trial', billing_status: 'overdue', plan_code: 'starter' }],
    locked_tenants: [{ id: 'lock-50-tenant', name: 'Locked Fixture Tenant', status: 'locked', billing_status: 'active', plan_code: 'plus' }],
    stale_tenants: [{ id: 'stale-50-tenant', name: 'Stale Fixture Tenant', status: 'active', billing_status: 'active', plan_code: 'starter', last_seen_at: null }],
    limit_attention: [{ id: 'limit-50-tenant', name: 'Limit Fixture Tenant', status: 'active', billing_status: 'active', plan_code: 'starter', limits: [{ key: 'products', used: 85, limit: 100, percent_used: 85 }] }],
    active_support_sessions: [{ id: 'support-50', tenant_id: 'support-tenant-50', tenant_name: 'Support Fixture Tenant', reason: 'Synthetic issue', access_level: 'read_only', expires_at: '2026-12-01T12:00:00Z', platform_user_email: 'synthetic-operator@example.test', ticket_reference: 'PW50-TEST' }]
  }
};
type DashboardOpts = { dashboard?: typeof platformDashboard; permissions?: string[]; dashboardStatus?: number; onCall?: (method: string, path: string) => void };
export async function openSyntheticPlatformDashboard(page: Page, options: DashboardOpts = {}) {
  targetBaseURL();
  const token = syntheticJwt();
  await page.addInitScript(tokenValue => {
    localStorage.setItem('inventory_platform_access_token', tokenValue);
    localStorage.setItem('inventory_locale', 'en-GB');
  }, token);
  await page.route('**/platform/**', async (route: Route) => {
    const request = route.request();
    if (request.isNavigationRequest()) return route.continue();
    const path = new URL(request.url()).pathname.replace(/^\/api(?=\/)/, '');
    const method = request.method();
    options.onCall?.(method, path);
    if (path === '/platform/auth/refresh') return fulfillJson(route, { message: 'No synthetic cookie' }, 401);
    if (path === '/platform/auth/me') return fulfillJson(route, { id: SYNTHETIC_PLATFORM_USER_ID, email: 'fixture@example.test', role: 'superadmin', is_active: true });
    if (path === '/platform/permissions/me') return fulfillJson(route, { platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin', permissions: options.permissions ?? [dashboardPermission, 'platform.tenants.read', 'platform.support_sessions.read', 'platform.notifications.read', 'platform.audit.read', 'platform.sessions.read'] });
    if (path === '/platform/dashboard') return fulfillJson(route,
      options.dashboardStatus && options.dashboardStatus >= 400 ? { message: 'Fixture dashboard unavailable' } : options.dashboard ?? platformDashboard,
      options.dashboardStatus || 200);
    // Other requests from shared PlatformLayout stay entirely isolated.
    return fulfillJson(route, []);
  });
  await page.goto('/platform/dashboard');
  await expect(page.getByRole('heading', { name: 'Platform operations workspace' })).toBeVisible();
}

// Batch 51: isolated platform tenant-registry transport fixture. All identities,
// tenant records, tokens, mutations and entitlement responses are synthetic.
export const PLATFORM_TENANT_A = '11111111-1111-4111-8111-111111111111';
export const PLATFORM_TENANT_B = '22222222-2222-4222-8222-222222222222';
export const PLATFORM_TENANT_USER = '33333333-3333-4333-8333-333333333333';
export const tenantFixturePermissions = [
  dashboardPermission, 'platform.tenants.read', 'platform.tenants.create',
  'platform.tenants.update', 'platform.tenants.lock', 'platform.tenants.unlock',
  'platform.tenants.export', 'platform.billing.read', 'platform.provisioning_presets.read'
];
export const tenantRowsFixture = [
  { id: PLATFORM_TENANT_A, name: 'Fixture Alpha', location: 'Rijeka', status: 'active', billing_status: 'past_due', plan_code: 'standard', inventory_currency: 'EUR', inventory_currency_configured_at: '2026-09-01T12:00:00Z', write_locked: false },
  { id: PLATFORM_TENANT_B, name: 'Fixture Beta', location: '', status: 'suspended', billing_status: 'active', plan_code: 'starter', inventory_currency: 'EUR', inventory_currency_configured_at: null, write_locked: true }
];
export const tenantPresetsFixture = [
  { id: '44444444-4444-4444-8444-444444444444', key: 'starter_preset', label: 'Starter preset', preset_version: 3 }
];
export const tenantDetailsFixture = {
  tenant: { ...tenantRowsFixture[0], feature_flags: { inventory: true, reports: false },
    limits: { max_users: 20, max_products: 500, max_storage_locations: null },
    support_policy: { support_enabled: true, require_ticket_reference: true, require_customer_consent: false,
      emergency_admin_requires_approval: true, max_duration_minutes: 120, allowed_access_levels: ['read_only', 'inventory_support'] } },
  usage: { users: 2, products: 9 },
  limit_status: { max_users: { used: 2, limit: 20 }, max_products: { used: 9, limit: 500 } },
  support_sessions: { total_count: 4, active_count: 1 },
  users: [{ id: PLATFORM_TENANT_USER, email: 'admin@fixture.test', name: 'Fixture Admin', role: 'admin', is_active: true, last_login_at: null }]
};
export type TenantFixtureOpts = {
  selectedId?: string;
  permissions?: string[];
  tenants?: typeof tenantRowsFixture;
  details?: typeof tenantDetailsFixture;
  presets?: typeof tenantPresetsFixture;
  responses?: Record<string, { status?: number; json: unknown }>;
  onCall?: (method: string, path: string, body: any) => void;
};
export async function openSyntheticPlatformTenants(page: Page, options: TenantFixtureOpts = {}) {
  targetBaseURL();
  const token = syntheticJwt();
  await page.addInitScript(t => {
    localStorage.setItem('inventory_platform_access_token', t);
    localStorage.setItem('inventory_locale', 'en-GB');
  }, token);
  await page.route('**/platform/**', async (route: Route) => {
    const req = route.request();
    if (req.isNavigationRequest()) return route.continue();
    const method = req.method();
    const path = new URL(req.url()).pathname.replace(/^\/api(?=\/)/, '');
    let body: any = null;
    if (method !== 'GET') {
      try { body = req.postDataJSON(); } catch { body = req.postData(); }
    }
    options.onCall?.(method, path, body);
    if (path === '/platform/auth/refresh') return fulfillJson(route, { message: 'No synthetic cookie' }, 401);
    if (path === '/platform/auth/me') return fulfillJson(route, { id: SYNTHETIC_PLATFORM_USER_ID, email: 'fixture@example.test', role: 'superadmin', is_active: true });
    if (path === '/platform/permissions/me') return fulfillJson(route, { platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin', permissions: options.permissions ?? tenantFixturePermissions });
    const override = options.responses?.[`${method} ${path}`];
    if (override) return fulfillJson(route, override.json, override.status || 200);
    if (path === '/platform/provisioning/presets' && method === 'GET') return fulfillJson(route, options.presets ?? tenantPresetsFixture);
    if (path === '/platform/tenants' && method === 'GET') return fulfillJson(route, options.tenants ?? tenantRowsFixture);
    if (path === '/platform/tenants' && method === 'POST') return fulfillJson(route, { tenant: { ...tenantRowsFixture[0], id: PLATFORM_TENANT_A } }, 201);
    if (path === `/platform/tenants/${PLATFORM_TENANT_A}` && method === 'GET') return fulfillJson(route, options.details ?? tenantDetailsFixture);
    if (path === `/platform/tenants/${PLATFORM_TENANT_B}` && method === 'GET') return fulfillJson(route, {
      ...(options.details ?? tenantDetailsFixture), tenant: { ...(options.details ?? tenantDetailsFixture).tenant, ...tenantRowsFixture[1] }
    });
    if (path.startsWith('/platform/tenants/') && method === 'GET' && path.endsWith('/export')) return fulfillJson(route, { fixture_export: true });
    if (path.startsWith('/platform/tenants/') && ['PATCH', 'POST', 'DELETE'].includes(method)) return fulfillJson(route, { fixture_mutation: true });
    return fulfillJson(route, []);
  });
  await page.goto(`/platform/tenants${options.selectedId ? `?tenant_id=${encodeURIComponent(options.selectedId)}` : ''}`);
  await expect(page.getByRole('heading', { name: 'Tenants', exact: true })).toBeVisible();
}
