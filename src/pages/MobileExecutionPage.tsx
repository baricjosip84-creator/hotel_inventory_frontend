import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type ActionUrgency = 'critical' | 'high' | 'medium' | 'low';
type ExecutionTaskSourceType = 'manual' | 'reservation' | 'requisition' | 'purchase_order' | 'shipment' | 'transfer' | 'cycle_count' | 'replenishment' | 'execution_request';

type MobileExecutionTask = {
  mobile_action_id: string;
  action_id: string;
  task_source_id?: string | null;
  execution_task_source_type?: ExecutionTaskSourceType | null;
  execution_task_source_id?: string | null;
  mobile_domain?: string;
  queue_status?: string;
  urgency?: ActionUrgency | string;
  priority_score?: number;
  title?: string;
  summary?: string | null;
  facility_id?: string | null;
  storage_location_id?: string | null;
  barcode_ready?: boolean;
  offline_safe_snapshot?: boolean;
  recommended_mobile_next_step?: string | null;
  prohibited_mobile_actions?: string[];
  source_surface?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type MobileExecutionResponse = {
  definition?: {
    foundation_type?: string;
    execution_mode?: string;
    source_foundation?: string;
    mobile_capabilities?: string[];
    safety_contract?: Record<string, boolean>;
  };
  filters?: {
    action_domain?: string;
    urgency?: string | null;
    execution_task_source_type?: ExecutionTaskSourceType | null;
    limit?: number;
  };
  summary?: {
    total_mobile_tasks?: number;
    critical_mobile_tasks?: number;
    barcode_ready_tasks?: number;
    by_urgency?: Record<string, number>;
    by_queue_status?: Record<string, number>;
  };
  guidance?: {
    next_mobile_action_id?: string | null;
    next_action_id?: string | null;
    next_action_title?: string | null;
    next_action_urgency?: string | null;
    offline_guidance?: string;
    scanner_guidance?: string;
    evidence_guidance?: string;
  };
  mobile_tasks?: MobileExecutionTask[];
  non_mutation_guarantee?: boolean;
  generated_at?: string;
};

const URGENCY_FILTERS: Array<{ value: 'all' | ActionUrgency; label: string }> = [
  { value: 'all', label: 'All urgency' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];


const SOURCE_FILTERS: Array<{ value: 'all' | ExecutionTaskSourceType; label: string }> = [
  { value: 'all', label: 'All task sources' },
  { value: 'execution_request', label: 'Execution requests' },
  { value: 'manual', label: 'Manual' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'requisition', label: 'Requisition' },
  { value: 'purchase_order', label: 'Purchase order' },
  { value: 'shipment', label: 'Shipment' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'cycle_count', label: 'Cycle count' },
  { value: 'replenishment', label: 'Replenishment' }
];

const gridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))'
};

const mobileQueueStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 14
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
  minWidth: 180
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
    '/workspace',
    '/execution-tasks',
    '/execution-requests',
    '/scanner',
    '/shipments',
    '/stock-transfers',
    '/inventory-reservations',
    '/inventory-requisitions',
    '/procurement-recommendations'
  ]);

  return tenantRoutes.has(sourceSurface) ? sourceSurface : null;
}

async function fetchMobileExecutionSummary(urgency: 'all' | ActionUrgency, sourceType: 'all' | ExecutionTaskSourceType): Promise<MobileExecutionResponse> {
  const params = new URLSearchParams({ action_domain: 'execution', limit: '50' });

  if (urgency !== 'all') {
    params.set('urgency', urgency);
  }

  if (sourceType !== 'all') {
    params.set('execution_task_source_type', sourceType);
  }

  return apiRequest<MobileExecutionResponse>(`/operational-action-center/mobile-execution-summary?${params.toString()}`);
}

export default function MobileExecutionPage() {
  const [urgency, setUrgency] = useState<'all' | ActionUrgency>('all');
  const [sourceType, setSourceType] = useState<'all' | ExecutionTaskSourceType>('all');

  const mobileExecutionQuery = useQuery({
    queryKey: ['mobile-execution-summary', urgency, sourceType],
    queryFn: () => fetchMobileExecutionSummary(urgency, sourceType)
  });

  const response = mobileExecutionQuery.data;
  const summary = response?.summary || {};
  const guidance = response?.guidance || {};
  const mobileTasks = response?.mobile_tasks || [];
  const safetyEntries = useMemo(() => {
    return Object.entries(response?.definition?.safety_contract || {}).filter(([, enabled]) => enabled);
  }, [response?.definition?.safety_contract]);

  return (
    <div>
      <div className="card-grid" style={gridStyle}>
        <div className="card">
          <div className="card__label">Mobile queue</div>
          <div className="card__value">{numberValue(summary.total_mobile_tasks ?? mobileTasks.length)}</div>
          <div className="card__subtext">Read-only execution tasks prepared for touch-first operational review.</div>
        </div>
        <div className="card">
          <div className="card__label">Critical tasks</div>
          <div className="card__value">{numberValue(summary.critical_mobile_tasks)}</div>
          <div className="card__subtext">Highest urgency items requiring operator attention.</div>
        </div>
        <div className="card">
          <div className="card__label">Scan-ready</div>
          <div className="card__value">{numberValue(summary.barcode_ready_tasks)}</div>
          <div className="card__subtext">Tasks where barcode/scanner verification is likely useful.</div>
        </div>
        <div className="card">
          <div className="card__label">Execution mode</div>
          <div className="card__value" style={{ fontSize: 18 }}>{formatLabel(response?.definition?.execution_mode)}</div>
          <div className="card__subtext">No inventory, procurement, or financial mutation is performed here.</div>
        </div>
      </div>

      <section className="section">
        <div className="section__title">Mobile execution controls</div>
        <div className="card">
          <div style={toolbarStyle}>
            <select style={selectStyle} value={urgency} onChange={(event) => setUrgency(event.target.value as 'all' | ActionUrgency)}>
              {URGENCY_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={sourceType} onChange={(event) => setSourceType(event.target.value as 'all' | ExecutionTaskSourceType)}>
              {SOURCE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button className="button button--secondary" type="button" onClick={() => mobileExecutionQuery.refetch()} disabled={mobileExecutionQuery.isFetching}>
              {mobileExecutionQuery.isFetching ? 'Refreshing…' : 'Refresh mobile queue'}
            </button>
            <Link className="button button--secondary" to="/scanner">Open scanner</Link>
            <Link className="button button--secondary" to="/execution-tasks">Open execution tasks</Link>
          </div>

          {mobileExecutionQuery.isLoading ? (
            <p className="card__subtext">Loading mobile execution queue…</p>
          ) : mobileExecutionQuery.error ? (
            <p className="form-error">
              {mobileExecutionQuery.error instanceof ApiError
                ? mobileExecutionQuery.error.message
                : 'Unable to load the mobile execution queue.'}
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ ...badgeStyle, width: 'fit-content' }}>
                {response?.non_mutation_guarantee ? 'Read-only queue snapshot' : 'Queue status unknown'}
              </div>
              <p className="card__subtext">{guidance.offline_guidance || 'Queue can be reviewed safely before opening source execution workflows.'}</p>
              <p className="card__subtext">{guidance.scanner_guidance || 'Scanner guidance is not available for the current queue.'}</p>
              <p className="card__subtext">{guidance.evidence_guidance || 'Evidence capture remains guidance-only from this mobile surface.'}</p>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__title">Touch-first task queue</div>
        {mobileExecutionQuery.isLoading ? null : mobileTasks.length === 0 ? (
          <div className="card">
            <p className="card__subtext">No mobile execution tasks matched the selected urgency filter.</p>
          </div>
        ) : (
          <div style={mobileQueueStyle}>
            {mobileTasks.map((task) => {
              const sourcePath = sourceSurfaceToAppPath(task.source_surface);
              return (
                <article className="card" key={task.mobile_action_id} style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div>
                      <div className="card__label">{formatLabel(task.queue_status)}</div>
                      <h3 style={{ margin: '4px 0 0' }}>{task.title || 'Untitled mobile task'}</h3>
                    </div>
                    <span style={badgeStyle}>{formatLabel(task.urgency)}</span>
                  </div>

                  <p className="card__subtext">{task.summary || 'No task summary was provided.'}</p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {task.barcode_ready ? <span style={badgeStyle}>Scan-ready</span> : null}
                    {task.offline_safe_snapshot ? <span style={badgeStyle}>Offline-safe snapshot</span> : null}
                    {task.execution_task_source_type ? <span style={badgeStyle}>Source {formatLabel(task.execution_task_source_type)}</span> : null}
                    {task.facility_id ? <span style={badgeStyle}>Facility {task.facility_id}</span> : null}
                    {task.storage_location_id ? <span style={badgeStyle}>Location {task.storage_location_id}</span> : null}
                  </div>

                  <div>
                    <div className="card__label">Recommended next step</div>
                    <p className="card__subtext">{task.recommended_mobile_next_step || 'Open the source workflow and complete through approved execution controls.'}</p>
                  </div>

                  <div>
                    <div className="card__label">Last updated</div>
                    <p className="card__subtext">{formatDateTime(task.updated_at || task.created_at)}</p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {sourcePath ? <Link className="button" to={sourcePath}>Open source workflow</Link> : null}
                    {task.barcode_ready ? <Link className="button button--secondary" to="/scanner">Scan/verify</Link> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section__title">Mobile safety contract</div>
        <div className="card-grid" style={gridStyle}>
          {safetyEntries.length === 0 ? (
            <div className="card">
              <p className="card__subtext">Safety contract details were not returned by the backend.</p>
            </div>
          ) : safetyEntries.map(([key]) => (
            <div className="card" key={key}>
              <div className="card__label">Enabled guardrail</div>
              <div style={{ fontWeight: 800, textTransform: 'capitalize' }}>{formatLabel(key)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
