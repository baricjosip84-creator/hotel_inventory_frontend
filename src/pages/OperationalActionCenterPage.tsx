import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useRouteQueryState } from '../lib/useRouteQueryState';

type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';
type ActionDomain = 'all' | 'alerts' | 'execution' | 'control_tower' | 'decision_intelligence' | 'ai_governance' | 'multi_domain';

type OperationalAction = {
  action_id: string;
  action_domain: string;
  action_type: string;
  action_status: string;
  urgency: ActionUrgency | string;
  priority_score?: number | string | null;
  title: string;
  summary?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  recommended_next_step?: string | null;
  required_permission?: string | null;
  approval_required?: boolean;
  explainability?: {
    primary_factors?: string[];
    source_surface?: string;
    human_action_only?: boolean;
  };
  safety_contract?: Record<string, boolean>;
  created_at?: string | null;
  updated_at?: string | null;
};

type ActionCenterSummary = {
  total_actions?: number;
  by_urgency?: Record<string, number>;
  by_domain?: Record<string, number>;
  by_status?: Record<string, number>;
  approval_required_count?: number;
  highest_urgency?: string | null;
};

type ActionCenterResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    action_domain?: string | null;
    urgency?: string | null;
    limit?: number;
  };
  summary?: ActionCenterSummary;
  actions?: OperationalAction[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const ACTION_DOMAIN_VALUES = ['all', 'alerts', 'execution', 'control_tower', 'decision_intelligence', 'ai_governance', 'multi_domain'] as const;

const ACTION_DOMAINS: Array<{ value: ActionDomain; label: string }> = [
  { value: 'all', label: 'All domains' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const URGENCY_FILTER_VALUES = ['all', 'critical', 'high', 'medium', 'low'] as const;

const URGENCY_FILTERS: Array<{ value: 'all' | ActionUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const cardGridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
  alignItems: 'center',
  marginBottom: 16
};

const selectStyle: CSSProperties = {
  border: '1px solid var(--color-border)',
  borderRadius: 10,
  padding: '10px 12px',
  background: 'white',
  minWidth: 190
};

const actionListStyle: CSSProperties = {
  display: 'grid',
  gap: 12
};

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f3f4f6',
  color: '#374151',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize'
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/alerts',
    '/execution-tasks',
    '/execution-requests',
    '/insights',
    '/system-context',
    '/automation-schedules',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/procurement-recommendations',
    '/reports'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

async function fetchActionCenter(domain: ActionDomain, urgency: 'all' | ActionUrgency): Promise<ActionCenterResponse> {
  const params = new URLSearchParams({ limit: '50' });

  if (domain !== 'all') {
    params.set('action_domain', domain);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<ActionCenterResponse>(`/operational-action-center/summary?${params.toString()}`);
}

export default function OperationalActionCenterPage() {
  const [domain, setDomain] = useRouteQueryState<ActionDomain>({
    paramName: 'domain',
    defaultValue: 'all',
    allowedValues: ACTION_DOMAIN_VALUES
  });
  const [urgency, setUrgency] = useRouteQueryState<'all' | ActionUrgency>({
    paramName: 'urgency',
    defaultValue: 'all',
    allowedValues: URGENCY_FILTER_VALUES
  });

  const actionCenterQuery = useQuery({
    queryKey: ['operational-action-center', domain, urgency],
    queryFn: () => fetchActionCenter(domain, urgency)
  });

  const response = actionCenterQuery.data;
  const actions = response?.actions || [];
  const summary = response?.summary || {};
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  return (
    <div>
      <div className="card-grid" style={cardGridStyle}>
        <div className="card">
          <div className="card__label">Open actions</div>
          <div className="card__value">{numberValue(summary.total_actions ?? actions.length)}</div>
          <div className="card__subtext">Prioritized across backend action domains.</div>
        </div>
        <div className="card">
          <div className="card__label">Highest urgency</div>
          <div className="card__value" style={{ textTransform: 'capitalize' }}>{formatLabel(summary.highest_urgency)}</div>
          <div className="card__subtext">Calculated by the action-center service.</div>
        </div>
        <div className="card">
          <div className="card__label">Approval gated</div>
          <div className="card__value">{numberValue(summary.approval_required_count)}</div>
          <div className="card__subtext">Items requiring human governance review.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">Read-only commercial command surface.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Commercial action inbox</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={domain} onChange={(event) => setDomain(event.target.value as ActionDomain)}>
              {ACTION_DOMAINS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => actionCenterQuery.refetch()} disabled={actionCenterQuery.isFetching}>
              {actionCenterQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {actionCenterQuery.isLoading ? (
            <p className="card__subtext">Loading action-center summary…</p>
          ) : actionCenterQuery.error ? (
            <p className="card__subtext">
              {actionCenterQuery.error instanceof ApiError
                ? actionCenterQuery.error.message
                : 'Unable to load the action center.'}
            </p>
          ) : actions.length === 0 ? (
            <p className="card__subtext">No action-center items matched the selected filters.</p>
          ) : (
            <div style={actionListStyle}>
              {actions.map((action) => {
                const sourcePath = sourceSurfaceToAppPath(action.explainability?.source_surface);

                return (
                  <article key={action.action_id} className="card" style={{ background: 'var(--color-surface-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{action.title}</div>
                        <div className="card__subtext">{action.summary || 'No summary provided.'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <span style={badgeStyle}>{formatLabel(action.urgency)}</span>
                        <span style={badgeStyle}>{formatLabel(action.action_domain)}</span>
                        <span style={badgeStyle}>{formatLabel(action.action_status)}</span>
                      </div>
                    </div>

                    <div className="card__subtext">
                      Recommended next step: {action.recommended_next_step || 'Review source workflow before acting.'}
                    </div>
                    <div className="card__subtext">
                      Priority score: {numberValue(action.priority_score)} · Updated: {formatDateTime(action.updated_at || action.created_at)}
                    </div>
                    {action.explainability?.primary_factors?.length ? (
                      <div className="card__subtext">
                        Evidence: {action.explainability.primary_factors.join(' · ')}
                      </div>
                    ) : null}
                    {sourcePath ? (
                      <div style={{ marginTop: 10 }}>
                        <Link className="button button--secondary" to={sourcePath}>Open source workflow</Link>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Read-only safety contract</div>
        <div className="card-grid" style={cardGridStyle}>
          {safetyEntries.slice(0, 8).map(([key]) => (
            <div className="card" key={key}>
              <div className="card__label">Guaranteed</div>
              <div style={{ fontWeight: 800 }}>{formatLabel(key)}</div>
            </div>
          ))}
        </div>
        <p className="card__subtext">Generated at: {formatDateTime(response?.generated_at)}</p>
      </section>
    </div>
  );
}
