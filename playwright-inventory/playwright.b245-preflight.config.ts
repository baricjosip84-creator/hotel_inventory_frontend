import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17')throw Error('B245 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-245-pages.spec.ts',grep:/Batch 245 protected target access/,workers:1,retries:0,maxFailures:1,timeout:1_250_000});
