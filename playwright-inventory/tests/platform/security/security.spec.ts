/** Batch 104 — My Security, synthetic source-traced Playwright declarations.
 * Phase 1, generated only: none compiled, executed or connected to a real password,
 * authenticator, security principal, database, session revocation or external IdP. */
import {test,expect,type Page} from '@playwright/test';
import {openPlatformSecurity,securityPath,securityPermissions,securitySelf,securityAdminFixture,
 securityAdminUser,securityAdminSession,SECURITY_USER_LOCKED,SECURITY_SESSION_ID} from '../../../support/platformSecurityFixture';
const root=(p:Page)=>p.locator('.platform-security');
const password=(p:Page)=>root(p).locator('.platform-security__section').filter({hasText:'Change password'}).first();
const priority=(p:Page)=>root(p).locator('.platform-security__section').filter({hasText:'Priority staff review'}).first();
const sessions=(p:Page)=>root(p).locator('.platform-security__section').filter({hasText:'Recent active staff sessions'}).first();
const without=(...grants:string[])=>securityPermissions.filter(g=>!grants.includes(g));
const callsOf=(calls:{method:string;path:string;body:any}[],suffix:string)=>calls.filter(c=>c.method==='POST'&&c.path.endsWith(suffix));
test.describe('Platform My Security — self service and separately scoped staff evidence',()=>{
 test('PSEC-001 My Security is authenticated self-service and not external identity proof',async({page})=>{
  await openPlatformSecurity(page);
  await expect(root(page)).toContainText('Self-service: authenticated Platform user');
  await expect(root(page)).toContainText('does not prove device identity');
 });
 test('PSEC-002 Without security-read, self remains available and staff GET is not made',async({page})=>{
  const calls:string[]=[];await openPlatformSecurity(page,{permissions:without('platform.security.read'),onCall:(m,p)=>{if(m==='GET')calls.push(p)}});
  expect(calls).toContain(`${securityPath}/me`);expect(calls).not.toContain(`${securityPath}/admin`);
  await expect(root(page)).toContainText('Synthetic Operator');
  await expect(priority(page)).toHaveCount(0);
 });
 test('PSEC-003 Security-read shows separate staff security evidence',async({page})=>{
  await openPlatformSecurity(page);
  await expect(root(page)).toContainText('Staff security evidence');
  await expect(root(page).getByLabel('Staff security summary')).toBeVisible();
 });
 test('PSEC-004 Staff summary labels null evidence as Restricted not zero',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.users.read','platform.sessions.read')});
  await expect(root(page)).toContainText('Restricted sources');
  await expect(root(page).getByLabel('Staff security summary')).toContainText('Restricted');
  await expect(root(page)).toContainText('platform users, platform sessions');
 });
 test('PSEC-005 Without platform-users read, priority user table is absent',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.users.read')});
  await expect(priority(page)).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform users'})).toHaveCount(0);
 });
 test('PSEC-006 Without sessions-read, active staff sessions table is absent',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.sessions.read')});
  await expect(sessions(page)).toHaveCount(0);
  await expect(root(page).getByRole('link',{name:'Platform sessions'})).toHaveCount(0);
 });
 test('PSEC-007 MFA summary is application TOTP state, not device assurance',async({page})=>{
  await openPlatformSecurity(page);
  await expect(root(page).getByLabel('My account security summary')).toContainText('Disabled');
  await expect(root(page)).toContainText('It does not prove device identity');
 });
 test('PSEC-008 Invalid or missing self timestamps are shown as recorded-state indicators',async({page})=>{
  await openPlatformSecurity(page,{self:{last_login_at:null,password_changed_at:null,mfa_confirmed_at:'bad-date'}});
  await expect(root(page).getByLabel('My account security summary')).toContainText('Not recorded');
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Invalid timestamp');
 });
 test('PSEC-009 My account displays only the authenticated identity',async({page})=>{
  await openPlatformSecurity(page);
  const account=root(page).locator('.platform-security__account-grid');
  await expect(account).toContainText('Synthetic Operator');
  await expect(account).toContainText('operator@fixture.test');
  await expect(account).not.toContainText('locked@fixture.test');
 });
 test('PSEC-010 Password change requires current and a 10-character new password',async({page})=>{
  await openPlatformSecurity(page);const form=password(page);
  await expect(form.getByRole('button',{name:'Change password'})).toBeDisabled();
  await form.getByLabel('Current password').fill('old-password');
  await form.getByLabel('New password').fill('123456789');
  await expect(form.getByRole('button',{name:'Change password'})).toBeDisabled();
  await form.getByLabel('New password').fill('1234567890');
  await expect(form.getByRole('button',{name:'Change password'})).toBeEnabled();
 });
 test('PSEC-011 Password fields enforce 512-character browser maximum',async({page})=>{
  await openPlatformSecurity(page);const form=password(page);
  await expect(form.getByLabel('Current password')).toHaveAttribute('maxlength','512');
  await expect(form.getByLabel('New password')).toHaveAttribute('maxlength','512');
  await expect(form.getByLabel('New password')).toHaveAttribute('minlength','10');
 });
 test('PSEC-012 Cancelling password change prevents mutation',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  const form=password(page);await form.getByLabel('Current password').fill('old-password');
  await form.getByLabel('New password').fill('new-password-1');
  page.once('dialog',d=>d.dismiss());await form.getByRole('button',{name:'Change password'}).click();
  expect(callsOf(calls,'/change-password')).toHaveLength(0);
 });
 test('PSEC-013 Password mutation transmits exactly entered spaces without silent trimming',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  const form=password(page);await form.getByLabel('Current password').fill(' old-value ');
  await form.getByLabel('New password').fill(' new-password-with-spaces ');
  page.once('dialog',d=>d.accept());await form.getByRole('button',{name:'Change password'}).click();
  await expect.poll(()=>callsOf(calls,'/change-password').length).toBe(1);
  expect(callsOf(calls,'/change-password')[0].body).toEqual({current_password:' old-value ',new_password:' new-password-with-spaces '});
 });
 test('PSEC-014 Successful password mutation clears both inputs and reports other-session count',async({page})=>{
  await openPlatformSecurity(page);const form=password(page);
  await form.getByLabel('Current password').fill('old');await form.getByLabel('New password').fill('new-password!');
  page.once('dialog',d=>d.accept());await form.getByRole('button',{name:'Change password'}).click();
  await expect(root(page).locator('.platform-security__success')).toContainText('1 other active session(s) were revoked');
  await expect(form.getByLabel('Current password')).toHaveValue('');
  await expect(form.getByLabel('New password')).toHaveValue('');
 });
 test('PSEC-015 Password change failure retains fields and displays server error',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/change-password')?{status:422,json:{message:'Password change rejected'}}:undefined});
  const form=password(page);await form.getByLabel('Current password').fill('old');
  await form.getByLabel('New password').fill('new-password!');
  page.once('dialog',d=>d.accept());await form.getByRole('button',{name:'Change password'}).click();
  await expect(form.locator('.platform-security__inline-error')).toContainText('Password change rejected');
  await expect(form.getByLabel('New password')).toHaveValue('new-password!');
 });
 test('PSEC-016 Starting MFA setup uses dedicated POST, not confirmation',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await expect.poll(()=>callsOf(calls,'/mfa/setup').length).toBe(1);
  expect(callsOf(calls,'/mfa/confirm')).toHaveLength(0);
 });
 test('PSEC-017 MFA setup displays synthetic QR and manual secret and remains unconfirmed',async({page})=>{
  await openPlatformSecurity(page);await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await expect(root(page).getByAltText('Authenticator app setup QR code')).toBeVisible();
  await expect(root(page).locator('.platform-security__mfa-setup code')).toHaveText('JBSWY3DPEHPK3PXP');
  await expect(root(page)).toContainText('MFA is not enabled until');
 });
 test('PSEC-018 MFA confirmation cannot occur before setup starts',async({page})=>{
  await openPlatformSecurity(page);
  await expect(root(page).getByRole('button',{name:'Confirm MFA'})).toBeDisabled();
  await expect(root(page).getByPlaceholder('6-digit code')).toBeDisabled();
 });
 test('PSEC-019 Confirmation input strips non-digits and is six digits maximum',async({page})=>{
  await openPlatformSecurity(page);await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await root(page).getByPlaceholder('6-digit code').fill('a12b34c567');
  await expect(root(page).getByPlaceholder('6-digit code')).toHaveValue('123456');
 });
 test('PSEC-020 Confirm-MFA request contains only six-digit code after setup',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await root(page).getByPlaceholder('6-digit code').fill('654321');
  await root(page).getByRole('button',{name:'Confirm MFA'}).click();
  await expect.poll(()=>callsOf(calls,'/mfa/confirm').length).toBe(1);
  expect(callsOf(calls,'/mfa/confirm')[0].body).toEqual({code:'654321'});
 });
 test('PSEC-021 Confirming MFA switches self application flag and disables another setup',async({page})=>{
  await openPlatformSecurity(page);await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await root(page).getByPlaceholder('6-digit code').fill('654321');
  await root(page).getByRole('button',{name:'Confirm MFA'}).click();
  await expect(root(page).getByRole('button',{name:'MFA already enabled'})).toBeDisabled();
  await expect(root(page).locator('.platform-security__success')).toContainText('MFA enabled');
 });
 test('PSEC-022 MFA confirmation failure is shown and does not enable MFA',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/mfa/confirm')?{json:{message:'Invalid code'},status:422}:undefined});
  await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await root(page).getByPlaceholder('6-digit code').fill('000000');
  await root(page).getByRole('button',{name:'Confirm MFA'}).click();
  await expect(root(page).locator('.platform-security__inline-error')).toContainText('Invalid code');
  await expect(root(page).getByRole('button',{name:'Start MFA setup'})).toBeEnabled();
 });
 test('PSEC-023 Disable-MFA controls are absent while MFA is disabled',async({page})=>{
  await openPlatformSecurity(page);await expect(root(page).getByRole('button',{name:'Disable MFA'})).toHaveCount(0);
 });
 test('PSEC-024 MFA disable requires both current password and a six-digit TOTP',async({page})=>{
  await openPlatformSecurity(page,{self:{mfa_enabled:true}});
  const zone=root(page).locator('.platform-security__danger-zone');
  await expect(zone.getByRole('button',{name:'Disable MFA'})).toBeDisabled();
  await zone.getByLabel('Current password').fill('correct-password');
  await zone.getByLabel('Current TOTP code').fill('12345');
  await expect(zone.getByRole('button',{name:'Disable MFA'})).toBeDisabled();
  await zone.getByLabel('Current TOTP code').fill('123456');
  await expect(zone.getByRole('button',{name:'Disable MFA'})).toBeEnabled();
 });
 test('PSEC-025 Declining Disable-MFA confirmation sends no credentials',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{self:{mfa_enabled:true},onCall:(method,path,body)=>calls.push({method,path,body})});
  const zone=root(page).locator('.platform-security__danger-zone');
  await zone.getByLabel('Current password').fill('correct-password');await zone.getByLabel('Current TOTP code').fill('123456');
  page.once('dialog',d=>d.dismiss());await zone.getByRole('button',{name:'Disable MFA'}).click();
  expect(callsOf(calls,'/mfa/disable')).toHaveLength(0);
 });
 test('PSEC-026 Confirmed disable-MFA request contains password and exact code',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{self:{mfa_enabled:true},onCall:(method,path,body)=>calls.push({method,path,body})});
  const zone=root(page).locator('.platform-security__danger-zone');
  await zone.getByLabel('Current password').fill('password-with-spaces ');await zone.getByLabel('Current TOTP code').fill('123456');
  page.once('dialog',d=>d.accept());await zone.getByRole('button',{name:'Disable MFA'}).click();
  await expect.poll(()=>callsOf(calls,'/mfa/disable').length).toBe(1);
  expect(callsOf(calls,'/mfa/disable')[0].body).toEqual({current_password:'password-with-spaces ',code:'123456'});
 });
 test('PSEC-027 Successful MFA disable refreshes self state and reports revocation',async({page})=>{
  await openPlatformSecurity(page,{self:{mfa_enabled:true}});
  const zone=root(page).locator('.platform-security__danger-zone');
  await zone.getByLabel('Current password').fill('correct-password');await zone.getByLabel('Current TOTP code').fill('123456');
  page.once('dialog',d=>d.accept());await zone.getByRole('button',{name:'Disable MFA'}).click();
  await expect(root(page).locator('.platform-security__success')).toContainText('MFA disabled after password and TOTP verification');
  await expect(zone).toHaveCount(0);
 });
 test('PSEC-028 User-read without sessions-read shows restricted per-user session counts',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.sessions.read')});
  await expect(priority(page)).toContainText('Restricted');
  await expect(root(page).getByLabel('Staff security summary')).toContainText('Restricted');
 });
 test('PSEC-029 Staff risk table reports lock and failed-login signals from bounded evidence',async({page})=>{
  await openPlatformSecurity(page);
  await expect(priority(page)).toContainText('Locked Operator');
  await expect(priority(page)).toContainText('repeated failed login');
  await expect(priority(page)).toContainText('stale password review');
 });
 test('PSEC-030 Read-only security principal cannot use staff unlock and MFA clear',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.security.write')});
  await expect(priority(page)).toContainText('Read-only security access');
  await expect(priority(page).getByRole('button',{name:'Unlock'}).first()).toBeDisabled();
  await expect(priority(page).getByRole('button',{name:'Clear MFA'}).first()).toBeDisabled();
 });
 test('PSEC-031 Locked staff account allows unlock when required grants are present',async({page})=>{
  await openPlatformSecurity(page);await expect(priority(page).getByRole('button',{name:'Unlock'}).first()).toBeEnabled();
 });
 test('PSEC-032 Not-locked staff account cannot be unlocked',async({page})=>{
  await openPlatformSecurity(page);await expect(priority(page).getByRole('button',{name:'Unlock'}).nth(1)).toBeDisabled();
 });
 test('PSEC-033 Clear-MFA requires session-revoke grant in addition to write and users-read',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.sessions.revoke')});
  await expect(priority(page)).toContainText('PLATFORM_SESSIONS_REVOKE');
  await expect(priority(page).getByRole('button',{name:'Clear MFA'}).first()).toBeDisabled();
 });
 test('PSEC-034 Dismissing staff unlock confirmation prevents POST',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  page.once('dialog',d=>d.dismiss());await priority(page).getByRole('button',{name:'Unlock'}).first().click();
  expect(callsOf(calls,'/unlock')).toHaveLength(0);
 });
 test('PSEC-035 Staff unlock posts only the targeted locked account UUID',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  page.once('dialog',d=>d.accept());await priority(page).getByRole('button',{name:'Unlock'}).first().click();
  await expect.poll(()=>callsOf(calls,'/unlock').length).toBe(1);
  expect(callsOf(calls,'/unlock')[0].path).toBe(`${securityPath}/admin/users/${SECURITY_USER_LOCKED}/unlock`);
 });
 test('PSEC-036 Declining administrative MFA clear does not revoke sessions',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];await openPlatformSecurity(page,{onCall:(method,path,body)=>calls.push({method,path,body})});
  page.once('dialog',d=>d.dismiss());await priority(page).getByRole('button',{name:'Clear MFA'}).first().click();
  expect(callsOf(calls,'/clear-mfa')).toHaveLength(0);
 });
 test('PSEC-037 Confirmed administrative MFA clearing reports exact synthetic session count',async({page})=>{
  await openPlatformSecurity(page);
  page.once('dialog',d=>d.accept());await priority(page).getByRole('button',{name:'Clear MFA'}).first().click();
  await expect(root(page).locator('.platform-security__success')).toContainText('2 active session(s) were revoked');
  await expect(priority(page).getByRole('button',{name:'MFA clear'}).first()).toBeDisabled();
 });
 test('PSEC-038 Failed staff-review query leaves self-security workflow available',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='GET'&&p.endsWith('/admin')?{json:{message:'Staff snapshot unavailable'},status:503}:undefined});
  await expect(root(page)).toContainText('Staff security review is unavailable');
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Synthetic Operator');
  await expect(password(page).getByRole('button',{name:'Change password'})).toBeDisabled();
 });
 test('PSEC-039 Supporting operation links depend on independent grants',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.audit.read','platform.access_reviews.read','platform.role_permissions.read')});
  const links=root(page).locator('.platform-security__links');
  await expect(links.getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Access reviews'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Role permissions'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Platform users'})).toBeVisible();
 });
 test('PSEC-040 Truncated staff lists explicitly say they are not the full registry',async({page})=>{
  await openPlatformSecurity(page,{admin:{truncated:{users:true,active_sessions:true}}});
  await expect(priority(page)).toContainText('Priority list truncated');
  await expect(sessions(page)).toContainText('Session list truncated');
  await expect(root(page)).toContainText('summary counts remain registry-wide');
 });
 test.skip('PSEC-041 Real TOTP login enforcement, session revocation, rate limiting and audit persistence need Phase 2',async()=>{
  // Requires separate authenticated identities, real secret custody, TOTP verification, current-session binding,
  // signed login flows, SQL transactions, retention and logs; browser intercepts prove none of these.
 });


// Batch 105 continuation — source reviewed; all tests remain uncompiled and unexecuted.
test.skip('PSEC-042 Password change refusal under an invalid current password needs real credential verification',async()=>{
 // Phase 2 or source-hardening obligation: Actual previous-password verification and password-change rejection require a real authenticated account and backend.
});
test.skip('PSEC-043 Changing password to identical old value must fail on backend validation',async()=>{
 // Phase 2 or source-hardening obligation: Identical-password enforcement is backend-side; a 10-character form validation alone cannot establish rejection.
});
test.skip('PSEC-044 Password reuse and hashing policy need real credential/database checks',async()=>{
 // Phase 2 or source-hardening obligation: Hashing, password reuse and persistent credential storage require SQL/credential acceptance.
});
test.skip('PSEC-045 Password change should preserve only the current authenticated session in SQL',async()=>{
 // Phase 2 or source-hardening obligation: Preservation of only the current session needs independently issued tokens and database records.
});
test.skip('PSEC-046 Self-security snapshot inaccessible user must be forbidden under authenticated route',async()=>{
 // Phase 2 or source-hardening obligation: Cannot simulate a real disabled platform principal with an intercepted auth/me request.
});
test.skip('PSEC-047 Rate limit on repeated password/MFA mutations requires live API evidence',async()=>{
 // Phase 2 or source-hardening obligation: Rate-limit windows and enforcement require real API and multiple requests under a disposable account.
});
test('PSEC-048 MFA setup repeated while unconfirmed must not silently enable enforcement',async({page})=>{
  const calls:{method:string;path:string;body:any}[]=[];
  await openPlatformSecurity(page,{onCall:(m,p,b)=>calls.push({method:m,path:p,body:b})});
  const setupButton=root(page).getByRole('button',{name:'Start MFA setup'});
  await setupButton.click();
  await expect(root(page).getByLabel('My account security summary')).toContainText('Disabled');
  await setupButton.click();
  await expect.poll(()=>callsOf(calls,'/mfa/setup').length).toBe(2);
  await expect(root(page).getByLabel('My account security summary')).toContainText('Disabled');
  expect(callsOf(calls,'/mfa/confirm')).toHaveLength(0);
});
test.skip('PSEC-049 Existing enabled MFA setup must not invalidate currently bound MFA secret',async()=>{
 // Phase 2 or source-hardening obligation: Reusing already-enabled TOTP authenticator requires live secret custody and signed login verification.
});
test.skip('PSEC-050 TOTP confirmation replay and wrong time window must be rejected by real verifier',async()=>{
 // Phase 2 or source-hardening obligation: TOTP replay/time-window rejection needs a real time-varying verifier.
});
test('PSEC-051 MFA secret must never be exposed after successful confirmation',async({page})=>{
  await openPlatformSecurity(page);
  await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await expect(root(page).locator('.platform-security__mfa-setup code')).toContainText('JBSWY3DPEHPK3PXP');
  await root(page).getByPlaceholder('6-digit code').fill('123456');
  await root(page).getByRole('button',{name:'Confirm MFA'}).click();
  await expect(root(page).locator('.platform-security__mfa-setup')).toHaveCount(0);
  await expect(root(page).getByLabel('My account security summary')).toContainText('Enabled');
});
test.skip('PSEC-052 MFA-disable wrong password or wrong TOTP must fail without changing state',async()=>{
 // Phase 2 or source-hardening obligation: Wrong current password or TOTP must be rejected by backend; mock HTTP is insufficient.
});
test.skip('PSEC-053 MFA-disable after success invalidates other sessions and subsequent login requires password only',async()=>{
 // Phase 2 or source-hardening obligation: Actual older session rejection and future login flow need a separate browser identity.
});
test.skip('PSEC-054 Admin unlock without security-write grant requires actual backend 403',async()=>{
 // Phase 2 or source-hardening obligation: Real backend denial for staff unlock requires authenticated permission grants and live route.
});
test.skip('PSEC-055 Admin unlock without users-read grant requires actual backend 403',async()=>{
 // Phase 2 or source-hardening obligation: Real backend denial for missing users-read grant requires authenticated multi-principal acceptance.
});
test.skip('PSEC-056 Admin clear MFA without sessions-revoke grant requires actual backend 403',async()=>{
 // Phase 2 or source-hardening obligation: Real backend denial for missing revoke grant requires authenticated multi-principal acceptance.
});
test.skip('PSEC-057 Admin security overview response must apply independent permission-scoped SQL',async()=>{
 // Phase 2 or source-hardening obligation: SQL scoped admin evidence cannot be proved by fixture-generated response.
});
test.skip('PSEC-058 Admin sessions without users-read must redact user identities server-side',async()=>{
 // Phase 2 or source-hardening obligation: Cross-permission identity redaction must be exercised against the actual backend and principals.
});
test.skip('PSEC-059 Admin users without sessions-read must exclude session counts server-side',async()=>{
 // Phase 2 or source-hardening obligation: Cross-permission per-user active-session count must be checked against backend records.
});
test.skip('PSEC-060 Priority staff review includes no more than 50 returned users',async()=>{
 // Phase 2 or source-hardening obligation: 50-row staff bound is enforced by backend, not by this component; synthetic mock can supply >50.
});
test.skip('PSEC-061 Active sessions overview includes no more than 50 returned sessions',async()=>{
 // Phase 2 or source-hardening obligation: 50-row staff sessions bound is enforced by backend, not by this component.
});
test('PSEC-062 Summary counts remain registry-wide beyond truncated detail lists',async({page})=>{
  await openPlatformSecurity(page,{admin:{summary:{total_users:200,active_users:195,locked_users:31,users_without_mfa:42,users_with_failed_logins:66,active_sessions:310},truncated:{users:true,active_sessions:true},limits:{users:50,active_sessions:50}}});
  await expect(root(page).getByLabel('Staff security summary')).toContainText('200');
  await expect(root(page)).toContainText('summary counts remain registry-wide');
  await expect(priority(page)).toContainText('Priority list truncated');
});
test('PSEC-063 Unknown risk signal should display sanitized value without failure',async({page})=>{
  await openPlatformSecurity(page,{admin:{users:[{...securityAdminUser,risk_flags:['unfamiliar_signal_name']}]}});
  await expect(priority(page)).toContainText('unfamiliar signal name');
  await expect(priority(page)).not.toContainText('unfamiliar_signal_name');
});
test.skip('PSEC-064 Malformed admin overview payload needs robust type validation in frontend',async()=>{
  // SOURCE-HARDENING BLOCK: frontend/src/pages/PlatformSecurityPage.tsx falls back for arrays via Array.isArray, but does not validate risk_policy field types or summary numeric types end-to-end.
  // ACCEPTANCE: malformed HTTP 200 overview (e.g. risk_policy as a string, negative/NaN summary, malformed users) must produce explicit unavailable/malformed-data state rather than trusted security evidence or a render crash.
  // After frontend validation is implemented, use synthetic malformed 200 response in this fixture to assert a visible bounded error, self-security independence, no staff mutation and no fabricated secure posture.
});
test('PSEC-065 Self-security malformed truth contract should not imply hardware identity proof',async({page})=>{
  await openPlatformSecurity(page,{self:{truth_contract:{mfa_enabled_means_application_totp_is_enforced_at_platform_login:false,mfa_state_does_not_prove_device_identity_or_hardware_backing:false,active_sessions_are_application_session_records_not_proof_of_human_presence:false}}});
  await expect(root(page)).toContainText('It does not prove device identity');
  await expect(root(page)).toContainText('not verified human presence');
});
test('PSEC-066 Expired timestamp input should render deterministic safe fallback',async({page})=>{
  await openPlatformSecurity(page,{self:{last_login_at:'not-an-ISO-time',mfa_confirmed_at:'also-invalid',password_changed_at:null}});
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Invalid timestamp');
  await expect(root(page).locator('.platform-security__account-grid')).not.toContainText('NaN');
});
test('PSEC-067 Self-security request failure should offer Retry and preserve no fabricated success',async({page})=>{
  let failing=true;
  await openPlatformSecurity(page,{respond:(m,p)=>m==='GET'&&p===securityPath+'/me'&&failing?{status:503,json:{message:'Account snapshot unavailable'}}:undefined});
  await expect(root(page).locator('.platform-security__blocking-error')).toContainText('My Security failed to load');
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
  failing=false;
  await root(page).getByRole('button',{name:'Retry',exact:true}).click();
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Synthetic Operator');
});
test('PSEC-068 Failed refresh should retain prior successful self-security snapshot',async({page})=>{
  let reads=0;
  await openPlatformSecurity(page,{respond:(m,p)=>m==='GET'&&p===securityPath+'/me'&&++reads>1?{status:503,json:{message:'Refresh unavailable'}}:undefined});
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Synthetic Operator');
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful account-security snapshot');
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Synthetic Operator');
});
test('PSEC-069 Failed staff refresh should preserve prior scoped snapshot independently',async({page})=>{
  let reads=0;
  await openPlatformSecurity(page,{respond:(m,p)=>m==='GET'&&p===securityPath+'/admin'&&++reads>1?{status:503,json:{message:'Staff refresh rejected'}}:undefined});
  await expect(priority(page)).toContainText('Locked Operator');
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(root(page)).toContainText('Showing the last successful staff-security snapshot');
  await expect(priority(page)).toContainText('Locked Operator');
});
test('PSEC-070 Password/MFA mutation failure must not present a successful revoke count',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/change-password')?{status:422,json:{message:'Credential rejected'}}:undefined});
  await password(page).getByLabel('Current password').fill('incorrect');
  await password(page).getByLabel('New password').fill('valid-long-password');
  page.once('dialog',d=>d.accept());
  await password(page).getByRole('button',{name:'Change password'}).click();
  await expect(password(page).locator('.platform-security__inline-error')).toContainText('Credential rejected');
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
});
test('PSEC-071 Admin unlock failure retains security flag without false success',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/unlock')?{status:409,json:{message:'Unlock refused'}}:undefined});
  page.once('dialog',d=>d.accept());
  await priority(page).getByRole('button',{name:'Unlock'}).first().click();
  await expect(priority(page).locator('.platform-security__inline-error')).toContainText('Unlock refused');
  await expect(priority(page)).toContainText('locked');
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
});
test('PSEC-072 Admin MFA clear failure retains enabled status without false success',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/clear-mfa')?{status:409,json:{message:'MFA clearing refused'}}:undefined});
  page.once('dialog',d=>d.accept());
  await priority(page).getByRole('button',{name:'Clear MFA'}).first().click();
  await expect(priority(page).locator('.platform-security__inline-error')).toContainText('MFA clearing refused');
  await expect(priority(page).getByRole('button',{name:'Clear MFA'}).first()).toBeEnabled();
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
});
test('PSEC-073 Support links to users and sessions require the corresponding read grants',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.users.read','platform.sessions.read')});
  await expect(root(page).locator('.platform-security__links').getByRole('link',{name:'Platform users'})).toHaveCount(0);
  await expect(root(page).locator('.platform-security__links').getByRole('link',{name:'Platform sessions'})).toHaveCount(0);
  await expect(root(page).getByLabel('My account security summary')).toContainText('Disabled');
});
test.skip('PSEC-074 Admin MFA clear creates durable audit and records actor identity',async()=>{
 // Phase 2 or source-hardening obligation: Durable staff audit actor identity and persistence require SQL and audit log verification.
});
test.skip('PSEC-075 MFA secret setup and QR visibility need shoulder-surf/response caching acceptance',async()=>{
 // Phase 2 or source-hardening obligation: TOTP QR secret handling, cache controls, observer confidentiality and response headers require real browser/network review.
});
test.skip('PSEC-076 SQL concurrent password change and MFA disable must prevent stale session acceptance',async()=>{
 // Phase 2 or source-hardening obligation: Concurrent security writes and stale tokens require real SQL and multiple authenticated sessions.
});
test.skip('PSEC-077 Two-tenant principals must not cross-read security or platform identities',async()=>{
 // Phase 2 or source-hardening obligation: Security isolation across tenant and platform identities requires a live two-principal environment.
});
test.skip('PSEC-078 TOTP login enforcement and recovery need real browser authentication tests',async()=>{
 // Phase 2 or source-hardening obligation: Login enforcement and MFA recovery require real signed authentication and a TOTP authenticator.
});
test.skip('PSEC-079 MFA admin clearing requires verified operator and reversal controls',async()=>{
 // Phase 2 or source-hardening obligation: Admin clear-MFA authorization, operator challenge and reversal require independent product/security acceptance.
});
test.skip('PSEC-080 External compliance, audit export and hardware/device claims require independent evidence',async()=>{
 // Phase 2 or source-hardening obligation: External regulatory assurance, device identity and exported audit evidence are not established by mock-page tests.
});

// Batch 148: additional source-backed boundary coverage, synthetic UI only.
 test('PSEC-081 MFA setup service refusal leaves no QR secret and no false success',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/mfa/setup')?{status:503,json:{message:'Authenticator setup unavailable'}}:undefined});
  await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await expect(root(page).locator('.platform-security__inline-error')).toContainText('Authenticator setup unavailable');
  await expect(root(page).locator('.platform-security__mfa-setup')).toHaveCount(0);
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
 });
 test('PSEC-082 Rejected MFA confirmation preserves the unconfirmed setup and disabled state',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='POST'&&p.endsWith('/mfa/confirm')?{status:409,json:{message:'Code did not verify'}}:undefined});
  await root(page).getByRole('button',{name:'Start MFA setup'}).click();
  await root(page).getByPlaceholder('6-digit code').fill('654321');
  await root(page).getByRole('button',{name:'Confirm MFA'}).click();
  await expect(root(page).locator('.platform-security__inline-error')).toContainText('Code did not verify');
  await expect(root(page).getByLabel('My account security summary')).toContainText('Disabled');
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
 });
 test('PSEC-083 Failed disable-MFA request preserves enabled state and does not claim revocation',async({page})=>{
  await openPlatformSecurity(page,{self:{mfa_enabled:true,mfa_confirmed_at:'2026-10-01T00:00:00Z'},respond:(m,p)=>m==='POST'&&p.endsWith('/mfa/disable')?{status:409,json:{message:'MFA disable refused'}}:undefined});
  await root(page).getByLabel('Current password').last().fill('synthetic-password');
  await root(page).getByLabel('Current TOTP code').fill('123456');
  page.once('dialog',d=>d.accept());await root(page).getByRole('button',{name:'Disable MFA'}).click();
  await expect(root(page).locator('.platform-security__inline-error')).toContainText('MFA disable refused');
  await expect(root(page).getByLabel('My account security summary')).toContainText('Enabled');
  await expect(root(page).locator('.platform-security__success')).toHaveCount(0);
 });
 test('PSEC-084 Absent staff users array does not fabricate a priority identity',async({page})=>{
  await openPlatformSecurity(page,{admin:{users:undefined as any}});
  await expect(root(page).getByLabel('Staff security summary')).toBeVisible();
  await expect(priority(page)).not.toContainText('Locked Operator');
 });
 test('PSEC-085 Invalid per-user risk flags are ignored without affecting account-security view',async({page})=>{
  await openPlatformSecurity(page,{admin:{users:[{...securityAdminUser,risk_flags:'not-an-array' as any}]}});
  await expect(root(page).locator('.platform-security__account-grid')).toContainText('Synthetic Operator');
  await expect(priority(page)).toContainText('Locked Operator');
 });
 test('PSEC-086 Absent staff session rows do not invent currently active session identity',async({page})=>{
  await openPlatformSecurity(page,{admin:{active_sessions:undefined as any}});
  await expect(root(page).getByLabel('Staff security summary')).toBeVisible();
  await expect(sessions(page)).not.toContainText(SECURITY_SESSION_ID);
 });
 test('PSEC-087 Account refresh without staff grant never retrieves admin security evidence',async({page})=>{
  const calls:string[]=[];
  await openPlatformSecurity(page,{permissions:without('platform.security.read'),onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
  const before=calls.filter(x=>x===securityPath+'/me').length;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(x=>x===securityPath+'/me').length).toBeGreaterThan(before);
  expect(calls).not.toContain(securityPath+'/admin');
 });
 test('PSEC-088 Fully granted Refresh performs separate self and admin reads without a write',async({page})=>{
  const calls:{method:string;path:string}[]=[];
  await openPlatformSecurity(page,{onCall:(method,path)=>calls.push({method,path})});
  const selfBefore=calls.filter(c=>c.method==='GET'&&c.path===securityPath+'/me').length;
  const adminBefore=calls.filter(c=>c.method==='GET'&&c.path===securityPath+'/admin').length;
  await root(page).getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>calls.filter(c=>c.method==='GET'&&c.path===securityPath+'/me').length).toBeGreaterThan(selfBefore);
  await expect.poll(()=>calls.filter(c=>c.method==='GET'&&c.path===securityPath+'/admin').length).toBeGreaterThan(adminBefore);
  expect(calls.filter(c=>c.method==='POST')).toHaveLength(0);
 });


 // Batch 153: additional presentation, privacy and request-scope contracts; synthetic UI only.
 test('PSEC-089 Untrusted staff display name is inert text rather than injected markup',async({page})=>{
  const injected='<img src=x onerror=alert(1)> Alex';
  await openPlatformSecurity(page,{admin:{users:[{...securityAdminUser,name:injected}]}});
  const body=priority(page).locator('table tbody');
  await expect(body).toContainText(injected);
  await expect(body.locator('img')).toHaveCount(0);
 });
 test('PSEC-090 Untrusted session user-agent is inert table text',async({page})=>{
  const injected='<img src=x onerror=alert(1)> User-Agent';
  await openPlatformSecurity(page,{admin:{active_sessions:[{...securityAdminSession,user_agent:injected}]}});
  const body=sessions(page).locator('table tbody');
  await expect(body).toContainText(injected);
  await expect(body.locator('img')).toHaveCount(0);
 });
 test('PSEC-091 Session rows redact Platform user identity without users-read permission',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.users.read')});
  const table=sessions(page).locator('table tbody');
  await expect(table).toContainText('Restricted Platform user');
  await expect(table).not.toContainText('locked@fixture.test');
  await expect(priority(page)).toHaveCount(0);
 });
 test('PSEC-092 Missing audit permission keeps risk rows but replaces their audit links',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.audit.read')});
  const table=priority(page).locator('table tbody');
  await expect(table).toContainText('Locked Operator');
  await expect(table).toContainText('Audit restricted');
  await expect(table.getByRole('link',{name:'Audit history'})).toHaveCount(0);
 });
 test('PSEC-093 Access-review grant independently controls both review links',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.access_reviews.read')});
  const links=root(page).locator('.platform-security__links');
  await expect(links.getByRole('link',{name:'Access reviews'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Permission audit'})).toHaveCount(0);
  await expect(links.getByRole('link',{name:'Platform audit'})).toBeVisible();
  await expect(links.getByRole('link',{name:'Role permissions'})).toBeVisible();
 });
 test('PSEC-094 Staff-only HTTP 429 leaves account self-service available with explicit retry',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='GET'&&p===securityPath+'/admin'?{status:429,json:{message:'Staff evidence temporarily rate limited'}}:undefined});
  await expect(root(page)).toContainText('Staff security review is unavailable.');
  await expect(root(page).getByRole('button',{name:'Retry staff review'})).toBeVisible();
  await expect(root(page).getByLabel('My account security summary')).toContainText('Disabled');
  await expect(password(page).getByLabel('New password')).toBeVisible();
 });

 // Batch 165: permission independence, source response formatting and self-service UI boundaries; all unrun.
 test('PSEC-095 Missing sessions-revoke grant leaves Unlock enabled but prevents MFA clear',async({page})=>{
  await openPlatformSecurity(page,{permissions:without('platform.sessions.revoke')});
  const row=priority(page).locator('tbody tr').filter({hasText:'Locked Operator'});
  await expect(row.getByRole('button',{name:'Unlock'})).toBeEnabled();
  await expect(row.getByRole('button',{name:'Clear MFA'})).toBeDisabled();
 });
 test('PSEC-096 Admin risk review age reflects returned policy without claiming expiry enforcement',async({page})=>{
  const risk={...securityAdminFixture().risk_policy,password_review_age_days:90};
  await openPlatformSecurity(page,{admin:{risk_policy:risk}});
  await expect(root(page)).toContainText('90-day application review heuristic');
  await expect(root(page)).toContainText('not an enforced password-expiry policy');
 });
 test('PSEC-097 Admin evidence list limits use backend supplied bounds',async({page})=>{
  await openPlatformSecurity(page,{admin:{limits:{users:7,active_sessions:3}}});
  await expect(root(page)).toContainText('bounded to 7 users and 3 sessions');
  await expect(priority(page)).toContainText('Up to 7 Platform users');
  await expect(sessions(page)).toContainText('Up to 3 active Platform session records');
 });
 test('PSEC-098 Self security initial outage leaves separately permissioned staff evidence visible',async({page})=>{
  await openPlatformSecurity(page,{respond:(m,p)=>m==='GET'&&p===securityPath+'/me'?{status:503,json:{message:'Self snapshot unavailable'}}:undefined});
  await expect(root(page)).toContainText('My Security failed to load.');
  await expect(root(page).getByLabel('Staff security summary')).toContainText('Platform users');
 });
 test('PSEC-099 Empty staff user list displays explicit no-evidence row',async({page})=>{
  await openPlatformSecurity(page,{admin:{users:[]}});
  await expect(priority(page).locator('tbody')).toContainText('No authorized Platform user evidence returned.');
 });
 test('PSEC-100 Empty staff sessions list displays explicit no-evidence row',async({page})=>{
  await openPlatformSecurity(page,{admin:{active_sessions:[]}});
  await expect(sessions(page).locator('tbody')).toContainText('No active session evidence returned.');
 });
 test('PSEC-101 Missing session IP and user agent render Not recorded independently',async({page})=>{
  await openPlatformSecurity(page,{admin:{active_sessions:[{...securityAdminSession,ip_address:'',user_agent:''}]}});
  const row=sessions(page).locator('tbody tr').first();
  await expect(row.getByText('Not recorded',{exact:true})).toHaveCount(2);
 });
 test('PSEC-102 Invalid staff session dates show safe fallback text rather than raw timestamps',async({page})=>{
  await openPlatformSecurity(page,{admin:{active_sessions:[{...securityAdminSession,last_used_at:'invalid-time',expires_at:'invalid-time'}]}});
  await expect(sessions(page).locator('tbody')).toContainText('Invalid timestamp');
  await expect(sessions(page).locator('tbody')).not.toContainText('invalid-time');
 });
 test('PSEC-103 Audit history target identifier is URL-encoded from staff source data',async({page})=>{
  const id='audit/target?tag=1';await openPlatformSecurity(page,{admin:{users:[{...securityAdminUser,id}]}});
  const href=await priority(page).getByRole('link',{name:'Audit history'}).getAttribute('href');
  expect(href).toContain('target_id=audit%2Ftarget%3Ftag%3D1');
 });
 test('PSEC-104 Password success message explicitly says current browser session is preserved',async({page})=>{
  await openPlatformSecurity(page);const form=password(page);
  await form.getByLabel('Current password').fill('old');await form.getByLabel('New password').fill('new-password-123');
  page.once('dialog',d=>d.accept());await form.getByRole('button',{name:'Change password'}).click();
  await expect(root(page).locator('.platform-security__success')).toContainText('this browser session was preserved');
 });
 test('PSEC-105 No current user risk flags shows explicit normal-evidence fallback and disables unlock',async({page})=>{
  const entry={...securityAdminUser,locked_until:null,risk_flags:[]};
  await openPlatformSecurity(page,{admin:{users:[entry]}});
  const row=priority(page).locator('tbody tr').first();
  await expect(row).toContainText('No current application flags');
  await expect(row.getByRole('button',{name:'Unlock'})).toBeDisabled();
 });
 test('PSEC-106 MFA already enabled at load prevents starting replacement setup in client',async({page})=>{
  const posts:string[]=[];await openPlatformSecurity(page,{self:{mfa_enabled:true},onCall:(m,p)=>{if(m==='POST')posts.push(p);}});
  await expect(root(page).getByRole('button',{name:'MFA already enabled'})).toBeDisabled();
  expect(posts).not.toContain(securityPath+'/me/mfa/setup');
 });

});
