import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17')throw Error('B237 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-237-pages.spec.ts',grep:/Batch 237 guarded tenant page access/,workers:1,retries:0,maxFailures:1,timeout:1_300_000});
