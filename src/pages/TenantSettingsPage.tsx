import type { CSSProperties, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import {
  TENANT_PERMISSIONS,
  getCurrentUserRole,
  hasPermission
} from '../lib/permissions';
import {
  DEFAULT_INVENTORY_CURRENCY,
  normalizeCurrencyCode,
  setActiveTenantCurrency
} from '../lib/tenantCurrency';

type TenantSettingsRow = {
  id: string;
  name: string;
  location?: string | null;
  season_start?: string | null;
  season_end?: string | null;
  organization_type?: string | null;
  legal_name?: string | null;
  business_address?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  tax_id?: string | null;
  default_purchase_order_payment_terms?: string | null;
  require_separate_purchase_order_approver?: boolean | null;
  inventory_currency?: string | null;
  inventory_currency_configured_at?: string | null;
  write_locked?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type TenantSettingsFormState = {
  name: string;
  location: string;
  season_start: string;
  season_end: string;
  organization_type: string;
  legal_name: string;
  business_address: string;
  business_email: string;
  business_phone: string;
  tax_id: string;
  default_purchase_order_payment_terms: string;
  require_separate_purchase_order_approver: boolean;
  inventory_currency: string;
};

type TenantPayload = {
  name: string;
  location: string | null;
  season_start: string | null;
  season_end: string | null;
  organization_type: string;
  legal_name: string | null;
  business_address: string | null;
  business_email: string | null;
  business_phone: string | null;
  tax_id: string | null;
  default_purchase_order_payment_terms: string | null;
  require_separate_purchase_order_approver: boolean;
  inventory_currency: string;
  confirm_inventory_currency: boolean;
};

const emptyFormState: TenantSettingsFormState = {
  name: '',
  location: '',
  season_start: '',
  season_end: '',
  organization_type: 'facility',
  legal_name: '',
  business_address: '',
  business_email: '',
  business_phone: '',
  tax_id: '',
  default_purchase_order_payment_terms: '',
  require_separate_purchase_order_approver: true,
  inventory_currency: DEFAULT_INVENTORY_CURRENCY
};

const INVENTORY_CURRENCY_HELP =
  'This is the tenant base currency used for product standard costs, inventory valuation, and tenant-base cost analytics. Supplier prices, invoices, and purchase orders can keep their own explicit currencies. The application does not automatically convert foreign exchange.';

const LEGACY_CURRENCY_HELP =
  'This tenant existed before currency tracking. Correct the displayed code first if needed, then confirm the currency that existing inventory standard costs already use. Changing the code also counts as confirmation. After confirmation, a later currency change is blocked once currency-dependent financial evidence exists so historical amounts are never silently relabelled or converted.';

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatTimestamp(value: string | number | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function createFormState(tenant: TenantSettingsRow | null): TenantSettingsFormState {
  if (!tenant) return emptyFormState;

  return {
    name: tenant.name ?? '',
    location: tenant.location ?? '',
    season_start: normalizeDateInput(tenant.season_start),
    season_end: normalizeDateInput(tenant.season_end),
    organization_type: tenant.organization_type ?? 'facility',
    legal_name: tenant.legal_name ?? '',
    business_address: tenant.business_address ?? '',
    business_email: tenant.business_email ?? '',
    business_phone: tenant.business_phone ?? '',
    tax_id: tenant.tax_id ?? '',
    default_purchase_order_payment_terms: tenant.default_purchase_order_payment_terms ?? '',
    require_separate_purchase_order_approver: tenant.require_separate_purchase_order_approver !== false,
    inventory_currency: normalizeCurrencyCode(tenant.inventory_currency)
  };
}

function buildPayload(formState: TenantSettingsFormState, confirmInventoryCurrency: boolean): TenantPayload {
  return {
    name: formState.name.trim(),
    location: formState.location.trim() || null,
    season_start: formState.season_start || null,
    season_end: formState.season_end || null,
    organization_type: formState.organization_type.trim() || 'facility',
    legal_name: formState.legal_name.trim() || null,
    business_address: formState.business_address.trim() || null,
    business_email: formState.business_email.trim() || null,
    business_phone: formState.business_phone.trim() || null,
    tax_id: formState.tax_id.trim() || null,
    default_purchase_order_payment_terms: formState.default_purchase_order_payment_terms.trim() || null,
    require_separate_purchase_order_approver: formState.require_separate_purchase_order_approver,
    inventory_currency: formState.inventory_currency.trim().toUpperCase(),
    confirm_inventory_currency: confirmInventoryCurrency
  };
}

function sameFormState(left: TenantSettingsFormState, right: TenantSettingsFormState): boolean {
  return left.name === right.name
    && left.location === right.location
    && left.season_start === right.season_start
    && left.season_end === right.season_end
    && left.organization_type === right.organization_type
    && left.legal_name === right.legal_name
    && left.business_address === right.business_address
    && left.business_email === right.business_email
    && left.business_phone === right.business_phone
    && left.tax_id === right.tax_id
    && left.default_purchase_order_payment_terms === right.default_purchase_order_payment_terms
    && left.require_separate_purchase_order_approver === right.require_separate_purchase_order_approver
    && left.inventory_currency === right.inventory_currency;
}

async function fetchTenants(): Promise<TenantSettingsRow[]> {
  return apiRequest<TenantSettingsRow[]>('/tenants');
}

async function updateTenant(input: {
  tenantId: string;
  payload: TenantPayload;
}): Promise<TenantSettingsRow> {
  return apiRequest<TenantSettingsRow>(`/tenants/${input.tenantId}`, {
    method: 'PUT',
    body: JSON.stringify(input.payload)
  });
}

export default function TenantSettingsPage() {
  const queryClient = useQueryClient();
  const role = getCurrentUserRole();
  const canReadTenants = hasPermission(TENANT_PERMISSIONS.TENANT_READ, role);
  const canUpdateTenants = hasPermission(TENANT_PERMISSIONS.TENANT_UPDATE, role);

  const [formState, setFormState] = useState<TenantSettingsFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmInventoryCurrency, setConfirmInventoryCurrency] = useState(false);

  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: fetchTenants,
    enabled: canReadTenants,
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const currentTenant = tenantsQuery.data?.[0] ?? null;
  const latestFormState = useMemo(() => createFormState(currentTenant), [currentTenant]);

  const dateRangeInvalid = Boolean(
    formState.season_start
    && formState.season_end
    && formState.season_start > formState.season_end
  );
  const currencyCodeValid = /^[A-Z]{3}$/.test(formState.inventory_currency.trim().toUpperCase());
  const formValid = Boolean(
    formState.name.trim()
    && formState.name.trim().length <= 160
    && formState.location.trim().length <= 255
    && formState.organization_type.trim()
    && formState.organization_type.trim().length <= 80
    && formState.legal_name.trim().length <= 255
    && formState.business_address.trim().length <= 2000
    && formState.business_email.trim().length <= 255
    && (!formState.business_email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.business_email.trim()))
    && formState.business_phone.trim().length <= 100
    && formState.tax_id.trim().length <= 100
    && formState.default_purchase_order_payment_terms.trim().length <= 1000
    && currencyCodeValid
    && !dateRangeInvalid
  );
  const isDirty = Boolean(
    currentTenant
    && (!sameFormState(formState, latestFormState) || confirmInventoryCurrency)
  );

  useEffect(() => {
    if (!currentTenant) {
      setFormState(emptyFormState);
      setConfirmInventoryCurrency(false);
      return;
    }

    setFormState(createFormState(currentTenant));
    setConfirmInventoryCurrency(false);
    setFormError(null);
  }, [currentTenant]);

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: (tenant) => {
      queryClient.setQueryData<TenantSettingsRow[]>(['tenants'], [tenant]);
      setFormState(createFormState(tenant));
      setConfirmInventoryCurrency(false);
      setFormError(null);
      setActiveTenantCurrency(tenant.inventory_currency);
      setSuccessMessage('Tenant settings saved.');
    },
    onError: (error) => {
      setSuccessMessage(null);
      setFormError(readableError(error));
    }
  });

  const isSaving = updateMutation.isPending;
  const isRefreshing = tenantsQuery.isFetching && !tenantsQuery.isLoading;
  const isWriteLocked = Boolean(currentTenant?.write_locked);
  const canEdit = canUpdateTenants && !isWriteLocked && !isSaving;
  const lastRefreshedLabel = formatTimestamp(tenantsQuery.dataUpdatedAt);

  const updateField = <K extends keyof TenantSettingsFormState>(field: K, value: TenantSettingsFormState[K]) => {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleRefresh = async () => {
    if (isDirty) {
      setSuccessMessage(null);
      setFormError('Save or reset your unsaved changes before refreshing tenant settings.');
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    const result = await tenantsQuery.refetch();

    if (result.error) {
      setFormError(readableError(result.error));
      return;
    }

    setSuccessMessage('Tenant settings refreshed.');
  };

  const handleResetForm = () => {
    if (!currentTenant) return;

    setFormState(createFormState(currentTenant));
    setConfirmInventoryCurrency(false);
    setFormError(null);
    setSuccessMessage(null);
  };

  const validatePayload = (): TenantPayload | null => {
    const normalizedName = formState.name.trim();
    const normalizedOrganizationType = formState.organization_type.trim();

    if (!normalizedName) {
      setSuccessMessage(null);
      setFormError('Tenant name is required.');
      return null;
    }

    if (normalizedName.length > 160) {
      setSuccessMessage(null);
      setFormError('Tenant name must be 160 characters or fewer.');
      return null;
    }

    if (formState.location.trim().length > 255) {
      setSuccessMessage(null);
      setFormError('Location must be 255 characters or fewer.');
      return null;
    }

    if (!normalizedOrganizationType || normalizedOrganizationType.length > 80) {
      setSuccessMessage(null);
      setFormError('Organization type is required and must be 80 characters or fewer.');
      return null;
    }

    if (!currencyCodeValid) {
      setSuccessMessage(null);
      setFormError('Inventory currency must be a 3-letter ISO currency code, for example EUR, USD, or GBP.');
      return null;
    }

    if (dateRangeInvalid) {
      setSuccessMessage(null);
      setFormError('Season start must be on or before season end.');
      return null;
    }

    return buildPayload(
      {
        ...formState,
        name: normalizedName,
        organization_type: normalizedOrganizationType,
        inventory_currency: formState.inventory_currency.trim().toUpperCase()
      },
      confirmInventoryCurrency
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentTenant) {
      setSuccessMessage(null);
      setFormError('Tenant settings are not available. Refresh the page and try again.');
      return;
    }

    if (!canUpdateTenants) {
      setSuccessMessage(null);
      setFormError('Your current role cannot update tenant settings.');
      return;
    }

    if (isWriteLocked) {
      setSuccessMessage(null);
      setFormError('This tenant is write-locked by the platform. Settings cannot be changed until the lock is removed.');
      return;
    }

    if (!isDirty) return;

    const payload = validatePayload();
    if (!payload) return;

    updateMutation.mutate({
      tenantId: currentTenant.id,
      payload
    });
  };

  if (!canReadTenants) {
    return (
      <div style={styles.page}>
        <section style={styles.panel}>
          <h2 style={styles.title}>Tenant Settings</h2>
          <div style={styles.error}>Your current role cannot read tenant settings.</div>
        </section>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Tenant scoped</p>
          <h2 style={styles.title}>Tenant Settings</h2>
          <p style={styles.subtitle}>
            Manage profile, operating-season, and inventory-currency settings for the current tenant. Tenant creation, deletion, locking, billing, and plan controls remain platform responsibilities.
          </p>
        </div>
        <div style={styles.headerActions}>
          <span style={styles.refreshMeta}>Last refreshed: {lastRefreshedLabel}</span>
          <button
            type="button"
            style={{
              ...styles.secondaryButton,
              ...((tenantsQuery.isFetching || isDirty) ? styles.disabledButton : {})
            }}
            onClick={handleRefresh}
            disabled={tenantsQuery.isFetching || isDirty}
            title={isDirty ? 'Save or reset your unsaved changes before refreshing.' : undefined}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {tenantsQuery.isLoading ? <div style={styles.panel}>Loading tenant settings…</div> : null}
      {tenantsQuery.error ? <div style={styles.error}>{readableError(tenantsQuery.error)}</div> : null}
      {formError ? <div style={styles.error}>{formError}</div> : null}
      {successMessage ? <div style={styles.success}>{successMessage}</div> : null}
      {isWriteLocked ? (
        <div style={styles.warning}>
          <strong>Tenant write lock is active.</strong> These settings are read-only until a platform administrator removes the lock.
        </div>
      ) : null}

      {!tenantsQuery.isLoading && !tenantsQuery.error && !currentTenant ? (
        <div style={styles.error}>The backend did not return the current tenant.</div>
      ) : null}

      {currentTenant ? (
        <div style={styles.twoColumn}>
          <section style={styles.panel}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>Current Tenant</h3>
              <span style={isWriteLocked ? styles.lockedBadge : styles.openBadge}>
                {isWriteLocked ? 'WRITE LOCKED' : 'OPEN'}
              </span>
            </div>

            <div style={styles.currentTenantCard}>
              <span style={styles.tenantName}>{currentTenant.name}</span>
              <span style={styles.tenantMeta}>{currentTenant.location || 'No location configured'}</span>
              <span style={styles.tenantMeta}>{currentTenant.organization_type || 'facility'}</span>
            </div>

            <dl style={styles.summaryList}>
              <div style={styles.summaryRow}>
                <dt style={styles.summaryLabel}>Tenant ID</dt>
                <dd style={styles.summaryValueCode}>{currentTenant.id}</dd>
              </div>
              <div style={styles.summaryRow}>
                <dt style={styles.summaryLabel}>Inventory currency</dt>
                <dd style={styles.summaryValue}>{normalizeCurrencyCode(currentTenant.inventory_currency)}</dd>
              </div>
              <div style={styles.summaryRow}>
                <dt style={styles.summaryLabel}>Created</dt>
                <dd style={styles.summaryValue}>{formatTimestamp(currentTenant.created_at)}</dd>
              </div>
              <div style={styles.summaryRow}>
                <dt style={styles.summaryLabel}>Last updated</dt>
                <dd style={styles.summaryValue}>{formatTimestamp(currentTenant.updated_at)}</dd>
              </div>
            </dl>
          </section>

          <form style={styles.panel} onSubmit={handleSubmit}>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Edit Tenant Settings</h3>
                <p style={styles.sectionSubtitle}>Only tenant-owned profile and accounting context can be changed here.</p>
              </div>
              {isDirty ? <span style={styles.unsavedBadge}>UNSAVED CHANGES</span> : null}
            </div>

            <div style={styles.grid}>
              <label style={styles.field}>
                <span style={styles.label}>Name</span>
                <input
                  style={styles.input}
                  value={formState.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  disabled={!canEdit}
                  maxLength={160}
                  required
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Location</span>
                <input
                  style={styles.input}
                  value={formState.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  disabled={!canEdit}
                  maxLength={255}
                  placeholder="Optional"
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Organization Type</span>
                <input
                  style={styles.input}
                  value={formState.organization_type}
                  onChange={(event) => updateField('organization_type', event.target.value)}
                  disabled={!canEdit}
                  maxLength={80}
                  required
                />
              </label>

              <div style={{ ...styles.fullWidth, ...styles.documentDetailsHeader }}>
                <strong>Supplier document details</strong>
                <span style={styles.helperText}>Used on Purchase Order / Receiving Reference PDFs and supplier emails.</span>
              </div>

              <label style={styles.field}>
                <span style={styles.label}>Legal / Company Name</span>
                <input style={styles.input} value={formState.legal_name} onChange={(event) => updateField('legal_name', event.target.value)} disabled={!canEdit} maxLength={255} placeholder="Optional; tenant name is used as fallback" />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Business Email</span>
                <input style={styles.input} type="email" value={formState.business_email} onChange={(event) => updateField('business_email', event.target.value)} disabled={!canEdit} maxLength={255} placeholder="purchasing@company.com" />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Business Phone</span>
                <input style={styles.input} value={formState.business_phone} onChange={(event) => updateField('business_phone', event.target.value)} disabled={!canEdit} maxLength={100} placeholder="Optional" />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Tax / VAT ID</span>
                <input style={styles.input} value={formState.tax_id} onChange={(event) => updateField('tax_id', event.target.value)} disabled={!canEdit} maxLength={100} placeholder="Optional" />
              </label>

              <label style={{ ...styles.field, ...styles.fullWidth }}>
                <span style={styles.label}>Business / Delivery Address</span>
                <textarea style={{ ...styles.input, minHeight: 82, resize: 'vertical' }} value={formState.business_address} onChange={(event) => updateField('business_address', event.target.value)} disabled={!canEdit} maxLength={2000} placeholder="Street, postal code, city, country" />
              </label>

              <label style={{ ...styles.field, ...styles.fullWidth }}>
                <span style={styles.label}>Default Purchase Order Payment Terms</span>
                <textarea style={{ ...styles.input, minHeight: 68, resize: 'vertical' }} value={formState.default_purchase_order_payment_terms} onChange={(event) => updateField('default_purchase_order_payment_terms', event.target.value)} disabled={!canEdit} maxLength={1000} placeholder="Example: Net 30 days from invoice date" />
              </label>

              <div style={{ ...styles.field, ...styles.fullWidth }}>
                <span style={styles.label}>Purchase order approval separation</span>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={formState.require_separate_purchase_order_approver}
                    onChange={(event) => updateField('require_separate_purchase_order_approver', event.target.checked)}
                    disabled={!canEdit}
                    style={{ marginTop: 3 }}
                  />
                  <span style={styles.fieldHelp}>Require a different employee to approve a purchase order than the employee who created it. Recommended and enabled by default; turn this off only when a small team must allow self-approval.</span>
                </label>
              </div>

              <label style={styles.field}>
                <span style={styles.labelRow}>
                  <span style={styles.label}>Inventory Currency</span>
                  <span
                    style={styles.infoIcon}
                    title={INVENTORY_CURRENCY_HELP}
                    aria-label={INVENTORY_CURRENCY_HELP}
                    tabIndex={0}
                  >
                    i
                  </span>
                </span>
                <input
                  style={styles.input}
                  value={formState.inventory_currency}
                  onChange={(event) => updateField('inventory_currency', event.target.value.toUpperCase())}
                  disabled={!canEdit}
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  placeholder={DEFAULT_INVENTORY_CURRENCY}
                  required
                />
                <span style={styles.helperText}>Tenant-base costs and valuation. No automatic FX conversion.</span>
              </label>

              {!currentTenant.inventory_currency_configured_at ? (
                <div style={{ ...styles.currencyNotice, ...styles.fullWidth }}>
                  <div style={styles.noticeHeader}>
                    <div>
                      <strong>Legacy currency confirmation required</strong>
                      <div style={styles.helperText}>Confirm which currency the tenant's existing inventory standard costs already use.</div>
                    </div>
                    <span
                      style={styles.infoIcon}
                      title={LEGACY_CURRENCY_HELP}
                      aria-label={LEGACY_CURRENCY_HELP}
                      tabIndex={0}
                    >
                      i
                    </span>
                  </div>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={confirmInventoryCurrency}
                      onChange={(event) => {
                        setConfirmInventoryCurrency(event.target.checked);
                        setFormError(null);
                        setSuccessMessage(null);
                      }}
                      disabled={!canEdit}
                    />
                    Confirm that <strong>{formState.inventory_currency || 'this currency'}</strong> is the currency of existing inventory standard costs
                  </label>
                </div>
              ) : (
                <div style={{ ...styles.currencyStatus, ...styles.fullWidth }}>
                  <div>
                    <strong>Inventory currency confirmed</strong>
                    <div style={styles.helperText}>
                      Confirmed {formatTimestamp(currentTenant.inventory_currency_configured_at)}. A later change is blocked if it would relabel existing currency-dependent financial evidence.
                    </div>
                  </div>
                </div>
              )}

              <label style={styles.field}>
                <span style={styles.label}>Season Start</span>
                <input
                  style={styles.input}
                  type="date"
                  value={formState.season_start}
                  onChange={(event) => updateField('season_start', event.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Season End</span>
                <input
                  style={{
                    ...styles.input,
                    ...(dateRangeInvalid ? styles.invalidInput : {})
                  }}
                  type="date"
                  value={formState.season_end}
                  onChange={(event) => updateField('season_end', event.target.value)}
                  disabled={!canEdit}
                  min={formState.season_start || undefined}
                />
                {dateRangeInvalid ? <span style={styles.fieldError}>Season end cannot be before season start.</span> : null}
              </label>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={{
                  ...styles.secondaryButton,
                  ...((!isDirty || isSaving) ? styles.disabledButton : {})
                }}
                onClick={handleResetForm}
                disabled={!isDirty || isSaving}
              >
                Reset changes
              </button>
              <button
                type="submit"
                style={{
                  ...styles.primaryButton,
                  ...((!canUpdateTenants || isWriteLocked || isSaving || !isDirty || !formValid) ? styles.disabledPrimaryButton : {})
                }}
                disabled={!canUpdateTenants || isWriteLocked || isSaving || !isDirty || !formValid}
              >
                {isSaving ? 'Saving…' : 'Save tenant settings'}
              </button>
            </div>

            {!canUpdateTenants ? (
              <p style={styles.permissionHint}>Your role can read tenant settings but cannot update them.</p>
            ) : null}
          </form>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  refreshMeta: {
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 700
  },
  eyebrow: {
    margin: 0,
    color: '#2563eb',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontSize: '12px'
  },
  title: {
    margin: '4px 0 0',
    fontSize: '30px'
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280',
    maxWidth: '900px',
    lineHeight: 1.5
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)',
    gap: '20px',
    alignItems: 'start'
  },
  panel: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 12px 36px rgba(15,23,42,0.08)',
    minWidth: 0
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '18px'
  },
  sectionSubtitle: {
    margin: '5px 0 0',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.4
  },
  currentTenantCard: {
    display: 'grid',
    gap: '4px',
    border: '1px solid #bfdbfe',
    borderRadius: '14px',
    background: '#eff6ff',
    padding: '14px'
  },
  tenantName: {
    fontWeight: 900,
    color: '#0f172a'
  },
  tenantMeta: {
    color: '#64748b',
    fontSize: '13px'
  },
  summaryList: {
    display: 'grid',
    gap: '0',
    margin: '16px 0 0'
  },
  summaryRow: {
    display: 'grid',
    gap: '4px',
    padding: '10px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  summaryValue: {
    margin: 0,
    color: '#0f172a',
    fontWeight: 700,
    overflowWrap: 'anywhere'
  },
  summaryValueCode: {
    margin: 0,
    color: '#334155',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '12px',
    overflowWrap: 'anywhere'
  },
  openBadge: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '999px',
    padding: '5px 9px',
    fontSize: '11px',
    fontWeight: 900
  },
  lockedBadge: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '999px',
    padding: '5px 9px',
    fontSize: '11px',
    fontWeight: 900
  },
  unsavedBadge: {
    background: '#fef3c7',
    color: '#92400e',
    borderRadius: '999px',
    padding: '5px 9px',
    fontSize: '11px',
    fontWeight: 900,
    whiteSpace: 'nowrap'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    alignItems: 'start'
  },
  field: {
    display: 'grid',
    gap: '8px',
    alignContent: 'start',
    minWidth: 0
  },
  documentDetailsHeader: { display: 'grid', gap: 4, paddingTop: 8, borderTop: '1px solid #e5e7eb' },
  fullWidth: {
    gridColumn: '1 / -1'
  },
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px'
  },
  label: {
    fontWeight: 800,
    color: '#334155'
  },
  infoIcon: {
    display: 'inline-flex',
    width: '18px',
    height: '18px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '999px',
    border: '1px solid #93c5fd',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 900,
    cursor: 'help',
    userSelect: 'none'
  },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: '46px',
    padding: '0.85rem 0.95rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    font: 'inherit'
  },
  invalidInput: {
    borderColor: '#ef4444'
  },
  fieldError: {
    color: '#b91c1c',
    fontSize: '12px',
    fontWeight: 700
  },
  helperText: {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.45
  },
  currencyNotice: {
    border: '1px solid #fde68a',
    borderRadius: '14px',
    background: '#fffbeb',
    padding: '14px',
    display: 'grid',
    gap: '12px'
  },
  currencyStatus: {
    border: '1px solid #bbf7d0',
    borderRadius: '14px',
    background: '#f0fdf4',
    padding: '14px'
  },
  noticeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '9px',
    color: '#334155',
    lineHeight: 1.4
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: '20px'
  },
  primaryButton: {
    border: 0,
    borderRadius: '12px',
    padding: '0.9rem 1.1rem',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 900,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '0.9rem 1.1rem',
    background: '#fff',
    color: '#0f172a',
    fontWeight: 900,
    cursor: 'pointer'
  },
  disabledButton: {
    opacity: 0.55,
    cursor: 'not-allowed'
  },
  disabledPrimaryButton: {
    background: '#93b4f4',
    opacity: 0.75,
    cursor: 'not-allowed'
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px'
  },
  success: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '12px',
    padding: '12px',
    fontWeight: 800
  },
  warning: {
    background: '#fff7ed',
    color: '#9a3412',
    border: '1px solid #fed7aa',
    borderRadius: '12px',
    padding: '12px',
    lineHeight: 1.45
  },
  permissionHint: {
    color: '#64748b',
    margin: '16px 0 0'
  }
};
