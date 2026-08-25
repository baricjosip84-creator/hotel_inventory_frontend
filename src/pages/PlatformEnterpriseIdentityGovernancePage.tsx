import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformEnterpriseIdentityGovernancePage.css';

type EnterpriseIdentityGovernance = {
  generated_at: string;
  posture: 'identity_governance_ready' | 'identity_governance_review_required' | 'identity_governance_attention_required' | string;
  enabled_providers: string[];
  provider_count: number;
  runtime_sso_provider_count: number;
  sso_runtime_operational: boolean;
  password_login_fallback_allowed: boolean;
  tenant_domain_discovery_enabled: boolean;
  jit_provisioning_allowed: boolean;
  configuration_attention: string[];
  runtime_attention: string[];
  attention: string[];
  runtime_capabilities: Record<string, boolean>;
  evidence_complete: boolean;
  evidence_access: Record<string, boolean>;
  truth_contract: Record<string, boolean>;
  config: {
    configuration_source: string;
    enforcement: Record<string, boolean | number | string>;
    providers: Record<string, Record<string, boolean | string | string[]>>;
    audit: Record<string, boolean | number | string>;
  };
};

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function pretty(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
}

function valueText(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value === null || value === undefined || value === '' ? 'Not configured' : String(value);
}

function BoolBadge({ value, trueLabel = 'Available', falseLabel = 'Not implemented' }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return <span className="platform-enterprise-identity__badge" data-tone={value ? 'good' : 'warn'}>{value ? trueLabel : falseLabel}</span>;
}


function SourceLink({ href, children }: { href: string; children: string }) {
  return <a href={href}>{children}</a>;
}

function SignalList({ values, empty }: { values: string[]; empty: string }) {
  return <div className="platform-enterprise-identity__signals">
    {values.length ? values.map((value) => <span key={value}>{pretty(value)}</span>) : <small>{empty}</small>}
  </div>;
}

export default function PlatformEnterpriseIdentityGovernancePage() {
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadAccessReviews = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const canReadCompliance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadSessions = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ);

  const governanceQuery = useQuery({
    queryKey: ['platform', 'enterprise-identity', 'governance'],
    queryFn: () => platformApiRequest<EnterpriseIdentityGovernance>('/platform/enterprise-identity/governance'),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const data = governanceQuery.data;
  const enabledProviders = Array.isArray(data?.enabled_providers) ? data.enabled_providers : [];
  const configurationAttention = Array.isArray(data?.configuration_attention) ? data.configuration_attention : [];
  const runtimeAttention = Array.isArray(data?.runtime_attention) ? data.runtime_attention : [];
  const runtimeCapabilities = data?.runtime_capabilities || {};
  const providerEntries = Object.entries(data?.config?.providers || {});
  const enforcementEntries = Object.entries(data?.config?.enforcement || {});
  const auditEntries = Object.entries(data?.config?.audit || {});
  const runtimeEntries = Object.entries(runtimeCapabilities);
  const showingStaleSnapshot = Boolean(governanceQuery.isError && data);

  return <div className="io-operational-page io-workspace-page platform-enterprise-identity">
    <OperationalWorkspaceHero
      iconPath="/platform/enterprise-identity"
      eyebrow="Platform security evidence"
      title="Enterprise identity"
      description="Inspect non-secret enterprise identity configuration metadata alongside the authentication capabilities the Platform actually executes today. Environment flags are not treated as proof that OIDC, SAML, JIT provisioning, or domain-discovery enforcement is operational."
      meta={<>
        <OperationalWorkspaceMetaPill>Permission: PLATFORM_SECURITY_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Configuration separated from runtime enforcement</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-enterprise-identity__hero-aside">
        <OperationalWorkspaceStatus value={pretty(data?.posture || 'Loading')} label="Enterprise identity posture" />
        <button type="button" className="app-button app-button--secondary" onClick={() => governanceQuery.refetch()} disabled={governanceQuery.isFetching}>
          {governanceQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>}
    />

    {governanceQuery.isError && !data ? <section className="platform-enterprise-identity__blocking-error">
      <strong>Enterprise identity governance failed to load.</strong>
      <span>{readableError(governanceQuery.error)}</span>
      <button type="button" className="app-button app-button--secondary" onClick={() => governanceQuery.refetch()} disabled={governanceQuery.isFetching}>Retry</button>
    </section> : null}

    {showingStaleSnapshot ? <section className="platform-enterprise-identity__warning">
      <strong>Showing the last successful snapshot.</strong>
      <span>The latest refresh failed: {readableError(governanceQuery.error)}</span>
    </section> : null}

    <OperationalWorkspaceStats ariaLabel="Enterprise identity summary">
      <OperationalWorkspaceStatCard label="Configured provider flags" value={data?.provider_count ?? '—'} helper={enabledProviders.length ? enabledProviders.map((value) => value.toUpperCase()).join(', ') : 'No provider enabled in application environment metadata'} tone={data?.provider_count ? 'warn' : 'neutral'} loading={governanceQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Runtime SSO providers" value={data?.runtime_sso_provider_count ?? '—'} helper="OIDC/SAML providers actually wired into Platform authentication" tone={data?.runtime_sso_provider_count ? 'good' : 'warn'} loading={governanceQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Password login" value={runtimeCapabilities.platform_password_login ? 'Available' : 'Unavailable'} helper="Current Platform authentication path" tone={runtimeCapabilities.platform_password_login ? 'neutral' : 'danger'} loading={governanceQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="TOTP MFA" value={runtimeCapabilities.platform_totp_mfa ? 'Available' : 'Unavailable'} helper="Optional MFA capability in current Platform auth" tone={runtimeCapabilities.platform_totp_mfa ? 'good' : 'warn'} loading={governanceQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Configuration signals" value={configurationAttention.length ?? '—'} helper="Environment metadata needing review" tone={configurationAttention.length ? 'warn' : 'good'} loading={governanceQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Runtime gaps" value={runtimeAttention.length ?? '—'} helper="Configured or desired controls not enforced by current auth code" tone={runtimeAttention.length ? 'warn' : 'good'} loading={governanceQuery.isLoading && !data} />
    </OperationalWorkspaceStats>

    {data ? <>
      <section className="io-workspace-panel platform-enterprise-identity__section">
        <OperationalSectionHeader iconPath="/platform/enterprise-identity" title="Configuration vs runtime" description="The left side is deployment/environment governance metadata. The right side is the current application authentication contract." />
        <div className="platform-enterprise-identity__split-grid">
          <article>
            <h4>Configuration metadata</h4>
            <p>These values describe intended or supplied enterprise identity policy. They do not make the login path enforce that policy.</p>
            <div className="platform-enterprise-identity__chips">
              {enforcementEntries.map(([key, value]) => <span key={key}><b>{pretty(key)}</b>{valueText(value)}</span>)}
            </div>
          </article>
          <article>
            <h4>Runtime authentication coverage</h4>
            <p>These are the authentication capabilities the current Platform code path actually executes.</p>
            <div className="platform-enterprise-identity__runtime-list">
              {runtimeEntries.map(([key, value]) => <div key={key}><span>{pretty(key)}</span><BoolBadge value={value} /></div>)}
            </div>
          </article>
        </div>
      </section>

      <section className="io-workspace-panel platform-enterprise-identity__section">
        <OperationalSectionHeader iconPath="/platform/enterprise-identity" title="Provider configuration" description="Provider entries show non-secret configuration presence only. No provider connectivity, token exchange, assertion processing, or login success is verified here." />
        <div className="platform-enterprise-identity__table-wrap">
          <table className="platform-enterprise-identity__table">
            <thead><tr><th>Provider</th><th>Environment enabled</th><th>Configuration metadata</th><th>Live authentication</th></tr></thead>
            <tbody>
              {providerEntries.map(([provider, config]) => {
                const runtimeAvailable = provider === 'oidc' ? Boolean(runtimeCapabilities.oidc_login_execution) : Boolean(runtimeCapabilities.saml_assertion_processing);
                return <tr key={provider}>
                  <td><strong>{provider.toUpperCase()}</strong></td>
                  <td><BoolBadge value={Boolean(config.enabled)} trueLabel="Enabled flag" falseLabel="Disabled" /></td>
                  <td><div className="platform-enterprise-identity__chips platform-enterprise-identity__chips--compact">{Object.entries(config).filter(([key]) => key !== 'enabled').map(([key, value]) => <span key={key}><b>{pretty(key)}</b>{valueText(value)}</span>)}</div></td>
                  <td><BoolBadge value={runtimeAvailable} trueLabel="Implemented" falseLabel="Not implemented" /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="io-workspace-panel platform-enterprise-identity__section">
        <OperationalSectionHeader iconPath="/platform/enterprise-identity" title="Review signals" description="Configuration defects and runtime implementation gaps are reported separately so a clean environment file cannot hide missing authentication execution." />
        <div className="platform-enterprise-identity__signal-grid">
          <article><h4>Configuration attention</h4><SignalList values={configurationAttention} empty="No configuration-metadata attention signals." /></article>
          <article><h4>Runtime attention</h4><SignalList values={runtimeAttention} empty="No runtime identity gaps reported." /></article>
        </div>
      </section>

      <section className="io-workspace-panel platform-enterprise-identity__section">
        <OperationalSectionHeader iconPath="/platform/audit" title="Audit requirement metadata" description="These flags describe configured audit requirements. They do not prove that an external identity provider event was emitted, received, retained, or correlated." />
        <div className="platform-enterprise-identity__chips">
          {auditEntries.map(([key, value]) => <span key={key}><b>{pretty(key)}</b>{valueText(value)}</span>)}
        </div>
      </section>

      <section className="io-workspace-panel platform-enterprise-identity__section">
        <OperationalSectionHeader iconPath="/platform/security" title="Supporting Platform evidence" description="Links are shown only when the operator can actually open the underlying protected evidence source." />
        <div className="platform-enterprise-identity__links">
          <SourceLink href="/platform/security">My Security</SourceLink>
          {canReadUsers ? <SourceLink href="/platform/users">Platform Users</SourceLink> : null}
          {canReadSessions ? <SourceLink href="/platform/sessions">Platform Sessions</SourceLink> : null}
          {canReadAudit ? <SourceLink href="/platform/audit?source=security">Platform Audit</SourceLink> : null}
          {canReadAccessReviews ? <SourceLink href="/platform/permission-audit">Permission Audit</SourceLink> : null}
          {canReadAccessReviews ? <SourceLink href="/platform/access-reviews">Access Reviews</SourceLink> : null}
          {canReadCompliance ? <SourceLink href="/platform/compliance-documents">Compliance Documents</SourceLink> : null}
          {canReadCompliance ? <SourceLink href="/platform/compliance-export">Compliance Export</SourceLink> : null}
          {canReadCompliance ? <SourceLink href="/platform/legal-compliance-reporting">Legal & Compliance Reporting</SourceLink> : null}
        </div>
      </section>

      <section className="io-workspace-panel platform-enterprise-identity__section platform-enterprise-identity__truth">
        <OperationalSectionHeader iconPath="/platform/enterprise-identity" title="Evidence boundary" description="What this page can and cannot prove." />
        <div className="platform-enterprise-identity__truth-grid">
          <article><strong>Environment configuration is not runtime enforcement.</strong><span>An enabled OIDC/SAML flag does not route Platform login through that provider.</span></article>
          <article><strong>Configured provider metadata is not provider connectivity.</strong><span>Issuer, entity ID, client ID or certificate presence does not prove successful federation.</span></article>
          <article><strong>SSO-required metadata is not currently enforced.</strong><span>The live Platform login path remains password authentication with optional TOTP MFA.</span></article>
          <article><strong>Audit requirements are policy metadata.</strong><span>A requirement flag does not prove SSO login events or configuration changes were externally generated or retained.</span></article>
          <article><strong>JIT/domain controls are not active execution.</strong><span>Configured JIT provisioning or tenant-domain discovery flags do not provision accounts or route login today.</span></article>
          <article><strong>Readiness requires implementation evidence.</strong><span>This workspace cannot report Enterprise Identity Ready while the configured SSO controls are absent from the runtime auth path.</span></article>
        </div>
      </section>
    </> : null}
  </div>;
}
