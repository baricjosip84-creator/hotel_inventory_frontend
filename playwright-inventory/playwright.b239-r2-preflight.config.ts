import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17')throw Error('B239 R2 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-239-r2-pages.spec.ts',grep:/Batch 239 R2 protected target access/,workers:1,retries:0,maxFailures:1,timeout:650_000});
