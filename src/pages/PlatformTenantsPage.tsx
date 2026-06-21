import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

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

type TenantRow = {
  id: string;
  name: string;
  location?: string | null;
  write_locked?: boolean;
  organization_type?: string | null;
  status?: string;
  billing_status?: string;
  plan_code?: string;
};
type LimitStatus = { used: number; limit: number | null };
type TenantUser = { id: string; email: string; name: string; role: 'admin' | 'manager' | 'staff'; is_active?: boolean; created_at?: string; last_login_at?: string | null };
type TenantDetails = {
  tenant: TenantRow & { feature_flags?: FeatureFlags; limits?: TenantLimits; support_policy?: SupportPolicy };
  usage: Record<string, number>;
  limit_status?: Record<string, LimitStatus>;
  support_sessions: { total_count: number; active_count: number };
  users?: TenantUser[];
};

const planOptions = [
  { code: 'starter', label: 'Starter', description: 'Basic tenant package' },
  { code: 'standard', label: 'Standard', description: 'Commercial tenant package' },
  { code: 'enterprise', label: 'Enterprise', description: 'Full tenant package with automation' }
];
const knownFeatureFlags = ['inventory', 'procurement', 'forecasting', 'automation', 'scanner', 'reports', 'support_access', 'requisitions', 'purchase_orders', 'sso', 'api_access', 'advanced_integrations'];
const defaultLimitKeys = ['max_users', 'max_products', 'max_storage_locations'];
const supportAccessLevels = ['read_only', 'inventory_support', 'procurement_support', 'emergency_admin'];

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    location: '',
    preset: 'hotel',
    plan_code: 'standard',
    initial_admin_email: '',
    initial_admin_name: '',
    initial_admin_password: '',
    create_onboarding_tasks: true
  });
  const [entitlements, setEntitlements] = useState({
    plan_code: 'standard',
    feature_flags: {} as FeatureFlags,
    limits: {} as TenantLimits
  });
  const [tenantUserForm, setTenantUserForm] = useState({
    email: '',
    name: '',
    role: 'admin',
    password: ''
  });
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

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants')
  });

  const detailsQuery = useQuery({
    queryKey: ['platform', 'tenants', selected],
    queryFn: () => platformApiRequest<TenantDetails>(`/platform/tenants/${selected}`),
    enabled: Boolean(selected)
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

  const featureFlagKeys = useMemo(() => {
    const currentKeys = Object.keys(entitlements.feature_flags || {});
    return Array.from(new Set([...knownFeatureFlags, ...currentKeys]));
  }, [entitlements.feature_flags]);

  const createTenant = useMutation({
    mutationFn: () => platformApiRequest('/platform/tenants', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        location: form.location,
        preset: form.preset,
        plan_code: form.plan_code,
        initial_admin: form.initial_admin_email ? {
          email: form.initial_admin_email,
          name: form.initial_admin_name,
          password: form.initial_admin_password
        } : undefined,
        create_onboarding_tasks: form.create_onboarding_tasks
      })
    }),
    onSuccess: async () => {
      setForm({
        name: '',
        location: '',
        preset: 'hotel',
        plan_code: 'standard',
        initial_admin_email: '',
        initial_admin_name: '',
        initial_admin_password: '',
        create_onboarding_tasks: true
      });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    }
  });

  const patchTenant = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => platformApiRequest(`/platform/tenants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', selected] });
    }
  });

  const saveTenantUser = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenants/${selected}/users`, {
      method: 'POST',
      body: JSON.stringify(tenantUserForm)
    }),
    onSuccess: async () => {
      setTenantUserForm({ email: '', name: '', role: 'admin', password: '' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', selected] });
    }
  });

  const saveEntitlements = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenants/${selected}/entitlements`, {
      method: 'PATCH',
      body: JSON.stringify(entitlements)
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', selected] });
    }
  });

  
  const saveSupportPolicy = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenants/${selected}/support-policy`, {
      method: 'PATCH',
      body: JSON.stringify(supportPolicy)
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', selected] });
    }
  });

const lock = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenants/${id}/lock`, { method: 'POST' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
  });

  const unlock = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenants/${id}/unlock`, { method: 'POST' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] })
  });

  const exportTenant = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenants/${id}/export`),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tenant-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  });

  const selectedTenantName = detailsQuery.data?.tenant.name || 'Tenant detail';

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Tenants</h1>
        <p style={styles.subtitle}>Create, inspect, lock, lifecycle-manage, export, and control tenant entitlements.</p>
      </header>

      {canCreate ? (
        <section style={styles.panel}>
          <h2>Create tenant</h2>
          <div style={styles.form}>
            <input style={styles.input} placeholder="Tenant name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input style={styles.input} placeholder="Location" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            <select style={styles.input} value={form.preset} onChange={(event) => setForm({ ...form, preset: event.target.value })}>
              <option>hotel</option>
              <option>restaurant</option>
              <option>warehouse</option>
              <option>facility</option>
            </select>
            <select
              style={styles.input}
              value={form.plan_code}
              onChange={(event) => setForm({ ...form, plan_code: event.target.value })}
              aria-label="Tenant plan"
            >
              {planOptions.map((plan) => (
                <option key={plan.code} value={plan.code}>{plan.label} ({plan.code})</option>
              ))}
            </select>
            <input style={styles.input} placeholder="Initial admin email" value={form.initial_admin_email} onChange={(event) => setForm({ ...form, initial_admin_email: event.target.value })} />
            <input style={styles.input} placeholder="Initial admin name" value={form.initial_admin_name} onChange={(event) => setForm({ ...form, initial_admin_name: event.target.value })} />
            <input style={styles.input} type="password" placeholder="Initial admin password" value={form.initial_admin_password} onChange={(event) => setForm({ ...form, initial_admin_password: event.target.value })} />
            <label style={styles.checkboxLabel}>
              <input type="checkbox" checked={form.create_onboarding_tasks} onChange={(event) => setForm({ ...form, create_onboarding_tasks: event.target.checked })} />
              Create customer onboarding tasks automatically
            </label>
            <button style={styles.button} onClick={() => createTenant.mutate()} disabled={createTenant.isPending}>Create tenant</button>
          </div>
          {createTenant.error ? <div style={styles.error}>{readableError(createTenant.error)}</div> : null}
        </section>
      ) : null}

      {tenantsQuery.error ? <div style={styles.error}>{readableError(tenantsQuery.error)}</div> : null}

      <section style={styles.panel}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Billing</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Lock</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tenantsQuery.data || []).map((tenant) => (
              <tr key={tenant.id}>
                <td style={styles.td}><button style={styles.linkButton} onClick={() => setSelected(tenant.id)}>{tenant.name}</button></td>
                <td style={styles.td}>{tenant.location || '-'}</td>
                <td style={styles.td}>{canUpdate ? <select value={tenant.status || 'active'} onChange={(event) => patchTenant.mutate({ id: tenant.id, body: { status: event.target.value } })}><option>trial</option><option>active</option><option>suspended</option><option>maintenance</option><option>offboarding</option><option>archived</option></select> : tenant.status}</td>
                <td style={styles.td}>{canUpdate ? <select value={tenant.billing_status || 'not_configured'} onChange={(event) => patchTenant.mutate({ id: tenant.id, body: { billing_status: event.target.value } })}><option>not_configured</option><option>trialing</option><option>active</option><option>past_due</option><option>cancelled</option><option>comped</option></select> : tenant.billing_status}</td>
                <td style={styles.td}>{tenant.plan_code || '-'}</td>
                <td style={styles.td}>{tenant.write_locked ? 'Locked' : 'Open'}</td>
                <td style={styles.td}>
                  {tenant.write_locked ? (canUnlock ? <button style={styles.button} onClick={() => unlock.mutate(tenant.id)}>Unlock</button> : null) : (canLock ? <button style={styles.button} onClick={() => lock.mutate(tenant.id)}>Lock</button> : null)}{' '}
                  {canExport ? <button style={styles.button} onClick={() => exportTenant.mutate(tenant.id)}>Export</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selected ? (
        <section style={styles.panel}>
          <h2>{selectedTenantName}</h2>
          {detailsQuery.isLoading ? 'Loading…' : detailsQuery.data ? (
            <>
              <div style={styles.grid}>
                {Object.entries(detailsQuery.data.usage).map(([key, value]) => <div key={key} style={styles.card}><span>{key}</span><b>{value}</b></div>)}
              </div>

              <h3>Limit usage</h3>
              <div style={styles.grid}>
                {Object.entries(detailsQuery.data.limit_status || {}).map(([key, value]) => (
                  <div key={key} style={styles.card}>
                    <span>{key}</span>
                    <b>{value.used} / {value.limit ?? 'unlimited'}</b>
                  </div>
                ))}
              </div>

              <div style={styles.entitlements}>
                <h3>Tenant users</h3>
                <p style={styles.note}>Platform bootstrap tool for creating the first tenant admin or resetting an existing tenant user password. Existing matching email inside this tenant is updated instead of duplicated.</p>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Active</th>
                      <th style={styles.th}>Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailsQuery.data.users || []).map((user) => (
                      <tr key={user.id}>
                        <td style={styles.td}>{user.name}</td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>{user.role}</td>
                        <td style={styles.td}>{user.is_active === false ? 'No' : 'Yes'}</td>
                        <td style={styles.td}>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td>
                      </tr>
                    ))}
                    {!(detailsQuery.data.users || []).length ? (
                      <tr><td style={styles.td} colSpan={5}>No tenant users found.</td></tr>
                    ) : null}
                  </tbody>
                </table>

                {canUpdate ? (
                  <div style={styles.form}>
                    <input style={styles.input} placeholder="User email" value={tenantUserForm.email} onChange={(event) => setTenantUserForm({ ...tenantUserForm, email: event.target.value })} />
                    <input style={styles.input} placeholder="Name" value={tenantUserForm.name} onChange={(event) => setTenantUserForm({ ...tenantUserForm, name: event.target.value })} />
                    <select style={styles.input} value={tenantUserForm.role} onChange={(event) => setTenantUserForm({ ...tenantUserForm, role: event.target.value })}>
                      <option value="admin">admin</option>
                      <option value="manager">manager</option>
                      <option value="staff">staff</option>
                    </select>
                    <input style={styles.input} type="password" placeholder="Password" value={tenantUserForm.password} onChange={(event) => setTenantUserForm({ ...tenantUserForm, password: event.target.value })} />
                    <button style={styles.button} onClick={() => saveTenantUser.mutate()} disabled={saveTenantUser.isPending || !selected}>Create/reset tenant user</button>
                  </div>
                ) : null}
                {saveTenantUser.error ? <div style={styles.error}>{readableError(saveTenantUser.error)}</div> : null}
              </div>


              {canUpdate ? (
                <div style={styles.entitlements}>
                  <h3>Entitlements</h3>
                  <label style={styles.label}>Plan
                    <select
                      style={styles.input}
                      value={entitlements.plan_code}
                      onChange={(event) => setEntitlements({ ...entitlements, plan_code: event.target.value })}
                    >
                      {planOptions.map((plan) => (
                        <option key={plan.code} value={plan.code}>{plan.label} ({plan.code}) · {plan.description}</option>
                      ))}
                    </select>
                  </label>
                  <p style={styles.note}>Changing the plan applies backend plan defaults when you save entitlements. Enterprise enables automation by default.</p>

                  <div style={styles.checkboxGrid}>
                    {featureFlagKeys.map((key) => (
                      <label key={key} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={asBoolean(entitlements.feature_flags[key])}
                          onChange={(event) => setEntitlements({
                            ...entitlements,
                            feature_flags: { ...entitlements.feature_flags, [key]: event.target.checked }
                          })}
                        />
                        {key}
                      </label>
                    ))}
                  </div>

                  <div style={styles.form}>
                    {defaultLimitKeys.map((key) => (
                      <label key={key} style={styles.label}>{key}
                        <input
                          style={styles.input}
                          type="number"
                          min={0}
                          value={String(entitlements.limits[key] ?? '')}
                          placeholder="Unlimited"
                          onChange={(event) => setEntitlements({
                            ...entitlements,
                            limits: { ...entitlements.limits, [key]: event.target.value === '' ? null : Number(event.target.value) }
                          })}
                        />
                      </label>
                    ))}
                  </div>

                  <button style={styles.button} onClick={() => saveEntitlements.mutate()} disabled={saveEntitlements.isPending}>Save entitlements</button>
                  {saveEntitlements.error ? <div style={styles.error}>{readableError(saveEntitlements.error)}</div> : null}
                </div>
              ) : null}


              {canUpdate ? (
                <div style={styles.entitlements}>
                  <h3>Support access policy</h3>
                  <p style={styles.note}>Controls how HLA/platform staff may enter this tenant for support. These rules are enforced when a support session is started.</p>
                  <div style={styles.checkboxGrid}>
                    <label style={styles.checkboxLabel}><input type="checkbox" checked={supportPolicy.support_enabled !== false} onChange={(event) => setSupportPolicy({ ...supportPolicy, support_enabled: event.target.checked })} /> Support access enabled</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" checked={supportPolicy.require_ticket_reference !== false} onChange={(event) => setSupportPolicy({ ...supportPolicy, require_ticket_reference: event.target.checked })} /> Require ticket/reference</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" checked={supportPolicy.require_customer_consent === true} onChange={(event) => setSupportPolicy({ ...supportPolicy, require_customer_consent: event.target.checked })} /> Require customer consent note</label>
                    <label style={styles.checkboxLabel}><input type="checkbox" checked={supportPolicy.emergency_admin_requires_approval !== false} onChange={(event) => setSupportPolicy({ ...supportPolicy, emergency_admin_requires_approval: event.target.checked })} /> Emergency admin requires approval</label>
                  </div>

                  <label style={styles.label}>Max support duration, minutes
                    <input
                      style={styles.input}
                      type="number"
                      min={15}
                      max={480}
                      value={supportPolicy.max_duration_minutes || 120}
                      onChange={(event) => setSupportPolicy({ ...supportPolicy, max_duration_minutes: Number(event.target.value) })}
                    />
                  </label>

                  <div style={styles.checkboxGrid}>
                    {supportAccessLevels.map((level) => {
                      const selectedLevels = supportPolicy.allowed_access_levels || supportAccessLevels;
                      const checked = selectedLevels.includes(level);
                      return (
                        <label key={level} style={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? Array.from(new Set([...selectedLevels, level]))
                                : selectedLevels.filter((item) => item !== level);
                              setSupportPolicy({ ...supportPolicy, allowed_access_levels: next.length ? next : [level] });
                            }}
                          />
                          Allow {level}
                        </label>
                      );
                    })}
                  </div>

                  <button style={styles.button} onClick={() => saveSupportPolicy.mutate()} disabled={saveSupportPolicy.isPending}>Save support policy</button>
                  {saveSupportPolicy.error ? <div style={styles.error}>{readableError(saveSupportPolicy.error)}</div> : null}
                </div>
              ) : null}

              <pre style={styles.pre}>{JSON.stringify({
                feature_flags: detailsQuery.data.tenant.feature_flags,
                limits: detailsQuery.data.tenant.limits,
                support_sessions: detailsQuery.data.support_sessions,
                support_policy: detailsQuery.data.tenant.support_policy
              }, null, 2)}</pre>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  title: { margin: 0, fontSize: 30 },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', overflowX: 'auto' },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 },
  input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 },
  button: { padding: '8px 10px', borderRadius: 10, border: '1px solid #d1d5db', cursor: 'pointer' },
  linkButton: { background: 'none', border: 0, color: '#2563eb', cursor: 'pointer', padding: 0 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 10, color: '#6b7280', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, marginTop: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginTop: 12 },
  card: { background: '#f9fafb', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 },
  pre: { background: '#111827', color: '#fff', borderRadius: 12, padding: 12, overflowX: 'auto' },
  entitlements: { marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600 },
  checkboxGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 },
  checkboxLabel: { display: 'flex', gap: 8, alignItems: 'center', background: '#f9fafb', borderRadius: 10, padding: 10 },
  note: { color: '#6b7280', marginTop: 0 }
};
