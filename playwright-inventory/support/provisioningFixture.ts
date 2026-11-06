/** Batch 53: synthetic Platform Provisioning transport fixture. Read-only original source.
 * All POST responses are intercepted; no real tenant/preset/account can be modified.
 * Browser assertions below do not prove DB transactions or server authorization. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID, PLATFORM_TENANT_A, PLATFORM_TENANT_B } from './platformSession';
export { PLATFORM_TENANT_A } from './platformSession';

export const provisionPermissions = [
  'platform.tenants.read', 'platform.provisioning_presets.read',
  'platform.tenants.create', 'platform.tenants.update', 'platform.audit.read'
];
export type PublishedProvisioningPreset = {
  id: string; key: string; preset_version: number; version: number;
  status: 'published'; label: string; description: string; organization_type: string;
  feature_flags: Record<string, boolean>; limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
  published_at?: string | null;
};
export const presetAlpha: PublishedProvisioningPreset = {
  id: '44444444-4444-4444-8444-444444444444', key: 'starter_pack',
  preset_version: 4, version: 2, status: 'published', label: 'Starter workspace',
  description: 'Synthetic base inventory setup', organization_type: 'hotel',
  feature_flags: { inventory: true, reports: false }, limits: { max_products: 500 },
  storage_locations: [{ name: 'Dry Store', temperature_zone: 'ambient' }, { name: 'Cold Room', temperature_zone: 'chilled' }],
  published_at: '2026-10-30T12:00:00.000Z'
};
export const presetBeta: PublishedProvisioningPreset = {
  ...presetAlpha, id: '55555555-5555-4555-8555-555555555555', key: 'premium_pack',
  preset_version: 7, label: 'Premium workspace', description: '',
  organization_type: 'restaurant', feature_flags: { inventory: true, reports: true },
  limits: { max_products: 1500 }, storage_locations: [{ name: 'Dispatch', temperature_zone: null }]
};
export const provisionTenants = [
  { id: PLATFORM_TENANT_A, name: 'Fixture Alpha', location: 'Rijeka', status: 'active', plan_code: 'standard', organization_type: 'hotel' },
  { id: PLATFORM_TENANT_B, name: 'Fixture Beta', location: null, status: 'archived', plan_code: 'starter', organization_type: 'restaurant' }
];
export const previewAlpha = {
  tenant: { ...provisionTenants[0], write_locked: false, feature_flags: { inventory: true }, limits: { max_products: 100 } },
  preset_key: presetAlpha.key, preset_version_id: presetAlpha.id, preset_version: 4,
  preset: presetAlpha, entitlement_source: 'commercial_plan', planned_organization_type: 'hotel',
  planned_feature_flags: presetAlpha.feature_flags, planned_limits: presetAlpha.limits,
  storage_locations_to_create: [presetAlpha.storage_locations[0], presetAlpha.storage_locations[1]],
  skipped_existing_storage_locations: 1, lifecycle_blocked: false,
  evidence_contract: {
    application_configuration_only: true,
    preview_is_point_in_time_and_rechecked_on_apply: true,
    preset_application_does_not_prove_customer_onboarding_complete: true,
    preset_application_does_not_prove_external_integration_or_business_outcome: true,
    starter_location_creation_does_not_prove_physical_location_exists: true
  }
};
export const applyFixture = {
  preset_key: presetAlpha.key, preset_version: 4, preset_recorded_on_tenant: true,
  created_storage_locations: [{ id: '66666666-6666-4666-8666-666666666666', name: 'Dry Store' }],
  skipped_storage_locations: 1, entitlement_source: 'commercial_plan'
};
export type ProvisionOptions = {
  permissions?: string[];
  selectedTenant?: string;
  selectedPreset?: string;
  presets?: PublishedProvisioningPreset[];
  tenants?: typeof provisionTenants;
  preview?: typeof previewAlpha;
  responses?: Record<string, { status?: number; json: unknown }>;
  onCall?: (method: string, path: string, body: any, search: URLSearchParams) => void;
};
export async function openProvisioning(page: Page, options: ProvisionOptions = {}) {
  targetBaseURL();
  const token = syntheticJwt();
  await page.addInitScript(t => {
    localStorage.setItem('inventory_platform_access_token', t);
    localStorage.setItem('inventory_locale', 'en-GB');
  }, token);
  await page.route('**/platform/**', async (route: Route) => {
    const req = route.request();
    if (req.isNavigationRequest()) return route.continue();
    const u = new URL(req.url());
    const path = u.pathname.replace(/^\/api(?=\/)/, '');
    const method = req.method();
    let body: any = null;
    if (method !== 'GET') { try { body = req.postDataJSON(); } catch { body = req.postData(); } }
    options.onCall?.(method, path, body, u.searchParams);
    if (path === '/platform/auth/refresh') return fulfillJson(route, { message: 'Synthetic refresh rejected' }, 401);
    if (path === '/platform/auth/me') return fulfillJson(route, {
      id: SYNTHETIC_PLATFORM_USER_ID, email: 'provision-fixture@example.test', role: 'superadmin', is_active: true
    });
    if (path === '/platform/permissions/me') return fulfillJson(route, {
      platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin',
      permissions: options.permissions ?? provisionPermissions
    });
    const override = options.responses?.[`${method} ${path}`];
    if (override) return fulfillJson(route, override.json, override.status ?? 200);
    if (path === '/platform/provisioning/presets' && method === 'GET') return fulfillJson(route, options.presets ?? [presetAlpha, presetBeta]);
    if (path === '/platform/tenants' && method === 'GET') return fulfillJson(route, options.tenants ?? provisionTenants);
    if (path === '/platform/provisioning/tenants' && method === 'POST') return fulfillJson(route, {
      tenant: { ...provisionTenants[0], id: '77777777-7777-4777-8777-777777777777' },
      provisioning: { ...applyFixture, created_storage_locations: applyFixture.created_storage_locations }
    }, 201);
    if (path.match(/^\/platform\/provisioning\/tenants\/[^/]+\/preview\/[^/]+$/) && method === 'GET')
      return fulfillJson(route, options.preview ?? previewAlpha);
    if (path.match(/^\/platform\/provisioning\/tenants\/[^/]+\/apply$/) && method === 'POST')
      return fulfillJson(route, applyFixture);
    return fulfillJson(route, []);
  });
  const params = new URLSearchParams();
  if (options.selectedTenant) params.set('tenant_id', options.selectedTenant);
  if (options.selectedPreset) params.set('preset', options.selectedPreset);
  await page.goto(`/platform/provisioning${params.toString() ? `?${params.toString()}` : ''}`);
  await expect(page.getByRole('heading', { name: 'Provisioning', exact: true })).toBeVisible();
}
