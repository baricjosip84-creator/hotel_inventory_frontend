import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_16')throw Error('B235 probe group mismatch');
export default defineConfig({...original,testDir:'./scripts',testMatch:'**/preflight-batch-235-pages.spec.ts',grep:/Batch 235 guarded tenant page access/,workers:1,retries:0,maxFailures:1,timeout:720_000});
