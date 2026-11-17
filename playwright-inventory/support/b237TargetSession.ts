import type {Page} from '@playwright/test';
import {requireDisposableTenantCredentials} from './environment';
import {selectEnglishUI} from './tenantSession';
import {restoreBulkTenantSession} from './liveOriginalSafeTest';
import {existsSync,writeFileSync} from 'node:fs';
import {ensureB237Target} from './b237TargetRecovery.mjs';
export async function openB237Target(page:Page,route:string){
 if(process.env.PW_LIVE_ORIGINAL_READONLY!=='YES'||process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17'||process.env.PW_BASE_URL!=='https://hotel-inventory-frontend-mauve.vercel.app')throw Error('Unapproved B237 target');
 requireDisposableTenantCredentials();
 if(existsSync('.b234-auth-stop'))throw Error('B237 authentication circuit open');
 // Pace genuine target access, including replacement workers; never bypass a rate-limit stop.
 await new Promise(resolve=>setTimeout(resolve,5000));
 if(existsSync('.b234-auth-stop'))throw Error('B237 authentication circuit open');
 await selectEnglishUI(page);
 await ensureB237Target(page,route,restoreBulkTenantSession,(reason:string)=>writeFileSync('.b234-auth-stop',reason,{mode:0o600}));
}
