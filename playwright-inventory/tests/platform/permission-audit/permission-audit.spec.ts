/** Batch 83 — Platform Permission Audit PPAUD-001..041. SOURCE_REVIEWED_GENERATED_UNRUN.
 * Synthetic transport is not proof of backend enforcement, cross-tenant isolation, live session status or external security state. */
import {test,expect,type Page} from '@playwright/test';
import {openPermissionAudit,auditPermissions,permissionAuditEndpoint,userA,userB,apiKeyA,apiKeyB,manyAuditUsers,manyAuditKeys} from '../../../support/platformPermissionAuditFixture';
const root=(p:Page)=>p.locator('.platform-permission-audit');
const section=(p:Page,name:string)=>root(p).locator('.platform-permission-audit__section').filter({has:p.getByRole('heading',{name,exact:true})});
const coverage=(p:Page)=>section(p,'Evidence coverage');
const userPane=(p:Page)=>section(p,'Platform user permission posture');
const keyPane=(p:Page)=>section(p,'API key permission posture');
const userRows=(p:Page)=>userPane(p).locator('tbody tr');
const keyRows=(p:Page)=>keyPane(p).locator('tbody tr');
const userPager=(p:Page)=>userPane(p).locator('.platform-permission-audit__pager');
const keyPager=(p:Page)=>keyPane(p).locator('.platform-permission-audit__pager');
const findEvidence=(p:Page)=>section(p,'Find evidence');
const without=(...perms:string[])=>auditPermissions.filter(x=>!perms.includes(x));

test.describe('Permission Audit — source-permission boundaries and evidence (BATCH_083_GENERATED_UNRUN)',()=>{
 test('PPAUD-001 Permission Audit renders a separate read-only security governance page',async({page})=>{
  await openPermissionAudit(page);await expect(root(page)).toContainText('Read-only evidence');await expect(coverage(page)).toContainText('Evidence boundary:');
 });
 test('PPAUD-002 Permission Audit has no write or mutation controls',async({page})=>{
  const posts:string[]=[];await openPermissionAudit(page,{onCall:(m,p)=>{if(p===permissionAuditEndpoint&&m!=='GET')posts.push(`${m} ${p}`);}});
  await expect(root(page).getByRole('button',{name:/Create|Delete|Revoke|Disable|Save/})).toHaveCount(0);expect(posts).toHaveLength(0);
 });
 test('PPAUD-003 Page explicitly limits evidence to recorded application posture',async({page})=>{
  await openPermissionAudit(page);await expect(coverage(page)).toContainText('does not prove external access was removed');
  await expect(coverage(page)).toContainText('customer authorization exists');
 });
 test('PPAUD-004 Initial GET uses independently bounded fifty-row lists and zero offsets',async({page})=>{
  const qs:string[]=[];await openPermissionAudit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)qs.push(q.toString());}});
  await expect.poll(()=>qs.length).toBeGreaterThan(0);const q=new URLSearchParams(qs.at(-1));
  expect(q.get('user_limit')).toBe('50');expect(q.get('user_offset')).toBe('0');
  expect(q.get('api_key_limit')).toBe('50');expect(q.get('api_key_offset')).toBe('0');
 });
 test('PPAUD-005 Router requires access-reviews read before page data is fetched',async({page})=>{
  const hits:string[]=[];await openPermissionAudit(page,{permissions:without('platform.access_reviews.read'),expectHeading:false,
   onCall:(m,p)=>{if(p===permissionAuditEndpoint)hits.push(p);}});await expect(root(page)).toHaveCount(0);expect(hits).toHaveLength(0);
 });
 test('PPAUD-006 Page is read-only even if operator has broader platform rights',async({page})=>{
  await openPermissionAudit(page);await expect(section(page,'Find evidence').getByRole('textbox',{name:'Search'})).toBeVisible();
  await expect(root(page).locator('input')).toHaveCount(1);
 });
 test('PPAUD-007 Summary contains separate users, keys, MFA, sessions, and review metrics',async({page})=>{
  await openPermissionAudit(page);const summary=root(page).getByLabel('Permission audit overview');
  for(const label of ['Users requiring review','API keys requiring review','Overdue access reviews','Pending review items','Users without MFA','Active sessions'])
   await expect(summary).toContainText(label);
 });
 test('PPAUD-008 Recorded attention posture is not external verification',async({page})=>{
  await openPermissionAudit(page,{posture:'permission_audit_attention_required'});
  await expect(root(page)).toContainText('Permission audit attention required');await expect(coverage(page)).toContainText('application evidence');
 });
 test('PPAUD-009 Full source-grant snapshot displays Complete evidence',async({page})=>{
  await openPermissionAudit(page);await expect(root(page)).toContainText('Complete evidence');await expect(coverage(page).locator('[data-state="restricted"]')).toHaveCount(0);
 });
 test('PPAUD-010 Partial grant snapshot names omitted sources as restricted',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.sessions.read','platform.api_keys.read')});
  await expect(root(page)).toContainText('Permission-scoped evidence');
  await expect(coverage(page)).toContainText('Platform sessions · restricted');await expect(coverage(page)).toContainText('Api keys · restricted');
 });
 test('PPAUD-011 No platform-user grant shows explicit restriction rather than zero users',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read')});
  await expect(userPane(page)).toContainText('Platform Users evidence is omitted.');
  await expect(root(page).getByLabel('Permission audit overview')).toContainText('Restricted');
  await expect(userPane(page).getByText(userA.email)).toHaveCount(0);
 });
 test('PPAUD-012 No API-key read grant displays restricted evidence and hides names',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.api_keys.read')});
  await expect(keyPane(page)).toContainText('API-key evidence is restricted');await expect(keyPane(page)).not.toContainText(apiKeyA.name);
 });
 test('PPAUD-013 Session permission is independent from platform-user visibility',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.sessions.read')});
  await expect(userPane(page)).toContainText(userA.email);await expect(userRows(page).first()).toContainText('PLATFORM_SESSIONS_READ required');
  await expect(root(page).getByLabel('Permission audit overview')).toContainText('Restricted');
 });
 test('PPAUD-014 Support-session permission is independently redacted',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.support_sessions.read')});
  await expect(userRows(page).first()).toContainText('SUPPORT_SESSION_READ required');await expect(userPane(page)).toContainText(userA.email);
 });
 test('PPAUD-015 Missing role-permissions grant redacts numeric effective permission totals',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.role_permissions.read')});
  await expect(userRows(page).first()).toContainText('Role-permission evidence restricted');
  await expect(userRows(page).first()).not.toContainText('35 total');
 });
 test('PPAUD-016 Tenant read grant independently protects API key tenant identity',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.tenants.read')});
  await expect(keyPane(page)).not.toContainText('Fixture Tenant Alpha');
  await expect(keyRows(page).first()).toContainText('TENANTS_READ required');
 });
 test('PPAUD-017 API key evidence remains visible when platform-user evidence is omitted',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read')});
  await expect(keyPane(page)).toContainText(apiKeyA.name);await expect(userPane(page)).toContainText('omitted');
 });
 test('PPAUD-018 Access-review counts remain application evidence with missing sources',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read','platform.api_keys.read')});
  await expect(root(page).getByLabel('Permission audit overview')).toContainText('Overdue access reviews');
  await expect(coverage(page)).toContainText('Access reviews · available');
 });
 test('PPAUD-019 Coverage lists each source family once, not silent omissions',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.sessions.read','platform.tenants.read')});
  await expect(coverage(page).locator('[data-state="available"]')).toHaveCount(5);
  await expect(coverage(page).locator('[data-state="restricted"]')).toHaveCount(2);
 });
 test('PPAUD-020 Platform-user rows show captured email, role and flags',async({page})=>{
  await openPermissionAudit(page);await expect(userPane(page)).toContainText(userA.email);
  await expect(userRows(page).first()).toContainText('Security');await expect(userRows(page).first()).toContainText('Privileged role');
 });
 test('PPAUD-021 Inactive user is described as inactive, never silently active',async({page})=>{
  await openPermissionAudit(page,{users:[{...userA,is_active:false,risk_flags:['inactive_user']} ]});
  await expect(userRows(page).first()).toContainText('Inactive');await expect(userRows(page).first()).toContainText('Inactive user');
 });
 test('PPAUD-022 MFA flag and current recorded MFA indicator remain distinct',async({page})=>{
  await openPermissionAudit(page);await expect(userRows(page).first()).toContainText('MFA off');
  await expect(userRows(page).first()).toContainText('Mfa missing');
 });
 test('PPAUD-023 API key posture shows missing expiration and allowlist flags',async({page})=>{
  await openPermissionAudit(page);await expect(keyRows(page).first()).toContainText('No expiration');
  await expect(keyRows(page).first()).toContainText('No ip allowlist');
 });
 test('PPAUD-024 Key without flags displays recorded no-risk evidence label only',async({page})=>{
  await openPermissionAudit(page);const row=keyRows(page).filter({hasText:apiKeyB.name});
  await expect(row).toContainText('No recorded flags');await expect(row).toContainText('No current application flags');
 });
 test('PPAUD-025 Tenant-visible API key shows tenant identity only with both grants',async({page})=>{
  await openPermissionAudit(page);await expect(keyRows(page).first()).toContainText('Fixture Tenant Alpha');
  await expect(keyRows(page).first()).toContainText('Tenant identity evidence');
 });
 test('PPAUD-026 Never used or no-expiration key displays explicit lifecycle evidence',async({page})=>{
  await openPermissionAudit(page);await expect(keyRows(page).first()).toContainText('Expires: Never');
  await expect(keyRows(page).first()).toContainText('Last used: Never');
 });
});

test.describe('Permission Audit — filters, dual pagination, failures and links (BATCH_083_GENERATED_UNRUN)',()=>{
 test('PPAUD-027 Search control mirrors URL filter and finds user evidence',async({page})=>{
  await openPermissionAudit(page);await findEvidence(page).getByLabel('Search').fill('security-owner');
  await expect(userPane(page)).toContainText(userA.email);await expect(userPane(page)).not.toContainText(userB.email);
  expect(new URL(page.url()).searchParams.get('search')).toBe('security-owner');
 });
 test('PPAUD-028 Search is trimmed by query construction before GET',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await findEvidence(page).getByLabel('Search').fill('  security-owner  ');
  await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('search')).toBe('security-owner');
 });
 test('PPAUD-029 No matching filtered user/key evidence uses separate empty messages',async({page})=>{
  await openPermissionAudit(page);await findEvidence(page).getByLabel('Search').fill('not-present-823');
  await expect(userPane(page)).toContainText('No Platform users match the current filter');
  await expect(keyPane(page)).toContainText('No active API keys match the current filter');
 });
 test('PPAUD-030 Clear search removes URL key and restores current summary',async({page})=>{
  await openPermissionAudit(page,{query:'search=not-present-823'});await findEvidence(page).getByRole('button',{name:'Clear'}).click();
  expect(new URL(page.url()).searchParams.get('search')).toBeNull();await expect(userPane(page)).toContainText(userA.email);
 });
 test('PPAUD-031 Oversized URL search disables backend evidence call and displays validation',async({page})=>{
  const calls:string[]=[];await openPermissionAudit(page,{query:'search='+encodeURIComponent('q'.repeat(201)),
   onCall:(m,p)=>{if(m==='GET'&&p===permissionAuditEndpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid search filter.');expect(calls).toHaveLength(0);
 });
 test('PPAUD-032 Clearing oversized invalid filter resumes normal evidence retrieval',async({page})=>{
  const calls:string[]=[];await openPermissionAudit(page,{query:'search='+encodeURIComponent('q'.repeat(201)),
   onCall:(m,p)=>{if(m==='GET'&&p===permissionAuditEndpoint)calls.push(p);}});
  await root(page).getByRole('button',{name:'Clear filter'}).click();await expect.poll(()=>calls.length).toBeGreaterThan(0);
  await expect(userPane(page)).toContainText(userA.email);
 });
 test('PPAUD-033 Search textbox enforces max length 200',async({page})=>{
  await openPermissionAudit(page);await expect(findEvidence(page).getByLabel('Search')).toHaveAttribute('maxlength','200');
 });
 test('PPAUD-034 User Next advances only user_offset by 50',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{users:manyAuditUsers(63),onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('user_offset')).toBe('50');
  expect(new URLSearchParams(queries.at(-1)).get('api_key_offset')).toBe('0');
 });
 test('PPAUD-035 User Previous returns user_offset to zero',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{users:manyAuditUsers(65),onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–65');
  await userPager(page).getByRole('button',{name:'Previous'}).click();await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('user_offset')).toBe('0');
 });
 test('PPAUD-036 API key Next advances api_key_offset while preserving user_offset',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{keys:manyAuditKeys(61),onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('api_key_offset')).toBe('50');
  expect(new URLSearchParams(queries.at(-1)).get('user_offset')).toBe('0');
 });
 test('PPAUD-037 API key Previous returns api_key_offset to zero',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{keys:manyAuditKeys(61),onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect(keyPager(page)).toContainText('51–61');
  await keyPager(page).getByRole('button',{name:'Previous'}).click();await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('api_key_offset')).toBe('0');
 });
 test('PPAUD-038 Two pagers operate independently within one GET contract',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{users:manyAuditUsers(61),keys:manyAuditKeys(62),
   onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–61');
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect.poll(()=>new URLSearchParams(queries.at(-1)).get('api_key_offset')).toBe('50');
  expect(new URLSearchParams(queries.at(-1)).get('user_offset')).toBe('50');
 });
 test('PPAUD-039 Search resets both pagination offsets to zero',async({page})=>{
  const queries:string[]=[];await openPermissionAudit(page,{users:manyAuditUsers(65),keys:manyAuditKeys(65),
   onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)queries.push(q.toString());}});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–65');
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect(keyPager(page)).toContainText('51–65');
  await findEvidence(page).getByLabel('Search').fill('fixture');
  await expect.poll(()=>{const q=new URLSearchParams(queries.at(-1));return `${q.get('user_offset')}:${q.get('api_key_offset')}`;}).toBe('0:0');
 });
 test('PPAUD-040 Initial GET failure shows blocking Retry and never a healthy zero-state',async({page})=>{
  await openPermissionAudit(page,{response:{status:503,json:{message:'Synthetic audit unavailable'}}});
  await expect(root(page)).toContainText('Permission audit could not be loaded.');
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();await expect(root(page).getByLabel('Permission audit overview')).toHaveCount(0);
 });
 test('PPAUD-041 Supporting-operation links are permission scoped, while Access reviews remains visible',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read','platform.sessions.read','platform.audit.read','platform.api_keys.read')});
  const links=section(page,'Supporting operations');await expect(links.getByRole('link',{name:'Access reviews'})).toBeVisible();
  for(const name of ['Platform users','Platform sessions','API keys','Platform audit'])await expect(links.getByRole('link',{name,exact:true})).toHaveCount(0);
 });

 // Batch 84 continuation — source-backed UI claims, not executable backend assurances.
 test('PPAUD-042 Retry can recover from a transient initial evidence failure',async({page})=>{
  let n=0,recoveryAllowed=false;await openPermissionAudit(page,{respond:(m,p)=>{
   if(m==='GET'&&p===permissionAuditEndpoint){n++;if(!recoveryAllowed)return{status:503,json:{message:'Temporary outage'}};}
  }});
  await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();recoveryAllowed=true;
  await root(page).getByRole('button',{name:'Retry'}).click();await expect(userRows(page)).toHaveCount(2);expect(n).toBeGreaterThanOrEqual(2);
 });
 test('PPAUD-043 Failed manual refresh retains explicitly marked prior snapshot',async({page})=>{
  let n=0;await openPermissionAudit(page,{respond:(m,p)=>{if(m==='GET'&&p===permissionAuditEndpoint&&++n>1)return{status:503,json:{message:'Synthetic refresh failure'}};}});
  await expect(userRows(page)).toHaveCount(2);await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page)).toContainText('Showing the last successful snapshot.');await expect(userRows(page)).toHaveCount(2);
 });
 test('PPAUD-044 Refresh requests the combined user and key evidence contract',async({page})=>{
  const q:string[]=[];await openPermissionAudit(page,{onCall:(m,p,x)=>{if(m==='GET'&&p===permissionAuditEndpoint)q.push(x.toString());}});
  await expect(userRows(page)).toHaveCount(2);await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>q.length).toBeGreaterThanOrEqual(2);const last=new URLSearchParams(q.at(-1));
  expect(last.get('user_limit')).toBe('50');expect(last.get('api_key_limit')).toBe('50');
 });
 test('PPAUD-045 Restricted operator still sees missing-family evidence after refresh',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read','platform.api_keys.read')});
  await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(coverage(page)).toContainText('Platform users · restricted');await expect(coverage(page)).toContainText('Api keys · restricted');
 });
 test('PPAUD-046 HTTP 429 on initial evidence load is an actionable failure',async({page})=>{
  await openPermissionAudit(page,{response:{status:429,json:{message:'Rate limited'}}});
  await expect(root(page)).toContainText('Permission audit could not be loaded.');await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PPAUD-047 HTTP 401 does not create a clean evidence summary',async({page})=>{
  await openPermissionAudit(page,{response:{status:401,json:{message:'Unauthorized'}}});
  await expect(root(page).getByLabel('Permission audit overview')).toHaveCount(0);
 });
 test('PPAUD-048 Transport failure is not presented as complete evidence',async({page})=>{
  await openPermissionAudit(page,{response:{status:503,json:{message:'Upstream unavailable'}}});
  await expect(root(page)).not.toContainText('Complete evidence');await expect(root(page).getByRole('button',{name:'Retry'})).toBeVisible();
 });
 test('PPAUD-049 Malformed evidence must not masquerade as a healthy audit',async({page})=>{
  test.skip(true,'Needs source change: page dereferences malformed response fields without runtime schema validation; Phase 2 negative-contract verification');
  await openPermissionAudit(page,{response:{json:{feature:'permission_audit_hardening',evidence_complete:true}}});
  await expect(root(page)).not.toContainText('Complete evidence');
 });
 test('PPAUD-050 Authorized empty source shows zero filtered counts',async({page})=>{
  await openPermissionAudit(page,{users:[],keys:[]});await expect(userPane(page)).toContainText('No Platform users match');
  await expect(keyPane(page)).toContainText('No active API keys match');await expect(userPager(page)).toContainText('0 of 0');
 });
 test('PPAUD-051 Missing source grants prevent protected supporting action links',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read','platform.api_keys.read','platform.sessions.read')});
  const links=section(page,'Supporting operations');for(const n of ['Platform users','API keys','Platform sessions'])
   await expect(links.getByRole('link',{name:n,exact:true})).toHaveCount(0);
 });
 test('PPAUD-052 Privileged-role fixture classifications are rendered, not recomputed in UI',async({page})=>{
  await openPermissionAudit(page,{users:[{...userA,role:'security',risk_flags:['privileged_role']}]});
  await expect(userRows(page).first()).toContainText('Privileged role');await expect(userRows(page).first()).toContainText('Security');
 });
 test('PPAUD-053 Session-sprawl flag is only evidential with session access',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.sessions.read'),users:[{...userA,risk_flags:['privileged_role']}]});
  await expect(userRows(page).first()).toContainText('Restricted');await expect(userRows(page).first()).not.toContainText('Session sprawl');
 });
 test('PPAUD-054 Historical stale-login classification remains a recorded flag',async({page})=>{
  await openPermissionAudit(page,{users:[{...userA,risk_flags:['stale_last_login']}]});
  await expect(userRows(page).first()).toContainText('Stale last login');await expect(coverage(page)).toContainText('application evidence');
 });
 test('PPAUD-055 Locked account flag is posture evidence and offers no unlock action',async({page})=>{
  await openPermissionAudit(page,{users:[{...userA,risk_flags:['locked_account']}]});
  await expect(userRows(page).first()).toContainText('Locked account');await expect(root(page).getByRole('button',{name:/Unlock/i})).toHaveCount(0);
 });
 test('PPAUD-056 Failed-login flag is hidden when user source itself is omitted',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read'),users:[{...userA,risk_flags:['failed_login_pressure']}]});
  await expect(userPane(page)).toContainText('evidence is omitted');await expect(userPane(page)).not.toContainText('Failed login pressure');
 });
 test('PPAUD-057 Review count is explicitly framed as internal access-review evidence',async({page})=>{
  await openPermissionAudit(page,{summaryOverride:{open_access_reviews:9,overdue_access_reviews:4,pending_access_review_items:6}});
  const overview=root(page).getByLabel('Permission audit overview');await expect(overview).toContainText('4');await expect(overview).toContainText('9 open reviews');
 });
 test('PPAUD-058 Recorded API key expiry posture displays server-classified flags',async({page})=>{
  await openPermissionAudit(page,{keys:[{...apiKeyA,risk_flags:['no_expiration']}]});
  await expect(keyRows(page).first()).toContainText('No expiration');await expect(keyRows(page).first()).toContainText('Expires: Never');
 });
 test('PPAUD-059 Never-used label does not assert an external compromise conclusion',async({page})=>{
  await openPermissionAudit(page,{keys:[apiKeyA]});await expect(keyRows(page).first()).toContainText('Last used: Never');
  await expect(coverage(page)).toContainText('external security controls');
 });
 test('PPAUD-060 Scope count is shown separately from classified API-key risk flags',async({page})=>{
  await openPermissionAudit(page,{keys:[{...apiKeyB,scope_count:24,risk_flags:[]}]});
  await expect(keyRows(page).first()).toContainText('24 scopes');await expect(keyRows(page).first()).toContainText('No recorded flags');
 });
 test('PPAUD-061 Restricted tenant identity cannot contribute tenant-name search match',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.tenants.read'),query:'search=Fixture%20Tenant%20Alpha'});
  await expect(keyPane(page)).toContainText('No active API keys match');
 });
 test('PPAUD-062 API key rows remain absent despite available user grant',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.api_keys.read')});await expect(userRows(page)).toHaveCount(2);
  await expect(keyPane(page)).toContainText('API-key evidence is restricted');await expect(keyRows(page)).toHaveCount(0);
 });
 test('PPAUD-063 API key source-search is case-insensitive for key names',async({page})=>{
  await openPermissionAudit(page,{query:'search=FIXTURE%20SCOPED%20API%20KEY'});
  await expect(keyRows(page)).toHaveCount(1);await expect(keyRows(page).first()).toContainText(apiKeyB.name);
 });
 test('PPAUD-064 Invalid URL search remains visible as a blocking source filter',async({page})=>{
  const calls:string[]=[];await openPermissionAudit(page,{query:'search='+encodeURIComponent('x'.repeat(201)),onCall:(m,p)=>{if(m==='GET'&&p===permissionAuditEndpoint)calls.push(p);}});
  await expect(root(page)).toContainText('Invalid search filter.');expect(calls).toHaveLength(0);
 });
 test('PPAUD-065 Clearing invalid URL search resumes evidence fetching',async({page})=>{
  const calls:string[]=[];await openPermissionAudit(page,{query:'search='+encodeURIComponent('x'.repeat(201)),onCall:(m,p)=>{if(m==='GET'&&p===permissionAuditEndpoint)calls.push(p);}});
  await root(page).getByRole('button',{name:'Clear filter'}).click();await expect.poll(()=>calls.length).toBeGreaterThan(0);
 });
 test('PPAUD-066 Editing evidence search preserves other nonsearch URL parameters',async({page})=>{
  await openPermissionAudit(page,{query:'tracking=fixture'});await findEvidence(page).getByLabel('Search').fill('security');
  await expect(page).toHaveURL(/tracking=fixture/);await expect(page).toHaveURL(/search=security/);
 });
 test('PPAUD-067 Whitespace search is omitted from the backend query',async({page})=>{
  const qs:string[]=[];await openPermissionAudit(page,{query:'search=%20%20%20',onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)qs.push(q.toString());}});
  await expect.poll(()=>qs.length).toBeGreaterThan(0);expect(new URLSearchParams(qs.at(-1)).has('search')).toBe(false);
 });
 test('PPAUD-068 User pagination reaches last partial filtered page',async({page})=>{
  await openPermissionAudit(page,{users:manyAuditUsers(53)});await userPager(page).getByRole('button',{name:'Next'}).click();
  await expect(userRows(page)).toHaveCount(3);await expect(userPager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PPAUD-069 API key pagination stops after last partial filtered page',async({page})=>{
  await openPermissionAudit(page,{keys:manyAuditKeys(52)});await keyPager(page).getByRole('button',{name:'Next'}).click();
  await expect(keyRows(page)).toHaveCount(2);await expect(keyPager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PPAUD-070 Changing the API-key page does not reset the selected user offset',async({page})=>{
  await openPermissionAudit(page,{users:manyAuditUsers(53),keys:manyAuditKeys(52)});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–53');
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–53');
 });
 test('PPAUD-071 Filtered totals cover all matching rows rather than just one page',async({page})=>{
  await openPermissionAudit(page,{users:manyAuditUsers(67)});await expect(userRows(page)).toHaveCount(50);
  await expect(userPager(page)).toContainText('of 67');await expect(root(page).getByLabel('Permission audit overview')).toContainText('67 filtered users');
 });
 test('PPAUD-072 No recorded flags does not imply all external risks are absent',async({page})=>{
  await openPermissionAudit(page,{users:[userB],keys:[apiKeyB]});await expect(userRows(page)).toContainText('No recorded flags');
  await expect(coverage(page)).toContainText('does not prove external access was removed');
 });
 test('PPAUD-073 Empty authorized users and omitted keys have distinct states',async({page})=>{
  await openPermissionAudit(page,{users:[],permissions:without('platform.api_keys.read')});
  await expect(userPane(page)).toContainText('No Platform users match');await expect(keyPane(page)).toContainText('evidence is restricted');
 });
 test('PPAUD-074 Restricted numeric summary is rendered as Restricted not zero',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.sessions.read','platform.users.read')});
  await expect(root(page).getByLabel('Permission audit overview')).toContainText('Restricted');
 });
 test('PPAUD-075 Permission-scoped operations use their corresponding original routes',async({page})=>{
  await openPermissionAudit(page);const links=section(page,'Supporting operations');
  for(const [name,path] of [['Access reviews','/platform/access-reviews'],['Platform users','/platform/users'],['API keys','/platform/api-keys'],['Platform audit','/platform/audit']])
   await expect(links.getByRole('link',{name,exact:true})).toHaveAttribute('href',path);
 });
 test('PPAUD-076 A later search result supersedes an earlier evidence query',async({page})=>{
  await openPermissionAudit(page);await findEvidence(page).getByLabel('Search').fill('auditor');
  await expect(userRows(page)).toHaveCount(1);await findEvidence(page).getByLabel('Search').fill('security-owner');
  await expect(userRows(page)).toHaveCount(1);await expect(userRows(page).first()).toContainText(userA.email);
 });
 test('PPAUD-077 Joi integer and offset bounds need independent backend-only acceptance',async({page})=>{
  test.skip(true,'Phase 2: direct authenticated HTTP/Joi matrix is not browser-transport UI coverage');
  await openPermissionAudit(page);await expect(root(page)).toBeVisible();
 });
 test('PPAUD-078 Audit page emits no mutation methods to the audit endpoint',async({page})=>{
  const methods:string[]=[];await openPermissionAudit(page,{onCall:(m,p)=>{if(p===permissionAuditEndpoint)methods.push(m);}});
  await findEvidence(page).getByLabel('Search').fill('security');await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect.poll(()=>methods.length).toBeGreaterThan(1);expect(methods.every(x=>x==='GET')).toBe(true);
 });
 test('PPAUD-079 Genuine platform enforcement and cross-tenant isolation remain Phase 2',async({page})=>{
  test.skip(true,'Phase 2 requires real backend, separate platform principals and isolated tenant data; JWT mock is insufficient');
  await openPermissionAudit(page);await expect(coverage(page)).toBeVisible();
 });
 test('PPAUD-080 Persistence and external security outcomes require Phase 2 system verification',async({page})=>{
  test.skip(true,'Phase 2 requires PostgreSQL/audit log inspection and authorized external security integration');
  await openPermissionAudit(page);await expect(coverage(page)).toBeVisible();
 });

 // Batch 149 — isolated browser-only pagination, source-boundary and inert rendering checks.
 test('PPAUD-081 Returning the user pane to its first page does not disturb API-key offset',async({page})=>{
  const q:string[]=[];await openPermissionAudit(page,{users:manyAuditUsers(60),keys:manyAuditKeys(60),onCall:(m,p,s)=>{if(m==='GET'&&p===permissionAuditEndpoint)q.push(s.toString());}});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–60');
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect(keyPager(page)).toContainText('51–60');
  await userPager(page).getByRole('button',{name:'Previous'}).click();await expect(userPager(page)).toContainText('1–50');
  await expect.poll(()=>{const s=new URLSearchParams(q.at(-1));return `${s.get('user_offset')}:${s.get('api_key_offset')}`;}).toBe('0:50');
 });
 test('PPAUD-082 Clear search removes only search and retains unrelated harmless URL keys',async({page})=>{
  await openPermissionAudit(page,{query:'trace=keep-me&search=auditor'});
  await expect(userRows(page)).toHaveCount(1);await findEvidence(page).getByRole('button',{name:'Clear',exact:true}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.get('search')).toBe(null);
  expect(new URL(page.url()).searchParams.get('trace')).toBe('keep-me');
  await expect(userRows(page)).toHaveCount(2);
 });
 test('PPAUD-083 HTML-shaped user names remain inert text in evidence rows',async({page})=>{
  const hostile='<img src=x onerror=alert(1)>';await openPermissionAudit(page,{users:[{...userA,name:hostile}]});
  await expect(userRows(page).first()).toContainText(hostile);
  await expect(userRows(page).first().locator('img,script,iframe')).toHaveCount(0);
 });
 test('PPAUD-084 HTML-shaped API-key names are shown literally rather than as markup',async({page})=>{
  const hostile='<svg onload=alert(1)>';await openPermissionAudit(page,{keys:[{...apiKeyA,name:hostile}]});
  await expect(keyRows(page).first()).toContainText(hostile);
  await expect(keyRows(page).first().locator('svg,script,iframe')).toHaveCount(0);
 });
 test('PPAUD-085 Manual Refresh keeps both independent second-page offsets',async({page})=>{
  const q:string[]=[];await openPermissionAudit(page,{users:manyAuditUsers(59),keys:manyAuditKeys(61),onCall:(m,p,s)=>{if(m==='GET'&&p===permissionAuditEndpoint)q.push(s.toString());}});
  await userPager(page).getByRole('button',{name:'Next'}).click();await expect(userPager(page)).toContainText('51–59');
  await keyPager(page).getByRole('button',{name:'Next'}).click();await expect(keyPager(page)).toContainText('51–61');
  const before=q.length;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>q.length).toBeGreaterThan(before);
  const last=new URLSearchParams(q.at(-1));expect(last.get('user_offset')).toBe('50');expect(last.get('api_key_offset')).toBe('50');
 });
 test('PPAUD-086 A source-filtered match does not imply a second source has matching keys',async({page})=>{
  await openPermissionAudit(page,{query:'search=auditor'});
  await expect(userRows(page)).toHaveCount(1);await expect(userRows(page).first()).toContainText(userB.email);
  await expect(keyRows(page)).toHaveCount(0);await expect(keyPane(page)).toContainText('No active API keys match');
  await expect(userPager(page)).toContainText('1–1 of 1');await expect(keyPager(page)).toContainText('0–0 of 0');
 });
 test('PPAUD-087 Rendered risk flags cannot inject HTML elements into the security table',async({page})=>{
  const flagged='<script>alert(1)</script>';await openPermissionAudit(page,{users:[{...userA,risk_flags:[flagged]}]});
  await expect(userRows(page).first()).toContainText(flagged);await expect(userRows(page).first().locator('script')).toHaveCount(0);
 });

});

// Batch 150 — API does not trust URL-supplied pager state; independent authorized lists.
 test('PPAUD-088 Forged pager URL keys cannot override locally bounded initial offsets',async({page})=>{
  const calls:string[]=[];await openPermissionAudit(page,{query:'user_offset=99999&api_key_offset=99999',onCall:(m,p,q)=>{if(m==='GET'&&p===permissionAuditEndpoint)calls.push(q.toString());}});
  await expect.poll(()=>calls.length).toBeGreaterThan(0);
  const q=new URLSearchParams(calls[0]);expect(q.get('user_offset')).toBe('0');expect(q.get('api_key_offset')).toBe('0');
 });
 test('PPAUD-089 User pagination remains available when authorized API-key evidence is empty',async({page})=>{
  await openPermissionAudit(page,{users:manyAuditUsers(51),keys:[]});
  await expect(userPager(page).getByRole('button',{name:'Next'})).toBeEnabled();
  await expect(keyPager(page).getByRole('button',{name:'Next'})).toBeDisabled();
 });
 test('PPAUD-090 API-key pagination remains available when authorized user evidence is empty',async({page})=>{
  await openPermissionAudit(page,{users:[],keys:manyAuditKeys(51)});
  await expect(userPager(page).getByRole('button',{name:'Next'})).toBeDisabled();
  await expect(keyPager(page).getByRole('button',{name:'Next'})).toBeEnabled();
 });
 test('PPAUD-091 Oversized search and forged offsets do not cause a permission audit GET',async({page})=>{
  let calls=0;await openPermissionAudit(page,{query:`search=${'x'.repeat(201)}&user_offset=50&api_key_offset=50`,onCall:(m,p)=>{if(m==='GET'&&p===permissionAuditEndpoint)calls++;}});
  await expect(root(page)).toContainText('Invalid search filter.');expect(calls).toBe(0);
 });
 test('PPAUD-092 Rate limited manual refresh preserves the previous snapshot with explicit warning',async({page})=>{
  let fail=false;await openPermissionAudit(page,{respond:(m,p)=>m==='GET'&&p===permissionAuditEndpoint&&fail?{status:429,json:{message:'Synthetic rate limited'}}:undefined});
  await expect(userRows(page).first()).toContainText(userA.email);
  fail=true;await root(page).getByRole('button',{name:'Refresh'}).click();
  await expect(root(page).locator('.platform-permission-audit__stale')).toContainText('Showing the last successful snapshot.');
  await expect(userRows(page).first()).toContainText(userA.email);
 });

// Batch 164 — additional original-source-backed Platform Permission Audit browser contracts.
// Synthetic interception validates only the rendered permission-scoped UI, never live authorization or SQL.
test.describe('Permission Audit — permission-specific links and evidence boundaries (BATCH_164_GENERATED_UNRUN)',()=>{
 test('PPAUD-093 Support-session source restriction independently removes its supporting link',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.support_sessions.read')});
  const links=section(page,'Supporting operations');
  await expect(links.getByRole('link',{name:'Support sessions',exact:true})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Platform sessions',exact:true})).toBeVisible();
  await expect(coverage(page)).toContainText('Support sessions · restricted');
 });
 test('PPAUD-094 Role-permissions source restriction hides its link without hiding user identities',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.role_permissions.read')});
  await expect(section(page,'Supporting operations').getByRole('link',{name:'Role permissions'})).toHaveCount(0);
  await expect(userRows(page).first()).toContainText(userA.email);
  await expect(userRows(page).first()).toContainText('Role-permission evidence restricted');
 });
 test('PPAUD-095 Tenant identity grant independently gates the Tenants navigation link',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.tenants.read')});
  await expect(section(page,'Supporting operations').getByRole('link',{name:'Tenants'})).toHaveCount(0);
  await expect(keyRows(page).first()).toContainText('TENANTS_READ required');
  await expect(section(page,'Supporting operations').getByRole('link',{name:'API keys'})).toBeVisible();
 });
 test('PPAUD-096 Security supporting link alone is omitted without its separate grant',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.security.read')});
  const links=section(page,'Supporting operations');
  await expect(links.getByRole('link',{name:'My Security'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Platform audit'})).toBeVisible();
 });
 test('PPAUD-097 Omitted API-key source removes its table and pager, not just row values',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.api_keys.read')});
  await expect(keyPane(page).locator('table')).toHaveCount(0);
  await expect(keyPager(page)).toHaveCount(0);
  await expect(keyPane(page)).toContainText('Its absence is not counted as zero');
 });
 test('PPAUD-098 Omitted Platform-user source removes its table and pager independently',async({page})=>{
  await openPermissionAudit(page,{permissions:without('platform.users.read')});
  await expect(userPane(page).locator('table')).toHaveCount(0);
  await expect(userPager(page)).toHaveCount(0);
  await expect(keyRows(page)).toHaveCount(2);
 });
 test('PPAUD-099 Invalid API-key lifecycle timestamps are labelled Not recorded',async({page})=>{
  await openPermissionAudit(page,{keys:[{...apiKeyA,expires_at:'invalid-date',last_used_at:'invalid-date'}]});
  await expect(keyRows(page).first()).toContainText('Expires: Not recorded');
  await expect(keyRows(page).first()).toContainText('Last used: Not recorded');
 });
 test('PPAUD-100 Missing recorded user name receives explicit fallback without changing email',async({page})=>{
  await openPermissionAudit(page,{users:[{...userA,name:null}]});
  await expect(userRows(page).first()).toContainText(userA.email);
  await expect(userRows(page).first()).toContainText('No name recorded');
 });
 test('PPAUD-101 Authorized key with no tenant name uses the Platform/global fallback',async({page})=>{
  await openPermissionAudit(page,{keys:[{...apiKeyA,tenant_name:null,tenant_identity_available:true}]});
  await expect(keyRows(page).first()).toContainText('Platform/global');
  await expect(keyRows(page).first()).toContainText('Tenant identity evidence');
 });
 test('PPAUD-102 Exactly 200 search characters are permitted and forwarded to evidence GET',async({page})=>{
  const seen:string[]=[];await openPermissionAudit(page,{onCall:(m,p,q)=>{
   if(m==='GET'&&p===permissionAuditEndpoint)seen.push(q.get('search')||'');
  }});
  const term='x'.repeat(200);await findEvidence(page).getByLabel('Search').fill(term);
  await expect.poll(()=>seen.includes(term)).toBe(true);
  await expect(root(page)).not.toContainText('Invalid search filter.');
 });
 test('PPAUD-103 Forged URL page-size parameters cannot change the local fifty-row GET contract',async({page})=>{
  const seen:URLSearchParams[]=[];await openPermissionAudit(page,{
   query:'user_limit=1&api_key_limit=1000',onCall:(m,p,q)=>{
    if(m==='GET'&&p===permissionAuditEndpoint)seen.push(new URLSearchParams(q));
   }
  });
  await expect.poll(()=>seen.length).toBeGreaterThan(0);
  expect(seen[0].get('user_limit')).toBe('50');expect(seen[0].get('api_key_limit')).toBe('50');
 });
 test('PPAUD-104 Non-ASCII search text stays intact as a URLSearchParams value',async({page})=>{
  const seen:string[]=[];await openPermissionAudit(page,{onCall:(m,p,q)=>{
   if(m==='GET'&&p===permissionAuditEndpoint)seen.push(q.get('search')||'');
  }});
  await findEvidence(page).getByLabel('Search').fill('član & ključ');
  await expect.poll(()=>seen.includes('član & ključ')).toBe(true);
 });
});
