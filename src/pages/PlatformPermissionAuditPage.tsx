import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformPermissionAuditPage.css';

type Pagination = { limit:number; offset:number; total:number; has_more:boolean };
type EvidenceAccess = {
  access_reviews:boolean; platform_users:boolean; platform_sessions:boolean; support_sessions:boolean;
  role_permissions:boolean; api_keys:boolean; tenant_identity:boolean;
};
type PermissionAuditUser = {
  id:string; email:string; name?:string|null; role:string; is_active:boolean; mfa_enabled:boolean;
  active_sessions:number|null; open_support_sessions:number|null; permission_count:number|null;
  write_permission_count:number|null; risk_flags:string[]; review_required:boolean;
};
type PermissionAuditApiKey = {
  id:string; tenant_name?:string|null; tenant_identity_available:boolean; name:string; scope_count:number;
  allowed_ip_count:number; expires_at?:string|null; last_used_at?:string|null; risk_flags:string[]; review_required:boolean;
};
type Summary = {
  total_platform_users:number|null; privileged_platform_users:number|null; users_without_mfa:number|null;
  users_requiring_review:number|null; active_platform_sessions:number|null; active_support_access_users:number|null;
  active_api_keys:number|null; api_keys_requiring_review:number|null; api_keys_without_expiration:number|null;
  api_keys_without_ip_allowlist:number|null; open_access_reviews:number; overdue_access_reviews:number; pending_access_review_items:number;
};
type PermissionAuditHardening = {
  feature:string; phase:number; step:number; posture:string; evidence_complete:boolean;
  available_sources:string[]; omitted_sources:string[]; evidence_access:EvidenceAccess; summary:Summary;
  pagination:{ platform_users:Pagination; api_keys:Pagination }; filters:{search:string};
  governance_controls:{read_only:boolean; mutation_owner:string; source_routes:string[]; recommended_review_scopes:string[]};
  evidence_contract:Record<string,boolean>; platform_users:PermissionAuditUser[]; api_keys:PermissionAuditApiKey[];
};

const PAGE_SIZE=50;
function readableError(error:unknown){ return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function pretty(value?:string|null){ const text=String(value||'').replaceAll('_',' ').trim(); return text ? text.charAt(0).toUpperCase()+text.slice(1) : 'Not recorded'; }
function dateTime(value?:string|null){ if(!value)return 'Never'; const d=new Date(value); return Number.isNaN(d.getTime())?'Not recorded':d.toLocaleString(); }
function metric(value:number|null|undefined){ return value===null || value===undefined ? 'Restricted' : value; }
function tone(posture:string){ if(posture.includes('attention'))return 'danger'; if(posture.includes('review')||posture.includes('partial'))return 'warn'; return 'good'; }
function FlagList({flags}:{flags:string[]}){ return flags.length ? <div className="platform-permission-audit__flags">{flags.map((flag)=><span key={flag}>{pretty(flag)}</span>)}</div> : <span className="platform-permission-audit__muted">No recorded flags</span>; }

export default function PlatformPermissionAuditPage(){
  const [searchParams,setSearchParams]=useSearchParams();
  const requestedSearch=searchParams.get('search')||'';
  const search=requestedSearch.length<=200?requestedSearch:'';
  const invalidSearch=Boolean(requestedSearch && !search);
  const [userOffset,setUserOffset]=useState(0);
  const [apiKeyOffset,setApiKeyOffset]=useState(0);
  useEffect(()=>{ setUserOffset(0); setApiKeyOffset(0); },[search]);

  const canReadUsers=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadSessions=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ);
  const canReadSupport=hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canReadRolePermissions=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ROLE_PERMISSIONS_READ);
  const canReadApiKeys=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ);
  const canReadTenants=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadSecurity=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ);
  const canReadAudit=hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const queryString=useMemo(()=>{
    const p=new URLSearchParams({user_limit:String(PAGE_SIZE),user_offset:String(userOffset),api_key_limit:String(PAGE_SIZE),api_key_offset:String(apiKeyOffset)});
    if(search.trim())p.set('search',search.trim());
    return p.toString();
  },[search,userOffset,apiKeyOffset]);

  const audit=useQuery({
    queryKey:['platform','permission-audit','hardening',search,userOffset,apiKeyOffset],
    queryFn:()=>platformApiRequest<PermissionAuditHardening>(`/platform/permission-audit/hardening?${queryString}`),
    enabled:!invalidSearch,
    placeholderData:(previous)=>previous
  });
  const data=audit.data;
  const userEvidenceAvailable=canReadUsers && (data?.evidence_access.platform_users ?? true);
  const sessionEvidenceAvailable=canReadSessions && (data?.evidence_access.platform_sessions ?? true);
  const supportEvidenceAvailable=canReadSupport && (data?.evidence_access.support_sessions ?? true);
  const rolePermissionEvidenceAvailable=canReadRolePermissions && (data?.evidence_access.role_permissions ?? true);
  const apiKeyEvidenceAvailable=canReadApiKeys && (data?.evidence_access.api_keys ?? true);
  const tenantIdentityAvailable=canReadTenants && (data?.evidence_access.tenant_identity ?? true);
  const staleWarning=Boolean(audit.isError && data);
  const blockingError=Boolean(audit.isError && !data);
  const summary=data?.summary;
  const users=data?.platform_users||[];
  const apiKeys=data?.api_keys||[];

  return <div className="io-operational-page io-workspace-page platform-permission-audit io-workspace-shell">
    <OperationalWorkspaceHero
      iconPath="/platform/permission-audit"
      eyebrow="Security governance"
      title="Permission audit"
      description="Inspect permission posture using only the evidence sources the current Platform operator is authorized to read. Missing evidence stays visible as restricted instead of being counted as zero."
      meta={<>
        <OperationalWorkspaceMetaPill>Read-only evidence</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{data?.evidence_complete?'Complete evidence':'Permission-scoped evidence'}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Platform governance</OperationalWorkspaceMetaPill>
      </>}
      actions={<button type="button" className="app-button app-button--secondary" onClick={()=>void audit.refetch()} disabled={audit.isFetching}>{audit.isFetching?'Refreshing…':'Refresh'}</button>}
      aside={<OperationalWorkspaceStatus value={data?pretty(data.posture):'Loading'} label={data?.evidence_complete?'current application posture':'current available evidence posture'} tone={data?tone(data.posture):'neutral'} />}
    />

    {invalidSearch?<div className="platform-permission-audit__blocking"><strong>Invalid search filter.</strong><span>Search text must be 200 characters or fewer.</span><button className="app-button app-button--secondary" type="button" onClick={()=>setSearchParams({})}>Clear filter</button></div>:null}
    {blockingError?<div className="platform-permission-audit__blocking"><strong>Permission audit could not be loaded.</strong><span>{readableError(audit.error)}</span><button className="app-button app-button--secondary" type="button" onClick={()=>void audit.refetch()}>Retry</button></div>:null}
    {staleWarning?<div className="platform-permission-audit__stale"><strong>Showing the last successful snapshot.</strong><span>Refresh failed: {readableError(audit.error)}</span></div>:null}

    {summary?<OperationalWorkspaceStats ariaLabel="Permission audit overview">
      <OperationalWorkspaceStatCard label="Users requiring review" value={metric(summary.users_requiring_review)} helper={summary.total_platform_users===null?'Platform Users evidence restricted':`${summary.total_platform_users} filtered users`} tone="red" iconPath="/platform/users" />
      <OperationalWorkspaceStatCard label="API keys requiring review" value={metric(summary.api_keys_requiring_review)} helper={summary.active_api_keys===null?'API Keys evidence restricted':`${summary.active_api_keys} filtered active keys`} tone="amber" iconPath="/platform/api-keys" />
      <OperationalWorkspaceStatCard label="Overdue access reviews" value={summary.overdue_access_reviews} helper={`${summary.open_access_reviews} open reviews`} tone="amber" iconPath="/platform/access-reviews" />
      <OperationalWorkspaceStatCard label="Pending review items" value={summary.pending_access_review_items} helper="Access Review application evidence" tone="blue" iconPath="/platform/access-reviews" />
      <OperationalWorkspaceStatCard label="Users without MFA" value={metric(summary.users_without_mfa)} helper="Visible Platform-user evidence only" tone="red" iconPath="/platform/users" />
      <OperationalWorkspaceStatCard label="Active sessions" value={metric(summary.active_platform_sessions)} helper={summary.active_platform_sessions===null?'Platform Sessions evidence restricted':'Visible active Platform sessions'} tone="blue" iconPath="/platform/sessions" />
    </OperationalWorkspaceStats>:null}

    <section className="io-workspace-panel platform-permission-audit__section">
      <OperationalSectionHeader iconPath="/platform/permission-audit" title="Evidence coverage" description="The audit does not read protected source tables unless the current operator has that source permission." />
      <div className="platform-permission-audit__coverage">
        {(data?.available_sources||['access_reviews']).map((source)=><span key={source} data-state="available">{pretty(source)} · available</span>)}
        {(data?.omitted_sources||[]).map((source)=><span key={source} data-state="restricted">{pretty(source)} · restricted</span>)}
      </div>
      <div className="platform-permission-audit__truth"><strong>Evidence boundary:</strong> Permission counts, session activity, API-key posture and review records are application evidence. A clean application snapshot does not prove external access was removed, customer authorization exists, or external security controls are effective.</div>
    </section>

    <section className="io-workspace-panel platform-permission-audit__section">
      <OperationalSectionHeader iconPath="/platform/permission-audit" title="Find evidence" description="Search the source families you are authorized to read. Search is server-side and resets both evidence pages." />
      <div className="platform-permission-audit__filters">
        <label>Search<input value={search} maxLength={200} placeholder="User, role, key or tenant" onChange={(e)=>{ const value=e.target.value; const next=new URLSearchParams(searchParams); if(value)next.set('search',value);else next.delete('search'); setSearchParams(next,{replace:true}); }}/></label>
        {search?<button className="app-button app-button--secondary" type="button" onClick={()=>{ const next=new URLSearchParams(searchParams); next.delete('search'); setSearchParams(next,{replace:true}); }}>Clear</button>:null}
      </div>
    </section>

    <section className="io-workspace-panel platform-permission-audit__section">
      <OperationalSectionHeader iconPath="/platform/users" title="Platform user permission posture" description={userEvidenceAvailable?'Platform-user evidence is visible. Session, support-session and effective-role permission columns remain independently permission-scoped.':'Platform-user evidence is restricted by the current live permission snapshot.'} />
      {!userEvidenceAvailable?<div className="platform-permission-audit__restricted">Platform Users evidence is omitted. Its absence is not counted as zero users or zero permission risk.</div>:<>
        <div className="platform-permission-audit__table-wrap"><table><thead><tr><th>User</th><th>Role / account</th><th>Effective permissions</th><th>Sessions</th><th>Support access</th><th>Flags</th></tr></thead><tbody>
          {users.map((user)=><tr key={user.id}><td><strong>{user.email}</strong><small>{user.name||'No name recorded'}</small></td><td>{pretty(user.role)}<small>{user.is_active?'Active':'Inactive'} · MFA {user.mfa_enabled?'on':'off'}</small></td><td>{rolePermissionEvidenceAvailable && user.permission_count!==null?`${user.permission_count} total`:'Restricted'}<small>{rolePermissionEvidenceAvailable && user.write_permission_count!==null?`${user.write_permission_count} write/action`:'Role-permission evidence restricted'}</small></td><td>{user.active_sessions===null?'Restricted':user.active_sessions}<small>{sessionEvidenceAvailable?'Active Platform sessions':'PLATFORM_SESSIONS_READ required'}</small></td><td>{user.open_support_sessions===null?'Restricted':user.open_support_sessions}<small>{supportEvidenceAvailable?'Active support sessions':'SUPPORT_SESSION_READ required'}</small></td><td><FlagList flags={user.risk_flags}/></td></tr>)}
          {!users.length?<tr><td colSpan={6} className="platform-permission-audit__empty">No Platform users match the current filter on this evidence page.</td></tr>:null}
        </tbody></table></div>
        {data?<div className="platform-permission-audit__pager"><span>Showing {data.pagination.platform_users.total?data.pagination.platform_users.offset+1:0}–{Math.min(data.pagination.platform_users.offset+data.pagination.platform_users.limit,data.pagination.platform_users.total)} of {data.pagination.platform_users.total}</span><div><button className="app-button app-button--secondary" type="button" disabled={userOffset===0||audit.isFetching} onClick={()=>setUserOffset(Math.max(0,userOffset-PAGE_SIZE))}>Previous</button><button className="app-button app-button--secondary" type="button" disabled={!data.pagination.platform_users.has_more||audit.isFetching} onClick={()=>setUserOffset(userOffset+PAGE_SIZE)}>Next</button></div></div>:null}
      </>}
    </section>

    <section className="io-workspace-panel platform-permission-audit__section">
      <OperationalSectionHeader iconPath="/platform/api-keys" title="API key permission posture" description={apiKeyEvidenceAvailable?'Active Platform-managed API-key evidence is visible. Tenant identity remains independently permission-scoped.':'API-key evidence is restricted by the current live permission snapshot.'} />
      {!apiKeyEvidenceAvailable?<div className="platform-permission-audit__restricted">API Keys evidence is omitted. Its absence is not counted as zero active keys or zero API-key risk.</div>:<>
        <div className="platform-permission-audit__table-wrap"><table><thead><tr><th>Key</th><th>Tenant</th><th>Scope / allowlist</th><th>Lifecycle</th><th>Flags</th></tr></thead><tbody>
          {apiKeys.map((key)=><tr key={key.id}><td><strong>{key.name}</strong><small>{key.review_required?'Review required':'No current application flags'}</small></td><td>{tenantIdentityAvailable && key.tenant_identity_available?(key.tenant_name||'Platform/global'):'Restricted'}<small>{tenantIdentityAvailable && key.tenant_identity_available?'Tenant identity evidence':'TENANTS_READ required'}</small></td><td>{key.scope_count} scopes<small>{key.allowed_ip_count} allowed IPs</small></td><td>Expires: {dateTime(key.expires_at)}<small>Last used: {dateTime(key.last_used_at)}</small></td><td><FlagList flags={key.risk_flags}/></td></tr>)}
          {!apiKeys.length?<tr><td colSpan={5} className="platform-permission-audit__empty">No active API keys match the current filter on this evidence page.</td></tr>:null}
        </tbody></table></div>
        {data?<div className="platform-permission-audit__pager"><span>Showing {data.pagination.api_keys.total?data.pagination.api_keys.offset+1:0}–{Math.min(data.pagination.api_keys.offset+data.pagination.api_keys.limit,data.pagination.api_keys.total)} of {data.pagination.api_keys.total}</span><div><button className="app-button app-button--secondary" type="button" disabled={apiKeyOffset===0||audit.isFetching} onClick={()=>setApiKeyOffset(Math.max(0,apiKeyOffset-PAGE_SIZE))}>Previous</button><button className="app-button app-button--secondary" type="button" disabled={!data.pagination.api_keys.has_more||audit.isFetching} onClick={()=>setApiKeyOffset(apiKeyOffset+PAGE_SIZE)}>Next</button></div></div>:null}
      </>}
    </section>

    <section className="io-workspace-panel platform-permission-audit__section">
      <OperationalSectionHeader iconPath="/platform/permission-audit" title="Supporting operations" description="Only destinations authorized by the current Platform permission snapshot are shown." />
      <div className="platform-permission-audit__links">
        <Link to="/platform/access-reviews">Access reviews</Link>
        {canReadUsers?<Link to="/platform/users">Platform users</Link>:null}
        {canReadSessions?<Link to="/platform/sessions">Platform sessions</Link>:null}
        {canReadSupport?<Link to="/platform/support-sessions">Support sessions</Link>:null}
        {canReadRolePermissions?<Link to="/platform/permissions">Role permissions</Link>:null}
        {canReadApiKeys?<Link to="/platform/api-keys">API keys</Link>:null}
        {canReadSecurity?<Link to="/platform/security">My Security</Link>:null}
        {canReadAudit?<Link to="/platform/audit">Platform audit</Link>:null}
        {canReadTenants?<Link to="/platform/tenants">Tenants</Link>:null}
      </div>
    </section>
  </div>;
}
