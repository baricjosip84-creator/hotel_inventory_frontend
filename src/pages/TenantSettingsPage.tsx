import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlocker } from 'react-router';
import { ApiError, apiRequest } from '../lib/api';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './TenantSettingsPage.css';
import {
  TENANT_PERMISSIONS,
  getCurrentUserRole,
  hasPermission
} from '../lib/permissions';
import { LOCALE_OPTIONS, DEFAULT_LOCALE, type AppLocale } from '../i18n/config';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedDateTime } from '../i18n/formatters';
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
  default_locale?: string | null;
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
  default_locale: string;
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
  default_locale: string;
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
  inventory_currency: DEFAULT_INVENTORY_CURRENCY,
  default_locale: DEFAULT_LOCALE
};

const INVENTORY_CURRENCY_HELP =
  'This is the tenant base currency used for product standard costs, inventory valuation, and tenant-base cost analytics. Supplier prices, invoices, and purchase orders can keep their own explicit currencies. The application does not automatically convert foreign exchange.';

const LEGACY_CURRENCY_HELP =
  'This tenant existed before currency tracking. Correct the displayed code first if needed, then explicitly confirm the currency that existing inventory standard costs already use. If you change the code, you must confirm the new code before saving. After confirmation, a later currency change is blocked once currency-dependent financial evidence exists so historical amounts are never silently relabelled or converted.';

function readableError(error: unknown, ui: (englishText: string) => string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return ui('Unknown error');
}

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function formatTimestamp(value: string | number | null | undefined, locale: AppLocale): string {
  return formatLocalizedDateTime(value, locale);
}

function formatOrganizationTypeLabel(value: string | null | undefined, ui: (text: string) => string): string {
  const normalized = String(value || 'facility').trim();
  if (!normalized || normalized.toLowerCase() === 'facility') return ui('Facility');

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
    inventory_currency: normalizeCurrencyCode(tenant.inventory_currency),
    default_locale: tenant.default_locale || DEFAULT_LOCALE
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
    default_locale: formState.default_locale,
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
    && left.inventory_currency === right.inventory_currency
    && left.default_locale === right.default_locale;
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
  const { locale, ui } = useAppTranslation();
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

  const normalizedInventoryCurrency = formState.inventory_currency.trim().toUpperCase();
  const currentInventoryCurrency = currentTenant
    ? normalizeCurrencyCode(currentTenant.inventory_currency)
    : DEFAULT_INVENTORY_CURRENCY;
  const nameInvalid = !formState.name.trim();
  const organizationTypeInvalid = !formState.organization_type.trim();
  const businessEmailInvalid = Boolean(
    formState.business_email.trim()
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.business_email.trim())
  );
  const dateRangeInvalid = Boolean(
    formState.season_start
    && formState.season_end
    && formState.season_start > formState.season_end
  );
  const currencyCodeValid = /^[A-Z]{3}$/.test(normalizedInventoryCurrency);
  const legacyCurrencyChangeNeedsConfirmation = Boolean(
    currentTenant
    && !currentTenant.inventory_currency_configured_at
    && normalizedInventoryCurrency !== currentInventoryCurrency
    && !confirmInventoryCurrency
  );
  const formValid = Boolean(
    !nameInvalid
    && formState.name.trim().length <= 160
    && formState.location.trim().length <= 255
    && !organizationTypeInvalid
    && formState.organization_type.trim().length <= 80
    && formState.legal_name.trim().length <= 255
    && formState.business_address.trim().length <= 2000
    && formState.business_email.trim().length <= 255
    && !businessEmailInvalid
    && formState.business_phone.trim().length <= 100
    && formState.tax_id.trim().length <= 100
    && formState.default_purchase_order_payment_terms.trim().length <= 1000
    && currencyCodeValid
    && !legacyCurrencyChangeNeedsConfirmation
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
      setSuccessMessage(ui('Tenant settings saved.'));
    },
    onError: (error) => {
      setSuccessMessage(null);
      setFormError(readableError(error, ui));
    }
  });

  const isSaving = updateMutation.isPending;
  const isRefreshing = tenantsQuery.isFetching && !tenantsQuery.isLoading;
  const isWriteLocked = Boolean(currentTenant?.write_locked);
  const canEdit = canUpdateTenants && !isWriteLocked && !isSaving;
  const shouldBlockNavigation = isDirty && !isSaving;
  const blocker = useBlocker(shouldBlockNavigation);
  const lastRefreshedLabel = formatTimestamp(tenantsQuery.dataUpdatedAt, locale);

  useEffect(() => {
    if (!shouldBlockNavigation) return undefined;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [shouldBlockNavigation]);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    const shouldDiscard = window.confirm(ui('Discard unsaved tenant settings and leave this page?'));
    if (shouldDiscard) blocker.proceed();
    else blocker.reset();
  }, [blocker, ui]);

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
      setFormError(ui('Save or reset your unsaved changes before refreshing tenant settings.'));
      return;
    }

    setFormError(null);
    setSuccessMessage(null);

    const result = await tenantsQuery.refetch();

    if (result.error) {
      setFormError(readableError(result.error, ui));
      return;
    }

    setSuccessMessage(ui('Tenant settings refreshed.'));
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
      setFormError(ui('Tenant name is required.'));
      return null;
    }

    if (normalizedName.length > 160) {
      setSuccessMessage(null);
      setFormError(ui('Tenant name must be 160 characters or fewer.'));
      return null;
    }

    if (formState.location.trim().length > 255) {
      setSuccessMessage(null);
      setFormError(ui('Location must be 255 characters or fewer.'));
      return null;
    }

    if (!normalizedOrganizationType || normalizedOrganizationType.length > 80) {
      setSuccessMessage(null);
      setFormError(ui('Organization type is required and must be 80 characters or fewer.'));
      return null;
    }

    if (businessEmailInvalid) {
      setSuccessMessage(null);
      setFormError(ui('Business email must be a valid email address.'));
      return null;
    }

    if (!currencyCodeValid) {
      setSuccessMessage(null);
      setFormError(ui('Inventory currency must be a 3-letter ISO currency code, for example EUR, USD, or GBP.'));
      return null;
    }

    if (legacyCurrencyChangeNeedsConfirmation) {
      setSuccessMessage(null);
      setFormError(ui('Confirm the inventory currency before saving this currency change.'));
      return null;
    }

    if (dateRangeInvalid) {
      setSuccessMessage(null);
      setFormError(ui('Season start must be on or before season end.'));
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
      setFormError(ui('Tenant settings are not available. Refresh the page and try again.'));
      return;
    }

    if (!canUpdateTenants) {
      setSuccessMessage(null);
      setFormError(ui('Your current role cannot update tenant settings.'));
      return;
    }

    if (isWriteLocked) {
      setSuccessMessage(null);
      setFormError(ui('This tenant is write-locked by the platform. Settings cannot be changed until the lock is removed.'));
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

  const seasonStatus = !currentTenant
    ? '—'
    : currentTenant.season_start && currentTenant.season_end
      ? ui('Configured')
      : currentTenant.season_start || currentTenant.season_end
        ? ui('Partial')
        : ui('Not set');
  const seasonHelper = currentTenant?.season_start || currentTenant?.season_end
    ? ui('From {start} to {end}')
      .replace('{start}', currentTenant.season_start ? formatLocalizedDate(`${currentTenant.season_start}T00:00:00`, locale) : ui('No start'))
      .replace('{end}', currentTenant.season_end ? formatLocalizedDate(`${currentTenant.season_end}T00:00:00`, locale) : ui('No end'))
    : ui('Optional operating-season window');
  const draftSeasonStatus = formState.season_start && formState.season_end
    ? ui('Configured')
    : formState.season_start || formState.season_end
      ? ui('Partial')
      : ui('Not set');
  const approvalSeparationEnabled = currentTenant?.require_separate_purchase_order_approver !== false;
  const tenantStatus = !currentTenant
    ? ui('Unavailable')
    : isWriteLocked
      ? ui('Write locked')
      : canUpdateTenants
        ? ui('Tenant-managed')
        : ui('Read only');

  if (!canReadTenants) {
    return (
      <div className="tenant-settings-page io-operational-page io-workspace-page" id="tenant-settings-workspace-top">
        <OperationalWorkspaceHero
          iconPath="/tenant-settings"
          eyebrow={ui('Administration & policy')}
          title={ui('Tenant settings')}
          description={ui('Manage tenant-owned company profile, purchasing identity, operating-season, and inventory accounting context.')}
          meta={<OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>}
          aside={<OperationalWorkspaceStatus value={ui('Read blocked')} label={ui('tenant settings access')} />}
        />
        <div className="app-error-state tenant-settings-message">{ui('Your current role cannot read tenant settings.')}</div>
      </div>
    );
  }

  return (
    <div className="tenant-settings-page io-operational-page io-workspace-page" id="tenant-settings-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/tenant-settings"
        eyebrow={ui('Administration & policy')}
        title={ui('Tenant settings')}
        description={ui("Maintain the current tenant's company profile, supplier-facing document details, operating-season, and inventory accounting context. Platform-owned creation, deletion, locking, billing, and plan controls stay outside this page.")}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Supplier document identity')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Currency safety protected')}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui('Tenant settings only')}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <div className="tenant-settings-hero-actions">
            <OperationalWorkspaceStatus value={tenantStatus} label={ui('tenant configuration status')} />
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={handleRefresh}
              disabled={tenantsQuery.isFetching || isDirty}
              title={isDirty ? ui('Save or reset your unsaved changes before refreshing.') : undefined}
            >
              {isRefreshing ? ui('Refreshing…') : ui('Refresh')}
            </button>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui('Tenant settings overview')}>
        <OperationalWorkspaceStatCard
          label={ui('Inventory currency')}
          value={currentTenant ? normalizeCurrencyCode(currentTenant.inventory_currency) : '—'}
          helper={ui('Tenant-base costing and valuation')}
          tone="blue"
          iconPath="/reports"
          loading={tenantsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui('PO approval separation')}
          value={currentTenant ? (approvalSeparationEnabled ? ui('Required') : ui('Self-approval')) : '—'}
          helper={approvalSeparationEnabled ? ui('Creator and approver must differ') : ui('Creator may approve when permitted')}
          tone={approvalSeparationEnabled ? 'good' : 'warn'}
          iconPath="/permissions"
          loading={tenantsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui('Operating season')}
          value={seasonStatus}
          helper={seasonHelper}
          tone={seasonStatus === 'Partial' ? 'warn' : 'neutral'}
          iconPath="/automation-schedules"
          loading={tenantsQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui('Last updated')}
          value={currentTenant ? formatTimestamp(currentTenant.updated_at, locale) : '—'}
          helper={ui('Settings data refreshed {date}').replace('{date}', lastRefreshedLabel)}
          tone="neutral"
          iconPath="/audit"
          loading={tenantsQuery.isLoading}
          className="io-workspace-stat--timestamp"
        />
      </OperationalWorkspaceStats>

      {tenantsQuery.isLoading ? <div className="app-empty-state tenant-settings-message">{ui('Loading tenant settings…')}</div> : null}
      {tenantsQuery.error ? <div className="app-error-state tenant-settings-message">{ui('Failed to load tenant settings: {error}').replace('{error}', readableError(tenantsQuery.error, ui))}</div> : null}
      {formError ? <div className="app-error-state tenant-settings-message" role="alert">{formError}</div> : null}
      {successMessage ? <div className="app-success-state tenant-settings-message" role="status">{successMessage}</div> : null}
      {isWriteLocked ? (
        <div className="app-warning-state tenant-settings-message">
          <strong>{ui('Tenant write lock is active.')}</strong> {ui('These settings are read-only until a platform administrator removes the lock.')}
        </div>
      ) : null}

      {!tenantsQuery.isLoading && !tenantsQuery.error && !currentTenant ? (
        <div className="app-error-state tenant-settings-message">{ui('The backend did not return the current tenant.')}</div>
      ) : null}

      {currentTenant ? (
        <form className="app-panel tenant-settings-panel tenant-settings-form" onSubmit={handleSubmit} noValidate>
          <OperationalSectionHeader
            iconPath="/tenant-settings"
            title={ui('Tenant configuration')}
            description={ui('Edit only tenant-owned settings. Changes are validated before they can be saved and apply only to the current tenant.')}
            actions={isDirty ? <span className="tenant-settings-badge tenant-settings-badge--unsaved">{ui('UNSAVED CHANGES')}</span> : <span className="tenant-settings-badge tenant-settings-badge--saved">{ui('SAVED')}</span>}
          />

          <section className="tenant-settings-record" aria-label={ui('Current tenant record')}>
            <div className="tenant-settings-current-card">
              <div className="tenant-settings-current-card__topline">
                <span className="tenant-settings-current-card__eyebrow">{ui('Current Tenant')}</span>
                <span className={`tenant-settings-badge ${isWriteLocked ? 'tenant-settings-badge--locked' : 'tenant-settings-badge--open'}`}>
                  {isWriteLocked ? ui('WRITE LOCKED') : ui('OPEN')}
                </span>
              </div>
              <strong>{currentTenant.name}</strong>
              <span>{currentTenant.location || ui('No location configured')}</span>
              <span className="tenant-settings-current-card__organization-type">{formatOrganizationTypeLabel(currentTenant.organization_type, ui)}</span>
            </div>
            <div className="tenant-settings-record-item tenant-settings-record-item--id">
              <span>{ui('Tenant ID')}</span>
              <strong>{currentTenant.id}</strong>
            </div>
            <div className="tenant-settings-record-item">
              <span>{ui('Created')}</span>
              <strong>{formatTimestamp(currentTenant.created_at, locale)}</strong>
            </div>
            <div className="tenant-settings-record-item">
              <span>{ui('Last updated')}</span>
              <strong>{formatTimestamp(currentTenant.updated_at, locale)}</strong>
            </div>
          </section>

          <section className="tenant-settings-form-group">
            <div className="tenant-settings-form-group__heading">
              <div>
                <h4>{ui('Organization profile')}</h4>
                <p>{ui('Core tenant identity shown throughout the operational workspace.')}</p>
              </div>
              <span className="tenant-settings-form-group__tag">{ui('Profile')}</span>
            </div>
            <div className="tenant-settings-grid tenant-settings-grid--three">
              <label className="tenant-settings-field">
                <span>{ui('Name')}</span>
                <input
                  className={nameInvalid ? 'is-invalid' : undefined}
                  value={formState.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  disabled={!canEdit}
                  maxLength={160}
                  required
                  aria-invalid={nameInvalid}
                />
                {nameInvalid ? <small className="tenant-settings-field-error">{ui('Company name is required.')}</small> : null}
              </label>

              <label className="tenant-settings-field">
                <span>{ui('Location')}</span>
                <input
                  value={formState.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  disabled={!canEdit}
                  maxLength={255}
                  placeholder={ui('Optional')}
                />
              </label>

              <label className="tenant-settings-field">
                <span>{ui('Organization type')}</span>
                <input
                  className={`tenant-settings-organization-type-input${organizationTypeInvalid ? ' is-invalid' : ''}`}
                  value={formState.organization_type}
                  onChange={(event) => updateField('organization_type', event.target.value)}
                  disabled={!canEdit}
                  maxLength={80}
                  required
                  aria-invalid={organizationTypeInvalid}
                />
                {organizationTypeInvalid ? <small className="tenant-settings-field-error">{ui('Organization type is required.')}</small> : null}
              </label>

              <label className="tenant-settings-field">
                <span>{ui('Default application language')}</span>
                <select
                  value={formState.default_locale}
                  onChange={(event) => updateField('default_locale', event.target.value)}
                  disabled={!canEdit}
                >
                  {LOCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <small>{ui('Used for tenant users who have not selected a personal language preference.')}</small>
              </label>
            </div>
          </section>

          <section className="tenant-settings-form-group">
            <div className="tenant-settings-form-group__heading">
              <div>
                <h4>{ui('Supplier document identity')}</h4>
                <p>{ui('Used on Purchase Order / Receiving Reference PDFs and supplier emails. Optional fields fall back safely where applicable.')}</p>
              </div>
              <span className="tenant-settings-form-group__tag">{ui('Purchasing')}</span>
            </div>
            <div className="tenant-settings-grid tenant-settings-grid--three">
              <label className="tenant-settings-field">
                <span>{ui('Legal / company name')}</span>
                <input
                  value={formState.legal_name}
                  onChange={(event) => updateField('legal_name', event.target.value)}
                  disabled={!canEdit}
                  maxLength={255}
                  placeholder={ui('Optional; tenant name is used as fallback')}
                />
              </label>

              <label className="tenant-settings-field">
                <span>{ui('Business email')}</span>
                <input
                  className={businessEmailInvalid ? 'is-invalid' : undefined}
                  type="email"
                  value={formState.business_email}
                  onChange={(event) => updateField('business_email', event.target.value)}
                  disabled={!canEdit}
                  maxLength={255}
                  placeholder={ui('purchasing@company.com')}
                  aria-invalid={businessEmailInvalid}
                />
                {businessEmailInvalid ? <small className="tenant-settings-field-error">{ui('Enter a valid business email address.')}</small> : null}
              </label>

              <label className="tenant-settings-field">
                <span>{ui('Business phone')}</span>
                <input
                  value={formState.business_phone}
                  onChange={(event) => updateField('business_phone', event.target.value)}
                  disabled={!canEdit}
                  maxLength={100}
                  placeholder={ui('Optional')}
                />
              </label>

              <label className="tenant-settings-field">
                <span>{ui('Tax / VAT ID')}</span>
                <input
                  value={formState.tax_id}
                  onChange={(event) => updateField('tax_id', event.target.value)}
                  disabled={!canEdit}
                  maxLength={100}
                  placeholder={ui('Optional')}
                />
              </label>

              <label className="tenant-settings-field tenant-settings-field--span-two">
                <span>{ui('Business / delivery address')}</span>
                <textarea
                  value={formState.business_address}
                  onChange={(event) => updateField('business_address', event.target.value)}
                  disabled={!canEdit}
                  maxLength={2000}
                  placeholder={ui('Street, postal code, city, country')}
                />
              </label>

              <label className="tenant-settings-field tenant-settings-field--full">
                <span>{ui('Default purchase order payment terms')}</span>
                <textarea
                  value={formState.default_purchase_order_payment_terms}
                  onChange={(event) => updateField('default_purchase_order_payment_terms', event.target.value)}
                  disabled={!canEdit}
                  maxLength={1000}
                  placeholder={ui('Example: Net 30 days from invoice date')}
                />
                <small>{ui('Used as the tenant default when purchase documents need payment terms.')}</small>
              </label>
            </div>
          </section>

          <section className="tenant-settings-form-group">
            <div className="tenant-settings-form-group__heading">
              <div>
                <h4>{ui('Governance & accounting controls')}</h4>
                <p>{ui('Controls that affect purchase approvals, inventory valuation context, and seasonal operating dates.')}</p>
              </div>
              <span className="tenant-settings-form-group__tag">{ui('Controls')}</span>
            </div>

            <div className="tenant-settings-control-grid">
              <div className="tenant-settings-control-card tenant-settings-control-card--approval">
                <div className="tenant-settings-control-card__heading">
                  <div>
                    <strong>{ui('Purchase order approval separation')}</strong>
                    <p>{ui('Keep purchasing approval independent from the employee who created the order.')}</p>
                  </div>
                  <span className={`tenant-settings-badge ${formState.require_separate_purchase_order_approver ? 'tenant-settings-badge--open' : 'tenant-settings-badge--warning'}`}>
                    {formState.require_separate_purchase_order_approver ? ui('REQUIRED') : ui('SELF-APPROVAL')}
                  </span>
                </div>
                <label className="tenant-settings-checkbox">
                  <input
                    type="checkbox"
                    checked={formState.require_separate_purchase_order_approver}
                    onChange={(event) => updateField('require_separate_purchase_order_approver', event.target.checked)}
                    disabled={!canEdit}
                  />
                  <span>{ui('Require a different employee to approve a purchase order than the employee who created it. Recommended and enabled by default; turn this off only when a small team must allow self-approval.')}</span>
                </label>
              </div>

              <div className="tenant-settings-control-card tenant-settings-control-card--season">
                <div className="tenant-settings-control-card__heading">
                  <div>
                    <strong>{ui('Operating season')}</strong>
                    <p>{ui('Optional date range used as tenant operating context.')}</p>
                  </div>
                  <span className="tenant-settings-badge tenant-settings-badge--neutral">{draftSeasonStatus}</span>
                </div>
                <div className="tenant-settings-grid tenant-settings-grid--two tenant-settings-grid--compact">
                  <label className="tenant-settings-field">
                    <span>{ui('Season start')}</span>
                    <input
                      type="date"
                      value={formState.season_start}
                      onChange={(event) => updateField('season_start', event.target.value)}
                      disabled={!canEdit}
                    />
                  </label>

                  <label className="tenant-settings-field">
                    <span>{ui('Season end')}</span>
                    <input
                      className={dateRangeInvalid ? 'is-invalid' : undefined}
                      type="date"
                      value={formState.season_end}
                      onChange={(event) => updateField('season_end', event.target.value)}
                      disabled={!canEdit}
                      min={formState.season_start || undefined}
                      aria-invalid={dateRangeInvalid}
                    />
                    {dateRangeInvalid ? <small className="tenant-settings-field-error">{ui('Season end cannot be before season start.')}</small> : null}
                  </label>
                </div>
              </div>
            </div>

            <div className="tenant-settings-currency-block">
              <div className="tenant-settings-currency-copy">
                <div className="tenant-settings-label-row">
                  <strong>{ui('Inventory currency')}</strong>
                  <span className="tenant-settings-info-icon" title={ui(INVENTORY_CURRENCY_HELP)} aria-label={ui(INVENTORY_CURRENCY_HELP)} tabIndex={0}>i</span>
                </div>
                <p>{ui('Tenant-base costs and valuation. No automatic FX conversion.')}</p>
              </div>

              <label className="tenant-settings-field tenant-settings-currency-field">
                <span>{ui('Currency code')}</span>
                <input
                  className={!currencyCodeValid ? 'is-invalid' : undefined}
                  value={formState.inventory_currency}
                  onChange={(event) => {
                    updateField('inventory_currency', event.target.value.toUpperCase());
                    if (!currentTenant.inventory_currency_configured_at) setConfirmInventoryCurrency(false);
                  }}
                  disabled={!canEdit}
                  maxLength={3}
                  pattern="[A-Za-z]{3}"
                  placeholder={DEFAULT_INVENTORY_CURRENCY}
                  required
                  aria-invalid={!currencyCodeValid}
                />
                {!currencyCodeValid ? <small className="tenant-settings-field-error">{ui('Enter a 3-letter currency code such as EUR, USD, or GBP.')}</small> : null}
              </label>

              {!currentTenant.inventory_currency_configured_at ? (
                <div className="tenant-settings-currency-notice">
                  <div className="tenant-settings-notice-heading">
                    <div>
                      <strong>{ui('Legacy currency confirmation required')}</strong>
                      <p>{ui("Confirm which currency the tenant's existing inventory standard costs already use.")}</p>
                    </div>
                    <span className="tenant-settings-info-icon" title={ui(LEGACY_CURRENCY_HELP)} aria-label={ui(LEGACY_CURRENCY_HELP)} tabIndex={0}>i</span>
                  </div>
                  <label className="tenant-settings-checkbox">
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
                    <span>{ui('Confirm that {currency} is the currency of existing inventory standard costs').replace('{currency}', formState.inventory_currency || ui('this currency'))}</span>
                  </label>
                  {legacyCurrencyChangeNeedsConfirmation ? (
                    <small className="tenant-settings-field-error">{ui('You changed the currency. Confirm it above before saving.')}</small>
                  ) : null}
                </div>
              ) : (
                <div className="tenant-settings-currency-status">
                  <strong>{ui('Inventory currency confirmed')}</strong>
                  <p>{ui('Confirmed {date}. A later change is blocked if it would relabel existing currency-dependent financial evidence.').replace('{date}', formatTimestamp(currentTenant.inventory_currency_configured_at, locale))}</p>
                </div>
              )}
            </div>
          </section>

          <div className="tenant-settings-form-footer">
            <div className="tenant-settings-form-footer__copy">
              {!canUpdateTenants ? <strong>{ui('Your role can read tenant settings but cannot update them.')}</strong> : <strong>{ui('Only saved changes affect tenant operations.')}</strong>}
              <span>{isWriteLocked ? ui('The platform write lock currently prevents changes.') : isDirty ? ui('Review the highlighted settings, then save or reset your changes.') : ui('No unsaved tenant-setting changes.')}</span>
            </div>
            <div className="tenant-settings-form-footer__actions">
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={handleResetForm}
                disabled={!isDirty || isSaving}
              >
                {ui('Reset changes')}
              </button>
              <button
                type="submit"
                className="app-button app-button--primary"
                disabled={!canUpdateTenants || isWriteLocked || isSaving || !isDirty || !formValid}
              >
                {isSaving ? ui('Saving…') : ui('Save tenant settings')}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}
