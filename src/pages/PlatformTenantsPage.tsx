import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type TenantRow = {
  id: string;
  name: string;
  location?: string | null;
  season_start?: string | null;
  season_end?: string | null;
  write_locked?: boolean;
  organization_type?: string | null;
  created_at?: string | null;
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export default function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const canLockTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_LOCK);
  const canUnlockTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UNLOCK);

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants')
  });

  const lockMutation = useMutation({
    mutationFn: (tenantId: string) =>
      platformApiRequest(`/platform/tenants/${tenantId}/lock`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'system-health'] });
    }
  });

  const unlockMutation = useMutation({
    mutationFn: (tenantId: string) =>
      platformApiRequest(`/platform/tenants/${tenantId}/unlock`, { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'system-health'] });
    }
  });

  const isMutatingTenantLock = lockMutation.isPending || unlockMutation.isPending;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenants</h1>
          <p style={styles.subtitle}>Cross-tenant platform view. Tenant admins should not see this page.</p>
        </div>
      </header>

      {tenantsQuery.isLoading ? <div style={styles.panel}>Loading tenants…</div> : null}
      {tenantsQuery.error ? <div style={styles.error}>{readableError(tenantsQuery.error)}</div> : null}

      <section style={styles.panel}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Write lock</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(tenantsQuery.data || []).map((tenant) => (
              <tr key={tenant.id}>
                <td style={styles.td}>{tenant.name}</td>
                <td style={styles.td}>{tenant.location || '-'}</td>
                <td style={styles.td}>{tenant.organization_type || '-'}</td>
                <td style={styles.td}>{tenant.write_locked ? 'Locked' : 'Open'}</td>
                <td style={styles.td}>
                  {tenant.write_locked ? (
                    canUnlockTenants ? (
                      <button
                        type="button"
                        style={styles.button}
                        onClick={() => unlockMutation.mutate(tenant.id)}
                        disabled={isMutatingTenantLock}
                      >
                        Unlock
                      </button>
                    ) : (
                      <span style={styles.muted}>Read-only</span>
                    )
                  ) : canLockTenants ? (
                      <button
                        type="button"
                        style={styles.button}
                        onClick={() => lockMutation.mutate(tenant.id)}
                        disabled={isMutatingTenantLock}
                      >
                        Lock
                      </button>
                  ) : (
                    <span style={styles.muted}>Read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '30px'
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280'
  },
  panel: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 12px 36px rgba(15,23,42,0.08)',
    overflowX: 'auto'
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    borderBottom: '1px solid #e5e7eb',
    padding: '10px',
    color: '#6b7280',
    fontSize: '13px'
  },
  td: {
    borderBottom: '1px solid #f3f4f6',
    padding: '12px 10px'
  },
  button: {
    padding: '8px 10px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    cursor: 'pointer'
  },
  muted: {
    color: '#6b7280'
  }
};
