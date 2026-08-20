import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import { DEFAULT_INVENTORY_CURRENCY } from '../lib/tenantCurrency';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformTenantsPage.css';

type FeatureFlags = Record<string, boolean | string | number | null>;
type TenantLimits = Record<string, number | string | null>;
type SupportPolicy = {
  support_enabled?: boolean;
  require_ticket_reference?: boolean;
  require_customer_consent?: boolean;
  emergency_admin_requires_approval?: boolean;
  max_duration_minutes?: number;
  allowed_access_levels?: string[];
};

type ProvisioningPreset = { id: string; key: string; label: string; preset_version: number };
type TenantRow = {
  id: string;
  name: string;
  location?: string | null;
  write_locked?: boolean;
  organization_type?: string | null;
  inventory_currency?: string | null;
  inventory_currency_configured_at?: string | null;
  status?: string;
  billing_status?: string;
  plan_code?: string;
};
type LimitStatus = { used: number; limit: number | null };
type TenantRole = 'admin' | 'manager' | 'staff';
type TenantUser = {
  id: string;
  email: string;
  name: string;
  role: TenantRole;
  is_active?: boolean;
  created_at?: string;
  last_login_at?: string | null;
};
type TenantDetails = {
  tenant: TenantRow & { feature_flags?: FeatureFlags; limits?: TenantLimits; support_policy?: SupportPolicy };
  usage: Record<string, number>;
  limit_status?: Record<string, LimitStatus>;
  support_sessions: { total_count: number; active_count: number };
  users?: TenantUser[];
};
type Feedback = { tone: 'good' | 'warn'; text: string } | null;

const planOptions = [
  { code: 'starter', label: 'Starter', description: 'Basic tenant package' },
  { code: 'standard', label: 'Standard', description: 'Commercial tenant package' },
  { code: 'enterprise', label: 'Enterprise', description: 'Full tenant package with automation' }
];
const knownFeatureFlags = ['inventory', 'procurement', 'forecasting', 'automation', 'scanner', 'reports', 'support_access', 'requisitions', 'purchase_orders', 'sso', 'api_access', 'advanced_integrations'];
const defaultLimitKeys = ['max_users', 'max_products', 'max_storage_locations'];
const supportAccessLevels = ['read_only', 'inventory_support', 'procurement_support', 'emergency_admin'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('past_due') || normalized.includes('cancelled') || normalized.includes('suspended') || normalized.includes('archived')) return 'danger';
  if (normalized.includes('trial') || normalized.includes('maintenance') || normalized.includes('offboarding') || normalized.includes('not_configured')) return 'warn';
  if (normalized.includes('active') || normalized.includes('comped')) return 'good';
  return 'neutral';
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const selected = uuidPattern.test(requestedTenantId) ? requestedTenantId : null;
  const invalidSelectedTenant = Boolean(requestedTenantId && !selected);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState({
    name: '', location: '', preset: '', plan_code: 'standard', inventory_currency: DEFAULT_INVENTORY_CURRENCY,
    initial_admin_email: '', initial_admin_name: '', initial_admin_password: '', create_onboarding_tasks: true
  });
  const [entitlements, setEntitlements] = useState({ plan_code: 'standard', feature_flags: {} as FeatureFlags, limits: {} as TenantLimits });
  const [tenantUserForm, setTenantUserForm] = useState({ email: '', name: '', role: 'admin' as TenantRole, password: '' });
  const [supportPolicy, setSupportPolicy] = useState<SupportPolicy>({
    support_enabled: true,
    require_ticket_reference: true,
    require_customer_consent: false,
    emergency_admin_requires_approval: true,
    max_duration_minutes: 120,
    allowed_access_levels: supportAccessLevels
  });

  const canCreate = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_CREATE);
  const canUpdate = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const canLock = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_LOCK);
  const canUnlock = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UNLOCK);
  const canExport = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT);
  const canReadBilling = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ);
  const canReadProvisioningPresets = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PROVISIONING_PRESETS_READ);

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const provisioningPresetsQuery = useQuery({
    queryKey: ['platform', 'provisioning', 'presets', 'tenant-create'],
    queryFn: () => platformApiRequest<ProvisioningPreset[]>('/platform/provisioning/presets'),
    enabled: canCreate && canReadProvisioningPresets,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  useEffect(() => {
    const presets = provisioningPresetsQuery.data || [];
    if (!presets.length) return;
    if (!presets.some((preset) => preset.key === form.preset)) {
      setForm((current) => ({ ...current, preset: presets[0].key }));
    }
  }, [provisioningPresetsQuery.data, form.preset]);

  const detailsQuery = useQuery({
    queryKey: ['platform', 'tenants', selected],
    queryFn: () => platformApiRequest<TenantDetails>(`/platform/tenants/${selected}`),
    enabled: Boolean(selected),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  useEffect(() => {
    if (!detailsQuery.data) return;
    setEntitlements({
      plan_code: detailsQuery.data.tenant.plan_code || 'standard',
      feature_flags: detailsQuery.data.tenant.feature_flags || {},
      limits: detailsQuery.data.tenant.limits || {}
    });
    setSupportPolicy({
      support_enabled: detailsQuery.data.tenant.support_policy?.support_enabled !== false,
      require_ticket_reference: detailsQuery.data.tenant.support_policy?.require_ticket_reference !== false,
      require_customer_consent: detailsQuery.data.tenant.support_policy?.require_customer_consent === true,
      emergency_admin_requires_approval: detailsQuery.data.tenant.support_policy?.emergency_admin_requires_approval !== false,
      max_duration_minutes: detailsQuery.data.tenant.support_policy?.max_duration_minutes || 120,
      allowed_access_levels: detailsQuery.data.tenant.support_policy?.allowed_access_levels || supportAccessLevels
    });
  }, [detailsQuery.data]);

  const invalidateSelectedTenant = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    if (selected) await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', selected] });
  };

  const createTenant = useMutation({
    mutationFn: () => platformApiRequest<{ tenant?: TenantRow }>('/platform/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        location: form.location.trim(),
        preset: form.preset,
        preset_version_id: (provisioningPresetsQuery.data || []).find((preset) => preset.key === form.preset)?.id,
        plan_code: form.plan_code,
        inventory_currency: form.inventory_currency.trim().toUpperCase(),
        initial_admin: hasCompleteInitialAdmin ? {
          email: form.initial_admin_email.trim(), name: form.initial_admin_name.trim(), password: form.initial_admin_password
        } : undefined,
        create_onboarding_tasks: form.create_onboarding_tasks
      })
    }),
    onSuccess: async (data) => {
      setFeedback({ tone: 'good', text: 'Tenant created successfully.' });
      setForm({
        name: '', location: '', preset: provisioningPresetsQuery.data?.[0]?.key || '', plan_code: 'standard',
        inventory_currency: DEFAULT_INVENTORY_CURRENCY, initial_admin_email: '', initial_admin_name: '', initial_admin_password: '', create_onboarding_tasks: true
      });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      if (data?.tenant?.id) {
        const next = new URLSearchParams(searchParams);
        next.set('tenant_id', data.tenant.id);
        setSearchParams(next, { replace: true });
      }
    }
  });

  const patchTenant = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => platformApiRequest(`/platform/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant settings updated.' });
      await invalidateSelectedTenant();
    }
  });

  const saveTenantUser = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenants/${selected}/users`, { method: 'POST', body: JSON.stringify(tenantUserForm) }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant user created or reset. Existing sessions were revoked when the account already existed.' });
      setTenantUserForm({ email: '', name: '', role: 'admin', password: '' });
      await invalidateSelectedTenant();
    }
  });

  const resetTenantUserPassword = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => platformApiRequest(`/platform/tenants/${selected}/users/${userId}/password`, { method: 'PATCH', body: JSON.stringify({ password }) }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Password reset. All existing sessions for that tenant user were revoked.' });
      await invalidateSelectedTenant();
    }
  });

  const setTenantUserStatus = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => platformApiRequest(`/platform/tenants/${selected}/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: isActive }) }),
    onSuccess: async (_data, variables) => {
      setFeedback({ tone: 'good', text: variables.isActive ? 'Tenant user enabled.' : 'Tenant user disabled and active sessions revoked.' });
      await invalidateSelectedTenant();
    }
  });

  const deleteTenantUser = useMutation({
    mutationFn: (userId: string) => platformApiRequest(`/platform/tenants/${selected}/users/${userId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant user deleted.' });
      await invalidateSelectedTenant();
    }
  });

  const saveEntitlements = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenants/${selected}/entitlements`, { method: 'PATCH', body: JSON.stringify(entitlements) }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant entitlements saved.' });
      await invalidateSelectedTenant();
    }
  });

  const saveSupportPolicy = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenants/${selected}/support-policy`, { method: 'PATCH', body: JSON.stringify(supportPolicy) }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Support access policy saved.' });
      await invalidateSelectedTenant();
    }
  });

  const lock = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenants/${id}/lock`, { method: 'POST' }),
    onSuccess: async () => {
      setFeedback({ tone: 'warn', text: 'Tenant write lock enabled.' });
      await invalidateSelectedTenant();
    }
  });

  const unlock = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenants/${id}/unlock`, { method: 'POST' }),
    onSuccess: async () => {
      setFeedback({ tone: 'good', text: 'Tenant write lock disabled.' });
      await invalidateSelectedTenant();
    }
  });

  const exportTenant = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenants/${id}/export`),
    onSuccess: (data, id) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tenant-${id}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({ tone: 'good', text: 'Tenant export generated.' });
    }
  });

  const tenantRows = tenantsQuery.data || [];
  const featureFlagKeys = useMemo(() => Array.from(new Set([...knownFeatureFlags, ...Object.keys(entitlements.feature_flags || {})])), [entitlements.feature_flags]);
  const selectedTenantName = detailsQuery.data?.tenant.name || tenantRows.find((tenant) => tenant.id === selected)?.name || 'Selected tenant';
  const tenantUsers = detailsQuery.data?.users || [];
  const tenantUserActionPending = resetTenantUserPassword.isPending || setTenantUserStatus.isPending || deleteTenantUser.isPending;
  const initialAdminValues = [form.initial_admin_email.trim(), form.initial_admin_name.trim(), form.initial_admin_password];
  const hasAnyInitialAdminValue = initialAdminValues.some(Boolean);
  const hasCompleteInitialAdmin = initialAdminValues.every(Boolean);
  const validInitialAdminEmail = !form.initial_admin_email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.initial_admin_email.trim());
  const createTenantBlockedReason = !canReadProvisioningPresets
    ? 'Provisioning Presets read permission is required to create tenants safely from this page.'
    : provisioningPresetsQuery.isError
      ? 'Published provisioning presets could not be loaded. Retry before creating a tenant.'
      : !(provisioningPresetsQuery.data || []).length
        ? 'At least one published provisioning preset is required before creating a tenant.'
        : !form.name.trim()
          ? 'Enter a tenant name before creating a tenant.'
          : !(provisioningPresetsQuery.data || []).some((preset) => preset.key === form.preset)
            ? 'Select a currently published provisioning preset.'
            : !/^[A-Za-z]{3}$/.test(form.inventory_currency.trim())
              ? 'Inventory currency must be a 3-letter ISO currency code, for example EUR, USD, or GBP.'
              : hasAnyInitialAdminValue && !hasCompleteInitialAdmin
                ? 'Complete initial admin email, name, and password, or leave all three blank.'
                : !validInitialAdminEmail
                  ? 'Enter a valid initial admin email address.'
                  : hasAnyInitialAdminValue && form.initial_admin_password.length < 10
                    ? 'Initial admin password must be at least 10 characters.'
                    : '';
  const canSubmitTenant = !createTenantBlockedReason && !createTenant.isPending;
  const tenantUserBlockedReason = !tenantUserForm.email.trim() || !tenantUserForm.name.trim() || !tenantUserForm.password
    ? 'Email, name, role, and password are required.'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantUserForm.email.trim())
      ? 'Enter a valid tenant user email address.'
      : tenantUserForm.password.length < 10
        ? 'Tenant user password must be at least 10 characters.'
        : '';
  const entitlementsDirty = Boolean(detailsQuery.data) && (
    entitlements.plan_code !== (detailsQuery.data?.tenant.plan_code || 'standard')
    || !sameJson(entitlements.feature_flags, detailsQuery.data?.tenant.feature_flags)
    || !sameJson(entitlements.limits, detailsQuery.data?.tenant.limits)
  );
  const supportPolicyDirty = Boolean(detailsQuery.data) && !sameJson(supportPolicy, {
    support_enabled: detailsQuery.data?.tenant.support_policy?.support_enabled !== false,
    require_ticket_reference: detailsQuery.data?.tenant.support_policy?.require_ticket_reference !== false,
    require_customer_consent: detailsQuery.data?.tenant.support_policy?.require_customer_consent === true,
    emergency_admin_requires_approval: detailsQuery.data?.tenant.support_policy?.emergency_admin_requires_approval !== false,
    max_duration_minutes: detailsQuery.data?.tenant.support_policy?.max_duration_minutes || 120,
    allowed_access_levels: detailsQuery.data?.tenant.support_policy?.allowed_access_levels || supportAccessLevels
  });
  const activeCount = tenantRows.filter((tenant) => tenant.status === 'active').length;
  const lockedCount = tenantRows.filter((tenant) => tenant.write_locked).length;
  const billingAttentionCount = tenantRows.filter((tenant) => ['past_due', 'cancelled', 'not_configured'].includes(tenant.billing_status || 'not_configured')).length;
  const initialListError = tenantsQuery.isError && !tenantsQuery.data;
  const refreshListError = tenantsQuery.isError && Boolean(tenantsQuery.data);
  const initialDetailError = detailsQuery.isError && !detailsQuery.data;
  const refreshDetailError = detailsQuery.isError && Boolean(detailsQuery.data);
  const mutationError = patchTenant.error || lock.error || unlock.error || exportTenant.error;

  const selectTenant = (tenantId: string) => {
    setFeedback(null);
    const next = new URLSearchParams(searchParams);
    next.set('tenant_id', tenantId);
    setSearchParams(next, { replace: true });
  };

  const clearTenant = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('tenant_id');
    setSearchParams(next, { replace: true });
  };

  const refreshTenants = async () => {
    setFeedback(null);
    await tenantsQuery.refetch();
    if (selected) await detailsQuery.refetch();
  };

  const handleStatusChange = (tenant: TenantRow, nextStatus: string) => {
    if (nextStatus === tenant.status) return;
    if (!window.confirm(`Change ${tenant.name} status from ${humanize(tenant.status)} to ${humanize(nextStatus)}?`)) return;
    patchTenant.mutate({ id: tenant.id, body: { status: nextStatus } });
  };

  const handleResetTenantUserPassword = (user: TenantUser) => {
    const password = window.prompt(`Enter a new password for ${user.email}. Minimum 10 characters. All existing sessions will be revoked.`);
    if (!password) return;
    if (password.length < 10) {
      setFeedback({ tone: 'warn', text: 'Password reset cancelled: the new password must be at least 10 characters.' });
      return;
    }
    resetTenantUserPassword.mutate({ userId: user.id, password });
  };

  const handleToggleTenantUserStatus = (user: TenantUser) => {
    const nextActive = user.is_active === false;
    const action = nextActive ? 'enable' : 'disable';
    const suffix = nextActive ? '' : ' Active sessions will be revoked immediately.';
    if (!window.confirm(`Are you sure you want to ${action} ${user.email}?${suffix}`)) return;
    setTenantUserStatus.mutate({ userId: user.id, isActive: nextActive });
  };

  const handleDeleteTenantUser = (user: TenantUser) => {
    if (!window.confirm(`Delete tenant user ${user.email}? This permanently removes the account and its sessions and cannot be undone.`)) return;
    deleteTenantUser.mutate(user.id);
  };

  const handleLockChange = (tenant: TenantRow) => {
    const nextLocked = !tenant.write_locked;
    const action = nextLocked ? 'enable the write lock for' : 'remove the write lock from';
    if (!window.confirm(`Are you sure you want to ${action} ${tenant.name}?`)) return;
    if (nextLocked) lock.mutate(tenant.id);
    else unlock.mutate(tenant.id);
  };

  return (
    <div className="io-operational-page io-workspace-page platform-tenants">
      <OperationalWorkspaceHero
        iconPath="/platform/tenants"
        eyebrow="Platform tenant administration"
        title="Tenants"
        description="Create and inspect tenant workspaces, manage operational status and entitlements, administer tenant users, control support access, export tenant evidence, and apply emergency write locks. Billing lifecycle changes remain on the dedicated Billing page."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Permission-gated writes</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Tenant isolation preserved</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-tenants__hero-aside">
            <OperationalWorkspaceStatus value={tenantsQuery.data ? tenantRows.length : '—'} label="tenant workspaces" />
            <div className="platform-tenants__refresh-block">
              <span>{selected ? `Selected: ${selectedTenantName}` : 'No tenant selected'}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void refreshTenants()} disabled={tenantsQuery.isFetching || detailsQuery.isFetching}>
                {tenantsQuery.isFetching || detailsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Tenant administration summary">
        <OperationalWorkspaceStatCard label="Total tenants" value={tenantRows.length} helper="All tenant records visible to this platform operator" loading={!tenantsQuery.data && tenantsQuery.isLoading} iconPath="/platform/tenants" />
        <OperationalWorkspaceStatCard label="Active" value={activeCount} helper="Tenant lifecycle status is active" tone="good" loading={!tenantsQuery.data && tenantsQuery.isLoading} iconPath="/platform/tenant-health" />
        <OperationalWorkspaceStatCard label="Write locked" value={lockedCount} helper="Tenant writes are blocked by platform lock" tone={lockedCount ? 'warn' : 'neutral'} loading={!tenantsQuery.data && tenantsQuery.isLoading} iconPath="/platform/security" />
        <OperationalWorkspaceStatCard label="Billing attention" value={billingAttentionCount} helper="Past due, cancelled, or not configured; manage on Billing" tone={billingAttentionCount ? 'warn' : 'neutral'} loading={!tenantsQuery.data && tenantsQuery.isLoading} iconPath="/platform/billing" />
      </OperationalWorkspaceStats>

      {feedback ? <section className={`platform-tenants__feedback platform-tenants__feedback--${feedback.tone}`} role="status">{feedback.text}</section> : null}
      {mutationError ? <section className="app-error-state platform-tenants__feedback" role="alert"><strong>Tenant action failed.</strong><span>{readableError(mutationError)}</span></section> : null}
      {invalidSelectedTenant ? <section className="app-error-state platform-tenants__feedback" role="alert"><strong>Invalid tenant selection.</strong><span>The tenant_id URL parameter is not a valid UUID. Choose a tenant from the registry.</span><button type="button" className="app-button app-button--secondary" onClick={clearTenant}>Clear selection</button></section> : null}

      {tenantsQuery.isLoading && !tenantsQuery.data ? <section className="app-panel app-panel--padded">Loading tenant registry…</section> : null}
      {initialListError ? <section className="app-error-state platform-tenants__feedback" role="alert"><strong>Unable to load tenant registry.</strong><span>{readableError(tenantsQuery.error)}</span><button type="button" className="app-button app-button--danger" onClick={() => void tenantsQuery.refetch()} disabled={tenantsQuery.isFetching}>{tenantsQuery.isFetching ? 'Retrying…' : 'Retry'}</button></section> : null}
      {refreshListError ? <section className="platform-tenants__feedback platform-tenants__feedback--warn" role="status"><strong>Showing the last successful tenant registry snapshot.</strong><span>{readableError(tenantsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void tenantsQuery.refetch()} disabled={tenantsQuery.isFetching}>{tenantsQuery.isFetching ? 'Retrying…' : 'Retry refresh'}</button></section> : null}

      {canCreate ? (
        <section className="app-panel app-panel--padded platform-tenants__section">
          <OperationalSectionHeader
            iconPath="/platform/provisioning"
            title="Create tenant"
            description="Provision a new isolated tenant from a published preset. The initial commercial plan and entitlements are applied from the plan catalog; billing lifecycle state is not editable here."
            actions={canReadProvisioningPresets ? <Link className="app-button app-button--secondary" to="/platform/provisioning-presets">Provisioning presets</Link> : undefined}
          />
          <div className="platform-tenants__form-grid">
            <label><span>Tenant name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label><span>Location</span><input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
            <label><span>Published preset</span><select value={form.preset} onChange={(event) => setForm({ ...form, preset: event.target.value })} disabled={!canReadProvisioningPresets || provisioningPresetsQuery.isLoading || !(provisioningPresetsQuery.data || []).length}><option value="">Select preset</option>{(provisioningPresetsQuery.data || []).map((preset) => <option key={preset.id} value={preset.key}>{preset.label} · v{preset.preset_version}</option>)}</select></label>
            <label><span>Commercial plan</span><select value={form.plan_code} onChange={(event) => setForm({ ...form, plan_code: event.target.value })}>{planOptions.map((plan) => <option key={plan.code} value={plan.code}>{plan.label} ({plan.code})</option>)}</select></label>
            <label><span>Inventory currency</span><input value={form.inventory_currency} onChange={(event) => setForm({ ...form, inventory_currency: event.target.value.toUpperCase().slice(0, 3) })} maxLength={3} pattern="[A-Za-z]{3}" /></label>
            <label><span>Initial admin email</span><input type="email" value={form.initial_admin_email} onChange={(event) => setForm({ ...form, initial_admin_email: event.target.value })} /></label>
            <label><span>Initial admin name</span><input value={form.initial_admin_name} onChange={(event) => setForm({ ...form, initial_admin_name: event.target.value })} /></label>
            <label><span>Initial admin password</span><input type="password" value={form.initial_admin_password} onChange={(event) => setForm({ ...form, initial_admin_password: event.target.value })} /></label>
            <label className="platform-tenants__checkbox"><input type="checkbox" checked={form.create_onboarding_tasks} onChange={(event) => setForm({ ...form, create_onboarding_tasks: event.target.checked })} /><span>Create customer onboarding tasks automatically</span></label>
          </div>
          {createTenantBlockedReason ? <div className="platform-tenants__inline-note">{createTenantBlockedReason}</div> : null}
          {provisioningPresetsQuery.isError && canReadProvisioningPresets ? <div className="platform-tenants__inline-error">{readableError(provisioningPresetsQuery.error)} <button type="button" className="app-button app-button--secondary" onClick={() => void provisioningPresetsQuery.refetch()}>Retry presets</button></div> : null}
          {createTenant.error ? <div className="platform-tenants__inline-error">{readableError(createTenant.error)}</div> : null}
          <div className="platform-tenants__action-row"><button type="button" className="app-button app-button--primary" onClick={() => createTenant.mutate()} disabled={!canSubmitTenant}>{createTenant.isPending ? 'Creating…' : 'Create tenant'}</button></div>
        </section>
      ) : null}

      {tenantsQuery.data ? (
        <section className="app-panel app-panel--padded platform-tenants__section">
          <OperationalSectionHeader iconPath="/platform/tenants" title="Tenant registry" description="Select a tenant for detail administration. Tenant lifecycle status and inventory currency are tenant-administration fields; billing status is displayed here but changed only through Billing." />
          <div className="platform-tenants__table-wrap">
            <table className="platform-tenants__table">
              <thead><tr><th>Tenant</th><th>Lifecycle</th><th>Billing</th><th>Plan</th><th>Inventory currency</th><th>Write lock</th><th>Actions</th></tr></thead>
              <tbody>
                {tenantRows.map((tenant) => {
                  const rowBusy = (patchTenant.isPending && patchTenant.variables?.id === tenant.id) || (lock.isPending && lock.variables === tenant.id) || (unlock.isPending && unlock.variables === tenant.id) || (exportTenant.isPending && exportTenant.variables === tenant.id);
                  return (
                    <tr key={tenant.id} data-selected={selected === tenant.id ? 'true' : 'false'}>
                      <td><button type="button" className="platform-tenants__tenant-button" onClick={() => selectTenant(tenant.id)}><strong>{tenant.name}</strong><span>{tenant.location || 'Location not set'}</span></button></td>
                      <td>{canUpdate ? <select value={tenant.status || 'active'} onChange={(event) => handleStatusChange(tenant, event.target.value)} disabled={rowBusy}><option value="trial">Trial</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="maintenance">Maintenance</option><option value="offboarding">Offboarding</option><option value="archived">Archived</option></select> : <span className="platform-tenants__badge" data-tone={badgeTone(tenant.status)}>{humanize(tenant.status)}</span>}</td>
                      <td><span className="platform-tenants__badge" data-tone={badgeTone(tenant.billing_status)}>{humanize(tenant.billing_status)}</span>{canReadBilling ? <Link className="platform-tenants__sub-link" to={`/platform/billing?tenant_id=${encodeURIComponent(tenant.id)}`}>Manage in Billing</Link> : null}</td>
                      <td>{tenant.plan_code || '—'}</td>
                      <td>{canUpdate ? <div className="platform-tenants__currency-cell"><input key={`${tenant.id}-${tenant.inventory_currency || DEFAULT_INVENTORY_CURRENCY}`} aria-label={`${tenant.name} inventory currency`} defaultValue={tenant.inventory_currency || DEFAULT_INVENTORY_CURRENCY} maxLength={3} disabled={rowBusy} onBlur={(event) => {
                        const current = (tenant.inventory_currency || DEFAULT_INVENTORY_CURRENCY).toUpperCase();
                        const next = event.currentTarget.value.trim().toUpperCase();
                        if (!/^[A-Z]{3}$/.test(next)) { event.currentTarget.value = current; setFeedback({ tone: 'warn', text: 'Inventory currency must be a 3-letter code.' }); return; }
                        if (next === current) return;
                        const legacyMessage = tenant.inventory_currency_configured_at
                          ? 'The backend will block this change once currency-dependent financial evidence exists.'
                          : 'This tenant has not confirmed its legacy inventory currency yet. This declares the currency of legacy monetary evidence and does not convert historical amounts.';
                        if (!window.confirm(`Change ${tenant.name} inventory currency from ${current} to ${next}? ${legacyMessage} No automatic FX conversion will be performed.`)) { event.currentTarget.value = current; return; }
                        patchTenant.mutate({ id: tenant.id, body: { inventory_currency: next } });
                      }} />{!tenant.inventory_currency_configured_at ? <small>Legacy currency not confirmed</small> : null}</div> : <div className="platform-tenants__currency-cell"><span>{tenant.inventory_currency || DEFAULT_INVENTORY_CURRENCY}</span>{!tenant.inventory_currency_configured_at ? <small>Legacy currency not confirmed</small> : null}</div>}</td>
                      <td><span className="platform-tenants__badge" data-tone={tenant.write_locked ? 'warn' : 'good'}>{tenant.write_locked ? 'Locked' : 'Open'}</span></td>
                      <td><div className="platform-tenants__action-row">{tenant.write_locked ? (canUnlock ? <button type="button" className="app-button app-button--secondary" onClick={() => handleLockChange(tenant)} disabled={rowBusy}>{unlock.isPending && unlock.variables === tenant.id ? 'Unlocking…' : 'Unlock'}</button> : null) : (canLock ? <button type="button" className="app-button app-button--secondary" onClick={() => handleLockChange(tenant)} disabled={rowBusy}>{lock.isPending && lock.variables === tenant.id ? 'Locking…' : 'Lock'}</button> : null)}{canExport ? <button type="button" className="app-button app-button--secondary" onClick={() => exportTenant.mutate(tenant.id)} disabled={rowBusy}>{exportTenant.isPending && exportTenant.variables === tenant.id ? 'Exporting…' : 'Export'}</button> : null}</div></td>
                    </tr>
                  );
                })}
                {!tenantRows.length ? <tr><td colSpan={7}><div className="platform-tenants__empty"><strong>No tenants found.</strong><span>Create the first tenant when provisioning is ready and you have Tenant Create permission.</span></div></td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {selected ? (
        <section className="app-panel app-panel--padded platform-tenants__section">
          <OperationalSectionHeader
            iconPath="/platform/tenants"
            title={selectedTenantName}
            description="Selected tenant detail is isolated to this tenant ID. User, entitlement and support-policy writes are available only with Tenant Update permission."
            actions={<button type="button" className="app-button app-button--secondary" onClick={clearTenant}>Close detail</button>}
          />
          {detailsQuery.isLoading && !detailsQuery.data ? <div className="platform-tenants__loading">Loading tenant detail…</div> : null}
          {initialDetailError ? <div className="app-error-state platform-tenants__feedback" role="alert"><strong>Unable to load tenant detail.</strong><span>{readableError(detailsQuery.error)}</span><button type="button" className="app-button app-button--danger" onClick={() => void detailsQuery.refetch()} disabled={detailsQuery.isFetching}>{detailsQuery.isFetching ? 'Retrying…' : 'Retry tenant detail'}</button></div> : null}
          {refreshDetailError ? <div className="platform-tenants__feedback platform-tenants__feedback--warn" role="status"><strong>Showing the last successful tenant detail snapshot.</strong><span>{readableError(detailsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void detailsQuery.refetch()} disabled={detailsQuery.isFetching}>{detailsQuery.isFetching ? 'Retrying…' : 'Retry refresh'}</button></div> : null}

          {detailsQuery.data ? <>
            <div className="platform-tenants__detail-summary">
              <div><strong>Lifecycle</strong><span>{humanize(detailsQuery.data.tenant.status)}</span></div>
              <div><strong>Billing</strong><span>{humanize(detailsQuery.data.tenant.billing_status)} {canReadBilling ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(selected)}`}>Open Billing</Link> : null}</span></div>
              <div><strong>Plan</strong><span>{detailsQuery.data.tenant.plan_code || 'Not set'}</span></div>
              <div><strong>Support sessions</strong><span>{detailsQuery.data.support_sessions.active_count} active / {detailsQuery.data.support_sessions.total_count} total</span></div>
            </div>

            <div className="platform-tenants__subsection">
              <OperationalSectionHeader iconPath="/platform/tenant-health" title="Usage and limits" description="Current tenant usage compared with configured commercial limits." />
              <div className="platform-tenants__usage-grid">{Object.entries(detailsQuery.data.usage).map(([key, value]) => <div key={key}><span>{humanize(key)}</span><strong>{value}</strong></div>)}</div>
              <div className="platform-tenants__usage-grid">{Object.entries(detailsQuery.data.limit_status || {}).map(([key, value]) => <div key={key}><span>{humanize(key)}</span><strong>{value.used} / {value.limit ?? 'unlimited'}</strong></div>)}</div>
            </div>

            <div className="platform-tenants__subsection">
              <OperationalSectionHeader iconPath="/users" title="Tenant users" description="Platform-side tenant account administration. Password reset and account disable immediately revoke existing tenant sessions." />
              <div className="platform-tenants__table-wrap"><table className="platform-tenants__table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th>{canUpdate ? <th>Actions</th> : null}</tr></thead><tbody>{tenantUsers.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{humanize(user.role)}</td><td><span className="platform-tenants__badge" data-tone={user.is_active === false ? 'neutral' : 'good'}>{user.is_active === false ? 'Disabled' : 'Active'}</span></td><td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td>{canUpdate ? <td><div className="platform-tenants__action-row"><button type="button" className="app-button app-button--secondary" onClick={() => handleResetTenantUserPassword(user)} disabled={tenantUserActionPending}>Reset password</button><button type="button" className="app-button app-button--secondary" onClick={() => handleToggleTenantUserStatus(user)} disabled={tenantUserActionPending}>{user.is_active === false ? 'Enable' : 'Disable'}</button><button type="button" className="app-button app-button--danger" onClick={() => handleDeleteTenantUser(user)} disabled={tenantUserActionPending}>Delete</button></div></td> : null}</tr>)}{!tenantUsers.length ? <tr><td colSpan={canUpdate ? 6 : 5}><div className="platform-tenants__empty"><strong>No tenant users found.</strong><span>Create an initial tenant administrator before handing the workspace to the customer.</span></div></td></tr> : null}</tbody></table></div>
              {canUpdate ? <div className="platform-tenants__admin-box"><strong>Create or reset tenant user</strong><span>If the email already exists in this tenant, this operation updates the name/role/password, re-enables the account, and revokes existing sessions.</span><div className="platform-tenants__form-grid platform-tenants__form-grid--compact"><label><span>Email</span><input type="email" value={tenantUserForm.email} onChange={(event) => setTenantUserForm({ ...tenantUserForm, email: event.target.value })} /></label><label><span>Name</span><input value={tenantUserForm.name} onChange={(event) => setTenantUserForm({ ...tenantUserForm, name: event.target.value })} /></label><label><span>Role</span><select value={tenantUserForm.role} onChange={(event) => setTenantUserForm({ ...tenantUserForm, role: event.target.value as TenantRole })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option></select></label><label><span>Temporary password</span><input type="password" value={tenantUserForm.password} onChange={(event) => setTenantUserForm({ ...tenantUserForm, password: event.target.value })} /></label></div>{tenantUserBlockedReason ? <small>{tenantUserBlockedReason}</small> : null}<button type="button" className="app-button app-button--primary" onClick={() => saveTenantUser.mutate()} disabled={saveTenantUser.isPending || Boolean(tenantUserBlockedReason)}>{saveTenantUser.isPending ? 'Saving…' : 'Create or reset user'}</button></div> : null}
              {saveTenantUser.error || resetTenantUserPassword.error || setTenantUserStatus.error || deleteTenantUser.error ? <div className="platform-tenants__inline-error">{readableError(saveTenantUser.error || resetTenantUserPassword.error || setTenantUserStatus.error || deleteTenantUser.error)}</div> : null}
            </div>

            {canUpdate ? <div className="platform-tenants__subsection"><OperationalSectionHeader iconPath="/platform/license-plan-enforcement" title="Entitlements" description="Plan changes apply the commercial plan catalog defaults; explicit feature flags and limits are tenant entitlement controls." />
              <div className="platform-tenants__form-grid platform-tenants__form-grid--compact"><label><span>Plan</span><select value={entitlements.plan_code} onChange={(event) => setEntitlements({ ...entitlements, plan_code: event.target.value })}>{planOptions.map((plan) => <option key={plan.code} value={plan.code}>{plan.label} ({plan.code}) · {plan.description}</option>)}</select></label>{defaultLimitKeys.map((key) => <label key={key}><span>{humanize(key)}</span><input type="number" min={0} value={String(entitlements.limits[key] ?? '')} placeholder="Unlimited" onChange={(event) => setEntitlements({ ...entitlements, limits: { ...entitlements.limits, [key]: event.target.value === '' ? null : Number(event.target.value) } })} /></label>)}</div>
              <div className="platform-tenants__checkbox-grid">{featureFlagKeys.map((key) => <label key={key} className="platform-tenants__checkbox"><input type="checkbox" checked={asBoolean(entitlements.feature_flags[key])} onChange={(event) => setEntitlements({ ...entitlements, feature_flags: { ...entitlements.feature_flags, [key]: event.target.checked } })} /><span>{humanize(key)}</span></label>)}</div>
              <div className="platform-tenants__action-row"><button type="button" className="app-button app-button--primary" onClick={() => saveEntitlements.mutate()} disabled={saveEntitlements.isPending || !entitlementsDirty}>{saveEntitlements.isPending ? 'Saving…' : 'Save entitlements'}</button><span className="platform-tenants__muted">{entitlementsDirty ? 'Unsaved entitlement changes.' : 'No entitlement changes.'}</span></div>{saveEntitlements.error ? <div className="platform-tenants__inline-error">{readableError(saveEntitlements.error)}</div> : null}
            </div> : null}

            {canUpdate ? <div className="platform-tenants__subsection"><OperationalSectionHeader iconPath="/platform/support-operations-cockpit" title="Support access policy" description="Controls how platform support sessions may enter this tenant. These rules are enforced when a support session starts." />
              <div className="platform-tenants__checkbox-grid"><label className="platform-tenants__checkbox"><input type="checkbox" checked={supportPolicy.support_enabled !== false} onChange={(event) => setSupportPolicy({ ...supportPolicy, support_enabled: event.target.checked })} /><span>Support access enabled</span></label><label className="platform-tenants__checkbox"><input type="checkbox" checked={supportPolicy.require_ticket_reference !== false} onChange={(event) => setSupportPolicy({ ...supportPolicy, require_ticket_reference: event.target.checked })} /><span>Require ticket/reference</span></label><label className="platform-tenants__checkbox"><input type="checkbox" checked={supportPolicy.require_customer_consent === true} onChange={(event) => setSupportPolicy({ ...supportPolicy, require_customer_consent: event.target.checked })} /><span>Require customer consent note</span></label><label className="platform-tenants__checkbox"><input type="checkbox" checked={supportPolicy.emergency_admin_requires_approval !== false} onChange={(event) => setSupportPolicy({ ...supportPolicy, emergency_admin_requires_approval: event.target.checked })} /><span>Emergency admin requires approval</span></label></div>
              <div className="platform-tenants__form-grid platform-tenants__form-grid--compact"><label><span>Max support duration, minutes</span><input type="number" min={15} max={480} value={supportPolicy.max_duration_minutes || 120} onChange={(event) => setSupportPolicy({ ...supportPolicy, max_duration_minutes: Number(event.target.value) })} /></label></div>
              <div className="platform-tenants__checkbox-grid">{supportAccessLevels.map((level) => { const selectedLevels = supportPolicy.allowed_access_levels || supportAccessLevels; const checked = selectedLevels.includes(level); return <label key={level} className="platform-tenants__checkbox"><input type="checkbox" checked={checked} onChange={(event) => { const next = event.target.checked ? Array.from(new Set([...selectedLevels, level])) : selectedLevels.filter((item) => item !== level); setSupportPolicy({ ...supportPolicy, allowed_access_levels: next.length ? next : [level] }); }} /><span>Allow {humanize(level)}</span></label>; })}</div>
              <div className="platform-tenants__action-row"><button type="button" className="app-button app-button--primary" onClick={() => saveSupportPolicy.mutate()} disabled={saveSupportPolicy.isPending || !supportPolicyDirty}>{saveSupportPolicy.isPending ? 'Saving…' : 'Save support policy'}</button><span className="platform-tenants__muted">{supportPolicyDirty ? 'Unsaved support-policy changes.' : 'No support-policy changes.'}</span></div>{saveSupportPolicy.error ? <div className="platform-tenants__inline-error">{readableError(saveSupportPolicy.error)}</div> : null}
            </div> : null}

            <div className="platform-tenants__subsection"><OperationalSectionHeader iconPath="/platform/tenant-timeline" title="Supporting tenant operations" description="Open related platform pages with the selected tenant carried in the URL where supported." /><div className="platform-tenants__link-row"><Link to={`/platform/tenant-health?tenant_id=${encodeURIComponent(selected)}`}>Tenant health</Link><Link to={`/platform/tenant-lifecycle?tenant_id=${encodeURIComponent(selected)}`}>Lifecycle</Link><Link to={`/platform/tenant-contacts?tenant_id=${encodeURIComponent(selected)}`}>Contacts</Link><Link to={`/platform/tenant-tasks?tenant_id=${encodeURIComponent(selected)}`}>Tasks</Link>{canReadBilling ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(selected)}`}>Billing</Link> : null}{canExport ? <Link to={`/platform/tenant-exports?tenant_id=${encodeURIComponent(selected)}`}>Tenant exports</Link> : null}</div></div>
          </> : null}
        </section>
      ) : null}
    </div>
  );
}
