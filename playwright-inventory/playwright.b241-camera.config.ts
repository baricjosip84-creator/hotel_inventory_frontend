import {defineConfig} from '@playwright/test';
import original from './playwright.live-original.config';
import {cameraArgs} from './support/b241-camera-fixture.mjs';
if(process.env.PW_ORIGINAL_SUITE_GROUP!=='BULK_SAFE_17'||process.env.PW_LIVE_ORIGINAL_READONLY!=='YES')throw Error('B241 camera group mismatch');
export default defineConfig({...original, workers:1,retries:0,projects:original.projects?.map(p=>({...p,use:{...p.use,launchOptions:{...p.use?.launchOptions,args:[...(p.use?.launchOptions?.args??[]),...cameraArgs]}}}))});
