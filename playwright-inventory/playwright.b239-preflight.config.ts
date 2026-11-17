import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17')throw Error('B239 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-239-pages.spec.ts',grep:/Batch 239 guarded tenant page access/,workers:1,retries:0,maxFailures:1,timeout:1_300_000});
