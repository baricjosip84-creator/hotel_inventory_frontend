import { defineConfig } from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_15')throw new Error('B234 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-234-pages.spec.ts',grep:/Batch 234 guarded page access probe/,workers:1,retries:0,maxFailures:1,timeout:480_000});
