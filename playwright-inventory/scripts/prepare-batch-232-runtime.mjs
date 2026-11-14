/** CI-only overlay: rewires test/expect imports, NOT original test bodies, to the existing non-write live-safe fixture.
 * No edits are committed or pushed; stop on unexpected original file changes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const review=JSON.parse(fs.readFileSync(path.join(root,'batch-232-review.json'),'utf8'));
const target=path.join(root,'original-suite-approved.json');
const manifest=JSON.parse(fs.readFileSync(target,'utf8'));
assert(!manifest.approved_groups.BULK_SAFE_13,'Never overwrite an existing Batch 232 approval group');
assert(manifest.approved_groups.BULK_SAFE_11_RECHECK,'Final nine Batch 230 source fixes must be installed');
assert(fs.existsSync(path.join(root,'scripts/check-batch-231-contract.mjs')),'Batch 231 files missing');
assert(review.selected.length===240&&Object.keys(review.source_files).length===8);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const entries=[];
for(const [file,info] of Object.entries(review.source_files)){
  assert(/^tenant\/[a-z0-9-]+\/[a-z0-9-]+\.spec\.ts$/.test(file),'Unsafe reviewed spec path');
  const targetFile=path.join(root,'tests',file),source=fs.readFileSync(targetFile,'utf8');
  assert(sha(source)===info.source_sha256,'Source changed since review: '+file);
  assert(!source.includes('loginAsDisposableRole'),'Disposable role usage needs separate environment: '+file);
  const regex=/^import\s*\{\s*test\s*,\s*expect\s*,\s*(type Page(?:\s*,\s*type Route)?)\s*\}\s*from\s*'@playwright\/test';?\s*$/m;
  const matches=[...source.matchAll(new RegExp(regex.source,'gm'))];
  assert(matches.length===1,'Unsafe or unsupported Playwright import: '+file);
  const patched=source.replace(regex,(_,typed)=>`import { ${typed} } from '@playwright/test';\nimport { test, expect } from '../../../support/liveOriginalSafeTest';`);
  assert(patched!==source && !patched.includes("import { test, expect, type Page } from '@playwright/test'"),'Safe import was not wired');
  fs.writeFileSync(targetFile,patched);
  entries.push({file,ids:info.new_ids,sha256:sha(patched)});
}
assert(entries.flatMap(x=>x.ids).length===240);
manifest.approved_groups.BULK_SAFE_13={secret:true,entries};
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
console.log('PASS: exactly 8 original spec import declarations adapted in disposable CI checkout; 240 original test bodies preserved');
console.log('PASS: ephemeral B232 manifest inserted. Existing B230 and B231 repository files were not replaced.');
