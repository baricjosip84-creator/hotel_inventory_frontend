import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { getAccessToken } from '../lib/auth';
import {
  TENANT_PERMISSIONS,
  getTenantPermissionSnapshot,
  hasPermission
} from '../lib/permissions';
import { useRouteQueryState } from '../lib/useRouteQueryState';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import {
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
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

type AccessRoleDisplay = { label: string; localizationKey?: 'Admin' | 'Manager' | 'Staff' | 'Custom role' };

function getCurrentAccessRoleDisplay(): AccessRoleDisplay {
  const snapshot = getTenantPermissionSnapshot();
  if (snapshot?.custom_role_id || snapshot?.custom_role_name?.trim()) {
    return { label: snapshot.access_role_label?.trim() || snapshot.custom_role_name?.trim() || 'custom role' };
  }
  if (snapshot?.role === 'admin') return { label: 'admin', localizationKey: 'Admin' };
  if (snapshot?.role === 'manager') return { label: 'manager', localizationKey: 'Manager' };
  if (snapshot?.role === 'staff') return { label: 'staff', localizationKey: 'Staff' };
  if (snapshot?.access_role_label?.trim()) return { label: snapshot.access_role_label.trim() };

  const payload = decodeJwtPayload(getAccessToken());
  const customRoleName = payload?.custom_role_name;
  if (typeof customRoleName === 'string' && customRoleName.trim()) return { label: customRoleName.trim() };

  const role = payload?.role;
  if (role === 'admin') return { label: role, localizationKey: 'Admin' };
  if (role === 'manager') return { label: role, localizationKey: 'Manager' };
  if (role === 'staff') return { label: role, localizationKey: 'Staff' };
  return { label: 'custom role', localizationKey: 'Custom role' };
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatLabel(value?: string | null): string {
  return String(value || 'unknown').replace(/_/g, ' ');
}

function formatDateTime(value: string | null | undefined, locale: AppLocale, ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatLocalizedDateTime(date, locale);
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

function canonicalLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  const raw = String(value || 'unknown');
  const specialLabels: Record<string, string> = {
    ai_governance: 'AI governance',
    control_tower: 'Control tower',
    decision_intelligence: 'Decision intelligence',
    multi_domain: 'Multi-domain',
    approval_required: 'Approval required',
    review_required: 'Review required',
    in_review: 'In review',
    in_progress: 'In progress'
  };
  const humanized = specialLabels[raw] || formatLabel(raw).replace(/^./, (character) => character.toUpperCase());
  return ui(humanized);
}

function primaryFocusLabel(value: string[] | string | undefined, ui: (englishText: string) => string): string {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  if (!values.length) return ui('Not reported');
  return values.map((item) => ui(PRIMARY_FOCUS_LABELS[item] || formatLabel(item))).join(' · ');
}

function actionStrategyLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (!value) return ui('Not reported');
  return ui(ACTION_STRATEGY_LABELS[value] || formatLabel(value));
}

function executionModeLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (value === 'read_only_role_aware_workspace_orchestration') return ui('Read-only guidance');
  return canonicalLabel(value, ui);
}

function widgetContent(widgetId: string, ui: (englishText: string) => string): { title: string; description: string } {
  const content = WIDGET_LABELS[widgetId];
  if (content) return { title: ui(content.title), description: ui(content.description) };
  return {
    title: ui(formatLabel(widgetId).replace(/\b\w/g, (character) => character.toUpperCase())),
    description: ui('Read-only summary of matching work.')
  };
}

function widgetIconPath(widgetId: string): string {
  if (widgetId.includes('alert')) return '/alerts';
  if (widgetId.includes('execution')) return '/execution-tasks';
  if (widgetId.includes('decision') || widgetId.includes('governance')) return '/intelligence-review';
  if (widgetId.includes('risk') || widgetId.includes('control_tower')) return '/reliability-command';
  return '/workspace';
}

function actionDomainIconPath(domain?: string | null): string {
  if (domain === 'alerts') return '/alerts';
  if (domain === 'execution') return '/execution-tasks';
  if (domain === 'control_tower') return '/reliability-command';
  if (domain === 'decision_intelligence' || domain === 'ai_governance') return '/intelligence-review';
  if (domain === 'multi_domain') return '/workspace';
  return '/action-center';
}

function urgencyToneClass(urgency?: string | null): string {
  if (urgency === 'critical') return 'workspace-page__icon--danger';
  if (urgency === 'high') return 'workspace-page__icon--warning';
  if (urgency === 'medium') return 'workspace-page__icon--amber';
  return 'workspace-page__icon--green';
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
  const { locale, ui } = useAppTranslation();
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
  const accessRole = getCurrentAccessRoleDisplay();
  const accessRoleLabel = accessRole.localizationKey ? ui(accessRole.localizationKey) : accessRole.label;

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
        <div style={{ fontWeight: 800 }}>{ui("Loading Workspace")}</div>
        <p className="card__subtext">{ui("Collecting the work that your role is allowed to see.")}</p>
      </div>
    );
  }

  if (workspaceQuery.error) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800 }}>{ui("Workspace could not be loaded")}</div>
        <p className="form-error">
          {workspaceQuery.error instanceof ApiError
            ? workspaceQuery.error.message
            : ui('Unable to load the workspace.')}
        </p>
        <button className="button button--secondary" type="button" onClick={() => workspaceQuery.refetch()}>
          {ui("Try again")}
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
    <div className="workspace-page io-operational-page io-workspace-page io-workspace-legacy-normalized">
      <OperationalWorkspaceHero
        iconPath="/workspace"
        eyebrow={ui("Role-aware command workspace")}
        title={ui("Workspace")}
        description={ui("A simplified operational view filtered to the work this signed-in role is allowed to see. It guides users to the right source workflow without changing inventory itself.")}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Role-filtered")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Source actions linked")}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={<OperationalWorkspaceStatus value={accessRoleLabel} label={ui("current access role")} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui("Workspace overview")}>
        <OperationalWorkspaceStatCard
          label={ui("Workspace")}
          value={workspace.workspace_name || ui('Role workspace')}
          helper={`${ui("Prepared for the current access role:")} ${accessRoleLabel}.`}
          iconPath="/workspace"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("Actions available")}
          value={formatLocalizedNumber(numberValue(summary.total_actions ?? actions.length), locale)}
          helper={ui("Open work currently returned for the selected filters")}
          iconPath="/action-center"
          tone="blue"
        />
        <OperationalWorkspaceStatCard
          label={ui("Critical actions")}
          value={formatLocalizedNumber(numberValue(summary.critical_actions), locale)}
          helper={ui("Items that need the fastest attention")}
          iconPath="/alerts"
          tone={numberValue(summary.critical_actions) > 0 ? 'danger' : 'good'}
        />
        <OperationalWorkspaceStatCard
          label={ui("Role filtering")}
          value={ui("Active")}
          helper={ui("Only work this role is allowed to read is included")}
          iconPath="/permissions"
          tone="good"
        />
      </OperationalWorkspaceStats>

      <div className="card workspace-page__info-card">
        <span className="workspace-page__section-icon"><TenantNavIcon path="/workspace" size={16} /></span>
        <div>
          <div className="workspace-page__info-title">{ui("How this page works")}</div>
          <p className="card__subtext">
            {ui("Workspace gives each role a simpler view of the Action Center. It shows what deserves attention and sends the user to the correct page, but it does not complete tasks or change inventory itself.")}
          </p>
        </div>
      </div>

      <section className="section workspace-page__section">
        <div className="section__title workspace-page__section-title">
          <span className="workspace-page__section-icon"><TenantNavIcon path="/workspace" size={16} /></span>
          <span>{ui("Workspace controls")}</span>
        </div>
        <div className="card workspace-page__controls-shell">
          <div className="workspace-page__toolbar">
            <select aria-label={ui("Filter by work area")} className="workspace-page__select" value={domain} onChange={(event) => setDomain(event.target.value as ActionDomain)}>
              {availableDomains.map((option) => (
                <option key={option.value} value={option.value}>{ui(option.label)}</option>
              ))}
            </select>
            <select aria-label={ui("Filter by urgency")} className="workspace-page__select" value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{ui(option.label)}</option>
              ))}
            </select>
            <button className="button button--secondary workspace-page__refresh" type="button" onClick={() => workspaceQuery.refetch()} disabled={workspaceQuery.isFetching}>
              <TenantNavIcon path="/real-time-operations-feed" size={15} />
              <span>{workspaceQuery.isFetching ? ui('Refreshing…') : ui('Refresh')}</span>
            </button>
          </div>

          <div className="workspace-page__context-grid">
            <div className="card workspace-page__context-card">
              <span className="workspace-page__icon workspace-page__icon--blue"><TenantNavIcon path="/workspace" size={17} /></span>
              <div className="workspace-page__context-copy">
                <div className="card__label">{ui("Main purpose")}</div>
                <div className="workspace-page__copy">{primaryFocusLabel(workspace.primary_focus, ui)}</div>
              </div>
            </div>
            <div className="card workspace-page__context-card">
              <span className="workspace-page__icon workspace-page__icon--violet"><TenantNavIcon path="/action-center" size={17} /></span>
              <div className="workspace-page__context-copy">
                <div className="card__label">{ui("How work is organised")}</div>
                <div className="workspace-page__copy">{actionStrategyLabel(workspace.action_strategy, ui)}</div>
              </div>
            </div>
            <div className="card workspace-page__context-card">
              <span className="workspace-page__icon workspace-page__icon--green"><TenantNavIcon path="/execution-tasks" size={17} /></span>
              <div className="workspace-page__context-copy">
                <div className="card__label">{ui("Page mode")}</div>
                <div className="workspace-page__copy">{executionModeLabel(response?.definition?.execution_mode, ui)}</div>
                <div className="card__subtext">{ui("The page gives guidance only. Real work is completed on the source page.")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section workspace-page__section">
        <div className="section__title workspace-page__section-title">
          <span className="workspace-page__section-icon"><TenantNavIcon path="/workspace" size={16} /></span>
          <span>{ui("Workspace summaries")}</span>
        </div>
        <div className="workspace-page__widget-grid">
          {widgets.length === 0 ? (
            <div className="card workspace-page__empty-card">
              <div className="workspace-page__empty-title">{ui("No summary groups available")}</div>
              <div className="card__subtext">{ui("No workspace summary matched this role and filter selection.")}</div>
            </div>
          ) : widgets.map((widget) => {
            const content = widgetContent(widget.widget_id, ui);
            const count = numberValue(widget.visible_action_count);

            return (
              <div className="card workspace-page__widget-card" key={widget.widget_id}>
                <div className="workspace-page__widget-head">
                  <span className="workspace-page__icon workspace-page__icon--blue"><TenantNavIcon path={widgetIconPath(widget.widget_id)} size={17} /></span>
                  <span className="workspace-page__count-pill">{formatLocalizedNumber(count, locale)}</span>
                </div>
                <div className="card__label">{ui("Read-only summary")}</div>
                <div className="card__value workspace-page__widget-title">{content.title}</div>
                <div className="card__subtext">{content.description}</div>
                <div className="workspace-page__widget-count">{formatLocalizedNumber(count, locale)} {count === 1 ? ui('matching item') : ui('matching items')}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section workspace-page__section">
        <div className="section__title workspace-page__section-title">
          <span className="workspace-page__section-icon"><TenantNavIcon path="/action-center" size={16} /></span>
          <span>{ui("Guided next actions")}</span>
        </div>
        <div className="card workspace-page__guidance-card">
          <span className="workspace-page__icon workspace-page__icon--blue"><TenantNavIcon path="/action-center" size={18} /></span>
          <div className="workspace-page__guidance-copy">
            <div className="workspace-page__guidance-title">{ui("Where to start")}</div>
            <p className="card__subtext">
              {response?.guidance?.next_action_title
                ? `${ui('Start with:')} ${formatLabel(response.guidance.next_action_title)}.`
                : ui('There is no open action to start with for the selected filters.')}
            </p>
            <p className="card__subtext">
              {response?.guidance?.operator_guidance || ui('Workspace guidance is not available yet.')}
            </p>
            <p className="card__subtext">
              {response?.guidance?.escalation_guidance || ui('Only permitted work is included.')}
            </p>
          </div>
        </div>

        {actions.length === 0 ? (
          <div className="card workspace-page__empty-card workspace-page__empty-card--actions">
            <div className="workspace-page__empty-title">{ui("No matching actions")}</div>
            <p className="card__subtext">
              {ui("No open work matched the selected area and urgency. Try a broader filter or refresh the page.")}
            </p>
          </div>
        ) : (
          <>
            {actions.length > shownActions.length ? (
              <p className="card__subtext workspace-page__showing-copy">{ui("Showing the first")} {formatLocalizedNumber(shownActions.length, locale)} {ui("of")} {formatLocalizedNumber(actions.length, locale)} {ui("actions. Open the Action Center to review the complete returned list.")}</p>
            ) : null}
            <div className="workspace-page__action-list">
              {shownActions.map((action) => {
                const sourceLink = sourceActionLink(action);

                return (
                  <article key={action.action_id} className={`card workspace-page__action-card workspace-page__action-card--${String(action.urgency || 'low').toLowerCase()}`}>
                    <div className="workspace-page__action-header">
                      <div className="workspace-page__action-lead">
                        <span className={`workspace-page__icon ${urgencyToneClass(action.urgency)}`}><TenantNavIcon path={actionDomainIconPath(action.action_domain)} size={17} /></span>
                        <div className="workspace-page__action-copy">
                          <div className="workspace-page__action-title">{actionTitleLabel(action)}</div>
                          <div className="card__subtext">{action.summary || ui('No summary provided.')}</div>
                        </div>
                      </div>
                      <div className="workspace-page__badges">
                        <span style={urgencyBadgeStyle(action.urgency)}>{canonicalLabel(action.urgency, ui)}</span>
                        <span style={badgeStyle}>{canonicalLabel(action.action_domain, ui)}</span>
                        <span style={badgeStyle}>{canonicalLabel(action.action_status, ui)}</span>
                      </div>
                    </div>
                    {action.recommended_next_step ? (
                      <div className="workspace-page__next-step"><strong>{ui("Next step:")}</strong><span>{action.recommended_next_step}</span></div>
                    ) : null}
                    <div className="workspace-page__action-footer">
                      <div className="workspace-page__action-buttons">
                        {sourceLink ? (
                          <Link className="button button--secondary workspace-page__source-button" to={sourceLink.to}>
                            <TenantNavIcon path={sourceLink.to.split('?')[0]} size={14} />
                            <span>{ui(sourceLink.label)}</span>
                          </Link>
                        ) : null}
                        <Link className="button button--secondary workspace-page__source-button" to={actionCenterLink(action)}>
                          <TenantNavIcon path="/action-center" size={14} />
                          <span>{ui("View in Action Center")}</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        <p className="card__subtext workspace-page__generated-at">{ui("Generated at:")} {formatDateTime(response?.generated_at, locale, ui)}</p>
      </section>
    </div>
  );
}
