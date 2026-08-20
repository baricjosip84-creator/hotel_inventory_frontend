import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { platformApiRequest } from '../lib/platformApi';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  type OperationalWorkspaceStatTone
} from '../components/ui/OperationalWorkspace';
import './PlatformDashboardPage.css';

type CountRow = { status: string; count: number };
type NotificationCount = { status: string; severity: string; count: number };
type TenantAttention = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string; write_locked?: boolean; updated_at?: string };
type SupportSessionAttention = { id: string; tenant_id: string; tenant_name: string; reason: string; access_level: string; ticket_reference?: string | null; expires_at: string; platform_user_email: string };
type LimitAttention = { id: string; name: string; status: string; billing_status: string; plan_code: string; limits: Array<{ key: string; used: number; limit: number; percent_used: number }> };
type StaleTenant = { id: string; name: string; status: string; billing_status: string; plan_code: string; last_seen_at?: string | null };
type DashboardVisibility = {
  tenants: boolean;
  platform_sessions: boolean;
  notifications: boolean;
  audit: boolean;
  billing_attention: boolean;
  support_sessions: boolean;
};
type Dashboard = {
  generated_at: string;
  visibility: DashboardVisibility;
  tenants_by_status: CountRow[];
  support_sessions_by_status: CountRow[];
  active_platform_sessions: number | null;
  notifications: NotificationCount[];
  platform_audit_events_last_24h: number | null;
  attention: {
    billing_or_lifecycle: TenantAttention[];
    locked_tenants: TenantAttention[];
    active_support_sessions: SupportSessionAttention[];
    stale_tenants: StaleTenant[];
    limit_attention: LimitAttention[];
  };
};

function humanize(value: string | null | undefined): string {
  const normalized = String(value || '').trim().replace(/_/g, ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function shortId(value: string): string {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function Empty({ label }: { label: string }) {
  return <div className="app-empty-state platform-dashboard__empty">{label}</div>;
}

function SectionHeading({
  iconPath,
  title,
  description,
  to,
  linkLabel
}: {
  iconPath: string;
  title: string;
  description?: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <OperationalSectionHeader
      iconPath={iconPath}
      title={title}
      description={description}
      actions={to && linkLabel ? <Link to={to} className="platform-dashboard__section-link">{linkLabel}</Link> : undefined}
    />
  );
}

function MetricCard({
  label,
  value,
  helper,
  to,
  iconPath,
  tone = 'default'
}: {
  label: string;
  value: ReactNode;
  helper: string;
  to?: string;
  iconPath: string;
  tone?: OperationalWorkspaceStatTone;
}) {
  return (
    <article className="io-workspace-stat platform-dashboard__metric" data-tone={tone}>
      <div className="io-workspace-stat__topline">
        <span className="io-workspace-stat__icon" aria-hidden="true">
          <TenantNavIcon path={iconPath} size={18} />
        </span>
        <span className="io-workspace-stat__label">{label}</span>
      </div>
      <div className="io-workspace-stat__value">{value}</div>
      <div className="io-workspace-stat__helper">{helper}</div>
      {to ? <Link to={to} className="platform-dashboard__metric-link">Open details</Link> : null}
    </article>
  );
}

function TenantIdentity({ id, name }: { id: string; name: string }) {
  return (
    <div className="platform-dashboard__identity-line">
      <strong>{name}</strong>
      <span className="platform-dashboard__id" title={id}>ID {shortId(id)}</span>
    </div>
  );
}

function DetailLine({ children }: { children: ReactNode }) {
  return <span className="platform-dashboard__detail-line">{children}</span>;
}

export default function PlatformDashboardPage() {
  const q = useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => platformApiRequest<Dashboard>('/platform/dashboard'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
  const data = q.data;
  const visibility = data?.visibility;
  const attentionTotal = data?.attention
    ? (visibility?.billing_attention ? data.attention.billing_or_lifecycle.length : 0)
      + (visibility?.tenants ? data.attention.locked_tenants.length + data.attention.stale_tenants.length + data.attention.limit_attention.length : 0)
      + (visibility?.support_sessions ? data.attention.active_support_sessions.length : 0)
    : 0;
  const hasAttentionVisibility = Boolean(visibility?.billing_attention || visibility?.tenants || visibility?.support_sessions);
  const hasOverviewVisibility = Boolean(visibility?.tenants || visibility?.support_sessions || visibility?.notifications);
  const refreshError = q.isError && Boolean(data);
  const initialLoadError = q.isError && !data;

  return (
    <div className="io-operational-page io-workspace-page platform-dashboard">
      <OperationalWorkspaceHero
        iconPath="/platform/dashboard"
        eyebrow="Platform administration"
        title="Platform operations workspace"
        description="Monitor tenant status, support access, platform sessions, notifications, audit activity, limits, and account attention from one permission-aware control-plane overview."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Permission-aware</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only operational summary</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-dashboard__hero-aside">
            <OperationalWorkspaceStatus
              value={data && hasAttentionVisibility ? attentionTotal : '—'}
              label={hasAttentionVisibility ? 'visible attention items in this snapshot' : 'attention visibility depends on platform permissions'}
            />
            <div className="platform-dashboard__refresh-block">
              <span className="platform-dashboard__refresh-meta">Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void q.refetch()}
                disabled={q.isFetching}
              >
                {q.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      {q.isLoading ? <section className="app-panel app-panel--padded">Loading platform dashboard…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-dashboard__feedback" role="alert">
          <strong>Platform dashboard failed to load.</strong>
          <span>{q.error instanceof Error ? q.error.message : 'Failed to load dashboard'}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-dashboard__retry"
            onClick={() => void q.refetch()}
            disabled={q.isFetching}
          >
            {q.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-warning-state platform-dashboard__feedback" role="status">
          <strong>Latest refresh failed.</strong>
          <span>Showing the last successful dashboard snapshot from {formatDateTime(data?.generated_at)}.</span>
          <span>{q.error instanceof Error ? q.error.message : 'The latest refresh could not be completed.'}</span>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Platform dashboard key metrics">
            {visibility?.platform_sessions ? (
              <MetricCard
                label="Active platform sessions"
                value={data.active_platform_sessions ?? 0}
                helper="Currently usable platform-user sessions"
                to="/platform/sessions"
                iconPath="/platform/sessions"
                tone="blue"
              />
            ) : null}
            {visibility?.audit ? (
              <MetricCard
                label="Audit events last 24h"
                value={data.platform_audit_events_last_24h ?? 0}
                helper="Platform audit evidence created in the last 24 hours"
                to="/platform/audit"
                iconPath="/platform/audit"
                tone="neutral"
              />
            ) : null}
            {hasAttentionVisibility ? (
              <MetricCard
                label="Attention items"
                value={attentionTotal}
                helper="Visible billing, lock, support, inactivity, and limit items"
                iconPath="/platform/notifications"
                tone={attentionTotal > 0 ? 'warn' : 'good'}
              />
            ) : null}
          </OperationalWorkspaceStats>

          {hasOverviewVisibility ? (
            <section className="platform-dashboard__overview-grid">
              {visibility?.tenants ? (
                <div className="app-panel app-panel--padded platform-dashboard__panel">
                  <SectionHeading iconPath="/platform/tenants" title="Tenants by status" to="/platform/tenants" linkLabel="Open tenants" />
                  <div className="platform-dashboard__rows">
                    {data.tenants_by_status.length
                      ? data.tenants_by_status.map((x) => <div key={x.status} className="platform-dashboard__row"><span>{humanize(x.status)}</span><strong>{x.count}</strong></div>)
                      : <Empty label="No tenant status data" />}
                  </div>
                </div>
              ) : null}
              {visibility?.support_sessions ? (
                <div className="app-panel app-panel--padded platform-dashboard__panel">
                  <SectionHeading iconPath="/platform/support-sessions" title="Support sessions" to="/platform/support-sessions" linkLabel="Open support sessions" />
                  <div className="platform-dashboard__rows">
                    {data.support_sessions_by_status.length
                      ? data.support_sessions_by_status.map((x) => <div key={x.status} className="platform-dashboard__row"><span>{humanize(x.status)}</span><strong>{x.count}</strong></div>)
                      : <Empty label="No support sessions" />}
                  </div>
                </div>
              ) : null}
              {visibility?.notifications ? (
                <div className="app-panel app-panel--padded platform-dashboard__panel">
                  <SectionHeading iconPath="/platform/notifications" title="Notifications" to="/platform/notifications" linkLabel="Open notifications" />
                  <div className="platform-dashboard__rows">
                    {data.notifications.length
                      ? data.notifications.map((x) => <div key={`${x.status}-${x.severity}`} className="platform-dashboard__row"><span>{humanize(x.status)} · {humanize(x.severity)}</span><strong>{x.count}</strong></div>)
                      : <Empty label="No notifications" />}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {visibility?.billing_attention ? (
            <section className="app-panel app-panel--padded platform-dashboard__panel">
              <SectionHeading
                iconPath="/platform/billing"
                title="Billing / lifecycle attention"
                description="Tenants with billing or lifecycle states that may require platform follow-up."
                to="/platform/billing"
                linkLabel="Open billing"
              />
              <div className="platform-dashboard__items">
                {data.attention.billing_or_lifecycle.length
                  ? data.attention.billing_or_lifecycle.map((tenant) => (
                      <div key={tenant.id} className="platform-dashboard__item">
                        <TenantIdentity id={tenant.id} name={tenant.name} />
                        <DetailLine>Lifecycle: {humanize(tenant.status)} · Billing: {humanize(tenant.billing_status)} · Plan: {humanize(tenant.plan_code || 'no plan')}</DetailLine>
                      </div>
                    ))
                  : <Empty label="No billing or lifecycle attention items" />}
              </div>
            </section>
          ) : null}

          {visibility?.tenants ? (
            <section className="app-panel app-panel--padded platform-dashboard__panel">
              <SectionHeading
                iconPath="/platform/tenants"
                title="Limit attention"
                description="Configured user, product, or storage-location limits at 80% usage or higher."
                to="/platform/tenants"
                linkLabel="Open tenants"
              />
              <div className="platform-dashboard__items">
                {data.attention.limit_attention.length
                  ? data.attention.limit_attention.map((tenant) => (
                      <div key={tenant.id} className="platform-dashboard__item">
                        <TenantIdentity id={tenant.id} name={tenant.name} />
                        {tenant.limits.map((limit) => (
                          <DetailLine key={limit.key}>{humanize(limit.key)}: {limit.used}/{limit.limit} ({limit.percent_used}%)</DetailLine>
                        ))}
                      </div>
                    ))
                  : <Empty label="No tenants near or over configured limits" />}
              </div>
            </section>
          ) : null}

          {visibility?.support_sessions ? (
            <section className="app-panel app-panel--padded platform-dashboard__panel">
              <SectionHeading
                iconPath="/platform/support-sessions"
                title="Active support sessions"
                description="Currently active, unexpired support access across tenants."
                to="/platform/support-sessions"
                linkLabel="Open support sessions"
              />
              <div className="platform-dashboard__items">
                {data.attention.active_support_sessions.length
                  ? data.attention.active_support_sessions.map((session) => (
                      <div key={session.id} className="platform-dashboard__item">
                        <TenantIdentity id={session.tenant_id} name={session.tenant_name} />
                        <DetailLine>{humanize(session.access_level)} · Operator: {session.platform_user_email}</DetailLine>
                        <DetailLine>Expires: {formatDateTime(session.expires_at)}</DetailLine>
                        {session.ticket_reference ? <DetailLine>Ticket: {session.ticket_reference}</DetailLine> : null}
                        <DetailLine>Reason: {session.reason}</DetailLine>
                      </div>
                    ))
                  : <Empty label="No active, unexpired support sessions" />}
              </div>
            </section>
          ) : null}

          {visibility?.tenants ? (
            <section className="platform-dashboard__split-grid">
              <div className="app-panel app-panel--padded platform-dashboard__panel">
                <SectionHeading iconPath="/platform/tenants" title="Locked tenants" to="/platform/tenants" linkLabel="Open tenants" />
                <div className="platform-dashboard__items">
                  {data.attention.locked_tenants.length
                    ? data.attention.locked_tenants.map((tenant) => (
                        <div key={tenant.id} className="platform-dashboard__item">
                          <TenantIdentity id={tenant.id} name={tenant.name} />
                          <DetailLine>{humanize(tenant.status)} · {humanize(tenant.billing_status)} · {humanize(tenant.plan_code)}</DetailLine>
                        </div>
                      ))
                    : <Empty label="No locked tenants" />}
                </div>
              </div>
              <div className="app-panel app-panel--padded platform-dashboard__panel">
                <SectionHeading
                  iconPath="/platform/tenant-health"
                  title="Stale active / trial tenants"
                  description="Active or trial tenants with no recorded activity for 30 days, or no recorded activity at all."
                  to="/platform/tenants"
                  linkLabel="Open tenants"
                />
                <div className="platform-dashboard__items">
                  {data.attention.stale_tenants.length
                    ? data.attention.stale_tenants.map((tenant) => (
                        <div key={tenant.id} className="platform-dashboard__item">
                          <TenantIdentity id={tenant.id} name={tenant.name} />
                          <DetailLine>{humanize(tenant.status)} · {humanize(tenant.billing_status)} · {humanize(tenant.plan_code)}</DetailLine>
                          <DetailLine>Last activity: {tenant.last_seen_at ? formatDateTime(tenant.last_seen_at) : 'Never recorded'}</DetailLine>
                        </div>
                      ))
                    : <Empty label="No stale active or trial tenants" />}
                </div>
              </div>
            </section>
          ) : null}

          {!visibility?.tenants && !visibility?.platform_sessions && !visibility?.notifications && !visibility?.audit && !visibility?.support_sessions ? (
            <section className="app-panel app-panel--padded platform-dashboard__panel">
              <Empty label="Your role can open the Platform Dashboard, but no detailed dashboard data categories are available with its current platform permissions." />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
