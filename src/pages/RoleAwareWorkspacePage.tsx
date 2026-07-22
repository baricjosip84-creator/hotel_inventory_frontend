import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getAccessToken } from '../lib/auth';
import {
  TENANT_PERMISSIONS,
  getTenantPermissionSnapshot,
  hasPermission
} from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';
import './RoleAwareWorkspacePage.css';

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
  source_id?: string | null;
  recommended_next_step?: string | null;
  approval_required?: boolean;
  explainability?: {
    primary_factors?: string[];
    source_surface?: string;
    human_action_only?: boolean;
  };
  created_at?: string | null;
  updated_at?: string | null;
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
    primary_focus?: string[] | string;
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
    primary_focus?: string[] | string;
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

const ACTION_DOMAIN_VALUES = ['all', 'alerts', 'execution', 'control_tower', 'decision_intelligence', 'ai_governance', 'multi_domain'] as const;

const ACTION_DOMAINS: Array<{ value: ActionDomain; label: string }> = [
  { value: 'all', label: 'All work areas' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'execution', label: 'Execution tasks' },
  { value: 'control_tower', label: 'Cross-area risk signals' },
  { value: 'decision_intelligence', label: 'Decision reviews' },
  { value: 'ai_governance', label: 'AI governance reviews' },
  { value: 'multi_domain', label: 'Multi-area work' }
];

const URGENCY_FILTER_VALUES = ['all', 'critical', 'high', 'medium', 'low'] as const;

const URGENCY_FILTERS: Array<{ value: 'all' | ActionUrgency; label: string }> = [
  { value: 'all', label: 'All urgency levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

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

const PRIMARY_FOCUS_LABELS: Record<string, string> = {
  critical_actions: 'urgent work',
  approval_required: 'items waiting for approval',
  cross_domain_risk: 'issues affecting more than one area',
  governance_reviews: 'controlled human reviews',
  execution: 'daily operational tasks',
  alerts: 'warnings that need attention',
  control_tower: 'cross-area risk signals',
  permitted_actions: 'work allowed for this role'
};

const ACTION_STRATEGY_LABELS: Record<string, string> = {
  cross_domain_command_and_governance: 'Review important work across the tenant and send each item to the correct controlled process.',
  facility_and_process_coordination: 'Coordinate daily operational work, warnings, and approvals.',
  guided_execution_and_triage: 'Follow assigned work and deal with urgent warnings safely.',
  permission_limited_review: 'Review only the work that this role is allowed to see.'
};

const WIDGET_LABELS: Record<string, { title: string; description: string }> = {
  priority_action_inbox: {
    title: 'Priority work list',
    description: 'All visible work, ordered so the most urgent items come first.'
  },
  approval_review_queue: {
    title: 'Items waiting for approval',
    description: 'Work that needs a person to review or approve it.'
  },
  control_tower_risk_feed: {
    title: 'Cross-area risk signals',
    description: 'Warnings that may affect more than one part of the operation.'
  },
  decision_governance_feed: {
    title: 'Decision reviews',
    description: 'Recommendations or decisions that still need human control.'
  },
  execution_pressure_panel: {
    title: 'Execution tasks',
    description: 'Open operational tasks that are waiting, active, or blocked.'
  },
  execution_task_queue: {
    title: 'Execution tasks',
    description: 'Open operational tasks that are waiting, active, or blocked.'
  },
  alert_triage_panel: {
    title: 'Alerts to review',
    description: 'Warnings that should be checked and handled in the Alerts page.'
  },
  my_execution_queue: {
    title: 'My execution work',
    description: 'Operational tasks currently visible to this role.'
  },
  urgent_alerts: {
    title: 'Urgent alerts',
    description: 'High-pressure warnings that should be reviewed first.'
  },
  next_safe_action_panel: {
    title: 'Safest next step',
    description: 'The highest-priority work that can be reviewed next.'
  }
};

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

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
  if (typeof customRoleName === 'string' && customRoleName.trim()) return customRoleName.trim();

  const role = payload?.role;
  return role === 'admin' || role === 'manager' || role === 'staff' ? role : 'custom role';
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not reported';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function urgencyBadgeStyle(urgency?: string | null): CSSProperties {
  if (urgency === 'critical') return { ...badgeStyle, background: '#fee2e2', color: '#991b1b' };
  if (urgency === 'high') return { ...badgeStyle, background: '#ffedd5', color: '#9a3412' };
  if (urgency === 'medium') return { ...badgeStyle, background: '#fef3c7', color: '#92400e' };
  return { ...badgeStyle, background: '#dcfce7', color: '#166534' };
}

function actionTitleLabel(action: WorkspaceAction): string {
  const title = formatLabel(action.title);
  if (action.action_domain === 'alerts' && title === title.toUpperCase()) {
    return title.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
  }
  return title;
}

function primaryFocusLabel(value?: string[] | string): string {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  if (!values.length) return 'Not reported';
  return values.map((item) => PRIMARY_FOCUS_LABELS[item] || formatLabel(item)).join(' · ');
}

function actionStrategyLabel(value?: string | null): string {
  if (!value) return 'Not reported';
  return ACTION_STRATEGY_LABELS[value] || formatLabel(value);
}

function executionModeLabel(value?: string | null): string {
  if (value === 'read_only_role_aware_workspace_orchestration') return 'Read-only guidance';
  return formatLabel(value);
}

function widgetContent(widgetId: string): { title: string; description: string } {
  return WIDGET_LABELS[widgetId] || {
    title: formatLabel(widgetId).replace(/\b\w/g, (character) => character.toUpperCase()),
    description: 'Read-only summary of matching work.'
  };
}

function sourceSurfaceToAppPath(sourceSurface?: string): string | null {
  if (!sourceSurface || !sourceSurface.startsWith('/')) return null;

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

type SourceActionLink = { to: string; label: string };

function sourceActionLink(action: WorkspaceAction): SourceActionLink | null {
  if (action.action_domain === 'alerts') {
    const params = new URLSearchParams({ resolved: 'false' });
    const search = String(action.summary || action.title || '').trim();
    if (search) params.set('search', search);
    return { to: `/alerts?${params.toString()}`, label: 'Open alert' };
  }

  if (action.action_domain === 'execution' && action.source_id) {
    const params = new URLSearchParams({ task_id: action.source_id });
    return { to: `/execution-tasks?${params.toString()}`, label: 'Open execution task' };
  }

  if (['decision_intelligence', 'ai_governance'].includes(action.action_domain)) {
    const params = new URLSearchParams({ source_action_id: action.action_id });
    return { to: `/intelligence-review?${params.toString()}`, label: 'Open review' };
  }

  const sourcePath = sourceSurfaceToAppPath(action.explainability?.source_surface);
  return sourcePath ? { to: sourcePath, label: 'Open source page' } : null;
}

function actionCenterLink(action: WorkspaceAction): string {
  const params = new URLSearchParams({ source_action_id: action.action_id });
  return `/action-center?${params.toString()}`;
}

async function fetchWorkspace(domain: ActionDomain, urgency: 'all' | ActionUrgency): Promise<WorkspaceResponse> {
  const params = new URLSearchParams({ limit: '50' });

  if (domain !== 'all') params.set('action_domain', domain);
  if (urgency !== 'all') params.set('urgency', urgency);

  return apiRequest<WorkspaceResponse>(`/operational-action-center/workspace-summary?${params.toString()}`);
}

export default function RoleAwareWorkspacePage() {
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
  const accessRoleLabel = useMemo(() => getCurrentAccessRoleLabel(), []);

  const canViewAlerts = hasPermission(TENANT_PERMISSIONS.ALERTS_READ);
  const canViewExecutionTasks = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canViewControlTower = hasPermission(TENANT_PERMISSIONS.CONTROL_TOWER_READ);
  const canViewDecisionIntelligence = hasPermission(TENANT_PERMISSIONS.DECISION_INTELLIGENCE_READ);

  const availableDomains = useMemo(() => {
    const allowed = new Set<ActionDomain>(['all']);
    if (canViewAlerts) allowed.add('alerts');
    if (canViewExecutionTasks) allowed.add('execution');
    if (canViewControlTower) allowed.add('control_tower');
    if (canViewDecisionIntelligence) {
      allowed.add('decision_intelligence');
      allowed.add('ai_governance');
      allowed.add('multi_domain');
    }
    return ACTION_DOMAINS.filter((option) => allowed.has(option.value));
  }, [canViewAlerts, canViewControlTower, canViewDecisionIntelligence, canViewExecutionTasks]);

  useEffect(() => {
    if (!availableDomains.some((option) => option.value === domain)) setDomain('all');
  }, [availableDomains, domain, setDomain]);

  const workspaceQuery = useQuery({
    queryKey: ['role-aware-workspace', domain, urgency],
    queryFn: () => fetchWorkspace(domain, urgency)
  });

  if (workspaceQuery.isLoading) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>Loading Workspace</div>
        <p className="card__subtext">Collecting the work that your role is allowed to see.</p>
      </div>
    );
  }

  if (workspaceQuery.error) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>Workspace could not be loaded</div>
        <p className="form-error">
          {workspaceQuery.error instanceof ApiError
            ? workspaceQuery.error.message
            : 'Unable to load the workspace.'}
        </p>
        <button className="button button--secondary" type="button" onClick={() => workspaceQuery.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const response = workspaceQuery.data;
  const summary = response?.summary || {};
  const widgets = response?.widgets || [];
  const actions = response?.actions || [];
  const workspace = response?.workspace_profile || response?.definition || {};
  const shownActions = actions.slice(0, 12);

  return (
    <div className="workspace-page">
      <div className="workspace-page__summary-grid">
        <div className="card">
          <div className="card__label">Workspace</div>
          <div className="card__value" style={{ fontSize: 20 }}>{workspace.workspace_name || 'Role workspace'}</div>
          <div className="card__subtext">Prepared for the current access role: {accessRoleLabel}.</div>
        </div>
        <div className="card">
          <div className="card__label">Actions available</div>
          <div className="card__value">{numberValue(summary.total_actions ?? actions.length)}</div>
          <div className="card__subtext">Open work currently returned for the selected filters.</div>
        </div>
        <div className="card">
          <div className="card__label">Critical actions</div>
          <div className="card__value">{numberValue(summary.critical_actions)}</div>
          <div className="card__subtext">Items that need the fastest attention.</div>
        </div>
        <div className="card">
          <div className="card__label">Role filtering</div>
          <div className="card__value" style={{ fontSize: 20 }}>Active</div>
          <div className="card__subtext">Only work that this role is allowed to read is included.</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800 }}>How this page works</div>
        <p className="card__subtext" style={{ marginBottom: 0 }}>
          Workspace gives each role a simpler view of the Action Center. It shows what deserves attention and sends the user to the correct page, but it does not complete tasks or change inventory itself.
        </p>
      </div>

      <section className="section">
        <div className="section__title">Workspace controls</div>
        <div className="card">
          <div className="workspace-page__toolbar">
            <select aria-label="Filter by work area" className="workspace-page__select" value={domain} onChange={(event) => setDomain(event.target.value as ActionDomain)}>
              {availableDomains.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select aria-label="Filter by urgency" className="workspace-page__select" value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => workspaceQuery.refetch()} disabled={workspaceQuery.isFetching}>
              {workspaceQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          <div className="workspace-page__context-grid">
            <div className="card workspace-page__card" style={{ background: 'var(--color-surface-soft)' }}>
              <div className="card__label">Main purpose</div>
              <div className="workspace-page__copy" style={{ fontWeight: 800 }}>{primaryFocusLabel(workspace.primary_focus)}</div>
            </div>
            <div className="card workspace-page__card" style={{ background: 'var(--color-surface-soft)' }}>
              <div className="card__label">How work is organised</div>
              <div className="workspace-page__copy" style={{ fontWeight: 800 }}>{actionStrategyLabel(workspace.action_strategy)}</div>
            </div>
            <div className="card workspace-page__card" style={{ background: 'var(--color-surface-soft)' }}>
              <div className="card__label">Page mode</div>
              <div className="workspace-page__copy" style={{ fontWeight: 800 }}>{executionModeLabel(response?.definition?.execution_mode)}</div>
              <div className="card__subtext">The page gives guidance only. Real work is completed on the source page.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__title">Workspace summaries</div>
        <div className="workspace-page__widget-grid">
          {widgets.length === 0 ? (
            <div className="card">
              <div style={{ fontWeight: 800 }}>No summary groups available</div>
              <div className="card__subtext">No workspace summary matched this role and filter selection.</div>
            </div>
          ) : widgets.map((widget) => {
            const content = widgetContent(widget.widget_id);
            const count = numberValue(widget.visible_action_count);

            return (
              <div className="card workspace-page__card" key={widget.widget_id}>
                <div className="card__label">Read-only summary</div>
                <div className="card__value" style={{ fontSize: 19 }}>{content.title}</div>
                <div className="card__subtext">{content.description}</div>
                <div style={{ marginTop: 10, fontWeight: 800 }}>{count} matching {count === 1 ? 'item' : 'items'}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Guided next actions</div>
        <div className="card">
          <div style={{ fontWeight: 800 }}>Where to start</div>
          <p className="card__subtext" style={{ marginBottom: 4 }}>
            {response?.guidance?.next_action_title
              ? `Start with: ${formatLabel(response.guidance.next_action_title)}.`
              : 'There is no open action to start with for the selected filters.'}
          </p>
          <p className="card__subtext" style={{ marginBottom: 4 }}>
            {response?.guidance?.operator_guidance || 'Workspace guidance is not available yet.'}
          </p>
          <p className="card__subtext" style={{ marginBottom: 0 }}>
            {response?.guidance?.escalation_guidance || 'Only permitted work is included.'}
          </p>
        </div>

        {actions.length === 0 ? (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 800 }}>No matching actions</div>
            <p className="card__subtext" style={{ marginBottom: 0 }}>
              No open work matched the selected area and urgency. Try a broader filter or refresh the page.
            </p>
          </div>
        ) : (
          <>
            {actions.length > shownActions.length ? (
              <p className="card__subtext">Showing the first {shownActions.length} of {actions.length} actions. Open the Action Center to review the complete returned list.</p>
            ) : null}
            <div className="workspace-page__action-list">
              {shownActions.map((action) => {
                const sourceLink = sourceActionLink(action);

                return (
                  <article key={action.action_id} className="card workspace-page__card" style={{ background: 'var(--color-surface-soft)' }}>
                    <div className="workspace-page__action-header">
                      <div className="workspace-page__action-copy">
                        <div style={{ fontWeight: 800 }}>{actionTitleLabel(action)}</div>
                        <div className="card__subtext">{action.summary || 'No summary provided.'}</div>
                      </div>
                      <div className="workspace-page__badges">
                        <span style={urgencyBadgeStyle(action.urgency)}>{formatLabel(action.urgency)}</span>
                        <span style={badgeStyle}>{formatLabel(action.action_domain)}</span>
                        <span style={badgeStyle}>{formatLabel(action.action_status)}</span>
                      </div>
                    </div>
                    {action.recommended_next_step ? (
                      <p className="card__subtext"><strong>Next step:</strong> {action.recommended_next_step}</p>
                    ) : null}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {sourceLink ? (
                        <Link className="button button--secondary" to={sourceLink.to}>{sourceLink.label}</Link>
                      ) : null}
                      <Link className="button button--secondary" to={actionCenterLink(action)}>View in Action Center</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        <p className="card__subtext">Generated at: {formatDateTime(response?.generated_at)}</p>
      </section>
    </div>
  );
}
