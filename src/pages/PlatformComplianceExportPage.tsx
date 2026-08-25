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
import './PlatformComplianceExportPage.css';

type Pagination={limit:number;offset:number;total:number;has_more:boolean};
type EvidenceAccess={compliance_documents:boolean;privacy_requests:boolean;tenant_export_evidence:boolean;audit_retention:boolean;permission_audit:boolean};
type DocumentEvidenceAccess={tenant_identity:boolean;platform_user_identity:boolean};
type DocumentRow={id:string;tenant_id?:string|null;tenant_name?:string|null;tenant_present:boolean;title:string;document_type:string;status:string;owner_email?:string|null;owner_present:boolean;external_reference_present:boolean;expires_at?:string|null;reviewed_at?:string|null;days_until_expiration?:number|null;historical:boolean;current_package_evidence:boolean;risk_flags:string[];package_ready:boolean};
type Summary={total_documents:number;current_documents:number;historical_documents:number;active_documents:number;documents_requiring_review:number;documents_expiring_soon:number;documents_missing_external_reference:number;required_document_types:string[];missing_required_document_types:string[];total_privacy_requests:number|null;open_privacy_requests:number|null;open_blocking_privacy_requests:number|null;overdue_privacy_requests:number|null;total_tenants:number|null;tenants_with_export_evidence:number|null;tenants_missing_export_evidence:number|null;tenants_with_retention_holds:number|null;tenants_due_for_retention_review:number|null;permission_audit_omitted:boolean;permission_evidence_complete:boolean;permission_attention_required:number|null;users_requiring_permission_review:number|null;api_keys_requiring_permission_review:number|null;evidence_complete:boolean};
type PackageResponse={feature:string;phase:number;step:number;generated_at:string;posture:string;evidence_state:string;evidence_complete:boolean;available_sources:string[];omitted_sources:string[];evidence_access:EvidenceAccess;required_permissions_by_source:Record<string,string[]>;summary:Summary;document_pagination:Pagination;document_evidence_access:DocumentEvidenceAccess;documents:DocumentRow[];governance_controls:{read_only:boolean;application_evidence_only:boolean;does_not_generate_certified_external_compliance_package:boolean;external_reference_presence_does_not_verify_document_content_or_validity:boolean;tenant_export_audit_event_does_not_prove_recipient_delivery_or_external_acceptance:boolean}};

const PAGE_SIZE=50;
function readableError(error:unknown){return error instanceof ApiError||error instanceof Error?error.message:'Unknown error';}
function pretty(value?:string|null){const v=String(value||'').replaceAll('_',' ').trim();return v?v.charAt(0).toUpperCase()+v.slice(1):'Not recorded';}
function dateOnly(value?:string|null){if(!value)return'Not recorded';const d=new Date(value);return Number.isNaN(d.getTime())?'Invalid date':d.toLocaleDateString();}
function metric(value:number|null|undefined){return value===null||value===undefined?'Restricted':value;}
function tone(value:string){if(value.includes('blocked'))return'danger';if(value.includes('partial')||value.includes('review'))return'warn';if(value.includes('ready'))return'good';return'neutral';}
function FlagList({flags}:{flags:string[]}){return flags.length?<div className="platform-compliance-export__flags">{flags.map((flag)=><span key={flag}>{pretty(flag)}</span>)}</div>:<span className="platform-compliance-export__muted">No current application flags</span>;}

export default function PlatformComplianceExportPage(){
  const [searchParams,setSearchParams]=useSearchParams();
  const rawOffset=searchParams.get('document_offset')||'0';
  const parsedOffset=Number(rawOffset);
  const invalidOffset=!Number.isInteger(parsedOffset)||parsedOffset<0||parsedOffset>1000000;
  const documentOffset=invalidOffset?0:parsedOffset;
  const canReadPrivacy=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_READ);
  const canReadTenantExports=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)&&hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT);
  const canReadTenants=hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadAudit=hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadRetention=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ);
  const canReadPermissionAudit=hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const query=useQuery({
    queryKey:['platform','compliance-export','package',documentOffset],
    queryFn:()=>platformApiRequest<PackageResponse>(`/platform/compliance-export/package?document_limit=${PAGE_SIZE}&document_offset=${documentOffset}`),
    enabled:!invalidOffset,
    placeholderData:(previous)=>previous
  });
  const data=query.data;const summary=data?.summary;const pagination=data?.document_pagination;const staleWarning=Boolean(query.isError&&data);const blockingError=Boolean(query.isError&&!data);
  const setOffset=(offset:number)=>{const next=new URLSearchParams(searchParams);if(offset>0)next.set('document_offset',String(offset));else next.delete('document_offset');setSearchParams(next,{replace:true});};

  return <div className="io-operational-page io-workspace-page platform-compliance-export io-workspace-shell">
    <OperationalWorkspaceHero
      iconPath="/platform/compliance-export"
      eyebrow="Compliance governance"
      title="Compliance export"
      description="Inspect the application evidence that would support a compliance package. Protected source families remain permission-scoped, and this page does not generate a certified external compliance package."
      meta={<><OperationalWorkspaceMetaPill>Read-only application snapshot</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{data?.evidence_complete?'Complete evidence':'Permission-scoped evidence'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{data?`Generated ${new Date(data.generated_at).toLocaleString()}`:'Loading snapshot'}</OperationalWorkspaceMetaPill></>}
      actions={<button type="button" className="app-button app-button--secondary" onClick={()=>void query.refetch()} disabled={query.isFetching}>{query.isFetching?'Refreshing…':'Refresh'}</button>}
      aside={<OperationalWorkspaceStatus value={data?pretty(data.posture):'Loading'} label={data?.evidence_complete?'current application posture':'current available evidence posture'} tone={data?tone(data.posture):'neutral'} />}
    />

    {invalidOffset?<div className="platform-compliance-export__blocking"><strong>Invalid document page.</strong><span>The document offset must be a whole number between 0 and 1,000,000.</span><button className="app-button app-button--secondary" type="button" onClick={()=>setOffset(0)}>Reset page</button></div>:null}
    {blockingError?<div className="platform-compliance-export__blocking"><strong>Compliance export evidence could not be loaded.</strong><span>{readableError(query.error)}</span><button className="app-button app-button--secondary" type="button" onClick={()=>void query.refetch()}>Retry</button></div>:null}
    {staleWarning?<div className="platform-compliance-export__stale"><strong>Showing the last successful snapshot.</strong><span>Refresh failed: {readableError(query.error)}</span></div>:null}

    {summary?<OperationalWorkspaceStats ariaLabel="Compliance export overview">
      <OperationalWorkspaceStatCard label="Current documents" value={summary.current_documents} helper={`${summary.historical_documents} archived historical records`} tone="blue" iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Documents needing review" value={summary.documents_requiring_review} helper={`${summary.documents_expiring_soon} expire within 45 days`} tone={summary.documents_requiring_review?'amber':'green'} iconPath="/platform/compliance-documents" />
      <OperationalWorkspaceStatCard label="Open privacy requests" value={metric(summary.open_privacy_requests)} helper={summary.open_privacy_requests===null?'Privacy evidence restricted':`${summary.overdue_privacy_requests||0} overdue`} tone="amber" iconPath="/platform/privacy-requests" />
      <OperationalWorkspaceStatCard label="Tenants missing export evidence" value={metric(summary.tenants_missing_export_evidence)} helper={summary.total_tenants===null?'Tenant export/audit evidence restricted':`${summary.tenants_with_export_evidence}/${summary.total_tenants} with recorded export evidence`} tone="amber" iconPath="/platform/tenant-exports" />
      <OperationalWorkspaceStatCard label="Retention holds" value={metric(summary.tenants_with_retention_holds)} helper={summary.tenants_with_retention_holds===null?'Retention evidence restricted':`${summary.tenants_due_for_retention_review||0} due for review`} tone="red" iconPath="/platform/audit-retention" />
      <OperationalWorkspaceStatCard label="Permission attention" value={metric(summary.permission_attention_required)} helper={summary.permission_attention_required===null?'Permission Audit evidence restricted or partial':`${summary.users_requiring_permission_review||0} users · ${summary.api_keys_requiring_permission_review||0} API keys`} tone="amber" iconPath="/platform/permission-audit" />
    </OperationalWorkspaceStats>:null}

    <section className="io-workspace-panel platform-compliance-export__section">
      <OperationalSectionHeader iconPath="/platform/compliance-export" title="Evidence coverage" description="Only source families authorized by the current Platform permission snapshot are queried. Restricted evidence is not converted to zero." />
      <div className="platform-compliance-export__coverage">
        {(data?.available_sources||['compliance_documents']).map((source)=><span key={source} data-state="available">{pretty(source)} · available</span>)}
        {(data?.omitted_sources||[]).map((source)=><span key={source} data-state="restricted">{pretty(source)} · restricted</span>)}
      </div>
      <div className="platform-compliance-export__truth"><strong>Evidence boundary:</strong> Document registry state, external-reference presence, privacy workflow state, tenant-export audit events, retention settings and permission posture are application evidence only. They do not prove external document validity, recipient delivery, regulatory acceptance, contractual effectiveness or certification.</div>
    </section>

    {summary?<section className="io-workspace-panel platform-compliance-export__section">
      <OperationalSectionHeader iconPath="/platform/compliance-documents" title="Required document coverage" description="Required document coverage is calculated across the full Compliance Documents registry, not only the currently loaded evidence page." />
      <div className="platform-compliance-export__required">
        {summary.required_document_types.map((type)=><span key={type} data-state={summary.missing_required_document_types.includes(type)?'missing':'present'}>{pretty(type)} · {summary.missing_required_document_types.includes(type)?'missing active record':'active record present'}</span>)}
      </div>
      <p className="platform-compliance-export__muted">An active application record and external reference do not verify the content, current validity, signatures or legal effect of the external document.</p>
    </section>:null}

    <section className="io-workspace-panel platform-compliance-export__section">
      <OperationalSectionHeader iconPath="/platform/compliance-export" title="Supporting operations" description="Only destinations the current Platform operator is authorized to open are shown." />
      <div className="platform-compliance-export__links">
        <Link to="/platform/compliance-documents">Compliance docs</Link>
        {canReadPrivacy?<Link to="/platform/privacy-requests">Privacy requests</Link>:null}
        {canReadTenantExports?<Link to="/platform/tenant-exports">Tenant exports</Link>:null}
        {canReadAudit&&canReadTenants?<Link to="/platform/audit-retention">Audit retention</Link>:null}
        {canReadRetention?<Link to="/platform/data-retention">Data retention</Link>:null}
        {canReadPermissionAudit?<Link to="/platform/permission-audit">Permission audit</Link>:null}
        {canReadPermissionAudit?<Link to="/platform/access-reviews">Access reviews</Link>:null}
      </div>
    </section>

    <section className="io-workspace-panel platform-compliance-export__section">
      <OperationalSectionHeader iconPath="/platform/compliance-documents" title="Document package evidence" description="This table is paginated independently from the registry-wide summary. Archived rows are historical and do not block current package posture." />
      <div className="platform-compliance-export__table-wrap"><table><thead><tr><th>Document</th><th>Tenant</th><th>Owner</th><th>Expiration</th><th>Review</th><th>External reference</th><th>Flags</th><th>Source</th></tr></thead><tbody>
        {(data?.documents||[]).map((document)=><tr key={document.id} data-historical={document.historical?'true':'false'}>
          <td><strong>{document.title}</strong><small>{pretty(document.document_type)} · {pretty(document.status)}</small><small>{document.historical?'Historical archived record':document.package_ready?'Recorded checks clear':'Current source review required'}</small></td>
          <td>{data?.document_evidence_access.tenant_identity?(document.tenant_name|| (document.tenant_present?'Tenant name unavailable':'Platform-wide')):(document.tenant_present?'Restricted':'Platform-wide')}</td>
          <td>{data?.document_evidence_access.platform_user_identity?(document.owner_email|| (document.owner_present?'Owner unavailable':'Not assigned')):(document.owner_present?'Restricted':'Not assigned')}</td>
          <td>{dateOnly(document.expires_at)}<small>{document.days_until_expiration===null||document.days_until_expiration===undefined?'No recorded expiry':`${document.days_until_expiration} days`}</small></td>
          <td>{dateOnly(document.reviewed_at)}</td>
          <td>{document.external_reference_present?'Reference recorded':'No reference recorded'}</td>
          <td><FlagList flags={document.risk_flags}/></td>
          <td><Link to="/platform/compliance-documents">Compliance docs</Link>{canReadTenants&&document.tenant_id?<><small><Link to={`/platform/tenants/${document.tenant_id}`}>Tenant source</Link></small></>:null}</td>
        </tr>)}
        {!data?.documents.length?<tr><td colSpan={8} className="platform-compliance-export__empty">No compliance-document rows are available on this evidence page.</td></tr>:null}
      </tbody></table></div>
      {pagination?<div className="platform-compliance-export__pager"><span>Showing {pagination.total?pagination.offset+1:0}–{Math.min(pagination.offset+pagination.limit,pagination.total)} of {pagination.total}</span><div><button className="app-button app-button--secondary" type="button" disabled={pagination.offset===0||query.isFetching} onClick={()=>setOffset(Math.max(0,pagination.offset-PAGE_SIZE))}>Previous</button><button className="app-button app-button--secondary" type="button" disabled={!pagination.has_more||query.isFetching} onClick={()=>setOffset(pagination.offset+PAGE_SIZE)}>Next</button></div></div>:null}
    </section>
  </div>;
}
