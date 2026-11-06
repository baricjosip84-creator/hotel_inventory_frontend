/** Batch 113 — Platform Backup Restore Validation: SOURCE-GROUNDED UI assertions only.
 * Synthetic evidence NEVER establishes a real database restore, backup provider, recovery-point objective,
 * restore-point objective, restore drill, SQL isolation, or disaster-recovery certification. */
import {test,expect,type Page} from '@playwright/test';
import {openRecovery,BACKUP_RESTORE_PATH,BACKUP_RESTORE_PERMISSIONS,backupAlpha,backupBeta,backupGamma,
 makeRecoverySnapshot} from '../../../support/platformBackupRestoreValidationFixture';
const root=(p:Page)=>p.locator('.platform-backup-restore');
const cards=(p:Page)=>root(p).locator('.platform-backup-restore__tenant-card');
const stats=(p:Page)=>root(p).getByLabel('Backup restore validation key metrics');
const first=(p:Page)=>cards(p).first();

test.describe('Platform Backup Restore Validation — read-only recovery evidence UI',()=>{
 test('PBRV-001 Header labels the distinct Backup Restore Validation board',async({page})=>{
  await openRecovery(page);await expect(root(page)).toContainText('Read-only technical recovery precheck');
 });
 test('PBRV-002 Operator notice explicitly excludes production database backups',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__operator-notice')).toContainText('does not execute production database backups');
 });
 test('PBRV-003 Operator notice explicitly excludes restore completion evidence',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__operator-notice')).toContainText('persist restore-drill completion');
 });
 test('PBRV-004 Program identifies source-defined Step 213',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__program-panel')).toContainText('Step 213 — Backup Restore Validation Board');
 });
 test('PBRV-005 Unscoped initial GET omits tenant_id',async({page})=>{
  const queries:string[]=[];await openRecovery(page,{onCall:(method,path,q)=>{if(method==='GET'&&path===BACKUP_RESTORE_PATH)queries.push(q.toString());}});
  await expect(page.getByLabel('Tenant filter')).toHaveValue('');expect(queries[0]).toBe('');
 });
 test('PBRV-006 Tenant selector loads directory options and All tenants',async({page})=>{
  await openRecovery(page);await expect(page.getByLabel('Tenant filter').locator('option')).toHaveCount(4);
  await expect(page.getByLabel('Tenant filter')).toContainText('Backup Gamma');
 });
 test('PBRV-007 Six independent recovery readiness KPI cards are shown',async({page})=>{
  await openRecovery(page);await expect(stats(page).locator('.io-workspace-stat')).toHaveCount(6);
 });
 test('PBRV-008 Header KPI distinguishes ready scopes from reviewed scopes',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__hero-aside')).toContainText('1/3');
  await expect(stats(page)).toContainText('Tenant scopes ready');
 });
 test('PBRV-009 Blocked and review KPI counters remain separate',async({page})=>{
  await openRecovery(page);await expect(stats(page)).toContainText('Tenant scopes blocked');
  await expect(stats(page)).toContainText('Tenant review required');
 });
 test('PBRV-010 Platform blocker and restore drill review counters remain separate',async({page})=>{
  await openRecovery(page);await expect(stats(page)).toContainText('Platform blockers');
  await expect(stats(page)).toContainText('Platform review required');
 });
 test('PBRV-011 Detailed recovery summary includes thirteen source-defined metrics',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__summary-item')).toHaveCount(13);
 });
 test('PBRV-012 Summary distinguishes tenant core data and export evidence',async({page})=>{
  await openRecovery(page);const panel=root(page).locator('.platform-backup-restore__summary-panel');
  for(const value of ['Tenants with core data','Tenants without core data','Export evidence present','Export evidence missing'])await expect(panel).toContainText(value);
 });
 test('PBRV-013 Policy configured and total fields appear separately',async({page})=>{
  await openRecovery(page);const panel=root(page).locator('.platform-backup-restore__summary-panel');
  await expect(panel).toContainText('Backup policy fields configured');await expect(panel).toContainText('Backup policy fields total');
 });
 test('PBRV-014 Platform evidence fields do not expose storage target configuration value',async({page})=>{
  await openRecovery(page);const panel=root(page).locator('.platform-backup-restore__evidence-section');
  await expect(panel).toContainText('Platform recovery evidence');
  await expect(panel).toContainText('Configuration values themselves are not exposed.');
 });
 test('PBRV-015 Platform missing backup policy field names are rendered without fabricated secrets',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__evidence-section')).toContainText('BACKUP_STORAGE_TARGET');
 });
 test('PBRV-016 Boolean platform evidence uses Yes and No labels',async({page})=>{
  await openRecovery(page);const panel=root(page).locator('.platform-backup-restore__evidence-section');
  await expect(panel).toContainText('Yes');await expect(panel).toContainText('No');
 });
 test('PBRV-017 Platform control catalogue contains exactly six technical recovery controls',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__control-card')).toHaveCount(6);
 });
 test('PBRV-018 Combined source catalogue identifies six platform and two tenant controls',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__program-grid')).toContainText('8');
  await expect(first(page).locator('.platform-backup-restore__tenant-control')).toHaveCount(2);
 });
 test('PBRV-019 Runbook controls identify backup restore and rollback independently',async({page})=>{
  await openRecovery(page);const grid=root(page).locator('.platform-backup-restore__control-grid');
  await expect(grid).toContainText('Backup/restore runbook present');
  await expect(grid).toContainText('Rollback/recovery runbook present');
 });
 test('PBRV-020 Missing backup policy shows configuration blocker badge',async({page})=>{
  await openRecovery(page);const card=root(page).locator('.platform-backup-restore__control-card').filter({hasText:'Backup policy configuration present'});
  await expect(card).toContainText('Backup policy configuration missing');
 });
 test('PBRV-021 Restore drill evidence is marked operator verification required',async({page})=>{
  await openRecovery(page);const card=root(page).locator('.platform-backup-restore__control-card').filter({hasText:'Restore drill evidence operator-verified'});
  await expect(card).toContainText('Manual restore-drill verification required');
  await expect(card).toContainText('0');
 });
 test('PBRV-022 Validation boundary expands and keeps real isolated restore requirement',async({page})=>{
  await openRecovery(page);const note=root(page).locator('.platform-backup-restore__validation-note');
  await note.locator('summary').click();await expect(note).toHaveAttribute('open','');
  await expect(note).toContainText('real isolated restore drill');
 });
 test('PBRV-023 Three source-shaped tenant statuses remain distinct',async({page})=>{
  await openRecovery(page);await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).nth(0)).toContainText('Tenant backup scope ready');
  await expect(cards(page).nth(1)).toContainText('Tenant backup scope blocked');
  await expect(cards(page).nth(2)).toContainText('Tenant backup scope review required');
 });
 test('PBRV-024 Tenant card includes lifecycle and UUID separately',async({page})=>{
  await openRecovery(page);await expect(first(page)).toContainText('Active lifecycle');
  await expect(first(page)).toContainText(backupAlpha);
 });
 test('PBRV-025 Tenant cards show core table counts instead of single opaque score',async({page})=>{
  await openRecovery(page);await expect(first(page).locator('.platform-backup-restore__evidence-grid')).toContainText('Products: 2, Stock: 4');
 });
 test('PBRV-026 Tenant empty table counts are displayed explicitly as None',async({page})=>{
  await openRecovery(page);await expect(cards(page).nth(1).locator('.platform-backup-restore__evidence-grid')).toContainText('None');
 });
 test('PBRV-027 Missing export archive timestamp renders dash rather than an invented date',async({page})=>{
  await openRecovery(page);const field=cards(page).nth(1).locator('.platform-backup-restore__tenant-evidence').filter({hasText:'Last tenant export archive at'});
  await expect(field).toContainText('—');
 });
 test('PBRV-028 Missing controls humanize each control key for operators',async({page})=>{
  await openRecovery(page);const missing=cards(page).nth(1).locator('.platform-backup-restore__missing-controls');
  await expect(missing).toContainText('Tenant core data scope identified');
  await expect(missing).toContainText('Tenant export archive exercised');
 });
 test('PBRV-029 Ready tenant has None for missing controls',async({page})=>{
  await openRecovery(page);await expect(first(page).locator('.platform-backup-restore__missing-controls')).toContainText('None');
 });
 test('PBRV-030 Review-only tenant gives export sample next step not a database restore claim',async({page})=>{
  await openRecovery(page);const step=cards(page).nth(2).locator('.platform-backup-restore__next-step');
  await expect(step).toContainText('audited tenant export archive');
  await expect(step).toContainText('not a database restore');
 });
 test('PBRV-031 Tenant export link includes only that tenant UUID',async({page})=>{
  await openRecovery(page);await expect(cards(page).nth(1).getByRole('link',{name:'Tenant export'}))
   .toHaveAttribute('href',`/platform/tenant-exports?tenant_id=${backupBeta}`);
 });
 test('PBRV-032 Runbooks drill-down targets maintenance category',async({page})=>{
  await openRecovery(page);await expect(first(page).getByRole('link',{name:'Runbooks'}))
   .toHaveAttribute('href','/platform/runbooks?category=maintenance');
 });
 test('PBRV-033 Documentation drill-down links to completeness page',async({page})=>{
  await openRecovery(page);await expect(first(page).getByRole('link',{name:'Documentation'}))
   .toHaveAttribute('href','/platform/documentation-completeness');
 });
 test('PBRV-034 Tenant selection scopes both URL and recovery GET',async({page})=>{
  const queries:string[]=[];await openRecovery(page,{onCall:(method,path,q)=>{if(method==='GET'&&path===BACKUP_RESTORE_PATH)queries.push(q.toString());}});
  await page.getByLabel('Tenant filter').selectOption(backupBeta);
  await expect(page).toHaveURL(new RegExp('tenant_id='+backupBeta));await expect(cards(page)).toHaveCount(1);
  await expect(first(page)).toContainText('Backup Beta');expect(queries.at(-1)).toBe('tenant_id='+backupBeta);
 });
 test('PBRV-035 Clearing tenant filter restores aggregate three-row view',async({page})=>{
  await openRecovery(page,{urlQuery:'tenant_id='+backupAlpha});await expect(cards(page)).toHaveCount(1);
  await page.getByLabel('Tenant filter').selectOption('');await expect(cards(page)).toHaveCount(3);
  await expect(page).not.toHaveURL(/tenant_id=/);
 });
 test('PBRV-036 Reopenable tenant deep link selects directory tenant',async({page})=>{
  await openRecovery(page,{urlQuery:'tenant_id='+backupGamma});
  await expect(page.getByLabel('Tenant filter')).toHaveValue(backupGamma);
  await expect(root(page).locator('.platform-backup-restore__scope-copy')).toContainText('Backup Gamma');
  await expect(cards(page)).toHaveCount(1);
 });
 test('PBRV-037 Unknown tenant UUID shows backend-style 404 and preserves URL scope',async({page})=>{
  const unknown='b1130000-0000-4000-8000-000000000099';
  await openRecovery(page,{urlQuery:'tenant_id='+unknown});
  await expect(page.getByLabel('Tenant filter')).toHaveValue(unknown);
  await expect(root(page).getByRole('alert')).toContainText('Unable to load backup restore validation');
 });
 test('PBRV-038 Failed directory warns without removing already loaded recovery cards',async({page})=>{
  await openRecovery(page,{tenantListStatus:503});
  await expect(root(page).locator('.platform-backup-restore__filter-warning')).toContainText('current URL scope is preserved');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PBRV-039 Initial data failure exposes Retry and recovers when GET succeeds',async({page})=>{
  let fail=true;await openRecovery(page,{respond:(method,path)=>method==='GET'&&path===BACKUP_RESTORE_PATH&&fail?
   {status:503,json:{message:'Synthetic recovery outage'}}:undefined});
  await expect(root(page).getByRole('alert')).toContainText('No successful recovery-evidence snapshot');
  fail=false;await root(page).getByRole('button',{name:'Retry',exact:true}).click();
  await expect(cards(page)).toHaveCount(3);
 });
 test('PBRV-040 Refresh failure keeps stale data and displays status warning',async({page})=>{
  let fail=false;await openRecovery(page,{respond:(method,path)=>method==='GET'&&path===BACKUP_RESTORE_PATH&&fail?
   {status:503,json:{message:'Temporary recovery failure'}}:undefined});
  await expect(cards(page)).toHaveCount(3);fail=true;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).getByRole('status')).toContainText('last successful backup / restore snapshot');
  await expect(cards(page)).toHaveCount(3);
 });
 test('PBRV-041 Empty tenant scope shows no-match state without adding tenant cards',async({page})=>{
  await openRecovery(page,{rows:[]});await expect(cards(page)).toHaveCount(0);
  await expect(root(page).locator('.platform-backup-restore__empty-state')).toContainText('No tenants match');
 });
 test('PBRV-042 Filter and refresh never issue backup or tenant write requests',async({page})=>{
  const writes:string[]=[];await openRecovery(page,{onCall:(method,path)=>{if(!['GET','OPTIONS'].includes(method))writes.push(method+' '+path);}});
  await page.getByLabel('Tenant filter').selectOption(backupAlpha);
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(cards(page)).toHaveCount(1);expect(writes).toEqual([]);
 });
 test('PBRV-043 Router denies view lacking tenants.read permission',async({page})=>{
  await openRecovery(page,{permissions:BACKUP_RESTORE_PERMISSIONS.filter(p=>p!=='platform.tenants.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PBRV-044 Router denies view lacking tenants.export permission',async({page})=>{
  await openRecovery(page,{permissions:BACKUP_RESTORE_PERMISSIONS.filter(p=>p!=='platform.tenants.export'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PBRV-045 Router denies view lacking runbooks.read permission',async({page})=>{
  await openRecovery(page,{permissions:BACKUP_RESTORE_PERMISSIONS.filter(p=>p!=='platform.runbooks.read'),expectHeading:false});
  await expect(page).toHaveURL(/\/platform\/?$/);await expect(root(page)).toHaveCount(0);
 });
 test('PBRV-046 Invalid snapshot date displays explicit Not available fallback',async({page})=>{
  await openRecovery(page,{alter:s=>({...s,generated_at:'not-a-date'})});
  await expect(root(page).locator('.platform-backup-restore__refresh-block')).toContainText('Not available');
  await expect(root(page).locator('.platform-backup-restore__program-grid')).toContainText('Not available');
 });
 test('PBRV-047 Existing tenant archive sample date appears as a readable value',async({page})=>{
  await openRecovery(page);const field=first(page).locator('.platform-backup-restore__tenant-evidence').filter({hasText:'Last tenant export archive at'});
  await expect(field).not.toContainText('—');await expect(field).not.toContainText('Invalid Date');
 });
 test('PBRV-048 Blocked platform posture never masquerades as technical precheck clear',async({page})=>{
  await openRecovery(page);await expect(root(page).locator('.platform-backup-restore__hero-aside')).toContainText('Backup / restore validation blocked');
  await expect(root(page).locator('.platform-backup-restore__hero-aside')).not.toContainText('Technical precheck clear');
 });
 test('PBRV-049 Empty missing-policy fields are represented as None in evidence',async({page})=>{
  await openRecovery(page,{platformOverride:{backup_policy_missing_fields:[]}});
  const field=root(page).locator('.platform-backup-restore__platform-item').filter({hasText:'Backup policy missing fields'});
  await expect(field).toContainText('None');
 });
 test('PBRV-050 Failed refresh can retry successfully and clear stale warning',async({page})=>{
  let fail=false,changed=false;
  await openRecovery(page,{respond:(method,path)=>{
   if(method==='GET'&&path===BACKUP_RESTORE_PATH){
    if(fail)return {json:{message:'Synthetic outage'},status:503};
    return {json:{...makeRecoverySnapshot(),generated_at:changed?'2026-11-05T16:00:00.000Z':'2026-11-05T12:00:00.000Z'}};
   }
   return undefined;
  }});
  const before=await root(page).locator('.platform-backup-restore__refresh-block').innerText();
  fail=true;await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page).getByRole('status')).toBeVisible();
  fail=false;changed=true;await root(page).getByRole('button',{name:'Retry refresh'}).click();
  await expect(root(page).getByRole('status')).toHaveCount(0);await expect(cards(page)).toHaveCount(3);
  expect(await root(page).locator('.platform-backup-restore__refresh-block').innerText()).not.toBe(before);
 });

 test('PBRV-051 Scope switch preserves independent query markers',async({page})=>{
  await openRecovery(page,{urlQuery:'audit=sample&mode=operator'});
  await page.getByLabel('Tenant filter').selectOption(backupAlpha);
  await expect(page).toHaveURL(/audit=sample/);await expect(page).toHaveURL(/mode=operator/);
  await expect(page).toHaveURL(new RegExp('tenant_id='+backupAlpha));
 });
 test('PBRV-052 Both tenant directory and recovery board refetch after refresh',async({page})=>{
  let directory=0,recovery=0;
  await openRecovery(page,{onCall:(m,p)=>{if(m==='GET'&&p==='/platform/tenants')directory++;if(m==='GET'&&p===BACKUP_RESTORE_PATH)recovery++;}});
  const beforeDirectory=directory,beforeRecovery=recovery;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>directory).toBeGreaterThan(beforeDirectory);
  await expect.poll(()=>recovery).toBeGreaterThan(beforeRecovery);
 });
 test('PBRV-053 Deep linked scope remains selected if tenant directory fails',async({page})=>{
  await openRecovery(page,{urlQuery:'tenant_id='+backupBeta,tenantListStatus:503});
  await expect(page.getByLabel('Tenant filter')).toHaveValue(backupBeta);
  await expect(cards(page)).toHaveCount(1);
  await expect(root(page).locator('.platform-backup-restore__scope-copy')).toContainText(backupBeta.slice(0,8));
 });
 test('PBRV-054 Complete policy evidence has no missing field names',async({page})=>{
  await openRecovery(page,{platformOverride:{backup_policy_configuration_present:true,backup_policy_missing_fields:[],backup_policy_fields_configured:4}});
  await expect(root(page).locator('.platform-backup-restore__platform-item').filter({hasText:'Backup policy missing fields'})).toContainText('None');
  await expect(root(page).locator('.platform-backup-restore__platform-item').filter({hasText:'Backup policy configuration present'})).toContainText('Yes');
 });
 test('PBRV-055 Empty platform evidence object produces no invented evidence rows',async({page})=>{
  await openRecovery(page,{alter:s=>({...s,platform_evidence:{}})});
  await expect(root(page).locator('.platform-backup-restore__platform-item')).toHaveCount(0);
  await expect(root(page).locator('.platform-backup-restore__evidence-section')).toContainText('Platform recovery evidence');
 });
 test('PBRV-056 Unknown posture is displayed as human readable text, not ready',async({page})=>{
  await openRecovery(page,{alter:s=>({...s,posture:'awaiting_manual_operator_review'})});
  await expect(root(page).locator('.platform-backup-restore__hero-aside')).toContainText('Awaiting manual operator review');
  await expect(root(page).locator('.platform-backup-restore__hero-aside')).not.toContainText('Technical precheck clear');
 });
 test('PBRV-057 Unknown recovery control status remains visible as humanized value',async({page})=>{
  await openRecovery(page,{alter:s=>({...s,platform_controls:s.platform_controls.map((c,i)=>i===0?{...c,status:'operator_evidence_pending'}:c)})});
  await expect(root(page).locator('.platform-backup-restore__control-card').first()).toContainText('Operator evidence pending');
 });
 test('PBRV-058 Null platform control evidence is labelled Not persisted',async({page})=>{
  await openRecovery(page,{alter:s=>({...s,platform_controls:s.platform_controls.map((c,i)=>i===0?{...c,evidence_value:null}:c)})});
  await expect(root(page).locator('.platform-backup-restore__control-card').first().locator('.platform-backup-restore__evidence-key')).toContainText('Not persisted');
 });
 test('PBRV-059 Missing tenant evidence value uses dash fallback',async({page})=>{
  await openRecovery(page,{rows:[{...makeRecoveryTenant(backupAlpha,'Backup Alpha'),evidence:{reviewed_at:null}}]});
  await expect(first(page).locator('.platform-backup-restore__tenant-evidence')).toContainText('—');
 });
 test('PBRV-060 Tenant evidence boolean values show Yes and No not raw JSON booleans',async({page})=>{
  await openRecovery(page,{rows:[{...makeRecoveryTenant(backupAlpha,'Backup Alpha'),evidence:{core_data_scope_identified:true,tenant_export_archive_exercised:false}}]});
  await expect(first(page).locator('.platform-backup-restore__evidence-grid')).toContainText('Yes');
  await expect(first(page).locator('.platform-backup-restore__evidence-grid')).toContainText('No');
 });
 test('PBRV-061 Unrecognized missing-control code is humanized in attention summary',async({page})=>{
  await openRecovery(page,{rows:[{...makeRecoveryTenant(backupBeta,'Backup Beta','blocked'),missing_control_codes:['manual_evidence_confirmation_pending']}]});
  await expect(first(page).locator('.platform-backup-restore__missing-controls')).toContainText('Manual evidence confirmation pending');
 });
 test('PBRV-062 Tenant table-count object displays multiple named counts separately',async({page})=>{
  await openRecovery(page,{rows:[{...makeRecoveryTenant(backupAlpha,'Backup Alpha'),evidence:{core_table_counts:{products:4,stock:0,shipments:3}}}]});
  await expect(first(page).locator('.platform-backup-restore__evidence-grid')).toContainText('Products: 4, Stock: 0, Shipments: 3');
 });
 test('PBRV-063 Long operator next step is not replaced with generic fallback',async({page})=>{
  const next='Check synthetic recovery context '+ 'R'.repeat(160);
  await openRecovery(page,{rows:[{...makeRecoveryTenant(backupAlpha,'Backup Alpha'),next_best_step:next}]});
  await expect(first(page).locator('.platform-backup-restore__next-step')).toContainText(next);
 });
 test('PBRV-064 Small mobile viewport retains scope and export drill-down',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openRecovery(page);
  await expect(page.getByLabel('Tenant filter')).toBeVisible();
  await expect(first(page).getByRole('link',{name:'Tenant export'})).toBeVisible();
 });
 test('PBRV-065 Tenant scope filter receives keyboard focus and allows keyboard selection',async({page})=>{
  await openRecovery(page);const select=page.getByLabel('Tenant filter');await select.focus();
  await expect(select).toBeFocused();await select.selectOption(backupGamma);
  await expect(select).toHaveValue(backupGamma);await expect(cards(page)).toHaveCount(1);
 });
 test('PBRV-066 Selected tenant URL survives full page reload',async({page})=>{
  await openRecovery(page,{urlQuery:'tenant_id='+backupAlpha});
  await page.reload();await expect(page.getByLabel('Tenant filter')).toHaveValue(backupAlpha);
  await expect(cards(page)).toHaveCount(1);
 });
 test('PBRV-067 Validation text cannot be mistaken for completed production restore',async({page})=>{
  await openRecovery(page);const note=root(page).locator('.platform-backup-restore__validation-note');
  await note.locator('summary').click();
  await expect(note).toContainText('does not execute production backups');
  await expect(root(page).locator('.platform-backup-restore__operator-notice')).toContainText('provider evidence remain required');
 });
 test('PBRV-068 Tenant with no controls never fabricates passed control badges',async({page})=>{
  await openRecovery(page,{rows:[{...makeRecoveryTenant(backupAlpha,'Backup Alpha'),controls:[],missing_control_codes:[]}]});
  await expect(first(page).locator('.platform-backup-restore__tenant-control')).toHaveCount(0);
  await expect(first(page).locator('.platform-backup-restore__missing-controls')).toContainText('None');
 });
});
