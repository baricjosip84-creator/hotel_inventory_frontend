import { test, expect, type Page } from '@playwright/test';
import { openTenantExports, exportTenants, EXPORT_TENANT_A, EXPORT_TENANT_B, exportPreview, partialExportPreview, fullExportArchive } from '../../../support/tenantExportsFixture';

/** Batch 55 — page-owned, synthetic HTTP only, GENERATED_UNRUN. Browser UI and request shape are not server acceptance. */
const controls=(page:Page)=>page.locator('.platform-tenant-exports__controls');
const selectTenant=async (page:Page,id=EXPORT_TENANT_A)=>{
  await controls(page).getByLabel('Tenant',{exact:true}).selectOption(id);
  await expect(page.locator('.platform-tenant-exports__truth-note')).toBeVisible();
};

test.describe('Platform Tenant Exports — directory, scope and browser generation',()=>{
  test('PTEXP-001 Page distinguishes tenant data portability from backup or customer delivery proof',async ({page})=>{
    await openTenantExports(page);
    await expect(page.getByText('Repeatable-read archive snapshot')).toBeVisible();
    await expect(page.getByText('Secrets and Platform tables excluded')).toBeVisible();
    await expect(controls(page).getByLabel('Package mode')).toHaveValue('full');
  });
  test('PTEXP-002 No tenant selected shows empty guidance and disables generation',async ({page})=>{
    await openTenantExports(page);
    await expect(page.getByText('No tenant selected.')).toBeVisible();
    await expect(controls(page).getByRole('button',{name:'Generate row-data export'})).toBeDisabled();
  });
  test('PTEXP-003 Tenant directory populates status and plan choices from intercepted response',async ({page})=>{
    await openTenantExports(page);
    await expect(controls(page).getByLabel('Tenant')).toContainText('Alpha Test Hotel · active · starter');
    await expect(controls(page).getByLabel('Tenant')).toContainText('Beta Test Warehouse · locked · pro');
  });
  test('PTEXP-004 Deep-link tenant_id loads selected tenant export preview',async ({page})=>{
    const paths:string[]=[];
    await openTenantExports(page,{query:`tenant_id=${EXPORT_TENANT_A}`,onCall:(m,p)=>{if(m==='GET')paths.push(p);}});
    await expect(controls(page).getByLabel('Tenant')).toHaveValue(EXPORT_TENANT_A);
    await expect.poll(()=>paths.includes(`/platform/tenant-exports/${EXPORT_TENANT_A}/preview`)).toBe(true);
    await expect(page.locator('.platform-tenant-exports__truth-note')).toBeVisible();
  });
  test('PTEXP-005 Changing selected tenant updates URL and requests a different scoped preview',async ({page})=>{
    const seen:string[]=[];
    await openTenantExports(page,{query:`tenant_id=${EXPORT_TENANT_A}`,onCall:(m,p)=>{if(m==='GET'&&p.endsWith('/preview'))seen.push(p);}});
    await controls(page).getByLabel('Tenant').selectOption(EXPORT_TENANT_B);
    await expect(page).toHaveURL(new RegExp(`tenant_id=${EXPORT_TENANT_B}`));
    await expect.poll(()=>seen.includes(`/platform/tenant-exports/${EXPORT_TENANT_B}/preview`)).toBe(true);
  });
  test('PTEXP-006 Default package is full row-data mode with a 5000-row limit',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await expect(controls(page).getByLabel('Package mode')).toHaveValue('full');
    await expect(controls(page).getByLabel('Max rows per table')).toHaveValue('5000');
    await expect(controls(page).getByRole('button',{name:'Generate row-data export'})).toBeEnabled();
  });
  test('PTEXP-007 Switching to summary mode changes generation label without changing tenant selection',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Package mode').selectOption('summary');
    await expect(controls(page).getByRole('button',{name:'Generate summary'})).toBeEnabled();
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toHaveValue(EXPORT_TENANT_A);
  });
  test('PTEXP-008 Zero per-table row limit shows boundary validation and blocks generation',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('0');
    await expect(page.locator('.platform-tenant-exports__validation')).toContainText('whole number from 1 to 50,000');
    await expect(controls(page).getByRole('button',{name:'Generate row-data export'})).toBeDisabled();
  });
  test('PTEXP-009 Row limit above 50000 blocks generation',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('50001');
    await expect(page.locator('.platform-tenant-exports__validation')).toBeVisible();
    await expect(controls(page).getByRole('button',{name:'Generate row-data export'})).toBeDisabled();
  });
  test('PTEXP-010 Fractional row limit is not rounded silently into an allowed integer',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('1.5');
    await expect(page.locator('.platform-tenant-exports__validation')).toBeVisible();
    await expect(controls(page).getByRole('button',{name:'Generate row-data export'})).toBeDisabled();
  });
  test('PTEXP-011 Partial table-count evidence fails closed and blocks archive creation',async ({page})=>{
    await openTenantExports(page,{preview:partialExportPreview});await selectTenant(page);
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Source preview is incomplete.');
    await expect(page.getByText('Restricted by error')).toBeVisible();
    await expect(controls(page).getByRole('button',{name:'Generate row-data export'})).toBeDisabled();
  });
  test('PTEXP-012 Evidence table and summary render scope flags without claiming actual DB isolation',async ({page})=>{
    await openTenantExports(page,{preview:exportPreview});await selectTenant(page);
    await expect(page.locator('.platform-tenant-exports__scope-grid')).toContainText('Platform control plane excluded');
    await expect(page.locator('.platform-tenant-exports__scope-grid')).toContainText('product_categories');
    await expect(page.locator('.platform-tenant-exports__table-wrap')).toContainText('stock_movements');
    await expect(page.getByLabel('Tenant export evidence summary')).toContainText('Counted rows');
  });
  test('PTEXP-013 Without tenant_id no preview request is issued by the page query',async ({page})=>{
    const previewCalls:string[]=[];
    await openTenantExports(page,{onCall:(m,p)=>{if(m==='GET'&&p.includes('/tenant-exports/')&&p.endsWith('/preview'))previewCalls.push(p);}});
    await expect(page.getByText('No tenant selected.')).toBeVisible();
    expect(previewCalls).toHaveLength(0);
  });
  test('PTEXP-014 Cancelled sensitive export confirmation sends no archive POST',async ({page})=>{
    const writes:string[]=[];
    await openTenantExports(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/archive'))writes.push(p);}});await selectTenant(page);
    page.once('dialog',d=>d.dismiss());
    await controls(page).getByRole('button',{name:'Generate row-data export'}).click();
    expect(writes).toHaveLength(0);
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
  });
  test('PTEXP-015 Confirmed full export posts mode and limit then downloads synthetic JSON',async ({page})=>{
    let sent:any;let endpoint='';
    await openTenantExports(page,{archive:fullExportArchive,onCall:(m,p,b)=>{if(m==='POST'&&p.endsWith('/archive')){endpoint=p;sent=b;}}});
    await selectTenant(page);
    page.once('dialog',d=>d.accept());
    const dlPromise=page.waitForEvent('download');
    await controls(page).getByRole('button',{name:'Generate row-data export'}).click();
    const dl=await dlPromise;
    expect(dl.suggestedFilename()).toBe('alpha-test-hotel-tenant-data-export.json');
    expect(endpoint).toBe(`/platform/tenant-exports/${EXPORT_TENANT_A}/archive`);
    expect(sent).toEqual({mode:'full',max_rows_per_table:5000});
    await expect(page.locator('.platform-tenant-exports__success')).toContainText('without row-limit truncation');
  });
  test('PTEXP-016 Failed archive generation surfaces error without claiming download success',async ({page})=>{
    await openTenantExports(page,{responses:{[`POST /platform/tenant-exports/${EXPORT_TENANT_A}/archive`]:{status:503,json:{error:{message:'Export unavailable'}}}}});
    await selectTenant(page);
    page.once('dialog',d=>d.accept());
    await controls(page).getByRole('button',{name:'Generate row-data export'}).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Export generation failed.');
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
  });
});

/** Batch 56: source-traced continuation PTEXP-017..060. These are browser/synthetic-transport checks,
 * not evidence of real tenant isolation, permission authorization, backup, or external delivery. */
const generate=(page:Page,summary=false)=>controls(page).getByRole('button',{name:summary?'Generate summary':'Generate row-data export'});
const archiveEndpoint=(id=EXPORT_TENANT_A)=>`/platform/tenant-exports/${id}/archive`;
const previewEndpoint=(id=EXPORT_TENANT_A)=>`/platform/tenant-exports/${id}/preview`;
const failJson=async (route:any,status:number,message:string)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({error:{message}})});

test.describe('Platform Tenant Exports — confirmation, boundaries, errors and supporting evidence',()=>{
  test('PTEXP-017 Summary confirmation describes counts-only package without row payload',async ({page})=>{
    const sent:string[]=[];
    await openTenantExports(page,{onCall:(m,p)=>{if(m==='POST')sent.push(p);}});
    await selectTenant(page);await controls(page).getByLabel('Package mode').selectOption('summary');
    page.once('dialog',dialog=>{expect(dialog.message()).toContain('contains no table row payloads');void dialog.dismiss();});
    await generate(page,true).click();expect(sent).toHaveLength(0);
  });
  test('PTEXP-018 Summary export response downloads summary-named JSON file',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Package mode').selectOption('summary');
    page.once('dialog',dialog=>void dialog.accept());const file=page.waitForEvent('download');
    await generate(page,true).click();expect((await file).suggestedFilename()).toBe('alpha-test-hotel-export-summary.json');
  });
  test('PTEXP-019 Custom per-table limit is posted unchanged with full mode',async ({page})=>{
    let body:any=null;
    await openTenantExports(page,{onCall:(m,p,b)=>{if(m==='POST'&&p===archiveEndpoint())body=b;}});
    await selectTenant(page);await controls(page).getByLabel('Max rows per table').fill('731');
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect.poll(()=>body).toEqual({mode:'full',max_rows_per_table:731});
  });
  test('PTEXP-020 Minimum allowed row limit 1 enables generation for complete preview',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('1');
    await expect(generate(page)).toBeEnabled();await expect(page.locator('.platform-tenant-exports__validation')).toHaveCount(0);
  });
  test('PTEXP-021 Maximum allowed row limit 50000 enables generation for complete preview',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('50000');
    await expect(generate(page)).toBeEnabled();await expect(page.locator('.platform-tenant-exports__validation')).toHaveCount(0);
  });
  test('PTEXP-022 Empty row limit blocks generation with validation feedback',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('');
    await expect(generate(page)).toBeDisabled();await expect(page.locator('.platform-tenant-exports__validation')).toContainText('whole number');
  });
  test('PTEXP-023 Negative row limit blocks generation with validation feedback',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await controls(page).getByLabel('Max rows per table').fill('-4');
    await expect(generate(page)).toBeDisabled();await expect(page.locator('.platform-tenant-exports__validation')).toContainText('1 to 50,000');
  });
  test('PTEXP-024 Changing tenant clears prior export success notice',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__success')).toBeVisible();
    await controls(page).getByLabel('Tenant',{exact:true}).selectOption(EXPORT_TENANT_B);
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`tenant_id=${EXPORT_TENANT_B}`));
  });
  test('PTEXP-025 Dismiss clears completed export notice without changing selected tenant',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await page.locator('.platform-tenant-exports__success').getByRole('button',{name:'Dismiss'}).click();
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toHaveValue(EXPORT_TENANT_A);
  });
  test('PTEXP-026 Truncated archive displays incomplete row-data package warning',async ({page})=>{
    const archive={...fullExportArchive,truncated_tables:['products']};
    await openTenantExports(page,{archive});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('not a complete row-data package');
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
  });
  test('PTEXP-027 Truncated archive still downloads JSON with server contract',async ({page})=>{
    const archive={...fullExportArchive,truncated_tables:['products'],complete:false};
    await openTenantExports(page,{archive});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());const file=page.waitForEvent('download');
    await generate(page).click();expect((await file).suggestedFilename()).toBe('alpha-test-hotel-tenant-data-export.json');
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('1 truncated table');
  });
  test('PTEXP-028 Preview table count failure shows unavailable rows and read-failed badge',async ({page})=>{
    await openTenantExports(page,{preview:partialExportPreview});await selectTenant(page);
    const row=page.locator('.platform-tenant-exports__table-wrap tr').filter({hasText:'stock_movements'});
    await expect(row).toContainText('Unavailable');await expect(row).toContainText('Read failed');
    await expect(row).toContainText('Temporary count failure');
  });
  test('PTEXP-029 Initial preview HTTP failure displays blocking retry action',async ({page})=>{
    await openTenantExports(page,{query:`tenant_id=${EXPORT_TENANT_A}`,responses:{[`GET ${previewEndpoint()}`]:{status:503,json:{error:{message:'Preview offline'}}}}});
    await expect(page.locator('.platform-tenant-exports__blocking-error')).toContainText('Tenant export preview could not be loaded.');
    await expect(page.locator('.platform-tenant-exports__blocking-error').getByRole('button',{name:'Retry'})).toBeVisible();
    await expect(generate(page)).toBeDisabled();
  });
  test('PTEXP-030 Initial tenant directory HTTP failure displays retry action',async ({page})=>{
    await openTenantExports(page,{responses:{'GET /platform/tenants':{status:503,json:{error:{message:'Directory offline'}}}}});
    await expect(page.locator('.platform-tenant-exports__blocking-error')).toContainText('Tenant directory could not be loaded.');
    await expect(page.locator('.platform-tenant-exports__blocking-error').getByRole('button',{name:'Retry'})).toBeVisible();
  });
  test('PTEXP-031 Background preview refresh failure displays last successful snapshot',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await page.route('**/platform/tenant-exports/*/preview',route=>failJson(route,503,'Preview temporarily unavailable'));
    await page.getByRole('button',{name:'Refresh preview'}).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Showing the last successful snapshot.');
    await expect(page.locator('.platform-tenant-exports__truth-note')).toBeVisible();
    await expect(generate(page)).toBeEnabled();
  });
  test('PTEXP-032 Background tenant directory failure preserves last successful directory',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await page.route('**/platform/tenants',route=>failJson(route,503,'Directory stale'));
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Showing the last successful tenant directory.');
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toContainText('Alpha Test Hotel');
  });
  test('PTEXP-033 Refresh button reissues tenant directory and selected preview queries',async ({page})=>{
    const paths:string[]=[];await openTenantExports(page,{onCall:(m,p)=>{if(m==='GET')paths.push(p);}});await selectTenant(page);
    const directoryBefore=paths.filter(p=>p==='/platform/tenants').length;
    const previewBefore=paths.filter(p=>p===previewEndpoint()).length;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>paths.filter(p=>p==='/platform/tenants').length).toBeGreaterThan(directoryBefore);
    await expect.poll(()=>paths.filter(p=>p===previewEndpoint()).length).toBeGreaterThan(previewBefore);
  });
  test('PTEXP-034 Refresh preview button reissues selected tenant preview only',async ({page})=>{
    const paths:string[]=[];await openTenantExports(page,{onCall:(m,p)=>{if(m==='GET')paths.push(p);}});await selectTenant(page);
    const directoryBefore=paths.filter(p=>p==='/platform/tenants').length;
    const previewBefore=paths.filter(p=>p===previewEndpoint()).length;
    await page.getByRole('button',{name:'Refresh preview'}).click();
    await expect.poll(()=>paths.filter(p=>p===previewEndpoint()).length).toBeGreaterThan(previewBefore);
    expect(paths.filter(p=>p==='/platform/tenants')).toHaveLength(directoryBefore);
  });
  test('PTEXP-035 Archive HTTP 409 displays error without success notice',async ({page})=>{
    await openTenantExports(page,{responses:{[`POST ${archiveEndpoint()}`]:{status:409,json:{error:{message:'Snapshot conflict'}}}}});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Snapshot conflict');
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
  });
  test('PTEXP-036 Archive HTTP 429 displays throttling feedback without success notice',async ({page})=>{
    await openTenantExports(page,{responses:{[`POST ${archiveEndpoint()}`]:{status:429,json:{error:{message:'Too many export requests'}}}}});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Too many export requests');
    await expect(page.locator('.platform-tenant-exports__success')).toHaveCount(0);
  });
  test('PTEXP-037 Export scope panel displays source-reported platform exclusion flags',async ({page})=>{
    await openTenantExports(page,{preview:{...exportPreview,export_scope:{...exportPreview.export_scope,platform_control_plane_tables_excluded:false,secret_and_credential_material_excluded:false}}});
    await selectTenant(page);
    const scope=page.locator('.platform-tenant-exports__scope-grid');
    await expect(scope.locator('div').filter({hasText:'Platform control plane excluded'})).toContainText('No');
    await expect(scope.locator('div').filter({hasText:'Credential/auth material excluded'})).toContainText('No');
  });
  test('PTEXP-038 Evidence boundary explicitly disclaims external delivery and restore',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await expect(page.locator('.platform-tenant-exports__truth-note')).toContainText('does not prove secure external delivery');
    await expect(page.locator('.platform-tenant-exports__truth-note')).toContainText('restore capability');
  });
  test('PTEXP-039 Server-provided preview notes are rendered for operator',async ({page})=>{
    await openTenantExports(page,{preview:{...exportPreview,notes:['Only synthetic rows counted','Do not assume full restore']}});await selectTenant(page);
    await expect(page.locator('.platform-tenant-exports__notes')).toContainText('Only synthetic rows counted');
    await expect(page.locator('.platform-tenant-exports__notes')).toContainText('Do not assume full restore');
  });
  test('PTEXP-040 Unknown tenant deep link does not manufacture directory tenant identity',async ({page})=>{
    const unknown='cccccccc-cccc-4ccc-8ccc-333333333333';
    await openTenantExports(page,{query:`tenant_id=${unknown}`});
    await expect(page.getByText('No tenant',{exact:true})).toBeVisible();
    await expect(page.locator('.platform-tenant-exports__controls').getByLabel('Tenant',{exact:true}).locator('option')).toHaveCount(3);
    await expect(page.locator('.platform-tenant-exports__controls').getByLabel('Tenant',{exact:true}).locator(`option[value="${unknown}"]`)).toHaveCount(0);
  });
  test('PTEXP-041 Selected UUID tenant id is encoded safely in preview request path',async ({page})=>{
    const paths:string[]=[];await openTenantExports(page,{query:`tenant_id=${EXPORT_TENANT_B}`,onCall:(m,p)=>{if(m==='GET')paths.push(p);}});
    await expect.poll(()=>paths.includes(previewEndpoint(EXPORT_TENANT_B))).toBe(true);
    expect(paths.filter(p=>p.includes('/tenant-exports/'))).toEqual([previewEndpoint(EXPORT_TENANT_B)]);
  });
  test('PTEXP-042 Package mode toggle keeps the selected tenant deep link',async ({page})=>{
    await openTenantExports(page,{query:`tenant_id=${EXPORT_TENANT_B}`});
    await controls(page).getByLabel('Package mode').selectOption('summary');
    await expect(page).toHaveURL(new RegExp(`tenant_id=${EXPORT_TENANT_B}`));
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toHaveValue(EXPORT_TENANT_B);
  });
  test('PTEXP-043 Supporting Tenants link includes selected tenant_id parameter',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await expect(page.locator('.platform-tenant-exports__supporting-links').getByRole('link',{name:'Tenants',exact:true}))
      .toHaveAttribute('href',`/platform/tenants?tenant_id=${EXPORT_TENANT_A}`);
    await expect(page.locator('.platform-tenant-exports__supporting-links').getByRole('link',{name:'Tenant offboarding'}))
      .toHaveAttribute('href',`/platform/tenant-offboarding?tenant_id=${EXPORT_TENANT_A}`);
  });
  test('PTEXP-044 Compliance and retention links appear for granted permissions',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);const links=page.locator('.platform-tenant-exports__supporting-links');
    for(const name of ['Compliance export','Legal & compliance','Data retention','Platform audit'])await expect(links.getByRole('link',{name})).toBeVisible();
    await expect(links.getByRole('link',{name:'Data retention'})).toHaveAttribute('href',`/platform/data-retention?tenant_id=${EXPORT_TENANT_A}`);
  });
  test('PTEXP-045 Compliance and audit links are absent without their permissions',async ({page})=>{
    await openTenantExports(page,{permissions:['platform.dashboard.read','platform.tenants.read','platform.tenants.export']});
    const links=page.locator('.platform-tenant-exports__supporting-links');
    for(const name of ['Compliance export','Legal & compliance','Data retention','Platform audit'])await expect(links.getByRole('link',{name})).toHaveCount(0);
    await expect(links.getByRole('link',{name:'Tenants',exact:true})).toBeVisible();
  });
  test('PTEXP-046 Readable and failed counts are derived from preview table state',async ({page})=>{
    await openTenantExports(page,{preview:partialExportPreview});await selectTenant(page);
    await expect(page.getByLabel('Tenant export evidence summary')).toContainText('1 readable · 1 failed');
    await expect(page.getByLabel('Tenant export evidence summary')).toContainText('Partial count');
  });
  test('PTEXP-047 Tenant selector displays current status and plan even when locked',async ({page})=>{
    await openTenantExports(page);await selectTenant(page,EXPORT_TENANT_B);
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toHaveValue(EXPORT_TENANT_B);
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toContainText('Beta Test Warehouse · locked · pro');
  });
  test('PTEXP-048 Export rejection cannot yield a browser download from mock rejection',async ({page})=>{
    const downloads:string[]=[];page.on('download',file=>downloads.push(file.suggestedFilename()));
    await openTenantExports(page,{responses:{[`POST ${archiveEndpoint()}`]:{status:403,json:{error:{message:'Access denied'}}}}});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Access denied');
    expect(downloads).toHaveLength(0);
  });
  test('PTEXP-049 Nontruncated full archive renders success rather than incomplete warning',async ({page})=>{
    await openTenantExports(page,{archive:fullExportArchive});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__success')).toContainText('without row-limit truncation');
    await expect(page.locator('.platform-tenant-exports__warning')).toHaveCount(0);
  });
  test('PTEXP-050 Export with multiple truncated tables reports correct plural warning',async ({page})=>{
    await openTenantExports(page,{archive:{...fullExportArchive,truncated_tables:['products','stock_movements']}});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('2 truncated tables');
  });
  test('PTEXP-051 Summary successful export uses distinct completion message',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);await controls(page).getByLabel('Package mode').selectOption('summary');
    page.once('dialog',dialog=>void dialog.accept());await generate(page,true).click();
    await expect(page.locator('.platform-tenant-exports__success')).toContainText('Summary evidence package generated and downloaded.');
  });
  test('PTEXP-052 Truncation warning can be dismissed independently of export selection',async ({page})=>{
    await openTenantExports(page,{archive:{...fullExportArchive,truncated_tables:['products']}});await selectTenant(page);
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    await page.locator('.platform-tenant-exports__warning').getByRole('button',{name:'Dismiss'}).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toHaveCount(0);
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toHaveValue(EXPORT_TENANT_A);
  });
  test('PTEXP-053 Application generation evidence does not claim database backup acceptance',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    await expect(page.locator('.platform-tenant-exports__truth-note')).toContainText('database backup coverage');
    await expect(page.locator('.platform-tenant-exports__truth-note')).toContainText('completeness beyond configured row limits');
  });
  test('PTEXP-054 Re-request preview after transient error keeps selected tenant id',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    let failing=true;
    await page.route('**/platform/tenant-exports/*/preview',route=>failing?failJson(route,503,'Transient preview error'):route.fallback());
    await page.getByRole('button',{name:'Refresh preview'}).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toContainText('Showing the last successful snapshot.');
    failing=false;await page.locator('.platform-tenant-exports__warning').getByRole('button',{name:'Retry'}).click();
    await expect(page.locator('.platform-tenant-exports__warning')).toHaveCount(0);
    await expect(controls(page).getByLabel('Tenant',{exact:true})).toHaveValue(EXPORT_TENANT_A);
  });
  test('PTEXP-055 Preview UI does not render platform control-plane rows from absent data',async ({page})=>{
    await openTenantExports(page,{preview:exportPreview});await selectTenant(page);
    const table=page.locator('.platform-tenant-exports__table-wrap');
    await expect(table).toContainText('products');await expect(table).not.toContainText('platform_users');
    await expect(table).not.toContainText('platform_sessions');
  });
  test('PTEXP-056 Missing read permission redirects away from exports route without preview request',async ({page})=>{
    const paths:string[]=[];
    await openTenantExports(page,{permissions:['platform.dashboard.read','platform.tenants.export'],expectHeading:false,
      query:`tenant_id=${EXPORT_TENANT_A}`,onCall:(m,p)=>{if(m==='GET')paths.push(p);}});
    await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);
    expect(paths.filter(p=>p===previewEndpoint())).toHaveLength(0);
  });
  test('PTEXP-057 Missing export permission redirects away from exports route without archive request',async ({page})=>{
    const paths:string[]=[];
    await openTenantExports(page,{permissions:['platform.dashboard.read','platform.tenants.read'],expectHeading:false,
      query:`tenant_id=${EXPORT_TENANT_A}`,onCall:(m,p)=>{if(m==='POST')paths.push(p);}});
    await expect(page).toHaveURL(/\/platform\/dashboard(?:\?.*)?$/);
    expect(paths).toHaveLength(0);
  });
  test('PTEXP-058 Incomplete preview blocks confirmation and all archive requests',async ({page})=>{
    const posts:string[]=[];await openTenantExports(page,{preview:partialExportPreview,onCall:(m,p)=>{if(m==='POST')posts.push(p);}});await selectTenant(page);
    let dialogs=0;page.on('dialog',dialog=>{dialogs++;void dialog.dismiss();});
    await expect(generate(page)).toBeDisabled();expect(posts).toHaveLength(0);expect(dialogs).toBe(0);
  });
  test('PTEXP-059 Pending archive mutation disables Generate to prevent duplicate clicks',async ({page})=>{
    await openTenantExports(page);await selectTenant(page);
    let release!:()=>void;
    await page.route('**/platform/tenant-exports/*/archive',async route=>{
      await new Promise<void>(resolve=>{release=resolve;});
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fullExportArchive)});
    });
    page.once('dialog',dialog=>void dialog.accept());await generate(page).click();
    const pending=controls(page).locator('button.app-button--primary');
    await expect(pending).toBeDisabled();await expect(pending).toHaveText('Generating…');
    await expect.poll(()=>typeof release).toBe('function');
    release();await expect(generate(page)).toBeEnabled();
  });
  test('PTEXP-060 Confirmed archive POST remains tenant-scoped and uses selected mode',async ({page})=>{
    let sent:any=null;let requested='';
    await openTenantExports(page,{onCall:(m,p,b)=>{if(m==='POST'){sent=b;requested=p;}}});
    await selectTenant(page,EXPORT_TENANT_B);await controls(page).getByLabel('Package mode').selectOption('summary');
    await controls(page).getByLabel('Max rows per table').fill('25');
    page.once('dialog',dialog=>void dialog.accept());await generate(page,true).click();
    await expect.poll(()=>requested).toBe(archiveEndpoint(EXPORT_TENANT_B));
    expect(sent).toEqual({mode:'summary',max_rows_per_table:25});
  });
});
