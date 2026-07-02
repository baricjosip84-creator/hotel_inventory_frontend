import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type Runbook = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  severity: string;
  is_active: boolean;
  owner_role?: string | null;
  step_count: number;
  active_execution_count?: number;
};
type RunbookStep = { id: string; step_order: number; title: string; instructions?: string | null; expected_result?: string | null; is_required: boolean };
type RunbookDetail = Runbook & { steps: RunbookStep[] };
type ExecutionStep = RunbookStep & { id: string; status: 'pending' | 'done' | 'skipped'; notes?: string | null; completed_by_platform_user_email?: string | null };
type Execution = {
  id: string;
  runbook_id: string;
  runbook_title: string;
  runbook_category: string;
  runbook_severity: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  reason: string;
  notes?: string | null;
  started_at: string;
  done_steps?: number;
  total_steps?: number;
  steps?: ExecutionStep[];
};

type RunbooksResponse = { runbooks: Runbook[] };
type ExecutionsResponse = { executions: Execution[] };
type SummaryResponse = { active_executions: number; active_critical_runbooks: number; by_category: Array<{ category: string; count: number }> };

type StepDraft = { title: string; instructions: string; expected_result: string; is_required: boolean };

const categories = ['general', 'support', 'incident', 'billing', 'security', 'maintenance', 'offboarding'];
const severities = ['low', 'medium', 'high', 'critical'];
const defaultStep: StepDraft = { title: '', instructions: '', expected_result: '', is_required: true };

export default function PlatformRunbooksPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_WRITE);
  const canExecute = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_EXECUTE);
  const [category, setCategory] = useState(() => new URLSearchParams(window.location.search).get('category') || '');
  const [severity, setSeverity] = useState(() => new URLSearchParams(window.location.search).get('severity') || '');
  const [selectedRunbookId, setSelectedRunbookId] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState('');
  const [draft, setDraft] = useState({ title: '', description: '', category: 'general', severity: 'medium', owner_role: '', steps: [{ ...defaultStep }] });
  const [executionDraft, setExecutionDraft] = useState({ runbook_id: '', tenant_id: '', reason: '', notes: '' });
  const [message, setMessage] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (severity) params.set('severity', severity);
    params.set('limit', '200');
    return params.toString();
  }, [category, severity]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'runbooks'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const summary = useQuery({ queryKey: ['platform', 'runbooks', 'summary'], queryFn: () => platformApiRequest<SummaryResponse>('/platform/runbooks/summary') });
  const runbooks = useQuery({ queryKey: ['platform', 'runbooks', category, severity], queryFn: () => platformApiRequest<RunbooksResponse>(`/platform/runbooks?${queryString}`) });
  const executions = useQuery({ queryKey: ['platform', 'runbooks', 'executions'], queryFn: () => platformApiRequest<ExecutionsResponse>('/platform/runbooks/executions?limit=100') });
  const selectedRunbook = useQuery({ queryKey: ['platform', 'runbooks', selectedRunbookId], enabled: Boolean(selectedRunbookId), queryFn: () => platformApiRequest<RunbookDetail>(`/platform/runbooks/${selectedRunbookId}`) });
  const selectedExecution = useQuery({ queryKey: ['platform', 'runbooks', 'execution', selectedExecutionId], enabled: Boolean(selectedExecutionId), queryFn: () => platformApiRequest<Execution>(`/platform/runbooks/executions/${selectedExecutionId}`) });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['platform', 'runbooks'] });
  };

  const runbookPayload = () => ({
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    owner_role: draft.owner_role.trim() || null,
    steps: draft.steps.map((step) => ({
      ...step,
      title: step.title.trim(),
      instructions: step.instructions.trim() || null,
      expected_result: step.expected_result.trim() || null
    }))
  });

  const executionPayload = () => ({
    ...executionDraft,
    runbook_id: executionDraft.runbook_id,
    tenant_id: executionDraft.tenant_id || null,
    reason: executionDraft.reason.trim(),
    notes: executionDraft.notes.trim() || null
  });

  const canCreateRunbook = draft.title.trim().length > 0 && draft.steps.every((step) => step.title.trim().length > 0);
  const canStartExecution = Boolean(executionDraft.runbook_id) && executionDraft.reason.trim().length > 0;

  const createRunbook = useMutation({
    mutationFn: () => platformApiRequest('/platform/runbooks', { method: 'POST', body: JSON.stringify(runbookPayload()) }),
    onSuccess: () => { setDraft({ title: '', description: '', category: 'general', severity: 'medium', owner_role: '', steps: [{ ...defaultStep }] }); setMessage('Runbook created successfully.'); refreshAll(); }
  });

  const startExecution = useMutation({
    mutationFn: () => platformApiRequest('/platform/runbooks/executions', { method: 'POST', body: JSON.stringify(executionPayload()) }),
    onSuccess: () => { setExecutionDraft({ runbook_id: '', tenant_id: '', reason: '', notes: '' }); setMessage('Runbook execution started successfully.'); refreshAll(); }
  });

  const updateStep = useMutation({
    mutationFn: ({ executionId, stepId, status }: { executionId: string; stepId: string; status: 'done' | 'skipped' | 'pending' }) => platformApiRequest(`/platform/runbooks/executions/${executionId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => { setMessage('Execution step updated successfully.'); refreshAll(); }
  });

  const closeExecution = useMutation({
    mutationFn: ({ executionId, action }: { executionId: string; action: 'complete' | 'cancel' }) => platformApiRequest(`/platform/runbooks/executions/${executionId}/${action}`, { method: 'POST' }),
    onSuccess: (_data, variables) => { setMessage(variables.action === 'complete' ? 'Runbook execution completed successfully.' : 'Runbook execution cancelled successfully.'); refreshAll(); }
  });

  function updateDraftStep(index: number, patch: Partial<StepDraft>) {
    setDraft((current) => ({ ...current, steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step) }));
  }

  function addStep() { setDraft((current) => ({ ...current, steps: [...current.steps, { ...defaultStep }] })); }
  function removeStep(index: number) {
    if (!window.confirm('Remove this runbook step?')) return;
    setDraft((current) => ({ ...current, steps: current.steps.filter((_, stepIndex) => stepIndex !== index) }));
  }

  function closeSelectedExecution(action: 'complete' | 'cancel') {
    if (!selectedExecution.data) return;
    const label = action === 'complete' ? 'complete' : 'cancel';
    if (!window.confirm(`Are you sure you want to ${label} this runbook execution?`)) return;
    closeExecution.mutate({ executionId: selectedExecution.data.id, action });
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Platform runbooks</h1>
          <p style={styles.muted}>Operational checklists for real HLA work: incidents, billing issues, security events, maintenance, support, offboarding, and tenant recovery. Executions create an auditable record of who followed which steps.</p>
          <p style={styles.metaText}>Source: platform runbooks API · Snapshot: live query · Filters: category {category || 'all'}, severity {severity || 'all'}</p>
        </div>
        <button type="button" style={styles.button} onClick={refreshAll}>Refresh</button>
      </header>

      {message ? <div style={styles.successMessage}>{message}</div> : null}

      <section style={styles.linkPanel}>
        <strong>Supporting platform pages</strong>
        <div style={styles.linkRow}>
          <Link style={styles.quickLink} to="/platform/incidents">Incidents</Link>
          <Link style={styles.quickLink} to="/platform/maintenance">Maintenance</Link>
          <Link style={styles.quickLink} to="/platform/tenant-tasks">Tenant tasks</Link>
          <Link style={styles.quickLink} to="/platform/audit">Platform audit</Link>
        </div>
      </section>

      {(summary.isError || runbooks.isError || executions.isError || tenants.isError) ? (
        <section style={styles.errorPanel}>
          <strong>Runbook data could not be loaded.</strong>
          <span style={styles.muted}>Retry reloads summary, filters, tenant options, and recent executions.</span>
          <button type="button" style={styles.secondaryButton} onClick={refreshAll}>Retry</button>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Summary</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}><strong>{summary.data?.active_executions ?? 0}</strong><span>Active executions</span></div>
          <div style={styles.summaryCard}><strong>{summary.data?.active_critical_runbooks ?? 0}</strong><span>Critical runbooks</span></div>
          <div style={styles.summaryCard}><strong>{runbooks.data?.runbooks.length ?? 0}</strong><span>Visible runbooks</span></div>
        </div>
        <div style={styles.filterGrid}>
          <select style={styles.input} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select style={styles.input} value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">All severities</option>{severities.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <button type="button" style={styles.button} onClick={refreshAll}>Refresh</button>
        </div>
      </section>

      {canWrite ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create runbook</h2>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>Title<input style={styles.input} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" /></label>
            <label style={styles.fieldLabel}>Category<select style={styles.input} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label style={styles.fieldLabel}>Severity<select style={styles.input} value={draft.severity} onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value }))}>{severities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label style={styles.fieldLabel}>Owner role<input style={styles.input} value={draft.owner_role} onChange={(event) => setDraft((current) => ({ ...current, owner_role: event.target.value }))} placeholder="Owner role, optional" /></label>
            <label style={{ ...styles.fieldLabel, gridColumn: '1 / -1' }}>Description<textarea style={{ ...styles.input, minHeight: 70 }} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Description" /></label>
          </div>
          <h3 style={styles.smallHeading}>Steps</h3>
          <div style={styles.stepsList}>
            {draft.steps.map((step, index) => (
              <div key={index} style={styles.stepEditor}>
                <label style={styles.fieldLabel}>Step title<input style={styles.input} value={step.title} onChange={(event) => updateDraftStep(index, { title: event.target.value })} placeholder={`Step ${index + 1} title`} /></label>
                <label style={styles.fieldLabel}>Instructions<textarea style={styles.input} value={step.instructions} onChange={(event) => updateDraftStep(index, { instructions: event.target.value })} placeholder="Instructions" /></label>
                <label style={styles.fieldLabel}>Expected result<input style={styles.input} value={step.expected_result} onChange={(event) => updateDraftStep(index, { expected_result: event.target.value })} placeholder="Expected result" /></label>
                <label style={styles.checkboxLabel}><input type="checkbox" checked={step.is_required} onChange={(event) => updateDraftStep(index, { is_required: event.target.checked })} /> Required</label>
                {draft.steps.length > 1 ? <button type="button" style={styles.dangerButton} onClick={() => removeStep(index)}>Remove</button> : null}
              </div>
            ))}
          </div>
          <div style={styles.actionRow}>
            <button type="button" style={styles.secondaryButton} onClick={addStep}>Add step</button>
            <button type="button" style={styles.button} disabled={!canCreateRunbook || createRunbook.isPending} onClick={() => createRunbook.mutate()}>{createRunbook.isPending ? 'Creating...' : 'Create runbook'}</button>
          </div>
        </section>
      ) : null}

      {canExecute ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Start runbook execution</h2>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>Runbook<select style={styles.input} value={executionDraft.runbook_id} onChange={(event) => setExecutionDraft((current) => ({ ...current, runbook_id: event.target.value }))}><option value="">Select runbook</option>{(runbooks.data?.runbooks || []).filter((runbook) => runbook.is_active).map((runbook) => <option key={runbook.id} value={runbook.id}>{runbook.title}</option>)}</select></label>
            <label style={styles.fieldLabel}>Tenant<select style={styles.input} value={executionDraft.tenant_id} onChange={(event) => setExecutionDraft((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">No tenant / platform-wide</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <label style={styles.fieldLabel}>Reason / ticket / incident context<input style={styles.input} value={executionDraft.reason} onChange={(event) => setExecutionDraft((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason / ticket / incident context" /></label>
            <label style={styles.fieldLabel}>Notes<input style={styles.input} value={executionDraft.notes} onChange={(event) => setExecutionDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes, optional" /></label>
            <button type="button" style={styles.button} disabled={!canStartExecution || startExecution.isPending} onClick={() => startExecution.mutate()}>{startExecution.isPending ? 'Starting...' : 'Start execution'}</button>
          </div>
        </section>
      ) : null}

      <section style={styles.columns}>
        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Runbooks</h2>
          <div style={styles.cardList}>
            {(runbooks.data?.runbooks || []).map((runbook) => (
              <button type="button" key={runbook.id} style={selectedRunbookId === runbook.id ? styles.selectedCard : styles.cardButton} onClick={() => setSelectedRunbookId(runbook.id)}>
                <strong>{runbook.title}</strong>
                <span>{runbook.category} · {runbook.severity} · {runbook.step_count} steps</span>
                <span>{runbook.is_active ? 'Active' : 'Inactive'} · {runbook.active_execution_count || 0} active executions</span>
              </button>
            ))}
            {!runbooks.isLoading && (runbooks.data?.runbooks || []).length === 0 ? <p style={styles.muted}>No runbooks match the filters.</p> : null}
          </div>
        </div>

        <div style={styles.panel}>
          <h2 style={styles.sectionTitle}>Runbook detail</h2>
          {selectedRunbook.data ? (
            <div style={styles.detailBlock}>
              <h3 style={styles.detailTitle}>{selectedRunbook.data.title}</h3>
              <p style={styles.muted}>{selectedRunbook.data.description || 'No description.'}</p>
              <ol style={styles.orderedList}>{selectedRunbook.data.steps.map((step) => <li key={step.id}><strong>{step.title}</strong><br /><span style={styles.muted}>{step.instructions || 'No instructions.'}</span><br /><span style={styles.muted}>Expected: {step.expected_result || 'not specified'} · {step.is_required ? 'required' : 'optional'}</span></li>)}</ol>
            </div>
          ) : <p style={styles.muted}>Select a runbook to inspect steps.</p>}
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Recent executions</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th>Runbook</th><th>Status</th><th>Tenant</th><th>Progress</th><th>Started</th><th>Actions</th></tr></thead>
            <tbody>
              {(executions.data?.executions || []).map((execution) => (
                <tr key={execution.id}>
                  <td><strong>{execution.runbook_title}</strong><br /><span style={styles.muted}>{execution.reason}</span></td>
                  <td><span style={execution.status === 'in_progress' ? styles.warnBadge : styles.okBadge}>{execution.status}</span></td>
                  <td>{execution.tenant_name || 'Platform-wide'}</td>
                  <td>{execution.done_steps ?? 0}/{execution.total_steps ?? 0}</td>
                  <td>{new Date(execution.started_at).toLocaleString()}</td>
                  <td><div style={styles.actionRow}><button type="button" style={styles.smallButton} onClick={() => setSelectedExecutionId(execution.id)}>Open</button><Link style={styles.tableLink} to="/platform/audit">Audit evidence</Link></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedExecution.data ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Execution detail: {selectedExecution.data.runbook_title}</h2>
          <p style={styles.muted}>{selectedExecution.data.reason} · {selectedExecution.data.tenant_name || 'Platform-wide'} · {selectedExecution.data.status}</p>
          <div style={styles.stepsList}>
            {(selectedExecution.data.steps || []).map((step) => (
              <div key={step.id} style={styles.executionStep}>
                <div><strong>{step.step_order}. {step.title}</strong><br /><span style={styles.muted}>{step.instructions || 'No instructions.'}</span></div>
                <span style={step.status === 'done' ? styles.okBadge : step.status === 'skipped' ? styles.neutralBadge : styles.warnBadge}>{step.status}</span>
                {canExecute && selectedExecution.data.status === 'in_progress' ? (
                  <div style={styles.actionRow}>
                    <button type="button" style={styles.smallButton} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: 'done' })}>Done</button>
                    <button type="button" style={styles.secondarySmallButton} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: 'skipped' })}>Skip</button>
                    <button type="button" style={styles.secondarySmallButton} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: 'pending' })}>Reset</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          {canExecute && selectedExecution.data.status === 'in_progress' ? (
            <div style={styles.actionRow}>
              <button type="button" style={styles.button} onClick={() => closeSelectedExecution('complete')}>Complete execution</button>
              <button type="button" style={styles.dangerButton} onClick={() => closeSelectedExecution('cancel')}>Cancel execution</button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 24 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 30 },
  muted: { color: '#6b7280', fontSize: 13 },
  metaText: { color: '#4b5563', fontSize: 12, marginTop: 8 },
  successMessage: { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 12, padding: 12 },
  errorPanel: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  linkPanel: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  linkRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  quickLink: { border: '1px solid #d1d5db', borderRadius: 999, padding: '6px 10px', color: '#111827', textDecoration: 'none', background: '#fff', fontSize: 13 },
  tableLink: { color: '#1d4ed8', fontSize: 12, textDecoration: 'none' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)' },
  sectionTitle: { marginTop: 0, fontSize: 18 },
  smallHeading: { marginBottom: 8, fontSize: 15 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  summaryCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'minmax(160px, 1fr) minmax(160px, 1fr) auto', gap: 12, alignItems: 'center' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignItems: 'start' },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', font: 'inherit', background: '#fff', width: '100%', boxSizing: 'border-box' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, color: '#374151', fontSize: 13, fontWeight: 600 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' },
  button: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#111827', cursor: 'pointer' },
  dangerButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  smallButton: { border: 0, borderRadius: 8, padding: '7px 10px', background: '#111827', color: '#fff', cursor: 'pointer' },
  secondarySmallButton: { border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', background: '#fff', color: '#111827', cursor: 'pointer' },
  actionRow: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 },
  stepsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  stepEditor: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 },
  columns: { display: 'grid', gridTemplateColumns: 'minmax(280px, 0.9fr) minmax(320px, 1.1fr)', gap: 16 },
  cardList: { display: 'flex', flexDirection: 'column', gap: 10 },
  cardButton: { textAlign: 'left', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 },
  selectedCard: { textAlign: 'left', border: '1px solid #111827', borderRadius: 12, padding: 12, background: '#f9fafb', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 },
  detailBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  detailTitle: { margin: 0, fontSize: 18 },
  orderedList: { display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 22 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  warnBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#fef3c7', color: '#92400e', fontSize: 12 },
  okBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#dcfce7', color: '#166534', fontSize: 12 },
  neutralBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#e5e7eb', color: '#374151', fontSize: 12 },
  executionStep: { display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }
};
