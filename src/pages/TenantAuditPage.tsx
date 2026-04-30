import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type TenantAuditRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function metadataValue(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function actorLabel(row: TenantAuditRow): { primary: string; secondary?: string; support: boolean } {
  const actorType = metadataValue(row.metadata, 'actor_type');

  if (actorType === 'support_session') {
    const platformName = metadataValue(row.metadata, 'platform_user_name');
    const platformEmail = metadataValue(row.metadata, 'platform_user_email');
    const supportSessionId = metadataValue(row.metadata, 'support_session_id');

    return {
      primary: platformName || platformEmail || 'Platform support',
      secondary: platformEmail && platformName ? platformEmail : supportSessionId || undefined,
      support: true
    };
  }

  return {
    primary: row.user_name || row.user_email || row.user_id || 'Tenant user',
    secondary: row.user_email && row.user_name ? row.user_email : row.user_id || undefined,
    support: false
  };
}

function metadataPreview(metadata: Record<string, unknown> | null): string {
  if (!metadata || !Object.keys(metadata).length) return '-';

  const useful = {
    actor_type: metadata.actor_type,
    method: metadata.method,
    path: metadata.path,
    status_code: metadata.status_code,
    support_reason: metadata.support_reason,
    support_session_id: metadata.support_session_id,
    platform_user_id: metadata.platform_user_id
  };

  try {
    return JSON.stringify(useful);
  } catch {
    return '[unreadable metadata]';
  }
}

export default function TenantAuditPage() {
  const [limit, setLimit] = useState('100');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [supportOnly, setSupportOnly] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', limit || '100');
    if (action.trim()) params.set('action', action.trim());
    if (entityType.trim()) params.set('entity_type', entityType.trim());
    if (supportOnly) params.set('support_only', 'true');
    return params.toString();
  }, [action, entityType, limit, supportOnly]);

  const auditQuery = useQuery({
    queryKey: ['tenant', 'audit', queryString],
    queryFn: () => apiRequest<TenantAuditRow[]>(`/audit?${queryString}`)
  });

  const rows = auditQuery.data || [];

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Tenant Audit</h1>
        <p style={styles.subtitle}>Tenant-scoped write history, including support-session activity performed through the platform.</p>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.filters}>
          <label style={styles.label}>
            Limit
            <input
              type="number"
              min="1"
              max="500"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Action
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="create / update / delete"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Entity type
            <input
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              placeholder="stock / shipments / products"
              style={styles.input}
            />
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={supportOnly}
              onChange={(event) => setSupportOnly(event.target.checked)}
            />
            Support-session actions only
          </label>
        </div>
      </section>

      {auditQuery.isLoading ? <div style={styles.panel}>Loading tenant audit…</div> : null}
      {auditQuery.error ? <div style={styles.error}>{readableError(auditQuery.error)}</div> : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Audit Events</h2>
        {rows.length ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Actor</th>
                <th style={styles.th}>Entity</th>
                <th style={styles.th}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const actor = actorLabel(row);
                return (
                  <tr key={row.id}>
                    <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                    <td style={styles.tdMono}>{row.action}</td>
                    <td style={styles.td}>
                      <span style={actor.support ? styles.supportBadge : styles.userBadge}>
                        {actor.support ? 'SUPPORT' : 'TENANT'}
                      </span>
                      <div style={styles.actorPrimary}>{actor.primary}</div>
                      {actor.secondary ? <div style={styles.muted}>{actor.secondary}</div> : null}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.entityType}>{row.entity_type}</span>
                      {row.entity_id ? <div style={styles.muted}>{row.entity_id}</div> : null}
                    </td>
                    <td style={styles.tdMonoSmall}>{metadataPreview(row.metadata)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : !auditQuery.isLoading ? <div>No tenant audit events found.</div> : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)', overflowX: 'auto' },
  sectionTitle: { margin: '0 0 14px', fontSize: '20px' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'end' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#374151', paddingBottom: '10px' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top' },
  tdMono: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', verticalAlign: 'top', whiteSpace: 'nowrap' },
  tdMonoSmall: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', fontSize: '12px', verticalAlign: 'top', maxWidth: '420px', wordBreak: 'break-word' },
  muted: { color: '#6b7280', fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' },
  actorPrimary: { marginTop: '6px', fontWeight: 700 },
  entityType: { fontWeight: 700 },
  supportBadge: { display: 'inline-flex', borderRadius: '999px', padding: '4px 8px', background: '#fffbeb', color: '#92400e', fontSize: '11px', fontWeight: 800 },
  userBadge: { display: 'inline-flex', borderRadius: '999px', padding: '4px 8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 800 }
};
