import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getAccessToken } from '../lib/auth';
import { getTenantPermissionSnapshot } from '../lib/permissions';

type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';
type ActionDomain = 'all' | 'alerts' | 'execution' | 'control_tower' | 'decision_intelligence' | 'ai_governance' | 'multi_domain';

type WorkspaceAction = {
  action_id: string;
  action_domain: string;
  action_type: string;
  action_status: string;
  urgency: ActionUrgency | string;
  title: string;
  summary?: string | null;
  recommended_next_step?: string | null;
  approval_required?: boolean;
  explainability?: {
    primary_factors?: string[];
    source_surface?: string;
    human_action_only?: boolean;
  };
  created_at?: string | null;
};

type WorkspaceWidget = {
  widget_id: string;
  visible_action_count: number;
  top_action_ids?: string[];
  read_only?: boolean;
  human_action_only?: boolean;
};

type WorkspaceResponse = {
  definition?: {
    workspace_id?: string;
    workspace_name?: string;
    primary_focus?: string;
    execution_mode?: string;
    default_widgets?: string[];
    action_strategy?: string;
    safety_contract?: Record<string, boolean>;
  };
  user_role?: string;
  role_permissions?: string[];
  workspace_profile?: {
    workspace_id?: string;
    workspace_name?: string;
    primary_focus?: string;
    default_widgets?: string[];
    action_strategy?: string;
  };
  summary?: {
    total_actions?: number;
    critical_actions?: number;
    approval_required?: number;
    by_domain?: Record<string, number>;
    by_status?: Record<string, number>;
    by_urgency?: Record<string, number>;
  };
  widgets?: WorkspaceWidget[];
  guidance?: {
    next_action_id?: string | null;
    next_action_title?: string | null;
    next_action_domain?: string | null;
    next_action_urgency?: string | null;
    hidden_action_count_due_to_role_permissions?: number;
    operator_guidance?: string;
    escalation_guidance?: string;
  };
  actions?: WorkspaceAction[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const ACTION_DOMAINS: Array<{ value: ActionDomain; label: string }> = [
  { value: 'all', label: 'All domains' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution' },
  { value: 'control_tower', label: 'Control tower' },
  { value: 'decision_intelligence', label: 'Decision intelligence' },
  { value: 'ai_governance', label: 'AI governance' },
  { value: 'multi_domain', label: 'Multi-domain' }
];

const URGENCY_FILTERS: Array<{ value: 'all' | ActionUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))'
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

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getCurrentAccessRoleLabel(): string {
  const snapshot = getTenantPermissionSnapshot();
  if (snapshot?.access_role_label?.trim()) return snapshot.access_role_label.trim();
  const payload = decodeJwtPayload(getAccessToken());
  const customRoleName = payload?.custom_role_name;
  if (typeof customRoleName === 'string' && customRoleName.trim()) {
    return customRoleName.trim();
  }
  const role = payload?.role;
  return role === 'admin' || role === 'manager' || role === 'staff' ? role : 'unknown';
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not reported';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) {
    return null;
  }

  const tenantRoutes = new Set([
    '/action-center',
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

async function fetchWorkspace(domain: ActionDomain, urgency: 'all' | ActionUrgency): Promise<WorkspaceResponse> {
  const params = new URLSearchParams({ limit: '50' });

  if (domain !== 'all') {
    params.set('action_domain', domain);
  }

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  return apiRequest<WorkspaceResponse>(`/operational-action-center/workspace-summary?${params.toString()}`);
}

export default function RoleAwareWorkspacePage() {
  const [domain, setDomain] = useState<ActionDomain>('all');
  const [urgency, setUrgency] = useState<'all' | ActionUrgency>('all');
  const accessRoleLabel = useMemo(() => getCurrentAccessRoleLabel(), []);

  const workspaceQuery = useQuery({
    queryKey: ['role-aware-workspace', domain, urgency],
    queryFn: () => fetchWorkspace(domain, urgency)
  });

  const response = workspaceQuery.data;
  const summary = response?.summary || {};
  const widgets = response?.widgets || [];
  const actions = response?.actions || [];
  const workspace = response?.workspace_profile || response?.definition || {};

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">Workspace</div>
          <div className="card__value" style={{ fontSize: 20 }}>{workspace.workspace_name || 'Role workspace'}</div>
          <div className="card__subtext">Access role detected from the active tenant session: {accessRoleLabel}.</div>
        </div>
        <div className="card">
          <div className="card__label">Visible actions</div>
          <div className="card__value">{numberValue(summary.total_actions ?? actions.length)}</div>
          <div className="card__subtext">Filtered through backend role and permission visibility.</div>
        </div>
        <div className="card">
          <div className="card__label">Critical actions</div>
          <div className="card__value">{numberValue(summary.critical_actions)}</div>
          <div className="card__subtext">Highest pressure items in this role workspace.</div>
        </div>
        <div className="card">
          <div className="card__label">Hidden by role</div>
          <div className="card__value">{numberValue(response?.guidance?.hidden_action_count_due_to_role_permissions)}</div>
          <div className="card__subtext">Items withheld by backend role-permission filtering.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Role-aware workspace controls</div>
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
            <button className="button button--secondary" type="button" onClick={() => workspaceQuery.refetch()} disabled={workspaceQuery.isFetching}>
              {workspaceQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {workspaceQuery.isLoading ? (
            <p className="card__subtext">Loading role-aware workspace…</p>
          ) : workspaceQuery.error ? (
            <p className="card__subtext">
              {workspaceQuery.error instanceof ApiError
                ? workspaceQuery.error.message
                : 'Unable to load the role-aware workspace.'}
            </p>
          ) : (
            <div className="card-grid" style={gridStyle}>
              <div className="card" style={{ background: 'var(--color-surface-soft)' }}>
                <div className="card__label">Primary focus</div>
                <div style={{ fontWeight: 800 }}>{workspace.primary_focus || 'Not reported'}</div>
              </div>
              <div className="card" style={{ background: 'var(--color-surface-soft)' }}>
                <div className="card__label">Action strategy</div>
                <div style={{ fontWeight: 800 }}>{workspace.action_strategy || 'Not reported'}</div>
              </div>
              <div className="card" style={{ background: 'var(--color-surface-soft)' }}>
                <div className="card__label">Execution mode</div>
                <div style={{ fontWeight: 800 }}>{formatLabel(response?.definition?.execution_mode)}</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Workspace widgets</div>
        <div className="card-grid" style={gridStyle}>
          {widgets.length === 0 ? (
            <div className="card">
              <div className="card__subtext">No widgets were returned for this role and filter set.</div>
            </div>
          ) : widgets.map((widget) => (
            <div className="card" key={widget.widget_id}>
              <div className="card__label">Read-only widget</div>
              <div className="card__value" style={{ fontSize: 19 }}>{formatLabel(widget.widget_id)}</div>
              <div className="card__subtext">Visible actions: {numberValue(widget.visible_action_count)} · Human action only: {widget.human_action_only ? 'yes' : 'no'}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Guided next actions</div>
        <div className="card">
          <div style={{ fontWeight: 800 }}>{response?.guidance?.next_action_title || 'No next action selected'}</div>
          <p className="card__subtext">{response?.guidance?.operator_guidance || 'Workspace guidance is not available yet.'}</p>
          <p className="card__subtext">{response?.guidance?.escalation_guidance || 'No escalation guidance returned.'}</p>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {actions.slice(0, 12).map((action) => {
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
                {action.recommended_next_step ? (
                  <p className="card__subtext"><strong>Next step:</strong> {action.recommended_next_step}</p>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  {sourcePath ? (
                    <Link className="button button--secondary" to={sourcePath}>Open source workflow</Link>
                  ) : null}
                  <Link className="button button--secondary" to="/action-center">Open action center</Link>
                </div>
              </article>
            );
          })}
        </div>
        <p className="card__subtext">Generated at: {formatDateTime(response?.generated_at)}</p>
      </section>
    </div>
  );
}
