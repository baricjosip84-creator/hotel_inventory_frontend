import { DataTable, InputField, MetricCard, SectionCard, SelectField, TextareaField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatRecordValue } from '../EnterpriseInventoryFormat';
import type { AutomationTabProps } from '../EnterpriseInventoryAutomationTabProps';

export function AutomationTab({
  automationSchedules,
  automationRunEvents,
  automationScheduleForm,
  setAutomationScheduleForm,
  automationDisableReasons,
  setAutomationDisableReasons,
  automationTypesQuery,
  automationSchedulesQuery,
  automationRunnerReadinessQuery,
  automationRunnerStatusQuery,
  automationRunEventsQuery,
  automationRunnerSafetyReportQuery,
  automationRunnerGovernancePackQuery,
  automationRunnerOperationsReviewQuery,
  automationRunnerAccountabilityDigestQuery,
  automationRunnerPolicyMatrixQuery,
  automationRunnerSafetyChecks,
  automationRunnerGovernanceChecks,
  automationRunnerOperationsChecks,
  automationRunnerPolicyRows,
  automationRunnerActorBreakdown,
  automationRunnerRequestBreakdown,
  automationRunnerDueSchedules,
  automationRunnerLinkedRequests,
  createAutomationScheduleMutation,
  dryRunAutomationScheduleMutation,
  runAutomationScheduleMutation,
  pauseAutomationScheduleMutation,
  disableAutomationScheduleMutation
}: AutomationTabProps) {
  const automationSummary = {
    total: automationSchedules.length,
    draft: automationSchedules.filter((item) => item.status === 'draft').length,
    paused: automationSchedules.filter((item) => item.status === 'paused').length,
    disabled: automationSchedules.filter((item) => item.status === 'disabled').length,
    due: automationSchedules.filter((item) => item.next_run_at && new Date(item.next_run_at).getTime() <= Date.now()).length
  };

  return (
    <section style={styles.stack}>
      <div style={styles.metricsGrid}>
        <MetricCard label="Schedules" value={automationSummary.total} helper="Configured schedules" />
        <MetricCard label="Draft" value={automationSummary.draft} helper="Request-ready configs" />
        <MetricCard label="Paused" value={automationSummary.paused} helper="Temporarily held" />
        <MetricCard label="Disabled" value={automationSummary.disabled} helper="Blocked configs" />
        <MetricCard label="Due" value={automationSummary.due} helper="Next run is due" />
        <MetricCard label="Auto requests" value={automationRunnerStatusQuery.data?.can_create_execution_requests_automatically ? 'Enabled' : 'Locked'} helper="Runner safety posture" />
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Create automation schedule</h2>
        <form onSubmit={(event) => { event.preventDefault(); createAutomationScheduleMutation.mutate(automationScheduleForm); }}>
          <div style={styles.inlineGrid}>
            <SelectField
              label="Automation type"
              value={automationScheduleForm.automation_type}
              required
              onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, automation_type: value }))}
              options={(automationTypesQuery.data?.automation_types ?? []).map((item) => ({ value: item.automation_type, label: item.label || item.automation_type }))}
            />
            <SelectField
              label="Schedule kind"
              value={automationScheduleForm.schedule_kind}
              required
              onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, schedule_kind: value }))}
              options={(automationTypesQuery.data?.schedule_kinds ?? ['manual', 'daily', 'weekly', 'monthly']).map((item: string) => ({ value: item, label: item }))}
            />
            <SelectField
              label="Default request status"
              value={automationScheduleForm.default_status}
              required
              onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, default_status: value }))}
              options={(automationTypesQuery.data?.request_default_statuses ?? ['draft', 'pending_review']).map((item: string) => ({ value: item, label: item }))}
            />
            <InputField label="Run time" value={automationScheduleForm.time} required onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, time: value }))} />
          </div>
          <InputField label="Name" value={automationScheduleForm.name} required onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, name: value }))} />
          <InputField label="Timezone" value={automationScheduleForm.timezone} onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, timezone: value }))} />
          <TextareaField
            label="Description"
            value={automationScheduleForm.description}
            onChange={(value) => setAutomationScheduleForm((current) => ({ ...current, description: value }))}
          />
          <button type="submit" style={styles.primaryButton} disabled={createAutomationScheduleMutation.isPending}>
            {createAutomationScheduleMutation.isPending ? 'Creating…' : 'Create schedule'}
          </button>
        </form>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Runner readiness and safety</h2>
        <div style={styles.statGrid}>
          <MetricCard label="Ready" value={automationRunnerReadinessQuery.data?.ready ? 'Yes' : 'No'} />
          <MetricCard label="Runner active" value={automationRunnerStatusQuery.data?.running || automationRunnerStatusQuery.data?.runner_enabled ? 'Yes' : 'No'} />
          <MetricCard label="Can start runner" value={automationRunnerStatusQuery.data?.can_start_background_runner ? 'Yes' : 'No'} />
          <MetricCard label="Can execute" value={automationRunnerStatusQuery.data?.can_execute_requests ? 'Yes' : 'No'} />
        </div>
        <DataTable
          loading={automationRunnerReadinessQuery.isLoading || automationRunnerStatusQuery.isLoading}
          empty="No automation readiness checks returned."
          headers={['Check', 'Status', 'Detail']}
          rows={[...(automationRunnerReadinessQuery.data?.checks ?? []), ...(automationRunnerStatusQuery.data?.checks ?? [])].slice(0, 12).map((item) => [item.label || item.key || '-', item.status || '-', item.detail || '-'])}
        />
      </section>

      <SectionCard title="Automation schedules">
        {automationSchedulesQuery.isLoading ? <p style={styles.helper}>Loading…</p> : null}
        {!automationSchedulesQuery.isLoading && !automationSchedules.length ? <p style={styles.helper}>No automation schedules yet.</p> : null}
        <div style={styles.stack}>
          {automationSchedules.map((schedule) => (
            <div key={schedule.id} style={styles.metricCard}>
              <strong>{schedule.name}</strong>
              <p style={styles.helper}>{schedule.automation_type} · {schedule.schedule_kind} · {schedule.status} · next {formatDateTime(schedule.next_run_at)}</p>
              {schedule.description ? <p style={styles.helper}>{schedule.description}</p> : null}
              <div style={styles.actions}>
                <button type="button" style={styles.secondarySmallButton} onClick={() => dryRunAutomationScheduleMutation.mutate(schedule.id)}>Dry run</button>
                <button type="button" style={schedule.status === 'disabled' ? styles.disabledButton : styles.smallButton} disabled={schedule.status === 'disabled'} title={schedule.status === 'disabled' ? 'Disabled automation schedules cannot be run manually.' : undefined} onClick={() => runAutomationScheduleMutation.mutate(schedule.id)}>Manual run</button>
                <button type="button" style={schedule.status === 'disabled' ? styles.disabledButton : styles.secondarySmallButton} disabled={schedule.status === 'disabled'} title={schedule.status === 'disabled' ? 'Disabled automation schedules are already blocked.' : undefined} onClick={() => pauseAutomationScheduleMutation.mutate(schedule.id)}>Pause</button>
                {schedule.status === 'paused' ? <button type="button" style={styles.disabledButton} disabled title="Resume is intentionally blocked until the automation runner is enabled.">Resume locked</button> : null}
              </div>
              <div style={{ ...styles.actions, marginTop: 8 }}>
                <input
                  style={styles.inlineInput}
                  placeholder="Disable reason"
                  value={automationDisableReasons[schedule.id] ?? ''}
                  onChange={(event) => setAutomationDisableReasons((current) => ({ ...current, [schedule.id]: event.target.value }))}
                />
                <button
                  type="button"
                  style={schedule.status === 'disabled' ? styles.disabledButton : styles.dangerButton}
                  disabled={schedule.status === 'disabled'}
                  title={schedule.status === 'disabled' ? 'This schedule is already disabled.' : undefined}
                  onClick={() => disableAutomationScheduleMutation.mutate({ id: schedule.id, reason: automationDisableReasons[schedule.id] ?? '' })}
                >
                  Disable
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Run ledger">
        <DataTable
          loading={automationRunEventsQuery.isLoading}
          empty="No automation run events yet."
          headers={['Schedule', 'Mode', 'Status', 'Request', 'Started', 'Completed']}
          rows={automationRunEvents.map((item) => [item.schedule_name || item.automation_schedule_id, item.run_mode || '-', item.status || '-', item.request_status || item.execution_request_id || '-', formatDateTime(item.started_at || item.created_at), formatDateTime(item.completed_at)])}
        />
      </SectionCard>

      <SectionCard title="Runner governance evidence">
        <p style={styles.helper}>Reads existing automation runner governance endpoints only; these controls do not start jobs, approve requests, execute requests, or mutate inventory.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Safety mode" value={formatRecordValue(automationRunnerSafetyReportQuery.data, 'runner_mode')} />
          <MetricCard label="Request creation" value={automationRunnerSafetyReportQuery.data?.request_creation_enabled ? 'Enabled' : 'Locked'} />
          <MetricCard label="Operations posture" value={formatRecordValue(automationRunnerOperationsReviewQuery.data, 'operations_posture')} />
          <MetricCard label="Policy matrix" value={formatRecordValue(automationRunnerPolicyMatrixQuery.data, 'matrix_type')} />
        </div>
        <DataTable
          loading={automationRunnerSafetyReportQuery.isLoading || automationRunnerGovernancePackQuery.isLoading || automationRunnerOperationsReviewQuery.isLoading}
          empty="No runner governance checks returned."
          headers={['Source', 'Check', 'Status', 'Detail']}
          rows={[
            ...automationRunnerSafetyChecks.map((item) => ({ ...item, source: 'safety' })),
            ...automationRunnerGovernanceChecks.map((item) => ({ ...item, source: 'governance' })),
            ...automationRunnerOperationsChecks.map((item) => ({ ...item, source: 'operations' }))
          ].slice(0, 24).map((item) => [
            formatRecordValue(item, 'source'),
            formatRecordValue(item, 'label') || formatRecordValue(item, 'key'),
            formatRecordValue(item, 'status'),
            formatRecordValue(item, 'detail')
          ])}
        />
        <DataTable
          loading={automationRunnerPolicyMatrixQuery.isLoading}
          empty="No runner policy rows returned."
          headers={['Capability', 'Manual', 'Automatic', 'Status', 'Boundary']}
          rows={automationRunnerPolicyRows.map((item) => [
            formatRecordValue(item, 'capability'),
            formatRecordValue(item, 'manual_allowed'),
            formatRecordValue(item, 'automatic_allowed'),
            formatRecordValue(item, 'status'),
            formatRecordValue(item, 'boundary')
          ])}
        />
        <DataTable
          loading={automationRunnerAccountabilityDigestQuery.isLoading}
          empty="No runner accountability actors returned."
          headers={['Mode', 'Trigger', 'Actor', 'Events', 'Failed', 'Latest']}
          rows={automationRunnerActorBreakdown.map((item) => [
            formatRecordValue(item, 'run_mode'),
            formatRecordValue(item, 'trigger_source'),
            formatRecordValue(item, 'actor_name'),
            formatRecordValue(item, 'run_event_count'),
            formatRecordValue(item, 'failed_count'),
            formatDateTime(formatRecordValue(item, 'latest_event_at'))
          ])}
        />
        <DataTable
          loading={automationRunnerAccountabilityDigestQuery.isLoading}
          empty="No schedule-created request status rows returned."
          headers={['Request status', 'Execution status', 'Requests', 'Latest']}
          rows={automationRunnerRequestBreakdown.map((item) => [
            formatRecordValue(item, 'request_status'),
            formatRecordValue(item, 'execution_status'),
            formatRecordValue(item, 'request_count'),
            formatDateTime(formatRecordValue(item, 'latest_request_at'))
          ])}
        />
        <DataTable
          loading={automationRunnerGovernancePackQuery.isLoading}
          empty="No due governance schedules or linked requests returned."
          headers={['Type', 'Name/request', 'Status', 'Schedule kind', 'Timestamp']}
          rows={[
            ...automationRunnerDueSchedules.map((item) => ({ ...item, row_type: 'due schedule' })),
            ...automationRunnerLinkedRequests.map((item) => ({ ...item, row_type: 'linked request' }))
          ].map((item) => [
            formatRecordValue(item, 'row_type'),
            formatRecordValue(item, 'name') || formatRecordValue(item, 'request_type') || formatRecordValue(item, 'id'),
            formatRecordValue(item, 'status'),
            formatRecordValue(item, 'schedule_kind') || formatRecordValue(item, 'execution_status'),
            formatDateTime(formatRecordValue(item, 'next_run_at') !== '-' ? formatRecordValue(item, 'next_run_at') : formatRecordValue(item, 'created_at'))
          ])}
        />
      </SectionCard>
    </section>
  );
}
