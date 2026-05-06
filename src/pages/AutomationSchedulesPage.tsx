import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { apiRequest, ApiError } from '../lib/api';
import type { AutomationRunnerReadinessResponse, AutomationRunnerStatusResponse, AutomationSchedule, AutomationScheduleAuditPackResponse, AutomationScheduleDryRunResponse, AutomationScheduleListResponse, AutomationScheduleManualRunResponse, AutomationScheduleTypesResponse } from '../types/inventory';

type StatusFilter = '' | AutomationSchedule['status'];
type TypeFilter = '' | AutomationSchedule['automation_type'];

type FormState = {
  name: string;
  description: string;
  automation_type: AutomationSchedule['automation_type'];
  schedule_kind: AutomationSchedule['schedule_kind'];
  time: string;
  timezone: string;
  default_status: 'draft' | 'pending_review';
};

const defaultForm: FormState = {
  name: '',
  description: '',
  automation_type: 'cost_risk_review',
  schedule_kind: 'manual',
  time: '09:00',
  timezone: 'Europe/Zagreb',
  default_status: 'draft'
};

const automationTypes: AutomationSchedule['automation_type'][] = [
  'cost_risk_review',
  'cost_governance_review',
  'system_context_review',
  'execution_readiness_review'
];

const statuses: AutomationSchedule['status'][] = ['draft', 'paused', 'disabled'];
const scheduleKinds: AutomationSchedule['schedule_kind'][] = ['manual', 'daily', 'weekly', 'monthly'];

function label(value?: string | null): string {
  return value ? value.replace(/_/g, ' ') : '-';
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={styles.json}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

export default function AutomationSchedulesPage() {
  const [data, setData] = useState<AutomationScheduleListResponse | null>(null);
  const [types, setTypes] = useState<AutomationScheduleTypesResponse | null>(null);
  const [runnerReadiness, setRunnerReadiness] = useState<AutomationRunnerReadinessResponse | null>(null);
  const [runnerStatus, setRunnerStatus] = useState<AutomationRunnerStatusResponse | null>(null);
  const [selected, setSelected] = useState<AutomationSchedule | null>(null);
  const [dryRunResult, setDryRunResult] = useState<AutomationScheduleDryRunResponse | null>(null);
  const [manualRunResult, setManualRunResult] = useState<AutomationScheduleManualRunResponse | null>(null);
  const [auditPack, setAuditPack] = useState<AutomationScheduleAuditPackResponse | null>(null);
  const [status, setStatus] = useState<StatusFilter>('');
  const [automationType, setAutomationType] = useState<TypeFilter>('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (automationType) params.set('automation_type', automationType);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', '50');
    return params.toString();
  }, [status, automationType, search]);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [response, typeResponse, readinessResponse, runnerStatusResponse] = await Promise.all([
        apiRequest<AutomationScheduleListResponse>(`/automation-schedules?${query}`),
        apiRequest<AutomationScheduleTypesResponse>('/automation-schedules/types'),
        apiRequest<AutomationRunnerReadinessResponse>('/automation-schedules/runner-readiness'),
        apiRequest<AutomationRunnerStatusResponse>('/automation-schedules/runner-status')
      ]);
      setData(response);
      setTypes(typeResponse);
      setRunnerReadiness(readinessResponse);
      setRunnerStatus(runnerStatusResponse);
      if (selected) {
        setSelected(response.rows.find((row) => row.id === selected.id) || null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load automation schedules');
    } finally {
      setLoading(false);
    }
  }, [query, selected]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const createSchedule = async () => {
    if (!form.name.trim()) {
      setError('Schedule name is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await apiRequest<AutomationSchedule>('/automation-schedules', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          automation_type: form.automation_type,
          schedule_kind: form.schedule_kind,
          schedule_config: {
            frequency: form.schedule_kind,
            time: form.time,
            timezone: form.timezone
          },
          request_defaults: {
            default_status: form.default_status
          }
        })
      });
      setSelected(created);
      setForm(defaultForm);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const pauseSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/pause`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(updated);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to pause automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const disableSchedule = async (schedule: AutomationSchedule) => {
    const reason = window.prompt('Why should this automation schedule be disabled?');
    if (!reason || reason.trim().length < 3) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/disable`, {
        method: 'POST',
        body: JSON.stringify({ disabled_reason: reason.trim() })
      });
      setSelected(updated);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to disable automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const tryResume = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      await apiRequest<AutomationSchedule>(`/automation-schedules/${schedule.id}/resume`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Runner is not enabled yet; resume is intentionally blocked in Step 200');
    } finally {
      setSaving(false);
    }
  };


  const runScheduleManually = async (schedule: AutomationSchedule) => {
    const confirmed = window.confirm('Create an execution request from this schedule? This will not approve or execute the request.');
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<AutomationScheduleManualRunResponse>(`/automation-schedules/${schedule.id}/run`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(response.schedule);
      setManualRunResult(response);
      setDryRunResult(null);
      setAuditPack(null);
      await loadSchedules();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create execution request from automation schedule');
    } finally {
      setSaving(false);
    }
  };

  const dryRunSchedule = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<AutomationScheduleDryRunResponse>(`/automation-schedules/${schedule.id}/dry-run`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      setSelected(schedule);
      setDryRunResult(response);
      setManualRunResult(null);
      setAuditPack(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to dry-run automation schedule');
    } finally {
      setSaving(false);
    }
  };


  const loadAuditPack = async (schedule: AutomationSchedule) => {
    setSaving(true);
    setError(null);
    try {
      const response = await apiRequest<AutomationScheduleAuditPackResponse>(`/automation-schedules/${schedule.id}/audit-pack`);
      setSelected(schedule);
      setAuditPack(response);
      setDryRunResult(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load scheduler audit pack');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <section style={styles.headerCard}>
        <div>
          <h2 style={styles.title}>Automation Schedules</h2>
          <p style={styles.subtitle}>
            Configure future scheduled checks. Step 208 adds an append-only run ledger for manual and controlled auto request creation. Schedules still never approve or execute requests.
          </p>
        </div>
        <div style={styles.safetyBadge}>No auto execution</div>
      </section>

      {error ? <div style={styles.error}>{error}</div> : null}

      {runnerReadiness ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Runner readiness</h3>
              <p style={styles.muted}>Step 208 shows controlled runner readiness plus run-ledger evidence. Dry run previews, Run Schedule manually creates one request, and flagged background mode can create due requests without approval/execution.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerReadiness.can_create_execution_requests ? 'Request creation enabled' : 'Readiness only'}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerReadiness.totals.total_schedules}</strong><span>Total schedules</span></div>
            <div style={styles.metric}><strong>{runnerReadiness.totals.eligible_for_future_runner_review}</strong><span>Future review candidates</span></div>
            <div style={styles.metric}><strong>{runnerReadiness.totals.runnable_now}</strong><span>Due auto-request candidates</span></div>
            <div style={styles.metric}><strong>{runnerReadiness.runner_enabled ? 'Enabled' : 'Disabled'}</strong><span>Runner</span></div>
          </div>
          <div style={styles.detailGrid}>
            <div>
              <h4 style={styles.smallTitle}>Readiness checks</h4>
              <ul style={styles.list}>
                {runnerReadiness.readiness_checks.map((check) => (
                  <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={styles.smallTitle}>Current blockers</h4>
              <ul style={styles.list}>
                {runnerReadiness.blockers.map((blocker) => (
                  <li key={blocker.key}><strong>{blocker.label}</strong>: {blocker.detail}</li>
                ))}
              </ul>
            </div>
          </div>
          {runnerReadiness.schedule_preview.length ? (
            <>
              <h4 style={styles.smallTitle}>Future runner preview</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Schedule</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Runner state</th>
                      <th style={styles.th}>Next run metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runnerReadiness.schedule_preview.map((schedule) => (
                      <tr key={schedule.id}>
                        <td style={styles.td}>{schedule.name}</td>
                        <td style={styles.td}>{label(schedule.automation_type)}</td>
                        <td style={styles.td}>{label(schedule.status)}</td>
                        <td style={styles.td}>{label(schedule.runner_state)}</td>
                        <td style={styles.td}>{formatDateTime(schedule.next_run_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {runnerStatus ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Background runner permission profile</h3>
              <p style={styles.muted}>Runner status only. Auto-request creation is explicit-flag controlled; approval, execution, and inventory mutation remain blocked.</p>
            </div>
            <div style={styles.safetyBadge}>{runnerStatus.request_creation_enabled ? 'Creates requests only' : (runnerStatus.enabled ? 'Observe only' : 'Disabled')}</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{runnerStatus.enabled ? 'Enabled flag' : 'Disabled'}</strong><span>Runner flag</span></div>
            <div style={styles.metric}><strong>{runnerStatus.started ? 'Started' : 'Not started'}</strong><span>Process state</span></div>
            <div style={styles.metric}><strong>{runnerStatus.request_creation_enabled ? 'Yes' : 'No'}</strong><span>Auto request creation</span></div>
            <div style={styles.metric}><strong>{runnerStatus.execution_enabled ? 'Yes' : 'No'}</strong><span>Execution enabled</span></div>
            <div style={styles.metric}><strong>{runnerStatus.permission_profile?.uses_broad_role ? 'Broad role' : 'Explicit only'}</strong><span>Runner permissions</span></div>
          </div>
          <h4 style={styles.smallTitle}>Runner safety checks</h4>
          <ul style={styles.list}>
            {runnerStatus.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Runner status</h4>
          <JsonBlock value={runnerStatus} />
        </section>
      ) : null}

      <section style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Create schedule</h3>
          <div style={styles.formGrid}>
            <label style={styles.field}>
              <span>Name</span>
              <input style={styles.input} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label style={styles.field}>
              <span>Automation type</span>
              <select style={styles.input} value={form.automation_type} onChange={(event) => setForm({ ...form, automation_type: event.target.value as FormState['automation_type'] })}>
                {automationTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}
              </select>
            </label>
            <label style={styles.field}>
              <span>Frequency</span>
              <select style={styles.input} value={form.schedule_kind} onChange={(event) => setForm({ ...form, schedule_kind: event.target.value as FormState['schedule_kind'] })}>
                {scheduleKinds.map((kind) => <option key={kind} value={kind}>{label(kind)}</option>)}
              </select>
            </label>
            <label style={styles.field}>
              <span>Time</span>
              <input style={styles.input} type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
            </label>
            <label style={styles.field}>
              <span>Timezone</span>
              <input style={styles.input} value={form.timezone} onChange={(event) => setForm({ ...form, timezone: event.target.value })} />
            </label>
            <label style={styles.field}>
              <span>Future request default</span>
              <select style={styles.input} value={form.default_status} onChange={(event) => setForm({ ...form, default_status: event.target.value as FormState['default_status'] })}>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending review</option>
              </select>
            </label>
          </div>
          <label style={styles.field}>
            <span>Description</span>
            <textarea style={styles.textarea} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <button style={styles.primaryButton} disabled={saving} onClick={() => void createSchedule()}>
            {saving ? 'Saving…' : 'Create draft schedule'}
          </button>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Step 208 safety contract</h3>
          <ul style={styles.list}>
            <li>Background runner startup is explicit and disabled by default.</li>
            <li>System-runner request creation uses explicit permissions, not a broad tenant role.</li>
            <li>Auto-request creation requires explicit backend flags.</li>
            <li>Execution requests can be created manually or by controlled due-schedule processing only.</li>
            <li>No stock, shipment, or product records are mutated.</li>
            <li>Run-ledger events record request creation evidence without approving or executing requests.</li>
            <li>Scheduler audit packs are read-only evidence and do not create or execute requests.</li>
          </ul>
          {types ? <JsonBlock value={types.safety} /> : null}
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.toolbar}>
          <input style={styles.input} placeholder="Search schedules" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select style={styles.input} value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            <option value="">All statuses</option>
            {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <select style={styles.input} value={automationType} onChange={(event) => setAutomationType(event.target.value as TypeFilter)}>
            <option value="">All types</option>
            {automationTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
          <button style={styles.secondaryButton} disabled={loading} onClick={() => void loadSchedules()}>Refresh</button>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Frequency</th>
                <th style={styles.th}>Next run</th>
                <th style={styles.th}>Last run</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.rows.map((schedule) => (
                <tr key={schedule.id}>
                  <td style={styles.td}>{schedule.name}</td>
                  <td style={styles.td}>{label(schedule.automation_type)}</td>
                  <td style={styles.td}>{label(schedule.status)}</td>
                  <td style={styles.td}>{label(schedule.schedule_kind)}</td>
                  <td style={styles.td}>{formatDateTime(schedule.next_run_at)}</td>
                  <td style={styles.td}>{formatDateTime(schedule.last_run_at)}</td>
                  <td style={styles.tdActions}>
                    <button style={styles.linkButton} onClick={() => setSelected(schedule)}>View</button>
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void dryRunSchedule(schedule)}>Dry run</button> : null}
                    <button style={styles.linkButton} disabled={saving} onClick={() => void loadAuditPack(schedule)}>Audit Pack</button>
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void runScheduleManually(schedule)}>Run Schedule</button> : null}
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void pauseSchedule(schedule)}>Pause</button> : null}
                    {schedule.status !== 'disabled' ? <button style={styles.linkButton} disabled={saving} onClick={() => void disableSchedule(schedule)}>Disable</button> : null}
                    {schedule.status === 'paused' ? <button style={styles.linkButton} disabled={saving} onClick={() => void tryResume(schedule)}>Resume</button> : null}
                  </td>
                </tr>
              ))}
              {!loading && !data?.rows.length ? (
                <tr><td style={styles.empty} colSpan={7}>No automation schedules found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>



      {manualRunResult ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Manual schedule run result</h3>
              <p style={styles.muted}>Execution request created. It was not approved, executed, or applied to stock/products/shipments.</p>
            </div>
            <div style={styles.safetyBadge}>Request created only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{manualRunResult.created_execution_request_count}</strong><span>Requests created</span></div>
            <div style={styles.metric}><strong>{label(manualRunResult.execution_request.status)}</strong><span>Request status</span></div>
            <div style={styles.metric}><strong>{manualRunResult.executes_requests ? 'Yes' : 'No'}</strong><span>Executed request</span></div>
            <div style={styles.metric}><strong>{manualRunResult.runner_enabled ? 'Enabled' : 'Disabled'}</strong><span>Runner</span></div>
          </div>
          <h4 style={styles.smallTitle}>Created execution request</h4>
          <JsonBlock value={manualRunResult.execution_request} />
          {manualRunResult.run_event ? (
            <>
              <h4 style={styles.smallTitle}>Run ledger event</h4>
              <JsonBlock value={manualRunResult.run_event} />
            </>
          ) : null}
          <h4 style={styles.smallTitle}>Safety checks</h4>
          <ul style={styles.list}>
            {manualRunResult.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Notes</h4>
          <ul style={styles.list}>
            {manualRunResult.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      ) : null}


      {auditPack ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Scheduler audit pack</h3>
              <p style={styles.muted}>Read-only evidence for schedule configuration, run-ledger events, audit events, and linked execution requests.</p>
            </div>
            <div style={styles.safetyBadge}>Read only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.schedule_audit_event_count}</strong><span>Schedule audit events</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.execution_request_count}</strong><span>Linked requests</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.execution_request_audit_event_count}</strong><span>Request audit events</span></div>
            <div style={styles.metric}><strong>{auditPack.evidence_summary.run_event_count ?? 0}</strong><span>Run ledger events</span></div>
            <div style={styles.metric}><strong>{auditPack.completeness.safe_for_scheduler_governance_review ? 'Ready' : 'Review'}</strong><span>Governance status</span></div>
          </div>
          <h4 style={styles.smallTitle}>Audit pack checks</h4>
          <ul style={styles.list}>
            {auditPack.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Evidence summary</h4>
          <JsonBlock value={auditPack.evidence_summary} />
          <h4 style={styles.smallTitle}>Linked execution requests</h4>
          <JsonBlock value={auditPack.linked_execution_requests} />
          <h4 style={styles.smallTitle}>Run ledger</h4>
          <JsonBlock value={auditPack.run_ledger || []} />
          <h4 style={styles.smallTitle}>Full scheduler audit pack JSON</h4>
          <JsonBlock value={auditPack} />
        </section>
      ) : null}

      {dryRunResult ? (
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h3 style={styles.cardTitle}>Manual dry-run result</h3>
              <p style={styles.muted}>Preview only. No execution request was created and no business records were changed.</p>
            </div>
            <div style={styles.safetyBadge}>Dry run only</div>
          </div>
          <div style={styles.metricGrid}>
            <div style={styles.metric}><strong>{dryRunResult.would_create_execution_request ? 'Yes later' : 'No'}</strong><span>Would create request</span></div>
            <div style={styles.metric}><strong>{dryRunResult.would_execute_request ? 'Yes' : 'No'}</strong><span>Would execute</span></div>
            <div style={styles.metric}><strong>{dryRunResult.would_mutate_inventory ? 'Yes' : 'No'}</strong><span>Would mutate inventory</span></div>
            <div style={styles.metric}><strong>{dryRunResult.runner_enabled ? 'Enabled' : 'Disabled'}</strong><span>Runner</span></div>
          </div>
          <h4 style={styles.smallTitle}>Dry-run checks</h4>
          <ul style={styles.list}>
            {dryRunResult.checks.map((check) => (
              <li key={check.key}><strong>{label(check.status)}</strong> — {check.label}: {check.detail}</li>
            ))}
          </ul>
          <h4 style={styles.smallTitle}>Candidate execution request preview</h4>
          <JsonBlock value={dryRunResult.candidate_request} />
          <h4 style={styles.smallTitle}>Notes</h4>
          <ul style={styles.list}>
            {dryRunResult.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </section>
      ) : null}

      {selected ? (
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Schedule detail</h3>
          <div style={styles.detailGrid}>
            <div><strong>Name</strong><br />{selected.name}</div>
            <div><strong>Status</strong><br />{label(selected.status)}</div>
            <div><strong>Type</strong><br />{label(selected.automation_type)}</div>
            <div><strong>Next run metadata</strong><br />{formatDateTime(selected.next_run_at)}</div>
          </div>
          <h4 style={styles.smallTitle}>Schedule config</h4>
          <JsonBlock value={selected.schedule_config} />
          <h4 style={styles.smallTitle}>Request defaults</h4>
          <JsonBlock value={selected.request_defaults} />
          <h4 style={styles.smallTitle}>Safety</h4>
          <JsonBlock value={selected.safety} />
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  headerCard: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: 20, border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff' },
  title: { margin: 0, fontSize: 24 },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 760 },
  safetyBadge: { alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 16 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  muted: { margin: '4px 0 0', color: '#64748b' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, margin: '12px 0' },
  metric: { display: 'flex', flexDirection: 'column', gap: 4, padding: 12, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' },
  card: { padding: 16, border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff' },
  cardTitle: { margin: '0 0 12px', fontSize: 18 },
  smallTitle: { margin: '16px 0 8px', fontSize: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#334155' },
  input: { padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff' },
  textarea: { minHeight: 80, padding: 10, border: '1px solid #cbd5e1', borderRadius: 10, resize: 'vertical' },
  primaryButton: { marginTop: 12, padding: '10px 14px', border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', cursor: 'pointer' },
  secondaryButton: { padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  linkButton: { padding: 0, border: 0, background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 600 },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', color: '#475569', fontSize: 13 },
  td: { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  tdActions: { padding: 10, borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, flexWrap: 'wrap' },
  empty: { padding: 20, textAlign: 'center', color: '#64748b' },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  json: { margin: 0, padding: 12, borderRadius: 12, background: '#f8fafc', overflowX: 'auto', fontSize: 12 },
  list: { margin: 0, paddingLeft: 18, color: '#475569' },
  error: { padding: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12 }
};
