import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17')throw Error('B241 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-241-pages.spec.ts',grep:/Batch 241 protected target access/,workers:1,retries:0,maxFailures:1,timeout:650_000});
