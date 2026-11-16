import type {Page} from '@playwright/test';
import {requireDisposableTenantCredentials} from './environment';
import {selectEnglishUI} from './tenantSession';
import {restoreBulkTenantSession} from './liveOriginalSafeTest';
import {ensureB235Target} from './b235TargetRecovery.mjs';
import {existsSync,writeFileSync} from 'node:fs';
export async function openB235Target(page:Page,route:'/permissions'|'/users'|'/products'){
 if(process.env.PW_LIVE_ORIGINAL_READONLY!=='YES'||process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_16'||process.env.PW_BASE_URL!=='https://hotel-inventory-frontend-mauve.vercel.app')throw Error('Unapproved B235 protected target');
 requireDisposableTenantCredentials();
 if(existsSync('.b234-auth-stop'))throw Error('B235 authentication circuit open');
 await selectEnglishUI(page);
 await ensureB235Target(page,route,restoreBulkTenantSession,(reason:string)=>writeFileSync('.b234-auth-stop',reason,{mode:0o600}));
}
