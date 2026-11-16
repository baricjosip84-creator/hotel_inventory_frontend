import type {Page} from '@playwright/test';
import {requireDisposableTenantCredentials} from './environment';
import {selectEnglishUI} from './tenantSession';
import {restoreBulkTenantSession} from './liveOriginalSafeTest';
import {existsSync,writeFileSync} from 'node:fs';
import {ensureB236Target} from './b236TargetRecovery.mjs';
export async function openB236Target(page:Page,route:string){
 if(process.env.PW_LIVE_ORIGINAL_READONLY!=='YES'||process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17'||process.env.PW_BASE_URL!=='https://hotel-inventory-frontend-mauve.vercel.app')throw Error('Unapproved B236 target');
 requireDisposableTenantCredentials();
 if(existsSync('.b234-auth-stop'))throw Error('B236 authentication circuit open');
 await selectEnglishUI(page);
 await ensureB236Target(page,route,restoreBulkTenantSession,(reason:string)=>writeFileSync('.b234-auth-stop',reason,{mode:0o600}));
}
