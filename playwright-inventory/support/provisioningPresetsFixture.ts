/** Batch 54 generation-only. All platform calls and write requests are synthetic.
 * This fixture tests browser-visible request/response handling, NOT backend ACLs,
 * version transaction safety, real account identities or persisted database state. */
import { expect, type Page, type Route } from '@playwright/test';
import { targetBaseURL } from './environment';
import { fulfillJson } from './tenantSession';
import { syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from './platformSession';

export const presetRegistryPermissions = [
  'platform.provisioning_presets.read', 'platform.provisioning_presets.write',
  'platform.users.read', 'platform.tenants.read', 'platform.audit.read'
];
export type PresetVersionFixture = {
  id: string; key: string; preset_version: number; status: 'draft' | 'published' | 'retired';
  label: string; description: string; organization_type: string;
  feature_flags: Record<string, boolean>; limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
  version: number; created_at: string; updated_at: string;
  published_at: string | null; retired_at: string | null;
  created_by_present: boolean; updated_by_present: boolean;
  published_by_present: boolean; retired_by_present: boolean;
  created_by_email: string | null; updated_by_email: string | null;
  published_by_email: string | null; retired_by_email: string | null;
};
const when = '2026-10-20T12:00:00.000Z';
export const publishedPreset: PresetVersionFixture = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', key: 'hotel_std', preset_version: 3,
  status: 'published', label: 'Hotel standard', description: 'Published fixture template',
  organization_type: 'hotel', feature_flags: { inventory: true, reports: true, procurement: false },
  limits: { max_users: 30, max_products: 3000 },
  storage_locations: [{ name: 'Central Storage', temperature_zone: 'ambient' }],
  version: 4, created_at: when, updated_at: when, published_at: when, retired_at: null,
  created_by_present: true, updated_by_present: true, published_by_present: true, retired_by_present: false,
  created_by_email: 'preset-owner@example.test', updated_by_email: 'preset-editor@example.test',
  published_by_email: 'preset-publisher@example.test', retired_by_email: null
};
export const draftPreset: PresetVersionFixture = {
  ...publishedPreset, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  key: 'draft_ops', preset_version: 1, version: 1, status: 'draft', label: 'Draft operations',
  description: '', published_at: null, published_by_present: false, published_by_email: null,
  storage_locations: [{ name: 'Pilot Store', temperature_zone: 'ambient' }]
};
export const retiredPreset: PresetVersionFixture = {
  ...publishedPreset, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  key: 'legacy_ops', preset_version: 1, version: 6, status: 'retired', label: 'Legacy operations',
  retired_at: when, retired_by_present: true, retired_by_email: 'preset-retire@example.test'
};
export type PresetsOpts = {
  permissions?: string[];
  versions?: PresetVersionFixture[];
  query?: string;
  totalOverride?: number;
  responses?: Record<string, { status?: number; json: unknown }>;
  onCall?: (method: string, path: string, body: any, search: URLSearchParams, headers: Record<string,string>) => void;
};
export async function openProvisioningPresets(page: Page, options: PresetsOpts = {}) {
  targetBaseURL();
  const versions = (options.versions ?? [publishedPreset, draftPreset, retiredPreset]).map(p => ({ ...p }));
  const token = syntheticJwt();
  await page.addInitScript(t => {
    localStorage.setItem('inventory_platform_access_token', t);
    localStorage.setItem('inventory_locale', 'en-GB');
  }, token);
  await page.route('**/platform/**', async (route: Route) => {
    const req = route.request();
    if (req.isNavigationRequest()) return route.continue();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    const method = req.method();
    let body: any = null;
    if (method !== 'GET') { try { body = req.postDataJSON(); } catch { body = req.postData(); } }
    options.onCall?.(method, path, body, url.searchParams, req.headers());
    if (path === '/platform/auth/refresh') return fulfillJson(route, { message: 'Synthetic refresh disabled' }, 401);
    if (path === '/platform/auth/me') return fulfillJson(route, {
      id: SYNTHETIC_PLATFORM_USER_ID, email: 'presets-fixture@example.test', role: 'superadmin', is_active: true
    });
    if (path === '/platform/permissions/me') return fulfillJson(route, {
      platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin', permissions: options.permissions ?? presetRegistryPermissions
    });
    const override = options.responses?.[`${method} ${path}`];
    if (override) return fulfillJson(route, override.json, override.status ?? 200);
    if (path === '/platform/provisioning/preset-versions' && method === 'GET') {
      const status = url.searchParams.get('status');
      const search = (url.searchParams.get('search') || '').toLowerCase();
      const key = url.searchParams.get('key');
      const offset = Number(url.searchParams.get('offset') || '0');
      const limit = Number(url.searchParams.get('limit') || '50');
      const subset = versions.filter(row => (!status || row.status === status) && (!key || row.key === key) &&
        (!search || `${row.key} ${row.label} ${row.organization_type} ${row.description}`.toLowerCase().includes(search)));
      const total = options.totalOverride ?? subset.length;
      return fulfillJson(route, {
        preset_versions: subset.slice(offset, offset + limit),
        summary: { total, preset_keys: new Set(subset.map(row => row.key)).size,
          published: subset.filter(row => row.status === 'published').length,
          draft: subset.filter(row => row.status === 'draft').length,
          retired: subset.filter(row => row.status === 'retired').length },
        pagination: { limit, offset, total, has_more: offset + limit < total },
        evidence_access: { platform_user_identity: (options.permissions ?? presetRegistryPermissions).includes('platform.users.read') },
        evidence_contract: {
          application_registry_only: true, published_status_means_application_selectable: true,
          published_status_does_not_certify_customer_fit: true,
          feature_flags_and_limits_are_template_defaults: true,
          starter_locations_are_template_definitions_only: true,
          retirement_is_application_lifecycle_history: true,
          actor_identity_requires_platform_users_read: true
        }, statuses: ['draft', 'published', 'retired']
      });
    }
    if (path === '/platform/provisioning/preset-versions' && method === 'POST') {
      const created: PresetVersionFixture = {
        ...draftPreset, ...body, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        key: String(body?.key || 'new_preset'), preset_version: 1, version: 1,
        status: 'draft', published_at: null, retired_at: null
      };
      versions.push(created);
      return fulfillJson(route, created, 201);
    }
    const match = path.match(/^\/platform\/provisioning\/preset-versions\/([^/]+)(?:\/(new-version|clone|publish|retire))?$/);
    if (match && (method === 'PATCH' || method === 'POST')) {
      const selected = versions.find(row => row.id === match[1]) || draftPreset;
      const action = match[2];
      let result: PresetVersionFixture;
      if (action === 'new-version') result = { ...selected, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        preset_version: selected.preset_version + 1, version: 1, status: 'draft', published_at: null, retired_at: null };
      else if (action === 'clone') result = { ...selected, id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        key: String(body?.key || 'new_clone'), label: String(body?.label || selected.label),
        preset_version: 1, version: 1, status: 'draft', published_at: null, retired_at: null };
      else if (action === 'publish') result = { ...selected, status: 'published', published_at: when, version: selected.version + 1 };
      else if (action === 'retire') result = { ...selected, status: 'retired', retired_at: when, version: selected.version + 1 };
      else result = { ...selected, ...body, id: selected.id, key: selected.key, version: selected.version + 1 };
      const index = versions.findIndex(row => row.id === result.id);
      if (index >= 0) versions[index] = result; else versions.push(result);
      return fulfillJson(route, result, action === 'new-version' || action === 'clone' ? 201 : 200);
    }
    return fulfillJson(route, []);
  });
  await page.goto(`/platform/provisioning-presets${options.query ? (options.query.startsWith('?') ? options.query : `?${options.query}`) : ''}`);
  await expect(page.getByRole('heading', { name: 'Provisioning presets', exact: true })).toBeVisible();
}
